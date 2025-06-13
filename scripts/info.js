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
    const modalContent = document.createElement('div');
    modalContent.style.marginTop = '2rem';
    modalContent.style.maxWidth = '600px';
    modalContent.style.lineHeight = '1.5em';
    modalContent.innerHTML = `
      <h2 style="color: var(--6); margin-bottom: 1rem;">GLSL Editor – Guide</h2>
      <ul style="text-align: left; padding-left: 1.2em; list-style-type: disc;">
        <li><strong>Save/Browse:</strong> Save shaders locally or publicly (premium), and explore public ones</li>
        <li><strong>Editor:</strong> Write or edit <code>.vert</code> and <code>.frag</code> code with live updates</li>
        <li><strong>Import/Export:</strong> Drag, drop, or upload <code>.vert</code>, <code>.frag</code>, <code>.vs</code>, <code>.fs</code>, <code>.txt</code>, or <code>.html</code> files</li>
        <li><strong>Audio Reactive:</strong> Use mic, system audio, or uploaded files for audio-reactive effects (documentation in modal window for usage instructions)</li>
        <li><strong>Record:</strong> Capture WebM/MP4 of canvas with included audio</li>
        <li><strong>Performance:</strong> Monitor FPS, memory, draw calls</li>
        <li><strong>Linting:</strong> Get instant syntax feedback</li>
        <li><strong>Layout:</strong> Resize or hide panels to customize your workspace</li>
        <li><strong>Support:</strong> Contact: compositionsbymax@gmail.com</li>
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