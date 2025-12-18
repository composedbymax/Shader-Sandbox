(function() {
  const processedAudioElements = new WeakSet();
  let currentPlayerWrapper = null;
  let countdownEnabled = false;
  let countdownActive = false;
  let countdownInterval = null;
  let originalAudioSrc = null;
  let currentAudio = null;
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  function createNotification(count) {
    const notification = document.createElement('div');
    notification.textContent = count;
    notification.className = 'audio-notification';
    const container = document.fullscreenElement || document.body;
    container.appendChild(notification);
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
  function cleanupCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdownActive = false;
    const notifications = document.querySelectorAll('.audio-notification');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
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
        cleanupCountdown();
        if (audio === currentAudio) {
          audio.src = originalSrc;
          audio.load();
          audio.play();
        }
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
      cleanupCountdown();
      currentPlayerWrapper.parentNode.removeChild(currentPlayerWrapper);
      currentPlayerWrapper = null;
    }
    currentAudio = null;
    originalAudioSrc = null;
  }
  function initCustomPlayer(audio) {
    if (processedAudioElements.has(audio)) {
      return;
    }
    processedAudioElements.add(audio);
    removeOldPlayer();
    currentAudio = audio;
    originalAudioSrc = audio.src;
    audio.controls = false;
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-wrapper';
    currentPlayerWrapper = wrapper;
    const timeContainer = document.createElement('div');
    timeContainer.className = 'audio-time-container';
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
    controlsRow.className = 'audio-controls-row';
    const playPause = document.createElement('button');
    playPause.textContent = '►';
    playPause.className = 'audio-play-pause';
    const seekBar = document.createElement('input');
    seekBar.type = 'range';
    seekBar.min = 0;
    seekBar.max = 100;
    seekBar.value = 0;
    seekBar.disabled = true;
    seekBar.className = 'audio-seek-bar';
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'audio-volume-container';
    const volumeButton = document.createElement('button');
    volumeButton.className = 'audio-volume-button';
    const volumeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const volumePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    volumeIcon.setAttribute('viewBox', '0 0 24 24');
    volumeIcon.setAttribute('fill', 'currentColor');
    volumeIcon.setAttribute('width', '20');
    volumeIcon.setAttribute('height', '20');
    volumePath.setAttribute('d', 'M3 10v4h4l5 5V5l-5 5H3zm13.5 2c0-.83-.34-1.58-.88-2.12l1.42-1.42A5.985 5.985 0 0120.5 12c0 1.66-.67 3.16-1.76 4.24l-1.42-1.42c.54-.54.88-1.29.88-2.12zm-2.12-7.88l1.42 1.42A8.963 8.963 0 0122 12a8.963 8.963 0 01-4.2 7.46l-1.42-1.42A6.978 6.978 0 0019.5 12c0-2.21-.9-4.21-2.62-5.88z');
    volumeIcon.appendChild(volumePath);
    volumeButton.appendChild(volumeIcon);
    const volumePanel = document.createElement('div');
    volumePanel.className = 'audio-volume-panel';
    const volumeDisplay = document.createElement('div');
    volumeDisplay.textContent = Math.round(audio.volume * 100) + '%';
    volumeDisplay.className = 'audio-volume-display';
    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'audio-slider-track';
    const sliderFill = document.createElement('div');
    sliderFill.className = 'audio-slider-fill';
    const sliderHandle = document.createElement('div');
    sliderHandle.className = 'audio-slider-handle';
    sliderTrack.appendChild(sliderFill);
    sliderTrack.appendChild(sliderHandle);
    volumePanel.appendChild(volumeDisplay);
    volumePanel.appendChild(sliderTrack);
    function updateSlider(volume) {
      const percentage = volume * 100;
      sliderFill.style.height = percentage + '%';
      sliderHandle.style.bottom = `calc(${percentage}% - 6px)`;
      volumeDisplay.textContent = Math.round(percentage) + '%';
      if (volume === 0) {
        volumePath.setAttribute('d',
          'M5 9v6h4l5 5V4l-5 5H5z M16 10l4 4m0-4l-4 4'
        );
      } else if (volume < 0.5) {
        volumePath.setAttribute('d',
          'M5 9v6h4l5 5V4l-5 5H5z M17 12a3 3 0 00-1.2-2.4l.7-.7a4 4 0 010 6.2l-.7-.7A3 3 0 0017 12z'
        );
      } else {
        volumePath.setAttribute('d',
          'M5 9v6h4l5 5V4l-5 5H5z M17 12a3 3 0 00-1.2-2.4l.7-.7a4 4 0 010 6.2l-.7-.7A3 3 0 0017 12z M20 12a5 5 0 00-2-4l.7-.7a6 6 0 010 9.4l-.7-.7a5 5 0 002-4z'
        );
      }
    }
    updateSlider(audio.volume);
    volumeContainer.appendChild(volumeButton);
    volumeContainer.appendChild(volumePanel);
    let isDragging = false;
    function getVolumeFromPosition(clientY) {
      const rect = sliderTrack.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, 1 - (relativeY / rect.height)));
      return percentage;
    }
    function handleVolumeChange(e) {
      if (isDragging) {
        const volume = getVolumeFromPosition(e.clientY);
        audio.volume = volume;
        updateSlider(volume);
      }
    }
    sliderTrack.addEventListener('mousedown', (e) => {
      isDragging = true;
      const volume = getVolumeFromPosition(e.clientY);
      audio.volume = volume;
      updateSlider(volume);
      document.addEventListener('mousemove', handleVolumeChange);
      document.addEventListener('mouseup', () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleVolumeChange);
      });
    });
    let volumeTimeout;
    function showVolumePanel() {
      clearTimeout(volumeTimeout);
      volumePanel.classList.add('visible');
    }
    function hideVolumePanel() {
      volumeTimeout = setTimeout(() => {
        if (!isDragging) {
          volumePanel.classList.remove('visible');
        }
      }, 500);
    }
    volumeButton.addEventListener('mouseenter', showVolumePanel);
    volumeContainer.addEventListener('mouseleave', hideVolumePanel);
    volumePanel.addEventListener('mouseenter', () => clearTimeout(volumeTimeout));
    volumePanel.addEventListener('mouseleave', hideVolumePanel);
    let previousVolume = audio.volume;
    volumeButton.addEventListener('click', () => {
      if (audio.volume > 0) {
        previousVolume = audio.volume;
        audio.volume = 0;
      } else {
        audio.volume = previousVolume || 0.5;
      }
      updateSlider(audio.volume);
    });
    const countdownToggle = document.createElement('button');
    countdownToggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
      <path d="M12.5 7H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
    </svg>`;
    countdownToggle.title = 'Toggle 10s countdown';
    countdownToggle.className = `audio-countdown-toggle ${countdownEnabled ? 'enabled' : 'disabled'}`;
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
      countdownToggle.className = `audio-countdown-toggle ${countdownEnabled ? 'enabled' : 'disabled'}`;
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
        cleanupCountdown();
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
    audio.addEventListener('volumechange', () => {
      updateSlider(audio.volume);
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
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    if (e.code !== 'KeyP') return;
    e.preventDefault();
    e.stopPropagation();
    const audio = document.getElementById('file-audio');
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, true);
})();