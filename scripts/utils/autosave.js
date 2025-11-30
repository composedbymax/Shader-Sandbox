(function() {
    const DB_NAME = 'ShaderEditorDB';
    const STORE_NAME = 'shaders';
    const KEY = 'autosave_data';
    let db = null;
    let worker = null;
    function getCurrentAnimationType() {
        if (window.jsCanvasState && window.jsCanvasState.isJSMode()) {
            return 'js';
        } else if (window.webgpuState && window.webgpuState.isWebGPUMode()) {
            return 'webgpu';
        } else {
            return 'webgl';
        }
    }
    function switchToAnimationType(type) {
        const currentType = getCurrentAnimationType();
        if (currentType === type) {
            return;
        }
        switch (type) {
            case 'js':
                if (currentType !== 'js') {
                    const jsBtn = document.getElementById('jsToggleBtn');
                    if (jsBtn) jsBtn.click();
                }
                break;
            case 'webgpu':
                if (currentType !== 'webgpu') {
                    const webgpuBtn = document.getElementById('webgpuToggle');
                    if (webgpuBtn) webgpuBtn.click();
                }
                break;
            case 'webgl':
                if (currentType === 'js') {
                    const jsBtn = document.getElementById('jsToggleBtn');
                    if (jsBtn) jsBtn.click();
                } else if (currentType === 'webgpu') {
                    const webgpuBtn = document.getElementById('webgpuToggle');
                    if (webgpuBtn) webgpuBtn.click();
                }
                break;
        }
    }
    function createWorker() {
        const workerScript = `
let db = null;
const DB_NAME = 'ShaderEditorDB';
const STORE_NAME = 'shaders';
const KEY = 'autosave_data';

function initWorkerDB() {
    return new Promise((resolve, reject) => {
        if ('indexedDB' in self) {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = function(e) {
                db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = function(e) {
                db = e.target.result;
                resolve(db);
            };
            request.onerror = function() {
                reject('IndexedDB error in worker');
            };
        } else {
            reject('IndexedDB not supported in worker');
        }
    });
}
async function saveDataInWorker(data) {
    try {
        if (db) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const saveData = { ...data, timestamp: Date.now() };
            return new Promise((resolve, reject) => {
                const request = store.put(saveData, KEY);
                request.onsuccess = () => {
                    self.postMessage({ type: 'save_success', timestamp: saveData.timestamp });
                    resolve();
                };
                request.onerror = () => {
                    reject('IndexedDB save failed');
                };
            });
        } else {
            throw new Error('Database not initialized');
        }
    } catch (error) {
        self.postMessage({ type: 'save_error', error: error.message });
        throw error;
    }
}
async function loadDataInWorker() {
    try {
        if (db) {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            return new Promise((resolve, reject) => {
                const request = store.get(KEY);
                request.onsuccess = function(e) {
                    const data = e.target.result;
                    self.postMessage({ type: 'load_success', data });
                    resolve(data);
                };
                request.onerror = function() {
                    reject('IndexedDB load failed');
                };
            });
        } else {
            throw new Error('Database not initialized');
        }
    } catch (error) {
        self.postMessage({ type: 'load_error', error: error.message });
        throw error;
    }
}
self.onmessage = async function(e) {
    const { type, data } = e.data;
    try {
        switch (type) {
            case 'init':
                await initWorkerDB();
                self.postMessage({ type: 'init_success' });
                break;
            case 'save':
                await saveDataInWorker(data);
                break;
            case 'load':
                await loadDataInWorker();
                break;
            case 'autosave':
                await saveDataInWorker(data);
                break;
            default:
                self.postMessage({ type: 'error', error: 'Unknown message type' });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
};
        `;
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl);
        worker.addEventListener('message', function handleInit(e) {
            if (e.data.type === 'init_success' || e.data.type === 'error') {
                URL.revokeObjectURL(workerUrl);
                worker.removeEventListener('message', handleInit);
            }
        });
        return worker;
    }
    function initDB() {
        worker = createWorker();
        worker.onmessage = function(e) {
            const { type, data, error, timestamp } = e.data;
            switch (type) {
                case 'init_success':
                    checkForSavedData();
                    break;
                case 'load_success':
                    handleSavedData(data);
                    break;
                case 'save_success':
                    console.log('Autosave:', new Date(timestamp).toLocaleTimeString());
                    break;
                case 'save_error':
                case 'load_error':
                case 'error':
                    console.error('Worker error:', error);
                    fallbackToLocalStorage();
                    break;
            }
        };
        worker.onerror = function(error) {
            console.error('Worker error:', error);
            fallbackToLocalStorage();
        };
        worker.postMessage({ type: 'init' });
    }
    function fallbackToLocalStorage() {
        console.log('Falling back to localStorage');
        if (worker) {
            worker.terminate();
            worker = null;
        }
        checkForSavedDataLocalStorage();
    }
    async function saveData() {
        const vertCodeEl = document.getElementById('vertCode');
        const fragCodeEl = document.getElementById('fragCode');
        if (!vertCodeEl || !fragCodeEl) {
            console.warn('Editor elements not found for autosave');
            return;
        }
        const vertCode = vertCodeEl.value;
        const fragCode = fragCodeEl.value;
        const canvasType = getCurrentAnimationType();
        const data = { 
            vertCode, 
            fragCode, 
            canvasType
        };
        try {
            if (worker) {
                worker.postMessage({ type: 'save', data });
            } else {
                const saveData = { ...data, timestamp: Date.now() };
                localStorage.setItem(KEY, JSON.stringify(saveData));
                console.log('Saved to localStorage fallback');
            }
        } catch (error) {
            console.error('Save failed:', error);
            try {
                const saveData = { ...data, timestamp: Date.now() };
                localStorage.setItem(KEY, JSON.stringify(saveData));
                console.log('Saved to localStorage (last resort)');
            } catch (lsError) {
                console.error('All save methods failed:', lsError);
            }
        }
    }
    async function checkForSavedData() {
        if (worker) {
            worker.postMessage({ type: 'load' });
        } else {
            checkForSavedDataLocalStorage();
        }
    }
    function checkForSavedDataLocalStorage() {
        try {
            const stored = localStorage.getItem(KEY);
            const data = stored ? JSON.parse(stored) : null;
            handleSavedData(data);
        } catch (error) {
            console.error('LocalStorage load failed:', error);
        }
    }
    function getCurrentEditorContent() {
        const vertCodeEl = document.getElementById('vertCode');
        const fragCodeEl = document.getElementById('fragCode');
        if (!vertCodeEl || !fragCodeEl) {
            return { vertCode: '', fragCode: '' };
        }
        return {
            vertCode: vertCodeEl.value || '',
            fragCode: fragCodeEl.value || ''
        };
    }
    function isCodeDifferent(savedData, currentData) {
        const normalize = (str) => str.trim().replace(/\s+/g, ' ');
        const savedVert = normalize(savedData.vertCode || '');
        const savedFrag = normalize(savedData.fragCode || '');
        const currentVert = normalize(currentData.vertCode || '');
        const currentFrag = normalize(currentData.fragCode || '');
        return savedVert !== currentVert || savedFrag !== currentFrag;
    }
    function handleSavedData(data) {
        if (!data) return;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - data.timestamp < SEVEN_DAYS) {
            const currentContent = getCurrentEditorContent();
            if (isCodeDifferent(data, currentContent)) {
                showLoadPrompt(data);
            } else {
                console.log('No save found');
            }
        }
    }
    function showLoadPrompt(data) {
        const create = (tag, props = {}, className = '', children = []) => {
            const el = document.createElement(tag);
            Object.assign(el, props);
            if (className) el.className = className;
            children.forEach(child => el.appendChild(child));
            return el;
        };
        const overlay = create('div', {}, 'autosave-overlay');
        const title = create('h3', { 
            textContent: 'Load Autosaved Data?' 
        }, 'autosave-title');
        const timeAgo = getTimeAgo(data.timestamp);
        const canvasTypeText = data.canvasType ? ` (${data.canvasType.toUpperCase()} mode)` : '';
        const message = create('p', {
            textContent: `We found autosaved shader code from ${timeAgo}${canvasTypeText}. Would you like to load it?`
        }, 'autosave-message');
        const noBtn = create('button', { 
            textContent: 'No, Start Fresh' 
        }, 'autosave-btn autosave-btn-no');
        const yesBtn = create('button', { 
            textContent: 'Yes, Load Data' 
        }, 'autosave-btn autosave-btn-yes');
        const buttonContainer = create('div', {}, 'autosave-button-container', [noBtn, yesBtn]);
        const dialog = create('div', {}, 'autosave-dialog', [
            title,
            message,
            buttonContainer
        ]);
        overlay.appendChild(dialog);
        noBtn.onclick = () => {overlay.remove();};
        yesBtn.onclick = () => {estoreEditors(data);overlay.remove();};
        document.body.appendChild(overlay);
    }
    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }
    function restoreEditors(data) {
        if (!data) {
            console.log('No data to restore');
            return;
        }
        if (data.canvasType) {
            const currentType = getCurrentAnimationType();
            if (currentType !== data.canvasType) {
                switchToAnimationType(data.canvasType);
                setTimeout(() => restoreCode(data), 100);
                return;
            }
        }
        restoreCode(data);
    }
    function restoreCode(data) {
        const vertCodeEl = document.getElementById('vertCode');
        const fragCodeEl = document.getElementById('fragCode');
        if (!vertCodeEl || !fragCodeEl) {
            console.error('Editor elements not found');
            return;
        }
        vertCodeEl.value = data.vertCode || '';
        fragCodeEl.value = data.fragCode || '';
        vertCodeEl.dispatchEvent(new Event('input', { bubbles: true }));
        fragCodeEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Restored', data.canvasType || 'unknown','animation');
    }
    function setupAutoSave() {
        setTimeout(saveData, 30000);
        setInterval(saveData, 30000);
        window.addEventListener('beforeunload', () => {
            saveData();
            if (worker) {
                try {
                    const vertCode = document.getElementById('vertCode')?.value || '';
                    const fragCode = document.getElementById('fragCode')?.value || '';
                    const canvasType = getCurrentAnimationType();
                    const data = { vertCode, fragCode, canvasType, timestamp: Date.now() };
                    localStorage.setItem(KEY, JSON.stringify(data));
                } catch (error) {
                    console.error('Beforeunload save failed:', error);
                }
                worker.terminate();
            }
        });
    }
    window.addEventListener('DOMContentLoaded', function() {
        initDB();
        setupAutoSave();
    });
})();