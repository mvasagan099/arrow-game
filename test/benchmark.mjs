/* Performance and Solvability Benchmark:
   Measures:
   - Generation time per level across all difficulty tiers
   - Solving time per level (step-by-step extraction via findHint)
   - Solvability verification on sample levels across all tiers
*/

import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { generateLevel } from '../src/engine/generator.js';
import { createGameState, applyTap } from '../src/engine/state.js';
import { findHint } from '../src/engine/hint.js';
import { TIERS, TIER_ORDER } from '../src/config.js';

console.log('=== ARROW ESCAPE ENGINE PERFORMANCE & SOLVABILITY BENCHMARK ===\n');

const SAMPLES_PER_TIER = 20;

for (const tierKey of TIER_ORDER) {
  const tier = TIERS[tierKey];
  const start = tier.start;
  const end = isFinite(tier.end) ? tier.end : tier.start + 199;
  const step = Math.max(1, Math.floor((end - start) / SAMPLES_PER_TIER));

  let totalGenTime = 0;
  let totalSolveTime = 0;
  let totalArrows = 0;
  let solvedCount = 0;

  for (let i = 0; i < SAMPLES_PER_TIER; i++) {
    const lvl = start + i * step;

    // Measure generation
    const t0 = performance.now();
    const puzzle = generateLevel(lvl);
    const t1 = performance.now();
    totalGenTime += (t1 - t0);

    totalArrows += puzzle.arrows.length;

    // Measure solver
    const s0 = performance.now();
    const state = createGameState(puzzle);
    while (!state.levelComplete) {
      const hint = findHint(state);
      assert.ok(hint, `Level ${lvl} must have extractable arrow`);
      applyTap(state, hint.id);
    }
    const s1 = performance.now();
    totalSolveTime += (s1 - s0);
    solvedCount++;
  }

  const avgGen = (totalGenTime / SAMPLES_PER_TIER).toFixed(2);
  const avgSolve = (totalSolveTime / SAMPLES_PER_TIER).toFixed(2);
  const avgArrows = Math.round(totalArrows / SAMPLES_PER_TIER);

  console.log(`Tier: ${tier.label.padEnd(10)} (Grid ${tier.grid}x${tier.grid}, ~${avgArrows} arrows)`);
  console.log(`  - Avg Gen Time:   ${avgGen.padStart(6)} ms / level`);
  console.log(`  - Avg Solve Time: ${avgSolve.padStart(6)} ms / level (${(totalSolveTime / totalArrows).toFixed(3)} ms / move)`);
  console.log(`  - Solvability:    ${solvedCount}/${SAMPLES_PER_TIER} (100% verified)\n`);
}

console.log('Benchmark completed successfully.');
