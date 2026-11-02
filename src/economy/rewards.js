/* Reward Service for Arrow Escape Economy.
   Handles:
     - Level completion & perfect clear bonuses (with replay & duplicate protection)
     - Daily challenge rewards
     - 7-day daily login calendar rewards and streaks
     - Achievement unlock coin rewards */

import { REWARDS } from './economy-config.js';
import { ensureEconomy, awardCoins } from './wallet.js';

export function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayDateKey() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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
  const yesterday = yesterdayDateKey();

  const claimedToday = cal.lastClaimDate === today;

  let activeIndex = cal.dayIndex || 0;
  let streak = cal.streak || 0;

  if (!cal.lastClaimDate) {
    // First time player
    activeIndex = 0;
    streak = 0;
  } else if (cal.lastClaimDate === today) {
    // Already claimed today: show current day that was claimed
    activeIndex = Math.max(0, (cal.dayIndex - 1 + 7) % 7);
  } else if (cal.lastClaimDate === yesterday) {
    // Consecutive login: ready for next dayIndex
    activeIndex = cal.dayIndex % 7;
  } else {
    // Missed at least one day: streak resets
    activeIndex = 0;
    streak = 0;
  }

  const rewardAmount = REWARDS.DAILY_CALENDAR[activeIndex] || 10;

  return {
    canClaim: !claimedToday,
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
