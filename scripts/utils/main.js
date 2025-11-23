!function() {
    let e = !1;
    const key = '01z7L6a';
    function decrypt(encoded) {
        const data = atob(encoded);
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return JSON.parse(result);
    }
    function n() {
        const e = document.getElementById("loader-overlay");
        e && e.remove();
    }
    function createLoader() {
        const e = document.createElement("style");
        e.id = "loader-style";
        e.textContent = "#loader-overlay{position: fixed;inset: 0;background: rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;}@keyframes spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}#loader-spinner{width:60px;height:60px;border:6px solid #222;border-top:6px solid #0ff;border-radius:50%;animation:spin 1s linear infinite;}";
        document.head.appendChild(e);
        const overlay = document.createElement("div");
        overlay.id = "loader-overlay";
        overlay.innerHTML = '<div id="loader-spinner"></div>';
        document.body.appendChild(overlay);
    }
    async function loadProtectedScripts() {
        if (!window.userLoggedIn) {
            return [];
        }
        try {
            const response = await fetch('api/load.php');
            if (!response.ok) {
                console.warn('Could not load protected scripts');
                return [];
            }
            const encrypted = await response.json();
            const data = decrypt(encrypted.data);
            return data.scripts || [];
        } catch (error) {
            console.warn('Error loading protected scripts:', error);
            return [];
        }
    }
    async function r() {
        createLoader();
        const baseScripts = [
            "scripts/switch.js",
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
        ];
        const protectedScripts = await loadProtectedScripts();
        const build = [...baseScripts, ...protectedScripts];
        build.reduce(((n, r) => n.then(() => new Promise((e, n) => {
            const o = document.createElement("script");
            o.src = r;
            o.onload = e;
            o.onerror = () => n(new Error(`Failed to load ${r}`));
            document.head.appendChild(o);
        }))), Promise.resolve())
        .then(() => console.log("Initialized"))
        .catch(e => console.error(e))
        .finally(() => {
            n();
            const style = document.getElementById("loader-style");
            style && style.remove();
        });
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", r) : r();
}();