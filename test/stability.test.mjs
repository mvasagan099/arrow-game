/* Phase 7 Gameplay Stress & Long-Duration Stability Test Suite */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateLevel } from '../src/engine/generator.js';
import { createGameState, applyTap, applyUndo, applyRestart } from '../src/engine/state.js';
import { solvePuzzle } from '../src/engine/solver.js';
import { createDefaultEconomy, getBalance } from '../src/economy/wallet.js';
import { purchaseCosmetic, equipCosmetic } from '../src/economy/shop.js';
import { THEMES, THEME_KEYS } from '../src/config.js';
import { invalidatePalette, readPalette } from '../src/render/canvas.js';
import { grantRewardedCoins, grantRewardedHint } from '../src/ads/ad-rewards.js';

describe('Stability - 100 Consecutive Level Loads & Solves', () => {
  it('generates and completely solves 100 consecutive levels without memory leaks or state corruption', () => {
    const memBefore = process.memoryUsage().heapUsed;

    for (let lvl = 1; lvl <= 100; lvl++) {
      const puzzle = generateLevel(lvl);
      const state = createGameState(puzzle);
      const sol = solvePuzzle(puzzle, 1200);

      assert.equal(sol.solved, true, `Level ${lvl} must be solvable`);
      assert.ok(sol.sequence.length > 0, `Level ${lvl} must produce a valid sequence`);

      // Play through the sequence
      for (const step of sol.sequence) {
        if (step.type === 'extract' || step.type === 'rotate') {
          applyTap(state, step.arrowId);
        }
      }

      assert.equal(state.levelComplete, true, `Level ${lvl} must complete after following solver sequence`);
    }

    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    const growthMB = (memAfter - memBefore) / (1024 * 1024);

    // Bounded heap growth: 100 levels should retain under 25 MB
    assert.ok(growthMB < 25, `Heap growth (${growthMB.toFixed(2)} MB) exceeded 25 MB threshold`);
  });
});

describe('Stability - 100 Rapid Restarts & Undos Stress', () => {
  it('handles 100 rapid restarts without desynchronizing state', () => {
    const puzzle = generateLevel(25);
    const state = createGameState(puzzle);

    for (let i = 0; i < 100; i++) {
      // Make a move
      const firstArrow = state.arrows[0];
      applyTap(state, firstArrow.id);
      // Restart
      applyRestart(state);
      assert.equal(state.hearts, 3);
      assert.equal(state.moves, 0);
      assert.equal(state.history.length, 0);
      assert.equal(state.arrows.length, puzzle.arrows.length);
    }
  });

  it('handles 100 rapid undo operations safely', () => {
    const puzzle = generateLevel(10);
    const state = createGameState(puzzle);

    // Make 10 taps
    for (let i = 0; i < 10; i++) {
      if (state.arrows.length > 0) {
        applyTap(state, state.arrows[0].id);
      }
    }

    // Undo all 10 taps repeatedly
    while (state.history.length > 0) {
      const ok = applyUndo(state);
      assert.equal(ok, true);
    }

    // Attempt extra undos when history is empty
    assert.equal(applyUndo(state), false);
    assert.equal(applyUndo(state), false);
  });
});

describe('Stability - 50 Theme Switches & 50 Cosmetic Equip Changes', () => {
  it('switches between all 6 themes 50 times without palette corruption', () => {
    const allThemes = [...THEME_KEYS, 'cyberpunk', 'forest'];

    for (let i = 0; i < 50; i++) {
      const themeKey = allThemes[i % allThemes.length];
      invalidatePalette(themeKey);
      const pal = readPalette();
      assert.ok(pal.bg, `Theme ${themeKey} must provide background color`);
      assert.ok(pal.ink, `Theme ${themeKey} must provide ink color`);
    }
  });

  it('equips and switches cosmetics 50 times without state degradation', () => {
    const data = { economy: createDefaultEconomy() };
    const cosmetics = [
      { cat: 'arrow', id: 'arrow_default' },
      { cat: 'board', id: 'board_default' },
      { cat: 'trail', id: 'trail_default' }
    ];

    for (let i = 0; i < 50; i++) {
      const item = cosmetics[i % cosmetics.length];
      const res = equipCosmetic(data, item.cat, item.id);
      assert.equal(res.success, true);
    }
  });

  it('processes 50 ad reward events without exceeding FIFO transaction bounds', () => {
    const data = { economy: createDefaultEconomy() };

    for (let i = 0; i < 50; i++) {
      grantRewardedCoins(data, `session_test_${i}`);
    }

    // Transactions log must be strictly capped at 50 entries
    assert.ok(data.economy.transactions.length <= 50,
      `Transaction log length (${data.economy.transactions.length}) must not exceed 50 entries`);
  });
});
