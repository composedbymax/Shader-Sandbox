(function() {
class AudioReactive {
  constructor() {
    this.isActive     = false;
    this.audioContext = null;
    this.analyser     = null;
    this.gl           = null;
    this.program      = null;
    this.sensitivity  = { bass:1, mid:1, treble:1, volume:1 };
    this.showingInfo  = false;
    this.micStream    = null;
    this.fileSource   = null;
    this.fileActive   = false;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.init();
        window.audioReactiveInstance = this;
      });
    } else {
      this.init();
      window.audioReactiveInstance = this;
    }
  }
  init() {
    this.previewPanel = document.getElementById('preview-panel');
    if (!this.previewPanel) return console.warn('No #preview-panel');
    if (getComputedStyle(this.previewPanel).position === 'static') {
      this.previewPanel.style.position = 'relative';
    }
    this.button();
    this.Modal();
    navigator.mediaDevices.addEventListener('devicechange', () => this.loadAudioDevices());
    this.loadAudioDevices();
  }
  EL(tag, props = {}, className = '', html = '') {
    const el = document.createElement(tag);
    Object.assign(el, props);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }
  style(el, styles) {
    Object.assign(el.style, styles);
  }
  button() {
    this.button = this.EL('button', {
      innerHTML: this.SVG(),
      title: 'Audio Reactivity'
    }, 'audio-reactive-button');
    this.button.addEventListener('mouseleave', () => {
      this.style(this.button, {
        backgroundColor: this.isActive ? 'var(--a)' : 'var(--d)',
        transform: 'translateY(-50%) scale(1)'
      });
    });
    this.button.onclick = () => this.show();
    this.previewPanel.appendChild(this.button);
  }
  SVG() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V3c0-1.1-.9-2-2-2z"/>
        <path d="M19 10v1c0 3.87-3.13 7-7 7s-7-3.13-7-7v-1
                 c0-.55-.45-1-1-1s-1 .45-1 1v1
                 c0 4.72 3.56 8.61 8 9.19V22
                 c0 .55.45 1 1 1s1-.45 1-1v-2.81
                 c4.44-.58 8-4.47 8-9.19v-1
                 c0-.55-.45-1-1-1s-1 .45-1 1z"/>
        <circle cx="12" cy="20" r="2" opacity="0.3"/>
      </svg>
    `;
  }
  InfoSVG() {
    return `
     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" fill="none"/>
      <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
      <circle cx="12" cy="8" r="1" fill="currentColor"/>
    </svg>
    `;
  }
  Modal() {
    this.modal = this.EL('div', {}, 'audio-reactive-modal');
    const wrap = this.EL('div', {}, 'audio-reactive-modal-wrap');
    const header = this.EL('div', {}, '', 
      `<div class="audio-reactive-header">
        <h3 class="audio-reactive-title">
          ${this.SVG()} <span id="modal-title">Audio</span>
        </h3>
        <div class="audio-reactive-button-group">
          <button id="info-toggle" class="audio-reactive-info-btn" title="Show Documentation">
            ${this.InfoSVG()}
          </button>
          <button id="close-modal" class="audio-reactive-close-btn">×</button>
        </div>
      </div>`
    );
    wrap.appendChild(header);
    this.settingsContent = this.EL('div', { id: 'settings-content' });
    this.settingsContent.appendChild(this.EL('div', {}, '', 
      `<div class="audio-reactive-mic-section">
        <span class="audio-reactive-label">
          Microphone Input:
        </span>
        <select id="mic-select" class="audio-reactive-select">
          <option value="">Loading devices...</option>
        </select>
      </div>`
    ));
    this.settingsContent.appendChild(this.EL('div', {}, '', 
      `<div class="audio-reactive-toggle-section">
        <button id="audio-toggle" class="audio-reactive-toggle-btn">
          Enable Audio Input
        </button>
        <div id="audio-status" class="audio-reactive-status">
          Click to enable microphone access
        </div>
      </div>`
    ));
    const sliders = ['bass','mid','treble','volume']
      .map(type => 
        `<div class="audio-reactive-slider-group">
          <span class="audio-reactive-slider-label">
            ${type[0].toUpperCase() + type.slice(1)} Sensitivity:
            <span id="${type}-value" class="audio-reactive-slider-value" style="color:${this.color(type)};">1.0</span>
          </span>
          <input id="${type}-slider" class="audio-reactive-slider" type="range" min="0.1" max="3" step="0.1" value="1.0" />
        </div>`
      ).join('');
    this.settingsContent.appendChild(this.EL('div', {}, '', `${sliders}`));
    this.settingsContent.appendChild(this.EL('div', {}, '', 
      `<div class="audio-reactive-levels">
        <h4 class="audio-reactive-levels-title">
          Audio Levels
        </h4>
        <div id="audio-bars" class="audio-reactive-bars">
          ${['bass','mid','treble','volume']
            .map(type => `<div class="audio-bar" data-type="${type}"></div>`)
            .join('')}
        </div>
        <div class="audio-reactive-bar-labels">
          ${['Bass','Mid','Treble','Volume']
            .map(lbl => `<span class="audio-reactive-bar-label">${lbl}</span>`).join('')}
        </div>
      </div>`
    ));
    this.infoContent = this.EL('div', { id: 'info-content' }, 'audio-reactive-info-content');
    this.infoContent.appendChild(this.EL('div', {}, '', 
      `<div>
        <h4 class="audio-reactive-info-title">Audio-Reactive Shader Uniforms</h4>
        <p class="audio-reactive-info-text">
          This system automatically passes audio data to your shaders as uniform variables. 
          Use these in your fragment shader code:
        </p>
        <div class="audio-reactive-code-block">
          <div class="audio-reactive-code-comment">// Available uniforms:</div>
          <div class="audio-reactive-code-type">uniform float</div> <span class="audio-reactive-code-var">u_bass;</span>    <span class="audio-reactive-code-inline-comment">// Bass frequencies (0.0-1.0)</span><br>
          <div class="audio-reactive-code-type">uniform float</div> <span class="audio-reactive-code-var">u_mid;</span>     <span class="audio-reactive-code-inline-comment">// Mid frequencies (0.0-1.0)</span><br>
          <div class="audio-reactive-code-type">uniform float</div> <span class="audio-reactive-code-var">u_treble;</span> <span class="audio-reactive-code-inline-comment">// High frequencies (0.0-1.0)</span><br>
          <div class="audio-reactive-code-type">uniform float</div> <span class="audio-reactive-code-var">u_volume;</span> <span class="audio-reactive-code-inline-comment">// Overall volume (0.0-1.0)</span>
        </div>
        <h5 class="audio-reactive-example-title">Example Usage:</h5>
        <div class="audio-reactive-code-block">
          <div class="audio-reactive-code-comment">// Pulse effect with bass</div><br>
          <span class="audio-reactive-code-var">vec3 color = baseColor * (</span><span class="audio-code-span">1.0</span><span class="audio-reactive-code-var"> + u_bass * </span><span class="audio-code-span">2.0</span><span class="audio-reactive-code-var">);</span><br><br>
          <div class="audio-reactive-code-comment">// Frequency-based color mixing</div><br>
          <span class="audio-reactive-code-var">vec3 audioColor = vec3(u_bass, u_mid, u_treble);</span><br><br>
          <div class="audio-reactive-code-comment">// Time modulation with volume</div><br>
          <span class="audio-reactive-code-var">float speed = u_time * (</span><span class="audio-code-span">1.0</span><span class="audio-reactive-code-var"> + u_volume * </span><span class="audio-code-span">5.0</span><span class="audio-reactive-code-var">);</span><br><br>
          <div class="audio-reactive-code-comment">// Scale transformations</div><br>
          <span class="audio-reactive-code-var">vec2 scaledUV = uv * (</span><span class="audio-code-span">1.0</span><span class="audio-reactive-code-var"> + u_bass * </span><span class="audio-code-span">0.5</span><span class="audio-reactive-code-var">);</span>
        </div>
        <h5 class="audio-reactive-notes-title">Notes:</h5>
        <ul class="audio-reactive-notes-list">
          <li class="audio-reactive-notes-item">Bass frequencies are dampened to prevent overwhelming effects</li>
          <li class="audio-reactive-notes-item">Use sensitivity sliders to fine-tune responsiveness</li>
          <li class="audio-reactive-notes-item">Combine multiple frequencies for complex animations</li>
          <li class="audio-reactive-notes-item">Values are smoothed over time to reduce jitter</li>
        </ul>
        <div class="audio-reactive-tip-box">
          <strong class="audio-reactive-tip-strong">Pro Tip:</strong> 
          <span class="audio-reactive-tip-text">Try multiplying audio values by larger numbers (2.0-10.0) for more dramatic effects, or use them as offsets in noise functions.</span>
        </div>
      </div>`
    ));
    const fileZone = this.EL('div', { id: 'file-drop' }, 'audio-reactive-file-drop', `
      <p class="audio-reactive-file-text">
        Drag & drop an audio file here<br>
        or <button id="file-upload-btn" class="audio-reactive-upload-btn">Browse files</button>
      </p>
      <input id="file-input" class="audio-reactive-file-input" type="file" accept="audio/mpeg, audio/mp3, audio/wav, audio/wave, audio/x-wav, audio/aac, audio/mp4, audio/x-m4a, audio/flac, audio/ogg, audio/opus, .mp3, .wav, .aac, .m4a, .flac, .ogg, .opus"/>
      <audio id="file-audio" class="audio-reactive-file-audio" controls></audio>
      <button id="clear-file-btn" class="audio-reactive-clear-btn">Clear File</button>
    `);
    this.settingsContent.appendChild(fileZone);
    wrap.appendChild(this.settingsContent);
    wrap.appendChild(this.infoContent);
    this.modal.appendChild(wrap);
    this.bindEvents();
  }
  color(type) {
    return { bass:'#ff4444', mid:'#44ff44', treble:'#4444ff', volume:'#ffff44' }[type];
  }
  async loadAudioDevices(preserveId) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const select = this.modal.querySelector('#mic-select');
      const oldValue = preserveId || select.value;
      select.innerHTML = '';
      audioInputs.forEach((device, idx) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Microphone ${idx + 1}`;
        select.appendChild(option);
      });
      if (oldValue && [...select.options].some(o => o.value === oldValue)) {
        select.value = oldValue;
      }
    } catch (error) {
      console.warn('Could not enumerate audio devices:', error);
    }
  }
  bindEvents() {
    this.modal.querySelector('#close-modal').onclick = () => this.hide();
    this.modal.onclick = e => { if (e.target === this.modal) this.hide(); };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.hide();
      }
    }, { once: false });
    const infoBtn    = this.modal.querySelector('#info-toggle');
    const modalTitle = this.modal.querySelector('#modal-title');
    infoBtn.onclick = () => {
      this.showingInfo = !this.showingInfo;
      if (this.showingInfo) {
        this.settingsContent.style.display = 'none';
        this.infoContent.style.display     = 'block';
        modalTitle.textContent             = 'Documentation';
        infoBtn.innerHTML                  = this.SVG();
        infoBtn.title                      = 'Show Settings';
      } else {
        this.settingsContent.style.display = 'block';
        this.infoContent.style.display     = 'none';
        modalTitle.textContent             = 'Audio';
        infoBtn.innerHTML                  = this.InfoSVG();
        infoBtn.title                      = 'Show Documentation';
      }
    };
    const micSelect = this.modal.querySelector('#mic-select');
    micSelect.addEventListener('change', async () => {
      if (this.isActive && !this.fileActive) {
        await this.switchToMicrophone();
      }
    });
    const micBtn = this.modal.querySelector('#audio-toggle');
    const micStatus = this.modal.querySelector('#audio-status');
    micBtn.onclick = async () => {
      if (this.fileActive) {
        await this.switchToMicrophone();
      } else if (!this.audioContext || !this.micStream) {
        try {
          await this.getMic();
          this.updateMicrophoneUI(true, 'Microphone active');
          this.isActive = true;
          this.fileActive = false;
          this.button.style.backgroundColor = 'var(--a)';
        } catch {
          this.updateMicrophoneUI(false, 'Microphone access denied', true);
        }
      } else {
        this.isActive = !this.isActive;
        if (this.isActive) {
          this.updateMicrophoneUI(true, 'Microphone active');
          this.button.style.backgroundColor = 'var(--a)';
        } else {
          this.cleanupMicrophone();
          this.updateMicrophoneUI(false, 'Click to enable microphone access');
          this.button.style.backgroundColor = 'var(--d)';
        }
      }
    };
    ['bass','mid','treble','volume'].forEach(type => {
      const slider = this.modal.querySelector(`#${type}-slider`);
      const value  = this.modal.querySelector(`#${type}-value`);
      slider.oninput = () => {
        this.sensitivity[type] = +slider.value;
        value.textContent      = slider.value;
      };
    });
    const dropZone  = this.modal.querySelector('#file-drop');
    const fileInput = this.modal.querySelector('#file-input');
    const uploadBtn = this.modal.querySelector('#file-upload-btn');
    const audioEl   = this.modal.querySelector('#file-audio');
    const clearBtn  = this.modal.querySelector('#clear-file-btn');
    uploadBtn.onclick = e => {
      e.stopPropagation();
      fileInput.click();
    };
    ['dragenter','dragover'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      })
    );
    ['dragleave','drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      })
    );
    dropZone.addEventListener('drop', e => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        this.loadFile(file);
      }
    });
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (file) this.loadFile(file);
    };
    clearBtn.onclick = () => this.clearFile();
  }
  updateMicrophoneUI(isEnabled, statusText, isError = false) {
    const micBtn = this.modal.querySelector('#audio-toggle');
    const micStatus = this.modal.querySelector('#audio-status');
    if (isError) {
      micBtn.textContent = 'Access Denied';
      this.style(micBtn, { backgroundColor: 'var(--r)' });
      micStatus.style.color = 'var(--r)';
    } else {
      micBtn.textContent = isEnabled ? 'Microphone: ON' : 'Microphone: OFF';
      this.style(micBtn, { backgroundColor: isEnabled ? 'var(--a)' : 'var(--1)' });
      micStatus.style.color = 'var(--7)';
    }
    micStatus.textContent = statusText;
  }
  async switchToMicrophone() {
    try {
      if (this.fileActive) {
        this.clearFileAudio();
      }
      await this.getMic();
      this.updateMicrophoneUI(true, 'Microphone active');
      this.isActive = true;
      this.fileActive = false;
      this.button.style.backgroundColor = 'var(--a)';
    } catch (error) {
      console.error('Failed to switch to microphone:', error);
      this.updateMicrophoneUI(false, 'Failed to access microphone', true);
    }
  }
  clearFileAudio() {
    const audioEl = this.modal.querySelector('#file-audio');
    const clearBtn = this.modal.querySelector('#clear-file-btn');
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.style.display = 'none';
      if (audioEl.src) {
        URL.revokeObjectURL(audioEl.src);
        audioEl.src = '';
      }
    }
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }
    if (this.fileSource) {
      this.fileSource.disconnect();
      this.fileSource = null;
    }
  }
  async show() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    const targetElement = fullscreenElement || document.body;
    if (this.modal.parentNode !== targetElement) {
      targetElement.appendChild(this.modal);
    }
    this.modal.style.display = 'block';
    this.showingInfo = false;
    this.settingsContent.style.display = 'block';
    this.infoContent.style.display = 'none';
    this.modal.querySelector('#modal-title').textContent = 'Audio';
    this.modal.querySelector('#info-toggle').innerHTML = this.InfoSVG();
    this.modal.querySelector('#info-toggle').title = 'Show Documentation';
    this.barAnimation();
  }
  
  hide() {
    this.modal.style.display = 'none';
  }
  
  barAnimation() {
    const loop = () => {
      if (this.modal.style.display === 'none') return;
      if (this.analyser && this.isActive && !this.showingInfo) {
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        const sums = {
          bass: (data.slice(0,20).reduce((a,b)=>a+b)/20) * 0.4,
          mid:  data.slice(20,60).reduce((a,b)=>a+b)/40,
          treble: data.slice(60,120).reduce((a,b)=>a+b)/60,
          volume: data.reduce((a,b)=>a+b)/data.length
        };
        this.modal.querySelectorAll('.audio-bar').forEach(bar => {
          const t = bar.dataset.type;
          const h = Math.max(2, (sums[t]/255)*60);
          bar.style.height = h + 'px';
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  
  cleanupMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }
  stopAudio() {
    this.cleanupMicrophone();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.fileSource = null;
  }
  async getMic() {
    this.cleanupMicrophone();
    const select = this.modal.querySelector('#mic-select');
    const deviceId = select.value;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false 
        }
      });
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext||window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = .3;
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);
      await this.loadAudioDevices(deviceId);
    } catch (error) {
      this.cleanupMicrophone();
      throw error;
    }
  }
  async loadFile(file) {
    this.clearFileAudio();
    const audioEl = this.EL('audio', {
      id: 'file-audio',
      controls: true,
      src: URL.createObjectURL(file)
    }, 'audio-reactive-file-audio');
    audioEl.style.display = 'block';
    const clearBtn = this.modal.querySelector('#clear-file-btn');
    clearBtn.style.display = 'block';
    this.modal.querySelector('#file-drop').appendChild(audioEl);
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.cleanupMicrophone();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = .3;
      this.fileSource = this.audioContext.createMediaElementSource(audioEl);
      this.fileSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.isActive = true;
      this.fileActive = true;
      this.button.style.backgroundColor = 'var(--a)';
      this.updateMicrophoneUI(false, 'Audio file active - Click to switch to microphone');
      await audioEl.play();
    } catch (error) {
      console.error('Failed to load audio file:', error);
      this.clearFile();
    }
  }
  clearFile() {
    this.clearFileAudio();
    this.fileActive = false;
    this.isActive = false;
    this.button.style.backgroundColor = 'var(--d)';
    this.updateMicrophoneUI(false, 'Click to enable microphone access');
  }
  setGLContext(gl, program) {
    this.gl = gl; 
    this.program = program;
  }
  update() {
    if (!this.analyser || !this.isActive || !this.gl || !this.program) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const calc = (from, to, sens, dampening = 1) =>
      Math.min(1, data.slice(from,to).reduce((a,b)=>a+b)/(to-from)/255 * sens * dampening);
    const vals = {
      bass:   calc(0,20,   this.sensitivity.bass, 0.4),
      mid:    calc(20,60,  this.sensitivity.mid),
      treble: calc(60,120, this.sensitivity.treble),
      volume: calc(0,data.length, this.sensitivity.volume)
    };
    ['bass','mid','treble','volume'].forEach( name => {
      const loc = this.gl.getUniformLocation(this.program, `u_${name}`);
      if (loc) this.gl.uniform1f(loc, vals[name]);
    });
  }
}
window.AudioReactive = AudioReactive;
})();