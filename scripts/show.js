(function() {
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
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    originalStyles.set(element, element.style.display);
                    element.classList.add('performance-mode-hidden');
                });
            });
            const canvas = document.getElementById('glcanvas');
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
        originalStyles.forEach((originalDisplay, element) => {
            if (typeof element === 'string') return;
            element.classList.remove('performance-mode-hidden');
            element.style.display = originalDisplay;
        });
        const canvas = document.getElementById('glcanvas');
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
            const canvasStyles = originalStyles.get('canvas');
            Object.assign(canvas.style, canvasStyles);
        }
        if (previewPanel && originalStyles.has('previewPanel')) {
            const previewStyles = originalStyles.get('previewPanel');
            Object.assign(previewPanel.style, previewStyles);
        }
        if (app && originalStyles.has('app')) {
            const appStyles = originalStyles.get('app');
            app.style.overflow = appStyles.overflow;
            app.style.gridTemplateColumns = appStyles.gridTemplateColumns;
        }
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
        if (isPerformanceMode) {
            exitPerformanceMode();
        } else {
            enterPerformanceMode();
        }
    }
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'D')) {
            e.preventDefault();
            togglePerformanceMode();
        }
        if (e.key === 'Escape' && isPerformanceMode) {
            exitPerformanceMode();
        }
    });
    window.addEventListener('resize', function() {
        if (isPerformanceMode) {
            const canvas = document.getElementById('glcanvas');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        }
    });
    document.addEventListener('DOMContentLoaded', function() {
        const canvas = document.getElementById('glcanvas');
        if (canvas) {
            canvas.addEventListener('dblclick', function(e) {
                e.preventDefault();
                togglePerformanceMode();
            });
        }
    });
    window.webglPerformanceMode = {
        enter: enterPerformanceMode,
        exit: exitPerformanceMode,
        toggle: togglePerformanceMode,
        isActive: function() { return isPerformanceMode; }
    };
})();