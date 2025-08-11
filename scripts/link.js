(() => {
  'use strict';
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
  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {}
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
  function saveLink() {
    const button = document.querySelector('button[onclick="saveLink()"]') ||
                   document.querySelector('.savebtn2') ||
                   document.querySelector('button.savebtn2');
    const originalText = button ? button.textContent : 'Copy Link';
    const vertEl = document.getElementById('vertCode');
    const fragEl = document.getElementById('fragCode');
    const titleEl = document.getElementById('shaderTitle');
    const vertCode = vertEl ? vertEl.value : '';
    const fragCode = fragEl ? fragEl.value : '';
    const title = (titleEl && titleEl.value) ? titleEl.value : 'Untitled Shader';
    const shaderData = { v: vertCode, f: fragCode, t: title };
    const jsonString = JSON.stringify(shaderData);
    const compressed = compressString(jsonString);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?s=${compressed}`;
    copyToClipboard(shareUrl)
      .then(() => {
        if (button) button.textContent = 'Copied!';
        setTimeout(() => { if (button) button.textContent = originalText; }, 2000);
      })
      .catch(() => {
        if (button) button.textContent = 'Copy Failed';
        setTimeout(() => { if (button) button.textContent = originalText; }, 2000);
        try { prompt('Copy this link:', shareUrl); } catch (e) {}
      });
  }
  function looksLikeWGSL(vert, frag) {
    const sample = (vert || '') + '\n' + (frag || '');
    return /@vertex|@fragment|@group|@binding|@location|struct\s+\w+|fn\s+\w+/.test(sample);
  }
  function waitForCondition(condFn, timeout = 5000, interval = 100) {
    return new Promise(resolve => {
      const start = performance.now();
      (function poll() {
        try {
          if (condFn()) return resolve(true);
        } catch (e) {}
        if (performance.now() - start >= timeout) return resolve(false);
        setTimeout(poll, interval);
      })();
    });
  }
  function waitForElement(selector, timeout = 5000) {
    return waitForCondition(() => !!document.querySelector(selector), timeout);
  }
  async function callRebuildOnceAvailable(timeout = 3000) {
    if (typeof window.rebuildProgram === 'function') {
      try { window.rebuildProgram(); return true; }
      catch (e) {}
    }
    if (typeof compileShader === 'function') {
      try { compileShader(); return true; }
      catch (e) {}
    }
    const found = await waitForCondition(() => typeof window.rebuildProgram === 'function' || typeof compileShader === 'function', timeout, 120);
    if (found) {
      if (typeof window.rebuildProgram === 'function') {
        try { window.rebuildProgram(); return true; } catch (e) {}
      }
      if (typeof compileShader === 'function') {
        try { compileShader(); return true; } catch (e) {}
      }
    }
    return false;
  }
  async function loadShaderFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressed = urlParams.get('s');
    if (!compressed) return false;
    try {
      const jsonString = decompressString(compressed);
      if (!jsonString) throw new Error('Failed to decompress data');
      const shaderData = JSON.parse(jsonString);
      const vertTA = document.getElementById('vertCode');
      const fragTA = document.getElementById('fragCode');
      const titleEl = document.getElementById('shaderTitle');
      if (vertTA && shaderData.v) vertTA.value = shaderData.v;
      if (fragTA && shaderData.f) fragTA.value = shaderData.f;
      if (titleEl && shaderData.t) titleEl.value = shaderData.t;
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      const vert = shaderData.v || '';
      const frag = shaderData.f || '';
      const isWGSL = looksLikeWGSL(vert, frag);
      if (isWGSL) {
        if (typeof window.toggleWebGPU === 'function') {
          try {
            const maybePromise = window.toggleWebGPU();
            if (maybePromise && typeof maybePromise.then === 'function') {
              await maybePromise;
            }
            await waitForCondition(() => window.webgpuState && window.webgpuState.isWebGPUMode && window.webgpuState.isWebGPUMode(), 6000, 120);
          } catch (e) {}
        } else {
          const foundToggle = await waitForElement('#webgpuToggle', 4000);
          if (foundToggle) {
            const toggleBtn = document.getElementById('webgpuToggle');
            const already = window.webgpuState && typeof window.webgpuState.isWebGPUMode === 'function' && window.webgpuState.isWebGPUMode();
            if (!already && toggleBtn) {
              try {
                toggleBtn.click();
              } catch (e) {}
            }
            await waitForCondition(
              () => window.webgpuState && window.webgpuState.isWebGPUMode && window.webgpuState.isWebGPUMode(),
              7000, 120
            );
            await waitForCondition(
              () => window.webgpuState && typeof window.webgpuState.getCanvas === 'function' && !!window.webgpuState.getCanvas(),
              4000, 120
            );
          }
        }
        await callRebuildOnceAvailable(3500);
        return true;
      } else {
        await callRebuildOnceAvailable(2000);
        return true;
      }
    } catch (e) {
      return false;
    }
  }
  async function initShaderLink() {
    try {
      await loadShaderFromUrl();
    } catch (e) {}
    const saveLinkBtn = document.querySelector('.savebtn2') || document.querySelector('button[onclick="saveLink()"]');
    if (saveLinkBtn) {
      saveLinkBtn.addEventListener('click', saveLink);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShaderLink);
  } else {
    setTimeout(initShaderLink, 200);
  }
  window.saveLink = saveLink;
})();