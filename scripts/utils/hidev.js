!(function () {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return;
  let hasGreeted = false;
  function greet() {
  if (hasGreeted) return;
  hasGreeted = true;
  const glsl = `
░█▀▀░█░█░█▀█░█▀▄░█▀▀░█▀▄    
░▀▀█░█▀█░█▀█░█░█░█▀▀░█▀▄    
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀▀░▀░▀    
░█▀▀░█▀█░█▀█░█▀▄░█▀▄░█▀█░█░█
░▀▀█░█▀█░█░█░█░█░█▀▄░█░█░▄▀▄
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀░░▀▀▀░▀░▀
`;
    console.group('%c' + glsl, 'font-size:1rem; color:#00ffcc; font-weight:extra-bold; font-family: monospace; white-space: pre;');
    console.log('%cThis Site/App was created by: %cMax Warren', 'font-size:1rem; color:#dadada;', 'font-size:1rem; color:#fff; font-weight:bold;');
    console.log('%cContribute or ask questions: %ccompositionsbymax@gmail.com', 'font-size:1rem; color:#dadada;', 'font-size:0.8rem; color:#51f6d5;');
    console.log('%cGithub Repo: %cgithub.com/composedbymax/WebGL-Sandbox', 'font-size:1rem; color:#dadada;', 'font-size:0.8rem; color:#51f6d5;');
    console.groupEnd();
  }
  function isDevToolsOpen() {
    return (
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160
    );
  }
  if (!document.hidden && isDevToolsOpen()) {
    greet();
  }
  setInterval(() => {
    if (!document.hidden && isDevToolsOpen()) {
      greet();
    }
  }, 1000);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!document.hidden && isDevToolsOpen()) {
        greet();
      }
    }, 200);
  });
  (function () {
    const orig = Function.prototype.toString;
    Function.prototype.toString = function () {
      const result = orig.apply(this, arguments);
      if (!hasGreeted && /\[native code\]/.test(result)) {
        greet();
      }
      return result;
    };
  })();
})();