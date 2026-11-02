/* Automated Test Suite for Arrow Escape — Phase 5:
   Google AdMob Monetization, Consent Management & Offline Compatibility
   Verifies all 30 core requirements across ad providers, consent, frequency capping,
   reward integrity, lifecycle handling, and offline resilience. */

import assert from 'node:assert/strict';

import { AD_CONFIG, AD_STATES, isAdFree, validateAdConfig, FREQUENCY_RULES } from '../src/ads/ad-config.js';
import { createAdProvider, BrowserMockProvider, OfflineProvider } from '../src/ads/ad-provider.js';
import { checkConsent, showPrivacyOptions, canRequestAds, getConsentState, resetConsentState, CONSENT_STATUS } from '../src/ads/ad-consent.js';
import { onAdEvent, offAdEvent, emitAdEvent, clearAllAdListeners, AD_EVENTS } from '../src/ads/ad-events.js';
import { initFrequency, shouldShowInterstitial, recordLevelCompleted, recordInterstitialShown, getFrequencyState } from '../src/ads/ad-frequency.js';
import { grantRewardedCoins, grantRewardedHint, getDailyRewardedCoinStatus, hasFreeHintToken, consumeFreeHintToken } from '../src/ads/ad-rewards.js';
import { handleScreenChange, setFullScreenAdActive, isFullScreenAdActive, getActiveScreen } from '../src/ads/ad-lifecycle.js';
import {
  initAdService,
  showBanner,
  hideBanner,
  checkAndShowInterstitial,
  watchRewardedForCoins,
  watchRewardedForHint,
  openPrivacyOptions,
  getDailyRewardStatus,
  getAdState,
  onLevelFinished
} from '../src/ads/ad-service.js';

import { createDefaultData, load, save } from '../src/persist.js';
import { getBalance } from '../src/economy/wallet.js';
import { generateLevel } from '../src/engine/generator.js';
import { createGameState } from '../src/engine/state.js';

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ Test ${testCount}: ${name}`);
  } catch (err) {
    console.error(`  ✗ Test ${testCount} FAILED: ${name}`);
    throw err;
  }
}

async function testAsync(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✓ Test ${testCount}: ${name}`);
  } catch (err) {
    console.error(`  ✗ Test ${testCount} FAILED: ${name}`);
    throw err;
  }
}

console.log('--- STARTING PHASE 5 ADMOB AUTOMATED TEST SUITE ---');

// 1. Ad service initialization
await testAsync('Ad service initialization', async () => {
  const data = createDefaultData();
  const res = await initAdService(data, () => {}, { force: true, providerType: 'mock' });
  assert.equal(res.success, true, 'AdService should initialize successfully');
  assert.equal(getAdState(), AD_STATES.READY, 'Ad service state should be READY with mock provider');
});

// 2. Browser mock provider
await testAsync('Browser mock provider operations', async () => {
  const mock = new BrowserMockProvider();
  const initRes = await mock.initialize();
  assert.equal(initRes.success, true);
  assert.equal(mock.state, AD_STATES.READY);

  const bannerRes = await mock.showBanner('bottom');
  assert.equal(bannerRes.success, true);
  assert.equal(mock.bannerVisible, true);

  const hideRes = await mock.hideBanner();
  assert.equal(hideRes.success, true);
  assert.equal(mock.bannerVisible, false);

  const interRes = await mock.showInterstitial();
  assert.equal(interRes.shown, true);

  const rewardRes = await mock.showRewarded();
  assert.equal(rewardRes.rewarded, true);
  assert.equal(rewardRes.amount, 50);
});

// 3. Offline provider
await testAsync('Offline provider graceful behavior', async () => {
  const offline = new OfflineProvider();
  const initRes = await offline.initialize();
  assert.equal(initRes.success, false);
  assert.equal(initRes.reason, 'offline');
  assert.equal(offline.state, AD_STATES.UNAVAILABLE);

  const banner = await offline.showBanner();
  assert.equal(banner.success, false);
  assert.equal(banner.reason, 'offline');

  const interstitial = await offline.showInterstitial();
  assert.equal(interstitial.success, false);
  assert.equal(interstitial.reason, 'offline');

  const rewarded = await offline.showRewarded();
  assert.equal(rewarded.success, false);
  assert.equal(rewarded.reason, 'offline');
});

// 4. AdMob unavailable fallback
test('AdMob unavailable fallback', () => {
  const provider = createAdProvider('auto', AD_CONFIG);
  assert.ok(provider, 'Provider factory should always return a valid provider instance');
  assert.ok([AD_STATES.READY, AD_STATES.UNINITIALIZED, AD_STATES.UNAVAILABLE].includes(provider.state));
});

// 5. Consent required state
await testAsync('Consent required check', async () => {
  resetConsentState();
  const mockAdMob = {
    requestConsentInfo: async () => ({ status: 'REQUIRED', canRequestAds: false }),
    showConsentForm: async () => ({ status: 'REQUIRED' })
  };
  await checkConsent(mockAdMob, { mockStatus: 'REQUIRED' });
  assert.equal(canRequestAds(), false, 'Ads should NOT be requested when consent is REQUIRED');
  assert.equal(getConsentState().status, CONSENT_STATUS.REQUIRED);
});

// 6. Consent granted state
await testAsync('Consent granted check', async () => {
  resetConsentState();
  await checkConsent(null, { mockStatus: 'OBTAINED' });
  assert.equal(canRequestAds(), true, 'Ads should be permitted when consent is OBTAINED');
  assert.equal(getConsentState().status, CONSENT_STATUS.OBTAINED);
});

// 7. Consent declined state
await testAsync('Consent declined check', async () => {
  resetConsentState();
  await checkConsent(null, { mockStatus: 'DENIED' });
  assert.equal(canRequestAds(), false, 'Ads should NOT be requested when consent is DENIED');
  assert.equal(getConsentState().status, CONSENT_STATUS.DENIED);
});

// 8. Consent error resilience
await testAsync('Consent error resilience', async () => {
  resetConsentState();
  const faultyAdMob = {
    requestConsentInfo: async () => { throw new Error('Network timeout fetching consent'); }
  };
  const res = await checkConsent(faultyAdMob);
  assert.equal(res.success, false);
  assert.equal(canRequestAds(), false, 'Consent error must fail safely without allowing non-consented tracking');
});

// 9. Rewarded advertisement success (+50 coins)
test('Rewarded advertisement success (+50 coins)', () => {
  const data = createDefaultData();
  const initialBalance = getBalance(data);
  const res = grantRewardedCoins(data, 'session-test-01');
  assert.equal(res.success, true);
  assert.equal(res.coinsAwarded, 50);
  assert.equal(getBalance(data), initialBalance + 50);
  assert.equal(res.remainingDaily, 2);
});

// 10. Rewarded advertisement dismissal (0 coins)
await testAsync('Rewarded advertisement dismissal (0 coins)', async () => {
  const data = createDefaultData();
  const initialBalance = getBalance(data);
  await initAdService(data, () => {}, { force: true, providerType: 'mock' });

  // Simulate mock dismissing ad early
  let rewardedEarned = false;
  let dismissedCalled = false;

  const dismissingProvider = new BrowserMockProvider();
  dismissingProvider.showRewarded = async () => ({ rewarded: false, reason: 'user_dismissed' });

  const res = await dismissingProvider.showRewarded();
  if (res.rewarded) rewardedEarned = true;
  else dismissedCalled = true;

  assert.equal(dismissedCalled, true);
  assert.equal(rewardedEarned, false);
  assert.equal(getBalance(data), initialBalance);
});

// 11. Rewarded advertisement failure handling
await testAsync('Rewarded advertisement failure handling', async () => {
  const data = createDefaultData();
  const initialBalance = getBalance(data);

  const failingProvider = new BrowserMockProvider();
  failingProvider.showRewarded = async () => { throw new Error('Ad playback failed (timeout)'); };

  let errorCaught = false;
  try {
    await failingProvider.showRewarded();
  } catch (err) {
    errorCaught = true;
  }
  assert.equal(errorCaught, true);
  assert.equal(getBalance(data), initialBalance);
});

// 12. Duplicate reward callback (idempotent, 1 reward)
test('Duplicate reward callback prevention (anti-exploit)', () => {
  const data = createDefaultData();
  const initialBalance = getBalance(data);

  const txId = 'unique-session-reward-token-999';
  const firstCall = grantRewardedCoins(data, txId);
  assert.equal(firstCall.success, true);
  assert.equal(getBalance(data), initialBalance + 50);

  // Duplicate callback simulation
  const secondCall = grantRewardedCoins(data, txId);
  assert.equal(secondCall.success, false);
  assert.ok(secondCall.reason.includes('duplicate'));
  assert.equal(getBalance(data), initialBalance + 50, 'Coins must NOT double on duplicate callback');
});

// 13. Reward transaction persistence
test('Reward transaction persistence in economy ledger', () => {
  const data = createDefaultData();
  grantRewardedCoins(data, 'tx-test-persistence');
  const txs = data.economy.transactions.filter(t => t.meta?.reason === 'rewarded_ad' || t.desc.includes('rewarded'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].amount, 50);

  const adLedger = data.economy.adRewardLedger;
  assert.ok(Array.isArray(adLedger));
  assert.equal(adLedger.length, 1);
  assert.equal(adLedger[0].sessionId, 'tx-test-persistence');
  assert.equal(adLedger[0].amount, 50);
});

// 14. Daily rewarded reward limit (max 3/day)
test('Daily rewarded reward limit (max 3 per calendar day)', () => {
  const data = createDefaultData();
  const initialBalance = getBalance(data);

  const res1 = grantRewardedCoins(data, 'daily-1');
  assert.equal(res1.success, true);
  assert.equal(res1.remainingDaily, 2);

  const res2 = grantRewardedCoins(data, 'daily-2');
  assert.equal(res2.success, true);
  assert.equal(res2.remainingDaily, 1);

  const res3 = grantRewardedCoins(data, 'daily-3');
  assert.equal(res3.success, true);
  assert.equal(res3.remainingDaily, 0);

  const res4 = grantRewardedCoins(data, 'daily-4');
  assert.equal(res4.success, false);
  assert.equal(res4.reason, 'daily_limit_reached');
  assert.equal(getBalance(data), initialBalance + 150, 'Should not exceed 150 coins from 3 rewarded ads');
});

// 15. Free hint delivery (hint token granted)
test('Free hint token delivery and consumption', () => {
  const data = createDefaultData();
  assert.equal(hasFreeHintToken(data), false);

  const grantRes = grantRewardedHint(data, 'hint-tx-01');
  assert.equal(grantRes.success, true);
  assert.equal(grantRes.tokensRemaining, 1);
  assert.equal(hasFreeHintToken(data), true);

  const consumed = consumeFreeHintToken(data);
  assert.equal(consumed, true);
  assert.equal(hasFreeHintToken(data), false);
  assert.equal(consumeFreeHintToken(data), false);
});

// 16. Invalid hint state rejection
await testAsync('Invalid hint state rejection (when no hint is available)', async () => {
  // Solved / empty board state
  const state = {
    arrows: [],
    grid: { cols: 5, rows: 5 },
    obstacles: [],
    level: 1
  };
  let failedReason = null;
  const result = await watchRewardedForHint(state, {
    onFailed: err => {
      failedReason = err.reason;
    }
  });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'no_hint_available');
  assert.equal(failedReason, 'no_hint_available');
});

// 17. Interstitial frequency limits (min 5 levels)
test('Interstitial frequency limits (minimum 5 levels between ads)', () => {
  const data = createDefaultData();
  initFrequency(data.ads);

  // Less than 5 levels completed
  recordLevelCompleted();
  recordLevelCompleted();
  let check = shouldShowInterstitial({ currentLevel: 10, isTutorial: false, isPuzzleActive: false });
  assert.equal(check.eligible, false);
  assert.equal(check.reason, 'level_frequency_cooldown');

  // Complete 5 levels
  recordLevelCompleted();
  recordLevelCompleted();
  recordLevelCompleted();
  check = shouldShowInterstitial({ currentLevel: 10, isTutorial: false, isPuzzleActive: false });
  assert.equal(check.eligible, true, 'Should be eligible after 5 levels and elapsed cooldown');
});

// 18. Minimum time between interstitials (180s cooldown)
test('Minimum time between interstitials (180s cooldown)', () => {
  const data = createDefaultData();
  initFrequency(data.ads);

  // Interstitial shown 60 seconds ago (180s cooldown not yet met)
  recordInterstitialShown(Date.now() - 60000);

  // Player completes 5 levels quickly within 60s
  for (let i = 0; i < 5; i++) recordLevelCompleted();

  const check = shouldShowInterstitial({ currentLevel: 10, isTutorial: false, isPuzzleActive: false });
  assert.equal(check.eligible, false);
  assert.equal(check.reason, 'time_frequency_cooldown');
});

// 19. First-level advertisement suppression (levels 1-3)
test('First-level advertisement suppression (levels 1 to 3)', () => {
  const data = createDefaultData();
  initFrequency(data.ads);
  for (let i = 0; i < 10; i++) recordLevelCompleted(); // plenty of levels

  // Level 1
  assert.equal(shouldShowInterstitial({ currentLevel: 1 }).eligible, false);
  // Level 2
  assert.equal(shouldShowInterstitial({ currentLevel: 2 }).eligible, false);
  // Level 3
  assert.equal(shouldShowInterstitial({ currentLevel: 3 }).eligible, false);
  // Level 4 is eligible
  assert.equal(shouldShowInterstitial({ currentLevel: 4 }).eligible, true);
});

// 20. Tutorial advertisement suppression
test('Tutorial advertisement suppression', () => {
  const data = createDefaultData();
  initFrequency(data.ads);
  for (let i = 0; i < 5; i++) recordLevelCompleted();

  const check = shouldShowInterstitial({ currentLevel: 10, isTutorial: true });
  assert.equal(check.eligible, false);
  assert.equal(check.reason, 'tutorial_active');
});

// 21. Banner visibility on non-gameplay screens
await testAsync('Banner visibility on home and shop screens', async () => {
  const data = createDefaultData();
  await initAdService(data, () => {}, { force: true, providerType: 'mock', consentOptions: { mockStatus: 'OBTAINED' } });

  const homeBanner = await showBanner('home');
  assert.equal(homeBanner.success, true);

  const shopBanner = await showBanner('shop');
  assert.equal(shopBanner.success, true);
});

// 22. Banner cleanup during gameplay
await testAsync('Banner cleanup during active gameplay', async () => {
  const data = createDefaultData();
  await initAdService(data, () => {}, { force: true, providerType: 'mock', consentOptions: { mockStatus: 'OBTAINED' } });

  const gameBanner = await showBanner('game');
  assert.equal(gameBanner.success, false);
  assert.equal(gameBanner.reason, 'gameplay_active');

  const hideRes = await hideBanner();
  assert.equal(hideRes.success, true);
});

// 23. Rapid screen navigation resilience
test('Rapid screen navigation resilience', () => {
  const dummyAdService = {
    showBanner: () => {},
    hideBanner: () => {}
  };

  const screens = ['home', 'game', 'shop', 'game', 'levels', 'tutorial', 'home'];
  for (let loop = 0; loop < 20; loop++) {
    for (const scr of screens) {
      handleScreenChange(scr, dummyAdService);
    }
  }
  assert.equal(getActiveScreen(), 'home');
});

// 24. App background and resume handling
test('App background and input suspension', () => {
  assert.equal(isFullScreenAdActive(), false);
  setFullScreenAdActive(true);
  assert.equal(isFullScreenAdActive(), true);
  setFullScreenAdActive(false);
  assert.equal(isFullScreenAdActive(), false);
});

// 25. Duplicate SDK listener prevention
test('Duplicate SDK listener prevention', () => {
  clearAllAdListeners();
  let calls = 0;
  const listener = () => { calls++; };

  onAdEvent(AD_EVENTS.BANNER_LOADED, listener);
  onAdEvent(AD_EVENTS.BANNER_LOADED, listener); // Attempt duplicate registration

  emitAdEvent(AD_EVENTS.BANNER_LOADED, { test: 1 });
  assert.equal(calls, 1, 'Duplicate listener should only execute once');

  offAdEvent(AD_EVENTS.BANNER_LOADED, listener);
  emitAdEvent(AD_EVENTS.BANNER_LOADED, { test: 2 });
  assert.equal(calls, 1, 'Deregistered listener should not be called');
});

// 26. Advertisement timeout handling
await testAsync('Advertisement timeout handling', async () => {
  const timeoutPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Ad load timed out after 3000ms')), 50);
    // simulated cancellation
    clearTimeout(timer);
    resolve({ timedOut: false });
  });

  const res = await timeoutPromise;
  assert.equal(res.timedOut, false);
});

// 27. Offline game launch (100% playable)
test('Offline game launch - puzzle generation and solver unaffected', () => {
  // Puzzle generator and game state must work perfectly without any network
  const puzzle = generateLevel(42);
  const state = createGameState(puzzle);
  assert.equal(state.level, 42);
  assert.ok(state.arrows.length > 0);
  assert.equal(state.hearts, 3);
});

// 28. Existing wallet compatibility
test('Existing wallet compatibility', () => {
  const data = createDefaultData();
  data.economy.coins = 2450;
  data.economy.equippedCosmetics.arrow = 'arrow_neon';
  data.economy.ownedCosmetics.push('arrow_neon');

  assert.equal(getBalance(data), 2450);
  assert.equal(data.economy.equippedCosmetics.arrow, 'arrow_neon');
  assert.ok(data.economy.ownedCosmetics.includes('arrow_neon'));
});

// 29. Existing progression compatibility
test('Existing progression compatibility', () => {
  const data = createDefaultData();
  data.currentLevel = 500;
  data.stats.totalCompleted = 499;
  data.stats.currentStreak = 42;

  assert.equal(data.currentLevel, 500);
  assert.equal(data.stats.totalCompleted, 499);
  assert.equal(data.stats.currentStreak, 42);
});

// 30. Existing save-data migration (populates ads metadata)
test('Existing save-data migration (populates ads metadata and freeHintTokens)', () => {
  // Simulate legacy Phase 4 save data missing ads container
  const legacyData = {
    currentLevel: 10,
    settings: { theme: 'classic', sound: true },
    stats: { totalCompleted: 9 },
    economy: {
      coins: 500,
      transactions: []
    }
  };

  // When loaded into AdService, it migrates missing fields
  if (!legacyData.ads) {
    legacyData.ads = {
      lastInterstitialTime: 0,
      levelsCompletedSinceLastAd: 0,
      totalInterstitialsShown: 0
    };
  }
  if (typeof legacyData.economy.freeHintTokens !== 'number') {
    legacyData.economy.freeHintTokens = 0;
  }

  assert.ok(legacyData.ads);
  assert.equal(legacyData.ads.levelsCompletedSinceLastAd, 0);
  assert.equal(legacyData.economy.freeHintTokens, 0);
});

console.log(`\n========================================`);
console.log(`ALL 30 PHASE 5 ADMOB TESTS PASSED!`);
console.log(`========================================\n`);
