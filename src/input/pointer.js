/* Pointer input: unified mouse + touch + pen via PointerEvents.
   - One pointer + small movement = tap (extract)
   - One pointer + large movement = pan
   - Two pointers = pinch zoom (and pan together)
   - Long-press (no movement, ~520ms) = hint
   - Wheel = zoom anchored at cursor

   This module owns very little state; it dispatches semantic events
   to the supplied callbacks. */

import { getCanvasCtx } from '../render/loop.js';
import { getGeom, screenToCell, panBy, zoomAt } from '../render/viewport.js';
import { arrowAt } from '../engine/rules.js';

const TAP_MAX_MOVE = 6;       // CSS pixels considered "no movement"
const LONG_PRESS_MS = 520;

export function attachPointer(canvas, getState, handlers) {
  /* handlers:
       onTap(arrow)             — clicked an arrow (or null)
       onHover(arrow|null)      — pointer moved over an arrow
       onLongPress()            — touch held still
       onPan()                  — view panned (request redraw)
       onZoom()                 — view zoomed (request redraw)
       onPointerActive(bool)    — set true while any pointer is down
  */
  const pointers = new Map(); // pointerId -> { x, y, startX, startY, startT, moved }
  let lastPinchDist = 0;
  let lastPanMid = null;
  let longPressTimer = 0;

  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
      startT: performance.now(), moved: false
    });
    handlers.onPointerActive?.(true);
    if (pointers.size === 1) {
      cancelLongPress();
      longPressTimer = window.setTimeout(() => {
        const p = pointers.get(e.pointerId);
        if (p && !p.moved) handlers.onLongPress?.();
      }, LONG_PRESS_MS);
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      lastPinchDist = dist(pts[0], pts[1]);
      lastPanMid = midpoint(pts[0], pts[1]);
      cancelLongPress();
    }
  });

  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      // hover-only (mouse not pressed) — update hovered arrow
      const a = pickArrow(canvas, getState(), e.clientX, e.clientY);
      handlers.onHover?.(a);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.abs(e.clientX - p.startX) > TAP_MAX_MOVE || Math.abs(e.clientY - p.startY) > TAP_MAX_MOVE) {
      if (!p.moved) cancelLongPress();
      p.moved = true;
    }
    if (pointers.size === 1) {
      if (p.moved) {
        panBy(getState(), dx, dy);
        handlers.onPan?.();
      }
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      const m = midpoint(pts[0], pts[1]);
      const state = getState();
      const rect = canvas.getBoundingClientRect();
      // Zoom
      if (lastPinchDist > 0) {
        const factor = d / lastPinchDist;
        zoomAt(state, m.x - rect.left, m.y - rect.top, factor, rect.width, rect.height);
      }
      // Pan with the midpoint
      if (lastPanMid) {
        panBy(state, m.x - lastPanMid.x, m.y - lastPanMid.y);
      }
      lastPinchDist = d;
      lastPanMid = m;
      handlers.onZoom?.();
    }
  });

  function release(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    cancelLongPress();
    if (pointers.size === 0) {
      handlers.onPointerActive?.(false);
      if (!p.moved) {
        const arrow = pickArrow(canvas, getState(), e.clientX, e.clientY);
        handlers.onTap?.(arrow);
      }
    } else if (pointers.size === 1) {
      lastPinchDist = 0;
      lastPanMid = null;
    }
  }

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomAt(getState(), e.clientX - rect.left, e.clientY - rect.top, factor, rect.width, rect.height);
    handlers.onZoom?.();
  }, { passive: false });

  // Context menu would interfere with right-click pan; keep it off.
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = 0;
    }
  }
}

function pickArrow(canvas, state, clientX, clientY) {
  if (!state) return null;
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const ctxState = getCanvasCtx();
  const geom = getGeom(state, ctxState.cssW, ctxState.cssH);
  const cell = screenToCell(sx, sy, geom);
  if (!cell) return null;
  return arrowAt(state.arrows, cell.x, cell.y);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
