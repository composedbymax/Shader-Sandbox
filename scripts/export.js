const app = $('app'), 
previewPanel = $('preview-panel'),
vertTA = $('vertCode'),
fragTA = $('fragCode'),
vertFileBtn = $('vertFileBtn'),
fragFileBtn = $('fragFileBtn'),
vertFileName = $('vertFileName'),
fragFileName = $('fragFileName');
function exportShader(type, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shader.${type}`;
    a.click();
    URL.revokeObjectURL(url);
}
function handleFile(input, ta) {
    if (!input.files.length) return;
    const r = new FileReader();
    r.onload = e => { ta.value = e.target.result; rebuildProgram(); };
    r.readAsText(input.files[0]);
}
function handleFileDrop(file, ta, nameSpan) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.txt','.vert','.vs','.frag','.fs','.wgsl'];
    if (!allowed.includes(ext)) return;
    const r = new FileReader();
    r.onload = e => { ta.value = e.target.result; rebuildProgram(); };
    r.readAsText(file);
    nameSpan.textContent = file.name;
}
vertFileBtn.onclick = () => vertFile.click();
fragFileBtn.onclick = () => fragFile.click();
vertFile.addEventListener('change', () => {
    vertFileName.textContent = vertFile.files.length ? vertFile.files[0].name : '';
    handleFile(vertFile, vertTA);
});
fragFile.addEventListener('change', () => {
    fragFileName.textContent = fragFile.files.length ? fragFile.files[0].name : '';
    handleFile(fragFile, fragTA);
});
['dragover', 'dragenter'].forEach(evt => {
    vertTA.addEventListener(evt, e => e.preventDefault());
    fragTA.addEventListener(evt, e => e.preventDefault());
});
vertTA.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files.length) 
        handleFileDrop(e.dataTransfer.files[0], vertTA, vertFileName);
});
fragTA.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files.length)
        handleFileDrop(e.dataTransfer.files[0], fragTA, fragFileName);
});
function exportFullHTML() {
    function escapeForTemplateLiteral(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${')
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n');
    }
    const vertexSource = vertTA?.value || '';
    const fragmentSource = fragTA?.value || '';
    if (!vertexSource.trim() && !fragmentSource.trim()) {
        alert('No shader code to export!');
        return;
    }
    const isWebGPU = window.webgpuState && window.webgpuState.isWebGPUMode();
    if (isWebGPU) {
        exportWebGPUHTML(vertexSource, fragmentSource);
    } else {
        exportWebGLHTML(vertexSource, fragmentSource);
    }
}
function exportWebGLHTML(vertexSource, fragmentSource) {
    function escapeForTemplateLiteral(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${')
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n');
    }
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WebGL Shader Animation</title>
<style>
body { margin: 0; overflow: hidden; }
canvas { width: 100vw; height: 100vh; display: block; }
</style>
</head>
<body>
<canvas id="glcanvas"></canvas>
<script>
(function(){
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) { alert('WebGL not supported'); return; }
    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    const vertexShader = \`${escapeForTemplateLiteral(vertexSource)}\`;
    const fragmentShader = \`${escapeForTemplateLiteral(fragmentSource)}\`;
    function compileShader(src, type) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }
    const vs = compileShader(vertexShader, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShader, gl.FRAGMENT_SHADER);
    if (!vs || !fs) {
        console.error('Failed to compile shaders');
        return;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return;
    }
    const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
    let attribName = 'a_position';
    const attribRegex = /(attribute|in)\\s+(?:vec\\d+|float|int)\\s+(\\w+)/g;
    const matches = [...vertexShader.matchAll(attribRegex)];
    if (matches.length > 0) {
        attribName = matches[0][2];
    }
    const attribLoc = gl.getAttribLocation(program, attribName);
    if (attribLoc !== -1) {
        gl.enableVertexAttribArray(attribLoc);
        gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
    } else {
        console.warn('Could not find attribute:', attribName);
        const fallbacks = ['a_position', 'position', 'a_vertex', 'vertex'];
        let found = false;
        for (const fallback of fallbacks) {
            const loc = gl.getAttribLocation(program, fallback);
            if (loc !== -1) {
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
                found = true;
                break;
            }
        }
        if (!found) {
            console.error('No valid vertex attribute found');
            return;
        }
    }
    const uniforms = {};
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
        const info = gl.getActiveUniform(program, i);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    const startTime = performance.now();
    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
    }
    const mouse = {
        x: 0,
        y: 0,
        clickX: 0,
        clickY: 0,
        lastClickTime: 0,
        isPressed: false
    };
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = rect.height - (e.clientY - rect.top);
    });
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.clickX = e.clientX - rect.left;
        mouse.clickY = rect.height - (e.clientY - rect.top);
        mouse.lastClickTime = performance.now() * 0.001;
        mouse.isPressed = true;
    });
    canvas.addEventListener('mouseup', () => {
        mouse.isPressed = false;
    });
    canvas.addEventListener('mouseleave', () => {
        mouse.isPressed = false;
    });
    const mouseUniforms = ['mouse', 'u_mouse', 'uMouse', 'iMouse'];
    const mouseDownUniforms = ['u_mouseDown', 'uMouseDown'];
    const mouseClickUniforms = ['u_mouseClick', 'uMouseClick'];
    const mouseTimeUniforms = ['u_mouseTime', 'uMouseTime'];
    function render() {
        resize();
        gl.useProgram(program);
        const time = (performance.now() - startTime) * 0.001;
        const setUniform = (names, fn, ...args) => {
            for (const name of names) {
                if (uniforms[name]) {
                    fn(uniforms[name], ...args);
                    break;
                }
            }
        };
        setUniform(['time', 'u_time', 'uTime', 'iTime'], gl.uniform1f.bind(gl), time);
        setUniform(['resolution', 'u_resolution', 'uResolution', 'iResolution'], gl.uniform2f.bind(gl), canvas.width, canvas.height);
        setUniform(['uColor', 'u_color', 'color'], gl.uniform3f.bind(gl), 1.0, 1.0, 1.0);
        setUniform(['mouse', 'u_mouse', 'uMouse', 'iMouse'], gl.uniform2f.bind(gl),mouse.x / canvas.width, mouse.y / canvas.height);
        setUniform(['u_mouse_pixel', 'uMousePixel'], gl.uniform2f.bind(gl), mouse.x, mouse.y);
        setUniform(['u_mouse_click', 'uMouseClick'], gl.uniform2f.bind(gl),mouse.clickX / canvas.width, mouse.clickY / canvas.height);
        setUniform(['u_mouse_click_pixel', 'uMouseClickPixel'], gl.uniform2f.bind(gl),mouse.clickX, mouse.clickY);
        setUniform(mouseDownUniforms, gl.uniform1i.bind(gl), mouse.isPressed ? 1 : 0);
        setUniform(mouseTimeUniforms, gl.uniform1f.bind(gl),(performance.now() - mouse.lastClickTime) * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    render();
})();
</script>
</body>
</html>`;
    downloadFile(template, 'webgl-shader.html', 'text/html');
}
function exportWebGPUHTML(vertexSource, fragmentSource) {
    function escapeForTemplateLiteral(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${')
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n');
    }
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WebGPU Shader Animation</title>
<style>
body { margin: 0; overflow: hidden; background: #000; }
canvas { width: 100vw; height: 100vh; display: block; }
#error { 
    position: absolute; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%); 
    color: white; 
    font-family: Arial, sans-serif; 
    text-align: center; 
}
</style>
</head>
<body>
<canvas id="webgpu-canvas"></canvas>
<div id="error" style="display: none;">
    <h2>WebGPU Not Supported</h2>
    <p>This animation requires WebGPU support.<br>
    Please use a modern browser with WebGPU enabled.</p>
</div>
<script>
(async function(){
    const canvas = document.getElementById('webgpu-canvas');
    const errorDiv = document.getElementById('error');
    if (!navigator.gpu) {
        errorDiv.style.display = 'block';
        return;
    }
    const vertexShader = \`${escapeForTemplateLiteral(vertexSource)}\`;
    const fragmentShader = \`${escapeForTemplateLiteral(fragmentSource)}\`;
    let device, context, pipeline, bindGroup, uniformBuffer, vertexBuffer;
    let startTime = performance.now();
    let frameCount = 0;
    let lastFrameTime = 0;
    let deltaTime = 0;
    let fps = 60;
    const UNIFORM_BUFFER_SIZE = 80;
    const mouse = {
        x: 0,
        y: 0,
        clickX: 0,
        clickY: 0,
        isPressed: false
    };
    try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });
        if (!adapter) {
            throw new Error('No WebGPU adapter found');
        }
        device = await adapter.requestDevice();
        context = canvas.getContext('webgpu');
        if (!context) {
            throw new Error('Could not get WebGPU context');
        }
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
            alphaMode: 'premultiplied',
        });
        uniformBuffer = device.createBuffer({
            size: UNIFORM_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, vertices);
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' }
            }]
        });
        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });
        pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: device.createShaderModule({ code: vertexShader }),
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 8,
                    attributes: [{
                        format: 'float32x2',
                        offset: 0,
                        shaderLocation: 0
                    }]
                }]
            },
            fragment: {
                module: device.createShaderModule({ code: fragmentShader }),
                entryPoint: 'fs_main',
                targets: [{ format: canvasFormat }]
            },
            primitive: { topology: 'triangle-list' }
        });
        bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }]
        });
        const getMousePos = (e, isTouch = false) => {
            const rect = canvas.getBoundingClientRect();
            const point = isTouch ? (e.touches[0] || e.changedTouches[0]) : e;
            return {
                x: point.clientX - rect.left,
                y: rect.height - (point.clientY - rect.top),
            };
        };
        const updateMouse = (e, isTouch = false, type) => {
            const pos = getMousePos(e, isTouch);
            if (type === 'move') {
                mouse.x = pos.x;
                mouse.y = pos.y;
            } else if (type === 'down') {
                mouse.isPressed = true;
                mouse.clickX = pos.x;
                mouse.clickY = pos.y;
            } else if (type === 'up') {
                mouse.isPressed = false;
            }
            if (isTouch) e.preventDefault();
        };
        canvas.addEventListener('mousemove', e => updateMouse(e, false, 'move'));
        canvas.addEventListener('mousedown', e => updateMouse(e, false, 'down'));
        canvas.addEventListener('mouseup', e => updateMouse(e, false, 'up'));
        canvas.addEventListener('mouseleave', () => { mouse.isPressed = false; });
        canvas.addEventListener('touchmove', e => updateMouse(e, true, 'move'), { passive: false });
        canvas.addEventListener('touchstart', e => updateMouse(e, true, 'down'), { passive: false });
        canvas.addEventListener('touchend', e => updateMouse(e, true, 'up'), { passive: false });
        const resize = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        function render() {
            const currentTime = performance.now();
            deltaTime = (currentTime - lastFrameTime) / 1000.0;
            lastFrameTime = currentTime;
            frameCount++;
            if (frameCount % 10 === 0) {
                fps = fps * 0.9 + (1.0 / deltaTime) * 0.1;
            }
            const time = (currentTime - startTime) * 0.001;
            const uniformData = new Float32Array(20);
            let offset = 0;
            uniformData[offset++] = canvas.width;
            uniformData[offset++] = canvas.height;
            uniformData[offset++] = time;
            uniformData[offset++] = deltaTime;
            uniformData[offset++] = mouse.x;
            uniformData[offset++] = mouse.y;
            uniformData[offset++] = mouse.clickX || 0;
            uniformData[offset++] = mouse.clickY || 0;
            uniformData[offset++] = mouse.isPressed ? 1.0 : 0.0;
            uniformData[offset++] = frameCount;
            uniformData[offset++] = fps;
            uniformData[offset++] = canvas.width / canvas.height;
            uniformData[offset++] = 1.0 / canvas.width;
            uniformData[offset++] = 1.0 / canvas.height;
            uniformData[offset++] = 0.0;
            uniformData[offset++] = 0.0;
            uniformData[offset++] = 0.0;
            uniformData[offset++] = 0.0;
            uniformData[offset++] = 0.0;
            uniformData[offset++] = 0.0;
            device.queue.writeBuffer(uniformBuffer, 0, uniformData);
            const commandEncoder = device.createCommandEncoder();
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }]
            });
            renderPass.setPipeline(pipeline);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.setVertexBuffer(0, vertexBuffer);
            renderPass.draw(6);
            renderPass.end();
            device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(render);
        }
        render();
    } catch (error) {
        console.error('WebGPU initialization failed:', error);
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = \`
            <h2>WebGPU Error</h2>
            <p>Failed to initialize WebGPU:<br>\${error.message}</p>
            <p>Please check the console for more details.</p>
        \`;
    }
})();
</script>
</body>
</html>`;
    downloadFile(template, 'webgpu-shader.html', 'text/html');
}
function downloadFile(content, filename, mimeType) {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export file: ' + error.message);
    }
}
function addExportButtons() {
    if (document.querySelector('.export-added')) return;
    document.body.classList.add('export-added');
    const vertExportBtn = document.createElement('button');
    vertExportBtn.textContent = 'Export';
    vertExportBtn.title = 'Export Vertex Shader';
    vertExportBtn.onclick = () => {
        const isWebGPU = window.webgpuState && window.webgpuState.isWebGPUMode();
        const extension = isWebGPU ? 'wgsl' : 'vert';
        exportShader(extension, vertTA.value);
    };
    vertPanel.querySelector('.panel-header').appendChild(vertExportBtn);
    const fragExportBtn = document.createElement('button');
    fragExportBtn.textContent = 'Export';
    fragExportBtn.title = 'Export Fragment Shader';
    fragExportBtn.onclick = () => {
        const isWebGPU = window.webgpuState && window.webgpuState.isWebGPUMode();
        const extension = isWebGPU ? 'wgsl' : 'frag';
        exportShader(extension, fragTA.value);
    };
    fragPanel.querySelector('.panel-header').appendChild(fragExportBtn);
    const fullExportBtn = document.createElement('button');
    fullExportBtn.textContent = 'Export';
    fullExportBtn.title = 'Export Full HTML';
    fullExportBtn.style.position = 'absolute';
    fullExportBtn.classList.add('expbtn');
    fullExportBtn.onclick = exportFullHTML;
    previewPanel.appendChild(fullExportBtn);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExportButtons);
} else {
    addExportButtons();
}