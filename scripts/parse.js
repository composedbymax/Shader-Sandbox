(function () {
  function createEl(tag, attrs = {}, parent = document.body) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el[k] = v);
    parent.appendChild(el);
    return el;
  }
  document.addEventListener('fullscreenchange', () => {
    const fsEl = document.fullscreenElement;
    if (fsEl && !fsEl.contains(uploadBtn)) {
      fsEl.appendChild(uploadBtn);
      fsEl.appendChild(fileInput);
      fsEl.appendChild(editToggle);
    } else if (!fsEl) {
      document.body.appendChild(uploadBtn);
      document.body.appendChild(fileInput);
      document.body.appendChild(editToggle);
    }
  });
  const uploadBtn = createEl('button', {
    id: 'uploadHTMLBtn',
    textContent: 'Upload',
    title: 'Upload HTML, JS, WGSL, or shader file'
  });
  const fileInput = createEl('input', {
    id: 'uploadHTMLInput',
    type: 'file',
    accept: '.html,.js,.frag,.vert,.vs,.fs,.wgsl,.txt'
  });
  const editToggle = createEl('button', {
    id: 'editFileToggle',
    textContent: 'Edit File',
    title: 'Enable direct file editing with File System Access API'
  });
  editToggle.style.display = 'none';
  let fileHandle = null;
  let editMode = false;
  const vertEditor = document.getElementById('vertCode');
  const fragEditor = document.getElementById('fragCode');
  const vertNameEl = document.getElementById('vertFileName');
  const fragNameEl = document.getElementById('fragFileName');
  const fsAccessSupported = 'showOpenFilePicker' in window;
  let hoverTimeout;
  const showToggle = () => {
    if (fsAccessSupported) {
      clearTimeout(hoverTimeout);
      editToggle.style.display = 'block';
    }
  };
  const hideToggle = () => {
    hoverTimeout = setTimeout(() => {
      if (!editMode) {
        editToggle.style.display = 'none';
      }
    }, 300);
  };
  uploadBtn.addEventListener('mouseenter', showToggle);
  uploadBtn.addEventListener('mouseleave', hideToggle);
  uploadBtn.addEventListener('touchstart', showToggle, { passive: true });
  uploadBtn.addEventListener('touchend', () => setTimeout(hideToggle, 2000));
  editToggle.addEventListener('mouseenter', () => clearTimeout(hoverTimeout));
  editToggle.addEventListener('mouseleave', hideToggle);
  editToggle.addEventListener('click', async () => {
    if (!editMode) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Shader Files',
            accept: {
              'text/*': ['.html', '.js', '.frag', '.vert', '.vs', '.fs', '.wgsl', '.txt']
            }
          }],
          multiple: false
        });
        fileHandle = handle;
        const file = await handle.getFile();
        const text = await file.text();
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'wgsl') loadWGSL(text, file.name);
        else if (ext === 'frag' || ext === 'fs') loadFragment(text, file.name);
        else if (ext === 'vert' || ext === 'vs') loadVertex(text, file.name);
        else if (ext === 'html') loadHTML(text, file.name);
        else if (ext === 'js') loadJS(text, file.name);
        editMode = true;
        editToggle.textContent = 'Save File';
        editToggle.style.background = 'var(--5)';
        uploadBtn.textContent = 'Close';
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('File access error:', err);
        }
      }
    } else if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        const content = vertEditor.value + '\n\n' + fragEditor.value;
        await writable.write(content);
        await writable.close();
        console.log('File saved successfully');
      } catch (err) {
        console.error('File save error:', err);
      }
    }
  });
  uploadBtn.addEventListener('click', () => {
    if (editMode) {
      editMode = false;
      fileHandle = null;
      editToggle.textContent = 'Edit File';
      editToggle.style.background = '';
      uploadBtn.textContent = 'Upload';
      editToggle.style.display = 'none';
    } else {
      fileInput.value = '';
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'wgsl') {
        loadWGSL(text, file.name);
      } else if (ext === 'frag' || ext === 'fs') {
        loadFragment(text, file.name);
      } else if (ext === 'vert' || ext === 'vs') {
        loadVertex(text, file.name);
      } else if (ext === 'html') {
        loadHTML(text, file.name);
      } else if (ext === 'js') {
        loadJS(text, file.name);
      }
    };
    reader.readAsText(file);
  });
  function switchTo(type) {
    if (window.switchToAnimationType) {
      window.switchToAnimationType(type);
    }
  }
  function rebuild() {
    if (typeof rebuildProgram === 'function') rebuildProgram();
    if (typeof render === 'function') render();
  }
  function detectType(code) {
    if (code.includes('@vertex') || code.includes('@fragment') || 
        code.includes('vec4<f32>') || code.includes('var<uniform>')) {
      return 'webgpu';
    }
    if ((code.includes('ctx.') || code.includes('fillRect') || code.includes('beginPath')) &&
        !code.includes('gl_') && !code.includes('attribute') && !code.includes('varying')) {
      return 'js';
    }
    return 'webgl';
  }
  function unescape(code) {
    return code
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  function loadWGSL(code, name) {
    switchTo('webgpu');
    setTimeout(() => {
      if (code.includes('@vertex')) {
        vertEditor.value = code.trim();
        vertNameEl.textContent = `(${name})`;
      }
      if (code.includes('@fragment')) {
        fragEditor.value = code.trim();
        fragNameEl.textContent = `(${name})`;
      }
      console.log(`WGSL loaded: ${name}`);
      rebuild();
    }, 150);
  }
  function loadVertex(code, name) {
    const type = detectType(code);
    switchTo(type);
    setTimeout(() => {
      vertEditor.value = code.trim();
      vertNameEl.textContent = `(${name})`;
      console.log(`Vertex loaded: ${name} (${type})`);
      rebuild();
    }, 150);
  }
  function loadFragment(code, name) {
    const type = detectType(code);
    switchTo(type);
    setTimeout(() => {
      fragEditor.value = code.trim();
      fragNameEl.textContent = `(${name})`;
      console.log(`Fragment loaded: ${name} (${type})`);
      rebuild();
    }, 150);
  }
  function extractStringLiteral(text, varName) {
    const varPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*`, 'g');
    const match = varPattern.exec(text);
    if (!match) return null;
    let startIdx = match.index + match[0].length;
    const firstChar = text[startIdx];
    if (firstChar === '`') {
      let depth = 1, i = startIdx + 1, inTemplate = true;
      for (; i < text.length; i++) {
        const char = text[i], nextChar = text[i + 1];
        if (char === '\\' && nextChar === '`') { i++; continue; }
        if (char === '`' && depth === 1) return text.substring(startIdx + 1, i);
        if (char === '$' && nextChar === '{') { depth++; i++; continue; }
        if (char === '}' && depth > 1) depth--;
      }
      return null;
    }
    if (firstChar === '"' || firstChar === "'") {
      const endIdx = text.indexOf(firstChar, startIdx + 1);
      return endIdx !== -1 ? text.substring(startIdx + 1, endIdx) : null;
    }
    return null;
  }
  function loadHTML(html, name) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script');
    for (let script of scripts) {
      const content = script.textContent;
      const jsCode = extractStringLiteral(content, 'userAnimation');
      if (jsCode) {
        loadJSAnimation(jsCode, name);
        return;
      }
      if (content.includes('createShaderModule')) {
        const vsMatch = content.match(/vertex:\s*{\s*module:\s*device\.createShaderModule\(\s*{\s*code:\s*`([\s\S]*?)`\s*}\)/);
        const fsMatch = content.match(/fragment:\s*{\s*module:\s*device\.createShaderModule\(\s*{\s*code:\s*`([\s\S]*?)`\s*}\)/);
        if (vsMatch && fsMatch) {
          loadShaders(vsMatch[1], fsMatch[1], name, 'webgpu');
          return;
        }
      }
      if (content.includes('compileShader')) {
        const vsMatch = content.match(/const\s+vs\s*=\s*compileShader\(`([\s\S]*?)`\s*,\s*gl\.VERTEX_SHADER\)/);
        const fsMatch = content.match(/const\s+fs\s*=\s*compileShader\(`([\s\S]*?)`\s*,\s*gl\.FRAGMENT_SHADER\)/);
        if (vsMatch && fsMatch) {
          loadShaders(vsMatch[1], fsMatch[1], name, 'webgl');
          return;
        }
      }
      const vsCode = extractStringLiteral(content, 'vs') || 
                     extractStringLiteral(content, 'vertexShaderSource') ||
                     extractStringLiteral(content, 'vertexShader') ||
                     extractStringLiteral(content, 'vsSource');
      const fsCode = extractStringLiteral(content, 'fs') ||
                     extractStringLiteral(content, 'fragmentShaderSource') ||
                     extractStringLiteral(content, 'fragmentShader') ||
                     extractStringLiteral(content, 'fsSource');
      if (vsCode && fsCode) {
        const type = detectType(vsCode + fsCode);
        loadShaders(vsCode, fsCode, name, type);
        return;
      }
    }
    const vsTag = doc.querySelector('script[type="x-shader/x-vertex"]');
    const fsTag = doc.querySelector('script[type="x-shader/x-fragment"]');
    if (vsTag && fsTag) {
      loadShaders(vsTag.textContent, fsTag.textContent, name, 'webgl');
      return;
    }
    console.error(`No shaders found in ${name}`);
  }
  function loadJS(js, name) {
    const jsCode = extractStringLiteral(js, 'userAnimation');
    if (jsCode) {
      loadJSAnimation(jsCode, name);
      return;
    }
    if (js.includes('createShaderModule')) {
      const vsMatch = js.match(/createShaderModule\(\s*{\s*code:\s*`([\s\S]*?@vertex[\s\S]*?)`\s*}\)/);
      const fsMatch = js.match(/createShaderModule\(\s*{\s*code:\s*`([\s\S]*?@fragment[\s\S]*?)`\s*}\)/);
      if (vsMatch && fsMatch) {
        loadShaders(vsMatch[1], fsMatch[1], name, 'webgpu');
        return;
      }
    }
    const vsCode = extractStringLiteral(js, 'vs') || 
                   extractStringLiteral(js, 'vertexShaderSource') ||
                   extractStringLiteral(js, 'vertexShader') ||
                   extractStringLiteral(js, 'vsSource');
    const fsCode = extractStringLiteral(js, 'fs') ||
                   extractStringLiteral(js, 'fragmentShaderSource') ||
                   extractStringLiteral(js, 'fragmentShader') ||
                   extractStringLiteral(js, 'fsSource');
    if (vsCode && fsCode) {
      const type = detectType(vsCode + fsCode);
      loadShaders(vsCode, fsCode, name, type);
      return;
    }
    console.error(`No valid code found in ${name}`);
  }
  function loadShaders(vs, fs, name, type) {
    switchTo(type);
    setTimeout(() => {
      vertEditor.value = unescape(vs.trim());
      fragEditor.value = unescape(fs.trim());
      vertNameEl.textContent = fragNameEl.textContent = `(${name})`;
      console.log(`Shaders loaded: ${name} (${type})`);
      rebuild();
    }, 150);
  }
  function loadJSAnimation(code, name) {
    switchTo('js');
    setTimeout(() => {
      vertEditor.value = unescape(code.trim());
      vertNameEl.textContent = `(${name})`;
      console.log(`JS animation loaded: ${name}`);
    }, 150);
  }
})();