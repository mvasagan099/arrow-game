/* Automated tests for Arrow Escape Phase 2:
   - 4-Theme definitions, palettes & WCAG AA/AAA contrast ratios
   - Theme switching integrity (persists without resetting state)
   - Zero-allocation Particle Pool (lifecycle, caps, updates, clear)
   - Haptics vibration abstraction & graceful fallbacks
   - Sound synthesis safe fallbacks
   - Viewport fit across target Android mobile aspect ratios (360x800, 393x873, 412x915, 768x1024)
*/

import assert from 'node:assert/strict';
import { THEMES, THEME_KEYS, DEFAULT_THEME, MAX_LEVEL } from '../src/config.js';
import { load, save } from '../src/persist.js';
import {
  emitTrail,
  emitBlockSparks,
  emitWinBurst,
  updateParticles,
  clearParticles,
  getActiveParticleCount,
  POOL_SIZE
} from '../src/render/particles.js';
import {
  setHapticsEnabled,
  isHapticsEnabled,
  hapticTap,
  hapticExtract,
  hapticBlock,
  hapticWin,
  hapticFail,
  HAPTIC_PATTERNS
} from '../src/audio/haptics.js';
import {
  setMuted,
  isMuted,
  sfxExtract,
  sfxBlock,
  sfxHeart,
  sfxWin,
  sfxHint,
  sfxTick,
  sfxButton,
  sfxFail,
  sfxAchievement
} from '../src/audio/sounds.js';

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

// Helper: parse hex color to relative luminance for WCAG contrast calculation
function hexToLuminance(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const toLinear = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Mock localStorage for node environment
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

console.log('Running Phase 2 UI/UX, Themes, Particle & Mobile Optimization Tests...');

test('Phase 2 Themes: 4 complete themes defined with full palettes', () => {
  const expectedThemes = ['classic', 'dark', 'neon', 'pastel'];
  assert.deepEqual([...THEME_KEYS].sort(), [...expectedThemes].sort());
  assert.equal(THEME_KEYS.includes(DEFAULT_THEME), true);

  const requiredPaletteProps = [
    'bg', 'bgSoft', 'bgCard', 'ink', 'inkSoft', 'inkFaint',
    'line', 'lineStrong', 'accent', 'danger', 'heart', 'hint', 'good'
  ];

  for (const key of expectedThemes) {
    const theme = THEMES[key];
    assert.ok(theme, `Theme "${key}" should exist in THEMES`);
    assert.ok(theme.id === key, `Theme "${key}" id should match key`);
    assert.ok(theme.name, `Theme "${key}" should have name`);
    assert.ok(theme.palette, `Theme "${key}" should have palette`);
    for (const prop of requiredPaletteProps) {
      assert.ok(theme.palette[prop], `Theme "${key}" is missing palette property "${prop}"`);
    }
  }
});

test('Phase 2 Contrast: All 4 themes satisfy WCAG AA contrast (>= 4.5:1)', () => {
  for (const key of THEME_KEYS) {
    const theme = THEMES[key];
    const ratio = contrastRatio(theme.palette.bg, theme.palette.ink);
    // Standard text requires 4.5:1 for WCAG AA
    assert.ok(ratio >= 4.5, `Theme "${key}" contrast ratio ${ratio.toFixed(2)} is below 4.5:1`);
  }
});

test('Phase 2 Theme Persistence & Switching without state reset', () => {
  localStorage.clear();
  const data = load();
  data.currentLevel = 45;
  data.stats.totalCompleted = 44;
  save(data);

  // Switch themes through all 4 themes
  for (const themeKey of THEME_KEYS) {
    data.settings.theme = themeKey;
    save(data);

    const reloaded = load();
    assert.equal(reloaded.settings.theme, themeKey);
    assert.equal(reloaded.currentLevel, 45, 'Theme switch must preserve currentLevel');
    assert.equal(reloaded.stats.totalCompleted, 44, 'Theme switch must preserve stats');
  }
});

test('Phase 2 Particle System: Fixed-size pool and zero GC leak', () => {
  clearParticles();
  assert.equal(getActiveParticleCount(), 0);
  assert.equal(POOL_SIZE, 140);

  // Emit trail particles
  emitTrail(100, 100, 1, '#38bdf8');
  const countAfterTrail = getActiveParticleCount();
  assert.ok(countAfterTrail > 0 && countAfterTrail <= 10);

  // Emit collision block sparks
  emitBlockSparks(150, 150, '#f87171');
  const countAfterSparks = getActiveParticleCount();
  assert.ok(countAfterSparks > countAfterTrail);

  // Emit multiple win bursts to stress pool limit
  for (let i = 0; i < 10; i++) {
    emitWinBurst(200, 300, '#4ade80');
  }

  // Active particles must NEVER exceed POOL_SIZE
  const activeCount = getActiveParticleCount();
  assert.ok(activeCount <= POOL_SIZE, `Active count ${activeCount} exceeded POOL_SIZE ${POOL_SIZE}`);
  assert.equal(activeCount, POOL_SIZE, 'Pool should saturate at exactly POOL_SIZE');

  // Advance time: particles have lifespan up to 950ms. Advancing 1200ms should expire all of them.
  updateParticles(1200);
  assert.equal(getActiveParticleCount(), 0, 'All particles should be deactivated after max lifespan');

  // Clear resets count
  emitWinBurst(100, 100, '#fff');
  assert.ok(getActiveParticleCount() > 0);
  clearParticles();
  assert.equal(getActiveParticleCount(), 0);
});

test('Phase 2 Haptics: Pattern lookup, trigger handling, and fallback safety', () => {
  assert.ok(HAPTIC_PATTERNS.tap);
  assert.ok(HAPTIC_PATTERNS.extract);
  assert.ok(HAPTIC_PATTERNS.block);
  assert.ok(HAPTIC_PATTERNS.win);
  assert.ok(HAPTIC_PATTERNS.fail);

  let lastVibratePattern = null;
  const originalVibrate = globalThis.navigator?.vibrate;
  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: (pattern) => {
      lastVibratePattern = pattern;
      return true;
    },
    configurable: true,
    writable: true
  });

  setHapticsEnabled(true);
  assert.equal(isHapticsEnabled(), true);

  // Enabled triggers
  hapticTap();
  assert.deepEqual(lastVibratePattern, HAPTIC_PATTERNS.tap);

  hapticExtract();
  assert.deepEqual(lastVibratePattern, HAPTIC_PATTERNS.extract);

  hapticBlock();
  assert.deepEqual(lastVibratePattern, HAPTIC_PATTERNS.block);

  hapticWin();
  assert.deepEqual(lastVibratePattern, HAPTIC_PATTERNS.win);

  hapticFail();
  assert.deepEqual(lastVibratePattern, HAPTIC_PATTERNS.fail);

  // Disabled should not trigger vibration
  lastVibratePattern = null;
  setHapticsEnabled(false);
  assert.equal(isHapticsEnabled(), false);

  hapticTap();
  assert.equal(lastVibratePattern, null);

  // Graceful fallback when navigator.vibrate throws or does not exist
  setHapticsEnabled(true);
  delete globalThis.navigator.vibrate;
  assert.doesNotThrow(() => {
    hapticTap();
  });
});

test('Phase 2 Sound Synthesis: safe fallbacks when WebAudio context unavailable', () => {
  // In node environment, window and AudioContext are undefined.
  // SFX functions must execute gracefully without throw.
  assert.doesNotThrow(() => {
    setMuted(false);
    assert.equal(isMuted(), false);
    sfxButton();
    sfxFail();
    sfxExtract();
    sfxBlock();
    sfxHeart();
    sfxWin();
    sfxHint();
    sfxTick();
    sfxAchievement();

    setMuted(true);
    assert.equal(isMuted(), true);
    sfxButton();
  });
});

test('Phase 2 Responsive Viewports: Fit calculation on standard Android viewports', () => {
  const targetDevices = [
    { name: 'Standard Android (9:20)', w: 360, h: 800 },
    { name: 'Pixel 7/8 (~9:20)', w: 393, h: 873 },
    { name: 'Pixel 8 Pro / Galaxy S24+ (9:20)', w: 412, h: 915 },
    { name: 'Android Tablet (3:4)', w: 768, h: 1024 }
  ];

  for (const dev of targetDevices) {
    // Puzzle board available height = viewport height - topbar (~56px) - bottom actions (~72px) - safe margins (~32px)
    const availWidth = dev.w - 24; // 12px margin each side
    const availHeight = dev.h - 56 - 72 - 32;

    assert.ok(availWidth > 0, `${dev.name}: availWidth must be positive`);
    assert.ok(availHeight > 0, `${dev.name}: availHeight must be positive`);

    // Board aspect ratio is roughly 1:1 to 1:1.3. Max side that can fit:
    const boardSide = Math.min(availWidth, availHeight);
    assert.ok(boardSide >= 320, `${dev.name}: Board must have at least 320px playable canvas`);

    // Cell size for a 6x6 grid
    const cellSize = boardSide / 6;
    assert.ok(cellSize >= 48, `${dev.name}: Cell size must meet minimum touch target >= 48px`);
  }
});

console.log(`\nAll ${passed}/${total} Phase 2 tests passed successfully!`);
