# Arrow Escape — Remaining Owner Actions & Release Roadmap

## 1. Overview
This document tracks all external actions, operational authorizations, and manual steps that **must be completed by the repository owner / publisher** before Arrow Escape (`com.arrowescape.puzzle`) can be published beyond local verification into Google Play Internal and Closed Testing tracks.

---

## 2. Action Items Matrix

| ID | Action Item | Priority | Current Status | Blocker For |
|---|---|---|---|---|
| **OA-01** | Generate Upload Keystore (`arrow-escape-upload.jks`) | **CRITICAL** | Pending Owner Execution | Signed AAB generation |
| **OA-02** | Configure GitHub Repository Secrets | **CRITICAL** | Pending Owner Entry | Automated Release Pipeline |
| **OA-03** | Enable GitHub Pages for Privacy Policy | **HIGH** | Pending Repo Settings | Play Store Policy Compliance |
| **OA-04** | License Clarification with Upstream Author | **HIGH** | Pending Legal Review | Commercial Production Rollout |
| **OA-05** | Provide Real AdMob Publisher & Ad Unit IDs | **MEDIUM** | Test IDs Active (By Design) | Live Ad Monetization |
| **OA-06** | Create Google Play Internal Testing Track | **MEDIUM** | Ready for Upload | Tester Onboarding |
| **OA-07** | Prepare Closed Testing Tester Group (12+ Testers) | **MEDIUM** | Plan Prepared | Production Access Application |

---

## 3. Step-by-Step Instructions

### OA-01: Generate Upload Keystore
1. Run the generation script on your workstation:
   ```bash
   chmod +x scripts/generate-release-keystore.sh
   ./scripts/generate-release-keystore.sh
   ```
2. Enter your secure keystore password and certificate owner metadata.
3. Keep `arrow-escape-upload.jks` in a secure location. **Never commit `.jks` files to Git.**

### OA-02: Configure GitHub Repository Secrets
1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret** and add:
   - `RELEASE_KEYSTORE_BASE64`: The base64 output (`base64 -w 0 arrow-escape-upload.jks`)
   - `KEYSTORE_PASSWORD`: The password chosen during generation
   - `KEY_ALIAS`: `arrow-escape-upload`
   - `KEY_PASSWORD`: Key password (or same as keystore password)
3. Once added, push a release tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) to trigger the signed build release workflow.

### OA-03: Enable GitHub Pages for Privacy Policy
1. In GitHub repository settings, go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **Deploy from a branch**.
3. Select branch `development` (or `main`) and folder `/docs`. Click **Save**.
4. Within 1–2 minutes, verify the live URL:
   `https://mvasagan099.github.io/arrow-game/privacy-policy.html`
5. Paste this URL into Google Play Console under **Policy > App privacy policy**.

### OA-04: License Clarification & Upstream Attribution
- Upstream source contains a note in `README.md`: *"This is an unaffiliated fan recreation for educational and personal use."*
- However, the repository also includes a standard permissive MIT `LICENSE`.
- **Action**: Before enabling live in-app advertisements or publishing commercially, contact Jason Distler or review legal obligations to ensure no trademark collision exists with *"Arrows – Puzzle Escape"* by Lessmore GmbH.

### OA-05: Real Google AdMob IDs (Pre-Production)
- The app currently runs official Google test ad units.
- **Action**: In Google AdMob Console ([admob.google.com](https://admob.google.com)):
  1. Create an Android app entry for `com.arrowescape.puzzle`.
  2. Create Banner, Interstitial, and Rewarded ad units.
  3. Replace the placeholder IDs in `src/ads/ad-config.js` (`PROD_AD_CONFIG`) and `AndroidManifest.xml`.
  4. Link your AdMob app to Google Play Store once the listing is approved.

### OA-06: Google Play Store Listing & Internal Testing Track
1. Log in to [play.google.com/console](https://play.google.com/console).
2. Create app: **Arrow Escape: Puzzle Logic**, Free, Puzzle category.
3. Upload the 10 genuine screenshots from `docs/play-store/screenshots/`.
4. Upload `app_icon_512.png` and `feature_graphic_1024x500.png` from `docs/play-store/assets/`.
5. Paste listing copy from `docs/play-store/STORE_LISTING.md`.
6. Complete Data Safety form using `docs/play-store/DATA_SAFETY_ASSESSMENT.md`.
7. Upload the signed `app-release.aab` produced by the release workflow to the **Internal testing** track.
