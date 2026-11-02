/* Centralized Google AdMob Configuration for Arrow Escape.
   Defines official Google test IDs for development, production placeholders,
   explicit advertisement states, reward amounts, frequency rules,
   and format validation utilities. */

/* Explicit Advertisement States */
export const AD_STATES = {
  UNINITIALIZED: 'UNINITIALIZED',
  INITIALIZING: 'INITIALIZING',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  READY: 'READY',
  LOADING: 'LOADING',
  LOADED: 'LOADED',
  SHOWING: 'SHOWING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  UNAVAILABLE: 'UNAVAILABLE'
};

/* Official Google AdMob Test Identifiers (Android)
   Documentation: https://developers.google.com/admob/android/test-ads */
export const TEST_AD_CONFIG = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedId: 'ca-app-pub-3940256099942544/5224354917',
  isTesting: true
};

/* Production Configuration Placeholders
   To activate real ads before Google Play publishing:
   1. Replace placeholders with real IDs from Google AdMob console.
   2. Set isTesting to false.
   3. Update AndroidManifest.xml com.google.android.gms.ads.APPLICATION_ID meta-data. */
export const PROD_AD_CONFIG = {
  appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
  bannerId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  interstitialId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  rewardedId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  isTesting: false
};

/* Active Ad Configuration (Defaults to official Google test IDs) */
export const AD_CONFIG = {
  ...TEST_AD_CONFIG
};

/* Rewarded Advertisement Rules */
export const REWARDED_RULES = {
  COIN_REWARD_AMOUNT: 50,
  MAX_DAILY_COIN_REWARDS: 3,
  HINT_REWARD_AMOUNT: 1
};

/* Interstitial Advertisement Frequency & Safety Rules */
export const INTERSTITIAL_RULES = {
  MIN_LEVELS_BETWEEN_ADS: 5,
  MIN_SECONDS_BETWEEN_ADS: 180, // 3 minutes
  FIRST_ALLOWED_LEVEL: 4,       // Never show on levels 1..3
  SUPPRESS_IN_TUTORIALS: true
};
export const FREQUENCY_RULES = INTERSTITIAL_RULES;

/* Regex patterns for AdMob ID validation
   App ID uses tilde (~), Ad Unit ID uses slash (/) */
export const ADMOB_ID_PATTERNS = {
  APP_ID: /^ca-app-pub-\d{16}~\d{10}$/,
  AD_UNIT_ID: /^ca-app-pub-\d{16}\/\d{10}$/
};

/**
 * Validates whether an AdMob Application ID is syntactically well-formed.
 * Format: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
 */
export function isValidAppId(id) {
  if (typeof id !== 'string') return false;
  return ADMOB_ID_PATTERNS.APP_ID.test(id.trim());
}

/**
 * Validates whether an AdMob Ad Unit ID is syntactically well-formed.
 * Format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
 */
export function isValidAdUnitId(id) {
  if (typeof id !== 'string') return false;
  return ADMOB_ID_PATTERNS.AD_UNIT_ID.test(id.trim());
}

/**
 * Validates an entire AdMob configuration object.
 */
export function validateAdConfig(config) {
  const errors = [];
  if (!config) {
    return { valid: false, errors: ['Configuration object is null or undefined'] };
  }
  if (!isValidAppId(config.appId)) {
    errors.push(`Invalid App ID format: "${config.appId}". Must match "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY".`);
  }
  if (!isValidAdUnitId(config.bannerId)) {
    errors.push(`Invalid Banner Unit ID format: "${config.bannerId}". Must match "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY".`);
  }
  if (!isValidAdUnitId(config.interstitialId)) {
    errors.push(`Invalid Interstitial Unit ID format: "${config.interstitialId}". Must match "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY".`);
  }
  if (!isValidAdUnitId(config.rewardedId)) {
    errors.push(`Invalid Rewarded Unit ID format: "${config.rewardedId}". Must match "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY".`);
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Future preparation for one-time "Remove Ads" entitlement.
 * In Phase 5, always returns false (no real-money purchases).
 */
export function isAdFree(data) {
  if (!data) return false;
  // If an ad-free entitlement flag is added in a future phase, inspect it here:
  return !!data.settings?.isAdFree;
}
