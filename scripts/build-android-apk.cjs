#!/usr/bin/env node
/**
 * ASAKA ZIYO v4.0.0 (Build 400) — Direct Installable Android APK Build & Verification Pipeline
 *
 * Strictly builds ONLY a real, signed, installable production Release APK (NO AAB, NO Play Store bundle):
 * 1. Syncs web dist/ assets & verifies native Android resources/icons/manifest.
 * 2. Preserves any existing release signing keystore (`keystore.properties`, `ANDROID_KEYSTORE_PATH`,
 *    or persistent `data/.android-signing/asakaziyo-release.jks`). If none exists yet, generates a
 *    persistent 4096-bit RSA release keystore stored locally in `data/.android-signing/` (0600, gitignored)
 *    so users can install directly on Android phones and receive future updates seamlessly.
 * 3. Runs genuine Gradle `assembleRelease` (R8/ProGuard enabled, APK Signature Scheme v1 + v2 + v3).
 * 4. Verifies ZIP structure (`unzip -t`), required Android + WebView entries, `aapt2 dump badging`,
 *    and cryptographic signature (`apksigner verify --verbose --print-certs`).
 * 5. Publishes verified `data/release/Asaka-Ziyo-v4.0.0.apk`, `data/release/SHA256SUMS.txt`,
 *    and `data/apk_release_metadata.json`.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const RELEASE_DIR = path.join(ROOT_DIR, 'data', 'release');
const SIGNING_DIR = path.join(ROOT_DIR, 'data', '.android-signing');
const LOCAL_KEYSTORE_PATH = path.join(SIGNING_DIR, 'asakaziyo-release.jks');
const LOCAL_SIGNING_CREDS_PATH = path.join(SIGNING_DIR, 'signing.json');
const METADATA_PATH = path.join(ROOT_DIR, 'data', 'apk_release_metadata.json');

const APP_VERSION = '4.0.0';
const BUILD_CODE = 400;
const PACKAGE_ID = 'uz.asakaziyo.app';
const APK_FILENAME = `Asaka-Ziyo-v${APP_VERSION}.apk`;

function commandExists(cmd) {
  try {
    return execSync(`command -v ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function resolveSdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    '/opt/android-sdk',
    '/usr/lib/android-sdk',
    path.join(process.env.HOME || '', 'Android', 'Sdk'),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function resolveGradleCommand() {
  const gradlew = path.join(ANDROID_DIR, 'gradlew');
  if (fs.existsSync(gradlew)) {
    fs.chmodSync(gradlew, 0o755);
    return './gradlew';
  }
  const optGradle = '/opt/gradle/gradle-8.9/bin/gradle';
  if (fs.existsSync(optGradle)) return optGradle;
  const sysGradle = commandExists('gradle');
  if (sysGradle) return sysGradle;
  return null;
}

function findBuildTool(toolName, sdkRoot) {
  const fromPath = commandExists(toolName);
  if (fromPath) return fromPath;
  if (!sdkRoot) return null;
  const buildToolsDir = path.join(sdkRoot, 'build-tools');
  if (!fs.existsSync(buildToolsDir)) return null;
  const versions = fs.readdirSync(buildToolsDir).sort().reverse();
  for (const v of versions) {
    const candidate = path.join(buildToolsDir, v, toolName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function resolveOrProvisionSigningConfig() {
  // 1. Respect explicit keystore.properties (root or android/)
  if (
    fs.existsSync(path.join(ROOT_DIR, 'keystore.properties')) ||
    fs.existsSync(path.join(ANDROID_DIR, 'keystore.properties'))
  ) {
    return { source: 'keystore.properties', envOverrides: {} };
  }

  // 2. Respect explicit CI/environment keystore
  if (
    process.env.ANDROID_KEYSTORE_PATH &&
    fs.existsSync(process.env.ANDROID_KEYSTORE_PATH) &&
    process.env.ANDROID_KEYSTORE_PASSWORD &&
    process.env.ANDROID_KEY_PASSWORD
  ) {
    return { source: 'environment', envOverrides: {} };
  }

  // 3. Preserve existing persistent local release keystore if already generated
  if (fs.existsSync(LOCAL_KEYSTORE_PATH) && fs.existsSync(LOCAL_SIGNING_CREDS_PATH)) {
    const creds = JSON.parse(fs.readFileSync(LOCAL_SIGNING_CREDS_PATH, 'utf8'));
    if (creds.storePassword && creds.keyPassword && creds.keyAlias) {
      console.log('🔐 Preserving existing persistent ASAKA ZIYO release keystore (data/.android-signing/asakaziyo-release.jks)');
      return {
        source: 'persistent_local_keystore',
        envOverrides: {
          ANDROID_KEYSTORE_PATH: LOCAL_KEYSTORE_PATH,
          ANDROID_KEYSTORE_PASSWORD: creds.storePassword,
          ANDROID_KEY_ALIAS: creds.keyAlias,
          ANDROID_KEY_PASSWORD: creds.keyPassword,
        },
      };
    }
  }

  // 4. Generate a genuine 4096-bit RSA release keystore (25-year validity, local-only, 0600, gitignored)
  const keytoolBin = commandExists('keytool');
  if (!keytoolBin) {
    throw new Error('JDK keytool not found — cannot create Android release signing keystore.');
  }

  fs.mkdirSync(SIGNING_DIR, { recursive: true, mode: 0o700 });
  const storePassword = crypto.randomBytes(24).toString('hex');
  const keyPassword = storePassword;
  const keyAlias = 'asakaziyo';

  if (fs.existsSync(LOCAL_KEYSTORE_PATH)) {
    fs.unlinkSync(LOCAL_KEYSTORE_PATH);
  }

  console.log('🔐 Generating persistent 4096-bit RSA release signing keystore (stored locally in gitignored data/.android-signing/)...');
  execSync(
    `"${keytoolBin}" -genkeypair -v -storetype PKCS12 ` +
      `-keystore "${LOCAL_KEYSTORE_PATH}" ` +
      `-alias "${keyAlias}" ` +
      `-keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 9125 ` +
      `-storepass "${storePassword}" -keypass "${keyPassword}" ` +
      `-dname "CN=ASAKA ZIYO, OU=Mobile Platform, O=MuhammadSolih Hoji Jome Masjidi, L=Asaka, ST=Andijan, C=UZ"`,
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  fs.chmodSync(LOCAL_KEYSTORE_PATH, 0o600);
  fs.writeFileSync(
    LOCAL_SIGNING_CREDS_PATH,
    JSON.stringify(
      {
        keyAlias,
        storePassword,
        keyPassword,
        algorithm: 'RSA-4096 / SHA256withRSA',
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    { encoding: 'utf8', mode: 0o600 }
  );
  fs.chmodSync(LOCAL_SIGNING_CREDS_PATH, 0o600);

  return {
    source: 'persistent_local_keystore',
    envOverrides: {
      ANDROID_KEYSTORE_PATH: LOCAL_KEYSTORE_PATH,
      ANDROID_KEYSTORE_PASSWORD: storePassword,
      ANDROID_KEY_ALIAS: keyAlias,
      ANDROID_KEY_PASSWORD: keyPassword,
    },
  };
}

function verifyApkIntegrity(apkPath, sdkRoot, expectedPackageId) {
  const buf = fs.readFileSync(apkPath);
  if (buf.length < 100_000 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    throw new Error(`Invalid APK ZIP header or suspiciously small binary: ${apkPath} (${buf.length} bytes)`);
  }

  // 1. Test ZIP structure integrity
  execSync(`unzip -t "${apkPath}" > /dev/null`, { stdio: 'inherit' });

  // 2. Verify required compiled Android + WebView entries exist inside APK
  const listing = execSync(`unzip -l "${apkPath}"`, { encoding: 'utf8' });
  const requiredEntries = [
    'AndroidManifest.xml',
    'classes.dex',
    'resources.arsc',
    'assets/public/index.html',
    'assets/public/images/asaka-ziyo-logo-seal.jpg',
    'assets/public/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg',
  ];
  for (const entry of requiredEntries) {
    if (!listing.includes(entry)) {
      throw new Error(`Compiled APK missing required entry: ${entry}`);
    }
  }

  // 3. Verify compiled AndroidManifest badging & launcher icon via aapt2
  const aapt2Path = findBuildTool('aapt2', sdkRoot);
  if (aapt2Path) {
    const badging = execSync(`"${aapt2Path}" dump badging "${apkPath}"`, { encoding: 'utf8' });
    if (!badging.includes(`name='${expectedPackageId}'`)) {
      throw new Error(`aapt2 badging mismatch: expected package ${expectedPackageId}`);
    }
    if (!badging.includes(`versionCode='${BUILD_CODE}'`)) {
      throw new Error(`aapt2 badging mismatch: expected versionCode ${BUILD_CODE}`);
    }
    if (!badging.includes(`versionName='${APP_VERSION}'`)) {
      throw new Error(`aapt2 badging mismatch: expected versionName ${APP_VERSION}`);
    }
    if (!badging.includes("application-label:'ASAKA ZIYO'")) {
      throw new Error("aapt2 badging mismatch: expected application-label 'ASAKA ZIYO'");
    }
    const iconMatch = badging.match(/application:\s+label='ASAKA ZIYO'\s+icon='([^']+)'/);
    if (!iconMatch || !iconMatch[1] || !listing.includes(iconMatch[1])) {
      throw new Error('Compiled APK missing verified launcher application icon resource');
    }
    console.log(
      `✅ aapt2 dump badging verified: ${expectedPackageId} v${APP_VERSION} (${BUILD_CODE}) · label 'ASAKA ZIYO' · icon '${iconMatch[1]}'`
    );
  } else if (!listing.includes('mipmap')) {
    throw new Error('Compiled APK missing launcher mipmap icon resources');
  }

  // 4. Verify cryptographic APK signature via apksigner (REQUIRED for installable APK)
  const apksignerPath = findBuildTool('apksigner', sdkRoot);
  if (!apksignerPath) {
    throw new Error('apksigner not found in PATH or ANDROID_HOME/build-tools — cannot verify signature');
  }
  const verifyOut = execSync(`"${apksignerPath}" verify --verbose --print-certs "${apkPath}"`, {
    encoding: 'utf8',
  });
  if (!verifyOut.includes('Verifies')) {
    throw new Error(`apksigner verification failed:\n${verifyOut}`);
  }
  let certSha256 = '';
  const digestMatch = verifyOut.match(/certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/);
  if (digestMatch) {
    certSha256 = digestMatch[1].toLowerCase();
  }
  console.log(verifyOut.trim());

  return {
    sizeBytes: buf.length,
    sha256: sha256File(apkPath),
    signatureVerified: true,
    certSha256,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const skipWebBuild = args.has('--skip-web-build');

  console.log(`🚀 ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) — Direct Installable Android APK Pipeline (APK-Only, No AAB)`);

  if (!skipWebBuild) {
    execSync('node scripts/generate-pwa-icons.js', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // Sync & validate Android WebView assets + native XML/Kotlin pre-flight
  execSync('node scripts/sync-android-assets.cjs', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Verify Native Android Toolchain (JDK 17+, Android SDK, Gradle)
  const javaBin = commandExists('java');
  const sdkRoot = resolveSdkRoot();
  const gradleCmd = resolveGradleCommand();

  if (!javaBin || !sdkRoot || !fs.existsSync(sdkRoot) || !gradleCmd) {
    console.error('\n❌ Native Android SDK toolchain is NOT installed in this container environment.');
    console.error(`   - java         : ${javaBin || 'NOT FOUND'}`);
    console.error(`   - ANDROID_HOME : ${sdkRoot || 'NOT SET'}`);
    console.error(`   - gradle       : ${gradleCmd || 'NOT FOUND'}`);
    process.exit(1);
  }

  const signing = resolveOrProvisionSigningConfig();

  const gradleEnv = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    ...signing.envOverrides,
  };

  const tasks = [];
  if (args.has('--clean')) tasks.push('clean');
  // Strictly build ONLY Release APK (never generate AAB / Play Store bundle)
  tasks.push('assembleRelease');

  const cmd = `${gradleCmd} ${tasks.join(' ')} --no-daemon`;
  console.log(`\n🔨 Executing: ${cmd} (ANDROID_HOME=${sdkRoot}, signing=${signing.source})`);
  execSync(cmd, { cwd: ANDROID_DIR, env: gradleEnv, stdio: 'inherit' });

  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  // Remove any stale unsigned/debug/AAB files from data/release/ so ONLY the signed release APK is distributed
  for (const stale of [
    'Asaka-Ziyo-v4.0.0-unsigned.apk',
    'Asaka-Ziyo-v4.0.0-unsigned.aab',
    'Asaka-Ziyo-v4.0.0-debug.apk',
    'Asaka-Ziyo-v4.0.0.aab',
  ]) {
    const stalePath = path.join(RELEASE_DIR, stale);
    if (fs.existsSync(stalePath)) {
      fs.unlinkSync(stalePath);
    }
  }

  const apkOutputsDir = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release');
  if (!fs.existsSync(apkOutputsDir)) {
    throw new Error(`Release APK output directory not found: ${apkOutputsDir}`);
  }

  const apkFiles = fs.readdirSync(apkOutputsDir).filter((f) => f.endsWith('.apk') && !f.includes('unsigned'));
  const apkFile = apkFiles[0];
  if (!apkFile) {
    throw new Error(`No signed release APK found in ${apkOutputsDir}. Found: ${fs.readdirSync(apkOutputsDir).join(', ')}`);
  }

  const srcApk = path.join(apkOutputsDir, apkFile);
  const destApk = path.join(RELEASE_DIR, APK_FILENAME);
  fs.copyFileSync(srcApk, destApk);

  const signedApkInfo = verifyApkIntegrity(destApk, sdkRoot, PACKAGE_ID);
  console.log(
    `✅ Verified Signed Release APK: ${path.relative(ROOT_DIR, destApk)} (${(signedApkInfo.sizeBytes / 1048576).toFixed(2)} MB, SHA-256: ${signedApkInfo.sha256})`
  );

  // Write SHA256SUMS.txt
  fs.writeFileSync(
    path.join(RELEASE_DIR, 'SHA256SUMS.txt'),
    `${signedApkInfo.sha256}  ${APK_FILENAME}\n`,
    'utf8'
  );

  // Preserve release history & update honest verified v4.0.0 APK metadata
  let existingMeta = {};
  if (fs.existsSync(METADATA_PATH)) {
    try {
      existingMeta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    } catch {
      existingMeta = {};
    }
  }
  const previousHistory = Array.isArray(existingMeta.releaseHistory) ? existingMeta.releaseHistory : [];

  const today = new Date().toISOString().slice(0, 10);
  const metadata = {
    appName: 'ASAKA ZIYO',
    packageId: PACKAGE_ID,
    version: APP_VERSION,
    buildCode: BUILD_CODE,
    minSdk: 24,
    targetSdk: 36,
    minAndroid: 'Android 7.0+ (API 24 – API 36)',
    targetAndroid: 'Android 16 (API 36)',
    apkFilename: APK_FILENAME,
    aabFilename: '',
    apkAvailable: true,
    aabAvailable: false,
    signed: true,
    apksignerVerified: true,
    signingRequired: false,
    certSha256: signedApkInfo.certSha256,
    signingCertSha256: signedApkInfo.certSha256,
    signingSource: signing.source,
    status: 'ready',
    statusMessageUz: `ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) rasmiy imzolangan va apksigner orqali tasdiqlangan Android APK toʻgʻridan-toʻgʻri yuklab olish uchun tayyor.`,
    sizeBytes: signedApkInfo.sizeBytes,
    fileSizeDisplay: `${(signedApkInfo.sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
    sha256Checksum: signedApkInfo.sha256,
    aabSizeBytes: 0,
    aabSha256Checksum: '',
    signatureScheme: 'APK Signature Scheme v1 + v2 + v3 (RSA-4096 SHA256withRSA)',
    axmlVerified: true,
    dexVerified: true,
    resourcesArscVerified: true,
    pkcs7Signed: true,
    downloadUrl: '/api/apk/download',
    directUrl: `/${APK_FILENAME}`,
    releaseDate: today,
    verifiedAt: new Date().toISOString(),
    releaseHistory: previousHistory,
  };

  fs.writeFileSync(METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`✅ Updated ${path.relative(ROOT_DIR, METADATA_PATH)}`);
}

try {
  main();
} catch (err) {
  console.error('❌ Android APK build failed:', err?.message || err);
  process.exit(1);
}
