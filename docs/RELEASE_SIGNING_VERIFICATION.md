# Arrow Escape — Release Signing & Verification Guide

## 1. Executive Summary
This document specifies the cryptographic signing architecture, keystore consistency standards, verification tooling, and security procedures for producing signed release artifacts for **Arrow Escape: Puzzle Logic** (`com.arrowescape.puzzle`).

---

## 2. Keystore Specifications & Standards

To ensure zero ambiguity across documentation, generation scripts, Gradle build configurations, and GitHub Actions release pipelines, the project standardizes on the following credentials profile:

| Attribute | Standard Value | Description |
|---|---|---|
| **Keystore Filename** | `arrow-escape-upload.jks` | Master PKCS12 upload keystore |
| **Key Alias** | `arrow-escape-upload` | Cryptographic key identifier |
| **Key Algorithm** | `RSA` | Industry standard asymmetric cipher |
| **Key Size** | `2048` bits | Required minimum for Android App Bundles |
| **Validity** | `10000` days (> 27 years) | Exceeds Google Play lifetime requirements |
| **Keystore Type** | `PKCS12` | Modern, non-proprietary keystore format |

---

## 3. Keystore Generation Procedure (For Repository Owner)

The repository owner must execute the generation script locally on a secure developer machine:

```bash
chmod +x scripts/generate-release-keystore.sh
./scripts/generate-release-keystore.sh
```

### 3.1 What the Script Does:
1. Validates that no existing `arrow-escape-upload.jks` exists in the local directory (preventing accidental key overwrites).
2. Invokes JDK `keytool` with PKCS12, RSA 2048-bit, 10,000-day validity, and alias `arrow-escape-upload`.
3. Prompts the owner for a secure keystore password and owner organization certificate details.
4. Outputs the generated keystore file: `arrow-escape-upload.jks`.

### 3.2 Secure Storage & Backup Rules:
- **NEVER** commit `arrow-escape-upload.jks` or any `.jks` / `.keystore` file to Git. (Protected by `.gitignore`).
- Store the master keystore and passwords in an encrypted password manager (1Password, Bitwarden, KeePass) or secure offline vault.
- If the upload key is lost, a key reset request must be submitted to Google Play Developer Support.

---

## 4. GitHub Actions Release Secrets Configuration

To enable automated cryptographic signing in `.github/workflows/android-release.yml`, configure the following repository secrets under **Settings > Secrets and variables > Actions**:

1. **Convert keystore to base64**:
   ```bash
   base64 -w 0 arrow-escape-upload.jks > keystore_base64.txt
   ```
2. **Add secrets in GitHub Web UI**:
   - `RELEASE_KEYSTORE_BASE64`: Paste the complete contents of `keystore_base64.txt`.
   - `KEYSTORE_PASSWORD`: The password chosen during `keytool` generation.
   - `KEY_ALIAS`: `arrow-escape-upload`
   - `KEY_PASSWORD`: Key password (same as keystore password if not set separately).
3. **Clean up temporary base64 file**:
   ```bash
   rm -f keystore_base64.txt
   ```

---

## 5. Automated Signing Verification in CI/CD

The release workflow (`.github/workflows/android-release.yml`) strictly enforces signing validation and halts if artifacts fail verification.

### 5.1 Android App Bundle (AAB) Verification
The workflow executes:
```bash
jarsigner -verify -verbose -certs "android/app/build/outputs/bundle/release/app-release.aab"
```
- **Pass Criterion**: Must contain `"jar verified"`.
- **Failure Action**: Workflow terminates with `exit 1` if unsigned or signature corrupted.
- **Certificate Inspection**: Extracts SHA-256 fingerprint via `keytool -printcert -jarfile`.

### 5.2 Release APK Verification
The workflow executes:
```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --verbose --print-certs "android/app/build/outputs/apk/release/app-release.apk"
```
- **Pass Criterion**: Must verify against APK Signature Scheme v2/v3.
- **Failure Action**: Terminates build immediately on signature mismatch.

---

## 6. Local Manual Signing Verification (If Testing Locally)

To manually sign an unsigned release AAB locally:
```bash
jarsigner -keystore arrow-escape-upload.jks \
  -storepass "<KEYSTORE_PASSWORD>" \
  -keypass "<KEY_PASSWORD>" \
  android/app/build/outputs/bundle/release/app-release.aab \
  arrow-escape-upload

# Verify signature
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```
