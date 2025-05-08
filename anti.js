!(function () {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return;
  function n() {
    throw (
      ((document.documentElement.innerHTML =
        '\n        <div style="\n          position:fixed; inset:0;\n          background:#000; color:#fff;\n          display:flex; align-items:center; justify-content:center;\n          font:2rem sans-serif;\n        ">\ngithub.com/composedbymax \n        </div>'),
      new Error("Debugging blocked"))
    );
  }
  function e() {
    return (
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160
    );
  }
  let t;
  !document.hidden && e() && n(),
    (function () {
      const e = new Image();
      Object.defineProperty(e, "id", { get: n }),
        console.log(e),
        console.clear && console.clear();
    })(),
    window.addEventListener("resize", () => {
      clearTimeout(t),
        (t = setTimeout(() => {
          !document.hidden && e() && n();
        }, 200));
    }),
    setInterval(() => {
      if (document.hidden) return;
      const e = performance.now();
      performance.now() - e > 100 && n();
    }, 1e3),
    (function () {
      const e = Function.prototype.toString;
      Function.prototype.toString = function () {
        const t = e.apply(this, arguments);
        return /\[native code\]/.test(t) || n(), t;
      };
    })(),
    setTimeout(() => {
      !document.hidden && e() && n();
    }, 500);
})();