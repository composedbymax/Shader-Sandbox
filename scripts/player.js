(function() {
  const processedAudioElements = new WeakSet();
  let currentPlayerWrapper = null;
  let countdownEnabled = false;
  let countdownActive = false;
  let countdownInterval = null;
  let originalAudioSrc = null;
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  function createNotification(count) {
    const notification = document.createElement('div');
    notification.textContent = count;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = 'var(--a)';
    notification.style.color = 'var(--1)';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '8px';
    notification.style.fontSize = '16px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '10000';
    notification.style.boxShadow = '0 4px 12px var(--0)';
    notification.style.animation = 'countdownPulse 0.8s ease-out';
    notification.style.minWidth = '40px';
    notification.style.textAlign = 'center';
    if (!document.getElementById('countdown-styles')) {
      const style = document.createElement('style');
      style.id = 'countdown-styles';
      style.textContent = `
        @keyframes countdownPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 900);
  }
  function createSilentAudio(duration) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    for (let i = 0; i < length; i++) {
      view.setInt16(44 + i * 2, 0, true);
    }
    audioContext.close();
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  function startCountdown(audio, originalSrc) {
    if (countdownActive) return;
    countdownActive = true;
    let count = 10;
    createNotification(count);
    countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        createNotification(count);
      } else {
        clearInterval(countdownInterval);
        countdownInterval = null;
        countdownActive = false;
        audio.src = originalSrc;
        audio.load();
        audio.play();
      }
    }, 1000);
  }
  function removeOldPlayer() {
    if (currentPlayerWrapper && currentPlayerWrapper.parentNode) {
      const oldAudio = currentPlayerWrapper.querySelector('audio');
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.src = '';
        oldAudio.load();
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        countdownActive = false;
      }
      
      currentPlayerWrapper.parentNode.removeChild(currentPlayerWrapper);
      currentPlayerWrapper = null;
    }
  }
  function initCustomPlayer(audio) {
    if (processedAudioElements.has(audio)) {
      return;
    }
    processedAudioElements.add(audio);
    removeOldPlayer();
    originalAudioSrc = audio.src;
    audio.controls = false;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.padding = '0.5em 0';
    wrapper.style.borderRadius = '10px';
    wrapper.style.color = 'var(--7)';
    wrapper.style.minWidth = '400px';
    currentPlayerWrapper = wrapper;
    const timeContainer = document.createElement('div');
    timeContainer.style.display = 'flex';
    timeContainer.style.alignItems = 'center';
    timeContainer.style.justifyContent = 'center';
    timeContainer.style.gap = '5px';
    timeContainer.style.fontSize = '12px';
    timeContainer.style.color = 'var(--6)';
    timeContainer.style.minWidth = '80px';
    const currentTimeDisplay = document.createElement('div');
    currentTimeDisplay.textContent = '0:00';
    const timeSeparator = document.createElement('div');
    timeSeparator.textContent = '/';
    const totalTimeDisplay = document.createElement('div');
    totalTimeDisplay.textContent = '0:00';
    timeContainer.appendChild(currentTimeDisplay);
    timeContainer.appendChild(timeSeparator);
    timeContainer.appendChild(totalTimeDisplay);
    const controlsRow = document.createElement('div');
    controlsRow.style.display = 'flex';
    controlsRow.style.alignItems = 'center';
    controlsRow.style.gap = '10px';
    controlsRow.style.position = 'relative';
    const playPause = document.createElement('button');
    playPause.textContent = '►';
    playPause.style.background = 'var(--a)';
    playPause.style.color = 'var(--1)';
    playPause.style.border = 'none';
    playPause.style.borderRadius = '5px';
    playPause.style.cursor = 'pointer';
    playPause.style.width = '3rem';
    playPause.style.height = '2rem';
    playPause.style.fontSize = '14px';
    playPause.style.flexShrink = '0';
    const seekBar = document.createElement('input');
    seekBar.type = 'range';
    seekBar.min = 0;
    seekBar.max = 100;
    seekBar.value = 0;
    seekBar.disabled = true;
    seekBar.style.flex = '1';
    seekBar.style.appearance = 'none';
    seekBar.style.height = '2rem';
    seekBar.style.borderRadius = '2px';
    seekBar.style.background = 'var(--4)';
    seekBar.style.outline = 'none';
    const volumeContainer = document.createElement('div');
    volumeContainer.style.display = 'flex';
    volumeContainer.style.alignItems = 'center';
    volumeContainer.style.gap = '5px';
    volumeContainer.style.flexShrink = '0';
    const volumeKnob = document.createElement('input');
    volumeKnob.type = 'range';
    volumeKnob.min = 0;
    volumeKnob.max = 1;
    volumeKnob.step = 0.01;
    volumeKnob.value = audio.volume;
    volumeKnob.style.width = '60px';
    volumeKnob.style.appearance = 'none';
    volumeKnob.style.height = '1.5rem';
    volumeKnob.style.borderRadius = '5px';
    volumeKnob.style.background = 'var(--4)';
    volumeKnob.style.outline = 'none';
    const volumeDisplay = document.createElement('div');
    volumeDisplay.textContent = Math.round(audio.volume * 100) + '%';
    volumeDisplay.style.position = 'absolute';
    volumeDisplay.style.bottom = '100%';
    volumeDisplay.style.right = '0';
    volumeDisplay.style.marginBottom = '5px';
    volumeDisplay.style.padding = '4px 8px';
    volumeDisplay.style.fontSize = '11px';
    volumeDisplay.style.color = 'var(--7)';
    volumeDisplay.style.background = 'var(--1)';
    volumeDisplay.style.borderRadius = '4px';
    volumeDisplay.style.opacity = '0';
    volumeDisplay.style.visibility = 'hidden';
    volumeDisplay.style.transition = 'opacity 0.2s, visibility 0.2s';
    volumeDisplay.style.pointerEvents = 'none';
    const countdownToggle = document.createElement('button');
    countdownToggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
      <path d="M12.5 7H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
    </svg>`;
    countdownToggle.title = 'Toggle 10s countdown';
    countdownToggle.style.background = countdownEnabled ? 'var(--a)' : 'var(--4)';
    countdownToggle.style.color = countdownEnabled ? 'var(--1)' : 'var(--7)';
    countdownToggle.style.border = 'none';
    countdownToggle.style.borderRadius = '5px';
    countdownToggle.style.cursor = 'pointer';
    countdownToggle.style.width = '2rem';
    countdownToggle.style.height = '2rem';
    countdownToggle.style.fontSize = '12px';
    countdownToggle.style.flexShrink = '0';
    countdownToggle.style.transition = 'background 0.2s';
    countdownToggle.style.display = 'flex';
    countdownToggle.style.alignItems = 'center';
    countdownToggle.style.justifyContent = 'center';
    volumeContainer.appendChild(volumeKnob);
    volumeContainer.appendChild(volumeDisplay);
    controlsRow.appendChild(playPause);
    controlsRow.appendChild(seekBar);
    controlsRow.appendChild(countdownToggle);
    controlsRow.appendChild(volumeContainer);
    audio.parentNode.insertBefore(wrapper, audio);
    wrapper.appendChild(timeContainer);
    wrapper.appendChild(controlsRow);
    wrapper.appendChild(audio);
    countdownToggle.addEventListener('click', () => {
      countdownEnabled = !countdownEnabled;
      countdownToggle.style.background = countdownEnabled ? 'var(--a)' : 'var(--4)';
      countdownToggle.style.color = countdownEnabled ? 'var(--1)' : 'var(--7)';
    });
    playPause.addEventListener('click', () => {
      if (!audio.src && !originalAudioSrc) return;
      if (audio.paused) {
        if (countdownEnabled && !countdownActive) {
          const silentBlob = createSilentAudio(10);
          const silentUrl = URL.createObjectURL(silentBlob);
          audio.src = silentUrl;
          audio.load();
          audio.play();
          startCountdown(audio, originalAudioSrc);
        } else {
          audio.play();
        }
      } else {
        audio.pause();
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
          countdownActive = false;
        }
      }
    });
    audio.addEventListener('play', () => {
      playPause.textContent = '❚❚';
      seekBar.disabled = false;
    });
    audio.addEventListener('pause', () => {
      playPause.textContent = '►';
    });
    audio.addEventListener('timeupdate', () => {
      if (!isNaN(audio.duration)) {
        seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
        currentTimeDisplay.textContent = formatTime(audio.currentTime);
        totalTimeDisplay.textContent = formatTime(audio.duration);
      }
    });
    audio.addEventListener('loadedmetadata', () => {
      seekBar.disabled = false;
      currentTimeDisplay.textContent = '0:00';
      totalTimeDisplay.textContent = formatTime(audio.duration);
    });
    seekBar.addEventListener('input', () => {
      if (!isNaN(audio.duration)) {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
      }
    });
    volumeKnob.addEventListener('input', () => {
      audio.volume = volumeKnob.value;
      volumeDisplay.textContent = Math.round(volumeKnob.value * 100) + '%';
    });
    volumeKnob.addEventListener('mousedown', () => {
      volumeDisplay.style.opacity = '1';
      volumeDisplay.style.visibility = 'visible';
    });
    volumeKnob.addEventListener('mouseup', () => {
      setTimeout(() => {
        volumeDisplay.style.opacity = '0';
        volumeDisplay.style.visibility = 'hidden';
      }, 1000);
    });
    volumeKnob.addEventListener('focus', () => {
      volumeDisplay.style.opacity = '1';
      volumeDisplay.style.visibility = 'visible';
    });
    volumeKnob.addEventListener('blur', () => {
      setTimeout(() => {
        volumeDisplay.style.opacity = '0';
        volumeDisplay.style.visibility = 'hidden';
      }, 500);
    });
  }
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (
          node.nodeType === 1 &&
          node.tagName === 'AUDIO' &&
          node.id === 'file-audio'
        ) {
          initCustomPlayer(node);
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  const existingAudio = document.getElementById('file-audio');
  if (existingAudio) {
    initCustomPlayer(existingAudio);
  }
})();