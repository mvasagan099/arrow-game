/* Persistence layer.
   All player data lives under a single namespaced localStorage key
   so wiping is easy. The schema is versioned; older payloads are
   migrated forward on load. */

import { STORAGE_KEY, STORAGE_VERSION, MAX_LEVEL } from './config.js';

function emptyData() {
  return {
    v: STORAGE_VERSION,
    currentLevel: 1,
    completedBits: '', // base64-ish packed bitmap of solved levels
    stats: {
      totalCompleted: 0,
      perfectClears: 0,
      cleanClears: 0,        // cleared without using a hint
      currentStreak: 0,
      maxStreak: 0,
      maxLevel: 1
    },
    achievements: {},          // id -> unlockedAt (ms epoch)
    settings: {
      theme: prefersDark() ? 'dark' : 'light',
      sound: false,
      reduceMotion: prefersReducedMotion()
    },
    daily: {
      lastDateKey: null,
      streak: 0,
      maxStreak: 0,
      totalCompleted: 0,
      lastResultKey: null
    }
  };
}

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
  if (!raw) return emptyData();
  let data;
  try { data = JSON.parse(raw); } catch (e) { return emptyData(); }
  return migrate(data);
}

export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* quota exceeded or private mode — silently ignore */
  }
}

function migrate(data) {
  if (!data || typeof data !== 'object') return emptyData();
  const fresh = emptyData();
  // shallow-merge with defaults so missing keys get populated
  data.stats        = { ...fresh.stats, ...(data.stats || {}) };
  data.settings     = { ...fresh.settings, ...(data.settings || {}) };
  data.daily        = { ...fresh.daily, ...(data.daily || {}) };
  data.achievements = data.achievements || {};
  if (typeof data.currentLevel !== 'number' || data.currentLevel < 1) data.currentLevel = 1;
  if (typeof data.completedBits !== 'string') data.completedBits = '';
  data.v = STORAGE_VERSION;
  return data;
}

/* ----- Solved-level bitmap, packed as a base64-ish string of bytes.
   Bit i (level i+1) = 1 if solved. Strings are dense and survive JSON. ----- */
const BIT_TABLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
const BIT_INDEX = (() => {
  const m = new Map();
  for (let i = 0; i < BIT_TABLE.length; i++) m.set(BIT_TABLE[i], i);
  return m;
})();

export function isSolved(data, level) {
  const bytes = bitsToBytes(data.completedBits || '');
  return getBit(bytes, level - 1);
}

export function markSolved(data, level) {
  if (level < 1 || level > MAX_LEVEL) return;
  const bytes = bitsToBytes(data.completedBits || '');
  setBit(bytes, level - 1, 1);
  data.completedBits = bytesToBits(bytes);
}

export function solvedSet(data) {
  const bytes = bitsToBytes(data.completedBits || '');
  const out = new Set();
  const totalBits = bytes.length * 6;
  for (let i = 0; i < totalBits; i++) {
    if (getBit(bytes, i)) out.add(i + 1);
  }
  return out;
}

function bitsToBytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    out.push(BIT_INDEX.get(str[i]) || 0);
  }
  return out;
}
function bytesToBits(bytes) {
  let last = bytes.length - 1;
  while (last >= 0 && bytes[last] === 0) last--;
  let s = '';
  for (let i = 0; i <= last; i++) s += BIT_TABLE[bytes[i] & 63];
  return s;
}
function getBit(bytes, idx) {
  const i = Math.floor(idx / 6);
  const b = idx % 6;
  if (i >= bytes.length) return 0;
  return (bytes[i] >> b) & 1;
}
function setBit(bytes, idx, val) {
  const i = Math.floor(idx / 6);
  const b = idx % 6;
  while (bytes.length <= i) bytes.push(0);
  if (val) bytes[i] |= (1 << b);
  else     bytes[i] &= ~(1 << b);
}
