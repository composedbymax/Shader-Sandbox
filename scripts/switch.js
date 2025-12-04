window.getCurrentAnimationType = function() {
  if (window.is3DModelActive?.()) return '3d';
  if (window.jsCanvasState?.isJSMode()) return 'js';
  if (window.webgpuState?.isWebGPUMode()) return 'webgpu';
  return 'webgl';
};
window.switchToAnimationType = function(type) {
  const currentType = window.getCurrentAnimationType();
  if (currentType === type) return;
  if (currentType === '3d') {
    window.deactivate3DModel?.();
  }
  if (type === 'js') document.getElementById('jsToggleBtn')?.click();
  else if (type === 'webgpu') document.getElementById('webgpuToggle')?.click();
  else if (type === 'webgl') {
    if (currentType === 'js') document.getElementById('jsToggleBtn')?.click();
    if (currentType === 'webgpu') document.getElementById('webgpuToggle')?.click();
  }
};