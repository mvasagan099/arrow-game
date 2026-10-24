/* Bottom action bar: Undo, Hint, Recenter, Restart. Pure event wiring. */

import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';

export function initActions(handlers) {
  document.getElementById('btn-undo').addEventListener('click', () => {
    sfxButton();
    hapticTap();
    handlers.onUndo?.();
  });
  document.getElementById('btn-hint').addEventListener('click', () => {
    sfxButton();
    hapticTap();
    handlers.onHint?.();
  });
  document.getElementById('btn-resetview').addEventListener('click', () => {
    sfxButton();
    hapticTap();
    handlers.onRecenter?.();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    sfxButton();
    hapticTap();
    handlers.onRestart?.();
  });
}

export function setUndoEnabled(enabled) {
  const b = document.getElementById('btn-undo');
  if (!b) return;
  if (enabled) b.removeAttribute('disabled');
  else b.setAttribute('disabled', 'true');
}
