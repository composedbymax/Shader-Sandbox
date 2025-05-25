class AudioReactive {
  constructor() {
    this.isActive     = false;
    this.audioContext = null;
    this.analyser     = null;
    this.gl           = null;
    this.program      = null;
    this.sensitivity  = { bass:1, mid:1, treble:1, volume:1 };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
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
      border:'0.1px solid var(--4)', minWidth:'320px', maxWidth:'400px'
    });
    const header = this.EL('div', {}, {}, `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h3 style="margin:0;color:var(--7)">
          ${this.SVG()} Controls
        </h3>
        <button id="close-modal" style="background:none;border:none;color:var(--7);font-size:30px;cursor:pointer;">
          ×
        </button>
      </div>
    `);
    wrap.appendChild(header);
    wrap.appendChild(this.EL('div', {}, {}, `
      <div style="margin-bottom:20px;padding:16px;background:var(--d);border-radius:2px">
        <button id="audio-toggle" style="
          width:100%;padding:12px;background:var(--3);border:none;color:var(--7);border-radius:2px;
          cursor:pointer;transition:all .2s ease">
          Enable Audio Input
        </button>
        <div id="audio-status" style="
          margin-top:8px;font-size:12px;color:var(--7);text-align:center">
          Click to enable microphone access
        </div>
      </div>
    `));
    const sliders = ['bass','mid','treble','volume']
      .map(type => `
        <div">
          <label style="display:block;color:white">
            ${type[0].toUpperCase() + type.slice(1)} Sensitivity:
            <span id="${type}-value" style="color:${this.color(type)}">1.0</span>
          </label>
          <input id="${type}-slider" type="range"min="0.1" max="3" step="0.1" value="1.0"</div>
      `).join('');
    wrap.appendChild(this.EL('div', {}, {}, `
      <h4 style="margin:0 0 16px 0;color:white;font-size:16px">
        Sensitivity Controls
      </h4>
      ${sliders}
    `));
    wrap.appendChild(this.EL('div', {}, {}, `
      <div style="margin-top:20px;padding:16px;background:var(--d);border-radius:0px">
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
        <div style="display:flex;justify-content:space-between;color:var(--7)">
          ${['Bass','Mid','Treble','Volume']
            .map(lbl => `<span>${lbl}</span>`).join('')}
        </div>
      </div>
    `));
    this.modal.appendChild(wrap);
    document.body.appendChild(this.modal);
    this.bindEvents();
  }
  color(type) {
    return { bass:'#ff4444', mid:'#44ff44', treble:'#4444ff', volume:'#ffff44' }[type];
  }
  bindEvents() {
    this.modal.querySelector('#close-modal').onclick = ()=> this.hide();
    this.modal.onclick = e => { if (e.target === this.modal) this.hide(); };
    const btn = this.modal.querySelector('#audio-toggle');
    const status = this.modal.querySelector('#audio-status');
    btn.onclick = async () => {
      if (!this.audioContext) {
        try {
          await this.getMic();
          btn.textContent = 'Audio: ON';
          this.style(btn, { backgroundColor:'#0a5c2e' });
          status.textContent = 'Microphone active';
          status.style.color = 'var(--7)';
          this.isActive = true;
          this.button.style.backgroundColor = '#0a5c2e';
        } catch {
          btn.textContent = 'Access Denied';
          this.style(btn, { backgroundColor:'#8b0000' });
          status.textContent = 'Microphone access denied';
          status.style.color = '#f87171';
        }
      } else {
        this.isActive = !this.isActive;
        btn.textContent = this.isActive? 'Audio: ON' : 'Audio: OFF';
        this.style(btn, { backgroundColor: this.isActive? '#0a5c2e':'#444' });
        this.button.style.backgroundColor = this.isActive? '#0a5c2e':'var(--d)';
      }
    };
    ['bass','mid','treble','volume'].forEach(type => {
      const s = this.modal.querySelector(`#${type}-slider`);
      const v = this.modal.querySelector(`#${type}-value`);
      s.oninput = ()=> {
        this.sensitivity[type] = +s.value;
        v.textContent = s.value;
      };
    });
  }
  show() {
    this.modal.style.display = 'block';
    this.barAnimation();
  }
  hide() {
    this.modal.style.display = 'none';
  }
  barAnimation() {
    const loop = () => {
      if (this.modal.style.display === 'none') return;
      if (this.analyser && this.isActive) {
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        const sums = {
          bass: (data.slice(0,20).reduce((a,b)=>a+b)/20) * 0.25,  // Heavy bass dampening in visualization too
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
  async getMic() {
    this.audioContext = new (window.AudioContext||window.webkitAudioContext)();
    if (this.audioContext.state==='suspended') await this.audioContext.resume();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false }
    });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = .3;
    this.audioContext.createMediaStreamSource(stream).connect(this.analyser);
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