/* Bottom action bar: Undo, Hint, Recenter, Restart. Pure event wiring. */

export function initActions(handlers) {
  document.getElementById('btn-undo').addEventListener('click', handlers.onUndo);
  document.getElementById('btn-hint').addEventListener('click', handlers.onHint);
  document.getElementById('btn-resetview').addEventListener('click', handlers.onRecenter);
  document.getElementById('btn-restart').addEventListener('click', handlers.onRestart);
}

export function setUndoEnabled(enabled) {
  const b = document.getElementById('btn-undo');
  if (!b) return;
  if (enabled) b.removeAttribute('disabled');
  else b.setAttribute('disabled', 'true');
}
