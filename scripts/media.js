(function() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;
  const gl = window.gl || canvas.getContext('webgl2') || canvas.getContext('webgl');
  const uniforms = window.uniforms || {};
  let mediaTexture = null;
  let mediaElement = null;
  let mediaType = null;
  let isPlaying = false;
  let animationId = null;
  let activeEffects = [];
  let currentView = 'upload';
  const previewPanel = document.getElementById('preview-panel');
  function toGLSLFloat(value) {
    const num = parseFloat(value);
    return isNaN(num) ? '0.0' : (num % 1 === 0 ? num + '.0' : num.toString());
  }
  const effects = {
    blur: {
      name: 'Blur',
      description: 'Adds a gaussian blur effect',
      params: { strength: 0.5 },
      controls: [
        { name: 'strength', label: 'Strength', type: 'range', min: 0, max: 2, step: 0.1 }
      ],
      shader: `
vec4 blur(vec4 color, vec2 uv, float strength) {
  vec4 sum = vec4(0.0);
  float off = strength * 0.01;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      sum += texture2D(u_texture, uv + vec2(float(i), float(j)) * off);
    }
  }
  vec4 blurred = sum / 25.0;
  return mix(color, blurred, strength);
}
      `
    },
    sepia: {
      name: 'Sepia',
      description: 'Applies a sepia tone effect',
      params: { intensity: 0.8 },
      controls: [
        { name: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.1 }
      ],
      shader: `
vec4 sepia(vec4 color, float intensity) {
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 sep = vec3(gray) * vec3(1.2, 1.0, 0.8);
  return vec4(mix(color.rgb, sep, intensity), color.a);
}
      `
    },
    vignette: {
      name: 'Vignette',
      description: 'Adds a dark vignette around the edges',
      params: { intensity: 0.5, radius: 0.8 },
      controls: [
        { name: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.1 },
        { name: 'radius',    label: 'Radius',    type: 'range', min: 0.1, max: 1, step: 0.1 }
      ],
      shader: `
vec4 vignette(vec4 color, vec2 uv, float intensity, float radius) {
  float d = distance(uv, vec2(0.5));
  float vig = smoothstep(radius, radius - 0.1, d);
  return vec4(color.rgb * mix(1.0, vig, intensity), color.a);
}
      `
    },
    chromatic: {
      name: 'Chromatic Aberration',
      description: 'Separates color channels for a glitch effect',
      params: { strength: 0.01 },
      controls: [
        { name: 'strength', label: 'Strength', type: 'range', min: 0, max: 0.5, step: 0.01 }
      ],
      shader: `
vec4 chromatic(vec4 color, vec2 uv, float strength) {
  vec2 off = vec2(strength, 0.0);
  vec3 ca;
  ca.r = texture2D(u_texture, uv - off).r;
  ca.g = texture2D(u_texture, uv).g;
  ca.b = texture2D(u_texture, uv + off).b;
  return vec4(mix(color.rgb, ca, strength), color.a);
}
      `
    },
    pixelate: {
      name: 'Pixelate',
      description: 'Creates a pixelated effect',
      params: { size: 64.0 },
      controls: [
        { name: 'size', label: 'Size', type: 'range', min: 8, max: 256, step: 8 }
      ],
      shader: `
vec4 pixelate(vec4 color, vec2 uv, float pixelSize) {
  vec2 gridUV = floor(uv * pixelSize) / pixelSize;
  vec4 p = texture2D(u_texture, gridUV);
  return p;
}
      `
    },
    contrast: {
      name: 'Contrast',
      description: 'Adjusts image contrast',
      params: { amount: 1.2 },
      controls: [
        { name: 'amount', label: 'Amount', type: 'range', min: 0.5, max: 2, step: 0.1 }
      ],
      shader: `
vec4 contrast(vec4 color, float amount) {
  vec3 c = ((color.rgb - 0.5) * amount) + 0.5;
  return vec4(c, color.a);
}
      `
    }
  };
  const baseVertexShader = `
attribute vec2 a_position;
varying   vec2 v_uv;
void main() {
  v_uv       = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  const baseImageFragmentShader = `
precision mediump float;
uniform sampler2D u_image;
varying   vec2      v_uv;
void main() {
  vec4 color = texture2D(u_image, v_uv);
  gl_FragColor = color;
}`;
  const baseVideoFragmentShader = `
precision mediump float;
uniform sampler2D u_video;
varying   vec2      v_uv;
void main() {
  vec4 color = texture2D(u_video, v_uv);
  gl_FragColor = color;
}`;
  function generateEffectShader() {
    if (activeEffects.length === 0) {
      return mediaType === 'video' ? baseVideoFragmentShader : baseImageFragmentShader;
    }
    let src = `
precision mediump float;
uniform sampler2D ${mediaType === 'video' ? 'u_video' : 'u_image'};
`;
    src += `
#define u_texture ${mediaType === 'video' ? 'u_video' : 'u_image'}
`;
    src += `varying vec2 v_uv;\n`;
    activeEffects.forEach(e => {
      src += effects[e.type].shader + "\n";
    });
    src += `
void main() {
  vec2 uv    = v_uv;
  vec4 color = texture2D(${mediaType === 'video' ? 'u_video' : 'u_image'}, uv);
`;
    activeEffects.forEach(e => {
      const p = { ...effects[e.type].params, ...e.params };
      switch (e.type) {
        case 'blur':
          src += `  color = blur(color, uv, ${toGLSLFloat(p.strength)});\n`;
          break;
        case 'sepia':
          src += `  color = sepia(color, ${toGLSLFloat(p.intensity)});\n`;
          break;
        case 'vignette':
          src += `  color = vignette(color, uv, ${toGLSLFloat(p.intensity)}, ${toGLSLFloat(p.radius)});\n`;
          break;
        case 'chromatic':
          src += `  color = chromatic(color, uv, ${toGLSLFloat(p.strength)});\n`;
          break;
        case 'pixelate':
          src += `  color = pixelate(color, uv, ${toGLSLFloat(p.size)});\n`;
          break;
        case 'contrast':
          src += `  color = contrast(color, ${toGLSLFloat(p.amount)});\n`;
          break;
      }
    });
    src += `
  gl_FragColor = color;
}`;
    return src;
  }
  function updateShaderCode() {
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (vertTA && fragTA) {
      vertTA.value = baseVertexShader;
      fragTA.value = generateEffectShader();
      vertTA.dispatchEvent(new Event('input', { bubbles: true }));
      fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function updateMediaTexture() {
    if (!mediaElement || !mediaTexture) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mediaElement);
    const uniformName = mediaType === 'video' ? 'u_video' : 'u_image';
    const altUniformName = mediaType === 'video' ? 'uVideo' : 'uImage';
    const loc = (uniforms[uniformName] || uniforms[altUniformName] || {}).loc;
    if (loc != null) {
      gl.useProgram(window.program);
      gl.uniform1i(loc, 0);
    }
  }
  function renderLoop() {
    if (isPlaying && mediaElement && !mediaElement.paused) {
      updateMediaTexture();
      updateProgressBar();
    }
    if (isPlaying) {
      animationId = requestAnimationFrame(renderLoop);
    }
  }
  function updateProgressBar() {
    const progressBar = document.getElementById('videoProgressBar');
    const timeInfo = document.getElementById('videoTimeInfo');
    if (progressBar && timeInfo && mediaElement && mediaType === 'video') {
      const progress = (mediaElement.currentTime / mediaElement.duration) * 100;
      progressBar.style.width = progress + '%';
      const currentMin = Math.floor(mediaElement.currentTime / 60);
      const currentSec = Math.floor(mediaElement.currentTime % 60);
      const totalMin = Math.floor(mediaElement.duration / 60);
      const totalSec = Math.floor(mediaElement.duration % 60);
      timeInfo.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${totalMin}:${totalSec.toString().padStart(2, '0')}`;
    }
  }
  const uploadBtn = document.createElement('button');
  uploadBtn.id = 'mediaUploadBtn';
  uploadBtn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 
        0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 
        0 2-2ZM5 5h14v8.59l-3.29-3.3a1 1 
        0 0 0-1.42 0L8 17l-3-3V5Zm0 
        14v-2.41l3-3 5.29 5.3a1 1 0 0 
        0 1.42 0L19 15.41V19H5Z"/>
        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  `;
  uploadBtn.title = 'Upload Image/Video';
  document.body.appendChild(uploadBtn);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.id = 'mediaFileInput';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  const modal = document.createElement('div');
  modal.id = 'mediaModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button id="mediaCloseBtn">×</button>
      <h3>Media & Effects Editor</h3>
      <div class="modal-toggle">
        <button id="uploadTab" class="active">Upload Media</button>
        <button id="effectsTab">Add Effects</button>
      </div>
      <div id="uploadView" class="modal-view active">
        <p>Select an image or video to use in your shader.</p>
        <button id="mediaDropButton">Choose File or Drag and Drop</button>
        <div id="mediaPreview"></div>
        <div class="video-controls" id="videoControls" style="display:none;">
          <button id="playPauseBtn">Play</button>
          <div class="time-info" id="videoTimeInfo">0:00 / 0:00</div>
        </div>
        <div class="video-progress" id="videoProgress" style="display:none;">
          <div class="video-progress-bar" id="videoProgressBar"></div>
        </div>
        <p class="loadmediawarn">Importing base shaders will delete current text area code</p>
        <button id="baseImportBtn">Import Base Shaders</button>
      </div>
      <div id="effectsView" class="modal-view">
        <div id="effectsContent">
          <p>Select effects to apply to your ${mediaType || 'media'}:</p>
          <div class="effects-grid" id="effectsGrid"></div>
          <div class="effect-controls" id="effectControls" style="display:none;">
            <h4>Effect Parameters</h4>
            <div id="controlsContainer"></div>
          </div>
          <div class="active-effects" id="activeEffectsContainer">
            <h4>Active Effects</h4>
            <div id="activeEffectsList"></div>
            <button class="apply-effects-btn" id="applyEffectsBtn">Apply Effects to Shader</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const dragOverlay = document.createElement('div');
  dragOverlay.id = 'mediaDragOverlay';
  dragOverlay.innerHTML = `
    <div>Drop media to upload</div>
    <div class="filename"></div>
  `;
  previewPanel.appendChild(dragOverlay);
  const dropButton = modal.querySelector('#mediaDropButton');
  const preview = modal.querySelector('#mediaPreview');
  const closeBtn = modal.querySelector('#mediaCloseBtn');
  const baseImportBtn = modal.querySelector('#baseImportBtn');
  const uploadTab = modal.querySelector('#uploadTab');
  const effectsTab = modal.querySelector('#effectsTab');
  const uploadView = modal.querySelector('#uploadView');
  const effectsView = modal.querySelector('#effectsView');
  const effectsGrid = modal.querySelector('#effectsGrid');
  const effectControls = modal.querySelector('#effectControls');
  const controlsContainer = modal.querySelector('#controlsContainer');
  const activeEffectsList = modal.querySelector('#activeEffectsList');
  const applyEffectsBtn = modal.querySelector('#applyEffectsBtn');
  const videoControls = modal.querySelector('#videoControls');
  const playPauseBtn = modal.querySelector('#playPauseBtn');
  const videoProgress = modal.querySelector('#videoProgress');
  const filenameDiv = dragOverlay.querySelector('.filename');
  let dragCounter = 0;
  let selectedEffectType = null;
  uploadTab.addEventListener('click', () => {
    currentView = 'upload';
    uploadTab.classList.add('active');
    effectsTab.classList.remove('active');
    uploadView.classList.add('active');
    effectsView.classList.remove('active');
  });
  effectsTab.addEventListener('click', () => {
    currentView = 'effects';
    effectsTab.classList.add('active');
    uploadTab.classList.remove('active');
    effectsView.classList.add('active');
    uploadView.classList.remove('active');
    updateEffectsDescription();
  });
  function updateEffectsDescription() {
    const desc = effectsView.querySelector('p');
    if (desc) {
      desc.textContent = `Select effects to apply to your ${mediaType || 'media'}:`;
    }
  }
  function populateEffectsGrid() {
    effectsGrid.innerHTML = '';
    Object.keys(effects).forEach(effectType => {
      const effect = effects[effectType];
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h4>${effect.name}</h4>
        <p>${effect.description}</p>
      `;
      card.addEventListener('click', () => selectEffect(effectType));
      effectsGrid.appendChild(card);
    });
  }
  function selectEffect(effectType) {
    selectedEffectType = effectType;
    effectsGrid.querySelectorAll('.effect-card').forEach(card => {
      card.classList.remove('active');
    });
    event.target.closest('.effect-card').classList.add('active');
    showEffectControls(effectType);
  }
  function showEffectControls(effectType) {
    const effect = effects[effectType];
    effectControls.style.display = 'block';
    controlsContainer.innerHTML = '';
    effect.controls.forEach((control, index) => {
      const controlDiv = document.createElement('div');
      controlDiv.className = 'effect-control';
      const currentValue = effect.params[control.name];
      const rangeId = `${effectType}_${control.name}_range_${index}`;
      const numberId = `${effectType}_${control.name}_number_${index}`;
      controlDiv.innerHTML = `
        <label for="${rangeId}">${control.label}:</label>
        <input type="range" 
              id="${rangeId}"
              name="${rangeId}"
              min="${control.min}" 
              max="${control.max}" 
              step="${control.step}" 
              value="${currentValue}"
              data-param="${control.name}"
              aria-label="${control.label} range slider">
        <input type="number" 
              id="${numberId}"
              name="${numberId}"
              min="${control.min}" 
              max="${control.max}" 
              step="${control.step}" 
              value="${currentValue}"
              data-param="${control.name}"
              aria-label="${control.label} numeric input">
      `;
      const rangeInput = controlDiv.querySelector('input[type="range"]');
      const numberInput = controlDiv.querySelector('input[type="number"]');
      rangeInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        numberInput.value = value;
        effect.params[control.name] = value;
      });
      numberInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        rangeInput.value = value;
        effect.params[control.name] = value;
      });
      controlsContainer.appendChild(controlDiv);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Effect';
    addBtn.className = 'apply-effects-btn';
    addBtn.style.width = 'auto';
    addBtn.style.margin = '10px 0';
    addBtn.addEventListener('click', () => addEffect(effectType));
    controlsContainer.appendChild(addBtn);
  }
  function addEffect(effectType) {
    const effect = effects[effectType];
    const effectInstance = {
      type: effectType,
      params: { ...effect.params }
    };
    activeEffects.push(effectInstance);
    updateActiveEffectsList();
    updateShaderCode();
  }
  function updateActiveEffectsList() {
    activeEffectsList.innerHTML = '';
    activeEffects.forEach((effect, index) => {
      const effectDiv = document.createElement('div');
      effectDiv.className = 'active-effect';
      effectDiv.innerHTML = `
        <span>${effects[effect.type].name}</span>
        <button onclick="removeEffect(${index})">Remove</button>
      `;
      activeEffectsList.appendChild(effectDiv);
    });
  }
  window.removeEffect = function(index) {
    activeEffects.splice(index, 1);
    updateActiveEffectsList();
    updateShaderCode();
  };
  async function handleMediaFile(file) {
    const isVideo = file.type.startsWith('video/');
    let isImage = file.type.startsWith('image/');
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (isHeic) {
      try {
        if (typeof heic2any === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/shader/scripts/utils/heic2any.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load heic2any library'));
            document.head.appendChild(script);
          });
        }
        window.showToast('Converting HEIC image...', 'info');
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9
        });
        file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
          type: 'image/jpeg'
        });
        isImage = true;
        window.showToast('HEIC conversion complete', 'success');
      } catch (error) {
        console.error('HEIC conversion error:', error);
        window.showToast(`Failed to convert HEIC image: ${error.message}`, 'error');
        return;
      }
    }
    if (isImage && !allowedImageTypes.includes(file.type) && !isHeic) {
      window.showToast(`Unsupported image format: ${file.name}`, 'error');
      return;
    }
    if (!isVideo && !isImage && !isHeic) {
      window.showToast(`Unsupported media type: ${file.name}`, 'error');
      return;
    }
    mediaType = isVideo ? 'video' : 'image';
    if (mediaType === 'video') {
      mediaElement = document.createElement('video');
      mediaElement.crossOrigin = 'anonymous';
      mediaElement.loop = true;
      mediaElement.muted = true;
      mediaElement.controls = false;
      const url = URL.createObjectURL(file);
      mediaElement.src = url;
      mediaElement.addEventListener('loadeddata', function() {
        setupMediaTexture();
        preview.innerHTML = '';
        preview.appendChild(mediaElement);
        videoControls.style.display = 'flex';
        videoProgress.style.display = 'block';
        updateProgressBar();
      });
      mediaElement.addEventListener('timeupdate', updateProgressBar);
    } else {
      const reader = new FileReader();
      reader.onload = function(e) {
        mediaElement = new Image();
        mediaElement.onload = function() {
          setupMediaTexture();
          preview.innerHTML = '';
          preview.appendChild(mediaElement);
          videoControls.style.display = 'none';
          videoProgress.style.display = 'none';
        };
        mediaElement.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    updateEffectsDescription();
  }
  function setupMediaTexture() {
    if (mediaTexture) gl.deleteTexture(mediaTexture);
    mediaTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (mediaType === 'video') {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mediaElement);
    const uniformName = mediaType === 'video' ? 'u_video' : 'u_image';
    const altUniformName = mediaType === 'video' ? 'uVideo' : 'uImage';
    const loc = (uniforms[uniformName] || uniforms[altUniformName] || {}).loc;
    if (loc != null) {
      gl.useProgram(window.program);
      gl.uniform1i(loc, 0);
    }
  }
  playPauseBtn.addEventListener('click', () => {
    if (!mediaElement || mediaType !== 'video') return;
    if (mediaElement.paused) {
      mediaElement.play();
      playPauseBtn.textContent = 'Pause';
      isPlaying = true;
      renderLoop();
    } else {
      mediaElement.pause();
      playPauseBtn.textContent = 'Play';
      isPlaying = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  });
  videoProgress.addEventListener('click', (e) => {
    if (!mediaElement || mediaType !== 'video') return;
    const rect = videoProgress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    mediaElement.currentTime = percentage * mediaElement.duration;
  });
  baseImportBtn.addEventListener('click', () => {
    activeEffects = [];
    updateActiveEffectsList();
    updateShaderCode();
  });
  applyEffectsBtn.addEventListener('click', () => {
    updateShaderCode();
  });
  uploadBtn.addEventListener('click', () => modal.style.display = 'flex');
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      modal.style.display = 'none';
    }
  });
  dropButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleMediaFile(fileInput.files[0]);
  });
  ['dragenter','dragover'].forEach(evt => {
    dropButton.addEventListener(evt, e => {
      e.preventDefault();
      dropButton.classList.add('dragover');
    });
  });
  ['dragleave','drop'].forEach(evt => {
    dropButton.addEventListener(evt, e => {
      e.preventDefault();
      dropButton.classList.remove('dragover');
    });
  });
  dropButton.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (isImage && !allowedImageTypes.includes(file.type)) {
      window.showToast(`Unsupported image format: ${file.name}`, 'error');
      return;
    }
    if (!isVideo && !isImage) {
      window.showToast(`Unsupported media type: ${file.name}`, 'error');
      return;
    }
    handleMediaFile(file);
  });
  function isOverPreviewPanel(e) {
    const rect = previewPanel.getBoundingClientRect();
    return (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
  }
  window.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    if (
      modal.style.display !== 'flex' &&
      e.dataTransfer.items &&
      [...e.dataTransfer.items].some(item => 
        item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))
      ) &&
      isOverPreviewPanel(e)
    ) {
      const mediaItem = [...e.dataTransfer.items].find(item => 
        item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))
      );
      filenameDiv.textContent = mediaItem?.getAsFile()?.name || 'Media file';
      dragOverlay.style.display = 'flex';
    }
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter = Math.max(dragCounter - 1, 0);
    if (!isOverPreviewPanel(e) || dragCounter === 0) {
      dragOverlay.style.display = 'none';
    }
  });
  window.addEventListener('drop', e => {
    e.preventDefault();
    dragOverlay.style.display = 'none';
    dragCounter = 0;
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/')) && isOverPreviewPanel(e)) {
      handleMediaFile(file);
      modal.style.display = 'flex';
    }
  });
  populateEffectsGrid();
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    [uploadBtn, modal, dragOverlay].forEach(el => parent.appendChild(el));
  });
  window.addEventListener('beforeunload', () => {
    if (mediaElement && mediaType === 'video') {
      mediaElement.pause();
      if (mediaElement.src) {
        URL.revokeObjectURL(mediaElement.src);
      }
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (mediaTexture) {
      gl.deleteTexture(mediaTexture);
    }
  });
})();