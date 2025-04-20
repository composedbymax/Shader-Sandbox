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
      callback(canvas.toDataURL('image/jpeg', 0.6));
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
    alert(`Saved “${title}” locally.`);
  });
}
function savePublic() {
  const title = shaderTitle.value.trim(), img = shaderImageInput.files[0];
  if (!title || !img) return alert(!title ? "Give your shader a title!" : "Please upload a preview image.");
  compressImage(img, (compressedDataUrl) => {
    fetch('save.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, vert: vertCode.value, frag: fragCode.value, preview: compressedDataUrl,
        user: "<?php echo htmlspecialchars($_SESSION['user']); ?>"
      })
    })
    .then(r => r.text())
    .then(msg => (alert(msg), showTab('public')));
  });
}
function fetchPublicShaders() {
  fetch('public.json').then(r => r.json()).then(list => {
    const c = $('publicShaderList');
    c.innerHTML = '';
    list.forEach(s => c.appendChild(shaderCard(s)));
  });
}
function fetchLocalShaders() {
  const c = $('localShaderList');
  c.innerHTML = '';
  Object.entries(localStorage)
    .filter(([k]) => k.startsWith('shader_'))
    .forEach(([k, v]) => {
      try { c.appendChild(shaderCard(JSON.parse(v), k)); } catch {}
    });
}
function shaderCard(shader, key) {
  const d = document.createElement('div');
  d.style = 'border:1px solid var(--4);padding:6px;margin-bottom:8px;';
  d.innerHTML = `
    <strong>${shader.title}</strong> ${shader.user ? 'by ' + shader.user : ''}<br>
    <img src="${shader.preview}" class="img"><br>
    <button class="ldbtn"
      onclick='loadShader(${JSON.stringify(JSON.stringify(shader))})'>Load</button>
    ${key ? `<button class="xbtn" onclick='deleteLocal("${key}")'>X</button>` : ''}
  `;
  return d;
}
function loadShader(jsonStr) {
  const shader = JSON.parse(jsonStr);
  shaderTitle.value = shader.title;
  vertCode.value = shader.vert;
  fragCode.value = shader.frag;
  window.rebuildProgram();
  window.render();
  closeShaderWindow();
}
function deleteLocal(key) {
  confirm(`Delete “${key.replace('shader_', '')}”?`) && (localStorage.removeItem(key), fetchLocalShaders());
}
chooseFileBtn.addEventListener('click', () => shaderImageInput.click());
shaderImageInput.addEventListener('change', () => fileNameDisplay.textContent = shaderImageInput.files[0]?.name || '');
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