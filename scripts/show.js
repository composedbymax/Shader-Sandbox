(function () {
    'use strict';
    let isPerformanceMode = false;
    let originalStyles = new Map();
    let originalClasses = new Map();
    let wasEditorsVisible = false;
    function enterPerformanceMode() {
        const editors = document.getElementById('editors');
        wasEditorsVisible = editors && editors.style.display !== 'none';
        if (wasEditorsVisible && window.toggleEditors) {
            window.toggleEditors();
        }
        setTimeout(() => {
            const elementsToHide = [
            '#editors',
            '#divider',
            '#fsBtn',
            '#lint',
            '.lbtn',
            '#shaderWindow'
            ];
            elementsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                originalStyles.set(el, el.style.display);
                el.classList.add('performance-mode-hidden');
            });
            });
            const canvas = window.getActiveCanvas();
            const previewPanel = document.getElementById('preview-panel');
            const app = document.getElementById('app');
            if (canvas && previewPanel && app) {
            originalStyles.set('canvas', {
                width: canvas.style.width,
                height: canvas.style.height,
                position: canvas.style.position,
                top: canvas.style.top,
                left: canvas.style.left,
                zIndex: canvas.style.zIndex
            });
            originalStyles.set('previewPanel', {
                width: previewPanel.style.width,
                height: previewPanel.style.height,
                position: previewPanel.style.position,
                top: previewPanel.style.top,
                left: previewPanel.style.left,
                zIndex: previewPanel.style.zIndex
            });
            originalStyles.set('app', {
                overflow: app.style.overflow,
                gridTemplateColumns: app.style.gridTemplateColumns
            });
            originalStyles.set('activeCanvas', canvas);
            originalClasses.set(canvas, canvas.className);
            originalClasses.set(previewPanel, previewPanel.className);
            originalClasses.set(app, app.className);
            originalClasses.set(document.body, document.body.className);
            canvas.classList.add('performance-mode-canvas');
            previewPanel.classList.add('performance-mode-preview');
            app.classList.add('performance-mode-app');
            document.body.classList.add('performance-mode-body');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (window.resizeCanvas) {
                window.resizeCanvas();
            } else {
                window.dispatchEvent(new Event('resize'));
            }
            }
            isPerformanceMode = true;
        }, 20);
    }
    function exitPerformanceMode() {
        originalStyles.forEach((display, element) => {
            if (typeof element === 'string') return;
            element.classList.remove('performance-mode-hidden');
            element.style.display = display;
        });
        const canvas = originalStyles.get('activeCanvas') || window.getActiveCanvas();
        const previewPanel = document.getElementById('preview-panel');
        const app = document.getElementById('app');
        if (canvas && originalClasses.has(canvas)) {
            canvas.className = originalClasses.get(canvas);
        }
        if (previewPanel && originalClasses.has(previewPanel)) {
            previewPanel.className = originalClasses.get(previewPanel);
        }
        if (app && originalClasses.has(app)) {
            app.className = originalClasses.get(app);
        }
        if (originalClasses.has(document.body)) {
            document.body.className = originalClasses.get(document.body);
        }
        if (canvas && originalStyles.has('canvas')) {
            Object.assign(canvas.style, originalStyles.get('canvas'));
        }
        if (previewPanel && originalStyles.has('previewPanel')) {
            Object.assign(previewPanel.style, originalStyles.get('previewPanel'));
        }
        if (app && originalStyles.has('app')) {
            const s = originalStyles.get('app');
            app.style.overflow = s.overflow;
            app.style.gridTemplateColumns = s.gridTemplateColumns;
        }
        originalStyles.clear();
        originalClasses.clear();
        isPerformanceMode = false;
        setTimeout(() => {
            if (wasEditorsVisible && window.toggleEditors) {
                const editors = document.getElementById('editors');
                if (editors && editors.style.display === 'none') {
                    window.toggleEditors();
                }
            }
            if (window.resizeCanvas) {
                window.resizeCanvas();
            } else {
                window.dispatchEvent(new Event('resize'));
            }
        }, 20);
    }
    function togglePerformanceMode() {
        if (isPerformanceMode) exitPerformanceMode();
        else enterPerformanceMode();
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'D')) {
            e.preventDefault();
            togglePerformanceMode();
        }
        if (e.key === 'Escape' && isPerformanceMode) {
            exitPerformanceMode();
        }
    });
    window.addEventListener('resize', function () {
        if (isPerformanceMode) {
            const canvas = originalStyles.get('activeCanvas') || window.getActiveCanvas();
            if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            }
        }
    });
    function attachDblClick(id) {
        const el = document.getElementById(id);
        if (el && !el._showJsAttached) {
            el.addEventListener('dblclick', function (e) {
            e.preventDefault();
            togglePerformanceMode();
            });
            el._showJsAttached = true;
        }
    }
    document.addEventListener('DOMContentLoaded', function () {
    ['glcanvas', 'webgpu-canvas', 'jsCanvas', 'canvas3D'].forEach(attachDblClick);
    });
    window.webglPerformanceMode = {
        enter: enterPerformanceMode,
        exit: exitPerformanceMode,
        toggle: togglePerformanceMode,
        isActive: function () { return isPerformanceMode; }
    };
})();