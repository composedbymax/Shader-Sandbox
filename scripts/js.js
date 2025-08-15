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
    window.jsCanvasState = {
        isJSMode: () => jsMode,
        getCanvas: () => jsCanvas,
        getContext: () => jsCtx
    };
    const defaultJSAnimation = `// JavaScript Canvas Animation
// Available variables: ctx, width, height, time, mouse
// ctx - 2D canvas context
// width, height - canvas dimensions
// time - elapsed time in seconds
// mouse - {x, y, clickX, clickY, isPressed, lastClickTime}
ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
ctx.fillRect(0, 0, width, height);
const gradient = ctx.createRadialGradient(
    width / 2 + Math.sin(time) * 100,
    height / 2 + Math.cos(time * 0.7) * 80,
    50,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
);
gradient.addColorStop(0, \`hsl(\${time * 20 % 360}, 70%, 60%)\`);
gradient.addColorStop(1, \`hsl(\${(time * 20 + 180) % 360}, 50%, 20%)\`);
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);
for (let i = 0; i < 8; i++) {
    const angle = (time + i * 0.5) * 0.8;
    const x = width / 2 + Math.cos(angle) * (100 + i * 20);
    const y = height / 2 + Math.sin(angle) * (80 + i * 15);
    const radius = 20 + Math.sin(time * 2 + i) * 10;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = \`hsla(\${(time * 30 + i * 45) % 360}, 80%, 70%, 0.8)\`;
    ctx.fill();
}
if (mouse.isPressed) {
    const rippleTime = (Date.now() - mouse.lastClickTime) / 1000;
    const rippleRadius = rippleTime * 200;
    const alpha = Math.max(0, 1 - rippleTime);
    if (alpha > 0) {
        ctx.beginPath();
        ctx.arc(mouse.clickX, mouse.clickY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(255, 255, 255, \${alpha})\`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}
if (mouse.x > 0 && mouse.y > 0) {
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 30 + Math.sin(time * 3) * 10, 0, Math.PI * 2);
    ctx.strokeStyle = \`hsla(\${time * 50 % 360}, 100%, 80%, 0.6)\`;
    ctx.lineWidth = 2;
    ctx.stroke();
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
    function renderJSAnimation() {
        if (!jsMode || !jsCanvas || !jsCtx) return;
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
            const animateFunction = new Function('ctx', 'width', 'height', 'time', 'mouse', wrappedCode);
            animateFunction(jsCtx, width, height, time, jsMouse);
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