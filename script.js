/* Arrows Escape - Main Game Logic (Vanilla JS)
 * This file grows iteratively across the implementation plan.
 * Current phase: PROCEDURAL GENERATOR + core validation
 */

(() => {
  'use strict';

  // ============================================
  // CONSTANTS & CONFIG
  // ============================================
  const MAX_LEVEL = 2000; // effectively infinite, but UI caps display
  const TIER_SIZES = {
    easy:      { start: 1,   end: 200, grid: 6, maxArrows: 23 },
    medium:    { start: 201, end: 400, grid: 7, maxArrows: 28 },
    hard:      { start: 401, end: 600, grid: 7, maxArrows: 32 },
    veryhard:  { start: 601, end: 800, grid: 8, maxArrows: 36 },
    nightmare: { start: 801, end: Infinity, grid: 8, maxArrows: 40 }
  };

  // Directions: 0=Up, 1=Right, 2=Down, 3=Left
  const DIRS = [
    { dx: 0, dy: -1, char: '↑', name: 'U' },
    { dx: 1, dy: 0, char: '→', name: 'R' },
    { dx: 0, dy: 1, char: '↓', name: 'D' },
    { dx: -1, dy: 0, char: '←', name: 'L' }
  ];

  // ============================================
  // STATE
  // ============================================
  let currentLevel = 1;
  let completedLevels = new Set(); // loaded from localStorage
  let achievementsState = {}; // id -> unlockedAt timestamp
  let currentArrows = []; // array of {x, y, dir}
  let hearts = 3;
  let moves = 0;
  let history = []; // for undo: snapshots of arrows + hearts + moves
  let initialArrows = []; // copy of the generated level for restarts
  let flying = []; // active flying arrows for animation {x,y,dir,progress}
  let particles = []; // subtle exit particles
  let stats = { totalCompleted: 0, perfectClears: 0, currentStreak: 0, maxStreak: 0, nightmareCleared: 0 };

  // Display size in CSS pixels (used for consistent view math on high-DPI screens)
  let displayW = 520;
  let displayH = 520;

  // View transform (will be expanded in viewport-controls)
  let view = { offsetX: 0, offsetY: 0, scale: 1 };

  // Runtime
  let canvas, ctx;
  let isPanning = false;
  let lastPointer = { x: 0, y: 0 };
  let animationFrame = null;

  // Simple seeded PRNG for reproducibility (used by generator later)
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================
  // UTILITIES
  // ============================================
  function getTierForLevel(level) {
    if (level <= 200) return 'easy';
    if (level <= 400) return 'medium';
    if (level <= 600) return 'hard';
    if (level <= 800) return 'veryhard';
    return 'nightmare';
  }

  // ============================================
  // CORE VALIDATION (used by generator and gameplay)
  // ============================================
  function isPathClear(arrows, arrow, gridSize) {
    // Returns true if the ray from arrow (x,y) in its direction contains NO other arrows
    const dir = DIRS[arrow.dir];
    let x = arrow.x + dir.dx;
    let y = arrow.y + dir.dy;
    while (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      for (const a of arrows) {
        if (a.x === x && a.y === y) return false;
      }
      x += dir.dx;
      y += dir.dy;
    }
    return true;
  }

  // Lightweight solver for hints (guarantees the returned move leads to a complete solution)
  function isSolvable(remaining, grid) {
    if (remaining.length === 0) return true;
    const cands = remaining.filter(a => isPathClear(remaining, a, grid));
    for (const c of cands) {
      const next = remaining.filter(a => a !== c);
      if (isSolvable(next, grid)) return true;
    }
    return false;
  }

  function getGoodHintMove(remaining, grid) {
    const cands = remaining.filter(a => isPathClear(remaining, a, grid));
    for (const c of cands) {
      const next = remaining.filter(a => a !== c);
      if (isSolvable(next, grid)) return c;
    }
    return null;
  }

  // ============================================
  // PROCEDURAL LEVEL GENERATOR (reverse construction)
  // Guarantees every generated level has at least one valid solution sequence.
  // ============================================
  function generateLevel(levelNum) {
    const tierName = getTierForLevel(levelNum);
    const tier = TIER_SIZES[tierName];
    const grid = tier.grid;
    // Aim for a satisfying number of arrows — always at least 20 from level 1
    let target = Math.floor(grid * 1.52 + (levelNum % 7));
    target = Math.max(20, Math.min(target, tier.maxArrows || 30));

    const rng = mulberry32(levelNum * 987654321 + grid * 13);
    let arrows = []; // current placed (in reverse-build order)

    // Helper: get all currently valid placement candidates
    function getCandidates() {
      const cands = [];
      const occupied = new Set(arrows.map(a => `${a.x},${a.y}`));
      for (let x = 0; x < grid; x++) {
        for (let y = 0; y < grid; y++) {
          if (occupied.has(`${x},${y}`)) continue;
          for (let d = 0; d < 4; d++) {
            const test = { x, y, dir: d };
            if (isPathClear(arrows, test, grid)) {
              cands.push(test);
            }
          }
        }
      }
      return cands;
    }

    // Build in reverse: each added arrow had a clear path at the time of "un-removal"
    for (let i = 0; i < target; i++) {
      let cands = getCandidates();

      // If for some reason we have no candidates (rare, due to blocking), relax by allowing any empty cell + random dir
      if (cands.length === 0) {
        const occupied = new Set(arrows.map(a => `${a.x},${a.y}`));
        for (let x = 0; x < grid; x++) {
          for (let y = 0; y < grid; y++) {
            if (occupied.has(`${x},${y}`)) continue;
            cands.push({ x, y, dir: Math.floor(rng() * 4) });
          }
        }
      }

      if (cands.length === 0) break; // should never happen

      // Pick with slight bias: prefer arrows near edges for early tiers, more mixed later
      let idx = Math.floor(rng() * cands.length);
      if (tierName === 'easy' || tierName === 'medium') {
        // bias toward border positions
        const border = cands.filter(c => c.x === 0 || c.x === grid - 1 || c.y === 0 || c.y === grid - 1);
        if (border.length > 0 && rng() < 0.65) {
          idx = cands.indexOf(border[Math.floor(rng() * border.length)]);
        }
      }
      const chosen = cands[idx];
      arrows.push(chosen);
    }

    // Final shuffle of the list (the solution order is the reverse of how we added)
    // but the set itself is what matters; the order we return doesn't matter for gameplay.
    // For debugging we could return the reverse as a "solution", but not needed.
    return arrows;
  }

  function saveProgress() {
    try {
      localStorage.setItem('arrows_completed', JSON.stringify([...completedLevels]));
      localStorage.setItem('arrows_achievements', JSON.stringify(achievementsState));
      localStorage.setItem('arrows_last_level', String(currentLevel));
      localStorage.setItem('arrows_stats', JSON.stringify(stats));
    } catch (e) { /* storage full or private mode */ }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('arrows_completed');
      if (saved) completedLevels = new Set(JSON.parse(saved));

      const ach = localStorage.getItem('arrows_achievements');
      if (ach) achievementsState = JSON.parse(ach);

      const last = localStorage.getItem('arrows_last_level');
      if (last) currentLevel = Math.max(1, parseInt(last, 10) || 1);

      const st = localStorage.getItem('arrows_stats');
      if (st) stats = { ...stats, ...JSON.parse(st) };
    } catch (e) {}
  }

  function showToast(msg, duration = 1600) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // ============================================
  // THEME (themes-and-particles todo will expand)
  // ============================================
  function initTheme() {
    const root = document.documentElement;
    const saved = localStorage.getItem('arrows_theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    if (saved === 'light' || (!saved && prefersLight)) {
      root.classList.add('light');
    }

    const btn = document.getElementById('btn-theme');
    const icon = btn.querySelector('.theme-icon');

    function updateIcon() {
      icon.textContent = root.classList.contains('light') ? '☀️' : '🌙';
    }
    updateIcon();

    btn.addEventListener('click', () => {
      root.classList.toggle('light');
      const isLight = root.classList.contains('light');
      localStorage.setItem('arrows_theme', isLight ? 'light' : 'dark');
      updateIcon();
    });
  }

  // ============================================
  // HEARTS UI
  // ============================================
  function renderHearts() {
    const container = document.getElementById('hearts');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'heart' + (i < hearts ? '' : ' lost');
      span.textContent = '❤️';
      container.appendChild(span);
    }
  }

  function loseHeart() {
    if (hearts > 0) hearts--;
    renderHearts();
    if (hearts <= 0) {
      setTimeout(showFailModal, 180);
    }
  }

  // ============================================
  // BASIC CANVAS RENDER (stub for setup)
  // ============================================
  function getLogicalCellFromPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const grid = getGridSizeForLevel(currentLevel);
    const padding = Math.min(rect.width, rect.height) * 0.04;

    const fitScale = Math.min(
      (rect.width - padding * 2) / grid,
      (rect.height - padding * 2) / grid
    );
    const totalScale = fitScale * view.scale;

    const gridLeft = (rect.width - grid * totalScale) / 2 + view.offsetX;
    const gridTop = (rect.height - grid * totalScale) / 2 + view.offsetY;

    const wx = (px - gridLeft) / totalScale;
    const wy = (py - gridTop) / totalScale;

    const x = Math.floor(wx);
    const y = Math.floor(wy);
    return {
      x: Math.max(0, Math.min(grid - 1, x)),
      y: Math.max(0, Math.min(grid - 1, y))
    };
  }

  function getGridSizeForLevel(level) {
    const tier = getTierForLevel(level);
    return TIER_SIZES[tier].grid;
  }

  function drawBoard() {
    if (!ctx || !canvas) return;

    const w = displayW;
    const h = displayH;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel-2').trim() || '#1f242e';
    ctx.fillRect(0, 0, w, h);

    const grid = getGridSizeForLevel(currentLevel);
    const padding = Math.min(w, h) * 0.04;

    // Base fit so the whole grid is nicely centered with padding
    const fitScale = Math.min(
      (w - padding * 2) / grid,
      (h - padding * 2) / grid
    );
    const totalScale = fitScale * view.scale;

    // Top-left of the grid in screen space (after user offset)
    const gridLeft = (w - grid * totalScale) / 2 + view.offsetX;
    const gridTop = (h - grid * totalScale) / 2 + view.offsetY;

    const cell = totalScale; // logical cell size in current view

    // Grid lines (subtle)
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#2a313c';
    ctx.lineWidth = Math.max(1, totalScale * 0.04);
    for (let i = 0; i <= grid; i++) {
      const x = gridLeft + i * totalScale;
      const y = gridTop + i * totalScale;
      ctx.beginPath();
      ctx.moveTo(x, gridTop);
      ctx.lineTo(x, gridTop + grid * totalScale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gridLeft, y);
      ctx.lineTo(gridLeft + grid * totalScale, y);
      ctx.stroke();
    }

    // Draw arrows
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ade80';
    ctx.strokeStyle = '#0f1115';
    ctx.lineWidth = Math.max(1.5, totalScale * 0.06);
    ctx.font = `bold ${Math.max(10, totalScale * 0.58)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const arrowsToDraw = currentArrows;

    for (const arr of arrowsToDraw) {
      const cx = gridLeft + (arr.x + 0.5) * totalScale;
      const cy = gridTop + (arr.y + 0.5) * totalScale;

      ctx.save();
      ctx.translate(cx, cy);
      const rot = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][arr.dir];
      ctx.rotate(rot);

      const s = totalScale;
      // shaft
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, 0);
      ctx.lineTo(s * 0.22, 0);
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.moveTo(s * 0.22, 0);
      ctx.lineTo(s * 0.02, -s * 0.2);
      ctx.lineTo(s * 0.02, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Subtle particle effects (exit sparks)
    if (particles.length > 0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ade80';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * 0.07;
        p.y += p.vy * 0.07;
        p.life *= 0.93;
        if (p.life < 0.03) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life * 0.9;
        const px = gridLeft + p.x * totalScale;
        const py = gridTop + p.y * totalScale;
        const r = Math.max(1.2, totalScale * 0.07);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Keep animating while particles exist
      if (particles.length > 0) {
        requestAnimationFrame(() => drawBoard());
      }
    }

    ctx.restore();
  }

  function getDemoArrows(grid) {
    // A few pleasing demo arrows for the skeleton
    const demo = [];
    if (grid >= 4) {
      demo.push({ x: 0, y: 0, dir: 1 }); // right
      demo.push({ x: 3, y: 1, dir: 2 }); // down
      demo.push({ x: 1, y: 3, dir: 0 }); // up
      demo.push({ x: 2, y: 2, dir: 3 }); // left
    }
    return demo;
  }

  function resizeCanvas() {
    // Keep the internal resolution high for crisp arrows
    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(520, Math.floor(window.innerWidth * 0.82));
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    displayW = displaySize;
    displayH = displaySize;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // drawing commands now use CSS pixels
    drawBoard();
  }

  // ============================================
  // INPUT (stubs - expanded in later todos)
  // ============================================
  function initInput() {
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);

    // Real wheel zoom, centered on cursor
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.13 : 0.89;
      const oldScale = view.scale;
      const newScale = Math.max(0.32, Math.min(6.0, oldScale * factor));

      // Keep the world point under the mouse fixed
      view.offsetX = mouseX - (mouseX - view.offsetX) * (newScale / oldScale);
      view.offsetY = mouseY - (mouseY - view.offsetY) * (newScale / oldScale);
      view.scale = newScale;

      drawBoard();
    }, { passive: false });

    // Keyboard (touch-and-keyboard todo)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        onHint();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        restartLevel();
      } else if (e.key.toLowerCase() === 'u' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        undo();
      } else if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        resetView();
      }
    });

    // Real tap-to-remove logic (core gameplay)
    canvas.addEventListener('click', (e) => {
      const { x, y } = getLogicalCellFromPointer(e.clientX, e.clientY);
      const grid = getGridSizeForLevel(currentLevel);
      const arrow = currentArrows.find(a => a.x === x && a.y === y);
      if (!arrow) return;

      if (!isPathClear(currentArrows, arrow, grid)) {
        showToast('Path blocked — arrow cannot escape that way');
        loseHeart();
        return;
      }

      // Valid removal
      history.push({
        arrows: currentArrows.map(a => ({ ...a })),
        hearts,
        moves
      });

      // Remove immediately (fly animation can be layered later)
      currentArrows = currentArrows.filter(a => a !== arrow);

      // Emit subtle particles for the exit effect
      const d = DIRS[arrow.dir];
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: arrow.x + 0.5 + (Math.random() - 0.5) * 0.4,
          y: arrow.y + 0.5 + (Math.random() - 0.5) * 0.4,
          vx: d.dx * (0.9 + Math.random() * 0.7),
          vy: d.dy * (0.9 + Math.random() * 0.7),
          life: 0.45 + Math.random() * 0.35
        });
      }

      moves++;
      document.getElementById('moves').textContent = `${moves} moves`;
      drawBoard();

      if (currentArrows.length === 0) {
        const heartsLeft = hearts;
        const wasNew = !completedLevels.has(currentLevel);
        completedLevels.add(currentLevel);

        // Update stats
        stats.totalCompleted = completedLevels.size;
        const tier = getTierForLevel(currentLevel);
        if (heartsLeft === 3) {
          stats.perfectClears++;
          stats.currentStreak++;
          stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        } else {
          stats.currentStreak = 0;
        }
        if (tier === 'nightmare') stats.nightmareCleared++;

        // Check & unlock achievements
        const newlyUnlocked = [];
        const defsForCheck = [
          { id: 'first', cond: () => stats.totalCompleted >= 1 },
          { id: 'perfect', cond: () => heartsLeft === 3 },
          { id: 'ten', cond: () => stats.totalCompleted >= 10 },
          { id: 'fifty', cond: () => stats.totalCompleted >= 50 },
          { id: 'hundred', cond: () => currentLevel >= 100 || stats.totalCompleted >= 100 },
          { id: 'twohundred', cond: () => stats.totalCompleted >= 200 },
          { id: 'streak5', cond: () => stats.currentStreak >= 5 || stats.maxStreak >= 5 },
          { id: 'streak10', cond: () => stats.maxStreak >= 10 },
          { id: 'nightmare1', cond: () => stats.nightmareCleared >= 1 },
          { id: 'nightmare10', cond: () => stats.nightmareCleared >= 10 },
          { id: 'noMistake', cond: () => heartsLeft === 3 && wasNew },
          { id: 'explorer', cond: () => ['easy','medium','hard','veryhard','nightmare'].every(t => Array.from(completedLevels).some(l => getTierForLevel(l) === t)) },
          { id: 'marathon', cond: () => stats.totalCompleted >= 500 },
          { id: 'grandmaster', cond: () => currentLevel >= 1000 || stats.totalCompleted >= 1000 },
          { id: 'zen', cond: () => stats.nightmareCleared >= 20 && stats.perfectClears >= 20 },
        ];
        defsForCheck.forEach(d => {
          if (!achievementsState[d.id] && d.cond()) {
            achievementsState[d.id] = Date.now();
            newlyUnlocked.push(d.id);
          }
        });

        saveProgress();

        setTimeout(() => {
          showWinModal(heartsLeft, moves, newlyUnlocked);
        }, 140);
      }
    });
  }

  function onPointerDown(e) {
    if (e.button === 2) { // right mouse
      isPanning = true;
      lastPointer = { x: e.clientX, y: e.clientY };
      canvas.parentElement.classList.add('panning');
      e.preventDefault();
    }
  }

  function onPointerUp(e) {
    if (isPanning) {
      isPanning = false;
      canvas.parentElement.classList.remove('panning');
    }
  }

  function onPointerMove(e) {
    if (!isPanning) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    view.offsetX += dx;
    view.offsetY += dy;
    lastPointer = { x: e.clientX, y: e.clientY };
    drawBoard(); // will respect view later
  }

  // Prevent context menu on right-click inside board
  function initContextMenu() {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ============================================
  // TOUCH GESTURES (pinch zoom + two-finger pan + long-press hint)
  // ============================================
  function initTouch() {
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let lastTouchPan = null;
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinchStartOffset = { x: 0, y: 0 };

    canvas.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      if (e.touches.length === 1) {
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTouchPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
        pinchStartScale = view.scale;
        pinchStartOffset = { ...view.offsetX ? {x: view.offsetX, y: view.offsetY} : {x:0,y:0} };
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        // Pinch + pan
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchStartDist > 0) {
          const factor = dist / pinchStartDist;
          const newScale = Math.max(0.32, Math.min(6, pinchStartScale * factor));
          // crude center: average of two touches
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = canvas.getBoundingClientRect();
          const relX = cx - rect.left;
          const relY = cy - rect.top;
          view.offsetX = relX - (relX - pinchStartOffset.x) * (newScale / pinchStartScale);
          view.offsetY = relY - (relY - pinchStartOffset.y) * (newScale / pinchStartScale);
          view.scale = newScale;
          drawBoard();
        }
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && lastTouchPan) {
        const t = e.touches[0];
        const dx = t.clientX - lastTouchPan.x;
        const dy = t.clientY - lastTouchPan.y;
        // only start panning after small threshold or time (to preserve tap)
        const moved = Math.hypot(dx, dy);
        if (moved > 8 || Date.now() - touchStartTime > 120) {
          view.offsetX += dx;
          view.offsetY += dy;
          lastTouchPan = { x: t.clientX, y: t.clientY };
          drawBoard();
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      const duration = Date.now() - touchStartTime;
      // Long press hint
      if (e.changedTouches.length === 1 && duration > 420) {
        const t = e.changedTouches[0];
        // trigger hint (and prevent immediate tap remove if any)
        onHint();
        e.preventDefault();
      }
      lastTouchPan = null;
      pinchStartDist = 0;
    });
  }

  // ============================================
  // BUTTON ACTIONS (stubs)
  // ============================================
  function onHint() {
    const grid = getGridSizeForLevel(currentLevel);
    const good = getGoodHintMove(currentArrows, grid);
    if (!good) {
      showToast('No safe move found (should not happen on generated levels)');
      return;
    }
    // Temporary highlight: draw a ring around the good arrow for 1.4s
    const originalDraw = drawBoard;
    let highlightUntil = Date.now() + 1400;
    const highlightDraw = () => {
      originalDraw();
      if (Date.now() < highlightUntil) {
        const rect = canvas.getBoundingClientRect();
        // recompute the transform quickly (dupe of draw logic, simplified)
        const padding = Math.min(rect.width, rect.height) * 0.04;
        const fit = Math.min((rect.width - padding*2)/grid, (rect.height - padding*2)/grid);
        const ts = fit * view.scale;
        const gl = (rect.width - grid * ts) / 2 + view.offsetX;
        const gt = (rect.height - grid * ts) / 2 + view.offsetY;
        const cx = gl + (good.x + 0.5) * ts;
        const cy = gt + (good.y + 0.5) * ts;
        const r = ts * 0.42;
        const ctx2 = ctx;
        ctx2.save();
        ctx2.strokeStyle = '#facc15';
        ctx2.lineWidth = Math.max(2, ts * 0.08);
        ctx2.beginPath();
        ctx2.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.restore();
        requestAnimationFrame(highlightDraw);
      } else {
        drawBoard();
      }
    };
    highlightDraw();
    showToast(`Hint: remove the highlighted arrow (${good.x},${good.y})`);
  }

  function undo() {
    if (history.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const prev = history.pop();
    currentArrows = prev.arrows.map(a => ({...a}));
    hearts = prev.hearts;
    moves = prev.moves;
    renderHearts();
    document.getElementById('moves').textContent = `${moves} moves`;
    drawBoard();
  }

  function restartLevel() {
    history = [];
    hearts = 3;
    moves = 0;
    // Reset to the initial generated state for this level
    currentArrows = initialArrows.map(a => ({ ...a }));
    flying = [];
    renderHearts();
    document.getElementById('moves').textContent = '0 moves';
    drawBoard();
    showToast('Level restarted');
  }

  function resetView() {
    view = { offsetX: 0, offsetY: 0, scale: 1 };
    drawBoard();
    showToast('View reset');
  }

  // ============================================
  // MODALS
  // ============================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  }

  function initModals() {
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal');
        if (modal) modal.classList.remove('open');
      });
    });

    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });

    // Header buttons
    document.getElementById('btn-howto').addEventListener('click', () => openModal('modal-howto'));
    document.getElementById('btn-levels').addEventListener('click', () => {
      openModal('modal-levels');
      renderLevelsGrid();
    });
    document.getElementById('btn-achievements').addEventListener('click', () => {
      openModal('modal-achievements');
      renderAchievements();
    });

    // Levels modal actions (stubs)
    const jumpInput = document.getElementById('level-jump');
    document.getElementById('btn-jump').addEventListener('click', () => {
      const n = parseInt(jumpInput.value, 10);
      if (n >= 1) {
        loadLevel(n);
        closeModal('modal-levels');
      }
    });
    document.getElementById('btn-next-unsolved').addEventListener('click', () => {
      let n = currentLevel + 1;
      while (completedLevels.has(n) && n < MAX_LEVEL) n++;
      loadLevel(n);
      closeModal('modal-levels');
    });

    // Difficulty tabs
    document.querySelectorAll('.difficulty-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLevelsGrid(tab.dataset.tier);
      });
    });

    // Win modal buttons
    document.getElementById('btn-win-replay').addEventListener('click', () => {
      closeModal('modal-win');
      restartLevel();
    });
    document.getElementById('btn-win-next').addEventListener('click', () => {
      closeModal('modal-win');
      loadLevel(currentLevel + 1);
    });

    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      closeModal('modal-fail');
      restartLevel();
    });
  }

  function renderLevelsGrid(filter = 'all') {
    const grid = document.getElementById('levels-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let start = 1, end = 120; // generous window; jump works for any higher level
    if (filter !== 'all') {
      const t = TIER_SIZES[filter];
      if (t) { start = t.start; end = Math.min(t.end, start + 59); }
    }

    for (let lv = start; lv <= end; lv++) {
      const card = document.createElement('div');
      card.className = 'level-card';
      card.textContent = lv;
      if (completedLevels.has(lv)) card.classList.add('completed');
      if (lv === currentLevel) card.classList.add('current');

      card.addEventListener('click', () => {
        loadLevel(lv);
        closeModal('modal-levels');
      });
      grid.appendChild(card);
    }
  }

  function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    const progressEl = document.getElementById('ach-progress');
    if (!container) return;

    // 15+ Achievements - single source of truth
    const defs = [
      { id: 'first', title: 'First Flight', desc: 'Complete your first level' },
      { id: 'perfect', title: 'Perfect Clear', desc: 'Finish any level with all 3 hearts' },
      { id: 'ten', title: 'Ten Down', desc: 'Complete 10 levels' },
      { id: 'fifty', title: 'Half Century', desc: 'Complete 50 levels' },
      { id: 'hundred', title: 'Century', desc: 'Reach level 100' },
      { id: 'twohundred', title: 'Dedicated', desc: 'Complete 200 levels' },
      { id: 'streak5', title: 'On a Roll', desc: '5 perfect clears in a row' },
      { id: 'streak10', title: 'Unstoppable', desc: '10 perfect clears in a row' },
      { id: 'nightmare1', title: 'Nightmare Survivor', desc: 'Complete your first Nightmare level' },
      { id: 'nightmare10', title: 'Nightmare Master', desc: 'Complete 10 Nightmare levels' },
      { id: 'noMistake', title: 'Flawless Run', desc: 'Complete a level on the first try (no hearts lost)' },
      { id: 'explorer', title: 'Explorer', desc: 'Play at least one level in every difficulty tier' },
      { id: 'marathon', title: 'Marathon', desc: 'Complete 500 levels' },
      { id: 'grandmaster', title: 'Grandmaster', desc: 'Complete level 1000' },
      { id: 'zen', title: 'Zen Master', desc: 'Complete 20 perfect Nightmare levels' },
    ];

    let unlockedCount = 0;
    container.innerHTML = '';

    defs.forEach(def => {
      const unlocked = !!achievementsState[def.id];
      if (unlocked) unlockedCount++;

      const card = document.createElement('div');
      card.className = 'ach-card ' + (unlocked ? 'unlocked' : 'locked');
      card.innerHTML = `
        <div class="ach-title">${def.title}</div>
        <div class="ach-desc">${def.desc}</div>
        <div class="ach-status">${unlocked ? '✓ Unlocked' : 'Locked'}</div>
      `;
      container.appendChild(card);
    });

    progressEl.textContent = `(${unlockedCount}/${defs.length})`;
  }

  function showWinModal(heartsLeft, moveCount, newlyUnlocked = []) {
    const modal = document.getElementById('modal-win');
    document.getElementById('win-hearts').textContent = heartsLeft;
    document.getElementById('win-moves').textContent = moveCount;
    document.getElementById('win-message').textContent = heartsLeft === 3 ? 'Perfect! No hearts lost.' : 'Well done.';

    const newAchEl = document.getElementById('win-new-achievements');
    newAchEl.innerHTML = '';
    if (newlyUnlocked.length > 0) {
      const title = document.createElement('div');
      title.style.fontWeight = '700';
      title.style.marginBottom = '4px';
      title.textContent = 'New Achievement' + (newlyUnlocked.length > 1 ? 's' : '') + ' Unlocked:';
      newAchEl.appendChild(title);

      newlyUnlocked.forEach(id => {
        const badge = document.createElement('span');
        badge.style.cssText = 'display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:999px;background:var(--accent);color:#0f1115;font-size:12px;font-weight:700;';
        // find title from the list (simple map)
        const map = { first:'First Flight', perfect:'Perfect Clear', ten:'Ten Down', fifty:'Half Century', hundred:'Century', twohundred:'Dedicated', streak5:'On a Roll', streak10:'Unstoppable', nightmare1:'Nightmare Survivor', nightmare10:'Nightmare Master', noMistake:'Flawless Run', explorer:'Explorer', marathon:'Marathon', grandmaster:'Grandmaster', zen:'Zen Master' };
        badge.textContent = map[id] || id;
        newAchEl.appendChild(badge);
      });
    }

    openModal('modal-win');
  }

  function showFailModal() {
    openModal('modal-fail');
  }

  // Demo level complete for skeleton
  function completeLevelDemo() {
    completedLevels.add(currentLevel);
    saveProgress();

    // Fake achievement unlock for first level
    if (!achievementsState.first) {
      achievementsState.first = Date.now();
      showToast('Achievement unlocked: First Flight!');
    }
    saveProgress();

    showWinModal(hearts, moves);

    // Advance currentLevel for convenience
    currentLevel = Math.min(currentLevel + 1, 50); // stay reasonable in skeleton
    document.getElementById('level-label').textContent = `Level ${currentLevel}`;
    document.getElementById('level-tier').textContent = getTierForLevel(currentLevel);
    document.getElementById('level-tier').className = `tier ${getTierForLevel(currentLevel)}`;
  }

  // ============================================
  // LEVEL LOADING (powered by procedural generator)
  // ============================================
  function loadLevel(levelNum) {
    currentLevel = Math.max(1, Math.min(levelNum, 9999));
    document.getElementById('level-label').textContent = `Level ${currentLevel}`;
    const tier = getTierForLevel(currentLevel);
    const tierEl = document.getElementById('level-tier');
    tierEl.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    tierEl.className = `tier ${tier}`;

    hearts = 3;
    moves = 0;
    history = [];
    document.getElementById('moves').textContent = '0 moves';
    renderHearts();

    // Real seeded procedural generation — every level is solvable by construction
    currentArrows = generateLevel(currentLevel);
    initialArrows = currentArrows.map(a => ({ ...a }));
    flying = [];
    particles = [];
    view = { offsetX: 0, offsetY: 0, scale: 1 }; // nice fit for the new level

    drawBoard();
    saveProgress();
    showToast(`Loaded Level ${currentLevel}`);
  }

  // ============================================
  // MAIN INIT
  // ============================================
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d', { alpha: true });

    // Prime the display size from the rendered element (handles high-DPI correctly)
    const initialRect = canvas.getBoundingClientRect();
    if (initialRect.width > 0) {
      displayW = Math.round(initialRect.width);
      displayH = Math.round(initialRect.height);
    }

    loadProgress();

    initTheme();
    initModals();
    initInput();
    initContextMenu();
    initTouch();

    // Initial level
    const tierEl = document.getElementById('level-tier');
    tierEl.textContent = getTierForLevel(currentLevel);
    tierEl.className = `tier ${getTierForLevel(currentLevel)}`;
    document.getElementById('level-label').textContent = `Level ${currentLevel}`;

    // Seed first level with real generated arrows (solvable by construction)
    currentArrows = generateLevel(currentLevel);
    renderHearts();
    document.getElementById('moves').textContent = '0 moves';

    // Resize & draw
    window.addEventListener('resize', () => {
      resizeCanvas();
    });
    setTimeout(() => {
      resizeCanvas();
    }, 30);

    // Keyboard hint in console
    console.log('%c[Arrows Escape] Skeleton ready. Press H/R/U/Space in game. Full generator & logic next.', 'color:#64748b');

    // Expose a tiny debug API
    window.ARROWS_DEBUG = {
      loadLevel,
      restart: restartLevel,
      getState: () => ({ currentLevel, hearts, arrows: currentArrows })
    };
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
