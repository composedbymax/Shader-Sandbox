(function() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;
  const gl = window.gl || canvas.getContext('webgl2') || canvas.getContext('webgl');
  const uniforms = window.uniforms || {};
  let imageTexture = null;
  let activeEffects = [];
  let currentView = 'upload';
  const style = document.createElement('style');
  style.textContent = `
    #imgUploadBtn{z-index: 10;cursor: pointer;position: absolute;top: 42px;right: 10px;background: var(--d);color: var(--6);border: none;width: 2rem;height: 2rem;padding: 0.25rem;display: flex;align-items: center;justify-content: center;}
    #imgUploadBtn svg{width: 1.25rem;height: 1.25rem;}
    #imgUploadBtn:hover{background: var(--5);}
    #baseImportBtn{background: var(--a);color: white;border: none;border-radius: 4px;padding: 10px 20px;margin: 10px;cursor: pointer;font-size: 14px;}
    #baseImportBtn:hover{background: var(--ah);}
    #imgCloseBtn{position: absolute;top: 10px;right: 15px;background: var(--r);color: white;border: none;border-radius: 50%;width: 30px;height: 30px;font-size: 18px;cursor: pointer;display: flex;align-items: center;justify-content: center;}
    #imgCloseBtn:hover{background: var(--rh);}
    #imgModal{position: fixed;top: 0;left: 0;right: 0;bottom: 0;display: none;align-items: center;justify-content: center;z-index: 99999;max-width: 50vw;margin: auto;}
    #imgModal .modal-content{background: var(--4);padding: 20px;border-radius: 8px;max-width: 90%;max-height: 90%;overflow: auto;text-align: center;position: relative;min-width: 500px;}
    #imgModal img{max-width: 100%;max-height: 40vh;display: block;margin: 10px auto;}
    #imgDropButton{padding: 40px 60px;border: 2px dashed var(--6);background: var(--3);border-radius: 8px;cursor: pointer;font-size: 16px;color: var(--6);margin: 20px 0;transition: all 0.3s ease;}
    #imgDropButton:hover{background: var(--5);border-color: var(--a);color:var(--7);}
    #dragOverlay{position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: var(--d);backdrop-filter: blur(5px);z-index: 2000;display: none;align-items: center;justify-content: center;flex-direction: column;color: white;font-size: 24px;text-align: center;}
    #dragOverlay .filename{margin-top: 10px;font-size: 18px;opacity: 0.8;}
    .modal-toggle{display: flex;background: var(--3);border-radius: 6px;margin: 10px 0;overflow: hidden;}
    .modal-toggle button{background: none;border: none;padding: 10px 20px;cursor: pointer;color: var(--6);transition: all 0.3s ease;flex: 1;}
    .modal-toggle button.active{background: var(--a);color: white;}
    .modal-toggle button:hover:not(.active){background: var(--5);}
    .modal-view{display: none;}
    .modal-view.active{display: block;}
    .effects-grid{display: grid;grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap: 15px;margin: 20px 0;}
    .effect-card{background: var(--3);border: 2px solid var(--5);border-radius: 8px;padding: 15px;cursor: pointer;transition: all 0.3s ease;text-align: left;}
    .effect-card:hover{border-color: var(--a);background: var(--5);}
    .effect-card.active{border-color: var(--a);background: var(--ah);}
    .effect-card h4{margin: 0 0 8px 0;color: var(--7);font-size: 14px;}
    .effect-card p{margin: 0;color: var(--6);font-size: 12px;}
    .effect-controls{margin-top: 20px;padding-top: 20px;border-top: 1px solid var(--5);}
    .effect-control{display: flex;align-items: center;gap: 10px;margin: 10px 0;}
    .effect-control label{color: var(--6);font-size: 14px;min-width: 80px;}
    .effect-control input[type="range"]{flex: 1;height: 20px;}
    .effect-control input[type="number"]{width: 60px;padding: 4px;border: 1px solid var(--5);background: var(--3);color: var(--6);border-radius: 4px;}
    .active-effects{margin-top: 20px;padding-top: 20px;border-top: 1px solid var(--5);}
    .active-effect{display: flex;align-items: center;justify-content: space-between;background: var(--3);padding: 8px 12px;border-radius: 4px;margin: 5px 0;}
    .active-effect span{color: var(--6);font-size: 14px;}
    .active-effect button{background: var(--r);color: white;border: none;border-radius: 4px;padding: 4px 8px;cursor: pointer;font-size: 12px;}
    .active-effect button:hover{background: var(--rh);}
    .apply-effects-btn{background: var(--a);color: white;border: none;border-radius: 4px;padding: 12px 24px;margin: 20px 0;cursor: pointer;font-size: 16px;width: 100%;}
    .apply-effects-btn:hover{background: var(--ah);}
    .apply-effects-btn:disabled{background: var(--5);cursor: not-allowed;}
  `;
  document.head.appendChild(style);
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
      sum += texture2D(u_image, uv + vec2(float(i), float(j)) * off);
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
  ca.r = texture2D(u_image, uv - off).r;
  ca.g = texture2D(u_image, uv).g;
  ca.b = texture2D(u_image, uv + off).b;
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
  vec4 p = texture2D(u_image, gridUV);
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
  const baseFragmentShader = `
precision mediump float;
uniform sampler2D u_image;
varying   vec2      v_uv;
void main() {
  vec4 color = texture2D(u_image, v_uv);
  gl_FragColor = color;
}`;
  function generateEffectShader() {
    if (activeEffects.length === 0) {
      return baseFragmentShader;
    }
    let src = `
precision mediump float;
uniform sampler2D u_image;
varying   vec2      v_uv;
  `;
    activeEffects.forEach(e => {
      src += effects[e.type].shader + "\n";
    });
    src += `
void main() {
  vec2 uv    = v_uv;
  vec4 color = texture2D(u_image, uv);
  `;
    activeEffects.forEach(e => {
      const p = { ...effects[e.type].params, ...e.params };
      switch (e.type) {
        case 'blur':
          src += `  color = blur(color, uv, ${p.strength});\n`;
          break;
        case 'sepia':
          src += `  color = sepia(color, ${p.intensity});\n`;
          break;
        case 'vignette':
          src += `  color = vignette(color, uv, ${p.intensity}, ${p.radius});\n`;
          break;
        case 'chromatic':
          src += `  color = chromatic(color, uv, ${p.strength});\n`;
          break;
        case 'pixelate':
          src += `  color = pixelate(color, uv, ${p.size.toFixed(1)});\n`;
          break;
        case 'contrast':
          src += `  color = contrast(color, ${p.amount});\n`;
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
  const uploadBtn = document.createElement('button');
  uploadBtn.id = 'imgUploadBtn';
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
  uploadBtn.title = 'Upload Image';
  document.body.appendChild(uploadBtn);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  const modal = document.createElement('div');
  modal.id = 'imgModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button id="imgCloseBtn">×</button>
      <h3>Image & Effects Editor</h3>
      <div class="modal-toggle">
        <button id="uploadTab" class="active">Upload Image</button>
        <button id="effectsTab">Add Effects</button>
      </div>
      <div id="uploadView" class="modal-view active">
        <p>Select an image to use in your shader.</p>
        <button id="imgDropButton">Choose File or Drag and Drop</button>
        <div id="imgPreview"></div>
        <p style="font-size:12px; color:#666;">Importing base shaders will delete current text area code</p>
        <button id="baseImportBtn">Import Base Shaders</button>
      </div>
      <div id="effectsView" class="modal-view">
        <p>Select effects to apply to your image:</p>
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
  `;
  document.body.appendChild(modal);
  const dragOverlay = document.createElement('div');
  dragOverlay.id = 'dragOverlay';
  dragOverlay.innerHTML = `
    <div>Drop image to upload</div>
    <div class="filename"></div>
  `;
  document.body.appendChild(dragOverlay);
  const dropButton = modal.querySelector('#imgDropButton');
  const preview = modal.querySelector('#imgPreview');
  const closeBtn = modal.querySelector('#imgCloseBtn');
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
  });
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
    effect.controls.forEach(control => {
      const controlDiv = document.createElement('div');
      controlDiv.className = 'effect-control';
      const currentValue = effect.params[control.name];
      controlDiv.innerHTML = `
        <label>${control.label}:</label>
        <input type="range" 
               min="${control.min}" 
               max="${control.max}" 
               step="${control.step}" 
               value="${currentValue}"
               data-param="${control.name}">
        <input type="number" 
               min="${control.min}" 
               max="${control.max}" 
               step="${control.step}" 
               value="${currentValue}"
               data-param="${control.name}">
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
  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        if (imageTexture) gl.deleteTexture(imageTexture);
        imageTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        const loc = (uniforms.u_image || uniforms.uImage || {}).loc;
        if (loc != null) {
          gl.useProgram(window.program);
          gl.uniform1i(loc, 0);
        }
        preview.innerHTML = '';
        preview.appendChild(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
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
    if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
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
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  });
  window.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    const items = e.dataTransfer.items;
    if (modal.style.display !== 'flex' && items && items.length > 0) {
      const isImage = Array.from(items).some(item =>
        item.kind === 'file' && item.type.startsWith('image/')
      );
      if (isImage) {
        const imageItem = Array.from(items).find(item =>
          item.kind === 'file' && item.type.startsWith('image/')
        );
        filenameDiv.textContent = imageItem?.getAsFile()?.name || 'Image file';
        dragOverlay.style.display = 'flex';
      }
    }
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) dragOverlay.style.display = 'none';
  });
  window.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.style.display = 'none';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
      modal.style.display = 'flex';
    }
  });
  populateEffectsGrid();
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    [uploadBtn, modal, dragOverlay].forEach(el => parent.appendChild(el));
  });
})();