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
  EL(tag, props = {}, styles = {}, html = '') {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, styles);
    if (html) el.innerHTML = html;
    return el;
  }
  style(el, styles) {
    Object.assign(el.style, styles);
  }
  button() {
    const btnStyles = {
      position: 'absolute', top:'50%', right:'10px',
      transform:'translateY(-50%)', padding:'10px',
      backgroundColor:'var(--d)', color:'var(--6)', border:'none',
      borderRadius:'0', cursor:'pointer', fontSize:'12px',
      display:'flex', transition:'all .2s ease', zIndex:'1000'
    };
    this.button = this.EL('button', { innerHTML: this.SVG() }, btnStyles);
    this.button.addEventListener('mouseenter', ()=> {
      this.style(this.button, { backgroundColor:'var(--5)' });
    });
    this.button.addEventListener('mouseleave', ()=> {
      this.style(this.button, {
        backgroundColor: this.isActive? '#0a5c2e' : 'var(--d)',
        transform: 'translateY(-50%) scale(1)'
      });
    });
    this.button.onclick = ()=> this.show();
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
    this.modal = this.EL(
      'div', {}, {
        position:'fixed', top:0, left:0, width:'100%', height:'100%',
        backgroundColor:'var(--d)', display:'none', zIndex:'10000',
        backdropFilter:'blur(4px)'
      }
    );
    const wrap = this.EL('div', {}, {
      position:'absolute', top:'50%', left:'50%',
      transform:'translate(-50%,-50%)',
      backgroundColor:'var(--1)', borderRadius:'2px',
      padding:'24px',
      border:'0.1px solid var(--4)', minWidth:'350px', maxWidth:'600px',
      maxHeight:'80vh', overflowY:'auto'
    });
    const header = this.EL('div', {}, {}, 
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h3 style="margin:0;color:var(--7);display:flex;align-items:center;gap:8px;">
          ${this.SVG()} <span id="modal-title">Audio</span>
        </h3>
        <div style="display:flex;gap:8px;">
          <button id="info-toggle" style="
            background:none;border:none;color:var(--7);font-size:16px;cursor:pointer;
            padding:4px;border-radius:2px;transition:background .2s ease;
          " title="Show Documentation">
            ${this.InfoSVG()}
          </button>
          <button id="close-modal" style="
            background:none;border:none;color:var(--7);font-size:30px;cursor:pointer;
          ">×</button>
        </div>
      </div>`
    );
    wrap.appendChild(header);
    this.settingsContent = this.EL('div', { id: 'settings-content' }, {});
    this.settingsContent.appendChild(this.EL('div', {}, {}, 
      `<div style="margin-bottom:15px;">
        <span style="display:block;color:var(--7);margin-bottom:8px;font-size:14px;">
          Microphone Input:
        </span>
        <select id="mic-select" style="
          width:100%;padding:8px;background:var(--3);border:1px solid var(--4);
          color:var(--7);border-radius:2px;font-size:14px;cursor:pointer;
        ">
          <option value="">Loading devices...</option>
        </select>
      </div>`
    ));
    this.settingsContent.appendChild(this.EL('div', {}, {}, 
      `<div style="margin-bottom:20px;padding:0px;background:var(--d);border-radius:2px">
        <button id="audio-toggle" style="
          width:100%;padding:12px;background:var(--3);border:none;color:var(--7);border-radius:2px;
          cursor:pointer;transition:all .2s ease">
          Enable Audio Input
        </button>
        <div id="audio-status" style="
          margin-top:8px;font-size:12px;color:var(--7);text-align:center">
          Click to enable microphone access
        </div>
      </div>`
    ));
    const sliders = ['bass','mid','treble','volume']
      .map(type => 
        `<div style="margin-bottom:10px;">
          <span style="display:block;color:white;margin-bottom:4px;">
            ${type[0].toUpperCase() + type.slice(1)} Sensitivity:
            <span id="${type}-value" style="color:${this.color(type)};margin-left:8px;">1.0</span>
          </span>
          <input id="${type}-slider" type="range" min="0.1" max="3" step="0.1" value="1.0" 
                 style="width:100%;"/>
        </div>`
      ).join('');
    this.settingsContent.appendChild(this.EL('div', {}, {}, `${sliders}`));
    this.settingsContent.appendChild(this.EL('div', {}, {}, 
      `<div style="margin-top:20px;padding:16px;background:var(--d);border-radius:0px">
        <h4 style="margin:0 0 12px 0;color:white;font-size:14px">
          Audio Levels
        </h4>
        <div id="audio-bars" style="display:flex;gap:8px;height:60px;align-items:end">
          ${['bass','mid','treble','volume']
            .map(type => `<div class="audio-bar" data-type="${type}"
               style="flex:1;background:${this.color(type)};
                      border-radius:2px;min-height:2px;
                      transition:height .1s ease"></div>`)
            .join('')}
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--7);margin-top:8px;">
          ${['Bass','Mid','Treble','Volume']
            .map(lbl => `<span style="font-size:12px;">${lbl}</span>`).join('')}
        </div>
      </div>`
    ));
    this.infoContent = this.EL('div', { id: 'info-content' }, { display: 'none' });
    this.infoContent.appendChild(this.EL('div', {}, {}, 
      `<div style="color:var(--7);line-height:1.6;">
        <h4 style="color:white;margin:0 0 16px 0;">Audio-Reactive Shader Uniforms</h4>
        <p style="margin:0 0 16px 0;">
          This system automatically passes audio data to your shaders as uniform variables. 
          Use these in your fragment shader code:
        </p>
        <div style="background:var(--d);padding:16px;border-radius:4px;margin:16px 0;font-family:monospace;font-size:13px;">
          <div style="color:#8be9fd;margin-bottom:8px;">// Available uniforms:</div>
          <div style="color:#50fa7b;">uniform float</div> <span style="color:#f8f8f2;">u_bass;</span>    <span style="color:#6272a4;">// Bass frequencies (0.0-1.0)</span><br>
          <div style="color:#50fa7b;">uniform float</div> <span style="color:#f8f8f2;">u_mid;</span>     <span style="color:#6272a4;">// Mid frequencies (0.0-1.0)</span><br>
          <div style="color:#50fa7b;">uniform float</div> <span style="color:#f8f8f2;">u_treble;</span> <span style="color:#6272a4;">// High frequencies (0.0-1.0)</span><br>
          <div style="color:#50fa7b;">uniform float</div> <span style="color:#f8f8f2;">u_volume;</span> <span style="color:#6272a4;">// Overall volume (0.0-1.0)</span>
        </div>
        <h5 style="color:white;margin:20px 0 12px 0;">Example Usage:</h5>
        <div style="background:var(--d);padding:16px;border-radius:4px;margin:16px 0;font-family:monospace;font-size:13px;">
          <div style="color:#8be9fd;">// Pulse effect with bass</div><br>
          <span style="color:#f8f8f2;">vec3 color = baseColor * (</span><span style="color:#ff79c6;">1.0</span><span style="color:#f8f8f2;"> + u_bass * </span><span style="color:#ff79c6;">2.0</span><span style="color:#f8f8f2;">);</span><br><br>
          <div style="color:#8be9fd;">// Frequency-based color mixing</div><br>
          <span style="color:#f8f8f2;">vec3 audioColor = vec3(u_bass, u_mid, u_treble);</span><br><br>
          <div style="color:#8be9fd;">// Time modulation with volume</div><br>
          <span style="color:#f8f8f2;">float speed = u_time * (</span><span style="color:#ff79c6;">1.0</span><span style="color:#f8f8f2;"> + u_volume * </span><span style="color:#ff79c6;">5.0</span><span style="color:#f8f8f2;">);</span><br><br>
          <div style="color:#8be9fd;">// Scale transformations</div><br>
          <span style="color:#f8f8f2;">vec2 scaledUV = uv * (</span><span style="color:#ff79c6;">1.0</span><span style="color:#f8f8f2;"> + u_bass * </span><span style="color:#ff79c6;">0.5</span><span style="color:#f8f8f2;">);</span>
        </div>
        <h5 style="color:white;margin:20px 0 12px 0;">Notes:</h5>
        <ul style="margin:0;padding-left:20px;">
          <li style="margin-bottom:8px;">Bass frequencies are dampened to prevent overwhelming effects</li>
          <li style="margin-bottom:8px;">Use sensitivity sliders to fine-tune responsiveness</li>
          <li style="margin-bottom:8px;">Combine multiple frequencies for complex animations</li>
          <li style="margin-bottom:8px;">Values are smoothed over time to reduce jitter</li>
        </ul>
        <div style="background:#1a4b32;padding:12px;border-radius:4px;margin:16px 0;border-left:4px solid #0a5c2e;">
          <strong style="color:#4ade80;">Pro Tip:</strong> 
          <span style="color:var(--7);">Try multiplying audio values by larger numbers (2.0-10.0) for more dramatic effects, or use them as offsets in noise functions.</span>
        </div>
      </div>`
    ));
    const fileZone = this.EL('div', { id: 'file-drop' }, {
  marginBottom: '20px',
  padding: '20px',
  background: 'var(--d)',
  border: '2px dashed var(--4)',
  textAlign: 'center',
  cursor: 'pointer'
}, `
  <p style="color:var(--7)">
    Drag & drop an audio file here<br>
    or <button id="file-upload-btn" style="background:var(--5);border-radius:2px;text-decoration:none;padding:0.5rem 1rem;border:none;color:var(--7);cursor:pointer">Browse files</button>
  </p>
  <input id="file-input" type="file" accept="audio/*" style="display:none"/>
  <audio id="file-audio" controls style="width:100%;display:none;margin-top:10px"></audio>
  <button id="clear-file-btn" style="display:none;margin-top:10px;padding:6px 12px;background:var(--d);border:none;color:var(--7);cursor:pointer">Clear File</button>
`);
  this.settingsContent.appendChild(fileZone);
  wrap.appendChild(header);
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
  infoBtn.addEventListener('mouseenter', () => infoBtn.style.backgroundColor = 'var(--5)');
  infoBtn.addEventListener('mouseleave', () => infoBtn.style.backgroundColor = 'transparent');
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
          this.button.style.backgroundColor = '#0a5c2e';
        } catch {
          this.updateMicrophoneUI(false, 'Microphone access denied', true);
        }
      } else {
        this.isActive = !this.isActive;
        this.updateMicrophoneUI(this.isActive, this.isActive ? 'Microphone active' : 'Microphone paused');
        this.button.style.backgroundColor = this.isActive ? '#0a5c2e' : 'var(--d)';
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
        dropZone.style.borderColor = 'var(--7)';
      })
    );
    ['dragleave','drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--4)';
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
      this.style(micBtn, { backgroundColor: '#8b0000' });
      micStatus.style.color = '#f87171';
    } else {
      micBtn.textContent = isEnabled ? 'Microphone: ON' : 'Microphone: OFF';
      this.style(micBtn, { backgroundColor: isEnabled ? '#0a5c2e' : '#444' });
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
      this.button.style.backgroundColor = '#0a5c2e';
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
          bass: (data.slice(0,20).reduce((a,b)=>a+b)/20) * 0.25,
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
    }, {
      width: '100%',
      marginTop: '10px',
      display: 'block'
    });
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
      this.button.style.backgroundColor = '#0a5c2e';
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
    this.gl = gl; this.program = program;
  }
  update() {
    if (!this.analyser || !this.isActive || !this.gl || !this.program) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const calc = (from, to, sens, dampening = 1) =>
      Math.min(1, data.slice(from,to).reduce((a,b)=>a+b)/(to-from)/255 * sens * dampening);
    const vals = {
      bass:   calc(0,20,   this.sensitivity.bass, 0.25),
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