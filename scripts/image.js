(function() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;
  const gl = window.gl || canvas.getContext('webgl2') || canvas.getContext('webgl');
  const uniforms = window.uniforms || {};
  let imageTexture = null;
  const style = document.createElement('style');
  style.textContent = `
    #imgUploadBtn{z-index: 10;cursor: pointer;position: absolute;top: 42px;right: 10px;background: var(--d);color: var(--6);border: none;width: 2rem;height: 2rem;padding: 0.25rem;display: flex;align-items: center;justify-content: center;}
    #imgUploadBtn svg{width: 1.25rem;height: 1.25rem;}
    #imgUploadBtn:hover{background: var(--5);}
    #baseImportBtn{background: var(--a);color: white;border: none;border-radius: 4px;padding: 10px 20px;margin: 10px;cursor: pointer;font-size: 14px;}
    #baseImportBtn:hover{background: var(--ah);}
    #imgCloseBtn{position: absolute;top: 10px;right: 15px;background: var(--r);color: white;border: none;border-radius: 50%;width: 30px;height: 30px;font-size: 18px;cursor: pointer;display: flex;align-items: center;justify-content: center;}
    #imgCloseBtn:hover{background: var(--rh);}
    #imgModal{position: fixed;top: 0;left: 0;right: 0;bottom: 0;display: none;align-items: center;justify-content: center;z-index: 1001;}
    #imgModal .modal-content{background: var(--4);padding: 20px;border-radius: 8px;max-width: 90%;max-height: 90%;overflow: auto;text-align: center;position: relative;}
    #imgModal img{max-width: 100%;max-height: 40vh;display: block;margin: 10px auto;}
    #imgDropButton{padding: 40px 60px;border: 2px dashed var(--6);background: var(--3);border-radius: 8px;cursor: pointer;font-size: 16px;color: var(--6);margin: 20px 0;transition: all 0.3s ease;}
    #imgDropButton:hover{background: var(--5);border-color: var(--a);color:var(--7);}
    #dragOverlay{position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: var(--d);backdrop-filter: blur(5px);z-index: 2000;display: none;align-items: center;justify-content: center;flex-direction: column;color: white;font-size: 24px;text-align: center;}
    #dragOverlay .filename{margin-top: 10px;font-size: 18px;opacity: 0.8;}
  `;
  document.head.appendChild(style);
  const baseVertexShader = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  // Convert from clip-space [-1..+1] to UV [0..1]
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  const baseFragmentShader = `precision mediump float;
uniform sampler2D u_image;
varying vec2 v_uv;
void main() {
  // Sample the uploaded image
  vec4 color = texture2D(u_image, v_uv);
  gl_FragColor = color;
}`;
  const baseImportBtn = document.createElement('button');
  baseImportBtn.id = 'baseImportBtn';
  baseImportBtn.textContent = 'Import Base Shaders';
  baseImportBtn.title = 'Import Base Vertex/Fragment Shaders';
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
      <h3>Upload Image for Shader</h3>
      <p>Select an image to use in your shader.</p>
      <button id="imgDropButton">Choose File or Drag and Drop</button>
      <div id="imgPreview"></div>
      <p style="font-size:12px; color:#666;">Importing base shaders will delete current text area code</p>
      <button id="baseImportBtn">Import Base Shaders</button>
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
  const baseImportBtnModal = modal.querySelector('#baseImportBtn');
  const filenameDiv = dragOverlay.querySelector('.filename');
  let dragCounter = 0;
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
  baseImportBtnModal.addEventListener('click', () => {
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (vertTA) vertTA.value = baseVertexShader;
    if (fragTA) fragTA.value = baseFragmentShader;
    if (vertTA) vertTA.dispatchEvent(new Event('input', { bubbles: true }));
    if (fragTA) fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    modal.style.display = 'none';
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
})();