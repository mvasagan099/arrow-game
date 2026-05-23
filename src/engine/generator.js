/* Seeded procedural level generator.

   Strategy: REVERSE CONSTRUCTION
   ------------------------------
   We grow the puzzle one arrow at a time. For each candidate we pick a
   random tip cell + direction, then walk backward (with 0..K right-angle
   bends) to lay out the body. A candidate is accepted only if:
     (a) every body cell is in bounds and unoccupied
     (b) every cell in front of the tip (out to the edge in the arrow's
         direction) is unoccupied.

   Because we check (b) against the already-placed arrows, the most recent
   arrow added always has a clear exit — meaning the REVERSE of our
   placement order is a valid extraction sequence. Therefore every level
   is solvable by construction. */

import { DIRS, tierForLevel } from '../config.js';
import { mulberry32, weightedIndex, randInt, shuffle } from './rng.js';

const BASE_SEED = 0x9E3779B1;

export function levelSeed(levelNumber) {
  return (BASE_SEED ^ Math.imul(levelNumber, 2654435761)) >>> 0;
}

export function generateLevel(levelNumber) {
  const tier = tierForLevel(levelNumber);
  return generate(tier, levelSeed(levelNumber), levelNumber, tier.key);
}

export function generateDaily(dateKey) {
  /* Daily challenge: weekday-driven difficulty so the player rotates
     through tiers across the week. Monday is the easiest. */
  const day = new Date(dateKey + 'T00:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  const wheel = ['veryhard', 'easy', 'medium', 'medium', 'hard', 'hard', 'nightmare'];
  // index by (day+6)%7 so Monday=0
  const tierKey = wheel[(day + 6) % 7];
  const tier = { ...{ easy: 1, medium: 201, hard: 401, veryhard: 601, nightmare: 801 }, ...{} };
  const fakeLevel = { easy: 100, medium: 300, hard: 500, veryhard: 700, nightmare: 900 }[tierKey];
  const t = tierForLevel(fakeLevel);
  return generate(t, hashDate(dateKey), -1, tierKey, /*dailyLabel=*/ dateKey);
}

function hashDate(s) {
  let h = 0x811C9DC5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* Target arrow count.
   Level 1 baselines at 20-30 arrows. Every 5 levels the floor and ceiling
   each grow by 2, so progression is smooth and predictable. Daily / fallback
   levels (levelNumber <= 0) use the tier's nominal range.
   We always cap by what the grid can comfortably fit (~40% of cells, after
   accounting for an average arrow length of ~3 cells) so the generator
   doesn't spin forever on a saturated board. */
function arrowCountForLevel(rand, levelNumber, tier) {
  if (levelNumber <= 0) {
    return randInt(rand, tier.arrowMin, tier.arrowMax);
  }
  const step = Math.floor((levelNumber - 1) / 5);
  let lo = 40 + step * 2;
  let hi = 50 + step * 2;

  const cellBudget = Math.floor(tier.grid * tier.grid * 0.40);
  const maxByBudget = Math.max(tier.arrowMin, Math.floor(cellBudget / 3.2));
  if (hi > maxByBudget) hi = maxByBudget;
  if (lo > hi) lo = hi;
  return randInt(rand, Math.max(1, lo), Math.max(1, hi));
}

function generate(tier, seed, levelNumber, tierKey, dailyLabel = null) {
  const rand = mulberry32(seed);
  const grid = tier.grid;
  const target = arrowCountForLevel(rand, levelNumber, tier);
  const occupied = new Uint8Array(grid * grid);
  const placed = [];

  const maxAttempts = target * 40;
  let attempts = 0;
  let consecutiveFails = 0;

  while (placed.length < target && attempts < maxAttempts) {
    attempts++;
    const arr = tryPlaceArrow(rand, grid, occupied, tier);
    if (!arr) {
      consecutiveFails++;
      // If we've been failing a lot, the board is probably saturated.
      if (consecutiveFails > 400 && placed.length >= tier.arrowMin) break;
      continue;
    }
    consecutiveFails = 0;
    for (const c of arr.cells) occupied[c.y * grid + c.x] = 1;
    placed.push(arr);
  }

  // Stable ids and a stable draw order.
  for (let i = 0; i < placed.length; i++) placed[i].id = i;

  return {
    level: levelNumber,
    tier: tierKey,
    grid,
    arrows: placed,
    dailyLabel
  };
}

function tryPlaceArrow(rand, grid, occupied, tier) {
  const dir = Math.floor(rand() * 4);
  const back = (dir + 2) % 4;
  const tipX = Math.floor(rand() * grid);
  const tipY = Math.floor(rand() * grid);

  if (occupied[tipY * grid + tipX]) return null;

  // Forward escape path must be clear of any already-placed arrow.
  const d = DIRS[dir];
  let px = tipX + d.dx;
  let py = tipY + d.dy;
  while (px >= 0 && px < grid && py >= 0 && py < grid) {
    if (occupied[py * grid + px]) return null;
    px += d.dx;
    py += d.dy;
  }

  // Pick length (cap to grid size, since a longer arrow could not fit).
  const maxLenIdx = Math.min(tier.lengthWeights.length - 1, grid);
  const lenWeights = tier.lengthWeights.slice(0, maxLenIdx + 1);
  let length = weightedIndex(rand, lenWeights);
  if (length < 1) length = 1;

  if (length === 1) {
    return { dir, cells: [{ x: tipX, y: tipY }] };
  }

  // Pick bend count (capped by what the length supports).
  const maxBends = Math.min(tier.bendWeights.length - 1, Math.max(0, length - 2));
  const bendWeights = tier.bendWeights.slice(0, maxBends + 1);
  const bends = weightedIndex(rand, bendWeights);

  // Decide which body indices (2..length-1) bend.
  const bendCandidates = [];
  for (let i = 2; i <= length - 1; i++) bendCandidates.push(i);
  shuffle(rand, bendCandidates);
  const bendSet = new Set(bendCandidates.slice(0, bends));

  // Walk from tip backward, placing body cells.
  const cells = [{ x: tipX, y: tipY }];
  const visitedKeys = new Set([tipY * grid + tipX]);
  let cx = tipX;
  let cy = tipY;
  let curDir = back;

  for (let i = 1; i < length; i++) {
    let candidates;
    if (bendSet.has(i)) {
      candidates = shuffle(rand, [(curDir + 3) % 4, (curDir + 1) % 4]);
    } else {
      candidates = [curDir];
    }

    let placedCell = false;
    for (const tryDir of candidates) {
      if (tryStep(tryDir, cx, cy, grid, occupied, visitedKeys, cells)) {
        cx = cells[cells.length - 1].x;
        cy = cells[cells.length - 1].y;
        curDir = tryDir;
        placedCell = true;
        break;
      }
    }

    // Recovery: if a straight step failed (boxed in / off grid), try a bend
    // anyway. This raises the generator's success rate on dense boards
    // without changing the body length.
    if (!placedCell && !bendSet.has(i)) {
      const recovery = shuffle(rand, [(curDir + 3) % 4, (curDir + 1) % 4]);
      for (const tryDir of recovery) {
        if (tryStep(tryDir, cx, cy, grid, occupied, visitedKeys, cells)) {
          cx = cells[cells.length - 1].x;
          cy = cells[cells.length - 1].y;
          curDir = tryDir;
          placedCell = true;
          break;
        }
      }
    }

    if (!placedCell) return null;
  }

  // We built cells tip-first while walking backward; flip to the
  // tail-first convention used by the rest of the engine.
  cells.reverse();
  return { dir, cells };
}

function tryStep(dir, cx, cy, grid, occupied, visitedKeys, cells) {
  const d = DIRS[dir];
  const nx = cx + d.dx;
  const ny = cy + d.dy;
  if (nx < 0 || nx >= grid || ny < 0 || ny >= grid) return false;
  const key = ny * grid + nx;
  if (occupied[key]) return false;
  if (visitedKeys.has(key)) return false;
  cells.push({ x: nx, y: ny });
  visitedKeys.add(key);
  return true;
}
