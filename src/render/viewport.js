/* Viewport math: turn (cell <-> screen) coordinates and apply pan/zoom.
   All measurements in CSS pixels (the canvas DPR is handled elsewhere). */

import { VIEW_MIN, VIEW_MAX } from '../config.js';

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/* baseCellPx: the cell size in CSS pixels when scale === 1.
   We fit `grid` cells plus a 1-cell margin into the canvas's shorter side. */
export function baseCellSize(canvasW, canvasH, grid) {
  return Math.min(canvasW, canvasH) / (grid + 1);
}

/* Returns a derived layout object the rest of the renderer can use. */
export function getGeom(state, canvasW, canvasH) {
  const grid = state.grid;
  const base = baseCellSize(canvasW, canvasH, grid);
  const cellPx = base * state.view.scale;
  const boardPx = cellPx * grid;
  const left = (canvasW - boardPx) / 2 + state.view.offsetX;
  const top = (canvasH - boardPx) / 2 + state.view.offsetY;
  return { base, cellPx, boardPx, grid, left, top, canvasW, canvasH };
}

/* Screen (CSS px) → board cell coords, or null if off-board. */
export function screenToCell(sx, sy, geom) {
  const cx = Math.floor((sx - geom.left) / geom.cellPx);
  const cy = Math.floor((sy - geom.top) / geom.cellPx);
  if (cx < 0 || cy < 0 || cx >= geom.grid || cy >= geom.grid) return null;
  return { x: cx, y: cy };
}

/* Center of cell (cx, cy) in screen coords. */
export function cellCenter(cx, cy, geom) {
  return {
    x: geom.left + cx * geom.cellPx + geom.cellPx / 2,
    y: geom.top + cy * geom.cellPx + geom.cellPx / 2
  };
}

/* Centered fit — reset pan and scale. */
export function resetView(state) {
  state.view.scale = 1;
  state.view.offsetX = 0;
  state.view.offsetY = 0;
}

/* Pan by (dx, dy) in CSS pixels. */
export function panBy(state, dx, dy) {
  state.view.offsetX += dx;
  state.view.offsetY += dy;
}

/* Set zoom centered around an anchor in CSS pixels. */
export function zoomAt(state, anchorX, anchorY, factor, canvasW, canvasH) {
  const oldScale = state.view.scale;
  const newScale = clamp(oldScale * factor, VIEW_MIN, VIEW_MAX);
  if (newScale === oldScale) return;
  const base = baseCellSize(canvasW, canvasH, state.grid);

  // Continuous cell coords under the anchor at the OLD scale.
  const oldCellPx = base * oldScale;
  const oldLeft = (canvasW - oldCellPx * state.grid) / 2 + state.view.offsetX;
  const oldTop = (canvasH - oldCellPx * state.grid) / 2 + state.view.offsetY;
  const cx = (anchorX - oldLeft) / oldCellPx;
  const cy = (anchorY - oldTop) / oldCellPx;

  state.view.scale = newScale;
  const newCellPx = base * newScale;
  const newLeft = anchorX - cx * newCellPx;
  const newTop = anchorY - cy * newCellPx;
  state.view.offsetX = newLeft - (canvasW - newCellPx * state.grid) / 2;
  state.view.offsetY = newTop - (canvasH - newCellPx * state.grid) / 2;
}

/* After a resize or any change, gently keep the board within the visible
   area. Allows the user to "lose" the board only a little before snapping
   back. */
export function constrainView(state, canvasW, canvasH) {
  const base = baseCellSize(canvasW, canvasH, state.grid);
  const cellPx = base * state.view.scale;
  const boardPx = cellPx * state.grid;
  const halfBoard = boardPx / 2;
  // Allow board center to roam by at most this many CSS pixels.
  const slackX = Math.max(canvasW / 2, halfBoard);
  const slackY = Math.max(canvasH / 2, halfBoard);
  state.view.offsetX = clamp(state.view.offsetX, -slackX, slackX);
  state.view.offsetY = clamp(state.view.offsetY, -slackY, slackY);
}
