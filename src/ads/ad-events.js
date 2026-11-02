/* Advertisement Event Hub for Arrow Escape.
   Manages state change emissions and ad lifecycle events with
   duplicate listener protection. */

export const AD_EVENTS = {
  STATE_CHANGE: 'state_change',
  BANNER_LOADED: 'banner_loaded',
  BANNER_FAILED: 'banner_failed',
  BANNER_HIDDEN: 'banner_hidden',
  INTERSTITIAL_LOADED: 'interstitial_loaded',
  INTERSTITIAL_SHOWN: 'interstitial_shown',
  INTERSTITIAL_DISMISSED: 'interstitial_dismissed',
  INTERSTITIAL_FAILED: 'interstitial_failed',
  REWARDED_LOADED: 'rewarded_loaded',
  REWARDED_SHOWN: 'rewarded_shown',
  REWARDED_EARNED: 'rewarded_earned',
  REWARDED_DISMISSED: 'rewarded_dismissed',
  REWARDED_FAILED: 'rewarded_failed',
  CONSENT_UPDATED: 'consent_updated'
};

const _listeners = new Map();

/**
 * Subscribes to an ad event. Prevents duplicate listener registrations.
 */
export function onAdEvent(event, callback) {
  if (typeof callback !== 'function') return () => {};
  if (!_listeners.has(event)) {
    _listeners.set(event, new Set());
  }
  const set = _listeners.get(event);
  set.add(callback);
  return () => offAdEvent(event, callback);
}

/**
 * Unsubscribes from an ad event.
 */
export function offAdEvent(event, callback) {
  if (_listeners.has(event)) {
    const set = _listeners.get(event);
    set.delete(callback);
    if (set.size === 0) {
      _listeners.delete(event);
    }
  }
}

/**
 * Emits an ad event with a payload to all registered listeners.
 */
export function emitAdEvent(event, payload = {}) {
  if (!_listeners.has(event)) return;
  const set = _listeners.get(event);
  for (const fn of Array.from(set)) {
    try {
      fn(payload);
    } catch (err) {
      console.warn(`[AdEvents] Error in listener for "${event}":`, err);
    }
  }
}

/**
 * Clears all registered event listeners (useful for testing and reset).
 */
export function clearAllAdListeners() {
  _listeners.clear();
}

/**
 * Returns count of active listeners for a given event.
 */
export function getAdListenerCount(event) {
  return _listeners.get(event)?.size || 0;
}
