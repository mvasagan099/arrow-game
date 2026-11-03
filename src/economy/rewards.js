/* Reward Service for Arrow Escape Economy.
   Handles:
     - Level completion & perfect clear bonuses (with replay & duplicate protection)
     - Daily challenge rewards
     - 7-day daily login calendar rewards and streaks
     - Achievement unlock coin rewards */

import { REWARDS } from './economy-config.js';
import { ensureEconomy, awardCoins } from './wallet.js';

export function todayDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function yesterdayDateKey(d = new Date()) {
  return new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD date strings.
 * Returns:
 *   0 if dates are identical,
 *   1 if dateKeyB is the day immediately following dateKeyA,
 *  >1 if one or more days were skipped,
 *  <0 if dateKeyB is earlier than dateKeyA (clock skew/manipulation).
 * Immune to DST transitions, timezone offsets, and leap seconds.
 */
export function getDaysDifference(dateKeyA, dateKeyB) {
  if (!dateKeyA || !dateKeyB) return 999;
  const [y1, m1, d1] = String(dateKeyA).split('-').map(Number);
  const [y2, m2, d2] = String(dateKeyB).split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 999;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

/**
 * Claims level completion and perfect bonuses.
 * Base reward is awarded once per level.
 * Perfect bonus is awarded once per level on the first perfect clear.
 */
export function claimLevelReward(data, level, isPerfect = false) {
  const eco = ensureEconomy(data);
  const lvl = Math.max(1, Math.floor(Number(level) || 1));

  const hasBaseReward = !eco.claimedLevelRewards.includes(lvl);
  const hasPerfectBonus = isPerfect && !eco.claimedPerfectBonuses.includes(lvl);

  let totalAward = 0;
  let baseAmount = 0;
  let perfectAmount = 0;

  if (hasBaseReward) {
    baseAmount = REWARDS.LEVEL_COMPLETE;
    eco.claimedLevelRewards.push(lvl);
    totalAward += baseAmount;
  }

  if (hasPerfectBonus) {
    perfectAmount = REWARDS.PERFECT_BONUS;
    eco.claimedPerfectBonuses.push(lvl);
    totalAward += perfectAmount;
  }

  if (totalAward > 0) {
    const reason = hasBaseReward && hasPerfectBonus
      ? 'level_and_perfect_clear'
      : hasBaseReward
        ? 'level_clear'
        : 'perfect_clear_bonus';

    const desc = hasBaseReward && hasPerfectBonus
      ? `Level ${lvl} complete (+${baseAmount}) & Flawless bonus (+${perfectAmount})`
      : hasBaseReward
        ? `Level ${lvl} first clear (+${baseAmount})`
        : `Level ${lvl} first flawless bonus (+${perfectAmount})`;

    awardCoins(data, totalAward, reason, desc, {
      level: lvl,
      baseAmount,
      perfectAmount,
      isPerfect
    });
  }

  return {
    awarded: totalAward,
    baseAmount,
    perfectAmount,
    firstClear: hasBaseReward,
    firstPerfect: hasPerfectBonus,
    isReplay: !hasBaseReward && !hasPerfectBonus
  };
}

/**
 * Claims reward for completing a daily challenge (+30 coins once per day).
 */
export function claimDailyChallengeReward(data, dateKey = null) {
  const eco = ensureEconomy(data);
  const key = dateKey || todayDateKey();

  if (eco.claimedDailyChallenges.includes(key)) {
    return {
      awarded: 0,
      alreadyClaimed: true,
      dateKey: key
    };
  }

  eco.claimedDailyChallenges.push(key);
  const amount = REWARDS.DAILY_CHALLENGE;

  awardCoins(data, amount, 'daily_challenge', `Daily challenge ${key} cleared`, {
    dateKey: key
  });

  return {
    awarded: amount,
    alreadyClaimed: false,
    dateKey: key
  };
}

/**
 * Inspects daily login reward status without mutating state.
 */
export function getDailyLoginStatus(data) {
  const eco = ensureEconomy(data);
  const cal = eco.dailyCalendar;
  const today = todayDateKey();
  const daysDiff = cal.lastClaimDate ? getDaysDifference(cal.lastClaimDate, today) : 999;
  const claimedToday = daysDiff === 0;

  let activeIndex = cal.dayIndex || 0;
  let streak = cal.streak || 0;

  if (!cal.lastClaimDate) {
    // First time player
    activeIndex = 0;
    streak = 0;
  } else if (daysDiff === 0) {
    // Already claimed today: show current day that was claimed
    activeIndex = Math.max(0, (cal.dayIndex - 1 + 7) % 7);
  } else if (daysDiff === 1) {
    // Consecutive login: ready for next dayIndex
    activeIndex = cal.dayIndex % 7;
  } else {
    // Missed at least one day or clock skew: streak resets
    activeIndex = 0;
    streak = 0;
  }

  const rewardAmount = REWARDS.DAILY_CALENDAR[activeIndex] || 10;

  return {
    canClaim: !claimedToday && daysDiff >= 1,
    claimedToday,
    dayIndex: activeIndex,
    streak,
    rewardAmount,
    calendar: [...REWARDS.DAILY_CALENDAR]
  };
}

/**
 * Claims the current day's login reward.
 */
export function claimDailyLoginReward(data) {
  const eco = ensureEconomy(data);
  const status = getDailyLoginStatus(data);

  if (!status.canClaim) {
    return {
      success: false,
      reason: 'already_claimed_today',
      balance: eco.coins
    };
  }

  const cal = eco.dailyCalendar;
  const today = todayDateKey();
  const dayNum = status.dayIndex + 1;
  const amount = status.rewardAmount;

  cal.lastClaimDate = today;
  cal.streak = status.streak + 1;
  cal.dayIndex = (status.dayIndex + 1) % 7;
  cal.claimedCount = (cal.claimedCount || 0) + 1;

  awardCoins(data, amount, 'daily_login', `Day ${dayNum} login reward`, {
    dayIndex: status.dayIndex,
    dayNum,
    streak: cal.streak
  });

  return {
    success: true,
    amount,
    dayIndex: status.dayIndex,
    dayNum,
    newStreak: cal.streak,
    balance: eco.coins
  };
}

/**
 * Claims coin reward for unlocking an achievement (+20 coins once per achievement).
 */
export function claimAchievementReward(data, achievementId) {
  const eco = ensureEconomy(data);
  const id = String(achievementId);

  if (eco.claimedAchievements.includes(id)) {
    return {
      success: false,
      reason: 'already_claimed',
      amount: 0
    };
  }

  eco.claimedAchievements.push(id);
  const amount = REWARDS.ACHIEVEMENT;

  awardCoins(data, amount, 'achievement', `Achievement unlocked: ${id}`, {
    achievementId: id
  });

  return {
    success: true,
    amount,
    achievementId: id
  };
}
