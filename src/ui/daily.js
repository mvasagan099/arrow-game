/* Daily challenge entry point + streak logic.
   The puzzle for date D is the same for every player because the seed
   is hashed from the ISO date string (UTC). The streak resets if a day
   is skipped. */

export function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function yesterdayKey() {
  const d = new Date(Date.now() - 86400000);
  return d.toISOString().slice(0, 10);
}

/* Called when a daily puzzle is completed. Mutates data.daily.
   Returns true if streak advanced, false if reset / first daily. */
export function recordDailyCompletion(data, dateKey) {
  const daily = data.daily;
  // Already completed today? no-op.
  if (daily.lastResultKey === dateKey) return false;

  // Track history
  if (!Array.isArray(daily.history)) daily.history = [];
  if (!daily.history.includes(dateKey)) {
    daily.history.push(dateKey);
    if (daily.history.length > 60) daily.history.shift();
  }

  if (daily.lastDateKey === yesterdayKey()) {
    daily.streak = (daily.streak || 0) + 1;
  } else {
    daily.streak = 1;
  }
  if (daily.streak > daily.maxStreak) daily.maxStreak = daily.streak;
  daily.totalCompleted = (daily.totalCompleted || 0) + 1;
  daily.lastDateKey = dateKey;
  daily.lastResultKey = dateKey;
  return true;
}

export function getDailyHistory(data) {
  return data.daily?.history || [];
}

/* If we missed a day, drop the streak. Call on startup. */
export function rolloverDailyStreak(data) {
  const daily = data.daily;
  if (!daily.lastDateKey) return;
  const t = todayKey();
  const y = yesterdayKey();
  if (daily.lastDateKey !== t && daily.lastDateKey !== y) {
    daily.streak = 0;
  }
}

export function dailyAlreadyCompleted(data) {
  return data.daily.lastResultKey === todayKey();
}
