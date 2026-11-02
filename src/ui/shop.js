/* Cosmetic Shop Modal Controller for Arrow Escape.
   Manages category switching, cosmetic rendering, item purchasing,
   equipment switching, and coin wallet displays. */

import { COSMETICS } from '../economy/economy-config.js';
import { getBalance } from '../economy/wallet.js';
import { isItemOwned, purchaseCosmetic, equipCosmetic, getEquippedCosmetics } from '../economy/shop.js';
import * as sfx from '../audio/sounds.js';
import * as haptics from '../audio/haptics.js';
import { toast } from './modals.js';

let _callbacks = {};
let _activeCategory = 'arrow';

export function initShop({ getData, saveData, onCosmeticEquipped, onThemeChanged }) {
  _callbacks = { getData, saveData, onCosmeticEquipped, onThemeChanged };

  // Category tab switching
  const tabs = document.querySelectorAll('.shop-tabs button[data-cat]');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _activeCategory = btn.dataset.cat;
      renderShopItems();
    });
  });
}

export function openShopUI() {
  updateShopBalance();
  renderShopItems();
}

export function updateShopBalance() {
  const data = _callbacks.getData ? _callbacks.getData() : null;
  if (!data) return;
  const balance = getBalance(data);
  const el = document.getElementById('shop-coins');
  if (el) el.textContent = balance;
}

export function renderShopItems() {
  const data = _callbacks.getData();
  const grid = document.getElementById('shop-items-grid');
  if (!grid) return;

  grid.innerHTML = '';
  updateShopBalance();

  const items = Object.values(COSMETICS).filter(c => c.category === _activeCategory);
  const equipped = getEquippedCosmetics(data);
  const isCurrentTheme = themeId => data.settings.theme === themeId;

  items.forEach(item => {
    const owned = isItemOwned(data, item.id);
    let isEquipped = false;
    if (item.category === 'theme') {
      isEquipped = isCurrentTheme(item.themeDef?.id);
    } else {
      isEquipped = equipped[item.category] === item.id;
    }

    const card = document.createElement('div');
    card.className = `shop-item-card ${isEquipped ? 'equipped' : owned ? 'owned' : 'unowned'}`;

    // Item preview visual
    const previewHtml = renderPreviewHtml(item);

    let actionBtnHtml = '';
    if (isEquipped) {
      actionBtnHtml = `<button class="btn-item-action btn-equipped" disabled>Equipped ✓</button>`;
    } else if (owned) {
      actionBtnHtml = `<button class="btn-item-action btn-equip" data-equip="${item.id}" data-cat="${item.category}">Equip</button>`;
    } else {
      actionBtnHtml = `<button class="btn-item-action btn-buy" data-buy="${item.id}">Buy 🪙 ${item.cost}</button>`;
    }

    card.innerHTML = `
      <div class="shop-item-preview">${previewHtml}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-cost">${item.cost === 0 ? 'Free' : `🪙 ${item.cost}`}</div>
      </div>
      <div class="shop-item-action-wrap">
        ${actionBtnHtml}
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach button event listeners
  grid.querySelectorAll('button[data-buy]').forEach(b => {
    b.addEventListener('click', () => handleBuy(b.dataset.buy));
  });

  grid.querySelectorAll('button[data-equip]').forEach(b => {
    b.addEventListener('click', () => handleEquip(b.dataset.cat, b.dataset.equip));
  });
}

function handleBuy(itemId) {
  const data = _callbacks.getData();
  const res = purchaseCosmetic(data, itemId);

  if (!res.success) {
    if (res.reason === 'insufficient_funds') {
      sfx.sfxError();
      haptics.hapticTap();
      toast(`Not enough coins! Need 🪙 ${res.cost} (You have 🪙 ${res.balance})`, 2200);
    } else {
      toast('Could not purchase item.', 1800);
    }
    return;
  }

  _callbacks.saveData(data);
  sfx.sfxPurchase();
  haptics.hapticPurchase();
  toast(`Unlocked & Equipped ${res.item.name}!`, 2000);

  if (res.item.category === 'theme' && res.item.themeDef) {
    if (typeof _callbacks.onThemeChanged === 'function') {
      _callbacks.onThemeChanged(res.item.themeDef);
    }
  } else {
    if (typeof _callbacks.onCosmeticEquipped === 'function') {
      _callbacks.onCosmeticEquipped(res.item.category, itemId);
    }
  }

  renderShopItems();
}

function handleEquip(category, itemId) {
  const data = _callbacks.getData();
  const item = COSMETICS[itemId];
  if (!item) return;

  if (category === 'theme' && item.themeDef) {
    data.settings.theme = item.themeDef.id;
    _callbacks.saveData(data);
    sfx.sfxEquip();
    haptics.hapticTap();
    toast(`Equipped theme: ${item.name}!`, 1800);
    if (typeof _callbacks.onThemeChanged === 'function') {
      _callbacks.onThemeChanged(item.themeDef);
    }
    renderShopItems();
    return;
  }

  const res = equipCosmetic(data, category, itemId);
  if (res.success) {
    _callbacks.saveData(data);
    sfx.sfxEquip();
    haptics.hapticTap();
    toast(`Equipped ${item.name}!`, 1800);
    if (typeof _callbacks.onCosmeticEquipped === 'function') {
      _callbacks.onCosmeticEquipped(category, itemId);
    }
    renderShopItems();
  }
}

function renderPreviewHtml(item) {
  if (item.category === 'arrow') {
    const shaft = item.style?.shaftColor || 'var(--color-ink)';
    const tip = item.style?.tipColor || shaft;
    const glow = item.style?.tipGlow ? `box-shadow: 0 0 8px ${tip};` : '';
    return `
      <div class="preview-arrow-box" style="display:flex;align-items:center;justify-content:center;height:44px;">
        <div style="width:28px;height:4px;background:${shaft};border-radius:2px;"></div>
        <div style="width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:11px solid ${tip};${glow}"></div>
      </div>
    `;
  }
  if (item.category === 'board') {
    const border = item.style?.borderColor || 'var(--color-line-strong)';
    return `
      <div class="preview-board-box" style="width:54px;height:40px;border:2px solid ${border};border-radius:6px;display:flex;align-items:center;justify-content:center;background:var(--color-bg-card);">
        <span style="font-size:16px;">${item.id === 'board_blueprint' ? '📐' : item.id === 'board_velvet' ? '👑' : item.id === 'board_galaxy' ? '🌌' : '▦'}</span>
      </div>
    `;
  }
  if (item.category === 'trail') {
    const colors = item.style?.colors || ['var(--color-ink)'];
    const dots = colors.map(c => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin:0 2px;"></span>`).join('');
    return `<div class="preview-trail-box" style="display:flex;align-items:center;justify-content:center;height:44px;">${dots}</div>`;
  }
  if (item.category === 'theme') {
    const p = item.themeDef?.preview || { bg: '#111', ink: '#fff', accent: '#3b82f6' };
    return `
      <div class="preview-theme-box" style="width:54px;height:38px;border-radius:6px;background:${p.bg};border:1.5px solid ${p.ink};display:flex;align-items:center;justify-content:center;gap:4px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.ink};"></span>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.accent};"></span>
      </div>
    `;
  }
  return '';
}
