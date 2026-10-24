/* Home Screen UI manager for Arrow Escape:
   Handles hero CTA, stats display, quick-navigation cards, and transitions. */

import { tierForLevel } from '../config.js';
import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';
import { startHomeBg, stopHomeBg } from './home-bg.js';

let _handlers = {};

export function initHome(handlers) {
  _handlers = handlers;

  document.getElementById('btn-home-play')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onPlay?.();
  });

  document.getElementById('btn-home-levels')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onLevels?.();
  });

  document.getElementById('btn-home-daily')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onDaily?.();
  });

  document.getElementById('btn-home-achievements')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onAchievements?.();
  });

  document.getElementById('btn-home-settings')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onSettings?.();
  });

  document.getElementById('btn-home-howto')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onHowto?.();
  });
}

export function updateHomeView(data) {
  const currentLvl = data.currentLevel || 1;
  const tier = tierForLevel(currentLvl);

  const badgeEl = document.getElementById('home-level-badge');
  if (badgeEl) {
    badgeEl.textContent = `Level ${currentLvl} • ${tier.label}`;
    badgeEl.className = `tier ${tier.cssClass}`;
  }

  const playBtn = document.getElementById('btn-home-play');
  if (playBtn) {
    const playText = currentLvl > 1 ? `Continue Level ${currentLvl}` : 'Play Now';
    const span = playBtn.querySelector('.play-text');
    if (span) span.textContent = playText;
    else playBtn.textContent = playText;
  }

  // Update stats summary on home screen
  const solvedEl = document.getElementById('home-stat-solved');
  if (solvedEl) solvedEl.textContent = data.stats.totalCompleted || 0;

  const streakEl = document.getElementById('home-stat-streak');
  if (streakEl) streakEl.textContent = data.stats.currentStreak || 0;

  const perfectEl = document.getElementById('home-stat-perfect');
  if (perfectEl) perfectEl.textContent = data.stats.perfectClears || 0;
}

export function showHome(data) {
  const homeScreen = document.getElementById('screen-home');
  const gameScreen = document.getElementById('screen-game');

  if (homeScreen) {
    homeScreen.classList.remove('hidden');
    homeScreen.classList.add('active');
  }
  if (gameScreen) {
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('active');
  }

  if (data) updateHomeView(data);
  startHomeBg();
}

export function hideHome() {
  const homeScreen = document.getElementById('screen-home');
  const gameScreen = document.getElementById('screen-game');

  if (homeScreen) {
    homeScreen.classList.add('hidden');
    homeScreen.classList.remove('active');
  }
  if (gameScreen) {
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
  }

  stopHomeBg();
}
