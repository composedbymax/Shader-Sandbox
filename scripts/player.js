// player.js
(function() {
  const processedAudioElements = new WeakSet();
  let currentPlayerWrapper = null;
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  function removeOldPlayer() {
    if (currentPlayerWrapper && currentPlayerWrapper.parentNode) {
      const oldAudio = currentPlayerWrapper.querySelector('audio');
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.src = '';
        oldAudio.load();
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
    audio.controls = false;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.padding = '0.5em 0';
    wrapper.style.borderRadius = '10px';
    wrapper.style.color = '#fff';
    wrapper.style.minWidth = '400px';
    currentPlayerWrapper = wrapper;
    const timeContainer = document.createElement('div');
    timeContainer.style.display = 'flex';
    timeContainer.style.alignItems = 'center';
    timeContainer.style.justifyContent = 'center';
    timeContainer.style.gap = '5px';
    timeContainer.style.fontSize = '12px';
    timeContainer.style.color = '#ccc';
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
    playPause.style.background = '#00ffd4';
    playPause.style.color = '#000';
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
    seekBar.style.background = '#484848';
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
    volumeKnob.style.background = '#484848';
    volumeKnob.style.outline = 'none';
    const volumeDisplay = document.createElement('div');
    volumeDisplay.textContent = Math.round(audio.volume * 100) + '%';
    volumeDisplay.style.position = 'absolute';
    volumeDisplay.style.bottom = '100%';
    volumeDisplay.style.right = '0';
    volumeDisplay.style.marginBottom = '5px';
    volumeDisplay.style.padding = '4px 8px';
    volumeDisplay.style.fontSize = '11px';
    volumeDisplay.style.color = '#fff';
    volumeDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
    volumeDisplay.style.borderRadius = '4px';
    volumeDisplay.style.opacity = '0';
    volumeDisplay.style.visibility = 'hidden';
    volumeDisplay.style.transition = 'opacity 0.2s, visibility 0.2s';
    volumeDisplay.style.pointerEvents = 'none';
    volumeContainer.appendChild(volumeKnob);
    volumeContainer.appendChild(volumeDisplay);
    controlsRow.appendChild(playPause);
    controlsRow.appendChild(seekBar);
    controlsRow.appendChild(volumeContainer);
    audio.parentNode.insertBefore(wrapper, audio);
    wrapper.appendChild(timeContainer);
    wrapper.appendChild(controlsRow);
    wrapper.appendChild(audio);
    playPause.addEventListener('click', () => {
      if (!audio.src) return;
      audio.paused ? audio.play() : audio.pause();
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