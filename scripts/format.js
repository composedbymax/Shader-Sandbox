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