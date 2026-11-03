/* Haptic feedback abstraction for Arrow Escape.
   Bridges to Capacitor Haptics plugin when running on native Android,
   with seamless fallback to the HTML5 Vibration API in browsers and automated tests. */

export const HAPTIC_PATTERNS = {
  tap: 12,
  extract: 18,
  block: [30, 40, 30],
  rotate: 15,
  unlock: [20, 30],
  win: [35, 45, 35, 50, 80],
  fail: [80, 50, 100],
  coin: 15,
  purchase: [20, 25, 40]
};

let _enabled = true;
let _nativeHaptics = null;

// Initialize native Capacitor Haptics if available on device
if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
  _nativeHaptics = window.Capacitor?.Plugins?.Haptics || null;
  if (!_nativeHaptics) {
    import('@capacitor/haptics').then(m => {
      _nativeHaptics = m.Haptics;
    }).catch(() => {});
  }
}

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
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'LIGHT' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.tap);
  }
}

/** Satisfying pulse for successful arrow escape */
export function hapticExtract() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'MEDIUM' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.extract);
  }
}

/** Double jarring pulse for hitting a blocking arrow */
export function hapticBlock() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'HEAVY' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.block);
  }
}

/** Crisp click for pivot arrow rotation */
export function hapticRotate() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'LIGHT' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.rotate);
  }
}

/** Ascending pulse when color key unlocks locked arrows */
export function hapticUnlock() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'MEDIUM' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.unlock);
  }
}

/** Celebratory rhythmic pattern for level solve */
export function hapticWin() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.notification({ type: 'SUCCESS' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.win);
  }
}

/** Low rumble for level failure / out of hearts */
export function hapticFail() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.notification({ type: 'ERROR' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.fail);
  }
}

/** Crisp chime pulse for coin collection */
export function hapticCoin() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.impact({ style: 'LIGHT' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.coin);
  }
}

/** Solid rewarding pulse for shop purchases */
export function hapticPurchase() {
  if (!_enabled) return;
  if (_nativeHaptics) {
    _nativeHaptics.notification({ type: 'SUCCESS' }).catch(() => {});
  } else {
    vibrate(HAPTIC_PATTERNS.purchase);
  }
}
