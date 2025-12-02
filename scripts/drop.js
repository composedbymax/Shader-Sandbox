(function() {
  const previewPanel = document.getElementById('preview-panel');
  if (!previewPanel) {
    console.error('Preview panel not found');
    return;
  }
  const dragOverlay = document.createElement('div');
  dragOverlay.id = 'mediaDragOverlay';
  dragOverlay.innerHTML = `
    <div>Drop file to upload</div>
    <div class="filename"></div>
  `;
  previewPanel.appendChild(dragOverlay);
  const filenameDiv = dragOverlay.querySelector('.filename');
  let dragCounter = 0;
  function isOverPreviewPanel(e) {
    const rect = previewPanel.getBoundingClientRect();
    return (
      e.clientX >= rect.left && 
      e.clientX <= rect.right && 
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
    );
  }
  function hasValidFile(dataTransfer) {
    if (!dataTransfer.items) return false;
    return [...dataTransfer.items].some(item => {
      if (item.kind !== 'file') return false;
      if (item.type.startsWith('image/') || 
          item.type.startsWith('video/') || 
          item.type.startsWith('audio/')) {
        return true;
      }
      if (item.type === 'text/html' || 
          item.type === 'text/plain' || 
          item.type === 'application/javascript' ||
          item.type === 'text/javascript') {
        return true;
      }
      if (item.type === '' || !item.type) {
        return true;
      }
      return false;
    });
  }
  function getFilename(dataTransfer) {
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      const item = dataTransfer.items[0];
      if (item.type) {
        if (dataTransfer.files && dataTransfer.files.length > 0) {
          return dataTransfer.files[0].name;
        }
        const file = item.getAsFile();
        return file?.name || 'File';
      }
      return 'Code/Shader file';
    }
    return 'File';
  }
  function getFileType(file) {
    if (file.type.startsWith('image/') || 
        file.name.toLowerCase().endsWith('.heic') || 
        file.name.toLowerCase().endsWith('.heif')) {
      return 'image';
    }
    if (file.type.startsWith('video/')) {
      return 'video';
    }
    if (file.type.startsWith('audio/')) {
      return 'audio';
    }
    const ext = file.name.split('.').pop().toLowerCase();
    const codeExtensions = ['html', 'js', 'frag', 'vert', 'vs', 'fs', 'wgsl', 'txt'];
    if (codeExtensions.includes(ext)) {
      return 'code';
    }
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'];
    if (audioExtensions.includes(ext)) {
      return 'audio';
    }
    return 'unknown';
  }
  window.mediaUpload = window.mediaUpload || {};
  window.mediaUpload.isModalOpen = function() {
    const modal = document.getElementById('mediaModal');
    const audioModal = document.querySelector('.audio-reactive-modal');
    return (modal && modal.style.display === 'flex') || 
           (audioModal && audioModal.style.display === 'block');
  };
  window.mediaUpload.onFileReceived = null;
  window.mediaUpload.onCodeFileReceived = null;
  window.mediaUpload.onAudioFileReceived = null;
  window.mediaUpload.showDragOverlay = function(show, filename = '') {
    if (show) {
      filenameDiv.textContent = filename || 'File';
      dragOverlay.style.display = 'flex';
    } else {
      dragOverlay.style.display = 'none';
    }
  };
  function handleFile(file) {
    if (!file) return;
    const fileType = getFileType(file);
    if (fileType === 'unknown') {
      if (window.showToast) {
        window.showToast(`Unsupported file type: ${file.name}`, 'error');
      }
      return;
    }
    if (fileType === 'image' || fileType === 'video') {
      if (window.mediaUpload.onFileReceived) {
        window.mediaUpload.onFileReceived(file);
      } else {
        console.warn('No media file handler registered');
      }
      return;
    }
    if (fileType === 'audio') {
      if (window.mediaUpload.onAudioFileReceived) {
        window.mediaUpload.onAudioFileReceived(file);
      } else if (window.audioReactiveInstance) {
        window.audioReactiveInstance.show();
        setTimeout(() => {
          window.audioReactiveInstance.loadFileFromDrop(file);
        }, 100);
      } else {
        console.warn('No audio file handler registered');
      }
      return;
    }
    if (fileType === 'code') {
      if (window.mediaUpload.onCodeFileReceived) {
        window.mediaUpload.onCodeFileReceived(file);
      } else {
        const fileInput = document.getElementById('uploadHTMLInput');
        if (fileInput) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          console.warn('No code file handler registered and uploadHTMLInput not found');
        }
      }
    }
  }
  window.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    if (
      !window.mediaUpload.isModalOpen() &&
      hasValidFile(e.dataTransfer) &&
      isOverPreviewPanel(e)
    ) {
      const filename = getFilename(e.dataTransfer);
      filenameDiv.textContent = filename;
      dragOverlay.style.display = 'flex';
    }
  });
  window.addEventListener('dragover', e => {
    e.preventDefault();
  });
  window.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter = Math.max(dragCounter - 1, 0);
    if (!isOverPreviewPanel(e) || dragCounter === 0) {
      dragOverlay.style.display = 'none';
    }
  });
  window.addEventListener('drop', e => {
    e.preventDefault();
    dragOverlay.style.display = 'none';
    dragCounter = 0;
    const file = e.dataTransfer.files[0];
    if (file && isOverPreviewPanel(e)) {
      const fileType = getFileType(file);
      if (fileType !== 'unknown') {
        handleFile(file);
        if (fileType === 'image' || fileType === 'video') {
          const modal = document.getElementById('mediaModal');
          if (modal) {
            modal.style.display = 'flex';
          }
        }
      }
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    parent.appendChild(dragOverlay);
  });
  window.addEventListener('beforeunload', () => {
    dragCounter = 0;
    dragOverlay.style.display = 'none';
  });
})();