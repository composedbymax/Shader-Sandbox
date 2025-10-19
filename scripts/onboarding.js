// To manually start the tutorial from anywhere:
// window.startTutorial();
(function() {
  'use strict';
  const STORAGE_KEY = 'tutorial_state';
  const MAX_AUTO_SHOWS = 10;
  function getTutorialState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { viewCount: 0, skipped: false };
    } catch (e) {
      return { viewCount: 0, skipped: false };
    }
  }
  function saveTutorialState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save tutorial state:', e);
    }
  }
  function shouldShowTutorial() {
    const state = getTutorialState();
    if (state.skipped && state.viewCount >= 2) {
      return false;
    }
    if (!state.skipped && state.viewCount >= MAX_AUTO_SHOWS) {
      return false;
    }
    return true;
  }
  function incrementViewCount() {
    const state = getTutorialState();
    state.viewCount++;
    saveTutorialState(state);
  }
  function markAsSkipped() {
    const state = getTutorialState();
    state.skipped = true;
    saveTutorialState(state);
  }
  window.startTutorial = function() {
    init();
  };
  window.resetTutorial = function() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Tutorial state reset');
  };
  const HTML = `
    <div class="tutorial-overlay"></div>
    <div class="tutorial-controls">
      <button class="tutorial-skip-btn">Skip Tutorial</button>
    </div>
    <div class="tutorial-navigation">
      <button class="tutorial-nav-btn tutorial-prev-btn">←</button>
      <div class="tutorial-step-indicator">
        <span class="tutorial-current-step">1</span> / <span class="tutorial-total-steps">4</span>
      </div>
      <button class="tutorial-nav-btn tutorial-next-btn">→</button>
    </div>
    <div class="tutorial-highlight"></div>
    <div class="tutorial-textbox">
      <div class="tutorial-textbox-content"></div>
    </div>
  `;
  const steps = [
    {
      selector: 'button.lbtn.ellips[onclick="openShaderWindow()"]',
      text: 'This is where you go to save animations or browse public ones.'
    },
    {
      selector: 'button#tabPublicBtn',
      text: 'Here you can view public animations.'
    },
    {
      selector: 'button.closebtn[onclick="closeShaderWindow()"]',
      text: 'Use this to close the shader window and return to the coding interface.'
    },
    {
      selector: 'button.audio-reactive-button[title="Audio Reactivity"]',
      text: 'This enables audio reactivity — animations that respond to sound.'
    },
    {
      selector: 'button#audio-toggle',
      text: 'Select your microphone here (internal audio compatible).'
    },
    {
      selector: 'button#file-upload-btn',
      text: 'Upload audio files to use in your animations.'
    },
    {
      selector: 'button#info-toggle',
      text: 'Get instructions on how to incorporate audio reactive uniforms.'
    },
    {
      selector: 'button#recBtn',
      text: 'Open recording settings to capture your animations.'
    },
    {
      selector: 'button.camera-btn',
      text: 'Turn the canvas into a webcam feed — customize with fragment/vertex shaders.'
    },
    {
      selector: 'button#mediaUploadBtn',
      text: 'Upload images or videos to be reflected onto the WebGL canvas.'
    },
    {
      selector: 'button#effectsTab',
      text: 'Add effects to your uploaded media.'
    },
    {
      selector: 'button#pm-toggle-btn',
      text: 'Open the sequencer to create timed animations.'
    },
    {
      selector: 'button#theme-manager-btn',
      text: 'Customize the app colors with the theme manager.'
    },
    {
      selector: 'button#toggle-editor',
      text: 'Customize any color individually with the color editor.'
    },
    {
      selector: 'button#fsBtn',
      text: 'Open/close code editors, or double-click to launch app in fullscreen.'
    },
    {
      selector: 'button.glsl-performance-monitor-toggle',
      text: 'Monitor FPS, draw calls, and memory for performant animations.'
    },
    {
      selector: 'button#jsToggleBtn',
      text: 'Turn the canvas into a 2D canvas powered by JavaScript animations.'
    },
    {
      selector: 'button#webgpuToggle',
      text: 'Switch to WebGPU canvas with WGSL coding.'
    },
    {
      selector: 'button#threeLoadBtn',
      text: 'Load 3D models (.glb, .obj, .stl).'
    },
    {
      selector: 'button#uploadHTMLBtn',
      text: 'Upload whole HTML files to be separated.'
    },
    {
      selector: 'button.expbtn[title="Export Full HTML"]',
      text: 'Export your animations as HTML files.'
    }
  ];
  let currentStep = 0;
  let elements = {};
  function init() {
    const container = document.createElement('div');
    container.className = 'tutorial-container';
    container.innerHTML = HTML;
    document.body.appendChild(container);
    elements.container = container;
    elements.overlay = container.querySelector('.tutorial-overlay');
    elements.skipBtn = container.querySelector('.tutorial-skip-btn');
    elements.prevBtn = container.querySelector('.tutorial-prev-btn');
    elements.nextBtn = container.querySelector('.tutorial-next-btn');
    elements.highlight = container.querySelector('.tutorial-highlight');
    elements.textbox = container.querySelector('.tutorial-textbox');
    elements.textboxContent = container.querySelector('.tutorial-textbox-content');
    elements.currentStepEl = container.querySelector('.tutorial-current-step');
    elements.totalStepsEl = container.querySelector('.tutorial-total-steps');
    if (!elements.currentStepEl || !elements.totalStepsEl || !elements.textboxContent) {
      cleanup();
      return;
    }
    elements.totalStepsEl.textContent = steps.length;
    elements.skipBtn.addEventListener('click', () => {
      markAsSkipped();
      cleanup();
    });
    elements.prevBtn.addEventListener('click', () => navigateStep(-1));
    elements.nextBtn.addEventListener('click', () => navigateStep(1));
    elements.overlay.addEventListener('click', handleOverlayClick);
    requestAnimationFrame(() => {
      showStep(0);
    });
  }
  function navigateStep(direction) {
    const newStep = currentStep + direction;
    if (newStep >= 0 && newStep < steps.length) {
      showStep(newStep);
    } else if (newStep >= steps.length) {
      cleanup();
    }
  }
  function showStep(stepIndex) {
    currentStep = stepIndex;
    const step = steps[stepIndex];
    if (!elements.currentStepEl || !elements.prevBtn || !elements.nextBtn) {
      console.error('Tutorial elements not initialized');
      return;
    }
    elements.currentStepEl.textContent = stepIndex + 1;
    elements.prevBtn.disabled = stepIndex === 0;
    elements.nextBtn.textContent = stepIndex === steps.length - 1 ? '✓' : '→';
    const targetEl = document.querySelector(step.selector);
    if (!targetEl) {
      console.warn(`Tutorial step ${stepIndex}: target element not found - ${step.selector}`);
      return;
    }
    if (elements.currentTarget && elements.currentClickHandler) {
      elements.currentTarget.removeEventListener('click', elements.currentClickHandler);
    }
    elements.currentTarget = targetEl;
    elements.currentClickHandler = (e) => {
      setTimeout(() => {
        navigateStep(1);
      }, 100);
    };
    targetEl.addEventListener('click', elements.currentClickHandler, true);
    positionHighlight(targetEl);
    positionTextbox(targetEl, step.text);
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
  function handleOverlayClick(e) {
  }
  function positionHighlight(el) {
    const rect = el.getBoundingClientRect();
    const padding = 8;
    elements.highlight.style.top = `${rect.top - padding}px`;
    elements.highlight.style.left = `${rect.left - padding}px`;
    elements.highlight.style.width = `${rect.width + padding * 2}px`;
    elements.highlight.style.height = `${rect.height + padding * 2}px`;
  }
  function positionTextbox(el, text) {
    elements.textboxContent.textContent = text;
    const rect = el.getBoundingClientRect();
    const textboxRect = elements.textbox.getBoundingClientRect();
    const spacing = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    elements.textbox.className = 'tutorial-textbox';
    let top, left, position;
    if (rect.bottom + spacing + textboxRect.height < viewportHeight - 100) {
      top = rect.bottom + spacing;
      left = rect.left + rect.width / 2 - textboxRect.width / 2;
      position = 'pos-bottom';
    }
    else if (rect.top - spacing - textboxRect.height > 100) {
      top = rect.top - spacing - textboxRect.height;
      left = rect.left + rect.width / 2 - textboxRect.width / 2;
      position = 'pos-top';
    }
    else if (rect.right + spacing + textboxRect.width < viewportWidth) {
      top = rect.top + rect.height / 2 - textboxRect.height / 2;
      left = rect.right + spacing;
      position = 'pos-right';
    }
    else if (rect.left - spacing - textboxRect.width > 0) {
      top = rect.top + rect.height / 2 - textboxRect.height / 2;
      left = rect.left - spacing - textboxRect.width;
      position = 'pos-left';
    }
    else {
      top = viewportHeight / 2 - textboxRect.height / 2;
      left = viewportWidth / 2 - textboxRect.width / 2;
      position = 'pos-bottom';
    }
    left = Math.max(10, Math.min(left, viewportWidth - textboxRect.width - 10));
    top = Math.max(100, Math.min(top, viewportHeight - textboxRect.height - 100));
    elements.textbox.style.top = `${top}px`;
    elements.textbox.style.left = `${left}px`;
    elements.textbox.classList.add(position);
  }
  function cleanup() {
    if (elements.currentTarget && elements.currentClickHandler) {
      elements.currentTarget.removeEventListener('click', elements.currentClickHandler);
    }
    if (elements.container) {
      elements.container.remove();
    }
    if (elements.style) {
      elements.style.remove();
    }
    elements = {};
    window.dispatchEvent(new Event('tutorial:end'));
  }
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (elements.container && currentStep < steps.length) {
        showStep(currentStep);
      }
    }, 100);
  });
  if (shouldShowTutorial()) {
    incrementViewCount();
    init();
  }
})();