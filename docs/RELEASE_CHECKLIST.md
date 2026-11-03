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
- [x] **Capacitor Asset Bundling (Phase 6)**: Staged all HTML/CSS/JS in Android `app/src/main/assets/public/` with automated `npx cap sync android`.
- [ ] **Service Worker / Cache Storage (PWA fallback)**: Optional service worker for web distribution.

---

## 3. Android Platform & Capacitor Requirements (Phase 6 Completed)

- [x] **Target Android SDK**: Target SDK 36 (Android 16), compile SDK 36 (exceeding Google Play requirement 34+).
- [x] **Minimum Android SDK**: Android 7.0 (API Level 24).
- [x] **App Permissions**: Zero intrusive permissions (`android.permission.INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `AD_ID`). Zero storage, contacts, or location permissions.
- [x] **Hardware Acceleration**: `<application android:hardwareAccelerated="true">` in `AndroidManifest.xml`.
- [x] **Safe-Area / Immersive Mode**: Fullscreen viewport with status bar matching light/dark theme (`@capacitor/status-bar`).
- [x] **Back Button Interception**: Hardware back priority dispatcher (dismiss full-screen ad -> dismiss topmost modal -> open/close pause during gameplay -> double back to exit on Home).
- [x] **Adaptive Launcher Icons**: Vector adaptive icon foreground/background within 66dp safe zone + full density PNGs (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi).
- [x] **Android 12+ Splash Screen**: `Theme.SplashScreen` configured with navy background, animated icon, and smooth fade dismissal via `@capacitor/splash-screen`.
- [x] **Android Binaries Generated**:
  - Installable debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (8.7 MB)
  - Release Android App Bundle: `android/app/build/outputs/bundle/release/app-release.aab` (6.7 MB)
- [x] **Automated CI/CD**: GitHub Actions workflow `.github/workflows/android-build.yml` compiling APK and AAB on pushes.

---

## 4. Monetization & AdMob Production Switchover (Phase 5)

- [x] **AdMob Architecture & Capacitor Integration**:
  - `@capacitor-community/admob@8.3.0` installed and linked in native Android project.
  - Provider abstraction layer (`NativeAdMobProvider`, `BrowserMockProvider`, `OfflineProvider`) verified.
  - 30 automated tests passing in `test/ads.test.mjs`.
- [x] **Official Google Test IDs (Current Development State)**:
  - App ID: `ca-app-pub-3940256099942544~3347511713` in `AndroidManifest.xml` and `src/ads/ad-config.js`.
  - Banner Unit ID: `ca-app-pub-3940256099942544/6300978111`.
  - Interstitial Unit ID: `ca-app-pub-3940256099942544/1033173712`.
  - Rewarded Unit ID: `ca-app-pub-3940256099942544/5224354917`.
  - Test mode verified (`isTesting: true`).
- [x] **Consent Management Platform (CMP)**:
  - Google UMP consent flow integrated with `canRequestAds()` blocking before consent.
  - "Privacy & Ad Choices" button provided in Settings dialog to reopen UMP form on demand.
- [x] **Offline Graceful Degradation**:
  - Core game 100% playable with 0 network requests; `OfflineProvider` prevents all crashes and freezes.
- [ ] **Production Activation Steps (Before Google Play Submission)**:
  - [ ] 1. Create Arrow Escape Android application entry in Google AdMob Console.
  - [ ] 2. Update `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>` in `android/app/src/main/AndroidManifest.xml` with production App ID.
  - [ ] 3. Create Banner, Interstitial, and Rewarded Ad Units in AdMob Console.
  - [ ] 4. In `src/ads/ad-config.js`, update `PROD_AD_CONFIG` with real IDs and set `isTesting: false`.
  - [ ] 5. In AdMob Console -> Privacy & messaging, publish the GDPR consent message and US state regulations message.
  - [ ] 6. Complete Google Play Console "Data safety" section declaring Advertising ID collection by Google Play Services AdMob SDK.

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

---

## 6. Phase 7 Security, Performance & Stability Verification (COMPLETED)

- [x] **OWASP MASVS Audit**: `docs/SECURITY_AUDIT.md` completed. Remote WebView debugging disabled in release builds (`BuildConfig.DEBUG` gating in `MainActivity.java`).
- [x] **Zero Dangerous Permissions**: Verified in `AndroidManifest.xml` via `test/security.test.mjs`.
- [x] **GPU Draw Call Reduction**: Batched grid dot rendering into single path; 1,600 calls reduced to 1 call per frame (`docs/PERFORMANCE_BENCHMARKS.md`).
- [x] **Idle CPU Optimization**: `stopLoop()` halting rAF on Home screen; 0.0% idle CPU drain.
- [x] **Offline Stability**: Verified 16 offline scenarios in `test/offline.test.mjs`.
- [x] **Timezone / DST Math**: Integer UTC day difference algorithm verified in `test/economy-integrity.test.mjs`.
- [x] **Long-Duration Stress**: 100 level solves, 100 restarts, 100 undos, 50 theme switches with zero leaks (+6.2MB heap delta in `docs/STABILITY_TEST_REPORT.md`).
- [x] **Multi-Device Compatibility**: Layout tested across 9:16 to 9:21 and 3:4 tablets (`docs/DEVICE_COMPATIBILITY.md`).
