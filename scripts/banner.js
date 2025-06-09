(function () {
  const dismissedKey = 'userBannerDismissed';
  if (localStorage.getItem(dismissedKey) === 'true') return;
  const isLoggedIn = window.userLoggedIn === true;
  const role = window.userRole;
  if (!isLoggedIn) {
    createBanner(
      'Want to save your progress? ',
      createLink('/auth', 'Log in now')
    );
  } else if (role === 'basic') {
    createBanner(
      'Upgrade to save your work publicly. ',
      createLink('/upgrade', 'Upgrade now')
    );
  } else {
    return;
  }
  function createLink(href, text) {
    const a = document.createElement('a');
    Object.assign(a.style, {
      color: 'var(--a)',
      marginLeft: '4px',
      textDecoration: 'underline',
    });
    a.href = href;
    a.textContent = text;
    return a;
  }
  function createBanner(message, actionLink) {
    const banner = document.createElement('div');
    Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        background: 'var(--2)',
        color: 'var(--7)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: '9999',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
    });
    const text = document.createElement('span');
    text.textContent = message;
    text.appendChild(actionLink);
    const close = document.createElement('button');
    Object.assign(close.style, {
        background: 'none',
        border: 'none',
        color: 'var(--7)',
        fontSize: '20px',
        cursor: 'pointer',
        marginLeft: '20px',
    });
    close.textContent = '✕';
    close.addEventListener('click', dismiss);
    banner.appendChild(text);
    banner.appendChild(close);
    document.body.appendChild(banner);
    const THRESHOLD = banner.offsetWidth * 0.3;
    let wheelDelta = 0;
    let wheelTimeout;
    function onWheel(e) {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelDelta -= e.deltaX;
      if (wheelDelta < 0) {
        wheelDelta = 0;
        return;
      }
      banner.style.transition = 'none';
      banner.style.transform = `translateX(${wheelDelta}px)`;
      banner.style.opacity = `${1 - Math.min(Math.abs(wheelDelta) / banner.offsetWidth, 1)}`;
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(checkWheelEnd, 100);
    }
    function checkWheelEnd() {
      banner.style.transition = '';
      if (Math.abs(wheelDelta) > THRESHOLD) {
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
      banner.style.transition = 'none';
    });
    banner.addEventListener('touchmove', e => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const dx = currentX - startX;
      if (dx < 0) return;
      banner.style.transform = `translateX(${dx}px)`;
      banner.style.opacity = `${1 - Math.abs(dx) / banner.offsetWidth}`;
    });
    banner.addEventListener('touchend', () => {
      const dx = currentX - startX;
      banner.style.transition = '';
      if (dx > THRESHOLD) {
        banner.style.transform = `translateX(${banner.offsetWidth}px)`;
        banner.style.opacity = '0';
        setTimeout(dismiss, 300);
      } else {
        banner.style.transform = '';
        banner.style.opacity = '1';
      }
      isDragging = false;
    });
    let mouseDown = false, mouseStartX = 0;
    banner.addEventListener('mousedown', e => {
      mouseDown = true;
      mouseStartX = e.clientX;
      banner.style.transition = 'none';
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
      banner.style.transition = '';
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
      banner.remove();
      localStorage.setItem(dismissedKey, 'true');
      banner.removeEventListener('wheel', onWheel);
    }
  }
})();