/* Offline Cosmetic Shop Service for Arrow Escape.
   Manages item catalog, ownership verification, purchasing,
   and equipment states. */

import { COSMETICS } from './economy-config.js';
import { ensureEconomy, canAfford, deductCoins } from './wallet.js';

export function getCatalog() {
  return COSMETICS;
}

export function getCosmeticItem(itemId) {
  return COSMETICS[itemId] || null;
}

export function isItemOwned(data, itemId) {
  const eco = ensureEconomy(data);
  const item = COSMETICS[itemId];
  if (!item) return false;
  if (item.cost === 0 || item.isDefault) return true;
  return eco.ownedCosmetics.includes(itemId);
}

export function purchaseCosmetic(data, itemId) {
  const eco = ensureEconomy(data);
  const item = COSMETICS[itemId];

  if (!item) {
    return { success: false, reason: 'item_not_found' };
  }

  if (isItemOwned(data, itemId)) {
    return { success: false, reason: 'already_owned', item };
  }

  if (!canAfford(data, item.cost)) {
    return {
      success: false,
      reason: 'insufficient_funds',
      item,
      cost: item.cost,
      balance: eco.coins
    };
  }

  const deduction = deductCoins(data, item.cost, 'shop_purchase', `Purchased ${item.name}`, {
    itemId,
    category: item.category
  });

  if (!deduction.success) {
    return deduction;
  }

  if (!eco.ownedCosmetics.includes(itemId)) {
    eco.ownedCosmetics.push(itemId);
  }

  // Auto-equip purchased cosmetic
  if (item.category && item.category !== 'theme') {
    eco.equippedCosmetics[item.category] = itemId;
  }

  return {
    success: true,
    item,
    balance: eco.coins
  };
}

export function equipCosmetic(data, category, itemId) {
  const eco = ensureEconomy(data);
  const item = COSMETICS[itemId];

  if (!item || item.category !== category) {
    return { success: false, reason: 'invalid_item' };
  }

  if (!isItemOwned(data, itemId)) {
    return { success: false, reason: 'not_owned' };
  }

  eco.equippedCosmetics[category] = itemId;

  return {
    success: true,
    category,
    itemId,
    item
  };
}

export function getEquippedCosmetics(data) {
  const eco = ensureEconomy(data);
  return { ...eco.equippedCosmetics };
}
