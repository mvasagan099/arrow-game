/* Centralized Offline Coin Wallet Service.
   Guarantees atomic balance mutations, non-negative balance checks,
   lifetime earnings/spend tracking, and transaction audit trails. */

import { INITIAL_COINS } from './economy-config.js';
import { recordTransaction } from './transactions.js';

export function createDefaultEconomy() {
  return {
    v: 1,
    coins: INITIAL_COINS,
    totalEarned: INITIAL_COINS,
    totalSpent: 0,
    claimedLevelRewards: [],     // level numbers for which base completion reward (+10) was claimed
    claimedPerfectBonuses: [],   // level numbers for which perfect clear bonus (+5) was claimed
    claimedDailyChallenges: [],  // dateKey strings (e.g. "2026-11-02") claimed
    dailyCalendar: {
      lastClaimDate: null,
      dayIndex: 0,               // 0..6 (corresponds to Days 1..7)
      streak: 0,
      claimedCount: 0
    },
    ownedCosmetics: [
      'arrow_default',
      'board_default',
      'trail_default'
    ],
    equippedCosmetics: {
      arrow: 'arrow_default',
      board: 'board_default',
      trail: 'trail_default'
    },
    claimedAchievements: [],     // achievement ids that have awarded coins
    transactions: [
      {
        id: `tx_init_${Date.now()}`,
        type: 'credit',
        amount: INITIAL_COINS,
        balanceAfter: INITIAL_COINS,
        desc: 'Welcome bonus',
        meta: { reason: 'initial_bonus' },
        timestamp: Date.now()
      }
    ]
  };
}

export function ensureEconomy(data) {
  if (!data) return createDefaultEconomy();
  if (!data.economy || typeof data.economy !== 'object') {
    data.economy = createDefaultEconomy();
  } else {
    // Fill any missing subfields defensively
    const defaults = createDefaultEconomy();
    data.economy.v = defaults.v;
    if (typeof data.economy.coins !== 'number' || data.economy.coins < 0) {
      data.economy.coins = Math.max(0, Number(data.economy.coins) || 0);
    }
    if (typeof data.economy.totalEarned !== 'number') {
      data.economy.totalEarned = data.economy.coins;
    }
    if (typeof data.economy.totalSpent !== 'number') {
      data.economy.totalSpent = 0;
    }
    if (!Array.isArray(data.economy.claimedLevelRewards)) {
      data.economy.claimedLevelRewards = [];
    }
    if (!Array.isArray(data.economy.claimedPerfectBonuses)) {
      data.economy.claimedPerfectBonuses = [];
    }
    if (!Array.isArray(data.economy.claimedDailyChallenges)) {
      data.economy.claimedDailyChallenges = [];
    }
    if (!data.economy.dailyCalendar || typeof data.economy.dailyCalendar !== 'object') {
      data.economy.dailyCalendar = defaults.dailyCalendar;
    }
    if (!Array.isArray(data.economy.ownedCosmetics)) {
      data.economy.ownedCosmetics = [...defaults.ownedCosmetics];
    }
    if (!data.economy.equippedCosmetics || typeof data.economy.equippedCosmetics !== 'object') {
      data.economy.equippedCosmetics = { ...defaults.equippedCosmetics };
    }
    if (!Array.isArray(data.economy.claimedAchievements)) {
      data.economy.claimedAchievements = [];
    }
    if (!Array.isArray(data.economy.transactions)) {
      data.economy.transactions = [];
    }
  }
  return data.economy;
}

export function getBalance(data) {
  const eco = ensureEconomy(data);
  return Math.max(0, Math.floor(eco.coins));
}

export function canAfford(data, cost) {
  const amount = Math.max(0, Math.floor(Number(cost) || 0));
  return getBalance(data) >= amount;
}

export function awardCoins(data, amount, reason = 'reward', desc = '', meta = {}) {
  const eco = ensureEconomy(data);
  const qty = Math.max(0, Math.floor(Number(amount) || 0));
  if (qty <= 0) {
    return { success: false, balance: eco.coins, amount: 0 };
  }

  eco.coins += qty;
  eco.totalEarned = (eco.totalEarned || 0) + qty;

  const tx = recordTransaction(eco, {
    type: 'credit',
    amount: qty,
    balanceAfter: eco.coins,
    desc: desc || `Earned ${qty} coins (${reason})`,
    meta: { ...meta, reason }
  });

  return {
    success: true,
    balance: eco.coins,
    amount: qty,
    tx
  };
}

export function deductCoins(data, amount, reason = 'purchase', desc = '', meta = {}) {
  const eco = ensureEconomy(data);
  const cost = Math.max(0, Math.floor(Number(amount) || 0));

  if (cost <= 0) {
    return { success: true, balance: eco.coins, amount: 0 };
  }

  if (eco.coins < cost) {
    return {
      success: false,
      reason: 'insufficient_funds',
      balance: eco.coins,
      shortfall: cost - eco.coins
    };
  }

  eco.coins = Math.max(0, eco.coins - cost);
  eco.totalSpent = (eco.totalSpent || 0) + cost;

  const tx = recordTransaction(eco, {
    type: 'debit',
    amount: -cost,
    balanceAfter: eco.coins,
    desc: desc || `Spent ${cost} coins (${reason})`,
    meta: { ...meta, reason }
  });

  return {
    success: true,
    balance: eco.coins,
    amount: cost,
    tx
  };
}
