/* Zero-allocation pooled particle system for Arrow Escape.
   Pre-allocates a fixed pool of particle objects so runtime animations
   never trigger garbage collection pauses or allocations.
   All coordinates are in CSS pixels (matching Canvas 2D render pass). */

import { DIRS } from '../config.js';

export const POOL_SIZE = 140;

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.color = '#ffffff';
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 300;
  }

  init(x, y, vx, vy, size, color, maxLife) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = maxLife;
  }
}

const pool = new Array(POOL_SIZE);
for (let i = 0; i < POOL_SIZE; i++) {
  pool[i] = new Particle();
}

function getAvailableParticle() {
  for (let i = 0; i < POOL_SIZE; i++) {
    if (!pool[i].active) return pool[i];
  }
  return null;
}

/**
 * Emit particles when an arrow extracts successfully.
 * Emits a stream of subtle particles trailing in the exit direction.
 */
export function emitExtractParticles(tipX, tipY, dirIndex, color) {
  const d = DIRS[dirIndex];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = getAvailableParticle();
    if (!p) break;
    // Spread along perpendicular direction
    const perpX = -d.dy;
    const perpY = d.dx;
    const offset = (Math.random() - 0.5) * 14;
    const x = tipX + perpX * offset;
    const y = tipY + perpY * offset;

    const speed = 25 + Math.random() * 55;
    const vx = d.dx * speed + (Math.random() - 0.5) * 15;
    const vy = d.dy * speed + (Math.random() - 0.5) * 15;
    const size = 2 + Math.random() * 2.5;
    const maxLife = 320 + Math.random() * 200;

    p.init(x, y, vx, vy, size, color, maxLife);
  }
}

/**
 * Emit collision impact sparks when an arrow hits a blocker.
 */
export function emitBlockParticles(cx, cy, color) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const p = getAvailableParticle();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 2 + Math.random() * 2;
    const maxLife = 260 + Math.random() * 180;

    p.init(cx, cy, vx, vy, size, color, maxLife);
  }
}

/**
 * Emit celebratory confetti / burst particles when a level is solved.
 */
export function emitWinParticles(boardCenterX, boardCenterY, radius, colors) {
  const count = 45;
  for (let i = 0; i < count; i++) {
    const p = getAvailableParticle();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.4;
    const x = boardCenterX + Math.cos(angle) * dist;
    const y = boardCenterY + Math.sin(angle) * dist;

    const speed = 40 + Math.random() * 110;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 20; // slight upward bias
    const size = 3 + Math.random() * 3.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const maxLife = 550 + Math.random() * 400;

    p.init(x, y, vx, vy, size, color, maxLife);
  }
}

/**
 * Update and draw all active particles.
 * Returns true if any particles are still alive (for rAF dirty-flag loop).
 */
export function updateAndDrawParticles(ctx, dtMs) {
  const dtSec = Math.min(0.05, dtMs / 1000);
  let activeCount = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.life += dtMs;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }

    activeCount++;
    // Physics
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.96; // drag
    p.vy *= 0.96;

    const progress = p.life / p.maxLife;
    p.alpha = Math.max(0, 1 - progress);
    const radius = Math.max(0.5, p.size * (1 - progress * 0.4));

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return activeCount > 0;
}

/**
 * Update particle simulation for dtMs without requiring canvas ctx (useful for headless / tests).
 * Returns count of remaining active particles.
 */
export function updateParticles(dtMs) {
  const dtSec = Math.min(0.05, dtMs / 1000);
  let activeCount = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.life += dtMs;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }

    activeCount++;
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }

  return activeCount;
}

export const emitTrail = emitExtractParticles;
export const emitBlockSparks = emitBlockParticles;
export function emitWinBurst(cx, cy, color) {
  emitWinParticles(cx, cy, 120, Array.isArray(color) ? color : [color]);
}

/**
 * Clear all particles (e.g. on level change or restart).
 */
export function clearAllParticles() {
  for (let i = 0; i < POOL_SIZE; i++) {
    pool[i].active = false;
  }
}
export const clearParticles = clearAllParticles;

export function getActiveParticleCount() {
  let count = 0;
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool[i].active) count++;
  }
  return count;
}
