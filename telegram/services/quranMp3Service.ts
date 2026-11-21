/**
 * ASAKA ZIYO — Unified Quran MP3 Audio Library & Admin Audio Management Engine
 *
 * Single source of truth connecting Web App / Android App Quran audio catalog
 * (`src/data/quranData.ts` + live Firestore/DB `quranReciters` & `quranAudioOverrides`)
 * directly to the Telegram Bot QUR'ON MP3 section, Hifz Audio Murojaa, and Admin Audio Panel.
 *
 * GUARANTEES:
 * 1. Strict (reciterId, surahNumber) integrity — NEVER mixes reciters or substitutes a wrong surah.
 * 2. Reuses verified existing CDN URLs (mp3quran.net / quranicaudio.com) and Telegram `file_id`
 *    caching so large MP3 files are never unnecessarily duplicated or re-uploaded.
 * 3. Safe local vault file serving with `path.resolve` confinement inside `data/uploads` and
 *    audio magic-byte + size validation (<= 50MB Telegram Bot API limit).
 * 4. Bulk multi-file / manifest / ZIP filename-to-surah matching ALWAYS produces a preview requiring
 *    explicit admin confirmation and NEVER auto-assigns ambiguous or invalid filenames.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  QURAN_RECITERS,
  SURAHS_LIST,
  getReciterSurahAudioUrl,
  padNumber,
} from '../../src/data/quranData';
import type { QuranReciter, Surah } from '../../src/types';
import {
  TelegramCentralAdminWriter,
  TelegramLocale,
  TelegramReplyMarkup,
} from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramRepository } from '../database/telegramRepository';
import { CentralContentProvider } from '../content/centralContentProvider';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';

export const DEFAULT_TELEGRAM_RECITER_ID = 'mishary';
export const MAX_TELEGRAM_AUDIO_BYTES = 50 * 1024 * 1024; // Telegram Bot API 50 MB limit
const UPLOADS_ROOT_DIR = path.resolve(process.cwd(), 'data', 'uploads');

export interface ResolvedQuranReciter extends QuranReciter {
  isCanonical: boolean;
  nameUz: string;
  styleUz: string;
  serverUrl: string;
  availableSurahsCount: number;
  availableSurahCount: number;
  missingSurahNumbers: number[];
  missingSurahs: number[];
  brokenLocalFilesCount: number;
}

export interface ResolvedSurahTrack {
  reciterId: string;
  reciterName: string;
  reciterNameAr: string;
  surahNumber: number;
  surahNameUz: string;
  surahNameAr: string;
  numberOfAyahs: number;
  audioUrl: string;
  storagePath?: string;
  sourceKind: 'remote_https' | 'local_vault' | 'missing';
  localFileExists?: boolean;
  available: boolean;
  mimeType: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  durationLabel: string;
  checksum?: string;
  status: 'ready' | 'missing' | 'broken_local_file';
  cachedTelegramFileId?: string;
  updatedAt?: string;
  uploadedBy?: string;
}

export type ResolvedSurahAudioTrack = ResolvedSurahTrack;

export interface QuranLibraryAuditReport {
  auditedAt: string;
  totalReciters: number;
  canonicalRecitersCount: number;
  customRecitersCount: number;
  totalExpectedTracks: number;
  totalReadyTracks: number;
  totalAvailableTracks: number;
  totalMissingTracks: number;
  totalBrokenLocalFiles: number;
  reciters: Array<{
    id: string;
    name: string;
    nameUz: string;
    nameAr: string;
    isCanonical: boolean;
    isActive: boolean;
    sourceBase: string;
    readySurahs: number;
    availableSurahCount: number;
    missingSurahs: number[];
    missingSurahsCount: number;
    brokenLocalFiles: number;
    missingSample: number[];
  }>;
}

export interface BulkImportCandidateItem {
  originalPath: string;
  fileName: string;
  detectedSurahNumber: number | null;
  surahNameUz?: string;
  sourceUrl?: string;
  status: 'matched' | 'ambiguous' | 'unrecognized' | 'duplicate_surah' | 'invalid_format';
  reason: string;
}

export interface BulkImportPreviewPlan {
  planId: string;
  reciterId: string;
  reciterName: string;
  createdAt: string;
  createdBy: string;
  items: BulkImportCandidateItem[];
  matchedCount: number;
  ambiguousCount: number;
  unmatchedCount: number;
  confirmed: boolean;
}

const CANONICAL_IDS = new Set(QURAN_RECITERS.map((r) => r.id));

/**
 * Estimates reasonable surah recitation duration in seconds from ayah count when
 * explicit audio duration metadata is not yet stored (average ~10s per ayah, min 35s).
 */
export function estimateSurahDurationSeconds(surahNumber: number): number {
  const s = SURAHS_LIST.find((item) => item.number === surahNumber);
  if (!s) return 120;
  if (surahNumber === 1) return 45;
  if (surahNumber === 2) return 7500;
  return Math.max(30, Math.min(7500, s.numberOfAyahs * 9));
}

export function formatDurationLabel(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validates audio file binary header (MP3 ID3v2 / MPEG frame sync, WAV RIFF, OGG OggS, M4A ftyp)
 * and size constraints so HTML or malicious/corrupt uploads are strictly rejected.
 */
export function validateAudioBuffer(
  buffer: Buffer,
  mimeType = 'audio/mpeg'
): { valid: boolean; detectedFormat?: string; sha256?: string; error?: string } {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    return { valid: false, error: 'Audio fayl boʻsh yoki juda kichik (<16 bayt).' };
  }
  if (buffer.length > MAX_TELEGRAM_AUDIO_BYTES) {
    return {
      valid: false,
      error: `Audio fayl hajmi 50 MB Telegram limitidan oshib ketdi (${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  // Reject HTML / script / executable payloads explicitly
  const headAscii = buffer.subarray(0, 64).toString('utf8').trimStart().toLowerCase();
  if (
    headAscii.startsWith('<!doctype') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<script') ||
    headAscii.startsWith('<?xml')
  ) {
    return { valid: false, error: 'HTML/XML hujjat audio sifatida qabul qilinmaydi.' };
  }

  const b0 = buffer[0];
  const b1 = buffer[1];
  const magic4 = buffer.subarray(0, 4).toString('ascii');
  const ftyp = buffer.subarray(4, 8).toString('ascii');

  let detectedFormat: string | undefined;
  if (magic4.startsWith('ID3') || (b0 === 0xff && (b1 & 0xe0) === 0xe0)) {
    detectedFormat = 'audio/mpeg';
  } else if (magic4 === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
    detectedFormat = 'audio/wav';
  } else if (magic4 === 'OggS') {
    detectedFormat = 'audio/ogg';
  } else if (ftyp === 'ftyp') {
    detectedFormat = 'audio/mp4';
  } else if (mimeType.toLowerCase().startsWith('audio/') && buffer.length >= 64) {
    // Allow valid raw MPEG frames without leading ID3 only if sync word appears in first 256 bytes
    for (let i = 0; i < Math.min(254, buffer.length - 1); i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        detectedFormat = 'audio/mpeg';
        break;
      }
    }
  }

  if (!detectedFormat) {
    return {
      valid: false,
      error: 'Audio fayl formati tasdiqlanmadi (faqat haqiqiy MP3, M4A, OGG yoki WAV fayllar qabul qilinadi).',
    };
  }

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return { valid: true, detectedFormat, sha256 };
}

/**
 * Parses a filename or path into a Surah number (1..114) strictly.
 * Supported clear standards:
 * - `reciter_01/001.mp3`, `001.mp3`, `114.mp3`
 * - `surah-036.mp3`, `sura_001.mp3`
 * - `036_Yosin.mp3`, `114.Nas surasi-Odiljon qori.mp3`
 * Never guesses when no clear 1..114 surah number is present!
 */
export function matchFilenameToSurahNumber(rawPath: string): {
  surahNumber: number | null;
  status: BulkImportCandidateItem['status'];
  reason: string;
} {
  const clean = rawPath.trim();
  const baseName = clean.split(/[\\/]/).pop() || clean;
  const lower = baseName.toLowerCase();

  if (!/\.(mp3|m4a|ogg|wav)$/i.test(lower)) {
    return {
      surahNumber: null,
      status: 'invalid_format',
      reason: 'Audio kengaytmasi (.mp3/.m4a/.ogg/.wav) topilmadi.',
    };
  }

  const stem = baseName.replace(/\.[^.]+$/, '').trim();

  // Pattern 1: Exact 1-3 digit number: "001", "114", "36"
  if (/^\d{1,3}$/.test(stem)) {
    const n = Number.parseInt(stem, 10);
    if (n >= 1 && n <= 114) {
      return { surahNumber: n, status: 'matched', reason: 'Aniq 3-xonali raqamli standart' };
    }
    return { surahNumber: null, status: 'unrecognized', reason: `Sura raqami 1–114 oraligʻidan tashqarida (${n}).` };
  }

  // Pattern 2: Leading surah number with separator: "001_Fotiha", "114.Nas surasi", "36-Yosin"
  const leading = stem.match(/^(?:surah?[-_\s]*)?(\d{1,3})(?:[-_.\s]|$)/i);
  if (leading) {
    const n = Number.parseInt(leading[1], 10);
    if (n >= 1 && n <= 114) {
      return { surahNumber: n, status: 'matched', reason: 'Fayl boshidagi sura raqami boʻyicha moslashtirildi' };
    }
    return { surahNumber: null, status: 'unrecognized', reason: `Notoʻgʻri sura raqami: ${n}` };
  }

  // Pattern 3: Exact surah Uzbek name match (only if unique!)
  const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]/g, '');
  const byName = SURAHS_LIST.filter((s) => {
    const normUz = s.nameUz.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normUz.length >= 3 && normalizedStem.includes(normUz);
  });
  if (byName.length === 1) {
    return {
      surahNumber: byName[0].number,
      status: 'matched',
      reason: `Sura nomi (${byName[0].nameUz}) orqali moslashtirildi`,
    };
  }
  if (byName.length > 1) {
    return {
      surahNumber: null,
      status: 'ambiguous',
      reason: `Bir nechta suraga mos keldi (${byName.map((s) => s.nameUz).join(', ')}); admin aniqlashtirishi shart.`,
    };
  }

  return {
    surahNumber: null,
    status: 'unrecognized',
    reason: 'Sura raqami yoki nomi aniqlanmadi; avtomatik biriktirilmadi.',
  };
}

/**
 * Resolves a `/uploads/...` relative audio URL strictly inside `data/uploads`.
 * Protects against path traversal (`../`).
 */
export function resolveConfinedUploadPath(audioUrl: string): string | null {
  if (!audioUrl.startsWith('/uploads/')) return null;
  const rel = audioUrl.slice('/uploads/'.length).replace(/^\/+/, '');
  const resolved = path.resolve(UPLOADS_ROOT_DIR, rel);
  if (!resolved.startsWith(UPLOADS_ROOT_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

export class TelegramQuranMp3Service {
  private readonly repository: TelegramRepository;
  private readonly centralContent: CentralContentProvider;
  private readonly apiClient: TelegramApiClient;
  private readonly emojiRegistry?: CustomEmojiRegistry;
  private readonly centralAdminWriter?: TelegramCentralAdminWriter;
  private readonly fetchImpl?: typeof fetch;
  private readonly pendingBulkPlans = new Map<string, BulkImportPreviewPlan>();
  /** In-memory overlay for tests / serverless mode when centralAdminWriter is not attached */
  private readonly localReciterOverrides = new Map<string, QuranReciter>();
  private readonly localTrackOverrides = new Map<string, Record<string, any>>();

  constructor(deps: {
    repository: TelegramRepository;
    centralContent: CentralContentProvider;
    apiClient: TelegramApiClient;
    emojiRegistry?: CustomEmojiRegistry;
    centralAdminWriter?: TelegramCentralAdminWriter;
    fetchImpl?: typeof fetch;
  }) {
    this.repository = deps.repository;
    this.centralContent = deps.centralContent;
    this.apiClient = deps.apiClient;
    this.emojiRegistry = deps.emojiRegistry;
    this.centralAdminWriter = deps.centralAdminWriter;
    this.fetchImpl = deps.fetchImpl;
  }

  private getMergedAudioOverrides(): Record<string, any> {
    const snap = this.centralContent.getSnapshot();
    const central = (snap.quranAudioOverrides || {}) as Record<string, any>;
    const merged: Record<string, any> = { ...central };
    for (const [k, v] of this.localTrackOverrides.entries()) {
      merged[k] = v;
    }
    return merged;
  }

  listReciters(options?: { includeInactive?: boolean }): ResolvedQuranReciter[] {
    const snap = this.centralContent.getSnapshot();
    const overrides = this.getMergedAudioOverrides();
    const byId = new Map<string, QuranReciter>();

    // 1. Seed all 9 canonical reciters from Web/Android quranData.ts
    for (const c of QURAN_RECITERS) {
      byId.set(c.id, { ...c });
    }

    // 2. Merge live custom/edited reciters from Central DB (Firestore-backed)
    for (const r of snap.quranReciters || []) {
      if (!r?.id) continue;
      const base = byId.get(r.id);
      byId.set(r.id, base ? { ...base, ...r } : { ...r });
    }

    // 3. Merge local session overrides
    for (const [id, r] of this.localReciterOverrides.entries()) {
      const base = byId.get(id);
      byId.set(id, base ? { ...base, ...r } : { ...r });
    }

    const result: ResolvedQuranReciter[] = [];
    for (const r of byId.values()) {
      if (!options?.includeInactive && r.isActive === false) continue;
      const isCanonical = CANONICAL_IDS.has(r.id);
      const hasBaseServer = Boolean(r.surahServerBaseUrl && r.surahServerBaseUrl.trim());
      const missingSurahNumbers: number[] = [];
      let brokenLocalFilesCount = 0;

      for (let s = 1; s <= 114; s++) {
        const ov = overrides[`${r.id}_${s}`];
        if (ov && ov.audioUrl && ov.status !== 'missing' && ov.publicationStatus !== 'archived') {
          const url = String(ov.audioUrl).trim();
          if (url.startsWith('/uploads/')) {
            const diskPath = resolveConfinedUploadPath(url);
            if (!diskPath || !fs.existsSync(diskPath)) {
              brokenLocalFilesCount++;
              if (!isCanonical && !hasBaseServer) {
                missingSurahNumbers.push(s);
              }
            }
          }
          continue;
        }
        if (!isCanonical && !hasBaseServer) {
          missingSurahNumbers.push(s);
        }
      }

      const availableSurahsCount = 114 - missingSurahNumbers.length;
      result.push({
        ...r,
        nameUz: r.name,
        styleUz: r.style || 'Murattal',
        serverUrl: r.surahServerBaseUrl || '',
        isActive: r.isActive !== false,
        isCanonical,
        uploadedSurahsCount: availableSurahsCount,
        missingSurahsCount: missingSurahNumbers.length,
        availableSurahsCount,
        availableSurahCount: availableSurahsCount,
        missingSurahNumbers,
        missingSurahs: missingSurahNumbers,
        brokenLocalFilesCount,
      });
    }

    return result;
  }

  getReciter(reciterId: string, includeInactive = false): ResolvedQuranReciter | null {
    return (
      this.listReciters({ includeInactive }).find((r) => r.id === reciterId) || null
    );
  }

  getSurah(surahNumber: number): Surah | null {
    const n = Math.floor(Number(surahNumber));
    if (n < 1 || n > 114) return null;
    return SURAHS_LIST.find((s) => s.number === n) || null;
  }

  /**
   * Resolves the EXACT track for `(reciterId, surahNumber)`.
   * NEVER falls back to another reciter's audio!
   */
  resolveSurahTrack(reciterId: string, surahNumber: number): ResolvedSurahTrack | null {
    const reciter = this.getReciter(reciterId, true);
    const surah = this.getSurah(surahNumber);
    if (!reciter || !surah) return null;

    const overrides = this.getMergedAudioOverrides();
    const key = `${reciter.id}_${surah.number}`;
    const ov = overrides[key];
    const cache = this.repository.getSettings().quranAudioFileIdCache || {};
    const cached = cache[key];

    let audioUrl = '';
    let storagePath: string | undefined;
    let mimeType = 'audio/mpeg';
    let fileSizeBytes: number | undefined;
    let durationSeconds: number | undefined;
    let checksum: string | undefined;
    let updatedAt: string | undefined;
    let uploadedBy: string | undefined;

    if (ov && ov.audioUrl && ov.status !== 'missing' && ov.publicationStatus !== 'archived') {
      audioUrl = String(ov.audioUrl).trim();
      storagePath = ov.storagePath ? String(ov.storagePath) : undefined;
      mimeType = String(ov.fileFormat || ov.mimeType || 'audio/mpeg');
      fileSizeBytes = typeof ov.fileSizeBytes === 'number' ? ov.fileSizeBytes : undefined;
      durationSeconds = typeof ov.durationSeconds === 'number' ? ov.durationSeconds : undefined;
      checksum = ov.checksum ? String(ov.checksum) : undefined;
      updatedAt = ov.updatedAt ? String(ov.updatedAt) : undefined;
      uploadedBy = ov.updatedBy ? String(ov.updatedBy) : undefined;
    } else if (reciter.isCanonical) {
      audioUrl = getReciterSurahAudioUrl(reciter.id, surah.number);
    } else if (reciter.surahServerBaseUrl && reciter.surahServerBaseUrl.trim()) {
      const base = reciter.surahServerBaseUrl.trim().replace(/\/+$/, '');
      audioUrl = `${base}/${padNumber(surah.number, 3)}.mp3`;
    }

    const effectiveDuration = durationSeconds || estimateSurahDurationSeconds(surah.number);
    const durationLabel = formatDurationLabel(effectiveDuration);

    if (!audioUrl) {
      return {
        reciterId: reciter.id,
        reciterName: reciter.name,
        reciterNameAr: reciter.nameAr || '',
        surahNumber: surah.number,
        surahNameUz: surah.nameUz,
        surahNameAr: surah.nameAr,
        numberOfAyahs: surah.numberOfAyahs,
        audioUrl: '',
        sourceKind: 'missing',
        available: false,
        mimeType,
        durationSeconds: effectiveDuration,
        durationLabel,
        status: 'missing',
      };
    }

    if (audioUrl.startsWith('/uploads/')) {
      const diskPath = resolveConfinedUploadPath(audioUrl);
      const exists = Boolean(diskPath && fs.existsSync(diskPath));
      return {
        reciterId: reciter.id,
        reciterName: reciter.name,
        reciterNameAr: reciter.nameAr || '',
        surahNumber: surah.number,
        surahNameUz: surah.nameUz,
        surahNameAr: surah.nameAr,
        numberOfAyahs: surah.numberOfAyahs,
        audioUrl,
        storagePath,
        sourceKind: 'local_vault',
        localFileExists: exists,
        available: exists,
        mimeType,
        fileSizeBytes: exists && diskPath ? fs.statSync(diskPath).size : fileSizeBytes,
        durationSeconds: effectiveDuration,
        durationLabel,
        checksum,
        status: exists ? 'ready' : 'broken_local_file',
        cachedTelegramFileId:
          cached && cached.sourceUrlOrPath === audioUrl ? cached.fileId : undefined,
        updatedAt,
        uploadedBy,
      };
    }

    return {
      reciterId: reciter.id,
      reciterName: reciter.name,
      reciterNameAr: reciter.nameAr || '',
      surahNumber: surah.number,
      surahNameUz: surah.nameUz,
      surahNameAr: surah.nameAr,
      numberOfAyahs: surah.numberOfAyahs,
      audioUrl,
      storagePath,
      sourceKind: 'remote_https',
      available: true,
      mimeType,
      fileSizeBytes,
      durationSeconds: effectiveDuration,
      durationLabel,
      checksum,
      status: 'ready',
      cachedTelegramFileId:
        cached && cached.sourceUrlOrPath === audioUrl ? cached.fileId : undefined,
      updatedAt,
      uploadedBy,
    };
  }

  /**
   * Lists all 114 surah track descriptors for a single reciter.
   */
  listReciterTracks(reciterId: string): ResolvedSurahTrack[] {
    const tracks: ResolvedSurahTrack[] = [];
    for (let s = 1; s <= 114; s++) {
      const t = this.resolveSurahTrack(reciterId, s);
      if (t) tracks.push(t);
    }
    return tracks;
  }

  listSurahTracksForReciter(reciterId: string): ResolvedSurahTrack[] {
    return this.listReciterTracks(reciterId);
  }

  /**
   * Runs a full diagnostic audit of every reciter and all 114 surahs per reciter.
   */
  runFullCatalogAudit(): QuranLibraryAuditReport {
    const reciters = this.listReciters({ includeInactive: true });
    let totalReadyTracks = 0;
    let totalMissingTracks = 0;
    let totalBrokenLocalFiles = 0;

    const summaries = reciters.map((r) => {
      totalReadyTracks += r.availableSurahsCount;
      totalMissingTracks += r.missingSurahNumbers.length;
      totalBrokenLocalFiles += r.brokenLocalFilesCount;
      return {
        id: r.id,
        name: r.name,
        nameUz: r.name,
        nameAr: r.nameAr || '',
        isCanonical: r.isCanonical,
        isActive: r.isActive !== false,
        sourceBase: r.surahServerBaseUrl || 'server_vault (custom uploads)',
        readySurahs: r.availableSurahsCount,
        availableSurahCount: r.availableSurahsCount,
        missingSurahs: r.missingSurahNumbers,
        missingSurahsCount: r.missingSurahNumbers.length,
        brokenLocalFiles: r.brokenLocalFilesCount,
        missingSample: r.missingSurahNumbers.slice(0, 10),
      };
    });

    return {
      auditedAt: new Date().toISOString(),
      totalReciters: reciters.length,
      canonicalRecitersCount: reciters.filter((r) => r.isCanonical).length,
      customRecitersCount: reciters.filter((r) => !r.isCanonical).length,
      totalExpectedTracks: reciters.length * 114,
      totalReadyTracks,
      totalAvailableTracks: totalReadyTracks,
      totalMissingTracks,
      totalBrokenLocalFiles,
      reciters: summaries,
    };
  }

  /**
   * Live HTTP HEAD / disk check for a specific reciter & surah track.
   */
  async verifyTrackHealth(
    reciterId: string,
    surahNumber: number,
    fetchFn: typeof fetch = fetch
  ): Promise<{ ok: boolean; statusCode?: number; contentType?: string; sizeBytes?: number; error?: string }> {
    const track = this.resolveSurahTrack(reciterId, surahNumber);
    if (!track || track.status === 'missing') {
      return { ok: false, error: 'Audio manbasi topilmadi (missing).' };
    }
    if (track.sourceKind === 'local_vault') {
      const diskPath = resolveConfinedUploadPath(track.audioUrl);
      if (!diskPath || !fs.existsSync(diskPath)) {
        return { ok: false, error: 'Lokal audio fayli server xotirasida topilmadi.' };
      }
      const stat = fs.statSync(diskPath);
      const buf = fs.readFileSync(diskPath);
      const val = validateAudioBuffer(buf, track.mimeType);
      return {
        ok: val.valid,
        statusCode: val.valid ? 200 : 422,
        contentType: val.detectedFormat,
        sizeBytes: stat.size,
        error: val.error,
      };
    }

    try {
      const resp = await fetchFn(track.audioUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(7000),
      });
      const ct = resp.headers.get('content-type') || '';
      const cl = Number(resp.headers.get('content-length') || 0) || undefined;
      const isAudio = ct.toLowerCase().includes('audio') || ct.toLowerCase().includes('octet-stream');
      if (!resp.ok || !isAudio) {
        return {
          ok: false,
          statusCode: resp.status,
          contentType: ct,
          error: `Audio URL yaroqsiz javob qaytardi: HTTP ${resp.status} (${ct})`,
        };
      }
      return { ok: true, statusCode: resp.status, contentType: ct, sizeBytes: cl };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Sends a Quran Surah MP3 into Telegram's native music player (`sendAudio`),
   * leveraging `file_id` caching and safe local-vault buffer upload when needed,
   * with automatic retry on transient failure and user listening stats tracking.
   */
  async sendSurahAudioToChat(params: {
    chatId: number | string;
    telegramId: string;
    reciterId: string;
    surahNumber: number;
    locale?: TelegramLocale;
    emoji?: CustomEmojiRegistry;
    captionPrefix?: string;
    replyMarkup?: TelegramReplyMarkup;
  }): Promise<{
    ok: boolean;
    usedCachedFileId: boolean;
    fileId?: string;
    track?: ResolvedSurahTrack;
    error?: string;
  }> {
    const effectiveLocale: TelegramLocale = params.locale || 'uz-Latn';
    const effectiveEmoji = params.emoji || this.emojiRegistry || new CustomEmojiRegistry();
    const track = this.resolveSurahTrack(params.reciterId, params.surahNumber);
    if (!track) {
      return { ok: false, usedCachedFileId: false, error: 'Qori yoki sura topilmadi.' };
    }
    if (track.status !== 'ready') {
      return {
        ok: false,
        usedCachedFileId: false,
        track,
        error:
          track.status === 'broken_local_file'
            ? `${track.reciterName} — ${track.surahNumber}-sura audio fayli server xotirasida topilmadi (admin qayta yuklashi kerak).`
            : `${track.reciterName} uchun ${track.surahNumber}-sura (${track.surahNameUz}) audio fayli hali yuklanmagan.`,
      };
    }

    const title = `${padNumber(track.surahNumber, 3)}. ${track.surahNameUz} (${track.surahNameAr})`;
    const performer = track.reciterName;
    const prefixLine = params.captionPrefix ? `${params.captionPrefix}\n` : '';
    const rawCaption =
      `${prefixLine}{{emoji:quran_mp3}} ${track.surahNumber}. ${track.surahNameUz} — ${track.surahNameAr}\n` +
      `{{emoji:quran_mp3}} ${track.reciterName}\n` +
      `{{emoji:quran}} ${track.numberOfAyahs} oyat · {{emoji:notifications}} ~${track.durationLabel}`;
    const formattedCaption = effectiveEmoji.formatMessage(
      effectiveLocale === 'uz-Latn-new' ? toNewUzbekAlphabet(rawCaption) : rawCaption
    );

    const cacheKey = `${track.reciterId}_${track.surahNumber}`;
    let usedCachedFileId = false;
    let res;

    // Strategy 1: Cached Telegram file_id (zero bandwidth, instant delivery)
    if (track.cachedTelegramFileId) {
      usedCachedFileId = true;
      res = await this.apiClient.sendAudio({
        chat_id: params.chatId,
        audio: track.cachedTelegramFileId,
        title,
        performer,
        duration: track.durationSeconds,
        caption: formattedCaption.text,
        ...(formattedCaption.entities.length > 0
          ? { caption_entities: formattedCaption.entities }
          : {}),
        reply_markup: params.replyMarkup,
      });
      if (!res.ok) {
        // Cached file_id expired or invalid — fall through to fresh send
        usedCachedFileId = false;
      }
    }

    // Strategy 2: Local server vault binary upload
    if (!res || !res.ok) {
      if (track.sourceKind === 'local_vault') {
        const diskPath = resolveConfinedUploadPath(track.audioUrl);
        if (!diskPath || !fs.existsSync(diskPath)) {
          return {
            ok: false,
            usedCachedFileId: false,
            track,
            error: 'Lokal audio fayli server xotirasida mavjud emas.',
          };
        }
        const audioBuffer = fs.readFileSync(diskPath);
        const val = validateAudioBuffer(audioBuffer, track.mimeType);
        if (!val.valid) {
          return { ok: false, usedCachedFileId: false, track, error: val.error };
        }
        res = await this.apiClient.sendAudioBuffer({
          chat_id: params.chatId,
          audioBuffer,
          filename: `${track.reciterId}_${padNumber(track.surahNumber, 3)}.mp3`,
          mimeType: val.detectedFormat || 'audio/mpeg',
          title,
          performer,
          duration: track.durationSeconds,
          caption: formattedCaption.text,
          reply_markup: params.replyMarkup,
        });
      } else {
        // Strategy 3: Direct HTTPS CDN URL (Telegram fetches directly)
        res = await this.apiClient.sendAudio({
          chat_id: params.chatId,
          audio: track.audioUrl,
          title,
          performer,
          duration: track.durationSeconds,
          caption: formattedCaption.text,
          ...(formattedCaption.entities.length > 0
            ? { caption_entities: formattedCaption.entities }
            : {}),
          reply_markup: params.replyMarkup,
        });
        // One retry on transient network/5xx error
        if (!res.ok && (res.error_code === 500 || res.error_code === 502 || res.error_code === 503)) {
          res = await this.apiClient.sendAudio({
            chat_id: params.chatId,
            audio: track.audioUrl,
            title,
            performer,
            duration: track.durationSeconds,
            caption: formattedCaption.text,
            reply_markup: params.replyMarkup,
          });
        }
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        usedCachedFileId,
        track,
        error: res.description || 'Telegram sendAudio xatoligi yuz berdi.',
      };
    }

    // Cache returned Telegram file_id permanently in settings for instant future replay
    const returnedFileId = res.result?.audio?.file_id;
    if (returnedFileId && !usedCachedFileId) {
      const settings = this.repository.getSettings();
      const nextCache = { ...(settings.quranAudioFileIdCache || {}) };
      nextCache[cacheKey] = {
        fileId: returnedFileId,
        sourceUrlOrPath: track.audioUrl,
        checksum: track.checksum,
        cachedAt: new Date().toISOString(),
      };
      // Bound cache size cleanly (keep max 1500 entries)
      const keys = Object.keys(nextCache);
      if (keys.length > 1500) {
        for (const oldKey of keys.slice(0, keys.length - 1500)) {
          delete nextCache[oldKey];
        }
      }
      await this.repository.saveSettings({ quranAudioFileIdCache: nextCache }, 'system');
    }

    // Record user listening history, resume point & statistics
    await this.recordUserListen(params.telegramId, track);

    return {
      ok: true,
      usedCachedFileId,
      fileId: returnedFileId || track.cachedTelegramFileId,
      track,
    };
  }

  async recordUserListen(telegramId: string, track: ResolvedSurahTrack): Promise<void> {
    const eng = this.repository.getUserEngagement(telegramId);
    const nowIso = new Date().toISOString();
    const title = `${track.surahNumber}. ${track.surahNameUz} — ${track.reciterName}`;
    const prevHistory = Array.isArray(eng.audioListeningHistory) ? eng.audioListeningHistory : [];
    const filteredHistory = prevHistory.filter(
      (h) => !(h.reciterId === track.reciterId && h.surahNumber === track.surahNumber)
    );
    const nextHistory = [
      {
        reciterId: track.reciterId,
        surahNumber: track.surahNumber,
        title,
        playedAt: nowIso,
      },
      ...filteredHistory,
    ].slice(0, 30);

    const prevStats = eng.audioListeningStats || { totalPlays: 0, totalEstimatedMinutes: 0 };
    const estMins = Math.max(1, Math.round((track.durationSeconds || 60) / 60));

    await this.repository.saveUserEngagement({
      ...eng,
      preferredReciterId: track.reciterId,
      audioResume: {
        audioId: `${track.reciterId}_${track.surahNumber}`,
        title,
        reciterId: track.reciterId,
        surahNumber: track.surahNumber,
        updatedAt: nowIso,
      },
      audioListeningHistory: nextHistory,
      audioListeningStats: {
        totalPlays: prevStats.totalPlays + 1,
        totalEstimatedMinutes: prevStats.totalEstimatedMinutes + estMins,
        lastReciterId: track.reciterId,
        lastSurahNumber: track.surahNumber,
        lastPlayedAt: nowIso,
      },
    });
  }

  async toggleFavoriteReciter(telegramId: string, reciterId: string): Promise<{ isFavorite: boolean }> {
    const eng = this.repository.getUserEngagement(telegramId);
    const current = Array.isArray(eng.favoriteReciterIds) ? [...eng.favoriteReciterIds] : [];
    const idx = current.indexOf(reciterId);
    let isFavorite = false;
    if (idx >= 0) {
      current.splice(idx, 1);
      isFavorite = false;
    } else {
      current.unshift(reciterId);
      isFavorite = true;
    }
    await this.repository.saveUserEngagement({
      ...eng,
      favoriteReciterIds: current.slice(0, 25),
    });
    return { isFavorite };
  }

  async toggleFavoriteSurahTrack(
    telegramId: string,
    reciterId: string,
    surahNumber: number
  ): Promise<{ isFavorite: boolean }> {
    const eng = this.repository.getUserEngagement(telegramId);
    const track = this.resolveSurahTrack(reciterId, surahNumber);
    const current = Array.isArray(eng.favoriteSurahTracks) ? [...eng.favoriteSurahTracks] : [];
    const idx = current.findIndex(
      (f) => f.reciterId === reciterId && f.surahNumber === surahNumber
    );
    let isFavorite = false;
    if (idx >= 0) {
      current.splice(idx, 1);
      isFavorite = false;
    } else {
      current.unshift({
        reciterId,
        surahNumber,
        title: track
          ? `${track.surahNumber}. ${track.surahNameUz} — ${track.reciterName}`
          : `${surahNumber}-sura (${reciterId})`,
        addedAt: new Date().toISOString(),
      });
      isFavorite = true;
    }
    await this.repository.saveUserEngagement({
      ...eng,
      favoriteSurahTracks: current.slice(0, 100),
    });
    return { isFavorite };
  }

  searchRecitersAndSurahs(query: string, reciterId?: string): {
    reciters: ResolvedQuranReciter[];
    surahs: Surah[];
  } {
    const q = query.trim().toLowerCase();
    if (!q) return { reciters: [], surahs: [] };

    const reciters = reciterId
      ? []
      : this.listReciters().filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.nameAr || '').includes(query.trim()) ||
            r.id.toLowerCase().includes(q) ||
            (r.country || '').toLowerCase().includes(q)
        );

    const num = Number.parseInt(q, 10);
    const surahs = SURAHS_LIST.filter(
      (s) =>
        (Number.isFinite(num) && s.number === num) ||
        s.nameUz.toLowerCase().includes(q) ||
        s.meaningUz.toLowerCase().includes(q) ||
        s.nameAr.includes(query.trim())
    ).slice(0, 20);

    return { reciters, surahs };
  }

  // -------------------------------------------------------------------------
  // Admin Quran Audio Management Operations (Real Persistence + Audit Logs)
  // -------------------------------------------------------------------------

  async adminSaveReciter(input: {
    id?: string;
    name: string;
    nameAr?: string;
    country?: string;
    style?: string;
    biographyUz?: string;
    profileImageUrl?: string;
    surahServerBaseUrl?: string;
    isActive?: boolean;
    actorId: string;
  }): Promise<{ ok: boolean; reciter?: ResolvedQuranReciter; error?: string }> {
    const cleanName = input.name.trim();
    if (cleanName.length < 2 || cleanName.length > 140) {
      return { ok: false, error: 'Qori nomi 2–140 belgi boʻlishi kerak.' };
    }
    const id =
      input.id?.trim().replace(/[^a-zA-Z0-9_-]/g, '') ||
      `reciter_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24)}_${Date.now().toString(36)}`;

    const existing = this.getReciter(id, true);
    const reciterRecord: QuranReciter = {
      id,
      name: cleanName,
      nameAr: input.nameAr?.trim() ?? existing?.nameAr ?? '',
      country: input.country?.trim() || existing?.country || 'Oʻzbekiston',
      style: input.style?.trim() || existing?.style || 'Murattal (Hafs an Osim)',
      rewaya: existing?.rewaya || 'Hafs Aʼn Assem',
      biographyUz: input.biographyUz?.trim() ?? existing?.biographyUz ?? '',
      profileImageUrl:
        input.profileImageUrl?.trim() ||
        existing?.profileImageUrl ||
        '/images/quran_illumination_art_1793634658336.jpg',
      surahServerBaseUrl:
        input.surahServerBaseUrl !== undefined
          ? input.surahServerBaseUrl.trim().replace(/\/+$/, '')
          : existing?.surahServerBaseUrl || '',
      ayahServerBaseUrl: existing?.ayahServerBaseUrl || '',
      subtext: `${input.country?.trim() || existing?.country || 'Oʻzbekiston'} · ${input.style?.trim() || existing?.style || 'Murattal'}`,
      previewUrl: existing?.previewUrl || '',
      isCustomUploaded: !CANONICAL_IDS.has(id),
      uploadedSurahsCount: existing?.uploadedSurahsCount || 0,
      missingSurahsCount: existing?.missingSurahsCount ?? 114,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive !== false,
    };

    if (this.centralAdminWriter?.saveReciter) {
      const writeRes = await this.centralAdminWriter.saveReciter({
        reciter: reciterRecord as unknown as Record<string, unknown>,
        actorTelegramId: input.actorId,
      });
      if (!writeRes.ok) {
        return { ok: false, error: writeRes.error || 'Firestore qori saqlash xatosi.' };
      }
    }

    this.localReciterOverrides.set(id, reciterRecord);
    await this.repository.appendAuditLog({
      actorTelegramId: input.actorId,
      actorRole: 'admin',
      action: existing ? 'quran_reciter_updated' : 'quran_reciter_created',
      targetType: 'content',
      targetId: id,
      metadata: { name: cleanName, isActive: reciterRecord.isActive !== false },
    });

    return { ok: true, reciter: this.getReciter(id, true) || undefined };
  }

  async adminToggleReciterActive(
    reciterId: string,
    actorId: string
  ): Promise<{ ok: boolean; isActive?: boolean; error?: string }> {
    const existing = this.getReciter(reciterId, true);
    if (!existing) {
      return { ok: false, error: 'Qori topilmadi.' };
    }
    const nextActive = existing.isActive === false;
    const saved = await this.adminSaveReciter({
      id: existing.id,
      name: existing.name,
      isActive: nextActive,
      actorId,
    });
    return { ok: saved.ok, isActive: nextActive, error: saved.error };
  }

  async adminUploadOrReplaceTrackBuffer(input: {
    reciterId: string;
    surahNumber: number;
    fileName: string;
    buffer: Buffer;
    mimeType?: string;
    durationSeconds?: number;
    actorId: string;
  }): Promise<{ ok: boolean; track?: ResolvedSurahTrack; error?: string }> {
    const reciter = this.getReciter(input.reciterId, true);
    const surah = this.getSurah(input.surahNumber);
    if (!reciter || !surah) {
      return { ok: false, error: 'Qori yoki sura raqami (1–114) notoʻgʻri.' };
    }

    const validation = validateAudioBuffer(input.buffer, input.mimeType || 'audio/mpeg');
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const safeReciterId = reciter.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `${safeReciterId}_${surah.number}`;
    const padded = padNumber(surah.number, 3);

    let savedRecord: Record<string, any> | undefined;
    if (this.centralAdminWriter?.uploadSurahAudioBuffer) {
      const writerRes = await this.centralAdminWriter.uploadSurahAudioBuffer({
        reciterId: safeReciterId,
        surahNumber: surah.number,
        fileName: input.fileName,
        buffer: input.buffer,
        mimeType: validation.detectedFormat || 'audio/mpeg',
        durationSeconds: input.durationSeconds,
        actorTelegramId: input.actorId,
      });
      if (!writerRes.ok) {
        return { ok: false, error: writerRes.error || 'Audio faylni saqlashda xatolik.' };
      }
      savedRecord = writerRes.record;
    } else {
      // Safe confined disk write under data/uploads/quran-reciter-audio/{safeReciterId}/
      const reciterDir = path.resolve(UPLOADS_ROOT_DIR, 'quran-reciter-audio', safeReciterId);
      if (!reciterDir.startsWith(UPLOADS_ROOT_DIR + path.sep)) {
        return { ok: false, error: 'Xavfsizlik: yaroqsiz fayl yoʻli.' };
      }
      fs.mkdirSync(reciterDir, { recursive: true });
      const targetName = `surah-${padded}.mp3`;
      const targetPath = path.resolve(reciterDir, targetName);
      fs.writeFileSync(targetPath, input.buffer);
      const dur = input.durationSeconds || estimateSurahDurationSeconds(surah.number);
      savedRecord = {
        id: key,
        reciterId: safeReciterId,
        surahNumber: surah.number,
        surahNameUz: surah.nameUz,
        surahNameAr: surah.nameAr,
        storagePath: `quran-reciter-audio/${safeReciterId}/${targetName}`,
        audioUrl: `/uploads/quran-reciter-audio/${safeReciterId}/${targetName}`,
        fileFormat: validation.detectedFormat || 'audio/mpeg',
        fileSizeBytes: input.buffer.length,
        durationSeconds: dur,
        durationLabel: formatDurationLabel(dur),
        checksum: validation.sha256,
        status: 'verified_stored',
        updatedAt: new Date().toISOString(),
        updatedBy: input.actorId,
      };
    }

    if (savedRecord) {
      this.localTrackOverrides.set(key, {
        ...savedRecord,
        checksum: validation.sha256,
      });
    }

    // Invalidate stale cached Telegram file_id so replaced track is delivered fresh
    const settings = this.repository.getSettings();
    if (settings.quranAudioFileIdCache?.[key]) {
      const nextCache = { ...settings.quranAudioFileIdCache };
      delete nextCache[key];
      await this.repository.saveSettings({ quranAudioFileIdCache: nextCache }, input.actorId);
    }

    await this.repository.appendAuditLog({
      actorTelegramId: input.actorId,
      actorRole: 'admin',
      action: 'quran_audio_track_uploaded',
      targetType: 'content',
      targetId: key,
      metadata: {
        reciterId: safeReciterId,
        surahNumber: surah.number,
        sizeBytes: input.buffer.length,
      },
    });

    return { ok: true, track: this.resolveSurahTrack(safeReciterId, surah.number) || undefined };
  }

  /**
   * Prepares a Bulk Import Preview Plan from a list of filenames or `filename | https://url` lines.
   * NEVER writes to database until admin explicitly confirms via `confirmBulkImportPlan`.
   */
  createBulkImportPreview(input: {
    reciterId: string;
    entries: Array<{ pathOrFileName: string; sourceUrl?: string }>;
    actorId: string;
  }): { ok: boolean; plan?: BulkImportPreviewPlan; error?: string } {
    const reciter = this.getReciter(input.reciterId, true);
    if (!reciter) {
      return { ok: false, error: `Qori topilmadi: ${input.reciterId}` };
    }
    if (!Array.isArray(input.entries) || input.entries.length === 0) {
      return { ok: false, error: 'Import roʻyxati boʻsh.' };
    }

    const seenSurahs = new Set<number>();
    const items: BulkImportCandidateItem[] = [];

    for (const raw of input.entries.slice(0, 200)) {
      const pathStr = String(raw.pathOrFileName || '').trim();
      if (!pathStr) continue;
      const fileName = pathStr.split(/[\\/]/).pop() || pathStr;
      const match = matchFilenameToSurahNumber(pathStr);

      let status = match.status;
      let reason = match.reason;
      let surahNumber = match.surahNumber;

      if (status === 'matched' && surahNumber !== null) {
        if (seenSurahs.has(surahNumber)) {
          status = 'duplicate_surah';
          reason = `${surahNumber}-sura roʻyxatda takrorlangan; avtomatik almashtirilmadi.`;
          surahNumber = null;
        } else {
          seenSurahs.add(surahNumber);
        }
      }

      // Validate optional external sourceUrl strictly (HTTPS only, no private/loopback SSRF)
      let safeUrl: string | undefined;
      if (raw.sourceUrl && raw.sourceUrl.trim()) {
        try {
          const parsed = new URL(raw.sourceUrl.trim());
          const host = parsed.hostname.toLowerCase();
          const isPrivate =
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '0.0.0.0' ||
            host === '::1' ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host.startsWith('169.254.');
          if (parsed.protocol === 'https:' && !isPrivate) {
            safeUrl = parsed.toString();
          } else {
            status = 'invalid_format';
            surahNumber = null;
            reason = 'URL faqat xavfsiz ommaviy HTTPS manzil boʻlishi shart.';
          }
        } catch {
          status = 'invalid_format';
          surahNumber = null;
          reason = 'URL formati notoʻgʻri.';
        }
      }

      const surah = surahNumber ? this.getSurah(surahNumber) : null;
      items.push({
        originalPath: pathStr,
        fileName,
        detectedSurahNumber: surahNumber,
        surahNameUz: surah?.nameUz,
        sourceUrl: safeUrl,
        status,
        reason,
      });
    }

    const planId = `imp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const plan: BulkImportPreviewPlan = {
      planId,
      reciterId: reciter.id,
      reciterName: reciter.name,
      createdAt: new Date().toISOString(),
      createdBy: input.actorId,
      items,
      matchedCount: items.filter((i) => i.status === 'matched').length,
      ambiguousCount: items.filter((i) => i.status === 'ambiguous' || i.status === 'duplicate_surah').length,
      unmatchedCount: items.filter((i) => i.status === 'unrecognized' || i.status === 'invalid_format').length,
      confirmed: false,
    };

    this.pendingBulkPlans.set(planId, plan);
    return { ok: true, plan };
  }

  getPendingBulkPlan(planId: string): BulkImportPreviewPlan | null {
    return this.pendingBulkPlans.get(planId) || null;
  }

  /**
   * Commits ONLY the strictly `matched` items of a previously previewed Bulk Import Plan
   * after explicit admin confirmation, and records the operation in persistent import history.
   */
  async confirmBulkImportPlan(
    planId: string,
    actorId: string
  ): Promise<{
    ok: boolean;
    committedCount: number;
    skippedCount: number;
    failedCount: number;
    error?: string;
  }> {
    const plan = this.pendingBulkPlans.get(planId);
    if (!plan) {
      return { ok: false, committedCount: 0, skippedCount: 0, failedCount: 0, error: 'Import rejasi topilmadi yoki muddati tugagan.' };
    }
    if (plan.confirmed) {
      return { ok: false, committedCount: 0, skippedCount: 0, failedCount: 0, error: 'Bu import rejasi allaqachon tasdiqlangan.' };
    }

    let committedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const nowIso = new Date().toISOString();
    const reciter = this.getReciter(plan.reciterId, true);

    for (const item of plan.items) {
      if (item.status !== 'matched' || !item.detectedSurahNumber) {
        skippedCount++;
        continue;
      }
      const surah = this.getSurah(item.detectedSurahNumber);
      if (!surah) {
        failedCount++;
        continue;
      }
      const resolvedUrl =
        item.sourceUrl ||
        (reciter?.surahServerBaseUrl
          ? `${reciter.surahServerBaseUrl.replace(/\/+$/, '')}/${padNumber(surah.number, 3)}.mp3`
          : '');
      if (!resolvedUrl) {
        skippedCount++;
        continue;
      }

      const key = `${plan.reciterId}_${surah.number}`;
      const record = {
        id: key,
        reciterId: plan.reciterId,
        surahNumber: surah.number,
        surahNameUz: surah.nameUz,
        surahNameAr: surah.nameAr,
        audioUrl: resolvedUrl,
        storagePath: item.originalPath,
        fileFormat: 'audio/mpeg',
        durationSeconds: estimateSurahDurationSeconds(surah.number),
        durationLabel: formatDurationLabel(estimateSurahDurationSeconds(surah.number)),
        status: 'verified_stored',
        updatedAt: nowIso,
        updatedBy: actorId,
      };

      if (this.centralAdminWriter?.saveSurahAudioOverride) {
        const res = await this.centralAdminWriter.saveSurahAudioOverride({
          reciterId: plan.reciterId,
          surahNumber: surah.number,
          override: record,
          actorTelegramId: actorId,
        });
        if (!res.ok) {
          failedCount++;
          continue;
        }
      }
      this.localTrackOverrides.set(key, record);
      committedCount++;
    }

    plan.confirmed = true;
    this.pendingBulkPlans.delete(planId);

    const settings = this.repository.getSettings();
    const prevLogs = Array.isArray(settings.quranAudioImportLogs) ? settings.quranAudioImportLogs : [];
    const nextLog = {
      id: planId,
      reciterId: plan.reciterId,
      actorId,
      mode: 'bulk_manifest' as const,
      matchedCount: committedCount,
      unmatchedCount: skippedCount,
      failedCount,
      summary: `${plan.reciterName}: ${committedCount} saqlandi, ${skippedCount} oʻtkazildi, ${failedCount} xato`,
      createdAt: nowIso,
    };
    await this.repository.saveSettings(
      { quranAudioImportLogs: [nextLog, ...prevLogs].slice(0, 50) },
      actorId
    );
    await this.repository.appendAuditLog({
      actorTelegramId: actorId,
      actorRole: 'admin',
      action: 'quran_audio_bulk_import_confirmed',
      targetType: 'content',
      targetId: plan.reciterId,
      metadata: { planId, committedCount, skippedCount, failedCount },
    });

    return { ok: true, committedCount, skippedCount, failedCount };
  }

  cancelBulkImportPlan(planId: string): void {
    this.pendingBulkPlans.delete(planId);
  }

  listImportHistory() {
    return this.repository.getSettings().quranAudioImportLogs || [];
  }

  // -------------------------------------------------------------------------
  // Compatibility aliases used across keyboards, handlers, engine & router
  // -------------------------------------------------------------------------

  getReciterById(reciterId: string): ResolvedQuranReciter | null {
    return this.getReciter(reciterId, true);
  }

  listSurahsForReciter(reciterId: string): ResolvedSurahTrack[] {
    return this.listReciterTracks(reciterId);
  }

  toggleFavoriteSurah(telegramId: string, reciterId: string, surahNumber: number) {
    return this.toggleFavoriteSurahTrack(telegramId, reciterId, surahNumber);
  }

  auditFullLibrary(): QuranLibraryAuditReport {
    return this.runFullCatalogAudit();
  }

  listImportLogs(limit = 20) {
    return this.listImportHistory().slice(0, limit);
  }

  async probeTrackHealth(reciterId: string, surahNumber: number) {
    const res = await this.verifyTrackHealth(reciterId, surahNumber, this.fetchImpl || fetch);
    return {
      ...res,
      status: res.ok ? `HTTP ${res.statusCode || 200}` : res.error || `HTTP ${res.statusCode || 'ERR'}`,
    };
  }

  upsertReciter(
    input: {
      id?: string;
      name?: string;
      nameUz?: string;
      nameAr?: string;
      country?: string;
      style?: string;
      styleUz?: string;
      serverUrl?: string;
      surahServerBaseUrl?: string;
      isActive?: boolean;
    },
    actorId: string
  ) {
    return this.adminSaveReciter({
      id: input.id,
      name: input.name || input.nameUz || '',
      nameAr: input.nameAr,
      country: input.country,
      style: input.style || input.styleUz,
      surahServerBaseUrl: input.surahServerBaseUrl ?? input.serverUrl,
      isActive: input.isActive,
      actorId,
    });
  }

  uploadTrackBuffer(input: {
    reciterId: string;
    surahNumber: number;
    fileName: string;
    buffer: Buffer;
    mimeType?: string;
    durationSeconds?: number;
    actorId: string;
  }) {
    return this.adminUploadOrReplaceTrackBuffer(input);
  }

  async commitBulkImportPlan(planId: string, actorId: string) {
    const res = await this.confirmBulkImportPlan(planId, actorId);
    return {
      ...res,
      appliedCount: res.committedCount,
    };
  }
}
