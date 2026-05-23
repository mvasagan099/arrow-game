/* Hint: find an extractable arrow.

   Because every level is generated to be solvable, there's always at
   least one arrow with a clear path — unless something has gone wrong.
   This module just walks the current arrows list and returns the first
   one whose forward path is currently clear. */

import { tryExtract } from './rules.js';

export function findHint(state) {
  for (const a of state.arrows) {
    if (tryExtract(state.arrows, a, state.grid).ok) return a;
  }
  return null;
}
