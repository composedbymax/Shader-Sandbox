!function() {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #findBtn{position: absolute;top: 10px;right: 74px;z-index: 1;width: 2rem;height: 2rem;background: var(--d);color: var(--6);border: none;font-size: 16px;cursor: pointer;display: flex;align-items: center;justify-content: center;transition: background 0.3s ease;}
    #findBtn:hover{background: var(--5);}
    #findModal{display: none;position: fixed;inset: 0;background: rgba(0,0,0,0.7);backdrop-filter: blur(10px);z-index: 10000;overflow-y: auto;}
    #findModal .modal-content2{position: relative;margin: 2rem auto;width: 90vw;height: 90vh;background: var(--3);border-radius: 8px;padding: 20px;box-shadow: 0 10px 30px var(--0);display: flex;flex-direction: column;overflow-y: auto;box-sizing: border-box;}
    .modal-header{display: flex;justify-content: space-between;align-items: center;margin-bottom: 1rem;border-bottom: 1px solid var(--6);padding-bottom: 0.5rem;}
    .modal-header h2{margin: 0;color: var(--7);font-size: 1.5rem;}
    .modal-header button{width: 1.5rem;height: 1.5rem;display: flex;align-items: center;justify-content: center;background: none;border: none;color: var(--r);font-size: 1.5rem;cursor: pointer;transition: background 0.3s ease, color 0.3s ease;border-radius: 50%;}
    .modal-header button:hover{background: var(--r);color: var(--0);}
    #glslSearchInput{width: 100%;padding: 0.75rem;font-size: 1rem;border: 1px solid var(--4);border-radius: 4px;background: var(--3);color: white;margin-bottom: 1rem;transition: border-color 0.3s ease;}
    #glslSearchInput:focus{border-color: var(--a);outline: none;}
    #resultsContainer{flex: 1;overflow-y: auto;border: 1px solid var(--4);border-radius: 4px;background: var(--3);padding: 0.5rem;}
    .initial-message{text-align: center;color: var(--6);padding: 2rem;}
    .result-item{background: var(--3);border-left: 4px solid var(--a);border-radius: 4px;padding: 1rem;margin-bottom: 0.75rem;cursor: pointer;transition: background 0.3s ease;}
    .result-item:hover{background: var(--4);}
    .result-item h4{margin: 0 0 0.5rem;color: var(--a);font-size: 1.125rem;}
    .result-item p{margin: 0 0 0.5rem;color: #ccc;font-size: 0.875rem;}
    .result-item .tags{margin-bottom: 0.5rem;}
    .result-item .tags span{background: var(--5);color: var(--7);padding: 0.25rem 0.5rem;border-radius: 3px;font-size: 0.75rem;margin-right: 0.5rem;display: inline-block;}
    .result-item pre{background: var(--2);padding: 0.5rem;border-radius: 3px;font-family: monospace;font-size: 0.75rem;max-height: 150px;overflow: auto;margin: 0 0 0.5rem;}
    .result-item button{background: var(--a);color: white;border: none;padding: 0.5rem 1rem;border-radius: 3px;cursor: pointer;font-size: 0.875rem;transition: background 0.3s ease;}
    .result-item button:hover{background: var(--ah);}
    .glsl-toast{position: fixed;top: 1rem;right: 1rem;background: var(--a);color: white;padding: 0.75rem 1.25rem;border-radius: 4px;box-shadow: 0 2px 10px var(--0);animation: slideIn 0.3s ease;}
    @keyframes slideIn{from{transform: translateX(100%);opacity: 0;} to{transform: translateX(0);opacity: 1;}}
    @keyframes spin{from{transform: rotate(0deg);} to{transform: rotate(360deg);}}
  `;
  document.head.appendChild(style);
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
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); openFindModal(); }
      if (e.key === 'Escape' && findModal.style.display === 'block') closeFindModal();
    });
    findModal.addEventListener('click', e => { if (e.target === findModal) closeFindModal(); });
    document.addEventListener('focusin', e => { if (e.target.tagName === 'TEXTAREA') currentTextarea = e.target; });
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
        <ul style="list-style:none; padding:0; margin:1rem 0 0;">
          <li>• noise</li><li>• sdf</li><li>• shapes</li><li>• lighting</li><li>• colors</li>
        </ul>
      </div>
    `;
  }
  async function performSearch(query) {
    if (!query) return showInitialMessage();
    resultsContainer.innerHTML = `<div class="initial-message"><div style="animation: spin 1s linear infinite; display:inline-block;">⟳</div><p>Searching...</p></div>`;
    try {
      const res = await fetch(`/glsl/api/find.php?q=${encodeURIComponent(query)}`);
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
    const ta = currentTextarea;
    const start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + code + ta.value.slice(end);
    ta.setSelectionRange(start + code.length, start + code.length);
    ta.focus();
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