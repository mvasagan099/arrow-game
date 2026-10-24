/* Configuration: tiers, directions, achievements, storage keys.
   Pure data, no DOM/state. Imported by everything. */

export const MAX_LEVEL = 9999;

/* Directions
     0 = Up, 1 = Right, 2 = Down, 3 = Left
   rot is the rotation (radians) needed to draw a right-pointing tip
   into the actual direction. */
export const DIRS = [
  { dx:  0, dy: -1, rot: -Math.PI / 2, name: 'up' },
  { dx:  1, dy:  0, rot:  0,            name: 'right' },
  { dx:  0, dy:  1, rot:  Math.PI / 2,  name: 'down' },
  { dx: -1, dy:  0, rot:  Math.PI,      name: 'left' }
];

/* Tier table — same difficulty progression as the previous implementation,
   tuned so each tier feels like a meaningful step up.
   Index 0 of *Weights is unused; the array index equals the value
   it weights (so lengthWeights[3] = weight of length 3). */
export const TIERS = {
  easy: {
    start: 1, end: 200, grid: 28,
    arrowMin: 40, arrowMax: 60,
    lengthWeights: [0, 6,  20, 32, 25, 12, 4,  1],
    bendWeights:   [50, 38, 12],
    label: 'Easy', cssClass: 'easy'
  },
  medium: {
    start: 201, end: 400, grid: 30,
    arrowMin: 60, arrowMax: 85,
    lengthWeights: [0, 4,  14, 26, 26, 18, 8,  3,  1],
    bendWeights:   [25, 45, 25, 5],
    label: 'Medium', cssClass: 'medium'
  },
  hard: {
    start: 401, end: 600, grid: 32,
    arrowMin: 85, arrowMax: 115,
    lengthWeights: [0, 2,  10, 22, 28, 20, 12, 5,  1],
    bendWeights:   [10, 30, 35, 20, 5],
    label: 'Hard', cssClass: 'hard'
  },
  veryhard: {
    start: 601, end: 800, grid: 36,
    arrowMin: 115, arrowMax: 150,
    lengthWeights: [0, 1,  6,  18, 25, 24, 16, 8,  2],
    bendWeights:   [5,  20, 30, 28, 12, 5],
    label: 'Very Hard', cssClass: 'veryhard'
  },
  nightmare: {
    start: 801, end: Infinity, grid: 40,
    arrowMin: 150, arrowMax: 190,
    lengthWeights: [0, 1,  4,  12, 20, 24, 20, 12, 5,  2],
    bendWeights:   [3,  12, 25, 30, 18, 8,  4],
    label: 'Nightmare', cssClass: 'nightmare'
  }
};

export const TIER_ORDER = ['easy', 'medium', 'hard', 'veryhard', 'nightmare'];

export function tierForLevel(level) {
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    if (level >= t.start && level <= t.end) return { key, ...t };
  }
  const last = TIER_ORDER[TIER_ORDER.length - 1];
  return { key: last, ...TIERS[last] };
}

/* Game tuning */
export const HEARTS_MAX = 3;
export const HINT_DURATION_MS = 2200;
export const BLOCK_FLASH_MS = 700;
export const EXTRACT_FLY_MS = 320;
export const LEVEL_COMPLETE_DELAY_MS = 600;
export const TOAST_DURATION_MS = 1800;

/* Viewport bounds */
export const VIEW_MIN = 0.45;
export const VIEW_MAX = 4.5;

/* Centralized Theme Definitions (4 distinct themes) */
export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    desc: 'Crisp white with dark ink arrows',
    isDark: false,
    preview: { bg: '#ffffff', ink: '#18181b', accent: '#2563eb' },
    palette: {
      bg: '#ffffff',
      bgSoft: '#f4f4f5',
      bgCard: '#ffffff',
      ink: '#18181b',
      inkSoft: '#52525b',
      inkFaint: '#a1a1aa',
      line: '#e4e4e7',
      lineStrong: '#d4d4d8',
      accent: '#2563eb',
      danger: '#ef4444',
      heart: '#f43f5e',
      hint: '#eab308',
      good: '#10b981'
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark Slate',
    desc: 'OLED charcoal with luminescent arrows',
    isDark: true,
    preview: { bg: '#09090b', ink: '#f4f4f5', accent: '#38bdf8' },
    palette: {
      bg: '#09090b',
      bgSoft: '#18181b',
      bgCard: '#141416',
      ink: '#f4f4f5',
      inkSoft: '#a1a1aa',
      inkFaint: '#71717a',
      line: '#27272a',
      lineStrong: '#3f3f46',
      accent: '#38bdf8',
      danger: '#f87171',
      heart: '#fb7185',
      hint: '#facc15',
      good: '#34d399'
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon Cyber',
    desc: 'Midnight blue with electric cyan & yellow',
    isDark: true,
    preview: { bg: '#0b0d19', ink: '#38bdf8', accent: '#fde047' },
    palette: {
      bg: '#0b0d19',
      bgSoft: '#13172c',
      bgCard: '#171b35',
      ink: '#38bdf8',
      inkSoft: '#818cf8',
      inkFaint: '#6366f1',
      line: '#1e2447',
      lineStrong: '#2e3668',
      accent: '#38bdf8',
      danger: '#f43f5e',
      heart: '#fb7185',
      hint: '#fde047',
      good: '#2dd4bf'
    }
  },
  pastel: {
    id: 'pastel',
    name: 'Soft Pastel',
    desc: 'Soothing lavender with rich plum arrows',
    isDark: false,
    preview: { bg: '#f5f3ff', ink: '#312e81', accent: '#6366f1' },
    palette: {
      bg: '#f5f3ff',
      bgSoft: '#ede9fe',
      bgCard: '#ffffff',
      ink: '#312e81',
      inkSoft: '#6366f1',
      inkFaint: '#a5b4fc',
      line: '#ddd6fe',
      lineStrong: '#c4b5fd',
      accent: '#6366f1',
      danger: '#e11d48',
      heart: '#f43f5e',
      hint: '#ea580c',
      good: '#059669'
    }
  }
};

export const THEME_KEYS = ['classic', 'dark', 'neon', 'pastel'];
export const DEFAULT_THEME = 'classic';

/* Storage */
export const STORAGE_KEY = 'arrows-escape:v1';
export const STORAGE_VERSION = 1;

/* Achievements — 15 total */
export const ACHIEVEMENTS = [
  { id: 'first',         title: 'First Steps',        desc: 'Clear your first level',                icon: 'star',     test: s => s.stats.totalCompleted >= 1 },
  { id: 'solved10',      title: 'Warming Up',         desc: 'Clear 10 levels',                       icon: 'flame',    test: s => s.stats.totalCompleted >= 10 },
  { id: 'solved100',     title: 'Centurion',          desc: 'Clear 100 levels',                      icon: 'medal',    test: s => s.stats.totalCompleted >= 100 },
  { id: 'solved500',     title: 'Arrow Master',       desc: 'Clear 500 levels',                      icon: 'crown',    test: s => s.stats.totalCompleted >= 500 },
  { id: 'streak5',       title: 'On a Roll',          desc: 'Win-streak of 5',                       icon: 'zap',      test: s => s.stats.maxStreak  >= 5  },
  { id: 'streak25',      title: 'Unstoppable',        desc: 'Win-streak of 25',                      icon: 'bolt',     test: s => s.stats.maxStreak  >= 25 },
  { id: 'streak100',     title: 'Legendary Streak',   desc: 'Win-streak of 100',                     icon: 'comet',    test: s => s.stats.maxStreak  >= 100 },
  { id: 'tierMedium',    title: 'Stepping Up',        desc: 'Reach the Medium tier',                 icon: 'arrow',    test: s => s.stats.maxLevel  >= 201 },
  { id: 'tierHard',      title: 'Hardcore',           desc: 'Reach the Hard tier',                   icon: 'arrow',    test: s => s.stats.maxLevel  >= 401 },
  { id: 'tierVeryHard',  title: 'Stoic',              desc: 'Reach the Very Hard tier',              icon: 'arrow',    test: s => s.stats.maxLevel  >= 601 },
  { id: 'tierNightmare', title: 'Into the Nightmare', desc: 'Reach the Nightmare tier',              icon: 'skull',    test: s => s.stats.maxLevel  >= 801 },
  { id: 'noHint',        title: 'No Help Needed',     desc: 'Clear a level without using a hint',    icon: 'eye',      test: s => s.stats.cleanClears >= 1 },
  { id: 'perfect',       title: 'Flawless',           desc: 'Clear a level without losing a heart',  icon: 'shield',   test: s => s.stats.perfectClears >= 1 },
  { id: 'daily7',        title: 'Weekly Habit',       desc: 'Complete 7 daily challenges',           icon: 'sun',      test: s => s.dailyStats.totalCompleted >= 7 },
  { id: 'daily30',       title: 'Devoted',            desc: 'Complete 30 daily challenges',          icon: 'sun',      test: s => s.dailyStats.totalCompleted >= 30 }
];

/* Symbol glyphs for achievement icons. */
export const ACH_ICONS = {
  star:   '*', flame: '~', medal: '#', crown: '^', zap: '!',
  bolt:   '/', comet: '<', arrow: '>', skull: 'x', eye: 'o',
  shield: '+', sun: 'O'
};
