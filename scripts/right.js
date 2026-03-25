(() => {
  const LONG_PRESS_DELAY = 600;
  let pressTimer = null;
  let targetEl = null;
  let isEditable = false;
  let hasSelection = false;
  let selectedText = '';
  const monitoredElements = new Set();
  const isInput  = el => ['INPUT','TEXTAREA'].includes(el?.tagName);
  const isCE     = el => el?.isContentEditable;
  const getVal   = el => isInput(el) ? el.value : el.innerText.replace(/\r\n/g, '\n');
  const setVal   = (el, v) => {
    if (isInput(el)) el.value = v;
    else el.textContent = v;
  };
  const getCharOffset = (root) => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(root);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  };
  const setCaretAt = (root, offset) => {
    let charIndex = 0;
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent.length;
        if (charIndex + len >= offset) {
          const range = document.createRange();
          range.setStart(node, offset - charIndex);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        }
        charIndex += len;
      } else {
        for (const child of node.childNodes) if (walk(child)) return true;
      }
      return false;
    };
    walk(root);
  };
  const history = {
    stack: [], index: -1, maxSize: 50,
    push(state) {
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push(state);
      this.stack.length > this.maxSize ? this.stack.shift() : this.index++;
    },
    canUndo() { return this.index >= 0; },
    canRedo()  { return this.index < this.stack.length - 1; },
    undo()     { return this.canUndo() ? this.stack[this.index--] : null; },
    redo()     { return this.canRedo() ? this.stack[++this.index]  : null; }
  };
  const saveState = (el, operation = 'unknown') => {
    if (!el || (isInput(el) && el.type === 'file')) return;
    let value, selectionStart, selectionEnd;
    if (isInput(el)) {
      value = el.value;
      selectionStart = el.selectionStart;
      selectionEnd   = el.selectionEnd;
    } else if (isCE(el)) {
      value = el.innerHTML;
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        selectionStart = sel.getRangeAt(0).startOffset;
        selectionEnd   = sel.getRangeAt(0).endOffset;
      }
    } else return;
    history.push({ element: el, value, selectionStart, selectionEnd, operation, timestamp: Date.now() });
  };
  const restoreState = (state) => {
    if (!state?.element) return;
    const { element: el, value, selectionStart, selectionEnd } = state;
    if (isInput(el) && el.type === 'file') { el.focus(); return; }
    if (isInput(el)) {
      el.value = value;
      try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
    } else if (isCE(el)) {
      el.innerHTML = value;
      try {
        const textNode = el.firstChild;
        if (textNode) {
          const len = textNode.textContent.length;
          const range = document.createRange();
          range.setStart(textNode, Math.min(selectionStart, len));
          range.setEnd(textNode,   Math.min(selectionEnd,   len));
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch { el.focus(); }
    }
    el.focus();
    window.rebuildProgram?.();
    window.render?.();
  };
  const addInputMonitoring = (el) => {
    if ((isInput(el) && el.type === 'file') || monitoredElements.has(el)) return;
    monitoredElements.add(el);
    let inputTimer = null;
    let lastValue = getVal(el);
    saveState(el, 'initial');
    const handleInput = () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        const current = getVal(el);
        if (current !== lastValue) { saveState(el, 'manual-edit'); lastValue = current; }
      }, 2000);
    };
    el.addEventListener('input', handleInput);
    el.addEventListener('paste', () => setTimeout(handleInput, 10));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        clearTimeout(inputTimer);
        saveState(el, 'delete-operation');
        lastValue = getVal(el);
      }
    });
  };
  const monitorShaderAreas = () => {
    document.querySelectorAll('#vertCode, #fragCode, input:not([type=file]), textarea, [contenteditable]')
      .forEach(el => addInputMonitoring(el));
  };
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      const state = history.undo(); if (state) restoreState(state);
    } else if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
               ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
      e.preventDefault();
      const state = history.redo(); if (state) restoreState(state);
    }
  });
  const create = (tag, attrs = {}, html = '') => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (html) el.innerHTML = html;
    return el;
  };
  const menu = create('div', { class: 'custom-context-menu' });
  document.body.append(menu);
  const hide = el => el.style.display = 'none';
  const show = el => el.style.display = 'block';
  hide(menu);
  const addItem = (label, handler, disabled = false) => {
    const item = create('div', { class: `custom-context-menu-item${disabled ? ' disabled' : ''}` });
    item.textContent = label;
    if (!disabled) item.addEventListener('click', e => { e.stopPropagation(); hide(menu); handler(); });
    menu.append(item);
  };
  const addInlineControl = (html) => {
    const control = create('div', { class: 'inline-control' });
    control.innerHTML = html;
    menu.append(control);
    return control;
  };
  const addSep = () => menu.append(create('div', { class: 'custom-context-menu-separator' }));
  const getLineInfo = (el, position) => {
    if (!el) return null;
    let text, cursorPos;
    if (isInput(el)) {
      text = el.value;
      cursorPos = el.selectionStart;
    } else if (isCE(el)) {
      text = el.innerText.replace(/\r\n/g, '\n');
      cursorPos = getCharOffset(el);
    } else return null;
    if (position !== undefined) cursorPos = position;
    if (cursorPos === undefined) return null;
    const before = text.slice(0, cursorPos).split('\n');
    return { currentLine: before.length, totalLines: text.split('\n').length, column: before[before.length-1].length + 1, cursorPos };
  };
  const replaceAll = (findText, replaceText) => {
    if (!isEditable || !targetEl) return;
    saveState(targetEl, 'replace-all');
    if (isInput(targetEl)) {
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
      e.target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }));
    }, LONG_PRESS_DELAY);
  }, { passive: true });
  ['touchend','touchmove'].forEach(evt => document.addEventListener(evt, () => clearTimeout(pressTimer), { passive: true }));
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    targetEl      = e.target;
    isEditable    = isInput(targetEl) || isCE(targetEl);
    selectedText  = window.getSelection().toString();
    hasSelection  = !!selectedText;
    menu.innerHTML = '';
    if (isEditable) {
      let cursorPos, lineInfoEl = targetEl;
      if (isInput(targetEl)) {
        cursorPos = getClickPositionInTextArea(e, targetEl) ?? targetEl.selectionStart;
      } else if (isCE(targetEl)) {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          lineInfoEl = targetEl.closest('[contenteditable]') || targetEl;
          cursorPos  = getCharOffset(lineInfoEl);
        }
      }
      const info = getLineInfo(lineInfoEl, cursorPos);
      if (info) {
        const li = create('div', { class: 'line-info' });
        li.textContent = `Line ${info.currentLine} of ${info.totalLines} (Col: ${info.column})`;
        menu.append(li);
      }
    }
    if (hasSelection && /^-?\d+(\.\d+)?$/.test(selectedText)) {
      const sId = `slider-${Date.now()}`, lId = `lbl-${Date.now()}`;
      const control = addInlineControl(`
        <label id="${lId}" for="${sId}">Adjust Value:</label>
        <input type="range" id="${sId}" name="value-slider" class="slider-input" aria-labelledby="${lId}">
        <div class="slider-value"></div>
        <div class="inline-buttons">
          <button class="btn-cancel slider-cancel">Cancel</button>
          <button class="btn-confirm slider-confirm">Done</button>
        </div>
      `);
      const num     = parseFloat(selectedText);
      const slider  = control.querySelector('.slider-input');
      const display = control.querySelector('.slider-value');
      const range   = Math.abs(num) * 2 || 1;
      slider.min = num - range; slider.max = num + range;
      slider.step = (range * 2) / 100; slider.value = num;
      display.textContent = num.toFixed(3);
      let originalFull = getVal(targetEl);
      let start, end;
      if (isInput(targetEl)) {
        start = targetEl.selectionStart; end = targetEl.selectionEnd;
      } else {
        const info = getLineInfo(targetEl);
        start = info.cursorPos - selectedText.length; end = info.cursorPos;
      }
      let stateSaved = false;
      const update = () => {
        if (!stateSaved) { saveState(targetEl, 'number-adjust'); stateSaved = true; }
        const v = parseFloat(slider.value).toFixed(3);
        display.textContent = v;
        const newVal = originalFull.slice(0, start) + v + originalFull.slice(end);
        if (isInput(targetEl)) {
          targetEl.value = newVal;
          targetEl.setSelectionRange(start, start + v.length);
        } else {
          targetEl.textContent = newVal;
          setCaretAt(targetEl, start + v.length);
        }
        window.rebuildProgram?.(); window.render?.();
      };
      slider.addEventListener('input', update);
      control.querySelector('.slider-confirm').onclick = (evt) => {
        evt.stopPropagation(); slider.removeEventListener('input', update);
        hide(menu); targetEl.focus();
        window.rebuildProgram?.(); window.render?.();
      };
      control.querySelector('.slider-cancel').onclick = (evt) => {
        evt.stopPropagation(); slider.removeEventListener('input', update);
        hide(menu);
        setVal(targetEl, originalFull);
        if (isInput(targetEl)) targetEl.setSelectionRange(start, end);
        else setCaretAt(targetEl, end);
        targetEl.focus();
      };
      addSep();
    }
    if (hasSelection && isEditable) {
      const fId = `find-${Date.now()}`, rId = `rep-${Date.now()}`;
      const control = addInlineControl(`
        <label for="${fId}">Find Text:</label>
        <input type="text" id="${fId}" name="find-text" class="find-input" readonly value="${selectedText.replace(/"/g, '&quot;')}">
        <label for="${rId}">Replace All:</label>
        <input type="text" id="${rId}" name="replace-text" class="replace-input" placeholder="Replace with...">
        <div class="inline-buttons">
          <button class="btn-cancel replace-cancel">Cancel</button>
          <button class="btn-confirm replace-confirm">Replace</button>
        </div>
      `);
      addItem('Cut',  () => { saveState(targetEl, 'cut');  document.execCommand('cut'); });
      addItem('Copy', () => document.execCommand('copy'));
      const replaceInput = control.querySelector('.replace-input');
      replaceInput.focus();
      control.querySelector('.replace-confirm').onclick = (evt) => { evt.stopPropagation(); replaceAll(selectedText, replaceInput.value); hide(menu); };
      control.querySelector('.replace-cancel').onclick  = (evt) => { evt.stopPropagation(); hide(menu); };
      addSep();
    }
    if (isEditable) {
      addItem('Paste', async () => {
        saveState(targetEl, 'paste');
        let text = '';
        try { text = await navigator.clipboard.readText(); } catch {}
        if (isInput(targetEl)) {
          const { selectionStart: s, selectionEnd: e, value } = targetEl;
          targetEl.value = value.slice(0, s) + text + value.slice(e);
          const pos = s + text.length;
          targetEl.setSelectionRange(pos, pos);
        } else {
          if (!document.execCommand('insertText', false, text)) {
            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const r = sel.getRangeAt(0);
              r.deleteContents(); r.insertNode(document.createTextNode(text));
              r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
            }
          }
        }
        targetEl.focus(); window.rebuildProgram?.(); window.render?.();
      });
      addItem('Copy Text Field', () => {
        targetEl.focus();
        isInput(targetEl) ? targetEl.select() : document.execCommand('selectAll');
        document.execCommand('copy');
      });
      addItem('Delete All (Text Field)', () => {
        saveState(targetEl, 'delete-all');
        targetEl.focus(); setVal(targetEl, '');
        window.rebuildProgram?.(); window.render?.();
      });
    }
    addItem('Copy All', () => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      document.execCommand('copy'); sel.removeAllRanges();
    });
    addSep();
    addItem('Undo', () => { const s = history.undo(); if (s) restoreState(s); }, !history.canUndo());
    addItem('Redo', () => { const s = history.redo(); if (s) restoreState(s); }, !history.canRedo());
    addSep();
    addItem('Back',   () => history.back());
    addItem('Reload', () => location.reload());
    menu.style.visibility = 'hidden'; menu.style.display = 'block';
    const { width, height } = menu.getBoundingClientRect();
    menu.style.display = 'none'; menu.style.visibility = '';
    let x = e.clientX, y = e.clientY;
    if (x + width  > window.innerWidth)  x = window.innerWidth  - width  - 5;
    if (y + height > window.innerHeight) { y = e.clientY - height; if (y < 5) y = 5; }
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    show(menu);
  });
  function getClickPositionInTextArea(mouseEvent, textArea) {
    if (!isInput(textArea)) return null;
    try {
      if (textArea.tagName === 'TEXTAREA') {
        textArea.focus();
        if (document.caretPositionFromPoint) {
          const r = document.caretPositionFromPoint(mouseEvent.clientX, mouseEvent.clientY);
          if (r?.offsetNode === textArea.firstChild) return r.offset;
        }
        if (document.caretRangeFromPoint) {
          const r = document.caretRangeFromPoint(mouseEvent.clientX, mouseEvent.clientY);
          if (r?.startContainer === textArea.firstChild) return r.startOffset;
        }
      }
      return textArea.selectionStart;
    } catch { return textArea.selectionStart; }
  }
  document.addEventListener('click',  e => { if (!menu.contains(e.target)) hide(menu); });
  window.addEventListener('scroll',   () => hide(menu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(menu); });
  setTimeout(() => {
    monitorShaderAreas();
    document.querySelectorAll('#vertCode, #fragCode').forEach(el => {
      el.addEventListener('mousedown', e => e.button === 2 && el.focus());
      addInputMonitoring(el);
    });
  }, 1000);
  new MutationObserver(mutations => {
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('input, textarea, [contenteditable]')) addInputMonitoring(node);
        node.querySelectorAll?.('input, textarea, [contenteditable]').forEach(addInputMonitoring);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();