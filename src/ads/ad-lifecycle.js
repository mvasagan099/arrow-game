/* Advertisement Lifecycle & Screen Transition Coordinator.
   Handles:
     - Automatic banner hide during active gameplay / tutorials
     - Input suspension during full-screen interstitial/rewarded ads
     - Document visibility & background state pause/resume
     - Cleanup of stale callbacks */

let _activeScreen = 'home';
let _isFullScreenAdActive = false;

/**
 * Initializes ad lifecycle listeners.
 */
export function initAdLifecycle({ onHideBanner, onShowBanner, onPauseGame, onResumeGame }) {
  if (typeof document === 'undefined') return;

  // 1. App background / visibility change listener
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      onPauseGame?.();
    } else {
      onResumeGame?.();
    }
  });

  // 2. Native Capacitor app state listeners if available
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    const App = window.Capacitor?.Plugins?.App;
    if (App) {
      App.addListener('appStateChange', state => {
        if (!state.isActive) {
          onPauseGame?.();
        } else {
          onResumeGame?.();
        }
      }).catch?.(() => {});
    } else {
      import('@capacitor/app').then(({ App: a }) => {
        a.addListener('appStateChange', state => {
          if (!state.isActive) {
            onPauseGame?.();
          } else {
            onResumeGame?.();
          }
        }).catch?.(() => {});
      }).catch(() => {});
    }
  }
}

/**
 * Updates active screen context and manages banner visibility.
 * Eligible banner screens: 'home', 'levels', 'shop', 'achievements'.
 * Ineligible: 'game', 'tutorial'.
 */
export function handleScreenChange(newScreenId, adService) {
  _activeScreen = newScreenId;

  if (newScreenId === 'game' || newScreenId === 'tutorial') {
    // Hide banner immediately during active puzzles
    adService?.hideBanner?.();
  } else if (['home', 'levels', 'shop', 'achievements'].includes(newScreenId)) {
    // Allow adaptive banner on non-puzzle screens
    adService?.showBanner?.();
  }
}

/**
 * Sets full-screen ad active state (used to lock game input).
 */
export function setFullScreenAdActive(active) {
  _isFullScreenAdActive = !!active;
  if (typeof document !== 'undefined') {
    document.body?.classList.toggle('ad-fullscreen-active', _isFullScreenAdActive);
  }
}

/**
 * Returns true if an interstitial or rewarded ad is currently displayed.
 */
export function isFullScreenAdActive() {
  return _isFullScreenAdActive;
}

/**
 * Returns currently active screen identifier.
 */
export function getActiveScreen() {
  return _activeScreen;
}
