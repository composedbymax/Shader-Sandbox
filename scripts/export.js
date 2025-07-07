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