/* Hint: find an extractable arrow.

   Because every level is generated to be solvable, there's always at
   least one arrow with a clear path — unless something has gone wrong.
   This module just walks the current arrows list and returns the first
   one whose forward path is currently clear. */

import { tryExtract, canRotateArrow } from './rules.js';

export function findHint(state) {
  const obstacles = state.obstacles || [];
  // 1. First priority: any arrow with an open extraction path
  for (const a of state.arrows) {
    if (tryExtract(state.arrows, a, state.grid, obstacles).ok) return a;
  }
  // 2. Second priority: any pivot arrow that can rotate to open paths
  for (const a of state.arrows) {
    if (a.isPivot && canRotateArrow(a, state.grid, state.arrows, obstacles).ok) {
      return a;
    }
  }
  return null;
}
