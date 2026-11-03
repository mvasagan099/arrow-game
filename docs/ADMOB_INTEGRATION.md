# ARROW ESCAPE — GOOGLE ADMOB INTEGRATION GUIDE

## 1. Overview & Architecture

Arrow Escape integrates Google AdMob through the official `@capacitor-community/admob` (v8.3.0) plugin, running on top of `@capacitor/core` (v8.6.0) and `@capacitor/android` (v8.6.0).

The integration architecture follows a strict decoupled provider pattern:
- **Core Game**: Never references Cordova, Capacitor, or AdMob SDK symbols directly.
- **`src/ads/ad-service.js`**: Unified facade coordinating providers, consent state, cooldown timers, anti-exploit reward ledgers, and screen lifecycles.
- **`src/ads/ad-provider.js`**: Concrete implementations for:
  - `NativeAdMobProvider`: Interfaces with `@capacitor-community/admob` when running on native Android.
  - `BrowserMockProvider`: Zero-network simulation for local web browser development and CI test runners.
  - `OfflineProvider`: Graceful fallback activated when offline, in airplane mode, or upon network failure.

---

## 2. Dependencies & Versions

| Package | Version | Purpose |
|---|---|---|
| `@capacitor/core` | `^8.6.0` | Native runtime bridge & platform detection |
| `@capacitor/cli` | `^8.6.0` | Build orchestration & `cap sync` tooling |
| `@capacitor/android` | `^8.6.0` | Android Gradle project wrapper |
| `@capacitor-community/admob` | `^8.3.0` | Google Mobile Ads & User Messaging Platform (UMP) bindings |

---

## 3. Native Android Configuration

### 3.1 `android/app/src/main/AndroidManifest.xml`
The application must declare the Google Mobile Ads Application ID metadata within the `<application>` tag:

```xml
<!-- Google Mobile Ads (AdMob) App ID -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"/>
```

> [!IMPORTANT]
> The current App ID (`ca-app-pub-3940256099942544~3347511713`) is the **official Google test App ID**. Do NOT publish to Google Play with this ID.

### 3.2 Android Permissions
The application requires only the standard network permission to retrieve advertisements:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
Zero invasive permissions (e.g. storage, location, contacts, camera) are requested.

---

## 4. Test Identifiers vs. Production Configuration

### 4.1 Development Test Identifiers
Arrow Escape uses official Google test IDs during development to prevent account suspension:

| Format | Unit Name | Identifier |
|---|---|---|
| **App ID** | Test App | `ca-app-pub-3940256099942544~3347511713` |
| **Banner** | Test Adaptive Banner | `ca-app-pub-3940256099942544/6300978111` |
| **Interstitial** | Test Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| **Rewarded Video** | Test Rewarded | `ca-app-pub-3940256099942544/5224354917` |

### 4.2 Production Switchover Procedure
Located in `src/ads/ad-config.js`:

```javascript
export const PROD_AD_CONFIG = {
  appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
  bannerId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  interstitialId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  rewardedId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  isTesting: false
};
```

**Step-by-Step Activation**:
1. Create an Android app entry in the [Google AdMob Console](https://admob.google.com).
2. Create Banner, Interstitial, and Rewarded ad units.
3. Replace the placeholder values in `PROD_AD_CONFIG` with real IDs.
4. Set `export const AD_CONFIG = { ...PROD_AD_CONFIG };`.
5. Update `android:value` for `com.google.android.gms.ads.APPLICATION_ID` in `android/app/src/main/AndroidManifest.xml`.
6. Run `npm run build && npx cap sync android`.

---

## 5. Google User Messaging Platform (UMP) Consent Flow

Located in `src/ads/ad-consent.js`:

1. **Initialization (`checkConsent`)**:
   - Gathers device consent info via `AdMob.requestConsentInfo()`.
   - If consent is required (`status === 'REQUIRED'`), presents the Google UMP consent form (`AdMob.showConsentForm()`).
   - Queries `canRequestAds()`. If consent is granted or not required in the user's jurisdiction, ad preloading begins.
2. **User Privacy Options (`showPrivacyOptions`)**:
   - The user can reopen the consent form at any time by tapping **"Privacy & Ad Choices"** in the Settings modal (`#modal-settings`).
   - This satisfies Google Play's mandatory requirement for user-revocable consent.

---

## 6. Advertisement Format Lifecycles & Integration Points

### 6.1 Adaptive Banner Advertisements
- **Allowed Contexts**: Home Screen, Level Select Grid, Cosmetic Shop, Achievements List.
- **Forbidden Contexts**: Active puzzle solving (`#screen-game`), tutorials.
- **Position**: Bottom centered (`AdMob.showBanner({ position: 'BOTTOM_CENTER' })`).
- **Cleanup**: `hideBanner()` is called synchronously on game transitions (`onPlay`, `jumpToLevel`, `startDaily`).

### 6.2 Interstitial Advertisements
- **Trigger**: Called only inside `onLevelComplete()` when a natural puzzle break occurs.
- **Frequency Gating**:
  - Minimum 5 completed levels since last interstitial.
  - Minimum 180 seconds cooldown between interstitial displays.
  - Suppressed on levels 1 to 3 to optimize player onboarding.
  - Suppressed during tutorials.
- **Input Locking**: While the interstitial is displayed, `document.body` is tagged with `.ad-fullscreen-active`, suspending puzzle touch events.

### 6.3 Rewarded Video Advertisements
- **Trigger**: 100% voluntary user opt-in via `#modal-shop`.
- **Options**:
  1. *Watch for Coins*: Awards +50 🪙. Capped at 3 claims per calendar day (automatic rollover at midnight).
  2. *Watch for Hint*: Awards +1 Free Hint Token (`freeHintTokens`). Rejects if no valid move exists on the current board.
- **Anti-Exploit Ledger**: Client-side session deduplication ensures duplicate native plugin callbacks never double-credit rewards.

---

## 7. Offline Graceful Degradation

Arrow Escape is strictly offline-first. When no network is detected:
1. `initAdService()` completes with `OfflineProvider`.
2. Core puzzle generation, level solving, coin earning, and cosmetic equipping proceed with zero delays or stutters.
3. Rewarded ad buttons display helpful offline indicators ("Ad unavailable right now (Offline Mode)").
4. Zero unhandled promise rejections, zero network retry polling loops, zero battery drain.

---

## 8. app-ads.txt Specification & Crawler Verification

To prevent advertising fraud and unauthorized inventory spoofing, Google AdMob enforces `app-ads.txt` verification:
1. Ensure your public developer website is reachable over HTTPS (e.g., `https://yourdomain.com`).
2. Place `app-ads.txt` at the root of the domain:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   *(Replace `pub-XXXXXXXXXXXXXXXX` with your verified AdMob publisher ID from AdMob Console > Settings > Account information).*
3. Verify public accessibility: `curl -I https://yourdomain.com/app-ads.txt` (must return HTTP 200).
4. In Google Play Console under **Store settings > Store listing contact details**, set **Website** to `https://yourdomain.com`.
5. AdMob crawlers scan the website within 24–48 hours, upgrading the app's inventory authorization to **Authorized**.
