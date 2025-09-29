// DOM Elements
const generateBtn = document.getElementById('generate-btn');
const retryBtn = document.getElementById('retry-btn');
const retryErrorBtn = document.getElementById('retry-error-btn');
const modeSelect = document.getElementById('mode-select');
const sceneInput = document.getElementById('scene-input');
const wheelContainer = document.getElementById('wheel-container');
const cardContainer = document.getElementById('card-container');
const resultContainer = document.getElementById('result-container');
const errorContainer = document.getElementById('error-container');
const resultType = document.getElementById('result-type');
const resultText = document.getElementById('result-text');
const resultScene = document.getElementById('result-scene');
const errorMessage = document.getElementById('error-message');
const wheel = document.getElementById('wheel');
const topCard = document.getElementById('top-card');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');

// Animation settings
let isAnimating = false;
let animationType = 'wheel'; // 'wheel' or 'card'

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    resetToInitialState();
});

function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerate);
    retryBtn.addEventListener('click', handleRetry);
    retryErrorBtn.addEventListener('click', handleRetry);

    // Enter key support for scene input
    sceneInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !isAnimating) {
            handleGenerate();
        }
    });

    // Animation type toggle (optional enhancement)
    let clickCount = 0;
    wheelContainer.addEventListener('click', function() {
        clickCount++;
        if (clickCount >= 5) { // Easter egg: 5 clicks to switch animation
            animationType = animationType === 'wheel' ? 'card' : 'wheel';
            resetToInitialState();
            clickCount = 0;
        }
    });
}

function resetToInitialState() {
    // Hide result and error containers
    resultContainer.style.display = 'none';
    errorContainer.style.display = 'none';
    retryBtn.style.display = 'none';

    // Show appropriate animation container
    if (animationType === 'wheel') {
        wheelContainer.style.display = 'block';
        cardContainer.style.display = 'none';
    } else {
        wheelContainer.style.display = 'none';
        cardContainer.style.display = 'block';
    }

    // Reset button state
    resetButtonState();

    // Reset animations
    resetAnimations();
}

function resetButtonState() {
    generateBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
}

function setLoadingState() {
    generateBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
}

function resetAnimations() {
    // Reset wheel
    wheel.style.transform = 'rotate(0deg)';

    // Reset card
    topCard.style.transform = 'none';
    topCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    topCard.innerHTML = '';
}

async function handleGenerate() {
    if (isAnimating) return;

    const mode = modeSelect.value;
    const scene = sceneInput.value.trim();

    try {
        isAnimating = true;
        setLoadingState();
        hideContainers();

        // Start animation
        if (animationType === 'wheel') {
            await animateWheel();
        } else {
            await animateCard();
        }

        // Call API
        const result = await callGenerateAPI(mode, scene);

        // Show result
        displayResult(result);

    } catch (error) {
        displayError(error.message);
    } finally {
        isAnimating = false;
        resetButtonState();
    }
}

function handleRetry() {
    resetToInitialState();
}

function hideContainers() {
    resultContainer.style.display = 'none';
    errorContainer.style.display = 'none';
}

async function animateWheel() {
    return new Promise((resolve) => {
        // Generate random rotation (multiple full rotations + random position)
        const minRotations = 3;
        const maxRotations = 6;
        const rotations = minRotations + Math.random() * (maxRotations - minRotations);
        const finalDegree = rotations * 360 + Math.random() * 360;

        // Apply animation
        wheel.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheel.style.transform = `rotate(${finalDegree}deg)`;

        // Wait for animation to complete
        setTimeout(() => {
            wheel.style.transition = 'none';
            resolve();
        }, 3000);
    });
}

async function animateCard() {
    return new Promise((resolve) => {
        // Card flip animation using anime.js
        anime({
            targets: topCard,
            rotateY: [0, 180],
            duration: 1500,
            easing: 'easeInOutQuart',
            complete: () => {
                // Change card appearance mid-flip
                setTimeout(() => {
                    anime({
                        targets: topCard,
                        rotateY: [180, 360],
                        duration: 1500,
                        easing: 'easeInOutQuart',
                        complete: resolve
                    });
                }, 200);
            }
        });
    });
}

async function callGenerateAPI(mode, scene) {
    const response = await fetch('/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, scene })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || '请求失败，请稍后重试');
    }

    if (!data.success) {
        throw new Error(data.error || '生成失败，请重试');
    }

    return data;
}

function displayResult(result) {
    // Update result content
    resultText.textContent = result.question;
    resultType.textContent = result.mode === 'truth' ? '真心话' : '大冒险';
    resultType.className = `result-type ${result.mode}`;

    if (result.scene) {
        resultScene.textContent = `场景：${result.scene}`;
        resultScene.style.display = 'block';
    } else {
        resultScene.style.display = 'none';
    }

    // Show result with animation
    resultContainer.style.display = 'block';
    resultContainer.classList.add('slide-up');

    // Show retry button
    retryBtn.style.display = 'inline-block';

    // Remove animation class after animation completes
    setTimeout(() => {
        resultContainer.classList.remove('slide-up');
    }, 600);
}

function displayError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.classList.add('slide-up');

    // Remove animation class after animation completes
    setTimeout(() => {
        errorContainer.classList.remove('slide-up');
    }, 600);
}

// Utility function for smooth transitions
function smoothTransition(element, property, from, to, duration = 300) {
    return new Promise((resolve) => {
        element.style.transition = `${property} ${duration}ms ease`;
        element.style[property] = to;
        setTimeout(resolve, duration);
    });
}

// Enhanced animations with anime.js
function enhancedWheelAnimation() {
    return anime({
        targets: wheel,
        rotate: '1440deg', // 4 full rotations
        duration: 3000,
        easing: 'easeOutQuart',
    }).finished;
}

function enhancedCardAnimation() {
    return anime.timeline()
        .add({
            targets: topCard,
            rotateY: 180,
            duration: 800,
            easing: 'easeInQuart'
        })
        .add({
            targets: topCard,
            scale: [1, 1.1, 1],
            duration: 400,
            easing: 'easeInOutQuad'
        })
        .add({
            targets: topCard,
            rotateY: 360,
            duration: 800,
            easing: 'easeOutQuart'
        }).finished;
}

// Add some visual feedback for interactions
function addHoverEffects() {
    generateBtn.addEventListener('mouseenter', function() {
        if (!isAnimating) {
            anime({
                targets: generateBtn,
                scale: 1.05,
                duration: 200,
                easing: 'easeOutQuad'
            });
        }
    });

    generateBtn.addEventListener('mouseleave', function() {
        if (!isAnimating) {
            anime({
                targets: generateBtn,
                scale: 1,
                duration: 200,
                easing: 'easeOutQuad'
            });
        }
    });
}

// Initialize enhanced effects
addHoverEffects();

// Add loading animation to wheel while waiting for API
function showWheelLoading() {
    wheel.style.animation = 'spin 2s linear infinite';
}

function hideWheelLoading() {
    wheel.style.animation = 'none';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !isAnimating) {
        e.preventDefault();
        handleGenerate();
    } else if (e.code === 'Escape') {
        handleRetry();
    }
});

// Add visual indicator for keyboard shortcuts
document.addEventListener('DOMContentLoaded', function() {
    const shortcutHint = document.createElement('div');
    shortcutHint.className = 'keyboard-hint';
    shortcutHint.innerHTML = '💡 快捷键：空格键生成 | ESC重置';
    shortcutHint.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.8rem;
        z-index: 1000;
        opacity: 0.7;
    `;
    document.body.appendChild(shortcutHint);
});