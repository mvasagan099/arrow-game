/* Levels modal: paginated grid of level chips, tier tabs, jump-to-level,
   next-unsolved. */

import { TIER_ORDER, TIERS, MAX_LEVEL } from '../config.js';
import { isSolved, solvedSet } from '../persist.js';
import { close as closeModal } from './modals.js';

const PAGE_SIZE = 100;
let _onJump = null;
let _data = null;
let activeTier = 'easy';
let pageIndex = 0;
let cachedSolved = null;

export function initLevels({ onJump, getData, getCurrentLevel }) {
  _onJump = onJump;
  _data = getData;

  document.getElementById('btn-jump').addEventListener('click', () => {
    const inp = document.getElementById('level-jump');
    const v = parseInt(inp.value, 10);
    if (v >= 1 && v <= MAX_LEVEL) {
      closeModal('modal-levels');
      onJump(v);
    }
  });
  document.getElementById('level-jump').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-jump').click();
  });
  document.getElementById('btn-next-unsolved').addEventListener('click', () => {
    const data = getData();
    const cur = getCurrentLevel();
    const solved = solvedSet(data);
    let n = cur;
    while (n <= MAX_LEVEL && solved.has(n)) n++;
    closeModal('modal-levels');
    onJump(Math.min(n, MAX_LEVEL));
  });

  for (const tab of document.querySelectorAll('.difficulty-tabs .tab')) {
    tab.addEventListener('click', () => {
      activeTier = tab.dataset.tier;
      pageIndex = 0;
      for (const t of document.querySelectorAll('.difficulty-tabs .tab')) t.classList.toggle('active', t === tab);
      renderGrid(getCurrentLevel());
    });
  }
  document.getElementById('levels-prev').addEventListener('click', () => {
    if (pageIndex > 0) { pageIndex--; renderGrid(getCurrentLevel()); }
  });
  document.getElementById('levels-next').addEventListener('click', () => {
    const range = tierRange(activeTier);
    const pages = Math.ceil(rangeSize(range) / PAGE_SIZE);
    if (pageIndex < pages - 1) { pageIndex++; renderGrid(getCurrentLevel()); }
  });
}

export function openLevels(currentLevel) {
  // Pick the tier of the current level by default.
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
  const t = TIERS[tier];
  // For Nightmare, cap at MAX_LEVEL since `end` is Infinity.
  const end = isFinite(t.end) ? t.end : MAX_LEVEL;
  return { start: t.start, end };
}
function rangeSize(r) { return r.end - r.start + 1; }

function renderGrid(currentLevel) {
  const grid = document.getElementById('levels-grid');
  const r = tierRange(activeTier);
  const total = rangeSize(r);
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pageIndex >= pages) pageIndex = pages - 1;
  if (pageIndex < 0) pageIndex = 0;

  const from = r.start + pageIndex * PAGE_SIZE;
  const to = Math.min(r.end, from + PAGE_SIZE - 1);
  document.getElementById('levels-page-label').textContent = `${from} – ${to}`;
  document.getElementById('levels-prev').toggleAttribute('disabled', pageIndex === 0);
  document.getElementById('levels-next').toggleAttribute('disabled', pageIndex >= pages - 1);

  const data = _data();
  const html = [];
  for (let n = from; n <= to; n++) {
    const solved = isSolved(data, n);
    const current = n === currentLevel ? 'current' : '';
    html.push(`<button class="lvl-cell ${solved ? 'solved' : ''} ${current}" data-level="${n}" aria-label="Level ${n}${solved ? ', solved' : ''}">${n}</button>`);
  }
  grid.innerHTML = html.join('');
  for (const btn of grid.querySelectorAll('.lvl-cell')) {
    btn.addEventListener('click', () => {
      closeModal('modal-levels');
      _onJump(parseInt(btn.dataset.level, 10));
    });
  }
}
