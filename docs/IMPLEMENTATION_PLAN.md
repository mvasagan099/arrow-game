# ARROW ESCAPE — COMPREHENSIVE IMPLEMENTATION PLAN

## Project Vision & Roadmap
Arrow Escape is an offline, minimalist arrow extraction puzzle game designed for modern Android devices. The objective is to transform an existing modular vanilla JavaScript canvas game into a polished, high-performance, commercially viable Android application published to Google Play.

The overall engineering roadmap is structured into eight distinct phases:

---

### Phase 1: Repository Setup, Audit & Stabilization (CURRENT)
- **Status**: Completed
- **Objectives**:
  - Clone, inspect, and stabilize the existing open-source codebase.
  - Setup dedicated `development` branch.
  - Audit architecture, dependencies, security, and licensing.
  - Verify zero-network offline functionality.
  - Build automated test suite covering game engine, collision, state reducers, persistence, and mobile viewports.
  - Perform performance analysis and benchmark generation/solving timings.
  - Fix critical identified defects (animation lag, modal stack splice bug, horizontal safe areas, computed style recomputation).
  - Create foundational documentation (`IMPLEMENTATION_PLAN`, `DEVELOPMENT_STATUS`, `ARCHITECTURE`, `TEST_REPORT`, `RELEASE_CHECKLIST`).

---

### Phase 2: Modern UI, Visual Polish & Animations (CURRENT)
- **Status**: Completed
- **Objectives**:
  - **Modern Interface Overhaul**: Introduce a refined, distraction-free aesthetic with smooth typography, subtle elevation shadows, and theme transitions.
  - **Home Screen Redesign**: Dedicated `#screen-home` with animated ambient ghost arrow canvas, original logo emblem, level progression display, Quick Nav, and hero CTA.
  - **Four Rich Themes**: Complete design token systems for `classic`, `dark`, `neon`, and `pastel` with verified WCAG contrast (>10:1).
  - **Zero-Allocation Particle System**: High-performance pooled particle effects (140-object pool) for directional arrow exit trails, collision blocker sparks, and celebratory win bursts.
  - **Haptic Feedback**: Cross-platform tactile vibration abstraction (`navigator.vibrate` with future Capacitor Haptics bridge) for tap, extract, collision block, victory, and failure.
  - **Mobile Layout & Viewport Optimization**: Complete responsive styling supporting cutouts/notches (`env(safe-area-inset-*)`), dynamic viewports (`dvh`), and verified fit across 360x800, 393x873, 412x915, and 768x1024.
  - **Procedural Sound Additions**: Enhanced Web Audio synthesizer adding clean tactile button tap blips (`sfxButton`) and descending chord failure sounds (`sfxFail`).
  - **Motion & Battery Efficiency**: Automatic loop pausing on `document.hidden` (`visibilitychange`), dirty-flag particle ticking, and `prefers-reduced-motion` compliance.

---

### Phase 3: Advanced Gameplay & 2,000+ Level Progression (CURRENT)
- **Status**: Completed
- **Objectives**:
  - **Six Difficulty Tiers (1 to 2,000 Levels)**: Beginner (1–200), Easy (201–500), Medium (501–900), Hard (901–1300), Expert (1301–1700), Master (1701–2000).
  - **100% Solvability Validation**: All 2,000 level seeds verified as solvable via automated puzzle solver (`test/validate-all-2000-levels.mjs`).
  - **Fixed Immovable Obstacles**: Immovable stone pillars blocking raycasts and introducing maze-like routing on Easy+ tiers.
  - **Color-Keyed Arrows**: Key-and-lock dependency mechanics with accessible colorway and geometric glyph badges (◆ Amber Diamond, ★ Cyan Star, ▲ Amethyst Shield) + padlock indicator.
  - **Rotating Pivot Arrows**: Strategic arrows featuring circular tail joints that swing 90° clockwise upon tapping when blocked, preserving hearts.
  - **Automated Puzzle Solver**: High-performance solver (`src/engine/solver.js`) handling raycasts, obstacles, key locks, and pivot rotations.
  - **Upgraded Level Selection**: Paginated grid (100/page), locked/unlocked state enforcement, completion star badges, and tier progress counters.
  - **Daily Challenge Offline Evolution**: Deterministic weekday tier rotation, 60-day challenge history tracking, and local streak maintenance.
  - **Interactive In-App Tutorials**: 7 comprehensive tutorial cards covering basic movement, collisions, undo, hints, obstacles, color-locks, and pivot arrows.
  - **Save Schema Migration**: Seamless backward-compatible migration supporting tutorial progress and daily challenge history.

---

### Phase 4: Offline Coins & Rewards Economy (CURRENT)
- **Status**: Completed
- **Objectives**:
  - **Offline Coin Wallet Service**: Centralized, atomic wallet (`src/economy/wallet.js`) initialized with 100 welcome coins, non-negative balance protection, lifetime earnings and spend tracking.
  - **Level Completion & Flawless Rewards**: +10 coins once per level on first solve, +5 coins flawless bonus (no hearts lost) on first flawless clear. Robust duplicate protection preventing infinite coin farming on replays while tracking `replaysCompleted`.
  - **7-Day Daily Login Reward Calendar**: Ascending reward cycle `[10, 15, 20, 25, 30, 40, 100]` with Day 7 milestone crown, local calendar date validation, consecutive login streak counter, and automatic streak reset on missed days.
  - **Daily Challenge Rewards**: +30 coins awarded once per dateKey upon completing the daily challenge puzzle.
  - **Hint Purchase Utility**: In-game hint button charges 25 coins. Strict transaction safety: validates affordability before deduction, checks if a solvable arrow exists via solver, only charges if a hint is successfully provided.
  - **Cosmetic Customization Shop**: Offline cosmetics catalog (`src/economy/economy-config.js` and `src/economy/shop.js`) with preview cards and live equipping for:
    - *Arrow Skins*: Classic (Free), Ocean (100 🪙), Sunset (150 🪙), Emerald (250 🪙), Golden (500 🪙) with tip glow and custom shaft colors.
    - *Board Styles*: Minimal Grid (Free), Blueprint Board (150 🪙), Midnight Velvet (200 🪙), Galaxy Nebula (300 🪙) with custom crosshairs, micro-rings, stars, and borders.
    - *Particle Trails*: Standard Spark (Free), Neon Cyber (200 🪙), Stardust (250 🪙), Rainbow Prism (350 🪙).
    - *Premium Themes*: Cyberpunk Amber (300 🪙), Forest Moss (300 🪙) without paywalling the 4 original themes (Classic, Dark, Neon, Pastel).
  - **Achievement Categorization & Rewards**: Expanded 24 achievements across 4 categories (Progression, Skill, Daily, Exploration) awarding +20 coins on unlock with category filter tabs in UI.
  - **Audit Trail & Bounded Persistence**: FIFO transaction audit log capped at 50 entries to guarantee local storage stays well below 10KB. Backward-compatible save migration ensuring 0 progress lost.
  - **Automated Economy Test Suite**: 20 comprehensive unit and integration tests (`test/economy.test.mjs`) covering wallet operations, duplicate prevention, streak resets, hint purchases, cosmetic purchases, and storage migration.

---

### Phase 5: Google AdMob Monetization, Consent Management & Offline Compatibility
- **Status**: Completed (Native on-device verification blocked by sandbox lacking Android SDK/JDK)
- **Objectives**:
  - **Ad Integration Architecture**:
    - *Bottom Adaptive Banner*: Displayed on non-gameplay screens (Home, Levels, Shop, Achievements); strictly hidden during active puzzle solving and tutorials to eliminate accidental clicks and touch interference.
    - *Natural Break Interstitial Ads*: Frequency capped with strict anti-annoyance rules (minimum 5 completed levels between ads, minimum 180 seconds cooldown, suppressed on levels 1–3, never during tutorials, modals, or active moves).
    - *Voluntary Rewarded Video Ads*: Watch rewarded video to earn 50 coins (daily cap of 3 claims/calendar day with local rollover) or 1 free hint token (only offered if a solvable move exists; stored persistently as `freeHintTokens` to prevent loss if the player navigates away).
  - **Consent Management (Google UMP)**: Privacy-first architecture integrating Google User Messaging Platform via `@capacitor-community/admob`, handling `OBTAINED`, `REQUIRED`, and `DENIED` states. Added "Privacy & Ad Choices" button in Settings modal to reopen the UMP consent form at any time.
  - **Offline Fallback Resilience**: Core gameplay 100% playable offline without network connectivity; ad subsystem gracefully falls back to `OfflineProvider` with zero freezes, zero latency spikes, and zero crashes.
  - **Minimum Capacitor Android Foundation**: Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, and `@capacitor-community/admob`; generated `android/` project, configured `AndroidManifest.xml` with Google test App ID (`ca-app-pub-3940256099942544~3347511713`), build script `scripts/build.mjs`, and synced assets to `assets/public/`.
  - **Comprehensive Automated Test Suite**: 30 dedicated unit/integration tests (`test/ads.test.mjs`) verifying provider abstractions, UMP consent flow, frequency capping, anti-exploit duplicate protection, hint token delivery, and existing save/wallet compatibility.

---

### Phase 6: Complete Android APK Development, Native Features & Build Verification
- **Status**: Completed
- **Objectives**:
  - **Environment & Android Toolchain Setup**:
    - Configured Adoptium OpenJDK 21 LTS (`21.0.13+9`) and Android SDK (Platforms 35/36, Build-Tools 36.0.0, platform-tools, cmdline-tools).
    - Configured `android/local.properties` and shell environment variables (`JAVA_HOME`, `ANDROID_HOME`, `PATH`).
    - Accepted all Android SDK and preview licenses.
  - **Native Plugin Architecture**:
    - Installed and linked `@capacitor/app@^8.1.2`, `@capacitor/haptics@^8.0.2`, `@capacitor/status-bar@^8.0.4`, `@capacitor/splash-screen@^8.0.2` alongside `@capacitor-community/admob@^8.3.0`.
    - Executed `npm run build` and `npx cap sync android` cleanly.
  - **Hardware Back Button Priority Navigation**:
    - Priority 1: Fullscreen ad dismissal (delegated to native AdMob activity).
    - Priority 2: Dismiss top modal dialog.
    - Priority 3: Active gameplay opens Pause dialog; pause dialog returns to Home.
    - Priority 4: Home screen double-tap back within 2,000ms exits app with warning toast.
  - **Android 12+ Splash Screen & Launch Sequence**:
    - Configured `Theme.SplashScreen` with `windowSplashScreenBackground` (`#0f172a`), `windowSplashScreenAnimatedIcon`, and `postSplashScreenTheme`.
    - Generated multi-density splash assets across `drawable-port-*` and `drawable-land-*` (`mdpi` to `xxxhdpi`).
    - Smooth JavaScript dismissal via `SplashScreen.hide({ fadeOutDuration: 300 })`.
  - **Adaptive Launcher Icons**:
    - Designed original vector adaptive icon foreground (`ic_launcher_foreground.xml`) and background (`ic_launcher_background.xml`) within the 66dp safe zone.
    - Generated multi-density PNGs for `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}` (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`).
  - **System UI & Status Bar Theming**:
    - Dynamically updates status bar color (`#0f172a`, `#f8fafc`, `#f3e8ff`) and icon contrast (Dark/Light) matching the active game theme.
  - **Native Haptics**:
    - Dynamic bridge to `@capacitor/haptics` (`Haptics.impact` and `Haptics.notification`) with fallback to `navigator.vibrate`.
  - **Automated Gradle Builds**:
    - Compiled installable debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (8.7 MB, Target SDK 36, Min SDK 24).
    - Compiled release Android App Bundle: `android/app/build/outputs/bundle/release/app-release.aab` (6.7 MB).
  - **Automated CI/CD Workflow**:
    - Implemented `.github/workflows/android-build.yml` running tests, level validation, web build, Capacitor sync, and compiling APK/AAB artifacts.
  - **Automated Native Test Suite**:
    - 11 unit/integration tests in `test/native-bridge.test.mjs` verifying back button hierarchy, theme status bar sync, and haptics. Total tests: 410 / 410 passing across 9 suites.

---

### Phase 7: Performance, Security & Multi-Device Testing
- **Status**: Pending
- **Objectives**:
  - **Profiler Audit**: Verify stable 60 FPS / 120 FPS frame rate on Android devices ranging from entry-level (e.g. MediaTek Helio G35) to flagship Snapdragon chips.
  - **Memory Leak Profiling**: Zero memory leaks over 100 consecutive level loads and solves.
  - **Battery Impact Analysis**: Minimize rAF ticks when idle; sleep loop completely when no animation is active.
  - **Accessibility (WCAG 2.1 AA)**: Full screen reader label coverage, high contrast modes, and dynamic text scaling.

---

### Phase 8: GitHub Actions CI/CD & Play Store Release
- **Status**: Pending
- **Objectives**:
  - **Automated CI Workflow**: GitHub Actions pipeline running linting, test suite, and bundle verification on every pull request.
  - **Automated CD Build**: GitHub Actions workflow generating release Android App Bundles (`.aab`) and debug APKs (`.apk`) using Gradle and Java 17/21.
  - **Keystore Signing**: Secure Google Play App Signing via GitHub Secrets.
  - **Store Listing Preparation**: Screenshots for phones and 10-inch tablets, feature graphic (1024x500), app description, privacy policy, and Google Play Data Safety declaration.
  - **Production Release**: Track rollout (Internal testing -> Closed testing -> Open testing -> Production).
