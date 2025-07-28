(function() {
  const modal = document.getElementById('authModal');
  window.addEventListener('beforeunload', function(e) {
    if (modal && modal.style.display === 'block') {
      return;
    }
    e.preventDefault();
    e.returnValue = '';
  });
})();