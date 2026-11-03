/* Advertisement Provider Implementations for Arrow Escape.
   Provides:
     1. NativeAdMobProvider: Official @capacitor-community/admob integration
     2. BrowserMockProvider: Safe local browser simulation (0 external network requests)
     3. OfflineProvider: Graceful offline fallback with zero gameplay stalls */

import { AD_STATES } from './ad-config.js';
import { emitAdEvent, AD_EVENTS } from './ad-events.js';

/**
 * 1. Native Android AdMob Provider
 * Uses @capacitor-community/admob when running on Android native platform.
 */
export class NativeAdMobProvider {
  constructor(config = {}) {
    this.config = config;
    this.admob = null;
    this.state = AD_STATES.UNINITIALIZED;
    this.bannerVisible = false;
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.listenersRegistered = false;
  }

  async initialize() {
    this.state = AD_STATES.INITIALIZING;
    emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: this.state });

    try {
      this.admob = window.Capacitor?.Plugins?.AdMob || null;
      if (!this.admob) {
        const { AdMob } = await import('@capacitor-community/admob');
        this.admob = AdMob;
      }

      await this.admob.initialize({
        initializeForTesting: !!this.config.isTesting
      });

      this.registerListeners();
      this.state = AD_STATES.READY;
      emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: this.state });
      return { success: true };
    } catch (err) {
      this.state = AD_STATES.UNAVAILABLE;
      emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: this.state, error: err.message });
      return { success: false, error: err.message };
    }
  }

  registerListeners() {
    if (this.listenersRegistered || !this.admob) return;
    this.listenersRegistered = true;

    try {
      // Banner listeners
      this.admob.addListener('bannerAdLoaded', () => {
        this.bannerVisible = true;
        emitAdEvent(AD_EVENTS.BANNER_LOADED);
      });
      this.admob.addListener('bannerAdFailedToLoad', info => {
        this.bannerVisible = false;
        emitAdEvent(AD_EVENTS.BANNER_FAILED, info);
      });

      // Interstitial listeners
      this.admob.addListener('interstitialAdLoaded', () => {
        this.interstitialReady = true;
        emitAdEvent(AD_EVENTS.INTERSTITIAL_LOADED);
      });
      this.admob.addListener('interstitialAdDismissed', () => {
        this.interstitialReady = false;
        emitAdEvent(AD_EVENTS.INTERSTITIAL_DISMISSED);
        this.preloadInterstitial();
      });
      this.admob.addListener('interstitialAdFailedToShow', err => {
        this.interstitialReady = false;
        emitAdEvent(AD_EVENTS.INTERSTITIAL_FAILED, err);
      });

      // Rewarded listeners
      this.admob.addListener('onRewardedVideoAdLoaded', () => {
        this.rewardedReady = true;
        emitAdEvent(AD_EVENTS.REWARDED_LOADED);
      });
      this.admob.addListener('onRewarded', reward => {
        emitAdEvent(AD_EVENTS.REWARDED_EARNED, reward);
      });
      this.admob.addListener('onRewardedVideoAdDismissed', () => {
        this.rewardedReady = false;
        emitAdEvent(AD_EVENTS.REWARDED_DISMISSED);
        this.preloadRewarded();
      });
      this.admob.addListener('onRewardedVideoAdFailedToShow', err => {
        this.rewardedReady = false;
        emitAdEvent(AD_EVENTS.REWARDED_FAILED, err);
      });
    } catch (e) {
      console.warn('[NativeAdMobProvider] Listener registration error:', e);
    }
  }

  async showBanner(position = 'bottom') {
    if (!this.admob) return { success: false, reason: 'uninitialized' };
    try {
      const pos = position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER';
      await this.admob.showBanner({
        adId: this.config.bannerId,
        adSize: 'ADAPTIVE_BANNER',
        position: pos,
        margin: 0,
        isTesting: !!this.config.isTesting
      });
      this.bannerVisible = true;
      return { success: true };
    } catch (err) {
      this.bannerVisible = false;
      return { success: false, error: err.message };
    }
  }

  async hideBanner() {
    if (!this.admob || !this.bannerVisible) return { success: true };
    try {
      await this.admob.hideBanner();
      this.bannerVisible = false;
      emitAdEvent(AD_EVENTS.BANNER_HIDDEN);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async preloadInterstitial() {
    if (!this.admob) return { success: false };
    try {
      await this.admob.prepareInterstitial({
        adId: this.config.interstitialId,
        isTesting: !!this.config.isTesting
      });
      return { success: true };
    } catch (err) {
      this.interstitialReady = false;
      return { success: false, error: err.message };
    }
  }

  async showInterstitial() {
    if (!this.admob) return { success: false, reason: 'uninitialized' };
    try {
      emitAdEvent(AD_EVENTS.INTERSTITIAL_SHOWN);
      await this.admob.showInterstitial();
      return { success: true };
    } catch (err) {
      emitAdEvent(AD_EVENTS.INTERSTITIAL_FAILED, { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async preloadRewarded() {
    if (!this.admob) return { success: false };
    try {
      await this.admob.prepareRewardVideoAd({
        adId: this.config.rewardedId,
        isTesting: !!this.config.isTesting
      });
      return { success: true };
    } catch (err) {
      this.rewardedReady = false;
      return { success: false, error: err.message };
    }
  }

  async showRewarded() {
    if (!this.admob) return { success: false, reason: 'uninitialized' };
    try {
      emitAdEvent(AD_EVENTS.REWARDED_SHOWN);
      await this.admob.showRewardVideoAd();
      return { success: true };
    } catch (err) {
      emitAdEvent(AD_EVENTS.REWARDED_FAILED, { error: err.message });
      return { success: false, error: err.message };
    }
  }

  isBannerVisible() { return this.bannerVisible; }
  isInterstitialReady() { return this.interstitialReady; }
  isRewardedReady() { return this.rewardedReady; }
}

/**
 * 2. Browser Mock Provider
 * High-fidelity, zero-network mock for browser development and unit testing.
 * Never contacts real ad networks.
 */
export class BrowserMockProvider {
  constructor(config = {}) {
    this.config = config;
    this.state = AD_STATES.UNINITIALIZED;
    this.bannerVisible = false;
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.failNextAd = false;
    this.dismissWithoutReward = false;
  }

  async initialize() {
    this.state = AD_STATES.INITIALIZING;
    emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: this.state });
    this.state = AD_STATES.READY;
    emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: this.state });
    return { success: true, mock: true };
  }

  async showBanner(position = 'bottom') {
    this.bannerVisible = true;
    emitAdEvent(AD_EVENTS.BANNER_LOADED, { mock: true, position });
    return { success: true, mock: true };
  }

  async hideBanner() {
    this.bannerVisible = false;
    emitAdEvent(AD_EVENTS.BANNER_HIDDEN, { mock: true });
    return { success: true, mock: true };
  }

  async preloadInterstitial() {
    this.interstitialReady = true;
    emitAdEvent(AD_EVENTS.INTERSTITIAL_LOADED, { mock: true });
    return { success: true, mock: true };
  }

  async showInterstitial() {
    if (this.failNextAd) {
      this.failNextAd = false;
      emitAdEvent(AD_EVENTS.INTERSTITIAL_FAILED, { reason: 'simulated_failure' });
      return { success: false, shown: false, reason: 'simulated_failure' };
    }
    emitAdEvent(AD_EVENTS.INTERSTITIAL_SHOWN, { mock: true });
    this.interstitialReady = false;
    emitAdEvent(AD_EVENTS.INTERSTITIAL_DISMISSED, { mock: true });
    return { success: true, shown: true, mock: true };
  }

  async preloadRewarded() {
    this.rewardedReady = true;
    emitAdEvent(AD_EVENTS.REWARDED_LOADED, { mock: true });
    return { success: true, mock: true };
  }

  async showRewarded(options = {}) {
    if (this.failNextAd) {
      this.failNextAd = false;
      emitAdEvent(AD_EVENTS.REWARDED_FAILED, { reason: 'simulated_failure' });
      return { success: false, rewarded: false, reason: 'simulated_failure' };
    }

    if (this.dismissWithoutReward || options.dismissEarly) {
      this.dismissWithoutReward = false;
      emitAdEvent(AD_EVENTS.REWARDED_DISMISSED, { rewarded: false, earned: false, mock: true });
      return { success: true, rewarded: false, reason: 'user_dismissed' };
    }

    emitAdEvent(AD_EVENTS.REWARDED_SHOWN, { mock: true });
    const sessionId = options.sessionId || `mock_session_${Date.now()}`;
    emitAdEvent(AD_EVENTS.REWARDED_EARNED, {
      type: 'coins',
      amount: 50,
      sessionId,
      mock: true
    });
    this.rewardedReady = false;
    emitAdEvent(AD_EVENTS.REWARDED_DISMISSED, { rewarded: true, earned: true, sessionId, mock: true });
    return { success: true, rewarded: true, amount: 50, sessionId, mock: true };
  }

  isBannerVisible() { return this.bannerVisible; }
  isInterstitialReady() { return this.interstitialReady; }
  isRewardedReady() { return this.rewardedReady; }
}

/**
 * 3. Offline / Fallback Provider
 * Active when offline, airplane mode, or when AdMob cannot be reached.
 * Strictly guarantees that gameplay proceeds with zero stalls or crashes.
 */
export class OfflineProvider {
  constructor() {
    this.state = AD_STATES.UNAVAILABLE;
  }
  async initialize() {
    emitAdEvent(AD_EVENTS.STATE_CHANGE, { state: AD_STATES.UNAVAILABLE, offline: true });
    return { success: false, reason: 'offline' };
  }
  async showBanner() { return { success: false, reason: 'offline' }; }
  async hideBanner() { return { success: true }; }
  async preloadInterstitial() { return { success: false, reason: 'offline' }; }
  async showInterstitial() { return { success: false, reason: 'offline' }; }
  async preloadRewarded() { return { success: false, reason: 'offline' }; }
  async showRewarded() { return { success: false, reason: 'offline' }; }
  isBannerVisible() { return false; }
  isInterstitialReady() { return false; }
  isRewardedReady() { return false; }
}

/**
 * Factory helper to instantiate the appropriate provider.
 */
export function createAdProvider(type = 'auto', config = {}) {
  if (type === 'offline') return new OfflineProvider();
  if (type === 'mock') return new BrowserMockProvider(config);
  if (type === 'native') return new NativeAdMobProvider(config);

  // Auto-detection
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'android') {
    return new NativeAdMobProvider(config);
  }
  return new BrowserMockProvider(config);
}
