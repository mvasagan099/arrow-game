#!/usr/bin/env bash
# ==============================================================================
# Arrow Escape — Automated Screenshot Capture Script (via ADB)
# ==============================================================================
# Captures official 1080x2400 portrait screenshots from an attached Android device or emulator.
# ==============================================================================

set -euo pipefail

OUT_DIR="docs/play-store/screenshots"
mkdir -p "$OUT_DIR"

if ! command -v adb &> /dev/null; then
  echo "ERROR: adb command not found on PATH."
  exit 1
fi

DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "ERROR: No Android device or emulator attached."
  echo "Connect an Android device with USB debugging enabled or start an Android Virtual Device (AVD)."
  exit 1
fi

echo "Capturing screenshots from attached Android device..."

capture() {
  local name="$1"
  local dest="$OUT_DIR/${name}.png"
  echo "Capturing: $dest"
  adb exec-out screencap -p > "$dest"
}

echo "Navigate the app to each screen, then press Enter to capture:"

read -p "1. Home Screen ready? Press [Enter]"
capture "01_home_screen"

read -p "2. Beginner Gameplay (Level 5) ready? Press [Enter]"
capture "02_beginner_gameplay"

read -p "3. Advanced Puzzle with Bent Arrows ready? Press [Enter]"
capture "03_advanced_puzzle"

read -p "4. Obstacles & Color-Keyed Locks ready? Press [Enter]"
capture "04_obstacles_and_locks"

read -p "5. Rotating Pivot Arrow Puzzle ready? Press [Enter]"
capture "05_rotating_pivots"

read -p "6. Victory / Level Complete Dialog ready? Press [Enter]"
capture "06_level_complete"

read -p "7. Level Selection (6 Difficulty Tiers) ready? Press [Enter]"
capture "07_level_selection"

read -p "8. Daily Challenge & 7-Day Streak ready? Press [Enter]"
capture "08_daily_challenge"

read -p "9. Cosmetic Shop ready? Press [Enter]"
capture "09_cosmetic_shop"

read -p "10. Achievements & Themes ready? Press [Enter]"
capture "10_achievements_themes"

echo "All screenshots captured into: $OUT_DIR"
