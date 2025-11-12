(function () {
    const PROXY_URL = './api/proxy.php';
    let currentPage = 0;
    async function fetchGLSLSandboxShaders() {
        const container = document.getElementById('publicShaderList');
        if (!container) return;
        container.innerHTML = '<div>Loading GLSL Sandbox shaders...</div>';
        try {
            const response = await fetch(`${PROXY_URL}?type=gallery&page=${currentPage}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            if (!data.shaders || data.shaders.length === 0) {
                container.innerHTML = '<div>No shaders found.</div>';
                return;
            }
            container.innerHTML = '';
            const paginationTop = document.createElement('div');
            paginationTop.className = 'pagination';
            paginationTop.innerHTML = `
                <button class="sbtn" id="prevSandboxPage" ${currentPage === 0 ? 'disabled' : ''}>◀ Previous</button>
                <span style="color:#dadada; margin:0 10px;">Page ${currentPage + 1}</span>
                <button class="sbtn" id="nextSandboxPage">Next ▶</button>
            `;
            container.appendChild(paginationTop);
            data.shaders.forEach(shader => {
                const card = createPublicShaderCard({
                    title: `Sandbox #${shader.id}`,
                    user: 'GLSL Sandbox',
                    preview: `${PROXY_URL}?type=image&path=${encodeURIComponent(shader.thumb)}`,
                    token: shader.id,
                    sandbox: true
                });
                container.appendChild(card);
            });
            document.getElementById('prevSandboxPage').onclick = () => {
                if (currentPage > 0) {
                    currentPage--;
                    fetchGLSLSandboxShaders();
                }
            };
            document.getElementById('nextSandboxPage').onclick = () => {
                currentPage++;
                fetchGLSLSandboxShaders();
            };
        } catch (err) {
            console.error('Error loading GLSL Sandbox shaders:', err);
            container.innerHTML = `<div style="color:#ff6961;">Error: ${err.message}</div>`;
        }
    }
    window.loadPublicShader = async function (token) {
        const isSandbox = typeof token === 'string' && /^\d+(\.\d+)?$/.test(token);
        if (!isSandbox) {
            if (window.loadNormalPublicShader) return window.loadNormalPublicShader(token);
            return;
        }
        try {
            const response = await fetch(`${PROXY_URL}?type=shader&id=${encodeURIComponent(token)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            if (!data.code) throw new Error('No shader code found');
            const shader = {
                title: `Sandbox #${token}`,
                vert: 'attribute vec2 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 0., 1.);\n}',
                frag: '// Loaded from GLSL Sandbox\n' + data.code,
                animationType: data.animationType || 'webgl'
            };
            if (typeof window.loadShaderData === 'function') {
                window.loadShaderData(shader);
            } else {
                const frag = document.getElementById('fragCode');
                if (frag) {
                    frag.value = shader.frag;
                    if (window.rebuildProgram) window.rebuildProgram();
                    if (window.showToast) window.showToast(`Loaded Sandbox shader #${token}`, 'success');
                }
            }
            if (window.closeShaderWindow) window.closeShaderWindow();
        } catch (err) {
            console.error('Error loading Sandbox shader:', err);
            if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
        } finally {
            if (typeof window.enableAllLoadButtons === 'function') {
                window.enableAllLoadButtons();
            }
            const container = document.getElementById('publicShaderList');
            if (container && container.textContent.includes('Loading GLSL Sandbox shaders...')) {
                container.innerHTML = '';
            }
        }
    };
    function addSandboxToggle() {
        const tab = document.getElementById('tabPublic');
        if (!tab) return;
        const toggle = document.createElement('label');
        toggle.id = 'useSandboxContainer';
        toggle.innerHTML = `
        <div class="ellips">Use GLSL Sandbox API</div>
        <div class="checkbox-container">
            <input type="checkbox" id="useSandboxAPI">
            <div class="custom-checkbox"></div>
        </div>
    `;
        tab.appendChild(toggle);
        const checkbox = document.getElementById('useSandboxAPI');
        const savedState = localStorage.getItem('useSandboxAPI');
        if (savedState === 'true') {
            checkbox.checked = true;
        }
        checkbox.addEventListener('change', (e) => {
            localStorage.setItem('useSandboxAPI', e.target.checked);
            if (e.target.checked) {
                fetchGLSLSandboxShaders();
            } else {
                if (window.fetchPublicShaders) window.fetchPublicShaders();
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSandboxToggle);
    } else {
        addSandboxToggle();
    }
})();