# Arrows – Puzzle Escape (Web)

A minimalist browser puzzle. Extract every arrow from the grid without causing a collision. Pure white background. Thin black arrows. No clutter, no timers, no ads — just the puzzle.

An unaffiliated fan recreation, inspired by *Arrows – Puzzle Escape* by Lessmore GmbH. Code is entirely original. MIT licensed.

## How to Play

Each arrow is a chunky shaft of connected cells with a triangular tip. Arrows can be **straight** or **bent** — a single arrow can turn 90° one or more times, snaking across the board. Tap any cell of an arrow to extract it; it slides off the board in the direction the tip points.

An arrow can only escape if **all the cells in front of its tip** are clear of any other arrow's body, all the way to the edge. Because bent arrows occupy multiple rows AND columns, a single bent arrow can block several others at once. Pick a blocked arrow and you lose a heart — the blocker briefly flashes red so you can see exactly what's in the way. Lose all 3 hearts and the level resets.

Clear the entire grid to advance.

## Run It

```bash
npm start
```

Then visit http://localhost:5173.

That's it — no `npm install`, no build step. Any static HTTP server works; the script just calls `python3 -m http.server`. You can also open `index.html` directly via `file://` if your browser allows ES modules from local files.

To verify the level generator:

```bash
npm test
```

This generates ~250 levels across all tiers and validates each one is solvable by construction.

## Controls

**Mouse / tap**
- Click an arrow to extract it
- Drag to pan the board
- Scroll wheel to zoom (anchored at the cursor)
- Top-left ☰ for menu (How to Play, Levels, Daily, Achievements, Settings)
- Bottom bar: Undo · Hint · Center · Restart

**Touch**
- Tap an arrow to extract
- Drag with one finger to pan
- Pinch with two fingers to zoom (also pans simultaneously)
- Long-press anywhere on the board for a hint

**Keyboard**
- `H` — hint
- `R` — restart level
- `U` or `Ctrl/⌘+Z` — undo
- `Space` — recenter view
- `+` / `-` — zoom in / out
- `←` / `→` — previous / next level
- `Esc` — close the topmost overlay

## Difficulty Tiers

Levels are seeded, so everyone gets the same Level *N*. Difficulty scales smoothly within and across tiers — every generated level is solvable by construction.

| Tier      | Levels   | Grid    | Arrows  | Lengths        | Bends           |
|-----------|----------|---------|---------|----------------|-----------------|
| Easy      | 1–200    | 20×20   | 14–26   | 1–7, mostly 3  | mostly straight |
| Medium    | 201–400  | 22×22   | 26–46   | 1–8, mostly 3–4| 0–3, ~40% bent  |
| Hard      | 401–600  | 24×24   | 40–68   | 1–8, mostly 4–5| 0–4, ~65% bent  |
| Very Hard | 601–800  | 26×26   | 55–88   | 1–8, mostly 4–5| 0–5, ~75% bent  |
| Nightmare | 801+     | 28×28   | 70–100  | 1–9, mostly 5  | 0–6, ~80% bent  |

The board is fully pannable + zoomable, so larger grids stay tappable on any screen size.

## Daily Challenge

A fresh puzzle every UTC day, the same one for every player. Difficulty rotates with the day of the week (Monday is the easiest, Sunday is Nightmare). Maintain a streak by completing each day's puzzle in sequence — miss a day and the streak resets.

## Achievements

Fifteen unlockables — first solve, level milestones, tier milestones, perfect (no-heart) clears, hint-free clears, and daily streaks. Progress + unlock dates persist locally.

## How Levels Stay Solvable

The generator builds levels in reverse, one arrow at a time. For each candidate it:

1. Picks a random tip cell and direction.
2. Walks backward (with 0..K right-angle bends) to lay out the body.
3. Accepts the arrow only if every body cell is in-bounds and unoccupied AND every cell in front of its tip is clear of any already-placed arrow.

Because the forward-path check runs against the arrows already on the board, the most recently placed arrow always has a clear exit. Reading the placement list backward therefore yields a valid extraction sequence — proof that the level is solvable. `npm test` re-walks this sequence on every generated puzzle and asserts it works.

## Project Layout

```
index.html              # markup shell (topbar, canvas, action bar, modals, drawer)
style.css               # light + dark theme via CSS custom properties
src/
  main.js               # bootstrap, singletons, game flow wiring
  config.js             # TIERS, DIRS, achievements, storage keys, constants
  persist.js            # namespaced localStorage with packed-bit completion bitmap
  engine/
    rng.js              # mulberry32 + weighted/shuffle helpers
    arrow.js            # arrow geometry helpers
    generator.js        # seeded reverse-construction level generator
    rules.js            # extraction validation + blocker detection
    state.js            # game state + reducers (tap, undo, restart)
    hint.js             # finds an extractable arrow
  render/
    loop.js             # rAF scheduler with dirty-flag + DPR sizing
    viewport.js         # pan/zoom math, screen <-> cell conversion
    canvas.js           # grid dots, arrow shafts, triangular tips, hint glow
    animations.js       # extract fly-out, block flash, wiggle, win flourish
  input/
    pointer.js          # tap / drag-pan / pinch-zoom / wheel-zoom / long-press
    keyboard.js         # global hotkeys
  ui/
    topbar.js           # level label, tier badge, hearts, progress bar
    actions.js          # Undo · Hint · Center · Restart wiring
    drawer.js           # left side drawer (stats, nav, settings toggles)
    modals.js           # generic modal open/close, toast, win card
    levels.js           # paginated level select with tier tabs
    achievements.js     # achievement grid + unlock evaluation
    daily.js            # daily challenge key + streak rollover
  audio/
    sounds.js           # WebAudio-synthesized SFX (no audio files)
test/
  smoke.mjs             # generator validation (run with `npm test`)
```

## Tech

Vanilla HTML / CSS / JavaScript with native ES modules. No bundler. No framework. No external runtime dependencies. All SFX are synthesized at runtime — no audio assets shipped.

## Credits

Inspired by *Arrows – Puzzle Escape* by Lessmore GmbH. This is an unaffiliated fan recreation for educational and personal use.

MIT licensed.
