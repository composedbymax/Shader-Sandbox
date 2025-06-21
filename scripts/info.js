(() => {
  const container = document.getElementById('preview-panel');
  if (!container) {
    console.warn('No #preview-panel found');
    return;
  }
  const btn = document.createElement('button');
  btn.style.position = 'absolute';
  btn.style.left = '10px';
  btn.style.top = '50%';
  btn.style.transform = 'translateY(-50%)';
  btn.style.zIndex = '10';
  btn.style.background = 'var(--d)';
  btn.style.color = 'var(--6)';
  btn.onmouseenter = () => {btn.style.background = 'var(--5)';};
  btn.onmouseleave = () => {btn.style.background = 'var(--d)';};
  btn.style.border = 'none';
  btn.style.fontSize = '1em';
  btn.style.cursor = 'pointer';
  btn.style.width = '2rem';
  btn.style.height = '2rem';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
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
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'var(--0)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'flex-start';
    overlay.style.zIndex = '9999';
    overlay.style.color = 'var(--7)';
    overlay.style.fontSize = '1rem';
    overlay.style.padding = '20px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.overflowY = 'auto';
    overlay.style.overflowX = 'hidden';
    const modalContent = document.createElement('div');
    modalContent.style.marginTop = '2rem';
    modalContent.style.width = '100%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.minWidth = '0';
    modalContent.style.lineHeight = '1.5em';
    modalContent.style.boxSizing = 'border-box';
    modalContent.style.wordWrap = 'break-word';
    modalContent.style.overflowWrap = 'break-word';
    modalContent.innerHTML = `
      <h2 style="color: var(--6); margin-bottom: 1rem; word-wrap: break-word;">GLSL Editor – Guide</h2>
      <ul style="text-align: left; padding-left: 1.2em; list-style-type: disc; margin: 0; word-wrap: break-word;">
        <li style="margin-bottom: 0.5em;"><strong>Save/Browse:</strong> Save shaders locally or publicly (premium), and explore public ones</li>
        <li style="margin-bottom: 0.5em;"><strong>Editor:</strong> Write or edit <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.vert</code> and <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.frag</code> code with live updates</li>
        <li style="margin-bottom: 0.5em;"><strong>Import/Export:</strong> Drag, drop, or upload <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.vert</code>, <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.frag</code>, <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.vs</code>, <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.fs</code>, <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.txt</code>, or <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">.html</code> files</li>
        <li style="margin-bottom: 0.5em;"><strong>Audio Reactive:</strong> Use mic, system audio, or uploaded files for audio-reactive effects (documentation in modal window for usage instructions)</li>
        <li style="margin-bottom: 0.5em;"><strong>Record:</strong> Capture WebM/MP4 of canvas with included audio</li>
        <li style="margin-bottom: 0.5em;"><strong>Performance:</strong> Monitor FPS, memory, draw calls</li>
        <li style="margin-bottom: 0.5em;"><strong>Linting:</strong> Get instant syntax feedback</li>
        <li style="margin-bottom: 0.5em;"><strong>Layout:</strong> Resize or hide panels to customize your workspace</li>
        <li style="margin-bottom: 0.5em;"><strong>Color:</strong> Press on a color vector such as <code style="word-break: break-all; background: var(--3); padding: 2px 4px; border-radius: 3px;">vec3(0, 0.5, 1.0)</code> to initialize color picker modal</li>
        <li style="margin-bottom: 0.5em;"><strong>Format:</strong> Use Shift + M to open code formatting modal</li>
        <li style="margin-bottom: 0.5em;"><strong>Visualize Code:</strong> Use Shift + V to open flowchart modal</li>
        <li style="margin-bottom: 0.5em;"><strong>Support:</strong> Contact: <span style="word-break: break-all;">compositionsbymax@gmail.com</span></li>
      </ul>
    `;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close instructions');
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.width = '2rem';
    closeBtn.style.height = '2rem';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.border = 'none';
    closeBtn.style.backgroundColor = 'var(--3)';
    closeBtn.style.color = 'var(--r)';
    closeBtn.style.fontSize = '1.2rem';
    closeBtn.style.zIndex = '10000';
    closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.backgroundColor = 'var(--4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.backgroundColor = 'var(--3)';
    });
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