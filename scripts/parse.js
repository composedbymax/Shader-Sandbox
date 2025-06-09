(function () {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #uploadHTMLBtn{position: absolute;bottom: 10px;right: 8px;background: var(--d);color: var(--l);border: none;cursor: pointer;padding: 12px 10px;z-index:1;}
    #uploadHTMLBtn:hover{background: var(--5);}
    #uploadHTMLInput{display: none;}
  `;
  document.head.appendChild(styleEl);
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
    }
  });
  const uploadBtn = createEl('button', {
    id: 'uploadHTMLBtn',
    textContent: 'Load'
  });
  const fileInput = createEl('input', {
    id: 'uploadHTMLInput',
    type: 'file',
    accept: '.html,.js'
  });
  const vertEditor = document.getElementById('vertCode');
  const fragEditor = document.getElementById('fragCode');
  const vertNameEl = document.getElementById('vertFileName');
  const fragNameEl = document.getElementById('fragFileName');
  uploadBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      if (file.name.endsWith('.js')) {
        parseJSSource(text, file.name);
      } else {
        parseHTMLorJS(text, file.name);
      }
    };
    reader.readAsText(file);
  });
  function parseHTMLorJS(text, filename) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const vsTag = doc.querySelector('script[type="x-shader/x-vertex"]');
    const fsTag = doc.querySelector('script[type="x-shader/x-fragment"]');
    if (vsTag && fsTag) {
      return inject(vsTag.textContent, fsTag.textContent, filename);
    }
    for (let script of doc.querySelectorAll('script')) {
      const { vs, fs } = extractFromText(script.textContent);
      if (vs && fs) return inject(vs, fs, filename);
    }
    const { vs, fs } = extractFromText(text);
    if (vs && fs) {
      return inject(vs, fs, filename);
    }
    console.error(`No shaders found in ${filename}.`);
  }
  function parseJSSource(jsText, filename) {
    const { vs, fs } = extractFromText(jsText);
    if (vs && fs) {
      inject(vs, fs, filename);
    } else {
      console.error(`Invalid JS file ${filename}. Expected shader source constants or vars.`);
    }
  }
  function extractFromText(text) {
    const vertexNames = [
      'vertexShaderSource', 'vertexShader', 'vertex_shader', 'VERTEX_SHADER',
      'vs', 'vert', 'vertShader', 'vertex'
    ];
    const fragmentNames = [
      'fragmentShaderSource', 'fragmentShader', 'fragment_shader', 'FRAGMENT_SHADER',
      'fs', 'frag', 'fragShader', 'fragment'
    ];
    
    const shaderMatch = name =>
      text.match(new RegExp(`(?:const\\s+|let\\s+|var\\s+)?${name}\\s*=\\s*[\`"']([\\s\\S]*?)[\`"']`));
    
    let vm, fm;
    for (const name of vertexNames) {
      vm = shaderMatch(name);
      if (vm) break;
    }
    for (const name of fragmentNames) {
      fm = shaderMatch(name);
      if (fm) break;
    }
    
    return { vs: vm && vm[1], fs: fm && fm[1] };
  }
  function processShaderCode(code) {
    return code
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  function inject(vs, fs, filename) {
    vertEditor.value = processShaderCode(vs.trim());
    fragEditor.value = processShaderCode(fs.trim());
    vertNameEl.textContent = fragNameEl.textContent = `(${filename})`;
    if (typeof rebuildProgram === 'function') rebuildProgram();
    if (typeof render === 'function') render();
  }
})();