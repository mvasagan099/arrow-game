# ARROW ESCAPE — ARCHITECTURE & TECHNICAL SPECIFICATION

## 1. System Overview

Arrow Escape is a modular client-side logic puzzle application constructed with vanilla modern JavaScript (ES modules) and an HTML5 Canvas rendering engine. It requires zero compilation, zero bundlers, and zero external runtime libraries.

```
+------------------------------------------------------------------+
|                            index.html                            |
|  +-----------------------+ +----------------------------------+  |
|  |     Top Bar (DOM)     | |        Progress Bar (DOM)        |  |
|  +-----------------------+ +----------------------------------+  |
|  +-------------------------------------------------------------+ |
|  |                   Canvas Board (Canvas 2D)                  | |
|  |           - Grid Dots & Boundaries                          | |
|  |           - Arrow Shafts & Triangular Heads                 | |
|  |           - Snake Extraction & Collision Animations         | |
|  |           - Hint Glow & Hover Highlights                    | |
|  +-------------------------------------------------------------+ |
|  +-------------------------------------------------------------+ |
|  |                 Bottom Action Controls (DOM)                | |
|  +-------------------------------------------------------------+ |
|  +-------------------------------------------------------------+ |
|  |              Modals, Drawer Menu, Toast Alerts              | |
|  +-------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## 2. Module Directory Structure

```
.
├── index.html                  # Main application markup & DOM structure
├── style.css                   # Custom property themes, layout, animations
├── package.json                # Project scripts and metadata
├── src/
│   ├── main.js                 # Entry point, singletons & screen coordinator
│   ├── config.js               # Centralized THEMES, tiers, directions, achievements
│   ├── persist.js              # Namespaced localStorage with packed bitmask & theme migrations
│   ├── engine/
│   │   ├── rng.js              # Seeded Mulberry32 PRNG & sampling utilities
│   │   ├── arrow.js            # Arrow geometry, coordinates & raycasting
│   │   ├── generator.js        # Seeded reverse-construction puzzle generator
│   │   ├── rules.js            # Raycast extraction validation & blocker check
│   │   ├── state.js            # Game state reducers (tap, undo, restart)
│   │   └── hint.js             # Solvability hint finder
│   ├── render/
│   │   ├── loop.js             # Dirty-flag requestAnimationFrame loop, DPR & visibility pause
│   │   ├── viewport.js         # Pan/zoom math, coordinate transformations
│   │   ├── canvas.js           # Theme-aware grid, arrowheads, hint highlights & particle render pass
│   │   ├── animations.js       # Snake unfurl exit, red pulse, wiggle, win
│   │   └── particles.js        # Zero-allocation pooled particle system (140 pool)
│   ├── input/
│   │   ├── pointer.js          # Unified PointerEvents (tap, pan, pinch, wheel)
│   │   └── keyboard.js         # Accessibility and keyboard shortcuts
│   ├── ui/
│   │   ├── home.js             # Home screen controller & progression hero CTA
│   │   ├── home-bg.js          # Ambient drifting ghost arrows canvas
│   │   ├── settings.js         # Settings & theme selector modal controller
│   │   ├── topbar.js           # Header hearts, level number, tier badge, pause
│   │   ├── actions.js          # Bottom action bar (Undo, Hint, Center, Restart)
│   │   ├── drawer.js           # Left drawer menu, stats, settings toggles
│   │   ├── modals.js           # Modal stack manager, win card, fail card, pause, toast
│   │   ├── levels.js           # Paginated level select grid (1-9999)
│   │   ├── achievements.js     # Achievement evaluation & notifications
│   │   └── daily.js            # Daily UTC challenge & streak rollover
│   └── audio/
│       ├── sounds.js           # Procedural Web Audio API sound effects
│       └── haptics.js          # Cross-platform vibration abstraction
└── test/
    ├── smoke.mjs               # Procedural level solvability validation
    ├── engine.test.mjs         # Core mechanics, movement, blocking, undo tests
    ├── persistence.test.mjs    # Storage migration & bit packing tests
    ├── viewport.test.mjs       # Mobile responsive layout & coordinates tests
    ├── phase2.test.mjs         # Theme palettes, particles, haptics, WCAG contrast
    ├── benchmark.mjs           # Generation & solver performance benchmark
    └── run-all.mjs             # Unified automated test runner
```

---

## 3. Core Engine Mechanics

### 3.1 Reverse Construction Generation Algorithm
The puzzle generation algorithm in `src/engine/generator.js` guarantees that every level is solvable without guessing:
1. **Initial State**: An empty grid of size $G \times G$ is initialized along with an `occupied` 1D array (`Uint8Array`).
2. **Reverse Placement Loop**:
   - For each arrow, pick a random tip coordinate `(tipX, tipY)` and direction $D \in \{0, 1, 2, 3\}$.
   - Verify that the tip is unoccupied and that the forward ray from `tip` out to the edge in direction $D$ is completely unoccupied by any already-placed arrows.
   - Walk backwards in direction $(D + 2) \bmod 4$ with $0 \dots K$ orthogonal bends to place body cells.
   - If the body cells fit without collision or overlap, commit the arrow to the grid.
3. **Solvability Proof**: Because each newly placed arrow was guaranteed an unobstructed escape path past all previously placed arrows, the **exact reverse of the placement order** constitutes a guaranteed collision-free extraction sequence.

### 3.2 Collision & Blocker Detection
- In `src/engine/rules.js`, `tryExtract(arrows, arrow, grid)` casts a discrete ray from `arrow.tip` in `arrow.dir` to the grid edge:
  $$x(t) = \text{tip}.x + t \cdot dx, \quad y(t) = \text{tip}.y + t \cdot dy$$
- If any cell along the ray intersects another arrow's body or tip, `tryExtract` halts immediately and returns `{ ok: false, blocker, blockerCell }`.
- If the ray reaches the grid boundary without intersecting another arrow, it returns `{ ok: true }`.

### 3.3 State Machine & Undo Management
`src/engine/state.js` manages state transitions using immutable snapshot history:
- When `applyTap(state, arrowId)` is invoked:
  - Takes a deep clone snapshot of `{ arrows, hearts, moves, extractCount, missCount }`.
  - Appends to a circular history buffer (capped at 64 entries).
  - If valid: filters the extracted arrow from `state.arrows` and increments `moves` and `extractCount`.
  - If blocked: decrements `hearts` and sets `levelFailed = true` when hearts reach 0.
- `applyUndo(state)` pops the last snapshot and reinstates arrow lists and heart counts.

---

## 4. Rendering & Viewport Architecture

### 4.1 Dirty-Flag Render Loop
To optimize mobile battery life and eliminate wasted GPU cycles:
- `src/render/loop.js` tracks a `ctxState.dirty` flag.
- Canvas redraws occur only when `ctxState.dirty === true` or when an active animation is in flight (`animations.length > 0` or active hint pulse).
- When the screen is static, `renderFrame` is skipped completely.

### 4.2 High-DPI Screen Handling
- The canvas dynamically queries `window.devicePixelRatio` (clamped between 1 and 3).
- Canvas pixel buffer width/height is multiplied by DPR:
  $$\text{canvas.width} = \text{cssW} \times \text{dpr}, \quad \text{canvas.height} = \text{cssH} \times \text{dpr}$$
- `ctx.scale(dpr, dpr)` is applied before drawing, providing crisp lines and sharp text on Retina / AMOLED screens.

### 4.3 Coordinate Transformation Pipeline
The viewport converts between screen CSS pixels and discrete grid cell coordinates:
$$\text{cellPx} = \frac{\min(\text{canvasW}, \text{canvasH})}{\text{grid} + 1} \times \text{scale}$$
$$\text{cx} = \left\lfloor \frac{sx - \text{left}}{\text{cellPx}} \right\rfloor, \quad \text{cy} = \left\lfloor \frac{sy - \text{top}}{\text{cellPx}} \right\rfloor$$
Inverse center calculation:
$$\text{screenX} = \text{left} + (cx + 0.5) \times \text{cellPx}$$
$$\text{screenY} = \text{top} + (cy + 0.5) \times \text{cellPx}$$

---

## 5. Persistence Layer & Bitmask Serialization

To support thousands of solved levels without exceeding localStorage storage quotas or causing JSON parse overhead:
- `src/persist.js` packs solved states into a custom 6-bit per character base64 string (`BIT_TABLE`).
- Level $N$ corresponds to bit index $N - 1$:
  - Chunk index: $i = \lfloor (N - 1) / 6 \rfloor$
  - Bit offset: $b = (N - 1) \bmod 6$
- 2,000 levels require only $\approx 334$ bytes of text storage.
- Auto-migration ensures backwards compatibility with older schema versions.

---

## 6. Procedural Audio Synthesis

- `src/audio/sounds.js` employs the native browser Web Audio API:
  - `OscillatorNode` (sine, square, triangle, sawtooth waveforms)
  - `GainNode` with exponential and linear gain ramps
- No MP3, WAV, or OGG files are shipped, reducing binary size and eliminating asset loading latency.
- Audio context is lazily activated on the first user interaction to comply with modern browser autoplay policies.

---

## 7. Visual Polish, Themes & Particle System (Phase 2)

### 7.1 Screen Coordinator
Arrow Escape features a multi-screen SPA architecture without external routing libraries:
- `#screen-home`: Redesigned home interface featuring:
  - Ambient drifting ghost arrows canvas (`src/ui/home-bg.js`) running at a calm 30 FPS.
  - Original SVG logo emblem with rounded modern geometry.
  - Progression hero card (Continue Game with current level, tier, and solved count).
  - Quick Nav shortcuts (Levels, Daily Challenge, Achievements, Settings).
- `#screen-game`: Dedicated puzzle solving interface:
  - Top bar with Level title, tier badge, heart counters, and Pause button.
  - Responsive Canvas board with rounded arrowheads (`lineJoin: 'round'`).
  - Action controls (Undo, Hint, Center, Restart) with touch targets $\ge 54\text{px}$.

### 7.2 Theme Token Architecture
Four full palettes are defined in `src/config.js` and synced with CSS variables in `style.css`:
- **Classic**: Pure white background (`#ffffff`), rich charcoal ink (`#18181b`), vibrant sapphire blue accent (`#2563eb`).
- **Dark**: Deep OLED charcoal (`#09090b`), off-white ink (`#f4f4f5`), vivid electric sky accent (`#38bdf8`).
- **Neon**: Cyber midnight (`#0b0d19`), radiant cyan ink (`#38bdf8`), neon yellow accent (`#fde047`).
- **Pastel**: Calming lavender (`#f5f3ff`), deep plum ink (`#312e81`), soft indigo accent (`#6366f1`).
All four themes provide WCAG AAA contrast ratios exceeding 10:1 between background and ink colors. Switching themes is instant and preserves game state.

### 7.3 Zero-Allocation Pooled Particle System
To prevent runtime garbage collection jank on mobile devices:
- `src/render/particles.js` allocates a static fixed pool of 140 `Particle` objects during initialization.
- Particle effects are spawned without memory allocations:
  - `emitExtractParticles`: Directional trail along the arrow's exit vector.
  - `emitBlockParticles`: Radial collision spark bursts upon hitting a blocker.
  - `emitWinParticles`: Celebratory confetti burst upon clearing a level.
- Particles are updated in `src/render/loop.js` using delta-time math and drawn directly into the Canvas 2D render pass.

---

## 8. Haptic Feedback & Power Efficiency (Phase 2)

### 8.1 Haptics Abstraction
- `src/audio/haptics.js` provides fine-tuned vibration feedback:
  - **Tap**: $12\text{ms}$ subtle pulse for UI button navigation.
  - **Extract**: $18\text{ms}$ crisp tick for successful arrow exit.
  - **Block**: $[30, 40, 30]\text{ms}$ double jarring rumble for collision blocks.
  - **Win**: $[35, 45, 35, 50, 80]\text{ms}$ celebratory rhythmic burst.
  - **Fail**: $[80, 50, 100]\text{ms}$ heavy descent vibration when hearts reach 0.
- Safe graceful fallbacks handle environments without vibration support or when user toggles haptics off.

### 8.2 Battery & Power Conservation
- In `src/render/loop.js`, a `visibilitychange` listener automatically suspends the `requestAnimationFrame` loop when the application tab/screen is hidden (`document.hidden`).
- When resumed, the dirty flag is reasserted without delta time accumulation jumps.
- When no animations, interactions, or particles are active, the rendering loop sleeps completely at 0% CPU consumption.
