(function () {
    'use strict';
    let isPerformanceMode = false;
    let originalStyles = new Map();
    let originalClasses = new Map();
    let wasEditorsVisible = false;
    function saveStyle(key, el, props) {
        originalStyles.set(key, props.reduce((acc, p) => {
            acc[p] = el.style[p];
            return acc;
        }, {}));
    }
	function restoreStyle(key, el) {
		if (originalStyles.has(key)) {
			Object.assign(el.style, originalStyles.get(key));
		}
	}
	function saveClass(el) {
		originalClasses.set(el, el.className);
	}
	function restoreClass(el) {
		if (originalClasses.has(el)) {
			el.className = originalClasses.get(el);
		}
	}
	function triggerResize() {
		window.resizeCanvas
			? window.resizeCanvas()
			: window.dispatchEvent(new Event('resize'));
	}
	function enterPerformanceMode() {
		const editors = $('editors');
		wasEditorsVisible = editors && editors.style.display !== 'none';
		if (wasEditorsVisible && window.toggleEditors) {
			window.toggleEditors();
		}
		setTimeout(() => {
			[
				'#editors', '#divider', '#fsBtn',
				'#lint', '.lbtn', '#shaderWindow'
			].forEach(sel => {
				document.querySelectorAll(sel).forEach(el => {
					originalStyles.set(el, el.style.display);
					el.classList.add('performance-mode-hidden');
				});
			});
			const canvas = window.getActiveCanvas();
			const preview = $('preview-panel');
			const app = $('app');
			if (!canvas || !preview || !app) return;
			originalStyles.set('activeCanvas', canvas);
			saveStyle('canvas', canvas, ['width','height','position','top','left','zIndex']);
			saveStyle('preview', preview, ['width','height','position','top','left','zIndex']);
			saveStyle('app', app, ['overflow','gridTemplateColumns']);
			[canvas, preview, app, document.body].forEach(saveClass);
			canvas.classList.add('performance-mode-canvas');
			preview.classList.add('performance-mode-preview');
			app.classList.add('performance-mode-app');
			document.body.classList.add('performance-mode-body');
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			triggerResize();
			isPerformanceMode = true;
		}, 20);
	}
	function exitPerformanceMode() {
		originalStyles.forEach((val, el) => {
			if (typeof el === 'string') return;
			el.classList.remove('performance-mode-hidden');
			el.style.display = val;
		});
		const canvas = originalStyles.get('activeCanvas') || window.getActiveCanvas();
		const preview = $('preview-panel');
		const app = $('app');
		[canvas, preview, app, document.body].forEach(restoreClass);
		if (canvas) restoreStyle('canvas', canvas);
		if (preview) restoreStyle('preview', preview);
		if (app) restoreStyle('app', app);
		originalStyles.clear();
		originalClasses.clear();
		isPerformanceMode = false;
		setTimeout(() => {
			const editors = $('editors');
			if (wasEditorsVisible && window.toggleEditors && editors?.style.display === 'none') {
				window.toggleEditors();
			}
			triggerResize();
		}, 20);
	}
	function togglePerformanceMode() {
		isPerformanceMode ? exitPerformanceMode() : enterPerformanceMode();
	}
	document.addEventListener('keydown', e => {
		if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'D')) {
			e.preventDefault();
			togglePerformanceMode();
		}
		if (e.key === 'Escape' && isPerformanceMode) {
			exitPerformanceMode();
		}
	});
	window.addEventListener('resize', () => {
		if (!isPerformanceMode) return;
		const canvas = originalStyles.get('activeCanvas') || window.getActiveCanvas();
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	});
	function attachDblClick(id) {
		const el = $(id);
		if (!el || el._showJsAttached) return;
		el.addEventListener('dblclick', e => {
			e.preventDefault();
			togglePerformanceMode();
		});
    	el._showJsAttached = true;
    }
    document.addEventListener('DOMContentLoaded', () => {
    	['glcanvas', 'webgpu-canvas', 'jsCanvas', 'canvas3D'].forEach(attachDblClick);
    });
    window.webglPerformanceMode = {
        enter: enterPerformanceMode,
        exit: exitPerformanceMode,
        toggle: togglePerformanceMode,
        isActive: () => isPerformanceMode
    };
})();