(function () {
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  onReady(() => {
    const validIDs = ["vertCode", "fragCode"];
    const pairs = {
      "(": ")","[": "]","{": "}","\"": "\"","'": "'"
    };
    document.addEventListener("keydown", (e) => {
      let editor = document.activeElement?.closest('.code-editor[contenteditable="true"]');
      if (!editor) return;
      const assoc = editor.getAttribute("data-associated-textarea-id");
      if (!validIDs.includes(assoc)) return;
      const textarea = document.getElementById(assoc);
      if (!textarea) return;
      const sel = window.getSelection();
      let start = 0;
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        start = preCaretRange.toString().length;
      }
      const end = start;
      const raw = textarea.value;
      if (pairs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const insertText = e.key + pairs[e.key];
        textarea.value = raw.slice(0, start) + insertText + raw.slice(end);
        editor.innerText = textarea.value;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        queueMicrotask(() => setCursor(editor, start + 1));
        return;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        textarea.value = raw.slice(0, start) + "  " + raw.slice(end);
        editor.innerText = textarea.value;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        queueMicrotask(() => setCursor(editor, start + 2));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const lines = raw.slice(0, start).split("\n");
        const currentLine = lines[lines.length - 1];
        const leadingWhitespace = currentLine.match(/^\s*/)[0] || "";
        const extraIndent = raw[start - 1] === "{" ? "  " : "";
        const insertText = "\n" + leadingWhitespace + extraIndent;
        textarea.value = raw.slice(0, start) + insertText + raw.slice(end);
        editor.innerText = textarea.value;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        queueMicrotask(() => setCursor(editor, start + insertText.length));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        const lines = raw.split("\n");
        let charCount = 0;
        let lineIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (start <= charCount + lines[i].length) {
            lineIndex = i;
            break;
          }
          charCount += lines[i].length + 1;
        }
        const lineStart = charCount;
        const lineEnd = charCount + lines[lineIndex].length;
        const lineText = lines[lineIndex];
        const newValue = raw.slice(0, lineStart) + raw.slice(lineEnd + (lineIndex < lines.length - 1 ? 1 : 0));
        textarea.value = newValue;
        editor.innerText = newValue;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        navigator.clipboard.writeText(lineText).catch(err => {
          console.error("Clipboard write failed:", err);
        });
        queueMicrotask(() => setCursor(editor, lineStart));
        return;
      }
    }, true);
    function setCursor(editor, pos) {
      let charIndex = 0;
      let nodeStack = [editor];
      let selRangeSet = false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      while (nodeStack.length && !selRangeSet) {
        const node = nodeStack.shift();
        if (node.nodeType === 3) {
          const nextCharIndex = charIndex + node.length;
          if (pos <= nextCharIndex) {
            const range = document.createRange();
            range.setStart(node, pos - charIndex);
            range.collapse(true);
            sel.addRange(range);
            selRangeSet = true;
          }
          charIndex = nextCharIndex;
        } else if (node.nodeType === 1) {
          nodeStack.push(...node.childNodes);
        }
      }
    }
  });
})();