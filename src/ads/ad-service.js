/* Unified Advertisement Facade Service for Arrow Escape.
   Coordinates provider abstraction, UMP consent, frequency control,
   reward ledger, screen lifecycle, and offline fallback. */

import { AD_CONFIG, AD_STATES, isAdFree, validateAdConfig } from './ad-config.js';
import { createAdProvider } from './ad-provider.js';
import { checkConsent, showPrivacyOptions, canRequestAds, getConsentState } from './ad-consent.js';
import { initFrequency, shouldShowInterstitial, recordInterstitialShown, recordLevelCompleted, getFrequencyState } from './ad-frequency.js';
import { grantRewardedCoins, grantRewardedHint, getDailyRewardedCoinStatus, hasFreeHintToken, consumeFreeHintToken } from './ad-rewards.js';
import { handleScreenChange, setFullScreenAdActive, isFullScreenAdActive } from './ad-lifecycle.js';
import { onAdEvent, emitAdEvent, AD_EVENTS } from './ad-events.js';
import { findHint } from '../engine/hint.js';

let _provider = null;
let _data = null;
let _saveData = null;
let _initialized = false;
let _currentConfig = { ...AD_CONFIG };

/**
 * Initializes the advertisement subsystem.
 */
export async function initAdService(data, saveData, options = {}) {
  if (_initialized && !options.force) {
    return { success: true, alreadyInitialized: true };
  }

  _data = data;
  _saveData = saveData;
  _currentConfig = { ...AD_CONFIG, ...(options.config || {}) };

  // Validate configuration syntax
  const validation = validateAdConfig(_currentConfig);
  if (!validation.valid) {
    console.warn('[AdService] Configuration warnings:', validation.errors);
  }

  // Ensure ad metadata container exists in saved data
  if (!_data.ads || typeof _data.ads !== 'object') {
    _data.ads = {
      lastInterstitialTime: 0,
      levelsCompletedSinceLastAd: 0,
      totalInterstitialsShown: 0
    };
  }
  initFrequency(_data.ads);

  // Instantiate provider (native, mock, or offline)
  const providerType = options.providerType || 'auto';
  _provider = createAdProvider(providerType, _currentConfig);

  // Initialize provider & consent
  try {
    await _provider.initialize();
    await checkConsent(_provider.admob, options.consentOptions || {});

    if (canRequestAds() && !isAdFree(_data)) {
      _provider.preloadInterstitial?.().catch(() => {});
      _provider.preloadRewarded?.().catch(() => {});
    }

    _initialized = true;
    return { success: true, state: _provider.state };
  } catch (err) {
    console.warn('[AdService] Initialization error (falling back to offline mode):', err);
    _initialized = true;
    return { success: false, state: AD_STATES.UNAVAILABLE, error: err.message };
  }
}

/**
 * Shows adaptive banner advertisement if permitted by screen and consent.
 */
export async function showBanner(screenId = 'home') {
  if (!_provider || isAdFree(_data) || !canRequestAds()) {
    return { success: false, reason: 'blocked_by_policy' };
  }
  if (screenId === 'game' || screenId === 'tutorial') {
    return { success: false, reason: 'gameplay_active' };
  }
  return await _provider.showBanner('bottom');
}

/**
 * Hides banner advertisement.
 */
export async function hideBanner() {
  if (!_provider) return { success: true };
  return await _provider.hideBanner();
}

/**
 * Evaluates frequency and context to show an interstitial advertisement at natural break.
 */
export async function checkAndShowInterstitial(context = {}) {
  if (!_provider || isAdFree(_data) || !canRequestAds()) {
    return { shown: false, reason: 'blocked_by_policy' };
  }

  const check = shouldShowInterstitial(context);
  if (!check.allowed) {
    return { shown: false, ...check };
  }

  if (!_provider.isInterstitialReady()) {
    // If no ad preloaded, skip without stalling gameplay
    _provider.preloadInterstitial?.().catch(() => {});
    return { shown: false, reason: 'ad_not_ready' };
  }

  setFullScreenAdActive(true);
  try {
    const res = await _provider.showInterstitial();
    recordInterstitialShown();
    _syncAdData();
    return { shown: true, ...res };
  } catch (err) {
    return { shown: false, error: err.message };
  } finally {
    setFullScreenAdActive(false);
  }
}

/**
 * Watches a voluntary rewarded video ad to earn 50 coins.
 */
export async function watchRewardedForCoins(callbacks = {}) {
  const { onEarned, onDismissed, onFailed } = callbacks;

  if (!_provider) {
    onFailed?.({ reason: 'uninitialized' });
    return { success: false, reason: 'uninitialized' };
  }

  // Check daily rewarded ad limit
  const dailyStatus = getDailyRewardedCoinStatus(_data);
  if (!dailyStatus.canWatch) {
    onFailed?.({ reason: 'daily_limit_reached' });
    return { success: false, reason: 'daily_limit_reached' };
  }

  const sessionId = `rw_coins_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  setFullScreenAdActive(true);

  // Set up one-shot event listeners for reward & dismissal
  let rewardEarned = false;

  const unsubEarned = onAdEvent(AD_EVENTS.REWARDED_EARNED, () => {
    rewardEarned = true;
    const res = grantRewardedCoins(_data, sessionId);
    _syncAdData();
    onEarned?.(res);
  });

  const unsubDismissed = onAdEvent(AD_EVENTS.REWARDED_DISMISSED, payload => {
    unsubEarned();
    unsubDismissed();
    setFullScreenAdActive(false);
    if (!rewardEarned) {
      onDismissed?.(payload);
    }
  });

  const unsubFailed = onAdEvent(AD_EVENTS.REWARDED_FAILED, err => {
    unsubEarned();
    unsubDismissed();
    unsubFailed();
    setFullScreenAdActive(false);
    onFailed?.(err);
  });

  try {
    const res = await _provider.showRewarded({ sessionId });
    return res;
  } catch (err) {
    unsubEarned();
    unsubDismissed();
    unsubFailed();
    setFullScreenAdActive(false);
    onFailed?.({ error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Watches a voluntary rewarded video ad to earn 1 free hint.
 */
export async function watchRewardedForHint(state, callbacks = {}) {
  const { onEarned, onDismissed, onFailed } = callbacks;

  if (!_provider) {
    onFailed?.({ reason: 'uninitialized' });
    return { success: false, reason: 'uninitialized' };
  }

  // Check if a valid hint actually exists on the current puzzle
  if (state) {
    const arrow = findHint(state);
    if (!arrow) {
      onFailed?.({ reason: 'no_hint_available' });
      return { success: false, reason: 'no_hint_available' };
    }
  }

  const sessionId = `rw_hint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  setFullScreenAdActive(true);

  let rewardEarned = false;

  const unsubEarned = onAdEvent(AD_EVENTS.REWARDED_EARNED, () => {
    rewardEarned = true;
    const res = grantRewardedHint(_data, sessionId, state?.level);
    _syncAdData();
    onEarned?.(res);
  });

  const unsubDismissed = onAdEvent(AD_EVENTS.REWARDED_DISMISSED, payload => {
    unsubEarned();
    unsubDismissed();
    setFullScreenAdActive(false);
    if (!rewardEarned) {
      onDismissed?.(payload);
    }
  });

  const unsubFailed = onAdEvent(AD_EVENTS.REWARDED_FAILED, err => {
    unsubEarned();
    unsubDismissed();
    unsubFailed();
    setFullScreenAdActive(false);
    onFailed?.(err);
  });

  try {
    const res = await _provider.showRewarded({ sessionId });
    return res;
  } catch (err) {
    unsubEarned();
    unsubDismissed();
    unsubFailed();
    setFullScreenAdActive(false);
    onFailed?.({ error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Displays Google UMP Privacy Options modal.
 */
export async function openPrivacyOptions() {
  if (!_provider) return { success: false };
  return await showPrivacyOptions(_provider.admob);
}

/**
 * Returns daily rewarded coins watch status for UI indicators.
 */
export function getDailyRewardStatus() {
  if (!_data) return { canWatch: true, count: 0, max: 3, remaining: 3 };
  return getDailyRewardedCoinStatus(_data);
}

/**
 * Returns current ad system state.
 */
export function getAdState() {
  return _provider ? _provider.state : AD_STATES.UNINITIALIZED;
}

/**
 * Records that a level was completed to advance interstitial spacing counter.
 */
export function onLevelFinished(level) {
  recordLevelCompleted(level);
  _syncAdData();
}

/**
 * Syncs frequency tracking data into main save object.
 */
function _syncAdData() {
  if (_data && _saveData) {
    _data.ads = getFrequencyState();
    _saveData(_data);
  }
}

export {
  hasFreeHintToken,
  consumeFreeHintToken,
  handleScreenChange,
  isFullScreenAdActive
};
