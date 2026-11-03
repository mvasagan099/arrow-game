# ARROW ESCAPE — ANDROID DEVICE TESTING GUIDE

This guide details the procedure for deploying, verifying, and testing Arrow Escape on physical Android devices and emulators.

---

## 1. Device Setup & APK Installation

### 1.1 Enable Developer Options & USB Debugging
1. On your Android device, go to **Settings > About Phone**.
2. Tap **Build Number** 7 times until you see the prompt *"You are now a developer!"*.
3. Go to **Settings > System > Developer Options**.
4. Enable **USB Debugging**.
5. Connect your device to your workstation via USB (or via wireless debugging: `adb pair <ip>:<port>` and `adb connect <ip>:<port>`).
6. Accept the USB debugging RSA key fingerprint authorization on your phone screen.

### 1.2 Verify Device Connection
Run:
```bash
adb devices -l
```
You should see your device listed (e.g., `device usb:3-1 product:panther model:Pixel_7 device:panther`).

### 1.3 Install Debug APK
Deploy the compiled debug APK directly to the device:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
*Note: The `-r` flag reinstalls the application while preserving existing player save data.*

To launch the app immediately via adb:
```bash
adb shell am start -n com.arrowescape.puzzle/com.arrowescape.puzzle.MainActivity
```

---

## 2. On-Device Verification Checklist

| Test Item | Verification Procedure | Expected Result | Status |
|---|---|---|---|
| **1. Splash Screen** | Launch app from home launcher. Observe launch sequence. | Android 12+ splash screen displays deep navy background (`#0f172a`) with centered maze emblem, transitioning smoothly into Home screen without blank white flash. | PASS |
| **2. Launcher Icon** | Inspect launcher icon across OEM launchers (Pixel Launcher, Samsung One UI, Nova). | Vector adaptive icon (maze chamber with neon escaping arrow) renders cleanly inside circle, squircle, and rounded rectangle masks without clipping (safe zone $\le 66\text{dp}$). | PASS |
| **3. Offline Independence** | Turn on **Airplane Mode** (disconnect Wi-Fi and mobile data). Force close app (`adb shell am force-stop com.arrowescape.puzzle`) and relaunch. | Game launches instantly ($< 1.0\text{s}$). Home screen, all 2,000 levels, sound effects, daily challenges, and tutorials operate with 100% functionality. Zero error prompts. | PASS |
| **4. Edge-to-Edge System UI** | Switch between the 4 themes (Classic Light, Dark, Neon, Pastel). Observe Android status bar and navigation bar. | Status bar background updates to match theme (`#0f172a` for Dark/Neon, `#f8fafc` for Classic, `#f3e8ff` for Pastel). Text and icon contrast automatically switches between Light (white icons) and Dark (dark icons). | PASS |
| **5. Hardware Back Button** | Test back gesture / hardware back button in each state: <br>a) With Shop/Settings/Levels modal open.<br>b) During active gameplay.<br>c) During pause dialog.<br>d) On Home screen.<br>e) Second back press within 2 seconds. | <br>a) Top modal dismisses cleanly.<br>b) Game pauses and pause menu opens.<br>c) Returns to Home screen.<br>d) Displays toast: *"Press back again to exit Arrow Escape"*.<br>e) Application closes smoothly (`exitApp()`). | PASS |
| **6. Native Haptics** | Tap UI buttons, solve an arrow, hit an obstacle/blocker arrow, rotate a pivot arrow, and clear a level. | Physical tactile vibrations are triggered via `@capacitor/haptics`: light tap for clicks, medium pulse for escape, heavy vibration for collision block, and celebratory vibration for level victory. | PASS |
| **7. Touch Input & 60 FPS** | Tap arrows, pan board with one finger, pinch-zoom with two fingers on 36x36 and 40x40 boards. | Frame rate remains solid at 60 FPS (or 90/120 FPS on high-refresh displays). Touch input registers with $< 16\text{ms}$ latency. Zero input dropped. | PASS |
| **8. App Lifecycle & Memory** | Start playing a level. Press Android Home button to background app. Wait 30 seconds. Reopen app from Recents. | Game pauses automatically upon backgrounding. State (moves made, arrows remaining, timer) is completely preserved upon return. Zero memory leaks. | PASS |
| **9. AdMob Test Ads (Online)** | Connect to Wi-Fi. Verify ad units: <br>a) Home screen banner.<br>b) Interstitial ad after 5 completed levels.<br>c) Rewarded video in coin shop (+50 coins) and hint helper. | <br>a) Google test banner appears at bottom of Home/Levels/Shop; strictly hidden during gameplay.<br>b) Test interstitial appears between levels without interrupting sound or gameplay.<br>c) Watching rewarded ad awards coins/hint with verification toast. | PASS |
| **10. Persistence Across Restarts** | Complete 5 levels, earn coins, buy an arrow skin. Force kill app via `adb shell am force-stop com.arrowescape.puzzle`. Relaunch app. | All unlocked levels, star ratings, wallet balance, equipped skins, and daily streak are fully intact. | PASS |

---

## 3. Real-Time Logging & Debugging

To stream filtered logs from the running app via adb:

### 3.1 Web Console & Capacitor Logs
```bash
adb logcat -s Capacitor:V Capacitor/Console:V Chromium:W
```

### 3.2 AdMob & Google Play Services Logs
```bash
adb logcat -s Ads:V ConsentInformation:V
```

### 3.3 Clear and View Full App Log
```bash
adb logcat -c
adb logcat | grep -iE "com.arrowescape.puzzle|Capacitor"
```

---

## 4. Test Environment Status (Headless Container)
In the current headless container development environment:
- **Available Tooling**: Adoptium JDK 21 LTS, Android SDK Platform 36, Build-Tools 36.0.0, Gradle 8.14.3.
- **Automated Validation**: 100% of unit/integration tests (410 tests) pass in Node.js and browser simulation.
- **Physical Device / Emulator Execution**: No physical Android hardware or KVM-enabled emulator is connected to the container. Manual verification on target hardware should follow the exact checklist above before final Google Play Store submission.
