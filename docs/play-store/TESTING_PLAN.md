# Google Play Console — Testing Strategy & Quality Assurance Plan

## 1. Overview

Before public distribution on Google Play Store, **Arrow Escape** should progress through a staged testing workflow:
1. **Internal Testing Track**: Immediate verification with developers and core stakeholders.
2. **Closed Testing Track (12 Testers for 14 Days)**: Mandatory testing milestone for Google Play personal developer accounts created after November 13, 2023.
3. **Open Testing / Production Release**: Full public deployment.

---

## 2. Stage 1: Internal Testing Track

The Internal Testing track provides near-instant distribution without waiting for Google Play app review.

### Setup Instructions:
1. In Google Play Console, go to **Arrow Escape > Testing > Internal testing**.
2. Click **Create new release**.
3. Upload the signed `app-release.aab` bundle.
4. Name the release: `1.0.0 (1) - Internal Release Candidate 1`.
5. Under **Testers**, create an email list (e.g. `core-testers`) and invite up to 100 internal testers by email.
6. Share the generated **opt-in URL** with your testers.

### Internal Testing Verification Checklist:
- [ ] **First Launch**: App launches smoothly with Android 12+ splash screen.
- [ ] **Offline Execution**: Enable Airplane mode prior to launch; verify all puzzles generate and solve with 0 errors.
- [ ] **Progression Saving**: Complete Levels 1 to 10; close and restart app; verify progress persists.
- [ ] **Coin Wallet & Shop**: Verify level clear (+10 coins), flawless clear (+5 coins), daily reward, and purchasing cosmetics.
- [ ] **Cosmetic Equipping**: Equip arrow skins and board styles; verify live in-game rendering.
- [ ] **Hints & Undo**: Verify hint button consumes 25 coins only if a hint is delivered; verify undo rewinds moves cleanly.
- [ ] **Daily Challenge**: Solve today's challenge and verify +30 coins bounty.
- [ ] **AdMob & Consent (when online)**: Verify UMP consent form displays on first connected launch in EU/UK regions.
- [ ] **Hardware Back Button**: Test back button across modals, pause menus, and double-tap to exit on Home screen.
- [ ] **Form Factors**: Test on phone, foldable, and tablet displays.

---

## 3. Stage 2: Closed Testing Track (12 Testers for 14 Days Requirement)

For personal Google Play developer accounts created after **November 13, 2023**, Google requires at least **12 testers to be opted in for at least 14 continuous days** before the account can apply for Production access.

### Requirements & Setup:
1. Go to **Testing > Closed testing**.
2. Create a track (e.g., `Closed Alpha`).
3. Create an email list containing at least 15–20 trusted testers (to ensure a safe buffer over the 12-tester minimum).
4. Send the opt-in link to testers and confirm they install the app from Google Play.
5. **Continuous Engagement**: Encourage testers to open and play the game several times throughout the 14-day period.
6. **Monitor Android Vitals**:
   - Check **Quality > Android vitals > Crashes and ANRs** daily.
   - User-perceived crash rate must stay below Google's bad behavior threshold (< 1.09%).
   - User-perceived ANR rate must stay below the threshold (< 0.47%).

---

## 4. Applying for Production Access

Once the 14 days of closed testing are complete:
1. Navigate to **Dashboard** in Google Play Console.
2. Click **Apply for production**.
3. Complete the questionnaire explaining:
   - How you recruited your testers (friends, colleagues, puzzle gaming community).
   - Summary of feedback received (e.g. puzzle difficulty curve, theme preferences, battery performance).
   - Changes and bug fixes made during the testing phase.
4. Google will review the application within 7 business days and grant production access upon approval.
