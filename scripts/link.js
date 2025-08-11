(() => {
  'use strict';
  function compressString(s) {
    const d = new Map(), data = Array.from(s).map(c => c.charCodeAt(0));
    let curr = [], code = 256, res = [];
    for (let c of data) {
      let seq = curr.concat(c), key = seq.join(',');
      if (d.has(key) || (c < 256 && seq.length === 1)) curr = seq;
      else {
        let currKey = curr.length > 1 ? d.get(curr.join(',')) : curr[0];
        res.push(currKey);
        d.set(key, code++);
        curr = [c];
      }
    }
    if (curr.length) {
      let last = curr.length > 1 ? d.get(curr.join(',')) : curr[0];
      res.push(last);
    }
    const uint16 = new Uint16Array(res), bytes = new Uint8Array(uint16.buffer);
    let bin = '';
    for (let b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decompressString(c) {
    let b64 = c.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    let bin = atob(b64), bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    let codes = new Uint16Array(bytes.buffer), d = new Map();
    for (let i = 0; i < 256; i++) d.set(i, String.fromCharCode(i));
    let currCode = codes[0], currStr = d.get(currCode), res = [currStr], prevStr = currStr, code = 256;
    for (let i = 1; i < codes.length; i++) {
      currCode = codes[i];
      let entry;
      if (d.has(currCode)) entry = d.get(currCode);
      else if (currCode === code) entry = prevStr + prevStr[0];
      else throw new Error('Invalid compressed code');
      res.push(entry);
      d.set(code++, prevStr + entry[0]);
      prevStr = entry;
    }
    return res.join('');
  }
  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch {}
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    Object.assign(ta.style, {position: 'fixed', opacity: '0', left: '-999999px', top: '-999999px'});
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      if (!document.execCommand('copy')) throw 0;
    } finally {
      document.body.removeChild(ta);
    }
  }
  function saveLink() {
    const btn = document.querySelector('button[onclick="saveLink()"]') || document.querySelector('.savebtn2') || document.querySelector('button.savebtn2');
    const orig = btn ? btn.textContent : 'Copy Link';
    const vertEl = document.getElementById('vertCode'), fragEl = document.getElementById('fragCode'), titleEl = document.getElementById('shaderTitle');
    const vert = vertEl?.value || '', frag = fragEl?.value || '', title = titleEl?.value || 'Untitled Shader';
    const data = {v: vert, f: frag, t: title};
    const compressed = compressString(JSON.stringify(data));
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?s=${compressed}`;
    copyToClipboard(shareUrl).then(() => {
      if (btn) btn.textContent = 'Copied!';
      setTimeout(() => { if (btn) btn.textContent = orig; }, 2e3);
    }).catch(() => {
      if (btn) btn.textContent = 'Copy Failed';
      setTimeout(() => { if (btn) btn.textContent = orig; }, 2e3);
      try { prompt('Copy this link:', shareUrl); } catch {}
    });
  }
  function looksLikeWGSL(v, f) {
    return /@vertex|@fragment|@group|@binding|@location|struct\s+\w+|fn\s+\w+/.test((v||'')+'\n'+(f||''));
  }
  function waitForCondition(fn, to = 5e3, intv = 100) {
    return new Promise(res => {
      const start = performance.now();
      (function poll() {
        try { if (fn()) return res(true); } catch {}
        if (performance.now() - start >= to) return res(false);
        setTimeout(poll, intv);
      })();
    });
  }
  function waitForElement(sel, to = 5e3) {
    return waitForCondition(() => !!document.querySelector(sel), to);
  }
  async function callRebuildOnceAvailable(to = 3e3) {
    if (typeof window.rebuildProgram === 'function') {
      try { window.rebuildProgram(); return true; } catch {}
    }
    if (typeof compileShader === 'function') {
      try { compileShader(); return true; } catch {}
    }
    const found = await waitForCondition(() => typeof window.rebuildProgram === 'function' || typeof compileShader === 'function', to, 120);
    if (found) {
      if (typeof window.rebuildProgram === 'function') {
        try { window.rebuildProgram(); return true; } catch {}
      }
      if (typeof compileShader === 'function') {
        try { compileShader(); return true; } catch {}
      }
    }
    return false;
  }
  async function loadShaderFromUrl() {
    const p = new URLSearchParams(window.location.search), c = p.get('s');
    if (!c) return false;
    try {
      const js = decompressString(c);
      if (!js) throw 0;
      const data = JSON.parse(js);
      const vertTA = document.getElementById('vertCode'), fragTA = document.getElementById('fragCode'), titleEl = document.getElementById('shaderTitle');
      if (vertTA && data.v) vertTA.value = data.v;
      if (fragTA && data.f) fragTA.value = data.f;
      if (titleEl && data.t) titleEl.value = data.t;
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      const vert = data.v||'', frag = data.f||'', isWGSL = looksLikeWGSL(vert, frag);
      if (isWGSL) {
        if (typeof window.toggleWebGPU === 'function') {
          try {
            const p = window.toggleWebGPU();
            if (p?.then) await p;
            await waitForCondition(() => window.webgpuState?.isWebGPUMode?.(), 6e3, 120);
          } catch {}
        } else {
          const foundToggle = await waitForElement('#webgpuToggle', 4e3);
          if (foundToggle) {
            const toggleBtn = document.getElementById('webgpuToggle'), already = window.webgpuState?.isWebGPUMode?.();
            if (!already && toggleBtn) {
              try { toggleBtn.click(); } catch {}
            }
            await waitForCondition(() => window.webgpuState?.isWebGPUMode?.(), 7e3, 120);
            await waitForCondition(() => typeof window.webgpuState?.getCanvas === 'function' && window.webgpuState.getCanvas(), 4e3, 120);
          }
        }
        await callRebuildOnceAvailable(3500);
        return true;
      } else {
        await callRebuildOnceAvailable(2e3);
        return true;
      }
    } catch {
      return false;
    }
  }
  async function initShaderLink() {
    try { await loadShaderFromUrl(); } catch {}
    const btn = document.querySelector('.savebtn2') || document.querySelector('button[onclick="saveLink()"]');
    if (btn) btn.addEventListener('click', saveLink);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initShaderLink);
  else setTimeout(initShaderLink, 200);
  window.saveLink = saveLink;
})();