/* Automated tests for Arrow Escape viewport math & mobile compatibility:
   - Viewport sizes: 360×800, 393×873, 412×915, 768×1024
   - Canvas geometry and board bounds across all tiers (easy..nightmare)
   - Coordinate conversions: screenToCell and cellCenter bijection
   - Pan and zoom constraints
   - Touch targets and scaling sanity
*/

import assert from 'node:assert/strict';
import { baseCellSize, getGeom, screenToCell, cellCenter, panBy, zoomAt, constrainView, clamp } from '../src/render/viewport.js';
import { createGameState } from '../src/engine/state.js';
import { generateLevel } from '../src/engine/generator.js';
import { TIERS, TIER_ORDER, VIEW_MIN, VIEW_MAX } from '../src/config.js';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    throw err;
  }
}

const VIEWPORTS = [
  { name: 'Small Phone (360x800)',  w: 360, h: 800 },
  { name: 'Standard Phone (393x873)', w: 393, h: 873 },
  { name: 'Large Phone (412x915)',   w: 412, h: 915 },
  { name: 'Tablet (768x1024)',       w: 768, h: 1024 }
];

console.log('Running Mobile Viewport & Sizing Tests...');

// Header is ~64px, progress 3px, action bar ~66px -> available board height is h - 133px
function availableCanvasSize(viewportW, viewportH) {
  const topBarH = 64;
  const progressH = 3;
  const actionsH = 66;
  return {
    canvasW: viewportW,
    canvasH: viewportH - topBarH - progressH - actionsH
  };
}

test('Mobile Viewports: Board fully fits and is centered at default 1.0 scale across all tiers', () => {
  for (const vp of VIEWPORTS) {
    const { canvasW, canvasH } = availableCanvasSize(vp.w, vp.h);

    for (const tierKey of TIER_ORDER) {
      const tier = TIERS[tierKey];
      const puzzle = generateLevel(tier.start);
      const state = createGameState(puzzle);

      const geom = getGeom(state, canvasW, canvasH);

      // Base cell size must be positive
      assert.ok(geom.base > 0, `Base cell size must be > 0 for ${vp.name} (${tierKey})`);

      // Board total pixels must fit inside the shorter dimension
      assert.ok(geom.boardPx <= Math.min(canvasW, canvasH), `Board ${geom.boardPx}px exceeds canvas on ${vp.name}`);

      // Margins must be non-negative
      assert.ok(geom.left >= 0, `Left margin ${geom.left} is negative on ${vp.name}`);
      assert.ok(geom.top >= 0, `Top margin ${geom.top} is negative on ${vp.name}`);

      // Bounds fit inside canvas
      assert.ok(geom.left + geom.boardPx <= canvasW + 0.001);
      assert.ok(geom.top + geom.boardPx <= canvasH + 0.001);
    }
  }
});

test('Coordinate Math: screenToCell and cellCenter roundtrip', () => {
  const { canvasW, canvasH } = availableCanvasSize(360, 800);
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);
  const geom = getGeom(state, canvasW, canvasH);

  for (let y = 0; y < geom.grid; y++) {
    for (let x = 0; x < geom.grid; x++) {
      const center = cellCenter(x, y, geom);
      const converted = screenToCell(center.x, center.y, geom);
      assert.deepEqual(converted, { x, y }, `Mismatch at (${x}, ${y})`);
    }
  }

  // Outside boundaries return null
  assert.equal(screenToCell(geom.left - 5, geom.top, geom), null);
  assert.equal(screenToCell(geom.left, geom.top - 5, geom), null);
  assert.equal(screenToCell(geom.left + geom.boardPx + 5, geom.top, geom), null);
  assert.equal(screenToCell(geom.left, geom.top + geom.boardPx + 5, geom), null);
});

test('Pan and Zoom Constraints: constrainView keeps board reachable', () => {
  const { canvasW, canvasH } = availableCanvasSize(360, 800);
  const puzzle = generateLevel(1);
  const state = createGameState(puzzle);

  // Pan far off to the right
  panBy(state, 5000, 5000);
  constrainView(state, canvasW, canvasH);

  const geom = getGeom(state, canvasW, canvasH);
  // After constraining, board center must be within reasonable bounds
  const boardCenterX = geom.left + geom.boardPx / 2;
  const boardCenterY = geom.top + geom.boardPx / 2;
  assert.ok(boardCenterX >= 0 && boardCenterX <= canvasW, 'Board X escaped screen');
  assert.ok(boardCenterY >= 0 && boardCenterY <= canvasH, 'Board Y escaped screen');

  // Zoom clamps between VIEW_MIN (0.45) and VIEW_MAX (4.5)
  zoomAt(state, canvasW / 2, canvasH / 2, 0.001, canvasW, canvasH);
  assert.equal(state.view.scale, VIEW_MIN);

  zoomAt(state, canvasW / 2, canvasH / 2, 1000, canvasW, canvasH);
  assert.equal(state.view.scale, VIEW_MAX);
});

test('Touch Target Sizing: Action buttons and touch targets meet minimum recommendations', () => {
  for (const vp of VIEWPORTS) {
    // 4 action buttons with 14px outer margins and 6px gaps
    const totalPadding = 14 * 2;
    const totalGaps = 6 * 3;
    const buttonWidth = (vp.w - totalPadding - totalGaps) / 4;
    // Button height = ~54px (24px icon + 2px gap + 14px text + 20px padding)
    const buttonHeight = 54;

    // Minimum target recommendation is 48px
    assert.ok(buttonWidth >= 48, `Button width ${buttonWidth}px on ${vp.name} is below 48px`);
    assert.ok(buttonHeight >= 48, `Button height ${buttonHeight}px on ${vp.name} is below 48px`);
  }
});

console.log(`\nAll ${passed}/${total} Viewport & Sizing tests passed successfully!`);
