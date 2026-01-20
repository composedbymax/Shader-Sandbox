(function () {
  const modalHTML = `
    <div class="download-modal-overlay" id="downloadModal">
      <div class="download-modal">
        <h2>Download Offline Version</h2>
        <p>Do you want to download <strong>offline.html</strong>?</p>
        <div class="sdownload-sbtn-row">
          <button class="sdownload-sbtn sbtn-cancel" id="cancelDownload">Cancel</button>
          <button class="sdownload-sbtn sbtn-confirm" id="confirmDownload">Download</button>
        </div>
      </div>
    </div>
  `;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  const modal = wrapper.firstElementChild;
  const cancelBtn = modal.querySelector('#cancelDownload');
  const confirmBtn = modal.querySelector('#confirmDownload');
  function mountModal() {
    const fsParent = document.fullscreenElement || document.body;
    if (modal.parentNode !== fsParent) {
      modal.remove();
      fsParent.appendChild(modal);
    }
  }
  function showModal() {
    mountModal();
    modal.classList.add('active');
  }
  function hideModal() {
    modal.classList.remove('active');
  }
  function triggerServerDownload(filename = 'offline.html') {
    const a = document.createElement('a');
    a.href = filename;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  document.addEventListener('fullscreenchange', mountModal);
  cancelBtn.addEventListener('click', hideModal);
  confirmBtn.addEventListener('click', () => {
    hideModal();
    triggerServerDownload();
  });
  window.addEventListener(
    'keydown',
    e => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        hideModal();
        return;
      }
      const isSave =
        (e.key === 's' || e.key === 'S') &&
        (e.ctrlKey || e.metaKey);
      if (!isSave) return;
      e.preventDefault();
      showModal();
    },
    { passive: false }
  );
  window.addEventListener('contextmenu', e => e.preventDefault());
})();