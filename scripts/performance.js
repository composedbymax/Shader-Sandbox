class GLSLPerformanceMonitor {
  constructor(t, s = {}) {
    (this.canvas = t),
      (this.gl = t.getContext("webgl") || t.getContext("webgl2")),
      (this.options = {
        sampleSize: s.sampleSize || 60,
        showFPS: void 0 === s.showFPS || s.showFPS,
        showMemory: void 0 === s.showMemory || s.showMemory,
        showGPUInfo: void 0 === s.showGPUInfo || s.showGPUInfo,
        showDrawCalls: void 0 === s.showDrawCalls || s.showDrawCalls,
        overlayPosition: s.overlayPosition || "top-right",
      }),
      (this.metrics = {
        fps: { current: 0, average: 0, min: 1 / 0, max: 0, history: [] },
        drawCalls: 0,
        triangleCount: 0,
        memory: { jsHeapSizeLimit: 0, totalJSHeapSize: 0, usedJSHeapSize: 0 },
        gpuInfo: { vendor: "", renderer: "" },
      }),
      (this.lastTimestamp = performance.now()),
      (this.frameCount = 0),
      (this.isPanelOpen = !1),
      this.createUI(),
      this.options.showGPUInfo && this.collectGPUInfo(),
      this.instrumentGLDrawCalls();
  }
  createUI() {
    (this.container = document.createElement("div")),
      (this.container.className = "glsl-performance-monitor-container"),
      this.updateContainerPosition(),
      (this.toggleButton = document.createElement("button")),
      (this.toggleButton.className = "glsl-performance-monitor-toggle"),
      this.toggleButton.title = "Performance Monitor";
      (this.toggleButton.innerHTML =
        '\n        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n          <path d="M3 13H10V3H3V13ZM3 21H10V15H3V21ZM12 21H19V11H12V21ZM12 3V9H19V3H12Z" fill="var(--6)"/>\n        </svg>\n      '),
      (this.overlay = document.createElement("div")),
      (this.overlay.className = "glsl-performance-monitor-panel"),
      (this.overlay.style.display = "none");
    const t = document.createElement("div");
    t.className = "glsl-performance-monitor-header";
    const s = document.createElement("div");
    (s.textContent = "Performance Monitor"),
      (s.className = "glsl-performance-monitor-title"),
      t.appendChild(s),
      this.overlay.appendChild(t),
      this.options.showFPS &&
        ((this.fpsDisplay = document.createElement("div")),
        (this.fpsDisplay.className = "glsl-performance-monitor-display"),
        this.overlay.appendChild(this.fpsDisplay)),
      this.options.showDrawCalls &&
        ((this.drawCallsDisplay = document.createElement("div")),
        (this.drawCallsDisplay.className = "glsl-performance-monitor-display"),
        this.overlay.appendChild(this.drawCallsDisplay)),
      this.options.showMemory &&
        ((this.memoryDisplay = document.createElement("div")),
        (this.memoryDisplay.className = "glsl-performance-monitor-display"),
        this.overlay.appendChild(this.memoryDisplay)),
      this.options.showGPUInfo &&
        ((this.gpuInfoDisplay = document.createElement("div")),
        this.overlay.appendChild(this.gpuInfoDisplay)),
      this.toggleButton.addEventListener("click", () => this.togglePanel()),
      this.container.appendChild(this.toggleButton),
      this.container.appendChild(this.overlay),
      (this.canvas.parentNode.style.position = "relative"),
      this.canvas.parentNode.appendChild(this.container);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isPanelOpen) {
          this.togglePanel();
        }
      });
  }
  updateContainerPosition() {
    this.container.classList.remove("top-left", "top-right", "bottom-left", "bottom-right");
    this.container.classList.add(this.options.overlayPosition);
  }
  togglePanel() {
    (this.isPanelOpen = !this.isPanelOpen),
      (this.overlay.style.display = this.isPanelOpen ? "block" : "none");
    const t = this.isPanelOpen
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n            <path d="M3 13H10V3H3V13ZM3 21H10V15H3V21ZM12 21H19V11H12V21ZM12 3V9H19V3H12Z" fill="var(--rh)"/>\n          </svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n            <path d="M3 13H10V3H3V13ZM3 21H10V15H3V21ZM12 21H19V11H12V21ZM12 3V9H19V3H12Z" fill="var(--7)"/>\n          </svg>';
    (this.toggleButton.innerHTML = t),
      this.isPanelOpen ? this.start() : this.stop();
  }
  start() {
    (this.isRunning = !0),
      (this.frameCount = 0),
      (this.lastTimestamp = performance.now()),
      (this.metrics.fps.history = []),
      (this.metrics.fps.min = 1 / 0),
      (this.metrics.fps.max = 0),
      (this.metrics.drawCalls = 0),
      (this.metrics.triangleCount = 0),
      this.animate();
  }
  stop() {
    (this.isRunning = !1),
      this.animationFrameId &&
        (cancelAnimationFrame(this.animationFrameId),
        (this.animationFrameId = null));
  }
  animate() {
    if (!this.isRunning) return;
    const t = performance.now(),
      s = t - this.lastTimestamp;
    s >= 1e3 &&
      ((this.metrics.fps.current = Math.round((1e3 * this.frameCount) / s)),
      (this.metrics.fps.min = Math.min(
        this.metrics.fps.min,
        this.metrics.fps.current
      )),
      (this.metrics.fps.max = Math.max(
        this.metrics.fps.max,
        this.metrics.fps.current
      )),
      this.metrics.fps.history.push(this.metrics.fps.current),
      this.metrics.fps.history.length > this.options.sampleSize &&
        this.metrics.fps.history.shift(),
      (this.metrics.fps.average = Math.round(
        this.metrics.fps.history.reduce((t, s) => t + s, 0) /
          this.metrics.fps.history.length
      )),
      this.options.showMemory &&
        window.performance &&
        performance.memory &&
        (this.metrics.memory = {
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          usedJSHeapSize: performance.memory.usedJSHeapSize,
        }),
      this.updateDisplay(),
      (this.frameCount = 0),
      (this.lastTimestamp = t),
      (this.metrics.drawCalls = 0),
      (this.metrics.triangleCount = 0)),
      this.frameCount++,
      (this.animationFrameId = requestAnimationFrame(() => this.animate()));
  }
  updateDisplay() {
    if (this.overlay && this.isPanelOpen) {
      if (
        (this.options.showFPS &&
          this.fpsDisplay &&
          (this.fpsDisplay.innerHTML = `\n          <div><b>FPS:</b> <span class="glsl-performance-monitor-value">${this.metrics.fps.current}</span></div>\n          <div class="glsl-performance-monitor-details">\n            avg: ${this.metrics.fps.average}, \n            min: ${this.metrics.fps.min}, \n            max: ${this.metrics.fps.max}\n          </div>\n        `),
        this.options.showDrawCalls &&
          this.drawCallsDisplay &&
          (this.drawCallsDisplay.innerHTML = `\n          <div><b>Draw calls:</b> <span class="glsl-performance-monitor-value">${
            this.metrics.drawCalls
          }</span></div>\n          <div class="glsl-performance-monitor-details">\n            Triangles: ~<span class="glsl-performance-monitor-highlight">${Math.round(
            this.metrics.triangleCount
          )}</span>\n          </div>\n        `),
        this.options.showMemory &&
          this.memoryDisplay &&
          window.performance &&
          performance.memory)
      ) {
        const t = (t) => (t / 1048576).toFixed(2);
        this.memoryDisplay.innerHTML = `\n          <div><b>Memory:</b> <span class="glsl-performance-monitor-value">${t(
          this.metrics.memory.usedJSHeapSize
        )} MB</span></div>\n          <div class="glsl-performance-monitor-details">\n            Total: ${t(
          this.metrics.memory.totalJSHeapSize
        )} MB\n            (Limit: ${t(
          this.metrics.memory.jsHeapSizeLimit
        )} MB)\n          </div>\n        `;
      }
      this.options.showGPUInfo &&
        this.gpuInfoDisplay &&
        (this.gpuInfoDisplay.innerHTML = `\n          <div><b>GPU:</b> <span class="glsl-performance-monitor-value">${this.metrics.gpuInfo.vendor}</span></div>\n          <div class="glsl-performance-monitor-details">\n            ${this.metrics.gpuInfo.renderer}\n          </div>\n        `);
    }
  }
  collectGPUInfo() {
    if (this.gl) {
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      if (isFirefox) {
        this.metrics.gpuInfo.vendor = this.gl.getParameter(this.gl.VENDOR) || "Unknown";
        this.metrics.gpuInfo.renderer = this.gl.getParameter(this.gl.RENDERER) || "Unknown";
      } else {
        const debugInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          this.metrics.gpuInfo.vendor = 
            this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Unknown";
          this.metrics.gpuInfo.renderer = 
            this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown";
        } else {
          this.metrics.gpuInfo.vendor = this.gl.getParameter(this.gl.VENDOR) || "Unknown";
          this.metrics.gpuInfo.renderer = this.gl.getParameter(this.gl.RENDERER) || "Unknown";
        }
      }
    }
  }
  instrumentGLDrawCalls() {
    if (!this.gl || !this.options.showDrawCalls) return;
    const t = this.gl.drawArrays,
      s = this.gl.drawElements;
    (this.gl.drawArrays = (s, i, e) => {
      if (this.isPanelOpen)
        switch ((this.metrics.drawCalls++, s)) {
          case this.gl.TRIANGLES:
            this.metrics.triangleCount += e / 3;
            break;
          case this.gl.TRIANGLE_STRIP:
          case this.gl.TRIANGLE_FAN:
            e >= 3 && (this.metrics.triangleCount += e - 2);
        }
      return t.call(this.gl, s, i, e);
    }),
      (this.gl.drawElements = (t, i, e, n) => {
        if (this.isPanelOpen)
          switch ((this.metrics.drawCalls++, t)) {
            case this.gl.TRIANGLES:
              this.metrics.triangleCount += i / 3;
              break;
            case this.gl.TRIANGLE_STRIP:
            case this.gl.TRIANGLE_FAN:
              i >= 3 && (this.metrics.triangleCount += i - 2);
          }
        return s.call(this.gl, t, i, e, n);
      });
  }
  getMetrics() {
    return this.metrics;
  }
  setPosition(t) {
    this.container &&
      ((this.options.overlayPosition = t), this.updateContainerPosition());
  }
  destroy() {
    this.stop(),
      this.container &&
        this.container.parentNode &&
        this.container.parentNode.removeChild(this.container),
      this.gl &&
        this.options.showDrawCalls &&
        (this._originalDrawArrays &&
          (this.gl.drawArrays = this._originalDrawArrays),
        this._originalDrawElements &&
          (this.gl.drawElements = this._originalDrawElements));
  }
}