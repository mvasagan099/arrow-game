/* Centralized Economy Configuration for Arrow Escape.
   Defines coin rewards, hint costs, daily login calendar cycle,
   and cosmetic shop catalog. */

export const INITIAL_COINS = 100;

export const REWARDS = {
  LEVEL_COMPLETE: 10,
  PERFECT_BONUS: 5,
  DAILY_CHALLENGE: 30,
  ACHIEVEMENT: 20,
  SEVEN_DAY_STREAK: 100,
  DAILY_CALENDAR: [10, 15, 20, 25, 30, 40, 100]
};

export const COSTS = {
  HINT: 25
};

export const MAX_TRANSACTION_HISTORY = 50;

/* Cosmetic Shop Catalog
   Categories:
     - arrow: Arrow shaft and tip visual treatments
     - board: Board grid background accents and dot styles
     - trail: Particle exit effects
     - theme: Premium cosmetic visual themes (original 4 themes remain 100% free)
*/
export const COSMETICS = {
  // Arrow Skins
  arrow_default: {
    id: 'arrow_default',
    category: 'arrow',
    name: 'Classic Arrow',
    desc: 'The original minimalist arrow style.',
    cost: 0,
    isDefault: true,
    style: {
      shaftColor: null, // uses theme ink
      tipGlow: false,
      accentColor: null
    }
  },
  arrow_ocean: {
    id: 'arrow_ocean',
    category: 'arrow',
    name: 'Ocean Arrow',
    desc: 'Deep marine blue with aquatic cyan tips.',
    cost: 100,
    style: {
      shaftColor: '#0284c7',
      tipColor: '#38bdf8',
      tipGlow: true,
      accentColor: '#0ea5e9'
    }
  },
  arrow_sunset: {
    id: 'arrow_sunset',
    category: 'arrow',
    name: 'Sunset Arrow',
    desc: 'Warm gradient coral and amber highlights.',
    cost: 150,
    style: {
      shaftColor: '#f43f5e',
      tipColor: '#fb923c',
      tipGlow: true,
      accentColor: '#f97316'
    }
  },
  arrow_emerald: {
    id: 'arrow_emerald',
    category: 'arrow',
    name: 'Emerald Arrow',
    desc: 'Luminous jade shaft with glowing mint tips.',
    cost: 250,
    style: {
      shaftColor: '#059669',
      tipColor: '#34d399',
      tipGlow: true,
      accentColor: '#10b981'
    }
  },
  arrow_gold: {
    id: 'arrow_gold',
    category: 'arrow',
    name: 'Golden Arrow',
    desc: 'Gleaming metallic gold with radiant amber luster.',
    cost: 500,
    style: {
      shaftColor: '#d97706',
      tipColor: '#fbbf24',
      tipGlow: true,
      accentColor: '#f59e0b'
    }
  },

  // Board Styles
  board_default: {
    id: 'board_default',
    category: 'board',
    name: 'Minimal Grid',
    desc: 'Standard clean dot grid.',
    cost: 0,
    isDefault: true,
    style: {
      gridStyle: 'dots',
      borderColor: null
    }
  },
  board_blueprint: {
    id: 'board_blueprint',
    category: 'board',
    name: 'Blueprint Board',
    desc: 'Architectural blueprint with subtle crosshair grid.',
    cost: 150,
    style: {
      gridStyle: 'blueprint',
      borderColor: '#3b82f6'
    }
  },
  board_velvet: {
    id: 'board_velvet',
    category: 'board',
    name: 'Midnight Velvet',
    desc: 'Deep obsidian backdrop with refined border bevel.',
    cost: 200,
    style: {
      gridStyle: 'velvet',
      borderColor: '#8b5cf6'
    }
  },
  board_galaxy: {
    id: 'board_galaxy',
    category: 'board',
    name: 'Galaxy Board',
    desc: 'Cosmic space grid with celestial nebula stars.',
    cost: 300,
    style: {
      gridStyle: 'galaxy',
      borderColor: '#ec4899'
    }
  },

  // Particle Trails
  trail_default: {
    id: 'trail_default',
    category: 'trail',
    name: 'Standard Spark',
    desc: 'Original theme-matched exit particles.',
    cost: 0,
    isDefault: true,
    style: {
      colorMode: 'theme'
    }
  },
  trail_neon: {
    id: 'trail_neon',
    category: 'trail',
    name: 'Neon Cyber Trail',
    desc: 'High-voltage electric cyan & violet sparks.',
    cost: 200,
    style: {
      colorMode: 'neon',
      colors: ['#38bdf8', '#818cf8', '#c084fc']
    }
  },
  trail_stardust: {
    id: 'trail_stardust',
    category: 'trail',
    name: 'Stardust Sparkle',
    desc: 'Glittering golden and champagne starry trail.',
    cost: 250,
    style: {
      colorMode: 'stardust',
      colors: ['#fbbf24', '#fef08a', '#ffffff']
    }
  },
  trail_rainbow: {
    id: 'trail_rainbow',
    category: 'trail',
    name: 'Rainbow Prism',
    desc: 'Vibrant spectral burst across all colors.',
    cost: 350,
    style: {
      colorMode: 'rainbow',
      colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
    }
  },

  // Premium Cosmetic Themes
  theme_cyberpunk: {
    id: 'theme_cyberpunk',
    category: 'theme',
    name: 'Cyberpunk Amber',
    desc: 'Dark industrial noir with hot amber & crimson energy.',
    cost: 300,
    themeDef: {
      id: 'cyberpunk',
      name: 'Cyberpunk Amber',
      desc: 'Dark industrial noir with hot amber & crimson energy',
      isDark: true,
      preview: { bg: '#0d0d12', ink: '#fbbf24', accent: '#f43f5e' },
      palette: {
        bg: '#0d0d12',
        bgSoft: '#181822',
        bgCard: '#1f1f2e',
        ink: '#fbbf24',
        inkSoft: '#f59e0b',
        inkFaint: '#b45309',
        line: '#2d2d42',
        lineStrong: '#444463',
        accent: '#f43f5e',
        danger: '#ef4444',
        heart: '#fb7185',
        hint: '#facc15',
        good: '#10b981'
      }
    }
  },
  theme_forest: {
    id: 'theme_forest',
    category: 'theme',
    name: 'Forest Moss',
    desc: 'Earthy emerald greens and organic botanical slate.',
    cost: 300,
    themeDef: {
      id: 'forest',
      name: 'Forest Moss',
      desc: 'Earthy emerald greens and organic botanical slate',
      isDark: true,
      preview: { bg: '#061a14', ink: '#34d399', accent: '#10b981' },
      palette: {
        bg: '#061a14',
        bgSoft: '#0c2e24',
        bgCard: '#123d31',
        ink: '#34d399',
        inkSoft: '#10b981',
        inkFaint: '#065f46',
        line: '#134e3f',
        lineStrong: '#1f6f5b',
        accent: '#10b981',
        danger: '#f87171',
        heart: '#fb7185',
        hint: '#facc15',
        good: '#34d399'
      }
    }
  }
};
