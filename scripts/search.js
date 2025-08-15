class ShaderSearch {
  constructor() {
    this.initialized = false;
    this.contexts = [
      {
        type: 'public',
        tabId: 'tabPublic',
        listId: 'publicShaderList',
        inputId: 'publicSearchInput',
        clearBtnId: 'publicClearBtn',
        placeholder: 'Search public shaders...',
      },
      {
        type: 'local',
        tabId: 'tabLocal',
        listId: 'localShaderList',
        inputId: 'localSearchInput',
        clearBtnId: 'localClearBtn',
        placeholder: 'Search local shaders...',
      }
    ];
    this.Inputs();
  }
  Inputs() {
    if (this.initialized) return;
    this.initialized = true;
    this.contexts.forEach(ctx => {
      const tabEl = document.getElementById(ctx.tabId);
      if (!tabEl) return;
      if (tabEl.querySelector('.search-container')) return;
      const header = tabEl.querySelector('h3');
      if (!header) return;
      const searchDiv = document.createElement('div');
      searchDiv.className = 'search-container';
      searchDiv.innerHTML = `
        <input type="text"
               id="${ctx.inputId}"
               placeholder="${ctx.placeholder}"
               class="search-input">
        <button id="${ctx.clearBtnId}" class="clear-btn" style="display:none;">×</button>
      `;
      header.insertAdjacentElement('afterend', searchDiv);
    });
    this.EventListeners();
    this.setupTabObserver();
  }
  EventListeners() {
    this.contexts.forEach(ctx => {
      const inputEl = document.getElementById(ctx.inputId);
      const clearBtn = document.getElementById(ctx.clearBtnId);
      if (inputEl) {
        inputEl.addEventListener('input', e => {
          const val = e.target.value;
          this.Search(val, ctx.type);
          this.Clear(val, clearBtn);
        });
      }
      if (clearBtn && inputEl) {
        clearBtn.addEventListener('click', () => {
          inputEl.value = '';
          this.Search('', ctx.type);
          this.Clear('', clearBtn);
          inputEl.focus();
        });
      }
    });
  }
  Clear(value, clearBtn) {
    if (!clearBtn) return;
    clearBtn.style.display = value && value.length > 0 ? 'inline-block' : 'none';
  }
  Search(query, type) {
    const searchTerm = query.toLowerCase().trim();
    const ctx = this.contexts.find(c => c.type === type);
    if (!ctx) return;
    const listContainer = document.getElementById(ctx.listId);
    if (!listContainer) return;
    const shaderItems = listContainer.querySelectorAll('div[style*="border"]');
    let visibleCount = 0;
    shaderItems.forEach(item => {
      const title = this.getTitle(item);
      const author = this.getAuthor(item);
      const matchesSearch =
        searchTerm === '' ||
        title.toLowerCase().includes(searchTerm) ||
        author.toLowerCase().includes(searchTerm);
      if (matchesSearch) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    this.NoResults(listContainer, visibleCount === 0 && searchTerm !== '', type);
  }
  getTitle(item) {
    const strongEl = item.querySelector('strong');
    return strongEl ? (strongEl.textContent || strongEl.innerText || '') : '';
  }
  getAuthor(item) {
    const spanEl = item.querySelector('span[style*="color"]');
    if (!spanEl) return '';
    const text = spanEl.textContent || spanEl.innerText || '';
    return text.replace(/^by\s+/i, '');
  }
  NoResults(container, show, type) {
    const existing = container.querySelector('.no-results-message');
    if (show && !existing) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results-message';
      noResultsDiv.innerHTML = `<p>No ${type} shaders found matching your search.</p>`;
      container.appendChild(noResultsDiv);
    } else if (!show && existing) {
      existing.remove();
    }
  }
  refresh() {
    this.contexts.forEach(ctx => {
      const inputEl = document.getElementById(ctx.inputId);
      if (inputEl && inputEl.value) {
        this.Search(inputEl.value, ctx.type);
      }
    });
  }
  clear() {
    this.contexts.forEach(ctx => {
      const inputEl = document.getElementById(ctx.inputId);
      const clearBtn = document.getElementById(ctx.clearBtnId);
      if (inputEl) {
        inputEl.value = '';
        this.Search('', ctx.type);
        this.Clear('', clearBtn);
      }
    });
  }
  setupTabObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.style.display === 'block' || target.style.display === '') {
            const ctx = this.contexts.find(c => c.tabId === target.id);
            if (ctx) {
              setTimeout(() => {
                this.refreshTabIfNeeded(ctx.type);
              }, 10);
            }
          }
        }
      });
    });
    this.contexts.forEach(ctx => {
      const tabEl = document.getElementById(ctx.tabId);
      if (tabEl) {
        observer.observe(tabEl, { attributes: true, attributeFilter: ['style'] });
      }
    });
  }
  refreshTabIfNeeded(tabType) {
    const ctx = this.contexts.find(c => c.type === tabType);
    if (!ctx) return;
    const inputEl = document.getElementById(ctx.inputId);
    const clearBtn = document.getElementById(ctx.clearBtnId);
    if (inputEl && inputEl.value) {
      this.Search(inputEl.value, ctx.type);
      this.Clear(inputEl.value, clearBtn);
    }
  }
}
function initialize() {
  if (!window.shaderSearch) {
    window.shaderSearch = new ShaderSearch();
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
function refreshSearch() {
  if (window.shaderSearch) {
    window.shaderSearch.refresh();
  }
}
function clearSearches() {
  if (window.shaderSearch) {
    window.shaderSearch.clear();
  }
}
function clearSearches() {
  if (window.shaderSearch) {
    window.shaderSearch.clear();
  }
}