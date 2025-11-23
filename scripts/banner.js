(function () {
  'use strict';
  window.bannerDismissed = false;
  const TUTORIAL_KEY = 'tutorial_state';
  const MAX_AUTO_SHOWS = 10;
  const USER_GLOBAL_POLL_MS = 50;
  const USER_GLOBAL_TIMEOUT = 1200;
  function safeGetTutorialState() {
    try {
      const raw = localStorage.getItem(TUTORIAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function tutorialWasDismissedOrSuppressed() {
    const state = safeGetTutorialState();
    if (!state) return false;
    if (state.skipped === true) return true;
    if (typeof state.viewCount === 'number' && state.viewCount >= MAX_AUTO_SHOWS) return true;
    return false;
  }
  function waitForUserGlobals(timeout = USER_GLOBAL_TIMEOUT) {
    return new Promise(resolve => {
      const start = Date.now();
      (function poll() {
        if (Object.prototype.hasOwnProperty.call(window, 'userLoggedIn') ||
            Object.prototype.hasOwnProperty.call(window, 'userRole')) {
          return resolve();
        }
        if (Date.now() - start >= timeout) return resolve();
        setTimeout(poll, USER_GLOBAL_POLL_MS);
      })();
    });
  }
  function isTutorialActiveInDOM() {
    try {
      return !!document.querySelector('.tutorial-container');
    } catch (e) {
      return false;
    }
  }
  function createLink(href, text) {
    const a = document.createElement('a');
    a.className = 'banner-link';
    a.href = href;
    a.textContent = text;
    return a;
  }
  function createAuthButton(text) {
    const btn = document.createElement('button');
    btn.className = 'banner-auth-button';
    btn.setAttribute('data-auth-open', '');
    btn.textContent = text;
    btn.addEventListener('click', () => {
      const modal = document.getElementById('authModal');
      if (modal) modal.style.display = 'block';
    });
    return btn;
  }
  function createBanner(message, actionLink) {
    if (document.querySelector('.banner')) return;
    const banner = document.createElement('div');
    banner.className = 'banner';
    const text = document.createElement('span');
    text.textContent = message;
    text.appendChild(actionLink);
    const close = document.createElement('button');
    close.className = 'banner-close';
    close.textContent = '✕';
    close.addEventListener('click', dismiss);
    banner.appendChild(text);
    banner.appendChild(close);
    document.body.appendChild(banner);
    const THRESHOLD = banner.offsetWidth * 0.3;
    let wheelDelta = 0, wheelTimeout;
    function onWheel(e) {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelDelta -= e.deltaX;
      if (wheelDelta < 0) wheelDelta = 0;
      banner.classList.add('banner-no-transition');
      banner.style.transform = `translateX(${wheelDelta}px)`;
      banner.style.opacity = `${1 - Math.min(wheelDelta / banner.offsetWidth, 1)}`;
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(checkWheelEnd, 100);
    }
    function checkWheelEnd() {
      banner.classList.remove('banner-no-transition');
      if (wheelDelta > THRESHOLD) {
        banner.style.transform = `translateX(${banner.offsetWidth}px)`;
        banner.style.opacity = '0';
        setTimeout(dismiss, 300);
      } else {
        banner.style.transform = '';
        banner.style.opacity = '1';
      }
      wheelDelta = 0;
    }
    banner.addEventListener('wheel', onWheel, { passive: false });
    let startX = 0, currentX = 0, isDragging = false;
    banner.addEventListener('touchstart', e => {
      isDragging = true;
      startX = e.touches[0].clientX;
      banner.classList.add('banner-no-transition');
    }, { passive: true });
    banner.addEventListener('touchmove', e => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const dx = currentX - startX;
      if (dx < 0) return;
      banner.style.transform = `translateX(${dx}px)`;
      banner.style.opacity = `${1 - Math.abs(dx) / banner.offsetWidth}`;
    }, { passive: true });
    banner.addEventListener('touchend', () => {
      const dx = currentX - startX;
      banner.classList.remove('banner-no-transition');
      if (dx > THRESHOLD) {
        banner.style.transform = `translateX(${banner.offsetWidth}px)`;
        banner.style.opacity = '0';
        setTimeout(dismiss, 300);
      } else {
        banner.style.transform = '';
        banner.style.opacity = '1';
      }
      isDragging = false;
    }, { passive: true });
    let mouseDown = false, mouseStartX = 0;
    banner.addEventListener('mousedown', e => {
      mouseDown = true;
      mouseStartX = e.clientX;
      banner.classList.add('banner-no-transition');
    });
    window.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      const dx = e.clientX - mouseStartX;
      if (dx < 0) return;
      banner.style.transform = `translateX(${dx}px)`;
      banner.style.opacity = `${1 - Math.abs(dx) / banner.offsetWidth}`;
    });
    window.addEventListener('mouseup', e => {
      if (!mouseDown) return;
      const dx = e.clientX - mouseStartX;
      banner.classList.remove('banner-no-transition');
      if (dx > THRESHOLD) {
        banner.style.transform = `translateX(${banner.offsetWidth}px)`;
        banner.style.opacity = '0';
        setTimeout(dismiss, 300);
      } else {
        banner.style.transform = '';
        banner.style.opacity = '1';
      }
      mouseDown = false;
    });
    function dismiss() {
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
      banner.removeEventListener('wheel', onWheel);
      window.bannerDismissed = true;
    }
  }
  let showAttempted = false;
  async function attemptShowBannerWhenAppropriate() {
    if (showAttempted) return;
    showAttempted = true;
    await waitForUserGlobals();
    if (window.bannerDismissed) return;
    if (isTutorialActiveInDOM()) {
      const handler = () => {
        setTimeout(() => {
          tryShowBannerNow();
        }, 30);
      };
      window.addEventListener('tutorial:end', handler, { once: true });
      return;
    }
    if (tutorialWasDismissedOrSuppressed()) {
      tryShowBannerNow();
      return;
    }
    window.addEventListener('tutorial:end', () => {
      setTimeout(() => { tryShowBannerNow(); }, 30);
    }, { once: true });
  }
  function tryShowBannerNow() {
    if (isTutorialActiveInDOM()) return;
    if (window.bannerDismissed) return;
    if (document.querySelector('.banner')) return;
    const isLoggedIn = window.userLoggedIn === true;
    const role = window.userRole;
    if (!isLoggedIn) {
      createBanner('Want to save your progress? ', createAuthButton('Login/Register'));
      return;
    }
    if (role === 'basic') {
      createBanner('Upgrade to save your work publicly ', createLink('/upgrade', 'Upgrade now'));
    }
  }
  function attachAuthOpenHandlers() {
    document.querySelectorAll('[data-auth-open]').forEach(btn => {
      if (btn.__authAttached) return;
      btn.__authAttached = true;
      btn.addEventListener('click', () => {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'block';
      });
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    attachAuthOpenHandlers();
    attemptShowBannerWhenAppropriate();
  });
  window.addEventListener('load', () => {
    attachAuthOpenHandlers();
    attemptShowBannerWhenAppropriate();
  });
  attachAuthOpenHandlers();
  attemptShowBannerWhenAppropriate();
  setTimeout(attemptShowBannerWhenAppropriate, 150);
  setTimeout(attemptShowBannerWhenAppropriate, 600);
})();