/* Animations.
   The list itself lives in main.js; this module owns the shape of each
   entry and the drawing of effects. Entries are pruned (by main) when
   their elapsed time exceeds `dur`.

   Kinds:
     extract  { kind, arrowId, arrow, dir, t0, dur }      — slide off
     block    { kind, blockerId, t0, dur }                — red pulse on blocker
     wiggle   { kind, arrowId, vec, t0, dur }             — bumped-arrow nudge
     win      { kind, t0, dur }                            — board flourish */

import { EXTRACT_FLY_MS, BLOCK_FLASH_MS } from '../config.js';
import { DIRS } from '../config.js';
import { drawTipTriangle } from './canvas.js';
import { cellCenter } from './viewport.js';

let _reduceMotion = false;
export function setReduceMotion(v) { _reduceMotion = !!v; }
export function reduceMotion() { return _reduceMotion; }

export function makeExtract(arrow) {
  // Longer/bent arrows need a touch more time so the snake unfurls
  // smoothly rather than blinking off the board. The 1.5x multiplier
  // makes the whole motion 50% slower than the original timing.
  const base = EXTRACT_FLY_MS;
  const extra = Math.min(260, arrow.cells.length * 22);
  const dur = (base + extra) * 5.0;
  return {
    kind: 'extract',
    arrowId: arrow.id,
    arrow,
    dir: arrow.dir,
    t0: performance.now(),
    dur: _reduceMotion ? 1 : dur
  };
}

export function makeBlock(blockerId) {
  return {
    kind: 'block',
    blockerId,
    t0: performance.now(),
    dur: _reduceMotion ? 1 : BLOCK_FLASH_MS
  };
}

export function makeWiggle(arrowId, dirIndex) {
  const d = DIRS[dirIndex];
  return {
    kind: 'wiggle',
    arrowId,
    vec: { x: d.dx, y: d.dy },
    t0: performance.now(),
    dur: _reduceMotion ? 1 : 360
  };
}

export function makeWin() {
  return { kind: 'win', t0: performance.now(), dur: _reduceMotion ? 1 : 700 };
}

/* Called by canvas renderer each frame to paint active effects. */
export function drawAnimations(ctx, geom, state, animations, palette) {
  for (const a of animations) {
    if (a.kind === 'extract') drawExtract(ctx, geom, a, palette);
    if (a.kind === 'block') drawBlockerCells(ctx, geom, a, state, palette);
    if (a.kind === 'win') drawWinFlourish(ctx, geom, a, palette);
  }
}

function easeOutCubic(t) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/* Snake-extraction.

   The arrow doesn't slide off as a rigid bent shape — instead each cell
   follows the cell ahead of it along the arrow's own chain, so a bend
   "straightens out" only when that part of the body passes through it.

   We treat the chain as a 1D path parameterized in CELL units:
     - position k = 0      -> tail cell center
     - position k = N-1    -> tip cell center
     - position k > N-1    -> straight extension past the tip in `dir`
   The cell originally at index i moves to path position (i + p), where
   p grows from 0 to (N-1 + escape) over the animation. */
function drawExtract(ctx, geom, a, palette) {
  const t = Math.min(1, (performance.now() - a.t0) / a.dur);
  const eased = easeOutCubic(t);
  const arrow = a.arrow;
  const cells = arrow.cells;
  const N = cells.length;
  const d = DIRS[arrow.dir];

  // Generous escape so even a 40-cell-wide board lets the snake fully exit.
  const escape = geom.grid * 0.9 + 2;
  const p = eased * (N - 1 + escape);

  const tipCenter = cellCenter(cells[N - 1].x, cells[N - 1].y, geom);

  function pathAt(k) {
    if (k <= 0) return cellCenter(cells[0].x, cells[0].y, geom);
    if (k >= N - 1) {
      const extra = k - (N - 1);
      return {
        x: tipCenter.x + d.dx * extra * geom.cellPx,
        y: tipCenter.y + d.dy * extra * geom.cellPx
      };
    }
    const floor = Math.floor(k);
    const frac = k - floor;
    const a0 = cellCenter(cells[floor].x, cells[floor].y, geom);
    const b0 = cellCenter(cells[floor + 1].x, cells[floor + 1].y, geom);
    return {
      x: a0.x + (b0.x - a0.x) * frac,
      y: a0.y + (b0.y - a0.y) * frac
    };
  }

  const tailK = 0 + p;
  const tipK = (N - 1) + p;
  const start = pathAt(tailK);
  const end = pathAt(tipK);

  // Waypoints: every original-chain vertex between the tail's current
  // position and the tip's current position is a real corner the snake
  // must go through.
  const waypoints = [];
  for (let k = Math.floor(tailK) + 1; k < tipK; k++) {
    if (k < N) {
      const c = cells[k];
      waypoints.push(cellCenter(c.x, c.y, geom));
    } else {
      const extra = k - (N - 1);
      waypoints.push({
        x: tipCenter.x + d.dx * extra * geom.cellPx,
        y: tipCenter.y + d.dy * extra * geom.cellPx
      });
    }
  }

  // Fade out only in the last third so the snake stays solid while
  // it's still on the visible part of the board.
  const fadeStart = 0.7;
  const alpha = t < fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.ink;
  ctx.lineWidth = Math.max(1.5, geom.cellPx * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stop the shaft a hair short of the tip so the triangle reads cleanly.
  const shaftEnd = {
    x: end.x + d.dx * geom.cellPx * 0.05,
    y: end.y + d.dy * geom.cellPx * 0.05
  };

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (const wp of waypoints) ctx.lineTo(wp.x, wp.y);
  ctx.lineTo(shaftEnd.x, shaftEnd.y);
  ctx.stroke();

  drawTipTriangle(ctx, end.x, end.y, d, geom.cellPx, palette.ink);

  ctx.restore();
}

function drawBlockerCells(ctx, geom, a, state, palette) {
  const arrow = state.arrows.find(x => x.id === a.blockerId);
  if (!arrow) return;
  const t = Math.min(1, (performance.now() - a.t0) / a.dur);
  const pulse = 1 - t;
  ctx.save();
  ctx.strokeStyle = palette.danger;
  ctx.fillStyle = palette.danger;
  ctx.globalAlpha = 0.18 + 0.32 * pulse;
  for (const c of arrow.cells) {
    const cc = cellCenter(c.x, c.y, geom);
    const r = geom.cellPx * 0.46;
    ctx.beginPath();
    ctx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWinFlourish(ctx, geom, a, palette) {
  const t = Math.min(1, (performance.now() - a.t0) / a.dur);
  const eased = easeOutCubic(t);
  ctx.save();
  ctx.strokeStyle = palette.good;
  ctx.lineWidth = 2;
  ctx.globalAlpha = (1 - eased) * 0.7;
  const cx = geom.left + geom.boardPx / 2;
  const cy = geom.top + geom.boardPx / 2;
  const r = geom.boardPx * (0.05 + eased * 0.45);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
