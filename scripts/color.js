class ColorPicker {
    constructor() {
        this.isInitialized = false;
        this.currentTextarea = null;
        this.currentMatch = null;
        this.currentStartPos = 0;
        this.currentEndPos = 0;
        this.tabElement = null;
        this.originalValues = { r: 0, g: 0, b: 0 };
        this.tabRemovalTimeout = null;
        this.clickOutsideHandler = null;
        this.init();
    }
    ColorRegex() {
        return /\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*\)/g;
    }
    init() {
        if (this.isInitialized) return;
        this.HTML();
        this.bind();
        this.attachToTextareas();
        this.setupFullscreenHandler();
        this.isInitialized = true;
    }
    setupFullscreenHandler() {
        document.addEventListener('fullscreenchange', () => {
            const overlay = document.getElementById('glsl-color-picker-overlay');
            const tab = this.tabElement;
            if (document.fullscreenElement) {
                if (overlay) {document.fullscreenElement.appendChild(overlay);}
                if (tab) {document.fullscreenElement.appendChild(tab);}
            } else {
                if (overlay) {document.body.appendChild(overlay);}
                if (tab) {document.body.appendChild(tab);}
            }
        });
    }
    HTML() {
        if (document.getElementById('glsl-color-picker-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'glsl-color-picker-overlay';
        overlay.id = 'glsl-color-picker-overlay';
        overlay.innerHTML = `
            <div class="glsl-color-picker" id="glsl-color-picker">
                <h3>Edit GLSL Color</h3>
                <div class="glsl-color-preview" id="glsl-color-preview"></div>
                <div class="glsl-color-inputs">
                    <div class="glsl-input-group">
                        <label for="glsl-red">Red</label>
                        <input type="number" id="glsl-red" step="0.01" min="0" max="2">
                    </div>
                    <div class="glsl-input-group">
                        <label for="glsl-green">Green</label>
                        <input type="number" id="glsl-green" step="0.01" min="0" max="2">
                    </div>
                    <div class="glsl-input-group">
                        <label for="glsl-blue">Blue</label>
                        <input type="number" id="glsl-blue" step="0.01" min="0" max="2">
                    </div>
                </div>
                <div class="glsl-color-sliders">
                    <div class="glsl-slider-group">
                        <label for="glsl-red-slider">R</label>
                        <input type="range" id="glsl-red-slider" min="0" max="2" step="0.01">
                        <span id="glsl-red-value">0.00</span>
                    </div>
                    <div class="glsl-slider-group">
                        <label for="glsl-green-slider">G</label>
                        <input type="range" id="glsl-green-slider" min="0" max="2" step="0.01">
                        <span id="glsl-green-value">0.00</span>
                    </div>
                    <div class="glsl-slider-group">
                        <label for="glsl-blue-slider">B</label>
                        <input type="range" id="glsl-blue-slider" min="0" max="2" step="0.01">
                        <span id="glsl-blue-value">0.00</span>
                    </div>
                </div>
                <div class="glsl-color-buttons">
                    <button class="glsl-btn glsl-btn-cancel" id="glsl-cancel">Cancel</button>
                    <button class="glsl-btn glsl-btn-apply" id="glsl-apply">Apply</button>
                </div>
            </div>
        `;
        const targetElement = document.fullscreenElement || document.body;
        targetElement.appendChild(overlay);
    }
    bind() {
        const overlay = document.getElementById('glsl-color-picker-overlay');
        const redInput = document.getElementById('glsl-red');
        const greenInput = document.getElementById('glsl-green');
        const blueInput = document.getElementById('glsl-blue');
        const redSlider = document.getElementById('glsl-red-slider');
        const greenSlider = document.getElementById('glsl-green-slider');
        const blueSlider = document.getElementById('glsl-blue-slider');
        const cancelBtn = document.getElementById('glsl-cancel');
        const applyBtn = document.getElementById('glsl-apply');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.cancelPicker();
            }
        });
        const syncValues = (updateTextarea = false) => {
            const r = parseFloat(redInput.value) || 0;
            const g = parseFloat(greenInput.value) || 0;
            const b = parseFloat(blueInput.value) || 0;
            redSlider.value   = r;
            greenSlider.value = g;
            blueSlider.value  = b;
            document.getElementById('glsl-red-value').textContent   = r.toFixed(2);
            document.getElementById('glsl-green-value').textContent = g.toFixed(2);
            document.getElementById('glsl-blue-value').textContent  = b.toFixed(2);
            this.updatePreview(r, g, b);
            if (updateTextarea) {
                this.updateEditors(r, g, b);
                this.highlightColor(
                    this.currentTextarea,
                    this.currentStartPos,
                    this.currentEndPos
                );
            }
        };
        [redInput, greenInput, blueInput].forEach(input => {
            input.addEventListener('input', () => syncValues(false));
        });
        [redSlider, greenSlider, blueSlider].forEach((slider, index) => {
            slider.addEventListener('input', () => {
                const inputs = [redInput, greenInput, blueInput];
                inputs[index].value = slider.value;
                syncValues(true);
            });
        });
        cancelBtn.addEventListener('click', () => this.cancelPicker());
        applyBtn.addEventListener('click', () => this.applyColor());
        document.addEventListener('keydown', (e) => {
            const overlayEl = document.getElementById('glsl-color-picker-overlay');
            if (overlayEl.style.display === 'block') {
                if (e.key === 'Escape') {
                    this.cancelPicker();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    this.applyColor();
                }
            }
        });
    }
    updateEditors(r, g, b) {
        if (!this.currentTextarea) return;
        const newColorString = `(${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)})`;
        const text = this.currentTextarea.value;
        const newText = text.substring(0, this.currentStartPos) +
                        newColorString +
                        text.substring(this.currentEndPos);
        this.currentEndPos = this.currentStartPos + newColorString.length;
        this.currentTextarea.value = newText;
        const event = new Event('input', { bubbles: true });
        this.currentTextarea.dispatchEvent(event);
    }
    attachToTextareas() {
        const checkTextareas = () => {
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                if (!textarea.dataset.glslColorPickerAttached) {
                    this.attachToTextarea(textarea);
                    textarea.dataset.glslColorPickerAttached = 'true';
                }
            });
        };
        checkTextareas();
        const observer = new MutationObserver(checkTextareas);
        observer.observe(document.body, { childList: true, subtree: true });
    }
    attachToTextarea(textarea) {
        const clickHandler = (e) => this.handleTextareaClick(e, textarea);
        textarea.addEventListener('click', clickHandler);
        textarea._glslClickHandler = clickHandler;
    }
    handleTextareaClick(e, textarea) {
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;
        const colorRegex = this.ColorRegex();
        let match;
        while ((match = colorRegex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (cursorPos >= start && cursorPos <= end) {
                setTimeout(() => {
                    this.showTab(e.clientX, e.clientY, textarea, match, start, end);
                }, 10);
                return;
            }
        }
        this.removeTab();
    }
    showTab(x, y, textarea, match, startPos, endPos) {
        this.removeTab();
        const tab = document.createElement('div');
        tab.className = 'glsl-tab';
        tab.innerHTML = `
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <g transform="scale(0.09)">
                <path fill="var(--7)" d="M254.141,53.244C224.508,18.909,185.299,0,143.736,0c-35.062,0-68.197,13.458-93.302,37.9 C10.383,76.892-2.822,123.282,14.207,165.178c13.868,34.122,45.625,57.954,77.227,57.954c0.841,0,1.671-0.016,2.508-0.053 c4.705-0.194,9.249-0.586,13.646-0.966c5.309-0.462,10.325-0.895,14.77-0.895c10.54,0,19.645,0,19.645,26.846 c0,28.811,17.538,48.934,42.65,48.936c0.002,0,0.002,0,0.004,0c17.864,0,37.651-10.342,57.215-29.903 c25.882-25.88,43.099-62.198,47.234-99.64C293.762,125.326,281.343,84.763,254.141,53.244z M227.315,252.54 c-15.397,15.398-30.55,23.877-42.66,23.875c-16.288,0-22.064-15.274-22.064-28.352c0-32.357-12.786-47.43-40.232-47.43 c-5.333,0-10.778,0.472-16.545,0.969c-4.169,0.359-8.481,0.733-12.724,0.909c-0.553,0.024-1.102,0.034-1.655,0.034 c-23.07,0-47.529-18.975-58.156-45.118c-13.714-33.738-2.225-71.927,31.519-104.779c21.239-20.676,49.272-32.063,78.939-32.063 c35.485,0,69.159,16.373,94.82,46.107C289.187,125.359,272.6,207.256,227.315,252.54z"/>
                <path d="M192.654,165.877c0,17.213,13.918,31.217,31.026,31.217c17.107,0,31.025-14.004,31.025-31.217 c0-17.215-13.918-31.219-31.025-31.219C206.572,134.658,192.654,148.662,192.654,165.877z M234.118,165.877 c0,5.861-4.682,10.633-10.438,10.633c-5.756,0-10.438-4.771-10.438-10.633c0-5.863,4.683-10.633,10.438-10.633 C229.436,155.244,234.118,160.014,234.118,165.877z"/>
                <path d="M226.914,93.489c0-17.215-13.917-31.219-31.025-31.219c-17.107,0-31.025,14.004-31.025,31.219 c0,17.211,13.918,31.218,31.025,31.218C212.997,124.707,226.914,110.7,226.914,93.489z M185.45,93.489 c0-5.865,4.684-10.632,10.439-10.632c5.756,0,10.438,4.767,10.438,10.632c0,5.86-4.683,10.633-10.438,10.633 C190.133,104.122,185.45,99.35,185.45,93.489z"/>
                <path d="M124.863,39.627c-17.107,0-31.025,14.004-31.025,31.217c0,17.213,13.918,31.217,31.025,31.217s31.025-14.004,31.025-31.217 C155.888,53.631,141.97,39.627,124.863,39.627z M124.863,81.478c-5.756,0-10.438-4.771-10.438-10.634 c0-5.863,4.682-10.633,10.438-10.633c5.756,0,10.438,4.77,10.438,10.633C135.3,76.707,130.619,81.478,124.863,81.478z"/>
                <path d="M70.821,92.809c-17.107,0-31.026,14.004-31.026,31.217c0,17.214,13.919,31.219,31.026,31.219s31.024-14.005,31.024-31.219 C101.845,106.813,87.928,92.809,70.821,92.809z M70.821,134.658c-5.757,0-10.439-4.77-10.439-10.633 c0-5.861,4.683-10.63,10.439-10.63c5.755,0,10.438,4.769,10.438,10.63C81.259,129.889,76.576,134.658,70.821,134.658z"/>
            </g>
            </svg>
        `;
        tab.style.left = (x + 5) + 'px';
        tab.style.top = (y + 5) + 'px';
        const tabClickHandler = (evt) => {
            this.openPicker(textarea, match, startPos, endPos, x, y);
            this.removeTab();
        };
        tab.addEventListener('click', tabClickHandler);
        const targetElement = document.fullscreenElement || document.body;
        targetElement.appendChild(tab);
        this.tabElement = tab;
        this.removeClickOutsideHandler();
        this.clickOutsideHandler = (evt) => {
            const clickedNode = evt.target;
            if (
                this.tabElement &&
                !this.tabElement.contains(clickedNode) &&
                !textarea.contains(clickedNode)
            ) {
                this.removeTab();
                this.removeClickOutsideHandler();
            }
        };
        setTimeout(() => {
            document.addEventListener('click', this.clickOutsideHandler);
        }, 50);
        this.tabRemovalTimeout = setTimeout(() => {
            this.removeTab();
        }, 5000);
    }
    removeTab() {
        if (this.tabRemovalTimeout) {
            clearTimeout(this.tabRemovalTimeout);
            this.tabRemovalTimeout = null;
        }
        if (this.tabElement) {
            this.tabElement.remove();
            this.tabElement = null;
        }
        this.removeClickOutsideHandler();
    }
    removeClickOutsideHandler() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
    }
    positionPicker(x, y) {
        const overlay = document.getElementById('glsl-color-picker-overlay');
        const picker = document.getElementById('glsl-color-picker');
        picker.style.visibility = 'hidden';
        overlay.style.display = 'block';
        const pickerRect = picker.getBoundingClientRect();
        const pickerWidth = pickerRect.width;
        const pickerHeight = pickerRect.height;
        picker.style.visibility = 'visible';
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 20;
        let left = x;
        let top = y + 30;
        if (left + pickerWidth + margin > viewportWidth) {
            left = viewportWidth - pickerWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }
        if (top + pickerHeight + margin > viewportHeight) {
            const topAbove = y - pickerHeight - 30;
            if (topAbove >= margin) {
                top = topAbove;
            } else {
                top = Math.max(margin, (viewportHeight - pickerHeight) / 2);
            }
        }
        picker.style.left = left + 'px';
        picker.style.top = top + 'px';
    }
    openPicker(textarea, match, startPos, endPos, x, y) {
        this.currentTextarea = textarea;
        this.currentMatch = match;
        this.currentStartPos = startPos;
        this.currentEndPos = endPos;
        const r = parseFloat(match[1]);
        const g = parseFloat(match[2]);
        const b = parseFloat(match[3]);
        this.originalValues = { r, g, b };
        document.getElementById('glsl-red').value = r;
        document.getElementById('glsl-green').value = g;
        document.getElementById('glsl-blue').value = b;
        document.getElementById('glsl-red-slider').value = r;
        document.getElementById('glsl-green-slider').value = g;
        document.getElementById('glsl-blue-slider').value = b;
        document.getElementById('glsl-red-value').textContent = r.toFixed(2);
        document.getElementById('glsl-green-value').textContent = g.toFixed(2);
        document.getElementById('glsl-blue-value').textContent = b.toFixed(2);
        this.updatePreview(r, g, b);
        this.positionPicker(x, y);
        document.getElementById('glsl-color-picker-overlay').style.display = 'block';
        this.highlightColor(textarea, startPos, endPos);
    }
    updatePreview(r, g, b) {
        const preview = document.getElementById('glsl-color-preview');
        const cssR = Math.min(255, Math.max(0, Math.round(r * 255)));
        const cssG = Math.min(255, Math.max(0, Math.round(g * 255)));
        const cssB = Math.min(255, Math.max(0, Math.round(b * 255)));
        preview.style.backgroundColor = `rgb(${cssR}, ${cssG}, ${cssB})`;
    }
    highlightColor(textarea, start, end) {
        textarea.focus();
        textarea.setSelectionRange(start, end);
    }
    applyColor() {
        if (!this.currentTextarea) return;
        const r = parseFloat(document.getElementById('glsl-red').value) || 0;
        const g = parseFloat(document.getElementById('glsl-green').value) || 0;
        const b = parseFloat(document.getElementById('glsl-blue').value) || 0;
        const newColorString = `(${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)})`;
        const text = this.currentTextarea.value;
        const newText = text.substring(0, this.currentStartPos) +
                        newColorString +
                        text.substring(this.currentEndPos);
        this.currentTextarea.value = newText;
        const event = new Event('input', { bubbles: true });
        this.currentTextarea.dispatchEvent(event);
        this.closePicker();
    }
    cancelPicker() {
        if (this.currentTextarea && this.originalValues) {
            const originalColorString = `(${this.originalValues.r.toFixed(1)}, ${this.originalValues.g.toFixed(1)}, ${this.originalValues.b.toFixed(1)})`;
            const text = this.currentTextarea.value;
            const newText = text.substring(0, this.currentStartPos) +
                            originalColorString +
                            text.substring(this.currentEndPos);
            this.currentTextarea.value = newText;
            const event = new Event('input', { bubbles: true });
            this.currentTextarea.dispatchEvent(event);
        }
        this.closePicker();
    }
    closePicker() {
        document.getElementById('glsl-color-picker-overlay').style.display = 'none';
        this.currentTextarea = null;
        this.currentMatch = null;
        this.originalValues = { r: 0, g: 0, b: 0 };
        this.removeTab();
    }
    highlightColorsInTextarea(textarea) {
        const text = textarea.value;
        const colorRegex = this.ColorRegex();
        let match;
        const colors = [];
        while ((match = colorRegex.exec(text)) !== null) {
            colors.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                r: parseFloat(match[1]),
                g: parseFloat(match[2]),
                b: parseFloat(match[3])
            });
        }
        return colors;
    }
    destroy() {
        this.removeTab();
        this.removeClickOutsideHandler();
        const overlay = document.getElementById('glsl-color-picker-overlay');
        if (overlay) {
            overlay.remove();
        }
        const textareas = document.querySelectorAll('textarea[data-glsl-color-picker-attached]');
        textareas.forEach(textarea => {
            if (textarea._glslClickHandler) {
                textarea.removeEventListener('click', textarea._glslClickHandler);
                delete textarea._glslClickHandler;
            }
            delete textarea.dataset.glslColorPickerAttached;
        });
        this.isInitialized = false;
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.ColorPicker = new ColorPicker();
        } catch (error) {
            console.error('Failed to initialize GLSL Color Picker:', error);
        }
    });
} else {
    try {
        window.ColorPicker = new ColorPicker();
    } catch (error) {
        console.error('Failed to initialize GLSL Color Picker:', error);
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorPicker;
}