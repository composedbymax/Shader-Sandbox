(() => {
  const canvas = document.getElementById('glcanvas');
  const container = document.getElementById('preview-panel');
  if (!canvas || !container) return;
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
  const style = document.createElement('style');
  style.textContent = `
    #recSettings {
      display: none; position: absolute; bottom: 42px; left: 10px;
      background: var(--d); color: var(--l); padding: 10px;
      z-index: 100; font-size: 0.9rem;
      min-width: 240px;
    }
    #recSettings label { display: block; margin-bottom: 6px; }
    #recSettings input { margin-left: 4px; }
    #recSettings .preset { margin-right: 4px; margin-top: 4px; }
    #recSettings button {
      padding: 4px 8px;
      margin: 2px;
      cursor: pointer;
      border:0px;
      border-radius:6px;
    }
    #recSettings .active {
      background:var(--a);
      color: white;
    }
    #recBtn {
      width:2rem;
      height:2rem;
      position: absolute; bottom: 10px; left: 10px;
      background: var(--d); color: var(--l); border: none;
      padding: 8px; cursor: pointer;
      z-index: 100; font-size: 1rem;
    }
    #recordingIndicator {
      display: none; position: absolute; top: 10px; right: 10px;
      background: rgba(255,0,0,0.7); color: var(--l); padding: 5px 10px;
      border-radius: 4px; z-index: 100; animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    input, select {padding: 1rem; border-radius: 5px; border: 0px; width: 100%;  background: var(--d); color: var(--l); }
  `;
  document.head.appendChild(style);
  const recIndicator = document.createElement('div');
  recIndicator.id = 'recordingIndicator';
  recIndicator.textContent = '● RECORDING';
  container.appendChild(recIndicator);
  const recBtn = document.createElement('button');
  recBtn.id = 'recBtn';
  recBtn.textContent = '⏺';
  recBtn.title = 'Record Settings';
  container.appendChild(recBtn);
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
        ${isSafari || isIOS ? 
          `<option value="h264" selected>H.264 (Safari Compatible)</option>
           <option value="vp9" disabled>VP9 (Not supported in Safari)</option>
           <option value="vp8" disabled>VP8 (Not supported in Safari)</option>` 
        : 
          `<option value="vp9" selected>VP9 (Higher Quality)</option>
           <option value="vp8">VP8 (Better Compatibility)</option>
           <option value="h264">H.264 (Safari Compatible)</option>`
        }
      </select>
    </label>
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
  const recWidth = settingsPanel.querySelector('#recWidth');
  const recHeight = settingsPanel.querySelector('#recHeight');
  const recFPS = settingsPanel.querySelector('#recFPS');
  const recQuality = settingsPanel.querySelector('#recQuality');
  const recQualityVal = settingsPanel.querySelector('#recQualityVal');
  const recCodec = settingsPanel.querySelector('#recCodec');
  const recRotate = settingsPanel.querySelector('#recRotate');
  const presets = settingsPanel.querySelectorAll('.preset');
  const startRec = settingsPanel.querySelector('#startRec');
  const stopRec = settingsPanel.querySelector('#stopRec');
  const downloadLink = settingsPanel.querySelector('#downloadLink');
  const recStats = settingsPanel.querySelector('#recStats');
  let recorder, recordedChunks = [], hiddenCanvas, hiddenCtx, drawLoopId;
  let settingsPanelVisible = false;
  let recordingStartTime;
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
    const stream = hiddenCanvas.captureStream(fps);
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
        startRecording(stream, fallbackMimeType, bits, w, h, fallbackCodec);
      } else {
        alert(`Your browser doesn't support any of the available video codecs. Recording is not possible.`);
      }
    } else {
      startRecording(stream, mimeType, bits, w, h, selectedCodec);
    }
  });
  function startRecording(stream, mimeType, bits, w, h, selectedCodec) {
    const options = {
      mimeType: mimeType,
      videoBitsPerSecond: bits
    };
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
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `recording_${w}x${h}_${selectedCodec}.${fileExtension}`;
      downloadLink.style.display = 'inline-block';
      downloadLink.textContent = `Download (${fileSizeMB} MB)`;
      recStats.style.display = 'block';
      recStats.innerHTML = `
        <div>Size: ${fileSizeMB} MB</div>
        <div>Duration: ${duration}s</div>
        <div>Resolution: ${w}×${h}</div>
        <div>Codec: ${selectedCodec}</div>
        <div>Bitrate: ${recQuality.value} kbps</div>
      `;
      recIndicator.style.display = 'none';
      startRec.disabled = false;
      cancelAnimationFrame(drawLoopId);
    };
    function updateRecordingStats() {
      const duration = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
      recIndicator.textContent = `● RECORDING ${duration}s`;
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