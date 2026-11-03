/* Phase 7 Security Audit & OWASP MASVS Verification Test Suite */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AD_CONFIG,
  TEST_AD_CONFIG,
  PROD_AD_CONFIG,
  isAdFree,
  validateAdConfig
} from '../src/ads/ad-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

describe('Security - AdMob Monetization & Policy Guardrails', () => {
  it('development configuration strictly uses official Google test ad units', () => {
    assert.equal(AD_CONFIG.isTesting, true, 'isTesting must be true during development');
    assert.equal(AD_CONFIG.appId, TEST_AD_CONFIG.appId);
    assert.equal(AD_CONFIG.bannerId, TEST_AD_CONFIG.bannerId);
    assert.equal(AD_CONFIG.interstitialId, TEST_AD_CONFIG.interstitialId);
    assert.equal(AD_CONFIG.rewardedId, TEST_AD_CONFIG.rewardedId);
  });

  it('production ad unit IDs in PROD_AD_CONFIG are placeholders, not real client secrets', () => {
    assert.match(PROD_AD_CONFIG.appId, /ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY/);
    assert.match(PROD_AD_CONFIG.bannerId, /ca-app-pub-XXXXXXXXXXXXXXXX\/YYYYYYYYYY/);
    assert.match(PROD_AD_CONFIG.interstitialId, /ca-app-pub-XXXXXXXXXXXXXXXX\/YYYYYYYYYY/);
    assert.match(PROD_AD_CONFIG.rewardedId, /ca-app-pub-XXXXXXXXXXXXXXXX\/YYYYYYYYYY/);
  });

  it('validateAdConfig correctly flags invalid or malformed ad identifiers', () => {
    const invalidConfig = {
      appId: 'invalid-app-id',
      bannerId: 'invalid-banner-id',
      interstitialId: '',
      rewardedId: 'invalid-rewarded-id'
    };
    const res = validateAdConfig(invalidConfig);
    assert.equal(res.valid, false);
    assert.ok(res.errors.length >= 3, 'Must report syntax errors for invalid IDs');
  });

  it('isAdFree policy helper correctly respects purchase state or cheat flags', () => {
    assert.equal(isAdFree({}), false);
    assert.equal(isAdFree({ settings: { isAdFree: true } }), true);
  });
});

describe('Security - OWASP MASVS Android Manifest & Configuration Audit', () => {
  const manifestPath = join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const capConfigPath = join(rootDir, 'capacitor.config.json');
  const mainActivityPath = join(rootDir, 'android/app/src/main/java/com/arrowescape/puzzle/MainActivity.java');

  it('AndroidManifest.xml contains zero dangerous or invasive Android permissions', () => {
    assert.ok(existsSync(manifestPath), 'AndroidManifest.xml must exist');
    const content = readFileSync(manifestPath, 'utf8');

    // Dangerous permissions that must NEVER be requested by an offline puzzle game
    const forbiddenPermissions = [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS'
    ];

    for (const perm of forbiddenPermissions) {
      assert.ok(!content.includes(perm), `Forbidden permission found in AndroidManifest: ${perm}`);
    }
  });

  it('AndroidManifest.xml enables hardware acceleration and uses test App ID', () => {
    const content = readFileSync(manifestPath, 'utf8');
    assert.match(content, /android:hardwareAccelerated="true"/, 'Hardware acceleration must be explicitly enabled');
    assert.match(content, /ca-app-pub-3940256099942544~3347511713/, 'AndroidManifest must use official test App ID');
  });

  it('capacitor.config.json disables webContentsDebuggingEnabled in default config', () => {
    assert.ok(existsSync(capConfigPath), 'capacitor.config.json must exist');
    const config = JSON.parse(readFileSync(capConfigPath, 'utf8'));
    assert.notEqual(config.android?.webContentsDebuggingEnabled, true,
      'webContentsDebuggingEnabled must NOT be permanently true in capacitor.config.json (MASVS-DEBUG-1)');
  });

  it('MainActivity.java gates webContentsDebuggingEnabled behind BuildConfig.DEBUG', () => {
    assert.ok(existsSync(mainActivityPath), 'MainActivity.java must exist');
    const javaContent = readFileSync(mainActivityPath, 'utf8');
    assert.match(javaContent, /BuildConfig\.DEBUG/, 'WebView debugging must be strictly gated by BuildConfig.DEBUG');
    assert.match(javaContent, /setWebContentsDebuggingEnabled/, 'WebView.setWebContentsDebuggingEnabled must be called');
  });
});
