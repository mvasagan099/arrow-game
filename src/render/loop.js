/* Render loop scheduler.
   Owns the canvas DPR sizing and ticks renderFrame() only when something
   has changed (state mutation, animation in flight, or hover).

   Exposes:
     setup(canvas)            -> resize-aware sizing
     markDirty()              -> request a single frame
     startLoop(getState,
               getAnimations,
               getUi)         -> begin rAF ticking */

import { renderFrame } from './canvas.js';
import { constrainView } from './viewport.js';
import { getActiveParticleCount } from './particles.js';

const ctxState = {
  canvas: null,
  ctx: null,
  dpr: 1,
  cssW: 0,
  cssH: 0,
  dirty: true,
  raf: 0,
  onResizeCallbacks: []
};

let _savedGetters = null;

export function setupCanvas(canvas) {
  ctxState.canvas = canvas;
  ctxState.ctx = canvas.getContext('2d');
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('orientationchange', resize);
  return ctxState;
}

function resize() {
  const c = ctxState.canvas;
  if (!c) return;
  const rect = c.getBoundingClientRect();
  ctxState.cssW = Math.max(1, rect.width);
  ctxState.cssH = Math.max(1, rect.height);
  ctxState.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  c.width = Math.round(ctxState.cssW * ctxState.dpr);
  c.height = Math.round(ctxState.cssH * ctxState.dpr);
  for (const fn of ctxState.onResizeCallbacks) fn(ctxState.cssW, ctxState.cssH);
  ctxState.dirty = true;
}

export function onResize(fn) {
  ctxState.onResizeCallbacks.push(fn);
}

export function markDirty() {
  ctxState.dirty = true;
}

export function getCanvasCtx() {
  return ctxState;
}

export function startLoop(getState, getAnimations, getUi) {
  if (ctxState.raf) return;
  _savedGetters = { getState, getAnimations, getUi };
  let lastTime = performance.now();

  function tick(currentTime) {
    try {
      const now = currentTime || performance.now();
      const dtMs = Math.min(100, Math.max(1, now - lastTime));
      lastTime = now;

      const state = getState();
      const animations = getAnimations();
      const ui = getUi();
      const hasParticles = getActiveParticleCount() > 0;
      const animating = animations.length > 0
        || (ui.hintExpiresAt && now < ui.hintExpiresAt)
        || hasParticles;

      if (state) constrainView(state, ctxState.cssW, ctxState.cssH);

      if (ctxState.dirty || animating) {
        renderFrame(ctxState.ctx, state, animations, ui, ctxState.dpr, ctxState.cssW, ctxState.cssH, dtMs);
        ctxState.dirty = animating || (getActiveParticleCount() > 0);
      }
    } catch (err) {
      console.error('[render]', err);
    }
    ctxState.raf = requestAnimationFrame(tick);
  }
  ctxState.raf = requestAnimationFrame(tick);
}

export function stopLoop() {
  if (ctxState.raf) {
    cancelAnimationFrame(ctxState.raf);
    ctxState.raf = 0;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else {
      markDirty();
      if (_savedGetters) {
        startLoop(_savedGetters.getState, _savedGetters.getAnimations, _savedGetters.getUi);
      }
    }
  });
}
