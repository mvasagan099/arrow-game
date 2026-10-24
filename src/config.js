/* Configuration: tiers, directions, achievements, storage keys.
   Pure data, no DOM/state. Imported by everything. */

export const MAX_LEVEL = 2000;

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

/* Six Difficulty Tiers (1 to 2,000 Levels)
   Tuned for smooth, gradual progression from pure foundational puzzles
   to high-density puzzles with obstacles, color-locks, and rotating pivots. */
export const TIERS = {
  beginner: {
    start: 1, end: 200, grid: 20,
    arrowMin: 18, arrowMax: 32,
    lengthWeights: [0, 8,  28, 36, 20, 8],
    bendWeights:   [70, 25, 5],
    obstaclesMax: 0,
    colorKeysMax: 0,
    pivotsMax: 0,
    label: 'Beginner', cssClass: 'beginner'
  },
  easy: {
    start: 201, end: 500, grid: 24,
    arrowMin: 32, arrowMax: 50,
    lengthWeights: [0, 6,  22, 32, 24, 12, 4],
    bendWeights:   [50, 35, 15],
    obstaclesMax: 2,
    colorKeysMax: 0,
    pivotsMax: 0,
    label: 'Easy', cssClass: 'easy'
  },
  medium: {
    start: 501, end: 900, grid: 28,
    arrowMin: 50, arrowMax: 75,
    lengthWeights: [0, 4,  16, 26, 26, 18, 8,  2],
    bendWeights:   [30, 45, 20, 5],
    obstaclesMax: 3,
    colorKeysMax: 1,
    pivotsMax: 0,
    label: 'Medium', cssClass: 'medium'
  },
  hard: {
    start: 901, end: 1300, grid: 32,
    arrowMin: 75, arrowMax: 105,
    lengthWeights: [0, 2,  12, 22, 28, 20, 12, 4],
    bendWeights:   [15, 35, 35, 15],
    obstaclesMax: 4,
    colorKeysMax: 2,
    pivotsMax: 2,
    label: 'Hard', cssClass: 'hard'
  },
  expert: {
    start: 1301, end: 1700, grid: 36,
    arrowMin: 105, arrowMax: 140,
    lengthWeights: [0, 1,  8,  18, 26, 24, 15, 6,  2],
    bendWeights:   [8,  25, 32, 25, 10],
    obstaclesMax: 6,
    colorKeysMax: 2,
    pivotsMax: 3,
    label: 'Expert', cssClass: 'expert'
  },
  master: {
    start: 1701, end: 2000, grid: 40,
    arrowMin: 135, arrowMax: 175,
    lengthWeights: [0, 1,  4,  14, 22, 24, 20, 10, 5],
    bendWeights:   [5,  15, 28, 32, 15, 5],
    obstaclesMax: 8,
    colorKeysMax: 3,
    pivotsMax: 4,
    label: 'Master', cssClass: 'master'
  }
};

export const TIER_ORDER = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];

export function tierForLevel(level) {
  for (const key of TIER_ORDER) {
    const t = TIERS[key];
    if (level >= t.start && level <= t.end) return { key, ...t };
  }
  const last = TIER_ORDER[TIER_ORDER.length - 1];
  return { key: last, ...TIERS[last] };
}

/* Color-Key Definitions (Accessible high-contrast palette + shape glyphs) */
export const COLOR_KEYS = {
  amber: {
    id: 'amber',
    name: 'Amber Diamond',
    color: '#d97706',
    darkColor: '#fbbf24',
    glyph: '◆',
    ariaLabel: 'Amber Key'
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan Star',
    color: '#0284c7',
    darkColor: '#38bdf8',
    glyph: '★',
    ariaLabel: 'Cyan Key'
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst Shield',
    color: '#9333ea',
    darkColor: '#c084fc',
    glyph: '▲',
    ariaLabel: 'Amethyst Key'
  }
};
export const COLOR_KEY_ORDER = ['amber', 'cyan', 'amethyst'];

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
  { id: 'tierEasy',      title: 'Stepping Up',        desc: 'Reach the Easy tier',                   icon: 'arrow',    test: s => s.stats.maxLevel  >= 201 },
  { id: 'tierMedium',    title: 'Focused Mind',       desc: 'Reach the Medium tier',                 icon: 'arrow',    test: s => s.stats.maxLevel  >= 501 },
  { id: 'tierHard',      title: 'Hardcore',           desc: 'Reach the Hard tier',                   icon: 'arrow',    test: s => s.stats.maxLevel  >= 901 },
  { id: 'tierExpert',    title: 'Stoic Master',       desc: 'Reach the Expert tier',                 icon: 'arrow',    test: s => s.stats.maxLevel  >= 1301 },
  { id: 'tierMaster',    title: 'Grandmaster',        desc: 'Reach the Master tier',                 icon: 'skull',    test: s => s.stats.maxLevel  >= 1701 },
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
