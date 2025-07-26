(function() {
    'use strict';
    const styles = `
        <style>
        .shortcut-modal{position: fixed;top: 0;left: 0;width: 100%;height: 100%;background: var(--0);display: none;justify-content: center;align-items: center;z-index: 10000;font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;padding: 20px;box-sizing: border-box;}
        .shortcut-modal.show{display: flex;}
        .shortcut{background: var(--1);border-radius: 12px;padding: 30px;max-height: 90vh;max-width: 95vw;width: 100%;color: var(--7);box-shadow: 0 20px 40px var(--0);border: 1px solid var(--3);display: flex;flex-direction: column;position: relative;}
        .shortcut-header{display: flex;flex-direction: column;margin-bottom: 30px;flex-shrink: 0;}
        .shortcut-title{font-size: 28px;margin-bottom: 20px;color: var(--a);font-weight: 600;text-align: center;order: 1;}
        .commands-list{display: grid;grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));gap: 15px;order: 2;}
        .command-item{display: flex;justify-content: space-between;align-items: center;padding: 12px 16px;background: var(--2);border-radius: 8px;border: 2px solid transparent;transition: all 0.3s ease;cursor: pointer;}
        .command-item:hover{border-color: var(--a);background: var(--3);}
        .command-item.active{border-color: var(--a);background: var(--d);}
        .command-desc{font-size: 14px;color: var(--6);}
        .command-keys{font-family: monospace;font-size: 13px;color: var(--a);font-weight: bold;}
        .keyboard-container{display: flex;justify-content: center;overflow-x: hidden;overflow-y: hidden;padding: 10px 0;flex-shrink: 0;width: 100%;box-sizing: border-box;}
        .keyboard{display: grid;gap: 4px;padding: 20px;background: var(--2);border-radius: 12px;border: 1px solid var(--4);min-width: fit-content;transform-origin: center;transition: transform 0.2s ease;}
        .keyboard-row{display: grid;gap: 4px;justify-content: center;}
        .key{background: var(--4);border: 1px solid var(--5);border-radius: 4px;color: var(--6);font-size: 11px;font-weight: 500;display: flex;align-items: center;justify-content: center;text-align: center;transition: all 0.2s ease;cursor: pointer;position: relative;min-height: 32px;padding: 2px;white-space: nowrap;}
        .key:hover{background: var(--5);border-color: var(--6);}
        .key.highlight{background: var(--a);border-color: var(--ah);color: var(--1);box-shadow: 0 0 10px var(--ah);transform: translateY(-1px);}
        .key.modifier{background: var(--3);}
        .key.modifier.highlight{background: var(--r);border-color: var(--rh);color: var(--1);}
        .close-btn{position: absolute;top: 15px;right: 20px;background: none;border: none;color: var(--5);font-size: 24px;cursor: pointer;transition: color 0.2s;z-index: 1;}
        .close-btn:hover{color: var(--7);}
        #preview-panel .shortcut-trigger-btn{position: fixed;top: 10px;left: 50%;transform: translateX(-50%);background: var(--a);border: none;border-radius: 2px;color: var(--l);padding: 8px 12px;cursor: pointer;font-size: 14px;font-weight: 500;transition: background 0.2s;z-index: 10001;}
        #preview-panel .shortcut-trigger-btn:hover{background: var(--ah);}
        @media (max-width: 800px){.shortcut{padding: 20px;}.key{min-height: 28px;font-size: 10px;}.commands-list{grid-template-columns: 1fr;}}
        @media (max-width: 600px){.shortcut{padding: 15px;max-height: 95vh;}.shortcut-title{font-size: 24px;margin-bottom: 15px;}.shortcut-header{margin-bottom: 20px;}}
        @media (max-width: 480px){.shortcut-modal{padding: 10px;}.shortcut{padding: 10px;}.keyboard-container{margin: 0 -10px;}}
        .arrow-stack{display: flex;flex-direction: column;gap: 2px;height: 32px;box-sizing: border-box;}
        .key.half-height{min-height: calc(50% - 1px) !important;height: calc(50% - 1px) !important;max-height: calc(50% - 1px);font-size: 9px;flex: none;}
        </style>
    `;
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
        },
        { 
            desc: 'Find code snippets', 
            keys: 'Control + F', 
            highlight: ['ctrl', 'f'],
            id: 'find'
        },
        { 
            desc: 'Performance mode (hide buttons)', 
            keys: 'Control + Shift + D', 
            highlight: ['ctrl', 'shift', 'd'],
            id: 'performance'
        },
        { 
            desc: 'Enable / Disable Window Focus', 
            keys: 'Control + P', 
            highlight: ['ctrl', 'p'],
            id: 'focus'
        },
        { 
            desc: 'Close any modal (hold to exit fullscreen)', 
            keys: 'Esc', 
            highlight: ['escape'],
            id: 'close'
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
        }
    ];
    function createHTML() {
        return `
        <div class="shortcut-modal" id="shortcut-modal">
            <div class="shortcut">
                <button class="close-btn" onclick="KeyboardShortcuts.close()">&times;</button>
                <div class="shortcut-header">
                    <h2 class="shortcut-title">Keyboard Shortcuts</h2>
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
            const viewportHeight = window.innerHeight;
            const modalContent = modal.querySelector('.shortcut');
            const modalPadding = viewportWidth <= 480 ? 20 : 60;
            const headerHeight = modal.querySelector('.shortcut-header').offsetHeight;
            const modalVerticalPadding = viewportWidth <= 480 ? 30 : 60;
            const keyboardContainerPadding = 40;
            const availableWidth = Math.min(viewportWidth * 0.95, 1200) - modalPadding;
            const availableHeight = (viewportHeight * 0.9) - headerHeight - modalVerticalPadding - keyboardContainerPadding;
            const baseKeyboardWidth = 900;
            const baseKeyboardHeight = 220;
            const widthScale = availableWidth / baseKeyboardWidth;
            const heightScale = availableHeight / baseKeyboardHeight;
            let scale = Math.min(widthScale, heightScale, 1);
            if (viewportWidth <= 480) {
                scale = Math.max(scale, 0.65); // Increased from 0.6
            } else if (viewportWidth <= 600) {
                scale = Math.max(scale, 0.75); // Increased from 0.7
            } else if (viewportWidth <= 800) {
                scale = Math.max(scale, 0.85); // Keep this the same
            }
            scale = Math.max(scale, 0.5); // Increased from 0.4
            keyboard.style.transform = `scale(${scale})`;
            const keys = keyboard.querySelectorAll('.key');
            keys.forEach(key => {
                if (scale < 0.7) {
                    key.style.fontSize = '10px';
                    key.style.minHeight = '28px';
                } else if (scale < 0.85) {
                    key.style.fontSize = '11px';
                    key.style.minHeight = '30px';
                } else {
                    key.style.fontSize = '11px';
                    key.style.minHeight = '32px';
                }
            });
            const halfHeightKeys = keyboard.querySelectorAll('.key.half-height');
            halfHeightKeys.forEach(key => {
                if (scale < 0.7) {
                    key.style.fontSize = '9px';
                } else {
                    key.style.fontSize = '9px';
                }
            });
        },
        init: function() {
            document.head.insertAdjacentHTML('beforeend', styles);
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
            this.modal.classList.add('show');
            this.isOpen = true;
            setTimeout(() => {
                this.calculateKeyboardSize();
            }, 50);
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