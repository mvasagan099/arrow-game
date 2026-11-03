# Arrow Escape — Internal Testing Readiness & Closed Testing Plan

## 1. Overview
This document outlines the testing strategy, deployment prerequisites, and operational procedures for **Arrow Escape: Puzzle Logic** (`com.arrowescape.puzzle`, Version 1.0.0, Build 1) on Google Play Console.

---

## 2. Testing Track Architecture

```
[Local Development / Emulator]
         │
         ▼
[GitHub Actions CI: android-build.yml] (Automated Tests + Unsigned AAB)
         │
         ▼ (Triggered by Release Tag v1.0.0 with Configured Secrets)
[GitHub Actions Release: android-release.yml] (Signed AAB)
         │
         ▼
[Google Play Console: Internal Testing Track] (Up to 100 internal testers, instant availability)
         │
         ▼ (Google 14-Day Mandatory Policy for Personal Accounts)
[Google Play Console: Closed Testing Track] (At least 12 testers continuously opted in for 14 days)
         │
         ▼
[Production Release Track] (Public rollout)
```

---

## 3. Google Play Internal Testing Setup

### 3.1 Upload Prerequisites
- **Target Artifact**: Signed Android App Bundle (`app-release.aab`).
- **Upload Key**: Must be signed with the developer's private upload certificate. Unsigned AABs are rejected by Google Play Console.
- **Store Listing**: Metadata, privacy policy URL, and store assets.

### 3.2 Internal Tester Onboarding
1. In Google Play Console, navigate to **Testing > Internal testing**.
2. Under **Testers**, create an email list named `Arrow Escape Internal QA`.
3. Add internal tester Google account email addresses (up to 100 testers).
4. Copy the **Join on Android** or **Join on the web** opt-in URL.
5. Provide testers with the link and testing guide.

### 3.3 Release Notes (Internal Testing)
```
Arrow Escape v1.0.0 (Build 1) Internal Release Candidate
- Complete offline single-player puzzle gameplay with 2,000 deterministic levels.
- 6 progressive difficulty tiers: Beginner, Easy, Medium, Hard, Expert, Master.
- Obstacle blocks, color-keyed locks, and rotating pivot arrows.
- Offline coin economy: level clear rewards, flawless bonuses, and daily challenges.
- Cosmetic shop featuring unlockable arrow skins, trail effects, and themes.
- Native Android 16 (API 36) support, haptic feedback, and immersive edge-to-edge UI.
- AdMob integration running in verified test mode.
```

---

## 4. Google Play Closed Testing Plan (14-Day Requirement)

For personal developer accounts created after November 13, 2023, Google Play requires at least **12 testers continuously opted in for 14 days** before applying for production access.

### 4.1 Tester Recruitment & Eligibility
- **Target Count**: 15–20 recruited testers (to maintain a comfortable margin above the 12-tester minimum).
- **Eligibility**: Individuals with active Android devices running Android 7.0 (API 24) or higher with access to Google Play Services.
- **Commitment**: Keep the app installed and engage with levels across the 14-day window.

### 4.2 Tester Onboarding Workflow
1. Create a Google Group (e.g. `arrow-escape-closed-testing@googlegroups.com`) or upload an email CSV.
2. In Play Console (**Testing > Closed testing > Manage track**), assign the tester group.
3. Share the opt-in link: `https://play.google.com/apps/testing/com.arrowescape.puzzle`.
4. Testers click **"Become a tester"** and download the build via Google Play.

### 4.3 Test Case Coverage Checklist for Testers
| ID | Area | Action | Expected Result |
|---|---|---|---|
| TC-01 | Installation | Install from Play Store link | Clean install, launcher icon appears |
| TC-02 | First Launch | Open app for the first time | Launches immediately into Home screen, wallet shows 100 coins |
| TC-03 | Gameplay | Play Levels 1 to 10 | Arrows extract smoothly, sound/haptics fire, victory screen awards coins |
| TC-04 | Flawless Bonus | Clear a level without misses | 3 stars awarded, +5 perfect bonus granted |
| TC-05 | Undo & Hint | Use Undo and Hint in game | Undo reverses arrow, Hint highlights extractable arrow (-25 coins) |
| TC-06 | Offline Mode | Toggle Airplane mode, play 3 levels | Game remains 100% playable; zero error dialogues |
| TC-07 | Shop & Cosmetics | Buy skin/theme, equip it | Item equips immediately, visual theme updates on board |
| TC-08 | Daily Gift | Open Daily Gift modal | 7-day streak calendar displays, reward claims once per day |
| TC-09 | Back Navigation | Press Android back button on Home | "Press back again to exit" toast appears |
| TC-10 | App Resume | Background app during puzzle, return | Puzzle state, timers, and moves remain intact |

### 4.4 Feedback Collection & Crash Telemetry
- **Console Feedback**: Testers submit private feedback directly through Google Play (**Feedback for developer**).
- **Crash Reporting**: Integrated via Android Vitals in Play Console.
- **Direct Feedback**: Bug report form or email contact provided in tester briefing.

---

## 5. Promotion to Production Criteria

Before applying for production access after 14 days of closed testing:
1. Verify 0 fatal crashes or ANRs in Android Vitals.
2. Ensure at least 12 testers remained opted in for the full 14 days.
3. Complete the production access questionnaire in Play Console.
4. Replace AdMob test IDs with real production publisher IDs.
5. Clarify open-source license attribution before commercial release.
