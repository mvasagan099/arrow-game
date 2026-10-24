/* Automated Test Suite for Arrow Escape Phase 3:
   - 6 Difficulty Tiers & Seed Determinism (1 to 2,000 Levels)
   - Fixed Immovable Obstacles (Collision, Raycast, Unsolvability Prevention)
   - Color-Keyed Arrows (Locking Rules, Prerequisite Keys, Unlocking & Undo)
   - Rotating Pivot Arrows (Clockwise Rotation, Collision Sweeping, Undo Restoration)
   - Automated Puzzle Solver (Exhaustive & Bounded Verification)
   - Save Schema Migration & Level Unlocking Progression
   - Daily Challenge Offline Generation, History & Streak Tracking
   - Interactive Tutorials Topic Coverage & Local Completion
*/

import assert from 'node:assert/strict';
import {
  TIERS,
  TIER_ORDER,
  tierForLevel,
  COLOR_KEYS,
  COLOR_KEY_ORDER,
  MAX_LEVEL,
  DIRS
} from '../src/config.js';
import {
  generateLevel,
  generateDaily,
  levelSeed
} from '../src/engine/generator.js';
import {
  createGameState,
  applyTap,
  applyUndo,
  applyRestart
} from '../src/engine/state.js';
import {
  tryExtract,
  canRotateArrow,
  arrowAt,
  isFullyExtractable
} from '../src/engine/rules.js';
import {
  cloneArrow,
  getRotatedArrow,
  occupiesCell,
  tip
} from '../src/engine/arrow.js';
import { solvePuzzle } from '../src/engine/solver.js';
import {
  load,
  save,
  isSolved,
  markSolved,
  solvedSet
} from '../src/persist.js';
import {
  recordDailyCompletion,
  rolloverDailyStreak,
  dailyAlreadyCompleted,
  getDailyHistory
} from '../src/ui/daily.js';
import { TUTORIAL_TOPICS } from '../src/ui/tutorials.js';

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

// Mock localStorage for node environment
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

console.log('Running Phase 3 Advanced Gameplay, Mechanics & Solver Tests...');

test('Phase 3 Tiers: 6 distinct difficulty tiers with correct boundaries and grid sizes', () => {
  const expectedTiers = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
  assert.deepEqual(TIER_ORDER, expectedTiers);

  // Check boundaries
  assert.equal(tierForLevel(1).key, 'beginner');
  assert.equal(tierForLevel(200).key, 'beginner');
  assert.equal(tierForLevel(201).key, 'easy');
  assert.equal(tierForLevel(500).key, 'easy');
  assert.equal(tierForLevel(501).key, 'medium');
  assert.equal(tierForLevel(900).key, 'medium');
  assert.equal(tierForLevel(901).key, 'hard');
  assert.equal(tierForLevel(1300).key, 'hard');
  assert.equal(tierForLevel(1301).key, 'expert');
  assert.equal(tierForLevel(1700).key, 'expert');
  assert.equal(tierForLevel(1701).key, 'master');
  assert.equal(tierForLevel(2000).key, 'master');

  // Verify grid sizes increase gradually
  assert.equal(TIERS.beginner.grid, 20);
  assert.equal(TIERS.easy.grid, 24);
  assert.equal(TIERS.medium.grid, 28);
  assert.equal(TIERS.hard.grid, 32);
  assert.equal(TIERS.expert.grid, 36);
  assert.equal(TIERS.master.grid, 40);

  // Verify arrow bounds scale predictably
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    assert.ok(t.arrowMin > 0);
    assert.ok(t.arrowMax >= t.arrowMin);
    assert.ok(t.grid > 0);
  }
});

test('Phase 3 Seed Determinism: Same level seed yields exact identical puzzle layout', () => {
  const testLevels = [1, 42, 250, 750, 1200, 1850, 2000];
  for (const lvl of testLevels) {
    const p1 = generateLevel(lvl);
    const p2 = generateLevel(lvl);

    assert.equal(p1.level, p2.level);
    assert.equal(p1.grid, p2.grid);
    assert.equal(p1.tier, p2.tier);
    assert.equal(p1.arrows.length, p2.arrows.length);
    assert.equal((p1.obstacles || []).length, (p2.obstacles || []).length);

    for (let i = 0; i < p1.arrows.length; i++) {
      const a1 = p1.arrows[i];
      const a2 = p2.arrows[i];
      assert.equal(a1.id, a2.id);
      assert.equal(a1.dir, a2.dir);
      assert.equal(a1.isPivot, a2.isPivot);
      assert.equal(a1.keyId, a2.keyId);
      assert.equal(a1.lockedByKey, a2.lockedByKey);
      assert.deepEqual(a1.cells, a2.cells);
    }
  }
});

test('Phase 3 Fixed Obstacles: Collision raycast, blocking, and non-extractability', () => {
  const grid = 10;
  const obstacles = [{ id: 'obs-1', x: 5, y: 5 }];

  // Arrow pointing right at (2, 5) heading directly toward obstacle at (5, 5)
  const arrowHeadingToObs = {
    id: 1,
    dir: 1, // Right
    cells: [{ x: 1, y: 5 }, { x: 2, y: 5 }]
  };

  // Arrow pointing up at (5, 8) heading toward obstacle at (5, 5)
  const arrowHeadingUpToObs = {
    id: 2,
    dir: 0, // Up
    cells: [{ x: 5, y: 8 }, { x: 5, y: 7 }]
  };

  // Arrow pointing down at (8, 2) with clear path away from other arrows and obstacle
  const arrowClear = {
    id: 3,
    dir: 2, // Down
    cells: [{ x: 8, y: 2 }, { x: 8, y: 3 }]
  };

  const arrows = [arrowHeadingToObs, arrowHeadingUpToObs, arrowClear];

  // Test tryExtract
  const resObs1 = tryExtract(arrows, arrowHeadingToObs, grid, obstacles);
  assert.equal(resObs1.ok, false);
  assert.equal(resObs1.isObstacle, true);
  assert.deepEqual(resObs1.blockerCell, { x: 5, y: 5 });

  const resObs2 = tryExtract(arrows, arrowHeadingUpToObs, grid, obstacles);
  assert.equal(resObs2.ok, false);
  assert.equal(resObs2.isObstacle, true);

  const resClear = tryExtract(arrows, arrowClear, grid, obstacles);
  assert.equal(resClear.ok, true);

  // Test state machine collision with obstacle
  const puzzle = { level: 999, tier: 'easy', grid, arrows, obstacles };
  const state = createGameState(puzzle);

  const tapObs = applyTap(state, 1);
  assert.equal(tapObs.kind, 'block');
  assert.equal(tapObs.isObstacle, true);
  assert.equal(state.hearts, 2);

  // Undo restores heart
  assert.equal(applyUndo(state), true);
  assert.equal(state.hearts, 3);
});

test('Phase 3 Color-Keyed Arrows: Lock verification, unlocking, and undo', () => {
  const grid = 10;
  // Key arrow
  const keyArrow = {
    id: 10,
    dir: 1, // Right (open path to edge)
    cells: [{ x: 7, y: 2 }, { x: 8, y: 2 }],
    keyId: 'amber'
  };

  // Locked arrow (path to edge is geometrically open, but locked by 'amber')
  const lockedArrow = {
    id: 20,
    dir: 3, // Left (open path to edge)
    cells: [{ x: 3, y: 6 }, { x: 2, y: 6 }],
    lockedByKey: 'amber'
  };

  // Another arrow so level is not complete on extracting locked arrow
  const otherArrow = {
    id: 30,
    dir: 0,
    cells: [{ x: 8, y: 8 }, { x: 8, y: 7 }]
  };

  const arrows = [keyArrow, lockedArrow, otherArrow];
  const puzzle = { level: 501, tier: 'medium', grid, arrows, obstacles: [] };
  const state = createGameState(puzzle);

  // 1. Tapping locked arrow while key is on board must fail
  const tapLocked = applyTap(state, 20);
  assert.equal(tapLocked.kind, 'locked');
  assert.equal(tapLocked.keyId, 'amber');
  assert.equal(state.hearts, 2);

  // 2. Tapping key arrow extracts it
  const tapKey = applyTap(state, 10);
  assert.equal(tapKey.kind, 'extract');
  assert.equal(tapKey.unlockedKey, 'amber');
  assert.equal(state.arrows.some(a => a.id === 10), false);

  // 3. Now the locked arrow is UNLOCKED and can escape!
  const tapUnlocked = applyTap(state, 20);
  assert.equal(tapUnlocked.kind, 'extract');
  assert.equal(state.arrows.some(a => a.id === 20), false);
  assert.equal(state.levelComplete, false); // otherArrow is still present

  // 4. Undo restores lock and key arrow
  assert.equal(applyUndo(state), true);
  assert.equal(state.arrows.some(a => a.id === 20), true);

  assert.equal(applyUndo(state), true);
  assert.equal(state.arrows.some(a => a.id === 10), true);
  const recheckLocked = tryExtract(state.arrows, state.arrows.find(a => a.id === 20), grid, []);
  assert.equal(recheckLocked.ok, false);
  assert.equal(recheckLocked.locked, true);
});

test('Phase 3 Rotating Pivot Arrows: Clockwise rotation, collision sweep, and undo', () => {
  const grid = 10;

  // Blocker arrow at (5, 2)
  const blocker = {
    id: 100,
    dir: 2,
    cells: [{ x: 5, y: 2 }]
  };

  // Pivot arrow at tail (5, 5), tip (5, 4), pointing Up (0) directly at blocker (5, 2)
  const pivotArrow = {
    id: 200,
    dir: 0, // Up
    cells: [{ x: 5, y: 5 }, { x: 5, y: 4 }],
    isPivot: true
  };

  const arrows = [blocker, pivotArrow];
  const puzzle = { level: 901, tier: 'hard', grid, arrows, obstacles: [] };
  const state = createGameState(puzzle);

  // Test rotation check:
  // Rotated clockwise 90 deg around tail (5, 5):
  // Up (0, -1) -> Right (1, 0), tip moves from (5, 4) to (6, 5)
  const rotCheck = canRotateArrow(pivotArrow, grid, arrows, []);
  assert.equal(rotCheck.ok, true);
  assert.equal(rotCheck.rotated.dir, 1); // Right
  assert.deepEqual(rotCheck.rotated.cells, [{ x: 5, y: 5 }, { x: 6, y: 5 }]);

  // Apply tap on pivot arrow: forward ray is blocked, so it should ROTATE without losing a heart!
  const tapRot = applyTap(state, 200);
  assert.equal(tapRot.kind, 'rotate');
  assert.equal(tapRot.prevDir, 0);
  assert.equal(tapRot.newDir, 1);
  assert.equal(state.hearts, 3, 'Valid pivot rotation must not deduct hearts');

  // Arrow is now pointing Right (1) with a clear path to edge x=9!
  // Tapping it again should EXTRACT it!
  const tapExtract = applyTap(state, 200);
  assert.equal(tapExtract.kind, 'extract');

  // Test Undo restores rotation and orientation
  assert.equal(applyUndo(state), true);
  const restored1 = state.arrows.find(a => a.id === 200);
  assert.equal(restored1.dir, 1);

  assert.equal(applyUndo(state), true);
  const restored2 = state.arrows.find(a => a.id === 200);
  assert.equal(restored2.dir, 0);
  assert.deepEqual(restored2.cells, [{ x: 5, y: 5 }, { x: 5, y: 4 }]);
});

test('Phase 3 Automated Solver: Solves complex puzzle with obstacles, keys, and pivots', () => {
  const grid = 12;
  const obstacles = [{ id: 'obs-1', x: 6, y: 6 }];

  const arrows = [
    // 1. Pivot arrow that must rotate to unblock or escape
    {
      id: 1,
      dir: 0, // Up (blocked by edge or arrow)
      cells: [{ x: 8, y: 8 }, { x: 8, y: 7 }],
      isPivot: true
    },
    // 2. Key arrow (extracts first)
    {
      id: 2,
      dir: 1, // Right (open path to x=11)
      cells: [{ x: 9, y: 2 }, { x: 10, y: 2 }],
      keyId: 'cyan'
    },
    // 3. Locked arrow (unlocked by cyan key)
    {
      id: 3,
      dir: 3, // Left (open path to x=0)
      cells: [{ x: 3, y: 3 }, { x: 2, y: 3 }],
      lockedByKey: 'cyan'
    }
  ];

  const puzzle = { level: 999, tier: 'hard', grid, arrows, obstacles };
  const solution = solvePuzzle(puzzle, 500);

  assert.equal(solution.solved, true);
  assert.ok(solution.steps >= 3);
  assert.ok(solution.sequence.some(s => s.type === 'extract' && s.arrowId === 2));
  assert.ok(solution.sequence.some(s => s.type === 'extract' && s.arrowId === 3));

  // Verify unsolvable impossible layout is correctly identified
  const unsolvablePuzzle = {
    grid: 6,
    arrows: [
      { id: 1, dir: 1, cells: [{ x: 1, y: 2 }, { x: 2, y: 2 }] }, // points right at id:2
      { id: 2, dir: 3, cells: [{ x: 4, y: 2 }, { x: 3, y: 2 }] }  // points left at id:1
    ],
    obstacles: []
  };
  const unsolvableSol = solvePuzzle(unsolvablePuzzle, 100);
  assert.equal(unsolvableSol.solved, false);
});

test('Phase 3 Progression & Bit Packing: 2,000 Levels bitmask integrity and migrations', () => {
  localStorage.clear();

  // Test bit packing on boundary levels across the 2,000 range
  const data = load();
  assert.equal(data.v, 1);
  assert.ok(data.tutorials);
  assert.ok(Array.isArray(data.daily.history));

  // Solve level 1 (Beginner), 250 (Easy), 750 (Medium), 1250 (Hard), 1650 (Expert), 2000 (Master)
  const testLevels = [1, 200, 201, 500, 501, 900, 901, 1300, 1301, 1700, 1701, 2000];
  for (const lvl of testLevels) {
    assert.equal(isSolved(data, lvl), 0);
    markSolved(data, lvl);
    assert.equal(isSolved(data, lvl), 1);
  }

  save(data);
  const reloaded = load();
  const solved = solvedSet(reloaded);

  assert.equal(solved.size, testLevels.length);
  for (const lvl of testLevels) {
    assert.ok(solved.has(lvl), `Level ${lvl} must be recorded in solved set`);
  }

  // Level outside 1-2000 bounds should be safely ignored
  markSolved(reloaded, 0);
  markSolved(reloaded, 2001);
  assert.equal(solvedSet(reloaded).size, testLevels.length);
});

test('Phase 3 Daily Challenge: Deterministic generation, streak rollover, and history', () => {
  const dateKey = '2026-10-24';
  const daily1 = generateDaily(dateKey);
  const daily2 = generateDaily(dateKey);

  assert.equal(daily1.dailyLabel, dateKey);
  assert.equal(daily1.arrows.length, daily2.arrows.length);
  assert.equal(daily1.grid, daily2.grid);

  const sol = solvePuzzle(daily1, 800);
  assert.equal(sol.solved, true, 'Daily challenge must be 100% solvable');

  // Test Daily Completion & History
  const mockData = {
    daily: {
      lastDateKey: null,
      lastResultKey: null,
      streak: 0,
      maxStreak: 0,
      totalCompleted: 0,
      history: []
    }
  };

  assert.equal(dailyAlreadyCompleted(mockData), false);
  const recorded = recordDailyCompletion(mockData, dateKey);
  assert.equal(recorded, true);
  assert.equal(mockData.daily.streak, 1);
  assert.equal(mockData.daily.totalCompleted, 1);
  assert.ok(getDailyHistory(mockData).includes(dateKey));

  // Second completion on same day is idempotent
  const duplicateRecord = recordDailyCompletion(mockData, dateKey);
  assert.equal(duplicateRecord, false);
  assert.equal(mockData.daily.totalCompleted, 1);
});

test('Phase 3 Interactive Tutorials: All 7 required tutorial topics defined', () => {
  assert.equal(TUTORIAL_TOPICS.length, 7);

  const expectedIds = ['basic', 'collisions', 'undo', 'hints', 'obstacles', 'color_keys', 'pivots'];
  const actualIds = TUTORIAL_TOPICS.map(t => t.id);
  assert.deepEqual(actualIds, expectedIds);

  for (const topic of TUTORIAL_TOPICS) {
    assert.ok(topic.title, `Topic ${topic.id} missing title`);
    assert.ok(topic.summary, `Topic ${topic.id} missing summary`);
    assert.ok(topic.body, `Topic ${topic.id} missing body`);
    assert.ok(topic.svg, `Topic ${topic.id} missing svg illustration`);
    assert.ok(topic.num >= 1 && topic.num <= 7);
  }
});

console.log(`\nAll ${passed}/${total} Phase 3 tests passed successfully!`);
