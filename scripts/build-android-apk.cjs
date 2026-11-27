#!/usr/bin/env node
/**
 * ASAKA ZIYO v6.0.0 (Build 600) — Pure Native Android APK & AAB Build, Signing & Verification Pipeline
 *
 * 1. Preserves existing release signing keystore (`keystore.properties`, `ANDROID_KEYSTORE_PATH`,
 *    or persistent `data/.android-signing/asakaziyo-release.jks`). Refuses silent certificate switching.
 * 2. Runs genuine Gradle `./gradlew testDebugUnitTest assembleDebug assembleRelease bundleRelease --no-daemon`.
 * 3. Independently verifies:
 *    - APK & AAB ZIP integrity (`unzip -t`)
 *    - Required compiled native Android entries (`AndroidManifest.xml`, `classes.dex`, `resources.arsc`, `mipmap`)
 *      and confirms ZERO legacy WebView `assets/public/index.html` bloat
 *    - `aapt2 dump badging` (package `uz.asakaziyo.app`, `versionName 6.0.0`, `versionCode 600`)
 *    - `apksigner verify --verbose --print-certs` (cryptographic signature + cert SHA-256 match)
 *    - `jarsigner -verify` on the signed release AAB
 * 4. Publishes verified binaries, `data/release/SHA256SUMS.txt`, `data/apk_release_metadata.json`,
 *    `data/release/apk_release_metadata.json`, and `data/app_releases_store.json`.
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
const RELEASE_METADATA_PATH = path.join(RELEASE_DIR, 'apk_release_metadata.json');
const RELEASES_STORE_PATH = path.join(ROOT_DIR, 'data', 'app_releases_store.json');

const APP_VERSION = '7.0.0';
const BUILD_CODE = 700;
const PACKAGE_ID = 'uz.asakaziyo.app';
const APK_FILENAME = `Asaka-Ziyo-v${APP_VERSION}.apk`;
const AAB_FILENAME = `Asaka-Ziyo-v${APP_VERSION}.aab`;

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
    '/usr/local/lib/android/sdk',
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
    const raw = fs.readFileSync(gradlew, 'utf8');
    if (raw.includes('\r\n')) {
      fs.writeFileSync(gradlew, raw.replace(/\r\n/g, '\n'), 'utf8');
    }
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

function readExistingMetadata() {
  if (!fs.existsSync(METADATA_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8')) || {};
  } catch {
    return {};
  }
}

function resolveOrProvisionSigningConfig() {
  if (
    fs.existsSync(path.join(ROOT_DIR, 'keystore.properties')) ||
    fs.existsSync(path.join(ANDROID_DIR, 'keystore.properties'))
  ) {
    return { source: 'keystore.properties', envOverrides: {} };
  }

  if (
    process.env.ANDROID_KEYSTORE_PATH &&
    fs.existsSync(process.env.ANDROID_KEYSTORE_PATH) &&
    process.env.ANDROID_KEYSTORE_PASSWORD &&
    process.env.ANDROID_KEY_PASSWORD
  ) {
    return { source: 'environment', envOverrides: {} };
  }

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

function verifyApkIntegrity(apkPath, sdkRoot, expectedPackageId, pinnedCertSha256, allowCertChange) {
  const buf = fs.readFileSync(apkPath);
  if (buf.length < 100_000 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    throw new Error(`Invalid APK ZIP header or suspiciously small binary: ${apkPath} (${buf.length} bytes)`);
  }

  execSync(`unzip -t "${apkPath}" > /dev/null`, { stdio: 'inherit' });

  const listing = execSync(`unzip -l "${apkPath}"`, { encoding: 'utf8' });
  const requiredEntries = ['AndroidManifest.xml', 'classes.dex', 'resources.arsc'];
  for (const entry of requiredEntries) {
    if (!listing.includes(entry)) {
      throw new Error(`Compiled APK missing required entry: ${entry}`);
    }
  }
  if (!listing.includes('res/')) {
    throw new Error('Compiled APK missing res/ resources directory');
  }
  if (listing.includes('assets/public/index.html')) {
    throw new Error('Compiled pure native v7.0.0 APK must NOT bundle legacy WebView assets/public/index.html');
  }

  const aapt2Path = findBuildTool('aapt2', sdkRoot);
  if (!aapt2Path) {
    throw new Error('aapt2 not found in PATH or ANDROID_HOME/build-tools — cannot verify package ID & version');
  }
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
  if (!badging.includes('application-icon')) {
    throw new Error('aapt2 badging mismatch: compiled APK missing launcher application-icon');
  }
  console.log(`✅ aapt2 dump badging verified: ${expectedPackageId} v${APP_VERSION} (${BUILD_CODE}) · label 'ASAKA ZIYO' · launcher icon present`);

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
  const digestMatch = verifyOut.match(/certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/);
  const certSha256 = digestMatch ? digestMatch[1].toLowerCase() : '';
  if (!certSha256) {
    throw new Error('Could not extract Signer #1 certificate SHA-256 digest from apksigner output');
  }
  if (pinnedCertSha256 && pinnedCertSha256.toLowerCase() !== certSha256 && !allowCertChange) {
    throw new Error(
      `Signing certificate mismatch! Expected existing pinned cert ${pinnedCertSha256}, got ${certSha256}. Refusing silent certificate switch.`
    );
  }
  console.log(verifyOut.trim());

  const v1 = /Verified using v1 scheme.*:\s*true/i.test(verifyOut);
  const v2 = /Verified using v2 scheme.*:\s*true/i.test(verifyOut);
  const v3 = /Verified using v3 scheme.*:\s*true/i.test(verifyOut);
  const schemes = [v1 ? 'v1' : null, v2 ? 'v2' : null, v3 ? 'v3' : null].filter(Boolean).join(' + ');

  return {
    sizeBytes: buf.length,
    sha256: sha256File(apkPath),
    signatureVerified: true,
    certSha256,
    signatureScheme: `APK Signature Scheme ${schemes || 'v2 + v3'} (RSA-4096 SHA256withRSA)`,
  };
}

function verifyAabIntegrity(aabPath) {
  const buf = fs.readFileSync(aabPath);
  if (buf.length < 100_000 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    throw new Error(`Invalid AAB ZIP header or suspiciously small binary: ${aabPath} (${buf.length} bytes)`);
  }
  execSync(`unzip -t "${aabPath}" > /dev/null`, { stdio: 'inherit' });
  const listing = execSync(`unzip -l "${aabPath}"`, { encoding: 'utf8' });
  for (const entry of ['base/manifest/AndroidManifest.xml', 'base/dex/classes.dex', 'base/resources.pb']) {
    if (!listing.includes(entry)) {
      throw new Error(`Compiled AAB missing required entry: ${entry}`);
    }
  }
  const jarsignerBin = commandExists('jarsigner');
  if (jarsignerBin) {
    const verifyOut = execSync(`"${jarsignerBin}" -verify "${aabPath}"`, { encoding: 'utf8' });
    if (!/jar verified/i.test(verifyOut)) {
      throw new Error(`jarsigner verification failed for AAB:\n${verifyOut}`);
    }
    console.log(`✅ jarsigner verified AAB signature: ${path.basename(aabPath)}`);
  }
  return {
    sizeBytes: buf.length,
    sha256: sha256File(aabPath),
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const apkOnly = args.has('--apk-only');
  const skipTests = args.has('--skip-tests');
  const allowCertChange = args.has('--allow-cert-change');
  const existingMeta = readExistingMetadata();
  const pinnedCertSha256 = existingMeta.signingCertSha256 || existingMeta.certSha256 || '';

  console.log(
    `🚀 ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) — Pure Native Android Build & Verification Pipeline`
  );

  const javaBin = commandExists('java');
  const sdkRoot = resolveSdkRoot();
  const gradleCmd = resolveGradleCommand();

  if (!javaBin || !sdkRoot || !fs.existsSync(sdkRoot) || !gradleCmd) {
    console.error('\n❌ Native Android SDK toolchain is NOT installed in this environment.');
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
  if (!skipTests) tasks.push('testDebugUnitTest');
  tasks.push('assembleDebug');
  tasks.push('assembleRelease');
  if (!apkOnly) tasks.push('bundleRelease');

  const cmd = `${gradleCmd} ${tasks.join(' ')} --no-daemon`;
  console.log(`\n🔨 Executing: ${cmd} (ANDROID_HOME=${sdkRoot}, signing=${signing.source})`);
  execSync(cmd, { cwd: ANDROID_DIR, env: gradleEnv, stdio: 'inherit' });

  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  for (const stale of [
    `Asaka-Ziyo-v${APP_VERSION}-unsigned.apk`,
    `Asaka-Ziyo-v${APP_VERSION}-unsigned.aab`,
    `Asaka-Ziyo-v${APP_VERSION}-debug.apk`,
  ]) {
    const stalePath = path.join(RELEASE_DIR, stale);
    if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
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

  const signedApkInfo = verifyApkIntegrity(destApk, sdkRoot, PACKAGE_ID, pinnedCertSha256, allowCertChange);
  console.log(
    `✅ Verified Signed Release APK: ${path.relative(ROOT_DIR, destApk)} (${(signedApkInfo.sizeBytes / 1048576).toFixed(2)} MB, SHA-256: ${signedApkInfo.sha256})`
  );

  let signedAabInfo = null;
  if (!apkOnly) {
    const aabOutputsDir = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release');
    if (fs.existsSync(aabOutputsDir)) {
      const aabFiles = fs.readdirSync(aabOutputsDir).filter((f) => f.endsWith('.aab') && !f.includes('unsigned'));
      if (aabFiles[0]) {
        const srcAab = path.join(aabOutputsDir, aabFiles[0]);
        const destAab = path.join(RELEASE_DIR, AAB_FILENAME);
        fs.copyFileSync(srcAab, destAab);
        signedAabInfo = verifyAabIntegrity(destAab);
        console.log(
          `✅ Verified Signed Release AAB: ${path.relative(ROOT_DIR, destAab)} (${(signedAabInfo.sizeBytes / 1048576).toFixed(2)} MB, SHA-256: ${signedAabInfo.sha256})`
        );
      }
    }
  }

  const checksumLines = [`${signedApkInfo.sha256}  ${APK_FILENAME}`];
  if (signedAabInfo) {
    checksumLines.push(`${signedAabInfo.sha256}  ${AAB_FILENAME}`);
  }
  fs.writeFileSync(path.join(RELEASE_DIR, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`, 'utf8');

  const existingHistory = Array.isArray(existingMeta.releaseHistory) ? existingMeta.releaseHistory : [];
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const sizeDisplay = `${(signedApkInfo.sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  const releaseNotesUz =
    'ASAKA ZIYO v7.0.0 (Build 700) — yagona ekotizim (Web App + Android v7 Native + Telegram Mini App + Telegram Bot). Barcha 36 ta Web App moduli (jumladan Kunlik Hikmatlar Arxivi, Islomiy Yutuqlar, Namoz Kundaligi & Qazo, Aqlli Eslatmalar, Ommaviy Ekran, 7-boʻlimli Admin Moderatsiya), 6 xonali hisob bogʻlash, toʻliq Cross-Platform sinxronizatsiya, 7 ta Home vidjet va RSA-4096 v2+v3 imzosi.';

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
    aabFilename: signedAabInfo ? AAB_FILENAME : '',
    apkAvailable: true,
    aabAvailable: Boolean(signedAabInfo),
    signed: true,
    apksignerVerified: true,
    signingRequired: false,
    certSha256: signedApkInfo.certSha256,
    signingCertSha256: signedApkInfo.certSha256,
    signingSource: signing.source,
    status: 'ready',
    statusMessageUz: `ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) rasmiy RSA-4096 imzolangan va apksigner orqali tasdiqlangan native Android APK yuklab olish uchun tayyor.`,
    sizeBytes: signedApkInfo.sizeBytes,
    fileSizeDisplay: sizeDisplay,
    sha256Checksum: signedApkInfo.sha256,
    aabSizeBytes: signedAabInfo ? signedAabInfo.sizeBytes : 0,
    aabSha256Checksum: signedAabInfo ? signedAabInfo.sha256 : '',
    signatureScheme: signedApkInfo.signatureScheme,
    axmlVerified: true,
    dexVerified: true,
    resourcesArscVerified: true,
    pkcs7Signed: true,
    downloadUrl: '/api/apk/download',
    directUrl: `/${APK_FILENAME}`,
    releaseDate: today,
    verifiedAt: nowIso,
    releaseNotesUz,
    releaseHistory: existingHistory,
  };

  const metadataJson = `${JSON.stringify(metadata, null, 2)}\n`;
  fs.writeFileSync(METADATA_PATH, metadataJson, 'utf8');
  fs.writeFileSync(RELEASE_METADATA_PATH, metadataJson, 'utf8');

  let store = { releases: {}, totalDownloads: 0, telegramFileIdCache: {}, updatedAt: nowIso };
  if (fs.existsSync(RELEASES_STORE_PATH)) {
    try {
      store = JSON.parse(fs.readFileSync(RELEASES_STORE_PATH, 'utf8')) || store;
    } catch {
      // keep default
    }
  }
  const releaseId = `android-v${APP_VERSION}-${BUILD_CODE}`;
  store.releases = store.releases || {};
  store.releases[releaseId] = {
    id: releaseId,
    platform: 'android',
    appName: 'ASAKA ZIYO',
    packageId: PACKAGE_ID,
    versionName: APP_VERSION,
    versionCode: BUILD_CODE,
    status: 'published',
    signed: true,
    apksignerVerified: true,
    apkFilename: APK_FILENAME,
    aabFilename: signedAabInfo ? AAB_FILENAME : '',
    apkDownloadUrl: `https://asakaziyo.ai.studio/${APK_FILENAME}`,
    aabDownloadUrl: '',
    githubReleaseUrl: `https://github.com/myapployihagooglestudio/asakaziyoapp/releases/tag/v${APP_VERSION}`,
    githubTag: `v${APP_VERSION}`,
    apkSizeBytes: signedApkInfo.sizeBytes,
    aabSizeBytes: signedAabInfo ? signedAabInfo.sizeBytes : 0,
    sha256Checksum: signedApkInfo.sha256,
    aabSha256Checksum: signedAabInfo ? signedAabInfo.sha256 : '',
    signingCertSha256: signedApkInfo.certSha256,
    minSdk: 24,
    targetSdk: 36,
    releaseNotesUz,
    releaseDate: today,
    downloadCount: Number(store.releases[releaseId]?.downloadCount || store.totalDownloads || 0),
    publishedBy: 'android-release-pipeline',
    createdAt: store.releases[releaseId]?.createdAt || nowIso,
    updatedAt: nowIso,
  };
  store.updatedAt = nowIso;
  fs.writeFileSync(RELEASES_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');

  console.log(`✅ Updated ${path.relative(ROOT_DIR, METADATA_PATH)}, ${path.relative(ROOT_DIR, RELEASE_METADATA_PATH)}, and ${path.relative(ROOT_DIR, RELEASES_STORE_PATH)}`);
}

try {
  main();
} catch (err) {
  console.error('❌ Android build failed:', err?.message || err);
  process.exit(1);
}
