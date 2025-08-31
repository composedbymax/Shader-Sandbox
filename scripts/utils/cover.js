(function() {
    var attemptKey = '__pageAttempts';
    var lockoutKey = '__pageLockout';
    var maxAttempts = 5;
    var timeWindow = 30000; // 30 seconds
    var lockoutDuration = 300000; // 5 minutes
    function getAttempts() {
        var stored = sessionStorage.getItem(attemptKey);
        return stored ? JSON.parse(stored) : [];
    }
    function addAttempt() {
        var attempts = getAttempts();
        var now = Date.now();
        attempts = attempts.filter(function(time) {
            return now - time < timeWindow;
        });
        attempts.push(now);
        sessionStorage.setItem(attemptKey, JSON.stringify(attempts));
        return attempts.length;
    }
    function isLockedOut() {
        var lockout = sessionStorage.getItem(lockoutKey);
        if (!lockout) return false;
        var lockoutTime = parseInt(lockout);
        var now = Date.now();
        if (now - lockoutTime > lockoutDuration) {
            sessionStorage.removeItem(lockoutKey);
            sessionStorage.removeItem(attemptKey);
            return false;
        }
        return true;
    }
    function triggerLockout() {
        sessionStorage.setItem(lockoutKey, Date.now().toString());
        showBlackScreen();
    }
    function showBlackScreen() {
        document.documentElement.innerHTML = '';
        var blackScreen = document.createElement('div');
        blackScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 2147483647;
            margin: 0;
            padding: 0;
        `;
        document.documentElement.appendChild(blackScreen);
        Object.defineProperty(document, 'body', {
            get: function() { return null; },
            set: function() {}
        });
        return;
    }
    if (isLockedOut()) {
        showBlackScreen();
        return;
    }
    var currentAttempts = addAttempt();
    if (currentAttempts >= maxAttempts) {
        triggerLockout();
        return;
    }
    var css = `
        #__pageCover{position: fixed;top: 0;left: 0;width: 100%;height: 100%;background:rgb(0, 0, 0);z-index: 2147483647;overflow: hidden;transition: opacity 1s ease;}
        #__pageCover.shatter-exit{opacity: 0;}
        #__pageCover .title-container{position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);text-align: center;z-index: 10;transition: opacity 0.4s ease, transform 0.4s ease;}
        #__pageCover .main-title{font-family: 'Courier New', monospace;font-size: clamp(2rem, 8vw, 6rem);font-weight: bold;color: #fff;margin: 0;letter-spacing: 0.1em;}
        #__pageCover .subtitle{font-family: 'Arial', sans-serif;font-size: clamp(1rem, 3vw, 1.5rem);color: rgba(255, 255, 255, 0.8);margin-top: 1rem;letter-spacing: 0.2em;text-transform: uppercase;}
        #__pageCover .grid-container{position: absolute;top: 0;left: 0;width: 100%;height: 100%;display: grid;grid-template-columns: repeat(20, 1fr);grid-template-rows: repeat(15, 1fr);gap: 1px;opacity: 1;}
        #__pageCover .grid-piece{background:rgb(0, 0, 0);border: 1px solid rgba(0, 162, 255, 0.3);position: relative;overflow: hidden;}
        #__pageCover.shatter-exit .title-container{opacity: 0;transform: translate(-50%, -50%) scale(0.8);}
        #__pageCover.shatter-exit .grid-piece{animation: __shatterPiece 1s ease-in forwards;}
        @keyframes __shatterPiece{0%{transform: scale(1) rotate(0deg);opacity: 1;}
        70%{transform: scale(0.8) rotate(var(--rotate)) translateX(var(--tx)) translateY(var(--ty));opacity: 0.3;}
        100%{transform: scale(0) rotate(calc(var(--rotate) * 2)) translateX(calc(var(--tx) * 2)) translateY(calc(var(--ty) * 2));opacity: 0;}}
    `;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var cover = document.createElement('div');
    cover.id = '__pageCover';
    var titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    titleContainer.innerHTML = `
        <h1 class="main-title">Shader Sandbox</h1>
        <div class="subtitle">Created By: Max Warren</div>
    `;
    var gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    for (var i = 0; i < 300; i++) {
        var piece = document.createElement('div');
        piece.className = 'grid-piece';
        var rotate = (Math.random() - 0.5) * 720;
        var tx = (Math.random() - 0.5) * 200;
        var ty = (Math.random() - 0.5) * 200;
        var delay = Math.random() * 0.3;
        piece.style.setProperty('--rotate', rotate + 'deg');
        piece.style.setProperty('--tx', tx + 'px');
        piece.style.setProperty('--ty', ty + 'px');
        piece.style.animationDelay = delay + 's';
        gridContainer.appendChild(piece);
    }
    cover.appendChild(titleContainer);
    cover.appendChild(gridContainer);
    document.documentElement.appendChild(cover);
    window.addEventListener('load', function() {
        setTimeout(function() {
            cover.classList.add('shatter-exit');
            setTimeout(function() {
                cover.remove();
                st.remove();
            }, 1000);
        }, 900);
    });
})();