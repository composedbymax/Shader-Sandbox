(() => {
  const container = document.getElementById('preview-panel');
  if (!container) return;
  const btn = document.createElement('button');
  btn.className = 'instruction-btn';
  btn.title = 'Instructions';
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
         stroke="var(--6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="8" />
    </svg>
  `;
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  function openModal() {
    const overlay = document.createElement('div');
    overlay.className = 'instruction-overlay';
    const modalContent = document.createElement('div');
    modalContent.className = 'instruction-modal';
    modalContent.innerHTML = `
      <h2>GLSL Editor – Guide</h2>
      <ul>
        <li><strong>Save/Browse:</strong> Save shaders locally, by share link or publicly (premium), and explore public gallery</li>
        <li><strong>Editor:</strong> Write or edit <code>.vert</code> and <code>.frag</code> code with live updates</li>
        <li><strong>GLSL Version:</strong> Use <code>#ifdef GL_ES ... #endif</code> for GLSL 2.0, or <code>#version 300 es</code> for GLSL ES 3.00</li>
        <li><strong>WebGPU Support:</strong> <em>Experimental</em> — Use toggle to switch to WebGPU canvas</li>
        <li><strong>Import/Export:</strong> Drag & drop or upload <code>.vert</code>, <code>.frag</code>, <code>.vs</code>, <code>.fs</code>, <code>.txt</code>, or <code>.html</code> files</li>
        <li><strong>Audio Reactive:</strong> Use mic, system audio, or uploaded files for audio-reactive effects via bass, mid, treble and overall volume uniforms</li>
        <li><strong>Record:</strong> Capture WebM/MP4 of canvas with included audio</li>
        <li><strong>Performance:</strong> Monitor FPS, memory, draw calls</li>
        <li><strong>Linting:</strong> Get instant console feedback for mistakes</li>
        <li><strong>Customize:</strong> Resize or hide panels and theme the UI</li>
        <li><strong>Color:</strong> Click a <code>vec3</code> color to open picker</li>
        <li><strong>Format:</strong> Open code formatter to minify or format your code</li>
        <li><strong>Visualize Code:</strong> Open flowchart window to visualize your code and export as PNG or JSON/TXT package</li>
        <li><strong>Insert GLSL Snippets:</strong> Click in text area, then open snippet library to add code segments</li>
        <li><strong>Support:</strong> Contact: <span>compositionsbymax@gmail.com</span></li>
      </ul>
    `;
    const shortcutsBtn = document.createElement('button');
    shortcutsBtn.className = 'shortcut-trigger-btn';
    shortcutsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h.01M10 16h.01M14 16h.01M18 16h.01"/>
      </svg>
    `;
    shortcutsBtn.addEventListener('click', () => {
      if (window.KeyboardShortcuts?.open) {
        window.KeyboardShortcuts.open();
      } else {
        console.warn('KeyboardShortcuts not available');
      }
    });
    const tutorialBtn = document.createElement('button');
    tutorialBtn.className = 'tutorial-trigger-btn';
    tutorialBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;
    tutorialBtn.addEventListener('click', () => {
      if (window.startTutorial) {
        window.startTutorial();
      } else {
        console.warn('startTutorial not available');
      }
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close instructions');
    closeBtn.className = 'instruction-close-btn';
    closeBtn.addEventListener('click', () => container.removeChild(overlay));
    document.addEventListener(
      'keydown',
      e => e.key === 'Escape' && container.contains(overlay) && container.removeChild(overlay),
      { once: true }
    );
    modalContent.appendChild(shortcutsBtn);
    modalContent.appendChild(tutorialBtn);
    modalContent.appendChild(closeBtn);
    overlay.appendChild(modalContent);
    container.appendChild(overlay);
  }
  btn.addEventListener('click', openModal);
  container.appendChild(btn);
})();