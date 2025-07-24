(() => {
  const container = document.getElementById('preview-panel');
  if (!container) {
    return;
  }
  const css = `
    #preview-panel .instruction-btn{position: absolute;left: 10px;top: 50%;transform: translateY(-50%);z-index: 10;background: var(--d);color: var(--6);border: none;font-size: 1em;cursor: pointer;width: 2rem;height: 2rem;display: flex;align-items: center;justify-content: center;}
    #preview-panel .instruction-btn:hover{background: var(--5);}
    #preview-panel .instruction-overlay{position: absolute;top: 0;left: 0;right: 0;bottom: 0;background-color: var(--0);display: flex;flex-direction: column;align-items: center;justify-content: flex-start;z-index: 9999;color: var(--7);font-size: 1rem;padding: 20px;box-sizing: border-box;overflow-y: auto;overflow-x: hidden;}
    #preview-panel .instruction-modal{margin-top: 4rem;width: 100%;max-width: 800px;min-width: 0;line-height: 1.5em;box-sizing: border-box;word-wrap: break-word;overflow-wrap: break-word;}
    #preview-panel .instruction-modal h2{color: var(--6);margin-bottom: 1rem;word-wrap: break-word;}
    #preview-panel .instruction-modal ul{text-align: left;padding-left: 1.2em;list-style-type: disc;margin: 0;word-wrap: break-word;}
    #preview-panel .instruction-modal li{margin-bottom: 0.8em;}
    #preview-panel .instruction-modal code{word-break: break-all;background: var(--3);padding: 2px 4px;border-radius: 3px;}
    #preview-panel .instruction-close-btn{position: fixed;top: 10px;right: 10px;width: 2rem;height: 2rem;display: flex;align-items: center;justify-content: center;cursor: pointer;border: none;background-color: var(--3);color: var(--r);font-size: 1.2rem;z-index: 10000;}
    #preview-panel .instruction-close-btn:hover{background-color: var(--4);}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
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
        <li><strong>WebGPU Support:</strong> **Experimental** Use toggle to switch to WebGPU canvas </li>
        <li><strong>Import/Export:</strong> Drag + drop, or upload <code>.vert</code>, <code>.frag</code>, <code>.vs</code>, <code>.fs</code>, <code>.txt</code>, or <code>.html</code> files</li>
        <li><strong>Audio Reactive:</strong> Use mic, system audio, or uploaded files for audio-reactive effects via bass, mid, treble and overall volume uniforms</li>
        <li><strong>Record:</strong> Capture WebM/MP4 of canvas with included audio</li>
        <li><strong>Performance:</strong> Monitor FPS, memory, draw calls</li>
        <li><strong>Linting:</strong> Get instant console feedback for mistakes</li>
        <li><strong>Customize:</strong> Resize or hide panels and theme the UI</li>
        <li><strong>Color:</strong> Click a <code>vec3</code> color to open picker</li>
        <li><strong>Format:</strong> Open code formatter to minify or format your code</li>
        <li><strong>Visualize Code:</strong> Open flowchart window to visualize your code, and export and png, or detailed json/txt package</li>
        <li><strong>Insert GLSL Snippets:</strong>Press in text area and then open snippet library to add code segments</li>
        <li><strong>Support:</strong> Contact: <span>compositionsbymax@gmail.com</span></li>
      </ul>
    `;
    const shortcutsBtn = document.createElement('button');
    shortcutsBtn.className = 'shortcut-trigger-btn';
    shortcutsBtn.textContent = 'Shortcuts';
    shortcutsBtn.addEventListener('click', () => {
      window.KeyboardShortcuts.open();
    });
  modalContent.appendChild(shortcutsBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close instructions');
    closeBtn.className = 'instruction-close-btn';
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') container.removeChild(overlay);
    }, { once: true });
    closeBtn.addEventListener('click', () => {
      container.removeChild(overlay);
    });
    overlay.appendChild(modalContent);
    overlay.appendChild(closeBtn);
    container.appendChild(overlay);
  }
  btn.addEventListener('click', openModal);
  container.appendChild(btn);
})();