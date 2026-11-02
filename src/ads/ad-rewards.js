/* Rewarded Ad Reward Ledger & Token Engine.
   Guarantees:
     - Idempotent reward processing via session ID deduplication
     - Daily rewarded coin cap (max 3/day) with local calendar rollover
     - Seamless integration with existing central wallet.js
     - Persistent free-hint token delivery to prevent stale hints on navigation */

import { REWARDED_RULES } from './ad-config.js';
import { awardCoins } from '../economy/wallet.js';
import { todayDateKey } from '../economy/rewards.js';

let _processedSessionIds = new Set();

/**
 * Returns daily rewarded video coin claim status.
 */
export function getDailyRewardedCoinStatus(data) {
  if (!data.economy) return { canWatch: true, count: 0, max: REWARDED_RULES.MAX_DAILY_COIN_REWARDS };

  if (!data.economy.rewardedAdUsage || typeof data.economy.rewardedAdUsage !== 'object') {
    data.economy.rewardedAdUsage = {
      dateKey: todayDateKey(),
      count: 0
    };
  }

  const usage = data.economy.rewardedAdUsage;
  const today = todayDateKey();

  // Rollover on new calendar day
  if (usage.dateKey !== today) {
    usage.dateKey = today;
    usage.count = 0;
  }

  const count = Math.max(0, Number(usage.count) || 0);
  const max = REWARDED_RULES.MAX_DAILY_COIN_REWARDS;

  return {
    canWatch: count < max,
    count,
    max,
    remaining: Math.max(0, max - count)
  };
}

/**
 * Grants 50 coins upon confirmed rewarded ad completion.
 * Idempotently prevents double-crediting if duplicate callbacks fire.
 */
export function grantRewardedCoins(data, sessionId, meta = {}) {
  const sid = String(sessionId || `ad_session_${Date.now()}`);

  if (_processedSessionIds.has(sid)) {
    return {
      success: false,
      reason: 'duplicate_callback',
      sessionId: sid,
      alreadyProcessed: true
    };
  }

  const status = getDailyRewardedCoinStatus(data);
  if (!status.canWatch) {
    return {
      success: false,
      reason: 'daily_limit_reached',
      count: status.count,
      max: status.max
    };
  }

  // Increment daily counter
  data.economy.rewardedAdUsage.count++;
  _processedSessionIds.add(sid);

  const amount = REWARDED_RULES.COIN_REWARD_AMOUNT;
  const rewardId = `rw_ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Award via central wallet
  const result = awardCoins(data, amount, 'rewarded_ad', 'Watched rewarded video ad (+50 🪙)', {
    rewardId,
    sessionId: sid,
    rewardType: 'coins',
    ...meta
  });

  // Track in local ad reward ledger
  if (!Array.isArray(data.economy.adRewardLedger)) {
    data.economy.adRewardLedger = [];
  }
  data.economy.adRewardLedger.unshift({
    rewardId,
    sessionId: sid,
    rewardType: 'coins',
    amount,
    timestamp: Date.now(),
    status: 'granted'
  });

  // Keep ledger bounded to prevent storage growth
  if (data.economy.adRewardLedger.length > 50) {
    data.economy.adRewardLedger.length = 50;
  }

  return {
    success: true,
    amount,
    coinsAwarded: amount,
    balance: result.balance,
    rewardId,
    sessionId: sid,
    remainingDaily: status.remaining - 1
  };
}

/**
 * Grants a free hint or stores a persistent free-hint token if gameplay navigated away.
 */
export function grantRewardedHint(data, sessionId, currentLevel = null) {
  const sid = String(sessionId || `hint_session_${Date.now()}`);

  if (_processedSessionIds.has(sid)) {
    return {
      success: false,
      reason: 'duplicate_callback',
      sessionId: sid,
      alreadyProcessed: true
    };
  }

  _processedSessionIds.add(sid);

  if (typeof data.economy.freeHintTokens !== 'number') {
    data.economy.freeHintTokens = 0;
  }
  data.economy.freeHintTokens += REWARDED_RULES.HINT_REWARD_AMOUNT;

  const rewardId = `rw_hint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!Array.isArray(data.economy.adRewardLedger)) {
    data.economy.adRewardLedger = [];
  }
  data.economy.adRewardLedger.unshift({
    rewardId,
    sessionId: sid,
    rewardType: 'hint',
    amount: 1,
    targetLevel: currentLevel,
    timestamp: Date.now(),
    status: 'granted'
  });

  return {
    success: true,
    tokens: data.economy.freeHintTokens,
    tokensRemaining: data.economy.freeHintTokens,
    rewardId,
    sessionId: sid
  };
}

/**
 * Checks if the player has any stored free-hint tokens.
 */
export function hasFreeHintToken(data) {
  return (data?.economy?.freeHintTokens || 0) > 0;
}

/**
 * Consumes one free-hint token.
 */
export function consumeFreeHintToken(data) {
  if (!hasFreeHintToken(data)) return false;
  data.economy.freeHintTokens = Math.max(0, (data.economy.freeHintTokens || 0) - 1);
  return true;
}

/**
 * Clears processed session set (for testing reset).
 */
export function clearProcessedAdSessions() {
  _processedSessionIds.clear();
}
