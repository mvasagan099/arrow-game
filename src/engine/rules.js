/* Game rules: extraction validation and blocker detection.
   Pure functions over `arrows` lists. No mutation. */

import { DIRS } from '../config.js';
import { tip, occupiesCell } from './arrow.js';

/* Find the arrow that owns the cell at (x,y), or null. */
export function arrowAt(arrows, x, y) {
  for (const a of arrows) {
    if (occupiesCell(a, x, y)) return a;
  }
  return null;
}

/* Try to extract `arrow` given the current `arrows` list.
   Returns { ok: true } if the path from its tip to the edge is clear,
   or { ok: false, blocker: <arrow>, blockerCell: {x,y} } otherwise. */
export function tryExtract(arrows, arrow, grid) {
  const t = tip(arrow);
  const d = DIRS[arrow.dir];
  let x = t.x + d.dx;
  let y = t.y + d.dy;
  while (x >= 0 && x < grid && y >= 0 && y < grid) {
    for (const other of arrows) {
      if (other.id === arrow.id) continue;
      if (occupiesCell(other, x, y)) {
        return { ok: false, blocker: other, blockerCell: { x, y } };
      }
    }
    x += d.dx;
    y += d.dy;
  }
  return { ok: true };
}

/* True iff every arrow on the board has a clear escape path. */
export function isFullyExtractable(arrows, grid) {
  for (const a of arrows) {
    if (!tryExtract(arrows, a, grid).ok) return false;
  }
  return true;
}
