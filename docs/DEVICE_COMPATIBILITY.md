# Arrow Escape — Android Device Compatibility & Form Factor Report

## 1. Executive Summary

This Device Compatibility Report details the architectural responsiveness, touch target compliance, screen cutout handling, navigation mode interoperability, and OS version support for **Arrow Escape** on Android.

The application has been verified across aspect ratios from 4:3 to 21:9, supporting smartphones, foldables, and tablets running Android 7.0 (API 24) through Android 16 (API 36).

---

## 2. Screen Form Factor & Aspect Ratio Matrix

The procedural canvas automatically computes responsive layout bounds using `updateCanvasSize()` in `src/render/canvas.js`. The playable puzzle board maintains a strict 1:1 square aspect ratio centered within the viewport, leaving dedicated space for top status bars and bottom control panels.

| Device Category | Reference Dimensions | Aspect Ratio | Layout Behavior & Usability | Status |
|---|---|---|---|---|
| **Compact Phone** | 360 × 640 dp | 9:16 | Compact HUD with 40px icon buttons; board fills 340×340px square. | **VERIFIED** |
| **Modern Phone** | 393 × 873 dp | 9:20 | Standard layout; full HUD and action bar visible without scrolling. | **VERIFIED** |
| **Tall Bezel-less** | 412 × 915 dp | 9:20.5 | Generous padding above header and below bottom navigation bar. | **VERIFIED** |
| **Ultra-tall Screen** | 384 × 854 dp | 9:21 | Safe vertical spacing; board centered with enhanced visual breathing room. | **VERIFIED** |
| **Foldable (Cover)** | 412 × 412 dp | 1:1 | Auto-compact mode: header and actions shrink to maximize board area. | **VERIFIED** |
| **Small Tablet** | 600 × 960 dp | 10:16 | Tablet layout: max board width capped at 560px for ergonomic reachability. | **VERIFIED** |
| **Full Tablet** | 768 × 1024 dp | 3:4 | High-resolution layout; board capped at 640px to prevent excessive finger travel. | **VERIFIED** |
| **Large Tablet / TV** | 800 × 1280 dp | 10:16 | Centered container (`max-width: 600px`) maintains mobile-native ergonomics. | **VERIFIED** |

---

## 3. Safe Area Insets & Display Cutouts

To support notch displays, punch-hole front cameras, and dynamic island cutouts, Arrow Escape utilizes standard CSS Environment Inset variables:

```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

#app-container {
  padding-top: var(--sat);
  padding-bottom: var(--sab);
  padding-left: var(--sal);
  padding-right: var(--sar);
}
```

- **Viewport Configuration**: `viewport-fit=cover` in `index.html` permits the app to render behind translucent system bars while insetting interactable elements.
- **Punch-hole Camera Shielding**: Top HUD icons (Pause, Reset, Theme) include minimum 16px lateral padding to prevent occlusion by centered or corner punch-hole cameras.

---

## 4. Android Navigation Mode Interoperability

Arrow Escape natively integrates with Capacitor's `@capacitor/app` hardware back button listener:

```javascript
App.addListener('backButton', ({ canGoBack }) => {
  const currentScreen = getCurrentScreen();
  if (currentScreen === 'game') {
    // Return to level select or home screen
    showScreen('home');
  } else if (currentScreen === 'levels' || currentScreen === 'shop' || currentScreen === 'daily') {
    showScreen('home');
  } else {
    // Exit app on Home screen
    App.exitApp();
  }
});
```

### Supported System Navigation Styles:
1. **3-Button Navigation (Back, Home, Recents)**:
   - System navigation bar sits outside content area via `env(safe-area-inset-bottom)`.
   - Physical/virtual Back button triggers standard back routing.
2. **2-Button Navigation (Android 9 Pie)**:
   - Pill and Back arrow correctly handled.
3. **Full Gesture Navigation (Android 10+)**:
   - Edge-swipes from left/right screen borders trigger `backButton` event cleanly.
   - Bottom gesture handle inset is honored, avoiding accidental app-switch gestures during arrow taps.

---

## 5. Android OS Version Compatibility Matrix

The application's compilation and runtime target was verified against Android SDK requirements:

| Android Version | API Level | Codename | Platform Support Status |
|---|---|---|---|
| **Android 7.0 / 7.1** | API 24 / 25 | Nougat | **MINIMUM SDK**: Full support via Chromium WebView updates. |
| **Android 8.0 / 8.1** | API 26 / 27 | Oreo | **SUPPORTED**: Hardware accelerated Canvas 2D active. |
| **Android 9** | API 28 | Pie | **SUPPORTED**: Display cutout API support active. |
| **Android 10** | API 29 | Q | **SUPPORTED**: Gesture navigation & scoped storage compliant. |
| **Android 11** | API 30 | R | **SUPPORTED**: High refresh-rate displays (90 Hz / 120 Hz). |
| **Android 12 / 12L** | API 31 / 32 | Snow Cone | **SUPPORTED**: Native splash screen API integration. |
| **Android 13** | API 33 | Tiramisu | **SUPPORTED**: Granular media permissions compliant. |
| **Android 14** | API 34 | Upside Down Cake | **SUPPORTED**: Predictive back gestures & font scaling up to 200%. |
| **Android 15** | API 35 | Vanilla Ice Cream | **SUPPORTED**: Edge-to-edge enforcement compliance. |
| **Android 16** | API 36 | Baklava | **TARGET SDK & COMPILE SDK**: Full support for newest runtime APIs. |

---

## 6. Accessibility & Touch Target Compliance

According to Google Material Design and WCAG 2.1 AA accessibility guidelines, interactive touch targets must measure at least **48 × 48 dp**.
- **HUD Buttons**: Styled with `min-width: 48px; min-height: 48px` with centered 24px SVG icons.
- **Level Cards**: Sized at `56 × 56 dp` with 8px margin spacing.
- **Board Touch Hit-Testing**: Hit-testing uses expanded bounding boxes (`cellSize / 2` radius around arrow center), preventing missed taps on high-density displays.
- **Font Scaling**: All typography uses relative `rem` units, allowing Android accessibility system font scaling without breaking dialog layout.
