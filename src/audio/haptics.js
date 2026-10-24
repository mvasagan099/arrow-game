/* Haptic feedback abstraction for Arrow Escape.
   Uses the HTML5 Vibration API where supported (Android Chrome / WebView).
   Designed for future seamless bridge to Capacitor Haptics plugin in Phase 6. */

export const HAPTIC_PATTERNS = {
  tap: 12,
  extract: 18,
  block: [30, 40, 30],
  win: [35, 45, 35, 50, 80],
  fail: [80, 50, 100]
};

let _enabled = true;

export function setHapticsEnabled(enabled) {
  _enabled = !!enabled;
}

export function isHapticsEnabled() {
  return _enabled;
}

function vibrate(pattern) {
  if (!_enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch (err) {
    // Silently ignore permission/sandbox restrictions
  }
}

/** Subtle tick for button taps / UI navigation */
export function hapticTap() {
  vibrate(HAPTIC_PATTERNS.tap);
}

/** Satisfying pulse for successful arrow escape */
export function hapticExtract() {
  vibrate(HAPTIC_PATTERNS.extract);
}

/** Double jarring pulse for hitting a blocking arrow */
export function hapticBlock() {
  vibrate(HAPTIC_PATTERNS.block);
}

/** Celebratory rhythmic pattern for level solve */
export function hapticWin() {
  vibrate(HAPTIC_PATTERNS.win);
}

/** Low rumble for level failure / out of hearts */
export function hapticFail() {
  vibrate(HAPTIC_PATTERNS.fail);
}
