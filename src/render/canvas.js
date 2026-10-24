/* Canvas renderer.
   Draws the grid dots, the arrow shafts, the triangular tips, the hint
   glow, the hover ring, and delegates animated effects to the animation
   layer. Stateless beyond a few cached colors. */

import { DIRS, THEMES, DEFAULT_THEME } from '../config.js';
import { getGeom, cellCenter } from './viewport.js';
import { drawAnimations } from './animations.js';
import { updateAndDrawParticles } from './particles.js';

/* Reads theme configuration and custom properties.
   Cached for high performance; invalidated on theme change. */
let currentThemeKey = DEFAULT_THEME;
let cachedPalette = null;

export function invalidatePalette(newThemeKey = null) {
  if (newThemeKey && THEMES[newThemeKey]) {
    currentThemeKey = newThemeKey;
  }
  cachedPalette = null;
}

export function getCurrentThemeKey() {
  return currentThemeKey;
}

export function readPalette() {
  if (cachedPalette) return cachedPalette;
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.dataset.theme;
    if (attr && THEMES[attr]) {
      currentThemeKey = attr;
    } else if (document.documentElement.classList.contains('dark')) {
      currentThemeKey = 'dark';
    }
  }
  const theme = THEMES[currentThemeKey] || THEMES.classic;
  cachedPalette = { ...theme.palette };
  return cachedPalette;
}

/* Public: render the whole frame. Called by the loop. */
export function renderFrame(ctx, state, animations, ui, dpr, cssW, cssH, dtMs = 16.6) {
  const palette = readPalette();
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const geom = getGeom(state, cssW, cssH);

  drawGrid(ctx, geom, palette);
  drawArrows(ctx, geom, state, animations, ui, palette);
  drawAnimations(ctx, geom, state, animations, palette);
  drawHoverRing(ctx, geom, state, ui, palette);
  drawHintGlow(ctx, geom, state, ui, palette);

  // Particles layer on top
  updateAndDrawParticles(ctx, dtMs);

  ctx.restore();
}

/* ----- Grid backdrop: subtle dots at every cell intersection. ----- */
function drawGrid(ctx, geom, palette) {
  const { left, top, cellPx, grid } = geom;
  const r = Math.max(0.6, cellPx * 0.05);
  ctx.fillStyle = palette.line;
  // Draw dots at every cell center
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const cx = left + (x + 0.5) * cellPx;
      const cy = top + (y + 0.5) * cellPx;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle inset border around the playable area.
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(left - 0.5, top - 0.5, cellPx * grid + 1, cellPx * grid + 1);
}

/* ----- Arrows: shaft from tail toward tip, then triangular head. ----- */
function drawArrows(ctx, geom, state, animations, ui, palette) {
  const flyingIds = new Set(animations.filter(a => a.kind === 'extract').map(a => a.arrowId));
  const blockIds = new Set();
  const wiggleIds = new Set();
  for (const a of animations) {
    if (a.kind === 'block') blockIds.add(a.blockerId);
    if (a.kind === 'wiggle') wiggleIds.add(a.arrowId);
  }
  for (const arrow of state.arrows) {
    if (flyingIds.has(arrow.id)) continue; // drawn by the animation pass
    const blockT = getBlockFlashT(animations, arrow.id);
    const wiggle = getWiggleOffset(animations, arrow.id, geom.cellPx);
    drawArrow(ctx, geom, arrow, palette, blockT, wiggle);
  }
}

function getBlockFlashT(animations, arrowId) {
  for (const a of animations) {
    if (a.kind === 'block' && a.blockerId === arrowId) {
      const t = (performance.now() - a.t0) / a.dur;
      return Math.max(0, Math.min(1, t));
    }
  }
  return -1;
}

function getWiggleOffset(animations, arrowId, cellPx) {
  for (const a of animations) {
    if (a.kind === 'wiggle' && a.arrowId === arrowId) {
      const t = (performance.now() - a.t0) / a.dur;
      if (t >= 1) return null;
      const amp = cellPx * 0.12 * (1 - t);
      const phase = Math.sin(t * Math.PI * 6);
      return { dx: a.vec.x * amp * phase, dy: a.vec.y * amp * phase };
    }
  }
  return null;
}

/* Internal: draw a single arrow with the given color modifiers. */
export function drawArrow(ctx, geom, arrow, palette, blockT = -1, wiggle = null, alpha = 1, offset = null) {
  const { cellPx } = geom;
  const cells = arrow.cells;
  const dir = DIRS[arrow.dir];

  const shaftColor = blockT >= 0
    ? mixColor(palette.ink, palette.danger, 0.4 + 0.5 * (1 - Math.abs(0.5 - blockT) * 2))
    : palette.ink;

  ctx.save();
  ctx.globalAlpha = alpha;

  const ox = (wiggle ? wiggle.dx : 0) + (offset ? offset.x : 0);
  const oy = (wiggle ? wiggle.dy : 0) + (offset ? offset.y : 0);

  // Stroke the shaft from tail center to tip center, stopping a bit short
  // so the triangle head reads as a separate piece.
  const lineW = Math.max(1.5, cellPx * 0.22);
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = shaftColor;
  ctx.fillStyle = shaftColor;

  ctx.beginPath();
  const tip = cells[cells.length - 1];
  const tipCenter = cellCenter(tip.x, tip.y, geom);
  // Shaft ends a short distance before the tip's leading edge
  // so the triangle has visual space.
  const shaftEnd = {
    x: tipCenter.x + ox + dir.dx * cellPx * 0.05,
    y: tipCenter.y + oy + dir.dy * cellPx * 0.05
  };

  if (cells.length === 1) {
    // Single-cell arrow: no shaft, just a small stub centered behind the tip.
    const back = {
      x: tipCenter.x + ox - dir.dx * cellPx * 0.18,
      y: tipCenter.y + oy - dir.dy * cellPx * 0.18
    };
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(shaftEnd.x, shaftEnd.y);
  } else {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const center = cellCenter(c.x, c.y, geom);
      let px = center.x + ox;
      let py = center.y + oy;
      // For the tip cell, stop short of its full center to make space for the triangle.
      if (i === cells.length - 1) {
        px = shaftEnd.x;
        py = shaftEnd.y;
      }
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // Triangle head — apex out, base across the tip cell.
  drawTipTriangle(ctx, tipCenter.x + ox, tipCenter.y + oy, dir, cellPx, shaftColor);

  ctx.restore();
}

export function drawTipTriangle(ctx, cx, cy, dir, cellPx, color) {
  const apex = {
    x: cx + dir.dx * cellPx * 0.46,
    y: cy + dir.dy * cellPx * 0.46
  };
  // base is a bit behind the apex (closer to the shaft).
  const baseCenter = {
    x: cx + dir.dx * cellPx * 0.06,
    y: cy + dir.dy * cellPx * 0.06
  };
  // Perpendicular vector to dir (CSS coords).
  const px = -dir.dy;
  const py = dir.dx;
  const half = cellPx * 0.22;
  const p1 = { x: baseCenter.x + px * half, y: baseCenter.y + py * half };
  const p2 = { x: baseCenter.x - px * half, y: baseCenter.y - py * half };

  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, cellPx * 0.04);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/* ----- Hover ring: subtle highlight under the arrow the pointer is on. ----- */
function drawHoverRing(ctx, geom, state, ui, palette) {
  if (!ui.hoveredArrowId && ui.hoveredArrowId !== 0) return;
  const arrow = state.arrows.find(a => a.id === ui.hoveredArrowId);
  if (!arrow) return;
  ctx.save();
  ctx.strokeStyle = palette.faint;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  for (const c of arrow.cells) {
    const r = geom.cellPx * 0.46;
    const cc = cellCenter(c.x, c.y, geom);
    ctx.beginPath();
    ctx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ----- Hint glow: pulsing ring on the suggested arrow. ----- */
function drawHintGlow(ctx, geom, state, ui, palette) {
  if (!ui.hintArrowId && ui.hintArrowId !== 0) return;
  if (ui.hintExpiresAt && performance.now() > ui.hintExpiresAt) return;
  const arrow = state.arrows.find(a => a.id === ui.hintArrowId);
  if (!arrow) return;

  const t = ((performance.now() - (ui.hintStartedAt || 0)) % 1200) / 1200;
  const pulse = 0.45 + 0.35 * Math.sin(t * Math.PI * 2);

  ctx.save();
  ctx.strokeStyle = palette.hint;
  ctx.lineWidth = Math.max(2, geom.cellPx * 0.08);
  ctx.globalAlpha = pulse;
  for (const c of arrow.cells) {
    const cc = cellCenter(c.x, c.y, geom);
    const r = geom.cellPx * 0.55;
    ctx.beginPath();
    ctx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* Tiny hex color mix. */
function mixColor(a, b, t) {
  const ac = parseColor(a);
  const bc = parseColor(b);
  if (!ac || !bc) return a;
  const r = Math.round(ac.r + (bc.r - ac.r) * t);
  const g = Math.round(ac.g + (bc.g - ac.g) * t);
  const bl = Math.round(ac.b + (bc.b - ac.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseColor(c) {
  c = c.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    if (hex.length !== 6) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  const m = c.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}
