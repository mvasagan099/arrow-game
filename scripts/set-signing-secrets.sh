#!/usr/bin/env bash
# ==============================================================================
# Arrow Escape — Secure Release Signing Secrets Configuration Helper
# ==============================================================================
# Securely configures GitHub Actions release signing secrets using GitHub CLI.
# Passwords are read with terminal echo disabled (-s) and piped directly via
# stdin to 'gh secret set'. Passwords are never saved to disk, logged, or echoed.
# ==============================================================================

set -euo pipefail

REPO="mvasagan099/arrow-game"
KEYSTORE_FILE="arrow-escape-upload.jks"
KEY_ALIAS="arrow-escape-upload"

# Ensure ~/.local/bin is in PATH for gh CLI
export PATH="$HOME/.local/bin:$PATH"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI ('gh') is not found in PATH."
  echo "Please ensure gh is installed or run: export PATH=\"\$HOME/.local/bin:\$PATH\""
  exit 1
fi

echo "=========================================================="
echo "ARROW ESCAPE — CONFIGURE RELEASE SIGNING SECRETS"
echo "Target Repository: $REPO"
echo "=========================================================="

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "ERROR: Keystore file '$KEYSTORE_FILE' was not found in the current directory."
  echo "Aborting."
  exit 1
fi

# Step 1: Upload Key Alias
echo ""
echo "[1/4] Setting secret 'KEY_ALIAS' ($KEY_ALIAS)..."
echo -n "$KEY_ALIAS" | gh secret set KEY_ALIAS -R "$REPO"
echo "✓ KEY_ALIAS configured."

# Step 2: Upload Base64 Keystore via standard input
echo ""
echo "[2/4] Setting secret 'RELEASE_KEYSTORE_BASE64' from '$KEYSTORE_FILE'..."
base64 -w 0 "$KEYSTORE_FILE" | gh secret set RELEASE_KEYSTORE_BASE64 -R "$REPO"
echo "✓ RELEASE_KEYSTORE_BASE64 uploaded securely via stdin."

# Step 3: Read Keystore Password interactively with echo disabled
echo ""
echo "[3/4] Keystore Password Configuration:"
read -s -p "Enter Keystore Password (input will not be displayed): " KEYSTORE_PASS
echo ""

if [ -z "$KEYSTORE_PASS" ]; then
  echo "ERROR: Keystore password cannot be empty."
  exit 1
fi

echo -n "$KEYSTORE_PASS" | gh secret set KEYSTORE_PASSWORD -R "$REPO"
echo "✓ KEYSTORE_PASSWORD configured."

# Step 4: Key Password
echo ""
echo "[4/4] Key Password Configuration:"
read -s -p "Enter Key Password (press Enter if same as keystore password): " KEY_PASS
echo ""

if [ -z "$KEY_PASS" ]; then
  KEY_PASS="$KEYSTORE_PASS"
fi

echo -n "$KEY_PASS" | gh secret set KEY_PASSWORD -R "$REPO"
echo "✓ KEY_PASSWORD configured."

# Securely erase password variables from shell memory
unset KEYSTORE_PASS KEY_PASS

echo ""
echo "=========================================================="
echo "ALL 4 RELEASE SECRETS CONFIGURED SUCCESSFULLY ON GITHUB"
echo "=========================================================="
gh secret list -R "$REPO"
