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
    ({ public: fetchPublicShaders, local: fetchLocalShaders }[tab]?.());
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
    if (!title || !img) return alert(!title ? "Give your shader a title!" : "Please upload a preview image for local save.");
    compressImage(img, (compressedDataUrl) => {
      localStorage.setItem(`shader_${title}`, JSON.stringify({
        title, vert: vertCode.value, frag: fragCode.value, preview: compressedDataUrl
      }));
      alert(`Saved "${title}" locally.`);
    });
  }
  function savePublic() {
    const title = shaderTitle.value.trim(), img = shaderImageInput.files[0];
    if (!title || !img) return alert(!title ? "Give your shader a title!" : "Please upload a preview image.");
    compressImage(img, (compressedDataUrl) => {
      fetch('../glsl/api/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          vert: JSON.stringify(vertCode.value),
          frag: JSON.stringify(fragCode.value),
          preview: compressedDataUrl,
          user: "<?php echo htmlspecialchars($_SESSION['user']); ?>"
        })      
      })
      .then(r => r.text())
      .then(msg => {
        alert(msg);
        userJustSavedPublic = true;
        showTab('public');
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
        console.log('Using cached shader list');
        displayPublicShaders(cached);
        return;
      }
    }
    console.log('Fetching fresh shader list');
    fetch('../glsl/api/fetch.php?action=list')
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
    div.style = 'border:1px solid var(--4);padding:4px;margin-bottom:8px;';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px;">
        <strong style="display:inline-block;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${shader.title}">${shader.title}</strong>
        <span style="font-size:0.85em;color:var(--5);">by ${shader.user}</span>
      </div>
      <img src="${shader.preview}" class="img"><br>
      <button class="ldbtn" data-public-token="${shader.token}">Load</button>
    `;
    return div;
  }
  function createLocalShaderCard(shader, key, index) {
    const div = document.createElement('div');
    div.style = 'border:1px solid var(--4);padding:4px;margin-bottom:8px;';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px;">
        <strong style="display:inline-block;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${shader.title}">${shader.title}</strong>
      </div>
      <img src="${shader.preview}" class="img"><br>
      <button class="ldbtn" data-local-index="${index}">Load</button>
      <button class="xbtn" onclick='deleteLocal("${key}")'>X</button>
    `;
    return div;
  }
  function loadPublicShader(token) {
    fetch(`../glsl/api/fetch.php?action=load&token=${token}`)
      .then(r => r.json())
      .then(shader => {
        if (shader.error) {
          alert(`Error loading shader: ${shader.error}`);
          return;
        }
        loadShaderData(shader);
      })
      .catch(err => {
        alert(`Error loading shader: ${err.message}`);
      });
  }
  function loadLocalShader(index) {
    const shader = window._localShaderList[index];
    if (shader) {
      loadShaderData(shader);
    }
  }
  function loadShaderData(shader) {
    shaderTitle.value = shader.title;
    vertCode.value = shader.vert;
    fragCode.value = shader.frag;
    window.rebuildProgram();
    window.render();
    closeShaderWindow();
  }
  function deleteLocal(key) {
    confirm(`Delete "${key.replace('shader_', '')}"?`) && (localStorage.removeItem(key), fetchLocalShaders());
  }
  async function clearPublicCache() {
    await shaderCache.clearCache();
    console.log('Public shader cache cleared');
  }
  chooseFileBtn.addEventListener('click', () => shaderImageInput.click());
  shaderImageInput.addEventListener('change', () => {
    fileNameDisplay.textContent = shaderImageInput.files[0]?.name || '';
  });
  ['dragover', 'dragleave', 'drop'].forEach(evt =>
    uploadZone.addEventListener(evt, e => {
      e.preventDefault();
      uploadZone.style.background = evt === 'dragover' ? 'var(--4)' : 'var(--3)';
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
      if (publicToken !== null) {
        loadPublicShader(publicToken);
      } else if (localIndex !== null) {
        loadLocalShader(parseInt(localIndex));
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
})();