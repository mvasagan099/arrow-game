# ARROW ESCAPE — ADMOB POLICY COMPLIANCE & SAFETY

## 1. Compliance Statement

Arrow Escape is architected to comply fully with:
1. **Google AdMob Policy Guidelines**
2. **Google Play Better Ads Standards**
3. **Coalition for Better Ads (CBA) Mobile Guidelines**
4. **Google Play Families Policy & Children's Privacy Guidelines**

---

## 2. Format Compliance & Placement Rules

### 2.1 Natural Break Interstitials
- **Strict Natural Transition Rule**: Interstitial advertisements are displayed **only** on the level completion victory card after a puzzle is successfully solved.
- **Forbidden Triggers**:
  - Never shown during active puzzle interaction or mid-swipe/tap.
  - Never shown immediately upon app launch or splash screen.
  - Never shown unexpectedly during gameplay restart or undo actions.
  - Never shown on modal close or back navigation.
- **Frequency Gating**:
  - Minimum 5 completed levels between displays (`MIN_LEVELS_BETWEEN_ADS = 5`).
  - Minimum 180 seconds cooldown between displays (`MIN_SECONDS_BETWEEN_ADS = 180`).
  - First 3 levels completely ad-free (`FIRST_ALLOWED_LEVEL = 4`).
  - Tutorials 100% ad-free.

### 2.2 Adaptive Banner Placement & Safety
- **Misclick Elimination**: Banners are strictly disabled during active puzzle gameplay (`#screen-game`). The full canvas area is preserved without banners overlapping touch targets.
- **Allowed Screens**: Menus and non-interactive screens only (Home screen, Levels browser, Shop, Achievements).
- **Separation**: Proper CSS clearance ensures banners never overlap interactive buttons, modal scrims, or coin pills.

### 2.3 Rewarded Video Integrity
- **100% Voluntary**: Rewarded ads are never forced. Players must explicitly tap a button inside the Cosmetic Shop to watch an ad.
- **Clear Value Proposition**: Buttons clearly state the exact reward: "Watch 🎬 (+50)" or "Watch 🎬 (+1 Free Hint)".
- **Cap on Claims**: Daily coin rewards are capped at 3 per calendar day to prevent reward inflation and excessive ad watching.
- **Safe Delivery**: If a player earns a free hint, it is stored as a persistent `freeHintToken` so the player does not lose their reward if they navigate away or restart.

---

## 3. Accidental Click Prevention

1. **Clear Boundaries**: No ads are placed directly adjacent to frequently tapped gameplay elements.
2. **Input Suspension**: While full-screen interstitial or rewarded ads are playing, `document.body` applies `.ad-fullscreen-active`, suspending all pointer and touch interactions beneath the ad container.
3. **Grace Periods**: Interstitials are delayed by `LEVEL_COMPLETE_DELAY_MS` (480ms) after the celebratory win animation completes, preventing accidental taps meant for puzzle arrows from landing on an appearing ad.

---

## 4. Policy Compliance Checklist

| Requirement | Implementation Detail | Compliance Status |
|---|---|---|
| **No Intrusive Interstitials** | Displayed only on victory screen; never mid-game | COMPLIANT |
| **No Accidental Clicks** | Banners hidden during gameplay; 480ms delay on victory | COMPLIANT |
| **Clear Rewarded Opt-In** | Voluntary shop buttons stating exact coin / hint reward | COMPLIANT |
| **Frequency Capping** | Minimum 5 levels, 180s cooldown, level $\ge$ 4 only | COMPLIANT |
| **No Ads During Tutorials** | `isTutorial: true` blocks all interstitials and banners | COMPLIANT |
| **Revocable Consent** | Settings modal has "Privacy & Ad Choices" button | COMPLIANT |
| **Test IDs in Development** | Official Google test IDs used; zero invalid traffic risk | COMPLIANT |
