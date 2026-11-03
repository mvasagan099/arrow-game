/* Native Android Bridge & System Integration for Arrow Escape.
   Coordinates:
     - Android Hardware Back Button with priority dispatch
     - Native App Lifecycle (App Pause / Resume / Memory Management)
     - Android 12+ Splash Screen dismissal
     - System UI & Status Bar theme matching / edge-to-edge support */

import { isFullScreenAdActive } from '../ads/ad-lifecycle.js';

let _lastBackPressTime = 0;
const DOUBLE_BACK_EXIT_MS = 2000;

let _appPlugin = null;
let _statusBarPlugin = null;
let _splashScreenPlugin = null;

let _navHandlers = {
  isHomeVisible: () => true,
  anyModalOpen: () => false,
  closeTopModal: () => {},
  isPauseOpen: () => false,
  openPause: () => {},
  showHome: () => {},
  toast: () => {},
  onPauseGame: () => {},
  onResumeGame: () => {}
};

/**
 * Initializes native Android bridge.
 */
export async function initAndroidBridge(handlers = {}) {
  _navHandlers = { ..._navHandlers, ...handlers };

  if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) {
    return { isNative: false };
  }

  try {
    // 1. Dynamic import of Capacitor plugins
    const [appMod, statusMod, splashMod] = await Promise.allSettled([
      import('@capacitor/app'),
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen')
    ]);

    if (appMod.status === 'fulfilled') _appPlugin = appMod.value.App;
    if (statusMod.status === 'fulfilled') _statusBarPlugin = statusMod.value.StatusBar;
    if (splashMod.status === 'fulfilled') _splashScreenPlugin = splashMod.value.SplashScreen;

    // 2. Hardware Back Button Listener with priority dispatch
    if (_appPlugin) {
      _appPlugin.addListener('backButton', handleNativeBack);
      _appPlugin.addListener('appStateChange', state => {
        if (!state.isActive) {
          _navHandlers.onPauseGame?.();
        } else {
          _navHandlers.onResumeGame?.();
        }
      });
    }

    // 3. Initial Status Bar Theme setup
    if (_statusBarPlugin) {
      _statusBarPlugin.setOverlaysWebView({ overlay: false }).catch(() => {});
      _statusBarPlugin.setStyle({ style: 'DARK' }).catch(() => {});
      _statusBarPlugin.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
    }

    return { isNative: true };
  } catch (err) {
    console.warn('[AndroidBridge] Init warning:', err.message);
    return { isNative: false, error: err.message };
  }
}

/**
 * Priority-based Native Back Button Handler.
 */
export function handleNativeBack() {
  // Priority 1: Full-screen interstitial or rewarded ad is displayed
  if (isFullScreenAdActive()) {
    // The native AdMob activity handles its own back/dismissal
    return;
  }

  // Priority 2: Any modal dialog is open (Shop, Levels, Settings, Victory, Failure, Tutorials, etc.)
  if (_navHandlers.anyModalOpen()) {
    _navHandlers.closeTopModal();
    return;
  }

  // Priority 3: Active gameplay screen (Home screen is hidden)
  if (!_navHandlers.isHomeVisible()) {
    if (_navHandlers.isPauseOpen()) {
      _navHandlers.showHome();
    } else {
      _navHandlers.openPause();
    }
    return;
  }

  // Priority 4: On Home Screen -> Double Back to Exit
  const now = Date.now();
  if (now - _lastBackPressTime < DOUBLE_BACK_EXIT_MS) {
    if (_appPlugin) {
      _appPlugin.exitApp();
    }
  } else {
    _lastBackPressTime = now;
    _navHandlers.toast('Press back again to exit Arrow Escape', 2000);
  }
}

/**
 * Hides the native launch splash screen once web UI has rendered.
 */
export function hideSplashScreen(delayMs = 250) {
  setTimeout(() => {
    if (_splashScreenPlugin) {
      _splashScreenPlugin.hide({ fadeOutDuration: 300 }).catch(() => {});
    }
  }, delayMs);
}

/**
 * Updates status bar contrast and background color to match the active theme.
 */
export function updateStatusBarTheme(themeDef) {
  if (!_statusBarPlugin || !themeDef) return;
  const isDark = themeDef.isDark !== false;
  const bgColor = themeDef.palette?.bg || (isDark ? '#0f172a' : '#f8fafc');

  try {
    _statusBarPlugin.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(() => {});
    _statusBarPlugin.setBackgroundColor({ color: bgColor }).catch(() => {});
  } catch (e) {
    // Silently ignore if unsupported
  }
}
