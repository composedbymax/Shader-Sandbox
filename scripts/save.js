(() => {
  const $ = id => document.getElementById(id),
    shaderWindow = $('shaderWindow'),
    shaderImageInput = $('shaderImage'),
    shaderTitle = $('shaderTitle'),
    vertCode = $('vertCode'),
    fragCode = $('fragCode'),
    fileNameDisplay = $('fileName'),
    uploadZone = $('uploadZone'),
    chooseFileBtn = $('chooseFileBtn'),
    capitalize = s => s[0].toUpperCase() + s.slice(1);
  window._localShaderList = [];
  let errorTracker = {
    count: 0,
    firstErrorTime: null,
    refreshTriggered: false,
    reset() {
      this.count = 0;
      this.firstErrorTime = null;
      this.refreshTriggered = false;
    },
    addError() {
      if (this.refreshTriggered) {
        return false;
      }
      const now = Date.now();
      if (!this.firstErrorTime) {
        this.firstErrorTime = now;
        this.count = 1;
        this.refreshTriggered = true;
        return true;
      }
      if (now - this.firstErrorTime <= 5000) {
        this.count++;
      } else {
        this.firstErrorTime = now;
        this.count = 1;
      }
      return false;
    }
  };
  function createToastContainer() {
    const fullscreenRoot = document.fullscreenElement || document.documentElement;
    let container = document.getElementById('toastContainer');
    if (container) {
      if (container.parentNode !== fullscreenRoot) {
        container.remove();
        fullscreenRoot.appendChild(container);
      }
      return;
    }
    container = document.createElement('div');
    container.id = 'toastContainer';
    fullscreenRoot.appendChild(container);
  }
  function showToast(message, type = 'info') {
    createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
    setTimeout(() => {
      toast.classList.add('hiding');
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }
  class ShaderCache {
    constructor() {
      this.dbName = 'ShaderCache';
      this.dbVersion = 1;
      this.storeName = 'publicShaders';
      this.db = null;
      this.fallbackKey = 'shader_public_cache';
      this.lastFetchKey = 'shader_last_fetch';
      this.initDB();
    }
    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        request.onerror = () => {
          console.warn('IndexedDB not available, using localStorage');
          resolve(null);
        };
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };
      });
    }
    async getCache() {
      if (this.db) {
        try {
          const transaction = this.db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get('shaderList');
          return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
          });
        } catch (e) {
          console.warn('IndexedDB error, using localStorage');
        }
      }
      try {
        const cached = localStorage.getItem(this.fallbackKey);
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    }
    async setCache(data) {
      if (this.db) {
        try {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          store.put(data, 'shaderList');
          localStorage.setItem(this.lastFetchKey, Date.now().toString());
          return;
        } catch (e) {
          console.warn('IndexedDB error, using localStorage');
        }
      }
      try {
        localStorage.setItem(this.fallbackKey, JSON.stringify(data));
        localStorage.setItem(this.lastFetchKey, Date.now().toString());
      } catch (e) {
        console.warn('Storage failed - data too large for localStorage');
      }
    }
    async clearCache() {
      if (this.db) {
        try {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          store.delete('shaderList');
        } catch (e) {
        }
      }
      try {
        localStorage.removeItem(this.fallbackKey);
        localStorage.removeItem(this.lastFetchKey);
      } catch (e) {
      }
    }
    shouldRefresh() {
      const lastFetch = localStorage.getItem(this.lastFetchKey);
      if (!lastFetch) return true;
      const oneHour = 60 * 60 * 1000;
      return (Date.now() - parseInt(lastFetch)) > oneHour;
    }
  }
  const shaderCache = new ShaderCache();
  let userJustSavedPublic = false;
  const openShaderWindow = () => (shaderWindow.style.display = 'block', showTab('save')),
        closeShaderWindow = () => (shaderWindow.style.display = 'none');
  function showTab(tab) {
    ['save', 'public', 'local'].forEach(t => {
      $(`tab${capitalize(t)}`).style.display = t === tab ? 'block' : 'none';
      $(`tab${capitalize(t)}Btn`).style.background = `var(--${t === tab ? 3 : 4})`;
    });
    if (tab === "public") {
      const sandbox = document.getElementById("useSandboxAPI");
      if (sandbox && sandbox.checked) {
      } else {
        fetchPublicShaders();
      }
    } else if (tab === "local") {
      fetchLocalShaders();
    }
  }
  function compressImage(file, callback) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.5));
      };
    };
    reader.readAsDataURL(file);
  }
  function saveLocally() {
    const title = shaderTitle.value.trim(), img = shaderImageInput.files[0];
    if (!title) return showToast("Please provide a title", 'warning');
    if (!img) return showToast("Please upload a preview image", 'warning');
    compressImage(img, (compressedDataUrl) => {
      localStorage.setItem(`shader_${title}`, JSON.stringify({
        title, 
        vert: vertCode.value, 
        frag: fragCode.value, 
        preview: compressedDataUrl,
        animationType: getCurrentAnimationType()
      }));
      showToast(`Saved "${title}" locally`, 'success');
    });
  }
  function savePublic() {
    const title = shaderTitle.value.trim(), img = shaderImageInput.files[0];
    if (!title) return showToast("Please provide a title", 'warning');
    if (!img) return showToast("Please upload a preview image", 'warning');
    compressImage(img, (compressedDataUrl) => {
      fetch('api/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          vert: JSON.stringify(vertCode.value),
          frag: JSON.stringify(fragCode.value),
          preview: compressedDataUrl,
          user: "<?php echo htmlspecialchars($_SESSION['user']); ?>",
          animationType: getCurrentAnimationType()
        })
      })
      .then(r => r.text())
      .then(msg => {
        showToast(msg, msg.toLowerCase().includes('error') ? 'error' : 'success');
        userJustSavedPublic = true;
        showTab('public');
      })
      .catch(err => {
        showToast(`Error saving shader: ${err.message}`, 'error');
      });
    });
  }
  async function fetchPublicShaders() {
    const container = $('publicShaderList');
    container.innerHTML = '<div>Loading shaders...</div>';
    const shouldFetchFresh = userJustSavedPublic || shaderCache.shouldRefresh();
    if (!shouldFetchFresh) {
      const cached = await shaderCache.getCache();
      if (cached && cached.length > 0) {
        console.log('Loaded');
        displayPublicShaders(cached);
        return;
      }
    }
    console.log('Fetch');
    fetch('api/fetch.php?action=list')
      .then(r => r.json())
      .then(async list => {
        if (list.error) {
          container.innerHTML = `<div>Error: ${list.error}</div>`;
          return;
        }
        await shaderCache.setCache(list);
        userJustSavedPublic = false;
        displayPublicShaders(list);
      })
      .catch(err => {
        container.innerHTML = `<div>Error loading shaders: ${err.message}</div>`;
      });
  }
  async function forceRefreshPublicShaders() {
    const container = $('publicShaderList');
    container.innerHTML = '<div>Refreshing shaders...</div>';
    console.log('DB FETCH');
    try {
      await shaderCache.clearCache();
      const response = await fetch('api/fetch.php?action=list');
      const list = await response.json();
      if (list.error) {
        container.innerHTML = `<div>Error: ${list.error}</div>`;
        return;
      }
      await shaderCache.setCache(list);
      displayPublicShaders(list);
      showToast('Shader list refreshed', 'info');
      errorTracker.reset();
    } catch (err) {
      container.innerHTML = `<div>Error loading shaders: ${err.message}</div>`;
      errorTracker.refreshTriggered = false;
    }
  }
  function displayPublicShaders(list) {
    const container = $('publicShaderList');
    container.innerHTML = '';
    list.forEach(shader => container.appendChild(createPublicShaderCard(shader)));
  }
  function fetchLocalShaders() {
    const container = $('localShaderList');
    container.innerHTML = '';
    window._localShaderList = [];
    Object.entries(localStorage)
      .filter(([k]) => k.startsWith('shader_') && !k.includes('cache') && !k.includes('fetch'))
      .forEach(([key, value]) => {
        try { 
          const shader = JSON.parse(value);
          const index = window._localShaderList.length;
          window._localShaderList.push(shader);
          container.appendChild(createLocalShaderCard(shader, key, index)); 
        } catch {}
      });
  }
  function createPublicShaderCard(shader) {
    const div = document.createElement('div');
    div.className = 'shader-card';
    div.innerHTML = `
      <div class="shader-card-header">
        <strong class="shader-title" title="${shader.title}">${shader.title}</strong>
        <span class="shader-author ellips">by ${shader.user}</span>
      </div>
      <img src="${shader.preview}" class="img"><br>
      <button class="ldbtn ellips" data-public-token="${shader.token}">Load</button>
    `;
    return div;
  }
  function createLocalShaderCard(shader, key, index) {
    const div = document.createElement('div');
    div.className = 'shader-card';
    div.innerHTML = `
      <div class="shader-card-header">
        <strong class="shader-title" title="${shader.title}">${shader.title}</strong>
      </div>
      <img src="${shader.preview}" class="img"><br>
      <button class="ldbtn" data-local-index="${index}">Load</button>
      <button class="xbtn" onclick='deleteLocal("${key}")'>X</button>
    `;
    return div;
  }
  function disableAllLoadButtons() {
    document.querySelectorAll('.ldbtn').forEach(btn => {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Loading...';
    });
  }
  function enableAllLoadButtons() {
    document.querySelectorAll('.ldbtn').forEach(btn => {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Load';
    });
  }
  async function loadPublicShader(token) {
    function handleShaderError(msg) {
      if (errorTracker.addError()) {
        console.log('DB ERROR');
        showToast('Error detected - reloading...', 'warning');
        setTimeout(() => forceRefreshPublicShaders(), 1000);
      }
      enableAllLoadButtons();
    }
    try {
      const res = await fetch(`api/fetch.php?action=load&token=${token}`);
      const shader = await res.json();
      if (shader.error) {
        handleShaderError(shader.error);
        return;
      }
      loadShaderData(shader);
      showToast(`Loaded "${shader.title}"`, 'success');
      errorTracker.reset();
    } catch (err) {
      handleShaderError(err.message);
    }
  }
  function loadShaderData(shader) {
    if (shader.animationType) {
      switchToAnimationType(shader.animationType);
      const delay = shader.animationType === 'webgl' ? 500 : 300;
      setTimeout(() => {
        shaderTitle.value = shader.title;
        vertCode.value = shader.vert;
        fragCode.value = shader.frag;
        if (window.rebuildProgram) {
          window.rebuildProgram();
        }
        if (window.render) {
          window.render();
        }
        closeShaderWindow();
        enableAllLoadButtons();
      }, delay);
    } else {
      shaderTitle.value = shader.title;
      vertCode.value = shader.vert;
      fragCode.value = shader.frag;
      if (window.rebuildProgram) {
        window.rebuildProgram();
      }
      if (window.render) {
        window.render();
      }
      closeShaderWindow();
      enableAllLoadButtons();
    }
  }
  function deleteLocal(key) {
    const shaderName = key.replace('shader_', '');
    if (confirm(`Delete "${shaderName}"?`)) {
      localStorage.removeItem(key);
      fetchLocalShaders();
      showToast(`Deleted "${shaderName}"`, 'info');
    }
  }
  async function clearPublicCache() {
    await shaderCache.clearCache();
    console.log('cache cleared');
    showToast('Reloaded', 'info');
  }
  chooseFileBtn.addEventListener('click', () => shaderImageInput.click());
  shaderImageInput.addEventListener('change', () => {
    fileNameDisplay.textContent = shaderImageInput.files[0]?.name || '';
  });
  ['dragover', 'dragleave', 'drop'].forEach(evt =>
    uploadZone.addEventListener(evt, e => {
      e.preventDefault();
      uploadZone.classList.toggle('dragover', evt === 'dragover');
      if (evt === 'drop' && e.dataTransfer.files.length) {
        shaderImageInput.files = e.dataTransfer.files;
        fileNameDisplay.textContent = e.dataTransfer.files[0].name;
      }
    })
  );
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('ldbtn')) {
      const publicToken = e.target.getAttribute('data-public-token');
      const localIndex = e.target.getAttribute('data-local-index');
      disableAllLoadButtons();
      if (publicToken !== null) {
        if (window.loadPublicShader && (/^\d+(\.\d+)?$/.test(publicToken))) {
          window.loadPublicShader(publicToken);
        } else {
          loadPublicShader(publicToken);
        }
      } else if (localIndex !== null) {
        loadLocalShader(parseInt(localIndex));
      }
      function loadLocalShader(index) {
        if (index >= 0 && index < window._localShaderList.length) {
          const shader = window._localShaderList[index];
          loadShaderData(shader);
          showToast(`Loaded "${shader.title}"`, 'success');
        } else {
          enableAllLoadButtons();
        }
      }
    }
  });
  window.openShaderWindow = openShaderWindow;
  window.closeShaderWindow = closeShaderWindow;
  window.deleteLocal = deleteLocal;
  window.showTab = showTab;
  window.saveLocally = saveLocally;
  window.savePublic = savePublic;
  window.clearPublicCache = clearPublicCache;
  window.forceRefreshPublicShaders = forceRefreshPublicShaders;
  window.showToast = showToast;
  window.createPublicShaderCard = createPublicShaderCard;
  window.enableAllLoadButtons = enableAllLoadButtons;
  window.disableAllLoadButtons = disableAllLoadButtons;
  window.loadShaderData = loadShaderData;
})();