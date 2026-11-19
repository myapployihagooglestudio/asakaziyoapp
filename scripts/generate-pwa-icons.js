#!/usr/bin/env node
/**
 * ASAKA ZIYO v4.0.0 — Unified Web, PWA & Android Adaptive Icon Pipeline
 *
 * Canonical Source: public/images/asaka-ziyo-logo-seal.jpg
 * (Fallback: public/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg)
 *
 * Generates and strictly validates:
 *  - Web/PWA: pwa-192x192.png, pwa-512x512.png, pwa-maskable-512x512.png,
 *             apple-touch-icon.png (180x180), favicon-32x32.png, favicon.ico (real multi-frame ICO)
 *  - Android: mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/{ic_launcher,ic_launcher_round,ic_launcher_foreground}.png
 *             with proper 66% adaptive safe-zone foreground & circular round mask.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ANDROID_RES_DIR = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');

const SOURCE_CANDIDATES = [
  path.join(PUBLIC_DIR, 'images', 'asaka-ziyo-logo-seal.jpg'),
  path.join(PUBLIC_DIR, 'assets', 'aistudio', 'IMG_20261114_084331_924_8f6ccba1.jpg'),
];

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_DENSITIES = [
  { name: 'mdpi', launcher: 48, foreground: 108 },
  { name: 'hdpi', launcher: 72, foreground: 162 },
  { name: 'xhdpi', launcher: 96, foreground: 216 },
  { name: 'xxhdpi', launcher: 144, foreground: 324 },
  { name: 'xxxhdpi', launcher: 192, foreground: 432 },
];

function createCircleMaskSvg(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="#ffffff"/>` +
    `</svg>`
  );
}

/**
 * Builds a genuine Windows/Browser multi-size .ico container wrapping PNG frames.
 */
function buildIcoContainer(pngFrames) {
  const count = pngFrames.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Image count

  const entries = [];
  for (const frame of pngFrames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 0);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 1);
    entry.writeUInt8(0, 2);                    // Color palette
    entry.writeUInt8(0, 3);                    // Reserved
    entry.writeUInt16LE(1, 4);                 // Color planes
    entry.writeUInt16LE(32, 6);                // Bits per pixel
    entry.writeUInt32LE(frame.data.length, 8); // Image data size
    entry.writeUInt32LE(offset, 12);           // Offset to PNG data
    entries.push(entry);
    offset += frame.data.length;
  }

  return Buffer.concat([header, ...entries, ...pngFrames.map((f) => f.data)]);
}

async function renderContainedIcon(sourceBuf, canvasSize, innerRatio, background, circularMask = false) {
  const innerSize = Math.max(1, Math.round(canvasSize * innerRatio));
  let resizedLogo = await sharp(sourceBuf)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: WHITE_BG,
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  if (circularMask) {
    resizedLogo = await sharp(resizedLogo)
      .composite([{ input: createCircleMaskSvg(innerSize), blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const offset = Math.floor((canvasSize - innerSize) / 2);

  let composed = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background,
    },
  }).composite([{ input: resizedLogo, left: offset, top: offset }]);

  if (circularMask && background.alpha === 0) {
    return composed.png({ compressionLevel: 9 }).toBuffer();
  }
  return composed.png({ compressionLevel: 9 }).toBuffer();
}

async function validateImageFile(filePath, expectedWidth, expectedHeight, expectedFormat) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing generated icon: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error(`Zero-byte icon file: ${filePath}`);
  }

  if (expectedFormat === 'ico') {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 22 || buf[0] !== 0x00 || buf[1] !== 0x00 || buf[2] !== 0x01 || buf[3] !== 0x00) {
      throw new Error(`Invalid ICO binary header in ${filePath}`);
    }
    return { size: stat.size, format: 'ico', width: expectedWidth, height: expectedHeight };
  }

  const meta = await sharp(filePath).metadata();
  if (meta.format !== expectedFormat) {
    throw new Error(`Unexpected format for ${filePath}: got ${meta.format}, expected ${expectedFormat}`);
  }
  if (meta.width !== expectedWidth || meta.height !== expectedHeight) {
    throw new Error(
      `Dimension mismatch for ${filePath}: got ${meta.width}x${meta.height}, expected ${expectedWidth}x${expectedHeight}`
    );
  }
  return { size: stat.size, format: meta.format, width: meta.width, height: meta.height };
}

async function main() {
  const sourcePath = SOURCE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!sourcePath) {
    console.error('❌ Canonical ASAKA ZIYO mosque seal logo not found in:', SOURCE_CANDIDATES);
    process.exit(1);
  }

  const sourceBuf = fs.readFileSync(sourcePath);
  const sourceMeta = await sharp(sourceBuf).metadata();
  if (!sourceMeta.width || !sourceMeta.height || sourceMeta.width < 256 || sourceMeta.height < 256) {
    console.error(`❌ Source logo resolution too low (${sourceMeta.width}x${sourceMeta.height}): ${sourcePath}`);
    process.exit(1);
  }

  console.log(`🎨 ASAKA ZIYO v4.0.0 Icon Pipeline — Source: ${path.relative(ROOT_DIR, sourcePath)} (${sourceMeta.width}x${sourceMeta.height} ${sourceMeta.format})`);

  const verified = [];

  // 1. Web & PWA Icons
  const webTargets = [
    { file: 'pwa-192x192.png', size: 192, ratio: 0.96, bg: WHITE_BG, round: false },
    { file: 'pwa-512x512.png', size: 512, ratio: 0.96, bg: WHITE_BG, round: false },
    { file: 'pwa-maskable-512x512.png', size: 512, ratio: 0.78, bg: WHITE_BG, round: false },
    { file: 'apple-touch-icon.png', size: 180, ratio: 0.92, bg: WHITE_BG, round: false },
    { file: 'favicon-32x32.png', size: 32, ratio: 0.96, bg: TRANSPARENT_BG, round: true },
  ];

  for (const t of webTargets) {
    const outPath = path.join(PUBLIC_DIR, t.file);
    const pngBuf = await renderContainedIcon(sourceBuf, t.size, t.ratio, t.bg, t.round);
    fs.writeFileSync(outPath, pngBuf);
    const info = await validateImageFile(outPath, t.size, t.size, 'png');
    verified.push({ file: `public/${t.file}`, ...info });
  }

  // 2. Genuine Multi-Frame favicon.ico (16x16, 32x32, 48x48)
  const icoFrames = [];
  for (const size of [16, 32, 48]) {
    const data = await renderContainedIcon(sourceBuf, size, 0.96, TRANSPARENT_BG, true);
    icoFrames.push({ size, data });
  }
  const icoPath = path.join(PUBLIC_DIR, 'favicon.ico');
  fs.writeFileSync(icoPath, buildIcoContainer(icoFrames));
  const icoInfo = await validateImageFile(icoPath, 48, 48, 'ico');
  verified.push({ file: 'public/favicon.ico', ...icoInfo });

  // 3. Android Mipmap Legacy, Round & Adaptive Foreground Icons (mdpi -> xxxhdpi)
  for (const d of ANDROID_DENSITIES) {
    const dir = path.join(ANDROID_RES_DIR, `mipmap-${d.name}`);
    fs.mkdirSync(dir, { recursive: true });

    // Standard launcher icon (API 24-25 fallback & Play Store preview)
    const launcherPath = path.join(dir, 'ic_launcher.png');
    const launcherBuf = await renderContainedIcon(sourceBuf, d.launcher, 0.92, WHITE_BG, false);
    fs.writeFileSync(launcherPath, launcherBuf);
    verified.push({
      file: `android/.../mipmap-${d.name}/ic_launcher.png`,
      ...(await validateImageFile(launcherPath, d.launcher, d.launcher, 'png')),
    });

    // Circular round icon
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    const roundBuf = await renderContainedIcon(sourceBuf, d.launcher, 0.96, TRANSPARENT_BG, true);
    fs.writeFileSync(roundPath, roundBuf);
    verified.push({
      file: `android/.../mipmap-${d.name}/ic_launcher_round.png`,
      ...(await validateImageFile(roundPath, d.launcher, d.launcher, 'png')),
    });

    // Adaptive icon foreground (108dp canvas, logo safely centered inside 66% / 72dp safe zone)
    const fgPath = path.join(dir, 'ic_launcher_foreground.png');
    const fgBuf = await renderContainedIcon(sourceBuf, d.foreground, 0.66, TRANSPARENT_BG, true);
    fs.writeFileSync(fgPath, fgBuf);
    verified.push({
      file: `android/.../mipmap-${d.name}/ic_launcher_foreground.png`,
      ...(await validateImageFile(fgPath, d.foreground, d.foreground, 'png')),
    });
  }

  // 4. Validate all public/images/* assets to ensure zero corrupted images
  const imagesDir = path.join(PUBLIC_DIR, 'images');
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    for (const imgFile of imageFiles) {
      const fullPath = path.join(imagesDir, imgFile);
      const stat = fs.statSync(fullPath);
      if (stat.size === 0) throw new Error(`Corrupted zero-byte image: public/images/${imgFile}`);
      const meta = await sharp(fullPath).metadata();
      if (!meta.width || !meta.height) throw new Error(`Invalid image metadata: public/images/${imgFile}`);
    }
    console.log(`✅ Verified ${imageFiles.length} brand/content images in public/images/`);
  }

  console.log(`✅ Generated & verified ${verified.length} Web, PWA, ICO & Android adaptive icon assets.`);
}

main().catch((err) => {
  console.error('❌ Icon pipeline failed:', err?.message || err);
  process.exit(1);
});
