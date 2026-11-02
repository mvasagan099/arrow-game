/* Daily Login Reward Modal Controller for Arrow Escape.
   Renders 7-day reward calendar with streak tracking, claim states,
   and offline date validation. */

import { getDailyLoginStatus, claimDailyLoginReward } from '../economy/rewards.js';
import { getBalance } from '../economy/wallet.js';
import * as sfx from '../audio/sounds.js';
import * as haptics from '../audio/haptics.js';
import { toast } from './modals.js';

let _callbacks = {};

export function initDailyReward({ getData, saveData, onRewardClaimed }) {
  _callbacks = { getData, saveData, onRewardClaimed };

  const claimBtn = document.getElementById('btn-claim-daily');
  if (claimBtn) {
    claimBtn.addEventListener('click', () => {
      handleClaim();
    });
  }
}

export function isDailyRewardAvailable(data) {
  const status = getDailyLoginStatus(data);
  return status.canClaim;
}

export function renderDailyRewardUI() {
  const data = _callbacks.getData();
  const status = getDailyLoginStatus(data);

  const streakEl = document.getElementById('daily-streak-count');
  if (streakEl) {
    streakEl.textContent = `${status.streak} day${status.streak === 1 ? '' : 's'} 🔥`;
  }

  const gridEl = document.getElementById('daily-calendar-grid');
  if (gridEl) {
    gridEl.innerHTML = '';
    const calendar = status.calendar; // [10, 15, 20, 25, 30, 40, 100]

    calendar.forEach((amt, idx) => {
      const dayNum = idx + 1;
      const card = document.createElement('div');
      card.className = 'daily-day-card';

      let stateClass = 'locked';
      let statusText = `Day ${dayNum}`;

      if (idx < status.dayIndex) {
        stateClass = 'claimed';
        statusText = 'Claimed ✓';
      } else if (idx === status.dayIndex) {
        if (status.claimedToday) {
          stateClass = 'claimed';
          statusText = 'Claimed ✓';
        } else {
          stateClass = 'active';
          statusText = 'Ready!';
        }
      }

      card.classList.add(stateClass);
      if (dayNum === 7) card.classList.add('milestone');

      card.innerHTML = `
        <div class="day-label">Day ${dayNum}</div>
        <div class="day-icon">${dayNum === 7 ? '👑' : '🪙'}</div>
        <div class="day-amount">+${amt}</div>
        <div class="day-status">${statusText}</div>
      `;
      gridEl.appendChild(card);
    });
  }

  const claimBtn = document.getElementById('btn-claim-daily');
  if (claimBtn) {
    if (status.canClaim) {
      claimBtn.disabled = false;
      claimBtn.innerHTML = `Claim Day ${status.dayIndex + 1} Gift (+${status.rewardAmount} 🪙)`;
      claimBtn.classList.remove('btn-claimed');
    } else {
      claimBtn.disabled = true;
      claimBtn.innerHTML = 'Claimed Today ✓ (Come back tomorrow)';
      claimBtn.classList.add('btn-claimed');
    }
  }
}

function handleClaim() {
  const data = _callbacks.getData();
  const res = claimDailyLoginReward(data);

  if (!res.success) {
    toast('Reward already claimed today! Check back tomorrow.', 2000);
    return;
  }

  _callbacks.saveData(data);
  sfx.sfxCoin();
  haptics.hapticCoin();
  toast(`Claimed +${res.amount} coins! Streak: ${res.newStreak} days 🔥`, 2400);

  renderDailyRewardUI();
  if (typeof _callbacks.onRewardClaimed === 'function') {
    _callbacks.onRewardClaimed(res);
  }
}
