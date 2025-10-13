(function() {
  const style = document.createElement('style');
  style.textContent = `
    .glsl-editor-wrapper{position: relative;box-sizing: border-box;}
    .glsl-editor{position: relative;width: 100%;height: 100%;box-sizing: border-box;font-family: inherit;font-size: inherit;line-height: inherit;border: inherit;outline: none;background: transparent;color: var(--6);overflow: auto;white-space: pre-wrap;word-wrap: break-word;caret-color: var(--caret, #ffffff);}
    .glsl-hidden-textarea{display: none !important;}
    .token-comment{color: #6A9955;}
    .token-keyword{color: #569CD6;}
    .token-number{color: #B5CEA8;}
    .token-function{color: #DCDCAA;}
  `;
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded', () => {
    ['vertCode','fragCode'].forEach(id => {
      const ta = document.getElementById(id);
      if (ta) replaceTextareaWithEditor(ta);
    });
  });
  function replaceTextareaWithEditor(textarea) {
    const computed = window.getComputedStyle(textarea);
    const wrapper = document.createElement('div');
    wrapper.className = 'glsl-editor-wrapper';
    const editor = document.createElement('div');
    editor.className = 'glsl-editor';
    editor.setAttribute('contenteditable','true');
    editor.setAttribute('spellcheck','false');
    editor.setAttribute('data-associated-textarea-id', textarea.id);
    textarea.classList.add('glsl-hidden-textarea');
    copyComputedStyle(textarea, wrapper, [
      'padding','margin',
      'width','height',
      'border','border-radius',
      'flex','flex-grow','flex-shrink','flex-basis',
      'min-width','min-height','max-width','max-height',
      'background-color','background','background-image',
      'box-shadow'
    ]);
    wrapper.style.background = computed.getPropertyValue('background');
    wrapper.style.backgroundColor = computed.getPropertyValue('background-color');
    editor.style.fontFamily = computed.getPropertyValue('font-family');
    editor.style.fontSize   = computed.getPropertyValue('font-size');
    editor.style.lineHeight = computed.getPropertyValue('line-height');
    editor.style.padding    = computed.getPropertyValue('padding');
    editor.style.border     = 'none';
    editor.style.margin     = '0';
    textarea.parentNode.replaceChild(wrapper, textarea);
    wrapper.appendChild(textarea);
    wrapper.appendChild(editor);
    const initialText = textarea.value || '';
    editor.innerHTML = syntaxHighlightGLSL(escapeHtml(initialText));
    editor.addEventListener('input', () => {
      const [selStart, selEnd] = getSelectionCharacterOffsets(editor);
      let raw = editor.innerText.replace(/\r\n/g, '\n');
      if (textarea.value.endsWith('\n') && !raw.endsWith('\n')) {
        raw += '\n';
      }
      textarea.value = raw;
      editor.innerHTML = syntaxHighlightGLSL(escapeHtml(raw));
      restoreSelectionFromOffsets(editor, selStart, selEnd);
    });
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'characterData' || m.type === 'childList' || m.type === 'attributes') {
          const newVal = textarea.value || '';
          if (editor.innerText !== newVal) {
            editor.innerHTML = syntaxHighlightGLSL(escapeHtml(newVal));
          }
        }
      });
    });
    observer.observe(textarea, { characterData: true, childList: true, subtree: true, attributes: true });
  }
  function copyComputedStyle(fromElem, toElem, properties) {
    const computed = window.getComputedStyle(fromElem);
    properties.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val) {
        toElem.style.setProperty(prop, val);
      }
    });
  }
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function syntaxHighlightGLSL(escapedCode) {
    const kws = [
      'precision','uniform','attribute','varying','layout','const',
      'in','out','inout','void','if','else','for','while','do','return',
      'break','continue','discard',
      'bool','int','float','vec2','vec3','vec4','mat2','mat3','mat4',
      'sampler2D','samplerCube'
    ];
    const kwPattern = '\\b(?:' + kws.join('|') + ')\\b';
    const re = new RegExp(
      '(\\/\\*[\\s\\S]*?\\*\\/)|' +
      '(\\/\\/.*)|' +
      '(' + kwPattern + ')|' +
      '(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)|' +
      '(\\b[A-Za-z_]\\w*)(?=\\s*\\()',
      'g'
    );
    return escapedCode.replace(re, (match, g1, g2, g3, g4, g5) => {
      if (g1) return `<span class="token-comment">${g1}</span>`;
      if (g2) return `<span class="token-comment">${g2}</span>`;
      if (g3) return `<span class="token-keyword">${g3}</span>`;
      if (g4) return `<span class="token-number">${g4}</span>`;
      if (g5) return `<span class="token-function">${g5}</span>`;
      return match;
    });
  }
  function getSelectionCharacterOffsets(root) {
    const sel = window.getSelection();
    let charIndex = 0;
    let start = -1, end = -1;
    function traverse(node) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\r\n/g, '\n');
        if (sel.anchorNode === node) {
          start = charIndex + sel.anchorOffset;
        }
        if (sel.focusNode === node) {
          end = charIndex + sel.focusOffset;
        }
        charIndex += text.length;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (end !== -1 && start !== -1) break;
        }
      }
    }
    traverse(root);
    if (start < 0) start = end = 0;
    return [Math.min(start, end), Math.max(start, end)];
  }
  function restoreSelectionFromOffsets(root, startOffset, endOffset) {
    let charIndex = 0;
    let startNode = null, startNodeOffset = 0;
    let endNode = null, endNodeOffset = 0;
    function traverse(node) {
      if (!node || endNode) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\r\n/g, '\n');
        const nextCharIndex = charIndex + text.length;
        if (startNode === null && startOffset <= nextCharIndex) {
          startNode = node;
          startNodeOffset = startOffset - charIndex;
        }
        if (endNode === null && endOffset <= nextCharIndex) {
          endNode = node;
          endNodeOffset = endOffset - charIndex;
        }
        charIndex = nextCharIndex;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (endNode) break;
        }
      }
    }
    traverse(root);
    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
})();