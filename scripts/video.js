(function() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;
  const gl = window.gl || canvas.getContext('webgl2') || canvas.getContext('webgl');
  const uniforms = window.uniforms || {};
  let videoTexture = null;
  let videoElement = null;
  let isPlaying = false;
  let animationId = null;
  const style = document.createElement('style');
  style.textContent = `
    #vidUploadBtn{z-index: 10;cursor: pointer;position: absolute;top: 42px;right: 42px;background: var(--d);color: var(--6);border: none;width: 2rem;height: 2rem;padding: 0.25rem;display: flex;align-items: center;justify-content: center;}
    #vidUploadBtn svg{width: 1.25rem;height: 1.25rem;}
    #vidUploadBtn:hover{background: var(--5);}
    #baseImportBtn{background: var(--a);color: white;border: none;border-radius: 4px;padding: 10px 20px;margin: 10px;cursor: pointer;font-size: 14px;}
    #baseImportBtn:hover{background: var(--ah);}
    #vidCloseBtn{position: absolute;top: 10px;right: 15px;background: var(--r);color: white;border: none;border-radius: 50%;width: 30px;height: 30px;font-size: 18px;cursor: pointer;display: flex;align-items: center;justify-content: center;}
    #vidCloseBtn:hover{background: var(--rh);}
    #vidModal{position: fixed;top: 0;left: 0;right: 0;bottom: 0;display: none;align-items: center;justify-content: center;z-index: 99999;max-width: 60vw;margin: auto;}
    #vidModal .modal-content{background: var(--4);padding: 20px;border-radius: 8px;max-width: 90vw;max-height: 90vh;overflow: auto;text-align: center;position: relative;width: 100%;box-sizing: border-box;}
    #vidModal video{max-width: 100%;max-height: 30vh;display: block;margin: 10px auto;background: #000;}
    #vidDropButton{padding: 40px 60px;border: 2px dashed var(--6);background: var(--3);border-radius: 8px;cursor: pointer;font-size: 16px;color: var(--6);margin: 20px 0;transition: all 0.3s ease;}
    #vidDropButton:hover{background: var(--5);border-color: var(--a);color:var(--7);}
    #vidDragOverlay{position: absolute;top: 0;left: 0;width: 100%;height: 100%;background: var(--d);backdrop-filter: blur(5px);z-index: 2000;display: none;align-items: center;justify-content: center;flex-direction: column;color: white;font-size: 24px;text-align: center;}
    #vidDragOverlay .filename{margin-top: 10px;font-size: 18px;opacity: 0.8;}
    .video-controls{display: flex;align-items: center;justify-content: center;gap: 10px;margin: 15px 0;padding: 15px;background: var(--3);border-radius: 8px;}
    .video-controls button{background: var(--a);color: white;border: none;border-radius: 4px;padding: 8px 16px;cursor: pointer;font-size: 14px;}
    .video-controls button:hover{background: var(--ah);}
    .video-controls button:disabled{background: var(--5);cursor: not-allowed;}
    .video-controls .time-info{color: var(--6);font-size: 14px;margin: 0 10px;}
    .video-progress{width: 100%;height: 6px;background: var(--5);border-radius: 3px;margin: 10px 0;cursor: pointer;overflow: hidden;}
    .video-progress-bar{height: 100%;background: var(--a);border-radius: 3px;transition: width 0.1s ease;}
    .load-video-btn{background: var(--a);color: white;border: none;border-radius: 4px;padding: 12px 24px;margin: 20px 0;cursor: pointer;font-size: 16px;width: 100%;}
    .load-video-btn:hover{background: var(--ah);}
    .load-video-btn:disabled{background: var(--5);cursor: not-allowed;}
  `;
  document.head.appendChild(style);
  const baseVertexShader = `
attribute vec2 a_position;
varying   vec2 v_uv;
void main() {
  v_uv       = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  const baseFragmentShader = `
precision mediump float;
uniform sampler2D u_video;
uniform float u_time;
varying   vec2      v_uv;
void main() {
  vec4 color = texture2D(u_video, v_uv);
  gl_FragColor = color;
}`;
  function updateShaderCode() {
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (vertTA && fragTA) {
      vertTA.value = baseVertexShader;
      fragTA.value = baseFragmentShader;
      vertTA.dispatchEvent(new Event('input', { bubbles: true }));
      fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function updateVideoTexture() {
    if (!videoElement || !videoTexture) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
    const loc = (uniforms.u_video || uniforms.uVideo || {}).loc;
    if (loc != null) {
      gl.useProgram(window.program);
      gl.uniform1i(loc, 0);
    }
    const timeLoc = (uniforms.u_time || uniforms.uTime || {}).loc;
    if (timeLoc != null) {
      gl.useProgram(window.program);
      gl.uniform1f(timeLoc, performance.now() / 1000.0);
    }
  }
  function renderLoop() {
    if (isPlaying && videoElement && !videoElement.paused) {
      updateVideoTexture();
      updateProgressBar();
    }
    if (isPlaying) {
      animationId = requestAnimationFrame(renderLoop);
    }
  }
  function updateProgressBar() {
    const progressBar = document.getElementById('videoProgressBar');
    const timeInfo = document.getElementById('videoTimeInfo');
    if (progressBar && timeInfo && videoElement) {
      const progress = (videoElement.currentTime / videoElement.duration) * 100;
      progressBar.style.width = progress + '%';
      const currentMin = Math.floor(videoElement.currentTime / 60);
      const currentSec = Math.floor(videoElement.currentTime % 60);
      const totalMin = Math.floor(videoElement.duration / 60);
      const totalSec = Math.floor(videoElement.duration % 60);
      timeInfo.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${totalMin}:${totalSec.toString().padStart(2, '0')}`;
    }
  }
  const uploadBtn = document.createElement('button');
  uploadBtn.id = 'vidUploadBtn';
  uploadBtn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M8 5v14l11-7z"/>
    </svg>
  `;
  uploadBtn.title = 'Upload Video';
  document.body.appendChild(uploadBtn);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'video/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  const modal = document.createElement('div');
  modal.id = 'vidModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button id="vidCloseBtn">×</button>
      <h3>Video Loader</h3>
      <p>Select a video to use in your shader.</p>
      <button id="vidDropButton">Choose File or Drag and Drop</button>
      <div id="vidPreview"></div>
      <div class="video-controls" id="videoControls" style="display:none;">
        <button id="playPauseBtn">Play</button>
        <div class="time-info" id="videoTimeInfo">0:00 / 0:00</div>
      </div>
      <div class="video-progress" id="videoProgress" style="display:none;">
        <div class="video-progress-bar" id="videoProgressBar"></div>
      </div>
      <p style="font-size:12px; color:#666;">This will load base video shaders into the editor</p>
      <button class="load-video-btn" id="loadVideoBtn" style="display:none;">Load Video into Shader</button>
    </div>
  `;
  document.body.appendChild(modal);
  const dragOverlay = document.createElement('div');
  dragOverlay.id = 'vidDragOverlay';
  dragOverlay.innerHTML = `
    <div>Drop video to upload</div>
    <div class="filename"></div>
  `;
  document.getElementById('preview-panel').appendChild(dragOverlay);
  const dropButton = modal.querySelector('#vidDropButton');
  const preview = modal.querySelector('#vidPreview');
  const closeBtn = modal.querySelector('#vidCloseBtn');
  const loadVideoBtn = modal.querySelector('#loadVideoBtn');
  const filenameDiv = dragOverlay.querySelector('.filename');
  const videoControls = modal.querySelector('#videoControls');
  const playPauseBtn = modal.querySelector('#playPauseBtn');
  const videoProgress = modal.querySelector('#videoProgress');
  let dragCounter = 0;
  function handleVideoFile(file) {
    if (videoElement) {
      videoElement.pause();
      videoElement.src = '';
    }
    videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.controls = false;
    const url = URL.createObjectURL(file);
    videoElement.src = url;
    videoElement.addEventListener('loadeddata', function() {
      if (videoTexture) gl.deleteTexture(videoTexture);
      videoTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
      const loc = (uniforms.u_video || uniforms.uVideo || {}).loc;
      if (loc != null) {
        gl.useProgram(window.program);
        gl.uniform1i(loc, 0);
      }
      preview.innerHTML = '';
      preview.appendChild(videoElement);
      videoControls.style.display = 'flex';
      videoProgress.style.display = 'block';
      loadVideoBtn.style.display = 'block';
      updateProgressBar();
    });
    videoElement.addEventListener('timeupdate', updateProgressBar);
  }
  playPauseBtn.addEventListener('click', () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play();
      playPauseBtn.textContent = 'Pause';
      isPlaying = true;
      renderLoop();
    } else {
      videoElement.pause();
      playPauseBtn.textContent = 'Play';
      isPlaying = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  });
  videoProgress.addEventListener('click', (e) => {
    if (!videoElement) return;
    const rect = videoProgress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    videoElement.currentTime = percentage * videoElement.duration;
  });
  loadVideoBtn.addEventListener('click', () => {
    updateShaderCode();
    modal.style.display = 'none';
  });
  uploadBtn.addEventListener('click', () => modal.style.display = 'flex');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
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
    if (fileInput.files[0]) handleVideoFile(fileInput.files[0]);
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
    if (file && file.type.startsWith('video/')) {
      handleVideoFile(file);
    }
  });
  window.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    const items = e.dataTransfer.items;
    if (modal.style.display !== 'flex' && items && items.length > 0) {
      const isVideo = Array.from(items).some(item =>
        item.kind === 'file' && item.type.startsWith('video/')
      );
      if (isVideo) {
        const videoItem = Array.from(items).find(item =>
          item.kind === 'file' && item.type.startsWith('video/')
        );
        filenameDiv.textContent = videoItem?.getAsFile()?.name || 'Video file';
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
    if (file && file.type.startsWith('video/')) {
      handleVideoFile(file);
      modal.style.display = 'flex';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    [uploadBtn, modal, dragOverlay].forEach(el => parent.appendChild(el));
  });
  window.addEventListener('beforeunload', () => {
    if (videoElement) {
      videoElement.pause();
      if (videoElement.src) {
        URL.revokeObjectURL(videoElement.src);
      }
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (videoTexture) {
      gl.deleteTexture(videoTexture);
    }
  });
})();