/* Achievements panel + unlock notification.
   Achievements are pure derived state: each one has a `test(stats)` that
   returns true when the player meets its threshold. We periodically check
   after meaningful events and flip newly-passed entries to "unlocked". */

import { ACHIEVEMENTS, ACH_ICONS } from '../config.js';
import { toast } from './modals.js';

let _data = null;

export function initAchievements({ getData }) {
  _data = getData;
}

export function renderAchievementsGrid() {
  const data = _data();
  const grid = document.getElementById('achievements-grid');
  const counter = document.getElementById('ach-progress');
  let unlockedCount = 0;
  const html = [];
  for (const a of ACHIEVEMENTS) {
    const unlocked = !!data.achievements[a.id];
    if (unlocked) unlockedCount++;
    html.push(`
      <div class="ach ${unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${ACH_ICONS[a.icon] || '*'}</div>
        <div>
          <div class="ach-title">${escapeHtml(a.title)}</div>
          <div class="ach-desc">${escapeHtml(a.desc)}</div>
        </div>
      </div>
    `);
  }
  grid.innerHTML = html.join('');
  counter.textContent = `(${unlockedCount}/${ACHIEVEMENTS.length})`;
}

/* Returns a list of newly-unlocked achievement objects after this evaluation. */
export function evaluateAchievements(onUnlock) {
  const data = _data();
  const stats = {
    stats: data.stats,
    dailyStats: data.daily
  };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (data.achievements[a.id]) continue;
    if (a.test(stats)) {
      data.achievements[a.id] = Date.now();
      fresh.push(a);
    }
  }
  if (fresh.length && onUnlock) onUnlock(fresh);
  return fresh;
}

export function notifyUnlock(achievements) {
  if (!achievements || !achievements.length) return;
  for (const a of achievements) {
    toast(`Achievement: ${a.title}`, 2400);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
