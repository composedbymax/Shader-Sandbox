(function() {
    let jsMode = false;
    let savedShaderCode = { vertex: '', fragment: '' };
    let jsAnimationId = null;
    let jsCanvas = null;
    let jsCtx = null;
    let jsStartTime = Date.now();
    let jsMouse = {
        x: 0,
        y: 0,
        clickX: 0,
        clickY: 0,
        isPressed: false,
        lastClickTime: 0
    };
    let audioData = {
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0
    };
    window.jsCanvasState = {
        isJSMode: () => jsMode,
        getCanvas: () => jsCanvas,
        getContext: () => jsCtx,
        getAudioData: () => audioData
    };
    const defaultJSAnimation = `// JavaScript Canvas Animation with Audio Reactivity
// Available variables: ctx, width, height, time, mouse, audio
// ctx - 2D canvas context
// width, height - canvas dimensions  
// time - elapsed time in seconds
// mouse - {x, y, clickX, clickY, isPressed, lastClickTime}
// audio - {bass, mid, treble, volume} (0.0-1.0)
// Clear with audio-reactive transparency
ctx.fillStyle = \`rgba(0, 0, 0, \${0.05 + audio.volume * 0.15})\`;
ctx.fillRect(0, 0, width, height);
// Audio-reactive gradient
const centerX = width / 2 + Math.sin(time + audio.bass * 10) * (50 + audio.treble * 100);
const centerY = height / 2 + Math.cos(time * 0.7 + audio.mid * 8) * (40 + audio.bass * 80);
const gradient = ctx.createRadialGradient(
    centerX, centerY, 20 + audio.volume * 80,
    width / 2, height / 2, 
    Math.max(width, height) / 2 * (1 + audio.volume * 0.5)
);
gradient.addColorStop(0, \`hsl(\${(time * 20 + audio.bass * 180) % 360}, \${70 + audio.mid * 30}%, \${60 + audio.treble * 30}%)\`);
gradient.addColorStop(1, \`hsl(\${(time * 20 + 180 + audio.treble * 180) % 360}, \${50 + audio.volume * 30}%, 20%)\`);
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);
// Audio-reactive particles
const particleCount = 8 + Math.floor(audio.volume * 12);
for (let i = 0; i < particleCount; i++) {
    const angle = (time + i * 0.5 + audio.bass * 5) * (0.8 + audio.mid * 2);
    const distance = 100 + i * 20 + audio.treble * 150;
    const x = width / 2 + Math.cos(angle) * distance;
    const y = height / 2 + Math.sin(angle) * distance * 0.8;
    const radius = 20 + Math.sin(time * 2 + i + audio.volume * 10) * (10 + audio.bass * 20);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = \`hsla(\${(time * 30 + i * 45 + audio.treble * 120) % 360}, \${80 + audio.mid * 20}%, \${70 + audio.volume * 20}%, \${0.6 + audio.volume * 0.4})\`;
    ctx.fill();
    // Audio-reactive glow effect
    if (audio.volume > 0.3) {
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20 + audio.volume * 30;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
// Mouse interaction with audio influence
if (mouse.isPressed) {
    const rippleTime = (Date.now() - mouse.lastClickTime) / 1000;
    const baseRadius = rippleTime * 200;
    const audioRadius = baseRadius * (1 + audio.volume * 2);
    const alpha = Math.max(0, 1 - rippleTime);
    if (alpha > 0) {
        ctx.beginPath();
        ctx.arc(mouse.clickX, mouse.clickY, audioRadius, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(255, 255, 255, \${alpha * (0.5 + audio.volume * 0.5)})\`;
        ctx.lineWidth = 3 + audio.bass * 5;
        ctx.stroke();
        // Secondary ripple with different frequency
        ctx.beginPath();
        ctx.arc(mouse.clickX, mouse.clickY, audioRadius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(\${255 * audio.bass}, \${255 * audio.mid}, \${255 * audio.treble}, \${alpha * 0.3})\`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
// Mouse cursor with audio visualization
if (mouse.x > 0 && mouse.y > 0) {
    const cursorRadius = 30 + Math.sin(time * 3) * 10 + audio.volume * 40;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, cursorRadius, 0, Math.PI * 2);
    ctx.strokeStyle = \`hsla(\${(time * 50 + audio.bass * 180) % 360}, 100%, \${80 + audio.treble * 20}%, \${0.6 + audio.mid * 0.4})\`;
    ctx.lineWidth = 2 + audio.volume * 4;
    ctx.stroke();
    // Inner audio visualization
    for (let i = 0; i < 4; i++) {
        const audioValue = [audio.bass, audio.mid, audio.treble, audio.volume][i];
        const angle = (time * 2 + i * Math.PI / 2) + audioValue * 10;
        const innerRadius = 10 + audioValue * 15;
        const innerX = mouse.x + Math.cos(angle) * innerRadius;
        const innerY = mouse.y + Math.sin(angle) * innerRadius;
        ctx.beginPath();
        ctx.arc(innerX, innerY, 3 + audioValue * 5, 0, Math.PI * 2);
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
        ctx.fillStyle = colors[i];
        ctx.fill();
    }
}`;
    function createToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'jsToggleBtn';
        toggleBtn.innerHTML = 'JS';
        toggleBtn.title = 'JavaScript Canvas Mode';
        toggleBtn.addEventListener('click', toggleMode);
        const previewPanel = $('preview-panel');
        previewPanel.classList.add('preview-panel-relative');
        previewPanel.appendChild(toggleBtn);
    }
    function setupJSMouseEvents() {
        if (!jsCanvas) return;
        const getMousePos = (e) => {
            const rect = jsCanvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };
        jsCanvas.addEventListener('mousemove', (e) => {
            const pos = getMousePos(e);
            jsMouse.x = pos.x;
            jsMouse.y = pos.y;
        });
        jsCanvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            jsMouse.isPressed = true;
            jsMouse.clickX = pos.x;
            jsMouse.clickY = pos.y;
            jsMouse.lastClickTime = Date.now();
        });
        jsCanvas.addEventListener('mouseup', () => {
            jsMouse.isPressed = false;
        });
        jsCanvas.addEventListener('mouseleave', () => {
            jsMouse.isPressed = false;
        });
    }
    function setupResizeObserver() {
        if (!jsCanvas) return;
        const resizeObserver = new ResizeObserver(() => {
            if (jsMode) {
                resizeJSCanvas();
            }
        });
        const previewPanel = $('preview-panel');
        resizeObserver.observe(previewPanel);
        jsCanvas.resizeObserver = resizeObserver;
    }
    function toggleMode() {
        const toggleBtn = $('jsToggleBtn');
        const vertPanel = $('vertPanel');
        const fragPanel = $('fragPanel');
        const rowDivider = $('rowDivider');
        const glCanvas = $('glcanvas');
        const vertTA = $('vertCode');
        const fragTA = $('fragCode');
        if (!jsMode) {
            jsMode = true;
            savedShaderCode.vertex = vertTA.value;
            savedShaderCode.fragment = fragTA.value;
            toggleBtn.innerHTML = 'GL';
            toggleBtn.title = 'Switch back to WebGL Mode';
            toggleBtn.classList.add('active');
            fragPanel.style.display = 'none';
            rowDivider.style.display = 'none';
            vertPanel.style.height = '100%';
            const vertHeader = vertPanel.querySelector('.panel-header span');
            vertHeader.textContent = 'JavaScript Animation';
            vertTA.value = defaultJSAnimation;
            glCanvas.style.display = 'none';
            createJSCanvas();
            setupJSMouseEvents();
            setupResizeObserver();
            startJSAnimation();
            console.log('JavaScript');
        } else {
            jsMode = false;
            stopJSAnimation();
            toggleBtn.innerHTML = 'JS';
            toggleBtn.title = 'Switch to JavaScript Mode';
            toggleBtn.classList.remove('active');
            fragPanel.style.removeProperty('display');
            rowDivider.style.removeProperty('display');
            vertPanel.style.height = '50%';
            fragPanel.style.height = '50%';
            const vertHeader = vertPanel.querySelector('.panel-header span');
            vertHeader.textContent = 'Vertex Shader';
            vertTA.value = savedShaderCode.vertex;
            fragTA.value = savedShaderCode.fragment;
            glCanvas.style.display = 'block';
            removeJSCanvas();
            if (window.rebuildProgram) {
                window.rebuildProgram();
            }
            console.log('WebGL');
        }
    }
    function createJSCanvas() {
        const previewPanel = $('preview-panel');
        jsCanvas = document.createElement('canvas');
        jsCanvas.id = 'jsCanvas';
        previewPanel.appendChild(jsCanvas);
        jsCtx = jsCanvas.getContext('2d');
        resizeJSCanvas();
    }
    function removeJSCanvas() {
        if (jsCanvas) {
            if (jsCanvas.resizeObserver) {
                jsCanvas.resizeObserver.disconnect();
            }
            jsCanvas.remove();
            jsCanvas = null;
            jsCtx = null;
        }
    }
    function resizeJSCanvas() {
        if (!jsCanvas) return;
        const previewPanel = $('preview-panel');
        const rect = previewPanel.getBoundingClientRect();
        const newWidth = rect.width;
        const newHeight = rect.height;
        if (jsCanvas.width !== newWidth || jsCanvas.height !== newHeight) {
            jsCanvas.width = newWidth;
            jsCanvas.height = newHeight;
            jsMouse.x = 0;
            jsMouse.y = 0;
        }
    }
    function startJSAnimation() {
        jsStartTime = Date.now();
        renderJSAnimation();
    }
    function stopJSAnimation() {
        if (jsAnimationId) {
            cancelAnimationFrame(jsAnimationId);
            jsAnimationId = null;
        }
    }
    function updateAudioData() {
        if (window.audioReactiveInstance && window.audioReactiveInstance.analyser && window.audioReactiveInstance.isActive) {
            const analyser = window.audioReactiveInstance.analyser;
            const sensitivity = window.audioReactiveInstance.sensitivity;
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            const calc = (from, to, sens, dampening = 1) =>
                Math.min(1, data.slice(from, to).reduce((a, b) => a + b) / (to - from) / 255 * sens * dampening);
            
            audioData = {
                bass: calc(0, 20, sensitivity.bass, 0.4),
                mid: calc(20, 60, sensitivity.mid),
                treble: calc(60, 120, sensitivity.treble),
                volume: calc(0, data.length, sensitivity.volume)
            };
        } else {
            audioData = { bass: 0, mid: 0, treble: 0, volume: 0 };
        }
    }
    function renderJSAnimation() {
        if (!jsMode || !jsCanvas || !jsCtx) return;
        updateAudioData();
        const vertTA = $('vertCode');
        const time = (Date.now() - jsStartTime) / 1000;
        const width = jsCanvas.width;
        const height = jsCanvas.height;
        if (width === 0 || height === 0) {
            resizeJSCanvas();
        }
        try {
            const userCode = vertTA.value;
            const wrappedCode = `
                try {
                    ${userCode}
                } catch (e) {
                    ctx.fillStyle = 'var(--r)';
                    ctx.font = '14px monospace';
                    ctx.fillText('Error: ' + e.message, 10, 30);
                    console.error('Animation error:', e);
                }
            `;
            const animateFunction = new Function('ctx', 'width', 'height', 'time', 'mouse', 'audio', wrappedCode);
            animateFunction(jsCtx, width, height, time, jsMouse, audioData);
        } catch (error) {
            jsCtx.fillStyle = '#ff0000';
            jsCtx.font = '14px monospace';
            jsCtx.fillText('Error: ' + error.message, 10, 30);
            console.error('JavaScript animation error:', error);
        }
        jsAnimationId = requestAnimationFrame(renderJSAnimation);
    }
    function setupCodeListener() {
        const vertTA = $('vertCode');
        let timeout;
        vertTA.addEventListener('input', () => {
            if (!jsMode) return;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                console.log('JavaScript code updated');
            }, 100);
        });
    }
    function init() {
        const checkReady = () => {
            if (!$('preview-panel') || !$('vertCode')) {
                setTimeout(checkReady, 100);
                return;
            }
            createToggleButton();
            setupCodeListener();
            const observer = new MutationObserver(() => {
                if (jsMode) {
                    const vertPanel = $('vertPanel');
                    if (vertPanel && vertPanel.style.height !== '100%') {
                        vertPanel.style.height = '100%';
                    }
                }
            });
            setTimeout(() => {
                const vertPanel = $('vertPanel');
                if (vertPanel) {
                    observer.observe(vertPanel, { attributes: true, attributeFilter: ['style'] });
                }
            }, 1000);
        };
        checkReady();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();