/* Seeded RNG (mulberry32) + small sampling helpers.
   A given seed always produces the same sequence, so the same `level`
   resolves to the same puzzle for every player on every device. */

export function mulberry32(seed) {
  let s = seed | 0;
  return function next() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rand, min, maxInclusive) {
  return Math.floor(rand() * (maxInclusive - min + 1)) + min;
}

export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

/* Weighted choice. `weights[i]` is the weight assigned to value `i`.
   Returns the chosen index. Index 0 of weights may be zero. */
export function weightedIndex(rand, weights) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0) return 0;
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/* In-place Fisher–Yates shuffle using the supplied RNG. */
export function shuffle(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* A tiny string hash that returns a 32-bit unsigned int.
   Used to derive seeds from labels like "daily:2026-05-22". */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
