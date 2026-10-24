/* Interactive Multi-Topic Tutorials for Arrow Escape (Phase 3).
   Covers 7 distinct gameplay concepts:
     1. Basic Movement
     2. Arrow Collisions
     3. Undo
     4. Hints
     5. Fixed Obstacles
     6. Color-Keyed Arrows
     7. Rotating Pivot Arrows
   Saves completion state to localStorage. Replayable anytime. */

import { open as openModal, close as closeModal } from './modals.js';
import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';

export const TUTORIAL_TOPICS = [
  {
    id: 'basic',
    num: 1,
    title: 'Basic Arrow Movement',
    icon: '➤',
    summary: 'Tap an arrow to launch it straight forward.',
    body: 'Arrows only fly in the single direction their arrowhead points (Up, Right, Down, or Left). If every grid cell between the arrow tip and the edge of the board is completely unobstructed, the arrow escapes successfully!',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <defs>
        <marker id="tut-arr-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>
      </defs>
      <!-- Grid border -->
      <rect x="10" y="10" width="180" height="80" rx="8" fill="none" stroke="currentColor" stroke-dasharray="3 3" opacity="0.3"/>
      <!-- Arrow -->
      <path d="M 40 50 L 110 50" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
      <polygon points="124,50 105,40 105,60" fill="#2563eb"/>
      <!-- Green escape ray -->
      <path d="M 126 50 L 175 50" stroke="#10b981" stroke-width="3" stroke-dasharray="4 4" marker-end="url(#tut-arr-green)"/>
      <text x="100" y="82" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.8">Path is clear → Escapes!</text>
    </svg>`
  },
  {
    id: 'collisions',
    num: 2,
    title: 'Arrow Collisions & Hearts',
    icon: '💥',
    summary: 'Hitting another arrow costs 1 Heart.',
    body: 'If another arrow blocks your path, tapping the arrow will cause an impact collision. The blocking arrow will flash red, and you will lose 1 Heart. Lose all 3 hearts and the level must be restarted!',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <rect x="10" y="10" width="180" height="80" rx="8" fill="none" stroke="currentColor" stroke-dasharray="3 3" opacity="0.3"/>
      <!-- Blocked Arrow -->
      <path d="M 35 50 L 95 50" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
      <polygon points="108,50 92,40 92,60" fill="#ef4444"/>
      <!-- Blocker Arrow -->
      <path d="M 130 20 L 130 80" stroke="#71717a" stroke-width="8" stroke-linecap="round"/>
      <polygon points="130,85 120,70 140,70" fill="#71717a"/>
      <!-- Spark -->
      <circle cx="118" cy="50" r="10" fill="#ef4444" opacity="0.3"/>
      <text x="100" y="85" text-anchor="middle" font-size="11" fill="#ef4444">Blocked! -1 Heart</text>
    </svg>`
  },
  {
    id: 'undo',
    num: 3,
    title: 'Undo Your Mistakes',
    icon: '↶',
    summary: 'Never fear a wrong move: tap Undo anytime.',
    body: 'Made an accidental tap or lost a heart? The Undo button immediately rewinds the game state to your previous turn. Undoing a collision restores your lost heart and your combo streak!',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <circle cx="100" cy="45" r="28" fill="none" stroke="#2563eb" stroke-width="4"/>
      <path d="M 85 30 L 72 45 L 95 48" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="100" y="85" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Step Back & Restore Hearts</text>
    </svg>`
  },
  {
    id: 'hints',
    num: 4,
    title: 'Guaranteed Solvable Hints',
    icon: '💡',
    summary: 'Every puzzle has a mathematically guaranteed path.',
    body: 'Stuck in a complex web of overlapping arrows? Tap the Hint button to highlight a guaranteed extractable arrow with a luminous gold pulse. Hints never penalize your score or level completion.',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <!-- Glow -->
      <circle cx="100" cy="45" r="32" fill="#eab308" opacity="0.25"/>
      <circle cx="100" cy="45" r="22" fill="#eab308" opacity="0.4"/>
      <!-- Arrow -->
      <path d="M 70 45 L 120 45" stroke="#eab308" stroke-width="8" stroke-linecap="round"/>
      <polygon points="134,45 118,35 118,55" fill="#eab308"/>
      <text x="100" y="85" text-anchor="middle" font-size="11" fill="currentColor">Glowing Arrow = Clear to Escape</text>
    </svg>`
  },
  {
    id: 'obstacles',
    num: 5,
    title: 'Fixed Immovable Obstacles',
    icon: '⏹',
    summary: 'Stone pillars block arrows permanently.',
    body: 'Starting in Easy tier, immovable square pillars appear on the board. Unlike arrows, obstacles can NEVER be extracted or moved. You must carefully steer your extraction sequence around them.',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <!-- Pillar -->
      <rect x="120" y="25" width="40" height="40" rx="8" fill="#3f3f46" stroke="#71717a" stroke-width="3"/>
      <path d="M 128 33 L 152 57 M 152 33 L 128 57" stroke="#71717a" stroke-width="3" stroke-linecap="round"/>
      <!-- Arrow blocked -->
      <path d="M 35 45 L 95 45" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
      <polygon points="108,45 92,35 92,55" fill="#2563eb"/>
      <text x="100" y="85" text-anchor="middle" font-size="11" fill="currentColor">Obstacle blocks escape path</text>
    </svg>`
  },
  {
    id: 'color_keys',
    num: 6,
    title: 'Color-Keyed Arrows & Locks',
    icon: '🗝',
    summary: 'Free the Key Arrow to unlock matching arrows.',
    body: 'Starting in Medium tier, certain arrows have padlock badges 🔒 and cannot escape. Extract the matching Key Arrow (indicated by accessible ◆ Diamond, ★ Star, or ▲ Shield glyphs) to release the locks!',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <!-- Key arrow -->
      <path d="M 25 35 L 75 35" stroke="#d97706" stroke-width="7" stroke-linecap="round"/>
      <polygon points="85,35 72,27 72,43" fill="#d97706"/>
      <text x="50" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">◆</text>
      <!-- Locked arrow -->
      <path d="M 115 35 L 165 35" stroke="#94a3b8" stroke-width="7" stroke-linecap="round" stroke-dasharray="6 3"/>
      <polygon points="175,35 162,27 162,43" fill="#94a3b8"/>
      <text x="140" y="39" text-anchor="middle" font-size="14">🔒</text>
      <text x="100" y="80" text-anchor="middle" font-size="11" fill="currentColor">Extract ◆ Key → 🔒 Unlocks!</text>
    </svg>`
  },
  {
    id: 'pivots',
    num: 7,
    title: 'Rotating Pivot Arrows',
    icon: '⟳',
    summary: 'Tap blocked pivot arrows to rotate them 90°.',
    body: 'Starting in Hard tier, arrows with a circular tail joint ⟳ are Rotating Pivot Arrows! If blocked in their current direction, tapping them swings their tip 90° clockwise into an open orientation without losing a heart!',
    svg: `<svg viewBox="0 0 200 100" class="tut-svg">
      <!-- Tail joint -->
      <circle cx="70" cy="50" r="14" fill="none" stroke="#38bdf8" stroke-width="3"/>
      <text x="70" y="54" text-anchor="middle" font-size="11" font-weight="bold" fill="#38bdf8">⟳</text>
      <!-- Initial arrow -->
      <path d="M 70 50 L 70 20" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
      <polygon points="70,12 63,24 77,24" fill="#38bdf8"/>
      <!-- Rotated arc -->
      <path d="M 85 28 A 26 26 0 0 1 106 48" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="100" y="82" text-anchor="middle" font-size="11" fill="currentColor">Swings 90° Clockwise to Open Path</text>
    </svg>`
  }
];

let currentIndex = 0;
let _getData = null;
let _saveData = null;

export function initTutorials({ getData, saveData }) {
  _getData = getData;
  _saveData = saveData;

  const btnPrev = document.getElementById('tut-btn-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      if (currentIndex > 0) {
        currentIndex--;
        renderTutorialCard(currentIndex);
      }
    });
  }

  const btnNext = document.getElementById('tut-btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      sfxButton();
      hapticTap();
      markCompleted(currentIndex);
      if (currentIndex < TUTORIAL_TOPICS.length - 1) {
        currentIndex++;
        renderTutorialCard(currentIndex);
      } else {
        closeModal('modal-tutorials');
      }
    });
  }
}

export function openTutorials(initialTopicId = null) {
  if (initialTopicId) {
    const idx = TUTORIAL_TOPICS.findIndex(t => t.id === initialTopicId);
    if (idx !== -1) currentIndex = idx;
  }
  renderTutorialCard(currentIndex);
  openModal('modal-tutorials');
}

function markCompleted(idx) {
  if (!_getData || !_saveData) return;
  const data = _getData();
  if (!data.tutorials) data.tutorials = {};
  const topic = TUTORIAL_TOPICS[idx];
  if (topic) {
    data.tutorials[topic.id] = true;
    _saveData(data);
  }
}

function renderTutorialCard(idx) {
  const t = TUTORIAL_TOPICS[idx];
  if (!t) return;

  const titleEl = document.getElementById('tut-title');
  if (titleEl) titleEl.textContent = t.title;

  const badgeEl = document.getElementById('tut-step-badge');
  if (badgeEl) badgeEl.textContent = `Step ${t.num} of ${TUTORIAL_TOPICS.length}`;

  const svgWrap = document.getElementById('tut-visual');
  if (svgWrap) svgWrap.innerHTML = t.svg;

  const descEl = document.getElementById('tut-desc');
  if (descEl) descEl.textContent = t.body;

  const btnPrev = document.getElementById('tut-btn-prev');
  if (btnPrev) btnPrev.toggleAttribute('disabled', idx === 0);

  const btnNext = document.getElementById('tut-btn-next');
  if (btnNext) {
    btnNext.textContent = idx === TUTORIAL_TOPICS.length - 1 ? 'Finish Tutorial' : 'Next Step →';
  }
}
