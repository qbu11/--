import os
import json
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import time
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
API_KEY = os.getenv('NEWAPI_API_KEY')
BASE_URL = os.getenv('NEWAPI_BASE_URL')
MODEL_NAME = os.getenv('MODEL_NAME', 'gpt-4.1')
MAX_REQUESTS_PER_MINUTE = int(os.getenv('MAX_REQUESTS_PER_MINUTE', 60))

# Simple rate limiting
request_times = []

def rate_limit():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            now = time.time()
            # Remove requests older than 1 minute
            global request_times
            request_times = [t for t in request_times if now - t < 60]

            if len(request_times) >= MAX_REQUESTS_PER_MINUTE:
                return jsonify({'error': '请求过于频繁，请稍后再试'}), 429

            request_times.append(now)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def create_prompt(mode, scene=""):
    """Create prompt based on mode and scene"""
    scene_context = f"在{scene}的场景下" if scene else ""

    if mode == "truth":
        return f"请生成一个适合聚会游戏的真心话问题{scene_context}。要求：有趣但不冒犯，适合朋友间玩。只返回问题，不要解释。"

    elif mode == "dare":
        return f"请生成一个适合聚会游戏的大冒险任务{scene_context}。要求：有趣但安全，适合朋友间玩。只返回任务，不要解释。"

    else:  # mixed mode
        import random
        return create_prompt(random.choice(["truth", "dare"]), scene)

def call_api(prompt):
    """Call the NewAPI chat completion endpoint"""
    if not API_KEY or not BASE_URL:
        raise ValueError("API配置不完整，请检查.env文件")

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    }

    data = {
        'model': MODEL_NAME,
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'max_completion_tokens': 200,  # 使用新的参数名
        'temperature': 0.8  # 适中的创造性
    }

    try:
        print(f"调用API: {BASE_URL}/v1/chat/completions")
        print(f"模型: {MODEL_NAME}")
        print(f"提示词: {prompt[:100]}...")

        response = requests.post(
            f"{BASE_URL}/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )

        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}...")

        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            print(f"生成的内容: {content}")
            return content
        else:
            error_msg = f"API调用失败: {response.status_code}"
            if response.text:
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('error', {}).get('message', response.text)}"
                except:
                    error_msg += f" - {response.text[:200]}"
            raise Exception(error_msg)

    except requests.exceptions.Timeout:
        raise Exception("API请求超时，请稍后重试")
    except requests.exceptions.ConnectionError:
        raise Exception("网络连接错误，请检查网络设置")
    except Exception as e:
        print(f"API调用异常: {str(e)}")
        raise Exception(f"API调用失败: {str(e)}")

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
@rate_limit()
def generate_question():
    """Generate truth or dare question"""
    try:
        print("收到生成请求")
        data = request.get_json()
        if not data:
            return jsonify({'error': '请求数据格式错误'}), 400

        mode = data.get('mode', '').lower()
        scene = data.get('scene', '').strip()
        print(f"模式: {mode}, 场景: {scene}")

        # Validate mode
        if mode not in ['truth', 'dare', 'mixed']:
            return jsonify({'error': '模式参数错误，请选择 truth, dare 或 mixed'}), 400

        # Create prompt
        prompt = create_prompt(mode, scene)
        print(f"创建的提示词: {prompt[:200]}...")

        # Call API
        question = call_api(prompt)
        print(f"API返回的结果: '{question}'")

        # Determine the actual type for mixed mode
        actual_mode = mode
        if mode == 'mixed':
            # Try to detect if it's truth or dare based on content
            if any(word in question for word in ['问', '说', '告诉', '分享', '觉得']):
                actual_mode = 'truth'
            else:
                actual_mode = 'dare'

        return jsonify({
            'success': True,
            'question': question,
            'mode': actual_mode,
            'scene': scene
        })

    except Exception as e:
        print(f"生成过程中出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'api_configured': bool(API_KEY and BASE_URL)
    })

if __name__ == '__main__':
    if not API_KEY or not BASE_URL:
        print("警告: 请先配置.env文件中的API_KEY和BASE_URL")
        print("复制.env.example为.env文件并填入正确的配置")

    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', 8080))

    app.run(debug=debug_mode, host='0.0.0.0', port=port)