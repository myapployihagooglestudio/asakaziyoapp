/**
 * ASAKA ZIYO — Ultimate Qur'on Ecosystem & Persistent Qori/Audio Storage Server Engine (2026)
 *
 * Guarantees:
 * 1. Persistent server-side storage for Qorilar & 114-surah audio files under `data/uploads/quran-audio/`
 *    + JSON store `data/quran_ecosystem_store.json` + Firestore mirror (`serverWriteFirestoreDoc`) + backup/restore.
 * 2. SHA-256 content integrity & duplicate checksum detection; strict magic-byte validation for MP3/M4A/OGG/WAV.
 * 3. Publication lifecycle gating: DRAFT -> VERIFIED -> PUBLISHED; soft-delete protection for published files.
 * 4. Authentic Qur'an metadata & verified public reciters preserved; ZERO fabricated audio URLs.
 * 5. Unified cross-platform Playlists (personal + official), User Qur'on Profile, Hifz/Muroja'a,
 *    Tajweed Academy (courses, lessons, 28 Arabic Letters + Makharij, tests & certificates), and Audit Log.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { QURAN_RECITERS, SURAHS_LIST } from '../data/quranData';

export const ODILJON_QORI_ID = 'odiljon_qori';

export type AudioPublishStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED';

export interface QariProfileRecord {
  id: string;
  nameUz: string;
  nameAr: string;
  nameLatn?: string;
  countryUz: string;
  styleUz: string;
  bioUz: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  isProtectedPermanent?: boolean;
  sortOrder: number;
  externalSurahBaseUrl?: string; // Only for verified canonical public CDNs (never fabricated!)
  uploadedSurahsCount: number;
  verifiedSurahsCount?: number;
  publishedSurahsCount: number;
  syncedSurahsCount?: number;
  archivedSurahsCount?: number;
  missingSurahsCount?: number;
  isCompleteReady?: boolean;
  lastIntegrityCheckAt?: string;
  lastBackupAt?: string;
  lastRestoreTestAt?: string;
  lastRestoreTestPassed?: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface QariAudioVersionEntry {
  version: number;
  fileName: string;
  relativePath: string;
  backupRelativePath?: string;
  sha256: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface QariSurahAudioRecord {
  id: string; // `${qariId}_s${paddedSurah}`
  qariId: string;
  surahNumber: number;
  surahNameUz: string;
  surahNameAr: string;
  fileName: string;
  relativePath: string; // confined within uploads/quran-audio
  backupRelativePath?: string; // confined within backups/permanent-audio
  backupVerified?: boolean;
  streamUrl: string; // /api/quran-ecosystem/audio-stream/:id
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  sha256: string;
  status: AudioPublishStatus;
  integrityStatus?: 'ok' | 'corrupted' | 'missing_file' | 'unchecked';
  lastIntegrityCheckAt?: string;
  version: number;
  versionHistory?: QariAudioVersionEntry[];
  uploadedBy: string;
  uploadedAt: string;
  verifiedAt?: string;
  publishedAt?: string;
  publishedBy?: string;
  archivedAt?: string;
  archivedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface QuranPlaylistTrack {
  qariId: string;
  surahNumber: number;
  titleUz?: string;
  addedAt: string;
}

export interface QuranPlaylistRecord {
  id: string;
  ownerUserId: string; // 'official_admin' for official playlists
  isOfficial: boolean;
  isPublic: boolean;
  shareSlug: string;
  titleUz: string;
  descriptionUz: string;
  category: 'morning' | 'evening' | 'juz_amma' | 'ruqyah' | 'calm' | 'hifz' | 'custom';
  coverColor?: string;
  tracks: QuranPlaylistTrack[];
  offlineRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArabicLetterRecord {
  id: string;
  order: number;
  letter: string;
  nameUz: string;
  nameAr: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
  makhrajGroupUz: string;
  makhrajDetailUz: string;
  sifatUz: string;
  exampleWordAr: string;
  exampleReadingUz: string;
  audioUrl?: string;
}

export interface TajweedLessonRecord {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  titleUz: string;
  titleAr?: string;
  ruleCategoryUz: string;
  summaryUz: string;
  contentUz: string;
  examples: Array<{ arabic: string; readingUz: string; ruleNoteUz: string }>;
  teacherName?: string;
  audioUrl?: string;
  videoUrl?: string;
  durationMinutes: number;
  isPremium: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuranEducationQuizQuestion {
  id: string;
  category: 'tajweed' | 'alphabet' | 'makharij' | 'quran_knowledge' | 'audio_recognition';
  difficulty: 'oson' | 'orta' | 'murakkab';
  questionUz: string;
  arabicPrompt?: string;
  audioUrl?: string;
  optionsUz: string[];
  correctIndex: number;
  explanationUz: string;
  sourceRef: string;
  isPublished: boolean;
  createdAt: string;
}

export interface HifzRangeProgress {
  id: string;
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  memorizedCount: number;
  repeatCount: number;
  masteryPercent: number;
  isDifficult: boolean;
  nextReviewDate: string; // YYYY-MM-DD
  reviewStage: number; // 0: 1d, 1: 3d, 2: 7d, 3: 16d, 4: 35d
  lastReviewedAt: string;
}

export interface UserQuranProfileRecord {
  userId: string;
  lastReadSurah: number;
  lastReadAyah: number;
  lastReadPage: number;
  lastListenedQariId?: string;
  lastListenedSurah?: number;
  lastListenedPositionSec?: number;
  dailyGoalAyahs: number;
  dailyGoalMinutes: number;
  todayAyahsRead: number;
  todayDateStr: string;
  streakDays: number;
  favoriteQariIds: string[];
  favoriteTrackKeys: string[]; // `${qariId}:${surahNumber}`
  bookmarks: Array<{
    id: string;
    surahNumber: number;
    ayahNumber: number;
    pageNumber?: number;
    note?: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    surahNumber: number;
    ayahNumber: number;
    text: string;
    updatedAt: string;
  }>;
  memorizedAyahKeys: string[]; // `${surahNumber}:${ayahNumber}`
  completedLessonIds: string[];
  masteredLetterIds: string[];
  hifzRanges: HifzRangeProgress[];
  quizScores: Array<{
    id: string;
    category: string;
    score: number;
    total: number;
    percentage: number;
    completedAt: string;
  }>;
  certificates: Array<{
    id: string;
    titleUz: string;
    level: string;
    issuedAt: string;
    verificationCode: string;
  }>;
  preferredLanguage?: 'uz-Latn' | 'uz-Cyrl' | 'uz-Latn-new' | 'ru' | 'en';
  preferredTheme?: 'dark' | 'light' | 'system';
  favoriteItems?: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    snippet?: string;
    routeTab?: string;
    routeId?: string;
    timestamp: number;
  }>;
  lastPlatform?: 'web' | 'android' | 'telegram_miniapp' | 'telegram_bot';
  updatedAt: string;
}

export interface QuranAuditEntry {
  id: string;
  actor: string;
  action: string;
  targetType: 'qari' | 'audio' | 'playlist' | 'lesson' | 'quiz' | 'backup';
  targetId: string;
  summary: string;
  createdAt: string;
}

interface QuranEcosystemStore {
  schemaVersion: number;
  qaris: Record<string, QariProfileRecord>;
  audioFiles: Record<string, QariSurahAudioRecord>;
  playlists: Record<string, QuranPlaylistRecord>;
  tajweedLessons: Record<string, TajweedLessonRecord>;
  educationQuizzes: Record<string, QuranEducationQuizQuestion>;
  userProfiles: Record<string, UserQuranProfileRecord>;
  auditLogs: QuranAuditEntry[];
  updatedAt: string;
}

export interface QuranEcosystemDeps {
  dataDir: string;
  uploadsDir: string;
  firestoreMirror?: (collection: string, docId: string, data: Record<string, any>) => Promise<any>;
  onCatalogChange?: (event: {
    kind: 'qari' | 'audio' | 'backup';
    qariId: string;
    surahNumber?: number;
    action: string;
  }) => void | Promise<void>;
}

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
]);

const MAX_AUDIO_FILE_BYTES = 85 * 1024 * 1024; // 85 MB max for long surahs like Al-Baqarah

/**
 * Verifies real binary audio magic bytes (MP3 ID3/Sync, MP4/M4A ftyp, OGG OggS, WAV RIFF/WAVE, WebM EBML).
 * Blocks spoofed HTML/SVG/EXE uploads cleanly.
 */
export function validateAudioMagicBytes(buffer: Buffer): { valid: boolean; detectedExt: string; detectedMime: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, detectedExt: '', detectedMime: '' };
  }
  // Check for ID3v2 tag ("ID3") or MPEG frame sync (0xFF 0xE0..0xFF)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return { valid: true, detectedExt: '.mp3', detectedMime: 'audio/mpeg' };
  }
  // Check for ISO BMFF / M4A ("ftyp" at offset 4)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { valid: true, detectedExt: '.m4a', detectedMime: 'audio/mp4' };
  }
  // Check for OGG ("OggS")
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { valid: true, detectedExt: '.ogg', detectedMime: 'audio/ogg' };
  }
  // Check for WAV ("RIFF" ... "WAVE")
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return { valid: true, detectedExt: '.wav', detectedMime: 'audio/wav' };
  }
  return { valid: false, detectedExt: '', detectedMime: '' };
}

/**
 * Verifies real binary image magic bytes (JPEG, PNG, WebP) for Qari profile avatars.
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedExt: string; detectedMime: string } {
  if (!buffer || buffer.length < 12) return { valid: false, detectedExt: '', detectedMime: '' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedExt: '.jpg', detectedMime: 'image/jpeg' };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, detectedExt: '.png', detectedMime: 'image/png' };
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedExt: '.webp', detectedMime: 'image/webp' };
  }
  return { valid: false, detectedExt: '', detectedMime: '' };
}

/**
 * Pure Node.js ZIP entry extractor supporting STORE (0) and DEFLATE (8).
 * Enforces strict path traversal protection & uncompressed byte caps (ZIP bomb guard).
 */
export function extractAudioEntriesFromZipBuffer(
  zipBuffer: Buffer,
  maxEntries = 130,
  maxTotalBytes = 1024 * 1024 * 1024 // 1 GB safety cap
): Array<{ fileName: string; buffer: Buffer }> {
  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, zipBuffer.length - 65557);
  for (let i = zipBuffer.length - 22; i >= minOffset; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('ZIP arxivi yaroqsiz (EOCD sarlavhasi topilmadi).');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const entries: Array<{ fileName: string; buffer: Buffer }> = [];

  let ptr = centralDirOffset;
  let accumulatedBytes = 0;

  for (let i = 0; i < totalEntries && entries.length < maxEntries; i++) {
    if (ptr + 46 > zipBuffer.length || zipBuffer.readUInt32LE(ptr) !== 0x02014b50) {
      break;
    }
    const compressionMethod = zipBuffer.readUInt16LE(ptr + 10);
    const compressedSize = zipBuffer.readUInt32LE(ptr + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(ptr + 24);
    const fileNameLen = zipBuffer.readUInt16LE(ptr + 28);
    const extraLen = zipBuffer.readUInt16LE(ptr + 30);
    const commentLen = zipBuffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(ptr + 42);

    const rawName = zipBuffer.subarray(ptr + 46, ptr + 46 + fileNameLen).toString('utf8');
    ptr += 46 + fileNameLen + extraLen + commentLen;

    // Skip directories and macOS resource forks
    if (rawName.endsWith('/') || rawName.includes('__MACOSX') || rawName.includes('..')) {
      continue;
    }
    const baseName = path.posix.basename(rawName.replace(/\\/g, '/'));
    if (!baseName || baseName.startsWith('.')) continue;
    if (!/\.(mp3|m4a|ogg|wav)$/i.test(baseName)) continue;
    if (uncompressedSize > MAX_AUDIO_FILE_BYTES || accumulatedBytes + uncompressedSize > maxTotalBytes) {
      continue;
    }

    if (localHeaderOffset + 30 > zipBuffer.length || zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      continue;
    }
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > zipBuffer.length) continue;

    const compressedData = zipBuffer.subarray(dataStart, dataEnd);
    let outBuffer: Buffer;
    if (compressionMethod === 0) {
      outBuffer = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      outBuffer = zlib.inflateRawSync(compressedData, { maxOutputLength: MAX_AUDIO_FILE_BYTES });
    } else {
      continue;
    }
    accumulatedBytes += outBuffer.length;
    entries.push({ fileName: baseName, buffer: outBuffer });
  }

  return entries;
}

/**
 * Strictly detects Surah number (1..114) from a filename such as "001.mp3", "surah-036.mp3", "114_Nos.mp3".
 */
export function detectSurahNumberFromFilename(fileName: string): number | null {
  const base = path.basename(fileName).replace(/\.[^.]+$/, '').trim();
  const exact = base.match(/^(\d{1,3})$/);
  if (exact) {
    const n = Number.parseInt(exact[1], 10);
    return n >= 1 && n <= 114 ? n : null;
  }
  const leading = base.match(/^(?:surah?[-_\s]*)?(\d{1,3})(?:[-_.\s]|$)/i);
  if (leading) {
    const n = Number.parseInt(leading[1], 10);
    return n >= 1 && n <= 114 ? n : null;
  }
  const anyNum = base.match(/(?:^|[^0-9])(\d{1,3})(?:[^0-9]|$)/);
  if (anyNum) {
    const n = Number.parseInt(anyNum[1], 10);
    return n >= 1 && n <= 114 ? n : null;
  }
  return null;
}

/**
 * Canonical 28 Arabic Alphabet Letters with Isolated, Initial, Medial, Final forms & Makharij (Articulation Points)
 */
export const CANONICAL_ARABIC_ALPHABET: ArabicLetterRecord[] = [
  { id: 'alif', order: 1, letter: 'ا', nameUz: 'Alif', nameAr: 'أَلِف', isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا', makhrajGroupUz: 'Al-Javf (Ogʻiz boʻshligʻi)', makhrajDetailUz: 'Boʻgʻiz va ogʻiz boʻshligʻidan erkin choʻzilib chiqadi.', sifatUz: 'Mad harfi (choʻzuvchi)', exampleWordAr: 'اللَّهُ', exampleReadingUz: 'Alloh' },
  { id: 'ba', order: 2, letter: 'ب', nameUz: 'Ba', nameAr: 'بَاء', isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', makhrajGroupUz: 'Ash-Shafatan (Ikki lab)', makhrajDetailUz: 'Ikki labning nam qismini yumshoq jipslashtirib talaffuz qilinadi.', sifatUz: 'Qalqala, Jahr, Shidda', exampleWordAr: 'بِسْمِ', exampleReadingUz: 'Bismi' },
  { id: 'ta', order: 3, letter: 'ت', nameUz: 'Ta', nameAr: 'تَاء', isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori old tishlarning milkiga tegib chiqadi.', sifatUz: 'Hams, Shidda, Istifol', exampleWordAr: 'تَبَّتْ', exampleReadingUz: 'Tabbat' },
  { id: 'sa', order: 4, letter: 'ث', nameUz: 'Sa (peltek)', nameAr: 'ثَاء', isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori old tishlarning chetiga yumshoq tegadi.', sifatUz: 'Hams, Raxova', exampleWordAr: 'ثُمَّ', exampleReadingUz: 'Summa' },
  { id: 'jim', order: 5, letter: 'ج', nameUz: 'Jim', nameAr: 'جِيم', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', makhrajGroupUz: 'Al-Lison (Til oʻrtasi)', makhrajDetailUz: 'Til oʻrtasi yuqori tanglayga tegib chiqadi.', sifatUz: 'Qalqala, Jahr, Shidda', exampleWordAr: 'جَنَّةٌ', exampleReadingUz: 'Jannatun' },
  { id: 'ha', order: 6, letter: 'ح', nameUz: 'Ha (halqum)', nameAr: 'حَاء', isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح', makhrajGroupUz: 'Al-Halq (Boʻgʻiz oʻrtasi)', makhrajDetailUz: 'Boʻgʻizning oʻrta qismidan yumshoq nafas bilan chiqadi.', sifatUz: 'Hams, Raxova', exampleWordAr: 'حَمْدُ', exampleReadingUz: 'Hamdu' },
  { id: 'kho', order: 7, letter: 'خ', nameUz: 'Xo', nameAr: 'خَاء', isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ', makhrajGroupUz: 'Al-Halq (Boʻgʻiz yuqorisi)', makhrajDetailUz: 'Boʻgʻizning ogʻizga yaqin yuqori qismidan yoʻgʻon chiqadi.', sifatUz: 'Tafxim (yoʻgʻon), Hams', exampleWordAr: 'خَيْرٌ', exampleReadingUz: 'Xoyrun' },
  { id: 'dal', order: 8, letter: 'د', nameUz: 'Dal', nameAr: 'دَال', isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori old tishlarning asosiga tegib chiqadi.', sifatUz: 'Qalqala, Jahr, Shidda', exampleWordAr: 'دِينِ', exampleReadingUz: 'Diyni' },
  { id: 'zal', order: 9, letter: 'ذ', nameUz: 'Zal (peltek)', nameAr: 'ذَال', isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori old tishlar chetiga tegib ovozli chiqadi.', sifatUz: 'Jahr, Raxova', exampleWordAr: 'ذٰلِكَ', exampleReadingUz: 'Zalika' },
  { id: 'ro', order: 10, letter: 'ر', nameUz: 'Ro', nameAr: 'رَاء', isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori tish milkiga yengil tegib chiqadi (titrash meʼyorda).', sifatUz: 'Takrir, Tafxim/Tarqiq', exampleWordAr: 'رَبِّ', exampleReadingUz: 'Robbi' },
  { id: 'za', order: 11, letter: 'ز', nameUz: 'Za', nameAr: 'زَاي', isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi pastki old tishlar ichki yuzasiga yaqinlashadi.', sifatUz: 'Safir (hushtak), Jahr', exampleWordAr: 'زَكَاةً', exampleReadingUz: 'Zakatan' },
  { id: 'sin', order: 12, letter: 'س', nameUz: 'Sin', nameAr: 'سِين', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi pastki tishlar orqasida, ingichka hushtak bilan chiqadi.', sifatUz: 'Safir, Hams, Tarqiq', exampleWordAr: 'سَلَامٌ', exampleReadingUz: 'Salamun' },
  { id: 'shin', order: 13, letter: 'ش', nameUz: 'Shin', nameAr: 'شِين', isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش', makhrajGroupUz: 'Al-Lison (Til oʻrtasi)', makhrajDetailUz: 'Til oʻrtasi yuqori tanglayga yaqinlashib havo yoyilib chiqadi.', sifatUz: 'Tafashshiy, Hams', exampleWordAr: 'شَمْسُ', exampleReadingUz: 'Shamsu' },
  { id: 'sod', order: 14, letter: 'ص', nameUz: 'Sod', nameAr: 'صَاد', isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Sin maxrajidan, lekin til orqasi koʻtarilib yoʻgʻon talaffuz qilinadi.', sifatUz: 'Istiʼlo (yoʻgʻon), Itboq, Safir', exampleWordAr: 'صِرَاطَ', exampleReadingUz: 'Siroto' },
  { id: 'dod', order: 15, letter: 'ض', nameUz: 'Dod', nameAr: 'ضَاد', isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض', makhrajGroupUz: 'Al-Lison (Til yon qirrasi)', makhrajDetailUz: 'Tilning oʻng yoki chap qirrasi yuqori oziq tishlarga tegadi.', sifatUz: 'Istitola, Istiʼlo, Itboq', exampleWordAr: 'ضَالِّينَ', exampleReadingUz: 'Doolliyn' },
  { id: 'to', order: 16, letter: 'ط', nameUz: 'To', nameAr: 'طَاء', isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori tishlar asosiga tegib, eng yoʻgʻon holda chiqadi.', sifatUz: 'Qalqala, Itboq, Istiʼlo', exampleWordAr: 'طَيِّبًا', exampleReadingUz: 'Toyyiban' },
  { id: 'zo', order: 17, letter: 'ظ', nameUz: 'Zo', nameAr: 'ظَاء', isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ', makhrajGroupUz: 'Al-Lison (Til uchi)', makhrajDetailUz: 'Til uchi yuqori old tishlar chetiga tegib yoʻgʻon talaffuz qilinadi.', sifatUz: 'Istiʼlo, Itboq, Jahr', exampleWordAr: 'ظُلُمَاتٍ', exampleReadingUz: 'Zulumatin' },
  { id: 'ayn', order: 18, letter: 'ع', nameUz: 'Ayn', nameAr: 'عَيْن', isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع', makhrajGroupUz: 'Al-Halq (Boʻgʻiz oʻrtasi)', makhrajDetailUz: 'Boʻgʻiz oʻrtasidan tiniq va chuqur ovoz bilan chiqadi.', sifatUz: 'Tavasut, Jahr', exampleWordAr: 'عَالَمِينَ', exampleReadingUz: 'Alamiyn' },
  { id: 'ghayn', order: 19, letter: 'غ', nameUz: 'Gʻayn', nameAr: 'غَيْن', isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ', makhrajGroupUz: 'Al-Halq (Boʻgʻiz yuqorisi)', makhrajDetailUz: 'Boʻgʻiz yuqori qismidan yoʻgʻon va yumshoq chiqadi.', sifatUz: 'Istiʼlo (yoʻgʻon), Raxova', exampleWordAr: 'غَيْرِ', exampleReadingUz: 'Gʻoyri' },
  { id: 'fa', order: 20, letter: 'ف', nameUz: 'Fa', nameAr: 'فَاء', isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف', makhrajGroupUz: 'Ash-Shafatan (Pastki lab)', makhrajDetailUz: 'Yuqori old tishlar cheti pastki labning ichki qismiga tegadi.', sifatUz: 'Hams, Raxova', exampleWordAr: 'فَلَقِ', exampleReadingUz: 'Falaqi' },
  { id: 'qof', order: 21, letter: 'ق', nameUz: 'Qof', nameAr: 'قَاف', isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق', makhrajGroupUz: 'Al-Lison (Til tubi)', makhrajDetailUz: 'Tilning eng tubi yuqori yumshoq tanglayga tegib chiqadi.', sifatUz: 'Qalqala, Istiʼlo, Shidda', exampleWordAr: 'قُلْ', exampleReadingUz: 'Qul' },
  { id: 'kaf', order: 22, letter: 'ك', nameUz: 'Kaf', nameAr: 'كَاف', isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك', makhrajGroupUz: 'Al-Lison (Til tubi oldi)', makhrajDetailUz: 'Qof maxrajidan biroz oldinroq, qattiq tanglayga tegib ingichka chiqadi.', sifatUz: 'Hams, Shidda, Tarqiq', exampleWordAr: 'كَوْثَرَ', exampleReadingUz: 'Kavsaro' },
  { id: 'lam', order: 23, letter: 'ل', nameUz: 'Lam', nameAr: 'لَام', isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل', makhrajGroupUz: 'Al-Lison (Til cheti)', makhrajDetailUz: 'Tilning oldingi qirrasi yuqori tish milkiga tegadi.', sifatUz: 'Inxirof, Tavasut', exampleWordAr: 'لَيْلَةِ', exampleReadingUz: 'Laylati' },
  { id: 'mim', order: 24, letter: 'م', nameUz: 'Mim', nameAr: 'مِيم', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', makhrajGroupUz: 'Ash-Shafatan + Al-Xoyshum', makhrajDetailUz: 'Ikki lab yopiladi va dimogʻdan gʻunna ovozi chiqadi.', sifatUz: 'Gʻunna, Tavasut, Jahr', exampleWordAr: 'مَالِكِ', exampleReadingUz: 'Maliki' },
  { id: 'nun', order: 25, letter: 'ن', nameUz: 'Nun', nameAr: 'نُون', isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن', makhrajGroupUz: 'Al-Lison + Al-Xoyshum', makhrajDetailUz: 'Til uchi yuqori tish milkiga tegib dimogʻdan gʻunna bilan chiqadi.', sifatUz: 'Gʻunna, Tavasut, Jahr', exampleWordAr: 'نَاسِ', exampleReadingUz: 'Nasi' },
  { id: 'ha_soft', order: 26, letter: 'ه', nameUz: 'Ha (chuqur)', nameAr: 'هَاء', isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه', makhrajGroupUz: 'Al-Halq (Boʻgʻiz tubi)', makhrajDetailUz: 'Boʻgʻizning eng tubidan yengil nafas bilan chiqadi.', sifatUz: 'Hams, Raxova', exampleWordAr: 'هُدًى', exampleReadingUz: 'Hudan' },
  { id: 'vav', order: 27, letter: 'و', nameUz: 'Vav', nameAr: 'وَاو', isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو', makhrajGroupUz: 'Ash-Shafatan (Ikki lab)', makhrajDetailUz: 'Ikki lab oldinga choʻchaytirilib ochiq doira shaklida chiqadi.', sifatUz: 'Lin, Mad, Jahr', exampleWordAr: 'وَالْعَصْرِ', exampleReadingUz: 'Val-asr' },
  { id: 'ya', order: 28, letter: 'ي', nameUz: 'Ya', nameAr: 'يَاء', isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي', makhrajGroupUz: 'Al-Lison (Til oʻrtasi)', makhrajDetailUz: 'Til oʻrtasi yuqori tanglayga koʻtarilib yumshoq chiqadi.', sifatUz: 'Lin, Mad, Jahr', exampleWordAr: 'يَوْمِ', exampleReadingUz: 'Yavmi' },
];

function createDefaultTajweedLessons(): Record<string, TajweedLessonRecord> {
  const now = new Date().toISOString();
  const list: TajweedLessonRecord[] = [
    {
      id: 'tajweed-01-nun-sakin',
      level: 'beginner',
      order: 1,
      titleUz: 'Sokin Nun va Tanvin qoidalari (Izhor, Idgʻom, Iqlob, Ixfo)',
      titleAr: 'أحكام النون الساكنة والتنوين',
      ruleCategoryUz: 'Sokin Nun va Tanvin',
      summaryUz: 'Qurʼon tilovatining eng muhim 4 ta asosiy qoidasi: Izhor, Idgʻom, Iqlob va Ixfo.',
      contentUz:
        'Sokin nun (نْ) yoki tanvindan (ً ٍ ٌ) keyin keladigan harfga qarab 4 xil hukm qoʻllanadi:\n' +
        '1. Izhor (Aniq oʻqish): 6 ta halqum harfi (ء ه ع ح غ خ) kelganda nun aniq va gʻunnasiz oʻqiladi.\n' +
        '2. Idgʻom (Kiritib yuborish): ي ر م ل و ن harflarida — ي ن م و bilan gʻunnali, ل ر bilan gʻunnasiz qoʻshiladi.\n' +
        '3. Iqlob (Almashtirish): ب harfi kelganda nun tovushi yashirin mim (م) ga aylanib 2 harakat gʻunna qilinadi.\n' +
        '4. Ixfo (Yashirish): Qolgan 15 ta harfda nun tovushi izhor va idgʻom orasida 2 harakat gʻunna bilan oʻqiladi.',
      examples: [
        { arabic: 'مِنْ خَوْفٍ', readingUz: 'Min xovfin', ruleNoteUz: 'Izhor: خ halqum harfi kelgani uchun nun aniq oʻqiladi.' },
        { arabic: 'مَن يَعْمَلْ', readingUz: 'May-yaʼmal', ruleNoteUz: 'Idgʻom bi-gʻunna: nun ي harfiga dimogʻ ovozi bilan kiritiladi.' },
        { arabic: 'مِن بَعْدِ', readingUz: 'Mim-baʼdi', ruleNoteUz: 'Iqlob: ب oldidan sokin nun mim ga aylanadi.' },
        { arabic: 'مِن شَرِّ', readingUz: 'Min sharri (ixfo)', ruleNoteUz: 'Ixfo: ش harfi oldida nun yashirilib 2 harakat gʻunna qilinadi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 12,
      isPremium: false,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tajweed-02-qalqala',
      level: 'beginner',
      order: 2,
      titleUz: 'Qalqala harflari va darajalari (ق ط ب ج د)',
      titleAr: 'أحكام القلقلة',
      ruleCategoryUz: 'Qalqala',
      summaryUz: 'Qutbu Jaddin (ق ط ب ج د) harflari sokin boʻlganda tovushning tebranib chiqish qoidasi.',
      contentUz:
        'Qalqala harflari 5 ta: ق، ط، ب، ج، د ("Qutbu Jaddin" jumlasida jamlangan).\n' +
        'Ular sokin (sukunli) holatda kelganda maxrajda tovush tiqilib qolmasligi uchun yengil aks-sado (tebranish) bilan oʻqiladi.\n' +
        '• Qalqalai Sugʻro (Kichik): Soʻz oʻrtasida kelganda (masalan: يَجْعَلُونَ).\n' +
        '• Qalqalai Kubro (Katta): Oyat oxirida vaqf qilinganda (masalan: قُلْ هُوَ اللَّهُ أَحَدٌ).',
      examples: [
        { arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', readingUz: 'Al-Falaq', ruleNoteUz: 'Oyat oxirida ق harfida Qalqalai Kubro qilinadi.' },
        { arabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', readingUz: 'Yalid · Yulad', ruleNoteUz: 'د harfida aniq tebranish bilan toʻxtaladi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 9,
      isPremium: false,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tajweed-03-mim-sakin',
      level: 'beginner',
      order: 3,
      titleUz: 'Sokin Mim qoidalari (Ixfo Shafaviy, Idgʻom Mislayn, Izhor Shafaviy)',
      titleAr: 'أحكام الميم الساكنة',
      ruleCategoryUz: 'Sokin Mim',
      summaryUz: 'Sokin mim (مْ) dan keyin ب, م yoki boshqa harflar kelgandagi talaffuz tartibi.',
      contentUz:
        'Sokin mim (مْ) uch holatda oʻqiladi:\n' +
        '1. Idgʻom Mislayn (Shafaviy): Sokin mimdan keyin harakatli م kelsa, ikki mim birlashtirilib 2 harakat gʻunna qilinadi.\n' +
        '2. Ixfo Shafaviy: Sokin mimdan keyin ب kelsa, lablar yengil tegib 2 harakat gʻunna bilan oʻqiladi.\n' +
        '3. Izhor Shafaviy: Qolgan 26 harfda mim aniq va choʻzmasdan oʻqiladi (ayniqsa و va ف oldidan ehtiyot boʻlinadi).',
      examples: [
        { arabic: 'تَرْمِيهِم بِحِجَارَةٍ', readingUz: 'Tarmiyhim bi-hijarotin', ruleNoteUz: 'Ixfo Shafaviy: مْ dan keyin ب keldi.' },
        { arabic: 'لَهُم مَّغْفِرَةٌ', readingUz: 'Lahum-magʻfirotun', ruleNoteUz: 'Idgʻom Mislayn: ikki mim gʻunna bilan qoʻshildi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 10,
      isPremium: false,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tajweed-04-madd',
      level: 'intermediate',
      order: 4,
      titleUz: 'Mad (Choʻzish) turlari: Tabiiy, Muttasil, Munfasil va Lozim',
      titleAr: 'أحكام المدود',
      ruleCategoryUz: 'Mad qoidalari',
      summaryUz: '2, 4, 5 va 6 harakat choʻziladigan mad turlarini aniq ajratish.',
      contentUz:
        'Mad harflari 3 ta: sokin ا (oldi fatha), sokin و (oldi zamma), sokin ي (oldi kasra).\n' +
        '• Mad Tabiiy: 2 harakat choʻziladi.\n' +
        '• Mad Muttasil (Vojib): Mad harfi va hamza bitta soʻzda kelsa 4–5 harakat choʻziladi.\n' +
        '• Mad Munfasil (Joiz): Mad harfi soʻz oxirida, hamza keyingi soʻz boshida kelsa 4–5 harakat choʻziladi.\n' +
        '• Mad Lozim: Mad harfidan keyin asliy sukun yoki tashdid kelsa 6 harakat choʻziladi (masalan: وَلَا الضَّالِّينَ).',
      examples: [
        { arabic: 'إِذَا جَاءَ نَصْرُ اللَّهِ', readingUz: 'Jaaaaʼa', ruleNoteUz: 'Mad Muttasil: 4–5 harakat choʻziladi.' },
        { arabic: 'وَلَا الضَّالِّينَ', readingUz: 'Valad-doollliiyn', ruleNoteUz: 'Mad Lozim Kalimi Musaqqal: 6 harakat choʻziladi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 15,
      isPremium: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tajweed-05-ro-lam-tafxim',
      level: 'intermediate',
      order: 5,
      titleUz: 'Ro (ر) va Lafzi Jalola (اللَّه) harflarida Tafxim va Tarqiq',
      titleAr: 'أحكام الراء ولام لفظ الجلالة',
      ruleCategoryUz: 'Tafxim va Tarqiq',
      summaryUz: 'Qachon yoʻgʻon (tafxim) va qachon ingichka (tarqiq) oʻqish qoidalari.',
      contentUz:
        'Lafzi Jalola (اللَّه) dan oldingi harf fatha yoki zamma boʻlsa yoʻgʻon (Alloh), kasra boʻlsa ingichka (Bismillahi) oʻqiladi.\n' +
        'Ro (ر) harfi fatha/zamma bilan yoʻgʻon, kasra bilan ingichka oʻqiladi; sokin boʻlganda oldingi harakatga qaraladi.',
      examples: [
        { arabic: 'بِسْمِ اللَّهِ', readingUz: 'Bismillahi', ruleNoteUz: 'Kasradan keyin kelgani uchun ingichka oʻqiladi.' },
        { arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', readingUz: 'Huval-lohu', ruleNoteUz: 'Fathadan keyin kelgani uchun yoʻgʻon oʻqiladi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 14,
      isPremium: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tajweed-06-waqf-ibtida',
      level: 'advanced',
      order: 6,
      titleUz: 'Vaqf va Ibtido belgilari (م، لا، ج، صلى، قلى)',
      titleAr: 'أحكام الوقف والابتداء',
      ruleCategoryUz: 'Vaqf qoidalari',
      summaryUz: 'Madina Mushafidagi toʻxtash (vaqf) belgilarining maʼnosi va toʻgʻri nafas olish madaniyati.',
      contentUz:
        '• م (Vaqfi Lozim): Toʻxtash shart, aks holda maʼno buzilishi mumkin.\n' +
        '• لا (Toʻxtash mumkin emas): Oyat oʻrtasida maʼno uzilib qoladi.\n' +
        '• ج (Vaqfi Joiz): Toʻxtash ham, davom etish ham teng joiz.\n' +
        '• قلى (Toʻxtash afzal) · صلى (Davom etish afzal) · ۛ ۛ (Muonaqa — faqat bittasida toʻxtaladi).',
      examples: [
        { arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ', readingUz: 'Baqara 2-oyat', ruleNoteUz: 'Muonaqa belgisi: faqat ikkitadan bittasida toʻxtaladi.' },
      ],
      teacherName: 'ASAKA ZIYO Tajvid Ustozlari',
      durationMinutes: 16,
      isPremium: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const map: Record<string, TajweedLessonRecord> = {};
  for (const l of list) map[l.id] = l;
  return map;
}

function createDefaultEducationQuizzes(): Record<string, QuranEducationQuizQuestion> {
  const now = new Date().toISOString();
  const list: QuranEducationQuizQuestion[] = [
    {
      id: 'eq-01',
      category: 'tajweed',
      difficulty: 'oson',
      questionUz: 'Qalqala harflari qaysi qatorda toʻliq va toʻgʻri koʻrsatilgan?',
      optionsUz: ['ق ط ب ج د', 'ي ر م ل و ن', 'ء ه ع ح غ خ', 'ص ض ط ظ'],
      correctIndex: 0,
      explanationUz: 'Qalqala harflari 5 ta boʻlib, "Qutbu Jaddin" (ق ط ب ج د) iborasida jamlangan.',
      sourceRef: 'Tuhfatul Atfol / Tajvid asoslari',
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'eq-02',
      category: 'tajweed',
      difficulty: 'oson',
      questionUz: '«مِن بَعْدِ» soʻzida sokin nundan keyin «ب» harfi kelgan. Bu qaysi tajvid qoidasi?',
      arabicPrompt: 'مِن بَعْدِ',
      optionsUz: ['Izhor', 'Iqlob', 'Idgʻom bi-gʻunna', 'Qalqala'],
      correctIndex: 1,
      explanationUz: 'Sokin nun yoki tanvindan keyin ب harfi kelsa Iqlob qoidasi qoʻllanadi va nun mim tovushiga aylanadi.',
      sourceRef: 'Tajvid asoslari — Sokin Nun hukmlari',
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'eq-03',
      category: 'makharij',
      difficulty: 'orta',
      questionUz: '«ع» (Ayn) va «ح» (Ha) harflari qaysi maxrajdan chiqadi?',
      arabicPrompt: 'ع · ح',
      optionsUz: ['Ikki labdan (Ash-Shafatan)', 'Boʻgʻiz oʻrtasidan (Vasatul Halq)', 'Til uchidan', 'Dimogʻdan (Al-Xoyshum)'],
      correctIndex: 1,
      explanationUz: 'ع va ح harflari boʻgʻizning oʻrta qismidan (Vasatul Halq) talaffuz qilinadi.',
      sourceRef: 'Muqaddimatul Jazariyya — Maxorijul Huruf',
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'eq-04',
      category: 'alphabet',
      difficulty: 'oson',
      questionUz: 'Arab alifbosida oʻzidan keyingi harfga qoʻshilmaydigan (faqat oʻngdan ulanadigan) harflar qaysilar?',
      optionsUz: ['ا د ذ ر ز و', 'ب ت ث ن ي', 'س ش ص ض', 'ك ل م ه'],
      correctIndex: 0,
      explanationUz: '6 ta harf (ا د ذ ر ز و) oʻzidan keyingi harfga ulanmaydi.',
      sourceRef: 'Muallimi Soniy',
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'eq-05',
      category: 'tajweed',
      difficulty: 'orta',
      questionUz: 'Fotiha surasidagi «وَلَا الضَّالِّينَ» soʻzidagi Mad Lozim necha harakat choʻziladi?',
      arabicPrompt: 'وَلَا الضَّالِّينَ',
      optionsUz: ['2 harakat', '3 harakat', '4 harakat', '6 harakat'],
      correctIndex: 3,
      explanationUz: 'Mad Lozim Kalimi Musaqqal barcha qiroat ulamolari ittifoqi bilan 6 harakat choʻziladi.',
      sourceRef: 'Tajvid — Mad hukmlari',
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'eq-06',
      category: 'quran_knowledge',
      difficulty: 'oson',
      questionUz: 'Qurʼoni Karim jami nechta sura va nechta juzdan iborat?',
      optionsUz: ['114 sura, 30 juz', '110 sura, 28 juz', '120 sura, 30 juz', '114 sura, 60 juz'],
      correctIndex: 0,
      explanationUz: 'Qurʼoni Karim 114 sura, 30 juz va Madina Mushafida 604 sahifadan iborat.',
      sourceRef: 'Ulumul Qurʼon',
      isPublished: true,
      createdAt: now,
    },
  ];
  const map: Record<string, QuranEducationQuizQuestion> = {};
  for (const q of list) map[q.id] = q;
  return map;
}

function createOfficialPlaylists(): Record<string, QuranPlaylistRecord> {
  const now = new Date().toISOString();
  const list: QuranPlaylistRecord[] = [
    {
      id: 'official-juz-amma',
      ownerUserId: 'official_admin',
      isOfficial: true,
      isPublic: true,
      shareSlug: 'juz-amma-30',
      titleUz: '30-Juz (Amma) — Qisqa suralar toʻplami',
      descriptionUz: 'Namoz va kundalik yodlash uchun 30-juzning mashhur suralari.',
      category: 'juz_amma',
      coverColor: '#064E3B',
      offlineRecommended: true,
      tracks: [78, 87, 93, 94, 97, 103, 108, 112, 113, 114].map((surahNumber) => ({
        qariId: 'mishary',
        surahNumber,
        addedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'official-morning-evening',
      ownerUserId: 'official_admin',
      isOfficial: true,
      isPublic: true,
      shareSlug: 'tonggi-kechki-suralar',
      titleUz: 'Tonggi va kechki fazilatli suralar',
      descriptionUz: 'Fotiha, Yosin, Voqea, Mulk va Muavvizatayn suralari.',
      category: 'morning',
      coverColor: '#1E3A2F',
      offlineRecommended: true,
      tracks: [1, 36, 56, 67, 112, 113, 114].map((surahNumber) => ({
        qariId: 'husary',
        surahNumber,
        addedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'official-friday-kahf',
      ownerUserId: 'official_admin',
      isOfficial: true,
      isPublic: true,
      shareSlug: 'juma-suralari',
      titleUz: 'Juma kuni tilovatlari (Kahf, Duxon, Juma)',
      descriptionUz: 'Juma kuni oʻqish va tinglash sunnat boʻlgan muborak suralar.',
      category: 'calm',
      coverColor: '#0F2E26',
      offlineRecommended: true,
      tracks: [18, 44, 62, 87, 88].map((surahNumber) => ({
        qariId: 'minshawi',
        surahNumber,
        addedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    },
  ];
  const map: Record<string, QuranPlaylistRecord> = {};
  for (const p of list) map[p.id] = p;
  return map;
}

export class QuranEcosystemService {
  private readonly storePath: string;
  private readonly audioRootDir: string;
  private readonly avatarRootDir: string;
  private readonly chunkTempDir: string;
  private readonly backupsDir: string;
  private readonly permanentAudioBackupDir: string;
  private readonly firestoreMirror?: QuranEcosystemDeps['firestoreMirror'];
  private readonly onCatalogChange?: QuranEcosystemDeps['onCatalogChange'];
  private store: QuranEcosystemStore;

  constructor(deps: QuranEcosystemDeps) {
    this.storePath = path.join(deps.dataDir, 'quran_ecosystem_store.json');
    this.audioRootDir = path.join(deps.uploadsDir, 'quran-audio');
    this.avatarRootDir = path.join(deps.uploadsDir, 'qari-avatars');
    this.chunkTempDir = path.join(deps.uploadsDir, '.tmp-audio-chunks');
    this.backupsDir = path.join(deps.dataDir, 'backups');
    this.permanentAudioBackupDir = path.join(deps.dataDir, 'backups', 'permanent-audio');
    this.firestoreMirror = deps.firestoreMirror;
    this.onCatalogChange = deps.onCatalogChange;

    fs.mkdirSync(deps.dataDir, { recursive: true });
    fs.mkdirSync(this.audioRootDir, { recursive: true });
    fs.mkdirSync(this.avatarRootDir, { recursive: true });
    fs.mkdirSync(this.chunkTempDir, { recursive: true });
    fs.mkdirSync(this.backupsDir, { recursive: true });
    fs.mkdirSync(this.permanentAudioBackupDir, { recursive: true });

    this.store = this.loadOrInitStore();
  }

  private emitCatalogChange(event: {
    kind: 'qari' | 'audio' | 'backup';
    qariId: string;
    surahNumber?: number;
    action: string;
  }): void {
    if (!this.onCatalogChange) return;
    try {
      const maybePromise = this.onCatalogChange(event);
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        (maybePromise as Promise<void>).catch(() => {});
      }
    } catch {
      // non-fatal
    }
  }

  private loadOrInitStore(): QuranEcosystemStore {
    const now = new Date().toISOString();
    let parsed: Partial<QuranEcosystemStore> | null = null;
    try {
      if (fs.existsSync(this.storePath)) {
        parsed = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'));
      }
    } catch {
      parsed = null;
    }

    const qaris: Record<string, QariProfileRecord> = parsed?.qaris || {};

    // Seed dedicated permanent Odiljon qori profile (114-surah managed ecosystem) without overwriting admin edits
    if (!qaris[ODILJON_QORI_ID]) {
      qaris[ODILJON_QORI_ID] = {
        id: ODILJON_QORI_ID,
        nameUz: 'Odiljon qori',
        nameAr: 'عادل جان قارئ',
        nameLatn: 'Odiljon qori',
        countryUz: 'Oʻzbekiston',
        styleUz: 'Murattal · 114 Sura Doimiy Arxiv',
        bioUz:
          'Oʻzbekistonlik qori Odiljon qori tilovatlari — 114 ta sura doimiy xavfsiz xotirada, SHA-256 nazorati va mustaqil zaxira nusxa bilan Web, Android v7, Telegram Mini App va Telegram Bot boʻylab yagona sinxronlanadi.',
        avatarUrl: '/images/quran_illumination_art_1793634658336.jpg',
        isActive: true,
        isVerified: true,
        isFeatured: true,
        isProtectedPermanent: true,
        sortOrder: 2,
        externalSurahBaseUrl: undefined,
        uploadedSurahsCount: 0,
        verifiedSurahsCount: 0,
        publishedSurahsCount: 0,
        syncedSurahsCount: 0,
        archivedSurahsCount: 0,
        missingSurahsCount: 114,
        isCompleteReady: false,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'system_seed_v7',
      };
    } else {
      // Enforce permanent deletion protection on Odiljon qori
      qaris[ODILJON_QORI_ID].isProtectedPermanent = true;
    }

    // Seed canonical verified reciters from quranData.ts without overwriting admin edits
    QURAN_RECITERS.forEach((rec, idx) => {
      if (!qaris[rec.id]) {
        const countryLabel = rec.country || 'Xalqaro';
        const styleLabel = rec.style || 'Murattal';
        qaris[rec.id] = {
          id: rec.id,
          nameUz: rec.name,
          nameAr: rec.nameAr || rec.name,
          nameLatn: rec.name,
          countryUz: countryLabel,
          styleUz: styleLabel,
          bioUz: rec.biographyUz || `${rec.name} (${countryLabel}) — ${styleLabel} uslubidagi mashhur Qurʼon qorisi.`,
          avatarUrl: rec.profileImageUrl || '/images/quran_illumination_art_1793634658336.jpg',
          isActive: rec.isActive !== false,
          isVerified: true,
          isFeatured: idx < 4,
          sortOrder: idx === 0 ? 1 : idx + 3,
          externalSurahBaseUrl: rec.surahServerBaseUrl || undefined,
          uploadedSurahsCount: 0,
          verifiedSurahsCount: 0,
          publishedSurahsCount: 0,
          syncedSurahsCount: 0,
          archivedSurahsCount: 0,
          missingSurahsCount: rec.surahServerBaseUrl ? 0 : 114,
          isCompleteReady: Boolean(rec.surahServerBaseUrl),
          createdAt: now,
          updatedAt: now,
          updatedBy: 'system_seed',
        };
      }
    });

    const store: QuranEcosystemStore = {
      schemaVersion: 2,
      qaris,
      audioFiles: parsed?.audioFiles || {},
      playlists: parsed?.playlists && Object.keys(parsed.playlists).length > 0 ? parsed.playlists : createOfficialPlaylists(),
      tajweedLessons:
        parsed?.tajweedLessons && Object.keys(parsed.tajweedLessons).length > 0
          ? parsed.tajweedLessons
          : createDefaultTajweedLessons(),
      educationQuizzes:
        parsed?.educationQuizzes && Object.keys(parsed.educationQuizzes).length > 0
          ? parsed.educationQuizzes
          : createDefaultEducationQuizzes(),
      userProfiles: parsed?.userProfiles || {},
      auditLogs: Array.isArray(parsed?.auditLogs) ? parsed.auditLogs : [],
      updatedAt: parsed?.updatedAt || now,
    };

    this.recomputeQariCounters(store);
    this.persistStore(store);
    return store;
  }

  private recomputeQariCounters(store: QuranEcosystemStore): void {
    const counts: Record<
      string,
      { uploaded: number; verified: number; published: number; synced: number; archived: number }
    > = {};
    for (const audio of Object.values(store.audioFiles)) {
      if (!counts[audio.qariId]) {
        counts[audio.qariId] = { uploaded: 0, verified: 0, published: 0, synced: 0, archived: 0 };
      }
      if (audio.isDeleted || audio.status === 'ARCHIVED') {
        counts[audio.qariId].archived += 1;
        continue;
      }
      counts[audio.qariId].uploaded += 1;
      if (audio.status === 'VERIFIED' || audio.status === 'PUBLISHED') {
        counts[audio.qariId].verified += 1;
      }
      if (audio.status === 'PUBLISHED') {
        counts[audio.qariId].published += 1;
        if (audio.integrityStatus !== 'corrupted' && audio.integrityStatus !== 'missing_file') {
          counts[audio.qariId].synced += 1;
        }
      }
    }
    for (const qari of Object.values(store.qaris)) {
      const c = counts[qari.id] || { uploaded: 0, verified: 0, published: 0, synced: 0, archived: 0 };
      const hasExternalCdn = Boolean(qari.externalSurahBaseUrl && qari.externalSurahBaseUrl.trim());
      qari.uploadedSurahsCount = c.uploaded;
      qari.verifiedSurahsCount = c.verified;
      qari.publishedSurahsCount = c.published;
      qari.syncedSurahsCount = hasExternalCdn ? 114 : c.synced;
      qari.archivedSurahsCount = c.archived;
      qari.missingSurahsCount = hasExternalCdn ? 0 : Math.max(0, 114 - c.uploaded);
      // STRICT HONESTY RULE: A custom/permanent Qari is ONLY complete-ready when ALL 114 surahs are uploaded, verified & published!
      qari.isCompleteReady = hasExternalCdn ? true : c.published === 114 && c.synced === 114;
    }
  }

  private persistStore(nextStore: QuranEcosystemStore = this.store): void {
    nextStore.updatedAt = new Date().toISOString();
    const tmp = `${this.storePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(nextStore, null, 2), 'utf-8');
    fs.renameSync(tmp, this.storePath);
    this.store = nextStore;
  }

  private recordAudit(
    actor: string,
    action: string,
    targetType: QuranAuditEntry['targetType'],
    targetId: string,
    summary: string
  ): void {
    const entry: QuranAuditEntry = {
      id: `qaud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      actor,
      action,
      targetType,
      targetId,
      summary,
      createdAt: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(entry);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs = this.store.auditLogs.slice(0, 500);
    }
  }

  private safeSlug(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 64);
  }

  // =========================================================================
  // 1. QORILAR & PERSISTENT 114-SURAH AUDIO STORAGE
  // =========================================================================

  public listQaris(includeInactive = false): QariProfileRecord[] {
    return Object.values(this.store.qaris)
      .filter((q) => includeInactive || q.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.nameUz.localeCompare(b.nameUz));
  }

  public getQari(qariId: string): QariProfileRecord | null {
    return this.store.qaris[qariId] || null;
  }

  public async upsertQari(
    input: Partial<QariProfileRecord> & { nameUz: string },
    actor: string
  ): Promise<QariProfileRecord> {
    const now = new Date().toISOString();
    const id = this.safeSlug(input.id || input.nameUz) || `qari_${Date.now()}`;
    const existing = this.store.qaris[id];

    const record: QariProfileRecord = {
      id,
      nameUz: input.nameUz.trim().slice(0, 140),
      nameAr: (input.nameAr || existing?.nameAr || input.nameUz).trim().slice(0, 140),
      nameLatn: (input.nameLatn || existing?.nameLatn || input.nameUz).trim().slice(0, 140),
      countryUz: (input.countryUz || existing?.countryUz || 'Oʻzbekiston').trim().slice(0, 80),
      styleUz: (input.styleUz || existing?.styleUz || 'Murattal').trim().slice(0, 80),
      bioUz: (input.bioUz || existing?.bioUz || '').trim().slice(0, 800),
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : existing?.avatarUrl,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing ? existing.isActive : true,
      isVerified: input.isVerified !== undefined ? Boolean(input.isVerified) : existing ? existing.isVerified : true,
      isFeatured: input.isFeatured !== undefined ? Boolean(input.isFeatured) : existing ? existing.isFeatured : false,
      isProtectedPermanent:
        id === ODILJON_QORI_ID
          ? true
          : input.isProtectedPermanent !== undefined
            ? Boolean(input.isProtectedPermanent)
            : Boolean(existing?.isProtectedPermanent),
      sortOrder:
        typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
          ? Math.max(0, Math.min(9999, Math.round(input.sortOrder)))
          : existing?.sortOrder ?? Object.keys(this.store.qaris).length + 1,
      externalSurahBaseUrl:
        input.externalSurahBaseUrl !== undefined
          ? input.externalSurahBaseUrl.trim() || undefined
          : existing?.externalSurahBaseUrl,
      uploadedSurahsCount: existing?.uploadedSurahsCount || 0,
      verifiedSurahsCount: existing?.verifiedSurahsCount || 0,
      publishedSurahsCount: existing?.publishedSurahsCount || 0,
      syncedSurahsCount: existing?.syncedSurahsCount || 0,
      archivedSurahsCount: existing?.archivedSurahsCount || 0,
      missingSurahsCount: existing?.missingSurahsCount ?? 114,
      isCompleteReady: existing?.isCompleteReady ?? false,
      lastIntegrityCheckAt: existing?.lastIntegrityCheckAt,
      lastBackupAt: existing?.lastBackupAt,
      lastRestoreTestAt: existing?.lastRestoreTestAt,
      lastRestoreTestPassed: existing?.lastRestoreTestPassed,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updatedBy: actor,
    };

    this.store.qaris[id] = record;
    this.recomputeQariCounters(this.store);
    this.recordAudit(actor, existing ? 'QARI_UPDATED' : 'QARI_CREATED', 'qari', id, `Qori: ${record.nameUz}`);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('qariProfiles', id, record).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'qari', qariId: id, action: existing ? 'updated' : 'created' });
    return record;
  }

  public async uploadQariAvatar(
    qariId: string,
    buffer: Buffer,
    actor: string
  ): Promise<{ ok: boolean; avatarUrl?: string; qari?: QariProfileRecord; error?: string }> {
    const qari = this.store.qaris[qariId];
    if (!qari) return { ok: false, error: 'Qori topilmadi.' };
    if (!buffer || buffer.length < 32) return { ok: false, error: 'Rasm fayli boʻsh.' };
    if (buffer.length > 5 * 1024 * 1024) return { ok: false, error: 'Profil rasmi 5 MB dan oshmasligi kerak.' };

    const magic = validateImageMagicBytes(buffer);
    if (!magic.valid) {
      return { ok: false, error: 'Faqat haqiqiy JPEG, PNG yoki WebP rasm fayllari qabul qilinadi.' };
    }

    const safeName = `${this.safeSlug(qariId)}${magic.detectedExt}`;
    const targetAbs = path.resolve(this.avatarRootDir, safeName);
    if (!targetAbs.startsWith(path.resolve(this.avatarRootDir) + path.sep)) {
      return { ok: false, error: 'Xavfsizlik: yaroqsiz fayl nomi.' };
    }
    const tmp = `${targetAbs}.tmp`;
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, targetAbs);

    const avatarUrl = `/uploads/qari-avatars/${safeName}?v=${Date.now()}`;
    qari.avatarUrl = avatarUrl;
    qari.updatedAt = new Date().toISOString();
    qari.updatedBy = actor;
    this.recordAudit(actor, 'QARI_AVATAR_UPDATED', 'qari', qariId, `Profil rasmi yangilandi (${buffer.length} bayt)`);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('qariProfiles', qariId, qari).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'qari', qariId, action: 'avatar_updated' });
    return { ok: true, avatarUrl, qari };
  }

  public async deleteQari(qariId: string, actor: string, force = false): Promise<{ ok: boolean; error?: string }> {
    const qari = this.store.qaris[qariId];
    if (!qari) return { ok: false, error: 'Qori topilmadi.' };
    if (qari.isProtectedPermanent && !force) {
      return {
        ok: false,
        error:
          'Umrbod himoyalangan qori profilini oddiy amal bilan oʻchirish taqiqlangan. Vaqtincha yashirish (isActive=false) dan foydalaning.',
      };
    }
    if (qari.publishedSurahsCount > 0 && !force) {
      return {
        ok: false,
        error: `Ushbu qorida ${qari.publishedSurahsCount} ta eʼlon qilingan sura bor. Avval tasdiqlang (force=true).`,
      };
    }
    qari.isActive = false;
    qari.updatedAt = new Date().toISOString();
    qari.updatedBy = actor;
    this.recordAudit(actor, 'QARI_DEACTIVATED', 'qari', qariId, `Qori vaqtincha yashirildi: ${qari.nameUz}`);
    this.persistStore();
    if (this.firestoreMirror) {
      await this.firestoreMirror('qariProfiles', qariId, qari).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'qari', qariId, action: 'deactivated' });
    return { ok: true };
  }

  /**
   * Mirrors a verified audio buffer into the independent permanent backup directory
   * (`data/backups/permanent-audio/<qariId>/`) with SHA-256 manifest.
   */
  private mirrorAudioToPermanentBackup(
    qariId: string,
    surahNum: number,
    version: number,
    ext: string,
    buffer: Buffer,
    sha256: string
  ): { backupRelativePath: string; backupVerified: boolean } {
    const safeBackupQariDir = path.resolve(this.permanentAudioBackupDir, qariId);
    if (!safeBackupQariDir.startsWith(path.resolve(this.permanentAudioBackupDir) + path.sep)) {
      return { backupRelativePath: '', backupVerified: false };
    }
    fs.mkdirSync(safeBackupQariDir, { recursive: true });
    const backupFileName = `surah-${String(surahNum).padStart(3, '0')}-v${version}${ext}`;
    const backupAbs = path.resolve(safeBackupQariDir, backupFileName);
    if (!backupAbs.startsWith(safeBackupQariDir + path.sep)) {
      return { backupRelativePath: '', backupVerified: false };
    }

    const tmpPath = `${backupAbs}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, backupAbs);

    // Re-read backup to confirm byte-for-byte SHA-256 integrity
    const verifyHash = crypto.createHash('sha256').update(fs.readFileSync(backupAbs)).digest('hex');
    const verified = verifyHash === sha256;

    // Update per-Qari independent backup manifest.json
    const manifestPath = path.join(safeBackupQariDir, 'manifest.json');
    let manifest: Record<string, any> = { qariId, updatedAt: new Date().toISOString(), files: {} };
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (!manifest.files || typeof manifest.files !== 'object') manifest.files = {};
      }
    } catch {
      manifest = { qariId, updatedAt: new Date().toISOString(), files: {} };
    }
    manifest.updatedAt = new Date().toISOString();
    manifest.files[String(surahNum).padStart(3, '0')] = {
      surahNumber: surahNum,
      version,
      fileName: backupFileName,
      sha256,
      sizeBytes: buffer.length,
      verified,
      backedUpAt: new Date().toISOString(),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return {
      backupRelativePath: path.posix.join(qariId, backupFileName),
      backupVerified: verified,
    };
  }

  /**
   * Lists all 114 surah slots for a Qari with real persistent upload status + verified external fallback URL (if any).
   */
  public getQariSurahCatalog(qariId: string, includeUnpublished = false) {
    const qari = this.store.qaris[qariId];
    if (!qari) return null;

    const missingSurahs: number[] = [];
    const errorSurahs: Array<{ surahNumber: number; nameUz: string; reason: string }> = [];

    const surahs = SURAHS_LIST.map((surah) => {
      const audioId = `${qariId}_s${String(surah.number).padStart(3, '0')}`;
      const uploaded = this.store.audioFiles[audioId];
      const isArchived = Boolean(uploaded && (uploaded.isDeleted || uploaded.status === 'ARCHIVED'));
      const hasActivePersistent = Boolean(uploaded && !isArchived);
      const canServeUploaded = hasActivePersistent && (includeUnpublished || uploaded.status === 'PUBLISHED');

      let resolvedAudioUrl: string | null = null;
      let audioSource: 'uploaded_persistent' | 'verified_cdn' | 'unavailable' = 'unavailable';

      if (canServeUploaded) {
        resolvedAudioUrl = uploaded.streamUrl;
        audioSource = 'uploaded_persistent';
      } else if (qari.externalSurahBaseUrl) {
        const padded = String(surah.number).padStart(3, '0');
        resolvedAudioUrl = `${qari.externalSurahBaseUrl.replace(/\/$/, '')}/${padded}.mp3`;
        audioSource = 'verified_cdn';
      }

      if (!hasActivePersistent && !qari.externalSurahBaseUrl) {
        missingSurahs.push(surah.number);
      }
      if (hasActivePersistent && (uploaded.integrityStatus === 'corrupted' || uploaded.integrityStatus === 'missing_file')) {
        errorSurahs.push({
          surahNumber: surah.number,
          nameUz: surah.nameUz,
          reason:
            uploaded.integrityStatus === 'corrupted'
              ? 'SHA-256 nazorati mos kelmadi (fayl shikastlangan)'
              : 'Asosiy diskdagi fayl topilmadi (zaxiradan tiklash kerak)',
        });
      }

      return {
        surahNumber: surah.number,
        nameUz: surah.nameUz,
        nameAr: surah.nameAr,
        meaningUz: surah.meaningUz,
        numberOfAyahs: surah.numberOfAyahs,
        revelationType: surah.revelationType,
        pageNumber: surah.pageNumber,
        juzNumber: surah.juzNumber || 1,
        audioId,
        audioSource,
        audioUrl: resolvedAudioUrl,
        isArchived,
        uploadedRecord: uploaded
          ? {
              id: uploaded.id,
              status: uploaded.status,
              mimeType: uploaded.mimeType,
              fileName: uploaded.fileName,
              sizeBytes: uploaded.sizeBytes,
              durationSec: uploaded.durationSec,
              sha256: uploaded.sha256,
              version: uploaded.version,
              backupVerified: Boolean(uploaded.backupVerified),
              backupRelativePath: uploaded.backupRelativePath,
              integrityStatus: uploaded.integrityStatus || 'ok',
              lastIntegrityCheckAt: uploaded.lastIntegrityCheckAt,
              uploadedAt: uploaded.uploadedAt,
              verifiedAt: uploaded.verifiedAt,
              publishedAt: uploaded.publishedAt,
              archivedAt: uploaded.archivedAt,
              isDeleted: Boolean(uploaded.isDeleted),
              versionCount: uploaded.versionHistory?.length || 1,
            }
          : null,
      };
    });

    const uploadedCount = surahs.filter((s) => s.uploadedRecord !== null && !s.isArchived).length;
    const verifiedCount = surahs.filter(
      (s) => s.uploadedRecord && !s.isArchived && (s.uploadedRecord.status === 'VERIFIED' || s.uploadedRecord.status === 'PUBLISHED')
    ).length;
    const publishedCount = surahs.filter((s) => s.uploadedRecord && !s.isArchived && s.uploadedRecord.status === 'PUBLISHED').length;
    const archivedCount = surahs.filter((s) => s.isArchived).length;
    const backedUpCount = surahs.filter((s) => s.uploadedRecord && !s.isArchived && s.uploadedRecord.backupVerified).length;
    const playableCount = surahs.filter((s) => Boolean(s.audioUrl)).length;
    const isCompleteReady = Boolean(qari.externalSurahBaseUrl)
      ? true
      : publishedCount === 114 && errorSurahs.length === 0;

    return {
      qari,
      surahs,
      totalSurahs: 114,
      uploadedCount,
      verifiedCount,
      publishedCount,
      syncedCount: Boolean(qari.externalSurahBaseUrl) ? 114 : publishedCount,
      archivedCount,
      backedUpCount,
      missingCount: missingSurahs.length,
      errorCount: errorSurahs.length,
      missingSurahs,
      errorSurahs,
      playableCount,
      isCompleteReady,
      readinessLabelUz: isCompleteReady
        ? 'Toʻliq tayyor (114/114 sura tasdiqlangan va sinxronlangan)'
        : `Toʻliq emas (${publishedCount}/114 sura tayyor, ${missingSurahs.length} ta yetishmayapti)`,
      storageSummary: {
        primaryVaultPath: `data/uploads/quran-audio/${qari.id}`,
        independentBackupPath: `data/backups/permanent-audio/${qari.id}`,
        permanentDeleteProtected: Boolean(qari.isProtectedPermanent),
        firestoreStoresOnlyMetadata: true,
        lastIntegrityCheckAt: qari.lastIntegrityCheckAt || null,
        lastBackupAt: qari.lastBackupAt || null,
        lastRestoreTestAt: qari.lastRestoreTestAt || null,
        lastRestoreTestPassed: qari.lastRestoreTestPassed ?? null,
      },
      platformSync: {
        webApp: { synced: true, availableSurahs: playableCount, endpoint: `/api/quran-ecosystem/qaris/${qari.id}/surahs` },
        telegramMiniApp: { synced: true, availableSurahs: playableCount, endpoint: `/api/quran-ecosystem/qaris/${qari.id}/surahs` },
        androidV7: { synced: true, availableSurahs: playableCount, endpoint: `/api/quran-ecosystem/qaris/${qari.id}/surahs` },
        telegramBot: { synced: true, availableSurahs: playableCount, source: 'CentralContent + QuranEcosystem' },
      },
    };
  }

  /**
   * Persistent audio upload with magic-byte verification, SHA-256 checksum, duplicate detection,
   * versioned immutable storage, independent permanent backup mirror, and DRAFT -> VERIFIED -> PUBLISHED gating.
   */
  public async uploadQariSurahAudio(params: {
    qariId: string;
    surahNumber: number;
    buffer: Buffer;
    mimeType?: string;
    originalFilename?: string;
    durationSec?: number;
    autoPublish?: boolean;
    allowDuplicateChecksum?: boolean;
    actor: string;
  }): Promise<{ ok: boolean; record?: QariSurahAudioRecord; duplicateOf?: string; error?: string }> {
    const qari = this.store.qaris[params.qariId];
    if (!qari) return { ok: false, error: 'Qori topilmadi.' };

    const surahNum = Math.floor(Number(params.surahNumber));
    const surahInfo = SURAHS_LIST.find((s) => s.number === surahNum);
    if (!surahInfo) return { ok: false, error: 'Sura raqami 1 dan 114 gacha boʻlishi shart.' };

    if (!params.buffer || params.buffer.length < 32) {
      return { ok: false, error: 'Audio fayl boʻsh yoki juda kichik.' };
    }
    if (params.buffer.length > MAX_AUDIO_FILE_BYTES) {
      return { ok: false, error: 'Audio fayl hajmi 85 MB limitidan oshib ketdi.' };
    }
    if (params.mimeType && !ALLOWED_AUDIO_MIME_TYPES.has(params.mimeType.toLowerCase())) {
      return { ok: false, error: `Ruxsat etilmagan fayl turi: ${params.mimeType}` };
    }

    const magic = validateAudioMagicBytes(params.buffer);
    if (!magic.valid) {
      return {
        ok: false,
        error: 'Fayl haqiqiy audio (MP3/M4A/OGG/WAV) formatida emas. Soxta yoki notoʻgʻri fayl rad etildi.',
      };
    }

    const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');
    const audioId = `${qari.id}_s${String(surahNum).padStart(3, '0')}`;

    // Duplicate checksum check across other surahs for same Qari
    if (!params.allowDuplicateChecksum) {
      const dup = Object.values(this.store.audioFiles).find(
        (f) => !f.isDeleted && f.status !== 'ARCHIVED' && f.qariId === qari.id && f.id !== audioId && f.sha256 === sha256
      );
      if (dup) {
        return {
          ok: false,
          duplicateOf: dup.id,
          error: `Ushbu audio fayl allaqachon ${dup.surahNumber}-sura (${dup.surahNameUz}) sifatida yuklangan (SHA-256 mos keldi).`,
        };
      }
    }

    // Strict path confinement inside data/uploads/quran-audio/<qariId>/
    const safeQariDir = path.resolve(this.audioRootDir, qari.id);
    if (!safeQariDir.startsWith(path.resolve(this.audioRootDir) + path.sep)) {
      return { ok: false, error: 'Xavfsizlik: ruxsat etilmagan papka yoʻli.' };
    }
    fs.mkdirSync(safeQariDir, { recursive: true });

    const existing = this.store.audioFiles[audioId];
    const nextVersion = (existing?.version || 0) + 1;
    const padded = String(surahNum).padStart(3, '0');

    // Immutable versioned file + canonical latest file so older versions are never overwritten
    const versionedFileName = `surah-${padded}-v${nextVersion}${magic.detectedExt}`;
    const canonicalFileName = `surah-${padded}${magic.detectedExt}`;
    const versionedAbsPath = path.resolve(safeQariDir, versionedFileName);
    const canonicalAbsPath = path.resolve(safeQariDir, canonicalFileName);
    if (
      !versionedAbsPath.startsWith(safeQariDir + path.sep) ||
      !canonicalAbsPath.startsWith(safeQariDir + path.sep)
    ) {
      return { ok: false, error: 'Xavfsizlik: yaroqsiz fayl nomi.' };
    }

    const tmpVer = `${versionedAbsPath}.tmp`;
    fs.writeFileSync(tmpVer, params.buffer);
    fs.renameSync(tmpVer, versionedAbsPath);

    const tmpCan = `${canonicalAbsPath}.tmp`;
    fs.writeFileSync(tmpCan, params.buffer);
    fs.renameSync(tmpCan, canonicalAbsPath);

    // Mirror immediately to independent permanent backup vault
    const backup = this.mirrorAudioToPermanentBackup(
      qari.id,
      surahNum,
      nextVersion,
      magic.detectedExt,
      params.buffer,
      sha256
    );

    const now = new Date().toISOString();
    const status: AudioPublishStatus = params.autoPublish ? 'PUBLISHED' : 'VERIFIED';
    const prevHistory = Array.isArray(existing?.versionHistory) ? existing.versionHistory : [];
    const newVersionEntry: QariAudioVersionEntry = {
      version: nextVersion,
      fileName: versionedFileName,
      relativePath: path.posix.join(qari.id, versionedFileName),
      backupRelativePath: backup.backupRelativePath || undefined,
      sha256,
      sizeBytes: params.buffer.length,
      uploadedAt: now,
      uploadedBy: params.actor,
    };

    const record: QariSurahAudioRecord = {
      id: audioId,
      qariId: qari.id,
      surahNumber: surahNum,
      surahNameUz: surahInfo.nameUz,
      surahNameAr: surahInfo.nameAr,
      fileName: versionedFileName,
      relativePath: path.posix.join(qari.id, versionedFileName),
      backupRelativePath: backup.backupRelativePath || undefined,
      backupVerified: backup.backupVerified,
      streamUrl: `/api/quran-ecosystem/audio-stream/${encodeURIComponent(audioId)}`,
      mimeType: magic.detectedMime,
      sizeBytes: params.buffer.length,
      durationSec:
        typeof params.durationSec === 'number' && params.durationSec > 0
          ? Math.round(params.durationSec)
          : Math.max(1, Math.round(params.buffer.length / 16000)),
      sha256,
      status,
      integrityStatus: 'ok',
      lastIntegrityCheckAt: now,
      version: nextVersion,
      versionHistory: [...prevHistory, newVersionEntry].slice(-25),
      uploadedBy: params.actor,
      uploadedAt: now,
      verifiedAt: now,
      publishedAt: status === 'PUBLISHED' ? now : existing?.publishedAt,
      publishedBy: status === 'PUBLISHED' ? params.actor : existing?.publishedBy,
      archivedAt: undefined,
      archivedBy: undefined,
      isDeleted: false,
    };

    this.store.audioFiles[audioId] = record;
    qari.lastBackupAt = now;
    this.recomputeQariCounters(this.store);
    this.recordAudit(
      params.actor,
      status === 'PUBLISHED' ? 'AUDIO_UPLOADED_AND_PUBLISHED' : 'AUDIO_UPLOADED_VERIFIED',
      'audio',
      audioId,
      `${qari.nameUz} · ${surahNum}-sura (${surahInfo.nameUz}) v${nextVersion} · ${params.buffer.length} bayt · Backup:${backup.backupVerified ? 'OK' : 'WARN'}`
    );
    this.persistStore();

    if (this.firestoreMirror) {
      // Only metadata, path & SHA-256 stored in Firestore (NEVER binary audio)
      await this.firestoreMirror('quranAudioFiles', audioId, record).catch(() => {});
      await this.firestoreMirror('qariProfiles', qari.id, this.store.qaris[qari.id]).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'audio', qariId: qari.id, surahNumber: surahNum, action: 'uploaded' });

    return { ok: true, record };
  }

  /**
   * Resumable chunked upload — stores each chunk safely in isolated temp folder (never touches permanent vault).
   */
  public appendAudioUploadChunk(params: {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    chunkBuffer: Buffer;
  }): { ok: boolean; receivedChunks: number; totalChunks: number; error?: string } {
    const safeId = this.safeSlug(params.uploadId);
    if (!safeId) return { ok: false, receivedChunks: 0, totalChunks: 0, error: 'Yaroqsiz uploadId.' };
    if (!Number.isInteger(params.chunkIndex) || params.chunkIndex < 0 || params.chunkIndex >= params.totalChunks) {
      return { ok: false, receivedChunks: 0, totalChunks: params.totalChunks, error: 'Yaroqsiz chunkIndex.' };
    }
    if (params.totalChunks > 256) {
      return { ok: false, receivedChunks: 0, totalChunks: params.totalChunks, error: 'Chunklar soni limitdan oshdi.' };
    }
    const dir = path.resolve(this.chunkTempDir, safeId);
    if (!dir.startsWith(path.resolve(this.chunkTempDir) + path.sep)) {
      return { ok: false, receivedChunks: 0, totalChunks: params.totalChunks, error: 'Xavfsizlik xatosi.' };
    }
    fs.mkdirSync(dir, { recursive: true });
    const chunkPath = path.join(dir, `chunk_${String(params.chunkIndex).padStart(5, '0')}.part`);
    fs.writeFileSync(chunkPath, params.chunkBuffer);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.part'));
    return { ok: true, receivedChunks: files.length, totalChunks: params.totalChunks };
  }

  public async completeChunkedAudioUpload(params: {
    uploadId: string;
    totalChunks: number;
    qariId: string;
    surahNumber: number;
    mimeType?: string;
    originalFilename?: string;
    durationSec?: number;
    autoPublish?: boolean;
    allowDuplicateChecksum?: boolean;
    actor: string;
  }): Promise<{ ok: boolean; record?: QariSurahAudioRecord; duplicateOf?: string; error?: string }> {
    const safeId = this.safeSlug(params.uploadId);
    const dir = path.resolve(this.chunkTempDir, safeId);
    if (!dir.startsWith(path.resolve(this.chunkTempDir) + path.sep) || !fs.existsSync(dir)) {
      return { ok: false, error: 'Yuklash sessiyasi topilmadi.' };
    }
    try {
      const parts: Buffer[] = [];
      let totalBytes = 0;
      for (let i = 0; i < params.totalChunks; i++) {
        const p = path.join(dir, `chunk_${String(i).padStart(5, '0')}.part`);
        if (!fs.existsSync(p)) {
          return { ok: false, error: `${i + 1}-boʻlak yetishmayapti — qayta yuklang (resumable).` };
        }
        const buf = fs.readFileSync(p);
        totalBytes += buf.length;
        if (totalBytes > MAX_AUDIO_FILE_BYTES) {
          return { ok: false, error: 'Umumiy fayl hajmi 85 MB limitidan oshdi.' };
        }
        parts.push(buf);
      }
      const merged = Buffer.concat(parts);
      const res = await this.uploadQariSurahAudio({
        qariId: params.qariId,
        surahNumber: params.surahNumber,
        buffer: merged,
        mimeType: params.mimeType,
        originalFilename: params.originalFilename,
        durationSec: params.durationSec,
        autoPublish: params.autoPublish,
        allowDuplicateChecksum: params.allowDuplicateChecksum,
        actor: params.actor,
      });
      if (res.ok) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return res;
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Boʻlaklarni birlashtirishda xatolik.' };
    }
  }

  /**
   * Batch imports up to 114 surah audio files from a ZIP archive with strict per-file validation.
   */
  public async importQariZipArchive(params: {
    qariId: string;
    zipBuffer: Buffer;
    autoPublish?: boolean;
    allowDuplicateChecksum?: boolean;
    actor: string;
  }): Promise<{
    ok: boolean;
    importedCount: number;
    failedCount: number;
    imported: Array<{ surahNumber: number; fileName: string; sha256: string; version: number }>;
    errors: Array<{ fileName: string; error: string }>;
    error?: string;
  }> {
    const qari = this.store.qaris[params.qariId];
    if (!qari) {
      return { ok: false, importedCount: 0, failedCount: 0, imported: [], errors: [], error: 'Qori topilmadi.' };
    }

    let entries: Array<{ fileName: string; buffer: Buffer }>;
    try {
      entries = extractAudioEntriesFromZipBuffer(params.zipBuffer);
    } catch (err: any) {
      return {
        ok: false,
        importedCount: 0,
        failedCount: 0,
        imported: [],
        errors: [],
        error: err?.message || 'ZIP faylni ochib boʻlmadi.',
      };
    }

    if (entries.length === 0) {
      return {
        ok: false,
        importedCount: 0,
        failedCount: 0,
        imported: [],
        errors: [],
        error: 'ZIP arxiv ichida qoʻllab-quvvatlanadigan audio fayllar (.mp3/.m4a/.ogg/.wav) topilmadi.',
      };
    }

    const imported: Array<{ surahNumber: number; fileName: string; sha256: string; version: number }> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const entry of entries) {
      const surahNum = detectSurahNumberFromFilename(entry.fileName);
      if (!surahNum) {
        errors.push({ fileName: entry.fileName, error: 'Fayl nomidan 1–114 sura raqami aniqlanmadi.' });
        continue;
      }
      const res = await this.uploadQariSurahAudio({
        qariId: params.qariId,
        surahNumber: surahNum,
        buffer: entry.buffer,
        originalFilename: entry.fileName,
        autoPublish: params.autoPublish,
        allowDuplicateChecksum: params.allowDuplicateChecksum,
        actor: params.actor,
      });
      if (res.ok && res.record) {
        imported.push({
          surahNumber: surahNum,
          fileName: entry.fileName,
          sha256: res.record.sha256,
          version: res.record.version,
        });
      } else {
        errors.push({ fileName: entry.fileName, error: res.error || 'Yuklash xatosi' });
      }
    }

    this.recordAudit(
      params.actor,
      'AUDIO_ZIP_BATCH_IMPORTED',
      'qari',
      params.qariId,
      `ZIP import: ${imported.length} ta muvaffaqiyatli, ${errors.length} ta xatolik`
    );
    this.persistStore();

    return {
      ok: imported.length > 0,
      importedCount: imported.length,
      failedCount: errors.length,
      imported,
      errors,
    };
  }

  public async setAudioStatus(
    audioId: string,
    status: AudioPublishStatus,
    actor: string
  ): Promise<{ ok: boolean; record?: QariSurahAudioRecord; error?: string }> {
    const rec = this.store.audioFiles[audioId];
    if (!rec) return { ok: false, error: 'Audio yozuv topilmadi.' };

    // Verify file still exists on disk before publishing or verifying
    if (status === 'PUBLISHED' || status === 'VERIFIED') {
      const absPath = this.resolveAudioFilePath(audioId, true);
      if (!absPath || !fs.existsSync(absPath)) {
        return { ok: false, error: 'Audio fayl server diskida topilmadi — eʼlon qilish bloklandi.' };
      }
      const diskSha = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
      if (diskSha !== rec.sha256) {
        rec.integrityStatus = 'corrupted';
        this.persistStore();
        return { ok: false, error: 'SHA-256 nazorati mos kelmadi — fayl shikastlangan boʻlishi mumkin!' };
      }
      rec.isDeleted = false;
      rec.integrityStatus = 'ok';
      rec.lastIntegrityCheckAt = new Date().toISOString();
    }

    const now = new Date().toISOString();
    rec.status = status;
    if (status === 'VERIFIED') {
      rec.verifiedAt = now;
    }
    if (status === 'PUBLISHED') {
      rec.verifiedAt = rec.verifiedAt || now;
      rec.publishedAt = now;
      rec.publishedBy = actor;
    }
    if (status === 'ARCHIVED') {
      rec.archivedAt = now;
      rec.archivedBy = actor;
    }

    this.recomputeQariCounters(this.store);
    this.recordAudit(actor, `AUDIO_STATUS_${status}`, 'audio', audioId, `${rec.qariId} · ${rec.surahNumber}-sura -> ${status}`);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('quranAudioFiles', audioId, rec).catch(() => {});
      await this.firestoreMirror('qariProfiles', rec.qariId, this.store.qaris[rec.qariId]).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'audio', qariId: rec.qariId, surahNumber: rec.surahNumber, action: `status_${status}` });
    return { ok: true, record: rec };
  }

  public async publishAllVerifiedForQari(qariId: string, actor: string): Promise<{ ok: boolean; publishedCount: number }> {
    let count = 0;
    const now = new Date().toISOString();
    for (const rec of Object.values(this.store.audioFiles)) {
      if (rec.qariId === qariId && !rec.isDeleted && (rec.status === 'VERIFIED' || rec.status === 'DRAFT')) {
        const abs = this.resolveAudioFilePath(rec.id, true);
        if (abs && fs.existsSync(abs)) {
          rec.status = 'PUBLISHED';
          rec.publishedAt = now;
          rec.publishedBy = actor;
          count += 1;
        }
      }
    }
    this.recomputeQariCounters(this.store);
    this.recordAudit(actor, 'AUDIO_BULK_PUBLISHED', 'qari', qariId, `${count} ta sura ommaviy eʼlon qilindi`);
    this.persistStore();
    if (count > 0) {
      this.emitCatalogChange({ kind: 'audio', qariId, action: 'bulk_published' });
    }
    return { ok: true, publishedCount: count };
  }

  /**
   * Archives/hides a surah audio WITHOUT ever deleting permanent files or backup copies from disk.
   */
  public async deleteAudio(
    audioId: string,
    actor: string,
    confirmDeletePublished = false
  ): Promise<{ ok: boolean; archivedOnly?: boolean; error?: string }> {
    const rec = this.store.audioFiles[audioId];
    if (!rec) return { ok: false, error: 'Audio topilmadi.' };
    const qari = this.store.qaris[rec.qariId];

    if (rec.status === 'PUBLISHED' && !confirmDeletePublished) {
      return {
        ok: false,
        error: 'Eʼlon qilingan audio faylni arxivlash uchun tasdiqlash (confirmDeletePublished=true) talab qilinadi.',
      };
    }

    const now = new Date().toISOString();
    rec.status = 'ARCHIVED';
    rec.archivedAt = now;
    rec.archivedBy = actor;
    // For permanent protected Qaris (like Odiljon qori), NEVER set hard-delete or erase files from disk!
    if (!qari?.isProtectedPermanent) {
      rec.isDeleted = true;
      rec.deletedAt = now;
      rec.deletedBy = actor;
    }

    this.recomputeQariCounters(this.store);
    this.recordAudit(
      actor,
      'AUDIO_ARCHIVED_SAFE',
      'audio',
      audioId,
      `${rec.qariId} · ${rec.surahNumber}-sura xavfsiz arxivlandi (disk va zaxira fayllari saqlab qolindi)`
    );
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('quranAudioFiles', audioId, rec).catch(() => {});
      if (qari) await this.firestoreMirror('qariProfiles', qari.id, qari).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'audio', qariId: rec.qariId, surahNumber: rec.surahNumber, action: 'archived' });
    return { ok: true, archivedOnly: true };
  }

  /**
   * Restores an archived surah audio back to VERIFIED or PUBLISHED after verifying its SHA-256 integrity.
   */
  public async restoreArchivedAudio(
    audioId: string,
    actor: string,
    publishImmediately = true
  ): Promise<{ ok: boolean; record?: QariSurahAudioRecord; restoredFromBackup?: boolean; error?: string }> {
    const rec = this.store.audioFiles[audioId];
    if (!rec) return { ok: false, error: 'Audio yozuv topilmadi.' };

    let absPath = this.resolveAudioFilePath(audioId, true);
    let restoredFromBackup = false;

    // Auto-heal from independent permanent backup if primary disk copy is missing
    if ((!absPath || !fs.existsSync(absPath)) && rec.backupRelativePath) {
      const backupAbs = path.resolve(this.permanentAudioBackupDir, rec.backupRelativePath);
      if (
        backupAbs.startsWith(path.resolve(this.permanentAudioBackupDir) + path.sep) &&
        fs.existsSync(backupAbs) &&
        absPath
      ) {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.copyFileSync(backupAbs, absPath);
        restoredFromBackup = true;
      }
    }

    if (!absPath || !fs.existsSync(absPath)) {
      return { ok: false, error: 'Asosiy va zaxira diskda audio fayl topilmadi.' };
    }

    const sha = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
    if (sha !== rec.sha256) {
      return { ok: false, error: 'Faylning SHA-256 nazorat summasi mos kelmadi.' };
    }

    const now = new Date().toISOString();
    rec.isDeleted = false;
    rec.archivedAt = undefined;
    rec.archivedBy = undefined;
    rec.status = publishImmediately ? 'PUBLISHED' : 'VERIFIED';
    rec.integrityStatus = 'ok';
    rec.lastIntegrityCheckAt = now;
    if (publishImmediately) {
      rec.publishedAt = now;
      rec.publishedBy = actor;
    }

    this.recomputeQariCounters(this.store);
    this.recordAudit(
      actor,
      'AUDIO_RESTORED_FROM_ARCHIVE',
      'audio',
      audioId,
      `${rec.qariId} · ${rec.surahNumber}-sura tiklandi${restoredFromBackup ? ' (zaxiradan)' : ''}`
    );
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('quranAudioFiles', audioId, rec).catch(() => {});
    }
    this.emitCatalogChange({ kind: 'audio', qariId: rec.qariId, surahNumber: rec.surahNumber, action: 'restored' });
    return { ok: true, record: rec, restoredFromBackup };
  }

  /**
   * Performs a live byte-for-byte SHA-256 & backup mirror integrity verification across all uploaded surahs for a Qari.
   */
  public verifyQariAudioIntegrity(qariId: string, actor: string) {
    const qari = this.store.qaris[qariId];
    if (!qari) return null;
    const now = new Date().toISOString();

    const records = Object.values(this.store.audioFiles).filter(
      (r) => r.qariId === qariId && !r.isDeleted && r.status !== 'ARCHIVED'
    );

    let verifiedOk = 0;
    let backupOk = 0;
    const corrupted: Array<{ surahNumber: number; audioId: string; reason: string }> = [];
    const missingBackups: number[] = [];

    for (const rec of records) {
      const absPath = this.resolveAudioFilePath(rec.id, true);
      if (!absPath || !fs.existsSync(absPath)) {
        rec.integrityStatus = 'missing_file';
        rec.lastIntegrityCheckAt = now;
        corrupted.push({ surahNumber: rec.surahNumber, audioId: rec.id, reason: 'Asosiy fayl topilmadi' });
        continue;
      }

      const buf = fs.readFileSync(absPath);
      const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
      if (actualSha !== rec.sha256 || buf.length !== rec.sizeBytes) {
        rec.integrityStatus = 'corrupted';
        rec.lastIntegrityCheckAt = now;
        corrupted.push({
          surahNumber: rec.surahNumber,
          audioId: rec.id,
          reason: `SHA-256 yoki hajm mos kelmadi (kutilgan ${rec.sizeBytes}B, haqiqiy ${buf.length}B)`,
        });
      } else {
        rec.integrityStatus = 'ok';
        rec.lastIntegrityCheckAt = now;
        verifiedOk += 1;
      }

      // Check independent backup mirror
      if (rec.backupRelativePath) {
        const bAbs = path.resolve(this.permanentAudioBackupDir, rec.backupRelativePath);
        if (bAbs.startsWith(path.resolve(this.permanentAudioBackupDir) + path.sep) && fs.existsSync(bAbs)) {
          const bSha = crypto.createHash('sha256').update(fs.readFileSync(bAbs)).digest('hex');
          rec.backupVerified = bSha === rec.sha256;
          if (rec.backupVerified) backupOk += 1;
          else missingBackups.push(rec.surahNumber);
        } else {
          rec.backupVerified = false;
          missingBackups.push(rec.surahNumber);
        }
      } else {
        rec.backupVerified = false;
        missingBackups.push(rec.surahNumber);
      }
    }

    qari.lastIntegrityCheckAt = now;
    this.recomputeQariCounters(this.store);
    this.recordAudit(
      actor,
      'QARI_INTEGRITY_VERIFIED',
      'qari',
      qariId,
      `SHA-256 tekshiruvi: ${verifiedOk}/${records.length} sogʻlom, zaxira: ${backupOk}/${records.length}, xato: ${corrupted.length}`
    );
    this.persistStore();

    return {
      qariId,
      checkedAt: now,
      totalChecked: records.length,
      verifiedOkCount: verifiedOk,
      backupVerifiedCount: backupOk,
      corruptedCount: corrupted.length,
      missingBackupCount: missingBackups.length,
      corrupted,
      missingBackups,
      passed: corrupted.length === 0,
    };
  }

  /**
   * Synchronizes all active surah audio files to independent permanent backup storage
   * AND executes a real non-destructive restore verification test (plus auto-heals any missing/corrupted primary files).
   */
  public runQariBackupAndRestoreTest(qariId: string, actor: string) {
    const qari = this.store.qaris[qariId];
    if (!qari) return null;
    const now = new Date().toISOString();

    const records = Object.values(this.store.audioFiles).filter(
      (r) => r.qariId === qariId && !r.isDeleted && r.status !== 'ARCHIVED'
    );

    let backedUpCount = 0;
    let restoreVerifiedCount = 0;
    let autoHealedCount = 0;
    const failures: Array<{ surahNumber: number; reason: string }> = [];

    for (const rec of records) {
      const primaryAbs = this.resolveAudioFilePath(rec.id, true);
      const ext = path.extname(rec.fileName) || '.mp3';

      // Step 1: Ensure backup exists from primary (if primary exists & matches SHA-256)
      if (primaryAbs && fs.existsSync(primaryAbs)) {
        const primaryBuf = fs.readFileSync(primaryAbs);
        const primarySha = crypto.createHash('sha256').update(primaryBuf).digest('hex');
        if (primarySha === rec.sha256) {
          const mirrored = this.mirrorAudioToPermanentBackup(
            qariId,
            rec.surahNumber,
            rec.version,
            ext,
            primaryBuf,
            rec.sha256
          );
          rec.backupRelativePath = mirrored.backupRelativePath || rec.backupRelativePath;
          rec.backupVerified = mirrored.backupVerified;
          if (mirrored.backupVerified) backedUpCount += 1;
        }
      }

      // Step 2: Restore verification test — read independent backup, verify SHA-256 & magic bytes
      if (!rec.backupRelativePath) {
        failures.push({ surahNumber: rec.surahNumber, reason: 'Zaxira nusxa yoʻli topilmadi' });
        continue;
      }
      const backupAbs = path.resolve(this.permanentAudioBackupDir, rec.backupRelativePath);
      if (!backupAbs.startsWith(path.resolve(this.permanentAudioBackupDir) + path.sep) || !fs.existsSync(backupAbs)) {
        failures.push({ surahNumber: rec.surahNumber, reason: 'Zaxira fayl diskda mavjud emas' });
        continue;
      }
      const backupBuf = fs.readFileSync(backupAbs);
      const backupSha = crypto.createHash('sha256').update(backupBuf).digest('hex');
      const magic = validateAudioMagicBytes(backupBuf);
      if (backupSha !== rec.sha256 || !magic.valid) {
        failures.push({ surahNumber: rec.surahNumber, reason: 'Zaxira fayl SHA-256 yoki audio formati buzilgan' });
        continue;
      }

      // Step 3: If primary file is missing or corrupted, auto-restore from verified backup!
      if (primaryAbs) {
        const primaryOk =
          fs.existsSync(primaryAbs) &&
          crypto.createHash('sha256').update(fs.readFileSync(primaryAbs)).digest('hex') === rec.sha256;
        if (!primaryOk) {
          fs.mkdirSync(path.dirname(primaryAbs), { recursive: true });
          const tmp = `${primaryAbs}.restore.tmp`;
          fs.writeFileSync(tmp, backupBuf);
          fs.renameSync(tmp, primaryAbs);
          rec.integrityStatus = 'ok';
          autoHealedCount += 1;
        }
      }
      restoreVerifiedCount += 1;
    }

    // Also snapshot metadata JSON
    const metaBackup = this.createMetadataBackup(actor);
    const passed = failures.length === 0;
    qari.lastBackupAt = now;
    qari.lastRestoreTestAt = now;
    qari.lastRestoreTestPassed = passed;
    this.recomputeQariCounters(this.store);
    this.recordAudit(
      actor,
      'QARI_BACKUP_RESTORE_TEST',
      'backup',
      qariId,
      `Backup & Restore sinovi: ${restoreVerifiedCount}/${records.length} tasdiqlandi, auto-heal: ${autoHealedCount}, xato: ${failures.length}`
    );
    this.persistStore();
    this.emitCatalogChange({ kind: 'backup', qariId, action: 'backup_restore_tested' });

    return {
      qariId,
      testedAt: now,
      totalActiveSurahs: records.length,
      backedUpCount,
      restoreVerifiedCount,
      autoHealedCount,
      failures,
      passed,
      metadataBackupFile: metaBackup.filename,
      backupDirectory: `data/backups/permanent-audio/${qariId}`,
    };
  }

  public getAudioRecord(audioId: string, includeArchived = false): QariSurahAudioRecord | null {
    const rec = this.store.audioFiles[audioId];
    if (!rec) return null;
    if (!includeArchived && (rec.isDeleted || rec.status === 'ARCHIVED')) return null;
    return rec;
  }

  public resolveAudioFilePath(audioId: string, includeArchived = false): string | null {
    const rec = this.store.audioFiles[audioId];
    if (!rec) return null;
    if (!includeArchived && (rec.isDeleted || rec.status === 'ARCHIVED')) return null;
    const resolvedRoot = path.resolve(this.audioRootDir);
    const resolvedTarget = path.resolve(resolvedRoot, rec.relativePath);
    if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) return null;
    return resolvedTarget;
  }

  public createMetadataBackup(actor: string): { filename: string; path: string; createdAt: string; stats: any } {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quran_ecosystem_backup_${ts}.json`;
    const target = path.join(this.backupsDir, filename);
    fs.writeFileSync(target, JSON.stringify(this.store, null, 2), 'utf-8');
    this.recordAudit(actor, 'QURAN_BACKUP_CREATED', 'backup', filename, 'Qurʼon va audio metadata zaxira nusxasi yaratildi');
    this.persistStore();
    return {
      filename,
      path: `data/backups/${filename}`,
      createdAt: new Date().toISOString(),
      stats: {
        qaris: Object.keys(this.store.qaris).length,
        audioFiles: Object.values(this.store.audioFiles).filter((a) => !a.isDeleted).length,
        playlists: Object.keys(this.store.playlists).length,
        lessons: Object.keys(this.store.tajweedLessons).length,
      },
    };
  }

  // =========================================================================
  // 2. PLAYLISTS (OFFICIAL ADMIN + PERSONAL USER)
  // =========================================================================

  public listPlaylists(userId?: string): { official: QuranPlaylistRecord[]; personal: QuranPlaylistRecord[] } {
    const all = Object.values(this.store.playlists);
    const official = all
      .filter((p) => p.isOfficial)
      .sort((a, b) => a.titleUz.localeCompare(b.titleUz));
    const personal = userId
      ? all
          .filter((p) => !p.isOfficial && p.ownerUserId === userId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [];
    return { official, personal };
  }

  public getPlaylistBySlug(slug: string): QuranPlaylistRecord | null {
    return Object.values(this.store.playlists).find((p) => p.shareSlug === slug || p.id === slug) || null;
  }

  public async upsertPlaylist(params: {
    id?: string;
    ownerUserId: string;
    isOfficial: boolean;
    titleUz: string;
    descriptionUz?: string;
    category?: QuranPlaylistRecord['category'];
    isPublic?: boolean;
    offlineRecommended?: boolean;
    tracks: Array<{ qariId: string; surahNumber: number; titleUz?: string }>;
  }): Promise<QuranPlaylistRecord> {
    const now = new Date().toISOString();
    const id = params.id && this.store.playlists[params.id]
      ? params.id
      : `pl_${params.isOfficial ? 'off' : 'usr'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const existing = this.store.playlists[id];

    // Ownership guard for non-official playlists
    if (existing && !params.isOfficial && existing.ownerUserId !== params.ownerUserId) {
      throw new Error('Ushbu playlistni tahrirlash huquqiga ega emassiz.');
    }

    const cleanTracks: QuranPlaylistTrack[] = (Array.isArray(params.tracks) ? params.tracks : [])
      .filter((t) => t && typeof t.qariId === 'string' && Number(t.surahNumber) >= 1 && Number(t.surahNumber) <= 114)
      .slice(0, 114)
      .map((t) => ({
        qariId: t.qariId,
        surahNumber: Math.floor(Number(t.surahNumber)),
        titleUz: t.titleUz?.slice(0, 120),
        addedAt: now,
      }));

    const record: QuranPlaylistRecord = {
      id,
      ownerUserId: params.isOfficial ? 'official_admin' : params.ownerUserId,
      isOfficial: params.isOfficial,
      isPublic: params.isOfficial ? true : Boolean(params.isPublic ?? true),
      shareSlug: existing?.shareSlug || `${this.safeSlug(params.titleUz) || 'playlist'}-${crypto.randomBytes(2).toString('hex')}`,
      titleUz: params.titleUz.trim().slice(0, 140),
      descriptionUz: (params.descriptionUz || '').trim().slice(0, 500),
      category: params.category || existing?.category || 'custom',
      coverColor: existing?.coverColor || '#064E3B',
      offlineRecommended: Boolean(params.offlineRecommended ?? existing?.offlineRecommended),
      tracks: cleanTracks,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.store.playlists[id] = record;
    this.persistStore();
    if (this.firestoreMirror) {
      await this.firestoreMirror('quranPlaylists', id, record).catch(() => {});
    }
    return record;
  }

  public deletePlaylist(playlistId: string, ownerUserId: string, isAdmin = false): { ok: boolean; error?: string } {
    const existing = this.store.playlists[playlistId];
    if (!existing) return { ok: false, error: 'Playlist topilmadi.' };
    if (!isAdmin && (existing.isOfficial || existing.ownerUserId !== ownerUserId)) {
      return { ok: false, error: 'Bu playlistni oʻchirishga ruxsat yoʻq.' };
    }
    delete this.store.playlists[playlistId];
    this.persistStore();
    return { ok: true };
  }

  // =========================================================================
  // 3. TAJWEED ACADEMY, 28 ARABIC LETTERS & QUIZ BANK
  // =========================================================================

  public getEducationCatalog(includeUnpublished = false) {
    const lessons = Object.values(this.store.tajweedLessons)
      .filter((l) => includeUnpublished || l.isPublished)
      .sort((a, b) => a.order - b.order);
    const quizzes = Object.values(this.store.educationQuizzes).filter((q) => includeUnpublished || q.isPublished);
    return {
      alphabet: CANONICAL_ARABIC_ALPHABET,
      lessons,
      quizzes,
    };
  }

  public async upsertTajweedLesson(input: Partial<TajweedLessonRecord> & { titleUz: string }, actor: string): Promise<TajweedLessonRecord> {
    const now = new Date().toISOString();
    const id = input.id && input.id.trim() ? this.safeSlug(input.id) : `tajweed_${Date.now()}`;
    const existing = this.store.tajweedLessons[id];
    const record: TajweedLessonRecord = {
      id,
      level: input.level || existing?.level || 'beginner',
      order: typeof input.order === 'number' ? input.order : existing?.order ?? Object.keys(this.store.tajweedLessons).length + 1,
      titleUz: input.titleUz.trim().slice(0, 200),
      titleAr: input.titleAr !== undefined ? input.titleAr.trim().slice(0, 200) : existing?.titleAr,
      ruleCategoryUz: (input.ruleCategoryUz || existing?.ruleCategoryUz || 'Tajvid').trim().slice(0, 100),
      summaryUz: (input.summaryUz || existing?.summaryUz || '').trim().slice(0, 400),
      contentUz: (input.contentUz || existing?.contentUz || '').trim().slice(0, 6000),
      examples: Array.isArray(input.examples) ? input.examples.slice(0, 20) : existing?.examples || [],
      teacherName: input.teacherName || existing?.teacherName || 'ASAKA ZIYO Ustozlari',
      audioUrl: input.audioUrl !== undefined ? input.audioUrl : existing?.audioUrl,
      videoUrl: input.videoUrl !== undefined ? input.videoUrl : existing?.videoUrl,
      durationMinutes: typeof input.durationMinutes === 'number' ? Math.max(1, input.durationMinutes) : existing?.durationMinutes || 10,
      isPremium: Boolean(input.isPremium ?? existing?.isPremium ?? false),
      isPublished: Boolean(input.isPublished ?? existing?.isPublished ?? true),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.store.tajweedLessons[id] = record;
    this.recordAudit(actor, existing ? 'LESSON_UPDATED' : 'LESSON_CREATED', 'lesson', id, record.titleUz);
    this.persistStore();
    return record;
  }

  public async upsertEducationQuiz(
    input: Partial<QuranEducationQuizQuestion> & { questionUz: string; optionsUz: string[]; correctIndex: number },
    actor: string
  ): Promise<QuranEducationQuizQuestion> {
    const now = new Date().toISOString();
    const id = input.id && input.id.trim() ? this.safeSlug(input.id) : `eq_${Date.now()}`;
    const existing = this.store.educationQuizzes[id];
    const record: QuranEducationQuizQuestion = {
      id,
      category: input.category || existing?.category || 'tajweed',
      difficulty: input.difficulty || existing?.difficulty || 'oson',
      questionUz: input.questionUz.trim().slice(0, 500),
      arabicPrompt: input.arabicPrompt !== undefined ? input.arabicPrompt.trim().slice(0, 300) : existing?.arabicPrompt,
      audioUrl: input.audioUrl !== undefined ? input.audioUrl : existing?.audioUrl,
      optionsUz: input.optionsUz.slice(0, 4).map((o) => String(o).trim().slice(0, 200)),
      correctIndex: Math.max(0, Math.min(3, Math.floor(Number(input.correctIndex) || 0))),
      explanationUz: (input.explanationUz || existing?.explanationUz || '').trim().slice(0, 1000),
      sourceRef: (input.sourceRef || existing?.sourceRef || 'ASAKA ZIYO Tajvid Akademiyasi').trim().slice(0, 180),
      isPublished: Boolean(input.isPublished ?? existing?.isPublished ?? true),
      createdAt: existing?.createdAt || now,
    };
    this.store.educationQuizzes[id] = record;
    this.recordAudit(actor, existing ? 'QUIZ_UPDATED' : 'QUIZ_CREATED', 'quiz', id, record.questionUz.slice(0, 80));
    this.persistStore();
    return record;
  }

  // =========================================================================
  // 4. UNIFIED CROSS-PLATFORM USER QUR'ON PROFILE (Mushaf, Hifz, Tajweed, Quizzes)
  // =========================================================================

  public getUserProfile(userId: string): UserQuranProfileRecord {
    const existing = this.store.userProfiles[userId];
    if (existing) return existing;
    const today = new Date().toISOString().slice(0, 10);
    return {
      userId,
      lastReadSurah: 1,
      lastReadAyah: 1,
      lastReadPage: 1,
      dailyGoalAyahs: 10,
      dailyGoalMinutes: 15,
      todayAyahsRead: 0,
      todayDateStr: today,
      streakDays: 0,
      favoriteQariIds: ['mishary'],
      favoriteTrackKeys: [],
      bookmarks: [],
      notes: [],
      memorizedAyahKeys: [],
      completedLessonIds: [],
      masteredLetterIds: [],
      hifzRanges: [],
      quizScores: [],
      certificates: [],
      updatedAt: new Date().toISOString(),
    };
  }

  public async updateUserProfile(
    userId: string,
    patch: Partial<UserQuranProfileRecord>
  ): Promise<UserQuranProfileRecord> {
    const current = this.getUserProfile(userId);
    const merged: UserQuranProfileRecord = {
      ...current,
      ...patch,
      userId,
      updatedAt: new Date().toISOString(),
    };

    // Auto-issue certificate if user completed all beginner Tajweed lessons
    const beginnerLessonIds = Object.values(this.store.tajweedLessons)
      .filter((l) => l.level === 'beginner' && l.isPublished)
      .map((l) => l.id);
    const hasBeginnerCert = merged.certificates.some((c) => c.level === 'beginner');
    if (
      beginnerLessonIds.length > 0 &&
      !hasBeginnerCert &&
      beginnerLessonIds.every((id) => merged.completedLessonIds.includes(id))
    ) {
      merged.certificates.push({
        id: `cert_beg_${Date.now()}`,
        titleUz: 'ASAKA ZIYO — Tajvid Boshlangʻich Bosqich Sertifikati',
        level: 'beginner',
        issuedAt: new Date().toISOString(),
        verificationCode: `AZ-TAJ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      });
    }

    this.store.userProfiles[userId] = merged;
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('userQuranProfiles', userId.replace(/[^a-zA-Z0-9_.:-]/g, '_'), merged).catch(() => {});
    }
    return merged;
  }

  public async mergeUserSyncState(
    userId: string,
    payload: {
      language?: string;
      theme?: string;
      platform?: string;
      mergeMode?: 'merge' | 'replace';
      favorites?: Array<{
        id: string;
        type?: string;
        title?: string;
        subtitle?: string;
        snippet?: string;
        routeTab?: string;
        routeId?: string;
        timestamp?: number;
      }>;
      removeFavoriteIds?: string[];
      readingProgress?: {
        lastReadSurah?: number;
        lastReadAyah?: number;
        lastReadPage?: number;
        todayAyahsRead?: number;
        dailyGoalAyahs?: number;
        dailyGoalMinutes?: number;
        streakDays?: number;
      };
      bookmarks?: UserQuranProfileRecord['bookmarks'];
      hifzRanges?: HifzRangeProgress[];
    }
  ): Promise<UserQuranProfileRecord> {
    const current = this.getUserProfile(userId);
    const validLocales = new Set(['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en']);
    const validThemes = new Set(['dark', 'light', 'system']);
    const validPlatforms = new Set(['web', 'android', 'telegram_miniapp', 'telegram_bot']);

    const nextLanguage =
      payload.language && validLocales.has(payload.language)
        ? (payload.language as UserQuranProfileRecord['preferredLanguage'])
        : current.preferredLanguage;
    const nextTheme =
      payload.theme && validThemes.has(payload.theme)
        ? (payload.theme as UserQuranProfileRecord['preferredTheme'])
        : current.preferredTheme;
    const nextPlatform =
      payload.platform && validPlatforms.has(payload.platform)
        ? (payload.platform as UserQuranProfileRecord['lastPlatform'])
        : current.lastPlatform;

    let nextFavorites = Array.isArray(current.favoriteItems) ? [...current.favoriteItems] : [];
    const removeSet = new Set(
      Array.isArray(payload.removeFavoriteIds)
        ? payload.removeFavoriteIds.map((id) => String(id || '').trim()).filter(Boolean)
        : []
    );
    if (removeSet.size > 0) {
      nextFavorites = nextFavorites.filter((f) => !removeSet.has(f.id));
    }

    if (Array.isArray(payload.favorites)) {
      const sanitizedIncoming = payload.favorites
        .filter((f) => f && typeof f.id === 'string' && f.id.trim().length > 0)
        .slice(0, 200)
        .map((f) => ({
          id: String(f.id).trim().slice(0, 140),
          type: String(f.type || 'article').trim().slice(0, 40),
          title: String(f.title || f.id).trim().slice(0, 200),
          subtitle: f.subtitle ? String(f.subtitle).trim().slice(0, 240) : '',
          snippet: f.snippet ? String(f.snippet).trim().slice(0, 400) : '',
          routeTab: f.routeTab ? String(f.routeTab).trim().slice(0, 48) : undefined,
          routeId: f.routeId ? String(f.routeId).trim().slice(0, 120) : undefined,
          timestamp: Number.isFinite(Number(f.timestamp)) ? Number(f.timestamp) : Date.now(),
        }));

      if (payload.mergeMode === 'replace') {
        nextFavorites = sanitizedIncoming;
      } else {
        const byId = new Map(nextFavorites.map((item) => [item.id, item]));
        for (const inc of sanitizedIncoming) {
          if (removeSet.has(inc.id)) continue;
          const prev = byId.get(inc.id);
          if (!prev || inc.timestamp >= prev.timestamp) {
            byId.set(inc.id, inc);
          }
        }
        nextFavorites = Array.from(byId.values())
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 200);
      }
    }

    let nextBookmarks = Array.isArray(current.bookmarks) ? [...current.bookmarks] : [];
    if (Array.isArray(payload.bookmarks)) {
      const byBm = new Map(nextBookmarks.map((b) => [`${b.surahNumber}:${b.ayahNumber}`, b]));
      for (const b of payload.bookmarks.slice(0, 200)) {
        const sNum = Number(b.surahNumber);
        const aNum = Number(b.ayahNumber);
        if (!Number.isFinite(sNum) || sNum < 1 || sNum > 114 || !Number.isFinite(aNum) || aNum < 1) continue;
        byBm.set(`${sNum}:${aNum}`, {
          id: String(b.id || `${sNum}:${aNum}`).slice(0, 64),
          surahNumber: sNum,
          ayahNumber: aNum,
          pageNumber: Number.isFinite(Number(b.pageNumber)) ? Number(b.pageNumber) : undefined,
          note: b.note ? String(b.note).slice(0, 300) : '',
          createdAt: String(b.createdAt || new Date().toISOString()),
        });
      }
      nextBookmarks = Array.from(byBm.values()).slice(0, 200);
    }

    let nextHifz = Array.isArray(current.hifzRanges) ? [...current.hifzRanges] : [];
    if (Array.isArray(payload.hifzRanges)) {
      const byHifz = new Map(nextHifz.map((h) => [h.id || `${h.surahNumber}:${h.startAyah}-${h.endAyah}`, h]));
      for (const h of payload.hifzRanges.slice(0, 150)) {
        const key = String(h.id || `${h.surahNumber}:${h.startAyah}-${h.endAyah}`).slice(0, 80);
        const prev = byHifz.get(key);
        if (!prev || String(h.lastReviewedAt || '') >= String(prev.lastReviewedAt || '')) {
          byHifz.set(key, {
            id: key,
            surahNumber: Math.max(1, Math.min(114, Number(h.surahNumber) || 1)),
            startAyah: Math.max(1, Number(h.startAyah) || 1),
            endAyah: Math.max(1, Number(h.endAyah) || 1),
            memorizedCount: Math.max(0, Number(h.memorizedCount) || 0),
            repeatCount: Math.max(0, Number(h.repeatCount) || 0),
            masteryPercent: Math.max(0, Math.min(100, Number(h.masteryPercent) || 0)),
            isDifficult: Boolean(h.isDifficult),
            nextReviewDate: String(h.nextReviewDate || new Date().toISOString().slice(0, 10)).slice(0, 32),
            reviewStage: Math.max(0, Math.min(10, Number(h.reviewStage) || 0)),
            lastReviewedAt: String(h.lastReviewedAt || new Date().toISOString()),
          });
        }
      }
      nextHifz = Array.from(byHifz.values()).slice(0, 150);
    }

    const rp = payload.readingProgress;
    const patch: Partial<UserQuranProfileRecord> = {
      preferredLanguage: nextLanguage,
      preferredTheme: nextTheme,
      favoriteItems: nextFavorites,
      bookmarks: nextBookmarks,
      hifzRanges: nextHifz,
      lastPlatform: nextPlatform,
    };
    if (rp) {
      if (Number.isFinite(Number(rp.lastReadSurah)) && Number(rp.lastReadSurah) >= 1 && Number(rp.lastReadSurah) <= 114) {
        patch.lastReadSurah = Number(rp.lastReadSurah);
      }
      if (Number.isFinite(Number(rp.lastReadAyah)) && Number(rp.lastReadAyah) >= 1) {
        patch.lastReadAyah = Number(rp.lastReadAyah);
      }
      if (Number.isFinite(Number(rp.lastReadPage)) && Number(rp.lastReadPage) >= 1 && Number(rp.lastReadPage) <= 604) {
        patch.lastReadPage = Number(rp.lastReadPage);
      }
      if (Number.isFinite(Number(rp.todayAyahsRead)) && Number(rp.todayAyahsRead) >= 0) {
        patch.todayAyahsRead = Math.max(current.todayAyahsRead || 0, Number(rp.todayAyahsRead));
      }
      if (Number.isFinite(Number(rp.dailyGoalAyahs)) && Number(rp.dailyGoalAyahs) >= 1) {
        patch.dailyGoalAyahs = Number(rp.dailyGoalAyahs);
      }
      if (Number.isFinite(Number(rp.dailyGoalMinutes)) && Number(rp.dailyGoalMinutes) >= 1) {
        patch.dailyGoalMinutes = Number(rp.dailyGoalMinutes);
      }
      if (Number.isFinite(Number(rp.streakDays)) && Number(rp.streakDays) >= 0) {
        patch.streakDays = Math.max(current.streakDays || 0, Number(rp.streakDays));
      }
    }

    return this.updateUserProfile(userId, patch);
  }

  public getAuditLogs(limit = 100): QuranAuditEntry[] {
    return this.store.auditLogs.slice(0, Math.min(300, Math.max(1, limit)));
  }

  public getSystemStorageStats() {
    const activeFiles = Object.values(this.store.audioFiles).filter((f) => !f.isDeleted);
    const totalBytes = activeFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    return {
      totalQaris: Object.keys(this.store.qaris).length,
      activeQaris: Object.values(this.store.qaris).filter((q) => q.isActive).length,
      uploadedAudioCount: activeFiles.length,
      publishedAudioCount: activeFiles.filter((f) => f.status === 'PUBLISHED').length,
      totalAudioBytes: totalBytes,
      totalPlaylists: Object.keys(this.store.playlists).length,
      totalLessons: Object.keys(this.store.tajweedLessons).length,
      totalEducationQuizzes: Object.keys(this.store.educationQuizzes).length,
      activeUserProfiles: Object.keys(this.store.userProfiles).length,
    };
  }
}
