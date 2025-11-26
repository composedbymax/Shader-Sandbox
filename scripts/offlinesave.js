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
  document.body.appendChild(wrapper);
  const modal = document.getElementById('downloadModal');
  const sbtnCancel = document.getElementById('cancelDownload');
  const sbtnConfirm = document.getElementById('confirmDownload');
  function showModal() {modal.classList.add('active');}
  function hideModal() {modal.classList.remove('active');}
  function triggerServerDownload(filename = 'offline.html') {
    const a = document.createElement('a');
    a.href = filename;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  sbtnCancel.addEventListener('click', hideModal);
  sbtnConfirm.addEventListener('click', () => {
    hideModal();
    triggerServerDownload('offline.html');
  });
  window.addEventListener(
    'keydown',
    function (e) {
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