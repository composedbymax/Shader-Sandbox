(() => {
function compressString(str) {
  const dict = new Map();
  let data = Array.from(str).map(c => c.charCodeAt(0));
  let curr = [], code = 256, result = [];
  for (let c of data) {
    let sequence = curr.concat(c);
    let key = sequence.join(',');
    if (dict.has(key) || c < 256 && sequence.length === 1) {
      curr = sequence;
    } else {
      let currKey = curr.length > 1 ? dict.get(curr.join(',')) : curr[0];
      result.push(currKey);
      dict.set(key, code++);
      curr = [c];
    }
  }
  if (curr.length) {
    let last = curr.length > 1 ? dict.get(curr.join(',')) : curr[0];
    result.push(last);
  }
  const uint16 = new Uint16Array(result);
  let binary = '';
  const bytes = new Uint8Array(uint16.buffer);
  for (let b of bytes) binary += String.fromCharCode(b);
  let b64 = btoa(binary)
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return b64;
}
function decompressString(compressed) {
  let b64 = compressed.replace(/-/g,'+').replace(/_/g,'/');
  while (b64.length % 4) b64 += '=';
  let binary = atob(b64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const codes = new Uint16Array(bytes.buffer);
  const dict = new Map();
  for (let i = 0; i < 256; i++) dict.set(i, String.fromCharCode(i));
  let currCode = codes[0], currStr = dict.get(currCode), result = [currStr];
  let prevStr = currStr, code = 256;
  for (let i = 1; i < codes.length; i++) {
    currCode = codes[i];
    let entry;
    if (dict.has(currCode)) {
      entry = dict.get(currCode);
    } else if (currCode === code) {
      entry = prevStr + prevStr[0];
    } else {
      throw new Error('Invalid compressed code');
    }
    result.push(entry);
    dict.set(code++, prevStr + entry[0]);
    prevStr = entry;
  }
  return result.join('');
}
function saveLink() {
    const button = document.querySelector('button[onclick="saveLink()"]');
    const originalText = button.textContent;
    const vertCode = document.getElementById('vertCode').value;
    const fragCode = document.getElementById('fragCode').value;
    const title = document.getElementById('shaderTitle').value || 'Untitled Shader';
    const shaderData = {
        v: vertCode,
        f: fragCode,
        t: title
    };
    const jsonString = JSON.stringify(shaderData);
    const compressed = compressString(jsonString);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?s=${compressed}`;
    copyToClipboard(shareUrl)
        .then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy link:', err);
            button.textContent = 'Copy Failed';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
            prompt('Copy this link:', shareUrl);
        });
}
function loadShaderFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressed = urlParams.get('s');
    if (!compressed) {
        return false;
    }
    try {
        const jsonString = decompressString(compressed);
        if (!jsonString) {
            throw new Error('Failed to decompress data');
        }
        const shaderData = JSON.parse(jsonString);
        if (shaderData.v) {
            document.getElementById('vertCode').value = shaderData.v;
        }
        if (shaderData.f) {
            document.getElementById('fragCode').value = shaderData.f;
        }
        if (shaderData.t) {
            document.getElementById('shaderTitle').value = shaderData.t;
        }
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        if (typeof compileShader === 'function') {
            compileShader();
        }
        return true;
    } catch (e) {
        console.error('Failed to load shader from URL:', e);
        return false;
    }
}
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (err) {
            console.warn('Clipboard API failed, falling back to legacy method');
        }
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('Copy command failed');
        }
    } finally {
        document.body.removeChild(textArea);
    }
}
function initShaderLink() {
    loadShaderFromUrl();
    const saveLinkBtn = document.querySelector('.savebtn2');
    if (saveLinkBtn) {
        saveLinkBtn.addEventListener('click', saveLink);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShaderLink);
} else {
    initShaderLink();
}
window.saveLink = saveLink;
})();