/* Smoke test for the level generator.
   Generates a batch of levels per tier and validates each one:
     - no two arrows share a cell
     - the reverse-placement order is a valid extraction sequence
       (every arrow's forward path is clear when it's removed).

   Run with: node test/smoke.mjs */

import { generateLevel, generateDaily } from '../src/engine/generator.js';
import { TIER_ORDER, TIERS } from '../src/config.js';
import { solvePuzzle } from '../src/engine/solver.js';

let failures = 0;
let total = 0;

for (const tierKey of TIER_ORDER) {
  const t = TIERS[tierKey];
  const sampleLevels = pickSampleLevels(t);
  for (const lvl of sampleLevels) {
    total++;
    try {
      const puzzle = generateLevel(lvl);
      validatePuzzle(puzzle, t);
    } catch (e) {
      failures++;
      console.error(`Level ${lvl} (${tierKey}): ${e.message}`);
    }
  }
  console.log(`  ${tierKey}: tested ${sampleLevels.length} levels`);
}

// Also test a few daily challenges.
const today = new Date();
for (let i = 0; i < 14; i++) {
  total++;
  const d = new Date(today.getTime() - i * 86400000);
  const key = d.toISOString().slice(0, 10);
  try {
    const puzzle = generateDaily(key);
    if (!puzzle.arrows.length) throw new Error('empty');
    validatePuzzle(puzzle, TIERS[puzzle.tier]);
  } catch (e) {
    failures++;
    console.error(`Daily ${key}: ${e.message}`);
  }
}

console.log(`\n${total - failures}/${total} passed.`);
if (failures > 0) process.exit(1);

function pickSampleLevels(tier) {
  const out = [];
  const start = tier.start;
  const end = isFinite(tier.end) ? tier.end : tier.start + 199;
  const span = end - start + 1;
  const step = Math.max(1, Math.floor(span / 50));
  for (let i = start; i <= end && out.length < 50; i += step) out.push(i);
  return out;
}

function validatePuzzle(puzzle, tier) {
  const { grid, arrows, obstacles = [] } = puzzle;
  if (arrows.length < Math.floor(tier.arrowMin * 0.7)) {
    throw new Error(`only ${arrows.length} arrows (target >= ${tier.arrowMin})`);
  }
  // No two arrows or obstacles share a cell.
  const occ = new Map();
  for (const o of obstacles) {
    const k = o.y * grid + o.x;
    occ.set(k, o.id);
  }
  for (const a of arrows) {
    for (const c of a.cells) {
      if (c.x < 0 || c.x >= grid || c.y < 0 || c.y >= grid) {
        throw new Error(`arrow ${a.id} out of bounds at ${c.x},${c.y}`);
      }
      const k = c.y * grid + c.x;
      if (occ.has(k)) throw new Error(`overlap at ${c.x},${c.y} (${occ.get(k)} & arrow ${a.id})`);
      occ.set(k, `arrow-${a.id}`);
    }
  }

  // Solvability verified via full solver
  const sol = solvePuzzle(puzzle, 1200);
  if (!sol.solved) {
    throw new Error(`Puzzle level ${puzzle.level} was not solved by solver (remaining: ${sol.remainingArrows})`);
  }
}
