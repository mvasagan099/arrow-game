/* Ambient background animation for the Home Screen.
   Draws subtle drifting ghost arrows matching the active theme palette.
   Stops completely when the game screen is active to preserve 60 FPS and battery life. */

import { readPalette } from '../render/canvas.js';
import { DIRS } from '../config.js';

let canvas = null;
let ctx = null;
let rafId = 0;
let running = false;
let arrows = [];
let lastT = 0;
let reduceMotion = false;

export function setHomeBgReduceMotion(val) {
  reduceMotion = !!val;
}

export function initHomeBg(bgCanvas) {
  canvas = bgCanvas;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  spawnArrows();
}

function resize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}

function spawnArrows() {
  arrows = [];
  const count = 10;
  const w = canvas ? canvas.clientWidth : 400;
  const h = canvas ? canvas.clientHeight : 800;

  for (let i = 0; i < count; i++) {
    const dir = Math.floor(Math.random() * 4);
    const d = DIRS[dir];
    const speed = 12 + Math.random() * 22; // px per sec
    arrows.push({
      x: Math.random() * w,
      y: Math.random() * h,
      dir,
      vx: d.dx * speed,
      vy: d.dy * speed,
      length: 2 + Math.floor(Math.random() * 3),
      size: 16 + Math.random() * 12,
      opacity: 0.08 + Math.random() * 0.12
    });
  }
}

export function startHomeBg() {
  if (running) return;
  running = true;
  lastT = performance.now();
  resize();
  tick();
}

export function stopHomeBg() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function tick() {
  if (!running || !canvas || !ctx) return;
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const palette = readPalette();

  for (const a of arrows) {
    if (!reduceMotion) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Wrap around screen
      const margin = 80;
      if (a.x < -margin) a.x = w + margin;
      if (a.x > w + margin) a.x = -margin;
      if (a.y < -margin) a.y = h + margin;
      if (a.y > h + margin) a.y = -margin;
    }

    drawGhostArrow(ctx, a, palette);
  }

  ctx.restore();

  if (!reduceMotion) {
    rafId = requestAnimationFrame(tick);
  }
}

function drawGhostArrow(ctx, a, palette) {
  const d = DIRS[a.dir];
  const tailX = a.x - d.dx * a.size * a.length;
  const tailY = a.y - d.dy * a.size * a.length;

  ctx.save();
  ctx.globalAlpha = a.opacity;
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.ink;
  ctx.lineWidth = Math.max(2, a.size * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(a.x, a.y);
  ctx.stroke();

  // Tip triangle
  const apex = { x: a.x + d.dx * a.size * 0.45, y: a.y + d.dy * a.size * 0.45 };
  const baseCenter = { x: a.x + d.dx * a.size * 0.05, y: a.y + d.dy * a.size * 0.05 };
  const px = -d.dy;
  const py = d.dx;
  const half = a.size * 0.28;

  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.lineTo(baseCenter.x + px * half, baseCenter.y + py * half);
  ctx.lineTo(baseCenter.x - px * half, baseCenter.y - py * half);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
