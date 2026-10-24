/* Game rules: extraction validation and blocker detection.
   Pure functions over `arrows` lists. No mutation. */

import { DIRS } from '../config.js';
import { tip, occupiesCell, inBounds, getRotatedArrow } from './arrow.js';

/* Find the arrow that owns the cell at (x,y), or null. */
export function arrowAt(arrows, x, y) {
  for (const a of arrows) {
    if (occupiesCell(a, x, y)) return a;
  }
  return null;
}

/* Try to extract `arrow` given the current `arrows` list and optional `obstacles`.
   Returns { ok: true } if the path from its tip to the edge is clear and unlocked,
   or { ok: false, blocker, blockerCell, isObstacle, locked, keyId } otherwise. */
export function tryExtract(arrows, arrow, grid, obstacles = []) {
  // 1. Check if arrow is color-locked:
  if (arrow.lockedByKey) {
    const keyArrowExists = arrows.some(a => a.keyId === arrow.lockedByKey);
    if (keyArrowExists) {
      return {
        ok: false,
        locked: true,
        keyId: arrow.lockedByKey,
        reason: 'locked'
      };
    }
  }

  // 2. Cast ray from tip to grid edge in arrow.dir
  const t = tip(arrow);
  const d = DIRS[arrow.dir];
  let x = t.x + d.dx;
  let y = t.y + d.dy;

  while (x >= 0 && x < grid && y >= 0 && y < grid) {
    // Check fixed obstacles:
    if (obstacles && obstacles.length > 0) {
      for (const obs of obstacles) {
        if (obs.x === x && obs.y === y) {
          return {
            ok: false,
            blocker: obs,
            blockerCell: { x, y },
            isObstacle: true
          };
        }
      }
    }

    // Check other arrows:
    for (const other of arrows) {
      if (other.id === arrow.id) continue;
      if (occupiesCell(other, x, y)) {
        return {
          ok: false,
          blocker: other,
          blockerCell: { x, y },
          isObstacle: false
        };
      }
    }

    x += d.dx;
    y += d.dy;
  }

  return { ok: true };
}

/**
 * Checks if a pivot arrow can rotate 90 degrees clockwise around its tail.
 */
export function canRotateArrow(arrow, grid, arrows, obstacles = []) {
  if (!arrow.isPivot) return { ok: false, reason: 'not_pivot' };
  const rotated = getRotatedArrow(arrow);
  if (!inBounds(rotated, grid)) {
    return { ok: false, reason: 'out_of_bounds' };
  }

  // Check collision for rotated body/tip cells (tail cells[0] stays stationary)
  for (let i = 1; i < rotated.cells.length; i++) {
    const c = rotated.cells[i];
    if (obstacles && obstacles.some(obs => obs.x === c.x && obs.y === c.y)) {
      return { ok: false, blockerCell: c, isObstacle: true };
    }
    for (const other of arrows) {
      if (other.id === arrow.id) continue;
      if (occupiesCell(other, c.x, c.y)) {
        return { ok: false, blockerCell: c, blocker: other };
      }
    }
  }

  return { ok: true, rotated };
}

/* True iff every arrow on the board has a clear escape path. */
export function isFullyExtractable(arrows, grid, obstacles = []) {
  for (const a of arrows) {
    if (!tryExtract(arrows, a, grid, obstacles).ok) return false;
  }
  return true;
}
