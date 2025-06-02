(() => {
  const canvas = document.getElementById('glcanvas');
  const container = document.getElementById('preview-panel');
  if (!canvas || !container) return;
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
  const style = document.createElement('style');
  style.textContent = `
    #recSettings{display: none;position: absolute;bottom: 42px;left: 10px;background: var(--d);color: var(--l);padding: 10px;z-index: 100;font-size: 0.9rem;min-width: 240px;max-height:80%;overflow-y: auto;}
    #recSettings label{display: block;margin-bottom: 6px;}
    #recSettings input{margin-left: 4px;}
    #recSettings .preset{margin-right: 4px;margin-top: 4px;}
    #recSettings button{padding: 4px 8px;margin: 2px;cursor: pointer;border:0px;border-radius:6px;}
    #recSettings .active{background:var(--a);color: white;}
    #recBtn{width:2rem;height:2rem;position: absolute;bottom: 10px;left: 10px;background: var(--d);color: var(--l);border: none;padding: 8px;cursor: pointer;z-index: 100;font-size: 1rem;display: flex;align-items: center;justify-content: center;z-index:1;}
    #recBtn svg{width: 14px;height: 14px;}
    #recBtn svg circle{fill: #ff0000;}
    #recordingIndicator{display: none;position: absolute;top: 10px;right: 10px;background: rgba(255,0,0,0.7);color: var(--l);padding: 5px 10px;border-radius: 4px;z-index: 100;animation: pulse 1.5s infinite;}
    @keyframes pulse{0%{opacity: 1;}50%{opacity: 0.6;}100%{opacity: 1;}}
    input, select{padding: 1rem;border-radius: 5px;border: 0px;width: 100%;background: var(--d);color: var(--l);}
    #videoPreview{display: none;margin-top: 10px;padding: 10px;background: rgba(0, 0, 0, 0.3);border-radius: 5px;}
    #videoPreview video{width: 100%;max-height: 200px;border-radius: 5px;background: #000;}
    #videoPreview .controls{margin-top: 10px;display: flex;gap: 5px;flex-wrap: wrap;}
    #videoPreview .controls button{padding: 6px 12px;border: none;border-radius: 5px;cursor: pointer;font-size: 12px;flex: 1;min-width: 70px;}
    #videoPreview .download-btn{background: var(--m);color: #000;}
    #videoPreview .delete-btn{background: #ff4444;color: white;}
    #videoPreview .info{color: var(--l);font-size: 11px;margin-top: 8px;line-height: 1.3;}
    .audio-status{color: var(--7);font-size: 11px;margin-top: 5px;padding: 5px;background: rgba(0,0,0,0.2);border-radius: 3px;}
  `;
  document.head.appendChild(style);
  const recIndicator = document.createElement('div');
  recIndicator.id = 'recordingIndicator';
  recIndicator.textContent = '● RECORDING';
  container.appendChild(recIndicator);
  const recBtn = document.createElement('button');
  recBtn.id = 'recBtn';
  recBtn.title = 'Record Settings';
  recBtn.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`;
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
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
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
        <option value="h264" selected>H.264 (MP4)</option>
        ${isSafari || isIOS ? 
          `<option value="vp9" disabled>VP9 (Not supported in Safari)</option>
           <option value="vp8" disabled>VP8 (Not supported in Safari)</option>` 
        : 
          `<option value="vp9">VP9 (WebM)</option>
           <option value="vp8">VP8 (WebM)</option>`
        }
      </select>
    </label>
    <label>
      Include Audio
      <input type="checkbox" id="includeAudio" checked/>
    </label>
    <div id="audioStatus" class="audio-status">Audio: Not detected</div>
    <button id="recRotate" title="Rotate dimensions">⟲ Rotate</button>
    <div id="recPresets">
      <button class="preset active" data-w="1920" data-h="1080">1080p</button>
      <button class="preset" data-w="2560" data-h="1440">1440p</button>
      <button class="preset" data-w="3840" data-h="2160">4K</button>
      <button class="preset" data-w="1280" data-h="720">720p</button>
    </div>
    <button class="start" id="startRec">Start Recording</button>
    <button class="stop" id="stopRec" disabled>Stop</button>
    <a id="downloadLink" style="border:0px;border-radius:6px;background:var(--m);display:none;text-decoration:none; color:#000;">Download</a>
    <div id="recStats" style="margin-top: 8px; display: none;"></div>
  `;
  container.appendChild(settingsPanel);
  settingsPanel.appendChild(videoPreview);
  const recWidth = settingsPanel.querySelector('#recWidth');
  const recHeight = settingsPanel.querySelector('#recHeight');
  const recFPS = settingsPanel.querySelector('#recFPS');
  const recQuality = settingsPanel.querySelector('#recQuality');
  const recQualityVal = settingsPanel.querySelector('#recQualityVal');
  const recCodec = settingsPanel.querySelector('#recCodec');
  const recRotate = settingsPanel.querySelector('#recRotate');
  const includeAudio = settingsPanel.querySelector('#includeAudio');
  const audioStatus = settingsPanel.querySelector('#audioStatus');
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
  function checkCodecSupport(codec) {
    const codecOptions = {
      'vp9': [
        'video/webm; codecs=vp9',
        'video/webm;codecs=vp9',
        'video/webm; codecs="vp9"',
        'video/webm;codecs="vp9"'
      ],
      'vp8': [
        'video/webm; codecs=vp8',
        'video/webm;codecs=vp8',
        'video/webm; codecs="vp8"',
        'video/webm;codecs="vp8"'
      ],
      'h264': [
        'video/mp4; codecs=avc1.42E01E',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4;codecs="avc1.42E01E"',
        'video/webm; codecs=h264',
        'video/webm;codecs=h264'
      ]
    };
    const types = codecOptions[codec] || [];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  }
  startRec.addEventListener('click', () => {
    downloadLink.style.display = 'none';
    recStats.style.display = 'none';
    recStats.textContent = '';
    const w = +recWidth.value;
    const h = +recHeight.value;
    const fps = +recFPS.value;
    const dpr = window.devicePixelRatio || 1;
    hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = w;
    hiddenCanvas.height = h;
    hiddenCtx = hiddenCanvas.getContext('2d', { alpha: false });
    const videoStream = hiddenCanvas.captureStream(fps);
    let finalStream = videoStream;
    if (includeAudio.checked) {
      const audioStream = getAudioStream();
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        finalStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);
        console.log('Recording with audio tracks:', audioStream.getAudioTracks().length);
      } else {
        console.log('No audio stream available, recording video only');
      }
    }
    const bits = recQuality.value * 1000;
    const selectedCodec = recCodec.value;
    const mimeType = checkCodecSupport(selectedCodec);
    if (!mimeType) {
      const fallbackCodecs = ['h264', 'vp9', 'vp8'];
      let fallbackMimeType = null;
      let fallbackCodec = null;
      for (const codec of fallbackCodecs) {
        fallbackMimeType = checkCodecSupport(codec);
        if (fallbackMimeType) {
          fallbackCodec = codec;
          break;
        }
      }
      if (fallbackMimeType) {
        alert(`Your browser doesn't support ${selectedCodec} codec. Falling back to ${fallbackCodec}.`);
        recCodec.value = fallbackCodec;
        startRecording(finalStream, fallbackMimeType, bits, w, h, fallbackCodec);
      } else {
        alert(`Your browser doesn't support any of the available video codecs. Recording is not possible.`);
      }
    } else {
      startRecording(finalStream, mimeType, bits, w, h, selectedCodec);
    }
  });
  function startRecording(stream, mimeType, bits, w, h, selectedCodec) {
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
        hasAudio: hasAudio
      };
      previewVideo.src = currentVideoUrl;
      videoInfo.innerHTML = `
        <div><strong>File:</strong> ${fileSizeMB} MB • ${duration}s • ${w}×${h}</div>
        <div><strong>Settings:</strong> ${selectedCodec} • ${recQuality.value} kbps</div>
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
      recIndicator.textContent = `● RECORDING ${duration}s ${hasAudio ? '♪' : ''}`;
    }
    function drawLoop() {
      hiddenCtx.imageSmoothingEnabled = true;
      hiddenCtx.imageSmoothingQuality = 'high';
      hiddenCtx.clearRect(0, 0, w, h);
      hiddenCtx.drawImage(canvas, 0, 0, w, h);
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