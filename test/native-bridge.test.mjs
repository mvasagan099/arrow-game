/* Unit & Integration Tests for Native Android Bridge & Haptics */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initAndroidBridge,
  handleNativeBack,
  hideSplashScreen,
  updateStatusBarTheme
} from '../src/native/android-bridge.js';
import {
  HAPTIC_PATTERNS,
  setHapticsEnabled,
  isHapticsEnabled,
  hapticTap,
  hapticExtract,
  hapticBlock,
  hapticRotate,
  hapticUnlock,
  hapticWin,
  hapticFail,
  hapticCoin,
  hapticPurchase
} from '../src/audio/haptics.js';
import { setFullScreenAdActive } from '../src/ads/ad-lifecycle.js';

describe('Native Android Bridge - Back Button Dispatcher', () => {
  let navEvents = [];
  let exitCalls = 0;

  beforeEach(() => {
    navEvents = [];
    exitCalls = 0;
    setFullScreenAdActive(false);
  });

  it('initializes gracefully in non-native / headless environment', async () => {
    const res = await initAndroidBridge();
    assert.equal(res.isNative, false);
  });

  it('priority 1: ignores back press when full-screen ad is active', async () => {
    let modalClosed = false;
    await initAndroidBridge({
      anyModalOpen: () => true,
      closeTopModal: () => { modalClosed = true; }
    });

    setFullScreenAdActive(true);
    handleNativeBack();

    assert.equal(modalClosed, false, 'Modal should not close when ad is active');
    setFullScreenAdActive(false);
  });

  it('priority 2: closes top open modal dialog when one is open', async () => {
    let closedCount = 0;
    await initAndroidBridge({
      anyModalOpen: () => true,
      closeTopModal: () => { closedCount++; },
      isHomeVisible: () => false
    });

    handleNativeBack();
    assert.equal(closedCount, 1, 'Top modal must close on back button');
  });

  it('priority 3a: pauses game when playing and pause menu is not yet open', async () => {
    let pauseOpened = false;
    let homeShown = false;

    await initAndroidBridge({
      anyModalOpen: () => false,
      isHomeVisible: () => false,
      isPauseOpen: () => false,
      openPause: () => { pauseOpened = true; },
      showHome: () => { homeShown = true; }
    });

    handleNativeBack();
    assert.equal(pauseOpened, true, 'Pause menu should open');
    assert.equal(homeShown, false, 'Home should not be shown yet');
  });

  it('priority 3b: returns to home when playing and pause menu is already open', async () => {
    let pauseOpened = false;
    let homeShown = false;

    await initAndroidBridge({
      anyModalOpen: () => false,
      isHomeVisible: () => false,
      isPauseOpen: () => true,
      openPause: () => { pauseOpened = true; },
      showHome: () => { homeShown = true; }
    });

    handleNativeBack();
    assert.equal(homeShown, true, 'Should return to home screen from pause dialog');
    assert.equal(pauseOpened, false);
  });

  it('priority 4: double-press back on home screen triggers exit flow', async () => {
    let toastMessages = [];

    await initAndroidBridge({
      anyModalOpen: () => false,
      isHomeVisible: () => true,
      toast: (msg) => { toastMessages.push(msg); }
    });

    // First back press -> toast
    handleNativeBack();
    assert.equal(toastMessages.length, 1);
    assert.match(toastMessages[0], /press back again/i);

    // Second back press within 2000ms -> should attempt exit (no toast)
    handleNativeBack();
    assert.equal(toastMessages.length, 1, 'Second back press within 2s should not show toast');
  });
});

describe('Native Android Bridge - Status Bar & Splash Screen', () => {
  it('does not throw when updating status bar theme with dark theme', () => {
    assert.doesNotThrow(() => {
      updateStatusBarTheme({
        isDark: true,
        palette: { bg: '#0f172a' }
      });
    });
  });

  it('does not throw when updating status bar theme with light theme', () => {
    assert.doesNotThrow(() => {
      updateStatusBarTheme({
        isDark: false,
        palette: { bg: '#f8fafc' }
      });
    });
  });

  it('does not throw when hiding splash screen in non-native environment', () => {
    assert.doesNotThrow(() => {
      hideSplashScreen(0);
    });
  });
});

describe('Haptics Module', () => {
  it('toggles haptic setting correctly', () => {
    setHapticsEnabled(false);
    assert.equal(isHapticsEnabled(), false);
    setHapticsEnabled(true);
    assert.equal(isHapticsEnabled(), true);
  });

  it('triggers haptics gracefully in browser/node environment without crashing', () => {
    assert.doesNotThrow(() => hapticTap());
    assert.doesNotThrow(() => hapticExtract());
    assert.doesNotThrow(() => hapticBlock());
    assert.doesNotThrow(() => hapticRotate());
    assert.doesNotThrow(() => hapticUnlock());
    assert.doesNotThrow(() => hapticWin());
    assert.doesNotThrow(() => hapticFail());
    assert.doesNotThrow(() => hapticCoin());
    assert.doesNotThrow(() => hapticPurchase());
  });
});
