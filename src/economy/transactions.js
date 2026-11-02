/* Transaction Logger for Arrow Escape Economy.
   Maintains a bounded FIFO log of recent coin awards and expenditures
   with timestamps, balance snapshots, and reasons. */

import { MAX_TRANSACTION_HISTORY } from './economy-config.js';

let _txCounter = 0;

export function recordTransaction(economy, { type, amount, balanceAfter, desc = '', meta = {} }) {
  if (!economy) return null;
  if (!Array.isArray(economy.transactions)) {
    economy.transactions = [];
  }

  const tx = {
    id: `tx_${Date.now()}_${++_txCounter}`,
    type: type || (amount >= 0 ? 'credit' : 'debit'),
    amount: Number(amount) || 0,
    balanceAfter: Number(balanceAfter) || 0,
    desc: String(desc || ''),
    meta: meta && typeof meta === 'object' ? { ...meta } : {},
    timestamp: Date.now()
  };

  economy.transactions.unshift(tx);

  // Maintain bounded retention limit
  if (economy.transactions.length > MAX_TRANSACTION_HISTORY) {
    economy.transactions.length = MAX_TRANSACTION_HISTORY;
  }

  return tx;
}

export function getRecentTransactions(economy) {
  return Array.isArray(economy?.transactions) ? [...economy.transactions] : [];
}
