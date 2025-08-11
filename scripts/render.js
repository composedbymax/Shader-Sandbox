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
        fsBtn = $('fsBtn'),
        lintDiv = $('lint');
const audioReactive = new AudioReactive();
let fsClickTimestamps = [];
let gl;
let animationId = null;
let isAnimationPaused = false;
let lastActiveTime = 0;
let mouse = {
    x: 0,
    y: 0,
    clickX: 0,
    clickY: 0,
    isPressed: false,
    lastClickTime: 0
};
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
    pauseOnBlurEnabled = true;
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
const getPos = (e, isTouch = false) => {
    const rect = canvas.getBoundingClientRect();
    const point = isTouch ? (e.touches[0] || e.changedTouches[0]) : e;
    return {
        x: point.clientX - rect.left,
        y: rect.height - (point.clientY - rect.top),
    };
};
const updateMouse = (e, isTouch = false, type) => {
    if (drag.type) return;
    const pos = getPos(e, isTouch);
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
    if (isTouch) e.preventDefault();
};
canvas.addEventListener('mousemove', e => updateMouse(e, false, 'move'));
canvas.addEventListener('mousedown', e => updateMouse(e, false, 'down'));
canvas.addEventListener('mouseup', e => updateMouse(e, false, 'up'));
canvas.addEventListener('mouseleave', () => { mouse.isPressed = false; });
canvas.addEventListener('touchmove', e => updateMouse(e, true, 'move'), { passive: false });
canvas.addEventListener('touchstart', e => updateMouse(e, true, 'down'), { passive: false });
canvas.addEventListener('touchend', e => updateMouse(e, true, 'up'), { passive: false });
const togglePauseState = () => {
    const shouldPause = document.hidden || !document.hasFocus();
    pauseOnBlurEnabled && (shouldPause ? pauseAnimation() : resumeAnimation());
};
const pauseAnimation = () => {
    if (animationId && !isAnimationPaused) {
        cancelAnimationFrame(animationId);
        animationId = null;
        isAnimationPaused = true;
        lastActiveTime = performance.now();
    }
};
const resumeAnimation = () => {
    if (isAnimationPaused) {
        startTime += performance.now() - lastActiveTime;
        isAnimationPaused = false;
        render();
    }
};
document.addEventListener('visibilitychange', togglePauseState);
window.addEventListener('focus', togglePauseState);
window.addEventListener('blur', () => pauseOnBlurEnabled && pauseAnimation());
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        pauseOnBlurEnabled = !pauseOnBlurEnabled;
        showToast(`Window Focus ${pauseOnBlurEnabled ? 'enabled' : 'disabled'}`);
    }
});
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
    const closeBtn = document.getElementById('closeLintBtn');
    const showError = (errorText) => {
        lintContent.textContent = errorText;
        copyBtn.style.display = 'block';
        closeBtn.style.display = 'block';
        lintDiv.style.display = 'block';
    };
    lintContent.textContent = '';
    copyBtn.style.display = 'none';
    closeBtn.style.display = 'none';
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
    const possibleAttrNames = ['a_position', 'position', 'aPosition', 'a_pos'];
    attribLoc = -1;
    for (const name of possibleAttrNames) {
        attribLoc = gl.getAttribLocation(program, name);
        if (attribLoc !== -1) {
            break;
        }
    }
    if (attribLoc !== -1) {
        gl.enableVertexAttribArray(attribLoc);
        gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
    } else {
        console.warn('No position attribute found in shader. Available attributes:');
        const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttribs; i++) {
            const info = gl.getActiveAttrib(program, i);
            console.warn(`  ${info.name} (location: ${gl.getAttribLocation(program, info.name)})`);
        }
    }
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
document.getElementById('closeLintBtn').addEventListener('click', function() {
    const lintDiv = document.getElementById('lint');
    const copyBtn = document.getElementById('copyErrorsBtn');
    const closeBtn = document.getElementById('closeLintBtn');
    lintDiv.style.display = 'none';
    copyBtn.style.display = 'none';
    closeBtn.style.display = 'none';
});
function render() {
    if (!program || isAnimationPaused) return;
    resizeCanvas();
    gl.useProgram(program);
    const time = (performance.now() - startTime) * 0.001;
    const setUniform = (names, setter) => {
        for (const name of names) {
            if (uniforms[name]) {
                setter(uniforms[name].loc);
                break;
            }
        }
    };
    setUniform(['u_time', 'uTime', 'iTime'], loc => gl.uniform1f(loc, time));
    setUniform(['u_resolution', 'uResolution', 'iResolution'], loc => gl.uniform2f(loc, canvas.width, canvas.height));
    setUniform(['u_mouse', 'uMouse', 'iMouse'], loc => gl.uniform2f(loc, mouse.x / canvas.width, mouse.y / canvas.height));
    setUniform(['u_mouse_pixel', 'uMousePixel', 'iMousePixel'], loc => gl.uniform2f(loc, mouse.x, mouse.y));
    setUniform(['u_mouse_click', 'uMouseClick', 'iMouseClick'], loc => gl.uniform2f(loc, mouse.clickX / canvas.width, mouse.clickY / canvas.height));
    setUniform(['u_mouse_click_pixel', 'uMouseClickPixel', 'iMouseClickPixel'], loc => gl.uniform2f(loc, mouse.clickX, mouse.clickY));
    setUniform(['u_mouse_pressed', 'uMousePressed', 'iMousePressed'], loc => gl.uniform1i(loc, mouse.isPressed ? 1 : 0));
    setUniform(['u_mouse_click_time', 'uMouseClickTime', 'iMouseClickTime'], loc =>
        gl.uniform1f(loc, (performance.now() - mouse.lastClickTime) * 0.001)
    );
    if (uniforms.uColor) {
        gl.uniform3f(uniforms.uColor.loc, 1.0, 1.0, 1.0);
    }
    audioReactive.update();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationId = requestAnimationFrame(render);
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
window.$ = id => document.getElementById(id);
window.render = render;
window.editorsVisible = true;
})();