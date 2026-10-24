# ARROW ESCAPE — RELEASE & COMMERCIAL READINESS CHECKLIST

## 1. Legal & Intellectual Property Audit

- [x] **Source Code License**:
  - The repository `package.json` specifies `"license": "MIT"`.
  - The `README.md` states: *"An unaffiliated fan recreation, inspired by Arrows – Puzzle Escape by Lessmore GmbH. Code is entirely original. MIT licensed."*
- [x] **Zero Third-Party Binary Assets**:
  - Images: 0 raster files (PNG, JPG, WebP). 100% vector SVG inline.
  - Fonts: 0 external font files. System font fallback stack.
  - Sounds: 0 external audio files. 100% procedural Web Audio API synthesis.
  - Dependencies: 0 third-party runtime npm packages.
- [!] **CRITICAL RELEASE BLOCKER — Trademark & Branding Risk**:
  - *Risk*: "Arrows – Puzzle Escape" is a commercial game title and brand owned by Lessmore GmbH.
  - *Requirement*: For commercial Android distribution on Google Play Store, the application **must NOT** use the title "Arrows – Puzzle Escape", nor copy trade dress, logos, or market itself as affiliated.
  - *Remediation Action*: Rebrand the commercial app to a distinct title (e.g. **"Arrow Escape: Puzzle Logic"**, **"Arrow Out: Offline Puzzle"**, or **"Escape the Arrows"**) and ensure unique icon/graphic assets prior to Phase 8 release.
- [!] **Commercial Reuse Verification**:
  - The README contains the phrasing *"for educational and personal use"*, despite also asserting *"MIT licensed"*.
  - *Remediation Action*: Add formal `LICENSE` file containing standard MIT terms with explicit author attribution to ensure unambiguous commercial distribution rights.

---

## 2. Offline & Asset Bundling Verification

- [x] **Zero Network Runtime Dependencies**: Verified no `fetch()`, `XMLHttpRequest`, CDN links, or external script/font imports.
- [x] **Local File Loading**: Tested game execution via local static HTTP server and direct file bundling.
- [ ] **Capacitor Asset Bundling (Phase 6)**: Ensure all HTML/CSS/JS are staged in Android `app/src/main/assets/public`.
- [ ] **Service Worker / Cache Storage (PWA fallback)**: Optional service worker for web distribution.

---

## 3. Android Platform & Capacitor Requirements (Phase 6 Prep)

- [ ] **Target Android SDK**: Android 14+ (API Level 34+ required by Google Play in 2024/2025/2026).
- [ ] **Minimum Android SDK**: Android 7.0 (API Level 24) or Android 8.0 (API Level 26).
- [ ] **App Permissions**: Zero intrusive permissions (`android.permission.INTERNET` only for AdMob, zero storage or location permissions).
- [ ] **Hardware Acceleration**: `<application android:hardwareAccelerated="true">` in `AndroidManifest.xml`.
- [ ] **Safe-Area / Immersive Mode**: Fullscreen viewport with status bar matching light/dark theme.
- [ ] **Back Button Interception**: Hardware back closes active modal -> closes drawer -> prompts app exit.

---

## 4. Monetization & AdMob Requirements (Phase 5 Prep)

- [ ] **AdMob Account & App IDs**: Configure production Android App ID in `AndroidManifest.xml`.
- [ ] **Ad Unit IDs**:
  - Banner Ad Unit ID
  - Interstitial Ad Unit ID
  - Rewarded Ad Unit ID
- [ ] **Consent Management Platform (CMP)**: Integrate Google UMP SDK for European Economic Area (EEA) and UK user consent.
- [ ] **Offline Graceful Degradation**: Ad calls fail silently when offline without crashing or halting gameplay.

---

## 5. Google Play Store Submission Checklist (Phase 8 Prep)

- [ ] **App Package Name**: Unique reverse-DNS identifier (e.g., `com.arrowescape.puzzle`).
- [ ] **Keystore Signing**:
  - Release keystore generated (`.jks`).
  - Google Play App Signing enabled.
- [ ] **Store Graphics**:
  - High-res icon (512 × 512 px, 32-bit PNG).
  - Feature Graphic (1024 × 500 px, JPG or 24-bit PNG).
  - Phone screenshots (minimum 4, aspect ratio 16:9 or 9:16).
  - Tablet 7-inch & 10-inch screenshots (minimum 1 each).
- [ ] **Store Listing Metadata**:
  - Title (<= 30 characters).
  - Short description (<= 80 characters).
  - Full description (<= 4000 characters).
- [ ] **Data Safety & Privacy**:
  - Privacy policy URL hosted on GitHub Pages or custom domain.
  - Data Safety declaration: No user personal data collected or shared.
