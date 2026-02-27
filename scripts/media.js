(function() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;
  const gl = window.gl || canvas.getContext('webgl2') || canvas.getContext('webgl');
  let textures = [];
  let nextId = 0;
  const BLEND_MODES = [
    { id: 'mix',        label: 'Mix' },
    { id: 'add',        label: 'Additive' },
    { id: 'multiply',   label: 'Multiply' },
    { id: 'screen',     label: 'Screen' },
    { id: 'overlay',    label: 'Overlay' },
    { id: 'difference', label: 'Difference' },
  ];
  let blendMode = 'mix';
  ;(function patchDrawArrays() {
    if (gl.__mediaPatched) return;
    const orig = gl.drawArrays.bind(gl);
    gl.drawArrays = function(mode, first, count) {
      const prog = window.program;
      if (prog && textures.length > 0) {
        gl.useProgram(prog);
        textures.forEach((entry, i) => {
          if (!entry.texture) return;
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, entry.texture);
          if (entry.type === 'video' && entry.isPlaying &&
              entry.element && !entry.element.paused) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.element);
          }
          const uname = textures.length === 1
            ? (entry.type === 'video' ? 'u_video' : 'u_image')
            : `u_tex${i}`;
          const loc = gl.getUniformLocation(prog, uname);
          if (loc !== null) gl.uniform1i(loc, i);
        });
      }
      orig(mode, first, count);
    };
    gl.__mediaPatched = true;
  })();
  const baseVertexShader = `attribute vec2 a_position;
varying   vec2 v_uv;
void main() {
  v_uv        = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  function buildFragmentShader() {
    const n = textures.length;
    if (n === 0) {
      return `precision mediump float;
varying vec2 v_uv;
void main() { gl_FragColor = vec4(0.0); }`;
    }
    if (n === 1) {
      const uname = textures[0].type === 'video' ? 'u_video' : 'u_image';
      return `precision mediump float;
uniform sampler2D ${uname};
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(${uname}, v_uv);
}`;
    }
    let src = `precision mediump float;\n`;
    textures.forEach((t, i) => { src += `uniform sampler2D u_tex${i};\n`; });
    src += `varying vec2 v_uv;\n`;
    src += `
vec3 blendAdd(vec3 a, vec3 b)      { return min(a + b, vec3(1.0)); }
vec3 blendMultiply(vec3 a, vec3 b) { return a * b; }
vec3 blendScreen(vec3 a, vec3 b)   { return 1.0 - (1.0 - a) * (1.0 - b); }
vec3 blendDiff(vec3 a, vec3 b)     { return abs(a - b); }
vec3 blendOverlay(vec3 a, vec3 b) {
  vec3 r;
  r.r = a.r < 0.5 ? 2.0*a.r*b.r : 1.0 - 2.0*(1.0-a.r)*(1.0-b.r);
  r.g = a.g < 0.5 ? 2.0*a.g*b.g : 1.0 - 2.0*(1.0-a.g)*(1.0-b.g);
  r.b = a.b < 0.5 ? 2.0*a.b*b.b : 1.0 - 2.0*(1.0-a.b)*(1.0-b.b);
  return r;
}
`;
    src += `void main() {\n`;
    for (let i = 0; i < n; i++) {
      src += `  vec4 c${i} = texture2D(u_tex${i}, v_uv);\n`;
    }
    src += `  vec3 result = c0.rgb;\n`;
    for (let i = 1; i < n; i++) {
      const w = (1.0 / (i + 1)).toFixed(6);
      switch (blendMode) {
        case 'add':        src += `  result = blendAdd(result, c${i}.rgb);\n`; break;
        case 'multiply':   src += `  result = blendMultiply(result, c${i}.rgb);\n`; break;
        case 'screen':     src += `  result = blendScreen(result, c${i}.rgb);\n`; break;
        case 'overlay':    src += `  result = blendOverlay(result, c${i}.rgb);\n`; break;
        case 'difference': src += `  result = blendDiff(result, c${i}.rgb);\n`; break;
        default:           src += `  result = mix(result, c${i}.rgb, ${w});\n`; break;
      }
    }
    src += `  gl_FragColor = vec4(result, 1.0);\n}\n`;
    return src;
  }
  function pushShadersToEditor() {
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (vertTA && fragTA) {
      vertTA.value = baseVertexShader;
      fragTA.value = buildFragmentShader();
      vertTA.dispatchEvent(new Event('input', { bubbles: true }));
      fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function createGLTexture(entry) {
    if (entry.texture) gl.deleteTexture(entry.texture);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.element);
    entry.texture = tex;
  }
  function startVideoLoop(entry) {
    if (entry.animId) return;
    function loop() {
      if (!entry.isPlaying) { entry.animId = null; return; }
      updateVideoScrubber(entry);
      entry.animId = requestAnimationFrame(loop);
    }
    entry.animId = requestAnimationFrame(loop);
  }
  function stopVideoLoop(entry) {
    if (entry.animId) { cancelAnimationFrame(entry.animId); entry.animId = null; }
    entry.isPlaying = false;
  }
  function updateVideoScrubber(entry) {
    const row = document.querySelector(`.tex-row[data-id="${entry.id}"]`);
    if (!row) return;
    const fill   = row.querySelector('.vid-progress-fill');
    const handle = row.querySelector('.vid-scrub-handle');
    const time   = row.querySelector('.vid-time');
    const el     = entry.element;
    if (!el || !el.duration) return;
    const pct = (el.currentTime / el.duration) * 100;
    if (fill)   fill.style.width  = pct + '%';
    if (handle) handle.style.left = pct + '%';
    if (time) {
      const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
      time.textContent = `${fmt(el.currentTime)} / ${fmt(el.duration)}`;
    }
  }
  async function handleMediaFile(file) {
    const isVideo = file.type.startsWith('video/');
    let isImage   = file.type.startsWith('image/');
    const isHeic  = /\.(heic|heif)$/i.test(file.name);
    const allowedImageTypes = ['image/jpeg','image/png','image/gif','image/webp'];
    if (isHeic) {
      try {
        if (typeof heic2any === 'undefined') {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/shader/scripts/utils/heic2any.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load heic2any'));
            document.head.appendChild(s);
          });
        }
        window.showToast?.('Converting HEIC image…', 'info');
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        file = new File([blob], file.name.replace(/\.heic$/i,'.jpg').replace(/\.heif$/i,'.jpg'), { type:'image/jpeg' });
        isImage = true;
        window.showToast?.('HEIC conversion complete', 'success');
      } catch (err) {
        window.showToast?.(`HEIC convert failed: ${err.message}`, 'error');
        return;
      }
    }
    if (isImage && !allowedImageTypes.includes(file.type) && !isHeic) {
      window.showToast?.(`Unsupported image format: ${file.name}`, 'error');
      return;
    }
    if (!isVideo && !isImage) {
      window.showToast?.(`Unsupported media type: ${file.name}`, 'error');
      return;
    }
    const entry = {
      id:        nextId++,
      name:      file.name,
      type:      isVideo ? 'video' : 'image',
      element:   null,
      texture:   null,
      isPlaying: false,
      animId:    null,
      url:       null,
    };
    if (isVideo) {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.loop     = true;
      vid.muted    = true;
      vid.controls = false;
      entry.url = URL.createObjectURL(file);
      vid.src = entry.url;
      vid.addEventListener('loadeddata', () => {
        entry.element = vid;
        textures.push(entry);
        createGLTexture(entry);
        pushShadersToEditor();
        renderTextureList();
        vid.play();
        entry.isPlaying = true;
        startVideoLoop(entry);
      });
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          entry.element = img;
          textures.push(entry);
          createGLTexture(entry);
          pushShadersToEditor();
          renderTextureList();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  function removeTexture(id) {
    const idx = textures.findIndex(t => t.id === id);
    if (idx < 0) return;
    const entry = textures[idx];
    stopVideoLoop(entry);
    if (entry.url)     URL.revokeObjectURL(entry.url);
    if (entry.texture) gl.deleteTexture(entry.texture);
    textures.splice(idx, 1);
    textures.forEach(e => createGLTexture(e));
    pushShadersToEditor();
    renderTextureList();
  }
  const uploadBtn = document.createElement('button');
  uploadBtn.id    = 'mediaUploadBtn';
  uploadBtn.title = 'Textures / Media';
  uploadBtn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM5 5h14v8.59l-3.29-3.3a1 1 0 0 0-1.42 0L8 17l-3-3V5Zm0 14v-2.41l3-3 5.29 5.3a1 1 0 0 0 1.42 0L19 15.41V19H5Z"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    </svg>`;
  document.body.appendChild(uploadBtn);
  const fileInput = document.createElement('input');
  fileInput.type     = 'file';
  fileInput.accept   = 'image/*,video/*';
  fileInput.multiple = true;
  fileInput.id       = 'mediaFileInput';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  const modal = document.createElement('div');
  modal.id = 'mediaModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button id="mediaCloseBtn">×</button>
      <h3>Texture Manager</h3>
      <div id="textureDropZone">
        <span>Drop or click to add textures</span>
        <span class="tex-drop-sub">Images &amp; videos</span>
      </div>
      <div id="textureListWrap">
        <div id="textureList"></div>
      </div>
      <div class="blend-row" id="blendControls">
        <label for="blendModeSelect">Blend Mode</label>
        <select id="blendModeSelect">
          ${BLEND_MODES.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
        </select>
      </div>
      <div class="media-action-row">
        <p class="loadmediawarn">Importing base shaders will replace current shader code</p>
        <button id="baseImportBtn">Import Base Shaders</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const closeBtn        = modal.querySelector('#mediaCloseBtn');
  const textureDropZone = modal.querySelector('#textureDropZone');
  const textureList     = modal.querySelector('#textureList');
  const blendControls   = modal.querySelector('#blendControls');
  const blendModeSelect = modal.querySelector('#blendModeSelect');
  const baseImportBtn   = modal.querySelector('#baseImportBtn');
  function renderTextureList() {
    textureList.innerHTML = '';
    blendControls.style.display = textures.length > 1 ? 'flex' : 'none';
    if (textures.length === 0) {
      textureList.innerHTML = '<p class="tex-empty">No textures loaded yet.</p>';
      return;
    }
    textures.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'tex-row';
      row.dataset.id = entry.id;
      const thumb = document.createElement('div');
      thumb.className = 'tex-thumb';
      if (entry.type === 'image') {
        const img = document.createElement('img');
        img.src = entry.element.src;
        thumb.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'tex-thumb-icon';
        icon.textContent = '▶';
        thumb.appendChild(icon);
      }
      const info = document.createElement('div');
      info.className = 'tex-info';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tex-name';
      nameSpan.textContent = entry.name;
      const slotSpan = document.createElement('span');
      slotSpan.className = 'tex-slot';
      slotSpan.textContent = textures.length === 1
        ? (entry.type === 'video' ? 'u_video' : 'u_image')
        : `u_tex${i}`;
      info.appendChild(nameSpan);
      info.appendChild(slotSpan);
      if (entry.type === 'video') {
        const scrubWrap  = document.createElement('div');
        scrubWrap.className = 'vid-scrub-wrap';
        const scrubTrack = document.createElement('div');
        scrubTrack.className = 'vid-scrub-track';
        const scrubFill  = document.createElement('div');
        scrubFill.className = 'vid-progress-fill';
        const scrubHandle = document.createElement('div');
        scrubHandle.className = 'vid-scrub-handle';
        scrubTrack.appendChild(scrubFill);
        scrubTrack.appendChild(scrubHandle);
        const timeLabel  = document.createElement('span');
        timeLabel.className = 'vid-time';
        timeLabel.textContent = '0:00 / 0:00';
        scrubWrap.appendChild(scrubTrack);
        scrubWrap.appendChild(timeLabel);
        info.appendChild(scrubWrap);
        let scrubbing = false;
        function seek(e) {
          const rect = scrubTrack.getBoundingClientRect();
          const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          if (entry.element && entry.element.duration) {
            entry.element.currentTime = pct * entry.element.duration;
            updateVideoScrubber(entry);
          }
        }
        scrubTrack.addEventListener('mousedown', e => { scrubbing = true; seek(e); });
        window.addEventListener('mousemove', e => { if (scrubbing) seek(e); });
        window.addEventListener('mouseup',   ()  => { scrubbing = false; });
      }
      const controls = document.createElement('div');
      controls.className = 'tex-controls';
      if (entry.type === 'video') {
        const ppBtn = document.createElement('button');
        ppBtn.className   = 'tex-btn';
        ppBtn.textContent = entry.isPlaying ? 'Pause' : 'Play';
        ppBtn.addEventListener('click', () => {
          if (entry.isPlaying) {
            entry.element.pause();
            stopVideoLoop(entry);
            ppBtn.textContent = 'Play';
          } else {
            entry.element.play();
            entry.isPlaying = true;
            startVideoLoop(entry);
            ppBtn.textContent = 'Pause';
          }
        });
        controls.appendChild(ppBtn);
      }
      const removeBtn = document.createElement('button');
      removeBtn.className   = 'tex-btn tex-btn-remove';
      removeBtn.textContent = '✕';
      removeBtn.title       = 'Remove texture';
      removeBtn.addEventListener('click', () => removeTexture(entry.id));
      controls.appendChild(removeBtn);
      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(controls);
      textureList.appendChild(row);
    });
  }
  blendModeSelect.addEventListener('change', () => {
    blendMode = blendModeSelect.value;
    pushShadersToEditor();
  });
  textureDropZone.addEventListener('click', () => fileInput.click());
  ['dragenter','dragover'].forEach(evt => {
    textureDropZone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      textureDropZone.classList.add('dragover');
    });
  });
  textureDropZone.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    textureDropZone.classList.remove('dragover');
  });
  textureDropZone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    textureDropZone.classList.remove('dragover');
    [...e.dataTransfer.files].forEach(f => handleMediaFile(f));
  });
  modal.addEventListener('dragenter', e => e.stopPropagation());
  modal.addEventListener('dragover',  e => { e.preventDefault(); e.stopPropagation(); });
  modal.addEventListener('dragleave', e => e.stopPropagation());
  modal.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    [...e.dataTransfer.files]
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .forEach(f => handleMediaFile(f));
  });
  fileInput.addEventListener('change', () => {
    [...fileInput.files].forEach(f => handleMediaFile(f));
    fileInput.value = '';
  });
  baseImportBtn.addEventListener('click', async () => {
    const currentType = window.getCurrentAnimationType?.();
    if (currentType && currentType !== 'webgl') {
      window.switchToAnimationType?.('webgl');
      await new Promise(r => setTimeout(r, 300));
    }
    if (window.cameraSystem?.isActive) {
      await window.cameraSystem.stopCamera();
      await new Promise(r => setTimeout(r, 250));
    }
    pushShadersToEditor();
    await new Promise(r => setTimeout(r, 100));
    window.rebuildProgram?.();
    await new Promise(r => setTimeout(r, 100));
    textures.forEach(e => createGLTexture(e));
  });
  uploadBtn.addEventListener('click', () => { modal.style.display = 'flex'; renderTextureList(); });
  closeBtn.addEventListener('click',  () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') modal.style.display = 'none'; });
  window.mediaUpload = window.mediaUpload || {};
  window.mediaUpload.onFileReceived = handleMediaFile;
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    [uploadBtn, modal].forEach(el => parent.appendChild(el));
  });
  window.addEventListener('beforeunload', () => {
    textures.forEach(entry => {
      stopVideoLoop(entry);
      if (entry.url)     URL.revokeObjectURL(entry.url);
      if (entry.texture) gl.deleteTexture(entry.texture);
    });
  });
  renderTextureList();
})();