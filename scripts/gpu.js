(function() {
    'use strict';
    let isWebGPUMode = false;
    let webgpuDevice = null;
    let webgpuContext = null;
    let webgpuPipeline = null;
    let webgpuBindGroup = null;
    let webgpuUniformBuffer = null;
    let webgpuVertexBuffer = null;
    let webgpuAnimationId = null;
    let webglAnimationId = null;
    let webgpuCanvas = null;
    let originalCanvas = null;
    let resizeObserver = null;
    let originalVertexCode = null;
    let originalFragmentCode = null;
    let originalRebuildProgram = null;
    let originalRender = null;
    let webgpuInputHandlers = new Map();
    let startTime = performance.now();
    let frameCount = 0;
    let lastFrameTime = 0;
    let deltaTime = 0;
    let fps = 60;
    const UNIFORM_BUFFER_SIZE = 80;
    let savedSnapshot = null;
    const createWebGPUToggle = () => {
        const toggleBtn = Object.assign(document.createElement('button'), {
            id: 'webgpuToggle',
            className: 'lbtn webgpu-toggle webgl-mode',
            textContent: 'WebGPU',
            title: 'Toggle between WebGL and WebGPU rendering',
        });
        const canvas = document.getElementById('glcanvas');
        const container = canvas?.parentElement || document.body;
        container.appendChild(toggleBtn);
        return toggleBtn;
    };
    const storeOriginalCode = () => {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        if (vertCode && fragCode && originalVertexCode === null && originalFragmentCode === null) {
            originalVertexCode = vertCode.value;
            originalFragmentCode = fragCode.value;
        }
    };
    const captureSnapshot = () => {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        if (!vertCode || !fragCode) return;
        savedSnapshot = {
            vert: vertCode.value,
            frag: fragCode.value
        };
    };
    const restoreAndDeleteSnapshot = () => {
        if (!savedSnapshot) return;
        const vert = document.getElementById('vertCode');
        const frag = document.getElementById('fragCode');
        if (!vert || !frag) return;
        ({ vert: vert.value, frag: frag.value } = savedSnapshot);
        savedSnapshot = null;
    };
    const addWebGPUEventListeners = () => {
        const vertTA = document.getElementById('vertCode');
        const fragTA = document.getElementById('fragCode');
        if (vertTA && fragTA) {
            const webgpuHandler = () => {
                if (isWebGPUMode) {
                    rebuildWebGPUProgram();
                }
            };
            webgpuInputHandlers.set(vertTA, webgpuHandler);
            webgpuInputHandlers.set(fragTA, webgpuHandler);
            vertTA.addEventListener('input', webgpuHandler);
            fragTA.addEventListener('input', webgpuHandler);
        }
    };
    const removeWebGPUEventListeners = () => {
        const vertTA = document.getElementById('vertCode');
        const fragTA = document.getElementById('fragCode');
        webgpuInputHandlers.forEach((handler, element) => {
            element.removeEventListener('input', handler);
        });
        webgpuInputHandlers.clear();
    };
    const restoreWebGLEventListeners = () => {
        const vertTA = document.getElementById('vertCode');
        const fragTA = document.getElementById('fragCode');
        if (vertTA && fragTA && originalRebuildProgram) {
            vertTA.addEventListener('input', originalRebuildProgram);
            fragTA.addEventListener('input', originalRebuildProgram);
        }
    };
    const updateShaderEditors = (isWebGPU) => {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        const vertPanel = document.getElementById('vertPanel');
        const fragPanel = document.getElementById('fragPanel');
        if (isWebGPU) {
            storeOriginalCode();
            const vertHeader = vertPanel?.querySelector('.panel-header span');
            const fragHeader = fragPanel?.querySelector('.panel-header span');
            if (vertHeader) vertHeader.textContent = 'Vertex Shader (WGSL)';
            if (fragHeader) fragHeader.textContent = 'Fragment Shader (WGSL)';
            const vertFile = document.getElementById('vertFile');
            const fragFile = document.getElementById('fragFile');
            if (vertFile) vertFile.accept = '.wgsl,.txt';
            if (fragFile) fragFile.accept = '.wgsl,.txt';
            
            if (vertCode) {
                vertCode.value = `// WebGPU Vertex Shader (WGSL)
//  Created by Max Warren
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}
@vertex
fn vs_main(@location(0) position: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(position, 0.0, 1.0);
    output.uv = position * 0.5 + 0.5;
    return output;
}`;
            }
            if (fragCode) {
                fragCode.value = `// WebGPU Fragment Shader (WGSL)
struct Uniforms {
    resolution: vec2<f32>,
    time: f32,
    delta_time: f32,
    mouse: vec2<f32>,
    mouse_click: vec2<f32>,
    mouse_pressed: f32,
    frame: f32,
    fps: f32,
    aspect: f32,
    pixel_size: vec2<f32>,
    bass: f32,
    mid: f32,
    treble: f32,
    volume: f32,
    padding: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@fragment  
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let fragCoord = uv * u.resolution;
    let mouse_influence = length(fragCoord - u.mouse) / max(u.resolution.x, u.resolution.y);
    let click_influence = length(fragCoord - u.mouse_click) / max(u.resolution.x, u.resolution.y);
    let r = sin(u.time * 2.0 + fragCoord.x * 0.01 + mouse_influence * 10.0 + u.bass * 5.0) * 0.5 + 0.5;
    let g = sin(u.time * 1.5 + fragCoord.y * 0.01 + click_influence * 5.0 + u.mid * 3.0) * 0.5 + 0.5;
    let b = sin(u.time * 3.0 + u.frame * 0.01 + u.treble * 7.0) * 0.5 + 0.5;
    let press_effect = u.mouse_pressed * 0.3;
    let fps_effect = u.fps / 60.0 * 0.1;
    let delta_effect = clamp(u.delta_time * 10.0, 0.0, 0.2);
    let volume_boost = 1.0 + u.volume * 0.5;
    let color = vec3<f32>(r + press_effect, g + fps_effect, b + delta_effect) * volume_boost;
    return vec4<f32>(color, 1.0);
}`;
            }
        } else {
            if (vertPanel && vertPanel.querySelector('.panel-header span')) {
                vertPanel.querySelector('.panel-header span').textContent = 'Vertex Shader';
            }
            if (fragPanel && fragPanel.querySelector('.panel-header span')) {
                fragPanel.querySelector('.panel-header span').textContent = 'Fragment Shader';
            }
            const vertFile = document.getElementById('vertFile');
            const fragFile = document.getElementById('fragFile');
            if (vertFile) vertFile.accept = '.vert,.vs,.txt';
            if (fragFile) fragFile.accept = '.frag,.fs,.txt';
            if (vertCode && originalVertexCode !== null) {vertCode.value = originalVertexCode;}
            if (fragCode && originalFragmentCode !== null) {fragCode.value = originalFragmentCode;}
        }
    };

    const setupCanvasResizing = () => {
        if (!webgpuCanvas) return;
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        const updateCanvasSize = () => {
            if (!webgpuCanvas || !webgpuContext) return;
            const container = webgpuCanvas.parentElement;
            if (!container) return;
            const containerRect = container.getBoundingClientRect();
            const newWidth = Math.floor(containerRect.width);
            const newHeight = Math.floor(containerRect.height);
            if (webgpuCanvas.width !== newWidth || webgpuCanvas.height !== newHeight) {
                webgpuCanvas.width = newWidth;
                webgpuCanvas.height = newHeight;
                if (isWebGPUMode && webgpuPipeline) {
                    const startTime = performance.now() - (window.startTime || 0);
                    const time = startTime * 0.001;
                    renderWebGPU(time);
                }
            }
        };
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    updateCanvasSize();
                }
            });
            resizeObserver.observe(webgpuCanvas.parentElement);
        } else {
            window.addEventListener('resize', updateCanvasSize);
        }
        updateCanvasSize();
    };
    const initWebGPU = async () => {
        if (!navigator.gpu) {
            console.error('WebGPU not supported. See: https://max.x10.mx/test');
            return false;
        }
        try {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });
            if (!adapter) {
                console.error('No WebGPU adapter found');
                return false;
            }
            webgpuDevice = await adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {}
            });
            originalCanvas = document.getElementById('glcanvas');
            webgpuCanvas = document.createElement('canvas');
            webgpuCanvas.id = 'webgpu-canvas';
            webgpuCanvas.style.cssText = originalCanvas.style.cssText;
            webgpuCanvas.className = originalCanvas.className;
            captureSnapshot();
            originalCanvas.style.display = 'none';
            originalCanvas.parentNode.insertBefore(webgpuCanvas, originalCanvas);
            webgpuContext = webgpuCanvas.getContext('webgpu');
            if (!webgpuContext) {
                console.error('Could not get WebGPU context');
                return false;
            }
            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            webgpuContext.configure({
                device: webgpuDevice,
                format: canvasFormat,
                alphaMode: 'premultiplied',
            });
            startTime = performance.now();
            frameCount = 0;
            lastFrameTime = 0;
            deltaTime = 0;
            fps = 60;
            setupCanvasResizing();
            return true;
        } catch (error) {
            console.error('WebGPU initialization failed:', error);
            console.error('Error details:', error.stack);
            return false;
        }
    };
    const createWebGPUPipeline = (vertexShader, fragmentShader) => {
        try {
            [webgpuPipeline, webgpuBindGroup] = [null, null];
            [webgpuUniformBuffer, webgpuVertexBuffer].forEach(buf => {
                if (buf) buf.destroy?.();
            });
            webgpuUniformBuffer = webgpuVertexBuffer = null;
            webgpuUniformBuffer = webgpuDevice.createBuffer({
                size: UNIFORM_BUFFER_SIZE,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
            webgpuVertexBuffer = webgpuDevice.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            webgpuDevice.queue.writeBuffer(webgpuVertexBuffer, 0, vertices);
            const bindGroupLayout = webgpuDevice.createBindGroupLayout({
                entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
            });
            const pipelineLayout = webgpuDevice.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
            webgpuPipeline = webgpuDevice.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module: webgpuDevice.createShaderModule({ code: vertexShader }),
                    entryPoint: 'vs_main',
                    buffers: [{
                        arrayStride: 8,
                        attributes: [{ format: 'float32x2', offset: 0, shaderLocation: 0 }]
                    }]
                },
                fragment: {
                    module: webgpuDevice.createShaderModule({ code: fragmentShader }),
                    entryPoint: 'fs_main',
                    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
                },
                primitive: { topology: 'triangle-list' }
            });
            webgpuBindGroup = webgpuDevice.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: webgpuUniformBuffer } }]
            });
            return true;
        } catch (error) {
            console.error('WebGPU pipeline creation failed:', error);
            showWebGPUError(error.message);
            return false;
        }
    };
    const getAudioData = () => {
        const audioInstance = window.audioReactiveInstance;
        if (audioInstance && audioInstance.analyser && audioInstance.isActive) {
            const data = new Uint8Array(audioInstance.analyser.frequencyBinCount);
            audioInstance.analyser.getByteFrequencyData(data);
            const calc = (from, to, sens, dampening = 1) =>
                Math.min(1, data.slice(from, to).reduce((a, b) => a + b) / (to - from) / 255 * sens * dampening);
            return {
                bass: calc(0, 20, audioInstance.sensitivity.bass, 0.4),
                mid: calc(20, 60, audioInstance.sensitivity.mid),
                treble: calc(60, 120, audioInstance.sensitivity.treble),
                volume: calc(0, data.length, audioInstance.sensitivity.volume)
            };
        }
        return { bass: 0, mid: 0, treble: 0, volume: 0 };
    };
    const renderWebGPU = (time) => {
        if (!webgpuPipeline || !webgpuContext || !webgpuDevice || !webgpuCanvas) return;
        const currentTime = performance.now();
        deltaTime = (currentTime - lastFrameTime) / 1000.0;
        lastFrameTime = currentTime;
        frameCount++;
        if (frameCount % 10 === 0) {
            fps = fps * 0.9 + (1.0 / deltaTime) * 0.1;
        }
        const mouse = window.mouse || { 
            x: 0, y: 0, 
            clickX: 0, clickY: 0, 
            isPressed: false 
        };
        const audioData = getAudioData();
        const uniformData = new Float32Array(20);
        let offset = 0;
        uniformData[offset++] = webgpuCanvas.width;
        uniformData[offset++] = webgpuCanvas.height;
        uniformData[offset++] = time;
        uniformData[offset++] = deltaTime;
        uniformData[offset++] = mouse.x;
        uniformData[offset++] = mouse.y;
        uniformData[offset++] = mouse.clickX || 0;
        uniformData[offset++] = mouse.clickY || 0;
        uniformData[offset++] = mouse.isPressed ? 1.0 : 0.0;
        uniformData[offset++] = frameCount;
        uniformData[offset++] = fps;
        uniformData[offset++] = webgpuCanvas.width / webgpuCanvas.height;
        uniformData[offset++] = 1.0 / webgpuCanvas.width;
        uniformData[offset++] = 1.0 / webgpuCanvas.height;
        uniformData[offset++] = audioData.bass;
        uniformData[offset++] = audioData.mid;
        uniformData[offset++] = audioData.treble;
        uniformData[offset++] = audioData.volume;
        uniformData[offset++] = 0.0;
        uniformData[offset++] = 0.0;
        webgpuDevice.queue.writeBuffer(webgpuUniformBuffer, 0, uniformData);
        const commandEncoder = webgpuDevice.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: webgpuContext.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }]
        });
        renderPass.setPipeline(webgpuPipeline);
        renderPass.setBindGroup(0, webgpuBindGroup);
        renderPass.setVertexBuffer(0, webgpuVertexBuffer);
        renderPass.draw(6);
        renderPass.end();
        webgpuDevice.queue.submit([commandEncoder.finish()]);
    };
    const webgpuRenderLoop = () => {
        if (!isWebGPUMode) return;
        const currentTime = performance.now();
        const time = (currentTime - startTime) * 0.001;
        renderWebGPU(time);
        webgpuAnimationId = requestAnimationFrame(webgpuRenderLoop);
    };
    const showWebGPUError = (errorText) => {
        const lintDiv = document.getElementById('lint');
        const lintContent = document.getElementById('lintContent');
        const copyBtn = document.getElementById('copyErrorsBtn');
        const closeBtn = document.getElementById('closeLintBtn');
        if (lintContent) lintContent.textContent = 'WebGPU Error: ' + errorText;
        if (copyBtn) copyBtn.style.display = 'block';
        if (closeBtn) closeBtn.style.display = 'block';
        if (lintDiv) lintDiv.style.display = 'block';
    };
    const hideWebGPUError = () => {
        const lintDiv = document.getElementById('lint');
        const copyBtn = document.getElementById('copyErrorsBtn');
        const closeBtn = document.getElementById('closeLintBtn');
        if (lintDiv) lintDiv.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
    };
    const rebuildWebGPUProgram = () => {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        if (!vertCode || !fragCode) return;
        const lintDiv = document.getElementById('lint');
        const copyBtn = document.getElementById('copyErrorsBtn');
        const closeBtn = document.getElementById('closeLintBtn');
        if (lintDiv) lintDiv.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        const success = createWebGPUPipeline(vertCode.value, fragCode.value);
    };
    const setupWebGPUMouseEvents = () => {
        if (!webgpuCanvas) return;
        const getPos = (e, isTouch = false) => {
            const rect = webgpuCanvas.getBoundingClientRect();
            const point = isTouch ? (e.touches[0] || e.changedTouches[0]) : e;
            return {
                x: point.clientX - rect.left,
                y: rect.height - (point.clientY - rect.top),
            };
        };
        const updateMouse = (e, isTouch = false, type) => {
            const pos = getPos(e, isTouch);
            let mouse = window.mouse || { x: 0, y: 0, clickX: 0, clickY: 0, isPressed: false, lastClickTime: 0 };
            if (type === 'move') {
                mouse.x = pos.x;
                mouse.y = pos.y;
            } else if (type === 'down') {
                mouse.isPressed = true;
                mouse.clickX = pos.x;
                mouse.clickY = pos.y;
                mouse.lastClickTime = performance.now();
            } else if (type === 'up') {
                mouse.isPressed = false;
            }
            window.mouse = mouse;
            if (isTouch) e.preventDefault();
        };
        const events = ['mousemove', 'mousedown', 'mouseup', 'mouseleave', 'touchmove', 'touchstart', 'touchend'];
        events.forEach(event => {
            webgpuCanvas.removeEventListener(event, () => {});
        });
        webgpuCanvas.addEventListener('mousemove', e => updateMouse(e, false, 'move'));
        webgpuCanvas.addEventListener('mousedown', e => updateMouse(e, false, 'down'));
        webgpuCanvas.addEventListener('mouseup', e => updateMouse(e, false, 'up'));
        webgpuCanvas.addEventListener('mouseleave', () => { 
            if (window.mouse) window.mouse.isPressed = false; 
        });
        webgpuCanvas.addEventListener('touchmove', e => updateMouse(e, true, 'move'), { passive: false });
        webgpuCanvas.addEventListener('touchstart', e => updateMouse(e, true, 'down'), { passive: false });
        webgpuCanvas.addEventListener('touchend', e => updateMouse(e, true, 'up'), { passive: false });
    };
    const cleanupWebGL = () => {
        if (window.gl && window.program) {
            window.gl.deleteProgram(window.program);
            window.program = null;
        }
        if (window.animationId) {
            cancelAnimationFrame(window.animationId);
            window.animationId = null;
        }
    };
    const restoreWebGL = () => {
        const canvas = document.getElementById('glcanvas');
        if (canvas) {
            window.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!window.gl) {
                console.error('Failed to get WebGL context');
                return false;
            }
            const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
            const buf = window.gl.createBuffer();
            window.gl.bindBuffer(window.gl.ARRAY_BUFFER, buf);
            window.gl.bufferData(window.gl.ARRAY_BUFFER, quadVerts, window.gl.STATIC_DRAW);
            window.gl.enable(window.gl.BLEND);
            window.gl.blendFunc(window.gl.SRC_ALPHA, window.gl.ONE_MINUS_SRC_ALPHA);
            window.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            window.gl.clear(window.gl.COLOR_BUFFER_BIT);
            window.buf = buf;
            return true;
        }
        return false;
    };
    const toggleWebGPU = async () => {
        if (!isWebGPUMode && window.jsCanvasState && window.jsCanvasState.isJSMode()) {
            const jsBtn = document.getElementById('jsToggleBtn');
            if (jsBtn) jsBtn.click();
            setTimeout(() => toggleWebGPU(), 200);
            return;
        }
        if (!isWebGPUMode && window.is3DModelActive?.()) {
            window.deactivate3DModel?.();
        }
        const toggleBtn = document.getElementById('webgpuToggle');
        const setToggleState = (text, className) => {
            toggleBtn.textContent = text;
            toggleBtn.className = 'lbtn webgpu-toggle ' + className;
        };
        const cleanupAnimation = () => {
            [webglAnimationId, window.animationId, webgpuAnimationId].forEach(id => {
                if (id) cancelAnimationFrame(id);
            });
            webglAnimationId = window.animationId = webgpuAnimationId = null;
        };
        const destroyBuffer = (bufferVar) => {
            if (bufferVar) bufferVar.destroy();
            return null;
        };
        if (!isWebGPUMode) {
            if (!originalRebuildProgram && window.rebuildProgram) {
                originalRebuildProgram = window.rebuildProgram;
            }
            if (!originalRender && window.render) {
                originalRender = window.render;
            }
            captureSnapshot();
            cleanupAnimation();
            cleanupWebGL();
            hideWebGPUError();
            if (await initWebGPU()) {
                isWebGPUMode = true;
                setToggleState('GLSL', 'webgpu-mode');
                removeWebGPUEventListeners();
                updateShaderEditors(true);
                window.rebuildProgram = rebuildWebGPUProgram;
                window.render = webgpuRenderLoop;
                addWebGPUEventListeners();
                setupWebGPUMouseEvents();
                setTimeout(() => {
                    rebuildWebGPUProgram();
                    webgpuRenderLoop();
                }, 100);
                console.log('WebGPU');
            } else {
                console.error('Failed to initialize WebGPU');
            }
        } else {
            cleanupAnimation();
            hideWebGPUError();
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            webgpuVertexBuffer = destroyBuffer(webgpuVertexBuffer);
            webgpuUniformBuffer = destroyBuffer(webgpuUniformBuffer);
            if (webgpuDevice) {
                webgpuDevice.destroy();
                webgpuDevice = null;
            }
            [webgpuContext, webgpuPipeline, webgpuBindGroup] = [null, null, null];
            if (webgpuCanvas && originalCanvas) {
                webgpuCanvas.remove();
                originalCanvas.style.display = 'block';
                webgpuCanvas = null;
            }
            isWebGPUMode = false;
            setToggleState('WebGPU', 'webgl-mode');
            removeWebGPUEventListeners();
            updateShaderEditors(false);
            restoreAndDeleteSnapshot();
            if (originalRebuildProgram) window.rebuildProgram = originalRebuildProgram;
            if (originalRender) window.render = originalRender;
            if (restoreWebGL()) {
                restoreWebGLEventListeners();
                setTimeout(() => {
                    if (window.rebuildProgram) {
                        window.rebuildProgram();
                    }
                    if (window.render) {
                        window.render();
                    }
                }, 150);
                console.log('WebGL');
            } else {
                console.error('Failed to restore WebGL context');
            }
        }
    };
    const init = async () => {
        if (!navigator.gpu) {
            console.error('WebGPU not supported. See: https://max.x10.mx/test');
            return;
        }
        try {
            const adapter = await navigator.gpu.requestAdapter({ 
                powerPreference: 'high-performance' 
            });
            if (!adapter) {
                console.error('WebGPU not supported. See: https://max.x10.mx/test');
                return;
            }
            const toggleBtn = createWebGPUToggle();
            toggleBtn.addEventListener('click', toggleWebGPU);
        } catch (error) {
            console.error('WebGPU not supported. See: https://max.x10.mx/test');
            console.error('Details:', error.message);
            return;
        }
    };
    window.webgpuState = {
        isWebGPUMode: () => isWebGPUMode,
        getCanvas: () => webgpuCanvas,
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }
})();