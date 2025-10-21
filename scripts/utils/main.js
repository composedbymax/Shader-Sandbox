!function() {
    let e = !1;
    function n() {
        const e = document.getElementById("loader-overlay");
        e && e.remove()
    }
    function r() {
        !function() {
            const e = document.createElement("style");
            e.id = "loader-style";
            e.textContent = "#loader-overlay{position: fixed;inset: 0;background: rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;}@keyframes spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}#loader-spinner{width:60px;height:60px;border:6px solid #222;border-top:6px solid #0ff;border-radius:50%;animation:spin 1s linear infinite;}",
            document.head.appendChild(e);
            const n = document.createElement("div");
            n.id = "loader-overlay",
            n.innerHTML = '<div id="loader-spinner"></div>',
            document.body.appendChild(n)
        }();
        const build = [
            "scripts/save.js",
            "scripts/gpu.js",
            "scripts/media.js",
            "scripts/link.js",
            "scripts/theme.js",
            "scripts/audio.js",
            "scripts/player.js",
            "scripts/banner.js",
            "scripts/performance.js",
            "scripts/render.js",
            "scripts/export.js",
            "scripts/recorder.js",
            "scripts/parse.js",
            "scripts/stay.js",
            "scripts/right.js",
            "scripts/info.js",
            "scripts/color.js",
            "scripts/format.js",
            "scripts/flowchart.js",
            "scripts/search.js",
            "scripts/keyboard.js",
            "scripts/show.js",
            "scripts/shuffle.js",
            "scripts/3d.js",
            "scripts/js.js",
            "scripts/camera.js",
            "scripts/sequencer.js",
            "scripts/syntax.js",
            "scripts/onboarding.js",
            "scripts/offlinesave.js",
            "scripts/api.js",
            ...(window.userLoggedIn ? ["scripts/utils/find.js"] : []),
            ...(window.userLoggedIn ? ["scripts/utils/p2p.js"] : []),
        ];
        build.reduce(((n, r) => n.then(() => new Promise((e, n) => {
            const o = document.createElement("script");
            o.src = r;
            o.onload = e;
            o.onerror = () => n(new Error(`Failed to load ${r}`));
            document.head.appendChild(o);
        }))), Promise.resolve()).then(( () => console.log("Initialized"))).catch((e => console.error(e))).finally(() => {
            n();
            const style = document.getElementById("loader-style");
            style && style.remove();
        })
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", r) : r()
}();