(() => {
  function getCurrentCanvas() {
    const threedCanvas = document.getElementById('3dCanvas');
    if (threedCanvas && threedCanvas.style.display !== 'none') {
      return threedCanvas;
    }
    if (window.webgpuState && window.webgpuState.isWebGPUMode()) {
      return window.webgpuState.getCanvas();
    }
    return document.getElementById('glcanvas');
  }
  const canvas = getCurrentCanvas();
  const container = document.getElementById('preview-panel');
  if (!canvas || !container) return;
  let gl = null;
  if (!window.webgpuState || !window.webgpuState.isWebGPUMode()) {
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
         canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
  }
  const style = document.createElement('style');
  style.textContent = `
    #recSettings{display: none;position: absolute;bottom: 42px;left: 10px;background: var(--d);color: var(--l);padding: 10px;z-index: 100;font-size: 0.9rem;min-width: 240px;max-height:80%;overflow-y: auto;}
    #recSettings label{display: block;margin-bottom: 6px;}
    #recSettings input{margin-left: 4px;}
    #recSettings .preset{margin-right: 4px;margin-top: 4px;}
    #recSettings button{padding: 4px 8px;margin: 2px;cursor: pointer;border:0px;border-radius:6px;}
    #recSettings .active{background:var(--a);color: white;}
    #recBtn{width:2rem;height:2rem;position: absolute;bottom: 10px;left: 10px;background: var(--d);color: var(--l);border: none;padding: 8px;cursor: pointer;z-index: 1;font-size: 1rem;display: flex;align-items: center;justify-content: center;}
    #recBtn:hover{background:var(--5)}
    #recBtn svg{width: 14px;height: 14px;}
    #recBtn svg circle{fill: var(--r);}
    #recordingIndicator{display: none;position: absolute;top: 10px;right: 10px;background:var(--rh);color: var(--1);padding: 5px 10px;border-radius: 4px;z-index: 100;animation: pulse 1.5s infinite;}
    @keyframes pulse{0%{opacity: 1;}50%{opacity: 0.6;}100%{opacity: 1;}}
    input, select{padding: 1rem;border-radius: 5px;border: 0px;width: 100%;background: var(--d);color: var(--l);}
    .checkbox-container{position: relative;display: inline-flex;align-items: center;cursor: pointer;margin-left: 8px;}
    .checkbox-container input[type="checkbox"]{opacity: 0;position: absolute;width: 18px;height: 18px;margin: 0;padding: 0;cursor: pointer;}
    .custom-checkbox{width: 18px;height: 18px;border: 2px solid var(--l);border-radius: 3px;background: var(--d);position: relative;display: flex;align-items: center;justify-content: center;transition: all 0.2s ease;}
    .checkbox-container input[type="checkbox"]:checked + .custom-checkbox{background: var(--a);border-color: var(--a);}
    .custom-checkbox::after{content: '';position: absolute;width: 5px;height: 9px;border: solid white;border-width: 0 2px 2px 0;transform: rotate(45deg) scale(0);transition: transform 0.15s ease-in-out;top: 1px;}
    .checkbox-container input[type="checkbox"]:checked + .custom-checkbox::after{transform: rotate(45deg) scale(1);}
    .checkbox-container:hover .custom-checkbox{border-color: var(--a);}
    #videoPreview{display: none;margin-top: 10px;padding: 10px;background: var(--1);border-radius: 5px;}
    #videoPreview video{width: 100%;max-height: 200px;border-radius: 5px;background: var(--1);}
    #videoPreview .controls{margin-top: 10px;display: flex;gap: 5px;flex-wrap: wrap;}
    #videoPreview .controls button{padding: 6px 12px;border: none;border-radius: 5px;cursor: pointer;font-size: 12px;flex: 1;min-width: 70px;}
    #videoPreview .download-btn{background: var(--m);color: var(--1);}
    #videoPreview .download-btn:hover{background: var(--6);color: var(--7);}
    #videoPreview .delete-btn{background: var(--r);color: var(--7);}
    #videoPreview .delete-btn:hover{background: var(--rh);color: var(--1);}
    #videoPreview .info{color: var(--l);font-size: 11px;margin-top: 8px;line-height: 1.3;}
    .status-block{background: var(--d);padding: 6px;border-radius: 6px;margin: 5px 0px;font-size: 11px;color: var(--7);}
    .status-block .canvas-mode,
    .status-block .audio-status{background: none;padding: 2px 0;margin: 0;border-radius: 0;color: inherit;}
  `;
  document.head.appendChild(style);
  const recIndicator = document.createElement('div');
  recIndicator.id = 'recordingIndicator';
  recIndicator.textContent = '● RECORDING';
  container.appendChild(recIndicator);
  const recBtn = document.createElement('button');
  recBtn.id = 'recBtn';
  recBtn.title = 'Record Settings';
  recBtn.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45"/></svg>`;
  container.appendChild(recBtn);
  const videoPreview = document.createElement('div');
  videoPreview.id = 'videoPreview';
  videoPreview.innerHTML = `
    <video id="previewVideo" controls></video>
    <div class="controls">
      <button class="download-btn" id="downloadFromPreview">Download</button>
      <button class="delete-btn" id="deleteVideo">Delete</button>
    </div>
    <div class="info" id="videoInfo"></div>
  `;
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isFirefox = /firefox/i.test(ua);
  const settingsPanel = document.createElement('div');
  settingsPanel.id = 'recSettings';
  settingsPanel.innerHTML = `
    <label>Width: <input type="number" id="recWidth" value="1920" min="100"/></label>
    <label>Height: <input type="number" id="recHeight" value="1080" min="100"/></label>
    <label>FPS: 
      <select id="recFPS">
        <option value="30">30</option>
        <option value="60" selected>60</option>
        <option value="120">120</option>
      </select>
    </label>
    <label>Quality:
      <input type="range" id="recQuality" min="1000" max="50000" step="1000" value="20000"/>
      <span id="recQualityVal">20000</span> kbps
    </label>
    <label>Codec: 
      <select id="recCodec">
        ${isFirefox ? `
          <option value="h264" disabled>H.264 (Not supported in Firefox)</option>
          <option value="vp9" disabled>VP9 (Not supported in Firefox)</option>
          <option value="vp8" selected>VP8 (WebM)</option>
        ` : isSafari || isIOS ? `
          <option value="h264" selected>H.264 (MP4)</option>
          <option value="vp9" disabled>VP9 (Not supported in Safari)</option>
          <option value="vp8" disabled>VP8 (Not supported in Safari)</option>
        ` : `
          <option value="h264" selected>H.264 (MP4)</option>
          <option value="vp9">VP9 (WebM)</option>
          <option value="vp8">VP8 (WebM)</option>
        `}
      </select>
    </label>
    <label style="display: flex; align-items: center;">
      Include Audio
      <div class="checkbox-container">
        <input type="checkbox" id="includeAudio" checked/>
        <div class="custom-checkbox"></div>
      </div>
    </label>
    <div id="statusBlock" class="status-block">
      <div id="canvasMode" class="canvas-mode">Canvas: WebGL</div>
      <div id="audioStatus" class="audio-status">Audio: Not detected</div>
    </div>
    <button id="recRotate" title="Rotate dimensions">⟲ Rotate</button>
    <div id="recPresets">
      <button class="preset active" data-w="1920" data-h="1080">1080p</button>
      <button class="preset" data-w="2560" data-h="1440">1440p</button>
      <button class="preset" data-w="3840" data-h="2160">4K</button>
      <button class="preset" data-w="1280" data-h="720">720p</button>
    </div>
    <button class="start" id="startRec">Start Recording</button>
    <button class="stop" id="stopRec" disabled>Stop</button>
    <a id="downloadLink" style="border:0px;border-radius:6px;background:var(--m);display:none;text-decoration:none; color:var(--1);">Download</a>
    <div id="recStats" style="margin-top: 8px; display: none;"></div>
  `;
  container.appendChild(settingsPanel);
  settingsPanel.appendChild(videoPreview);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const settingsPanel = document.getElementById("recSettings");
      if (settingsPanel) {
        settingsPanel.style.display = "none";
      }
    }
  });
  const recWidth = settingsPanel.querySelector('#recWidth');
  const recHeight = settingsPanel.querySelector('#recHeight');
  const recFPS = settingsPanel.querySelector('#recFPS');
  const recQuality = settingsPanel.querySelector('#recQuality');
  const recQualityVal = settingsPanel.querySelector('#recQualityVal');
  const recCodec = settingsPanel.querySelector('#recCodec');
  const recRotate = settingsPanel.querySelector('#recRotate');
  const includeAudio = settingsPanel.querySelector('#includeAudio');
  const audioStatus = settingsPanel.querySelector('#audioStatus');
  const canvasMode = settingsPanel.querySelector('#canvasMode');
  const presets = settingsPanel.querySelectorAll('.preset');
  const startRec = settingsPanel.querySelector('#startRec');
  const stopRec = settingsPanel.querySelector('#stopRec');
  const downloadLink = settingsPanel.querySelector('#downloadLink');
  const recStats = settingsPanel.querySelector('#recStats');
  const previewVideo = videoPreview.querySelector('#previewVideo');
  const downloadFromPreview = videoPreview.querySelector('#downloadFromPreview');
  const deleteVideo = videoPreview.querySelector('#deleteVideo');
  const videoInfo = videoPreview.querySelector('#videoInfo');
  let recorder, recordedChunks = [], hiddenCanvas, hiddenCtx, drawLoopId;
  let settingsPanelVisible = false;
  let recordingStartTime;
  let currentVideoBlob = null;
  let currentVideoUrl = null;
  let currentVideoData = null;
  function updateCanvasMode() {
    if (window.webgpuState && window.webgpuState.isWebGPUMode()) {
      canvasMode.textContent = 'Canvas: WebGPU';
    } else {
      canvasMode.textContent = 'Canvas: WebGL';
    }
  }
  function getAudioStream() {
    if (window.AudioReactive && window.audioReactiveInstance) {
      const audioInstance = window.audioReactiveInstance;
      if (audioInstance.isActive && audioInstance.audioContext) {
        try {
          const destination = audioInstance.audioContext.createMediaStreamDestination();
          if (audioInstance.fileActive && audioInstance.fileSource) {
            audioInstance.fileSource.connect(destination);
            audioStatus.textContent = 'Audio: File audio detected';
            return destination.stream;
          } else if (audioInstance.micStream && audioInstance.analyser) {
            const micSource = audioInstance.audioContext.createMediaStreamSource(audioInstance.micStream);
            micSource.connect(destination);
            audioStatus.textContent = 'Audio: Microphone detected';
            return destination.stream;
          }
        } catch (error) {
          console.warn('Error capturing audio stream:', error);
          audioStatus.textContent = 'Audio: Error capturing audio';
        }
      }
    }
    audioStatus.textContent = 'Audio: Not detected';
    return null;
  }
  function updateAudioStatus() {
    if (!settingsPanelVisible) return;
    if (window.AudioReactive && window.audioReactiveInstance) {
      const audioInstance = window.audioReactiveInstance;
      if (audioInstance.isActive) {
        if (audioInstance.fileActive) {
          audioStatus.textContent = 'Audio: File audio active';
        } else if (audioInstance.micStream) {
          audioStatus.textContent = 'Audio: Microphone active';
        } else {
          audioStatus.textContent = 'Audio: Active but no source';
        }
      } else {
        audioStatus.textContent = 'Audio: Inactive';
      }
    } else {
      audioStatus.textContent = 'Audio: AudioReactive not found';
    }
    updateCanvasMode();
  }
  setInterval(updateAudioStatus, 1000);
  recQuality.addEventListener('input', () => {
    recQualityVal.textContent = recQuality.value;
  });
  recRotate.addEventListener('click', () => {
    [recWidth.value, recHeight.value] = [recHeight.value, recWidth.value];
    updateStart();
  });
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recWidth.value = btn.dataset.w;
      recHeight.value = btn.dataset.h;
      updateStart();
    });
  });
  [recWidth, recHeight].forEach(input => {
    input.addEventListener('input', updateStart);
  });
  function updateStart() {
    startRec.disabled = !(+recWidth.value > 0 && +recHeight.value > 0);
  }
  updateStart();
  recBtn.addEventListener('click', () => {
    settingsPanelVisible = !settingsPanelVisible;
    settingsPanel.style.display = settingsPanelVisible ? 'block' : 'none';
    if (settingsPanelVisible) {
      updateAudioStatus();
    }
  });
  downloadFromPreview.addEventListener('click', () => {
    if (currentVideoBlob && currentVideoData) {
      const link = document.createElement('a');
      link.href = currentVideoUrl;
      link.download = `recording_${currentVideoData.width}x${currentVideoData.height}_${currentVideoData.codec}.${currentVideoData.extension}`;
      link.click();
    }
  });
  deleteVideo.addEventListener('click', () => {
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }
    currentVideoBlob = null;
    currentVideoUrl = null;
    currentVideoData = null;
    videoPreview.style.display = 'none';
    previewVideo.src = '';
    downloadLink.style.display = 'none';
    recStats.style.display = 'none';
  });
  const checkCodecSupport = (codec, withAudio) => {
    const bases = {
      vp8: [
        'video/webm; codecs=vp8',
        'video/webm;codecs=vp8',
        'video/webm; codecs="vp8"',
        'video/webm;codecs="vp8"'
      ],
      vp9: [
        'video/webm; codecs=vp9',
        'video/webm;codecs=vp9',
        'video/webm; codecs="vp9"',
        'video/webm;codecs="vp9"'
      ],
      h264: [
        'video/mp4; codecs=avc1.42E01E',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4;codecs="avc1.42E01E"',
        'video/webm; codecs=h264',
        'video/webm;codecs=h264'
      ]
    }[codec] || [];
    const suffixes = withAudio ? [',opus', ', opus'] : [''];
    return suffixes
      .flatMap(s => bases.map(b =>
        b.endsWith('"') ? b.replace(/"$/, `${s}"`) : b + s
      ))
      .find(type => MediaRecorder.isTypeSupported(type)) || null;
  };
  startRec.addEventListener('click', () => {
    downloadLink.style.display = recStats.style.display = 'none';
    recStats.textContent = '';
    const w = +recWidth.value, h = +recHeight.value, fps = +recFPS.value;
    const currentCanvas = getCurrentCanvas();
    if (!currentCanvas) {
      alert('Canvas not found. Make sure the visualization is running.');
      return;
    }
    hiddenCanvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    hiddenCtx = hiddenCanvas.getContext('2d', { alpha: false });
    const videoStream = hiddenCanvas.captureStream(fps);
    let audioStream = includeAudio.checked && getAudioStream();
    if (audioStream && !audioStream.getAudioTracks().length) audioStream = null;
    const finalStream = audioStream
      ? new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()])
      : videoStream;
    const bits = recQuality.value * 1000;
    const want = recCodec.value;
    const mime = checkCodecSupport(want, !!audioStream)
      || ['h264','vp9','vp8'].reduce((found, c) => found || checkCodecSupport(c, !!audioStream) && (recCodec.value = c, checkCodecSupport(c, !!audioStream)), null);
    if (!mime) {
      return alert('No supported codecs for your config.');
    }
    if (mime && mime !== checkCodecSupport(want, !!audioStream)) {
      alert(`Falling back to ${recCodec.value} (+audio: ${!!audioStream}).`);
    }
    startRecording(finalStream, mime, bits, w, h, recCodec.value, currentCanvas);
  });
  function startRecording(stream, mimeType, bits, w, h, selectedCodec, sourceCanvas) {
    const options = {
      mimeType: mimeType,
      videoBitsPerSecond: bits
    };
    if (stream.getAudioTracks().length > 0) {
      options.audioBitsPerSecond = 128000;
    }
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      alert(`Recording failed: ${e.message}. Try a different codec or lower quality.`);
      return;
    }
    recordedChunks = [];
    recordingStartTime = Date.now();
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
        updateRecordingStats();
      }
    };
    recorder.onstop = () => {
      const fileExtension = selectedCodec === 'h264' ? 'mp4' : 'webm';
      const mimeString = selectedCodec === 'h264' ? 'video/mp4' : 'video/webm';
      const blob = new Blob(recordedChunks, { type: mimeString });
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      const duration = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
      const hasAudio = stream.getAudioTracks().length > 0;
      const canvasType = window.webgpuState && window.webgpuState.isWebGPUMode() ? 'WebGPU' : 'WebGL';
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }
      currentVideoBlob = blob;
      currentVideoUrl = URL.createObjectURL(blob);
      currentVideoData = {
        width: w,
        height: h,
        codec: selectedCodec,
        extension: fileExtension,
        size: fileSizeMB,
        duration: duration,
        bitrate: recQuality.value,
        hasAudio: hasAudio,
        canvasType: canvasType
      };
      previewVideo.src = currentVideoUrl;
      videoInfo.innerHTML = `
        <div><strong>File:</strong> ${fileSizeMB} MB • ${duration}s • ${w}×${h}</div>
        <div><strong>Settings:</strong> ${selectedCodec} • ${recQuality.value} kbps • ${canvasType}</div>
        <div><strong>Audio:</strong> ${hasAudio ? 'Included' : 'Video only'}</div>
      `;
      videoPreview.style.display = 'block';
      downloadLink.style.display = 'none';
      recStats.style.display = 'none';
      recIndicator.style.display = 'none';
      startRec.disabled = false;
      cancelAnimationFrame(drawLoopId);
    };
    function updateRecordingStats() {
      const duration = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
      const hasAudio = stream.getAudioTracks().length > 0;
      const canvasType = window.webgpuState && window.webgpuState.isWebGPUMode() ? 'GPU' : 'GL';
      recIndicator.textContent = `● RECORDING ${duration}s ${hasAudio ? '♪' : ''} ${canvasType}`;
    }
    function drawLoop() {
      hiddenCtx.imageSmoothingEnabled = true;
      hiddenCtx.imageSmoothingQuality = 'high';
      hiddenCtx.clearRect(0, 0, w, h);
      hiddenCtx.drawImage(sourceCanvas, 0, 0, w, h);
      drawLoopId = requestAnimationFrame(drawLoop);
    }
    drawLoop();
    recorder.start(1000);
    recIndicator.style.display = 'block';
    startRec.disabled = true;
    stopRec.disabled = false;
    const keyframeInterval = setInterval(() => {
      if (recorder && recorder.state === 'recording') {
        recorder.requestData();
      } else {
        clearInterval(keyframeInterval);
      }
    }, 2000);
  }
  stopRec.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      stopRec.disabled = true;
    }
  });
})();