(() => {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  let pc = null;
  let dc = null;
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 350px;
    background: #1e1e1e; color: #ccc; font-family: monospace; font-size: 14px;
    border-radius: 10px; padding: 15px; z-index: 99999; box-shadow: 0 0 15px #000;
    user-select: none;
  `;
  container.innerHTML = `
    <div style="font-weight:bold; font-size:18px; margin-bottom:12px; color:#61dafb;">WebRTC Shader Sync</div>
    <button id="createOfferBtn" style="width:100%; padding:10px; margin-bottom:12px; background:#282c34; color:#61dafb; border:none; border-radius:6px; cursor:pointer;">Create Connection (Offer)</button>
    <label for="offerOutput" style="display:block; margin-bottom:4px;">Your Offer / Answer:</label>
    <textarea id="offerOutput" placeholder="Offer/Answer code will appear here..." readonly style="width:100%; height:100px; margin-bottom:12px; background:#111; color:#afa; border-radius:6px; padding:8px; font-family: monospace;"></textarea>
    <label for="remoteInput" style="display:block; margin-bottom:4px;">Paste Remote Offer/Answer:</label>
    <textarea id="remoteInput" placeholder="Paste remote offer or answer here..." style="width:100%; height:100px; margin-bottom:12px; background:#111; color:#eee; border-radius:6px; padding:8px; font-family: monospace;"></textarea>
    <button id="acceptRemoteBtn" style="width:100%; padding:10px; margin-bottom:12px; background:#282c34; color:#61dafb; border:none; border-radius:6px; cursor:pointer;">Accept Remote Code</button>
    <div id="connectionStatus" style="margin-bottom:12px; font-weight:bold; min-height:24px; color:#ffcc00;">Status: Disconnected</div>
    <label for="messageInput" style="display:block; margin-bottom:4px;">Send Message:</label>
    <textarea id="messageInput" placeholder="Type message here..." style="width:100%; height:60px; margin-bottom:12px; background:#111; color:#eee; border-radius:6px; padding:8px; font-family: monospace;" disabled></textarea>
    <button id="sendMessageBtn" style="width:100%; padding:10px; background:#61dafb; color:#000; border:none; border-radius:6px; cursor:pointer;" disabled>Send Message</button>
    <div id="messagesLog" style="margin-top:10px; max-height:140px; overflow-y:auto; background:#111; padding:10px; border-radius:6px; font-size:13px; color:#ddd; white-space: pre-wrap;"></div>
  `;
  document.body.appendChild(container);
  const offerOutput = container.querySelector('#offerOutput');
  const remoteInput = container.querySelector('#remoteInput');
  const createOfferBtn = container.querySelector('#createOfferBtn');
  const acceptRemoteBtn = container.querySelector('#acceptRemoteBtn');
  const connectionStatus = container.querySelector('#connectionStatus');
  const messageInput = container.querySelector('#messageInput');
  const sendMessageBtn = container.querySelector('#sendMessageBtn');
  const messagesLog = container.querySelector('#messagesLog');
  const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const decode = (str) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(str))));
    } catch (err) {
      logError('Decode error: ' + err.message);
      return null;
    }
  };
  function logMessage(msg, isLocal = false) {
    const prefix = isLocal ? '→ ' : '← ';
    const color = isLocal ? '#8f8' : '#f88';
    const div = document.createElement('div');
    div.style.color = color;
    div.textContent = prefix + msg;
    messagesLog.appendChild(div);
    messagesLog.scrollTop = messagesLog.scrollHeight;
    console.log((isLocal ? '[LOCAL]' : '[REMOTE]') + ' ' + msg);
  }
  function logError(msg) {
    const div = document.createElement('div');
    div.style.color = '#f44';
    div.textContent = '⚠ ERROR: ' + msg;
    messagesLog.appendChild(div);
    messagesLog.scrollTop = messagesLog.scrollHeight;
    console.error('[ERROR]', msg);
  }
  function enableMessaging() {
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
  }
  function disableMessaging() {
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
  }
  function setupConnection(isOfferer) {
    pc = new RTCPeerConnection(config);
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      connectionStatus.textContent = `Status: ${state}`;
      if (['disconnected', 'failed', 'closed'].includes(state)) {
        disableMessaging();
        logError(`Connection ${state}`);
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.debug('ICE candidate gathered:', event.candidate);
      }
    };
    if (isOfferer) {
      dc = pc.createDataChannel('shaderSync');
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (ev) => {
        dc = ev.channel;
        setupDataChannel(dc);
      };
    }
    return pc;
  }
  function setupDataChannel(channel) {
    channel.onopen = () => {
      connectionStatus.textContent = 'Status: Connected';
      enableMessaging();
      logMessage('DataChannel opened', true);
    };
    channel.onclose = () => {
      connectionStatus.textContent = 'Status: Closed';
      disableMessaging();
      logError('DataChannel closed');
    };
    channel.onerror = (e) => {
      logError('DataChannel error: ' + e.message);
    };
    channel.onmessage = (e) => {
      logMessage(e.data, false);
      if (window.onShaderSyncMessage) window.onShaderSyncMessage(e.data);
    };
  }
  createOfferBtn.onclick = async () => {
    try {
      pc = setupConnection(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);
      offerOutput.value = encode(pc.localDescription);
      logMessage('Offer created', true);
    } catch (err) {
      logError('Failed to create offer: ' + err.message);
    }
  };
  acceptRemoteBtn.onclick = async () => {
    try {
      const remoteCode = remoteInput.value.trim();
      if (!remoteCode) return alert('Please paste remote offer/answer code.');
      const signal = decode(remoteCode);
      if (!signal || !signal.type) return alert('Invalid remote code.');
      if (!pc) {
        if (signal.type === 'offer') {
          pc = setupConnection(false);
          await pc.setRemoteDescription(signal);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceGatheringComplete(pc);
          offerOutput.value = encode(pc.localDescription);
          logMessage('Answer created', true);
        } else {
          alert('No connection started, expected offer code!');
        }
      } else {
        if (signal.type === 'answer') {
          await pc.setRemoteDescription(signal);
          logMessage('Answer accepted', true);
        } else {
          alert('Unexpected remote code received.');
        }
      }
    } catch (err) {
      logError('Failed to accept remote code: ' + err.message);
    }
  };
  sendMessageBtn.onclick = () => {
    try {
      const msg = messageInput.value.trim();
      if (!msg || !dc || dc.readyState !== 'open') return;
      dc.send(msg);
      logMessage(msg, true);
      messageInput.value = '';
    } catch (err) {
      logError('Failed to send message: ' + err.message);
    }
  };
  function waitForIceGatheringComplete(peerConnection) {
    return new Promise((resolve) => {
      if (peerConnection.iceGatheringState === 'complete') {
        resolve();
      } else {
        function checkState() {
          if (peerConnection.iceGatheringState === 'complete') {
            peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        }
        peerConnection.addEventListener('icegatheringstatechange', checkState);
      }
    });
  }
  window.WebRTCShaderSyncUI = {
    sendMessage: (msg) => {
      if (dc && dc.readyState === 'open') {
        dc.send(msg);
        logMessage(msg, true);
      }
    }
  };
})();