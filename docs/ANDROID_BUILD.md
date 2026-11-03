# ARROW ESCAPE — ANDROID BUILD GUIDE

This document provides complete instructions for compiling, building, and packaging Arrow Escape as an installable Android Application Package (APK) and Google Play Android App Bundle (AAB).

---

## 1. Prerequisites & Environment Setup

### 1.1 Tooling Requirements
- **Operating System**: Linux (Ubuntu 20.04+ / Debian 11+), macOS (12+), or Windows 10/11 (via WSL2 or native PowerShell).
- **Node.js**: v20.x or v22.x LTS (tested on Node.js v22.12.0).
- **Java Development Kit (JDK)**: OpenJDK 21 LTS (tested on Eclipse Adoptium Temurin OpenJDK 21.0.13+9).
- **Android SDK**:
  - `platforms;android-36` (Android 16 API 36)
  - `platforms;android-35` (Android 15 API 35)
  - `build-tools;36.0.0`
  - `platform-tools` (adb v37.0.1)
  - `cmdline-tools;latest`
- **Gradle**: 8.14.3 (managed automatically via `android/gradlew`).
- **Android Gradle Plugin (AGP)**: 8.13.0.

### 1.2 Environment Variables
Ensure the following environment variables are set in your shell (e.g. `~/.bashrc` or `~/.android_env`):

```bash
export JAVA_HOME="/home/mani/.jdk"
export ANDROID_HOME="/home/mani/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/36.0.0:$PATH"
```

Verify your setup:
```bash
java -version
javac -version
sdkmanager --list_installed
```

### 1.3 SDK Licenses Acceptance
If building on a fresh machine or CI runner, accept all Android SDK licenses:
```bash
yes | sdkmanager --licenses
```

---

## 2. Web Asset Compilation & Capacitor Synchronization

Arrow Escape uses standard web technologies packaged through Capacitor into the native Android WebView.

### 2.1 Build Web Distribution
Run the build script to bundle and minify all game assets into `www/`:
```bash
npm run build
```
This script validates all ES modules, generates the `www/` staging directory, copies HTML, CSS, JavaScript modules, and audio/canvas resources.

### 2.2 Synchronize with Android Native Project
Sync web assets and Capacitor plugin configurations:
```bash
npx cap sync android
```
This updates:
- `android/app/src/main/assets/public/` (packaged web app)
- `android/app/src/main/assets/capacitor.config.json`
- `android/app/src/main/assets/capacitor.plugins.json`
- Gradle plugin dependencies for `@capacitor/app`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, and `@capacitor-community/admob`.

---

## 3. Compiling Android Binaries

Navigate into the `android/` directory to run Gradle commands:
```bash
cd android
```

### 3.1 Build Installable Debug APK
To compile an installable debug APK signed with the default Android debug keystore:
```bash
./gradlew assembleDebug
```
- **Output File**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Typical Size**: ~8.7 MB
- **Signature**: Android Debug Keystore (`SHA-256: ...`)
- **Package Name**: `com.arrowescape.puzzle`
- **Version**: `versionCode 1`, `versionName "1.0.0"`
- **Target SDK**: API 36 (Android 16)
- **Min SDK**: API 24 (Android 7.0)

To verify the APK badging using Android build tools:
```bash
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging app/build/outputs/apk/debug/app-debug.apk
```

### 3.2 Build Release Android App Bundle (AAB)
To compile an optimized release bundle for Google Play Console submission:
```bash
./gradlew bundleRelease
```
- **Output File**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Typical Size**: ~6.7 MB (uncompressed web assets + native dex)
- **Format**: Android App Bundle format (optimized per-device APK generation by Google Play)

### 3.3 Clean Builds
If build artifacts become stale or plugins change:
```bash
./gradlew clean assembleDebug
```

---

## 4. Keystore Signing for Release Distribution

For production distribution on Google Play Store, the release bundle or APK must be cryptographically signed with a production release keystore.

### 4.1 Generate a Production Keystore
Generate a 2048-bit RSA key pair:
```bash
keytool -genkeypair -v \
  -keystore arrow-escape-release.jks \
  -alias arrow-escape \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```
*Keep this keystore file and its password strictly secure and backed up.*

### 4.2 Configure Gradle Release Signing (Optional)
To automatically sign release builds via Gradle, configure environment variables:
```bash
export RELEASE_KEYSTORE_PATH="/path/to/arrow-escape-release.jks"
export RELEASE_KEYSTORE_PASSWORD="your-keystore-password"
export RELEASE_KEY_ALIAS="arrow-escape"
export RELEASE_KEY_PASSWORD="your-key-password"
```

In `android/app/build.gradle`:
```groovy
android {
    ...
    signingConfigs {
        release {
            if (System.getenv("RELEASE_KEYSTORE_PATH")) {
                storeFile file(System.getenv("RELEASE_KEYSTORE_PATH"))
                storePassword System.getenv("RELEASE_KEYSTORE_PASSWORD")
                keyAlias System.getenv("RELEASE_KEY_ALIAS")
                keyPassword System.getenv("RELEASE_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4.3 Manual Signing via `jarsigner` / `apksigner`
Alternatively, sign the unsigned bundle or APK post-build:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore arrow-escape-release.jks \
  app/build/outputs/bundle/release/app-release.aab arrow-escape
```

---

## 5. Automated CI/CD Pipeline

Arrow Escape includes a complete GitHub Actions CI/CD workflow defined in `.github/workflows/android-build.yml`.

The workflow automatically:
1. Checks out the repository.
2. Configures Node.js 22 LTS and JDK 21 Temurin.
3. Configures Android SDK Platform 36 and Build-Tools 36.0.0.
4. Installs npm dependencies via `npm ci`.
5. Runs all 410 unit/integration tests across 9 test suites (`npm test`).
6. Verifies all 2,000 deterministic puzzle levels (`node test/validate-all-2000-levels.mjs`).
7. Builds web application (`npm run build`) and synchronizes Capacitor (`npx cap sync android`).
8. Compiles `app-debug.apk` and `app-release.aab`.
9. Uploads both binaries as downloadable GitHub Actions artifacts.

---

## 6. Troubleshooting Common Build Issues

### 6.1 `SDK location not found`
Create or update `android/local.properties`:
```properties
sdk.dir=/home/mani/Android/Sdk
```
*(Note: `local.properties` is ignored by Git and should remain machine-local).*

### 6.2 `OutOfMemoryError: Java heap space`
Add or update `org.gradle.jvmargs` in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
```

### 6.3 Deprecated API Warnings in AdMob Kotlin Plugin
`w: 'static field SMART_BANNER: AdSize' is deprecated. Deprecated in Java.`
This warning comes from `@capacitor-community/admob` upstream dependency and does not affect the build or runtime stability. It is safely handled by the Gradle compiler.
