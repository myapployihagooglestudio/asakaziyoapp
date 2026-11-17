import crypto from 'crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  QURAN_RECITERS,
  SURAHS_LIST,
  getGlobalAyahNumber,
  getIslamicNetworkAyahUrl,
  getQuranReciterAudioCapabilities,
  getReciterAyahAudioUrl,
  resolveUnifiedAyahContent,
} from '../src/data/quranData';
import type {
  DailyQuranQuizSet,
  QuranQuizHidePosition,
  QuranQuizQuestion,
  QuranReciter,
} from '../src/types';

export const QURAN_QUIZ_GEMINI_MODEL = 'gemini-4-hydrogen';

// Short-phrase / Muqatta'at ayahs unsuitable for a "guess the missing last word" quiz
const EXCLUDED_AYAH_KEYS = new Set([
  '2:1',
  '3:1',
  '7:1',
  '19:1',
  '20:1',
  '26:1',
  '27:1',
  '28:1',
  '29:1',
  '30:1',
  '31:1',
  '32:1',
  '36:1',
  '38:1',
  '40:1',
  '41:1',
  '42:1',
  '42:2',
  '43:1',
  '44:1',
  '45:1',
  '46:1',
  '50:1',
  '68:1',
]);

// Priority pool of rich, diverse surahs across Juz Amma and famous surahs for crisp 9:16 Shorts clips
const DIVERSE_SURAH_NUMBERS: number[] = [
  1, 55, 67, 73, 75, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 109, 111,
  112, 113, 114, 12, 18, 24, 31, 36, 48, 49, 56, 59,
];

const MPEG1_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const MPEG2_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000];
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000];
const MPEG25_SAMPLE_RATES = [11025, 12000, 8000];

/**
 * Pure TypeScript MPEG Layer III frame parser to compute exact MP3 duration in milliseconds.
 * Rejects non-audio / HTML / corrupt payloads cleanly by returning 0.
 */
export function parseMp3DurationMs(buffer: Buffer): number {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return 0;

  let offset = 0;

  // Skip ID3v2 header if present
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + size;
  }

  // Strip trailing ID3v1 tag if present
  let limit = buffer.length;
  if (
    limit >= 128 &&
    buffer[limit - 128] === 0x54 &&
    buffer[limit - 127] === 0x41 &&
    buffer[limit - 126] === 0x47
  ) {
    limit -= 128;
  }

  let totalMs = 0;
  let validFrames = 0;

  while (offset + 4 <= limit) {
    // Frame sync: 11 bits set (0xFF followed by 0xE0 mask)
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }

    const header = buffer.readUInt32BE(offset);
    const versionBits = (header >> 19) & 0x03; // 0 = 2.5, 1 = reserved, 2 = 2, 3 = 1
    const layerBits = (header >> 17) & 0x03; // 1 = Layer III
    const bitrateIdx = (header >> 12) & 0x0f;
    const sampleRateIdx = (header >> 10) & 0x03;
    const paddingBit = (header >> 9) & 0x01;

    if (
      versionBits === 1 ||
      layerBits !== 1 ||
      bitrateIdx === 0 ||
      bitrateIdx === 15 ||
      sampleRateIdx === 3
    ) {
      offset += 1;
      continue;
    }

    const bitrateKbps =
      versionBits === 3 ? MPEG1_BITRATES[bitrateIdx] : MPEG2_BITRATES[bitrateIdx];
    const sampleRate =
      versionBits === 3
        ? MPEG1_SAMPLE_RATES[sampleRateIdx]
        : versionBits === 2
          ? MPEG2_SAMPLE_RATES[sampleRateIdx]
          : MPEG25_SAMPLE_RATES[sampleRateIdx];

    if (!bitrateKbps || !sampleRate) {
      offset += 1;
      continue;
    }

    const samplesPerFrame = versionBits === 3 ? 1152 : 576;
    const frameSize = Math.floor((samplesPerFrame * bitrateKbps * 1000) / (8 * sampleRate)) + paddingBit;

    if (frameSize < 4) {
      offset += 1;
      continue;
    }

    if (offset + frameSize > limit) {
      break;
    }

    totalMs += (samplesPerFrame / sampleRate) * 1000;
    validFrames += 1;
    offset += frameSize;
  }

  if (validFrames < 3) return 0;
  return Math.round(totalMs);
}

/**
 * Normalizes an Arabic word by stripping harakat/diacritics, tatweel, and Quranic annotation marks
 * so duplicate or near-identical answer choices can be caught reliably.
 */
export function normalizeArabicForComparison(word: string): string {
  return String(word || '')
    .normalize('NFC')
    // Remove Arabic harakat, small high signs, tatweel, and end-of-ayah markers
    .replace(/[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, '')
    // Normalize alif variants to bare alif for comparison
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize ta marbuta / ha and alif maqsura / ya for strict duplicate detection
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '')
    .trim();
}

const QURAN_TRAILING_MARKS_REGEX = /^([\u0600-\u06D5\u06EE-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)([\u06D6-\u06DD\u06DE\u06E9\s]*)$/;

function isPureAnnotationToken(token: string): boolean {
  const stripped = token.replace(/[\u06D6-\u06DD\u06DE\u06E9\u06DD0-9\u0660-\u0669۝۩ۖۗۘۙۚۛۜ\s]/g, '');
  return stripped.length === 0;
}

function cleanHiddenToken(rawToken: string): { clean: string; trailing: string } {
  let clean = rawToken;
  let inlineMarker = '';
  const match = rawToken.match(QURAN_TRAILING_MARKS_REGEX);
  if (match && match[1]) {
    clean = match[1].trim();
    inlineMarker = (match[2] || '').trim();
  }
  clean = clean.replace(/[\u06D6-\u06DD\u06DE\u06E9۝۩]+$/g, '').trim();
  return { clean, trailing: inlineMarker };
}

export interface SplitAyahQuizResult {
  hidePos: QuranQuizHidePosition;
  maskedArabicBefore: string;
  maskedArabicPrefix: string;
  maskedArabicAfter: string;
  hiddenWord: string;
  trailingMarker: string;
  spokenWordCount: number;
  hiddenWordCount: 1 | 2;
}

/**
 * Splits a canonical Arabic ayah by `hidePos` ('start' | 'middle' | 'end'), extracting `hiddenWord`
 * and preserving `maskedArabicBefore` / `maskedArabicAfter` + trailing waqf pause symbols cleanly.
 */
export function splitAyahForQuiz(
  textAr: string,
  requestedHidePos: QuranQuizHidePosition = 'end',
  wordCount: 1 | 2 = 1
): SplitAyahQuizResult {
  const rawTokens = String(textAr || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const trailingParts: string[] = [];
  const wordTokens = [...rawTokens];
  while (wordTokens.length > 0 && isPureAnnotationToken(wordTokens[wordTokens.length - 1])) {
    const popped = wordTokens.pop();
    if (popped) trailingParts.unshift(popped);
  }

  const spokenWords = wordTokens.filter((tok) => !isPureAnnotationToken(tok));
  if (spokenWords.length < 2) {
    return {
      hidePos: 'end',
      maskedArabicBefore: '',
      maskedArabicPrefix: '',
      maskedArabicAfter: '',
      hiddenWord: spokenWords[0] || '',
      trailingMarker: trailingParts.join(' '),
      spokenWordCount: spokenWords.length,
      hiddenWordCount: 1,
    };
  }

  let hidePos: QuranQuizHidePosition = requestedHidePos;
  if (hidePos === 'middle' && spokenWords.length < 6) {
    hidePos = spokenWords.length >= 5 ? 'start' : 'end';
  } else if (hidePos === 'start' && spokenWords.length < 4) {
    hidePos = 'end';
  }

  const resolvedHideCount: 1 | 2 =
    wordCount === 2 && spokenWords.length >= 7 ? 2 : 1;

  if (hidePos === 'start') {
    const headSlice = spokenWords.slice(0, resolvedHideCount);
    const afterSlice = spokenWords.slice(resolvedHideCount);
    const hiddenParts = headSlice.map((w) => cleanHiddenToken(w).clean).filter(Boolean);
    const hiddenWord = hiddenParts.join(' ').trim();
    const afterLastIdx = afterSlice.length - 1;
    let inlineMarker = '';
    if (afterLastIdx >= 0) {
      const cleanedEnd = cleanHiddenToken(afterSlice[afterLastIdx]);
      inlineMarker = cleanedEnd.trailing;
    }
    const maskedArabicAfter = afterSlice.join(' ').trim();
    const trailingMarker = [inlineMarker, ...trailingParts].filter(Boolean).join(' ').trim();
    return {
      hidePos: 'start',
      maskedArabicBefore: '',
      maskedArabicPrefix: maskedArabicAfter,
      maskedArabicAfter,
      hiddenWord,
      trailingMarker,
      spokenWordCount: spokenWords.length,
      hiddenWordCount: resolvedHideCount,
    };
  }

  if (hidePos === 'middle') {
    const midCount: 1 | 2 = resolvedHideCount === 2 && spokenWords.length >= 8 ? 2 : 1;
    const midStartIdx = Math.max(
      1,
      Math.min(
        spokenWords.length - midCount - 1,
        Math.floor((spokenWords.length - midCount) / 2)
      )
    );
    const beforeSlice = spokenWords.slice(0, midStartIdx);
    const hiddenSlice = spokenWords.slice(midStartIdx, midStartIdx + midCount);
    const afterSlice = spokenWords.slice(midStartIdx + midCount);
    const hiddenWord = hiddenSlice.map((w) => cleanHiddenToken(w).clean).filter(Boolean).join(' ').trim();
    const maskedArabicBefore = beforeSlice.join(' ').trim();
    const maskedArabicAfter = afterSlice.join(' ').trim();
    const trailingMarker = trailingParts.join(' ').trim();
    return {
      hidePos: 'middle',
      maskedArabicBefore,
      maskedArabicPrefix: maskedArabicBefore,
      maskedArabicAfter,
      hiddenWord,
      trailingMarker,
      spokenWordCount: spokenWords.length,
      hiddenWordCount: midCount,
    };
  }

  // Default: 'end'
  const tailSlice = spokenWords.slice(-resolvedHideCount);
  const prefixTokens = spokenWords.slice(0, -resolvedHideCount);
  const rawLastWord = tailSlice[tailSlice.length - 1] || '';
  const { clean: cleanTailLastWord, trailing: inlineMarker } = cleanHiddenToken(rawLastWord);

  const hiddenParts =
    resolvedHideCount === 2
      ? [cleanHiddenToken(tailSlice[0]).clean, cleanTailLastWord].filter(Boolean)
      : [cleanTailLastWord];
  const hiddenWord = hiddenParts.join(' ').trim();
  const maskedArabicBefore = prefixTokens.join(' ').trim();
  const trailingMarker = [inlineMarker, ...trailingParts].filter(Boolean).join(' ').trim();

  return {
    hidePos: 'end',
    maskedArabicBefore,
    maskedArabicPrefix: maskedArabicBefore,
    maskedArabicAfter: '',
    hiddenWord,
    trailingMarker,
    spokenWordCount: spokenWords.length,
    hiddenWordCount: resolvedHideCount,
  };
}

/**
 * Backward-compatible alias that hides final 1-2 spoken words ('end').
 */
export function splitAyahLastWord(
  textAr: string,
  wordCount: 1 | 2 = 1
): {
  maskedArabicPrefix: string;
  hiddenWord: string;
  trailingMarker: string;
  spokenWordCount: number;
  hiddenWordCount: 1 | 2;
} {
  const res = splitAyahForQuiz(textAr, 'end', wordCount);
  return {
    maskedArabicPrefix: res.maskedArabicPrefix,
    hiddenWord: res.hiddenWord,
    trailingMarker: res.trailingMarker,
    spokenWordCount: res.spokenWordCount,
    hiddenWordCount: res.hiddenWordCount,
  };
}

function createSeededRng(seedStr: string): () => number {
  const digest = crypto.createHash('sha256').update(seedStr).digest();
  let state = digest.readUInt32BE(0) || 1337;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export interface AyahCandidate {
  ayahKey: string;
  surahNumber: number;
  surahNameUz: string;
  surahNameAr: string;
  ayahNumberInSurah: number;
}

/**
 * Deterministically selects candidate ayahs across diverse surahs for a given date,
 * strictly excluding previously used ayahKeys (`"S:A"`) and respecting SURAHS_LIST ayah bounds.
 */
export function selectDiverseDailyCandidates(
  usedAyahKeys: Set<string>,
  dateStr: string,
  desiredCount = 24
): AyahCandidate[] {
  const rng = createSeededRng(`asaka_ziyo_quran_quiz_${dateStr}`);

  // Shuffle diverse surahs deterministically for today
  const surahMap = new Map(SURAHS_LIST.map((s) => [s.number, s]));
  const availableSurahNums = [
    ...DIVERSE_SURAH_NUMBERS,
    ...SURAHS_LIST.map((s) => s.number).filter((n) => !DIVERSE_SURAH_NUMBERS.includes(n)),
  ];

  // Fisher-Yates shuffle weighted: keep Juz Amma & medium surahs well-represented first
  const priorityPool = [...DIVERSE_SURAH_NUMBERS];
  for (let i = priorityPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [priorityPool[i], priorityPool[j]] = [priorityPool[j], priorityPool[i]];
  }

  const extraPool = availableSurahNums.slice(DIVERSE_SURAH_NUMBERS.length);
  for (let i = extraPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [extraPool[i], extraPool[j]] = [extraPool[j], extraPool[i]];
  }

  const orderedSurahs = [...priorityPool, ...extraPool];
  const candidates: AyahCandidate[] = [];
  const pickedKeys = new Set<string>();

  // First pass: 1 candidate per distinct surah, bounded strictly within 1..numberOfAyahs
  for (let pass = 0; pass < 3 && candidates.length < desiredCount; pass++) {
    for (const surahNum of orderedSurahs) {
      if (candidates.length >= desiredCount) break;
      const surah = surahMap.get(surahNum);
      if (!surah || surah.numberOfAyahs < 2) continue;

      // Skip ayah 1 of surahs where ayah 1 is Basmala or Muqatta'at (except Surah 1)
      const minAyah = surah.number === 1 ? 2 : surah.numberOfAyahs > 3 ? 2 : 1;
      const maxAyah = surah.numberOfAyahs;

      // Try up to 4 draws inside this surah
      for (let attempt = 0; attempt < 4; attempt++) {
        const ayahNum =
          minAyah + Math.floor(rng() * Math.max(1, maxAyah - minAyah + 1));
        const key = `${surah.number}:${ayahNum}`;
        if (
          !usedAyahKeys.has(key) &&
          !EXCLUDED_AYAH_KEYS.has(key) &&
          !pickedKeys.has(key)
        ) {
          pickedKeys.add(key);
          candidates.push({
            ayahKey: key,
            surahNumber: surah.number,
            surahNameUz: surah.nameUz,
            surahNameAr: surah.nameAr,
            ayahNumberInSurah: ayahNum,
          });
          break;
        }
      }
    }
  }

  return candidates;
}

export interface CanonicalAyahDetails {
  textAr: string;
  translationUz: string;
  translatorName: string;
  translationSource: string;
  tafsirTextUz: string;
  tafsirSource: string;
  tafsirScope: 'ayah' | 'surah' | 'none';
  juzNumber?: number;
}

export async function fetchCanonicalAyahDetails(
  surahNumber: number,
  ayahNumberInSurah: number
): Promise<CanonicalAyahDetails> {
  const localUnified = resolveUnifiedAyahContent(surahNumber, ayahNumberInSurah, 'uz-Latn');
  if (localUnified.textAr && localUnified.translationUz) {
    return {
      textAr: localUnified.textAr,
      translationUz: localUnified.translationUz,
      translatorName: localUnified.translatorName,
      translationSource: localUnified.translationSource,
      tafsirTextUz: localUnified.tafsirTextUz,
      tafsirSource: localUnified.tafsirSource,
      tafsirScope: localUnified.tafsirScope,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumberInSurah}/editions/quran-uthmani,uz.sodik`,
      { signal: controller.signal }
    );
    if (resp.ok) {
      const payload: any = await resp.json();
      const editions = Array.isArray(payload?.data) ? payload.data : [];
      const arEdition = editions.find((e: any) => e?.edition?.identifier === 'quran-uthmani') || editions[0];
      const uzEdition = editions.find((e: any) => e?.edition?.identifier === 'uz.sodik') || editions[1];
      const textAr = localUnified.textAr || String(arEdition?.text || '').trim();
      const apiTranslationUz = String(uzEdition?.text || '').trim();
      const translationUz = localUnified.translationUz || apiTranslationUz;
      const juzNumber = Number(arEdition?.juz) || undefined;
      if (textAr) {
        return {
          textAr,
          translationUz,
          translatorName: translationUz
            ? localUnified.translatorName || 'Shayx Muhammad Sodiq Muhammad Yusuf'
            : '',
          translationSource: translationUz
            ? localUnified.translationSource || 'Tafsiri Hilol (Hilol Nashr · uz.sodik)'
            : '',
          tafsirTextUz: localUnified.tafsirTextUz,
          tafsirSource: localUnified.tafsirSource,
          tafsirScope: localUnified.tafsirScope,
          juzNumber,
        };
      }
    }

    // Fallback to single Arabic Uthmani endpoint (zero fabricated translation)
    const fallbackResp = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumberInSurah}/quran-uthmani`,
      { signal: controller.signal }
    );
    if (!fallbackResp.ok) {
      throw new Error(`Quran text API returned HTTP ${fallbackResp.status}`);
    }
    const fallbackPayload: any = await fallbackResp.json();
    const text = localUnified.textAr || String(fallbackPayload?.data?.text || '').trim();
    if (!text) {
      throw new Error(`Empty Arabic text for ${surahNumber}:${ayahNumberInSurah}`);
    }
    return {
      textAr: text,
      translationUz: localUnified.translationUz,
      translatorName: localUnified.translatorName,
      translationSource: localUnified.translationSource,
      tafsirTextUz: localUnified.tafsirTextUz,
      tafsirSource: localUnified.tafsirSource,
      tafsirScope: localUnified.tafsirScope,
      juzNumber: Number(fallbackPayload?.data?.juz) || undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCanonicalAyahText(
  surahNumber: number,
  ayahNumberInSurah: number
): Promise<string> {
  const details = await fetchCanonicalAyahDetails(surahNumber, ayahNumberInSurah);
  return details.textAr;
}

export async function fetchAndMeasureAyahAudio(audioUrl: string): Promise<{
  buffer: Buffer;
  durationMs: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(audioUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AsakaZiyoAudioQuiz/1.0',
        Accept: 'audio/mpeg, audio/*;q=0.9',
      },
    });
    if (!resp.ok) {
      throw new Error(`Audio fetch HTTP ${resp.status} for ${audioUrl}`);
    }
    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error(`Unexpected HTML response instead of audio for ${audioUrl}`);
    }
    const arrayBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const durationMs = parseMp3DurationMs(buffer);
    if (durationMs <= 0) {
      throw new Error(`Invalid or corrupt MP3 frame data from ${audioUrl}`);
    }
    return { buffer, durationMs };
  } finally {
    clearTimeout(timer);
  }
}

export interface GeminiAyahAnalysisRaw {
  pauseRatio?: number;
  resumeRatio?: number;
  startTimeMs: number;
  pauseBeforeLastWordMs: number;
  endTimeMs: number;
  distractors: string[];
}

export interface ValidatedGeminiAnalysis {
  pauseRatio: number;
  resumeRatio: number;
  startTimeMs: number;
  pauseBeforeLastWordMs: number;
  endTimeMs: number;
  distractors: [string, string, string];
}

function clampRatio(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(4));
}

/**
 * Validates Gemini's audio-derived slice ratios/timestamps and 3 Arabic distractors strictly against
 * true MP3 duration and canonical Arabic orthography. Never allows the hidden word to be pronounced
 * during the question phase for any hidePos ('start' | 'middle' | 'end').
 */
export function validateGeminiAnalysisResult(
  raw: Partial<GeminiAyahAnalysisRaw> | null | undefined,
  audioDurationMs: number,
  hiddenWord: string,
  hidePos: QuranQuizHidePosition = 'end'
): ValidatedGeminiAnalysis | null {
  if (!raw || typeof raw !== 'object' || audioDurationMs < 2000) return null;

  let pauseRatio = Number(raw.pauseRatio);
  let resumeRatio = Number(raw.resumeRatio);
  let startTimeMs = Math.round(Number(raw.startTimeMs));
  let pauseBeforeLastWordMs = Math.round(Number(raw.pauseBeforeLastWordMs));
  let endTimeMs = Math.round(Number(raw.endTimeMs));

  const hasValidRatios =
    Number.isFinite(pauseRatio) &&
    pauseRatio > 0 &&
    pauseRatio < 1 &&
    Number.isFinite(resumeRatio) &&
    resumeRatio > 0 &&
    resumeRatio < 1;

  if (hidePos === 'end') {
    if (!Number.isFinite(pauseRatio) || pauseRatio <= 0 || pauseRatio >= 1) {
      if (Number.isFinite(pauseBeforeLastWordMs) && pauseBeforeLastWordMs > 0) {
        pauseRatio = pauseBeforeLastWordMs / audioDurationMs;
      } else {
        return null;
      }
    }

    if (pauseRatio < 0.25 || pauseRatio > 0.93) return null;
    pauseRatio = clampRatio(pauseRatio, 0.25, 0.93);
    resumeRatio = Number.isFinite(resumeRatio) && resumeRatio >= pauseRatio && resumeRatio <= 1
      ? clampRatio(resumeRatio, pauseRatio, 1.0)
      : pauseRatio;

    if (!Number.isFinite(startTimeMs) || startTimeMs < 0) startTimeMs = 0;
    pauseBeforeLastWordMs = Math.round(audioDurationMs * pauseRatio);
    if (!Number.isFinite(endTimeMs) || endTimeMs <= pauseBeforeLastWordMs || endTimeMs > audioDurationMs) {
      endTimeMs = audioDurationMs;
    }

    // Check legacy reversed-timestamps safeguard if startTimeMs & endTimeMs were explicitly supplied
    if (
      Number.isFinite(Number(raw.pauseBeforeLastWordMs)) &&
      Number.isFinite(Number(raw.endTimeMs)) &&
      Number(raw.endTimeMs) <= audioDurationMs &&
      Number(raw.pauseBeforeLastWordMs) >= Number(raw.endTimeMs)
    ) {
      return null;
    }

    if (pauseBeforeLastWordMs - startTimeMs < 500) return null;
    if (endTimeMs - pauseBeforeLastWordMs < 250) return null;
  } else if (hidePos === 'start') {
    if (!hasValidRatios && (!Number.isFinite(resumeRatio) || resumeRatio <= 0 || resumeRatio >= 1)) {
      if (Number.isFinite(pauseBeforeLastWordMs) && pauseBeforeLastWordMs > 0) {
        resumeRatio = pauseBeforeLastWordMs / audioDurationMs;
      } else {
        return null;
      }
    }
    if (resumeRatio < 0.06 || resumeRatio > 0.78) return null;
    resumeRatio = clampRatio(resumeRatio, 0.06, 0.78);
    pauseRatio = resumeRatio;

    const skippedMs = Math.round(audioDurationMs * resumeRatio);
    const remainingMs = audioDurationMs - skippedMs;
    if (skippedMs < 250 || remainingMs < 500) return null;

    startTimeMs = skippedMs;
    pauseBeforeLastWordMs = skippedMs;
    endTimeMs = audioDurationMs;
  } else {
    // hidePos === 'middle'
    if (!Number.isFinite(pauseRatio) || pauseRatio <= 0 || pauseRatio >= 1) {
      if (Number.isFinite(pauseBeforeLastWordMs) && pauseBeforeLastWordMs > 0) {
        pauseRatio = pauseBeforeLastWordMs / audioDurationMs;
      } else {
        return null;
      }
    }
    if (pauseRatio < 0.15 || pauseRatio > 0.78) return null;
    pauseRatio = clampRatio(pauseRatio, 0.15, 0.78);
    if (!Number.isFinite(resumeRatio) || resumeRatio < pauseRatio + 0.05 || resumeRatio > 0.94) {
      resumeRatio = clampRatio(Math.min(0.92, pauseRatio + 0.18), pauseRatio + 0.05, 0.94);
    } else {
      resumeRatio = clampRatio(resumeRatio, pauseRatio + 0.05, 0.94);
    }

    startTimeMs = 0;
    pauseBeforeLastWordMs = Math.round(audioDurationMs * pauseRatio);
    endTimeMs = audioDurationMs;
    if (pauseBeforeLastWordMs < 500 || audioDurationMs - pauseBeforeLastWordMs < 500) return null;
  }

  const targetWordCount = Math.max(
    1,
    Math.min(2, String(hiddenWord || '').trim().split(/\s+/).filter(Boolean).length || 1)
  );
  const rawDistractors = Array.isArray(raw.distractors) ? raw.distractors : [];
  const normalizedTarget = normalizeArabicForComparison(hiddenWord);
  const seenNormalized = new Set<string>([normalizedTarget]);
  const cleanDistractors: string[] = [];

  for (const item of rawDistractors) {
    const tokens = String(item || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, targetWordCount);
    const cleanWord = tokens
      .join(' ')
      .replace(/[\u06D6-\u06DD\u06DE\u06E9۝۩]+$/g, '')
      .trim();
    if (!cleanWord) continue;
    if (!/[\u0600-\u06FF]/.test(cleanWord)) continue;
    const norm = normalizeArabicForComparison(cleanWord);
    if (!norm || seenNormalized.has(norm)) continue;
    seenNormalized.add(norm);
    cleanDistractors.push(cleanWord);
    if (cleanDistractors.length === 3) break;
  }

  if (cleanDistractors.length !== 3) return null;

  return {
    pauseRatio,
    resumeRatio,
    startTimeMs,
    pauseBeforeLastWordMs,
    endTimeMs,
    distractors: [cleanDistractors[0], cleanDistractors[1], cleanDistractors[2]],
  };
}

export function shuffleQuestionOptions(
  hiddenWord: string,
  distractors: [string, string, string],
  seedStr: string
): { options: string[]; correctIndex: number } {
  const rng = createSeededRng(seedStr);
  const combined = [
    { text: hiddenWord, isCorrect: true },
    { text: distractors[0], isCorrect: false },
    { text: distractors[1], isCorrect: false },
    { text: distractors[2], isCorrect: false },
  ];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  const correctIndex = combined.findIndex((item) => item.isCorrect);
  return {
    options: combined.map((item) => item.text),
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  };
}

export const FREE_TIER_QUIZ_MODELS = [
  QURAN_QUIZ_GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
] as const;

export class GeminiQuotaExhaustedError extends Error {
  public readonly retryAfterSeconds: number;
  public readonly modelsTried: string[];

  constructor(message: string, retryAfterSeconds: number, modelsTried: string[]) {
    super(message);
    this.name = 'GeminiQuotaExhaustedError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.modelsTried = modelsTried;
  }
}

export interface ParsedGeminiErrorInfo {
  isQuotaExceeded: boolean;
  isModelNotFound: boolean;
  isAuthError: boolean;
  retryAfterSeconds: number;
  rawMessage: string;
}

export function parseQuotaErrorInfo(err: unknown): ParsedGeminiErrorInfo {
  const anyErr = err as any;
  const status = Number(anyErr?.status || anyErr?.error?.code || 0);
  let rawMessage = String(anyErr?.message || anyErr || '');
  if (!rawMessage && typeof anyErr === 'object' && anyErr !== null) {
    try {
      rawMessage = JSON.stringify(anyErr);
    } catch {
      rawMessage = 'Unknown Gemini error';
    }
  }

  const isQuotaExceeded =
    status === 429 ||
    rawMessage.includes('"code":429') ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.toLowerCase().includes('quota exceeded') ||
    rawMessage.toLowerCase().includes('rate limit');

  const isModelNotFound =
    status === 404 ||
    rawMessage.includes('"code":404') ||
    rawMessage.includes('NOT_FOUND') ||
    rawMessage.toLowerCase().includes('not found');

  const isAuthError =
    status === 401 ||
    status === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID');

  let retryAfterSeconds = 3600;
  const retrySecMatch = rawMessage.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retrySecMatch?.[1]) {
    retryAfterSeconds = Math.max(30, Number(retrySecMatch[1]) || 3600);
  } else {
    const hmsMatch = rawMessage.match(/Please retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
    if (hmsMatch) {
      const h = Number(hmsMatch[1] || 0);
      const m = Number(hmsMatch[2] || 0);
      const s = Math.ceil(Number(hmsMatch[3] || 0));
      const total = h * 3600 + m * 60 + s;
      if (total > 0) retryAfterSeconds = total;
    }
  }

  return {
    isQuotaExceeded,
    isModelNotFound,
    isAuthError,
    retryAfterSeconds,
    rawMessage,
  };
}

export interface PreparedQuizCandidate {
  candidate: AyahCandidate;
  globalAyahNumber?: number;
  audioUrl: string;
  fallbackAudioUrl?: string;
  audioBuffer: Buffer;
  audioDurationMs: number;
  fullArabicText: string;
  hidePos?: QuranQuizHidePosition;
  maskedArabicBefore?: string;
  maskedArabicPrefix: string;
  maskedArabicAfter?: string;
  hiddenWord: string;
  hiddenWordCount: 1 | 2;
  trailingMarker: string;
  translationUz?: string;
  translatorName?: string;
  translationSource?: string;
  tafsirTextUz?: string;
  tafsirSource?: string;
  tafsirScope?: 'ayah' | 'surah' | 'none';
  juzNumber?: number;
}

export interface BatchGeminiAnalysisItem extends Partial<GeminiAyahAnalysisRaw> {
  ayahKey?: string;
}

const modelQuotaCooldownUntil = new Map<string, number>();
const modelQuotaReportedRetrySec = new Map<string, number>();
const unavailableModels = new Set<string>();

function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getCandidateFreeTierModels(): string[] {
  const ordered = new Set<string>(FREE_TIER_QUIZ_MODELS);
  const envModelRaw = (process.env.GEMINI_MODEL || '').trim();
  if (
    envModelRaw &&
    envModelRaw !== 'gemini-2.5-flash' &&
    !envModelRaw.includes('argon') &&
    !envModelRaw.includes('carbon') &&
    !envModelRaw.includes('pro')
  ) {
    ordered.add(envModelRaw);
  }
  return Array.from(ordered).filter((m) => !unavailableModels.has(m));
}

async function invokeGeminiBatchAudioAnalysis(
  ai: GoogleGenAI,
  modelName: string,
  batch: PreparedQuizCandidate[]
): Promise<BatchGeminiAnalysisItem[]> {
  const isV3OrV4 = modelName.includes('gemini-4') || modelName.includes('gemini-3');
  const config: Record<string, any> = {
    systemInstruction:
      'You are an expert Quranic Tajweed audio aligner and Arabic computational linguist. You will receive short single-ayah Quran MP3 clips with their ayahKey and hidePos ("start", "middle", or "end"). Measure EXACT fractional audio boundaries pauseRatio and resumeRatio (0.0..1.0) so hiddenWord is NEVER heard prematurely before reveal. Return ONLY valid JSON.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ayahKey: {
                type: Type.STRING,
                description: 'Exact ayahKey matching the clip header, e.g. 103:2',
              },
              pauseRatio: {
                type: Type.NUMBER,
                description:
                  'Fraction (0.0..1.0) of audioDurationMs right BEFORE hiddenWord begins (conservative: stop a fraction earlier so hiddenWord syllable is never heard for hidePos=end or middle; for hidePos=start, set equal to resumeRatio).',
              },
              resumeRatio: {
                type: Type.NUMBER,
                description:
                  'Fraction (0.0..1.0) of audioDurationMs right AFTER hiddenWord ends (for hidePos=start, question phase starts from duration * resumeRatio so hiddenWord is completely skipped; for hidePos=end/middle, where remainder starts).',
              },
              startTimeMs: {
                type: Type.INTEGER,
                description: 'Timestamp in ms when vocal recitation begins for this clip',
              },
              pauseBeforeLastWordMs: {
                type: Type.INTEGER,
                description: 'Timestamp in ms matching pauseRatio * audioDurationMs',
              },
              endTimeMs: {
                type: Type.INTEGER,
                description: 'Timestamp in ms when vocal recitation finishes (<= audioDurationMs)',
              },
              distractors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Exactly 3 plausible Arabic Quranic distractor choices matching the word count, harakat, and syntax role of hiddenWord',
              },
            },
            required: [
              'ayahKey',
              'pauseRatio',
              'resumeRatio',
              'startTimeMs',
              'pauseBeforeLastWordMs',
              'endTimeMs',
              'distractors',
            ],
          },
        },
      },
      required: ['items'],
    },
  };

  if (isV3OrV4) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  batch.forEach((item, index) => {
    const hPos = item.hidePos || 'end';
    contents.push({
      text: [
        `CLIP ${index + 1}:`,
        `ayahKey=${item.candidate.ayahKey}`,
        `surah=${item.candidate.surahNumber} (${item.candidate.surahNameUz}), ayah=${item.candidate.ayahNumberInSurah}`,
        `audioDurationMs=${item.audioDurationMs}`,
        `hidePos=${hPos}`,
        `fullArabicText="${item.fullArabicText}"`,
        `maskedArabicBefore="${item.maskedArabicBefore ?? item.maskedArabicPrefix}"`,
        `hiddenWord="${item.hiddenWord}"`,
        `maskedArabicAfter="${item.maskedArabicAfter || ''}"`,
        `hiddenWordCount=${item.hiddenWordCount}`,
      ].join(' | '),
    });
    contents.push({
      inlineData: {
        mimeType: 'audio/mpeg',
        data: item.audioBuffer.toString('base64'),
      },
    });
  });

  contents.push({
    text: [
      `Analyze ALL ${batch.length} labeled Quran audio clips above in one response and return JSON { "items": [...] }.`,
      `CRITICAL AUDIO-HIDING RULES:`,
      `- When hidePos="end": pauseRatio (0.0..1.0) MUST be right BEFORE hiddenWord starts (e.g. pause at breath/space before final word). Set resumeRatio = pauseRatio.`,
      `- When hidePos="start": resumeRatio (0.0..1.0) MUST be right AFTER hiddenWord finishes and maskedArabicAfter begins (so playing from duration * resumeRatio never speaks hiddenWord!). Set pauseRatio = resumeRatio.`,
      `- When hidePos="middle": pauseRatio MUST be right BEFORE hiddenWord begins (playing 0..duration*pauseRatio), and resumeRatio MUST be right AFTER hiddenWord ends (resumeRatio > pauseRatio).`,
      `- distractors: EXACTLY 3 plausible Arabic Quranic choices with full tashkeel (harakat) matching word count (${batch[0]?.hiddenWordCount || 1}..2), grammatical case & syntax role of hiddenWord, strictly distinct in spelling from hiddenWord.`,
    ].join('\n'),
  });

  const response = await Promise.race([
    ai.models.generateContent({
      model: modelName,
      contents,
      config,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini batch audio timeout (${modelName})`)), 32000)
    ),
  ]);

  const rawText = response.text || '';
  if (!rawText) return [];
  try {
    const parsed = JSON.parse(rawText);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function mapBatchItemsToQuestions(params: {
  rawItems: BatchGeminiAnalysisItem[];
  batchCandidates: PreparedQuizCandidate[];
  reciterId: string;
  reciterName: string;
  aiModel: string;
  existingSurahNumbers?: Set<number>;
}): QuranQuizQuestion[] {
  const byAyahKey = new Map<string, PreparedQuizCandidate>();
  for (const cand of params.batchCandidates) {
    byAyahKey.set(cand.candidate.ayahKey, cand);
  }

  const seenAyahKeys = new Set<string>();
  const seenSurahs = new Set<number>(params.existingSurahNumbers || []);
  const results: QuranQuizQuestion[] = [];
  const analyzedAt = new Date().toISOString();

  for (const raw of params.rawItems) {
    const key = String(raw?.ayahKey || '').trim();
    if (!key || seenAyahKeys.has(key)) continue;
    const prepared = byAyahKey.get(key);
    if (!prepared) continue;
    if (seenSurahs.has(prepared.candidate.surahNumber)) continue;

    const hidePos: QuranQuizHidePosition = prepared.hidePos || 'end';
    const validated = validateGeminiAnalysisResult(
      raw,
      prepared.audioDurationMs,
      prepared.hiddenWord,
      hidePos
    );
    if (!validated) continue;

    const { options, correctIndex } = shuffleQuestionOptions(
      prepared.hiddenWord,
      validated.distractors,
      `${prepared.candidate.ayahKey}_${params.reciterId}_${validated.pauseBeforeLastWordMs}`
    );

    seenAyahKeys.add(key);
    seenSurahs.add(prepared.candidate.surahNumber);

    // Strictly use verified translation and tafsir from the Quran section (never Gemini-generated)
    const fallbackUnified = resolveUnifiedAyahContent(
      prepared.candidate.surahNumber,
      prepared.candidate.ayahNumberInSurah,
      'uz-Latn'
    );
    const translationUz =
      (prepared.translationUz && prepared.translationUz.trim()) || fallbackUnified.translationUz;
    const translatorName =
      prepared.translatorName || (translationUz ? fallbackUnified.translatorName : '');
    const translationSource =
      prepared.translationSource || (translationUz ? fallbackUnified.translationSource : '');
    const tafsirTextUz = prepared.tafsirTextUz ?? fallbackUnified.tafsirTextUz;
    const tafsirSource = prepared.tafsirSource ?? fallbackUnified.tafsirSource;
    const tafsirScope = prepared.tafsirScope ?? fallbackUnified.tafsirScope;

    const globalAyahNumber =
      prepared.globalAyahNumber ||
      getGlobalAyahNumber(prepared.candidate.surahNumber, prepared.candidate.ayahNumberInSurah);

    const maskedArabicBefore = prepared.maskedArabicBefore ?? prepared.maskedArabicPrefix;
    const maskedArabicAfter = prepared.maskedArabicAfter ?? '';

    results.push({
      id: `qq_${prepared.candidate.surahNumber}_${prepared.candidate.ayahNumberInSurah}_${params.reciterId}`,
      ayahKey: prepared.candidate.ayahKey,
      globalAyahNumber,
      surahNumber: prepared.candidate.surahNumber,
      surahNameUz: prepared.candidate.surahNameUz,
      surahNameAr: prepared.candidate.surahNameAr,
      ayahNumberInSurah: prepared.candidate.ayahNumberInSurah,
      juzNumber: prepared.juzNumber,
      reciterId: params.reciterId,
      reciterName: params.reciterName,
      audioUrl: prepared.audioUrl,
      fallbackAudioUrl: prepared.fallbackAudioUrl || '',
      audioDurationMs: prepared.audioDurationMs,
      fullArabicText: prepared.fullArabicText,
      hidePos,
      maskedArabicBefore,
      maskedArabicPrefix: prepared.maskedArabicPrefix,
      maskedArabicAfter,
      hiddenWord: prepared.hiddenWord,
      hiddenWordCount: prepared.hiddenWordCount,
      trailingMarker: prepared.trailingMarker,
      translationUz,
      translatorName,
      translationSource,
      tafsirTextUz,
      tafsirSource,
      tafsirScope,
      pauseRatio: validated.pauseRatio,
      resumeRatio: validated.resumeRatio,
      startTimeMs: validated.startTimeMs,
      pauseBeforeLastWordMs: validated.pauseBeforeLastWordMs,
      endTimeMs: validated.endTimeMs,
      startSec: Number((validated.startTimeMs / 1000).toFixed(3)),
      pauseSec: Number((validated.pauseBeforeLastWordMs / 1000).toFixed(3)),
      endSec: Number((validated.endTimeMs / 1000).toFixed(3)),
      options,
      correctIndex,
      aiModel: params.aiModel,
      analyzedAt,
    });
  }

  return results;
}

async function analyzeCandidateBatchWithFallback(params: {
  batch: PreparedQuizCandidate[];
  reciterId: string;
  reciterName: string;
  existingSurahNumbers: Set<number>;
}): Promise<{ questions: QuranQuizQuestion[]; lastErrorMsg: string }> {
  const ai = getGeminiClient();
  const now = Date.now();
  const candidateModels = getCandidateFreeTierModels();

  const modelsTried: string[] = [];
  let maxRetryAfterSec = 0;
  let quotaFailures = 0;
  let lastErrorMsg = '';

  for (const modelName of candidateModels) {
    const cooldownUntil = modelQuotaCooldownUntil.get(modelName) || 0;
    if (cooldownUntil > now) {
      modelsTried.push(modelName);
      quotaFailures += 1;
      maxRetryAfterSec = Math.max(
        maxRetryAfterSec,
        modelQuotaReportedRetrySec.get(modelName) || Math.ceil((cooldownUntil - now) / 1000)
      );
      continue;
    }

    modelsTried.push(modelName);
    try {
      const rawItems = await invokeGeminiBatchAudioAnalysis(ai, modelName, params.batch);
      const questions = mapBatchItemsToQuestions({
        rawItems,
        batchCandidates: params.batch,
        reciterId: params.reciterId,
        reciterName: params.reciterName,
        aiModel: modelName,
        existingSurahNumbers: params.existingSurahNumbers,
      });
      return { questions, lastErrorMsg };
    } catch (err: any) {
      const parsedErr = parseQuotaErrorInfo(err);
      lastErrorMsg = parsedErr.rawMessage;

      if (parsedErr.isAuthError) {
        throw new Error(parsedErr.rawMessage);
      }
      if (parsedErr.isModelNotFound) {
        unavailableModels.add(modelName);
        continue;
      }
      if (parsedErr.isQuotaExceeded) {
        quotaFailures += 1;
        maxRetryAfterSec = Math.max(maxRetryAfterSec, parsedErr.retryAfterSeconds);
        // Cooldown in-memory for up to 10 minutes so repeated user taps don't spam 429
        const cooldownMs = Math.min(Math.max(parsedErr.retryAfterSeconds, 60), 600) * 1000;
        modelQuotaCooldownUntil.set(modelName, Date.now() + cooldownMs);
        modelQuotaReportedRetrySec.set(modelName, parsedErr.retryAfterSeconds);
        continue;
      }
      // Transient timeout/network error on this model -> try next model cleanly
      continue;
    }
  }

  if (quotaFailures > 0 && quotaFailures >= modelsTried.length) {
    throw new GeminiQuotaExhaustedError(
      `Gemini API bepul kunlik kvotasi barcha modellar (${modelsTried.join(', ')}) uchun vaqtincha tugagan.`,
      maxRetryAfterSec || 3600,
      modelsTried
    );
  }

  return { questions: [], lastErrorMsg };
}

async function prepareCandidateBatch(
  candidates: AyahCandidate[],
  resolveAudioUrls: (surahNum: number, ayahNum: number) => { primaryUrl: string; fallbackUrl: string },
  excludedSurahs: Set<number>,
  desiredCount: number,
  dateStr: string
): Promise<PreparedQuizCandidate[]> {
  const eligiblePool = candidates.filter((c) => !excludedSurahs.has(c.surahNumber));
  const prepared: PreparedQuizCandidate[] = [];
  const usedSurahs = new Set<number>(excludedSurahs);
  const hideCycle: QuranQuizHidePosition[] = ['end', 'start', 'middle', 'end'];

  // Prepare in small parallel waves (zero Gemini API cost) until we have `desiredCount` clean clips
  const waveSize = 6;
  for (let i = 0; i < eligiblePool.length && prepared.length < desiredCount; i += waveSize) {
    const slice = eligiblePool.slice(i, i + waveSize + 2);
    const results = await Promise.all(
      slice.map(async (candidate, sliceIdx): Promise<PreparedQuizCandidate | null> => {
        if (usedSurahs.has(candidate.surahNumber)) return null;
        try {
          const details = await fetchCanonicalAyahDetails(
            candidate.surahNumber,
            candidate.ayahNumberInSurah
          );
          const fullArabicText = details.textAr;
          const desiredHidePos =
            hideCycle[(i + sliceIdx + candidate.surahNumber + dateStr.length) % hideCycle.length];
          const probe = splitAyahForQuiz(fullArabicText, desiredHidePos, 1);
          const preferTwoWords: 1 | 2 =
            probe.spokenWordCount >= 9 && candidate.surahNumber % 2 === 0 ? 2 : 1;
          const split =
            preferTwoWords === 2
              ? splitAyahForQuiz(fullArabicText, desiredHidePos, 2)
              : probe;

          const hasContextWords =
            split.hidePos === 'start'
              ? Boolean(split.maskedArabicAfter)
              : split.hidePos === 'middle'
                ? Boolean(split.maskedArabicBefore && split.maskedArabicAfter)
                : Boolean(split.maskedArabicBefore);

          if (
            split.spokenWordCount < 4 ||
            split.spokenWordCount > 24 ||
            !split.hiddenWord ||
            !hasContextWords
          ) {
            return null;
          }

          const { primaryUrl, fallbackUrl } = resolveAudioUrls(
            candidate.surahNumber,
            candidate.ayahNumberInSurah
          );

          let chosenUrl = primaryUrl;
          let measured: { buffer: Buffer; durationMs: number };
          try {
            measured = await fetchAndMeasureAyahAudio(primaryUrl);
          } catch {
            if (!fallbackUrl || fallbackUrl === primaryUrl) throw new Error('Audio unavailable');
            chosenUrl = fallbackUrl;
            measured = await fetchAndMeasureAyahAudio(fallbackUrl);
          }

          if (measured.durationMs < 2400 || measured.durationMs > 28000) {
            return null;
          }

          const globalAyahNumber = getGlobalAyahNumber(
            candidate.surahNumber,
            candidate.ayahNumberInSurah
          );

          return {
            candidate,
            globalAyahNumber,
            audioUrl: chosenUrl,
            fallbackAudioUrl: fallbackUrl,
            audioBuffer: measured.buffer,
            audioDurationMs: measured.durationMs,
            fullArabicText,
            hidePos: split.hidePos,
            maskedArabicBefore: split.maskedArabicBefore,
            maskedArabicPrefix: split.maskedArabicPrefix,
            maskedArabicAfter: split.maskedArabicAfter,
            hiddenWord: split.hiddenWord,
            hiddenWordCount: split.hiddenWordCount,
            trailingMarker: split.trailingMarker,
            translationUz: details.translationUz,
            translatorName: details.translatorName,
            translationSource: details.translationSource,
            tafsirTextUz: details.tafsirTextUz,
            tafsirSource: details.tafsirSource,
            tafsirScope: details.tafsirScope,
            juzNumber: details.juzNumber,
          };
        } catch {
          return null;
        }
      })
    );

    for (const item of results) {
      if (item && !usedSurahs.has(item.candidate.surahNumber) && prepared.length < desiredCount) {
        usedSurahs.add(item.candidate.surahNumber);
        prepared.push(item);
      }
    }
  }

  return prepared;
}

/**
 * Generates 10 verified, Gemini Audio+JSON analyzed Quran quiz questions from 10 distinct surahs
 * using single-request multi-audio batching (1 Gemini call instead of 10-36 calls),
 * never repeating `usedAyahKeys`, and never substituting another reciter's voice.
 */
export async function generateDailyQuranQuizSet(params: {
  dateStr: string;
  reciterId: string;
  usedAyahKeys: string[];
  customReciters?: Array<Partial<QuranReciter>>;
}): Promise<DailyQuranQuizSet> {
  if (!(process.env.GEMINI_API_KEY || '').trim()) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const targetCount = 10;
  const usedSet = new Set(
    (params.usedAyahKeys || []).map((k) => String(k).trim()).filter(Boolean)
  );

  // Merge canonical reciters with Firestore custom reciters cleanly (same logic as Quran section)
  const reciterMap = new Map<string, Partial<QuranReciter>>();
  for (const c of QURAN_RECITERS) {
    reciterMap.set(c.id, { ...c });
  }
  if (Array.isArray(params.customReciters)) {
    for (const r of params.customReciters) {
      if (r?.id) {
        const existing = reciterMap.get(r.id) || {};
        reciterMap.set(r.id, { ...existing, ...r });
      }
    }
  }
  const activeReciters = Array.from(reciterMap.values()).filter(
    (r) => r.isActive !== false && !(r as any).isArchived
  );
  const reciterObj = activeReciters.find((r) => r.id === params.reciterId);
  if (!reciterObj || !reciterObj.id) {
    throw new Error(`RECITER_NOT_FOUND: Tanlangan qori (${params.reciterId}) faol roʻyxatda topilmadi.`);
  }

  const caps = getQuranReciterAudioCapabilities(reciterObj);
  if (!caps.hasPerAyahAudio) {
    throw new Error(
      `RECITER_NO_AYAH_AUDIO: "${reciterObj.name || reciterObj.id}" uchun oyatma-oyat tilovat bazasi mavjud emas (${caps.statusLabelUz}).`
    );
  }

  const resolvedReciterId = reciterObj.id;
  const resolvedReciterName = reciterObj.name || resolvedReciterId;

  const resolveAudioUrls = (
    surahNum: number,
    ayahNum: number
  ): { primaryUrl: string; fallbackUrl: string } => {
    const base = reciterObj.ayahServerBaseUrl?.trim().replace(/\/$/, '');
    const slug = String(reciterObj.islamicNetworkIdentifier || '').trim();
    const fallbackUrl = slug
      ? `https://cdn.islamic.network/quran/audio/128/${slug}/${getGlobalAyahNumber(surahNum, ayahNum)}.mp3`
      : getIslamicNetworkAyahUrl(resolvedReciterId, surahNum, ayahNum);
    if (base) {
      const s = String(surahNum).padStart(3, '0');
      const a = String(ayahNum).padStart(3, '0');
      return { primaryUrl: `${base}/${s}${a}.mp3`, fallbackUrl };
    }
    return {
      primaryUrl: getReciterAyahAudioUrl(resolvedReciterId, surahNum, ayahNum) || fallbackUrl,
      fallbackUrl,
    };
  };

  let candidates = selectDiverseDailyCandidates(usedSet, params.dateStr, 36);
  if (candidates.length < targetCount) {
    candidates = selectDiverseDailyCandidates(new Set<string>(), `${params.dateStr}_reset`, 36);
  }

  const acceptedQuestions: QuranQuizQuestion[] = [];
  const usedSurahsInQuiz = new Set<number>();
  let lastErrorMsg = '';

  // Wave 1: Prepare 12 valid MP3 clips & send ALL 12 in ONE single Gemini request
  const primaryBatch = await prepareCandidateBatch(
    candidates,
    resolveAudioUrls,
    usedSurahsInQuiz,
    12,
    params.dateStr
  );

  if (primaryBatch.length > 0) {
    const { questions, lastErrorMsg: batchErr } = await analyzeCandidateBatchWithFallback({
      batch: primaryBatch,
      reciterId: resolvedReciterId,
      reciterName: resolvedReciterName,
      existingSurahNumbers: usedSurahsInQuiz,
    });
    if (batchErr) lastErrorMsg = batchErr;
    for (const q of questions) {
      if (!usedSurahsInQuiz.has(q.surahNumber) && acceptedQuestions.length < targetCount) {
        usedSurahsInQuiz.add(q.surahNumber);
        acceptedQuestions.push(q);
      }
    }
  }

  // Wave 2 (only if strict validator trimmed a few items): at most 1 small top-up batch request
  if (acceptedQuestions.length < targetCount) {
    const attemptedKeys = new Set(primaryBatch.map((b) => b.candidate.ayahKey));
    const remainingPool = candidates.filter((c) => !attemptedKeys.has(c.ayahKey));
    const neededTopUp = Math.min(8, targetCount - acceptedQuestions.length + 3);
    const secondaryBatch = await prepareCandidateBatch(
      remainingPool,
      resolveAudioUrls,
      usedSurahsInQuiz,
      neededTopUp,
      params.dateStr
    );
    if (secondaryBatch.length > 0) {
      const { questions, lastErrorMsg: batchErr } = await analyzeCandidateBatchWithFallback({
        batch: secondaryBatch,
        reciterId: resolvedReciterId,
        reciterName: resolvedReciterName,
        existingSurahNumbers: usedSurahsInQuiz,
      });
      if (batchErr) lastErrorMsg = batchErr;
      for (const q of questions) {
        if (!usedSurahsInQuiz.has(q.surahNumber) && acceptedQuestions.length < targetCount) {
          usedSurahsInQuiz.add(q.surahNumber);
          acceptedQuestions.push(q);
        }
      }
    }
  }

  if (acceptedQuestions.length < targetCount) {
    throw new Error(
      `Gemini audio tahlili yetarli (${targetCount} ta) oyatni tasdiqlay olmadi (${acceptedQuestions.length} ta tayyor boʻldi). ${lastErrorMsg ? `Sabab: ${lastErrorMsg}` : ''}`
    );
  }

  const nowIso = new Date().toISOString();
  return {
    id: `${params.dateStr}_${resolvedReciterId}`,
    dateStr: params.dateStr,
    reciterId: resolvedReciterId,
    reciterName: resolvedReciterName,
    questions: acceptedQuestions,
    usedAyahKeys: acceptedQuestions.map((q) => q.ayahKey),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

