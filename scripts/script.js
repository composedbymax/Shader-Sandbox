(function(){
const $ = id => document.getElementById(id);
const app = $('app'), 
        editors = $('editors'),
        vertPanel = $('vertPanel'),
        fragPanel = $('fragPanel'),
        rowDivider = $('rowDivider'),
        divider = $('divider'),
        previewPanel = $('preview-panel'),
        canvas = $('glcanvas'),
        vertTA = $('vertCode'),
        fragTA = $('fragCode'),
        vertFile = $('vertFile'),
        fragFile = $('fragFile'),
        vertFileBtn = $('vertFileBtn'),
        fragFileBtn = $('fragFileBtn'),
        vertFileName = $('vertFileName'),
        fragFileName = $('fragFileName'),
        fsBtn = $('fsBtn'),
        lintDiv = $('lint');
const audioReactive = new AudioReactive();
let fsClickTimestamps = [];
let gl;
gl = canvas.getContext('webgl2');
if (!gl) {
    console.warn('WebGL2 not available, falling back to WebGL1.');
    gl = canvas.getContext('webgl');
}
if (!gl) {
    alert('WebGL is not supported in your browser.');
} else {
    console.log(`${gl.getParameter(gl.VERSION)} context`);
}
if (!gl) { alert('WebGL not supported'); return; }
let program = null,
    attribLoc = null,
    uniforms = {},
    startTime = performance.now(),
    drag = { type: null, startPos: 0, startSize: 0 },
    editorsVisible = true;
const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
const buf = gl.createBuffer();
const performanceMonitor = new GLSLPerformanceMonitor(canvas, {
    sampleSize: 120,
    showFPS: true,
    showMemory: true,
    showGPUInfo: true,
    showDrawCalls: true,
    overlayPosition: 'top-left'
});
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
function initSplit() {
    if (editorsVisible) {
        const totalH = editors.clientHeight - rowDivider.offsetHeight;
        vertPanel.style.height = fragPanel.style.height = (totalH / 2) + 'px';
    }
    resizeCanvas();
}
function resizeCanvas() {
    const w = previewPanel.clientWidth, h = previewPanel.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; 
        canvas.height = h;
        gl.viewport(0, 0, w, h);
    }
}
function toggleEditors() {
    editorsVisible = !editorsVisible;
    if (editorsVisible) {
        editors.style.display = 'block';
        divider.style.display = 'block';
        fsBtn.textContent = '⛶';
        fsBtn.title = 'Hide Editors';
        app.style.gridTemplateColumns = '1fr auto 1fr';
    } else {
        editors.style.display = 'none';
        divider.style.display = 'none';
        fsBtn.textContent = '⊞';
        fsBtn.title = 'Show Editors (2 quick clicks for fullscreen)';
        app.style.gridTemplateColumns = '1fr auto 1fr';
    }
    setTimeout(resizeCanvas, 10);
}
function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        return { shader: null, error: err };
    }
    return { shader: s, error: null };
}
function rebuildProgram() {
    resizeCanvas();
    const lintDiv = document.getElementById('lint');
    const lintContent = document.getElementById('lintContent');
    const copyBtn = document.getElementById('copyErrorsBtn');
    const showError = (errorText) => {
        lintContent.textContent = errorText;
        copyBtn.style.display = 'block';
        lintDiv.style.display = 'block';
    };
    lintContent.textContent = '';
    copyBtn.style.display = 'none';
    lintDiv.style.display = 'none';
    if (program) gl.deleteProgram(program);
    const errors = [];
    const vs = compileShader(vertTA.value, gl.VERTEX_SHADER);
    const fs = compileShader(fragTA.value, gl.FRAGMENT_SHADER);
    if (vs.error) errors.push('Vertex: ' + vs.error);
    if (fs.error) errors.push('Fragment: ' + fs.error);
    if (errors.length) {
        showError(errors.join('\n'));
        return;
    }
    const p = gl.createProgram();
    gl.attachShader(p, vs.shader);
    gl.attachShader(p, fs.shader);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        showError('Link: ' + gl.getProgramInfoLog(p));
        gl.deleteProgram(p);
        return;
    }
    program = p;
    audioReactive.setGLContext(gl, program);
    gl.useProgram(program);
    attribLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(attribLoc);
    gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
    uniforms = {};
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
        const info = gl.getActiveUniform(program, i);
        const loc = gl.getUniformLocation(program, info.name);
        uniforms[info.name] = { loc, type: info.type };
    }
    Object.keys(uniforms).forEach(name => {
        if (name.startsWith('u_') || name.startsWith('u') && name[1] == name[1].toUpperCase()) return;
        const snake = 'u_' + name;
        if (!(snake in uniforms)) uniforms[snake] = uniforms[name];
        const camel = 'u' + name[0].toUpperCase() + name.slice(1);
        if (!(camel in uniforms)) uniforms[camel] = uniforms[name];
    });
}
document.getElementById('copyErrorsBtn').addEventListener('click', function() {
    const btn = this;
    const lintContent = document.getElementById('lintContent');
    const errorText = lintContent.textContent;
    navigator.clipboard.writeText(errorText).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
});
function render() {
    if (!program) return;
    resizeCanvas();
    gl.useProgram(program);
    const time = (performance.now() - startTime) * 0.001;
    if (uniforms.u_time) {
        gl.uniform1f(uniforms.u_time.loc, time);
    } else if (uniforms.uTime) {
        gl.uniform1f(uniforms.uTime.loc, time);
    }
    if (uniforms.u_resolution) {
        gl.uniform2f(uniforms.u_resolution.loc, canvas.width, canvas.height);
    } else if (uniforms.uResolution) {
        gl.uniform2f(uniforms.uResolution.loc, canvas.width, canvas.height);
    }
    if (uniforms.uColor) {
        gl.uniform3f(uniforms.uColor.loc, 1.0, 1.0, 1.0);
    }
    audioReactive.update();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}
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
    const allowed = ['.txt','.vert','.vs','.frag','.fs'];
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
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GLSL Animation</title>
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
    const attribRegex = /attribute\\s+(?:vec\\d+|float|int)\\s+(\\w+)/g;
    const matches = [...vertexShader.matchAll(attribRegex)];
    if (matches.length > 0) {
        attribName = matches[0][1];
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
    function render() {
        resize();
        gl.useProgram(program);
        const time = (performance.now() - startTime) * 0.001;
        const timeUniforms = ['time', 'u_time', 'uTime', 'iTime'];
        for (const timeUniform of timeUniforms) {
            if (uniforms[timeUniform]) {
                gl.uniform1f(uniforms[timeUniform], time);
                break;
            }
        }
        const resolutionUniforms = ['resolution', 'u_resolution', 'uResolution', 'iResolution'];
        for (const resUniform of resolutionUniforms) {
            if (uniforms[resUniform]) {
                gl.uniform2f(uniforms[resUniform], canvas.width, canvas.height);
                break;
            }
        }
        if (uniforms.uColor || uniforms.u_color || uniforms.color) {
            const colorUniform = uniforms.uColor || uniforms.u_color || uniforms.color;
            gl.uniform3f(colorUniform, 1.0, 1.0, 1.0);
        }
        if (uniforms.mouse || uniforms.u_mouse || uniforms.uMouse || uniforms.iMouse) {
            const mouseUniform = uniforms.mouse || uniforms.u_mouse || uniforms.uMouse || uniforms.iMouse;
            gl.uniform2f(mouseUniform, 0.0, 0.0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    render();
})();
</script>
</body>
</html>`;
    try {
        const blob = new Blob([template], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'webgl-shader.html';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export HTML file: ' + error.message);
    }
}
function addExportButtons() {
    const vertExportBtn = document.createElement('button');
    vertExportBtn.textContent = 'Export';
    vertExportBtn.title = 'Export Vertex Shader';
    vertExportBtn.onclick = () => exportShader('vert', vertTA.value);
    vertPanel.querySelector('.panel-header').appendChild(vertExportBtn);
    const fragExportBtn = document.createElement('button');
    fragExportBtn.textContent = 'Export';
    fragExportBtn.title = 'Export Fragment Shader';
    fragExportBtn.onclick = () => exportShader('frag', fragTA.value);
    fragPanel.querySelector('.panel-header').appendChild(fragExportBtn);
    const fullExportBtn = document.createElement('button');
    fullExportBtn.textContent = 'Export';
    fullExportBtn.title = 'Export Full HTML';
    fullExportBtn.style.position = 'absolute';
    fullExportBtn.classList.add('expbtn');
    fullExportBtn.onclick = exportFullHTML;
    previewPanel.appendChild(fullExportBtn);
}
window.addEventListener('load', () => {
    initSplit();
    addExportButtons();
});
window.addEventListener('resize', initSplit);
['mousedown', 'touchstart'].forEach(evt => {
    rowDivider.addEventListener(evt, e => {
        drag.type = 'row';
        drag.startPos = e.clientY || e.touches[0].clientY;
        drag.startSize = vertPanel.getBoundingClientRect().height;
        e.preventDefault();
    }, { passive: false });
    
    divider.addEventListener(evt, e => {
        drag.type = 'col';
        drag.startPos = e.clientX || e.touches[0].clientX;
        drag.startSize = editors.getBoundingClientRect().width;
        e.preventDefault();
    }, { passive: false });
});
['mousemove', 'touchmove'].forEach(evt => {
    document.addEventListener(evt, e => {
        if (!drag.type) return;
        const pos = evt.includes('touch') ? 
            (e.touches[0][drag.type === 'row' ? 'clientY' : 'clientX']) : 
            (e[drag.type === 'row' ? 'clientY' : 'clientX']);
        if (drag.type === 'row') {
            const dy = pos - drag.startPos;
            const totalH = editors.clientHeight - rowDivider.offsetHeight;
            let topH = Math.max(50, Math.min(totalH - 50, drag.startSize + dy));
            vertPanel.style.height = topH + 'px';
            fragPanel.style.height = (totalH - topH) + 'px';
        } else {
            const newW = Math.max(100, Math.min(app.clientWidth - 100, drag.startSize + pos - drag.startPos));
            editors.style.width = newW + 'px';
        }
        resizeCanvas();
        e.preventDefault();
    });
});
['mouseup', 'touchend', 'touchcancel'].forEach(evt => {
    document.addEventListener(evt, () => drag.type = null);
});
[vertTA, fragTA].forEach(ta => ta.addEventListener('input', rebuildProgram));
vertFile.addEventListener('change', () => handleFile(vertFile, vertTA));
fragFile.addEventListener('change', () => handleFile(fragFile, fragTA));
fsBtn.onclick = _ => {
  const now = performance.now();
  fsClickTimestamps.push(now);
  fsClickTimestamps.length > 2 && fsClickTimestamps.shift();
  if (fsClickTimestamps.length === 2 && now - fsClickTimestamps[0] < 600) {
    fsClickTimestamps = [];
    const el = app,
          enter = el.requestFullscreen   || el.webkitRequestFullscreen   || el.mozRequestFullScreen   || el.msRequestFullscreen,
          exit  = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen,
          fn   = document.fullscreenElement ? exit : enter,
          ctx  = document.fullscreenElement ? document : el;
    fn.call(ctx);
  } else toggleEditors();
};
rebuildProgram();
render();
window.rebuildProgram = rebuildProgram;
window.render = render;
})();