/* Automated Puzzle Solver for Arrow Escape.
   Verifies full solvability of puzzles containing:
     - Pure arrows
     - Fixed obstacles
     - Color-keyed locked arrows
     - Rotating pivot arrows
   Uses prioritized greedy search with memoized state exploration for pivot rotations. */

import { cloneArrow } from './arrow.js';
import { tryExtract, canRotateArrow } from './rules.js';

function stateKey(arrows) {
  // Hash by arrow IDs and their current directions
  return arrows.map(a => `${a.id}:${a.dir}`).sort().join('|');
}

/**
 * Solves a puzzle deterministically.
 * Returns: { solved: boolean, steps: number, sequence: Array<{type, arrowId}> }
 */
export function solvePuzzle(puzzle, maxExplorationStates = 1500) {
  const grid = puzzle.grid;
  const obstacles = (puzzle.obstacles || []).map(o => ({ ...o }));

  // Initial state
  let currentArrows = puzzle.arrows.map(cloneArrow);
  const sequence = [];

  const visited = new Set();
  const queue = [{ arrows: currentArrows, seq: [] }];
  visited.add(stateKey(currentArrows));

  let statesExplored = 0;

  while (queue.length > 0 && statesExplored < maxExplorationStates) {
    statesExplored++;
    const { arrows, seq } = queue.shift();

    if (arrows.length === 0) {
      return {
        solved: true,
        steps: seq.length,
        sequence: seq,
        statesExplored
      };
    }

    // 1. Fast Greedy Extraction: Extract as many arrows as possible
    let greedyArrows = arrows.map(cloneArrow);
    let extractedAny = false;
    let localSeq = [...seq];

    while (greedyArrows.length > 0) {
      let candidateIdx = -1;
      for (let i = 0; i < greedyArrows.length; i++) {
        const a = greedyArrows[i];
        if (tryExtract(greedyArrows, a, grid, obstacles).ok) {
          candidateIdx = i;
          break;
        }
      }

      if (candidateIdx === -1) break;

      const [extracted] = greedyArrows.splice(candidateIdx, 1);
      localSeq.push({ type: 'extract', arrowId: extracted.id });
      extractedAny = true;
    }

    if (greedyArrows.length === 0) {
      return {
        solved: true,
        steps: localSeq.length,
        sequence: localSeq,
        statesExplored
      };
    }

    // 2. If stuck, check pivot rotations for any pivot arrows
    let rotationQueued = false;
    for (let i = 0; i < greedyArrows.length; i++) {
      const a = greedyArrows[i];
      if (!a.isPivot) continue;

      const rot = canRotateArrow(a, grid, greedyArrows, obstacles);
      if (rot.ok) {
        // Clone and apply rotation
        const nextArrows = greedyArrows.map(arr => {
          if (arr.id === a.id) {
            return {
              ...cloneArrow(arr),
              dir: rot.rotated.dir,
              cells: rot.rotated.cells
            };
          }
          return cloneArrow(arr);
        });

        const key = stateKey(nextArrows);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            arrows: nextArrows,
            seq: [...localSeq, { type: 'rotate', arrowId: a.id, newDir: rot.rotated.dir }]
          });
          rotationQueued = true;
        }
      }
    }

    // If we extracted arrows but couldn't rotate, queue this state if not visited
    if (extractedAny && !rotationQueued) {
      const key = stateKey(greedyArrows);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ arrows: greedyArrows, seq: localSeq });
      }
    }
  }

  return {
    solved: false,
    remainingArrows: currentArrows.length,
    statesExplored
  };
}
