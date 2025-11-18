const [app, previewPanel, vertTA, fragTA, vertFileBtn, fragFileBtn, vertFileName, fragFileName] = 
    ['app', 'preview-panel', 'vertCode', 'fragCode', 'vertFileBtn', 'fragFileBtn', 'vertFileName', 'fragFileName'].map($);
const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
};
const escapeTemplate = str => str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\r?\n/g, '\\n');
const handleFile = (file, ta, nameSpan) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.txt', '.vert', '.vs', '.frag', '.fs', '.wgsl', '.js'].includes(ext)) return;
    const reader = new FileReader();
    reader.onload = e => { ta.value = e.target.result; rebuildProgram(); };
    reader.readAsText(file);
    if (nameSpan) nameSpan.textContent = file.name;
};
const setupFileInput = (btn, input, ta, nameSpan) => {
    btn.onclick = () => input.click();
    input.onchange = () => {
        if (nameSpan) nameSpan.textContent = input.files[0]?.name || '';
        if (input.files[0]) handleFile(input.files[0], ta);
    };
};
setupFileInput(vertFileBtn, vertFile, vertTA, vertFileName);
setupFileInput(fragFileBtn, fragFile, fragTA, fragFileName);
[vertTA, fragTA].forEach(ta => {
    ['dragover', 'dragenter'].forEach(evt => ta.addEventListener(evt, e => e.preventDefault()));
    ta.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], ta, ta === vertTA ? vertFileName : fragFileName);
    });
});
const templates = {
    js: jsSource => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>JavaScript Canvas Animation</title>
<style>
body { margin: 0; overflow: hidden; background: #000; }
canvas { width: 100vw; height: 100vh; display: block; }
</style>
</head>
<body>
<canvas id="canvas"></canvas>
<script>
(function(){
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const startTime = Date.now();
    const mouse = { x: 0, y: 0, clickX: 0, clickY: 0, isPressed: false, lastClickTime: 0 };
    const audio = { bass: 0, mid: 0, treble: 0, volume: 0 };
    const resize = () => {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
    };
    const getPos = e => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', e => Object.assign(mouse, getPos(e)));
    canvas.addEventListener('mousedown', e => Object.assign(mouse, getPos(e), { isPressed: true, clickX: mouse.x, clickY: mouse.y, lastClickTime: Date.now() }));
    canvas.addEventListener('mouseup', () => mouse.isPressed = false);
    canvas.addEventListener('mouseleave', () => mouse.isPressed = false);
    window.addEventListener('resize', resize);
    resize();
    const userAnimation = \`${escapeTemplate(jsSource)}\`;
    function render() {
        const time = (Date.now() - startTime) / 1000;
        try {
            new Function('ctx', 'width', 'height', 'time', 'mouse', 'audio', userAnimation)(ctx, canvas.width, canvas.height, time, mouse, audio);
        } catch (error) {
            ctx.fillStyle = '#f00';
            ctx.font = '14px monospace';
            ctx.fillText('Error: ' + error.message, 10, 30);
            console.error('Animation error:', error);
        }
        requestAnimationFrame(render);
    }
    render();
})();
</script>
</body>
</html>`,
    webgl: (vert, frag) => `<!DOCTYPE html>
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
    const compileShader = (src, type) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    };
    const vs = compileShader(\`${escapeTemplate(vert)}\`, gl.VERTEX_SHADER);
    const fs = compileShader(\`${escapeTemplate(frag)}\`, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Link error:', gl.getProgramInfoLog(program));
        return;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const attribName = (\`${escapeTemplate(vert)}\`.match(/(attribute|in)\\s+(?:vec\\d+|float|int)\\s+(\\w+)/)?.[2]) || 'a_position';
    const attribLoc = gl.getAttribLocation(program, attribName);
    if (attribLoc !== -1) {
        gl.enableVertexAttribArray(attribLoc);
        gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
    } else {
        const fallback = ['a_position', 'position', 'a_vertex', 'vertex'].find(n => gl.getAttribLocation(program, n) !== -1);
        if (fallback) {
            const loc = gl.getAttribLocation(program, fallback);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        } else return;
    }
    const uniforms = {};
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
        const info = gl.getActiveUniform(program, i);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    const startTime = performance.now();
    const mouse = { x: 0, y: 0, clickX: 0, clickY: 0, lastClickTime: 0, isPressed: false };
    const resize = () => {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
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
    canvas.addEventListener('mouseup', () => mouse.isPressed = false);
    canvas.addEventListener('mouseleave', () => mouse.isPressed = false);
    const setUniform = (names, fn, ...args) => {
        const name = names.find(n => uniforms[n]);
        if (name) fn(uniforms[name], ...args);
    };
    function render() {
        resize();
        gl.useProgram(program);
        const time = (performance.now() - startTime) * 0.001;
        setUniform(['time', 'u_time', 'uTime', 'iTime'], gl.uniform1f.bind(gl), time);
        setUniform(['resolution', 'u_resolution', 'uResolution', 'iResolution'], gl.uniform2f.bind(gl), canvas.width, canvas.height);
        setUniform(['uColor', 'u_color', 'color'], gl.uniform3f.bind(gl), 1, 1, 1);
        setUniform(['mouse', 'u_mouse', 'uMouse', 'iMouse'], gl.uniform2f.bind(gl), mouse.x / canvas.width, mouse.y / canvas.height);
        setUniform(['u_mouse_pixel', 'uMousePixel'], gl.uniform2f.bind(gl), mouse.x, mouse.y);
        setUniform(['u_mouse_click', 'uMouseClick'], gl.uniform2f.bind(gl), mouse.clickX / canvas.width, mouse.clickY / canvas.height);
        setUniform(['u_mouse_click_pixel', 'uMouseClickPixel'], gl.uniform2f.bind(gl), mouse.clickX, mouse.clickY);
        setUniform(['u_mouseDown', 'uMouseDown'], gl.uniform1i.bind(gl), mouse.isPressed ? 1 : 0);
        setUniform(['u_mouseTime', 'uMouseTime'], gl.uniform1f.bind(gl), (performance.now() - mouse.lastClickTime) * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    render();
})();
</script>
</body>
</html>`,
    webgpu: (vert, frag) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WebGPU Shader Animation</title>
<style>
body { margin: 0; overflow: hidden; background: #000; }
canvas { width: 100vw; height: 100vh; display: block; }
#error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-family: Arial; text-align: center; display: none; }
</style>
</head>
<body>
<canvas id="webgpu-canvas"></canvas>
<div id="error"><h2>WebGPU Not Supported</h2><p>Please use a modern browser with WebGPU enabled.</p></div>
<script>
(async function(){
    const canvas = document.getElementById('webgpu-canvas');
    const errorDiv = document.getElementById('error');
    if (!navigator.gpu) { errorDiv.style.display = 'block'; return; }
    const mouse = { x: 0, y: 0, clickX: 0, clickY: 0, isPressed: false };
    let startTime = performance.now(), frameCount = 0, lastFrameTime = 0, deltaTime = 0, fps = 60;
    try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) throw new Error('No WebGPU adapter');
        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu');
        if (!context) throw new Error('No WebGPU context');
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'premultiplied' });
        const uniformBuffer = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const vertexBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(vertexBuffer, 0, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
        });
        const pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            vertex: {
                module: device.createShaderModule({ code: \`${escapeTemplate(vert)}\` }),
                entryPoint: 'vs_main',
                buffers: [{ arrayStride: 8, attributes: [{ format: 'float32x2', offset: 0, shaderLocation: 0 }] }]
            },
            fragment: {
                module: device.createShaderModule({ code: \`${escapeTemplate(frag)}\` }),
                entryPoint: 'fs_main',
                targets: [{ format }]
            },
            primitive: { topology: 'triangle-list' }
        });
        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
        });
        const getPos = (e, isTouch) => {
            const rect = canvas.getBoundingClientRect();
            const pt = isTouch ? (e.touches[0] || e.changedTouches[0]) : e;
            return { x: pt.clientX - rect.left, y: rect.height - (pt.clientY - rect.top) };
        };
        const updateMouse = (e, isTouch, type) => {
            const pos = getPos(e, isTouch);
            if (type === 'move') Object.assign(mouse, pos);
            else if (type === 'down') Object.assign(mouse, { isPressed: true, clickX: pos.x, clickY: pos.y });
            else if (type === 'up') mouse.isPressed = false;
            if (isTouch) e.preventDefault();
        };
        canvas.addEventListener('mousemove', e => updateMouse(e, false, 'move'));
        canvas.addEventListener('mousedown', e => updateMouse(e, false, 'down'));
        canvas.addEventListener('mouseup', e => updateMouse(e, false, 'up'));
        canvas.addEventListener('mouseleave', () => mouse.isPressed = false);
        canvas.addEventListener('touchmove', e => updateMouse(e, true, 'move'), { passive: false });
        canvas.addEventListener('touchstart', e => updateMouse(e, true, 'down'), { passive: false });
        canvas.addEventListener('touchend', e => updateMouse(e, true, 'up'), { passive: false });
        const resize = () => {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        function render() {
            const currentTime = performance.now();
            deltaTime = (currentTime - lastFrameTime) / 1000;
            lastFrameTime = currentTime;
            if (++frameCount % 10 === 0) fps = fps * 0.9 + (1 / deltaTime) * 0.1;
            const time = (currentTime - startTime) * 0.001;
            const uniformData = new Float32Array([
                canvas.width, canvas.height, time, deltaTime,
                mouse.x, mouse.y, mouse.clickX || 0, mouse.clickY || 0,
                mouse.isPressed ? 1 : 0, frameCount, fps, canvas.width / canvas.height,
                1 / canvas.width, 1 / canvas.height, 0, 0, 0, 0, 0, 0
            ]);
            device.queue.writeBuffer(uniformBuffer, 0, uniformData);
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.draw(6);
            pass.end();
            device.queue.submit([encoder.finish()]);
            requestAnimationFrame(render);
        }
        render();
    } catch (error) {
        console.error('WebGPU error:', error);
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = \`<h2>WebGPU Error</h2><p>\${error.message}</p>\`;
    }
})();
</script>
</body>
</html>`
};
function exportFullHTML() {
    const isJSMode = window.jsCanvasState?.isJSMode();
    const isWebGPU = window.webgpuState?.isWebGPUMode();
    const vert = vertTA?.value || '';
    const frag = fragTA?.value || '';
    if (!vert.trim() && !frag.trim()) {
        alert('No code to export!');
        return;
    }
    if (isJSMode) {
        downloadFile(templates.js(vert), 'js-canvas-animation.html', 'text/html');
    } else if (isWebGPU) {
        downloadFile(templates.webgpu(vert, frag), 'webgpu-shader.html', 'text/html');
    } else {
        downloadFile(templates.webgl(vert, frag), 'webgl-shader.html', 'text/html');
    }
}
const exportShader = (ext, content) => downloadFile(content, `shader.${ext}`);
function addExportButtons() {
    if (document.querySelector('.export-added')) return;
    document.body.classList.add('export-added');
    const addBtn = (parent, title, onClick) => {
        const btn = Object.assign(document.createElement('button'), { textContent: 'Export', title, onclick: onClick });
        parent.querySelector('.panel-header').appendChild(btn);
    };
    addBtn(vertPanel, 'Export Vertex Shader', () => {
        const isJSMode = window.jsCanvasState?.isJSMode();
        const isWebGPU = window.webgpuState?.isWebGPUMode();
        exportShader(isJSMode ? 'js' : (isWebGPU ? 'wgsl' : 'vert'), vertTA.value);
    });
    addBtn(fragPanel, 'Export Fragment Shader', () => {
        const isWebGPU = window.webgpuState?.isWebGPUMode();
        exportShader(isWebGPU ? 'wgsl' : 'frag', fragTA.value);
    });
    const fullBtn = Object.assign(document.createElement('button'), {
        textContent: 'Export',
        title: 'Export Full HTML',
        onclick: exportFullHTML
    });
    fullBtn.style.position = 'absolute';
    fullBtn.classList.add('expbtn');
    previewPanel.appendChild(fullBtn);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExportButtons);
} else {
    addExportButtons();
}