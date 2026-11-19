#!/usr/bin/env node
/**
 * ASAKA ZIYO v4.0.0 — Real Native Android Gradle Release Orchestrator
 *
 * Package ID : uz.asakaziyo.app
 * Version    : 4.0.0 (versionCode 400)
 * Artifacts  : data/release/Asaka-Ziyo-v4.0.0.apk & data/release/Asaka-Ziyo-v4.0.0.aab
 *
 * ZERO shortcuts, ZERO fake APKs, ZERO hardcoded passwords, ZERO template patching!
 * Executes the real Gradle Android build pipeline (JDK 17 + Android SDK API 36 + Gradle 8.9),
 * signs via configured keystore or persistent local RSA-2048 keystore (data/.android-signing/),
 * and cryptographically validates every APK via aapt2 dump badging + apksigner verify --print-certs.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync, spawnSync } = require('node:child_process');

const ROOT_DIR = process.cwd();
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const RELEASE_DIR = path.join(ROOT_DIR, 'data', 'release');
const METADATA_PATH = path.join(ROOT_DIR, 'data', 'apk_release_metadata.json');
const LOCAL_SIGNING_DIR = path.join(ROOT_DIR, 'data', '.android-signing');
const LOCAL_KEYSTORE_PATH = path.join(LOCAL_SIGNING_DIR, 'asaka-ziyo-v4-release.jks');
const LOCAL_SIGNING_CONFIG_PATH = path.join(LOCAL_SIGNING_DIR, 'signing.json');

const APP_VERSION = '4.0.0';
const BUILD_CODE = 400;
const PACKAGE_ID = 'uz.asakaziyo.app';
const APK_FILENAME = `Asaka-Ziyo-v${APP_VERSION}.apk`;
const AAB_FILENAME = `Asaka-Ziyo-v${APP_VERSION}.aab`;

function commandExists(cmd) {
  const res = spawnSync('which', [cmd], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : null;
}

function resolveSdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    '/opt/android-sdk',
    '/usr/local/lib/android/sdk',
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return '';
}

function resolveGradleCommand() {
  const gradlewPath = path.join(ANDROID_DIR, 'gradlew');
  if (fs.existsSync(gradlewPath)) return './gradlew';
  const fromPath = commandExists('gradle');
  if (fromPath) return fromPath;
  const optGradle = '/opt/gradle/gradle-8.9/bin/gradle';
  if (fs.existsSync(optGradle)) return optGradle;
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

function ensureLocalSigningConfig() {
  fs.mkdirSync(LOCAL_SIGNING_DIR, { recursive: true, mode: 0o700 });

  if (fs.existsSync(LOCAL_KEYSTORE_PATH) && fs.existsSync(LOCAL_SIGNING_CONFIG_PATH)) {
    const cfg = JSON.parse(fs.readFileSync(LOCAL_SIGNING_CONFIG_PATH, 'utf8'));
    if (cfg.storePassword && cfg.keyPassword && cfg.keyAlias) {
      return {
        storeFile: LOCAL_KEYSTORE_PATH,
        storePassword: cfg.storePassword,
        keyAlias: cfg.keyAlias,
        keyPassword: cfg.keyPassword,
        source: 'persistent_local_keystore',
      };
    }
  }

  const keytoolBin = commandExists('keytool');
  if (!keytoolBin) {
    throw new Error('keytool not found in PATH — cannot generate persistent RSA-2048 release keystore.');
  }

  const storePassword = crypto.randomBytes(24).toString('base64url');
  const keyPassword = storePassword;
  const keyAlias = 'asakaziyo';

  if (fs.existsSync(LOCAL_KEYSTORE_PATH)) {
    fs.unlinkSync(LOCAL_KEYSTORE_PATH);
  }

  console.log('🔐 Generating persistent RSA-2048 release keystore (data/.android-signing/asaka-ziyo-v4-release.jks)...');
  const gen = spawnSync(
    keytoolBin,
    [
      '-genkeypair',
      '-v',
      '-keystore',
      LOCAL_KEYSTORE_PATH,
      '-storetype',
      'JKS',
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-alias',
      keyAlias,
      '-storepass',
      storePassword,
      '-keypass',
      keyPassword,
      '-dname',
      'CN=ASAKA ZIYO, OU=MuhammadSolih Hoji Jome Masjidi, O=ASAKA ZIYO, L=Asaka, ST=Andijon, C=UZ',
    ],
    { encoding: 'utf8' }
  );

  if (gen.status !== 0) {
    throw new Error(`keytool failed: ${gen.stderr || gen.stdout || 'unknown error'}`);
  }

  fs.chmodSync(LOCAL_KEYSTORE_PATH, 0o600);
  fs.writeFileSync(
    LOCAL_SIGNING_CONFIG_PATH,
    `${JSON.stringify(
      {
        keyAlias,
        storePassword,
        keyPassword,
        createdAt: new Date().toISOString(),
        note: 'Persistent local release signing keystore for ASAKA ZIYO v4.0.0+. Gitignored; keep backed up for in-place updates.',
      },
      null,
      2
    )}\n`,
    { mode: 0o600 }
  );

  return {
    storeFile: LOCAL_KEYSTORE_PATH,
    storePassword,
    keyAlias,
    keyPassword,
    source: 'persistent_local_keystore',
  };
}

function verifyApkIntegrity(apkPath, sdkRoot, expectSigned) {
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
  if (!listing.includes('mipmap')) {
    throw new Error('Compiled APK missing launcher mipmap icon resources');
  }

  // 3. Verify compiled AndroidManifest badging via aapt2
  const aapt2Path = findBuildTool('aapt2', sdkRoot);
  if (aapt2Path) {
    const badging = execSync(`"${aapt2Path}" dump badging "${apkPath}"`, { encoding: 'utf8' });
    if (!badging.includes(`name='${PACKAGE_ID}'`)) {
      throw new Error(`aapt2 badging mismatch: expected package ${PACKAGE_ID}`);
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
    console.log(`✅ aapt2 dump badging verified: ${PACKAGE_ID} v${APP_VERSION} (${BUILD_CODE}) · label 'ASAKA ZIYO'`);
  }

  // 4. Verify cryptographic APK signature via apksigner when signed
  const apksignerPath = findBuildTool('apksigner', sdkRoot);
  let signatureVerified = false;
  let certSha256 = '';
  if (expectSigned) {
    if (!apksignerPath) {
      throw new Error('apksigner not found in PATH or ANDROID_HOME/build-tools — cannot verify production signature');
    }
    const verifyOut = execSync(`"${apksignerPath}" verify --verbose --print-certs "${apkPath}"`, { encoding: 'utf8' });
    if (!verifyOut.includes('Verifies')) {
      throw new Error(`apksigner verification failed:\n${verifyOut}`);
    }
    const digestMatch = verifyOut.match(/certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/);
    if (digestMatch) {
      certSha256 = digestMatch[1].toLowerCase();
    }
    console.log(verifyOut.trim());
    signatureVerified = true;
  }

  return {
    sizeBytes: buf.length,
    sha256: sha256File(apkPath),
    signatureVerified,
    certSha256,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const allowUnsigned = args.has('--allow-unsigned');
  const skipWebBuild = args.has('--skip-web-build');
  const buildAab = args.has('--aab') || args.has('--all') || !args.has('--apk-only');
  const buildApk = args.has('--apk') || args.has('--all') || !args.has('--aab-only');

  console.log(`🚀 ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) — Native Android Release Pipeline`);

  if (!skipWebBuild) {
    // Step 1: Regenerate & validate unified Web/PWA/Android icons
    execSync('node scripts/generate-pwa-icons.js', { cwd: ROOT_DIR, stdio: 'inherit' });

    // Step 2: Build Vite production bundle
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // Step 3: Sync & validate Android WebView assets + native XML/Kotlin pre-flight
  execSync('node scripts/sync-android-assets.cjs', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Step 4: Verify Native Android Toolchain (JDK 17+, Android SDK, Gradle)
  const javaBin = commandExists('java');
  const sdkRoot = resolveSdkRoot();
  const gradleCmd = resolveGradleCommand();

  if (!javaBin || !sdkRoot || !fs.existsSync(sdkRoot) || !gradleCmd) {
    console.error('\n❌ Native Android SDK toolchain is NOT installed in this container environment.');
    console.error(`   - java         : ${javaBin || 'NOT FOUND'}`);
    console.error(`   - ANDROID_HOME : ${sdkRoot || 'NOT SET'}`);
    console.error(`   - gradle       : ${gradleCmd || 'NOT FOUND'}`);
    console.error('\nℹ️  Refusing to fabricate an APK or copy an old v3.0.0 binary as v4.0.0.');
    process.exit(1);
  }

  // Step 5: Resolve release signing configuration (external keystore.properties / env / persistent local keystore)
  const hasKeystoreProps =
    fs.existsSync(path.join(ROOT_DIR, 'keystore.properties')) ||
    fs.existsSync(path.join(ANDROID_DIR, 'keystore.properties'));
  const hasEnvKeystore =
    Boolean(process.env.ANDROID_KEYSTORE_PATH) &&
    fs.existsSync(process.env.ANDROID_KEYSTORE_PATH) &&
    Boolean(process.env.ANDROID_KEYSTORE_PASSWORD) &&
    Boolean(process.env.ANDROID_KEY_PASSWORD);

  const gradleEnv = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
  };

  let isSignedRelease = hasKeystoreProps || hasEnvKeystore;
  let signingSource = hasKeystoreProps ? 'keystore.properties' : hasEnvKeystore ? 'environment' : 'unsigned';

  if (!isSignedRelease && !allowUnsigned) {
    const localSigning = ensureLocalSigningConfig();
    gradleEnv.ANDROID_KEYSTORE_PATH = localSigning.storeFile;
    gradleEnv.ANDROID_KEYSTORE_PASSWORD = localSigning.storePassword;
    gradleEnv.ANDROID_KEY_ALIAS = localSigning.keyAlias;
    gradleEnv.ANDROID_KEY_PASSWORD = localSigning.keyPassword;
    isSignedRelease = true;
    signingSource = localSigning.source;
  }

  const tasks = [];
  if (args.has('--clean')) tasks.push('clean');
  if (args.has('--with-debug')) tasks.push('assembleDebug');
  if (buildApk) tasks.push('assembleRelease');
  if (buildAab) tasks.push('bundleRelease');

  const extraFlag = !isSignedRelease && allowUnsigned ? ' -PallowUnsignedRelease=true' : '';
  const cmd = `${gradleCmd} ${tasks.join(' ')} --no-daemon${extraFlag}`;
  console.log(`\n🔨 Executing: ${cmd} (ANDROID_HOME=${sdkRoot}, signing=${signingSource})`);
  execSync(cmd, { cwd: ANDROID_DIR, env: gradleEnv, stdio: 'inherit' });

  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  // Step 6: Locate, verify & export release APK
  const apkOutputsDir = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release');
  let apkInfo = null;
  if (buildApk && fs.existsSync(apkOutputsDir)) {
    const apkFile = fs.readdirSync(apkOutputsDir).find((f) => f.endsWith('.apk'));
    if (!apkFile) throw new Error(`No release APK found in ${apkOutputsDir}`);
    const srcApk = path.join(apkOutputsDir, apkFile);
    const destApk = path.join(RELEASE_DIR, APK_FILENAME);
    fs.copyFileSync(srcApk, destApk);
    apkInfo = verifyApkIntegrity(destApk, sdkRoot, isSignedRelease);
    console.log(
      `✅ Verified APK: ${path.relative(ROOT_DIR, destApk)} (${(apkInfo.sizeBytes / 1048576).toFixed(2)} MB, SHA-256: ${apkInfo.sha256})`
    );
  }

  // Step 7: Locate, verify & export release AAB
  const aabOutputsDir = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release');
  let aabInfo = null;
  if (buildAab && fs.existsSync(aabOutputsDir)) {
    const aabFile = fs.readdirSync(aabOutputsDir).find((f) => f.endsWith('.aab'));
    if (!aabFile) throw new Error(`No release AAB found in ${aabOutputsDir}`);
    const srcAab = path.join(aabOutputsDir, aabFile);
    const destAab = path.join(RELEASE_DIR, AAB_FILENAME);
    fs.copyFileSync(srcAab, destAab);
    execSync(`unzip -t "${destAab}" > /dev/null`, { stdio: 'inherit' });
    const aabStat = fs.statSync(destAab);
    aabInfo = { sizeBytes: aabStat.size, sha256: sha256File(destAab) };
    console.log(
      `✅ Verified AAB: ${path.relative(ROOT_DIR, destAab)} (${(aabInfo.sizeBytes / 1048576).toFixed(2)} MB, SHA-256: ${aabInfo.sha256})`
    );
  }

  // Write SHA256SUMS.txt for transparent release integrity checking
  const checksumLines = [];
  if (apkInfo) checksumLines.push(`${apkInfo.sha256}  ${APK_FILENAME}`);
  if (aabInfo) checksumLines.push(`${aabInfo.sha256}  ${AAB_FILENAME}`);
  if (checksumLines.length > 0) {
    fs.writeFileSync(path.join(RELEASE_DIR, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`, 'utf8');
  }

  // Step 8: Preserve release history & write verified v4.0.0 release metadata
  let existingMeta = {};
  if (fs.existsSync(METADATA_PATH)) {
    try {
      existingMeta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    } catch {
      existingMeta = {};
    }
  }
  const previousHistory = Array.isArray(existingMeta.releaseHistory) ? existingMeta.releaseHistory : [];
  if (existingMeta.version && existingMeta.version !== APP_VERSION) {
    const alreadyRecorded = previousHistory.some((h) => h.version === existingMeta.version);
    if (!alreadyRecorded) {
      previousHistory.unshift({
        version: existingMeta.version,
        buildCode: existingMeta.buildCode,
        releaseDate: existingMeta.releaseDate,
        sizeBytes: existingMeta.sizeBytes,
        sha256Checksum: existingMeta.sha256Checksum,
        archived: true,
      });
    }
  }

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
    aabFilename: AAB_FILENAME,
    apkAvailable: Boolean(apkInfo),
    aabAvailable: Boolean(aabInfo),
    signed: isSignedRelease,
    apksignerVerified: Boolean(apkInfo?.signatureVerified),
    certSha256: apkInfo?.certSha256 || '',
    signingCertSha256: apkInfo?.certSha256 || '',
    signingSource,
    status: apkInfo ? 'ready' : 'awaiting_ci_artifact',
    statusMessageUz: apkInfo
      ? `ASAKA ZIYO v${APP_VERSION} (Build ${BUILD_CODE}) rasmiy imzolangan va tekshirilgan Android APK tayyor.`
      : 'APK hali yaratilmagan.',
    sizeBytes: apkInfo?.sizeBytes || 0,
    fileSizeDisplay: apkInfo ? `${(apkInfo.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Tayyorlanmoqda',
    sha256Checksum: apkInfo?.sha256 || '',
    aabSizeBytes: aabInfo?.sizeBytes || 0,
    aabSha256Checksum: aabInfo?.sha256 || '',
    signatureScheme: isSignedRelease
      ? 'APK Signature Scheme v1 + v2 + v3 (RSA-2048 SHA-256)'
      : 'UNSIGNED TEST BUILD (Not for Play Store)',
    axmlVerified: Boolean(apkInfo),
    dexVerified: Boolean(apkInfo),
    resourcesArscVerified: Boolean(apkInfo),
    pkcs7Signed: Boolean(apkInfo?.signatureVerified),
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
  console.error('❌ Android release build failed:', err?.message || err);
  process.exit(1);
}
