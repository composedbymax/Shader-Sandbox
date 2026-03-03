(function () {
  const ua = navigator.userAgent;
  const vendor = navigator.vendor || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
              navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
  const isFirefox = /Firefox\/\d+/i.test(ua);
  const isChrome = /Chrome\/\d+/i.test(ua) &&
                   /Google Inc/.test(vendor) &&
                   !/Edg\/|OPR\//i.test(ua);
  const isSafari = /Safari\/\d+/i.test(ua) &&
                   /Apple Computer/.test(vendor) &&
                   !isChrome;
  window.mobile = isMobile;
  window.isIOS = isIOS;
  window.isMac = isMac;
  window.isFirefox = isFirefox;
  window.isChrome = isChrome;
  window.isSafari = isSafari;
})();