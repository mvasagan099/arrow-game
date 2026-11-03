# Google AdMob Production Switchover & app-ads.txt Checklist

## 1. Executive Summary

This checklist provides step-by-step guidance for transitioning **Arrow Escape** from official Google test advertisements to verified production publisher advertisements prior to public release on the Google Play Store.

> [!WARNING]
> **CRITICAL ADMOB POLICY WARNINGS**:
> 1. **Do NOT release a production app with the Google Sample App ID** (`ca-app-pub-3940256099942544~3347511713`). Google will reject the build or disable advertising serving.
> 2. **Do NOT click your own live production advertisements or test live ad units on personal devices**. Doing so triggers automatic AdMob account suspension for "Invalid Traffic". Always keep test devices registered in AdMob Console.

---

## 2. Step-by-Step AdMob Production Setup

### Step 1: Create Arrow Escape Application in AdMob
1. Sign in to your [Google AdMob Console](https://apps.admob.com/).
2. In the sidebar, select **Apps > Add App**.
3. Select **Android** platform.
4. Is the app listed on a supported app store? Select **No** (until the app is published).
5. Name the app: **Arrow Escape**.
6. Note your assigned **AdMob App ID** (Format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`).

### Step 2: Create the Three Required Ad Units
In the AdMob Console under **Arrow Escape > Ad units > Add ad unit**:
1. **Adaptive Banner**:
   - Format: `Banner`
   - Name: `Arrow Escape Main Banner`
   - Note the **Banner Unit ID** (Format: `ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB`).
2. **Interstitial**:
   - Format: `Interstitial`
   - Name: `Arrow Escape Interstitial`
   - Note the **Interstitial Unit ID** (Format: `ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII`).
3. **Rewarded Video**:
   - Format: `Rewarded`
   - Name: `Arrow Escape Rewarded Coins`
   - Reward Amount: `50`, Item: `Coins`
   - Note the **Rewarded Unit ID** (Format: `ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR`).

### Step 3: Configure Google User Messaging Platform (UMP) Messages
1. In AdMob Console, navigate to **Privacy & messaging**.
2. Under **European regulations (GDPR)**:
   - Click **Create message**.
   - Select Arrow Escape app.
   - Set Default language (English).
   - Add your Privacy Policy URL (`https://yourdomain.com/privacy-policy.html`).
   - Enable the **"Do not consent"** option so users have an explicit refusal choice.
   - Publish the GDPR message.
3. Under **US state regulations**:
   - Create and publish the US state privacy message.

---

## 3. Codebase Production Switchover Steps

Once real publisher IDs are generated, apply them to the repository:

1. **Update AndroidManifest.xml**:
   In `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-YOUR_ACTUAL_APP_ID~YOUR_APP_KEY" />
   ```

2. **Update `src/ads/ad-config.js`**:
   Populate `PROD_AD_CONFIG`:
   ```javascript
   export const PROD_AD_CONFIG = {
     appId: 'ca-app-pub-YOUR_ACTUAL_APP_ID~YOUR_APP_KEY',
     bannerId: 'ca-app-pub-YOUR_ACTUAL_APP_ID/YOUR_BANNER_KEY',
     interstitialId: 'ca-app-pub-YOUR_ACTUAL_APP_ID/YOUR_INTERSTITIAL_KEY',
     rewardedId: 'ca-app-pub-YOUR_ACTUAL_APP_ID/YOUR_REWARDED_KEY',
     isTesting: false
   };
   ```
   Switch active config:
   ```javascript
   export const AD_CONFIG = {
     ...PROD_AD_CONFIG
   };
   ```

3. **Rebuild Web & Sync Capacitor**:
   ```bash
   npm run build
   npx cap sync android
   ```

---

## 4. app-ads.txt Implementation & Verification

Google AdMob requires an `app-ads.txt` file hosted on your public developer website to prevent unauthorized inventory spoofing.

### 4.1 Required File Content
The file must be named `app-ads.txt` and placed at the root of your developer domain:
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
- Replace `pub-XXXXXXXXXXXXXXXX` with your actual AdMob Publisher ID (found in AdMob Console under **Settings > Account information**).

### 4.2 Hosting Verification
- Verify the file is publicly accessible over HTTPS without redirects:
  `curl -I https://yourdomain.com/app-ads.txt`
  (Must return HTTP 200 OK with content-type `text/plain`).
- In Google Play Console under **Store settings > Store listing contact details**, ensure the **Website** field is set to:
  `https://yourdomain.com`
- AdMob will crawl `https://yourdomain.com/app-ads.txt` within 24–48 hours and mark your inventory status as **"Authorized"**.
