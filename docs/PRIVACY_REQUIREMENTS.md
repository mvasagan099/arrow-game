# ARROW ESCAPE — PRIVACY REQUIREMENTS & CONSENT MANAGEMENT

## 1. Regulatory Context

Arrow Escape is designed to comply with global privacy regulations:
- **General Data Protection Regulation (GDPR)** (European Union / UK)
- **ePrivacy Directive** (EU cookie and device identifier consent)
- **California Consumer Privacy Act (CCPA) / CPRA** (United States)
- **Google Play Data Safety Section Requirements**

---

## 2. Google User Messaging Platform (UMP) Architecture

Arrow Escape implements the official Google User Messaging Platform (UMP) via `@capacitor-community/admob`:

### 2.1 Consent Flow Execution
Located in `src/ads/ad-consent.js`:
1. **Consent Information Request**:
   - At app launch, `AdMob.requestConsentInfo()` queries whether the user is located in the EEA/UK or a state requiring consent.
2. **Form Presentation**:
   - If `status === 'REQUIRED'`, `AdMob.showConsentForm()` is presented modally before any advertisement calls are made.
3. **Ad Request Gating**:
   - `canRequestAds()` verifies that consent has been obtained (`OBTAINED`) or is not required (`NOT_REQUIRED`).
   - If consent is declined or required, non-personalized / zero-ad policies apply.
4. **Persistent User Choice**:
   - The user can change or revoke their consent at any time by tapping **"Privacy & Ad Choices"** in the Settings dialog.

### 2.2 Regional Test Geography
For local testing of EU/GDPR consent flows in non-EU development environments:
- `checkConsent` supports `options.debugGeography = 1` (EEA mode).
- Testing with Google test devices ensures full simulation of consent banners.

---

## 3. Google Play Data Safety Declarations

When publishing Arrow Escape on Google Play Console, declare the following disclosures:

### 3.1 Data Collected by Third-Party SDKs (Google Mobile Ads)
- **Location**: Coarse Location (used by AdMob for regional ad serving, if authorized by device).
- **Device or other IDs**:
  - Advertising ID (AAID) collected for advertising and fraud prevention purposes.
- **App info and performance**: Crash logs and diagnostics collected by Google Play Services.

### 3.2 Data Collected by Arrow Escape Application
- **Zero Personal Data**: The game itself does not collect names, email addresses, phone numbers, payment details, contacts, or precise location.
- **Zero External Telemetry**: Game progress, wallet balance, and settings are stored locally in the device's sandbox (`localStorage`).
- **Data Sharing**: Zero player progress or analytics shared with any third-party server.

---

## 4. Child-Directed Treatment & Age Ratings

- **Target Audience**: Arrow Escape is designed as a logic puzzle game for general audiences (age 13+).
- **AdMob Content Rating**: Max ad content rating should be configured to **G** or **PG** in the Google AdMob console.
- **COPPA Compliance**: If the target audience is extended to children under 13 in the future, set `tagForChildDirectedTreatment: true` in the AdMob configuration.
