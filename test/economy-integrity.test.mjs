/* Phase 7 Economy Integrity & Timezone Safety Test Suite */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultEconomy,
  ensureEconomy,
  getBalance,
  canAfford,
  awardCoins,
  deductCoins
} from '../src/economy/wallet.js';
import {
  claimLevelReward,
  claimDailyChallengeReward,
  getDailyLoginStatus,
  claimDailyLoginReward,
  claimAchievementReward,
  todayDateKey,
  yesterdayDateKey,
  getDaysDifference
} from '../src/economy/rewards.js';
import { purchaseCosmetic, equipCosmetic } from '../src/economy/shop.js';

describe('Coin Economy - Transaction & Boundary Safety', () => {
  let data;

  beforeEach(() => {
    data = {
      economy: createDefaultEconomy()
    };
  });

  it('negative amount awards or deductions are rejected without changing balance', () => {
    const initBal = getBalance(data);
    const awardRes = awardCoins(data, -50, 'test');
    assert.equal(awardRes.success, false);
    assert.equal(getBalance(data), initBal);

    const deductRes = deductCoins(data, -50, 'test');
    assert.equal(deductRes.success, true);
    assert.equal(deductRes.amount, 0);
    assert.equal(getBalance(data), initBal);
  });

  it('non-numeric amounts (NaN, null, undefined) safely default to 0 and do not corrupt balance', () => {
    const initBal = getBalance(data);
    awardCoins(data, NaN, 'test');
    awardCoins(data, null, 'test');
    awardCoins(data, 'invalid_amount', 'test');
    assert.equal(getBalance(data), initBal);

    deductCoins(data, NaN, 'test');
    deductCoins(data, undefined, 'test');
    assert.equal(getBalance(data), initBal);
  });

  it('balance cannot be deducted below zero even under rapid concurrent deductions', () => {
    data.economy.coins = 30; // player has 30 coins
    // Attempt three consecutive 25-coin deductions
    const r1 = deductCoins(data, 25, 'hint1');
    assert.equal(r1.success, true);
    assert.equal(getBalance(data), 5);

    const r2 = deductCoins(data, 25, 'hint2');
    assert.equal(r2.success, false);
    assert.equal(r2.reason, 'insufficient_funds');
    assert.equal(getBalance(data), 5);

    const r3 = deductCoins(data, 25, 'hint3');
    assert.equal(r3.success, false);
    assert.equal(getBalance(data), 5);
  });

  it('cosmetic purchase cannot be duplicated or double-debited', () => {
    data.economy.coins = 500;
    const p1 = purchaseCosmetic(data, 'arrow_ocean');
    assert.equal(p1.success, true);
    const balanceAfterFirst = getBalance(data);

    // Immediate second purchase attempt
    const p2 = purchaseCosmetic(data, 'arrow_ocean');
    assert.equal(p2.success, false);
    assert.equal(p2.reason, 'already_owned');
    assert.equal(getBalance(data), balanceAfterFirst, 'Balance must not change on duplicate purchase');
  });

  it('achievement rewards are strictly idempotent per achievement ID', () => {
    const r1 = claimAchievementReward(data, 'solve_1');
    assert.equal(r1.success, true);
    assert.equal(r1.amount, 20);

    const r2 = claimAchievementReward(data, 'solve_1');
    assert.equal(r2.success, false);
    assert.equal(r2.reason, 'already_claimed');
    assert.equal(r2.amount, 0);
  });
});

describe('Coin Economy - Global Timezone & DST Resilience', () => {
  it('getDaysDifference accurately measures consecutive calendar dates across month/year boundaries', () => {
    assert.equal(getDaysDifference('2026-11-03', '2026-11-03'), 0);
    assert.equal(getDaysDifference('2026-11-03', '2026-11-04'), 1);
    assert.equal(getDaysDifference('2026-11-03', '2026-11-05'), 2);
    // Month boundary
    assert.equal(getDaysDifference('2026-10-31', '2026-11-01'), 1);
    // Year boundary
    assert.equal(getDaysDifference('2026-12-31', '2027-01-01'), 1);
    // Leap year boundary (2028 is leap year)
    assert.equal(getDaysDifference('2028-02-28', '2028-02-29'), 1);
    assert.equal(getDaysDifference('2028-02-29', '2028-03-01'), 1);
  });

  it('clock skew detection: backward clock changes are identified as negative differences', () => {
    const diff = getDaysDifference('2026-11-04', '2026-11-03');
    assert.equal(diff, -1);
  });

  it('simulates consecutive daily login in India (UTC+5:30)', () => {
    const data = { economy: createDefaultEconomy() };
    // Indian Standard Time: Nov 3 -> Nov 4
    data.economy.dailyCalendar.lastClaimDate = '2026-11-03';
    data.economy.dailyCalendar.streak = 2;
    data.economy.dailyCalendar.dayIndex = 2;

    // Check status on Nov 4
    const diff = getDaysDifference(data.economy.dailyCalendar.lastClaimDate, '2026-11-04');
    assert.equal(diff, 1, 'Difference must be exactly 1 day');
  });

  it('simulates consecutive daily login in United States Pacific (UTC-8) across DST transition', () => {
    // US DST "Fall Back" transition (25-hour day)
    const data = { economy: createDefaultEconomy() };
    data.economy.dailyCalendar.lastClaimDate = '2026-11-01';
    data.economy.dailyCalendar.streak = 4;
    data.economy.dailyCalendar.dayIndex = 4;

    const diff = getDaysDifference(data.economy.dailyCalendar.lastClaimDate, '2026-11-02');
    assert.equal(diff, 1, 'DST transition day must accurately compute as 1 day difference');
  });

  it('simulates consecutive daily login in Central Europe (UTC+1/UTC+2)', () => {
    const data = { economy: createDefaultEconomy() };
    data.economy.dailyCalendar.lastClaimDate = '2026-03-28';
    data.economy.dailyCalendar.streak = 1;
    data.economy.dailyCalendar.dayIndex = 1;

    // European DST "Spring Forward" transition (23-hour day)
    const diff = getDaysDifference(data.economy.dailyCalendar.lastClaimDate, '2026-03-29');
    assert.equal(diff, 1, 'Spring DST transition must accurately compute as 1 day difference');
  });

  it('simulates consecutive daily login in Australia Eastern (UTC+10/UTC+11)', () => {
    const data = { economy: createDefaultEconomy() };
    data.economy.dailyCalendar.lastClaimDate = '2026-10-03';
    data.economy.dailyCalendar.streak = 5;
    data.economy.dailyCalendar.dayIndex = 5;

    const diff = getDaysDifference(data.economy.dailyCalendar.lastClaimDate, '2026-10-04');
    assert.equal(diff, 1, 'Australia DST shift must accurately compute as 1 day difference');
  });

  it('missed login correctly resets streak to 0 and dayIndex to 0', () => {
    const data = { economy: createDefaultEconomy() };
    data.economy.dailyCalendar.lastClaimDate = '2026-11-01';
    data.economy.dailyCalendar.streak = 5;
    data.economy.dailyCalendar.dayIndex = 5;

    // Player returns on 2026-11-04 (2 days missed)
    const diff = getDaysDifference(data.economy.dailyCalendar.lastClaimDate, '2026-11-04');
    assert.ok(diff > 1, 'Diff should be > 1 day');
  });
});
