(function() {
  const container = document.getElementById('editors');
  if (!container) return console.warn('No container with id "editors" found.');
  container.style.position = container.style.position || 'relative';
  const modal = document.createElement('div');
  modal.id = 'aiModal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <h3>AI Shader Assistant</h3>
      <select id="modelSelect">
        <option value="">Loading models...</option>
      </select>
      <textarea id="aiPrompt" placeholder="Ask for an edit or describe a new shader idea..."></textarea>
      <button id="sendBtn">Send</button>
      <span class="loading" id="loadingText">Generating...</span>
      <button id="applyShaderBtn">Add Shader to Editor</button>
      <div class="response-area" id="responseArea">
        <button class="copy-btn" id="copyBtn">Copy</button>
      </div>
    </div>
  `;
  container.appendChild(modal);
  const promptInput = modal.querySelector('#aiPrompt');
  const modelSelect = modal.querySelector('#modelSelect');
  const sendBtn = modal.querySelector('#sendBtn');
  const loadingText = modal.querySelector('#loadingText');
  const responseArea = modal.querySelector('#responseArea');
  const closeBtn = modal.querySelector('.close-btn');
  const applyBtn = modal.querySelector('#applyShaderBtn');
  const copyBtn = modal.querySelector('#copyBtn');
  let extractedShaderCode = null;
  let fullResponse = null;
  async function loadModels() {
    try {
      const res = await fetch('api/ai.php?action=models');
      const data = await res.json();
      if (data.error || !data.models || !data.models.length) {
        modelSelect.innerHTML = '<option value="">No models available</option>';
        return;
      }
      modelSelect.innerHTML = '';
      data.models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.textContent = model.name;
        modelSelect.appendChild(opt);
      });
      if (modelSelect.options.length > 0) {
        modelSelect.selectedIndex = 0;
      }
    } catch (err) {
      console.error('Failed to load models:', err);
      modelSelect.innerHTML = '<option value="">Error loading models</option>';
    }
  }
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { 
    if (e.target === modal) modal.style.display = 'none'; 
  });
  copyBtn.addEventListener('click', () => {
    if (extractedShaderCode) {
      navigator.clipboard.writeText(extractedShaderCode).then(() => {
        showToast('Copied to clipboard', 'success');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    }
  });
  const btn = document.createElement('button');
    btn.id = 'AIBtn';
    btn.innerHTML = `
        <svg viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>ai</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="icon" fill="var(--6)" transform="translate(64.000000, 64.000000)"> <path d="M320,64 L320,320 L64,320 L64,64 L320,64 Z M171.749388,128 L146.817842,128 L99.4840387,256 L121.976629,256 L130.913039,230.977 L187.575039,230.977 L196.319607,256 L220.167172,256 L171.749388,128 Z M260.093778,128 L237.691519,128 L237.691519,256 L260.093778,256 L260.093778,128 Z M159.094727,149.47526 L181.409039,213.333 L137.135039,213.333 L159.094727,149.47526 Z M341.333333,256 L384,256 L384,298.666667 L341.333333,298.666667 L341.333333,256 Z M85.3333333,341.333333 L128,341.333333 L128,384 L85.3333333,384 L85.3333333,341.333333 Z M170.666667,341.333333 L213.333333,341.333333 L213.333333,384 L170.666667,384 L170.666667,341.333333 Z M85.3333333,0 L128,0 L128,42.6666667 L85.3333333,42.6666667 L85.3333333,0 Z M256,341.333333 L298.666667,341.333333 L298.666667,384 L256,384 L256,341.333333 Z M170.666667,0 L213.333333,0 L213.333333,42.6666667 L170.666667,42.6666667 L170.666667,0 Z M256,0 L298.666667,0 L298.666667,42.6666667 L256,42.6666667 L256,0 Z M341.333333,170.666667 L384,170.666667 L384,213.333333 L341.333333,213.333333 L341.333333,170.666667 Z M0,256 L42.6666667,256 L42.6666667,298.666667 L0,298.666667 L0,256 Z M341.333333,85.3333333 L384,85.3333333 L384,128 L341.333333,128 L341.333333,85.3333333 Z M0,170.666667 L42.6666667,170.666667 L42.6666667,213.333333 L0,213.333333 L0,170.666667 Z M0,85.3333333 L42.6666667,85.3333333 L42.6666667,128 L0,128 L0,85.3333333 Z" id="Combined-Shape"> </path> </g> </g> </g></svg>
    `;
    document.body.appendChild(btn);
  btn.addEventListener('click', () => {
    if (!window.editorsVisible && typeof window.toggleEditors === 'function') {
        window.toggleEditors();
    }
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
      return;
    }
    promptInput.value = '';
    responseArea.textContent = '';
    responseArea.classList.remove('show');
    applyBtn.classList.remove('show');
    extractedShaderCode = null;
    fullResponse = null;
    modal.style.display = 'flex';
    const existingCopyBtn = responseArea.querySelector('.copy-btn');
    if (!existingCopyBtn) {
      responseArea.innerHTML = '<button class="copy-btn" id="copyBtn">Copy</button>';
      responseArea.querySelector('.copy-btn').addEventListener('click', () => {
        if (extractedShaderCode) {
          navigator.clipboard.writeText(extractedShaderCode).then(() => {
            showToast('Copied to clipboard', 'success');
          }).catch(() => {
            showToast('Failed to copy', 'error');
          });
        }
      });
    }
  });
  applyBtn.addEventListener('click', () => {
    if (extractedShaderCode) {
      const frag = document.getElementById('fragCode');
      if (frag) {
        frag.value = extractedShaderCode;
        const event = new Event('input', { bubbles: true });
        frag.dispatchEvent(event);
        showToast('Loaded', 'success');
        modal.style.display = 'none';
      } else {
        showToast('Failed', 'error');
      }
    }
  });
  async function sendMessage(userPrompt, retryCount = 0) {
    const maxRetries = 1;
    const vert = document.getElementById('vertCode');
    const frag = document.getElementById('fragCode');
    const vertCode = vert ? vert.value : '';
    const fragCode = frag ? frag.value : '';
    const contextMessage = `Current Shader Code:
--- Vertex Shader ---
${vertCode}
--- Fragment Shader ---
${fragCode}
User Request: ${userPrompt}
IMPORTANT: Respond with ONLY the revised fragment shader code wrapped in <SHADER> tags like this:
<SHADER>
// fragment shader code here
</SHADER>
Do not include any explanation, just the shader code between the tags.`;
    try {
      const res = await fetch('api/ai.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'chat',
          message: contextMessage,
          model: modelSelect.value
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        if (data.rate_limited) {
          throw new Error('Rate limit reached. Please try again later.');
        }
        if (data.retry && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return sendMessage(userPrompt, retryCount + 1);
        }
        throw new Error(data.error);
      }
      const reply = data.reply || 'No response from AI';
      fullResponse = reply;
      const shaderMatch = reply.match(/<SHADER>([\s\S]*?)<\/SHADER>/);
      if (shaderMatch && shaderMatch[1]) {
        extractedShaderCode = shaderMatch[1].trim();
        responseArea.innerHTML = '<button class="copy-btn" id="copyBtn">Copy</button>' + extractedShaderCode;
        responseArea.querySelector('.copy-btn').addEventListener('click', () => {
          if (extractedShaderCode) {
            navigator.clipboard.writeText(extractedShaderCode).then(() => {
              showToast('Copied to clipboard', 'success');
            }).catch(() => {
              showToast('Failed to copy', 'error');
            });
          }
        });
        applyBtn.classList.add('show');
      } else {
        responseArea.innerHTML = '<button class="copy-btn" id="copyBtn">Copy</button>' + reply;
        responseArea.querySelector('.copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(reply).then(() => {
            showToast('Copied to clipboard', 'success');
          }).catch(() => {
            showToast('Failed to copy', 'error');
          });
        });
      }
      responseArea.classList.add('show');
    } catch (err) {
      responseArea.innerHTML = '<button class="copy-btn" id="copyBtn">Copy</button>Error: ' + err.message;
      responseArea.classList.add('show');
      throw err;
    }
  }
  sendBtn.addEventListener('click', async () => {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
      showToast("Please enter a prompt", "error");
      return;
    }
    if (!modelSelect.value) {
      showToast("Please select a model", "error");
      return;
    }
    sendBtn.disabled = true;
    loadingText.classList.add('show');
    responseArea.classList.remove('show');
    applyBtn.classList.remove('show');
    extractedShaderCode = null;
    fullResponse = null;
    try {
      await sendMessage(userPrompt);
    } catch (err) {
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      loadingText.classList.remove('show');
    }
  });
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
  document.addEventListener('fullscreenchange', () =>
    (document.fullscreenElement || document.body).appendChild(btn)
  );
  loadModels();
})();