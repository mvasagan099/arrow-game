# Arrows Escape Web

A minimalist browser-based recreation of the popular "Arrows – Puzzle Escape" logic puzzle game.

- Over 1000 procedurally generated levels across 5 difficulty tiers (Easy → Nightmare)
- Fully playable on desktop and touch devices
- Pan (right-drag / two-finger) and zoom (wheel / pinch) on the puzzle
- Light & dark themes
- 15+ achievements
- Smart hint system powered by a solver
- Keyboard shortcuts
- Subtle particle effects on successful moves
- No timers, no ads, pure relaxing logic

## Play

The easiest way:

```bash
npm install
npm start
```

Then open http://localhost:5173

You can also simply double-click `index.html` in any modern browser (no server required).

Or visit the hosted version (when deployed).

## How to Play

- Tap / click an arrow to extract it.
- An arrow can only be removed if its path in the direction it points is completely clear all the way to the edge of the grid.
- If you choose a blocked arrow, you lose a heart and the level resets.
- Clear the entire board without losing all 3 hearts to win the level.
- Use **Hint** when stuck — it suggests a move that leads to a complete solution.
- Pan and zoom freely on larger puzzles.

### Controls

**Mouse / Trackpad**
- Left click / tap: select & remove arrow
- Right click + drag: pan the board
- Scroll wheel: zoom in/out

**Touch**
- Single tap: remove arrow
- Long press on board or Hint button: show hint
- Pinch: zoom
- Two fingers drag: pan

**Keyboard**
- `H` – Hint
- `R` – Restart level
- `U` or `Ctrl+Z` – Undo last move
- `Space` or `Esc` – Reset view (fit board)
- Arrow keys – Nudge pan when zoomed

## Level Progression

Levels 1–∞ are generated on the fly using a seeded algorithm so everyone sees the same board for a given level number. Difficulty ramps up automatically:

- 1–200: Easy (4×4–5×5)
- 201–400: Medium
- 401–600: Hard
- 601–800: Very Hard
- 801+: Nightmare (largest grids, densest layouts)

Your progress (completed levels + achievements) is saved locally in the browser.

## Development

Pure vanilla HTML5 / CSS / JavaScript. No build step required.

```bash
npm start
```

This starts a local server on http://localhost:5173 (using `serve`).

You can also use any other static server or just open `index.html` directly.

## License

MIT – feel free to study, modify, and host your own version.

## Credits

Inspired by *Arrows – Puzzle Escape* by Lessmore GmbH (original mobile game).

This is a fan recreation for educational and personal use.

---

Enjoy the puzzles! 🧠✨
