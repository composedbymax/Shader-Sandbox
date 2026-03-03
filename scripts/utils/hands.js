(function () {
    'use strict';
    const MEDIAPIPE_BASE = 'scripts/utils/@mediapipe/';
    const LM = {
        WRIST: 0,
        THUMB_TIP: 4,
        INDEX_MCP: 5, INDEX_TIP: 8,
        MIDDLE_MCP: 9, MIDDLE_TIP: 12,
        RING_MCP: 13, RING_TIP: 16,
        PINKY_MCP: 17, PINKY_TIP: 20,
    };
    const BUILT_IN_GESTURES = [
        {
            name: 'pinch',
            uniform: 'u_pinch',
            description: 'Thumb↔Index distance (0=open 1=pinched)',
            getValue: (lm) => 1.0 - Math.min(dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / 0.25, 1.0),
        },
        {
            name: 'fist',
            uniform: 'u_fist',
            description: 'Fingers curled (0=open 1=fist)',
            getValue: (lm) => fingersCurled(lm) / 5,
        },
        {
            name: 'open_hand',
            uniform: 'u_open_hand',
            description: 'Fingers extended (0=closed 1=open)',
            getValue: (lm) => fingersExtended(lm) / 5,
        },
        {
            name: 'point',
            uniform: 'u_point',
            description: 'Index extended, others curled',
            getValue: (lm) => (isFingerExtended(lm, 'INDEX') && !isFingerExtended(lm, 'MIDDLE')) ? 1.0 : 0.0,
        },
        {
            name: 'victory',
            uniform: 'u_victory',
            description: 'Index+Middle extended (peace sign)',
            getValue: (lm) => (isFingerExtended(lm, 'INDEX') && isFingerExtended(lm, 'MIDDLE') && !isFingerExtended(lm, 'RING')) ? 1.0 : 0.0,
        },
        {
            name: 'hand_pos',
            uniform: 'u_hand_pos',
            description: 'Wrist XY in normalised screen space (hand 1)',
            getValue: (lm) => [lm[LM.WRIST].x, lm[LM.WRIST].y],
        },
        {
            name: 'hand_pos2',
            uniform: 'u_hand_pos2',
            description: 'Wrist XY in normalised screen space (hand 2)',
            getValue: (lm) => [lm[LM.WRIST].x, lm[LM.WRIST].y],
        },
        {
            name: 'hand_rot',
            uniform: 'u_hand_rot',
            description: 'Hand roll angle in radians (hand 1)',
            getValue: (lm) => Math.atan2(
                lm[LM.MIDDLE_MCP].y - lm[LM.WRIST].y,
                lm[LM.MIDDLE_MCP].x - lm[LM.WRIST].x
            ),
        },
        {
            name: 'hand_rot2',
            uniform: 'u_hand_rot2',
            description: 'Hand roll angle in radians (hand 2)',
            getValue: (lm) => Math.atan2(
                lm[LM.MIDDLE_MCP].y - lm[LM.WRIST].y,
                lm[LM.MIDDLE_MCP].x - lm[LM.WRIST].x
            ),
        },
        {
            name: 'spread',
            uniform: 'u_spread',
            description: 'Finger spread 0–1',
            getValue: (lm) => {
                const tips = [LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];
                let total = 0;
                for (let i = 0; i < tips.length - 1; i++) total += dist(lm[tips[i]], lm[tips[i + 1]]);
                return Math.min(total / (3 * 0.12), 1.0);
            },
        },
        {
            name: 'hand_depth',
            uniform: 'u_hand_depth',
            description: 'Approximate hand size / depth',
            getValue: (lm) => Math.min(dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]) / 0.3, 1.0),
        },
    ];
    const PER_HAND_GESTURES = ['pinch','fist','open_hand','point','victory','hand_rot','hand_rot2','spread','hand_depth'];
    const HAND2_ONLY = new Set(['hand_pos2','hand_rot2']);
    const HAND1_ONLY = new Set(['hand_pos','hand_rot']);
    function dist(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    function isFingerExtended(lm, finger) {
        const map = {
            INDEX:  [LM.INDEX_MCP,  LM.INDEX_TIP],
            MIDDLE: [LM.MIDDLE_MCP, LM.MIDDLE_TIP],
            RING:   [LM.RING_MCP,   LM.RING_TIP],
            PINKY:  [LM.PINKY_MCP,  LM.PINKY_TIP],
        };
        const [mcp, tip] = map[finger];
        return lm[tip].y < lm[mcp].y - 0.04;
    }
    function fingersCurled(lm) {
        return ['INDEX','MIDDLE','RING','PINKY'].filter(f => !isFingerExtended(lm, f)).length +
            (dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]) < 0.08 ? 1 : 0);
    }
    function fingersExtended(lm) {
        return ['INDEX','MIDDLE','RING','PINKY'].filter(f => isFingerExtended(lm, f)).length;
    }
    function avgScalar(vals) {
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    function avgVec(vals) {
        const len = vals[0].length;
        const out = new Array(len).fill(0);
        for (const v of vals) v.forEach((x, i) => { out[i] += x; });
        return out.map(x => x / vals.length);
    }
    class EMAFilter {
        constructor(alpha = 0.35) { this.alpha = alpha; this.value = null; }
        update(v) {
            if (this.value === null) { this.value = v; return v; }
            this.value = Array.isArray(v)
                ? v.map((x, i) => this.alpha * x + (1 - this.alpha) * this.value[i])
                : this.alpha * v + (1 - this.alpha) * this.value;
            return this.value;
        }
        reset() { this.value = null; }
    }
    class HandsSystem {
        constructor(cameraSystem) {
            this.camera         = cameraSystem;
            this.hands          = null;
            this.mpCamera       = null;
            this.landmarks      = [];
            this.isActive       = false;
            this.debugMode      = false;
            this.gestures       = [...BUILT_IN_GESTURES];
            this.customGestures = [];
            this.filters        = {};
            this.gestures.forEach(g => { this.filters[g.name] = new EMAFilter(); });
            this.uniformValues  = {};
            this._registerProvider();
            this._loadMediaPipe().then(() => this._init());
        }
        _registerProvider() {
            window._uniformProviders = window._uniformProviders || [];
            window._uniformProviders.push((gl, uniforms) => {
                if (!this.isActive) return;
                const all = [...this.gestures, ...this.customGestures];
                for (const g of all) {
                    const entry = uniforms[g.uniform];
                    if (!entry) continue;
                    const val = this.uniformValues[g.name];
                    if (val === undefined || val === null) continue;
                    if (Array.isArray(val)) {
                        if (val.length === 2) gl.uniform2f(entry.loc, val[0], val[1]);
                        else if (val.length === 3) gl.uniform3f(entry.loc, val[0], val[1], val[2]);
                    } else {
                        gl.uniform1f(entry.loc, val);
                    }
                }
            });
        }
        async _loadScript(src) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
                const s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(s);
            });
        }
        async _loadMediaPipe() {
            try {
                await this._loadScript(`${MEDIAPIPE_BASE}hands.js`);
                await this._loadScript(`${MEDIAPIPE_BASE}camera_utils.js`);
                await this._loadScript(`${MEDIAPIPE_BASE}drawing_utils.js`);
                console.log('[HandsSystem] MediaPipe loaded.');
            } catch (e) {
                console.error('[HandsSystem] MediaPipe load failed:', e);
            }
        }
        _init() {
            if (typeof Hands === 'undefined') {
                console.warn('[HandsSystem] Hands class not found — check MEDIAPIPE_BASE path.');
                return;
            }
            this.hands = new Hands({ locateFile: (f) => `${MEDIAPIPE_BASE}${f}` });
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.6,
            });
            this.hands.onResults((r) => this._onResults(r));
            this._buildUI();
            console.log('[HandsSystem] Ready.');
        }
        _buildUI() {
            const cameraContent = document.querySelector('.camera-content');
            if (!cameraContent || document.getElementById('handsPanel')) return;
            const panel = document.createElement('div');
            panel.id = 'handsPanel';
            panel.className = 'hands-section';
            panel.innerHTML = `
                <div class="hands-enable-row">
                    <label class="checkbox-container">
                        <input type="checkbox" id="handsEnableToggle">
                        <span class="custom-checkbox"></span>
                        <span class="checkbox-label">Hand Gesture Controls</span>
                    </label>
                </div>
                <div id="handsBody" class="hands-body collapsed">
                    <div class="hands-sub-row">
                        <label class="checkbox-container">
                            <input type="checkbox" id="handsDebugToggle">
                            <span class="custom-checkbox"></span>
                            <span class="checkbox-label">Show landmarks</span>
                        </label>
                    </div>
                    <div id="handsGestureList" class="hands-gesture-list">
                        ${this.gestures.map(g => `
                            <div class="gesture-row" data-gesture="${g.name}">
                                <div class="gesture-info">
                                    <span class="gesture-name">${g.name}</span>
                                    <code class="gesture-uniform">${g.uniform}</code>
                                    <span class="gesture-desc">${g.description}</span>
                                </div>
                                <div class="gesture-meter">
                                    <div class="gesture-bar" id="bar_${g.name}"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="hands-custom">
                        <h5>Custom Gesture</h5>
                        <div class="hands-custom-row">
                            <input type="text" id="customGestureName" placeholder="e.g. u_wave" class="camera-device-select">
                            <button id="recordGestureBtn" class="camera-control-btn">Record Pose</button>
                        </div>
                        <div id="customGestureStatus" class="hands-custom-status"></div>
                    </div>
                </div>
            `;
            cameraContent.appendChild(panel);
            document.getElementById('handsEnableToggle').addEventListener('change', (e) => {
                const body = document.getElementById('handsBody');
                if (e.target.checked) {
                    body.classList.remove('collapsed');
                    this.start();
                } else {
                    body.classList.add('collapsed');
                    this.stop();
                }
            });
            document.getElementById('handsDebugToggle').addEventListener('change', (e) => {
                this.debugMode = e.target.checked;
                if (!this.debugMode) this._clearMainCanvasOverlay();
            });
            document.getElementById('recordGestureBtn').addEventListener('click', () => this._recordCustomGesture());
        }
        _onResults(results) {
            if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
                this.landmarks = [];
                this._resetValues();
                if (this.debugMode) this._clearMainCanvasOverlay();
                return;
            }
            this.landmarks = results.multiHandLandmarks;
            if (this.debugMode) {
                const overlay = this._getOverlay2D();
                if (overlay) {
                    const ctx = overlay.getContext('2d');
                    ctx.clearRect(0, 0, overlay.width, overlay.height);
                    this.landmarks.forEach(lm => this._drawLandmarksOnMainCanvas(lm, ctx, overlay.width, overlay.height));
                }
            }
            this._updateValues(this.landmarks);
        }
        _updateValues(hands) {
            const all = [...this.gestures, ...this.customGestures];
            const hand0 = hands[0] || null;
            const hand1 = hands[1] || null;
            for (const g of all) {
                let raw;
                try {
                    if (HAND2_ONLY.has(g.name)) {
                        raw = hand1 ? g.getValue(hand1) : (Array.isArray(this.uniformValues[g.name]) ? [0, 0] : 0);
                    } else if (HAND1_ONLY.has(g.name)) {
                        raw = hand0 ? g.getValue(hand0) : (Array.isArray(this.uniformValues[g.name]) ? [0, 0] : 0);
                    } else {
                        const perHand = hands.map(lm => g.getValue(lm));
                        if (perHand.length === 1) {
                            raw = perHand[0];
                        } else {
                            raw = Array.isArray(perHand[0]) ? avgVec(perHand) : avgScalar(perHand);
                        }
                    }
                } catch {
                    raw = Array.isArray(this.uniformValues[g.name]) ? [0, 0] : 0;
                }
                const filter = this.filters[g.name] || (this.filters[g.name] = new EMAFilter());
                this.uniformValues[g.name] = filter.update(raw);
                const bar = document.getElementById(`bar_${g.name}`);
                if (bar) {
                    const v = this.uniformValues[g.name];
                    const s = Array.isArray(v) ? Math.hypot(...v) : Math.abs(v);
                    bar.style.width = `${Math.min(s * 100, 100)}%`;
                }
            }
        }
        _resetValues() {
            const all = [...this.gestures, ...this.customGestures];
            for (const g of all) {
                const isVec = Array.isArray(this.uniformValues[g.name]);
                this.uniformValues[g.name] = isVec ? [0, 0] : 0;
                const f = this.filters[g.name]; if (f) f.reset();
                const bar = document.getElementById(`bar_${g.name}`);
                if (bar) bar.style.width = '0%';
            }
        }
        _getOverlay2D() {
            let overlay = document.getElementById('handsMainOverlay');
            if (!overlay) {
                const main = document.getElementById('glcanvas');
                if (!main) return null;
                overlay = document.createElement('canvas');
                overlay.id = 'handsMainOverlay';
                overlay.className = 'hands-main-overlay';
                main.parentNode.insertBefore(overlay, main.nextSibling);
            }
            const main = document.getElementById('glcanvas');
            if (main) {
                const w = main.clientWidth, h = main.clientHeight;
                if (overlay.width !== w)  overlay.width  = w;
                if (overlay.height !== h) overlay.height = h;
            }
            return overlay;
        }
        _clearMainCanvasOverlay() {
            const overlay = document.getElementById('handsMainOverlay');
            if (!overlay) return;
            overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
        }
        _drawLandmarksOnMainCanvas(lm, ctx, W, H) {
            const CONNECTIONS = [
                [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
                [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
                [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
            ];
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
            ctx.lineWidth = 1.5;
            for (const [a, b] of CONNECTIONS) {
                ctx.beginPath();
                ctx.moveTo((1 - lm[a].x) * W, lm[a].y * H);
                ctx.lineTo((1 - lm[b].x) * W, lm[b].y * H);
                ctx.stroke();
            }
            lm.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc((1 - p.x) * W, p.y * H, i === 0 ? 5 : 3, 0, Math.PI * 2);
                ctx.fillStyle = i === 0 ? 'rgba(36, 214, 154, 0.848)' : 'rgba(16, 185, 129, 0.9)';
                ctx.fill();
            });
        }
        _recordCustomGesture() {
            const uniformName = (document.getElementById('customGestureName')?.value || '').trim();
            const statusEl    = document.getElementById('customGestureStatus');
            if (!uniformName)         { if (statusEl) statusEl.textContent = 'Enter a uniform name first.'; return; }
            if (!this.landmarks.length) { if (statusEl) statusEl.textContent = 'No hand detected — make your pose.'; return; }
            const lm = this.landmarks[0];
            const rP = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
            const rS = dist(lm[LM.INDEX_TIP],  lm[LM.PINKY_TIP]);
            const rC = fingersCurled(lm);
            const name = uniformName.replace(/^u_/, '');
            const newGesture = {
                name,
                uniform: uniformName,
                description: `Custom: ${uniformName}`,
                getValue: (lmC) => {
                    const pd = Math.abs(dist(lmC[LM.THUMB_TIP], lmC[LM.INDEX_TIP]) - rP) / 0.3;
                    const sd = Math.abs(dist(lmC[LM.INDEX_TIP],  lmC[LM.PINKY_TIP]) - rS) / 0.4;
                    const cd = Math.abs(fingersCurled(lmC) - rC) / 5;
                    return Math.max(0, 1 - (pd + sd + cd) / 3);
                },
            };
            const idx = this.customGestures.findIndex(g => g.uniform === uniformName);
            if (idx >= 0) {
                this.customGestures[idx] = newGesture;
            } else {
                this.customGestures.push(newGesture);
                this.filters[name] = new EMAFilter();
                const list = document.getElementById('handsGestureList');
                if (list) {
                    const row = document.createElement('div');
                    row.className = 'gesture-row';
                    row.innerHTML = `
                        <div class="gesture-info">
                            <span class="gesture-name">${name}</span>
                            <code class="gesture-uniform">${uniformName}</code>
                            <span class="gesture-desc">${newGesture.description}</span>
                        </div>
                        <div class="gesture-meter"><div class="gesture-bar" id="bar_${name}"></div></div>
                    `;
                    list.appendChild(row);
                }
            }
            if (statusEl) statusEl.textContent = `✓ Recorded pose for "${uniformName}"`;
        }
        async start() {
            if (this.isActive) return;
            if (!this.hands) { console.warn('[HandsSystem] Not ready.'); return; }
            const videoEl = this.camera?.preview || document.getElementById('cameraPreview');
            if (!videoEl || !this.camera?.isActive) {
                window.showToast('Camera must be active before enabling Hands.', 'error');
                const tog = document.getElementById('handsEnableToggle');
                if (tog) tog.checked = false;
                const body = document.getElementById('handsBody');
                if (body) body.classList.add('collapsed');
                return;
            }
            this.isActive = true;
            if (typeof Camera !== 'undefined') {
                this.mpCamera = new Camera(videoEl, {
                    onFrame: async () => { if (this.isActive) await this.hands.send({ image: videoEl }); },
                    width: 640, height: 480,
                });
                await this.mpCamera.start();
            } else {
                const sendFrame = async () => {
                    if (!this.isActive) return;
                    if (videoEl.readyState >= 2) await this.hands.send({ image: videoEl });
                    this._loopId = requestAnimationFrame(sendFrame);
                };
                this._loopId = requestAnimationFrame(sendFrame);
            }
            console.log('[HandsSystem] Started.');
        }
        stop() {
            this.isActive = false;
            if (this.mpCamera) { this.mpCamera.stop(); this.mpCamera = null; }
            if (this._loopId)  { cancelAnimationFrame(this._loopId); this._loopId = null; }
            this._clearMainCanvasOverlay();
            this._resetValues();
        }
        destroy() {
            this.stop();
            const overlay = document.getElementById('handsMainOverlay');
            if (overlay) overlay.remove();
            if (window._uniformProviders) {
                window._uniformProviders = window._uniformProviders.filter(fn => fn._handsOwner !== this);
            }
            if (this.hands) { this.hands.close(); this.hands = null; }
            const panel = document.getElementById('handsPanel');
            if (panel) panel.remove();
        }
        addGesture(opts) {
            this.gestures.push(opts);
            this.filters[opts.name] = new EMAFilter();
        }
        getGestureValue(name) {
            return this.uniformValues[name] ?? null;
        }
    }
    function initHandsSystem() {
        if (window.handsSystem) return;
        if (window.userRole !== 'admin' && window.userRole !== 'premium') return;
        const tryInit = () => {
            if (window.cameraSystem) {
                window.handsSystem = new HandsSystem(window.cameraSystem);
            } else {
                setTimeout(tryInit, 200);
            }
        };
        tryInit();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHandsSystem);
    } else {
        initHandsSystem();
    }
    window.HandsSystem = HandsSystem;
})();