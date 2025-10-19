(function () {
  function triggerServerDownload(filename = 'offline.html') {
    const a = document.createElement('a');
    a.href = filename;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.addEventListener('keydown', function (e) {
    const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
    if (!isSave) return;
    e.preventDefault();
    if (confirm('Download Offline App Version')) {
      triggerServerDownload('offline.html');
    }
  }, { passive: false });
  window.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
})();