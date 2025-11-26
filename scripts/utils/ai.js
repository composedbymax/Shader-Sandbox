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
        <option value="alibaba/tongyi-deepresearch-30b-a3b:free">tongyi-deepresearch-30b-a3b</option>
        <option value="arliai/qwq-32b-arliai-rpr-v1:free">qwq-32b-arliai-rpr-v1</option>
        <option value="deepseek/deepseek-chat-v3-0324:free">deepseek-chat-v3-0324</option>
        <option value="deepseek/deepseek-r1-0528:free">deepseek-r1-0528</option>
        <option value="deepseek/deepseek-r1-0528-qwen3-8b:free">deepseek-r1-qwen3-8b</option>
        <option value="deepseek/deepseek-r1:free">deepseek-r1</option>
        <option value="deepseek/deepseek-r1-distill-llama-70b:free">deepseek-r1-distill-llama-70b</option>
        <option value="google/gemma-3-12b-it:free">gemma-3-12b-it</option>
        <option value="google/gemma-3-27b-it:free">gemma-3-27b-it</option>
        <option value="google/gemma-3-4b-it:free">gemma-3-4b-it</option>
        <option value="google/gemma-3n-e2b-it:free">gemma-3n-e2b-it</option>
        <option value="google/gemma-3n-e4b-it:free">gemma-3n-e4b-it</option>
        <option value="google/gemini-2.0-flash-exp:free">gemini-2.0-flash-exp</option>
        <option value="kwaipilot/kat-coder-pro:free">kat-coder-pro</option>
        <option value="meituan/longcat-flash-chat:free">longcat-flash-chat</option>
        <option value="meta-llama/llama-3.2-3b-instruct:free">llama-3.2-3b-instruct</option>
        <option value="meta-llama/llama-3.3-70b-instruct:free">llama-3.3-70b-instruct</option>
        <option value="microsoft/mai-ds-r1:free">mai-ds-r1</option>
        <option value="mistralai/mistral-7b-instruct:free">mistral-7b-instruct</option>
        <option value="mistralai/mistral-nemo:free">mistral-nemo</option>
        <option value="mistralai/mistral-small-24b-instruct-2501:free">mistral-small-24b-instruct-2501</option>
        <option value="mistralai/mistral-small-3.1-24b-instruct:free">mistral-small-3.1-24b-instruct</option>
        <option value="mistralai/mistral-small-3.2-24b-instruct:free">mistral-small-3.2-24b-instruct</option>
        <option value="moonshotai/kimi-k2:free">kimi-k2</option>
        <option value="nvidia/nemotron-nano-12b-v2-vl:free">nemotron-nano-12b-v2-vl</option>
        <option value="nvidia/nemotron-nano-9b-v2:free">nemotron-nano-9b-v2</option>
        <option value="nousresearch/hermes-3-llama-3.1-405b:free">hermes-3-llama-3.1-405b</option>
        <option value="openai/gpt-oss-20b:free">gpt-oss-20b</option>
        <option value="openrouter/sherlock-dash-alpha">sherlock-dash-alpha</option>
        <option value="openrouter/sherlock-think-alpha">sherlock-think-alpha</option>
        <option value="qwen/qwen-2.5-72b-instruct:free">qwen-2.5-72b-instruct</option>
        <option value="qwen/qwen-2.5-coder-32b-instruct:free">qwen-2.5-coder-32b-instruct</option>
        <option value="qwen/qwen3-14b:free">qwen3-14b</option>
        <option value="qwen/qwen3-235b-a22b:free">qwen3-235b-a22b</option>
        <option value="qwen/qwen3-30b-a3b:free">qwen3-30b-a3b</option>
        <option value="qwen/qwen3-4b:free">qwen3-4b</option>
        <option value="qwen/qwen2.5-vl-32b-instruct:free">qwen2.5-vl-32b-instruct</option>
        <option value="qwen/qwen3-coder:free">qwen3-coder</option>
        <option value="tngtech/deepseek-r1t-chimera:free">deepseek-r1t-chimera</option>
        <option value="tngtech/deepseek-r1t2-chimera:free">deepseek-r1t2-chimera</option>
        <option value="z-ai/glm-4.5-air:free">glm-4.5-air</option>
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
  sendBtn.addEventListener('click', async () => {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {this.showToast("Please enter a prompt", "error");return;}
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
    sendBtn.disabled = true;
    loadingText.classList.add('show');
    responseArea.classList.remove('show');
    applyBtn.classList.remove('show');
    extractedShaderCode = null;
    fullResponse = null;
    try {
      const res = await fetch('api/ai.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: contextMessage,
          model: modelSelect.value
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
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
})();