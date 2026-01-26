(() => {
  function getCurrentCanvas() {
    if (window.jsCanvasState && window.jsCanvasState.isJSMode()) {
        return window.jsCanvasState.getCanvas();
    }
    const threedCanvas = document.getElementById('canvas3D');
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
    <label class="checkbox-label">
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
    <a id="downloadLink" class="record-button">Download</a>
    <div id="recStats" class="rec-stats"></div>
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
    if (window.jsCanvasState && window.jsCanvasState.isJSMode()) {
        canvasMode.textContent = 'Canvas: JavaScript 2D';
    } else if (window.webgpuState && window.webgpuState.isWebGPUMode()) {
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
    const iOSCombinations = {
      h264: [
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4; codecs=avc1.42E01E',
        'video/mp4'
      ]
    };
    const standardCombinations = {
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
        'video/webm;codecs=h264',
        'video/mp4'
      ]
    };
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const bases = (isIOS && isSafari) ? (iOSCombinations[codec] || standardCombinations[codec]) : standardCombinations[codec];
    if (!bases) return null;
    if (isIOS && isSafari && withAudio) {
      for (const base of bases) {
        if (MediaRecorder.isTypeSupported(base)) {
          return base;
        }
      }
      const audioCodecs = ['mp4a.40.2', 'aac'];
      for (const audioCodec of audioCodecs) {
        for (const base of bases) {
          if (base.includes('codecs=')) {
            const withAudioCodec = base.replace(/codecs="?([^"]+)"?/, `codecs="$1,${audioCodec}"`);
            if (MediaRecorder.isTypeSupported(withAudioCodec)) {
              return withAudioCodec;
            }
          }
        }
      }
      return null;
    }
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
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (audioStream && !audioStream.getAudioTracks().length) audioStream = null;
    if (isIOS && isSafari && includeAudio.checked && !audioStream) {
      console.warn('Audio not available on iOS Safari, continuing with video-only recording');
      audioStatus.textContent = 'Audio: Not available on iOS';
    }
    const finalStream = audioStream
      ? new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()])
      : videoStream;
    const bits = recQuality.value * 1000;
    const want = recCodec.value;
    let mime = checkCodecSupport(want, !!audioStream);
    if (!mime && isIOS && isSafari) {
      console.log('Trying iOS fallback codecs...');
      mime = checkCodecSupport('h264', false);
      if (mime) {
        recCodec.value = 'h264';
        if (audioStream) {
          console.warn('iOS Safari: Falling back to video-only recording');
          finalStream.getAudioTracks().forEach(track => {
            finalStream.removeTrack(track);
            track.stop();
          });
          audioStream = null;
        }
      }
    }
    if (!mime) {
      mime = ['h264','vp9','vp8'].reduce((found, c) => {
        return found || checkCodecSupport(c, !!audioStream) && (recCodec.value = c, checkCodecSupport(c, !!audioStream));
      }, null);
    }
    if (!mime) {
      if (audioStream) {
        console.log('Trying video-only as final fallback...');
        finalStream.getAudioTracks().forEach(track => {
          finalStream.removeTrack(track);
          track.stop();
        });
        mime = checkCodecSupport(want, false) || checkCodecSupport('h264', false);
        if (mime) {
          alert('Audio recording not supported on this device. Recording video only.');
        }
      }
      if (!mime) {
        return alert('No supported codecs found for video recording on this device.');
      }
    }
    if (mime && mime !== checkCodecSupport(want, !!audioStream)) {
      const hasAudioInFinal = finalStream.getAudioTracks().length > 0;
      alert(`Using ${recCodec.value} codec${hasAudioInFinal ? ' with audio' : ' (video only)'}.`);
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
      const canvasType = window.jsCanvasState && window.jsCanvasState.isJSMode() ? 'JavaScript' : window.webgpuState && window.webgpuState.isWebGPUMode() ? 'WebGPU' : 'WebGL';
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