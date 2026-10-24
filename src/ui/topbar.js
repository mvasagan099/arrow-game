/* Top bar: level label + tier badge + hearts. */

import { HEARTS_MAX, tierForLevel } from '../config.js';

let heartsEl, levelLabel, levelTier, progressFill;

export function initTopbar(handlers = {}) {
  heartsEl = document.getElementById('hearts');
  levelLabel = document.getElementById('level-label');
  levelTier = document.getElementById('level-tier');
  progressFill = document.getElementById('progress-fill');
  renderHearts(HEARTS_MAX);

  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn && handlers.onPause) {
    pauseBtn.addEventListener('click', handlers.onPause);
  }
}

export function setLevelDisplay(state) {
  if (state.isDaily) {
    levelLabel.textContent = 'Daily';
    levelTier.textContent = state.dailyLabel || 'Today';
    levelTier.className = 'tier daily';
  } else {
    levelLabel.textContent = `Level ${state.level}`;
    const tier = tierForLevel(state.level);
    levelTier.textContent = tier.label;
    levelTier.className = `tier ${tier.cssClass}`;
  }
}

export function renderHearts(remaining, shake = false) {
  const html = [];
  for (let i = 0; i < HEARTS_MAX; i++) {
    const lost = i >= remaining;
    const shaking = shake && i === remaining;
    html.push(`<span class="heart ${lost ? 'lost' : ''} ${shaking ? 'shake' : ''}" aria-hidden="true">${heartSvg()}</span>`);
  }
  heartsEl.innerHTML = html.join('');
}

function heartSvg() {
  return `<svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" fill="currentColor"/>
  </svg>`;
}

export function setProgress(fraction) {
  if (!progressFill) return;
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  progressFill.style.width = `${pct.toFixed(1)}%`;
}
