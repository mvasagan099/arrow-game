#!/usr/bin/env bash
# ==============================================================================
# Arrow Escape — Secure Release Keystore Generation Script
# ==============================================================================
# This script generates a standard PKCS12 upload keystore required for signing
# release Android App Bundles (.aab) and APKs (.apk) for Google Play Store.
#
# DO NOT COMMIT THE GENERATED KEYSTORE FILE TO VERSION CONTROL (.gitignore protects *.jks)
# STORE THE MASTER KEYSTORE FILE AND PASSWORDS IN A SECURE PASSWORD MANAGER.
# ==============================================================================

set -euo pipefail

KEYSTORE_NAME="arrow-escape-upload.jks"
KEY_ALIAS="arrow-escape-upload"
VALIDITY_DAYS=10000

echo "=========================================================="
echo "ARROW ESCAPE — GOOGLE PLAY RELEASE KEYSTORE GENERATOR"
echo "=========================================================="

if [ -f "$KEYSTORE_NAME" ]; then
  echo "ERROR: Keystore file '$KEYSTORE_NAME' already exists in the current directory."
  echo "Aborting to prevent accidental overwriting of an existing upload key."
  exit 1
fi

echo ""
echo "Creating PKCS12 release upload keystore: $KEYSTORE_NAME"
echo "Key algorithm: RSA 2048-bit"
echo "Validity: $VALIDITY_DAYS days"
echo "Alias: $KEY_ALIAS"
echo ""

keytool -genkeypair -v \
  -keystore "$KEYSTORE_NAME" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storetype PKCS12

echo ""
echo "=========================================================="
echo "KEYSTORE GENERATED SUCCESSFULLY: $KEYSTORE_NAME"
echo "=========================================================="
echo ""
echo "NEXT STEPS TO CONFIGURE GITHUB ACTIONS SECRETS:"
echo "1. Encode the keystore into base64 format:"
echo "   base64 -w 0 $KEYSTORE_NAME > keystore_base64.txt"
echo ""
echo "2. In your GitHub repository (Settings -> Secrets and variables -> Actions):"
echo "   - Add secret 'RELEASE_KEYSTORE_BASE64' with the content of keystore_base64.txt"
echo "   - Add secret 'KEYSTORE_PASSWORD' with your chosen keystore password"
echo "   - Add secret 'KEY_ALIAS' with: $KEY_ALIAS"
echo "   - Add secret 'KEY_PASSWORD' with your key password (if distinct)"
echo ""
echo "3. Safely delete keystore_base64.txt once configured:"
echo "   rm -f keystore_base64.txt"
echo ""
echo "4. Back up $KEYSTORE_NAME to an encrypted offline location."
echo "=========================================================="
