#!/usr/bin/env node
/**
 * ASAKA ZIYO v4.0.0 — Android WebView Asset Sync & Native Project Pre-Flight Validator
 *
 * Responsibilities:
 *  1. Verifies Vite production build exists in /dist (or runs `npm run build` if `--build` passed).
 *  2. Mirrors /dist cleanly into /android/app/src/main/assets/public/ (excluding .apk/.aab/.map/.jks).
 *  3. Verifies critical WebView files exist: index.html, JS/CSS bundles, official logo & PWA icons.
 *  4. Audits mandatory Android native resources so Gradle/AAPT2 never fails on missing XML/icons.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const ANDROID_ASSETS_PUBLIC = path.join(ANDROID_DIR, 'app', 'src', 'main', 'assets', 'public');
const ANDROID_RES_DIR = path.join(ANDROID_DIR, 'app', 'src', 'main', 'res');

const EXCLUDED_EXTENSIONS = new Set(['.apk', '.aab', '.jks', '.keystore', '.map', '.pem']);

function copyDirRecursive(srcDir, destDir, stats) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, stats);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      fs.copyFileSync(srcPath, destPath);
      const fileSize = fs.statSync(destPath).size;
      stats.fileCount += 1;
      stats.totalBytes += fileSize;
    }
  }
}

function assertFileExists(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing mandatory file: ${relPath}`);
  }
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) {
    throw new Error(`Empty (0-byte) mandatory file: ${relPath}`);
  }
}

function validateAndroidProjectResources() {
  const requiredFiles = [
    'android/build.gradle',
    'android/settings.gradle',
    'android/gradle.properties',
    'android/app/build.gradle',
    'android/app/proguard-rules.pro',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/java/uz/asakaziyo/app/MainActivity.kt',
    'android/app/src/main/java/uz/asakaziyo/app/AsakaMediaPlaybackService.kt',
    'android/app/src/main/java/uz/asakaziyo/app/AsakaFirebaseMessagingService.kt',
    'android/app/src/main/java/uz/asakaziyo/app/AsakaPrayerAlarmReceiver.kt',
    'android/app/src/main/java/uz/asakaziyo/app/AsakaBootReceiver.kt',
    'android/app/src/main/java/uz/asakaziyo/app/AsakaIconUtils.kt',
    'android/app/src/main/res/values/strings.xml',
    'android/app/src/main/res/values/colors.xml',
    'android/app/src/main/res/values/styles.xml',
    'android/app/src/main/res/values/ic_launcher_background.xml',
    'android/app/src/main/res/xml/network_security_config.xml',
    'android/app/src/main/res/drawable/ic_stat_asaka_ziyo.xml',
    'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
  ];

  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    requiredFiles.push(
      `android/app/src/main/res/mipmap-${density}/ic_launcher.png`,
      `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`,
      `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`
    );
  }

  for (const f of requiredFiles) {
    assertFileExists(f);
  }

  // Verify versionName 4.0.0, versionCode 400, package uz.asakaziyo.app
  const appBuildGradle = fs.readFileSync(path.join(ROOT_DIR, 'android/app/build.gradle'), 'utf8');
  if (!appBuildGradle.includes('applicationId "uz.asakaziyo.app"')) {
    throw new Error('android/app/build.gradle applicationId must remain uz.asakaziyo.app');
  }
  if (!appBuildGradle.includes('versionCode 400') || !appBuildGradle.includes('versionName "4.0.0"')) {
    throw new Error('android/app/build.gradle must specify versionCode 400 and versionName "4.0.0"');
  }

  // Verify ProGuard keeps AsakaNativeBridge so R8 never breaks @JavascriptInterface
  const proguard = fs.readFileSync(path.join(ROOT_DIR, 'android/app/proguard-rules.pro'), 'utf8');
  if (!proguard.includes('MainActivity$AsakaNativeBridge') || !proguard.includes('@android.webkit.JavascriptInterface')) {
    throw new Error('proguard-rules.pro must preserve MainActivity$AsakaNativeBridge and @JavascriptInterface methods');
  }

  console.log(`✅ Verified ${requiredFiles.length} native Android project files, XML resources, icons & R8 rules.`);
}

function main() {
  const shouldBuild = process.argv.includes('--build');
  if (shouldBuild || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('🔨 Building Vite production bundle (/dist)...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html not found after build.');
  }

  validateAndroidProjectResources();

  // Clean and sync dist -> android/app/src/main/assets/public
  fs.rmSync(ANDROID_ASSETS_PUBLIC, { recursive: true, force: true });
  const stats = { fileCount: 0, totalBytes: 0 };
  copyDirRecursive(DIST_DIR, ANDROID_ASSETS_PUBLIC, stats);

  // Verify critical WebView assets exist in synced output
  const requiredSyncedAssets = [
    'android/app/src/main/assets/public/index.html',
    'android/app/src/main/assets/public/pwa-192x192.png',
    'android/app/src/main/assets/public/pwa-512x512.png',
    'android/app/src/main/assets/public/images/asaka-ziyo-logo-seal.jpg',
    'android/app/src/main/assets/public/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg',
    'android/app/src/main/assets/public/manifest.webmanifest',
  ];
  for (const rel of requiredSyncedAssets) {
    assertFileExists(rel);
  }

  // Verify JS & CSS asset references inside synced index.html actually exist
  const indexHtml = fs.readFileSync(path.join(ANDROID_ASSETS_PUBLIC, 'index.html'), 'utf8');
  const assetRefs = [...indexHtml.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)].map((m) => m[1].replace(/^\.\//, ''));
  for (const ref of assetRefs) {
    const resolved = path.join(ANDROID_ASSETS_PUBLIC, ref);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Broken asset reference in synced Android index.html: ./${ref}`);
    }
  }

  const sizeMb = (stats.totalBytes / (1024 * 1024)).toFixed(2);
  console.log(
    `✅ Synced ${stats.fileCount} WebView assets (${sizeMb} MB) into android/app/src/main/assets/public/ (${assetRefs.length} index.html references verified).`
  );
}

try {
  main();
} catch (err) {
  console.error('❌ Android asset sync failed:', err?.message || err);
  process.exit(1);
}
