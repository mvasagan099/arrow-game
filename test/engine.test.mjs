/* Automated tests for Arrow Escape game engine:
   - Valid arrow movements
   - Blocked arrow movements
   - Collision handling
   - Level completion
   - Invalid player input
   - Puzzle solvability
   - Difficulty generation
   - Restart behavior
   - Undo correctness
*/

import assert from 'node:assert/strict';
import { generateLevel, generateDaily, levelSeed } from '../src/engine/generator.js';
import { createGameState, applyTap, applyUndo, applyRestart, progressFraction } from '../src/engine/state.js';
import { tryExtract, isFullyExtractable, arrowAt } from '../src/engine/rules.js';
import { findHint } from '../src/engine/hint.js';
import { tip, tail, occupiesCell, inBounds, cloneArrow, pathFromTip, buildOccupancy, bbox } from '../src/engine/arrow.js';
import { TIERS, TIER_ORDER, tierForLevel, HEARTS_MAX, DIRS, MAX_LEVEL } from '../src/config.js';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    throw err;
  }
}

console.log('Running Game Engine Validation Tests...');

// 1. Arrow Geometry & Helpers
test('Arrow Geometry: tip, tail, occupiesCell, bbox, inBounds', () => {
  const arrow = {
    id: 1,
    dir: 1, // right
    cells: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }]
  };
  assert.deepEqual(tail(arrow), { x: 2, y: 3 });
  assert.deepEqual(tip(arrow), { x: 4, y: 3 });
  assert.equal(occupiesCell(arrow, 3, 3), true);
  assert.equal(occupiesCell(arrow, 5, 3), false);
  assert.equal(inBounds(arrow, 10), true);
  assert.equal(inBounds({ ...arrow, cells: [{ x: -1, y: 0 }] }, 10), false);
  assert.equal(inBounds({ ...arrow, cells: [{ x: 10, y: 5 }] }, 10), false);

  const box = bbox(arrow);
  assert.deepEqual(box, { minX: 2, maxX: 4, minY: 3, maxY: 3 });
});

test('Arrow Geometry: pathFromTip in all 4 directions', () => {
  const grid = 10;
  // Up (dir 0)
  const upArrow = { id: 1, dir: 0, cells: [{ x: 5, y: 7 }, { x: 5, y: 6 }] };
  const upPath = pathFromTip(upArrow, grid);
  assert.deepEqual(upPath, [
    { x: 5, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 0 }
  ]);

  // Right (dir 1)
  const rightArrow = { id: 2, dir: 1, cells: [{ x: 7, y: 4 }, { x: 8, y: 4 }] };
  const rightPath = pathFromTip(rightArrow, grid);
  assert.deepEqual(rightPath, [{ x: 9, y: 4 }]);

  // Right at edge
  const edgeArrow = { id: 3, dir: 1, cells: [{ x: 8, y: 4 }, { x: 9, y: 4 }] };
  assert.deepEqual(pathFromTip(edgeArrow, grid), []);

  // Down (dir 2)
  const downArrow = { id: 4, dir: 2, cells: [{ x: 3, y: 7 }, { x: 3, y: 8 }] };
  assert.deepEqual(pathFromTip(downArrow, grid), [{ x: 3, y: 9 }]);

  // Left (dir 3)
  const leftArrow = { id: 5, dir: 3, cells: [{ x: 2, y: 5 }, { x: 1, y: 5 }] };
  assert.deepEqual(pathFromTip(leftArrow, grid), [{ x: 0, y: 5 }]);
});

// 2. Collision Detection Logic
test('Collision Detection: Clear exit vs Blocked exit', () => {
  const grid = 20;
  const a1 = { id: 1, dir: 1, cells: [{ x: 2, y: 5 }, { x: 3, y: 5 }] }; // points right
  const a2 = { id: 2, dir: 2, cells: [{ x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }] }; // crosses x=6, y=5
  const a3 = { id: 3, dir: 0, cells: [{ x: 10, y: 10 }, { x: 10, y: 9 }] }; // unrelated

  // a1 is blocked by a2 at (6, 5)
  const res1 = tryExtract([a1, a2, a3], a1, grid);
  assert.equal(res1.ok, false);
  assert.equal(res1.blocker.id, 2);
  assert.deepEqual(res1.blockerCell, { x: 6, y: 5 });

  // a2 points down (tip at 6, 6). Path is (6, 7..19). Nothing blocks a2.
  const res2 = tryExtract([a1, a2, a3], a2, grid);
  assert.equal(res2.ok, true);

  // Once a2 extracts, a1 becomes extractable
  const res1After = tryExtract([a1, a3], a1, grid);
  assert.equal(res1After.ok, true);
});

test('Collision Detection: Bent arrows blocking multiple lines', () => {
  const grid = 20;
  // Bent L-shaped arrow
  const bent = {
    id: 10,
    dir: 0, // points up at (5, 2)
    cells: [{ x: 8, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }]
  };
  // Arrow pointing down towards y=5
  const incomingDown = { id: 11, dir: 2, cells: [{ x: 7, y: 1 }, { x: 7, y: 2 }] };
  const resDown = tryExtract([bent, incomingDown], incomingDown, grid);
  assert.equal(resDown.ok, false);
  assert.equal(resDown.blocker.id, 10);
  assert.deepEqual(resDown.blockerCell, { x: 7, y: 5 });

  // Arrow pointing right towards x=5
  const incomingRight = { id: 12, dir: 1, cells: [{ x: 1, y: 3 }, { x: 2, y: 3 }] };
  const resRight = tryExtract([bent, incomingRight], incomingRight, grid);
  assert.equal(resRight.ok, false);
  assert.equal(resRight.blocker.id, 10);
  assert.deepEqual(resRight.blockerCell, { x: 5, y: 3 });
});

// 3. State: Valid Arrow Movement
test('State Reducer: Valid arrow extraction updates state correctly', () => {
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);
  const initialCount = state.arrows.length;

  const hintArrow = findHint(state);
  assert.ok(hintArrow, 'Level 1 must have at least one extractable arrow initially');

  const result = applyTap(state, hintArrow.id);
  assert.equal(result.kind, 'extract');
  assert.equal(result.arrow.id, hintArrow.id);
  assert.equal(state.arrows.length, initialCount - 1);
  assert.equal(state.moves, 1);
  assert.equal(state.extractCount, 1);
  assert.equal(state.missCount, 0);
  assert.equal(state.hearts, HEARTS_MAX);
  assert.equal(state.history.length, 1);
  assert.equal(progressFraction(state), 1 / initialCount);
});

// 4. State: Blocked Arrow Movement & Hearts
test('State Reducer: Blocked tap docks a heart and records miss', () => {
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);
  const initialCount = state.arrows.length;

  // Find an arrow that is NOT extractable
  const blockedArrow = state.arrows.find(a => !tryExtract(state.arrows, a, state.grid).ok);
  assert.ok(blockedArrow, 'Level 1 should have blocked arrows');

  const result = applyTap(state, blockedArrow.id);
  assert.equal(result.kind, 'block');
  assert.equal(result.arrow.id, blockedArrow.id);
  assert.ok(result.blocker);
  assert.ok(result.blockerCell);
  assert.equal(result.heartsRemaining, HEARTS_MAX - 1);

  assert.equal(state.hearts, HEARTS_MAX - 1);
  assert.equal(state.arrows.length, initialCount); // arrow was not removed
  assert.equal(state.moves, 1);
  assert.equal(state.extractCount, 0);
  assert.equal(state.missCount, 1);
  assert.equal(state.levelFailed, false);

  // Lose remaining hearts
  applyTap(state, blockedArrow.id);
  assert.equal(state.hearts, 1);
  assert.equal(state.levelFailed, false);

  applyTap(state, blockedArrow.id);
  assert.equal(state.hearts, 0);
  assert.equal(state.levelFailed, true);

  // Tapping after failure is a no-op
  const noop = applyTap(state, blockedArrow.id);
  assert.equal(noop.kind, 'noop');
});

// 5. Invalid Input Handling
test('State Reducer: Invalid arrow ids and types handled safely', () => {
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);

  assert.deepEqual(applyTap(state, -1), { kind: 'noop' });
  assert.deepEqual(applyTap(state, 999999), { kind: 'noop' });
  assert.deepEqual(applyTap(state, null), { kind: 'noop' });
  assert.deepEqual(applyTap(state, undefined), { kind: 'noop' });
  assert.deepEqual(applyTap(state, 'nonexistent'), { kind: 'noop' });

  assert.equal(state.moves, 0);
  assert.equal(state.history.length, 0);
});

// 6. Undo Correctness
test('State Reducer: applyUndo correctly reverses extraction and heart loss', () => {
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);
  const initialCount = state.arrows.length;

  // Undo on empty history returns false
  assert.equal(applyUndo(state), false);

  // 1. Extract an arrow
  const hintArrow = findHint(state);
  applyTap(state, hintArrow.id);
  assert.equal(state.arrows.length, initialCount - 1);
  assert.equal(state.moves, 1);

  // Undo extraction
  const undo1 = applyUndo(state);
  assert.equal(undo1, true);
  assert.equal(state.arrows.length, initialCount);
  assert.equal(state.moves, 0);
  assert.equal(state.extractCount, 0);
  assert.ok(state.arrows.some(a => a.id === hintArrow.id));

  // 2. Blocked tap
  const blockedArrow = state.arrows.find(a => !tryExtract(state.arrows, a, state.grid).ok);
  applyTap(state, blockedArrow.id);
  assert.equal(state.hearts, HEARTS_MAX - 1);
  assert.equal(state.missCount, 1);

  // Undo block
  const undo2 = applyUndo(state);
  assert.equal(undo2, true);
  assert.equal(state.hearts, HEARTS_MAX);
  assert.equal(state.missCount, 0);
  assert.equal(state.moves, 0);

  // 3. Multi-step undo sequence
  for (let step = 0; step < 4; step++) {
    const nextExtract = findHint(state);
    if (nextExtract) applyTap(state, nextExtract.id);
  }
  assert.equal(state.history.length, 4);
  assert.equal(state.extractCount, 4);

  while (state.history.length > 0) {
    assert.equal(applyUndo(state), true);
  }
  assert.equal(state.extractCount, 0);
  assert.equal(state.arrows.length, initialCount);
  assert.equal(applyUndo(state), false);
});

// 7. Restart Behavior
test('State Reducer: applyRestart completely resets all metrics', () => {
  const puzzle = generateLevel(2);
  const state = createGameState(puzzle);
  const initialCount = state.arrows.length;

  // Perform some extracts and blocks
  const hint = findHint(state);
  applyTap(state, hint.id);
  const blocked = state.arrows.find(a => !tryExtract(state.arrows, a, state.grid).ok);
  if (blocked) applyTap(state, blocked.id);

  assert.ok(state.moves > 0);
  assert.ok(state.history.length > 0);

  applyRestart(state);

  assert.equal(state.arrows.length, initialCount);
  assert.equal(state.hearts, HEARTS_MAX);
  assert.equal(state.moves, 0);
  assert.equal(state.extractCount, 0);
  assert.equal(state.missCount, 0);
  assert.equal(state.hintsUsed, 0);
  assert.equal(state.history.length, 0);
  assert.equal(state.levelComplete, false);
  assert.equal(state.levelFailed, false);
  assert.equal(state.finishedAt, 0);
});

// 8. Level Completion & Full Solvability
test('Game Solver: Full level playthrough from start to finish via hints', () => {
  const levelsToTest = [1, 50, 100, 201, 401, 601, 801];
  for (const lvl of levelsToTest) {
    const puzzle = generateLevel(lvl);
    const state = createGameState(puzzle);
    const totalArrows = puzzle.arrows.length;

    while (!state.levelComplete) {
      const hint = findHint(state);
      assert.ok(hint, `Level ${lvl} must have an extractable arrow at every step`);
      const res = applyTap(state, hint.id);
      assert.equal(res.kind, 'extract');
    }

    assert.equal(state.levelComplete, true);
    assert.equal(state.extractCount, totalArrows);
    assert.equal(state.arrows.length, 0);
    assert.equal(state.hearts, HEARTS_MAX); // 0 errors
    assert.ok(state.finishedAt > 0);

    // After win, taps and undos are blocked
    assert.deepEqual(applyTap(state, 1), { kind: 'noop' });
    assert.equal(applyUndo(state), false);
  }
});

// 9. Difficulty Generation & Tier Scaling
test('Difficulty & Tier Parameters: Grid sizes, arrow counts and tier boundaries', () => {
  // Test tier boundaries
  assert.equal(tierForLevel(1).key, 'easy');
  assert.equal(tierForLevel(200).key, 'easy');
  assert.equal(tierForLevel(201).key, 'medium');
  assert.equal(tierForLevel(400).key, 'medium');
  assert.equal(tierForLevel(401).key, 'hard');
  assert.equal(tierForLevel(600).key, 'hard');
  assert.equal(tierForLevel(601).key, 'veryhard');
  assert.equal(tierForLevel(800).key, 'veryhard');
  assert.equal(tierForLevel(801).key, 'nightmare');
  assert.equal(tierForLevel(2000).key, 'nightmare');
  assert.equal(tierForLevel(9999).key, 'nightmare');

  // Verify grid sizes
  assert.equal(TIERS.easy.grid, 28);
  assert.equal(TIERS.medium.grid, 30);
  assert.equal(TIERS.hard.grid, 32);
  assert.equal(TIERS.veryhard.grid, 36);
  assert.equal(TIERS.nightmare.grid, 40);

  // Verify level seed determinism
  assert.equal(levelSeed(1), levelSeed(1));
  assert.notEqual(levelSeed(1), levelSeed(2));

  // Verify daily challenges across all 7 days of week
  const dates = [
    '2026-10-19', // Monday -> easy
    '2026-10-20', // Tuesday -> medium
    '2026-10-21', // Wednesday -> medium
    '2026-10-22', // Thursday -> hard
    '2026-10-23', // Friday -> hard
    '2026-10-24', // Saturday -> nightmare
    '2026-10-25'  // Sunday -> veryhard
  ];
  for (const dateKey of dates) {
    const daily = generateDaily(dateKey);
    assert.ok(daily.arrows.length > 0);
    assert.equal(daily.dailyLabel, dateKey);
    const hint = findHint(createGameState(daily));
    assert.ok(hint, `Daily ${dateKey} must be solvable`);
  }
});

console.log(`\nAll ${passed}/${total} Game Engine Validation tests passed successfully!`);
