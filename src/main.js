/* Application entry point.

   Wires together: persistence, generator, state reducers, canvas loop,
   pointer + keyboard input, drawer + modal UI, achievements, and the
   daily challenge. Holds the singletons (state, animations, ui) that
   every other module reads from. */

import { TIERS, tierForLevel, MAX_LEVEL, HEARTS_MAX,
         HINT_DURATION_MS, LEVEL_COMPLETE_DELAY_MS, TOAST_DURATION_MS } from './config.js';
import { generateLevel, generateDaily } from './engine/generator.js';
import { createGameState, applyTap, applyUndo, applyRestart, progressFraction } from './engine/state.js';
import { findHint } from './engine/hint.js';

import { setupCanvas, markDirty, startLoop, onResize as onCanvasResize } from './render/loop.js';
import { resetView, zoomAt } from './render/viewport.js';
import { invalidatePalette } from './render/canvas.js';
import { setReduceMotion, makeExtract, makeBlock, makeWiggle, makeWin } from './render/animations.js';

import { attachPointer } from './input/pointer.js';
import { attachKeyboard } from './input/keyboard.js';

import { initTopbar, setLevelDisplay, renderHearts, setProgress } from './ui/topbar.js';
import { initActions, setUndoEnabled } from './ui/actions.js';
import { initDrawer, setStats as setDrawerStats, setToggles, close as closeDrawer, isOpen as isDrawerOpen } from './ui/drawer.js';
import { initModals, open as openModal, closeTop as closeTopModal,
         anyOpen as anyModalOpen, toast, showLevelComplete, hideLevelComplete } from './ui/modals.js';
import { initLevels, openLevels } from './ui/levels.js';
import { initAchievements, renderAchievementsGrid, evaluateAchievements, notifyUnlock } from './ui/achievements.js';
import { todayKey, recordDailyCompletion, rolloverDailyStreak, dailyAlreadyCompleted } from './ui/daily.js';

import * as persist from './persist.js';
import * as sfx from './audio/sounds.js';

/* ----- Singletons ----- */
const data = persist.load();
let state = null;
const animations = [];
const ui = {
  hoveredArrowId: null,
  hintArrowId: null,
  hintStartedAt: 0,
  hintExpiresAt: 0,
  panning: false
};

/* ----- Boot ----- */
applyTheme(data.settings.theme);
setReduceMotion(data.settings.reduceMotion);
sfx.setMuted(!data.settings.sound);
rolloverDailyStreak(data);

initModals();
initTopbar();
initActions({
  onUndo: doUndo,
  onHint: doHint,
  onRecenter: doRecenter,
  onRestart: doRestart
});
initDrawer({
  onHowto: () => openModal('modal-howto'),
  onLevels: () => { openLevels(state.level); openModal('modal-levels'); },
  onDaily: startDaily,
  onAchievements: () => { renderAchievementsGrid(); openModal('modal-achievements'); },
  onToggleTheme: v => { data.settings.theme = v ? 'dark' : 'light'; applyTheme(data.settings.theme); persist.save(data); markDirty(); },
  onToggleSound: v => { data.settings.sound = v; sfx.setMuted(!v); persist.save(data); if (v) sfx.sfxTick(); },
  onToggleMotion: v => { data.settings.reduceMotion = v; setReduceMotion(v); persist.save(data); }
});
initLevels({
  onJump: jumpToLevel,
  getData: () => data,
  getCurrentLevel: () => state.level
});
initAchievements({ getData: () => data });
setToggles(data.settings);
setDrawerStats(data.stats);

const canvas = document.getElementById('game-canvas');
setupCanvas(canvas);
onCanvasResize(() => markDirty());

attachPointer(canvas, () => state, {
  onTap: arrow => arrow ? doExtract(arrow.id) : null,
  onHover: arrow => {
    const newId = arrow ? arrow.id : null;
    if (newId !== ui.hoveredArrowId) { ui.hoveredArrowId = newId; markDirty(); }
  },
  onLongPress: doHint,
  onPan: markDirty,
  onZoom: markDirty,
  onPointerActive: active => { ui.panning = active; canvas.classList.toggle('panning', active); }
});
attachKeyboard({
  onHint: doHint,
  onUndo: doUndo,
  onRestart: doRestart,
  onRecenter: doRecenter,
  onZoomIn: () => { zoomAt(state, canvas.clientWidth / 2, canvas.clientHeight / 2, 1.15, canvas.clientWidth, canvas.clientHeight); markDirty(); },
  onZoomOut: () => { zoomAt(state, canvas.clientWidth / 2, canvas.clientHeight / 2, 1/1.15, canvas.clientWidth, canvas.clientHeight); markDirty(); },
  onEsc: () => {
    hideLevelComplete();
    if (anyModalOpen()) closeTopModal();
    else if (isDrawerOpen()) closeDrawer();
  },
  onNextLevel: () => jumpToLevel(state.level + 1),
  onPrevLevel: () => jumpToLevel(Math.max(1, state.level - 1))
});

document.getElementById('btn-fail-retry').addEventListener('click', () => {
  closeTopModal();
  doRestart();
});

loadLevel(Math.max(1, Math.min(MAX_LEVEL, data.currentLevel || 1)));
startLoop(() => state, () => animations, () => ui);

/* ----- Theming ----- */
function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  invalidatePalette();
}

/* ----- Level lifecycle ----- */
function loadLevel(levelNumber) {
  const puzzle = generateLevel(levelNumber);
  state = createGameState(puzzle);
  resetGameUi();
  data.currentLevel = levelNumber;
  if (levelNumber > (data.stats.maxLevel || 1)) data.stats.maxLevel = levelNumber;
  persist.save(data);
}

function startDaily() {
  const key = todayKey();
  const puzzle = generateDaily(key);
  state = createGameState(puzzle, { isDaily: true });
  resetGameUi();
  if (dailyAlreadyCompleted(data)) {
    toast('You already completed today\'s daily!', 2000);
  }
}

function resetGameUi() {
  animations.length = 0;
  ui.hintArrowId = null;
  ui.hintExpiresAt = 0;
  resetView(state);
  setLevelDisplay(state);
  renderHearts(state.hearts);
  setProgress(0);
  setUndoEnabled(false);
  hideLevelComplete();
  markDirty();
}

function jumpToLevel(n) {
  loadLevel(Math.max(1, Math.min(MAX_LEVEL, n)));
}

/* ----- Gameplay actions ----- */
function doExtract(arrowId) {
  if (state.levelComplete || state.levelFailed) return;
  const result = applyTap(state, arrowId);
  if (result.kind === 'extract') {
    animations.push(makeExtract(result.arrow));
    sfx.sfxExtract();
    if (ui.hintArrowId === arrowId) clearHint();
  } else if (result.kind === 'block') {
    animations.push(makeBlock(result.blocker.id));
    // bump the bumped arrow forward as if it tried to escape
    const tried = result.arrow;
    animations.push(makeWiggle(tried.id, tried.dir));
    renderHearts(result.heartsRemaining, true);
    sfx.sfxBlock();
    setTimeout(() => sfx.sfxHeart(), 80);
    if (state.levelFailed) {
      data.stats.currentStreak = 0;
      persist.save(data);
      setDrawerStats(data.stats);
      setTimeout(() => openModal('modal-fail'), 320);
    }
  }
  setUndoEnabled(state.history.length > 0);
  setProgress(progressFraction(state));
  if (state.levelComplete) onLevelComplete();
  markDirty();
}

function doUndo() {
  if (!applyUndo(state)) return;
  renderHearts(state.hearts);
  setProgress(progressFraction(state));
  setUndoEnabled(state.history.length > 0);
  hideLevelComplete();
  sfx.sfxTick();
  markDirty();
}

function doHint() {
  const arrow = findHint(state);
  if (!arrow) { toast('No hint available'); return; }
  ui.hintArrowId = arrow.id;
  ui.hintStartedAt = performance.now();
  ui.hintExpiresAt = ui.hintStartedAt + HINT_DURATION_MS;
  state.hintsUsed++;
  sfx.sfxHint();
  markDirty();
}

function clearHint() {
  ui.hintArrowId = null;
  ui.hintExpiresAt = 0;
}

function doRecenter() {
  resetView(state);
  markDirty();
}

function doRestart() {
  applyRestart(state);
  renderHearts(state.hearts);
  setProgress(0);
  hideLevelComplete();
  setUndoEnabled(false);
  clearHint();
  animations.length = 0;
  sfx.sfxTick();
  markDirty();
}

/* ----- Level complete handling ----- */
function onLevelComplete() {
  animations.push(makeWin());
  sfx.sfxWin();

  const perfect = state.hearts === HEARTS_MAX;
  const noHint = state.hintsUsed === 0;

  if (state.isDaily) {
    if (!dailyAlreadyCompleted(data)) {
      recordDailyCompletion(data, todayKey());
    }
  } else {
    if (!persist.isSolved(data, state.level)) {
      persist.markSolved(data, state.level);
      data.stats.totalCompleted = (data.stats.totalCompleted || 0) + 1;
      data.stats.currentStreak = (data.stats.currentStreak || 0) + 1;
      if (data.stats.currentStreak > data.stats.maxStreak) data.stats.maxStreak = data.stats.currentStreak;
      if (perfect) data.stats.perfectClears = (data.stats.perfectClears || 0) + 1;
      if (noHint)  data.stats.cleanClears   = (data.stats.cleanClears   || 0) + 1;
    }
  }
  persist.save(data);
  setDrawerStats(data.stats);

  // Achievement evaluation.
  const fresh = evaluateAchievements();
  if (fresh.length) {
    persist.save(data);
    notifyUnlock(fresh);
    setTimeout(() => sfx.sfxAchievement(), 300);
  }

  // Show completion card a beat after the win flourish kicks in.
  setTimeout(() => {
    showLevelComplete(state.isDaily ? `Daily ${state.dailyLabel || ''}` : state.level, () => {
      if (state.isDaily) {
        jumpToLevel(data.currentLevel || 1);
      } else {
        jumpToLevel(Math.min(MAX_LEVEL, state.level + 1));
      }
    });
  }, LEVEL_COMPLETE_DELAY_MS);
}

/* ----- Animation pruning loop -----
   Animations are appended to `animations`; we sweep expired ones on
   every rAF tick from here (simpler than baking into the render loop). */
function pruneAnimations() {
  const now = performance.now();
  let i = 0;
  while (i < animations.length) {
    const a = animations[i];
    if (now - a.t0 > a.dur) animations.splice(i, 1);
    else i++;
  }
  requestAnimationFrame(pruneAnimations);
}
requestAnimationFrame(pruneAnimations);

/* ----- One-time setup ----- */
// Tap-to-start the audio context (browser autoplay policy).
document.addEventListener('pointerdown', () => {
  if (data.settings.sound) sfx.sfxTick();
}, { once: true });

/* Expose for debugging. */
if (typeof window !== 'undefined') {
  window.__arrows = { state: () => state, data, persist };
}
