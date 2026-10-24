/* Settings modal interface:
   - 4-theme picker with color preview swatches
   - Sound toggle
   - Haptics toggle
   - Reduced motion toggle
   - How to Play tutorial launch
   - Version & license info */

import { THEMES, THEME_KEYS } from '../config.js';
import { sfxButton } from '../audio/sounds.js';
import { hapticTap } from '../audio/haptics.js';

let _handlers = {};
let _data = null;

export function initSettings(handlers, getData) {
  _handlers = handlers;
  _data = getData;

  const container = document.getElementById('theme-picker');
  if (container) {
    const html = THEME_KEYS.map(key => {
      const t = THEMES[key];
      return `
        <button class="theme-card" data-theme="${t.id}" aria-label="Select ${t.name} theme">
          <div class="theme-swatch" style="background: ${t.preview.bg}; border: 1px solid rgba(128,128,128,0.25);">
            <div class="swatch-arrow" style="background: ${t.preview.ink};"></div>
            <div class="swatch-dot" style="background: ${t.preview.accent};"></div>
          </div>
          <span class="theme-name">${t.name}</span>
        </button>
      `;
    }).join('');
    container.innerHTML = html;

    for (const card of container.querySelectorAll('.theme-card')) {
      card.addEventListener('click', () => {
        sfxButton();
        hapticTap();
        const themeId = card.dataset.theme;
        _handlers.onSelectTheme?.(themeId);
        updateActiveThemeCard(themeId);
      });
    }
  }

  // Toggles
  const soundToggle = document.getElementById('toggle-settings-sound');
  if (soundToggle) {
    soundToggle.addEventListener('change', e => {
      sfxButton();
      _handlers.onToggleSound?.(e.target.checked);
    });
  }

  const hapticsToggle = document.getElementById('toggle-settings-haptics');
  if (hapticsToggle) {
    hapticsToggle.addEventListener('change', e => {
      hapticTap();
      _handlers.onToggleHaptics?.(e.target.checked);
    });
  }

  const motionToggle = document.getElementById('toggle-settings-motion');
  if (motionToggle) {
    motionToggle.addEventListener('change', e => {
      sfxButton();
      _handlers.onToggleMotion?.(e.target.checked);
    });
  }

  document.getElementById('btn-settings-howto')?.addEventListener('click', () => {
    sfxButton();
    hapticTap();
    _handlers.onHowto?.();
  });
}

export function updateSettingsUI(settings) {
  updateActiveThemeCard(settings.theme || 'classic');

  const soundToggle = document.getElementById('toggle-settings-sound');
  if (soundToggle) soundToggle.checked = !!settings.sound;

  const hapticsToggle = document.getElementById('toggle-settings-haptics');
  if (hapticsToggle) hapticsToggle.checked = settings.haptics !== false;

  const motionToggle = document.getElementById('toggle-settings-motion');
  if (motionToggle) motionToggle.checked = !!settings.reduceMotion;
}

function updateActiveThemeCard(activeThemeId) {
  const container = document.getElementById('theme-picker');
  if (!container) return;
  for (const card of container.querySelectorAll('.theme-card')) {
    card.classList.toggle('active', card.dataset.theme === activeThemeId);
  }
}
