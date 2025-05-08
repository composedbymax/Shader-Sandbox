document.addEventListener("DOMContentLoaded", () => {
  // ---- Long-press gesture for mobile ----
  let pressTimer = null;
  document.addEventListener("touchstart", (e) => {
    // start long-press timer
    pressTimer = setTimeout(() => {
      const touch = e.touches[0];
      const ctxEvt = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      e.target.dispatchEvent(ctxEvt);
    }, 600); // 600 ms threshold
  }, { passive: true });
  
  document.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  }, { passive: true });
  
  document.addEventListener("touchmove", () => {
    clearTimeout(pressTimer);
  }, { passive: true });
  // ----------------------------------------

  const menu = document.createElement("div");
  menu.className = "custom-context-menu";
  menu.style.display = "none";
  menu.style.position = "absolute";
  menu.style.zIndex = "99999";
  menu.style.minWidth = "150px";
  document.body.appendChild(menu);

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .custom-context-menu {
      background-color: var(--d);
      border: 0.3px solid var(--l);
      border-radius: 4px;
      user-select: none;
    }
    .custom-context-menu-item {
      padding: 8px 12px;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
    }
    .custom-context-menu-item:hover {
      background-color: var(--D);
    }
    .custom-context-menu-separator {
      height: 2px;
      background-color: #444;
      margin: 5px 0;
    }
  `;
  document.head.appendChild(styleEl);

  let targetEl = null;
  let isEditable = false;
  let hasSelection = false;

  const hideMenu = () => {
    menu.style.display = "none";
  };

  const addItem = (label, action) => {
    const item = document.createElement("div");
    item.className = "custom-context-menu-item";
    item.textContent = label;
    item.addEventListener("click", (evt) => {
      evt.stopPropagation();
      hideMenu();
      action();
    });
    menu.appendChild(item);
  };

  document.addEventListener("contextmenu", async (evt) => {
    evt.preventDefault();
    targetEl = evt.target;
    isEditable = ["TEXTAREA", "INPUT"].includes(targetEl.tagName) || targetEl.isContentEditable;
    hasSelection = window.getSelection().toString().length > 0;
    menu.innerHTML = "";

    if (hasSelection) {
      addItem("Copy", () => document.execCommand("copy"));
      if (isEditable) addItem("Cut", () => document.execCommand("cut"));
    }

    if (isEditable) {
      addItem("Paste", async () => {
        let text = "";
        try {
          text = await navigator.clipboard.readText();
        } catch (err) {
          console.warn("Clipboard read failed:", err);
          return;
        }
        if (["INPUT", "TEXTAREA"].includes(targetEl.tagName)) {
          const start = targetEl.selectionStart;
          const end = targetEl.selectionEnd;
          const val = targetEl.value;
          targetEl.value = val.slice(0, start) + text + val.slice(end);
          const newPos = start + text.length;
          targetEl.setSelectionRange(newPos, newPos);
          targetEl.focus();
        } else if (targetEl.isContentEditable) {
          if (!document.execCommand("insertText", false, text)) {
            const sel = window.getSelection();
            if (sel.rangeCount) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(text));
              range.setStartAfter(range.endContainer);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
          targetEl.focus();
        }
      });

      addItem("Copy Text Field", () => {
        targetEl.focus();
        if (["INPUT", "TEXTAREA"].includes(targetEl.tagName)) {
          targetEl.select();
        } else if (targetEl.isContentEditable) {
          document.execCommand("selectAll");
        }
        document.execCommand("copy");
      });

      addItem("Delete All (Text Field)", () => {
        targetEl.focus();
        if (["TEXTAREA", "INPUT"].includes(targetEl.tagName)) {
          targetEl.value = "";
        } else if (targetEl.isContentEditable) {
          targetEl.textContent = "";
        }
      });
    }

    addItem("Copy All", () => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
      sel.removeAllRanges();
    });

    const sep = document.createElement("div");
    sep.className = "custom-context-menu-separator";
    menu.appendChild(sep);

    addItem("Back", () => window.history.back());
    addItem("Reload", () => window.location.reload());

    menu.style.display = "block";
    const rect = menu.getBoundingClientRect();
    let x = evt.clientX;
    let y = evt.clientY;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 5;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 5;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  });

  document.addEventListener("click", hideMenu);
  window.addEventListener("scroll", hideMenu);
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") hideMenu();
  });

  // Ensure right-click focusing on code blocks still works
  setTimeout(() => {
    document.querySelectorAll("#vertCode, #fragCode").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        if (e.button === 2) el.focus();
      });
    });
  }, 500);
});
