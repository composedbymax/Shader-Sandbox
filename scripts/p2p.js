(() => {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  let pc, dc, joinCode, isHost = false, pollInterval, connectionEstablished = false;
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; bottom: 20px; right: 20px; width: 350px; background: #1e1e1e; color: #ccc; font-family: monospace; font-size: 14px; border-radius: 10px; padding: 15px; z-index: 99999; box-shadow: 0 0 15px #000; user-select: none;`;
  container.innerHTML = `
    <div style="font-weight:bold; font-size:18px; margin-bottom:12px; color:#61dafb;">WebRTC Join Code</div>
    <div id="joinCodeSection">
      <button id="createRoomBtn" style="width:100%; padding:10px; margin-bottom:8px; background:#282c34; color:#61dafb; border:none; border-radius:6px; cursor:pointer;">Create Room</button>
      <div style="text-align:center; margin-bottom:8px; color:#888;">OR</div>
      <input id="joinCodeInput" placeholder="Enter join code..." style="width:100%; padding:10px; margin-bottom:8px; background:#111; color:#eee; border:1px solid #333; border-radius:6px; font-family: monospace;" />
      <button id="joinRoomBtn" style="width:100%; padding:10px; margin-bottom:12px; background:#282c34; color:#61dafb; border:none; border-radius:6px; cursor:pointer;">Join Room</button>
    </div>
    <div id="roomInfo" style="display:none; margin-bottom:12px; padding:10px; background:#111; border-radius:6px;">
      <div style="font-weight:bold; margin-bottom:8px;">Room Code:</div>
      <div id="roomCodeDisplay" style="font-size:24px; font-weight:bold; color:#61dafb; text-align:center; letter-spacing:2px; margin-bottom:8px;"></div>
      <div id="waitingMessage" style="text-align:center; color:#ffcc00;">Waiting for peer to join...</div>
    </div>
    <div id="connectionStatus" style="margin-bottom:12px; font-weight:bold; min-height:24px; color:#ffcc00;">Status: Disconnected</div>
    <div id="messagingSection" style="display:none;">
      <label for="messageInput" style="display:block; margin-bottom:4px;">Send Message:</label>
      <textarea id="messageInput" placeholder="Type message here..." style="width:100%; height:60px; margin-bottom:12px; background:#111; color:#eee; border-radius:6px; padding:8px; font-family: monospace;"></textarea>
      <button id="sendMessageBtn" style="width:100%; padding:10px; background:#61dafb; color:#000; border:none; border-radius:6px; cursor:pointer;">Send Message</button>
    </div>
    <div id="messagesLog" style="margin-top:10px; max-height:140px; overflow-y:auto; background:#111; padding:10px; border-radius:6px; font-size:13px; color:#ddd; white-space: pre-wrap;"></div>
  `;
  document.body.appendChild(container);
  const els = Object.fromEntries(['joinCodeSection', 'roomInfo', 'roomCodeDisplay', 'waitingMessage', 'createRoomBtn', 'joinRoomBtn', 'joinCodeInput', 'connectionStatus', 'messagingSection', 'messageInput', 'sendMessageBtn', 'messagesLog'].map(id => [id, container.querySelector(`#${id}`)]));
  const log = (msg, isLocal = false) => {
    const div = document.createElement('div');
    div.style.color = isLocal ? '#8f8' : '#f88';
    div.textContent = (isLocal ? '→ ' : '← ') + msg;
    els.messagesLog.appendChild(div);
    els.messagesLog.scrollTop = els.messagesLog.scrollHeight;
    console.log((isLocal ? '[LOCAL]' : '[REMOTE]') + ' ' + msg);
  };
  const logError = (msg) => {
    const div = document.createElement('div');
    div.style.color = '#f44';
    div.textContent = '⚠ ERROR: ' + msg;
    els.messagesLog.appendChild(div);
    els.messagesLog.scrollTop = els.messagesLog.scrollHeight;
    console.error('[ERROR]', msg);
  };
  const api = async (endpoint, data) => {
    try {
      const response = await fetch(endpoint, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {});
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logError('Server communication failed: ' + error.message);
      return null;
    }
  };
  const cleanupRoom = async () => {
    if (!joinCode) return;
    try {
      const result = await api('api/connect.php', { action: 'connection_established', joinCode });
      if (result?.success) log('Room cleaned up successfully', true);
    } catch (error) {
      console.error('Error cleaning up room:', error);
    }
  };
  const setupDataChannel = (channel) => {
    channel.onopen = () => {
      els.connectionStatus.textContent = 'Status: Connected';
      log('DataChannel opened', true);
      cleanupRoom();
    };
    channel.onclose = () => {
      els.connectionStatus.textContent = 'Status: Closed';
      logError('DataChannel closed');
    };
    channel.onerror = (e) => logError('DataChannel error: ' + e.message);
    channel.onmessage = (e) => {
      log(e.data, false);
      if (window.onShaderSyncMessage) window.onShaderSyncMessage(e.data);
    };
  };
  const setupConnection = (isOfferer) => {
    pc = new RTCPeerConnection(config);
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      els.connectionStatus.textContent = `Status: ${state}`;
      if (state === 'connected' || state === 'completed') {
        if (!connectionEstablished) {
          connectionEstablished = true;
          els.waitingMessage.style.display = 'none';
          els.messagingSection.style.display = 'block';
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        }
      } else if (['disconnected', 'failed', 'closed'].includes(state)) {
        logError(`Connection ${state}`);
        connectionEstablished = false;
      }
    };
    pc.onicecandidate = (event) => event.candidate && console.debug('ICE candidate gathered:', event.candidate);
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
  };
  const waitForIceGatheringComplete = (peerConnection) => new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
    } else {
      const checkState = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      peerConnection.addEventListener('icegatheringstatechange', checkState);
    }
  });
  const createRoom = async () => {
    joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    isHost = true;
    try {
      pc = setupConnection(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);
      const result = await api('api/connect.php', { action: 'create_room', joinCode, sdp: btoa(JSON.stringify(pc.localDescription)) });
      if (result?.success) {
        els.joinCodeSection.style.display = 'none';
        els.roomInfo.style.display = 'block';
        els.roomCodeDisplay.textContent = joinCode;
        els.connectionStatus.textContent = 'Status: Waiting for peer...';
        startPollingForPeer();
        log('Room created: ' + joinCode, true);
      } else {
        logError('Failed to create room');
      }
    } catch (error) {
      logError('Failed to create room: ' + error.message);
    }
  };
  const joinRoom = async () => {
    const code = els.joinCodeInput.value.trim().toUpperCase();
    if (!code) { alert('Please enter a join code'); return; }
    joinCode = code;
    isHost = false;
    try {
      const roomData = await api(`api/connect.php?action=get_room&joinCode=${joinCode}`);
      if (!roomData?.success) { alert('Room not found or invalid join code'); return; }
      const offerSDP = JSON.parse(atob(roomData.offer));
      pc = setupConnection(false);
      await pc.setRemoteDescription(offerSDP);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc);
      const result = await api('api/connect.php', { action: 'join_room', joinCode, sdp: btoa(JSON.stringify(pc.localDescription)) });
      if (result?.success) {
        els.joinCodeSection.style.display = 'none';
        els.roomInfo.style.display = 'block';
        els.roomCodeDisplay.textContent = joinCode;
        els.connectionStatus.textContent = 'Status: Connecting...';
        log('Joined room: ' + joinCode, true);
      } else {
        logError('Failed to join room');
      }
    } catch (error) {
      logError('Failed to join room: ' + error.message);
    }
  };
  const startPollingForPeer = async () => {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (connectionEstablished) { clearInterval(pollInterval); return; }
      try {
        const roomData = await api(`api/connect.php?action=get_room&joinCode=${joinCode}`);
        if (roomData?.success && roomData.answer && !connectionEstablished) {
          const answerSDP = JSON.parse(atob(roomData.answer));
          await pc.setRemoteDescription(answerSDP);
          log('Peer joined, establishing connection...', true);
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000);
  };
  els.createRoomBtn.onclick = createRoom;
  els.joinRoomBtn.onclick = joinRoom;
  els.joinCodeInput.addEventListener('keypress', (e) => e.key === 'Enter' && joinRoom());
  els.sendMessageBtn.onclick = () => {
    try {
      const msg = els.messageInput.value.trim();
      if (!msg || !dc || dc.readyState !== 'open') return;
      dc.send(msg);
      log(msg, true);
      els.messageInput.value = '';
    } catch (err) {
      logError('Failed to send message: ' + err.message);
    }
  };
  els.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.sendMessageBtn.click();
    }
  });
  window.WebRTCShaderSyncUI = {
    sendMessage: (msg) => {
      if (dc && dc.readyState === 'open') {
        dc.send(msg);
        log(msg, true);
      }
    }
  };
  window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
    if (pc) pc.close();
    if (joinCode && !connectionEstablished) {
      navigator.sendBeacon('api/connect.php', JSON.stringify({
        action: 'connection_established',
        joinCode: joinCode
      }));
    }
  });
})();