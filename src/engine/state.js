/* Game state factory + reducers.
   Reducers mutate the supplied state in-place (the game uses a single
   long-lived state object). The render layer reads from it each frame. */

import { HEARTS_MAX } from '../config.js';
import { cloneArrow } from './arrow.js';
import { tryExtract } from './rules.js';

export function createGameState(puzzle, options = {}) {
  return {
    level: puzzle.level,
    tier: puzzle.tier,
    grid: puzzle.grid,
    dailyLabel: puzzle.dailyLabel || null,
    isDaily: options.isDaily === true,

    arrows: puzzle.arrows.map(cloneArrow),
    initialArrows: puzzle.arrows.map(cloneArrow),
    initialCount: puzzle.arrows.length,

    hearts: HEARTS_MAX,
    moves: 0,
    extractCount: 0,
    missCount: 0,
    hintsUsed: 0,

    history: [],                 // for undo: snapshots of {arrows, hearts}
    levelComplete: false,
    levelFailed: false,
    startedAt: performance.now(),
    finishedAt: 0,

    /* Viewport (pan + zoom). scale=1 fits the board; offset is in CSS px. */
    view: { scale: 1, offsetX: 0, offsetY: 0 }
  };
}

/* Take a deep-enough snapshot to support undo. */
function snapshot(state) {
  return {
    arrows: state.arrows.map(cloneArrow),
    hearts: state.hearts,
    moves: state.moves,
    extractCount: state.extractCount,
    missCount: state.missCount
  };
}

/* Attempt to extract the arrow with id=arrowId.
   Returns a descriptor of what happened:
     { kind:'extract', arrow }   — success
     { kind:'block', arrow, blocker, blockerCell, heartsRemaining } — wrong tap
     { kind:'noop' }              — game over / level already complete */
export function applyTap(state, arrowId) {
  if (state.levelComplete || state.levelFailed) return { kind: 'noop' };
  const arrow = state.arrows.find(a => a.id === arrowId);
  if (!arrow) return { kind: 'noop' };

  const res = tryExtract(state.arrows, arrow, state.grid);
  state.history.push(snapshot(state));
  if (state.history.length > 64) state.history.shift();

  if (res.ok) {
    state.arrows = state.arrows.filter(a => a.id !== arrowId);
    state.moves++;
    state.extractCount++;
    if (state.arrows.length === 0) {
      state.levelComplete = true;
      state.finishedAt = performance.now();
    }
    return { kind: 'extract', arrow };
  }

  state.moves++;
  state.missCount++;
  state.hearts--;
  if (state.hearts <= 0) state.levelFailed = true;
  return {
    kind: 'block',
    arrow,
    blocker: res.blocker,
    blockerCell: res.blockerCell,
    heartsRemaining: state.hearts
  };
}

/* Restore the previous snapshot. Returns true if anything was undone. */
export function applyUndo(state) {
  if (state.levelComplete) return false;
  const snap = state.history.pop();
  if (!snap) return false;
  state.arrows = snap.arrows;
  state.hearts = snap.hearts;
  state.moves = snap.moves;
  state.extractCount = snap.extractCount;
  state.missCount = snap.missCount;
  state.levelFailed = state.hearts <= 0;
  return true;
}

/* Restart the level. */
export function applyRestart(state) {
  state.arrows = state.initialArrows.map(cloneArrow);
  state.hearts = HEARTS_MAX;
  state.moves = 0;
  state.extractCount = 0;
  state.missCount = 0;
  state.hintsUsed = 0;
  state.history.length = 0;
  state.levelComplete = false;
  state.levelFailed = false;
  state.startedAt = performance.now();
  state.finishedAt = 0;
}

/* Count remaining arrows / progress percentage. */
export function progressFraction(state) {
  if (!state.initialCount) return 0;
  return state.extractCount / state.initialCount;
}
