/* Arrow geometry helpers.

   Arrow shape:
     { id, dir: 0..3, cells: [{x,y}, ...] }
     • cells[0]              — tail
     • cells[cells.length-1] — tip (exits the board in `dir`)
     • cells are orthogonal neighbors; bends are 90 degrees. */

import { DIRS } from '../config.js';

export function tip(a) { return a.cells[a.cells.length - 1]; }
export function tail(a) { return a.cells[0]; }

export function occupiesCell(a, x, y) {
  for (let i = 0; i < a.cells.length; i++) {
    const c = a.cells[i];
    if (c.x === x && c.y === y) return true;
  }
  return false;
}

export function inBounds(a, grid) {
  for (let i = 0; i < a.cells.length; i++) {
    const c = a.cells[i];
    if (c.x < 0 || c.x >= grid || c.y < 0 || c.y >= grid) return false;
  }
  return true;
}

export function cloneArrow(a) {
  return {
    id: a.id,
    dir: a.dir,
    cells: a.cells.map(c => ({ x: c.x, y: c.y })),
    isPivot: a.isPivot === true,
    keyId: a.keyId || null,
    lockedByKey: a.lockedByKey || null
  };
}

/**
 * Returns a new arrow rotated 90 degrees clockwise around its tail cell (cells[0]).
 */
export function getRotatedArrow(a) {
  const tailCell = a.cells[0];
  const newDir = (a.dir + 1) % 4;
  const newCells = a.cells.map(c => {
    const vx = c.x - tailCell.x;
    const vy = c.y - tailCell.y;
    return {
      x: tailCell.x - vy,
      y: tailCell.y + vx
    };
  });
  return {
    ...cloneArrow(a),
    dir: newDir,
    cells: newCells
  };
}

/* Cells in front of `a`'s tip, walking in `a.dir`, until we leave the board.
   Does NOT include the tip itself. The arrow can only escape if every cell
   in this list is unoccupied by any other arrow. */
export function pathFromTip(a, grid) {
  const t = tip(a);
  const d = DIRS[a.dir];
  const out = [];
  let x = t.x + d.dx;
  let y = t.y + d.dy;
  while (x >= 0 && x < grid && y >= 0 && y < grid) {
    out.push({ x, y });
    x += d.dx;
    y += d.dy;
  }
  return out;
}

/* Map of {x,y} -> arrow for fast collision lookup. */
export function buildOccupancy(arrows, grid) {
  const occ = new Array(grid * grid);
  for (const a of arrows) {
    for (const c of a.cells) {
      occ[c.y * grid + c.x] = a;
    }
  }
  return occ;
}

export function arrowAtCell(arrows, x, y) {
  for (const a of arrows) {
    if (occupiesCell(a, x, y)) return a;
  }
  return null;
}

/* Bounding box of an arrow (inclusive). */
export function bbox(a) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of a.cells) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  return { minX, maxX, minY, maxY };
}
