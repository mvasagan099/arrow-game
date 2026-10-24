/* Application entry point (Arrow Escape — Phase 2).
   Wires together:
     - Home screen and gameplay transitions
     - Modern UI components (modals, victory, failure, pause, settings)
     - Centralized 4-theme engine
     - Zero-allocation particle effects
     - Web Audio procedural SFX + Haptic feedback
     - Engine state reducers and canvas loop */

import { THEMES, MAX_LEVEL, HEARTS_MAX, HINT_DURATION_MS, LEVEL_COMPLETE_DELAY_MS } from './config.js';
import { generateLevel, generateDaily } from './engine/generator.js';
import { createGameState, applyTap, applyUndo, applyRestart, progressFraction } from './engine/state.js';
import { findHint } from './engine/hint.js';
import { tip } from './engine/arrow.js';

import { setupCanvas, markDirty, startLoop, onResize as onCanvasResize } from './render/loop.js';
import { resetView, zoomAt, getGeom, cellCenter } from './render/viewport.js';
import { invalidatePalette, readPalette } from './render/canvas.js';
import { setReduceMotion, makeExtract, makeBlock, makeWiggle, makeWin } from './render/animations.js';
import { emitExtractParticles, emitBlockParticles, emitWinParticles, clearAllParticles } from './render/particles.js';

import { attachPointer } from './input/pointer.js';
import { attachKeyboard } from './input/keyboard.js';

import { initHome, showHome, hideHome, updateHomeView } from './ui/home.js';
import { initHomeBg, setHomeBgReduceMotion } from './ui/home-bg.js';
import { initSettings, updateSettingsUI } from './ui/settings.js';
import { initTopbar, setLevelDisplay, renderHearts, setProgress } from './ui/topbar.js';
import { initActions, setUndoEnabled } from './ui/actions.js';
import { initModals, open as openModal, close as closeModal, closeTop as closeTopModal,
         anyOpen as anyModalOpen, toast, showLevelComplete, hideLevelComplete, showLevelFailed, showPause } from './ui/modals.js';
import { initLevels, openLevels } from './ui/levels.js';
import { initTutorials, openTutorials } from './ui/tutorials.js';
import { initAchievements, renderAchievementsGrid, evaluateAchievements, notifyUnlock } from './ui/achievements.js';
import { todayKey, recordDailyCompletion, rolloverDailyStreak, dailyAlreadyCompleted } from './ui/daily.js';

import * as persist from './persist.js';
import * as sfx from './audio/sounds.js';
import * as haptics from './audio/haptics.js';

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

/* ----- Boot & Initialization ----- */
applyTheme(data.settings.theme || 'classic');
setReduceMotion(data.settings.reduceMotion);
setHomeBgReduceMotion(data.settings.reduceMotion);
sfx.setMuted(!data.settings.sound);
haptics.setHapticsEnabled(data.settings.haptics !== false);
rolloverDailyStreak(data);

initModals();

// Topbar (with pause handler)
initTopbar({
  onPause: doPause
});

// Bottom action bar
initActions({
  onUndo: doUndo,
  onHint: doHint,
  onRecenter: doRecenter,
  onRestart: doRestart
});

// Home Screen wiring
initHome({
  onPlay: () => {
    hideHome();
    jumpToLevel(data.currentLevel || 1);
  },
  onLevels: () => {
    openLevels(state?.level || data.currentLevel || 1);
    openModal('modal-levels');
  },
  onDaily: startDaily,
  onAchievements: () => {
    renderAchievementsGrid();
    openModal('modal-achievements');
  },
  onSettings: () => {
    updateSettingsUI(data.settings);
    openModal('modal-settings');
  },
  onHowto: () => openTutorials()
});

// Interactive Tutorials Setup
initTutorials({
  getData: () => data,
  saveData: d => persist.save(d)
});

// Settings Modal wiring
initSettings({
  onSelectTheme: themeId => {
    data.settings.theme = themeId;
    applyTheme(themeId);
    persist.save(data);
    markDirty();
  },
  onToggleSound: enabled => {
    data.settings.sound = enabled;
    sfx.setMuted(!enabled);
    persist.save(data);
    if (enabled) sfx.sfxTick();
  },
  onToggleHaptics: enabled => {
    data.settings.haptics = enabled;
    haptics.setHapticsEnabled(enabled);
    persist.save(data);
    if (enabled) haptics.hapticTap();
  },
  onToggleMotion: enabled => {
    data.settings.reduceMotion = enabled;
    setReduceMotion(enabled);
    setHomeBgReduceMotion(enabled);
    persist.save(data);
  },
  onHowto: () => {
    closeModal('modal-settings');
    openTutorials();
  }
}, () => data);

// Levels Browser
initLevels({
  onJump: lvl => {
    hideHome();
    jumpToLevel(lvl);
  },
  getData: () => data,
  getCurrentLevel: () => state?.level || data.currentLevel || 1
});

// Achievements Grid
initAchievements({ getData: () => data });

// Canvas Setup
const canvas = document.getElementById('game-canvas');
setupCanvas(canvas);
onCanvasResize(() => markDirty());

// Home ambient background
const homeCanvas = document.getElementById('home-bg-canvas');
if (homeCanvas) initHomeBg(homeCanvas);

// Pointer Events
attachPointer(canvas, () => state, {
  onTap: arrow => arrow ? doExtract(arrow.id) : null,
  onHover: arrow => {
    const newId = arrow ? arrow.id : null;
    if (newId !== ui.hoveredArrowId) {
      ui.hoveredArrowId = newId;
      markDirty();
    }
  },
  onLongPress: doHint,
  onPan: markDirty,
  onZoom: markDirty,
  onPointerActive: active => {
    ui.panning = active;
    canvas.classList.toggle('panning', active);
  }
});

// Keyboard Controls
attachKeyboard({
  onHint: doHint,
  onUndo: doUndo,
  onRestart: doRestart,
  onRecenter: doRecenter,
  onZoomIn: () => {
    zoomAt(state, canvas.clientWidth / 2, canvas.clientHeight / 2, 1.15, canvas.clientWidth, canvas.clientHeight);
    markDirty();
  },
  onZoomOut: () => {
    zoomAt(state, canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.15, canvas.clientWidth, canvas.clientHeight);
    markDirty();
  },
  onEsc: () => {
    if (anyModalOpen()) {
      closeTopModal();
    } else {
      doPause();
    }
  },
  onNextLevel: () => jumpToLevel(state.level + 1),
  onPrevLevel: () => jumpToLevel(Math.max(1, state.level - 1))
});

// Preload current level puzzle and start loop
loadLevel(Math.max(1, Math.min(MAX_LEVEL, data.currentLevel || 1)));
startLoop(() => state, () => animations, () => ui);

// Start on Home Screen by default
showHome(data);

/* ----- Theming Engine ----- */
function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.classic;
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.classList.toggle('dark', theme.isDark);

  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', theme.palette.bg);

  invalidatePalette(theme.id);
  updateSettingsUI(data.settings);
}

/* ----- Level Lifecycle ----- */
function loadLevel(levelNumber) {
  const puzzle = generateLevel(levelNumber);
  state = createGameState(puzzle);
  resetGameUi();
  data.currentLevel = levelNumber;
  if (levelNumber > (data.stats.maxLevel || 1)) data.stats.maxLevel = levelNumber;
  persist.save(data);
  updateHomeView(data);
}

function startDaily() {
  const key = todayKey();
  const puzzle = generateDaily(key);
  state = createGameState(puzzle, { isDaily: true });
  resetGameUi();
  hideHome();
  if (dailyAlreadyCompleted(data)) {
    toast('You already completed today\'s daily challenge!', 2200);
  }
}

function resetGameUi() {
  animations.length = 0;
  clearAllParticles();
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

/* ----- In-Game Pause ----- */
function doPause() {
  sfx.sfxButton();
  haptics.hapticTap();
  showPause(state, {
    onResume: () => markDirty(),
    onRestart: doRestart,
    onSettings: () => {
      updateSettingsUI(data.settings);
      openModal('modal-settings');
    },
    onHome: () => {
      showHome(data);
    }
  });
}

/* ----- Gameplay Actions ----- */
function doExtract(arrowId) {
  if (state.levelComplete || state.levelFailed) return;
  const result = applyTap(state, arrowId);

  if (result.kind === 'extract') {
    animations.push(makeExtract(result.arrow));
    sfx.sfxExtract();
    haptics.hapticExtract();

    // Spawn directional particle trail at arrow tip
    const geom = getGeom(state, canvas.clientWidth, canvas.clientHeight);
    const tipCell = tip(result.arrow);
    const cc = cellCenter(tipCell.x, tipCell.y, geom);
    const palette = readPalette();
    emitExtractParticles(cc.x, cc.y, result.arrow.dir, palette.accent || palette.ink);

    // If key arrow escaped, notify unlock
    if (result.unlockedKey) {
      setTimeout(() => {
        sfx.sfxUnlock();
        haptics.hapticUnlock();
        toast(`Key cleared! Matching arrows unlocked.`, 1600);
      }, 120);
    }

    if (ui.hintArrowId === arrowId) clearHint();
  } else if (result.kind === 'rotate') {
    sfx.sfxPivot();
    haptics.hapticRotate();
    const tried = result.arrow;
    animations.push(makeWiggle(tried.id, tried.dir));
    toast('Pivot arrow rotated 90°', 1100);
    if (ui.hintArrowId === arrowId) clearHint();
  } else if (result.kind === 'locked') {
    const tried = result.arrow;
    animations.push(makeWiggle(tried.id, tried.dir));
    renderHearts(result.heartsRemaining, true);
    sfx.sfxBlock();
    haptics.hapticBlock();
    setTimeout(() => sfx.sfxHeart(), 80);
    toast(`Arrow is locked! Free the ${result.keyId.toUpperCase()} key first.`, 1800);

    if (state.levelFailed) handleLevelFailed('All hearts lost! Attempted to move locked arrow.');
  } else if (result.kind === 'block') {
    if (result.blocker && result.blocker.id) {
      animations.push(makeBlock(result.blocker.id));
    }
    const tried = result.arrow;
    animations.push(makeWiggle(tried.id, tried.dir));
    renderHearts(result.heartsRemaining, true);

    if (result.isObstacle) {
      sfx.sfxObstacle();
    } else {
      sfx.sfxBlock();
    }
    haptics.hapticBlock();
    setTimeout(() => sfx.sfxHeart(), 80);

    // Spawn collision sparks at contact cell
    if (result.blockerCell) {
      const geom = getGeom(state, canvas.clientWidth, canvas.clientHeight);
      const cc = cellCenter(result.blockerCell.x, result.blockerCell.y, geom);
      const palette = readPalette();
      emitBlockParticles(cc.x, cc.y, palette.danger);
    }

    if (state.levelFailed) {
      handleLevelFailed(result.isObstacle ? 'All hearts lost! Blocked by immovable obstacle.' : 'All hearts lost! Blocked by other arrows.');
    }
  }

  setUndoEnabled(state.history.length > 0);
  setProgress(progressFraction(state));
  if (state.levelComplete) onLevelComplete();
  markDirty();
}

function handleLevelFailed(reason) {
  data.stats.currentStreak = 0;
  persist.save(data);
  updateHomeView(data);
  haptics.hapticFail();
  sfx.sfxFail();

  setTimeout(() => {
    showLevelFailed(reason, {
      onRetry: doRestart,
      onHome: () => {
        showHome(data);
      }
    });
  }, 340);
}

function doUndo() {
  if (!applyUndo(state)) return;
  renderHearts(state.hearts);
  setProgress(progressFraction(state));
  setUndoEnabled(state.history.length > 0);
  hideLevelComplete();
  sfx.sfxTick();
  haptics.hapticTap();
  markDirty();
}

function doHint() {
  const arrow = findHint(state);
  if (!arrow) {
    toast('No hint available');
    return;
  }
  ui.hintArrowId = arrow.id;
  ui.hintStartedAt = performance.now();
  ui.hintExpiresAt = ui.hintStartedAt + HINT_DURATION_MS;
  state.hintsUsed++;
  sfx.sfxHint();
  haptics.hapticTap();
  markDirty();
}

function clearHint() {
  ui.hintArrowId = null;
  ui.hintExpiresAt = 0;
}

function doRecenter() {
  resetView(state);
  sfx.sfxButton();
  haptics.hapticTap();
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
  clearAllParticles();
  sfx.sfxTick();
  haptics.hapticTap();
  markDirty();
}

/* ----- Level Complete Handling ----- */
function onLevelComplete() {
  animations.push(makeWin());
  sfx.sfxWin();
  haptics.hapticWin();

  // Burst celebratory win particles
  const geom = getGeom(state, canvas.clientWidth, canvas.clientHeight);
  const palette = readPalette();
  const cx = geom.left + geom.boardPx / 2;
  const cy = geom.top + geom.boardPx / 2;
  emitWinParticles(cx, cy, geom.boardPx / 2, [
    palette.good,
    palette.accent,
    palette.hint,
    palette.ink
  ]);

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
  updateHomeView(data);

  // Achievement evaluation
  const fresh = evaluateAchievements();
  if (fresh.length) {
    persist.save(data);
    notifyUnlock(fresh);
    setTimeout(() => sfx.sfxAchievement(), 300);
  }

  // Display modern victory experience
  setTimeout(() => {
    const label = state.isDaily ? `Daily ${state.dailyLabel || ''}` : `Level ${state.level}`;
    showLevelComplete(label, state, {
      onNext: () => {
        if (state.isDaily) {
          jumpToLevel(data.currentLevel || 1);
        } else {
          jumpToLevel(Math.min(MAX_LEVEL, state.level + 1));
        }
      },
      onReplay: doRestart,
      onHome: () => {
        showHome(data);
      }
    });
  }, LEVEL_COMPLETE_DELAY_MS);
}

/* ----- Animation Pruning Loop ----- */
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

/* Tap-to-start audio context on first user interaction */
document.addEventListener('pointerdown', () => {
  if (data.settings.sound) sfx.sfxButton();
}, { once: true });

/* Debug hook */
if (typeof window !== 'undefined') {
  window.__arrows = { state: () => state, data, persist };
}
