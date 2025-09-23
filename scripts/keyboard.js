(function() {
    'use strict';
    const keyboardLayout = [
        {
            row: 1,
            keys: [
                { key: 'Esc', width: '4em', id: 'escape' },
                { key: 'F1', width: '3em' }, { key: 'F2', width: '3em' }, { key: 'F3', width: '3em' }, { key: 'F4', width: '3em' },
                { key: 'F5', width: '3em' }, { key: 'F6', width: '3em' }, { key: 'F7', width: '3em' }, { key: 'F8', width: '3em' },
                { key: 'F9', width: '3em' }, { key: 'F10', width: '3em' }, { key: 'F11', width: '3em' }, { key: 'F12', width: '3em' }
            ]
        },
        {
            row: 2,
            keys: [
                { key: '`', width: '3em' }, { key: '1', width: '3em' }, { key: '2', width: '3em' }, { key: '3', width: '3em' },
                { key: '4', width: '3em' }, { key: '5', width: '3em' }, { key: '6', width: '3em' }, { key: '7', width: '3em' },
                { key: '8', width: '3em' }, { key: '9', width: '3em' }, { key: '0', width: '3em' }, { key: '-', width: '3em' },
                { key: '=', width: '3em' }, { key: 'Backspace', width: '6em' }
            ]
        },
        {
            row: 3,
            keys: [
                { key: 'Tab', width: '4.5em' }, { key: 'Q', width: '3em' }, { key: 'W', width: '3em' }, { key: 'E', width: '3em' },
                { key: 'R', width: '3em' }, { key: 'T', width: '3em' }, { key: 'Y', width: '3em' }, { key: 'U', width: '3em' },
                { key: 'I', width: '3em' }, { key: 'O', width: '3em' }, { key: 'P', width: '3em', id: 'p' }, { key: '[', width: '3em' },
                { key: ']', width: '3em' }, { key: '\\', width: '4.5em' }
            ]
        },
        {
            row: 4,
            keys: [
                { key: 'Caps', width: '5.25em' }, { key: 'A', width: '3em' }, { key: 'S', width: '3em' }, { key: 'D', width: '3em' },
                { key: 'F', width: '3em', id: 'f' }, { key: 'G', width: '3em' }, { key: 'H', width: '3em' }, { key: 'J', width: '3em' },
                { key: 'K', width: '3em' }, { key: 'L', width: '3em' }, { key: ';', width: '3em' }, { key: "'", width: '3em' },
                { key: 'Enter', width: '6.75em' }
            ]
        },
        {
            row: 5,
            keys: [
                { key: 'Shift', width: '7em', class: 'modifier', id: 'shift' }, { key: 'Z', width: '3em' }, { key: 'X', width: '3em' },
                { key: 'C', width: '3em' }, { key: 'V', width: '3em', id: 'v' }, { key: 'B', width: '3em' }, { key: 'N', width: '3em' },
                { key: 'M', width: '3em', id: 'm' }, { key: ',', width: '3em' }, { key: '.', width: '3em' }, { key: '/', width: '3em' },
                { key: 'Shift', width: '7em', class: 'modifier', id: 'shift-right' }
            ]
        },
        {
            row: 6,
            keys: [
                { key: 'Ctrl', width: '4em', class: 'modifier', id: 'ctrl' }, 
                { key: 'Win', width: '3em', class: 'modifier' },
                { key: 'Alt', width: '3em', class: 'modifier', id: 'alt' }, 
                { key: 'Space', width: '18em' },
                { key: 'Alt', width: '3em', class: 'modifier', id: 'alt-right' }, 
                { key: 'Menu', width: '3em', class: 'modifier' },
                { key: 'Ctrl', width: '4em', class: 'modifier', id: 'ctrl-right' },
                { key: '←', width: '3em', id: 'arrow-left' },
                { key: 'UD', width: '3em', id: 'arrow-stack', isStack: true },
                { key: '→', width: '3em', id: 'arrow-right' }
            ]
        }
    ];
    const shortcuts = [
        { 
            desc: 'Close any modal (hold to exit fullscreen)', 
            keys: 'Esc', 
            highlight: ['escape'],
            id: 'close'
        },
        { 
            desc: 'Fullscreen/Open + Close Editor panel', 
            keys: 'Control + F', 
            highlight: ['ctrl', 's'],
            id: 'Open'
        },
        { 
            desc: 'Enable / Disable Window Focus', 
            keys: 'Control + P', 
            highlight: ['ctrl', 'p'],
            id: 'focus'
        },
        { 
            desc: 'Performance mode (hide buttons)', 
            keys: 'Control + Shift + D', 
            highlight: ['ctrl', 'shift', 'd'],
            id: 'performance'
        },
        {
            desc: 'Switch between local shaders',
            keys: 'L + Arrow Keys',
            highlight: ['l', 'arrow-right', 'arrow-left'],
            id: 'local-shaders'
        },
        {
            desc: 'Switch between public shaders',
            keys: 'P + Arrow Keys',
            highlight: ['p', 'arrow-right', 'arrow-left'],
            id: 'public-shaders'
        },
        { 
            desc: 'Format/minify code', 
            keys: 'Option + M', 
            highlight: ['alt', 'm'],
            id: 'format'
        },
        {
            desc: 'Visualize code with flowchart modal', 
            keys: 'Option + V', 
            highlight: ['alt', 'v'],
            id: 'visualize'
        }
    ];
    if (window.userLoggedIn) {
        shortcuts.push(
        {
            desc: 'Find code snippets', 
            keys: 'Control + S', 
            highlight: ['ctrl', 's'],
            id: 'find'
        }
    );}
    function createHTML() {
        return `
        <div class="shortcut-modal" id="shortcut-modal">
            <div class="shortcut">
                <button class="close-btn" onclick="KeyboardShortcuts.close()">&times;</button>
                <div class="shortcut-header">
                    <h2 class="shortcut-title">Keyboard Shortcuts</h2>
                </div>
                <div class="shortcut-content">
                    <div class="commands-list-container">
                        <div class="commands-list" id="commands-list">
                            ${shortcuts.map(shortcut => `
                                <div class="command-item" data-shortcut="${shortcut.id}">
                                    <span class="command-desc">${shortcut.desc}</span>
                                    <span class="command-keys">${shortcut.keys}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="keyboard-container">
                        <div class="keyboard" id="keyboard">
                            ${keyboardLayout.map(row => `
                            <div class="keyboard-row" style="grid-template-columns: repeat(${row.keys.length}, auto);">
                                ${row.keys.map(keyData => {
                                    if (keyData.isStack) {
                                        return `
                                            <div class="arrow-stack" style="width: ${keyData.width};">
                                                <div class="key half-height" data-key="arrow-up" id="key-arrow-up">↑</div>
                                                <div class="key half-height" data-key="arrow-down" id="key-arrow-down">↓</div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="key ${keyData.class || ''}" 
                                                style="width: ${keyData.width};" 
                                                data-key="${keyData.id || keyData.key.toLowerCase()}"
                                                id="key-${keyData.id || keyData.key.toLowerCase()}">
                                                ${keyData.key}
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
    window.KeyboardShortcuts = {
        modal: null,
        isOpen: false,
        currentHighlight: null,
        resizeTimeout: null,
        calculateKeyboardSize: function() {
            const modal = this.modal;
            const keyboard = document.getElementById('keyboard');
            if (!modal || !keyboard) return;
            const viewportWidth = window.innerWidth;
            const keyboardContainer = modal.querySelector('.keyboard-container');
            const modalPadding = viewportWidth <= 480 ? 20 : 60;
            const availableWidth = Math.min(viewportWidth * 0.95, 1200) - modalPadding;
            const baseKeyboardWidth = 900;
            const widthScale = availableWidth / baseKeyboardWidth;
            let scale = Math.min(widthScale, 1);
            if (viewportWidth <= 480) {
                scale = Math.max(scale, 0.55);
            } else if (viewportWidth <= 600) {
                scale = Math.max(scale, 0.65);
            } else if (viewportWidth <= 800) {
                scale = Math.max(scale, 0.75);
            }
            scale = Math.max(scale, 0.45);
            keyboard.style.transform = `scale(${scale})`;
            const keys = keyboard.querySelectorAll('.key');
            keys.forEach(key => {
                if (scale < 0.6) {
                    key.style.fontSize = '9px';
                    key.style.minHeight = '24px';
                } else if (scale < 0.8) {
                    key.style.fontSize = '10px';
                    key.style.minHeight = '28px';
                } else {
                    key.style.fontSize = '11px';
                    key.style.minHeight = '32px';
                }
            });
            const halfHeightKeys = keyboard.querySelectorAll('.key.half-height');
            halfHeightKeys.forEach(key => {
                key.style.fontSize = scale < 0.6 ? '8px' : '9px';
            });
        },
        init: function() {
            document.body.insertAdjacentHTML('beforeend', createHTML());
            this.modal = document.getElementById('shortcut-modal');
            this.bindEvents();
            window.addEventListener('resize', () => {
                if (this.isOpen) {
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        this.calculateKeyboardSize();
                    }, 100);
                }
            });
        },
        bindEvents: function() {
            const commandItems = document.querySelectorAll('.command-item');
            commandItems.forEach(item => {
                item.addEventListener('mouseenter', (e) => {
                    const shortcutId = e.target.dataset.shortcut;
                    const shortcut = shortcuts.find(s => s.id === shortcutId);
                    if (shortcut) {
                        this.highlightKeys(shortcut.highlight);
                        e.target.classList.add('active');
                    }
                });
                item.addEventListener('mouseleave', (e) => {
                    this.clearHighlight();
                    e.target.classList.remove('active');
                });
            });
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        },
        highlightKeys: function(keys) {
            this.clearHighlight();
            this.currentHighlight = keys;
            keys.forEach(keyId => {
                let keyElement = document.getElementById(`key-${keyId}`);
                if (!keyElement) {
                    switch(keyId) {
                        case 'alt':
                            keyElement = document.getElementById('key-alt') || 
                                       document.getElementById('key-alt-right');
                            break;
                        case 'ctrl':
                            keyElement = document.getElementById('key-ctrl') || 
                                       document.getElementById('key-ctrl-right');
                            break;
                        case 'shift':
                            keyElement = document.getElementById('key-shift') || 
                                       document.getElementById('key-shift-right');
                            break;
                    }
                }
                if (keyElement) {
                    keyElement.classList.add('highlight');
                }
            });
        },
        clearHighlight: function() {
            if (this.currentHighlight) {
                this.currentHighlight.forEach(keyId => {
                    const keyElements = document.querySelectorAll(`[data-key="${keyId}"], #key-${keyId}`);
                    keyElements.forEach(el => el.classList.remove('highlight'));
                });
                document.querySelectorAll('.key.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });
                
                this.currentHighlight = null;
            }
        },
        open: function() {
            const fullscreenEl = document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement;
            const container = fullscreenEl || document.body;
            container.appendChild(this.modal);
            this.modal.classList.add('show');
            this.isOpen = true;
            setTimeout(() => this.calculateKeyboardSize(), 50);
        },
        close: function() {
            this.modal.classList.remove('show');
            this.isOpen = false;
            this.clearHighlight();
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            KeyboardShortcuts.init();
        });
    } else {
        KeyboardShortcuts.init();
    }
})();