(() => {
  const LONG_PRESS_DELAY = 600;
  let pressTimer = null;
  let targetEl = null;
  let isEditable = false;
  let hasSelection = false;
  let selectedText = '';
  const monitoredElements = new Set();
  const history = {
    stack: [],
    index: -1,
    maxSize: 50,
    push(state) {
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push(state);
      if (this.stack.length > this.maxSize) {
        this.stack.shift();
      } else {
        this.index++;
      }
    },
    canUndo() {
      return this.index >= 0;
    },
    canRedo() {
      return this.index < this.stack.length - 1;
    },
    undo() {
      if (!this.canUndo()) return null;
      const state = this.stack[this.index];
      this.index--;
      return state;
    },
    redo() {
      if (!this.canRedo()) return null;
      this.index++;
      const state = this.stack[this.index];
      return state;
    }
  };
  const saveState = (element, operation = 'unknown') => {
    if (element.tagName === 'INPUT' && element.type === 'file') return;
    if (!element) return;
    let value, selectionStart, selectionEnd;
    if (['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      value = element.value;
      selectionStart = element.selectionStart;
      selectionEnd = element.selectionEnd;
    } else if (element.isContentEditable) {
      value = element.innerHTML;
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        selectionStart = range.startOffset;
        selectionEnd = range.endOffset;
      }
    } else {
      return;
    }
    history.push({
      element,
      value,
      selectionStart,
      selectionEnd,
      operation,
      timestamp: Date.now()
    });
  };
  const restoreState = (state) => {
    if (!state || !state.element) return;
    const { element, value, selectionStart, selectionEnd } = state;
    if (element.tagName === 'INPUT' && element.type === 'file') {
      element.focus();
      return;
    }
    if (['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      element.value = value;
      if (
        typeof element.setSelectionRange === 'function' &&
        Number.isInteger(selectionStart) &&
        Number.isInteger(selectionEnd)
      ) {
        try {
          element.setSelectionRange(selectionStart, selectionEnd);
        } catch (e) {
          console.warn('Restore Error', e);
        }
      }
    } else if (element.isContentEditable) {
      element.innerHTML = value;
      if (
        Number.isInteger(selectionStart) &&
        Number.isInteger(selectionEnd)
      ) {
        try {
          const range = document.createRange();
          const textNode = element.firstChild;
          if (textNode) {
            const start = Math.min(selectionStart, textNode.textContent.length);
            const end   = Math.min(selectionEnd,   textNode.textContent.length);
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (e) {
          element.focus();
        }
      }
    }
    element.focus();
    window.rebuildProgram?.();
    window.render?.();
  };
  const addInputMonitoring = (element) => {
    if (element.tagName === 'INPUT' && element.type === 'file') return;
    if (monitoredElements.has(element)) return;
    monitoredElements.add(element);
    let inputTimer = null;
    let lastValue = element.value || element.textContent || '';
    saveState(element, 'initial');
    const handleInput = () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        const currentValue = element.value || element.textContent || '';
        if (currentValue !== lastValue) {
          saveState(element, 'manual-edit');
          lastValue = currentValue;
        }
      }, 2000);
    };
    element.addEventListener('input', handleInput);
    element.addEventListener('paste', () => {
      setTimeout(() => handleInput(), 10);
    });
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (inputTimer) clearTimeout(inputTimer);
        saveState(element, 'delete-operation');
        lastValue = element.value || element.textContent || '';
      }
    });
  };
  const monitorShaderAreas = () => {
    const vertCode = document.querySelector('#vertCode');
    const fragCode = document.querySelector('#fragCode');
    if (vertCode) addInputMonitoring(vertCode);
    if (fragCode) addInputMonitoring(fragCode);
    document
  .querySelectorAll('input:not([type=file]), textarea, [contenteditable]')
  .forEach(el => addInputMonitoring(el));

  };
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      const state = history.undo();
      if (state) {
        restoreState(state);
      }
    } else if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || 
               ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
      e.preventDefault();
      const state = history.redo();
      if (state) {
        restoreState(state);
      }
    }
  });
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
    .custom-context-menu-item{padding:8px 12px;color:var(--7);cursor:pointer;font-size:12px;}
    .custom-context-menu-item:hover{background:var(--D);}
    .custom-context-menu-item.disabled{color:var(--3);cursor:not-allowed;}
    .custom-context-menu-item.disabled:hover{background:transparent;}
    .custom-context-menu-separator{height:2px;background:var(--4);margin:5px 0;}
    .line-info{padding:8px 12px;color:var(--6);font-size:12px;border-bottom:1px solid var(--4);text-align:center;}
    .inline-control{padding:8px 12px;background:var(--D);}
    .inline-control label{display:block;color:var(--7);margin-bottom:4px;font-size:11px;}
    .inline-control input{width:100%;padding:4px;border-radius:3px;border:1px solid var(--5);background:var(--d);color:var(--7);font-size:11px;}
    .inline-control input[type="range"]{margin:4px 0;}
    .inline-buttons{display:flex;gap:4px;margin-top:6px;}
    .inline-buttons button{padding:4px 8px;border-radius:3px;border:none;cursor:pointer;font-size:11px;flex:1;}
    .btn-cancel{background:var(--3);color:var(--7);}
    .btn-confirm{background:var(--a);color:var(--1);}
    .slider-value{color:var(--6);font-size:10px;text-align:center;margin-top:2px;}
  `;
  const styleEl = create('style');
  styleEl.textContent = styleCSS;
  document.head.append(styleEl);
  const menu = create('div', { class: 'custom-context-menu' });
  document.body.append(menu);
  const hide = el => el.style.display = 'none';
  const show = el => el.style.display = 'block';
  hide(menu);
  const clearPress = () => clearTimeout(pressTimer);
  const addItem = (label, handler, disabled = false) => {
    const item = create('div', { class: `custom-context-menu-item${disabled ? ' disabled' : ''}` });
    item.textContent = label;
    if (!disabled) {
      item.addEventListener('click', e => {
        e.stopPropagation();
        hide(menu);
        handler();
      });
    }
    menu.append(item);
  };
  const addInlineControl = (content) => {
    const control = create('div', { class: 'inline-control' });
    control.innerHTML = content;
    menu.append(control);
    return control;
  };
  const getLineInfo = (el, position) => {
    if (!el) return null;
    let text, cursorPos;
    if (['INPUT','TEXTAREA'].includes(el.tagName)) {
      text = el.value;
      cursorPos = el.selectionStart;
    } else if (el.isContentEditable) {
      text = el.textContent;
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0).cloneRange();
        range.selectNodeContents(el);
        range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
        cursorPos = range.toString().length;
      } else cursorPos = 0;
    } else return null;
    if (position !== undefined) cursorPos = position;
    if (cursorPos === undefined) return null;
    const before = text.slice(0, cursorPos).split('\n');
    const all = text.split('\n').length;
    return {
      currentLine: before.length,
      totalLines: all,
      column: before[before.length-1].length + 1,
      cursorPos
    };
  };
  const replaceAll = (findText, replaceText) => {
    if (!isEditable || !targetEl) return;
    saveState(targetEl, 'replace-all');
    if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
      targetEl.value = targetEl.value.split(findText).join(replaceText);
    } else {
      const root = targetEl.closest('[contenteditable]');
      if (root) root.innerHTML = root.innerHTML.split(findText).join(replaceText);
    }
    window.rebuildProgram?.();
    window.render?.();
  };
  document.addEventListener('touchstart', e => {
    pressTimer = setTimeout(() => {
      const t = e.touches[0];
      const ctxEvt = new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true,
        clientX: t.clientX, clientY: t.clientY
      });
      e.target.dispatchEvent(ctxEvt);
    }, LONG_PRESS_DELAY);
  }, { passive: true });
  ['touchend','touchmove'].forEach(evt =>
    document.addEventListener(evt, clearPress, { passive: true })
  );
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    targetEl = e.target;
    isEditable = ['INPUT','TEXTAREA'].includes(targetEl.tagName) || targetEl.isContentEditable;
    selectedText = window.getSelection().toString();
    hasSelection = !!selectedText;
    menu.innerHTML = '';
    if (isEditable) {
      let cursorPos;
      if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
        const clickPos = getClickPositionInTextArea(e, targetEl);
        cursorPos = clickPos != null ? clickPos : targetEl.selectionStart;
      }
      const info = getLineInfo(targetEl, cursorPos);
      if (info) {
        const li = create('div', { class: 'line-info' });
        li.textContent = `Line ${info.currentLine} of ${info.totalLines} (Col: ${info.column})`;
        menu.append(li);
      }
    }
    const numberRe = /^-?\d+(\.\d+)?$/;
    if (hasSelection && numberRe.test(selectedText)) {
      const sliderId = `slider-${Date.now()}`;
      const labelId = `slider-label-${Date.now()}`;
      const control = addInlineControl(`
        <label id="${labelId}" for="${sliderId}">Adjust Value:</label>
        <input type="range" id="${sliderId}" name="value-slider" class="slider-input" aria-labelledby="${labelId}">
        <div class="slider-value"></div>
        <div class="inline-buttons">
          <button class="btn-cancel slider-cancel">Cancel</button>
          <button class="btn-confirm slider-confirm">Done</button>
        </div>
      `);
      const num = parseFloat(selectedText);
      const slider = control.querySelector('.slider-input');
      const display = control.querySelector('.slider-value');
      const range = Math.abs(num) * 2 || 1;
      slider.min  = (num - range).toString();
      slider.max  = (num + range).toString();
      slider.step = ((range * 2) / 100).toString();
      slider.value = num;
      display.textContent = num.toFixed(3);
      let originalFull, start, end;
      if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
        originalFull = targetEl.value;
        start = targetEl.selectionStart;
        end   = targetEl.selectionEnd;
      } else {
        originalFull = targetEl.textContent;
        const info = getLineInfo(targetEl);
        start = info.cursorPos - selectedText.length;
        end   = info.cursorPos;
      }
      let stateSaved = false;
      const update = () => {
        if (!stateSaved) {
          saveState(targetEl, 'number-adjust');
          stateSaved = true;
        }
        const raw = slider.value;
        const v = parseFloat(raw).toFixed(3);
        display.textContent = v;
        const before = originalFull.slice(0, start);
        const after  = originalFull.slice(end);
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
          targetEl.value = before + v + after;
          targetEl.setSelectionRange(start, start + v.length);
        } else {
          targetEl.textContent = before + v + after;
          const range = document.createRange();
          const textNode = targetEl.firstChild;
          range.setStart(textNode, start + v.length);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        window.rebuildProgram?.();
        window.render?.();
      };
      slider.addEventListener('input', update);
      control.querySelector('.slider-confirm').onclick = (evt) => {
        evt.stopPropagation();
        slider.removeEventListener('input', update);
        hide(menu);
        targetEl.focus();
        window.rebuildProgram?.();
        window.render?.();
      };
      control.querySelector('.slider-cancel').onclick = (evt) => {
        evt.stopPropagation();
        slider.removeEventListener('input', update);
        hide(menu);
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) {
          targetEl.value = originalFull;
          targetEl.setSelectionRange(start, end);
        } else {
          targetEl.textContent = originalFull;
          const range = document.createRange();
          const textNode = targetEl.firstChild;
          range.setStart(textNode, end);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        targetEl.focus();
      };
      menu.append(create('div', { class: 'custom-context-menu-separator' }));
    }
    if (hasSelection) {
      if (isEditable) {
        const findInputId = `find-input-${Date.now()}`;
        const replaceInputId = `replace-input-${Date.now()}`;
        const findLabelId = `find-label-${Date.now()}`;
        const replaceLabelId = `replace-label-${Date.now()}`;
        const control = addInlineControl(`
          <label id="${findLabelId}" for="${findInputId}">Find Text:</label>
          <input type="text" id="${findInputId}" name="find-text" class="find-input" readonly value="${selectedText.replace(/"/g, '&quot;')}" aria-labelledby="${findLabelId}">
          <label id="${replaceLabelId}" for="${replaceInputId}">Replace All:</label>
          <input type="text" id="${replaceInputId}" name="replace-text" class="replace-input" placeholder="Replace with..." aria-labelledby="${replaceLabelId}">
          <div class="inline-buttons">
            <button class="btn-cancel replace-cancel">Cancel</button>
            <button class="btn-confirm replace-confirm">Replace</button>
          </div>
        `);
        addItem('Cut', () => {
          saveState(targetEl, 'cut');
          document.execCommand('cut');
        });
        addItem('Copy', () => document.execCommand('copy'));
        const replaceInput = control.querySelector('.replace-input');
        replaceInput.focus();
        control.querySelector('.replace-confirm').onclick = (evt) => {
          evt.stopPropagation();
          replaceAll(selectedText, replaceInput.value);
          hide(menu);
        };
        control.querySelector('.replace-cancel').onclick = (evt) => {
          evt.stopPropagation();
          hide(menu);
        };
        menu.append(create('div', { class: 'custom-context-menu-separator' }));
      }
    }
    if (isEditable) {
      addItem('Paste', async () => {
        saveState(targetEl, 'paste');
        let text = '';
        try { text = await navigator.clipboard.readText(); } catch {}
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
        window.rebuildProgram?.();
        window.render?.();
      });
      addItem('Copy Text Field', () => {
        targetEl.focus();
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) targetEl.select();
        else document.execCommand('selectAll');
        document.execCommand('copy');
      });
      addItem('Delete All (Text Field)', () => {
        saveState(targetEl, 'delete-all');
        targetEl.focus();
        if (['INPUT','TEXTAREA'].includes(targetEl.tagName)) targetEl.value = '';
        else targetEl.textContent = '';
        window.rebuildProgram?.();
        window.render?.();
      });
    }
    addItem('Copy All', () => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
    });
    menu.append(create('div', { class: 'custom-context-menu-separator' }));
    addItem('Undo', () => {
      const state = history.undo();
      if (state) restoreState(state);
    }, !history.canUndo());
    addItem('Redo', () => {
      const state = history.redo();
      if (state) restoreState(state);
    }, !history.canRedo());
    menu.append(create('div', { class: 'custom-context-menu-separator' }));
    addItem('Back', () => history.back());
    addItem('Reload', () => location.reload());
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    const { width, height } = menu.getBoundingClientRect();
    menu.style.display = 'none';
    menu.style.visibility = '';
    let x = e.clientX, y = e.clientY;
    if (x + width > window.innerWidth) x = window.innerWidth - width - 5;
    if (y + height > window.innerHeight) {
      y = e.clientY - height;
      if (y < 5) y = 5;
    }
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
    show(menu);
  });
  function getClickPositionInTextArea(mouseEvent, textArea) {
    if (!['INPUT','TEXTAREA'].includes(textArea.tagName)) return null;
    try {
      if (textArea.tagName === 'TEXTAREA') {
        textArea.focus();
        if (document.caretPositionFromPoint) {
          const r = document.caretPositionFromPoint(mouseEvent.clientX, mouseEvent.clientY);
          if (r && r.offsetNode === textArea.firstChild) return r.offset;
        }
        if (document.caretRangeFromPoint) {
          const r = document.caretRangeFromPoint(mouseEvent.clientX, mouseEvent.clientY);
          if (r && r.startContainer === textArea.firstChild) return r.startOffset;
        }
      }
      return textArea.selectionStart;
    } catch {
      return textArea.selectionStart;
    }
  }
  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) {
      hide(menu);
    }
  });
  window.addEventListener('scroll', () => hide(menu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hide(menu);
    }
  });
  setTimeout(() => {
    monitorShaderAreas();
    qsa('#vertCode, #fragCode').forEach(el => {
      el.addEventListener('mousedown', e => e.button === 2 && el.focus());
      addInputMonitoring(el);
    });
  }, 1000);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches && node.matches('input, textarea, [contenteditable]')) {
            addInputMonitoring(node);
          }
          node.querySelectorAll && node.querySelectorAll('input, textarea, [contenteditable]').forEach(el => {
            addInputMonitoring(el);
          });
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();