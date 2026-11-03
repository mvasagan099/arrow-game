# Arrow Escape — Known Issues & Operational Considerations (v1.0.0)

## 1. Overview
This document tracks known non-critical behaviors, operational considerations, and external dependency requirements for **Arrow Escape: Puzzle Logic** (Version 1.0.0, Build 1) prior to Google Play Internal Testing.

---

## 2. Release & Configuration Considerations

### 2.1 AdMob Test Identifiers Active by Design
- **Status**: Expected Behavior in Development.
- **Details**: The application currently uses official Google Mobile Ads test IDs (`ca-app-pub-3940256099942544~3347511713`).
- **Owner Action**: Prior to promoting from Internal Testing to Production, the owner must update `PROD_AD_CONFIG` in `src/ads/ad-config.js` and `AndroidManifest.xml` with real publisher unit IDs from the AdMob Console.

### 2.2 Release Keystore Signing Separation
- **Status**: Expected Security Standard.
- **Details**: The repository does not store or commit private keystore certificates.
- **Owner Action**: The owner must generate the upload keystore using `./scripts/generate-release-keystore.sh` and populate GitHub Secrets (`RELEASE_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) to enable automated cryptographic signing in `.github/workflows/android-release.yml`.

### 2.3 Physical Device Screenshots Pending
- **Status**: Documented Pending Milestone.
- **Details**: In accordance with Google Play developer policies, fabricated screenshots are strictly avoided. Because build environments run in headless Linux containers without physical displays, screenshots must be captured from an attached device or emulator using `./scripts/capture-screenshots.sh`.

---

## 3. Gameplay & UI Behavioral Notes

### 3.1 Offline Mode & Rewarded Videos
- **Behavior**: When the device is offline or in Airplane mode, tapping the rewarded video button in the Cosmetic Shop displays a friendly notice: *"Ad unavailable right now (Offline Mode)"*.
- **Impact**: Zero impact on gameplay; 100% of levels, hints, undos, and cosmetics remain accessible.

### 3.2 Double-Back to Exit Navigation
- **Behavior**: On the Home screen, pressing the hardware back button displays a temporary toast: *"Press back again to exit"*. Tapping back a second time within 2,000 ms exits the app.
- **Impact**: Standard Android navigation behavior designed to prevent accidental application exit during touch interactions.

### 3.3 Large Screen / Tablet Layout
- **Behavior**: On wide screens and tablets (> 600 dp width), the playable canvas board is capped at a maximum width to prevent excessive finger travel and preserve mobile ergonomics.
- **Impact**: The puzzle board is centered with comfortable margins on Android tablets and foldables.

### 3.4 Local Data Retention & Uninstalls
- **Behavior**: Game progression is stored in sandboxed Android WebView storage (`localStorage`).
- **Impact**: Uninstalling the game or selecting "Clear Data" in Android Settings wipes local progress unless restored via Android Auto Backup to Google Drive.
