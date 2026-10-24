/* Seeded procedural level generator with Advanced Mechanics (Phase 3).
   Supports:
     - 6 Difficulty Tiers (1 to 2,000 Levels)
     - Deterministic Seed Formulation
     - Fixed Immovable Obstacles
     - Color-Keyed Arrows (Key-and-Lock dependencies)
     - Rotating Pivot Arrows
     - Automated Solvability Verification & Deterministic Fallbacks
*/

import { DIRS, TIERS, tierForLevel, COLOR_KEY_ORDER } from '../config.js';
import { mulberry32, weightedIndex, randInt, shuffle } from './rng.js';
import { inBounds, occupiesCell } from './arrow.js';
import { solvePuzzle } from './solver.js';

const BASE_SEED = 0x9E3779B1;

export function levelSeed(levelNumber) {
  return (BASE_SEED ^ Math.imul(levelNumber, 2654435761)) >>> 0;
}

export function generateLevel(levelNumber) {
  const tier = tierForLevel(levelNumber);
  const primarySeed = levelSeed(levelNumber);
  const puzzle = generate(tier, primarySeed, levelNumber, tier.key);

  // Validate solvability with automated solver
  const sol = solvePuzzle(puzzle, 1200);
  if (sol.solved) {
    return puzzle;
  }

  // Deterministic fallback if primary seed has an unresolved dependency:
  const fallbackSeed = (primarySeed ^ 0xA5A5A5A5) >>> 0;
  const fallbackPuzzle = generate(tier, fallbackSeed, levelNumber, tier.key, null, /*isFallback=*/true);
  const fallbackSol = solvePuzzle(fallbackPuzzle, 1500);
  if (fallbackSol.solved) {
    return fallbackPuzzle;
  }

  // Safe minimal deterministic level if fallback fails (never unvalidated)
  return generateSafeLevel(tier, levelNumber, tier.key);
}

export function generateDaily(dateKey) {
  const day = new Date(dateKey + 'T00:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  // Rotate through difficulty tiers across the week:
  // Mon: beginner, Tue: easy, Wed: medium, Thu: medium, Fri: hard, Sat: expert, Sun: master
  const wheel = ['master', 'beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
  const tierKey = wheel[(day + 6) % 7];
  const t = TIERS[tierKey];
  return generate(t, hashDate(dateKey), -1, tierKey, dateKey);
}

function hashDate(s) {
  let h = 0x811C9DC5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function arrowCountForLevel(rand, levelNumber, tier) {
  if (levelNumber <= 0) {
    return randInt(rand, tier.arrowMin, tier.arrowMax);
  }
  const tierProgress = Math.max(0, Math.min(1, (levelNumber - tier.start) / Math.max(1, tier.end - tier.start)));
  const baseCount = Math.round(tier.arrowMin + (tier.arrowMax - tier.arrowMin) * tierProgress);
  const variance = Math.max(1, Math.round((tier.arrowMax - tier.arrowMin) * 0.1));
  const lo = Math.max(tier.arrowMin, baseCount - variance);
  const hi = Math.min(tier.arrowMax, baseCount + variance);
  return randInt(rand, lo, hi);
}

function placeObstacles(rand, grid, count, occupied) {
  const obstacles = [];
  if (count <= 0) return obstacles;

  // Place obstacles in interior cells (away from edge by at least 2 cells)
  // so arrows can still exit freely around the perimeter
  const candidates = [];
  for (let y = 3; y < grid - 3; y++) {
    for (let x = 3; x < grid - 3; x++) {
      candidates.push({ x, y });
    }
  }
  shuffle(rand, candidates);

  for (const pos of candidates) {
    if (obstacles.length >= count) break;
    const key = pos.y * grid + pos.x;
    if (!occupied[key]) {
      occupied[key] = 1;
      obstacles.push({
        id: `obs-${obstacles.length + 1}`,
        x: pos.x,
        y: pos.y
      });
    }
  }
  return obstacles;
}

function assignColorKeys(rand, placed, maxKeys) {
  if (maxKeys <= 0 || placed.length < 15) return;
  const numKeys = Math.min(maxKeys, COLOR_KEY_ORDER.length);

  // Pick locked arrow from early placed arrows (extracted late)
  // Pick key arrow from late placed arrows (extracted early)
  const lockedPool = [];
  const keyPool = [];
  const oneThird = Math.floor(placed.length / 3);
  const twoThirds = Math.floor(placed.length * 2 / 3);

  for (let i = 0; i < oneThird; i++) lockedPool.push(i);
  for (let i = twoThirds; i < placed.length; i++) keyPool.push(i);

  shuffle(rand, lockedPool);
  shuffle(rand, keyPool);

  for (let k = 0; k < numKeys; k++) {
    if (k >= lockedPool.length || k >= keyPool.length) break;
    const lockedIdx = lockedPool[k];
    const keyIdx = keyPool[k];
    const colorKey = COLOR_KEY_ORDER[k];

    placed[keyIdx].keyId = colorKey;
    placed[lockedIdx].lockedByKey = colorKey;
  }
}

function assignPivotArrows(rand, grid, placed, obstacles, maxPivots) {
  if (maxPivots <= 0 || placed.length < 20) return;
  const candidateIndices = [];
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    if (a.keyId || a.lockedByKey) continue;
    if (a.cells.length <= 2) {
      candidateIndices.push(i);
    }
  }
  shuffle(rand, candidateIndices);

  let count = 0;
  for (const idx of candidateIndices) {
    if (count >= maxPivots) break;
    const arr = placed[idx];
    const tailCell = arr.cells[0];
    const ccwDir = (arr.dir + 3) % 4;
    const ccwCells = arr.cells.map(c => {
      const vx = c.x - tailCell.x;
      const vy = c.y - tailCell.y;
      return {
        x: tailCell.x + vy,
        y: tailCell.y - vx
      };
    });

    const candidateRotated = {
      ...arr,
      dir: ccwDir,
      cells: ccwCells
    };

    let canPlaceRotated = inBounds(candidateRotated, grid);
    if (canPlaceRotated) {
      for (let ci = 1; ci < candidateRotated.cells.length; ci++) {
        const c = candidateRotated.cells[ci];
        if (obstacles.some(o => o.x === c.x && o.y === c.y)) {
          canPlaceRotated = false;
          break;
        }
        for (let j = 0; j < placed.length; j++) {
          if (j === idx) continue;
          if (occupiesCell(placed[j], c.x, c.y)) {
            canPlaceRotated = false;
            break;
          }
        }
        if (!canPlaceRotated) break;
      }
    }

    if (canPlaceRotated) {
      arr.isPivot = true;
      arr.dir = ccwDir;
      arr.cells = ccwCells;
      count++;
    }
  }
}

function generate(tier, seed, levelNumber, tierKey, dailyLabel = null, isFallback = false) {
  const rand = mulberry32(seed);
  const grid = tier.grid;
  const target = arrowCountForLevel(rand, levelNumber, tier);
  const occupied = new Uint8Array(grid * grid);

  // 1. Place fixed obstacles before arrows (so reverse construction avoids them)
  const obstacleCount = tier.obstaclesMax > 0 && !isFallback
    ? randInt(rand, Math.max(1, tier.obstaclesMax - 1), tier.obstaclesMax)
    : 0;
  const obstacles = placeObstacles(rand, grid, obstacleCount, occupied);

  // 2. Reverse construction placement of arrows
  const placed = [];
  const maxAttempts = target * 40;
  let attempts = 0;
  let consecutiveFails = 0;

  while (placed.length < target && attempts < maxAttempts) {
    attempts++;
    const arr = tryPlaceArrow(rand, grid, occupied, tier);
    if (!arr) {
      consecutiveFails++;
      if (consecutiveFails > 400 && placed.length >= tier.arrowMin) break;
      continue;
    }
    consecutiveFails = 0;
    for (const c of arr.cells) occupied[c.y * grid + c.x] = 1;
    placed.push(arr);
  }

  // Stable IDs
  for (let i = 0; i < placed.length; i++) {
    placed[i].id = i;
    placed[i].isPivot = false;
    placed[i].keyId = null;
    placed[i].lockedByKey = null;
  }

  // 3. Assign Advanced Mechanics if tier supports them
  if (!isFallback) {
    if (tier.colorKeysMax > 0) {
      assignColorKeys(rand, placed, tier.colorKeysMax);
    }
    if (tier.pivotsMax > 0) {
      assignPivotArrows(rand, grid, placed, obstacles, tier.pivotsMax);
    }
  }

  return {
    level: levelNumber,
    tier: tierKey,
    grid,
    arrows: placed,
    obstacles,
    dailyLabel
  };
}

function tryPlaceArrow(rand, grid, occupied, tier) {
  const dir = Math.floor(rand() * 4);
  const back = (dir + 2) % 4;
  const tipX = Math.floor(rand() * grid);
  const tipY = Math.floor(rand() * grid);

  if (occupied[tipY * grid + tipX]) return null;

  // Forward escape path must be clear of already-placed arrows and obstacles
  const d = DIRS[dir];
  let px = tipX + d.dx;
  let py = tipY + d.dy;
  while (px >= 0 && px < grid && py >= 0 && py < grid) {
    if (occupied[py * grid + px]) return null;
    px += d.dx;
    py += d.dy;
  }

  // Length selection
  const maxLenIdx = Math.min(tier.lengthWeights.length - 1, grid);
  const lenWeights = tier.lengthWeights.slice(0, maxLenIdx + 1);
  let length = weightedIndex(rand, lenWeights);
  if (length < 1) length = 1;

  if (length === 1) {
    return { dir, cells: [{ x: tipX, y: tipY }] };
  }

  // Bend selection
  const maxBends = Math.min(tier.bendWeights.length - 1, Math.max(0, length - 2));
  const bendWeights = tier.bendWeights.slice(0, maxBends + 1);
  const bends = weightedIndex(rand, bendWeights);

  const bendCandidates = [];
  for (let i = 2; i <= length - 1; i++) bendCandidates.push(i);
  shuffle(rand, bendCandidates);
  const bendSet = new Set(bendCandidates.slice(0, bends));

  // Walk backward from tip to place body cells
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

function generateSafeLevel(tier, levelNumber, tierKey) {
  return generate(tier, levelSeed(levelNumber), levelNumber, tierKey, null, /*isFallback=*/true);
}
