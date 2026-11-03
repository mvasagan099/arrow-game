/* Google User Messaging Platform (UMP) Consent Management.
   Coordinates consent requests, form presentation, and privacy options
   via @capacitor-community/admob with safe offline fallbacks. */

import { emitAdEvent, AD_EVENTS } from './ad-events.js';

export const CONSENT_STATUS = {
  UNKNOWN: 'UNKNOWN',
  REQUIRED: 'REQUIRED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  OBTAINED: 'OBTAINED',
  DENIED: 'DENIED'
};

let _consentState = {
  status: CONSENT_STATUS.UNKNOWN,
  canRequestAds: false,
  privacyOptionsRequired: false,
  error: null,
  lastCheckedAt: 0
};

/**
 * Initializes and requests updated UMP consent information.
 * Uses native AdMob UMP APIs if running on native platform,
 * or simulated test flow in browser development mode.
 */
export async function checkConsent(admobPlugin = null, options = {}) {
  const isMock = options.isMock || !admobPlugin || options.mockStatus !== undefined;

  if (isMock) {
    // In browser/mock mode, consent can be configured or defaulted to NOT_REQUIRED / OBTAINED
    const status = options.mockStatus || CONSENT_STATUS.NOT_REQUIRED;
    const canRequest = (status !== CONSENT_STATUS.REQUIRED && status !== CONSENT_STATUS.DENIED);
    _consentState = {
      status,
      canRequestAds: canRequest,
      privacyOptionsRequired: status === CONSENT_STATUS.REQUIRED,
      error: null,
      lastCheckedAt: Date.now()
    };
    emitAdEvent(AD_EVENTS.CONSENT_UPDATED, { ..._consentState });
    return _consentState;
  }

  try {
    // Native AdMob UMP integration
    if (typeof admobPlugin.requestConsentInfo === 'function') {
      const info = await admobPlugin.requestConsentInfo({
        debugGeography: options.debugGeography || 0,
        testDeviceIdentifiers: options.testDevices || []
      });

      const isRequired = info.isConsentFormAvailable && info.status === 'REQUIRED';
      let formResult = null;

      if (isRequired && typeof admobPlugin.showConsentForm === 'function') {
        formResult = await admobPlugin.showConsentForm();
      }

      let canRequest = true;
      if (typeof admobPlugin.canRequestAds === 'function') {
        const craRes = await admobPlugin.canRequestAds();
        canRequest = typeof craRes === 'object' && craRes !== null ? !!craRes.value : !!craRes;
      } else if (typeof admobPlugin.canRequestAds === 'boolean') {
        canRequest = admobPlugin.canRequestAds;
      } else if (info.status === CONSENT_STATUS.REQUIRED || info.status === CONSENT_STATUS.DENIED || info.status === 'REQUIRED' || info.status === 'DENIED') {
        canRequest = false;
      }

      _consentState = {
        status: info.status || CONSENT_STATUS.OBTAINED,
        canRequestAds: canRequest,
        privacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
        error: null,
        lastCheckedAt: Date.now()
      };
    } else {
      // Plugin lacks UMP methods; treat as standard fallback
      _consentState = {
        status: CONSENT_STATUS.NOT_REQUIRED,
        canRequestAds: true,
        privacyOptionsRequired: false,
        error: null,
        lastCheckedAt: Date.now()
      };
    }
  } catch (err) {
    // Network unavailable or consent API failed; gracefully allow offline play
    _consentState = {
      status: CONSENT_STATUS.UNKNOWN,
      canRequestAds: false,
      privacyOptionsRequired: false,
      error: err.message || 'Consent request failed',
      lastCheckedAt: Date.now()
    };
  }

  emitAdEvent(AD_EVENTS.CONSENT_UPDATED, { ..._consentState });
  return { success: !_consentState.error, ..._consentState };
}

/**
 * Opens the Google UMP Privacy Options form so users can review or change ad choices.
 */
export async function showPrivacyOptions(admobPlugin = null, options = {}) {
  if (options.isMock || !admobPlugin) {
    return { success: true, simulated: true };
  }

  try {
    if (typeof admobPlugin.showPrivacyOptionsForm === 'function') {
      await admobPlugin.showPrivacyOptionsForm();
      let canRequest = true;
      if (typeof admobPlugin.canRequestAds === 'function') {
        const craRes = await admobPlugin.canRequestAds();
        canRequest = typeof craRes === 'object' && craRes !== null ? !!craRes.value : !!craRes;
      }
      _consentState.canRequestAds = canRequest;
      emitAdEvent(AD_EVENTS.CONSENT_UPDATED, { ..._consentState });
      return { success: true };
    }
    return { success: false, reason: 'unsupported' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Returns current consent state snapshot.
 */
export function getConsentState() {
  return { ..._consentState };
}

/**
 * Helper: checks if advertisements are legally permitted to be requested.
 */
export function canRequestAds() {
  return !!_consentState.canRequestAds;
}

/**
 * Test helper: resets consent state to default.
 */
export function resetConsentState() {
  _consentState = {
    status: CONSENT_STATUS.UNKNOWN,
    canRequestAds: false,
    privacyOptionsRequired: false,
    error: null,
    lastCheckedAt: 0
  };
}

/**
 * Test helper: sets mock consent state directly.
 */
export function setMockConsent(canRequest, status = CONSENT_STATUS.OBTAINED) {
  _consentState = {
    status,
    canRequestAds: !!canRequest,
    privacyOptionsRequired: false,
    error: null,
    lastCheckedAt: Date.now()
  };
  emitAdEvent(AD_EVENTS.CONSENT_UPDATED, { ..._consentState });
}
