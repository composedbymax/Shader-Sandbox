(function(){
  if (document.getElementById('pm-root')) return;
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'pm-toggle-btn';
  toggleBtn.title = 'Performance Manager';
  toggleBtn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M8 5v14l11-7z"/>
    </svg>
  `;
  document.body.appendChild(toggleBtn);
  const root = document.createElement('div');
  root.id = 'pm-root';
  root.style.display = 'none';
  root.innerHTML = `
    <div class="pm-header">
      <div id="pm-controls">
        <button class="pm-btn pm-small" id="pm-add-step">+ Step</button>
        <button class="pm-btn pm-small" id="pm-play">Play ▶</button>
        <button class="pm-btn pm-small" id="pm-pause" disabled>Pause ⏸</button>
        <button class="pm-btn pm-small" id="pm-stop" disabled>Stop ◼</button>
        <button class="pm-btn pm-small" id="pm-step-back">◀</button>
        <button class="pm-btn pm-small" id="pm-step-forward">▶</button>
        <label style="display:flex;align-items:center;gap:6px;margin-left:6px;">
          <input type="checkbox" id="pm-loop"> Loop
        </label>
      </div>
      <button class="pm-btn" id="pm-close">✕</button>
    </div>
    <div id="pm-body">
      <div id="pm-steps-area">
        <div class="pm-steps-row" id="pm-steps-row"></div>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  const $ = s => document.querySelector(s);
  const pm = {
    root,
    stepsRow: root.querySelector('#pm-steps-row'),
    addBtn: root.querySelector('#pm-add-step'),
    playBtn: root.querySelector('#pm-play'),
    pauseBtn: root.querySelector('#pm-pause'),
    stopBtn: root.querySelector('#pm-stop'),
    stepBack: root.querySelector('#pm-step-back'),
    stepFwd: root.querySelector('#pm-step-forward'),
    loopChk: root.querySelector('#pm-loop'),
    closeBtn: root.querySelector('#pm-close'),
    toggleBtn
  };
  const mainVertTA = document.getElementById('vertCode');
  const mainFragTA = document.getElementById('fragCode');
  if (!mainVertTA || !mainFragTA) {
    console.warn('Performance Manager: main shader textareas (#vertCode or #fragCode) not found. The manager will still load but playback will do nothing.');
  }
  let steps = [];
  let isPlaying = false;
  let isPaused = false;
  let currentIndex = 0;
  let timeoutId = null;
  let stepStartAt = 0;
  let scheduledEndAt = 0;
  let pausedRemaining = null;
  let loopEnabled = false;
  const uid = (() => {
    let n = 1;
    return () => 'pm-step-' + (n++);
  })();
  function makeStepDom(stepObj, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pm-step';
    wrapper.dataset.stepId = stepObj.id;
    wrapper.innerHTML = `
      <div class="pm-header">
        <div>
          <div class="pm-step-title">Step ${index + 1}</div>
        </div>
        <div class="pm-actions">
          <button class="pm-btn pm-small pm-copy">Copy</button>
          <button class="pm-btn pm-small pm-dup">Dup</button>
          <button class="pm-btn pm-small pm-remove">✕</button>
        </div>
      </div>
      <label for="pm-vert-${stepObj.id}">Vertex shader (step)</label>
      <textarea id="pm-vert-${stepObj.id}" name="pm-vert-${stepObj.id}" class="pm-vert" spellcheck="false"></textarea>
      <label for="pm-frag-${stepObj.id}">Fragment shader (step)</label>
      <textarea id="pm-frag-${stepObj.id}" name="pm-frag-${stepObj.id}" class="pm-frag" spellcheck="false"></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <label for="pm-delay-${stepObj.id}" style="font-size:12px;color:#aaa">Delay (s)</label>
          <input id="pm-delay-${stepObj.id}" name="pm-delay-${stepObj.id}" class="pm-delay" type="number" min="0" step="0.1" value="${stepObj.delay}">
        </div>
      </div>
    `;
    wrapper.querySelector('.pm-vert').value = stepObj.vert || '';
    wrapper.querySelector('.pm-frag').value = stepObj.frag || '';
    wrapper.addEventListener('click', (e) => {
    if (e.target.closest('textarea, input, label, .pm-actions, .pm-remove, .pm-copy, .pm-dup')) {
        return;
    }
    selectStepById(stepObj.id, { previewOnly: true });
    });
    wrapper.querySelector('.pm-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeStepById(stepObj.id);
    });
    wrapper.querySelector('.pm-copy').addEventListener('click', (e) => {
      e.stopPropagation();
      setMainEditors(wrapper.querySelector('.pm-vert').value, wrapper.querySelector('.pm-frag').value);
      showTempToast('Copied to main editors');
    });
    wrapper.querySelector('.pm-dup').addEventListener('click', (e) => {
      e.stopPropagation();
      const vert = wrapper.querySelector('.pm-vert').value;
      const frag = wrapper.querySelector('.pm-frag').value;
      const delay = parseFloat(wrapper.querySelector('.pm-delay').value) || 1;
      createStep({vert, frag, delay}, index + 1);
    });
    const onFieldChange = () => {
      const id = stepObj.id;
      const s = steps.find(x => x.id === id);
      if (!s) return;
      s.vert = wrapper.querySelector('.pm-vert').value;
      s.frag = wrapper.querySelector('.pm-frag').value;
      s.delay = parseFloat(wrapper.querySelector('.pm-delay').value) || 0;
    };
    wrapper.querySelector('.pm-vert').addEventListener('input', onFieldChange);
    wrapper.querySelector('.pm-frag').addEventListener('input', onFieldChange);
    wrapper.querySelector('.pm-delay').addEventListener('input', onFieldChange);
    return wrapper;
  }
  function createStep(data = {vert:'', frag:'', delay:1}, insertAt = null) {
    const newStep = { id: uid(), vert: data.vert || '', frag: data.frag || '', delay: typeof data.delay === 'number' ? data.delay : parseFloat(data.delay) || 1 };
    if (insertAt === null || insertAt >= steps.length) steps.push(newStep);
    else steps.splice(insertAt, 0, newStep);
    renderSteps();
    selectStepById(newStep.id, {previewOnly:true});
    return newStep;
  }
  function removeStepById(id) {
    const idx = steps.findIndex(s => s.id === id);
    if (idx === -1) return;
    steps.splice(idx, 1);
    if (isPlaying) {
      if (idx < currentIndex) currentIndex--;
      if (idx === currentIndex) {
        stopPlayback();
      }
    }
    renderSteps();
  }
  function renderSteps() {
    pm.stepsRow.innerHTML = '';
    if (steps.length === 0) {
      const ph = document.createElement('div');
      ph.style.color = '#777';
      ph.style.padding = '12px';
      ph.innerText = 'No steps yet. Click + Step to add.';
      pm.stepsRow.appendChild(ph);
      return;
    }
    steps.forEach((s, idx) => {
      const dom = makeStepDom(s, idx);
      if (idx !== 0) {
        const arrowWrap = document.createElement('div');
        arrowWrap.className = 'pm-arrow';
        arrowWrap.innerHTML = `
          <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#7fbfff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 18 H26"></path>
              <path d="M20 12 L28 18 L20 24"></path>
            </g>
          </svg>
        `;
        pm.stepsRow.appendChild(arrowWrap);
      }
      pm.stepsRow.appendChild(dom);
    });
    updateStepTitles();
    updateStepVisuals();
  }
  function updateStepTitles() {
    const boxes = pm.stepsRow.querySelectorAll('.pm-step');
    boxes.forEach((box, idx) => {
      const t = box.querySelector('.pm-step-title');
      if (t) t.textContent = `Step ${idx + 1}`;
    });
  }
  function findStepDomById(id){
    return pm.stepsRow.querySelector(`.pm-step[data-step-id="${id}"]`);
  }
  function selectStepById(id, {previewOnly=false}={}) {
    const idx = steps.findIndex(s=>s.id===id);
    if (idx === -1) return;
    currentIndex = idx;
    const s = steps[idx];
    setMainEditors(s.vert, s.frag);
    updateStepVisuals();
    if (!previewOnly) {
      startPlayback(idx);
    }
  }
  function setMainEditors(vert, frag) {
    if (mainVertTA) {
      mainVertTA.value = vert;
      mainVertTA.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if (mainFragTA) {
      mainFragTA.value = frag;
      mainFragTA.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if (typeof window.rebuildProgram === 'function') {
      try { window.rebuildProgram(); } catch(e){ console.warn('rebuildProgram error', e); }
    }
  }
  function updateStepVisuals() {
    const stepDoms = Array.from(pm.stepsRow.querySelectorAll('.pm-step'));
    stepDoms.forEach((dom, idx) => {
      dom.classList.remove('pm-active', 'pm-future');
      if (!isPlaying) {
        if (idx === currentIndex) dom.classList.add('pm-active');
      } else {
        if (idx < currentIndex) {
        } else if (idx === currentIndex) {
          dom.classList.add('pm-active');
        } else {
          dom.classList.add('pm-future');
        }
      }
    });
  }
  function startPlayback(fromIndex = 0) {
    if (steps.length === 0) {
      showTempToast('No steps to play');
      return;
    }
    if (fromIndex < 0) fromIndex = 0;
    if (fromIndex >= steps.length) fromIndex = steps.length - 1;
    isPlaying = true;
    isPaused = false;
    currentIndex = fromIndex;
    loopEnabled = pm.loopChk.checked;
    pm.playBtn.disabled = true;
    pm.pauseBtn.disabled = false;
    pm.stopBtn.disabled = false;
    runCurrentStep();
    updateStepVisuals();
  }
  function runCurrentStep() {
    clearPendingTimeout();
    const s = steps[currentIndex];
    if (!s) {
      stopPlayback();
      return;
    }
    setMainEditors(s.vert, s.frag);
    stepStartAt = Date.now();
    scheduledEndAt = stepStartAt + Math.max(0, (s.delay || 0) * 1000);
    pausedRemaining = null;
    if (s.delay <= 0) {
      timeoutId = setTimeout(() => { advanceStep(); }, 20);
    } else {
      timeoutId = setTimeout(() => { advanceStep(); }, Math.max(10, (s.delay || 0) * 1000));
    }
    updateStepVisuals();
  }
  function advanceStep() {
    clearPendingTimeout();
    currentIndex++;
    if (currentIndex >= steps.length) {
      if (loopEnabled) {
        currentIndex = 0;
        runCurrentStep();
      } else {
        stopPlayback();
      }
    } else {
      runCurrentStep();
    }
  }
  function pausePlayback() {
    if (!isPlaying || isPaused) return;
    isPaused = true;
    if (timeoutId) {
      pausedRemaining = Math.max(0, scheduledEndAt - Date.now());
      clearPendingTimeout();
    } else {
      pausedRemaining = null;
    }
    pm.pauseBtn.disabled = true;
    pm.playBtn.disabled = false;
    updateStepVisuals();
  }
  function resumePlayback() {
    if (!isPlaying || !isPaused) return;
    isPaused = false;
    pm.pauseBtn.disabled = false;
    pm.playBtn.disabled = true;
    if (pausedRemaining == null) {
      runCurrentStep();
      return;
    }
    stepStartAt = Date.now();
    scheduledEndAt = stepStartAt + pausedRemaining;
    timeoutId = setTimeout(() => {
      advanceStep();
    }, pausedRemaining);
    pausedRemaining = null;
    updateStepVisuals();
  }
  function stopPlayback() {
    clearPendingTimeout();
    isPlaying = false;
    isPaused = false;
    currentIndex = 0;
    pm.playBtn.disabled = false;
    pm.pauseBtn.disabled = true;
    pm.stopBtn.disabled = true;
    updateStepVisuals();
  }
  function clearPendingTimeout() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
  function stepForward() {
    if (steps.length === 0) return;
    if (isPlaying && !isPaused) {
      advanceStep();
      return;
    }
    currentIndex = Math.min(steps.length - 1, currentIndex + 1);
    const s = steps[currentIndex];
    if (s) {
      setMainEditors(s.vert, s.frag);
    }
    updateStepVisuals();
  }
  function stepBack() {
    if (steps.length === 0) return;
    if (isPlaying && !isPaused) {
      currentIndex = Math.max(0, currentIndex - 1);
      runCurrentStep();
      return;
    }
    currentIndex = Math.max(0, currentIndex - 1);
    const s = steps[currentIndex];
    if (s) setMainEditors(s.vert, s.frag);
    updateStepVisuals();
  }
  let toastTimer = null;
  function showTempToast(msg, t = 1200) {
    if (!document.getElementById('pm-toast')) {
      const el = document.createElement('div');
      el.id = 'pm-toast';
      el.style.position = 'fixed';
      el.style.right = '12px';
      el.style.bottom = '12px';
      el.style.zIndex = 100000;
      el.style.background = 'rgba(0,0,0,0.7)';
      el.style.color = '#fff';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '8px';
      el.style.fontSize = '13px';
      document.body.appendChild(el);
    }
    const el = document.getElementById('pm-toast');
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, t);
  }
  function showTempToastSmall(msg) { showTempToast(msg, 900); }
  function showTempToastPersistent(msg) {
    showTempToast(msg, 3000);
  }
  pm.addBtn.addEventListener('click', () => createStep({ vert: mainVertTA ? mainVertTA.value : '', frag: mainFragTA ? mainFragTA.value : '', delay: 1 }));
  pm.playBtn.addEventListener('click', () => {
    if (!isPlaying) startPlayback(currentIndex || 0);
    else if (isPaused) resumePlayback();
  });
  pm.pauseBtn.addEventListener('click', () => pausePlayback());
  pm.stopBtn.addEventListener('click', () => stopPlayback());
  pm.stepFwd.addEventListener('click', () => stepForward());
  pm.stepBack.addEventListener('click', () => stepBack());
  pm.loopChk.addEventListener('change', () => { loopEnabled = pm.loopChk.checked; });
  pm.closeBtn.addEventListener('click', () => { root.style.display = 'none'; });
  pm.toggleBtn.addEventListener('click', () => {
    if (root.style.display === 'none') {
      root.style.display = 'flex';
    } else {
      root.style.display = 'none';
    }
  });
  root.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!isPlaying) pm.playBtn.click();
      else if (isPaused) resumePlayback();
      else pm.pauseBtn.click();
    }
  });
  pm.toggleBtn.addEventListener('dblclick', () => {
    root.style.right = '12px';
    root.style.top = '52px';
    root.style.transform = 'none';
    root.style.width = '820px';
    root.style.height = '520px';
  });
  function savePreset(name='pm-last') {
    try {
      localStorage.setItem(name, JSON.stringify(steps));
      showTempToast('Saved preset');
    } catch(e) {
      console.warn('savePreset', e);
    }
  }
  function loadPreset(name='pm-last') {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        steps = parsed.map(s => ({ id: uid(), vert: s.vert||'', frag: s.frag||'', delay: parseFloat(s.delay)||0 }));
        renderSteps();
        showTempToast('Loaded preset');
      }
    } catch(e) {
      console.warn('loadPreset', e);
    }
  }
  function showHeaderMsg(msg, timeout = 1600) {
    const existing = root.querySelector('.pm-header .pm-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'pm-msg';
    el.style.color = '#9bdfff';
    el.style.fontSize = '13px';
    el.style.marginLeft = '8px';
    el.textContent = msg;
    root.querySelector('.pm-header').appendChild(el);
    setTimeout(()=> el.remove(), timeout);
  }
  function ensureDefaults() {
    if (steps.length === 0) {
      createStep({ vert: mainVertTA ? mainVertTA.value : 'attribute vec2 a_position;\\nvoid main(){ gl_Position = vec4(a_position,0.,1.); }', frag: mainFragTA ? mainFragTA.value : '// fragment step 1', delay: 3 });
      createStep({ vert: mainVertTA ? mainVertTA.value : 'attribute vec2 a_position;\\nvoid main(){ gl_Position = vec4(a_position,0.,1.); }', frag: mainFragTA ? mainFragTA.value : '// fragment step 2', delay: 3 });
    }
  }
  function showTempToastManager(msg) {
    showTempToastSmall(msg);
  }
  function showTempToastShort(msg) { showTempToast(msg, 900); }
  ensureDefaults();
  renderSteps();
  window.PerformanceManager = {
    createStep,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    steps,
    selectStepById,
    savePreset,
    loadPreset
  };
  window.addEventListener('beforeunload', () => {
    clearPendingTimeout();
  });
  root.style.display = 'none';
})();