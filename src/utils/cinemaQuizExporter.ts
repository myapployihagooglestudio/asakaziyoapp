import type { QuranQuizQuestion } from '../types';
import {
  buildQuizQuestionAudioCandidates,
  computeQuestionAudioSlice,
  fetchAndDecodeAudioBuffer,
  normalizeQuizQuestion,
} from './quranQuizService';

export interface CinemaExportOptions {
  question: QuranQuizQuestion;
  questionIndex: number;
  totalQuestions?: number;
  countdownMs?: number;
  onProgress?: (percent: number, stageLabel: string) => void;
  signal?: AbortSignal;
}

export interface FullQuizExportOptions {
  questions: QuranQuizQuestion[];
  reciterName: string;
  quizDateStr?: string;
  scoreSummary?: {
    score: number;
    incorrectCount?: number;
    total: number;
    percentage: number;
  } | null;
  countdownMs?: number;
  onProgress?: (percent: number, stageLabel: string) => void;
  signal?: AbortSignal;
}

export interface CinemaExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  durationMs: number;
}

export interface QuizPartExportOptions {
  questionsPart: QuranQuizQuestion[];
  questionNumber?: number; // 1..10
  partIndex: number; // 1..10 (alias for questionNumber)
  partRangeLabel: string;
  globalStartNumber: number;
  totalQuizQuestions?: number;
  reciterName: string;
  quizDateStr?: string;
  scoreSummary?: {
    score: number;
    incorrectCount?: number;
    total: number;
    percentage: number;
  } | null;
  countdownMs?: number;
  onProgress?: (percent: number, stageLabel: string) => void;
  signal?: AbortSignal;
}

export interface QuizPartExportResult {
  jobId: string;
  questionNumber: number;
  partIndex: number;
  filename: string;
  downloadUrl: string;
  previewUrl: string;
  serverDownloadUrl?: string;
  sizeBytes: number;
  durationMs: number;
  mimeType: 'video/mp4';
  ftypVerified: boolean;
}

export function formatQuizMp4Filename(questionNumber: number): string {
  const safeNum = Math.max(1, Math.min(10, Math.floor(Number(questionNumber) || 1)));
  return `quiz-${String(safeNum).padStart(2, '0')}.mp4`;
}

export function verifyMp4BinaryBuffer(arrayBuf: ArrayBuffer): {
  valid: boolean;
  ftypFound: boolean;
  error?: string;
} {
  if (!arrayBuf || arrayBuf.byteLength < 4096) {
    return {
      valid: false,
      ftypFound: false,
      error: `Video fayl hajmi juda kichik (${arrayBuf?.byteLength || 0} bayt).`,
    };
  }
  const bytes = new Uint8Array(arrayBuf, 0, Math.min(64, arrayBuf.byteLength));
  const headText = Array.from(bytes.slice(0, 24))
    .map((b) => String.fromCharCode(b))
    .join('')
    .trim()
    .toLowerCase();

  if (
    headText.startsWith('<!doctype') ||
    headText.startsWith('<html') ||
    headText.startsWith('<head') ||
    headText.startsWith('{') ||
    headText.startsWith('[')
  ) {
    return {
      valid: false,
      ftypFound: false,
      error: 'Server video oʻrniga HTML yoki JSON javob qaytardi.',
    };
  }

  // ISO BMFF MP4 magic signature: bytes[4..7] == 'ftyp' (0x66, 0x74, 0x79, 0x70)
  const ftypFound =
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;

  if (!ftypFound) {
    return {
      valid: false,
      ftypFound: false,
      error: 'Fayl haqiqiy MP4 konteyner emas (ftyp imzosi topilmadi).',
    };
  }

  return { valid: true, ftypFound: true };
}

interface GoldParticle {
  x: number;
  y: number;
  r: number;
  speedY: number;
  drift: number;
  alpha: number;
  phase: number;
}

interface TimelineQuestionSegment {
  index: number;
  question: QuranQuizQuestion;
  buffer: AudioBuffer;
  qSlice: { offsetSec: number; durationSec: number };
  rSlice: { offsetSec: number; durationSec: number };
  segmentStartSec: number;
  prefixEndSec: number;
  countdownEndSec: number;
  revealEndSec: number;
  transitionEndSec: number;
}

const WIDTH = 1080;
const HEIGHT = 1920;

function pickSupportedRecorderMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', extension: 'webm' };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function createMetallicGoldGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): CanvasGradient {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, '#8A6621');
  grad.addColorStop(0.25, '#DFBD69');
  grad.addColorStop(0.5, '#FFF6C8');
  grad.addColorStop(0.75, '#D4AF37');
  grad.addColorStop(1, '#7A5818');
  return grad;
}

function drawArabesqueCornerOrnaments(
  ctx: CanvasRenderingContext2D,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number
) {
  const corners = [
    { x: cardX + 22, y: cardY + 22, sx: 1, sy: 1 },
    { x: cardX + cardW - 22, y: cardY + 22, sx: -1, sy: 1 },
    { x: cardX + cardW - 22, y: cardY + cardH - 22, sx: -1, sy: -1 },
    { x: cardX + 22, y: cardY + cardH - 22, sx: 1, sy: -1 },
  ];
  for (const c of corners) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.sx, c.sy);
    ctx.strokeStyle = 'rgba(223, 189, 105, 0.82)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.lineTo(0, 8);
    ctx.quadraticCurveTo(0, 0, 8, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 246, 200, 0.68)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 26);
    ctx.lineTo(10, 12);
    ctx.lineTo(26, 12);
    ctx.stroke();

    ctx.fillStyle = '#FFF6C8';
    ctx.beginPath();
    ctx.arc(10, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRubElHizbBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  label: string,
  isRevealedCorrect: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);
  const half = size / 2;
  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 4);
    drawRoundedRect(ctx, -half, -half, size, size, 5);
    ctx.fillStyle = isRevealedCorrect
      ? 'rgba(255, 255, 255, 0.25)'
      : rot === 0
        ? 'rgba(223, 189, 105, 0.16)'
        : 'rgba(138, 102, 33, 0.32)';
    ctx.fill();
    ctx.strokeStyle = isRevealedCorrect ? '#FFFDF7' : rot === 0 ? '#DFBD69' : '#FFF6C8';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isRevealedCorrect ? '#FFFFFF' : '#FFF6C8';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(label, 0, 2);
  ctx.restore();
}

function drawIslamicMandala(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
) {
  // Layer 1: Outer 16-Pointed Star Mandala (CW)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.strokeStyle = 'rgba(223, 189, 105, 0.06)';
  ctx.lineWidth = 2;

  [1.0, 0.86, 0.66].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  const folds16 = 16;
  for (let i = 0; i < folds16; i++) {
    const theta = (i * Math.PI * 2) / folds16;
    ctx.save();
    ctx.rotate(theta);
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.22);
    ctx.lineTo(radius * 0.12, -radius * 0.62);
    ctx.lineTo(0, -radius * 0.98);
    ctx.lineTo(-radius * 0.12, -radius * 0.62);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Layer 2: Inner Mamluk/Timurid Girih Rosette (CCW)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angleRad * 0.75);
  ctx.strokeStyle = 'rgba(255, 246, 200, 0.055)';
  ctx.lineWidth = 2;
  for (let pass = 0; pass < 4; pass++) {
    ctx.save();
    ctx.rotate((pass * Math.PI) / 8);
    ctx.strokeRect(-radius * 0.48, -radius * 0.48, radius * 0.96, radius * 0.96);
    ctx.restore();
  }
  ctx.restore();
}

function createGoldParticles(): GoldParticle[] {
  return Array.from({ length: 42 }).map((_, i) => ({
    x: (i * 197) % WIDTH,
    y: (i * 313) % HEIGHT,
    r: 1.8 + (i % 4) * 1.2,
    speedY: 20 + (i % 5) * 11,
    drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5),
    alpha: 0.22 + (i % 5) * 0.11,
    phase: i * 0.7,
  }));
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  particles: GoldParticle[],
  elapsed: number
) {
  // 1. Deep Emerald Velvet & Cosmic Night Radial Gradient
  const bgGrad = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.25, 40, WIDTH * 0.5, HEIGHT * 0.45, HEIGHT * 0.85);
  bgGrad.addColorStop(0, '#093322');
  bgGrad.addColorStop(0.45, '#03170f');
  bgGrad.addColorStop(1, '#010805');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Volumetric God-Rays from Top Center
  ctx.save();
  const rayPulse = 0.5 + 0.3 * Math.sin(elapsed * 0.8);
  const rayGrad = ctx.createRadialGradient(WIDTH / 2, -60, 20, WIDTH / 2, 420, 880);
  rayGrad.addColorStop(0, `rgba(255, 246, 200, ${0.18 * rayPulse})`);
  rayGrad.addColorStop(0.42, `rgba(223, 189, 105, ${0.09 * rayPulse})`);
  rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rayGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();

  // 3. Dual Counter-Rotating Islamic Girih & 16-Pointed Star Mandalas
  drawIslamicMandala(ctx, WIDTH / 2, 650, 540, elapsed * 0.07);

  // 4. Ambient Golden Bokeh & Dust Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const py = (((p.y - elapsed * p.speedY) % HEIGHT) + HEIGHT) % HEIGHT;
    const px = p.x + Math.sin(elapsed * 0.9 + p.phase) * p.drift;
    if (i % 4 === 0) {
      const bokeh = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.2);
      bokeh.addColorStop(0, `rgba(255, 246, 200, ${p.alpha})`);
      bokeh.addColorStop(0.5, `rgba(223, 189, 105, ${p.alpha * 0.45})`);
      bokeh.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = bokeh;
      ctx.beginPath();
      ctx.arc(px, py, p.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255, 246, 200, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Cinematic Dark Edge Vignette
  const vigGrad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.35, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.62);
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vigGrad.addColorStop(1, 'rgba(1, 8, 5, 0.68)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawQuestionFrame(params: {
  ctx: CanvasRenderingContext2D;
  question: QuranQuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  elapsedGlobal: number;
  localElapsed: number;
  prefixDurSec: number;
  countdownDurSec: number;
  analyser: AnalyserNode;
  freqBuf: Uint8Array;
  particles: GoldParticle[];
}) {
  const {
    ctx,
    question,
    questionIndex,
    totalQuestions,
    elapsedGlobal,
    localElapsed,
    prefixDurSec,
    countdownDurSec,
    analyser,
    freqBuf,
    particles,
  } = params;

  const isPrefix = localElapsed < prefixDurSec;
  const isCountdown =
    localElapsed >= prefixDurSec && localElapsed < prefixDurSec + countdownDurSec;
  const isRevealed = localElapsed >= prefixDurSec + countdownDurSec;

  const timerRatio = isPrefix
    ? 1
    : isCountdown
      ? Math.max(0, 1 - (localElapsed - prefixDurSec) / countdownDurSec)
      : 0;
  const remainingSec = isPrefix
    ? countdownDurSec
    : isCountdown
      ? Math.max(0, countdownDurSec - (localElapsed - prefixDurSec))
      : 0;

  drawBackdrop(ctx, particles, elapsedGlobal);

  // Perimeter Golden Laser Line & Heartbeat Glow in final 1.5s
  ctx.save();
  drawRoundedRect(ctx, 16, 16, WIDTH - 32, HEIGHT - 32, 44);
  if (isCountdown && remainingSec <= 1.5) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowBlur = 32;
    ctx.lineWidth = 6;
  } else {
    ctx.strokeStyle = isRevealed ? 'rgba(16, 185, 129, 0.75)' : 'rgba(223, 189, 105, 0.45)';
    ctx.lineWidth = 3.5;
  }
  ctx.stroke();
  ctx.restore();

  // Top Header Bar with Metallic Gold Foil
  ctx.fillStyle = createMetallicGoldGradient(ctx, 72, 85, 620, 125);
  ctx.font = '700 34px "Cinzel", "Plus Jakarta Sans", serif';
  ctx.textAlign = 'left';
  ctx.fillText('ASAKA ZIYO · QUR’ON VIKTORINASI', 72, 118);

  ctx.fillStyle = 'rgba(255, 248, 232, 0.82)';
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(question.reciterName, 72, 162);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFF6C8';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(`${questionIndex + 1} / ${totalQuestions}`, WIDTH - 72, 118);

  // 4 Luminous Diamond Indicators + 10-question micro-segments
  const activeGroup = Math.min(3, Math.floor((questionIndex / Math.max(1, totalQuestions)) * 4));
  for (let c = 0; c < 4; c++) {
    const cx = 72 + c * 38 + 12;
    const cy = 205;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const sz = c === activeGroup ? 16 : 13;
    ctx.fillStyle =
      c < activeGroup ? '#10B981' : c === activeGroup ? '#DFBD69' : 'rgba(255,255,255,0.16)';
    ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }

  const segTotalW = WIDTH - 260;
  const segStartX = 240;
  const segGap = 8;
  const segW = (segTotalW - segGap * (totalQuestions - 1)) / totalQuestions;
  for (let s = 0; s < totalQuestions; s++) {
    const sx = segStartX + s * (segW + segGap);
    drawRoundedRect(ctx, sx, 200, segW, 10, 5);
    ctx.fillStyle =
      s < questionIndex
        ? '#10B981'
        : s === questionIndex
          ? '#DFBD69'
          : 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
  }

  // Ornamental Gold Surah Cartouche + Frosted Obsidian Glass Ayah Card
  const cardX = 64;
  const cardY = 265;
  const cardW = WIDTH - 128;
  const cardH = 740;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(4, 24, 16, 0.84)');
  cardGrad.addColorStop(1, 'rgba(2, 14, 9, 0.92)');
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 42);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  const borderGrad = createMetallicGoldGradient(ctx, cardX, cardY, cardX + cardW, cardY + cardH);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  drawArabesqueCornerOrnaments(ctx, cardX, cardY, cardW, cardH);

  // Ornamental Surah Cartouche Header inside Card
  drawRoundedRect(ctx, cardX + 42, cardY + 26, cardW - 84, 68, 22);
  ctx.fillStyle = 'rgba(9, 51, 34, 0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(223, 189, 105, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFF6C8';
  ctx.font = '700 27px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${question.surahNameUz} surasi · ${question.ayahNumberInSurah}-oyat`,
    cardX + 68,
    cardY + 69
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#DFBD69';
  ctx.font = '700 36px "Amiri Quran", "Amiri", serif';
  ctx.fillText(question.surahNameAr, cardX + cardW - 68, cardY + 71);

  const revealAnimT = isRevealed
    ? Math.min(1, (localElapsed - (prefixDurSec + countdownDurSec)) / 0.45)
    : 0;
  const trailSuffix = question.trailingMarker ? ` ${question.trailingMarker}` : '';
  const hiddenOrBlank = isRevealed ? `« ${question.hiddenWord} »` : '[  ؟  ]';
  const displayArabic =
    question.hidePos === 'start'
      ? `${hiddenOrBlank} ${question.maskedArabicAfter}${isRevealed ? trailSuffix : ''}`.trim()
      : question.hidePos === 'middle'
        ? `${question.maskedArabicBefore} ${hiddenOrBlank} ${question.maskedArabicAfter}${isRevealed ? trailSuffix : ''}`.trim()
        : `${question.maskedArabicBefore || question.maskedArabicPrefix} ${hiddenOrBlank}${isRevealed ? trailSuffix : ''}`.trim();

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = '700 56px "Amiri Quran", "Scheherazade New", "Amiri", serif';
  const arLines = wrapTextLines(ctx, displayArabic, cardW - 110);
  const arStartY = cardY + (arLines.length <= 2 ? 275 : 220);
  const arLineHeight = 96;

  arLines.slice(0, 4).forEach((line, idx) => {
    ctx.shadowColor = isRevealed
      ? `rgba(16, 185, 129, ${0.48 * revealAnimT})`
      : 'rgba(212, 175, 55, 0.38)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(line, WIDTH / 2, arStartY + idx * arLineHeight);
  });
  ctx.restore();

  // Delicate Gold Divider + Tafsiri Hilol Meaning Presentation
  ctx.strokeStyle = 'rgba(223, 189, 105, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 70, cardY + cardH - 182);
  ctx.lineTo(cardX + cardW - 70, cardY + cardH - 182);
  ctx.stroke();

  if (isRevealed && question.translationUz) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF8E8';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    const uzLines = wrapTextLines(ctx, `«${question.translationUz}»`, cardW - 110).slice(0, 2);
    const uzBaseY = cardY + cardH - 142;
    uzLines.forEach((line, idx) => {
      ctx.fillText(line, WIDTH / 2, uzBaseY + idx * 34);
    });
    ctx.fillStyle = '#DFBD69';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TAFSIRI HILOL · SHAYX MUHAMMAD SODIQ MUHAMMAD YUSUF', WIDTH / 2, cardY + cardH - 76);
    ctx.restore();
  }

  // Dual-Layer Symmetrical Liquid Gold Audio Frequency Visualizer
  analyser.getByteFrequencyData(freqBuf as Uint8Array<ArrayBuffer>);
  const barCount = 32;
  const barWidth = 14;
  const barGap = 10;
  const totalWaveWidth = barCount * (barWidth + barGap) - barGap;
  const waveStartX = (WIDTH - totalWaveWidth) / 2;
  const waveCenterY = cardY + cardH - 36;

  for (let b = 0; b < barCount; b++) {
    const symIdx = Math.abs(b - barCount / 2);
    const binIdx = Math.min(freqBuf.length - 1, Math.floor((symIdx / (barCount / 2)) * 24));
    const amp = isCountdown ? 0.06 : (freqBuf[binIdx] || 0) / 255;
    const barH = Math.max(6, Math.round(amp * 48));
    const bx = waveStartX + b * (barWidth + barGap);
    drawRoundedRect(ctx, bx, waveCenterY - barH / 2, barWidth, barH, 6);
    ctx.fillStyle = isRevealed
      ? 'rgba(16, 185, 129, 0.88)'
      : '#DFBD69';
    ctx.fill();
  }

  // 3.5s Golden Neon Circular Countdown Ring + Linear Bar
  const ringCx = WIDTH / 2;
  const ringCy = 1140;
  const ringR = 84;

  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 248, 232, 0.14)';
  ctx.lineWidth = 12;
  ctx.stroke();

  if (timerRatio > 0 || isRevealed) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      ringCx,
      ringCy,
      ringR,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (isRevealed ? 1 : timerRatio)
    );
    ctx.strokeStyle = isRevealed ? '#10B981' : remainingSec <= 1.5 && isCountdown ? '#F59E0B' : '#DFBD69';
    ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(223, 189, 105, 0.85)';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = isRevealed ? '#6EE7B7' : '#FFFDF7';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(isRevealed ? '✓' : `${remainingSec.toFixed(1)}s`, ringCx, ringCy + 12);

  // Linear timer bar
  const barX = 96;
  const barY = 1265;
  const barW = WIDTH - 192;
  drawRoundedRect(ctx, barX, barY, barW, 18, 9);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();

  const fillW = Math.max(18, barW * (isRevealed ? 1 : timerRatio));
  drawRoundedRect(ctx, barX, barY, fillW, 18, 9);
  ctx.fillStyle = isRevealed ? '#10B981' : createMetallicGoldGradient(ctx, barX, barY, barX + barW, barY);
  ctx.fill();

  // Bottom 2x2 Glassmorphic Answer Option Cards with Rub el Hizb 8-Pointed Star Badges
  const gridX = 64;
  const gridY = 1335;
  const gap = 26;
  const optW = (WIDTH - 128 - gap) / 2;
  const optH = 195;
  const arabicNumerals = ['١', '٢', '٣', '٤'];

  question.options.forEach((optWord, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const ox = gridX + col * (optW + gap);
    const oy = gridY + row * (optH + gap);
    const isCorrectOpt = idx === question.correctIndex;

    drawRoundedRect(ctx, ox, oy, optW, optH, 30);
    if (isRevealed && isCorrectOpt) {
      ctx.save();
      const greenGrad = ctx.createLinearGradient(ox, oy, ox + optW, oy + optH);
      greenGrad.addColorStop(0, '#047857');
      greenGrad.addColorStop(0.5, '#10B981');
      greenGrad.addColorStop(1, '#34D399');
      ctx.fillStyle = greenGrad;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.78)';
      ctx.shadowBlur = 34;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#FFF6C8';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = isRevealed ? 'rgba(4, 24, 16, 0.35)' : 'rgba(6, 36, 25, 0.88)';
      ctx.fill();
      ctx.strokeStyle = isRevealed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(223, 189, 105, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    drawRubElHizbBadge(
      ctx,
      ox + 54,
      oy + optH / 2,
      44,
      isRevealed && isCorrectOpt ? '✓' : arabicNumerals[idx] || String(idx + 1),
      isRevealed && isCorrectOpt
    );

    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = isRevealed && !isCorrectOpt ? 'rgba(255,255,255,0.35)' : '#FFFDF7';
    ctx.font = '700 46px "Amiri Quran", "Scheherazade New", "Amiri", serif';
    ctx.fillText(optWord, ox + optW / 2 + 22, oy + optH / 2 + 16, optW - 110);
    ctx.restore();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(223, 189, 105, 0.78)';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Asaka Ziyo · 1080×1920 · ${question.surahNameUz} (${question.ayahKey})`,
    WIDTH / 2,
    HEIGHT - 44
  );
}

function drawIntroFrame(params: {
  ctx: CanvasRenderingContext2D;
  particles: GoldParticle[];
  elapsed: number;
  reciterName: string;
  quizDateStr: string;
  totalQuestions: number;
}) {
  const { ctx, particles, elapsed, reciterName, quizDateStr, totalQuestions } = params;
  drawBackdrop(ctx, particles, elapsed);

  drawRoundedRect(ctx, 96, 620, WIDTH - 192, 680, 48);
  ctx.fillStyle = 'rgba(7, 41, 26, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 197, 140, 0.65)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ASAKA ZIYO', WIDTH / 2, 750);

  ctx.fillStyle = '#FFFDF7';
  ctx.font = '700 58px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("Kunlik Qur'on", WIDTH / 2, 855);
  ctx.fillText('Viktorinasi', WIDTH / 2, 928);

  ctx.fillStyle = '#10b981';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(`${totalQuestions} TA SAVOL · TOʻLIQ QIROAT`, WIDTH / 2, 1020);

  ctx.fillStyle = 'rgba(248, 245, 236, 0.84)';
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Qori: ${reciterName}`, WIDTH / 2, 1120);

  if (quizDateStr) {
    ctx.fillStyle = 'rgba(220, 197, 140, 0.78)';
    ctx.font = '500 26px "JetBrains Mono", monospace';
    ctx.fillText(quizDateStr, WIDTH / 2, 1175);
  }
}

function drawTransitionFrame(params: {
  ctx: CanvasRenderingContext2D;
  particles: GoldParticle[];
  elapsed: number;
  nextQuestion: QuranQuizQuestion;
  nextIndex: number;
  totalQuestions: number;
}) {
  const { ctx, particles, elapsed, nextQuestion, nextIndex, totalQuestions } = params;
  drawBackdrop(ctx, particles, elapsed);

  drawRoundedRect(ctx, 110, 740, WIDTH - 220, 420, 40);
  ctx.fillStyle = 'rgba(7, 41, 26, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 197, 140, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KEYINGI SAVOL', WIDTH / 2, 850);

  ctx.fillStyle = '#FFFDF7';
  ctx.font = '700 68px "JetBrains Mono", monospace';
  ctx.fillText(`${nextIndex + 1} / ${totalQuestions}`, WIDTH / 2, 955);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${nextQuestion.surahNameUz} surasi, ${nextQuestion.ayahNumberInSurah}-oyat`,
    WIDTH / 2,
    1045
  );
}

function drawOutroFrame(params: {
  ctx: CanvasRenderingContext2D;
  particles: GoldParticle[];
  elapsed: number;
  reciterName: string;
  quizDateStr: string;
  totalQuestions: number;
  scoreSummary?: {
    score: number;
    incorrectCount?: number;
    total: number;
    percentage: number;
  } | null;
}) {
  const {
    ctx,
    particles,
    elapsed,
    reciterName,
    quizDateStr,
    totalQuestions,
    scoreSummary,
  } = params;

  drawBackdrop(ctx, particles, elapsed);

  drawRoundedRect(ctx, 84, 520, WIDTH - 168, 860, 48);
  ctx.fillStyle = 'rgba(7, 41, 26, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 197, 140, 0.68)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ASAKA ZIYO', WIDTH / 2, 665);

  ctx.fillStyle = '#FFFDF7';
  ctx.font = '700 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Viktorina Yakunlandi', WIDTH / 2, 755);

  if (scoreSummary) {
    ctx.fillStyle = '#10b981';
    ctx.font = '700 92px "JetBrains Mono", monospace';
    ctx.fillText(`${scoreSummary.score} / ${scoreSummary.total}`, WIDTH / 2, 905);

    ctx.fillStyle = '#DCC58C';
    ctx.font = '700 38px "JetBrains Mono", monospace';
    ctx.fillText(`Natija: ${scoreSummary.percentage}%`, WIDTH / 2, 975);
  } else {
    ctx.fillStyle = '#10b981';
    ctx.font = '700 62px "JetBrains Mono", monospace';
    ctx.fillText(`${totalQuestions} / ${totalQuestions} SAVOL`, WIDTH / 2, 915);
  }

  ctx.strokeStyle = 'rgba(198, 164, 92, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 1050);
  ctx.lineTo(WIDTH - 160, 1050);
  ctx.stroke();

  ctx.fillStyle = 'rgba(248, 245, 236, 0.9)';
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Qori: ${reciterName}`, WIDTH / 2, 1130);

  ctx.fillStyle = 'rgba(212, 207, 195, 0.82)';
  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Tarjima: Shayx Muhammad Sodiq Muhammad Yusuf', WIDTH / 2, 1190);

  if (quizDateStr) {
    ctx.fillStyle = 'rgba(220, 197, 140, 0.72)';
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillText(quizDateStr, WIDTH / 2, 1255);
  }

  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Asaka Ziyo · 1080×1920 Shorts', WIDTH / 2, HEIGHT - 54);
}

function scheduleTickSound(
  ctx: AudioContext,
  masterGain: GainNode,
  whenSec: number,
  isAccent: boolean
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isAccent ? 1120 : 840, whenSec);
  osc.frequency.exponentialRampToValueAtTime(isAccent ? 440 : 340, whenSec + 0.042);

  gain.gain.setValueAtTime(0.0001, whenSec);
  gain.gain.linearRampToValueAtTime(isAccent ? 0.18 : 0.12, whenSec + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, whenSec + 0.06);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(whenSec);
  osc.stop(whenSec + 0.065);
}

function scheduleBellChime(
  ctx: AudioContext,
  masterGain: GainNode,
  whenSec: number
) {
  [523.25, 659.25, 1046.5].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = whenSec + idx * 0.045;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.16 / (idx + 1), t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.68);
  });
}

async function transcodeToServerMp4(params: {
  rawBlob: Blob;
  mp4Filename: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  const { rawBlob, mp4Filename, signal } = params;
  const endpoint = `/api/quran-quiz/export-mp4?filename=${encodeURIComponent(mp4Filename)}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': rawBlob.type || 'video/webm',
    },
    body: rawBlob,
    signal,
  });
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (!resp.ok || ct.includes('text/html') || ct.includes('application/json')) {
    const errPayload = await resp.json().catch(() => ({}));
    throw new Error(
      errPayload?.error || `Server MP4 konvertatsiyasida xatolik (HTTP ${resp.status}).`
    );
  }
  const arrayBuf = await resp.arrayBuffer();
  const check = verifyMp4BinaryBuffer(arrayBuf);
  if (!check.valid) {
    throw new Error(check.error || 'Server yaroqsiz MP4 fayl qaytardi.');
  }
  return new Blob([arrayBuf], { type: 'video/mp4' });
}

/**
 * Exports ALL quiz questions continuously into ONE single 9:16 (1080x1920) H.264/AAC MP4 file.
 * Pre-decodes every question's selected-reciter AudioBuffer, records complete video+audio timeline
 * cleanly, transcodes via server `/api/quran-quiz/export-mp4`, and resolves only when ready.
 */
export async function exportFullQuizMP4Video(
  options: FullQuizExportOptions
): Promise<CinemaExportResult> {
  const {
    questions,
    reciterName,
    quizDateStr = '',
    scoreSummary = null,
    countdownMs = 3500,
    onProgress,
    signal,
  } = options;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Eksport qilish uchun viktorina savollari topilmadi.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Brauzeringizda video yozib olish (MediaRecorder) qoʻllab-quvvatlanmaydi.');
  }

  const normalizedQuestions = questions.map((q) => normalizeQuizQuestion(q));
  onProgress?.(2, 'Shriftlar va audio tizimi ishga tushirilmoqda...');
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore font API errors
  }
  if (signal?.aborted) throw new Error('Eksport bekor qilindi.');

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API brauzerda mavjud emas.');
  }

  const audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const totalQuestions = normalizedQuestions.length;
  const decodedBuffers: AudioBuffer[] = [];
  try {
    for (let i = 0; i < totalQuestions; i++) {
      if (signal?.aborted) throw new Error('Eksport bekor qilindi.');
      const q = normalizedQuestions[i];
      const pct = 3 + Math.round(((i + 0.5) / totalQuestions) * 15);
      onProgress?.(pct, `Audio tayyorlanmoqda (${i + 1}/${totalQuestions}): ${q.surahNameUz} ${q.ayahNumberInSurah}...`);

      const candidateUrls = buildQuizQuestionAudioCandidates(q);
      if (candidateUrls.length === 0) {
        throw new Error(
          `${q.reciterName} uchun ${q.surahNameUz} ${q.ayahNumberInSurah}-oyat audio manbasi topilmadi.`
        );
      }
      const buf = await fetchAndDecodeAudioBuffer(audioCtx, candidateUrls, signal);
      decodedBuffers.push(buf);
    }
  } catch (err) {
    if (audioCtx.state !== 'closed') {
      void audioCtx.close();
    }
    throw err;
  }

  if (signal?.aborted) {
    if (audioCtx.state !== 'closed') void audioCtx.close();
    throw new Error('Eksport bekor qilindi.');
  }

  // Build exact continuous multi-question timeline
  const introDurSec = 1.0;
  const countdownDurSec = Math.max(1.0, countdownMs / 1000);
  const revealHoldSec = 0.85;
  const transitionDurSec = 0.65;
  const outroDurSec = 3.2;

  let cursorSec = introDurSec;
  const segments: TimelineQuestionSegment[] = normalizedQuestions.map((q, idx) => {
    const buf = decodedBuffers[idx];
    const qSlice = computeQuestionAudioSlice({
      durationSec: buf.duration,
      hidePos: q.hidePos,
      pauseRatio: q.pauseRatio,
      resumeRatio: q.resumeRatio,
      pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
      phase: 'question',
    });
    const rSlice = computeQuestionAudioSlice({
      durationSec: buf.duration,
      hidePos: q.hidePos,
      pauseRatio: q.pauseRatio,
      resumeRatio: q.resumeRatio,
      pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
      phase: 'reveal',
    });

    const prefixDurSec = Math.max(0.4, qSlice.durationSec);
    const tailDurSec = Math.max(0.3, rSlice.durationSec);
    const segmentStartSec = cursorSec;
    const prefixEndSec = segmentStartSec + prefixDurSec;
    const countdownEndSec = prefixEndSec + countdownDurSec;
    const revealEndSec = countdownEndSec + tailDurSec + revealHoldSec;
    const isLast = idx === totalQuestions - 1;
    const transitionEndSec = revealEndSec + (isLast ? 0 : transitionDurSec);
    cursorSec = transitionEndSec;

    return {
      index: idx,
      question: q,
      buffer: buf,
      qSlice,
      rSlice,
      segmentStartSec,
      prefixEndSec,
      countdownEndSec,
      revealEndSec,
      transitionEndSec,
    };
  });

  const outroStartSec = cursorSec;
  const totalTimelineSec = outroStartSec + outroDurSec;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    void audioCtx.close();
    throw new Error('Canvas 2D kontekstini yaratib boʻlmadi.');
  }

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  const streamDest = audioCtx.createMediaStreamDestination();
  masterGain.connect(streamDest);

  // Silent monitor sink keeps Chromium's Web Audio hardware clock ticking steadily without blasting speakers
  const silentSink = audioCtx.createGain();
  silentSink.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  masterGain.connect(silentSink);
  silentSink.connect(audioCtx.destination);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.78;
  analyser.connect(masterGain);

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...streamDest.stream.getAudioTracks(),
  ]);

  const { mimeType } = pickSupportedRecorderMimeType();
  const recorder = new MediaRecorder(
    combinedStream,
    mimeType ? { mimeType, videoBitsPerSecond: 6_500_000 } : { videoBitsPerSecond: 6_500_000 }
  );

  const chunks: Blob[] = [];
  recorder.ondataavailable = (evt) => {
    if (evt.data && evt.data.size > 0) {
      chunks.push(evt.data);
    }
  };

  const particles = createGoldParticles();
  const timelineStartAudio = audioCtx.currentTime + 0.14;
  const scheduledSources: AudioBufferSourceNode[] = [];

  for (const seg of segments) {
    const qStartAudio = timelineStartAudio + seg.segmentStartSec;
    const prefixDur = seg.prefixEndSec - seg.segmentStartSec;
    const fadeLeadSec = Math.min(0.16, prefixDur * 0.18);

    const prefixSource = audioCtx.createBufferSource();
    prefixSource.buffer = seg.buffer;
    const prefixGain = audioCtx.createGain();
    prefixGain.gain.setValueAtTime(1.0, qStartAudio);
    if (seg.question.hidePos !== 'start') {
      prefixGain.gain.setValueAtTime(1.0, qStartAudio + Math.max(0, prefixDur - fadeLeadSec));
      prefixGain.gain.linearRampToValueAtTime(0.001, qStartAudio + prefixDur);
    }
    prefixSource.connect(prefixGain);
    prefixGain.connect(analyser);
    prefixSource.start(qStartAudio, seg.qSlice.offsetSec, seg.qSlice.durationSec);
    scheduledSources.push(prefixSource);

    const countdownStartAudio = timelineStartAudio + seg.prefixEndSec;
    for (let tIdx = 0; tIdx < 7; tIdx++) {
      scheduleTickSound(audioCtx, masterGain, countdownStartAudio + tIdx * 0.5, tIdx % 2 === 0);
    }

    const revealStartAudio = timelineStartAudio + seg.countdownEndSec;
    scheduleBellChime(audioCtx, masterGain, revealStartAudio);

    const tailSource = audioCtx.createBufferSource();
    tailSource.buffer = seg.buffer;
    const tailGain = audioCtx.createGain();
    tailGain.gain.setValueAtTime(0.01, revealStartAudio);
    tailGain.gain.linearRampToValueAtTime(1.0, revealStartAudio + 0.08);
    tailSource.connect(tailGain);
    tailGain.connect(analyser);
    tailSource.start(revealStartAudio, seg.rSlice.offsetSec, seg.rSlice.durationSec);
    scheduledSources.push(tailSource);
  }

  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  const rawBlob = await new Promise<Blob>((resolve, reject) => {
    let rafId = 0;
    let backupIntervalId = 0;
    let settled = false;

    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (backupIntervalId) window.clearInterval(backupIntervalId);
      for (const s of scheduledSources) {
        try {
          s.stop();
        } catch {
          // already stopped
        }
      }
      try {
        canvasStream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      if (audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    };

    const handleAbort = () => {
      if (settled) return;
      settled = true;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // ignore
      }
      cleanup();
      reject(new DOMException('Eksport bekor qilindi.', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('10 savolli video yozishda xatolik yuz berdi.'));
    };

    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const outMime = mimeType || 'video/webm';
      resolve(new Blob(chunks, { type: outMime }));
    };

    const renderTick = (scheduleNextRaf: boolean) => {
      if (settled) return;
      const elapsed = Math.max(0, audioCtx.currentTime - timelineStartAudio);
      const recordPct = 18 + Math.min(68, Math.round((elapsed / totalTimelineSec) * 68));

      if (elapsed < introDurSec) {
        onProgress?.(recordPct, 'Kirish sahifasi (ASAKA ZIYO) yozilmoqda...');
        drawIntroFrame({
          ctx,
          particles,
          elapsed,
          reciterName,
          quizDateStr,
          totalQuestions,
        });
      } else if (elapsed >= outroStartSec) {
        onProgress?.(recordPct, 'Yakuniy ASAKA ZIYO natija kartasi yozilmoqda...');
        drawOutroFrame({
          ctx,
          particles,
          elapsed,
          reciterName,
          quizDateStr,
          totalQuestions,
          scoreSummary,
        });
      } else {
        const activeSeg =
          segments.find((s) => elapsed >= s.segmentStartSec && elapsed < s.transitionEndSec) ||
          segments[segments.length - 1];

        if (elapsed >= activeSeg.revealEndSec && activeSeg.index + 1 < segments.length) {
          onProgress?.(
            recordPct,
            `Oʻtish (${activeSeg.index + 2}/${totalQuestions}) yozilmoqda...`
          );
          drawTransitionFrame({
            ctx,
            particles,
            elapsed,
            nextQuestion: segments[activeSeg.index + 1].question,
            nextIndex: activeSeg.index + 1,
            totalQuestions,
          });
        } else {
          const localElapsed = Math.max(0, elapsed - activeSeg.segmentStartSec);
          const prefixDurSec = activeSeg.prefixEndSec - activeSeg.segmentStartSec;
          const phaseDesc =
            localElapsed < prefixDurSec
              ? 'Qiroat'
              : localElapsed < prefixDurSec + countdownDurSec
                ? '3.5s taymer'
                : 'Javob va davomi';
          onProgress?.(
            recordPct,
            `${activeSeg.index + 1}/${totalQuestions}-savol (${phaseDesc}) yozilmoqda...`
          );
          drawQuestionFrame({
            ctx,
            question: activeSeg.question,
            questionIndex: activeSeg.index,
            totalQuestions,
            elapsedGlobal: elapsed,
            localElapsed,
            prefixDurSec,
            countdownDurSec,
            analyser,
            freqBuf,
            particles,
          });
        }
      }

      if (elapsed >= totalTimelineSec) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        return;
      }

      if (scheduleNextRaf) {
        rafId = requestAnimationFrame(() => renderTick(true));
      }
    };

    recorder.start(300);
    renderTick(true);
    backupIntervalId = window.setInterval(() => {
      if (!settled) {
        renderTick(false);
      }
    }, 33);
  });

  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  onProgress?.(90, 'Serverda 1080×1920 MP4 (H.264/AAC) formatiga oʻtkazilmoqda...');
  const cleanDate = quizDateStr || 'bugun';
  const mp4Filename = `asaka-ziyo-viktorina-${cleanDate}-${totalQuestions}savol-1080x1920.mp4`;
  const mp4Blob = await transcodeToServerMp4({
    rawBlob,
    mp4Filename,
    signal,
  });

  onProgress?.(100, `Toʻliq ${totalQuestions} savolli MP4 video yuklashga tayyor!`);
  return {
    blob: mp4Blob,
    filename: mp4Filename,
    mimeType: 'video/mp4',
    durationMs: Math.round(totalTimelineSec * 1000),
  };
}

/**
 * Generates a single 1080x1920 9:16 Short and converts it to MP4 via server FFmpeg.
 */
export async function exportCinemaQuizShortVideo(
  options: CinemaExportOptions
): Promise<CinemaExportResult> {
  const { question, questionIndex, totalQuestions = 10, countdownMs = 3500, onProgress, signal } =
    options;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Brauzeringizda MediaRecorder video eksporti qoʻllab-quvvatlanmaydi.');
  }

  onProgress?.(4, 'Shriftlar va audio tayyorlanmoqda...');
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore
  }

  if (signal?.aborted) throw new Error('Eksport bekor qilindi.');

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API brauzerda mavjud emas.');
  }

  const normalizedQ = normalizeQuizQuestion(question);
  const audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  let decodedBuffer: AudioBuffer;
  try {
    const candidateUrls = buildQuizQuestionAudioCandidates(normalizedQ);
    decodedBuffer = await fetchAndDecodeAudioBuffer(audioCtx, candidateUrls, signal);
  } catch (err) {
    if (audioCtx.state !== 'closed') void audioCtx.close();
    throw err;
  }
  if (signal?.aborted) {
    if (audioCtx.state !== 'closed') void audioCtx.close();
    throw new Error('Eksport bekor qilindi.');
  }

  const qSlice = computeQuestionAudioSlice({
    durationSec: decodedBuffer.duration,
    hidePos: normalizedQ.hidePos,
    pauseRatio: normalizedQ.pauseRatio,
    resumeRatio: normalizedQ.resumeRatio,
    pauseBeforeLastWordMs: normalizedQ.pauseBeforeLastWordMs,
    phase: 'question',
  });
  const rSlice = computeQuestionAudioSlice({
    durationSec: decodedBuffer.duration,
    hidePos: normalizedQ.hidePos,
    pauseRatio: normalizedQ.pauseRatio,
    resumeRatio: normalizedQ.resumeRatio,
    pauseBeforeLastWordMs: normalizedQ.pauseBeforeLastWordMs,
    phase: 'reveal',
  });

  const prefixDurSec = Math.max(0.4, qSlice.durationSec);
  const tailDurSec = Math.max(0.3, rSlice.durationSec);
  const countdownDurSec = countdownMs / 1000;
  const outroHoldSec = 1.05;
  const totalTimelineSec = prefixDurSec + countdownDurSec + tailDurSec + outroHoldSec;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    void audioCtx.close();
    throw new Error('Canvas 2D kontekstini yaratib boʻlmadi.');
  }

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  const streamDest = audioCtx.createMediaStreamDestination();
  masterGain.connect(streamDest);

  const silentSink = audioCtx.createGain();
  silentSink.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  masterGain.connect(silentSink);
  silentSink.connect(audioCtx.destination);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.78;
  analyser.connect(masterGain);

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...streamDest.stream.getAudioTracks(),
  ]);

  const { mimeType } = pickSupportedRecorderMimeType();
  const recorder = new MediaRecorder(
    combinedStream,
    mimeType ? { mimeType, videoBitsPerSecond: 6_500_000 } : { videoBitsPerSecond: 6_500_000 }
  );

  const chunks: Blob[] = [];
  recorder.ondataavailable = (evt) => {
    if (evt.data && evt.data.size > 0) {
      chunks.push(evt.data);
    }
  };

  const particles = createGoldParticles();
  const timelineStartAudio = audioCtx.currentTime + 0.12;
  const fadeLeadSec = Math.min(0.16, prefixDurSec * 0.18);

  const prefixSource = audioCtx.createBufferSource();
  prefixSource.buffer = decodedBuffer;
  const prefixGain = audioCtx.createGain();
  prefixGain.gain.setValueAtTime(1.0, timelineStartAudio);
  if (normalizedQ.hidePos !== 'start') {
    prefixGain.gain.setValueAtTime(1.0, timelineStartAudio + Math.max(0, prefixDurSec - fadeLeadSec));
    prefixGain.gain.linearRampToValueAtTime(0.001, timelineStartAudio + prefixDurSec);
  }
  prefixSource.connect(prefixGain);
  prefixGain.connect(analyser);
  prefixSource.start(timelineStartAudio, qSlice.offsetSec, qSlice.durationSec);

  const countdownStartAudio = timelineStartAudio + prefixDurSec;
  for (let tIdx = 0; tIdx < 7; tIdx++) {
    scheduleTickSound(audioCtx, masterGain, countdownStartAudio + tIdx * 0.5, tIdx % 2 === 0);
  }

  const revealStartAudio = countdownStartAudio + countdownDurSec;
  scheduleBellChime(audioCtx, masterGain, revealStartAudio);

  const tailSource = audioCtx.createBufferSource();
  tailSource.buffer = decodedBuffer;
  const tailGain = audioCtx.createGain();
  tailGain.gain.setValueAtTime(0.01, revealStartAudio);
  tailGain.gain.linearRampToValueAtTime(1.0, revealStartAudio + 0.08);
  tailSource.connect(tailGain);
  tailGain.connect(analyser);
  tailSource.start(revealStartAudio, rSlice.offsetSec, rSlice.durationSec);

  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  const rawBlob = await new Promise<Blob>((resolve, reject) => {
    let rafId = 0;
    let backupIntervalId = 0;
    let settled = false;

    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (backupIntervalId) window.clearInterval(backupIntervalId);
      try {
        prefixSource.stop();
        tailSource.stop();
      } catch {
        // already stopped
      }
      try {
        canvasStream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      if (audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    };

    const handleAbort = () => {
      if (settled) return;
      settled = true;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // ignore
      }
      cleanup();
      reject(new DOMException('Eksport bekor qilindi.', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Video yozib olish jarayonida xatolik yuz berdi.'));
    };

    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const outMime = mimeType || 'video/webm';
      resolve(new Blob(chunks, { type: outMime }));
    };

    const renderFrame = (scheduleNext: boolean) => {
      if (settled) return;
      const elapsed = Math.max(0, audioCtx.currentTime - timelineStartAudio);
      const progressPct = 10 + Math.min(76, Math.round((elapsed / totalTimelineSec) * 76));

      if (elapsed < prefixDurSec) {
        onProgress?.(progressPct, '1-bosqich: Qiroat va audio toʻlqin yozilmoqda...');
      } else if (elapsed < prefixDurSec + countdownDurSec) {
        onProgress?.(progressPct, '2-bosqich: 3.5s taymer va soat ovozi yozilmoqda...');
      } else {
        onProgress?.(progressPct, '3-bosqich: Javob ochilishi va yakun yozilmoqda...');
      }

      drawQuestionFrame({
        ctx,
        question: normalizedQ,
        questionIndex,
        totalQuestions,
        elapsedGlobal: elapsed,
        localElapsed: elapsed,
        prefixDurSec,
        countdownDurSec,
        analyser,
        freqBuf,
        particles,
      });

      if (elapsed >= totalTimelineSec) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        return;
      }

      if (scheduleNext) {
        rafId = requestAnimationFrame(() => renderFrame(true));
      }
    };

    recorder.start(250);
    renderFrame(true);
    backupIntervalId = window.setInterval(() => {
      if (!settled) renderFrame(false);
    }, 33);
  });

  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  onProgress?.(90, 'MP4 formatiga konvertatsiya qilinmoqda...');
  const mp4Filename = `asaka-ziyo-shorts-${question.surahNumber}-${question.ayahNumberInSurah}-1080x1920.mp4`;
  const mp4Blob = await transcodeToServerMp4({
    rawBlob,
    mp4Filename,
    signal,
  });

  onProgress?.(100, 'Video yuklashga tayyor!');
  return {
    blob: mp4Blob,
    filename: mp4Filename,
    mimeType: 'video/mp4',
    durationMs: Math.round(totalTimelineSec * 1000),
  };
}

export function triggerVideoDownload(result: CinemaExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 5000);
}

function drawStaticQuestionKeyframe(params: {
  ctx: CanvasRenderingContext2D;
  question: QuranQuizQuestion;
  localIndex: number;
  partTotal: number;
  globalNumber: number;
  totalQuizQuestions: number;
  partRangeLabel: string;
  isRevealed: boolean;
  particles: GoldParticle[];
}) {
  const {
    ctx,
    question,
    localIndex,
    partTotal,
    globalNumber,
    totalQuizQuestions,
    partRangeLabel,
    isRevealed,
    particles,
  } = params;

  drawBackdrop(ctx, particles, 0.4 + localIndex * 1.15);

  // Header
  ctx.fillStyle = createMetallicGoldGradient(ctx, 72, 90, 560, 125);
  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ASAKA ZIYO · SHORTS (${partRangeLabel})`, 72, 118);

  ctx.fillStyle = 'rgba(255, 248, 231, 0.82)';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(question.reciterName, 72, 162);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFF8E7';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(`${globalNumber} / ${totalQuizQuestions}`, WIDTH - 72, 118);

  // 4 Luminous Diamond Progress Indicators + part segments
  const activeGroup = Math.min(3, Math.floor((localIndex / Math.max(1, partTotal)) * 4));
  for (let c = 0; c < 4; c++) {
    const cx = 72 + c * 36 + 12;
    const cy = 205;
    const r = c === activeGroup ? 11 : 8.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle =
      c < activeGroup
        ? '#10B981'
        : c === activeGroup
          ? createMetallicGoldGradient(ctx, -r, -r, r, r)
          : 'rgba(255,248,231,0.16)';
    if (c === activeGroup) {
      ctx.shadowColor = 'rgba(223, 189, 105, 0.75)';
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
    ctx.restore();
  }

  const segTotalW = WIDTH - 260;
  const segStartX = 240;
  const segGap = 10;
  const segW = (segTotalW - segGap * Math.max(0, partTotal - 1)) / Math.max(1, partTotal);
  for (let s = 0; s < partTotal; s++) {
    const sx = segStartX + s * (segW + segGap);
    drawRoundedRect(ctx, sx, 200, segW, 10, 5);
    ctx.fillStyle =
      s < localIndex
        ? '#10B981'
        : s === localIndex
          ? isRevealed
            ? '#10B981'
            : createMetallicGoldGradient(ctx, sx, 200, sx + segW, 210)
          : 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
  }

  // Central Frosted Obsidian Glass Ayah Card
  const cardX = 64;
  const cardY = 258;
  const cardW = WIDTH - 128;
  const cardH = 748;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(4, 24, 16, 0.82)');
  cardGrad.addColorStop(0.5, 'rgba(7, 38, 25, 0.76)');
  cardGrad.addColorStop(1, 'rgba(2, 14, 9, 0.88)');
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 38);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  const borderGrad = isRevealed
    ? (() => {
        const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        g.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
        g.addColorStop(0.5, 'rgba(223, 189, 105, 0.5)');
        g.addColorStop(1, 'rgba(52, 211, 153, 0.8)');
        return g;
      })()
    : createMetallicGoldGradient(ctx, cardX, cardY, cardX + cardW, cardY + cardH);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 4 Oriental Arabesque Corner Ornaments
  drawArabesqueCornerOrnaments(ctx, cardX, cardY, cardW, cardH);

  // Ornamental Gold Surah Cartouche Badge inside top of card
  const cartoucheW = Math.min(cardW - 96, 760);
  const cartoucheH = 68;
  const cartoucheX = WIDTH / 2 - cartoucheW / 2;
  const cartoucheY = cardY + 28;
  drawRoundedRect(ctx, cartoucheX, cartoucheY, cartoucheW, cartoucheH, 34);
  const cartGrad = ctx.createLinearGradient(cartoucheX, cartoucheY, cartoucheX + cartoucheW, cartoucheY + cartoucheH);
  cartGrad.addColorStop(0, 'rgba(138, 102, 33, 0.25)');
  cartGrad.addColorStop(0.5, 'rgba(4, 24, 16, 0.92)');
  cartGrad.addColorStop(1, 'rgba(138, 102, 33, 0.25)');
  ctx.fillStyle = cartGrad;
  ctx.fill();
  ctx.strokeStyle = createMetallicGoldGradient(ctx, cartoucheX, cartoucheY, cartoucheX + cartoucheW, cartoucheY);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = createMetallicGoldGradient(ctx, cartoucheX + 28, cartoucheY, cartoucheX + 420, cartoucheY + cartoucheH);
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${question.surahNameUz} surasi · ${question.ayahNumberInSurah}-oyat`,
    cartoucheX + 32,
    cartoucheY + 43
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFF6C8';
  ctx.font = '700 34px "Amiri Quran", "Scheherazade New", "Amiri", serif';
  ctx.fillText(question.surahNameAr, cartoucheX + cartoucheW - 32, cartoucheY + 46);

  // Arabic Ayah + Hidden Word Capsule [  ؟  ]
  const trailSuffix = question.trailingMarker ? ` ${question.trailingMarker}` : '';
  const hiddenOrBlank = isRevealed ? `﴿ ${question.hiddenWord} ﴾` : '[  ؟  ]';
  const displayArabic =
    question.hidePos === 'start'
      ? `${hiddenOrBlank} ${question.maskedArabicAfter}${isRevealed ? trailSuffix : ''}`.trim()
      : question.hidePos === 'middle'
        ? `${question.maskedArabicBefore} ${hiddenOrBlank} ${question.maskedArabicAfter}${isRevealed ? trailSuffix : ''}`.trim()
        : `${question.maskedArabicBefore || question.maskedArabicPrefix} ${hiddenOrBlank}${isRevealed ? trailSuffix : ''}`.trim();

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = '700 54px "Amiri Quran", "Scheherazade New", "Amiri", serif';
  const arLines = wrapTextLines(ctx, displayArabic, cardW - 110);
  const arStartY = cardY + (arLines.length <= 2 ? 250 : 205);
  const arLineHeight = 104;

  arLines.slice(0, 4).forEach((line, idx) => {
    const ly = arStartY + idx * arLineHeight;
    ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.45)' : 'rgba(223, 189, 105, 0.35)';
    ctx.shadowBlur = 20;
    const textGrad = ctx.createLinearGradient(cardX + 60, ly - 44, cardX + cardW - 60, ly + 14);
    textGrad.addColorStop(0, '#FFFDF9');
    textGrad.addColorStop(0.55, '#FFF8E7');
    textGrad.addColorStop(1, isRevealed ? '#A7F3D0' : '#DFBD69');
    ctx.fillStyle = textGrad;
    ctx.fillText(line, WIDTH / 2, ly);
  });
  ctx.restore();

  // Tafsiri Hilol Meaning Reveal
  if (isRevealed && question.translationUz) {
    ctx.save();
    const divY = cardY + cardH - 188;
    const divGrad = ctx.createLinearGradient(cardX + 90, divY, cardX + cardW - 90, divY);
    divGrad.addColorStop(0, 'rgba(223, 189, 105, 0)');
    divGrad.addColorStop(0.5, 'rgba(223, 189, 105, 0.65)');
    divGrad.addColorStop(1, 'rgba(223, 189, 105, 0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cardX + 90, divY);
    ctx.lineTo(cardX + cardW - 90, divY);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#DFBD69';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SHAYX MUHAMMAD SODIQ MUHAMMAD YUSUF — «TAFSIRI HILOL»', WIDTH / 2, divY + 26);

    ctx.fillStyle = 'rgba(255, 248, 231, 0.94)';
    ctx.font = '500 23px "Plus Jakarta Sans", sans-serif';
    const uzLines = wrapTextLines(ctx, `«${question.translationUz}»`, cardW - 110).slice(0, 2);
    const uzBaseY = divY + 60;
    uzLines.forEach((line, idx) => {
      ctx.fillText(line, WIDTH / 2, uzBaseY + idx * 32);
    });
    ctx.restore();
  }

  // Dual-Layer Symmetrical Liquid Gold Waveform
  const barCount = 36;
  const barWidth = 12;
  const barGap = 9;
  const totalWaveWidth = barCount * (barWidth + barGap) - barGap;
  const waveStartX = (WIDTH - totalWaveWidth) / 2;
  const waveBaseY = cardY + cardH - 34;
  for (let b = 0; b < barCount; b++) {
    const dist = Math.abs(b - (barCount - 1) / 2) / (barCount / 2);
    const harmonic = Math.abs(Math.sin(b * 0.55)) * 0.45 + 0.55;
    const barH = Math.max(8, Math.round((1 - dist * 0.72) * harmonic * (isRevealed ? 44 : 36)));
    const bx = waveStartX + b * (barWidth + barGap);
    drawRoundedRect(ctx, bx, waveBaseY - barH / 2, barWidth, barH, 6);
    ctx.fillStyle = isRevealed
      ? 'rgba(52, 211, 153, 0.88)'
      : createMetallicGoldGradient(ctx, bx, waveBaseY - barH / 2, bx, waveBaseY + barH / 2);
    ctx.fill();
  }

  // Circular Countdown Ring
  const ringCx = WIDTH / 2;
  const ringCy = 1140;
  const ringR = 84;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 248, 231, 0.12)';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
  ctx.strokeStyle = isRevealed
    ? '#10B981'
    : createMetallicGoldGradient(ctx, ringCx - ringR, ringCy - ringR, ringCx + ringR, ringCy + ringR);
  ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(223, 189, 105, 0.85)';
  ctx.shadowBlur = 22;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = isRevealed ? '#6EE7B7' : '#FFF8E7';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(isRevealed ? '✓' : '3.5s', ringCx, ringCy + 12);

  // Linear Timer Track at exact x=96, y=1265, w=888, h=18 (FFmpeg overlays sliding bar for prefix!)
  const barX = 96;
  const barY = 1265;
  const barW = WIDTH - 192;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.12)';
  ctx.fillRect(barX, barY, barW, 18);
  if (isRevealed) {
    ctx.fillStyle = '#10B981';
    ctx.fillRect(barX, barY, barW, 18);
  }

  // Bottom 2x2 Options with Rub el Hizb (١، ٢، ٣، ٤) Badges
  const gridX = 64;
  const gridY = 1335;
  const gap = 26;
  const optW = (WIDTH - 128 - gap) / 2;
  const optH = 195;
  const arabicNumerals = ['١', '٢', '٣', '٤'];

  question.options.forEach((optWord, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const ox = gridX + col * (optW + gap);
    const oy = gridY + row * (optH + gap);
    const isCorrectOpt = idx === question.correctIndex;

    ctx.save();
    if (isRevealed && !isCorrectOpt) {
      ctx.globalAlpha = 0.35;
    }

    drawRoundedRect(ctx, ox, oy, optW, optH, 30);
    if (isRevealed && isCorrectOpt) {
      const correctGrad = ctx.createLinearGradient(ox, oy, ox + optW, oy + optH);
      correctGrad.addColorStop(0, '#047857');
      correctGrad.addColorStop(0.5, '#10B981');
      correctGrad.addColorStop(1, '#34D399');
      ctx.fillStyle = correctGrad;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.72)';
      ctx.shadowBlur = 34;
      ctx.fill();
      ctx.strokeStyle = '#FFF6C8';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      const optGrad = ctx.createLinearGradient(ox, oy, ox + optW, oy + optH);
      optGrad.addColorStop(0, 'rgba(6, 34, 23, 0.88)');
      optGrad.addColorStop(1, 'rgba(3, 18, 12, 0.94)');
      ctx.fillStyle = optGrad;
      ctx.fill();
      ctx.strokeStyle = createMetallicGoldGradient(ctx, ox, oy, ox + optW, oy + optH);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 8-pointed Rub el Hizb Star Badge
    drawRubElHizbBadge(
      ctx,
      ox + 48,
      oy + optH / 2,
      26,
      isRevealed && isCorrectOpt ? '✓' : arabicNumerals[idx] || String(idx + 1),
      Boolean(isRevealed && isCorrectOpt)
    );

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = isRevealed && isCorrectOpt ? '#FFFFFF' : '#FFF8E7';
    ctx.font = '700 46px "Amiri Quran", "Scheherazade New", "Amiri", serif';
    ctx.fillText(optWord, ox + optW / 2 + 18, oy + optH / 2 + 16, optW - 110);
    ctx.restore();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(223, 189, 105, 0.78)';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Asaka Ziyo · 1080×1920 · ${question.surahNameUz} (${question.ayahKey})`,
    WIDTH / 2,
    HEIGHT - 44
  );
}

/**
 * Generates an independent 1-question (`quiz-01.mp4` .. `quiz-10.mp4`) 9:16 1080x1920 H.264/AAC MP4
 * using client-shaped Arabic Canvas keyframes and server-side FFmpeg audio/video assembly,
 * followed by binary `ftyp` verification so HTML or corrupted files can never be saved.
 */
export async function exportQuizPartMP4Video(
  options: QuizPartExportOptions
): Promise<QuizPartExportResult> {
  const {
    questionsPart,
    partIndex,
    questionNumber: rawQuestionNumber,
    partRangeLabel,
    globalStartNumber,
    totalQuizQuestions = 10,
    reciterName,
    quizDateStr = '',
    scoreSummary = null,
    countdownMs = 3500,
    onProgress,
    signal,
  } = options;

  const questionNumber = Math.max(
    1,
    Math.min(10, Math.floor(Number(rawQuestionNumber ?? partIndex ?? globalStartNumber ?? 1)))
  );
  const canonicalFilename = formatQuizMp4Filename(questionNumber);

  if (!Array.isArray(questionsPart) || questionsPart.length === 0) {
    throw new Error(`${canonicalFilename} uchun savol maʼlumoti topilmadi.`);
  }

  onProgress?.(4, `${canonicalFilename} uchun shriftlar va 1080×1920 kadrlar tayyorlanmoqda...`);
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore font API errors
  }

  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D kontekstini yaratib boʻlmadi.');
  }

  const particles = createGoldParticles();
  const normalizedQuestions = questionsPart.slice(0, 1).map((q) => normalizeQuizQuestion(q));
  const primaryQuestion = normalizedQuestions[0];

  // 1. Render Intro JPEG
  drawIntroFrame({
    ctx,
    particles,
    elapsed: 0.3,
    reciterName: reciterName || primaryQuestion.reciterName,
    quizDateStr,
    totalQuestions: 1,
  });
  const introJpgBase64 = canvas.toDataURL('image/jpeg', 0.92);

  // 2. Render Outro JPEG
  drawOutroFrame({
    ctx,
    particles,
    elapsed: 1.5,
    reciterName: reciterName || primaryQuestion.reciterName,
    quizDateStr,
    totalQuestions: 1,
    scoreSummary,
  });
  const outroJpgBase64 = canvas.toDataURL('image/jpeg', 0.92);

  // 3. Render Question Prefix & Reveal JPEGs
  const renderedQuestionsPayload = normalizedQuestions.map((q, idx) => {
    drawStaticQuestionKeyframe({
      ctx,
      question: q,
      localIndex: idx,
      partTotal: 1,
      globalNumber: questionNumber,
      totalQuizQuestions,
      partRangeLabel: partRangeLabel || `${questionNumber}-savol`,
      isRevealed: false,
      particles,
    });
    const prefixJpgBase64 = canvas.toDataURL('image/jpeg', 0.92);

    drawStaticQuestionKeyframe({
      ctx,
      question: q,
      localIndex: idx,
      partTotal: 1,
      globalNumber: questionNumber,
      totalQuizQuestions,
      partRangeLabel: partRangeLabel || `${questionNumber}-savol`,
      isRevealed: true,
      particles,
    });
    const revealJpgBase64 = canvas.toDataURL('image/jpeg', 0.92);

    return {
      id: q.id,
      ayahKey: q.ayahKey,
      surahNumber: q.surahNumber,
      ayahNumberInSurah: q.ayahNumberInSurah,
      reciterId: q.reciterId,
      reciterName: q.reciterName,
      audioUrl: q.audioUrl,
      fallbackAudioUrl: q.fallbackAudioUrl,
      hidePos: q.hidePos,
      pauseRatio: q.pauseRatio,
      resumeRatio: q.resumeRatio,
      pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
      prefixJpgBase64,
      revealJpgBase64,
    };
  });

  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  onProgress?.(12, `${canonicalFilename} server FFmpeg render navbatiga yuborilmoqda...`);
  const startResp = await fetch('/api/quran-quiz/render-video/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionNumber,
      partIndex: questionNumber,
      quizDateStr,
      reciterId: primaryQuestion.reciterId,
      reciterName: reciterName || primaryQuestion.reciterName,
      countdownMs,
      introJpgBase64,
      outroJpgBase64,
      questions: renderedQuestionsPayload,
    }),
    signal,
  });

  const startData = await startResp.json().catch(() => ({}));
  if (!startResp.ok || !startData?.success || !startData?.jobId) {
    throw new Error(
      startData?.error || `${canonicalFilename} render jarayonini boshlashda xatolik (HTTP ${startResp.status}).`
    );
  }

  const jobId = String(startData.jobId);
  const pollStartedAt = Date.now();
  const maxPollMs = 180000;

  while (Date.now() - pollStartedAt < maxPollMs) {
    if (signal?.aborted) {
      throw new DOMException('Eksport bekor qilindi.', 'AbortError');
    }

    await new Promise((r) => setTimeout(r, 650));

    const statusResp = await fetch(`/api/quran-quiz/render-video/status/${encodeURIComponent(jobId)}`, {
      signal,
    });
    const statusData = await statusResp.json().catch(() => ({}));
    if (!statusResp.ok || !statusData?.success) {
      throw new Error(
        statusData?.error || `${canonicalFilename} holatini tekshirishda xatolik (HTTP ${statusResp.status}).`
      );
    }

    const pct = Math.min(92, Math.max(14, Number(statusData.progressPct) || 20));
    onProgress?.(pct, String(statusData.stageLabel || `${canonicalFilename} render qilinmoqda...`));

    if (statusData.status === 'error') {
      throw new Error(statusData.error || `${canonicalFilename} render jarayonida xatolik yuz berdi.`);
    }

    if (statusData.status === 'ready') {
      const serverDownloadUrl =
        statusData.downloadUrl || `/api/quran-quiz/render-video/download/${encodeURIComponent(jobId)}?download=1`;
      const serverPreviewUrl =
        statusData.previewUrl || `/api/quran-quiz/render-video/download/${encodeURIComponent(jobId)}`;

      onProgress?.(95, `${canonicalFilename} MP4 fayli tekshirilmoqda...`);
      const dlResp = await fetch(serverDownloadUrl, { signal });
      const dlCt = (dlResp.headers.get('content-type') || '').toLowerCase();
      if (!dlResp.ok || dlCt.includes('text/html') || dlCt.includes('application/json')) {
        throw new Error(
          `Server MP4 oʻrniga notoʻgʻri javob qaytardi (HTTP ${dlResp.status}, Content-Type: ${dlCt || 'nomaʼlum'}).`
        );
      }

      const mp4Buffer = await dlResp.arrayBuffer();
      const verification = verifyMp4BinaryBuffer(mp4Buffer);
      if (!verification.valid) {
        throw new Error(verification.error || `${canonicalFilename} MP4 ftyp tekshiruvidan oʻtmadi.`);
      }

      const verifiedBlob = new Blob([mp4Buffer], { type: 'video/mp4' });
      const localObjectUrl = URL.createObjectURL(verifiedBlob);

      onProgress?.(100, `${canonicalFilename} yuklab olishga tayyor!`);
      return {
        jobId,
        questionNumber,
        partIndex: questionNumber,
        filename: canonicalFilename,
        downloadUrl: localObjectUrl,
        previewUrl: localObjectUrl,
        serverDownloadUrl,
        sizeBytes: mp4Buffer.byteLength,
        durationMs: Number(statusData.durationMs) || 12000,
        mimeType: 'video/mp4',
        ftypVerified: true,
      };
    }
  }

  throw new Error(`${canonicalFilename} render vaqti tugadi. Iltimos, qayta urinib koʻring.`);
}

export async function triggerServerMp4Download(params: {
  downloadUrl: string;
  serverDownloadUrl?: string;
  filename: string;
  onProgress?: (msg: string) => void;
}): Promise<void> {
  const safeFilename = params.filename?.endsWith('.mp4')
    ? params.filename
    : `${params.filename || 'quiz-01'}.mp4`;

  try {
    params.onProgress?.(`${safeFilename} tekshirilmoqda va yuklab olinmoqda...`);

    const candidateUrls = Array.from(
      new Set([params.downloadUrl, params.serverDownloadUrl || ''].filter(Boolean))
    );
    let verifiedBuffer: ArrayBuffer | null = null;
    let lastError: Error | null = null;

    for (const targetUrl of candidateUrls) {
      try {
        const resp = await fetch(targetUrl);
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();

        // Guard against redirect to SPA login/index.html
        if (resp.redirected && resp.url && !resp.url.includes('/api/quran-quiz/')) {
          throw new Error('Yuklab olish havolasi boshqa sahifaga yoʻnaltirildi.');
        }

        if (!resp.ok || contentType.includes('text/html') || contentType.includes('application/json')) {
          const errText = await resp.text().catch(() => '');
          if (errText.includes('<!DOCTYPE') || errText.includes('<html')) {
            throw new Error(
              'Server video oʻrniga HTML sahifa qaytardi. Iltimos, videoni qayta yarating.'
            );
          }
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.error) throw new Error(parsed.error);
          } catch (jsonErr) {
            if (jsonErr instanceof Error && !jsonErr.message.includes('JSON')) {
              throw jsonErr;
            }
          }
          throw new Error(`Video yuklab olishda xatolik (HTTP ${resp.status}).`);
        }

        const buf = await resp.arrayBuffer();
        const check = verifyMp4BinaryBuffer(buf);
        if (!check.valid) {
          throw new Error(check.error || 'Yaroqsiz MP4 fayl.');
        }
        verifiedBuffer = buf;
        break;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!verifiedBuffer) {
      throw lastError || new Error('MP4 videoni yuklab boʻlmadi.');
    }

    const videoBlob = new Blob([verifiedBuffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 60000);
  } catch (err: any) {
    console.error('MP4 download error:', err);
    throw err instanceof Error ? err : new Error('Videoni yuklab boʻlmadi.');
  }
}

export async function shareServerMp4Video(params: {
  previewUrl: string;
  downloadUrl: string;
  serverDownloadUrl?: string;
  filename: string;
  title: string;
}): Promise<void> {
  const safeFilename = params.filename?.endsWith('.mp4')
    ? params.filename
    : `${params.filename || 'quiz-01'}.mp4`;
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      const resp = await fetch(params.previewUrl || params.downloadUrl);
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if (resp.ok && !ct.includes('text/html')) {
        const buf = await resp.arrayBuffer();
        const check = verifyMp4BinaryBuffer(buf);
        if (check.valid) {
          const file = new File([buf], safeFilename, { type: 'video/mp4' });
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: params.title,
              text: `${params.title} — Asaka Ziyo`,
            });
            return;
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
  }
  await triggerServerMp4Download({
    downloadUrl: params.downloadUrl,
    serverDownloadUrl: params.serverDownloadUrl,
    filename: safeFilename,
  });
}
