/* Achievements panel + unlock notification for Arrow Escape.
   Supports category filtering (Progression, Skill, Daily, Exploration),
   automatic +20 coin rewards on unlock, and visual badges. */

import { ACHIEVEMENTS, ACH_ICONS } from '../config.js';
import { claimAchievementReward } from '../economy/rewards.js';
import { toast } from './modals.js';

let _data = null;
let _activeCategory = 'all';

export function initAchievements({ getData }) {
  _data = getData;

  const filterTabs = document.querySelectorAll('.ach-tabs button[data-cat]');
  filterTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeCategory = btn.dataset.cat;
      renderAchievementsGrid();
    });
  });
}

export function renderAchievementsGrid() {
  const data = _data();
  const grid = document.getElementById('achievements-grid');
  const counter = document.getElementById('ach-progress');
  if (!grid) return;

  let totalUnlocked = 0;
  for (const a of ACHIEVEMENTS) {
    if (data.achievements[a.id]) totalUnlocked++;
  }
  if (counter) counter.textContent = `(${totalUnlocked}/${ACHIEVEMENTS.length})`;

  const list = _activeCategory === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === _activeCategory);

  const html = [];
  for (const a of list) {
    const unlocked = !!data.achievements[a.id];
    html.push(`
      <div class="ach ${unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${ACH_ICONS[a.icon] || '★'}</div>
        <div class="ach-info">
          <div class="ach-title-row">
            <span class="ach-title">${escapeHtml(a.title)}</span>
            <span class="ach-reward-pill">+${a.reward || 20} 🪙</span>
          </div>
          <div class="ach-desc">${escapeHtml(a.desc)}</div>
          <div class="ach-state">${unlocked ? 'Unlocked ✓' : 'In Progress'}</div>
        </div>
      </div>
    `);
  }
  grid.innerHTML = html.join('');
}

/* Returns a list of newly-unlocked achievement objects after this evaluation. */
export function evaluateAchievements(onUnlock) {
  const data = _data();
  const stats = {
    stats: data.stats,
    dailyStats: data.daily,
    tutorials: data.tutorials
  };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (data.achievements[a.id]) continue;
    if (typeof a.test === 'function' && a.test(stats)) {
      data.achievements[a.id] = Date.now();
      claimAchievementReward(data, a.id);
      fresh.push(a);
    }
  }
  if (fresh.length && onUnlock) onUnlock(fresh);
  return fresh;
}

export function notifyUnlock(achievements) {
  if (!achievements || !achievements.length) return;
  for (const a of achievements) {
    toast(`🏆 Achievement: ${a.title} (+20 🪙)`, 2600);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
