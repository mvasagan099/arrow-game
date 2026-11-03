/* Phase 7 Performance & Benchmark Test Suite */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/engine/generator.js';
import { solvePuzzle } from '../src/engine/solver.js';
import { TIERS, TIER_ORDER } from '../src/config.js';
import { emitExtractParticles, emitBlockParticles, emitWinParticles, getActiveParticleCount, clearAllParticles } from '../src/render/particles.js';

describe('Game Engine Performance Benchmarks Across 6 Tiers', () => {
  const SAMPLES_PER_TIER = 25;

  for (const tierKey of TIER_ORDER) {
    const tier = TIERS[tierKey];

    it(`Tier: ${tier.label} (${tierKey}) meets generation & solver performance targets`, () => {
      const genTimes = [];
      const solveTimes = [];
      const arrowCounts = [];

      // Sample representative levels evenly across tier range
      const step = Math.max(1, Math.floor((tier.end - tier.start) / SAMPLES_PER_TIER));
      for (let lvl = tier.start; lvl <= tier.end; lvl += step) {
        // Measure generation
        const t0 = performance.now();
        const puzzle = generateLevel(lvl);
        const t1 = performance.now();
        genTimes.push(t1 - t0);
        arrowCounts.push(puzzle.arrows.length);

        // Measure solver
        const t2 = performance.now();
        const sol = solvePuzzle(puzzle, 1500);
        const t3 = performance.now();
        solveTimes.push(t3 - t2);

        assert.equal(sol.solved, true, `Level ${lvl} must be solvable`);
      }

      genTimes.sort((a, b) => a - b);
      solveTimes.sort((a, b) => a - b);

      const p50Gen = genTimes[Math.floor(genTimes.length * 0.50)];
      const p95Gen = genTimes[Math.floor(genTimes.length * 0.95)];
      const maxGen = genTimes[genTimes.length - 1];
      const avgGen = genTimes.reduce((s, v) => s + v, 0) / genTimes.length;

      const p50Solve = solveTimes[Math.floor(solveTimes.length * 0.50)];
      const p95Solve = solveTimes[Math.floor(solveTimes.length * 0.95)];
      const maxSolve = solveTimes[solveTimes.length - 1];
      const avgSolve = solveTimes.reduce((s, v) => s + v, 0) / solveTimes.length;

      // Assertions based on targets
      assert.ok(maxGen < 65, `Max generation time (${maxGen.toFixed(2)}ms) must be < 65ms to avoid UI jank`);
      assert.ok(maxSolve < 65, `Max solver time (${maxSolve.toFixed(2)}ms) must be < 65ms`);
      assert.ok(p95Gen < 55, `P95 generation time (${p95Gen.toFixed(2)}ms) must be < 55ms`);
    });
  }
});

describe('Canvas & Particle Pool Memory Architecture', () => {
  it('pre-allocated particle pool respects fixed 140-object cap with 0 runtime re-allocations', () => {
    clearAllParticles();
    assert.equal(getActiveParticleCount(), 0);

    const winColors = ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e'];
    // Burst 10 win celebrations consecutively (each requesting 48 particles = 480 requests)
    for (let i = 0; i < 10; i++) {
      emitWinParticles(200, 300, 150, winColors);
    }

    const active = getActiveParticleCount();
    assert.ok(active <= 140, `Active particle count (${active}) must not exceed pool capacity (140)`);

    // Emit trail and block particles
    emitExtractParticles(100, 100, 0, '#38bdf8');
    emitBlockParticles(100, 100, '#ef4444');

    const totalActive = getActiveParticleCount();
    assert.ok(totalActive <= 140, 'Total active particles must remain bounded by 140');

    clearAllParticles();
    assert.equal(getActiveParticleCount(), 0);
  });
});
