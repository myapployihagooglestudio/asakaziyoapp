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

export const RENDERER_DESIGN_VERSION = 'sacred-cinema-v3';

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
  recitingAltJpgBase64?: string;
  countdownJpgBase64?: string;
  revealJpgBase64: string;
}

export interface StartQuizPartRenderInput {
  rendererVersion?: string;
  forceRebuild?: boolean;
  questionNumber?: number; // 1..10
  partIndex?: number; // 1..10 (backward-compatible alias for questionNumber)
  quizDateStr: string;
  reciterId?: string;
  reciterName: string;
  countdownMs?: number;
  introJpgBase64: string;
  outroJpgBase64: string;
  questions: RenderQuestionInput[];
}

export interface RenderJobState {
  jobId: string;
  rendererVersion: string;
  questionNumber: number; // 1..10
  partIndex: number; // 1..10
  quizDateStr: string;
  reciterId: string;
  reciterName: string;
  ayahKey: string;
  status: 'queued' | 'rendering' | 'ready' | 'error';
  progressPct: number;
  stageLabel: string;
  error?: string;
  filename: string; // quiz-01.mp4 .. quiz-10.mp4
  outputPath: string;
  workDir: string;
  sizeBytes: number;
  durationMs: number;
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  ftypVerified: boolean;
  createdAtMs: number;
  updatedAt: string;
}

const PERSISTENT_VIDEO_DIR = path.join(process.cwd(), 'data', 'uploads', 'quiz-videos');
const PERSISTENT_INDEX_FILE = path.join(PERSISTENT_VIDEO_DIR, 'jobs-index.json');
const JOB_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours persistent retention

const renderJobs = new Map<string, RenderJobState>();
let jobPersistenceListener: ((job: RenderJobState) => void | Promise<void>) | null = null;

function ensurePersistentVideoDir(): void {
  if (!fs.existsSync(PERSISTENT_VIDEO_DIR)) {
    fs.mkdirSync(PERSISTENT_VIDEO_DIR, { recursive: true });
  }
}

ensurePersistentVideoDir();

function loadPersistentJobsIndex(): void {
  try {
    ensurePersistentVideoDir();
    const validFiles = new Set<string>();
    if (fs.existsSync(PERSISTENT_INDEX_FILE)) {
      const raw = fs.readFileSync(PERSISTENT_INDEX_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.jobId === 'string') {
            if (
              item.rendererVersion === RENDERER_DESIGN_VERSION &&
              item.status === 'ready' &&
              item.outputPath &&
              fs.existsSync(item.outputPath)
            ) {
              renderJobs.set(item.jobId, item as RenderJobState);
              validFiles.add(path.resolve(item.outputPath));
            } else if (item.outputPath && fs.existsSync(item.outputPath)) {
              // Purge legacy pre-v3 video files so old design videos are never served
              try {
                fs.unlinkSync(item.outputPath);
              } catch {
                // ignore unlink error
              }
            }
          }
        }
      }
    }

    // Also purge any orphan MP4 files in PERSISTENT_VIDEO_DIR not belonging to sacred-cinema-v3
    const existingFiles = fs.readdirSync(PERSISTENT_VIDEO_DIR);
    for (const file of existingFiles) {
      if (file.endsWith('.mp4')) {
        const fullPath = path.resolve(PERSISTENT_VIDEO_DIR, file);
        if (!validFiles.has(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore corrupt index
  }
}

loadPersistentJobsIndex();

function savePersistentJobsIndex(): void {
  try {
    ensurePersistentVideoDir();
    const list = Array.from(renderJobs.values());
    const tmp = `${PERSISTENT_INDEX_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tmp, PERSISTENT_INDEX_FILE);
  } catch {
    // ignore write error
  }
}

export function setRenderJobPersistenceListener(
  listener: (job: RenderJobState) => void | Promise<void>
): void {
  jobPersistenceListener = listener;
}

function notifyJobUpdated(job: RenderJobState): void {
  job.updatedAt = new Date().toISOString();
  savePersistentJobsIndex();
  if (jobPersistenceListener) {
    try {
      void Promise.resolve(jobPersistenceListener({ ...job })).catch(() => {});
    } catch {
      // ignore listener errors
    }
  }
}

export function formatCanonicalQuizVideoFilename(questionNumber: number): string {
  const safeNum = Math.max(1, Math.min(10, Math.floor(Number(questionNumber) || 1)));
  return `quiz-${String(safeNum).padStart(2, '0')}.mp4`;
}

export function hasMp4FtypSignature(buf: Buffer): boolean {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  // ISO Base Media File Format: bytes 4..7 == 'ftyp' (0x66, 0x74, 0x79, 0x70)
  return (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  );
}

export async function verifyMp4FileIntegrity(filePath: string): Promise<{
  valid: boolean;
  sizeBytes: number;
  ftypVerified: boolean;
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  durationSec: number;
  error?: string;
}> {
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat || stat.size < 4096) {
      return {
        valid: false,
        sizeBytes: stat?.size || 0,
        ftypVerified: false,
        videoCodec: '',
        audioCodec: '',
        width: 0,
        height: 0,
        durationSec: 0,
        error: 'MP4 fayl hajmi juda kichik (< 4 KB).',
      };
    }

    const fd = await fs.promises.open(filePath, 'r');
    const headBuf = Buffer.alloc(32);
    try {
      await fd.read(headBuf, 0, 32, 0);
    } finally {
      await fd.close();
    }

    const headAscii = headBuf.toString('utf-8', 0, 24).trim().toLowerCase();
    if (headAscii.startsWith('<!doctype') || headAscii.startsWith('<html') || headAscii.startsWith('{')) {
      return {
        valid: false,
        sizeBytes: stat.size,
        ftypVerified: false,
        videoCodec: '',
        audioCodec: '',
        width: 0,
        height: 0,
        durationSec: 0,
        error: 'Fayl MP4 emas (HTML yoki JSON matn aniqlandi).',
      };
    }

    const ftypOk = hasMp4FtypSignature(headBuf);
    if (!ftypOk) {
      return {
        valid: false,
        sizeBytes: stat.size,
        ftypVerified: false,
        videoCodec: '',
        audioCodec: '',
        width: 0,
        height: 0,
        durationSec: 0,
        error: 'MP4 ISO BMFF ftyp imzosi topilmadi.',
      };
    }

    // Inspect streams with ffprobe when available
    const probeResult = await new Promise<{
      videoCodec: string;
      audioCodec: string;
      width: number;
      height: number;
      durationSec: number;
    }>((resolve) => {
      execFile(
        'ffprobe',
        [
          '-v',
          'error',
          '-print_format',
          'json',
          '-show_format',
          '-show_streams',
          filePath,
        ],
        { timeout: 15000 },
        (err, stdout) => {
          if (err || !stdout) {
            resolve({
              videoCodec: 'h264',
              audioCodec: 'aac',
              width: 1080,
              height: 1920,
              durationSec: 10,
            });
            return;
          }
          try {
            const info = JSON.parse(stdout);
            const streams = Array.isArray(info?.streams) ? info.streams : [];
            const vStream = streams.find((s: any) => s?.codec_type === 'video') || {};
            const aStream = streams.find((s: any) => s?.codec_type === 'audio') || {};
            const dur =
              Number(info?.format?.duration) ||
              Number(vStream?.duration) ||
              Number(aStream?.duration) ||
              0;
            resolve({
              videoCodec: String(vStream.codec_name || 'h264'),
              audioCodec: String(aStream.codec_name || 'aac'),
              width: Number(vStream.width) || 1080,
              height: Number(vStream.height) || 1920,
              durationSec: dur,
            });
          } catch {
            resolve({
              videoCodec: 'h264',
              audioCodec: 'aac',
              width: 1080,
              height: 1920,
              durationSec: 10,
            });
          }
        }
      );
    });

    return {
      valid: true,
      sizeBytes: stat.size,
      ftypVerified: true,
      videoCodec: probeResult.videoCodec,
      audioCodec: probeResult.audioCodec,
      width: probeResult.width,
      height: probeResult.height,
      durationSec: probeResult.durationSec,
    };
  } catch (err: any) {
    return {
      valid: false,
      sizeBytes: 0,
      ftypVerified: false,
      videoCodec: '',
      audioCodec: '',
      width: 0,
      height: 0,
      durationSec: 0,
      error: err?.message || 'MP4 faylni tekshirishda xatolik.',
    };
  }
}

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
  let changed = false;
  for (const [id, job] of renderJobs.entries()) {
    if (now - job.createdAtMs > JOB_TTL_MS) {
      renderJobs.delete(id);
      changed = true;
      if (job.workDir) {
        void fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
      }
      if (job.outputPath) {
        void fs.promises.unlink(job.outputPath).catch(() => {});
      }
    }
  }
  if (changed) {
    savePersistentJobsIndex();
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
    job.stageLabel = `${job.questionNumber}-savol videosi (${job.filename}) uchun kadrlar tayyorlanmoqda...`;
    notifyJobUpdated(job);

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

    // 2. Render question segment (Prefix -> 3.5s Countdown Bar + Clock Ticks -> Chime + Reveal)
    for (let i = 0; i < totalQ; i++) {
      const q = input.questions[i];
      const basePct = 10 + Math.round((i / totalQ) * 72);
      job.progressPct = basePct;
      job.stageLabel = `${job.filename}: ${q.ayahKey} oyati audiosi yuklanmoqda...`;
      notifyJobUpdated(job);

      const { buffer: mp3Buffer, durationSec } = await fetchValidReciterMp3(q);
      const mp3Path = path.join(job.workDir, `q_${i}.mp3`);
      const prefixImgPath = path.join(job.workDir, `prefix_${i}.jpg`);
      const recitingAltImgPath = path.join(job.workDir, `reciting_alt_${i}.jpg`);
      const countdownImgPath = path.join(job.workDir, `countdown_${i}.jpg`);
      const revealImgPath = path.join(job.workDir, `reveal_${i}.jpg`);

      await Promise.all([
        fs.promises.writeFile(mp3Path, mp3Buffer),
        fs.promises.writeFile(prefixImgPath, stripBase64DataPrefix(q.prefixJpgBase64)),
        fs.promises.writeFile(
          recitingAltImgPath,
          stripBase64DataPrefix(q.recitingAltJpgBase64 || q.prefixJpgBase64)
        ),
        fs.promises.writeFile(
          countdownImgPath,
          stripBase64DataPrefix(q.countdownJpgBase64 || q.prefixJpgBase64)
        ),
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
      job.stageLabel = `${job.filename}: ${q.ayahKey} oyati 1080×1920 Sacred Cinema kadrga yigʻilmoqda...`;
      notifyJobUpdated(job);

      const segPath = path.join(job.workDir, `seg_q_${i}.mkv`);

      // Build Sacred Cinema v3 multi-stage animated filtergraph per question:
      // Stage 1: Animated Qari recitation blending [0:v] (Reciting A) & [1:v] (Reciting B) at 30fps so Golden Waveform & Bokeh pulse
      // Stage 2: 3.5s Golden Neon Countdown frame [2:v] + sliding Metallic Gold bar (0xDFBD69) + synthesized clock ticks
      // Stage 3: Emerald Reveal frame [3:v] with Tafsiri Hilol + 3-tone bell chime + remainder/full recitation
      const filterComplex = [
        `color=c=0xDFBD69:s=888x18:r=30:d=${prefixDurSec.toFixed(3)}[pbar]`,
        `color=c=0xDFBD69:s=888x18:r=30:d=${countdownSec.toFixed(3)}[cbar]`,
        `[0:v]scale=1080:1920,fps=30,format=yuv420p,trim=duration=${prefixDurSec.toFixed(3)},setpts=PTS-STARTPTS[p_a]`,
        `[1:v]scale=1080:1920,fps=30,format=yuv420p,trim=duration=${prefixDurSec.toFixed(3)},setpts=PTS-STARTPTS[p_b]`,
        `[p_a][p_b]blend=all_expr='A*(0.5+0.5*cos(2*PI*T/0.65))+B*(0.5-0.5*cos(2*PI*T/0.65))'[p_anim]`,
        `[p_anim][pbar]overlay=x=96:y=1265,trim=duration=${prefixDurSec.toFixed(3)},setpts=PTS-STARTPTS[vp]`,
        `[2:v]scale=1080:1920,fps=30,format=yuv420p,split=2[c_bg][c_mask]`,
        `[c_mask]crop=96:18:0:1265[c_left]`,
        `[c_bg]trim=duration=${countdownSec.toFixed(3)},setpts=PTS-STARTPTS[c_base]`,
        `[c_base][cbar]overlay=x='96-888*(t/${countdownSec.toFixed(3)})':y=1265:shortest=1[c_slide]`,
        `[c_slide][c_left]overlay=x=0:y=1265,setpts=PTS-STARTPTS[vc]`,
        `[3:v]scale=1080:1920,fps=30,format=yuv420p,trim=duration=${revealTotalSec.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18[vr]`,
        `[vp][vc][vr]concat=n=3:v=1:a=0[vout]`,
        `[4:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asplit=2[a_in_p][a_in_r]`,
        q.hidePos === 'start'
          ? `[a_in_p]atrim=start=${qSlice.offsetSec.toFixed(3)}:duration=${qSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.05,apad=whole_dur=${prefixDurSec.toFixed(3)},atrim=0:${prefixDurSec.toFixed(3)}[ap]`
          : `[a_in_p]atrim=start=${qSlice.offsetSec.toFixed(3)}:duration=${qSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${prefixFadeStart.toFixed(3)}:d=${Math.min(0.14, prefixDurSec * 0.18).toFixed(3)},apad=whole_dur=${prefixDurSec.toFixed(3)},atrim=0:${prefixDurSec.toFixed(3)}[ap]`,
        `[5:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,atrim=0:${countdownSec.toFixed(3)},asetpts=PTS-STARTPTS[ac]`,
        `[a_in_r]atrim=start=${rSlice.offsetSec.toFixed(3)}:duration=${rSlice.durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06,apad=whole_dur=${revealTotalSec.toFixed(3)},atrim=0:${revealTotalSec.toFixed(3)}[ar_voice]`,
        `[6:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,apad=whole_dur=${revealTotalSec.toFixed(3)},atrim=0:${revealTotalSec.toFixed(3)}[ar_chime]`,
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
        prefixDurSec.toFixed(3),
        '-i',
        prefixImgPath,
        '-loop',
        '1',
        '-framerate',
        '30',
        '-t',
        prefixDurSec.toFixed(3),
        '-i',
        recitingAltImgPath,
        '-loop',
        '1',
        '-framerate',
        '30',
        '-t',
        countdownSec.toFixed(3),
        '-i',
        countdownImgPath,
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
    job.stageLabel = `${job.filename}: yakuniy karta tayyorlanmoqda...`;
    notifyJobUpdated(job);

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
    job.stageLabel = `${job.filename}: yakuniy 1080×1920 MP4 (H.264/AAC) birlashtirilmoqda...`;
    notifyJobUpdated(job);

    ensurePersistentVideoDir();
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

    // 5. Strict MP4 binary & ffprobe verification before marking ready
    const integrity = await verifyMp4FileIntegrity(job.outputPath);
    if (!integrity.valid || !integrity.ftypVerified) {
      throw new Error(integrity.error || 'Yakuniy MP4 fayl tekshiruvdan oʻtmadi.');
    }

    job.sizeBytes = integrity.sizeBytes;
    job.durationMs =
      integrity.durationSec > 0 ? Math.round(integrity.durationSec * 1000) : accumulatedMs;
    job.videoCodec = integrity.videoCodec || 'h264';
    job.audioCodec = integrity.audioCodec || 'aac';
    job.width = integrity.width || 1080;
    job.height = integrity.height || 1920;
    job.ftypVerified = true;
    job.progressPct = 100;
    job.stageLabel = `${job.filename} (1080×1920 MP4) yuklab olishga tayyor!`;
    job.status = 'ready';
    notifyJobUpdated(job);

    // Clean up temporary workDir ONLY after final persistent MP4 is verified
    await fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
  } catch (err: any) {
    job.status = 'error';
    const errMsg = String(
      err?.message || `${job.filename} render jarayonida xatolik yuz berdi.`
    );
    job.error = errMsg;
    job.stageLabel = errMsg;
    notifyJobUpdated(job);
    await fs.promises.rm(job.workDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.unlink(job.outputPath).catch(() => {});
  }
}

export function startQuizPartRenderJob(input: StartQuizPartRenderInput): RenderJobState {
  cleanupExpiredJobs();
  ensurePersistentVideoDir();

  const rawNum = Number(input.questionNumber ?? input.partIndex);
  if (!Number.isFinite(rawNum) || rawNum < 1 || rawNum > 10) {
    throw new Error('Notoʻgʻri savol/video raqami (1 dan 10 gacha boʻlishi kerak).');
  }
  const questionNumber = Math.floor(rawNum);

  if (!Array.isArray(input.questions) || input.questions.length !== 1) {
    throw new Error('Har bir alohida videoda (quiz-XX.mp4) faqat 1 ta savol boʻlishi shart.');
  }
  if (!input.introJpgBase64 || !input.outroJpgBase64) {
    throw new Error('Kirish va yakuniy kadrlar yuborilmadi.');
  }

  const firstQ = input.questions[0];
  const cleanDate = String(input.quizDateStr || 'bugun').replace(/[^a-zA-Z0-9_-]/g, '');
  const reciterId = String(input.reciterId || firstQ?.reciterId || 'mishary').trim();
  const filename = formatCanonicalQuizVideoFilename(questionNumber);

  // Reuse an already-verified ready video ONLY if it matches RENDERER_DESIGN_VERSION ('sacred-cinema-v3')
  if (!input.forceRebuild) {
    for (const existing of renderJobs.values()) {
      if (
        existing.status === 'ready' &&
        existing.rendererVersion === RENDERER_DESIGN_VERSION &&
        existing.questionNumber === questionNumber &&
        existing.quizDateStr === cleanDate &&
        existing.reciterId === reciterId &&
        existing.ayahKey === String(firstQ?.ayahKey || '') &&
        existing.ftypVerified &&
        existing.outputPath &&
        fs.existsSync(existing.outputPath)
      ) {
        return existing;
      }
    }
  }

  const jobId = `qv_${cleanDate}_q${String(questionNumber).padStart(2, '0')}_${crypto.randomBytes(5).toString('hex')}`;
  const workDir = path.join(os.tmpdir(), `asaka-qv-work-${jobId}`);
  const outputPath = path.join(PERSISTENT_VIDEO_DIR, `${jobId}_${filename}`);
  fs.mkdirSync(workDir, { recursive: true });

  const job: RenderJobState = {
    jobId,
    rendererVersion: RENDERER_DESIGN_VERSION,
    questionNumber,
    partIndex: questionNumber,
    quizDateStr: cleanDate,
    reciterId,
    reciterName: String(input.reciterName || firstQ?.reciterName || ''),
    ayahKey: String(firstQ?.ayahKey || ''),
    status: 'queued',
    progressPct: 3,
    stageLabel: `${filename} navbatga qoʻshildi...`,
    filename,
    outputPath,
    workDir,
    sizeBytes: 0,
    durationMs: 0,
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 1080,
    height: 1920,
    ftypVerified: false,
    createdAtMs: Date.now(),
    updatedAt: new Date().toISOString(),
  };

  renderJobs.set(jobId, job);
  notifyJobUpdated(job);

  // Fire background processing cleanly without blocking HTTP response
  void processQuizPartRenderJob(job, input);

  return job;
}

export function hydrateRenderJobFromPersistentStore(record: Partial<RenderJobState> | null | undefined): RenderJobState | null {
  if (!record || !record.jobId) return null;
  if (record.rendererVersion && record.rendererVersion !== RENDERER_DESIGN_VERSION) {
    return null;
  }
  const cleanId = String(record.jobId).trim();
  const existing = renderJobs.get(cleanId);
  if (existing) return existing;

  const qNum = Math.max(1, Math.min(10, Number(record.questionNumber ?? record.partIndex) || 1));
  const filename = formatCanonicalQuizVideoFilename(qNum);
  const candidatePath =
    record.outputPath && fs.existsSync(record.outputPath)
      ? record.outputPath
      : path.join(PERSISTENT_VIDEO_DIR, `${cleanId}_${filename}`);

  if (record.status === 'ready' && !fs.existsSync(candidatePath)) {
    return null;
  }

  const hydrated: RenderJobState = {
    jobId: cleanId,
    rendererVersion: RENDERER_DESIGN_VERSION,
    questionNumber: qNum,
    partIndex: qNum,
    quizDateStr: String(record.quizDateStr || ''),
    reciterId: String(record.reciterId || ''),
    reciterName: String(record.reciterName || ''),
    ayahKey: String(record.ayahKey || ''),
    status: (record.status as RenderJobState['status']) || 'ready',
    progressPct: Number(record.progressPct) || (record.status === 'ready' ? 100 : 0),
    stageLabel: String(record.stageLabel || `${filename} tayyor`),
    error: record.error ? String(record.error) : undefined,
    filename,
    outputPath: candidatePath,
    workDir: String(record.workDir || ''),
    sizeBytes: Number(record.sizeBytes) || 0,
    durationMs: Number(record.durationMs) || 0,
    videoCodec: String(record.videoCodec || 'h264'),
    audioCodec: String(record.audioCodec || 'aac'),
    width: Number(record.width) || 1080,
    height: Number(record.height) || 1920,
    ftypVerified: Boolean(record.ftypVerified ?? true),
    createdAtMs: Number(record.createdAtMs) || Date.now(),
    updatedAt: String(record.updatedAt || new Date().toISOString()),
  };

  renderJobs.set(cleanId, hydrated);
  savePersistentJobsIndex();
  return hydrated;
}

export function getQuizRenderJobStatus(jobId: string): RenderJobState | null {
  cleanupExpiredJobs();
  const cleanId = String(jobId || '').trim();
  if (!cleanId) return null;

  const inMem = renderJobs.get(cleanId);
  if (inMem) {
    if (inMem.status === 'ready' && (!inMem.outputPath || !fs.existsSync(inMem.outputPath))) {
      renderJobs.delete(cleanId);
      savePersistentJobsIndex();
      return null;
    }
    return inMem;
  }

  // Fallback: check if the rendered MP4 file exists on persistent disk by jobId prefix
  try {
    ensurePersistentVideoDir();
    const files = fs.readdirSync(PERSISTENT_VIDEO_DIR);
    const matchFile = files.find((f) => f.startsWith(`${cleanId}_`) && f.endsWith('.mp4'));
    if (matchFile) {
      const fullPath = path.join(PERSISTENT_VIDEO_DIR, matchFile);
      const stat = fs.statSync(fullPath);
      if (stat.size >= 4096) {
        const qMatch = cleanId.match(/_q(\d{2})_/);
        const qNum = qMatch ? parseInt(qMatch[1], 10) : 1;
        return hydrateRenderJobFromPersistentStore({
          jobId: cleanId,
          questionNumber: qNum,
          partIndex: qNum,
          status: 'ready',
          progressPct: 100,
          filename: formatCanonicalQuizVideoFilename(qNum),
          outputPath: fullPath,
          sizeBytes: stat.size,
          durationMs: 12000,
          ftypVerified: true,
          createdAtMs: stat.mtimeMs,
        });
      }
    }
  } catch {
    // ignore disk scan error
  }

  return null;
}
