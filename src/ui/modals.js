/* Generic modal show/hide and specialized game dialogs.
   Each modal is identified by its element id.
   Clicking the scrim, an element with [data-close], or pressing Esc
   closes the topmost open modal. */

import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';

const openStack = [];

export function initModals() {
  for (const modal of document.querySelectorAll('.modal')) {
    for (const node of modal.querySelectorAll('[data-close]')) {
      node.addEventListener('click', () => {
        sfxButton();
        hapticTap();
        close(modal.id);
      });
    }
  }
}

export function open(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  if (!openStack.includes(id)) openStack.push(id);
  const focusable = m.querySelector('button.btn-primary, button[data-close], input');
  focusable?.focus();
}

export function close(id) {
  if (!id) {
    id = openStack.pop();
  } else {
    const idx = openStack.indexOf(id);
    if (idx !== -1) openStack.splice(idx, 1);
    else return;
  }
  if (!id) return;
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

export function closeTop() {
  if (openStack.length === 0) return false;
  close();
  return true;
}

export function anyOpen() {
  return openStack.length > 0;
}

export function getOpenStack() {
  return [...openStack];
}

/* Transient toast notification */
let toastTimer = 0;
export function toast(message, ms = 1800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.remove('hidden');
  // eslint-disable-next-line no-unused-expressions
  t.offsetHeight;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    t.classList.remove('show');
    toastTimer = window.setTimeout(() => t.classList.add('hidden'), 280);
  }, ms);
}

/**
 * Modern Victory Screen display
 */
export function showLevelComplete(levelLabel, stats, { onNext, onReplay, onHome }) {
  const modal = document.getElementById('modal-victory');
  if (!modal) return;

  const levelNumEl = document.getElementById('vc-level');
  if (levelNumEl) levelNumEl.textContent = levelLabel;

  // Rating stars
  const starsEl = document.getElementById('vc-stars');
  if (starsEl) {
    const isFlawless = stats.hearts === 3;
    const starCount = isFlawless ? 3 : stats.hearts >= 1 ? 2 : 1;
    let starsHtml = '';
    for (let i = 1; i <= 3; i++) {
      const active = i <= starCount;
      starsHtml += `<span class="star-icon ${active ? 'active' : ''}">${active ? '★' : '☆'}</span>`;
    }
    starsEl.innerHTML = starsHtml;
  }

  // Performance badges
  const badgesEl = document.getElementById('vc-badges');
  if (badgesEl) {
    const badges = [];
    if (stats.hearts === 3) badges.push('<span class="perf-badge flawless">Flawless</span>');
    if (stats.hintsUsed === 0) badges.push('<span class="perf-badge clean">No Hints</span>');
    badgesEl.innerHTML = badges.join('');
  }

  // Stats
  const movesEl = document.getElementById('vc-moves');
  if (movesEl) movesEl.textContent = stats.moves || 0;

  const timeEl = document.getElementById('vc-time');
  if (timeEl) {
    const elapsedSec = Math.max(1, Math.round((stats.finishedAt - stats.startedAt) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    timeEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  const hintsEl = document.getElementById('vc-hints');
  if (hintsEl) hintsEl.textContent = stats.hintsUsed || 0;

  // Buttons
  const nextBtn = document.getElementById('btn-vc-next');
  if (nextBtn) {
    nextBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-victory');
      onNext?.();
    };
  }

  const replayBtn = document.getElementById('btn-vc-replay');
  if (replayBtn) {
    replayBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-victory');
      onReplay?.();
    };
  }

  const homeBtn = document.getElementById('btn-vc-home');
  if (homeBtn) {
    homeBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-victory');
      onHome?.();
    };
  }

  open('modal-victory');
}

export function hideLevelComplete() {
  close('modal-victory');
}

/**
 * Modern Failure Screen display
 */
export function showLevelFailed(reason, { onRetry, onHome }) {
  const modal = document.getElementById('modal-fail');
  if (!modal) return;

  const reasonEl = document.getElementById('fail-reason');
  if (reasonEl) reasonEl.textContent = reason || 'You ran out of hearts!';

  const retryBtn = document.getElementById('btn-fail-retry');
  if (retryBtn) {
    retryBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-fail');
      onRetry?.();
    };
  }

  const homeBtn = document.getElementById('btn-fail-home');
  if (homeBtn) {
    homeBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-fail');
      onHome?.();
    };
  }

  open('modal-fail');
}

/**
 * Pause Screen display
 */
export function showPause(state, { onResume, onRestart, onSettings, onHome }) {
  const modal = document.getElementById('modal-pause');
  if (!modal) return;

  document.getElementById('pause-level').textContent = state.isDaily
    ? `Daily ${state.dailyLabel || ''}`
    : `Level ${state.level}`;

  document.getElementById('pause-moves').textContent = state.moves;
  document.getElementById('pause-hearts').textContent = state.hearts;

  const resumeBtn = document.getElementById('btn-pause-resume');
  if (resumeBtn) {
    resumeBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-pause');
      onResume?.();
    };
  }

  const restartBtn = document.getElementById('btn-pause-restart');
  if (restartBtn) {
    restartBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-pause');
      onRestart?.();
    };
  }

  const settingsBtn = document.getElementById('btn-pause-settings');
  if (settingsBtn) {
    settingsBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-pause');
      onSettings?.();
    };
  }

  const homeBtn = document.getElementById('btn-pause-home');
  if (homeBtn) {
    homeBtn.onclick = () => {
      sfxButton();
      hapticTap();
      close('modal-pause');
      onHome?.();
    };
  }

  open('modal-pause');
}
