/* Global hotkeys.
   - H        hint
   - R        restart level
   - U / ⌘Z   undo
   - Space    recenter view
   - + / -    zoom in / out
   - Esc      close drawer / modals

   Keys are ignored when focus is in an input. */

export function attachKeyboard(handlers) {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const key = e.key;
    const meta = e.metaKey || e.ctrlKey;

    if (key === 'Escape') { handlers.onEsc?.(); return; }
    if (meta && (key === 'z' || key === 'Z')) { e.preventDefault(); handlers.onUndo?.(); return; }
    switch (key) {
      case 'h': case 'H': handlers.onHint?.(); break;
      case 'u': case 'U': handlers.onUndo?.(); break;
      case 'r': case 'R': handlers.onRestart?.(); break;
      case ' ':           e.preventDefault(); handlers.onRecenter?.(); break;
      case '+': case '=': handlers.onZoomIn?.(); break;
      case '-': case '_': handlers.onZoomOut?.(); break;
      case 'ArrowRight':  handlers.onNextLevel?.(); break;
      case 'ArrowLeft':   handlers.onPrevLevel?.(); break;
      default: break;
    }
  });
}
