/* Interstitial Ad Frequency & Natural Transition Controller.
   Enforces non-intrusive pacing rules:
     - Minimum 5 completed levels between interstitials
     - Minimum 180 seconds between interstitial displays
     - Never on levels 1–3
     - Never during tutorials
     - Never during active puzzle solving or active dialogs */

import { INTERSTITIAL_RULES } from './ad-config.js';

let _freqState = {
  lastInterstitialTime: 0,
  levelsCompletedSinceLastAd: 0,
  totalInterstitialsShown: 0
};

/**
 * Initializes frequency controller from persistent save data.
 */
export function initFrequency(savedAdData = null) {
  if (savedAdData && typeof savedAdData === 'object') {
    _freqState = {
      lastInterstitialTime: Number(savedAdData.lastInterstitialTime) || 0,
      levelsCompletedSinceLastAd: Math.max(0, Number(savedAdData.levelsCompletedSinceLastAd) || 0),
      totalInterstitialsShown: Math.max(0, Number(savedAdData.totalInterstitialsShown) || 0)
    };
  } else {
    _freqState = {
      lastInterstitialTime: 0,
      levelsCompletedSinceLastAd: 0,
      totalInterstitialsShown: 0
    };
  }
}

/**
 * Evaluates all frequency and context rules to determine if an interstitial may be displayed.
 */
export function shouldShowInterstitial(context = {}) {
  const {
    currentLevel = 1,
    isTutorial = false,
    anyModalOpen = false,
    isPuzzleActive = false,
    now = Date.now()
  } = context;

  // 1. Suppress during tutorials
  if (isTutorial) {
    return { allowed: false, eligible: false, reason: 'tutorial_active' };
  }

  // 2. Suppress on first 3 completed levels (must reach level 4+)
  if (currentLevel < INTERSTITIAL_RULES.FIRST_ALLOWED_LEVEL) {
    return { allowed: false, eligible: false, reason: 'early_level_protection' };
  }

  // 3. Suppress during active gameplay or while modals are open
  if (isPuzzleActive) {
    return { allowed: false, eligible: false, reason: 'puzzle_active' };
  }
  if (anyModalOpen) {
    return { allowed: false, eligible: false, reason: 'modal_open' };
  }

  // 4. Check level spacing (minimum 5 levels since last interstitial)
  if (_freqState.levelsCompletedSinceLastAd < INTERSTITIAL_RULES.MIN_LEVELS_BETWEEN_ADS) {
    return {
      allowed: false,
      eligible: false,
      reason: 'level_frequency_cooldown',
      levelsRemaining: INTERSTITIAL_RULES.MIN_LEVELS_BETWEEN_ADS - _freqState.levelsCompletedSinceLastAd
    };
  }

  // 5. Check time spacing (minimum 180 seconds since last interstitial)
  const elapsedSec = (now - _freqState.lastInterstitialTime) / 1000;
  if (_freqState.lastInterstitialTime > 0 && elapsedSec < INTERSTITIAL_RULES.MIN_SECONDS_BETWEEN_ADS) {
    return {
      allowed: false,
      eligible: false,
      reason: 'time_frequency_cooldown',
      secondsRemaining: Math.ceil(INTERSTITIAL_RULES.MIN_SECONDS_BETWEEN_ADS - elapsedSec)
    };
  }

  return { allowed: true, eligible: true };
}

/**
 * Records that a level was completed, advancing the level counter.
 */
export function recordLevelCompleted(level) {
  _freqState.levelsCompletedSinceLastAd++;
  return _freqState.levelsCompletedSinceLastAd;
}

/**
 * Records that an interstitial ad was successfully displayed, resetting cooldowns.
 */
export function recordInterstitialShown(now = Date.now()) {
  _freqState.lastInterstitialTime = now;
  _freqState.levelsCompletedSinceLastAd = 0;
  _freqState.totalInterstitialsShown++;
  return { ..._freqState };
}

/**
 * Returns serializable frequency state for persistence.
 */
export function getFrequencyState() {
  return { ..._freqState };
}

/**
 * Test helper: manually set frequency state.
 */
export function setFrequencyState(state) {
  _freqState = { ..._freqState, ...state };
}
