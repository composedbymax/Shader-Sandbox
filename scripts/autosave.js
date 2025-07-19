(function() {
    const DB_NAME = 'ShaderEditorDB';
    const STORE_NAME = 'shaders';
    const KEY = 'autosave_data';
    let db = null;
    function initDB() {
        if ('indexedDB' in window) {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = function(e) {
                db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = function(e) {
                db = e.target.result;
                checkForSavedData();
            };
            request.onerror = function() {
                console.log('IndexedDB error. Using localStorage fallback');
                checkForSavedData();
            };
        } else {
            console.log('IndexedDB not supported. Using localStorage');
            checkForSavedData();
        }
    }
    async function saveData() {
        const vertCode = document.getElementById('vertCode').value;
        const fragCode = document.getElementById('fragCode').value;
        const data = { vertCode, fragCode, timestamp: Date.now() };
        try {
            if (db) {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(data, KEY);
            } else {
                localStorage.setItem(KEY, JSON.stringify(data));
            }
            console.log('save');
        } catch (error) {
            console.error('Save failed:', error);
        }
    }
    async function checkForSavedData() {
        try {
            if (db) {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(KEY);
                
                request.onsuccess = function(e) {
                    const data = e.target.result;
                    handleSavedData(data);
                };
                request.onerror = function(e) {
                    console.error('IndexedDB get error:', e);
                    const stored = localStorage.getItem(KEY);
                    const data = stored ? JSON.parse(stored) : null;
                    handleSavedData(data);
                };
            } else {
                const stored = localStorage.getItem(KEY);
                const data = stored ? JSON.parse(stored) : null;
                handleSavedData(data);
            }
        } catch (error) {
            console.error('Load check failed:', error);
        }
    }
    function handleSavedData(data) {
        if (!data) return;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - data.timestamp < SEVEN_DAYS) {
            showLoadPrompt(data);
        }
    }
    function showLoadPrompt(data) {
        const create = (tag, props = {}, styles = {}, children = []) => {
            const el = document.createElement(tag);
            Object.assign(el, props);
            Object.assign(el.style, styles);
            children.forEach(child => el.appendChild(child));
            return el;
        };
        const overlay = create('div', {}, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'var(--0)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, backdropFilter: 'blur(4px)'
        });
        const title = create('h3', { textContent: 'Load Autosaved Data?' }, {
            marginBottom: '16px', color: 'var(--7)', fontSize: '18px', fontWeight: 600
        });
        const timeAgo = getTimeAgo(data.timestamp);
        const message = create('p', {
            textContent: `We found autosaved shader code from ${timeAgo}. Would you like to load it?`
        }, { marginBottom: '24px', color: 'var(--6)', lineHeight: 1.5 });
        const btnStyle = {
            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
            fontSize: '14px', transition: 'all 0.2s ease'
        };
        const noBtn = create('button', { textContent: 'No, Start Fresh' }, {
            ...btnStyle, border: '1px solid var(--4)', backgroundColor: 'var(--3)', color: 'var(--6)'
        });
        const yesBtn = create('button', { textContent: 'Yes, Load Data' }, {
            ...btnStyle, fontWeight: 500, border: '1px solid var(--a)', backgroundColor: 'var(--a)', color: 'var(--l)'
        });
        const buttonContainer = create('div', {}, {
            display: 'flex', gap: '12px', justifyContent: 'flex-end'
        }, [noBtn, yesBtn]);
        const dialog = create('div', {}, {
            backgroundColor: 'var(--2)', border: '1px solid var(--4)',
            borderRadius: '8px', padding: '24px', maxWidth: '400px', width: '90%'
        }, [title, message, buttonContainer]);
        overlay.appendChild(dialog);
        const hover = (el, enterStyles, leaveStyles) => {
            el.addEventListener('mouseenter', () => Object.assign(el.style, enterStyles));
            el.addEventListener('mouseleave', () => Object.assign(el.style, leaveStyles));
        };
        hover(noBtn, { backgroundColor: 'var(--4)', color: 'var(--7)' }, { backgroundColor: 'var(--3)', color: 'var(--6)' });
        hover(yesBtn, { backgroundColor: 'var(--ah)' }, { backgroundColor: 'var(--a)' });
        noBtn.onclick = () => overlay.remove();
        yesBtn.onclick = () => { restoreEditors(data); overlay.remove(); };
        const handleEscape = e => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        if (!document.querySelector('#autosave-animations')) {
            const style = create('style', { id: 'autosave-animations' });
            style.textContent = `
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
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
    }
    function setupAutoSave() {
        setTimeout(saveData, 30000);
        setInterval(saveData, 30000);
        window.addEventListener('beforeunload', saveData);
    }
    window.addEventListener('DOMContentLoaded', function() {
        initDB();
        setupAutoSave();
    });
})();