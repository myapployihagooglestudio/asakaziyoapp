import crypto from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  QURAN_RECITERS,
  getIslamicNetworkAyahUrl,
  getReciterAyahAudioUrl,
} from '../src/data/quranData';
import { computeQuestionAudioSlice } from '../src/utils/quranQuizService';
import type { QuranQuizHidePosition } from '../src/types';
import { parseMp3DurationMs } from './quranQuizEngine';

export interface RenderQuestionInput {
  id: string;
  ayahKey: string;
  surahNumber: number;
  ayahNumberInSurah: number;
  reciterId: string;
  reciterName: string;
  audioUrl: string;
  fallbackAudioUrl?: string;
  hidePos: QuranQuizHidePosition;
  pauseRatio: number;
  resumeRatio: number;
  pauseBeforeLastWordMs?: number;
  prefixJpgBase64: string;
  revealJpgBase64: string;
}

export interface StartQuizPartRenderInput {
  partIndex: 1 | 2;
  quizDateStr: string;
  reciterName: string;
  countdownMs?: number;
  introJpgBase64: string;
  outroJpgBase64: string;
  questions: RenderQuestionInput[];
}

export interface RenderJobState {
  jobId: string;
  partIndex: 1 | 2;
  status: 'queued' | 'rendering' | 'ready' | 'error';
  progressPct: number;
  stageLabel: string;
  error?: string;
  filename: string;
  outputPath: string;
  workDir: string;
  sizeBytes: number;
  durationMs: number;
  createdAtMs: number;
}

const renderJobs = new Map<string, RenderJobState>();
const JOB_TTL_MS = 35 * 60 * 1000;

function stripBase64DataPrefix(raw: string): Buffer {
  const clean = String(raw || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  if (!clean) {
    throw new Error('Boʻsh kadr tasviri yuborildi.');
  }
  const buf = Buffer.from(clean, 'base64');
  if (buf.length < 512) {
    throw new Error('Kadr tasviri hajmi notoʻgʻri.');
  }
  return buf;
}

function runFfmpeg(args: string[], timeoutMs = 90000): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      args,
      { timeout: timeoutMs, maxBuffer: 12 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`FFmpeg xatosi: ${stderr?.slice(-450) || err.message}`));
          return;
        }
        resolve();
      }
    );
  });
}

export function buildStrictReciterAudioUrls(q: RenderQuestionInput): string[] {
  const reciterId = String(q.reciterId || '').trim();
  const primary = getReciterAyahAudioUrl(reciterId, q.surahNumber, q.ayahNumberInSurah);
  const islamicUrl = getIslamicNetworkAyahUrl(reciterId, q.surahNumber, q.ayahNumberInSurah);

  const isSafeForReciter = (url: string): boolean => {
    if (!url) return false;
    if (reciterId !== 'mishary') {
      if (url.includes('Alafasy_128kbps') || url.includes('/ar.alafasy/')) {
        return false;
      }
    }
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const candidates = [q.audioUrl, primary, q.fallbackAudioUrl || '', islamicUrl]
    .map((u) => String(u || '').trim())
    .filter(isSafeForReciter);

  return Array.from(new Set(candidates));
}

async function fetchValidReciterMp3(q: RenderQuestionInput): Promise<{
  buffer: Buffer;
  durationSec: number;
}> {
  const reciterExists = QURAN_RECITERS.some((r) => r.id === q.reciterId) || q.reciterId.startsWith('reciter-');
  if (!reciterExists && !q.audioUrl) {
    throw new Error(`Qori (${q.reciterId}) uchun audio manba topilmadi.`);
  }

  const urls = buildStrictReciterAudioUrls(q);
  if (urls.length === 0) {
    throw new Error(`${q.reciterName} uchun ${q.ayahKey} oyati audio havolasi mavjud emas.`);
  }

  let lastErr: unknown = null;
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AsakaZiyoVideoRenderer/1.0',
          Accept: 'audio/mpeg, audio/*;q=0.9',
        },
      });
      if (!resp.ok) {
        lastErr = new Error(`Audio HTTP ${resp.status}`);
        continue;
      }
      const ctype = String(resp.headers.get('content-type') || '').toLowerCase();
      if (ctype.includes('text/html')) {
        lastErr = new Error('HTML javob qaytdi');
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      const durationMs = parseMp3DurationMs(buf);
      if (durationMs < 350) {
        lastErr = new Error('Yaroqsiz MP3 freym davomiyligi');
        continue;
      }
      return { buffer: buf, durationSec: durationMs / 1000 };
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`${q.ayahKey} audio faylini yuklab boʻlmadi.`);
}

function buildPcmWavBuffer(durationSec: number, sampleGen: (t: number) => number): Buffer {
  const sampleRate = 44100;
  const numChannels = 2;
  const numSamples = Math.max(1, Math.round(durationSec * sampleRate));
  const dataSize = numSamples * numChannels * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buf.writeUInt16LE(numChannels * 2, 32);
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const raw = Math.max(-1, Math.min(1, sampleGen(t)));
    const val = Math.round(raw * 32767);
    const offset = 44 + i * 4;
    buf.writeInt16LE(val, offset);
    buf.writeInt16LE(val, offset + 2);
  }
  return buf;
}

function synthesizeCountdownTicksWav(countdownSec: number): Buffer {
  const stepPositions: Array<{ startAt: number; isAccent: boolean }> = [];
  const totalSteps = Math.max(1, Math.floor(countdownSec / 0.5) + 1);
  for (let i = 0; i < totalSteps; i++) {
    const startAt = i * 0.5;
    if (startAt >= countdownSec - 0.08) break;
    stepPositions.push({ startAt, isAccent: i % 2 === 0 });
  }
  return buildPcmWavBuffer(countdownSec, (t) => {
    let acc = 0;
    for (const s of stepPositions) {
      const dt = t - s.startAt;
      if (dt >= 0 && dt <= 0.065) {
        const freq = s.isAccent ? 1080 : 820;
        const amp = s.isAccent ? 0.28 : 0.2;
        acc += amp * Math.exp(-48 * dt) * Math.sin(2 * Math.PI * freq * dt);
      }
    }
    return acc;
  });
}

function synthesizeChimeWav(): Buffer {
  return buildPcmWavBuffer(0.7, (t) => {
    if (t > 0.65) return 0;
    return (
      Math.exp(-5.8 * t) *
      (0.18 * Math.sin(2 * Math.PI * 523.25 * t) +
        0.13 * Math.sin(2 * Math.PI * 659.25 * t) +
        0.09 * Math.sin(2 * Math.PI * 1046.5 * t))
    );
  });
}

function synthesizeToneWav(durationSec: number, freqs: number[], decay: number, amp: number): Buffer {
  return buildPcmWavBuffer(durationSec, (t) => {
    const env = amp * Math.exp(-decay * t);
    let sum = 0;
    freqs.forEach((f, idx) => {
      sum += (idx === 0 ? 1 : 0.6) * Math.sin(2 * Math.PI * f * t);
    });
    return env * sum;
  });
}

function cleanupExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of renderJobs.entries()) {
    if (now - job.createdAtMs > JOB_TTL_MS) {
      renderJobs.delete(id);
      void fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
      void fs.promises.unlink(job.outputPath).catch(() => {});
    }
  }
}

async function processQuizPartRenderJob(
  job: RenderJobState,
  input: StartQuizPartRenderInput
): Promise<void> {
  const countdownSec = Math.max(1.5, Math.min(8, (Number(input.countdownMs) || 3500) / 1000));
  const revealHoldSec = 0.85;
  const introDurSec = 1.1;
  const outroDurSec = 2.6;
  const totalQ = input.questions.length;

  try {
    job.status = 'rendering';
    job.progressPct = 6;
    job.stageLabel = `${job.partIndex}-video uchun kadrlar tayyorlanmoqda...`;

    const introPath = path.join(job.workDir, 'intro.jpg');
    const outroPath = path.join(job.workDir, 'outro.jpg');
    const introTonePath = path.join(job.workDir, 'intro_tone.wav');
    const outroTonePath = path.join(job.workDir, 'outro_tone.wav');
    const ticksWavPath = path.join(job.workDir, 'ticks.wav');
    const chimeWavPath = path.join(job.workDir, 'chime.wav');

    await Promise.all([
      fs.promises.writeFile(introPath, stripBase64DataPrefix(input.introJpgBase64)),
      fs.promises.writeFile(outroPath, stripBase64DataPrefix(input.outroJpgBase64)),
      fs.promises.writeFile(introTonePath, synthesizeToneWav(introDurSec, [392, 523.25], 4.5, 0.08)),
      fs.promises.writeFile(outroTonePath, synthesizeToneWav(outroDurSec, [440, 659.25], 3.5, 0.07)),
      fs.promises.writeFile(ticksWavPath, synthesizeCountdownTicksWav(countdownSec)),
      fs.promises.writeFile(chimeWavPath, synthesizeChimeWav()),
    ]);

    const intermediateClips: string[] = [];

    // 1. Render Intro clip with soft warm tone
    const introClipPath = path.join(job.workDir, 'seg_intro.mkv');
    await runFfmpeg([
      '-y',
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      introDurSec.toFixed(3),
      '-i',
      introPath,
      '-i',
      introTonePath,
      '-vf',
      'scale=1080:1920,format=yuv420p,fade=t=in:st=0:d=0.25',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '19',
      '-c:a',
      'pcm_s16le',
      '-ar',
      '44100',
      '-ac',
      '2',
      introClipPath,
    ]);
    intermediateClips.push(introClipPath);

    let accumulatedMs = Math.round(introDurSec * 1000);

    // 2. Render each question segment (Prefix -> 3.5s Countdown Bar + Clock Ticks -> Chime + Reveal)

    for (let i = 0; i < totalQ; i++) {
      const q = input.questions[i];
      const basePct = 10 + Math.round((i / totalQ) * 72);
      job.progressPct = basePct;
      job.stageLabel = `${job.partIndex}-video: ${i + 1}/${totalQ}-savol audio yuklanmoqda (${q.ayahKey})...`;

      const { buffer: mp3Buffer, durationSec } = await fetchValidReciterMp3(q);
      const mp3Path = path.join(job.workDir, `q_${i}.mp3`);
      const prefixImgPath = path.join(job.workDir, `prefix_${i}.jpg`);
      const revealImgPath = path.join(job.workDir, `reveal_${i}.jpg`);

      await Promise.all([
        fs.promises.writeFile(mp3Path, mp3Buffer),
        fs.promises.writeFile(prefixImgPath, stripBase64DataPrefix(q.prefixJpgBase64)),
        fs.promises.writeFile(revealImgPath, stripBase64DataPrefix(q.revealJpgBase64)),
      ]);

      const qSlice = computeQuestionAudioSlice({
        durationSec,
        hidePos: q.hidePos,
        pauseRatio: q.pauseRatio,
        resumeRatio: q.resumeRatio,
        pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
        phase: 'question',
      });
      const rSlice = computeQuestionAudioSlice({
        durationSec,
        hidePos: q.hidePos,
        pauseRatio: q.pauseRatio,
        resumeRatio: q.resumeRatio,
        pauseBeforeLastWordMs: q.pauseBeforeLastWordMs,
        phase: 'reveal',
      });

      const prefixDurSec = Math.max(0.45, qSlice.durationSec);
      const tailDurSec = Math.max(0.4, rSlice.durationSec);
      const revealTotalSec = tailDurSec + revealHoldSec;
      const prefixFadeStart = Math.max(0, prefixDurSec - Math.min(0.14, prefixDurSec * 0.18));

      job.progressPct = basePct + Math.round((0.45 / totalQ) * 72);
      job.stageLabel = `${job.partIndex}-video: ${i + 1}/${totalQ}-savol (${q.ayahKey}) render qilinmoqda...`;

      const segPath = path.join(job.workDir, `seg_q_${i}.mkv`);

      // Build exact 3-stage filtergraph per question:
      // Stage 1: Prefix recitation with full gold timer bar (x=96, y=1265, w=888, h=18)
      // Stage 2: 3.5s sliding countdown bar + synthesized clock ticks
      // Stage 3: Emerald reveal frame + 3-tone bell chime + remainder/full recitation
      const filterComplex = [
        `color=c=0xDCC58C:s=888x18:r=30:d=${prefixDurSec.toFixed(3)}[pbar]`,
        `color=c=0xDCC58C:s=888x18:r=30:d=${countdownSec.toFixed(3)}[cbar]`,
        `[0:v]scale=1080:1920,fps=30,format=yuv420p,split=2[p_img][c_src]`,
        `[p_img][pbar]overlay=x=96:y=1265,trim=duration=${prefixDurSec.toFixed(3)},setpts=PTS-STARTPTS[vp]`,
        `[c_src]split=2[c_bg][c_mask]`,
        `[c_mask]crop=96:18:0:1265[c_left]`,
        `[c_bg]trim=duration=${countdownSec.toFixed(3)},setpts=PTS-STARTPTS[c_base]`,
        `[c_base][cbar]overlay=x='96-888*(t/${countdownSec.toFixed(3)})':y=1265:shortest=1[c_slide]`,
        `[c_slide][c_left]overlay=x=0:y=1265,setpts=PTS-STARTPTS[vc]`,
        `[1:v]scale=1080:1920,fps=30,format=yuv420p,trim=duration=${revealTotalSec.toFixed(3)},setpts=PTS-STARTPTS[vr]`,
        `[vp][vc][vr]concat=n=3:v=1:a=0[vout]`,
        `[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asplit=2[a_in_p][a_in_r]`,
        q.hidePos === 'start'
          ? `[a_in_p]atrim=start=${qSlice.offsetSec.toFixed(3)}:duration=${qSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.05,apad=whole_dur=${prefixDurSec.toFixed(3)},atrim=0:${prefixDurSec.toFixed(3)}[ap]`
          : `[a_in_p]atrim=start=${qSlice.offsetSec.toFixed(3)}:duration=${qSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${prefixFadeStart.toFixed(3)}:d=${Math.min(0.14, prefixDurSec * 0.18).toFixed(3)},apad=whole_dur=${prefixDurSec.toFixed(3)},atrim=0:${prefixDurSec.toFixed(3)}[ap]`,
        `[3:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,atrim=0:${countdownSec.toFixed(3)},asetpts=PTS-STARTPTS[ac]`,
        `[a_in_r]atrim=start=${rSlice.offsetSec.toFixed(3)}:duration=${rSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06,apad=whole_dur=${revealTotalSec.toFixed(3)},atrim=0:${revealTotalSec.toFixed(3)}[ar_voice]`,
        `[4:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,apad=whole_dur=${revealTotalSec.toFixed(3)},atrim=0:${revealTotalSec.toFixed(3)}[ar_chime]`,
        `[ar_voice][ar_chime]amix=inputs=2:duration=first:normalize=0[ar]`,
        `[ap][ac][ar]concat=n=3:v=0:a=1[aout]`,
      ].join(';');

      await runFfmpeg([
        '-y',
        '-loop',
        '1',
        '-framerate',
        '30',
        '-t',
        Math.max(prefixDurSec, countdownSec).toFixed(3),
        '-i',
        prefixImgPath,
        '-loop',
        '1',
        '-framerate',
        '30',
        '-t',
        revealTotalSec.toFixed(3),
        '-i',
        revealImgPath,
        '-i',
        mp3Path,
        '-i',
        ticksWavPath,
        '-i',
        chimeWavPath,
        '-filter_complex',
        filterComplex,
        '-map',
        '[vout]',
        '-map',
        '[aout]',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '19',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'pcm_s16le',
        '-ar',
        '44100',
        '-ac',
        '2',
        segPath,
      ]);

      intermediateClips.push(segPath);
      accumulatedMs += Math.round((prefixDurSec + countdownSec + revealTotalSec) * 1000);
    }

    // 3. Render Outro clip
    job.progressPct = 86;
    job.stageLabel = `${job.partIndex}-video: yakuniy karta tayyorlanmoqda...`;
    const outroClipPath = path.join(job.workDir, 'seg_outro.mkv');
    await runFfmpeg([
      '-y',
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      outroDurSec.toFixed(3),
      '-i',
      outroPath,
      '-i',
      outroTonePath,
      '-vf',
      `scale=1080:1920,format=yuv420p,fade=t=out:st=${(outroDurSec - 0.35).toFixed(3)}:d=0.35`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '19',
      '-c:a',
      'pcm_s16le',
      '-ar',
      '44100',
      '-ac',
      '2',
      outroClipPath,
    ]);
    intermediateClips.push(outroClipPath);
    accumulatedMs += Math.round(outroDurSec * 1000);

    // 4. Final single-pass H.264/AAC MP4 merge (+faststart for instant Android/PWA playback)
    job.progressPct = 92;
    job.stageLabel = `${job.partIndex}-video: yakuniy 1080×1920 MP4 (H.264/AAC) birlashtirilmoqda...`;

    const finalInputs: string[] = [];
    const concatStreamRefs: string[] = [];
    intermediateClips.forEach((clipPath, idx) => {
      finalInputs.push('-i', clipPath);
      concatStreamRefs.push(`[${idx}:v][${idx}:a]`);
    });

    await runFfmpeg(
      [
        '-y',
        ...finalInputs,
        '-filter_complex',
        `${concatStreamRefs.join('')}concat=n=${intermediateClips.length}:v=1:a=1[fv][fa]`,
        '-map',
        '[fv]',
        '-map',
        '[fa]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        job.outputPath,
      ],
      150000
    );

    const stat = await fs.promises.stat(job.outputPath);
    if (!stat || stat.size < 4096) {
      throw new Error('Yakuniy MP4 fayl hajmi juda kichik yoki boʻsh.');
    }

    job.sizeBytes = stat.size;
    job.durationMs = accumulatedMs;
    job.progressPct = 100;
    job.stageLabel = `${job.partIndex}-video (1080×1920 MP4) yuklab olishga tayyor!`;
    job.status = 'ready';

    // Remove intermediate MKV/MP3/JPG workspace promptly while keeping final .mp4 for TTL
    await fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
  } catch (err: any) {
    job.status = 'error';
    const errMsg = String(
      err?.message || `${job.partIndex}-video render jarayonida xatolik yuz berdi.`
    );
    job.error = errMsg;
    job.stageLabel = errMsg;
    await fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.unlink(job.outputPath).catch(() => {});
  }
}

export function startQuizPartRenderJob(input: StartQuizPartRenderInput): RenderJobState {
  cleanupExpiredJobs();

  if (typeof input.partIndex !== 'number' || input.partIndex < 1 || input.partIndex > 10) {
    throw new Error('Notoʻgʻri video raqami (1 dan 10 gacha boʻlishi kerak).');
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0 || input.questions.length > 5) {
    throw new Error('Har bir videoda 1 tadan 5 tagacha savol boʻlishi shart.');
  }
  if (!input.introJpgBase64 || !input.outroJpgBase64) {
    throw new Error('Kirish va yakuniy kadrlar yuborilmadi.');
  }

  const jobId = `qv_${input.partIndex}_${crypto.randomBytes(6).toString('hex')}`;
  const workDir = path.join(os.tmpdir(), `asaka-qv-work-${jobId}`);
  const outputPath = path.join(os.tmpdir(), `asaka-qv-out-${jobId}.mp4`);
  fs.mkdirSync(workDir, { recursive: true });

  const cleanDate = String(input.quizDateStr || 'bugun').replace(/[^a-zA-Z0-9_-]/g, '');
  const rangeSlug = input.questions.length === 1 ? `savol-${input.partIndex}` : (input.partIndex === 1 ? '1-5' : '6-10');
  const filename = input.questions.length === 1
    ? `${input.partIndex}.mp4`
    : `asaka-ziyo-viktorina-${cleanDate}-qism${input.partIndex}-${rangeSlug}-1080x1920.mp4`;

  const job: RenderJobState = {
    jobId,
    partIndex: input.partIndex as any,
    status: 'queued',
    progressPct: 3,
    stageLabel: `${input.partIndex}-video navbatga qoʻshildi...`,
    filename,
    outputPath,
    workDir,
    sizeBytes: 0,
    durationMs: 0,
    createdAtMs: Date.now(),
  };

  renderJobs.set(jobId, job);

  // Fire background processing cleanly without blocking HTTP response
  void processQuizPartRenderJob(job, input);

  return job;
}

export function getQuizRenderJobStatus(jobId: string): RenderJobState | null {
  cleanupExpiredJobs();
  return renderJobs.get(String(jobId || '').trim()) || null;
}
