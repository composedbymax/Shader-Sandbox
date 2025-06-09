(() => {
  class ThemeManager {
    constructor() {
      this.dbName = "ThemeManagerDB";
      this.dbVersion = 1;
      this.storeName = "themes";
      this.db = null;
      this.currentTheme = "default";
      this.isModalOpen = false;
      this.defaultColors = {
        "--0": "rgba(0, 0, 0, 0.9)",
        "--1": "#000000",
        "--2": "rgba(28, 28, 28, 0.99)",
        "--3": "rgba(37, 37, 37, 0.8)",
        "--4": "rgba(64, 64, 64, 0.9)",
        "--5": "rgba(113, 113, 113, 0.7)",
        "--6": "rgba(174, 174, 174, 0.9)",
        "--7": "rgba(227, 227, 227, 0.9)",
        "--d": "rgba(15, 17, 23, .885)",
        "--D": "#070a12",
        "--l": "#f8fafc",
        "--a": "#10b981",
        "--ah": "rgba(36, 214, 154, 0.848)",
        "--b": "#1e293b",
        "--m": "#94a3b8",
        "--r": "#b91040",
        "--rh": "rgba(227, 48, 98, 0.79)"
      };
      this.init();
    }
    async init() {
      this.applyDefaultColors();
      await this.initDB();
      this.createButton();
      this.createModal();
      await this.loadSavedTheme();
    }
    applyDefaultColors() {
      const root = document.documentElement;
      Object.entries(this.defaultColors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
    initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: "name" });
            store.add({
              name: "default",
              colors: this.defaultColors,
              created: new Date().toISOString()
            });
          }
        };
      });
    }
    createButton() {
      const button = document.createElement("button");
      button.id = "theme-manager-btn";
      button.setAttribute("aria-label", "Open Theme Manager");
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
          viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          style="pointer-events: none;">
          <path d="M2 18c0 1.1.9 2 2 2h1l3-3-2-2-3 3v1z"></path>
          <path d="M20.7 7.3a1 1 0 0 0 0-1.4L18.1 3.3a1 1 0 0 0-1.4 0l-9.3 9.3 2 2 9.3-9.3z"></path>
        </svg>
      `;
      button.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        z-index: 1000;
        background: var(--d);
        border: none;
        width: 2rem;
        height: 2rem;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      `;
      button.onclick = () => this.toggleModal();
      document.body.appendChild(button);
    }
    createModal() {
      const modal = document.createElement("div");
      modal.id = "theme-modal";
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 380px;
        max-height: calc(100vh - 40px);
        background: var(--3);
        color: var(--1);
        border-radius: 4px;
        z-index: 1005;
        display: none;
        overflow: hidden;
        border: 1px solid var(--2));
      `;
      modal.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid var(--2); background: var(--2);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: var(--6); font-size: 18px;">Theme Manager</h3>
            <button id="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--r); padding: 0; width: 24px; height: 24px;" aria-label="Close Theme Manager">×</button>
          </div>
          <div style="margin-top: 15px;">
            <label for="theme-name" style="display: block; font-size: 11px; margin-bottom: 4px; color: var(--6);">Name:</label>
            <input type="text" id="theme-name" placeholder="enter name" style="width: 100%; padding: 6px 8px; border: 1px solid var(--5); border-radius: 4px; font-size: 12px; margin-bottom: 8px; box-sizing: border-box;">
            <div style="display: flex; gap: 6px;">
              <button id="save-theme" style="flex: 1; padding: 6px 8px; background: var(--a); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Save</button>
              <label for="load-theme" style="flex: 1; position: relative;">
                <select id="load-theme" style="width: 100%; padding: 6px 4px;background:var(--3); border: 1px solid var(--5); border-radius: 4px; cursor: pointer; font-size: 11px; box-sizing: border-box;">
                  <option value="">Load theme...</option>
                </select>
              </label>
              <button id="delete-theme" style="padding: 6px 8px; background: var(--r); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Del</button>
            </div>
          </div>
        </div>
        <div id="color-inputs" style="max-height: calc(100vh - 200px); overflow-y: auto; padding: 15px;">
        </div>
        <div style="padding: 15px; border-top: 1px solid var(--5); background: var(--7);">
          <button id="reset-colors" style="width: 100%; padding: 8px; background: var(--4); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Reset to Default</button>
        </div>
      `;
      document.body.appendChild(modal);
      this.setupModalEvents();
      this.createColorInputs();
    }
    setupModalEvents() {
      const modal = document.getElementById("theme-modal");
      const closeButton = document.getElementById("close-modal");
      const saveButton = document.getElementById("save-theme");
      const loadSelect = document.getElementById("load-theme");
      const deleteButton = document.getElementById("delete-theme");
      const resetButton = document.getElementById("reset-colors");
      closeButton.onclick = () => this.closeModal();
      saveButton.onclick = () => this.saveTheme();
      loadSelect.onchange = () => this.loadTheme(loadSelect.value);
      deleteButton.onclick = () => this.deleteTheme();
      resetButton.onclick = () => this.resetToDefault();
      document.addEventListener("click", (event) => {
        if (this.isModalOpen && 
            !modal.contains(event.target) && 
            event.target.id !== "theme-manager-btn") {
          this.closeModal();
        }
      });
    }
    updateColorRealTime(property, color, alpha = null) {
      const root = document.documentElement;
      let finalColor = color;
      if (alpha !== null && color.startsWith("#")) {
        const rgb = this.colorToRgb(color);
        finalColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      }
      root.style.setProperty(property, finalColor);
    }
    colorToRgb(color) {
      let r, g, b, a = 1;
      if (color.includes("rgba") || color.includes("rgb")) {
        const match = color.match(/rgba?\(([^)]+)\)/);
        if (match) {
          const values = match[1].split(",").map(val => parseFloat(val.trim()));
          r = values[0];
          g = values[1];
          b = values[2];
          if (values[3] !== undefined) {
            a = values[3];
          }
        }
      } else if (color.startsWith("#")) {
        const hex = color.slice(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else {
        return { r: 0, g: 0, b: 0, a: 1 };
      }
      return { 
        r: Math.round(r), 
        g: Math.round(g), 
        b: Math.round(b), 
        a: a 
      };
    }
    rgbToHex(r, g, b) {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    createCompactColorPicker(property, currentColor, onChange) {
      const container = document.createElement("div");
      container.style.cssText = `
        margin-bottom: 12px;
        padding: 10px;
        border: 1px solid var(--5);
        border-radius: 2px;
        background: var(--4);
      `;
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      `;
      const propertyLabel = document.createElement("span");
      propertyLabel.textContent = property;
      propertyLabel.style.cssText = `
        font-weight: bold;
        font-size: 12px;
        color: var(--1);
      `;
      const preview = document.createElement("div");
      preview.id = `preview-${property.replace("--", "")}`;
      preview.style.cssText = `
        width: 30px;
        height: 20px;
        border: 1px solid var(--5);
        border-radius: 3px;
        background: ${currentColor};
      `;
      header.appendChild(propertyLabel);
      header.appendChild(preview);
      const colorLabel = document.createElement("label");
      colorLabel.setAttribute("for", `color-${property.replace("--", "")}`);
      colorLabel.style.cssText = `
        display: block;
        font-size: 10px;
        margin-bottom: 4px;
        color: var(--1);
      `;
      colorLabel.textContent = "Color:";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.id = `color-${property.replace("--", "")}`;
      colorInput.value = this.extractHexFromColor(currentColor);
      colorInput.style.cssText = `
        width: 100%;
        height: 30px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 6px;
      `;
      colorInput.addEventListener("input", (event) => {
        const hexColor = event.target.value;
        const alphaSlider = container.querySelector(`#alpha-${property.replace("--", "")}`);
        const alphaValue = alphaSlider ? parseFloat(alphaSlider.value) : 1;
        this.updateColorRealTime(property, hexColor, alphaValue);
        if (alphaValue < 1) {
          const rgb = this.colorToRgb(hexColor);
          preview.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaValue})`;
        } else {
          preview.style.background = hexColor;
        }
        onChange(hexColor);
      });
      container.appendChild(header);
      container.appendChild(colorLabel);
      container.appendChild(colorInput);
      const colorRgb = this.colorToRgb(currentColor);
      if (currentColor.includes("rgba") || colorRgb.a < 1) {
        const alphaContainer = document.createElement("div");
        const alphaLabel = document.createElement("label");
        alphaLabel.setAttribute("for", `alpha-${property.replace("--", "")}`);
        alphaLabel.textContent = `α: ${colorRgb.a.toFixed(2)}`;
        alphaLabel.style.cssText = `
          display: block;
          font-size: 10px;
          margin-bottom: 4px;
          color: var(--1);
        `;
        const alphaSlider = document.createElement("input");
        alphaSlider.type = "range";
        alphaSlider.min = "0";
        alphaSlider.max = "1";
        alphaSlider.step = "0.01";
        alphaSlider.value = colorRgb.a;
        alphaSlider.id = `alpha-${property.replace("--", "")}`;
        alphaSlider.style.cssText = `
          width: 100%;
          height: 15px;
        `;
        alphaSlider.addEventListener("input", () => {
          const alphaValue = parseFloat(alphaSlider.value);
          alphaLabel.textContent = `α: ${alphaValue.toFixed(2)}`;
          const hexColor = colorInput.value;
          this.updateColorRealTime(property, hexColor, alphaValue);
          const rgb = this.colorToRgb(hexColor);
          preview.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaValue})`;
        });
        alphaContainer.appendChild(alphaLabel);
        alphaContainer.appendChild(alphaSlider);
        container.appendChild(alphaContainer);
      }
      return container;
    }
    extractHexFromColor(color) {
      if (color.startsWith("#")) {
        return color;
      }
      if (color.includes("rgb")) {
        const rgb = this.colorToRgb(color);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
      }
      return "#000000";
    }
    createColorInputs() {
      const container = document.getElementById("color-inputs");
      Object.entries(this.defaultColors).forEach(([property, color]) => {
        const colorPicker = this.createCompactColorPicker(property, color, (newColor) => {
        });
        container.appendChild(colorPicker);
      });
    }
    resetToDefault() {
      const root = document.documentElement;
      Object.entries(this.defaultColors).forEach(([property, color]) => {
        root.style.setProperty(property, color);
        const propertyId = property.replace("--", "");
        const preview = document.getElementById(`preview-${propertyId}`);
        const alphaSlider = document.getElementById(`alpha-${propertyId}`);
        if (preview) {
          preview.style.background = color;
        }
        if (alphaSlider) {
          const rgb = this.colorToRgb(color);
          alphaSlider.value = rgb.a;
          const alphaLabel = alphaSlider.previousElementSibling;
          if (alphaLabel) {
            alphaLabel.textContent = `α: ${rgb.a.toFixed(2)}`;
          }
        }
      });
      Object.entries(this.defaultColors).forEach(([property, color]) => {
        const propertyId = property.replace("--", "");
        const colorInput = document.getElementById(`color-${propertyId}`);
        if (colorInput) {
          colorInput.value = this.extractHexFromColor(color);
        }
      });
      this.showNotification("Reset to default!", "success");
    }
    async saveTheme() {
      const nameInput = document.getElementById("theme-name");
      const themeName = nameInput.value.trim();
      if (!themeName) {
        this.showNotification("Enter theme name!", "error");
        return;
      }
      const colors = {};
      const root = document.documentElement;
      Object.keys(this.defaultColors).forEach((property) => {
        const value = getComputedStyle(root).getPropertyValue(property).trim();
        colors[property] = value || this.defaultColors[property];
      });
      try {
        const transaction = this.db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        
        await new Promise((resolve, reject) => {
          const request = store.put({
            name: themeName,
            colors: colors,
            created: new Date().toISOString()
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        
        this.currentTheme = themeName;
        await this.updateThemesList();
        this.showNotification(`"${themeName}" saved!`, "success");
        nameInput.value = "";
        
      } catch (error) {
        this.showNotification("Save failed!", "error");
        console.error("Save theme error:", error);
      }
    }
    async loadTheme(themeName) {
      if (!themeName) return;
      try {
        const transaction = this.db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const theme = await new Promise((resolve, reject) => {
          const request = store.get(themeName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (theme) {
          const root = document.documentElement;
          Object.entries(theme.colors).forEach(([property, color]) => {
            root.style.setProperty(property, color);
            const propertyId = property.replace("--", "");
            const preview = document.getElementById(`preview-${propertyId}`);
            const alphaSlider = document.getElementById(`alpha-${propertyId}`);
            if (preview) {
              preview.style.background = color;
              const colorInput = document.getElementById(`color-${propertyId}`);
              if (colorInput) {
                colorInput.value = this.extractHexFromColor(color);
              }
            }
            if (alphaSlider) {
              const rgb = this.colorToRgb(color);
              alphaSlider.value = rgb.a;
              const alphaLabel = alphaSlider.previousElementSibling;
              if (alphaLabel) {
                alphaLabel.textContent = `α: ${rgb.a.toFixed(2)}`;
              }
            }
          });
          this.currentTheme = themeName;
          this.showNotification(`"${themeName}" loaded!`, "success");
        }
      } catch (error) {
        this.showNotification("Load failed!", "error");
        console.error("Load theme error:", error);
      }
    }
    async deleteTheme() {
      const select = document.getElementById("load-theme");
      const themeName = select.value;
      if (!themeName || themeName === "default") {
        this.showNotification("Select valid theme!", "error");
        return;
      }
      if (confirm(`Delete "${themeName}"?`)) {
        try {
          const transaction = this.db.transaction([this.storeName], "readwrite");
          const store = transaction.objectStore(this.storeName);
          await new Promise((resolve, reject) => {
            const request = store.delete(themeName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          await this.updateThemesList();
          this.showNotification(`"${themeName}" deleted!`, "success");
          select.value = "";
        } catch (error) {
          this.showNotification("Delete failed!", "error");
          console.error("Delete theme error:", error);
        }
      }
    }
    async updateThemesList() {
      const select = document.getElementById("load-theme");
      if (!select) return;
      try {
        const transaction = this.db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const themes = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
        select.innerHTML = '<option value="">Load theme...</option>';
        themes.forEach((theme) => {
          const option = document.createElement("option");
          option.value = theme.name;
          option.textContent = theme.name;
          select.appendChild(option);
        });
      } catch (error) {
        console.error("Update themes list error:", error);
      }
    }
    async loadSavedTheme() {
      const savedTheme = localStorage.getItem("currentTheme");
      if (savedTheme && savedTheme !== "default") {
        await this.loadTheme(savedTheme);
      }
    }
    showNotification(message, type = "info") {
      const notification = document.createElement("div");
      
      const backgroundColor = type === "success" 
        ? "var(--a)" 
        : type === "error" 
          ? "var(--r)" 
          : "var(--b)";
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 410px;
        z-index: 10002;
        padding: 8px 12px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        font-weight: bold;
        background: ${backgroundColor};
        transform: translateX(100%);
        transition: transform 0.3s ease;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.transform = "translateX(0)";
      }, 100);
      setTimeout(() => {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 2000);
    }
    toggleModal() {
      if (this.isModalOpen) {
        this.closeModal();
      } else {
        this.openModal();
      }
    }
    async openModal() {
      document.getElementById("theme-modal").style.display = "block";
      this.isModalOpen = true;
      await this.updateThemesList();
    }
    closeModal() {
      document.getElementById("theme-modal").style.display = "none";
      this.isModalOpen = false;
      localStorage.setItem("currentTheme", this.currentTheme);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.themeManager = new ThemeManager();
    });
  } else {
    window.themeManager = new ThemeManager();
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ThemeManager;
  }
})();