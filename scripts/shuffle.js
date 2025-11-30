(() => {
  let publicShaderIndex = 0;
  let localShaderIndex = 0;
  let publicShaderList = [];
  let localShaderList = [];
  const keysPressed = new Set();
  const publicShaderRateLimit = {
    lastLoad: 0,
    loadTimes: [],
    maxPerSecond: 1,
    maxPer30Seconds: 10,
    window30s: 30000,
    minInterval: 1000
  };
  function getPublicShadersFromDOM() {
    const shaders = [];
    const container = document.getElementById('publicShaderList');
    if (!container) return shaders;
    const loadButtons = container.querySelectorAll('[data-public-token]');
    loadButtons.forEach(button => {
      const token = button.getAttribute('data-public-token');
      const card = button.closest('div');
      if (card && token) {
        const titleElement = card.querySelector('strong');
        const title = titleElement ? titleElement.textContent : 'Unknown';
        const userElement = card.querySelector('span[style*="color"]');
        const user = userElement ? userElement.textContent.replace('by ', '') : 'Unknown';
        shaders.push({
          token: token,
          title: title,
          user: user
        });
      }
    });
    return shaders;
  }
  function getLocalShadersFromDOM() {
    const shaders = [];
    const container = document.getElementById('localShaderList');
    if (!container) return shaders;
    const loadButtons = container.querySelectorAll('[data-local-index]');
    loadButtons.forEach(button => {
      const index = parseInt(button.getAttribute('data-local-index'));
      const card = button.closest('div');
      if (card && !isNaN(index)) {
        const titleElement = card.querySelector('strong');
        const title = titleElement ? titleElement.textContent : 'Unknown';
        shaders.push({
          index: index,
          title: title
        });
      }
    });
    return shaders;
  }
  function updateShaderLists() {
    publicShaderList = getPublicShadersFromDOM();
    localShaderList = getLocalShadersFromDOM();
    if (publicShaderIndex >= publicShaderList.length) {
      publicShaderIndex = Math.max(0, publicShaderList.length - 1);
    }
    if (localShaderIndex >= localShaderList.length) {
      localShaderIndex = Math.max(0, localShaderList.length - 1);
    }
  }
  function checkPublicShaderRateLimit() {
    const now = Date.now();
    const rateLimitInfo = publicShaderRateLimit;
    if (now - rateLimitInfo.lastLoad < rateLimitInfo.minInterval) {
      const waitTime = Math.ceil((rateLimitInfo.minInterval - (now - rateLimitInfo.lastLoad)) / 1000);
      return {
        allowed: false,
        message: `Slow down!`
      };
    }
    rateLimitInfo.loadTimes = rateLimitInfo.loadTimes.filter(time => now - time < rateLimitInfo.window30s);
    if (rateLimitInfo.loadTimes.length >= rateLimitInfo.maxPer30Seconds) {
      const oldestTime = Math.min(...rateLimitInfo.loadTimes);
      const waitTime = Math.ceil((rateLimitInfo.window30s - (now - oldestTime)) / 1000);
      return {
        allowed: false,
        message: `Rate limit exceeded! You can only load ${rateLimitInfo.maxPer30Seconds} public shaders per 30 seconds. Please wait ${waitTime} second${waitTime > 1 ? 's' : ''}.`
      };
    }
    return { allowed: true };
  }
  function recordPublicShaderLoad() {
    const now = Date.now();
    publicShaderRateLimit.lastLoad = now;
    publicShaderRateLimit.loadTimes.push(now);
  }
  function loadPublicShaderByIndex(index) {
    if (index < 0 || index >= publicShaderList.length) return false;
    const rateLimitCheck = checkPublicShaderRateLimit();
    if (!rateLimitCheck.allowed) {
      showToast(rateLimitCheck.message, 'error');
      return false;
    }
    const shader = publicShaderList[index];
    const container = document.getElementById('publicShaderList');
    if (!container) return false;
    const button = container.querySelector(`[data-public-token="${shader.token}"]`);
    if (button) {
      button.click();
      recordPublicShaderLoad();
      return true;
    }
    return false;
  }
  function loadLocalShaderByIndex(index) {
    if (index < 0 || index >= localShaderList.length) return false;
    const shader = localShaderList[index];
    const container = document.getElementById('localShaderList');
    if (!container) return false;
    const button = container.querySelector(`[data-local-index="${shader.index}"]`);
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  function navigatePublicShaders(direction) {
    updateShaderLists();
    if (publicShaderList.length === 0) {
      showToast('No public shaders available', 'warning');
      return;
    }
    if (direction === 'next') {
      publicShaderIndex = (publicShaderIndex + 1) % publicShaderList.length;
    } else {
      publicShaderIndex = (publicShaderIndex - 1 + publicShaderList.length) % publicShaderList.length;
    }
    const shader = publicShaderList[publicShaderIndex];
    loadPublicShaderByIndex(publicShaderIndex);
  }
  function navigateLocalShaders(direction) {
    updateShaderLists();
    if (localShaderList.length === 0) {
      showToast('No local shaders available', 'warning');
      return;
    }
    if (direction === 'next') {
      localShaderIndex = (localShaderIndex + 1) % localShaderList.length;
    } else {
      localShaderIndex = (localShaderIndex - 1 + localShaderList.length) % localShaderList.length;
    }
    const shader = localShaderList[localShaderIndex];
    loadLocalShaderByIndex(localShaderIndex);
  }
  function handleKeyDown(event) {
    if (!event.key) return;
    const key = event.key.toLowerCase();
    keysPressed.add(key);
    if (keysPressed.has('p')) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigatePublicShaders('next');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigatePublicShaders('prev');
      }
    }
    if (keysPressed.has('l')) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateLocalShaders('next');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateLocalShaders('prev');
      }
    }
  }
  function handleKeyUp(event) {
    if (!event || typeof event.key !== 'string') return;
    const key = event.key.toLowerCase();
    keysPressed.delete(key);
  }
  function initKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => {
      keysPressed.clear();
    });
  }
  function waitForShaderWindow() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const shaderWindow = document.getElementById('shaderWindow');
        if (shaderWindow) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  async function initialize() {
    await waitForShaderWindow();
    setTimeout(() => {
      initKeyboardNavigation();
      updateShaderLists();
    }, 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  window.shaderKeyboardNav = {
    updateShaderLists,
    navigatePublicShaders,
    navigateLocalShaders,
    getStatus: () => ({
      publicShaders: publicShaderList.length,
      localShaders: localShaderList.length,
      publicIndex: publicShaderIndex,
      localIndex: localShaderIndex,
      publicList: publicShaderList,
      localList: localShaderList,
      rateLimitStatus: {
        lastLoad: publicShaderRateLimit.lastLoad,
        recentLoads: publicShaderRateLimit.loadTimes.length,
        canLoadNow: checkPublicShaderRateLimit().allowed
      }
    })
  };
})()