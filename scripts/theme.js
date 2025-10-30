(() => {
  class ThemeManager {
    constructor() {
      this.dbName = "ThemeManagerDB";
      this.dbVersion = 2;
      this.storeName = "themes";
      this.db = null;
      this.currentTheme = "default";
      this.isModalOpen = false;
      this.showColorEditor = false;
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
      this.fontOptions = [
        { name: "Courier New", value: "'Courier New', Courier, monospace" },
        { name: "Courier", value: "Courier, 'Courier New', monospace" },
        { name: "Lucida Console", value: "'Lucida Console', Monaco, monospace" },
        { name: "Monaco", value: "Monaco, 'Lucida Console', monospace" },
        { name: "Consolas", value: "Consolas, 'Courier New', monospace" },
        { name: "Andale Mono", value: "'Andale Mono', monospace" },
        { name: "Menlo", value: "Menlo, Monaco, monospace" },
        { name: "Monospace", value: "monospace" },
        { name: "Arial", value: "Arial, Helvetica, sans-serif" },
        { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
        { name: "Sans-serif", value: "sans-serif" },
      ];

      this.defaultFont = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";
      this.presetThemes = {
       "CODE": {
          "--0": "rgba(0, 0, 0, 0.9)",
          "--1": "#000000",
          "--2": "rgba(0, 12, 24, 0.99)",
          "--3": "rgba(16, 25, 44, 0.8)",
          "--4": "rgba(24, 29, 41, 0.63)",
          "--5": "rgba(76, 83, 93, 0.7)",
          "--6": "rgba(174, 174, 174, 0.9)",
          "--7": "rgba(227, 227, 227, 0.9)",
          "--D": "#070a12",
          "--a": "rgba(4, 35, 108, 1)",
          "--ah": "rgba(13, 82, 242, 0.72)",
          "--b": "#1e293b",
          "--d": "rgba(15, 17, 23, .885)",
          "--l": "#f8fafc",
          "--m": "#94a3b8",
          "--r": "#b91040",
          "--rh": "rgba(227, 48, 98, 1)"
        },
        "DARK": {
          "--0": "rgba(0, 0, 0, 0.9)",
          "--1": "#000000",
          "--2": "rgba(10, 10, 10, 0.99)",
          "--3": "rgba(33, 33, 33, 0.47)",
          "--4": "rgba(38, 38, 38, 0.9)",
          "--5": "rgba(113, 113, 113, 0.7)",
          "--6": "rgba(50, 226, 205, 0.9)",
          "--7": "rgba(186, 186, 186, 0.9)",
          "--d": "rgba(28, 28, 28, 0.89)",
          "--D": "#070a12",
          "--l": "#f8fafc",
          "--a": "rgba(180, 19, 137, 1)",
          "--ah": "rgba(255, 15, 155, 0.85)",
          "--b": "#1e293b",
          "--m": "#94a3b8",
          "--r": "rgba(199, 0, 0, 1)",
          "--rh": "rgba(255, 20, 20, 0.84)"
        },
        "LIGHT": {
          "--0": "rgba(255, 255, 255, 0.9)",
          "--1": "#ffffff",
          "--2": "rgba(245, 245, 245, 0.99)",
          "--3": "rgba(186, 186, 186, 0.76)",
          "--4": "rgba(220, 220, 220, 0.9)",
          "--5": "rgba(223, 223, 223, 0.9)",
          "--6": "rgba(27, 28, 28, 0.9)",
          "--7": "rgba(113, 113, 113, 0.9)",
          "--d": "rgba(255, 255, 255, 0.23)",
          "--D": "rgba(78, 78, 78, 0.3)",
          "--l": "#0f172a",
          "--a": "rgba(180, 19, 137, 1)",
          "--ah": "rgba(255, 15, 155, 0.85)",
          "--b": "#e2e8f0",
          "--m": "#475569",
          "--r": "rgba(199, 0, 0, 1)",
          "--rh": "rgba(255, 20, 20, 0.84)"
        }
      };
      this.init();
    }
    async init() {
      this.applyDefaultColors();
      this.applyDefaultFont();
      await this.initDB();
      this.createButton();
      this.createModal();
      this.createConfirmModal();
      await this.loadSavedTheme();
    }
    applyDefaultColors() {
      const root = document.documentElement;
      Object.entries(this.defaultColors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
    applyDefaultFont() {
      document.body.style.fontFamily = this.defaultFont;
      const style = document.createElement('style');
      style.id = 'theme-manager-font-style';
      style.textContent = `* { font-family: ${this.defaultFont} !important; }`;
      document.head.appendChild(style);
    }
    applyFont(fontFamily) {
      const existingStyle = document.getElementById('theme-manager-font-style');
      if (existingStyle) {
        existingStyle.textContent = `* { font-family: ${fontFamily} !important; }`;
      } else {
        const style = document.createElement('style');
        style.id = 'theme-manager-font-style';
        style.textContent = `* { font-family: ${fontFamily} !important; }`;
        document.head.appendChild(style);
      }
      document.body.style.fontFamily = fontFamily;
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
              font: this.defaultFont,
              created: new Date().toISOString()
            });
          } else if (event.oldVersion < 2) {
            const transaction = event.target.transaction;
            const store = transaction.objectStore(this.storeName);
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const themes = getAllRequest.result;
              themes.forEach(theme => {
                if (!theme.font) {
                  theme.font = this.defaultFont;
                  store.put(theme);
                }
              });
            };
          }
        };
      });
    }
    createButton() {
      const button = document.createElement("button");
      button.id = "theme-manager-btn";
      button.title = 'Theme Manager';
      button.setAttribute("aria-label", "Open Theme Manager");
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
          viewBox="0 0 24 24" fill="none" stroke="var(--6)" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          style="pointer-events: none;">
          <path d="M2 18c0 1.1.9 2 2 2h1l3-3-2-2-3 3v1z"></path>
          <path d="M20.7 7.3a1 1 0 0 0 0-1.4L18.1 3.3a1 1 0 0 0-1.4 0l-9.3 9.3 2 2 9.3-9.3z"></path>
        </svg>
      `;
      button.onclick = () => this.toggleModal();
      document.addEventListener('fullscreenchange', () => {
        const modal = document.getElementById('theme-modal');
        const confirmModal = document.getElementById('theme-confirm-modal');
        if (document.fullscreenElement) {
          document.fullscreenElement.appendChild(button);
          if (modal) document.fullscreenElement.appendChild(modal);
          if (confirmModal) document.fullscreenElement.appendChild(confirmModal);
        } else {
          document.body.appendChild(button);
          if (modal) document.body.appendChild(modal);
          if (confirmModal) document.body.appendChild(confirmModal);
        }
      });
      document.body.appendChild(button);
    }
    createConfirmModal() {
      const confirmModal = document.createElement("div");
      confirmModal.id = "theme-confirm-modal";
      confirmModal.innerHTML = `
        <div class="theme-confirm-modal-content">
          <h4 class="theme-confirm-theme-modal-title">Delete Theme</h4>
          <p id="confirm-message" class="theme-confirm-modal-message"></p>
          <div class="theme-confirm-modal-buttons">
            <button id="confirm-cancel" class="theme-confirm-cancel-btn">Cancel</button>
            <button id="confirm-delete" class="theme-confirm-delete-btn">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
      this.setupConfirmModalEvents();
    }
    setupConfirmModalEvents() {
      const confirmModal = document.getElementById("theme-confirm-modal");
      const cancelBtn = document.getElementById("confirm-cancel");
      const deleteBtn = document.getElementById("confirm-delete");
      const cancelConfirm = () => {
        confirmModal.style.display = "none";
        this.confirmCallback = null;
      };
      const confirmDelete = () => {
        if (this.confirmCallback) {
          this.confirmCallback();
        }
        confirmModal.style.display = "none";
        this.confirmCallback = null;
      };
      cancelBtn.onclick = cancelConfirm;
      deleteBtn.onclick = confirmDelete;
      confirmModal.onclick = (e) => {
        if (e.target === confirmModal) {
          cancelConfirm();
        }
      };
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && confirmModal.style.display !== "none") {
          cancelConfirm();
        }
      });
    }
    showCustomConfirm(message, callback) {
      const confirmModal = document.getElementById("theme-confirm-modal");
      const messageElement = document.getElementById("confirm-message");
      messageElement.textContent = message;
      this.confirmCallback = callback;
      confirmModal.style.display = "flex";
    }
    createModal() {
      const modal = document.createElement("div");
      modal.id = "theme-modal";
      modal.innerHTML = `
        <div class="theme-modal-header">
          <div class="theme-modal-header-content">
            <h3 class="theme-modal-title">Theme Manager</h3>
            <button id="close-modal" class="theme-modal-close-btn" aria-label="Close Theme Manager">×</button>
          </div>
          <div class="theme-select-container">
            <label for="theme-select" class="theme-select-label">Select Theme:</label>
            <select id="theme-select" class="theme-select">
              <option value="">Choose a theme...</option>
            </select>
          </div>
          <div class="theme-toggle-editor-container">
            <button id="toggle-editor" class="theme-toggle-editor-btn">
              Editor
            </button>
          </div>
        </div>
        <div id="color-editor-section" style="display: none;">
          <div class="color-editor-controls">
            <div class="theme-name-container">
              <label for="theme-name" class="theme-name-label">Theme Name:</label>
              <input type="text" id="theme-name" placeholder="Enter custom theme name" class="theme-name-input">
              <div class="theme-action-buttons">
                <button id="save-theme" class="save-theme-btn">Save</button>
                <button id="delete-theme" class="delete-theme-btn">Delete</button>
              </div>
            </div>
            <div class="font-select-container">
              <label for="font-select" class="font-select-label">Font Family:</label>
              <select id="font-select" class="font-select">
              </select>
            </div>
          </div>
          <div id="color-inputs" class="color-inputs-container">
          </div>
          <div class="reset-section">
            <button id="reset-colors" class="theme-reset-btn">Reset to Default</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this.setupModalEvents();
      this.createColorInputs();
      this.createFontSelect();
    }
    createFontSelect() {
      const select = document.getElementById("font-select");
      if (!select) return;
      this.fontOptions.forEach(font => {
        const option = document.createElement("option");
        option.value = font.value;
        option.textContent = font.name;
        option.style.fontFamily = font.value;
        select.appendChild(option);
      });
      select.value = this.defaultFont;
    }
    setupModalEvents() {
      const modal = document.getElementById("theme-modal");
      const closeButton = document.getElementById("close-modal");
      const themeSelect = document.getElementById("theme-select");
      const toggleEditorButton = document.getElementById("toggle-editor");
      const saveButton = document.getElementById("save-theme");
      const deleteButton = document.getElementById("delete-theme");
      const resetButton = document.getElementById("reset-colors");
      const fontSelect = document.getElementById("font-select");
      closeButton.onclick = () => this.closeModal();
      themeSelect.onchange = () => this.loadSelectedTheme(themeSelect.value);
      toggleEditorButton.onclick = () => this.toggleColorEditor();
      saveButton.onclick = () => this.saveTheme();
      deleteButton.onclick = () => this.deleteTheme();
      resetButton.onclick = () => this.resetToDefault();
      
      if (fontSelect) {
        fontSelect.onchange = () => {
          this.applyFont(fontSelect.value);
        };
      }
      
      const handleEvent = e => {
        if (!this.isModalOpen) return;
        if ((e.type === "click" && !modal.contains(e.target) && e.target.id !== "theme-manager-btn") || 
            (e.type === "keydown" && e.key === "Escape")) this.closeModal();
      };
      document.addEventListener("click", handleEvent);
      document.addEventListener("keydown", handleEvent);
    }
    toggleColorEditor() {
      const section = document.getElementById("color-editor-section");
      const button = document.getElementById("toggle-editor");
      this.showColorEditor = !this.showColorEditor;
      if (this.showColorEditor) {
        section.style.display = "block";
        button.textContent = "Hide Editor";
        button.style.background = "var(--r)";
      } else {
        section.style.display = "none";
        button.textContent = "Editor";
        button.style.background = "var(--b)";
      }
    }
    async loadSelectedTheme(themeName, showNotification = true) {
      if (!themeName) return;
      if (this.presetThemes[themeName]) {
        this.applyThemeColors(this.presetThemes[themeName]);
        this.currentTheme = themeName;
        if (showNotification) {
          this.showToast(`"${themeName}" preset loaded!`, "success");
        }
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const theme = await new Promise((resolve, reject) => {
          const request = store.get(themeName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (theme) {
          this.applyThemeColors(theme.colors);
          if (theme.font) {
            this.applyFont(theme.font);
            const fontSelect = document.getElementById("font-select");
            if (fontSelect) {
              fontSelect.value = theme.font;
            }
          }
          this.currentTheme = themeName;
          if (showNotification) {
            this.showToast(`"${themeName}" loaded!`, "success");
          }
        }
      } catch (error) {
        if (showNotification) {
          this.showToast("Load failed!", "error");
        }
        console.error("Load theme error:", error);
      }
    }
    applyThemeColors(colors) {
      const root = document.documentElement;
      Object.entries(colors).forEach(([property, color]) => {
        root.style.setProperty(property, color);
        if (this.showColorEditor) {
          const propertyId = property.replace("--", "");
          const preview = document.getElementById(`preview-${propertyId}`);
          const colorInput = document.getElementById(`color-${propertyId}`);
          const alphaSlider = document.getElementById(`alpha-${propertyId}`);
          if (preview) {
            preview.style.background = color;
          }
          if (colorInput) {
            colorInput.value = this.extractHexFromColor(color);
          }
          if (alphaSlider) {
            const rgb = this.colorToRgb(color);
            alphaSlider.value = rgb.a;
            const alphaLabel = alphaSlider.previousElementSibling;
            if (alphaLabel) {
              alphaLabel.textContent = `α: ${rgb.a.toFixed(2)}`;
            }
          }
        }
      });
    }
    async updateThemesList() {
      const select = document.getElementById("theme-select");
      if (!select) return;
      try {
        select.innerHTML = '<option value="">Choose a theme...</option>';
        const defaultOption = document.createElement("option");
        defaultOption.value = "default";
        defaultOption.textContent = "Default";
        select.appendChild(defaultOption);
        const presetGroup = document.createElement("optgroup");
        presetGroup.label = "Presets";
        Object.keys(this.presetThemes).forEach(themeName => {
          const option = document.createElement("option");
          option.value = themeName;
          option.textContent = themeName;
          presetGroup.appendChild(option);
        });
        select.appendChild(presetGroup);
        const transaction = this.db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const themes = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
        if (themes.length > 0) {
          const customGroup = document.createElement("optgroup");
          customGroup.label = "Custom";
          themes.forEach((theme) => {
            if (theme.name === "default") return;
            const option = document.createElement("option");
            option.value = theme.name;
            option.textContent = theme.name;
            customGroup.appendChild(option);
          });
          select.appendChild(customGroup);
        }
      } catch (error) {
        console.error("Update themes list error:", error);
      }
    }
    async deleteTheme() {
      const select = document.getElementById("theme-select");
      const themeName = select.value;
      if (!themeName) {
        this.showToast("Select a theme first!", "error");
        return;
      }
      if (this.presetThemes[themeName]) {
        this.showToast("Cannot delete preset themes!", "error");
        return;
      }
      if (themeName === "default") {
        this.showToast("Cannot delete default theme!", "error");
        return;
      }
      this.showCustomConfirm(`Are you sure you want to delete the theme "${themeName}"? This action cannot be undone.`, async () => {
        try {
          const transaction = this.db.transaction([this.storeName], "readwrite");
          const store = transaction.objectStore(this.storeName);
          await new Promise((resolve, reject) => {
            const request = store.delete(themeName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          await this.updateThemesList();
          this.showToast(`"${themeName}" deleted!`, "success");
          select.value = "";
        } catch (error) {
          this.showToast("Delete failed!", "error");
          console.error("Delete theme error:", error);
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
      container.className = "theme-color-picker-container";
      const header = document.createElement("div");
      header.className = "theme-color-picker-header";
      const propertyLabel = document.createElement("span");
      propertyLabel.textContent = property;
      propertyLabel.className = "property-label";
      const preview = document.createElement("div");
      preview.id = `preview-${property.replace("--", "")}`;
      preview.className = "theme-color-preview";
      preview.style.background = currentColor;
      header.appendChild(propertyLabel);
      header.appendChild(preview);
      const colorLabel = document.createElement("label");
      colorLabel.setAttribute("for", `color-${property.replace("--", "")}`);
      colorLabel.className = "theme-color-input-label";
      colorLabel.textContent = "Color:";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.id = `color-${property.replace("--", "")}`;
      colorInput.value = this.extractHexFromColor(currentColor);
      colorInput.className = "theme-color-input";
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
        alphaLabel.className = "alpha-label";
        const alphaSlider = document.createElement("input");
        alphaSlider.type = "range";
        alphaSlider.min = "0";
        alphaSlider.max = "1";
        alphaSlider.step = "0.01";
        alphaSlider.value = colorRgb.a;
        alphaSlider.id = `alpha-${property.replace("--", "")}`;
        alphaSlider.className = "alpha-slider";
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
      this.applyThemeColors(this.defaultColors);
      this.applyFont(this.defaultFont);
      const fontSelect = document.getElementById("font-select");
      if (fontSelect) {
        fontSelect.value = this.defaultFont;
      }
      this.showToast("Reset to default!", "success");
    }
    async saveTheme() {
      const nameInput = document.getElementById("theme-name");
      const fontSelect = document.getElementById("font-select");
      const themeName = nameInput.value.trim();
      if (!themeName) {
        this.showToast("Enter theme name!", "error");
        return;
      }
      if (this.presetThemes[themeName]) {
        this.showToast("Cannot overwrite preset themes!", "error");
        return;
      }
      const colors = {};
      const root = document.documentElement;
      Object.keys(this.defaultColors).forEach((property) => {
        const value = getComputedStyle(root).getPropertyValue(property).trim();
        colors[property] = value || this.defaultColors[property];
      });
      const selectedFont = fontSelect ? fontSelect.value : this.defaultFont;

      try {
        const transaction = this.db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        await new Promise((resolve, reject) => {
          const request = store.put({
            name: themeName,
            colors: colors,
            font: selectedFont,
            created: new Date().toISOString()
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        this.currentTheme = themeName;
        await this.updateThemesList();
        this.showToast(`"${themeName}" saved!`, "success");
        nameInput.value = "";
      } catch (error) {
        this.showToast("Save failed!", "error");
        console.error("Save theme error:", error);
      }
    }
    async loadSavedTheme() {
      const savedTheme = localStorage.getItem("currentTheme");
      const savedFont = localStorage.getItem("currentFont");
      
      if (savedFont) {
        this.applyFont(savedFont);
      }
      
      if (savedTheme && savedTheme !== "default") {
        await this.loadSelectedTheme(savedTheme, false);
      }
    }
    showToast(message, type = "info") {
      if (typeof window.showToast === 'function') {
        window.showToast(message, type);
      } else {
        console.log(`Toast: ${message} (${type})`);
      }
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
      this.showColorEditor = false;
      const button = document.getElementById("toggle-editor");
      const section = document.getElementById("color-editor-section");
      if (button && section) {
        button.textContent = "Editor";
        button.style.background = "var(--b)";
        section.style.display = "none";
      }
      localStorage.setItem("currentTheme", this.currentTheme);
      
      const fontSelect = document.getElementById("font-select");
      if (fontSelect) {
        localStorage.setItem("currentFont", fontSelect.value);
      }
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