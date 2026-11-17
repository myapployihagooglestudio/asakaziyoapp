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
  partIndex: 1 | 2;
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
  partIndex: 1 | 2;
  filename: string;
  downloadUrl: string;
  previewUrl: string;
  sizeBytes: number;
  durationMs: number;
  mimeType: 'video/mp4';
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

function drawIslamicMandala(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.strokeStyle = 'rgba(212, 178, 106, 0.13)';
  ctx.lineWidth = 2;

  [1.0, 0.86, 0.64, 0.42].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  const folds = 12;
  for (let i = 0; i < folds; i++) {
    const theta = (i * Math.PI * 2) / folds;
    ctx.save();
    ctx.rotate(theta);
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.25);
    ctx.lineTo(radius * 0.18, -radius * 0.64);
    ctx.lineTo(0, -radius * 0.98);
    ctx.lineTo(-radius * 0.18, -radius * 0.64);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  for (let pass = 0; pass < 2; pass++) {
    ctx.save();
    ctx.rotate((pass * Math.PI) / 4);
    ctx.strokeRect(-radius * 0.52, -radius * 0.52, radius * 1.04, radius * 1.04);
    ctx.restore();
  }

  ctx.restore();
}

function createGoldParticles(): GoldParticle[] {
  return Array.from({ length: 42 }).map((_, i) => ({
    x: (i * 197) % WIDTH,
    y: (i * 313) % HEIGHT,
    r: 1.5 + (i % 4) * 1.1,
    speedY: 22 + (i % 5) * 12,
    drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5),
    alpha: 0.25 + (i % 5) * 0.12,
    phase: i * 0.7,
  }));
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  particles: GoldParticle[],
  elapsed: number
) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bgGrad.addColorStop(0, '#02140c');
  bgGrad.addColorStop(0.5, '#07291a');
  bgGrad.addColorStop(1, '#010a06');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const haloGrad = ctx.createRadialGradient(WIDTH / 2, 540, 40, WIDTH / 2, 540, 620);
  haloGrad.addColorStop(0, 'rgba(198, 164, 92, 0.20)');
  haloGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.06)');
  haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawIslamicMandala(ctx, WIDTH / 2, 650, 520, elapsed * 0.08);

  for (const p of particles) {
    const py = (((p.y - elapsed * p.speedY) % HEIGHT) + HEIGHT) % HEIGHT;
    const px = p.x + Math.sin(elapsed * 0.9 + p.phase) * p.drift;
    ctx.fillStyle = `rgba(220, 197, 140, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
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

  drawBackdrop(ctx, particles, elapsedGlobal);

  // Top Header Bar
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ASAKA ZIYO · QUR’ON VIKTORINASI', 72, 118);

  ctx.fillStyle = 'rgba(248, 245, 236, 0.76)';
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(question.reciterName, 72, 162);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F8F5EC';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(`${questionIndex + 1} / ${totalQuestions}`, WIDTH - 72, 118);

  // 4 progress circles + linear 10-question micro-segments
  const activeGroup = Math.min(3, Math.floor((questionIndex / Math.max(1, totalQuestions)) * 4));
  for (let c = 0; c < 4; c++) {
    const cx = 72 + c * 36 + 10;
    const cy = 205;
    ctx.beginPath();
    ctx.arc(cx, cy, c === activeGroup ? 11 : 9, 0, Math.PI * 2);
    ctx.fillStyle =
      c < activeGroup ? '#10b981' : c === activeGroup ? '#DCC58C' : 'rgba(255,255,255,0.16)';
    ctx.fill();
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
        ? '#10b981'
        : s === questionIndex
          ? '#DCC58C'
          : 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
  }

  // Central Glassmorphic Ayah Card
  const cardX = 64;
  const cardY = 265;
  const cardW = WIDTH - 128;
  const cardH = 740;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(7, 41, 26, 0.78)');
  cardGrad.addColorStop(1, 'rgba(2, 20, 12, 0.88)');
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 42);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(220, 197, 140, 0.62)');
  borderGrad.addColorStop(0.5, 'rgba(198, 164, 92, 0.24)');
  borderGrad.addColorStop(1, 'rgba(220, 197, 140, 0.55)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${question.surahNameUz} surasi, ${question.ayahNumberInSurah}-oyat`,
    cardX + 46,
    cardY + 68
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(220, 197, 140, 0.9)';
  ctx.font = '700 36px "Amiri Quran", "Amiri", serif';
  ctx.fillText(question.surahNameAr, cardX + cardW - 46, cardY + 72);

  ctx.strokeStyle = 'rgba(198, 164, 92, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 46, cardY + 102);
  ctx.lineTo(cardX + cardW - 46, cardY + 102);
  ctx.stroke();

  const revealAnimT = isRevealed
    ? Math.min(1, (localElapsed - (prefixDurSec + countdownDurSec)) / 0.45)
    : 0;
  const trailSuffix = question.trailingMarker ? ` ${question.trailingMarker}` : '';
  const hiddenOrBlank = isRevealed ? question.hiddenWord : '[ ______ ]';
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
      ? `rgba(16, 185, 129, ${0.42 * revealAnimT})`
      : 'rgba(198, 164, 92, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(line, WIDTH / 2, arStartY + idx * arLineHeight);
  });
  ctx.restore();

  // Official Uzbek Meaning Subtitle (Shown cleanly on reveal so hidden word isn't spoiled prematurely)
  if (isRevealed && question.translationUz) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212, 207, 195, 0.90)';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    const uzLines = wrapTextLines(ctx, question.translationUz, cardW - 110).slice(0, 2);
    const uzBaseY = cardY + cardH - 138;
    uzLines.forEach((line, idx) => {
      ctx.fillText(line, WIDTH / 2, uzBaseY + idx * 35);
    });
    ctx.restore();
  }

  // Real-Time Golden Audio Frequency Visualizer
  analyser.getByteFrequencyData(freqBuf as Uint8Array<ArrayBuffer>);
  const barCount = 32;
  const barWidth = 14;
  const barGap = 10;
  const totalWaveWidth = barCount * (barWidth + barGap) - barGap;
  const waveStartX = (WIDTH - totalWaveWidth) / 2;
  const waveBaseY = cardY + cardH - 36;

  for (let b = 0; b < barCount; b++) {
    const symIdx = Math.abs(b - barCount / 2);
    const binIdx = Math.min(freqBuf.length - 1, Math.floor((symIdx / (barCount / 2)) * 24));
    const amp = isCountdown ? 0.08 : (freqBuf[binIdx] || 0) / 255;
    const barH = Math.max(8, Math.round(amp * 54));
    const bx = waveStartX + b * (barWidth + barGap);
    drawRoundedRect(ctx, bx, waveBaseY - barH, barWidth, barH, 6);
    ctx.fillStyle = isRevealed
      ? 'rgba(16, 185, 129, 0.85)'
      : 'rgba(220, 197, 140, 0.82)';
    ctx.fill();
  }

  // 3.5s Golden Neon Circular Countdown Ring + Linear Bar
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

  const ringCx = WIDTH / 2;
  const ringCy = 1140;
  const ringR = 84;

  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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
    ctx.strokeStyle = isRevealed ? '#10b981' : '#DCC58C';
    ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(220, 197, 140, 0.85)';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = isRevealed ? '#6ee7b7' : '#FFFDF7';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(isRevealed ? '✓' : `${remainingSec.toFixed(1)}s`, ringCx, ringCy + 12);

  // Linear timer bar
  const barX = 96;
  const barY = 1265;
  const barW = WIDTH - 192;
  drawRoundedRect(ctx, barX, barY, barW, 18, 9);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  const fillW = Math.max(18, barW * (isRevealed ? 1 : timerRatio));
  drawRoundedRect(ctx, barX, barY, fillW, 18, 9);
  ctx.fillStyle = isRevealed ? '#10b981' : '#DCC58C';
  ctx.fill();

  // Bottom 2x2 Glassmorphic Answer Option Cards
  const gridX = 64;
  const gridY = 1335;
  const gap = 26;
  const optW = (WIDTH - 128 - gap) / 2;
  const optH = 195;

  question.options.forEach((optWord, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const ox = gridX + col * (optW + gap);
    const oy = gridY + row * (optH + gap);
    const isCorrectOpt = idx === question.correctIndex;

    drawRoundedRect(ctx, ox, oy, optW, optH, 30);
    if (isRevealed && isCorrectOpt) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.72)';
      ctx.shadowBlur = 32;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = isRevealed ? 'rgba(6, 36, 30, 0.45)' : 'rgba(6, 36, 30, 0.85)';
      ctx.fill();
      ctx.strokeStyle = isRevealed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 164, 92, 0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = isRevealed && !isCorrectOpt ? 'rgba(255,255,255,0.4)' : '#FFFDF7';
    ctx.font = '700 46px "Amiri Quran", "Scheherazade New", "Amiri", serif';
    ctx.fillText(optWord, ox + optW / 2, oy + optH / 2 + 16, optW - 44);
    ctx.restore();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220, 197, 140, 0.7)';
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
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': rawBlob.type || 'video/webm',
      },
      body: rawBlob,
      signal,
    });
    if (!resp.ok) {
      const errPayload = await resp.json().catch(() => ({}));
      throw new Error(
        errPayload?.error || `Server MP4 konvertatsiyasida xatolik (HTTP ${resp.status}).`
      );
    }
    const mp4Blob = await resp.blob();
    if (!mp4Blob || mp4Blob.size < 1024) {
      throw new Error('Server boʻsh MP4 video qaytardi.');
    }
    return new Blob([mp4Blob], { type: 'video/mp4' });
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      throw err;
    }
    if (rawBlob.type.toLowerCase().includes('mp4') && rawBlob.size >= 1024) {
      return rawBlob;
    }
    throw err instanceof Error
      ? err
      : new Error('Videoni MP4 formatiga konvertatsiya qilib boʻlmadi.');
  }
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
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 33px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ASAKA ZIYO · SHORTS (${partRangeLabel})`, 72, 118);

  ctx.fillStyle = 'rgba(248, 245, 236, 0.78)';
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(question.reciterName, 72, 162);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F8F5EC';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(`${globalNumber} / ${totalQuizQuestions}`, WIDTH - 72, 118);

  // 4 progress circles + part segments
  const activeGroup = Math.min(3, Math.floor((localIndex / Math.max(1, partTotal)) * 4));
  for (let c = 0; c < 4; c++) {
    const cx = 72 + c * 36 + 10;
    const cy = 205;
    ctx.beginPath();
    ctx.arc(cx, cy, c === activeGroup ? 11 : 9, 0, Math.PI * 2);
    ctx.fillStyle =
      c < activeGroup ? '#10b981' : c === activeGroup ? '#DCC58C' : 'rgba(255,255,255,0.16)';
    ctx.fill();
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
        ? '#10b981'
        : s === localIndex
          ? isRevealed
            ? '#10b981'
            : '#DCC58C'
          : 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
  }

  // Central Glassmorphic Ayah Card
  const cardX = 64;
  const cardY = 265;
  const cardW = WIDTH - 128;
  const cardH = 740;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(7, 41, 26, 0.80)');
  cardGrad.addColorStop(1, 'rgba(2, 20, 12, 0.90)');
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 42);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, isRevealed ? 'rgba(16, 185, 129, 0.72)' : 'rgba(220, 197, 140, 0.65)');
  borderGrad.addColorStop(0.5, 'rgba(198, 164, 92, 0.25)');
  borderGrad.addColorStop(1, isRevealed ? 'rgba(16, 185, 129, 0.62)' : 'rgba(220, 197, 140, 0.55)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#DCC58C';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${question.surahNameUz} surasi, ${question.ayahNumberInSurah}-oyat`,
    cardX + 46,
    cardY + 68
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(220, 197, 140, 0.9)';
  ctx.font = '700 36px "Amiri Quran", "Amiri", serif';
  ctx.fillText(question.surahNameAr, cardX + cardW - 46, cardY + 72);

  ctx.strokeStyle = 'rgba(198, 164, 92, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 46, cardY + 102);
  ctx.lineTo(cardX + cardW - 46, cardY + 102);
  ctx.stroke();

  const trailSuffix = question.trailingMarker ? ` ${question.trailingMarker}` : '';
  const hiddenOrBlank = isRevealed ? question.hiddenWord : '[ ______ ]';
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
  const arStartY = cardY + (arLines.length <= 2 ? 275 : 220);
  const arLineHeight = 96;

  arLines.slice(0, 4).forEach((line, idx) => {
    ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.45)' : 'rgba(198, 164, 92, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(line, WIDTH / 2, arStartY + idx * arLineHeight);
  });
  ctx.restore();

  if (isRevealed && question.translationUz) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212, 207, 195, 0.94)';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    const uzLines = wrapTextLines(ctx, question.translationUz, cardW - 110).slice(0, 2);
    const uzBaseY = cardY + cardH - 138;
    uzLines.forEach((line, idx) => {
      ctx.fillText(line, WIDTH / 2, uzBaseY + idx * 35);
    });
    ctx.restore();
  }

  // Symmetrical Golden Wave Decoration
  const barCount = 32;
  const barWidth = 14;
  const barGap = 10;
  const totalWaveWidth = barCount * (barWidth + barGap) - barGap;
  const waveStartX = (WIDTH - totalWaveWidth) / 2;
  const waveBaseY = cardY + cardH - 36;
  for (let b = 0; b < barCount; b++) {
    const dist = Math.abs(b - barCount / 2) / (barCount / 2);
    const barH = Math.max(8, Math.round((1 - dist * 0.7) * (isRevealed ? 42 : 34)));
    const bx = waveStartX + b * (barWidth + barGap);
    drawRoundedRect(ctx, bx, waveBaseY - barH, barWidth, barH, 6);
    ctx.fillStyle = isRevealed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(220, 197, 140, 0.82)';
    ctx.fill();
  }

  // Circular Countdown Ring
  const ringCx = WIDTH / 2;
  const ringCy = 1140;
  const ringR = 84;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
  ctx.strokeStyle = isRevealed ? '#10b981' : '#DCC58C';
  ctx.shadowColor = isRevealed ? 'rgba(16, 185, 129, 0.85)' : 'rgba(220, 197, 140, 0.85)';
  ctx.shadowBlur = 22;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = isRevealed ? '#6ee7b7' : '#FFFDF7';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(isRevealed ? '✓' : '3.5s', ringCx, ringCy + 12);

  // Linear Timer Track at exact x=96, y=1265, w=888, h=18 (FFmpeg overlays sliding bar for prefix!)
  const barX = 96;
  const barY = 1265;
  const barW = WIDTH - 192;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, barY, barW, 18);
  if (isRevealed) {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(barX, barY, barW, 18);
  }

  // Bottom 2x2 Options
  const gridX = 64;
  const gridY = 1335;
  const gap = 26;
  const optW = (WIDTH - 128 - gap) / 2;
  const optH = 195;

  question.options.forEach((optWord, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const ox = gridX + col * (optW + gap);
    const oy = gridY + row * (optH + gap);
    const isCorrectOpt = idx === question.correctIndex;

    drawRoundedRect(ctx, ox, oy, optW, optH, 30);
    if (isRevealed && isCorrectOpt) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.72)';
      ctx.shadowBlur = 32;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = isRevealed ? 'rgba(6, 36, 30, 0.45)' : 'rgba(6, 36, 30, 0.85)';
      ctx.fill();
      ctx.strokeStyle = isRevealed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 164, 92, 0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = isRevealed && !isCorrectOpt ? 'rgba(255,255,255,0.4)' : '#FFFDF7';
    ctx.font = '700 46px "Amiri Quran", "Scheherazade New", "Amiri", serif';
    ctx.fillText(optWord, ox + optW / 2, oy + optH / 2 + 16, optW - 44);
    ctx.restore();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220, 197, 140, 0.72)';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Asaka Ziyo · 1080×1920 · ${question.surahNameUz} (${question.ayahKey})`,
    WIDTH / 2,
    HEIGHT - 44
  );
}

/**
 * Generates an independent 5-question (1-5 or 6-10) 9:16 1080x1920 H.264/AAC MP4
 * using client-shaped Arabic Canvas keyframes and server-side FFmpeg audio/video assembly.
 * Works reliably across Android Chrome and installed PWA standalone mode without MediaRecorder lag.
 */
export async function exportQuizPartMP4Video(
  options: QuizPartExportOptions
): Promise<QuizPartExportResult> {
  const {
    questionsPart,
    partIndex,
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

  if (!Array.isArray(questionsPart) || questionsPart.length === 0) {
    throw new Error(`${partIndex}-video uchun savollar topilmadi.`);
  }
  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  onProgress?.(2, `${partIndex}-video (${partRangeLabel}): shrift va kadrlar tayyorlanmoqda...`);
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore
  }

  const normalizedPart = questionsPart.map((q) => normalizeQuizQuestion(q));
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D kontekstini yaratib boʻlmadi.');
  }

  const particles = createGoldParticles();
  const toJpg = () => canvas.toDataURL('image/jpeg', 0.9);

  // Intro frame with part label
  drawIntroFrame({
    ctx,
    particles,
    elapsed: 0.2,
    reciterName,
    quizDateStr: `${quizDateStr ? `${quizDateStr} · ` : ''}${partIndex}-qism (${partRangeLabel}-savollar)`,
    totalQuestions: normalizedPart.length,
  });
  const introJpgBase64 = toJpg();

  const questionPayloads = normalizedPart.map((q, localIdx) => {
    const common = {
      ctx,
      question: q,
      localIndex: localIdx,
      partTotal: normalizedPart.length,
      globalNumber: globalStartNumber + localIdx,
      totalQuizQuestions,
      partRangeLabel,
      particles,
    };
    drawStaticQuestionKeyframe({ ...common, isRevealed: false });
    const prefixJpgBase64 = toJpg();
    drawStaticQuestionKeyframe({ ...common, isRevealed: true });
    const revealJpgBase64 = toJpg();

    return {
      id: q.id,
      ayahKey: q.ayahKey,
      surahNumber: q.surahNumber,
      ayahNumberInSurah: q.ayahNumberInSurah,
      reciterId: q.reciterId,
      reciterName: q.reciterName,
      audioUrl: q.audioUrl,
      fallbackAudioUrl: q.fallbackAudioUrl || '',
      hidePos: q.hidePos || 'end',
      pauseRatio: q.pauseRatio ?? 0.72,
      resumeRatio: q.resumeRatio ?? q.pauseRatio ?? 0.72,
      pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
      prefixJpgBase64,
      revealJpgBase64,
    };
  });

  drawOutroFrame({
    ctx,
    particles,
    elapsed: 1.4,
    reciterName,
    quizDateStr: `${quizDateStr ? `${quizDateStr} · ` : ''}${partIndex}-qism (${partRangeLabel})`,
    totalQuestions: normalizedPart.length,
    scoreSummary,
  });
  const outroJpgBase64 = toJpg();

  if (signal?.aborted) {
    throw new DOMException('Eksport bekor qilindi.', 'AbortError');
  }

  onProgress?.(5, `${partIndex}-video server FFmpeg konveyeriga yuborilmoqda...`);
  const startResp = await fetch('/api/quran-quiz/render-video/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      partIndex,
      quizDateStr,
      reciterName,
      countdownMs,
      introJpgBase64,
      outroJpgBase64,
      questions: questionPayloads,
    }),
  });
  const startData = await startResp.json().catch(() => ({}));
  if (!startResp.ok || !startData?.success || !startData?.jobId) {
    throw new Error(
      startData?.error || `Server video renderini boshlay olmadi (HTTP ${startResp.status}).`
    );
  }

  const jobId = String(startData.jobId);

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Eksport bekor qilindi.', 'AbortError');
    }

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, 600);
      const onAbort = () => {
        window.clearTimeout(timer);
        reject(new DOMException('Eksport bekor qilindi.', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });

    const statusResp = await fetch(`/api/quran-quiz/render-video/status/${encodeURIComponent(jobId)}`, {
      signal,
      cache: 'no-store',
    });
    const st = await statusResp.json().catch(() => ({}));
    if (!statusResp.ok || !st?.success) {
      throw new Error(st?.error || `Render holatini tekshirishda xatolik (HTTP ${statusResp.status}).`);
    }

    const pct = Math.max(5, Math.min(100, Number(st.progressPct) || 5));
    onProgress?.(pct, String(st.stageLabel || `${partIndex}-video tayyorlanmoqda...`));

    if (st.status === 'error') {
      throw new Error(st.error || `${partIndex}-video tayyorlashda xatolik yuz berdi.`);
    }

    if (st.status === 'ready') {
      onProgress?.(100, String(st.stageLabel || `${partIndex}-video tayyor!`));
      return {
        jobId,
        partIndex,
        filename: String(st.filename),
        downloadUrl: String(st.downloadUrl),
        previewUrl: String(st.previewUrl),
        sizeBytes: Number(st.sizeBytes) || 0,
        durationMs: Number(st.durationMs) || 0,
        mimeType: 'video/mp4',
      };
    }
  }
}

export function triggerServerMp4Download(params: {
  downloadUrl: string;
  filename: string;
}): void {
  const a = document.createElement('a');
  a.href = params.downloadUrl;
  a.download = params.filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
  }, 1500);
}

export async function shareServerMp4Video(params: {
  previewUrl: string;
  downloadUrl: string;
  filename: string;
  title: string;
}): Promise<void> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      const resp = await fetch(params.previewUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const file = new File([blob], params.filename, { type: 'video/mp4' });
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
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
  }
  triggerServerMp4Download({
    downloadUrl: params.downloadUrl,
    filename: params.filename,
  });
}
