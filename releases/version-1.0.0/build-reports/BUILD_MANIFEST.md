# Release Build Manifest — Version 1.0.0 (Build 1)

## 1. Release Identification
- **Application Package**: `com.arrowescape.puzzle`
- **Application Title**: Arrow Escape: Puzzle Logic
- **Version Name**: `1.0.0`
- **Version Code**: `1`
- **Build Timestamp**: 2026-11-03
- **Git Commit**: `ae1e873` (Phase 7 baseline) -> Phase 8 release candidate

## 2. Platform & Toolchain Specifications
- **Compile SDK**: `36` (Android 16 Baklava)
- **Target SDK**: `36` (Android 16 Baklava)
- **Minimum SDK**: `24` (Android 7.0 Nougat)
- **Gradle Version**: `8.14.3`
- **Android Gradle Plugin (AGP)**: `8.13.0`
- **Java Development Kit**: Adoptium OpenJDK 21 LTS (`21.0.13+9`)
- **Node.js Environment**: `v22.12.0 LTS`

## 3. Artifact Specifications & Checksums

| Artifact | Build Variant | File Size | SHA-256 Checksum | Signing Status | Target Distribution |
|---|---|---|---|---|---|
| `app-release.aab` | Release (AAB) | 6.7 MB | `bb3ca10113bb198245bcefe2e09560d635405c6dfa4accc6dca67fd64f48d9d3` | **UNSIGNED** *(Awaiting upload key)* | Google Play Internal / Closed Track |
| `app-release-unsigned.apk` | Release (APK) | 7.1 MB | `f14efd252ae52fcaf463e0d4769815ce991f39e1aa4ea9c2cd5941254bb589cc` | **UNSIGNED** | Direct Sideload / Manual Test |
| `app-debug.apk` | Debug (APK) | 8.7 MB | `9198a18df8a1cc43b2e3ff0eff2fdf97e9d0e2a77a84192ce940d1453761925e` | **DEBUG SIGNED** | Local Development & Profiling |

## 4. Verification Evidence
- **Automated Tests**: 460 / 460 tests passed across 14 test suites in 10.79s.
- **Level Solvability**: 2,000 / 2,000 levels independently validated as solvable in 39.26s.
- **Hardware Acceleration**: Enabled (`android:hardwareAccelerated="true"`).
- **Zero Dangerous Permissions**: Confirmed via `aapt dump badging`.
- **Zero Remote Dependencies**: Confirmed via `test/offline.test.mjs`.
