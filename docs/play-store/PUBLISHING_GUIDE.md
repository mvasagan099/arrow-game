# Arrow Escape — End-to-End Google Play Publishing Guide

## 1. Overview
This comprehensive guide provides step-by-step instructions for publishing **Arrow Escape: Puzzle Logic** to the Google Play Store, outlining all automated repository workflows and required manual developer actions in the Google Play Console.

---

## 2. Prerequisites & Developer Account Setup
1. **Google Play Developer Account**:
   - Register at the [Google Play Console](https://play.google.com/console/signup).
   - Pay the one-time $25 registration fee.
   - Complete Google's mandatory Identity and Dun & Bradstreet (D-U-N-S) organization verification (or personal identity verification).
2. **Merchant Account**:
   - Not required because Arrow Escape is a 100% free application with zero in-app purchases.

---

## 3. Play Console App Setup Steps

### Step 1: Create Application
1. Click **Create app**.
2. **App name**: `Arrow Escape: Puzzle Logic`
3. **Default language**: `English (United States) – en-US`
4. **App or game**: `Game`
5. **Free or paid**: `Free`
6. Accept Declarations and click **Create app**.

### Step 2: Complete Dashboard App Content Questionnaires
Navigate to **Policy and programs > App content** and complete each section:
1. **Privacy Policy**:
   - Enter your public HTTPS URL (e.g., `https://yourdomain.com/privacy-policy.html` or GitHub Pages link).
2. **App Access**:
   - Select: *All functionality is available without special access restrictions* (no login or credentials required).
3. **Ads**:
   - Select: *Yes, my app contains ads* (Google AdMob SDK integrated).
4. **Content Rating**:
   - Complete the IARC questionnaire using [CONTENT_RATING_GUIDE.md](file:///home/mani/Documents/arrow%20game/docs/play-store/CONTENT_RATING_GUIDE.md). Expected rating: Everyone / PEGI 3.
5. **Target Audience and Content**:
   - Select: *13–15, 16–17, 18 and over*.
   - Unintentionally appeal to children: *No*.
6. **Data Safety**:
   - Complete the questionnaire using [DATA_SAFETY_ASSESSMENT.md](file:///home/mani/Documents/arrow%20game/docs/play-store/DATA_SAFETY_ASSESSMENT.md).
7. **Government Apps**:
   - Select: *No*.
8. **Financial Features**:
   - Select: *My app does not provide financial features*.

### Step 3: Main Store Listing
Navigate to **Grow > Store presence > Main store listing**:
1. **App details**:
   - App title: `Arrow Escape: Puzzle Logic`
   - Short description: Copy from [STORE_LISTING.md](file:///home/mani/Documents/arrow%20game/docs/play-store/STORE_LISTING.md).
   - Full description: Copy from [STORE_LISTING.md](file:///home/mani/Documents/arrow%20game/docs/play-store/STORE_LISTING.md).
2. **Graphics**:
   - **App icon**: Upload `docs/play-store/assets/app_icon_512.png` (512 × 512 px).
   - **Feature graphic**: Upload `docs/play-store/assets/feature_graphic_1024x500.png` (1024 × 500 px).
   - **Phone screenshots**: Upload captured device screenshots (minimum 4 screenshots).
   - **Tablet screenshots**: Upload tablet screenshots if targeting tablet discovery.
3. Save changes.

### Step 4: Store Settings & Contact Details
1. Go to **Grow > Store presence > Store settings**.
2. **Category**: `Games > Puzzle`.
3. **Tags**: Add `Puzzle`, `Brain Games`, `Offline`, `Logic`, `Single Player`.
4. **Store listing contact details**:
   - Email address: `support@yourdomain.com`
   - Website: `https://yourdomain.com` *(Must match your app-ads.txt host)*.

---

## 4. Keystore Signing & Release Artifact Workflow

### 4.1 Generate Upload Keystore
Run the secure local generator script:
```bash
./scripts/generate-release-keystore.sh
```
Follow the prompts to set your private keystore password and alias.

### 4.2 Configure GitHub Actions Secrets
In your GitHub repository (**Settings > Secrets and variables > Actions > New repository secret**):
- `RELEASE_KEYSTORE_BASE64`: Paste the base64-encoded keystore content.
- `KEYSTORE_PASSWORD`: Your keystore password.
- `KEY_ALIAS`: `arrow-escape-upload`
- `KEY_PASSWORD`: Your key password.

### 4.3 Trigger Automated Release Build
1. In GitHub, go to **Actions > Android Release Build & Sign**.
2. Click **Run workflow** on the `development` or `main` branch.
3. The workflow will:
   - Run the full 460-test suite and 2,000 level validator.
   - Decode the keystore into temporary storage.
   - Build signed `app-release.aab` and `app-release.apk`.
   - Verify digital signatures and generate SHA-256 checksums.
   - Securely destroy the temporary keystore file.
   - Upload the signed artifacts for download.

---

## 5. Google Play App Signing & Track Upload
1. In Google Play Console under **Release > Setup > App signing**, select **Use Google Play App Signing** (recommended standard).
2. Download your signed `app-release.aab` from your GitHub Actions Release workflow run.
3. Navigate to **Testing > Internal testing > Create new release**.
4. Upload `app-release.aab`.
5. Enter Release Notes from [RELEASE_NOTES.md](file:///home/mani/Documents/arrow%20game/docs/play-store/RELEASE_NOTES.md).
6. Click **Review and save** then **Start rollout to Internal testing**.

---

## 6. Testing & Production Rollout Roadmap
1. **Internal Testing**: Verify installation, offline launch, progression persistence, cosmetic purchases, and haptics on physical test devices.
2. **Closed Testing**: Recruit at least 12 testers for 14 consecutive days (if on personal account).
3. **Production Application**: Apply for production access via the Play Console dashboard once closed testing concludes.
4. **Production Release**: Staged rollout (e.g. 10% -> 25% -> 50% -> 100%) to safely monitor crash metrics and player feedback in Google Play Android Vitals.
