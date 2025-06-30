(function() {
    'use strict';
    const glslKeywords = [
        'attribute', 'const', 'uniform', 'varying', 'break', 'continue', 'do', 'for', 'while',
        'if', 'else', 'in', 'out', 'inout', 'float', 'int', 'bool', 'true', 'false',
        'vec2', 'vec3', 'vec4', 'bvec2', 'bvec3', 'bvec4', 'ivec2', 'ivec3', 'ivec4',
        'mat2', 'mat3', 'mat4', 'sampler2D', 'samplerCube', 'void', 'main',
        'gl_Position', 'gl_FragColor', 'gl_FragData', 'gl_FragCoord', 'gl_FrontFacing',
        'texture2D', 'textureCube', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
        'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt', 'abs', 'sign',
        'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
        'length', 'distance', 'dot', 'cross', 'normalize', 'reflect', 'refract',
        'precision', 'lowp', 'mediump', 'highp'
    ];
    let modal = null;
    let isModalOpen = false;
    let originalVertCode = '';
    let originalFragCode = '';
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .glsl-formatter-modal-overlay{position: fixed;top: 0;right: 0;bottom: 0;z-index: 10000;display: flex;opacity: 0;transition: opacity 0.3s ease;}
            .glsl-formatter-modal-overlay.show{opacity: 1;}
            .glsl-formatter-modal{background: var(--2);padding: 30px;width:50vw;transform: scale(0.8) translateY(20px);transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);}
            .glsl-formatter-modal-overlay.show .glsl-formatter-modal{transform: scale(1) translateY(0);}
            .glsl-formatter-modal-header{text-align: center;margin-bottom: 25px;position: relative;}
            .glsl-formatter-modal-title{font-size: 1.8rem;font-weight: 700;color:var(--a);margin: 0;}
            .glsl-formatter-modal-close{position: absolute;top: -16px;right: -16px;background: var(--r);border: none;width: 2rem;height: 2rem;cursor: pointer;font-size: 1.5rem;display: flex;align-items: center;justify-content: center;transition: all 0.2s ease;color:var(--0);}
            .glsl-formatter-modal-close:hover{background: var(--rh);}
            .glsl-formatter-switches{display: grid;gap: 20px;margin-bottom: 25px;}
            .glsl-formatter-switch-group{display: flex;align-items: center;gap: 15px;padding: 15px;background: var(--4);border-radius: 12px;transition: all 0.2s ease;}
            .glsl-formatter-switch-group:hover{background: var(--5);}
            .glsl-formatter-switch{position: relative;display: flex;align-items: center;cursor: pointer;gap: 15px;}
            .glsl-formatter-switch input{opacity: 0;width: 0;height: 0;}
            .glsl-formatter-slider{position: relative;width: 50px;height: 26px;background: var(--1);border-radius: 26px;transition: all 0.3s ease;}
            .glsl-formatter-slider:before{position: absolute;content: "";height: 20px;width: 20px;left: 3px;top: 3px;background: var(--6);border-radius: 50%;transition: all 0.3s ease;}
            .glsl-formatter-switch input:checked + .glsl-formatter-slider:before{transform: translateX(24px);}
            .glsl-formatter-switch input:checked + .glsl-formatter-slider.format{background: var(--a);}
            .glsl-formatter-switch input:checked + .glsl-formatter-slider.remove-lines{background: var(--ah);}
            .glsl-formatter-switch input:checked + .glsl-formatter-slider.remove-comments{background: var(--rh);}
            .glsl-formatter-switch input:checked + .glsl-formatter-slider.minify{background: var(--b);}
            .glsl-formatter-switch input:disabled + .glsl-formatter-slider{opacity: 0.5;cursor: not-allowed;}
            .glsl-formatter-switch-label{color: var(--7);font-size: 15px;user-select: none;flex: 1;}
            .glsl-formatter-switch input:disabled ~ .glsl-formatter-switch-label{opacity: 0.5;color: var(--5);}
            .glsl-formatter-actions{display: flex;gap: 12px;justify-content: center;}
            .glsl-formatter-btn{padding: 12px 24px;border: none;border-radius: 12px;font-weight: 600;cursor: pointer;transition: all 0.2s ease;font-size: 14px;}
            .glsl-formatter-btn-primary{background: var(--a);color: var(--0);}
            .glsl-formatter-btn-primary:hover{background: var(--ah);}
            .glsl-formatter-btn-secondary{background: var(--r);color: var(--0);}
            .glsl-formatter-btn-secondary:hover{background: var(--rh);}
        `;
        document.head.appendChild(style);
    }
    function createModal() {
        const modalHTML = `
            <div class="glsl-formatter-modal-overlay" id="glslFormatterModal">
                <div class="glsl-formatter-modal">
                    <div class="glsl-formatter-modal-header">
                        <button class="glsl-formatter-modal-close" onclick="GLSLFormatter.closeModal()">×</button>
                        <h2 class="glsl-formatter-modal-title">GLSL Formatter</h2>
                    </div>
                    <div class="glsl-formatter-switches">
                        <div class="glsl-formatter-switch-group">
                            <label class="glsl-formatter-switch">
                                <input type="checkbox" id="glslFormatSwitch">
                                <span class="glsl-formatter-slider format"></span>
                                <span class="glsl-formatter-switch-label">Format</span>
                            </label>
                        </div>
                        <div class="glsl-formatter-switch-group">
                            <label class="glsl-formatter-switch">
                                <input type="checkbox" id="glslRemoveExtraLinesSwitch">
                                <span class="glsl-formatter-slider remove-lines"></span>
                                <span class="glsl-formatter-switch-label">Remove Extra Lines</span>
                            </label>
                        </div>
                        <div class="glsl-formatter-switch-group">
                            <label class="glsl-formatter-switch">
                                <input type="checkbox" id="glslRemoveCommentsSwitch">
                                <span class="glsl-formatter-slider remove-comments"></span>
                                <span class="glsl-formatter-switch-label">Remove Comments</span>
                            </label>
                        </div>
                        <div class="glsl-formatter-switch-group">
                            <label class="glsl-formatter-switch">
                                <input type="checkbox" id="glslMinifySwitch">
                                <span class="glsl-formatter-slider minify"></span>
                                <span class="glsl-formatter-switch-label">Minify</span>
                            </label>
                        </div>
                    </div>
                    <div class="glsl-formatter-actions">
                        <button class="glsl-formatter-btn glsl-formatter-btn-primary" onclick="GLSLFormatter.saveChanges()">Save</button>
                        <button class="glsl-formatter-btn glsl-formatter-btn-secondary" onclick="GLSLFormatter.cancelChanges()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        const targetElement = document.fullscreenElement || document.body;
        targetElement.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('glslFormatterModal');
        setupEventListeners();
    }
    function setupEventListeners() {
        const formatSwitch = document.getElementById('glslFormatSwitch');
        const minifySwitch = document.getElementById('glslMinifySwitch');
        const removeCommentsSwitch = document.getElementById('glslRemoveCommentsSwitch');
        const removeExtraLinesSwitch = document.getElementById('glslRemoveExtraLinesSwitch');
        formatSwitch.addEventListener('change', () => {
            if (formatSwitch.checked && minifySwitch.checked) {
                minifySwitch.checked = false;
            }
            minifySwitch.disabled = formatSwitch.checked;
            applyFormattingLive();
        });
        minifySwitch.addEventListener('change', () => {
            if (minifySwitch.checked && formatSwitch.checked) {
                formatSwitch.checked = false;
            }
            formatSwitch.disabled = minifySwitch.checked;
            applyFormattingLive();
        });
        removeCommentsSwitch.addEventListener('change', applyFormattingLive);
        removeExtraLinesSwitch.addEventListener('change', applyFormattingLive);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelChanges();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                cancelChanges();
            }
        });
    }
    function formatCode(code) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const avgLineLength = nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / (nonEmptyLines.length || 1);
        const isMinified = avgLineLength > 100 || nonEmptyLines.length < 5;
        let processedCode;
        if (isMinified) {
            let normalized = code.replace(/\s+/g, ' ').trim();
            let result = '';
            let inForLoop = false;
            let parenDepth = 0;
            for (let i = 0; i < normalized.length; i++) {
                const char = normalized[i];
                const prevChar = i > 0 ? normalized[i - 1] : '';
                const nextChar = i < normalized.length - 1 ? normalized[i + 1] : '';
                if (char === '(') parenDepth++;
                if (char === ')') parenDepth--;
                if (!inForLoop && char === 'f' && normalized.substr(i, 3) === 'for' && (i === 0 || /\s/.test(prevChar))) {
                    inForLoop = true;
                }
                if (inForLoop && char === ')' && parenDepth === 0) {
                    inForLoop = false;
                }
                result += char;
                if (char === ';' && !inForLoop && parenDepth === 0) {
                    result += '\n';
                } else if (char === '{') {
                    result += '\n';
                } else if (char === '}') {
                    if (nextChar && nextChar !== ';' && nextChar !== '}') {
                        result += '\n';
                    }
                }
            }
            processedCode = result;
        } else {
            processedCode = code;
        }
        const codeLines = processedCode.split('\n');
        const formattedLines = [];
        let indentLevel = 0;
        for (let rawLine of codeLines) {
            const trimmed = rawLine.trim();
            if (!trimmed) {
                formattedLines.push('');
                continue;
            }
            if (trimmed.startsWith('#')) {
                formattedLines.push(trimmed);
                continue;
            }
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            const indent = '  '.repeat(indentLevel);
            formattedLines.push(indent + trimmed);
            if (trimmed.endsWith('{')) {
                indentLevel++;
            }
        }
        return formattedLines.join('\n');
    }
    function removeExtraLines(code) {
        const lines = code.split('\n');
        const cleanLines = [];
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed !== '') {
                cleanLines.push(line);
            }
        }
        return cleanLines.join('\n');
    }
    function removeComments(code) {
        let result = code;
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        result = result.replace(/ +$/gm, '');
        return result;
    }
    function minifyBlock(block) {
        let text = block.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        text = text.replace(/\s+/g, ' ').trim();
        let result = '';
        let inForLoop = false;
        let parenDepth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const prevChar = i > 0 ? text[i - 1] : '';
            const nextChar = i < text.length - 1 ? text[i + 1] : '';
            if (char === '(') parenDepth++;
            if (char === ')') parenDepth--;
            if (!inForLoop && char === 'f' && text.substr(i, 3) === 'for' && (i === 0 || /\s/.test(prevChar))) {
                inForLoop = true;
            }
            if (inForLoop && char === ')' && parenDepth === 0) {
                inForLoop = false;
            }
            result += char;
            if (char === ';' && !inForLoop && parenDepth === 0) {
                result += '\n';
            } else if (char === '{') {
                result += '\n';
            } else if (char === '}') {
                if (nextChar && nextChar !== ';' && nextChar !== '}') {
                    result += '\n';
                }
            }
        }
        result = result.replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1');
        for (let keyword of glslKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            result = result.replace(regex, ` ${keyword} `);
        }
        result = result.replace(/\s+/g, ' ').trim();
        result = result.replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1');
        const lines = result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return lines.join('\n');
    }
    function minifyCode(code) {
        const lines = code.split('\n');
        const segments = [];
        let currentBlockLines = [];
        for (let rawLine of lines) {
            const trimmed = rawLine.trim();
            if (trimmed.startsWith('#')) {
                if (currentBlockLines.length) {
                    segments.push({ type: 'code', lines: currentBlockLines.slice() });
                    currentBlockLines = [];
                }
                segments.push({ type: 'directive', content: trimmed });
            } else {
                currentBlockLines.push(rawLine);
            }
        }
        if (currentBlockLines.length) {
            segments.push({ type: 'code', lines: currentBlockLines.slice() });
        }
        const outLines = [];
        for (let seg of segments) {
            if (seg.type === 'directive') {
                outLines.push(seg.content);
            } else if (seg.type === 'code') {
                const blockText = seg.lines.join('\n');
                if (blockText.trim()) {
                    const minifiedBlock = minifyBlock(blockText);
                    const blockLines = minifiedBlock.split('\n');
                    for (let l of blockLines) {
                        outLines.push(l);
                    }
                }
            }
        }
        return outLines.join('\n').trim();
    }
    function processShaderCode(code) {
        if (!code.trim()) return code;
        let result = code;
        const removeCommentsSwitch = document.getElementById('glslRemoveCommentsSwitch');
        const removeExtraLinesSwitch = document.getElementById('glslRemoveExtraLinesSwitch');
        const formatSwitch = document.getElementById('glslFormatSwitch');
        const minifySwitch = document.getElementById('glslMinifySwitch');
        if (removeCommentsSwitch.checked) {
            result = removeComments(result);
        }
        if (removeExtraLinesSwitch.checked) {
            result = removeExtraLines(result);
        }
        if (formatSwitch.checked) {
            result = formatCode(result);
        } else if (minifySwitch.checked) {
            result = minifyCode(result);
        }
        return result;
    }
    function storeOriginalCode() {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        originalVertCode = vertCode ? vertCode.value : '';
        originalFragCode = fragCode ? fragCode.value : '';
    }
    function restoreOriginalCode() {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        if (vertCode) {
            vertCode.value = originalVertCode;
        }
        if (fragCode) {
            fragCode.value = originalFragCode;
        }
    }
    function applyFormattingLive() {
        const vertCode = document.getElementById('vertCode');
        const fragCode = document.getElementById('fragCode');
        if (vertCode) {
            vertCode.value = processShaderCode(originalVertCode);
        }
        if (fragCode) {
            fragCode.value = processShaderCode(originalFragCode);
        }
    }
    function openModal() {
        if (!modal) {
            createModal();
        }
        storeOriginalCode();
        modal.style.display = 'flex';
        isModalOpen = true;
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    function closeModal() {
        if (!modal) return;
        modal.classList.remove('show');
        isModalOpen = false;
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    function saveChanges() {
        storeOriginalCode();
        closeModal();
    }
    function cancelChanges() {
        restoreOriginalCode();
        closeModal();
    }
    function handleKeydown(e) {
        if (e.altKey && e.code === 'KeyM') {
            e.preventDefault();
            if (isModalOpen) {
                cancelChanges();
            } else {
                openModal();
            }
        }
    }
    function init() {
        injectStyles();
        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('fullscreenchange', () => {
            const modalEl  = document.getElementById('glslFormatterModal');
            const button = document.getElementById('glslFormatterToggleButton');
            const root   = document.fullscreenElement || document.body;
            if (button) root.appendChild(button);
            if (modalEl)  root.appendChild(modalEl);
        });
        window.GLSLFormatter = {
            openModal,
            closeModal,
            saveChanges,
            cancelChanges
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();