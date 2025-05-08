!(function () {
  function e() {
    const e = document.getElementById("loader-overlay");
    e && e.remove();
  }
  function n() {
    var n;
    !(function () {
      const e = document.createElement("style");
      (e.textContent =
        "\n        #loader-overlay {\n          position: fixed;\n          top:0; left:0; right:0; bottom:0;\n          background: rgba(0, 0, 0, 0.95);\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          z-index: 9999;\n        }\n        @keyframes spin {\n          from { transform: rotate(0deg); }\n          to   { transform: rotate(360deg); }\n        }\n        #loader-spinner {\n          width: 60px;\n          height: 60px;\n          border: 6px solid #222;\n          border-top: 6px solid #0ff;\n          border-radius: 50%;\n          animation: spin 1s linear infinite;\n        }\n      "),
        document.head.appendChild(e);
      const n = document.createElement("div");
      (n.id = "loader-overlay"),
        (n.innerHTML = '<div id="loader-spinner"></div>'),
        document.body.appendChild(n);
    })(),
      ((n = [
        "anti.js",
        "save.js",
        "performance.js",
        "recorder.js",
        "script.js",
      ]),
      n.reduce(
        (e, n) =>
          e.then(
            () =>
              new Promise((e, o) => {
                const t = document.createElement("script");
                (t.src = n),
                  (t.onload = e),
                  (t.onerror = () => o(new Error(`Failed to load ${n}`))),
                  document.head.appendChild(t);
              })
          ),
        Promise.resolve()
      ))
        .then(() => console.log("All scripts loaded in order."))
        .catch((e) => console.error(e))
        .finally(e);
  }
  "loading" === document.readyState
    ? document.addEventListener("DOMContentLoaded", n)
    : n();
})();