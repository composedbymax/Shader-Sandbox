(() => {
  const LONG_PRESS_DELAY = 600;
  let pressTimer = null;
  let targetEl = null;
  let isEditable = false;
  let hasSelection = false;
  let selectedText = '';
  const qs = (selector, ctx = document) => ctx.querySelector(selector);
  const qsa = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));
  const create = (tag, attrs = {}, html = '') => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (html) el.innerHTML = html;
    return el;
  };
  const styleCSS = `
    .custom-context-menu{background:var(--d);border:0.3px solid var(--l);border-radius:4px;user-select:none;position:absolute;z-index:99999;min-width:150px;display:none;}
    .custom-context-menu-item{padding:8px 12px;color:#fff;cursor:pointer;font-size:12px;}
    .custom-context-menu-item:hover{background:var(--D);}
    .custom-context-menu-separator{height:2px;background:#444;margin:5px 0;}
    .replace-dialog{background:var(--d);border:1px solid var(--l);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);width:300px;padding:20px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);display:none;z-index:100000;}
    .replace-dialog-content h3{color:#fff;margin:0 0 16px;font-size:16px;text-align:center;}
    .replace-inputs{margin-bottom:16px;}
    .input-group{margin-bottom:12px;}
    .input-group label{display:block;color:#fff;margin-bottom:4px;font-size:12px;}
    .input-group input{width:100%;padding:8px;border-radius:4px;border:1px solid #555;background:var(--D);color:#fff;}
    .replace-buttons{display:flex;justify-content:flex-end;gap:8px;}
    .replace-buttons button{padding:6px 12px;border-radius:4px;border:none;cursor:pointer;font-size:14px;}
    #cancelReplace{background:var(--D);color:#fff;}
    #confirmReplace{background:#2a6cb1;color:#fff;}
  `;
  const styleEl = create('style');
  styleEl.textContent = styleCSS;
  document.head.append(styleEl);
  const menu = create('div', { class: 'custom-context-menu' });
  const replaceDialog = create('div', { class: 'replace-dialog' }, `
    <div class="replace-dialog-content">
      <h3>Replace All</h3>
      <div class="replace-inputs">
        <div class="input-group"><label for="findText">Find:</label><input id="findText" readonly></div>
        <div class="input-group"><label for="replaceText">Replace with:</label><input id="replaceText" autofocus></div>
      </div>
      <div class="replace-buttons">
        <button id="cancelReplace">Cancel</button>
        <button id="confirmReplace">Replace All</button>
      </div>
    </div>
  `);
  document.body.append(menu, replaceDialog);
  const hide = (el) => (el.style.display = 'none');
  const show = (el) => (el.style.display = 'block');
  const clearPress = () => clearTimeout(pressTimer);
  const addItem = (label, handler) => {
    const item = create('div', { class: 'custom-context-menu-item' });
    item.textContent = label;
    item.addEventListener('click', (e) => { e.stopPropagation(); hide(menu); handler(); });
    menu.append(item);
  };
  const replaceAll = (findText, replaceText) => {
    if (!isEditable || !targetEl) return;
    if (['INPUT', 'TEXTAREA'].includes(targetEl.tagName)) {
      targetEl.value = targetEl.value.split(findText).join(replaceText);
    } else {
      const root = targetEl.closest('[contenteditable]');
      if (root) root.innerHTML = root.innerHTML.split(findText).join(replaceText);
    }
  };
  document.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => {
      const t = e.touches[0];
      const ctxEvt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY });
      e.target.dispatchEvent(ctxEvt);
    }, LONG_PRESS_DELAY);
  }, { passive: true });
  ['touchend', 'touchmove'].forEach(evt =>
    document.addEventListener(evt, clearPress, { passive: true })
  );
  document.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    targetEl = e.target;
    isEditable = ['INPUT', 'TEXTAREA'].includes(targetEl.tagName) || targetEl.isContentEditable;
    selectedText = window.getSelection().toString();
    hasSelection = !!selectedText;
    menu.innerHTML = '';
    if (hasSelection) {
      addItem('Copy', () => document.execCommand('copy'));
      if (isEditable) {
        addItem('Cut', () => document.execCommand('cut'));
        addItem('Replace All...', () => {
          qs('#findText').value = selectedText;
          qs('#replaceText').value = '';
          show(replaceDialog);
          qs('#replaceText').focus();
        });
      }
    }
    if (isEditable) {
      addItem('Paste', async () => {
        let text = '';
        try { text = await navigator.clipboard.readText(); } catch {};
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
          const { selectionStart: s, selectionEnd: ePos, value } = targetEl;
          targetEl.value = value.slice(0, s) + text + value.slice(ePos);
          const pos = s + text.length;
          targetEl.setSelectionRange(pos, pos);
          targetEl.focus();
        } else {
          if (!document.execCommand('insertText', false, text)) {
            const sel = window.getSelection();
            if (sel.rangeCount) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(text));
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
          targetEl.focus();
        }
      });
      addItem('Copy Text Field', () => {
        targetEl.focus();
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) targetEl.select();
        else document.execCommand('selectAll');
        document.execCommand('copy');
      });
      addItem('Delete All (Text Field)', () => {
        targetEl.focus();
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) targetEl.value = '';
        else targetEl.textContent = '';
      });
    }
    addItem('Copy All', () => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
    });
    menu.append(create('div', { class: 'custom-context-menu-separator' }));
    addItem('Back', () => history.back());
    addItem('Reload', () => location.reload());
    const { width, height } = menu.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    if (x + width > window.innerWidth) x = window.innerWidth - width - 5;
    if (y + height > window.innerHeight) y = window.innerHeight - height - 5;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    show(menu);
  });
  document.addEventListener('click', (e) => {
    if (!replaceDialog.contains(e.target)) hide(menu);
  });
  window.addEventListener('scroll', () => hide(menu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide(menu);
      hide(replaceDialog);
    }
  });
  qs('#cancelReplace').addEventListener('click', () => hide(replaceDialog));
  qs('#confirmReplace').addEventListener('click', () => {
    replaceAll(qs('#findText').value, qs('#replaceText').value);
    hide(replaceDialog);
  });
  setTimeout(() => {
    qsa('#vertCode, #fragCode').forEach(el => el.addEventListener('mousedown', (e) => e.button === 2 && el.focus()));
  }, 500);
})();