/* Automated tests for Arrow Escape persistence layer:
   - Solved level bit packing (isSolved, markSolved, solvedSet)
   - Edge case levels (1, 6, 7, 100, 2000, 9999)
   - Schema migration and defaults population
   - Robustness against corrupted / invalid storage data
*/

import assert from 'node:assert/strict';
import { load, save, isSolved, markSolved, solvedSet } from '../src/persist.js';
import { MAX_LEVEL, STORAGE_KEY, STORAGE_VERSION } from '../src/config.js';

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

// Mock localStorage for Node.js environment
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

console.log('Running Persistence Layer Tests...');

test('Bit Packing: markSolved, isSolved, and solvedSet', () => {
  const data = { completedBits: '' };

  assert.equal(isSolved(data, 1), 0);
  assert.equal(isSolved(data, 2), 0);

  markSolved(data, 1);
  assert.equal(isSolved(data, 1), 1);
  assert.equal(isSolved(data, 2), 0);

  markSolved(data, 6); // 6th bit (boundary of 6-bit chunk)
  markSolved(data, 7); // 7th bit (first bit of 2nd chunk)
  markSolved(data, 100);
  markSolved(data, 2000);

  assert.equal(isSolved(data, 1), 1);
  assert.equal(isSolved(data, 6), 1);
  assert.equal(isSolved(data, 7), 1);
  assert.equal(isSolved(data, 8), 0);
  assert.equal(isSolved(data, 100), 1);
  assert.equal(isSolved(data, 2000), 1);
  assert.equal(isSolved(data, 2001), 0);

  const solved = solvedSet(data);
  assert.ok(solved.has(1));
  assert.ok(solved.has(6));
  assert.ok(solved.has(7));
  assert.ok(solved.has(100));
  assert.ok(solved.has(2000));
  assert.equal(solved.has(2), false);
  assert.equal(solved.has(8), false);
  assert.equal(solved.size, 5);
});

test('Bit Packing: Boundary and invalid levels', () => {
  const data = { completedBits: '' };

  // Out of bounds level numbers should be ignored safely
  markSolved(data, 0);
  markSolved(data, -5);
  markSolved(data, MAX_LEVEL + 1);

  assert.equal(data.completedBits, '');

  // Maximum valid level
  markSolved(data, MAX_LEVEL);
  assert.equal(isSolved(data, MAX_LEVEL), 1);
  assert.equal(isSolved(data, MAX_LEVEL - 1), 0);
});

test('Persistence: Save, Load & Storage Migration', () => {
  localStorage.clear();

  // Load from empty store returns valid default schema
  const initial = load();
  assert.equal(initial.v, STORAGE_VERSION);
  assert.equal(initial.currentLevel, 1);
  assert.equal(initial.completedBits, '');
  assert.equal(initial.stats.totalCompleted, 0);
  assert.equal(initial.stats.maxLevel, 1);
  assert.ok(initial.settings);
  assert.ok(initial.daily);

  // Modify and save
  initial.currentLevel = 42;
  initial.stats.totalCompleted = 15;
  markSolved(initial, 1);
  markSolved(initial, 2);
  save(initial);

  // Load back
  const loaded = load();
  assert.equal(loaded.currentLevel, 42);
  assert.equal(loaded.stats.totalCompleted, 15);
  assert.equal(isSolved(loaded, 1), 1);
  assert.equal(isSolved(loaded, 2), 1);
  assert.equal(isSolved(loaded, 3), 0);
});

test('Persistence: Migration and recovery from legacy or corrupt data', () => {
  // 1. Partial/legacy data missing some fields
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentLevel: 10,
    stats: { totalCompleted: 5 }
    // missing settings, daily, achievements, completedBits, v
  }));

  const migrated = load();
  assert.equal(migrated.v, STORAGE_VERSION);
  assert.equal(migrated.currentLevel, 10);
  assert.equal(migrated.stats.totalCompleted, 5);
  assert.equal(migrated.stats.maxLevel, 1); // filled default
  assert.equal(migrated.settings.theme, 'classic'); // filled default (Phase 2 default light theme)
  assert.equal(migrated.completedBits, '');

  // 1b. Legacy theme 'light' migration to 'classic'
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: { theme: 'light', sound: true }
  }));
  const legacyThemeMigrated = load();
  assert.equal(legacyThemeMigrated.settings.theme, 'classic');
  assert.equal(legacyThemeMigrated.settings.haptics, true); // defaulted

  // 2. Corrupt non-JSON data
  localStorage.setItem(STORAGE_KEY, 'invalid-json{{{');
  const recovered = load();
  assert.equal(recovered.v, STORAGE_VERSION);
  assert.equal(recovered.currentLevel, 1);

  // 3. Null or bad types
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentLevel: -99, completedBits: 12345 }));
  const sanitized = load();
  assert.equal(sanitized.currentLevel, 1);
  assert.equal(sanitized.completedBits, '');
});

console.log(`\nAll ${passed}/${total} Persistence Layer tests passed successfully!`);
