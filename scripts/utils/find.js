!function() {
  'use strict';
  let findModal, searchInput, resultsContainer, currentTextarea, searchTimeout;
  function init() {
    createFindButton();
    createModal();
    bindEvents();
  }
  function createFindButton() {
    const btn = document.createElement('button');
    btn.id = 'findBtn';
    btn.title = 'Search GLSL Snippets (Ctrl+F)';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="var(--6)"><path d="M10 2a8 8 0 105.293 14.293l5.707 5.707 1.414-1.414-5.707-5.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>`;
    btn.addEventListener('click', openFindModal);
    document.body.appendChild(btn);
  }
  function createModal() {
    findModal = document.createElement('div');
    findModal.id = 'findModal';
    const content = document.createElement('div');
    content.className = 'modal-content2';
    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = 'GLSL Library';
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', closeFindModal);
    header.append(title, closeBtn);
    searchInput = document.createElement('input');
    searchInput.id = 'glslSearchInput';
    searchInput.placeholder = 'Search for noise functions, shapes, utilities...';
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'resultsContainer';
    content.append(header, searchInput, resultsContainer);
    findModal.appendChild(content);
    document.body.appendChild(findModal);
    showInitialMessage();
  }
  function bindEvents() {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(searchInput.value.trim()), 300);
    });
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {e.preventDefault(); openFindModal();}
      if (e.key === 'Escape' && findModal.style.display === 'block') closeFindModal();
    });
    findModal.addEventListener('click', e => { if (e.target === findModal) closeFindModal(); });
    document.addEventListener('focusin', e => { 
      if (e.target.tagName === 'TEXTAREA' || e.target.getAttribute('contenteditable') === 'true') {
        currentTextarea = e.target;
      }
    });
    document.addEventListener('fullscreenchange', 
    () => (document.fullscreenElement || document.body).append(...['findBtn', 'findModal'].map(id => document.getElementById(id))));
  }
  function openFindModal() {
    findModal.style.display = 'block';
    searchInput.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeFindModal() {
    findModal.style.display = 'none';
    document.body.style.overflow = '';
    searchInput.value = '';
    showInitialMessage();
  }
  function showInitialMessage() {
    resultsContainer.innerHTML = `
      <div class="initial-message">
        <h3>Search for GLSL Code Snippets</h3>
        <p>Try searching for:</p>
        <ul><li>• noise</li><li>• sdf</li><li>• shapes</li><li>• lighting</li><li>• colors</li></ul>
      </div>
    `;
  }
  async function performSearch(query) {
    if (!query) return showInitialMessage();
    resultsContainer.innerHTML = `<div class="initial-message"><div class="spinner">⟳</div><p>Searching...</p></div>`;
    try {
      const res = await fetch(`api/find.php?q=${encodeURIComponent(query)}`);
      const { success, results, error } = await res.json();
      success ? displayResults(results) : showError(error || 'Search failed');
    } catch {
      showError('Network error occurred');
    }
  }
  function displayResults(results) {
    if (!results || !results.length) {
      return showError(null, 'No results found', 'Try a different search term');
    }
    resultsContainer.innerHTML = '';
    results.forEach(sn => {
      const item = document.createElement('div'); item.className = 'result-item';
      item.innerHTML = `
        <h4>${sn.name}</h4>
        <p>${sn.description}</p>
        <div class="tags">${sn.tags.map(t => `<span>${t}</span>`).join('')}</div>
        <pre><code>${sn.code.replace(/</g, '&lt;')}</code></pre>
        <button>Insert Code</button>
      `;
      item.querySelector('button').addEventListener('click', e => { e.stopPropagation(); insertCode(sn.code); });
      item.addEventListener('click', () => insertCode(sn.code));
      resultsContainer.appendChild(item);
    });
  }
  function showError(isNetwork, title = 'Error', msg) {
    resultsContainer.innerHTML = `
      <div class="initial-message" style="color: var(--r);">
        <h3>${title}</h3><p>${msg || 'Something went wrong'}</p>
      </div>
    `;
  }
  function insertCode(code) {
    if (!currentTextarea) {
      showToast('Please click in a textarea first', 'warning');
      return;
    }
    const target = currentTextarea;
    if (target.getAttribute('contenteditable') === 'true') {
      const textareaId = target.getAttribute('data-associated-textarea-id');
      if (textareaId) {
        const actualTextarea = document.getElementById(textareaId);
        if (actualTextarea) {
          const start = actualTextarea.selectionStart || actualTextarea.value.length;
          actualTextarea.value = actualTextarea.value.slice(0, start) + code + actualTextarea.value.slice(start);
          actualTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } else {
      const start = target.selectionStart, end = target.selectionEnd;
      target.value = target.value.slice(0, start) + code + target.value.slice(end);
      target.setSelectionRange(start + code.length, start + code.length);
    }
    target.focus();
    closeFindModal();
    showToast('Code inserted successfully!', 'success');
    if (typeof window.rebuildProgram === 'function') {
      window.rebuildProgram();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
}();