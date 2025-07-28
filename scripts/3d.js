(() => {
  function buildUI() {
    const css = `
      #objCanvas{position: absolute;top: 0;left: 0;width: 100%;height: 100%;z-index: 0;}
      #objLoadBtn{position: absolute;bottom: 10px;right: 214px;z-index: 1;padding: 6px 12px;background: var(--d);color: var(--l);border: none;cursor: pointer;width:4.25rem;height:39px;}
      #objLoadBtn:hover{background: var(--5);color: var(--l);}
      #objModalBg{display: none;position: fixed;inset: 0;background: rgba(0, 0, 0, 0.5);z-index: 30;justify-content: center;align-items: center;}
      #objModalBg.show{display: flex;}
      #objModal{background: var(--2);padding: 20px;border-radius: 6px;color: var(--7);min-width: 320px;border: 1px solid var(--4);}
      #objModal h2{margin-top: 0;color: var(--6);}
      #objDropZone{border: 2px dashed var(--5);background: var(--3);padding: 30px;text-align: center;border-radius: 6px;cursor: pointer;transition: background 0.2s, border-color 0.2s;color: var(--7);user-select: none;}
      #objDropZone:hover{background: var(--4);}
      #objDropZone.dragover{border-color: var(--rh);background: var(--4);}
      #objDropZone p{margin: 0;font-size: 14px;color: var(--6);}
      #objModal label{color: var(--6);}
      #objInfo{margin-top: 10px;color: var(--6);font-size: 14px;}
      #objErr{margin-top: 10px;color: var(--rh);font-size: 14px;display: none;}
      #objModal footer{margin-top: 20px;text-align: right;display: flex;gap: 10px;justify-content: flex-end;}
      #objClose, #objRevert{padding: 6px 12px;background: var(--3);color: var(--6);border: 1px solid var(--4);border-radius: 4px;cursor: pointer;}
      #objClose:hover, #objRevert:hover{background: var(--4);color: var(--l);}
      #objRevert{background: var(--5);color: var(--l);}
      #objRevert:hover{background: var(--6);}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const preview = document.getElementById('preview-panel');
    preview.style.position = 'relative';
    const originalCanvas = document.getElementById('glcanvas');
    const canvas = document.createElement('canvas');
    canvas.id = 'objCanvas';
    canvas.style.display = 'none';
    preview.appendChild(canvas);
    const btn = document.createElement('button');
    btn.id = 'objLoadBtn';
    btn.textContent = 'OBJ';
    preview.appendChild(btn);
    const modalBg = document.createElement('div');
    modalBg.id = 'objModalBg';
    const modal = document.createElement('div');
    modal.id = 'objModal';
    modal.innerHTML = `
      <h2>Load OBJ Model</h2>
      <div id="objDropZone">
        <p>Drag and drop an OBJ file here<br>or click to browse</p>
        <input type="file" id="objFileInput" accept=".obj" hidden />
      </div>
      <div style="margin:10px 0; display:flex; gap:10px;">
        <label class="checkbox-container">
          <input type="checkbox" id="objCull" checked />
          <span class="custom-checkbox"></span>
          <span style="margin-left:5px;">Face Culling</span>
        </label>
        <label class="checkbox-container">
          <input type="checkbox" id="objWire" />
          <span class="custom-checkbox"></span>
          <span style="margin-left:5px;">Wireframe</span>
        </label>
      </div>
      <div id="objInfo">No model loaded</div>
      <div id="objErr"></div>
      <footer>
        <button id="objRevert">Revert Shaders</button>
        <button id="objClose">Cancel</button>
      </footer>
    `;
    modalBg.appendChild(modal);
    preview.appendChild(modalBg);
    btn.onclick = () => modalBg.classList.add('show');
    modal.querySelector('#objClose').onclick = () => modalBg.classList.remove('show');
    const dropZone = modal.querySelector('#objDropZone');
    const fileInput = modal.querySelector('#objFileInput');
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
    return {
      canvas,
      originalCanvas,
      fileInput,
      cullChk: modal.querySelector('#objCull'),
      wireChk: modal.querySelector('#objWire'),
      info: modal.querySelector('#objInfo'),
      err: modal.querySelector('#objErr'),
      revertBtn: modal.querySelector('#objRevert'),
      hide: () => modalBg.classList.remove('show')
    };
  }
  let originalShaderCode = {
    vertex: '',
    fragment: ''
  };
  const shaders = {
    vertex: `attribute vec3 a_position, a_normal;
uniform mat4 u_modelMatrix, u_viewMatrix, u_projectionMatrix;
uniform mat3 u_normalMatrix;
varying vec3 v_normal, v_position;
void main() {
  vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
  v_position = worldPosition.xyz;
  v_normal = normalize(u_normalMatrix * a_normal);
  gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
}`,
    fragment: `precision mediump float;
varying vec3 v_normal, v_position;
uniform vec3 u_lightPosition, u_viewPosition;
uniform bool u_wireframe;
uniform float u_time;
void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(u_lightPosition - v_position);
  vec3 viewDir = normalize(u_viewPosition - v_position);
  vec3 reflectDir = reflect(-lightDir, normal);
  float ambient = 0.3;
  float diffuse = max(dot(normal, lightDir), 0.0);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.5;
  vec3 base = u_wireframe ? vec3(0.0, 1.0, 0.0) : vec3(0.7, 0.8, 1.0);
  vec3 timeColor = vec3(
    0.5 + 0.5 * sin(u_time * 0.8),
    0.5 + 0.5 * sin(u_time * 1.2 + 2.0),
    0.5 + 0.5 * sin(u_time * 0.6 + 4.0)
  );
  vec3 color = u_wireframe 
    ? base 
    : mix(base, timeColor * 0.3 + base, 0.3) * (ambient + diffuse) + vec3(1.0) * specular;
  gl_FragColor = vec4(color, 1.0);
}`
  };
  function storeOriginalShaderCode() {
    const vertCode = document.getElementById('vertCode');
    const fragCode = document.getElementById('fragCode');
    if (vertCode && fragCode) {
      originalShaderCode.vertex = vertCode.value;
      originalShaderCode.fragment = fragCode.value;
    }
  }
  function loadShadersToTextareas() {
    const vertCode = document.getElementById('vertCode');
    const fragCode = document.getElementById('fragCode');
    if (vertCode && fragCode) {
      vertCode.value = shaders.vertex;
      fragCode.value = shaders.fragment;
      if (window.rebuildProgram) {
        window.rebuildProgram();
      }
    }
  }
  function revertShadersToOriginal() {
    const vertCode = document.getElementById('vertCode');
    const fragCode = document.getElementById('fragCode');
    if (vertCode && fragCode && originalShaderCode.vertex && originalShaderCode.fragment) {
      vertCode.value = originalShaderCode.vertex;
      fragCode.value = originalShaderCode.fragment;
      if (window.rebuildProgram) {
        window.rebuildProgram();
      }
    }
  }
  const mat4 = {
    identity: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
    perspective: (fov, aspect, near, far) => {
      const f = 1/Math.tan(fov/2), nf = 1/(near - far);
      return [
        f/aspect,0,0,0,
        0,f,0,0,
        0,0,(far+near)*nf,-1,
        0,0,2*far*near*nf,0
      ];
    },
    lookAt: (eye, center, up) => {
      const f = vec3.normalize(vec3.sub(center, eye));
      const s = vec3.normalize(vec3.cross(f, up));
      const u = vec3.cross(s, f);
      return [
        s[0], u[0], -f[0], 0,
        s[1], u[1], -f[1], 0,
        s[2], u[2], -f[2], 0,
        -vec3.dot(s, eye), -vec3.dot(u, eye), vec3.dot(f, eye), 1
      ];
    },
    rotateX: a => {
      const c = Math.cos(a), s = Math.sin(a);
      return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1];
    },
    rotateY: a => {
      const c = Math.cos(a), s = Math.sin(a);
      return [c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1];
    },
    scale: (x, y=x, z=x) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1],
    multiply: (A, B) => {
      const R = new Array(16).fill(0);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < 4; k++) {
            R[i*4 + j] += A[i*4 + k] * B[k*4 + j];
          }
        }
      }
      return R;
    }
  };
  const vec3 = {
    normalize: v => {
      const L = Math.hypot(v[0], v[1], v[2]);
      return L > 1e-5 ? [v[0]/L, v[1]/L, v[2]/L] : [0,0,1];
    },
    sub: (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    cross: (a, b) => [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0]
    ],
    dot: (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
  };
  function parseOBJ(txt) {
    const P = [], N = [], F = [];
    txt.split(/\r?\n/).forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'v')  P.push(parts.slice(1).map(Number));
      if (parts[0] === 'vn') N.push(parts.slice(1).map(Number));
      if (parts[0] === 'f') {
        const Face = parts.slice(1).map(tok => {
          const [vi,, ni] = tok.split('/');
          return { v: +vi-1, n: ni ? +ni-1 : -1 };
        });
        if (Face.length >= 3) F.push(Face);
      }
    });
    const verts = [], norms = [], idxs = [];
    let iIdx = 0;
    F.forEach(face => {
      for (let i = 1; i < face.length - 1; i++) {
        [face[0], face[i], face[i+1]].forEach(pt => {
          const pos = P[pt.v];
          const nor = pt.n >= 0
            ? N[pt.n]
            : (() => {
                const A = P[face[0].v], B = P[face[i].v], C = P[face[i+1].v];
                return vec3.normalize(
                  vec3.cross(vec3.sub(B, A), vec3.sub(C, A))
                );
              })();
          verts.push(...pos);
          norms.push(...nor);
          idxs.push(iIdx++);
        });
      }
    });
    const mins = [Infinity,Infinity,Infinity], maxs = [-Infinity,-Infinity,-Infinity];
    for (let i = 0; i < verts.length; i += 3) {
      mins[0] = Math.min(mins[0], verts[i]);
      mins[1] = Math.min(mins[1], verts[i+1]);
      mins[2] = Math.min(mins[2], verts[i+2]);
      maxs[0] = Math.max(maxs[0], verts[i]);
      maxs[1] = Math.max(maxs[1], verts[i+1]);
      maxs[2] = Math.max(maxs[2], verts[i+2]);
    }
    const center = [
      (mins[0] + maxs[0]) / 2,
      (mins[1] + maxs[1]) / 2,
      (mins[2] + maxs[2]) / 2
    ];
    const scale = 2 / Math.max(
      maxs[0]-mins[0], maxs[1]-mins[1], maxs[2]-mins[2]
    );
    for (let i = 0; i < verts.length; i += 3) {
      verts[i  ] = (verts[i  ] - center[0]) * scale;
      verts[i+1] = (verts[i+1] - center[1]) * scale;
      verts[i+2] = (verts[i+2] - center[2]) * scale;
    }
    return { verts, norms, idxs, stats: { vertices:P.length, faces:F.length, triangles:idxs.length/3 } };
  }
  function createGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');
    let program = null;
    const locations = {};
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const updateProgram = () => {
      const vertCode = document.getElementById('vertCode');
      const fragCode = document.getElementById('fragCode');
      if (!vertCode || !fragCode) return false;
      try {
        if (program) gl.deleteProgram(program);
        program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertCode.value));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragCode.value));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(program));
        
        gl.useProgram(program);
        locations.attrPos = gl.getAttribLocation(program, 'a_position');
        locations.attrNorm = gl.getAttribLocation(program, 'a_normal');
        locations.uniM = gl.getUniformLocation(program, 'u_modelMatrix');
        locations.uniV = gl.getUniformLocation(program, 'u_viewMatrix');
        locations.uniP = gl.getUniformLocation(program, 'u_projectionMatrix');
        locations.uniN = gl.getUniformLocation(program, 'u_normalMatrix');
        locations.uniL = gl.getUniformLocation(program, 'u_lightPosition');
        locations.uniU = gl.getUniformLocation(program, 'u_viewPosition');
        locations.uniW = gl.getUniformLocation(program, 'u_wireframe');
        locations.uniTime = gl.getUniformLocation(program, 'u_time');
        return true;
      } catch (e) {
        console.error('Shader compilation error:', e.message);
        return false;
      }
    };
    updateProgram();
    return { gl, updateProgram, getLocations: () => locations };
  }
  function switchToObjCanvas(UI) {
    if (UI.originalCanvas) {
      UI.originalCanvas.style.display = 'none';
    }
    UI.canvas.style.display = 'block';
    window.objCanvasActive = true;
  }
  function switchToOriginalCanvas(UI) {
    UI.canvas.style.display = 'none';
    if (UI.originalCanvas) {
      UI.originalCanvas.style.display = 'block';
    }
    window.objCanvasActive = false;
  }
  const UI = buildUI();
  let mesh = null, scene = null;
  const state = { drag: false, last: [0,0], rot: [0,0], zoom: 1 };
  let startTime = performance.now();
  storeOriginalShaderCode();
  UI.revertBtn.addEventListener('click', () => {
    revertShadersToOriginal();
    switchToOriginalCanvas(UI);
    if (scene) {
      scene = null;
    }
    mesh = null;
    UI.fileInput.value = '';
    UI.info.textContent = 'Reverted to original shaders';
    UI.hide();
  });
  const vertCode = document.getElementById('vertCode');
  const fragCode = document.getElementById('fragCode');
  if (vertCode && fragCode) {
    [vertCode, fragCode].forEach(ta => {
      ta.addEventListener('input', () => {
        if (scene) scene.updateProgram();
      });
    });
  }
  UI.fileInput.addEventListener('change', e => {
    const f = e.target.files[0]; 
    if (!f) return;
    UI.err.style.display = 'none'; 
    UI.info.textContent = 'Loading...';
    const r = new FileReader();
    r.onload = () => {
      mesh = parseOBJ(r.result);
      switchToObjCanvas(UI);
      loadShadersToTextareas();
      initScene();
      UI.info.textContent = `Verts: ${mesh.stats.vertices}, Faces: ${mesh.stats.faces}, Triangles: ${mesh.stats.triangles}`;
      UI.hide();
    };
    r.readAsText(f);
  });
  function initScene() {
    const c = UI.canvas;
    c.style.width = '100%'; 
    c.style.height = '100%';
    c.width = c.clientWidth; 
    c.height = c.clientHeight;
    scene = createGL(c);
    const gl = scene.gl;
    scene.bV = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, scene.bV);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.STATIC_DRAW);
    scene.bN = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, scene.bN);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.norms), gl.STATIC_DRAW);
    const ext = gl.getExtension('OES_element_index_uint');
    const useUint32 = ext && mesh.idxs.length > 0xFFFF;
    const indexArray = useUint32 ? new Uint32Array(mesh.idxs) : new Uint16Array(mesh.idxs);
    scene.bI = gl.createBuffer(); 
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.bI);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
    mesh.indexType = useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    mesh.indexCount = indexArray.length;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    c.addEventListener('mousedown', e => { 
      state.drag = true; 
      state.last = [e.clientX, e.clientY]; 
    });
    window.addEventListener('mousemove', e => {
      if (state.drag) {
        state.rot[0] += (e.clientY - state.last[1]) * 0.01;
        state.rot[1] += (e.clientX - state.last[0]) * 0.01;
        state.last = [e.clientX, e.clientY];
      }
    });
    window.addEventListener('mouseup', () => state.drag = false);
    c.addEventListener('wheel', e => { 
      e.preventDefault(); 
      state.zoom *= e.deltaY > 0 ? 1.1 : 0.9; 
      state.zoom = Math.min(Math.max(state.zoom, 0.1), 10); 
    });
    window.addEventListener('resize', () => { 
      c.width = c.clientWidth; 
      c.height = c.clientHeight; 
    });
    requestAnimationFrame(draw);
  }
  function draw() {
    if (!scene || !mesh) return;
    const gl = scene.gl;
    const locations = scene.getLocations();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const M = mat4.multiply(
      mat4.rotateY(state.rot[1]),
      mat4.multiply(mat4.rotateX(state.rot[0]), mat4.scale(state.zoom))
    );
    const V = mat4.lookAt([0,0,3], [0,0,0], [0,1,0]);
    const P = mat4.perspective(Math.PI/3, gl.canvas.width/gl.canvas.height, 0.01, 1000);
    const Nmat = [M[0],M[1],M[2], M[4],M[5],M[6], M[8],M[9],M[10]];
    if (locations.uniM) gl.uniformMatrix4fv(locations.uniM, false, M);
    if (locations.uniV) gl.uniformMatrix4fv(locations.uniV, false, V);
    if (locations.uniP) gl.uniformMatrix4fv(locations.uniP, false, P);
    if (locations.uniN) gl.uniformMatrix3fv(locations.uniN, false, Nmat);
    if (locations.uniL) gl.uniform3fv(locations.uniL, [5,5,5]);
    if (locations.uniU) gl.uniform3fv(locations.uniU, [0,0,3]);
    if (locations.uniW) gl.uniform1i(locations.uniW, UI.wireChk.checked ? 1 : 0);
    if (locations.uniTime) gl.uniform1f(locations.uniTime, (performance.now() - startTime) * 0.001);
    UI.cullChk.checked ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
    if (locations.attrPos >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, scene.bV);
      gl.enableVertexAttribArray(locations.attrPos);
      gl.vertexAttribPointer(locations.attrPos, 3, gl.FLOAT, false, 0, 0);
    }
    if (locations.attrNorm >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, scene.bN);
      gl.enableVertexAttribArray(locations.attrNorm);
      gl.vertexAttribPointer(locations.attrNorm, 3, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.bI);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, mesh.indexType, 0);
    requestAnimationFrame(draw);
  }
})();