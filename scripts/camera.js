(function() {
    'use strict';
    const CAMERA_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="7" width="18" height="13" rx="2"/>
  <path d="M8 7l1.5-2h5L16 7"/>
  <circle cx="12" cy="13.5" r="3.5"/>
</svg>
`;
    class CameraSystem {
        constructor() {
            this.stream = null;
            this.video = null;
            this.texture = null;
            this.isActive = false;
            this.devices = [];
            this.currentDeviceId = null;
            this.gl = null;
            this.program = null;
            this.originalFragCode = null;
            this.autoInjectShader = true;
            this.createUI();
            this.setupEventListeners();
            this.enumerateDevices();
        }
       getCameraFragmentShader() {
    return `#ifdef GL_ES
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_camera;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.x = 1.0 - uv.x;  // mirror horizontally
    uv.y = 1.0 - uv.y;  // flip vertically
    vec4 cameraColor = texture2D(u_camera, uv);
    gl_FragColor = vec4(cameraColor.rgb, 1.0);
}`;
        }
        createUI() {
            const previewPanel = document.getElementById('preview-panel');
            this.cameraBtn = document.createElement('button');
            this.cameraBtn.className = 'camera-btn';
            this.cameraBtn.innerHTML = `${CAMERA_SVG}`;
            this.cameraBtn.title = 'Webcam Support';
            previewPanel.appendChild(this.cameraBtn);
            this.modal = document.createElement('div');
            this.modal.className = 'camera-modal';
            this.modal.innerHTML = `
                <div class="camera-content">
                    <div class="camera-header">
                        <h3>Webcam Setup</h3>
                        <button class="camera-close">×</button>
                    </div>
                    <video class="camera-preview" id="cameraPreview" autoplay muted playsinline></video>
                    <div class="camera-controls">
                        <select class="camera-device-select" id="cameraDeviceSelect">
                            <option value="">Select Camera...</option>
                        </select>
                        <div class="camera-auto-inject">
                            <label>
                                <input type="checkbox" id="autoInjectCheckbox" checked>
                                Auto-inject camera preview shader
                            </label>
                        </div>
                        <div class="camera-buttons">
                            <button class="camera-control-btn" id="startCameraBtn">Start Camera</button>
                            <button class="camera-control-btn stop" id="stopCameraBtn" disabled>Stop Camera</button>
                        </div>
                        <div class="camera-status" id="cameraStatus">Camera not active</div>
                    </div>
                    <div class="camera-info">
                        <h4>Using Camera in Shaders:</h4>
                        <p>Once enabled, use <code>uniform sampler2D u_camera;</code> to access the webcam texture in your fragment shader.</p>
                        <p>Example: <code>vec4 camColor = texture2D(u_camera, uv);</code></p>
                        <p><strong>Note:</strong> Camera texture coordinates are flipped horizontally by default for mirror effect.</p>
                        <p><strong>Auto-inject:</strong> When enabled, starting the camera will temporarily replace your fragment shader with a camera preview. Stopping the camera restores your original code.</p>
                    </div>
                </div>
            `;
            document.body.appendChild(this.modal);
            this.preview = document.getElementById('cameraPreview');
            this.deviceSelect = document.getElementById('cameraDeviceSelect');
            this.startBtn = document.getElementById('startCameraBtn');
            this.stopBtn = document.getElementById('stopCameraBtn');
            this.status = document.getElementById('cameraStatus');
            this.closeBtn = this.modal.querySelector('.camera-close');
            this.autoInjectCheckbox = document.getElementById('autoInjectCheckbox');
        }
        setupEventListeners() {
            this.cameraBtn.addEventListener('click', () => this.openModal());
            this.closeBtn.addEventListener('click', () => this.closeModal());
            this.startBtn.addEventListener('click', () => this.startCamera());
            this.stopBtn.addEventListener('click', () => this.stopCamera());
            this.autoInjectCheckbox.addEventListener('change', (e) => {
                this.autoInjectShader = e.target.checked;
            });
            this.deviceSelect.addEventListener('change', (e) => {
                this.currentDeviceId = e.target.value;
                if (this.isActive) {
                    this.startCamera();
                }
            });
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
            this.setupShaderIntegration();
        }
        async enumerateDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                this.devices = devices.filter(device => device.kind === 'videoinput');
                this.deviceSelect.innerHTML = '<option value="">Select Camera...</option>';
                this.devices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Camera ${this.devices.indexOf(device) + 1}`;
                    this.deviceSelect.appendChild(option);
                });
                if (this.devices.length === 0) {
                    this.status.textContent = 'No cameras found';
                    this.status.className = 'camera-error';
                }
            } catch (error) {
                console.error('Error enumerating devices:', error);
                this.status.textContent = 'Error accessing camera devices';
                this.status.className = 'camera-error';
            }
        }
        injectCameraShader() {
            const fragTA = document.getElementById('fragCode');
            if (fragTA && this.autoInjectShader) {
                this.originalFragCode = fragTA.value;
                const cameraShader = this.getCameraFragmentShader();
                fragTA.value = cameraShader;
                this.uniformWarningShown = false;
                if (window.rebuildProgram) {
                    window.rebuildProgram();
                    setTimeout(() => {
                        if (this.isActive) {
                            this.createTexture();
                            setTimeout(() => this.bindTexture(), 100);
                        }
                    }, 100);
                }
            }
        }
        restoreOriginalShader() {
            const fragTA = document.getElementById('fragCode');
            if (fragTA && this.originalFragCode !== null && this.autoInjectShader) {
                fragTA.value = this.originalFragCode;
                this.originalFragCode = null;
                if (this.gl && this.texture) {
                    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                }
                if (window.rebuildProgram) {
                    window.rebuildProgram();
                }
            }
        }
        async startCamera() {
            try {
                if (this.stream) {
                    this.stopCamera();
                }
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                };
                if (this.currentDeviceId) {
                    constraints.video.deviceId = { exact: this.currentDeviceId };
                }
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.preview.srcObject = this.stream;
                await new Promise((resolve, reject) => {
                    this.preview.onloadedmetadata = () => resolve();
                    this.preview.onerror = (e) => reject(e);
                });
                await this.preview.play();
                this.isActive = true;
                this.cameraBtn.classList.add('active');
                this.cameraBtn.innerHTML = `${CAMERA_SVG}`;
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.status.textContent = `Camera active (${this.preview.videoWidth}x${this.preview.videoHeight})`;
                this.status.className = 'camera-status';
                if (!this.gl) {
                    this.initGL();
                }
                this.createTexture();
                this.injectCameraShader();
                const renderCamera = () => {
                    if (!this.isActive) return;
                    this.updateTexture();
                    this.bindTexture();
                    if (window.render) {
                        window.render();
                    }
                    requestAnimationFrame(renderCamera);
                };
                requestAnimationFrame(renderCamera);
            } catch (error) {
                console.error("Camera error:", error);
                this.status.textContent = `Error: ${error.message}`;
                this.status.className = 'camera-error';
                this.isActive = false;
                this.cameraBtn.classList.remove('active');
                this.cameraBtn.innerHTML = `${CAMERA_SVG}`;
            }
        }
        stopCamera() {
            this.restoreOriginalShader();
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            this.preview.srcObject = null;
            this.isActive = false;
            this.cameraBtn.classList.remove('active');
            this.cameraBtn.innerHTML = `${CAMERA_SVG}`;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.status.textContent = 'Camera stopped';
            this.status.className = 'camera-status';
            if (this.texture && this.gl) {
                this.gl.deleteTexture(this.texture);
                this.texture = null;
            }
            if (window.render) {
                setTimeout(() => window.render(), 50);
            }
        }
        openModal() {
            this.modal.classList.add('show');
            if (this.devices.length === 0) {
                this.enumerateDevices();
            }
        }
        closeModal() {
            this.modal.classList.remove('show');
        }
        createTexture() {
            if (!this.gl || !this.preview) return;
            if (this.texture) {
                this.gl.deleteTexture(this.texture);
            }
            this.texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        }
        updateTexture() {
            if (!this.gl || !this.texture || !this.preview || !this.isActive) return;
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            try {
                this.gl.texImage2D(
                    this.gl.TEXTURE_2D,
                    0,
                    this.gl.RGBA,
                    this.gl.RGBA,
                    this.gl.UNSIGNED_BYTE,
                    this.preview
                );
            } catch (error) {
                console.warn('Error updating camera texture:', error);
            }
        }
        bindTexture() {
            if (!this.gl || !this.texture || !this.isActive) return false;
            if (this.program && window.uniforms) {
                const cameraUniforms = ['u_camera', 'uCamera', 'iCamera', 'camera'];
                for (const name of cameraUniforms) {
                    if (window.uniforms[name]) {
                        this.gl.activeTexture(this.gl.TEXTURE0);
                        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
                        this.gl.uniform1i(window.uniforms[name].loc, 0);
                        return true;
                    }
                }
            }
            return false;
        }
        setupShaderIntegration() {
            const originalRender = window.render;
            if (originalRender) {
                window.render = () => {
                    if (this.isActive && this.gl && this.program && this.texture) {
                        this.updateTexture();
                        this.bindTexture();
                    }
                    originalRender();
                };
            }
            const originalRebuildProgram = window.rebuildProgram;
            if (originalRebuildProgram) {
                window.rebuildProgram = () => {
                    originalRebuildProgram();
                    setTimeout(() => {
                        this.gl = window.gl || document.getElementById('glcanvas').getContext('webgl2') || document.getElementById('glcanvas').getContext('webgl');
                        this.program = window.program;
                        if (this.isActive && this.gl) {
                            this.createTexture();
                        }
                    }, 10);
                };
            }
        }
        initGL() {
            const canvas = document.getElementById('glcanvas');
            this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            this.program = window.program;
        }
    }
    function initCamera() {
        if (!document.getElementById('glcanvas')) {
            setTimeout(initCamera, 100);
            return;
        }
        window.cameraSystem = new CameraSystem();
        window.cameraSystem.initGL();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCamera);
    } else {
        initCamera();
    }
    window.addEventListener('beforeunload', () => {
        if (window.cameraSystem) {
            window.cameraSystem.stopCamera();
        }
    });
})();