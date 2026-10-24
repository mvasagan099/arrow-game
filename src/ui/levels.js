/* Levels modal: paginated grid of level chips, 6 difficulty tier tabs,
   locked/unlocked states, completion stats, jump-to-level, and next-unsolved. */

import { TIER_ORDER, TIERS, MAX_LEVEL } from '../config.js';
import { isSolved, solvedSet } from '../persist.js';
import { close as closeModal, toast } from './modals.js';
import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';

const PAGE_SIZE = 100;
let _onJump = null;
let _data = null;
let activeTier = 'beginner';
let pageIndex = 0;
let cachedSolved = null;

export function initLevels({ onJump, getData, getCurrentLevel }) {
  _onJump = onJump;
  _data = getData;

  const btnJump = document.getElementById('btn-jump');
  if (btnJump) {
    btnJump.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      const inp = document.getElementById('level-jump');
      const v = parseInt(inp.value, 10);
      const data = getData();
      const maxUnlocked = Math.max(data.currentLevel || 1, data.stats.maxLevel || 1);

      if (v >= 1 && v <= MAX_LEVEL) {
        if (v > maxUnlocked) {
          toast(`Level ${v} is locked! Complete level ${maxUnlocked} first.`, 2000);
          return;
        }
        closeModal('modal-levels');
        onJump(v);
      }
    });
  }

  const inpJump = document.getElementById('level-jump');
  if (inpJump) {
    inpJump.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-jump').click();
    });
  }

  const btnNextUnsolved = document.getElementById('btn-next-unsolved');
  if (btnNextUnsolved) {
    btnNextUnsolved.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      const data = getData();
      const solved = solvedSet(data);
      let n = 1;
      while (n <= MAX_LEVEL && solved.has(n)) n++;
      closeModal('modal-levels');
      onJump(Math.min(n, MAX_LEVEL));
    });
  }

  for (const tab of document.querySelectorAll('.difficulty-tabs .tab')) {
    tab.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      activeTier = tab.dataset.tier;
      pageIndex = 0;
      for (const t of document.querySelectorAll('.difficulty-tabs .tab')) {
        t.classList.toggle('active', t === tab);
      }
      renderGrid(getCurrentLevel());
    });
  }

  const prevBtn = document.getElementById('levels-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      if (pageIndex > 0) {
        pageIndex--;
        renderGrid(getCurrentLevel());
      }
    });
  }

  const nextBtn = document.getElementById('levels-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      const range = tierRange(activeTier);
      const pages = Math.ceil(rangeSize(range) / PAGE_SIZE);
      if (pageIndex < pages - 1) {
        pageIndex++;
        renderGrid(getCurrentLevel());
      }
    });
  }
}

export function openLevels(currentLevel) {
  // Pick the tier of the current level by default
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    if (currentLevel >= t.start && currentLevel <= t.end) {
      activeTier = key;
      const offset = currentLevel - t.start;
      pageIndex = Math.floor(offset / PAGE_SIZE);
      break;
    }
  }

  for (const tab of document.querySelectorAll('.difficulty-tabs .tab')) {
    tab.classList.toggle('active', tab.dataset.tier === activeTier);
  }

  cachedSolved = solvedSet(_data());
  renderGrid(currentLevel);
}

function tierRange(tier) {
  const t = TIERS[tier] || TIERS.beginner;
  const end = isFinite(t.end) ? t.end : MAX_LEVEL;
  return { start: t.start, end };
}

function rangeSize(r) {
  return r.end - r.start + 1;
}

function renderGrid(currentLevel) {
  const grid = document.getElementById('levels-grid');
  if (!grid) return;

  const r = tierRange(activeTier);
  const total = rangeSize(r);
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pageIndex >= pages) pageIndex = pages - 1;
  if (pageIndex < 0) pageIndex = 0;

  const from = r.start + pageIndex * PAGE_SIZE;
  const to = Math.min(r.end, from + PAGE_SIZE - 1);

  const pageLabel = document.getElementById('levels-page-label');
  if (pageLabel) pageLabel.textContent = `${from} – ${to}`;

  const prevBtn = document.getElementById('levels-prev');
  if (prevBtn) prevBtn.toggleAttribute('disabled', pageIndex === 0);

  const nextBtn = document.getElementById('levels-next');
  if (nextBtn) nextBtn.toggleAttribute('disabled', pageIndex >= pages - 1);

  const data = _data();
  if (!cachedSolved) cachedSolved = solvedSet(data);
  const maxUnlocked = Math.max(data.currentLevel || 1, data.stats?.maxLevel || 1);

  // Update Tier Completion Badge
  let tierSolvedCount = 0;
  for (let n = r.start; n <= r.end; n++) {
    if (cachedSolved.has(n)) tierSolvedCount++;
  }
  const badgeEl = document.getElementById('tier-stats-badge');
  if (badgeEl) {
    const pct = Math.round((tierSolvedCount / total) * 100);
    badgeEl.textContent = `${tierSolvedCount} / ${total} Solved (${pct}%)`;
  }

  const html = [];
  for (let n = from; n <= to; n++) {
    const solved = cachedSolved.has(n);
    const locked = n > maxUnlocked;
    const current = n === currentLevel ? 'current' : '';

    if (locked) {
      html.push(`<button class="lvl-cell locked" disabled data-level="${n}" aria-label="Level ${n}, locked">
        <span class="lvl-lock" aria-hidden="true">🔒</span>
      </button>`);
    } else {
      const star = solved ? '<span class="lvl-star" aria-hidden="true">★</span>' : '';
      html.push(`<button class="lvl-cell ${solved ? 'solved' : ''} ${current}" data-level="${n}" aria-label="Level ${n}${solved ? ', solved' : ''}">
        ${star}${n}
      </button>`);
    }
  }
  grid.innerHTML = html.join('');

  for (const btn of grid.querySelectorAll('.lvl-cell:not(.locked)')) {
    btn.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      closeModal('modal-levels');
      _onJump(parseInt(btn.dataset.level, 10));
    });
  }
}
