/**
 * ASAKA ZIYO HIFZ — Verified Quran Metadata Map (114 Surahs · 30 Juzs · 6,236 Ayahs)
 *
 * Reuses the authoritative project Quran metadata from `src/data/quranData.ts`
 * (Hafs an Asim / Kufan ayah numbering = 6,236 ayahs, 604 Madani Mushaf pages).
 * Guarantees:
 * - Arabic script is NEVER altered or AI-generated.
 * - Partial surah memorization NEVER counts as a completed surah or juz.
 * - Range operations strictly merge, clamp, and deduplicate ayahs within 1..numberOfAyahs.
 */

import {
  JUZ_LIST,
  QURAN_RECITERS,
  SURAHS_LIST,
  VERIFIED_AYAHS,
  getReciterAyahAudioUrl,
  getReciterSurahAudioUrl,
} from '../../src/data/quranData';
import { HifzAyahRange, HifzSurahProgress } from './hifzTypes';

export const TOTAL_QURAN_SURAHS = 114 as const;
export const TOTAL_QURAN_JUZS = 30 as const;
export const TOTAL_QURAN_AYAHS = SURAHS_LIST.reduce((acc, s) => acc + s.numberOfAyahs, 0); // 6236
export const TOTAL_MUSHAF_PAGES = 604 as const;

export interface SurahMetaEntry {
  number: number;
  nameAr: string;
  nameUz: string;
  meaningUz: string;
  numberOfAyahs: number;
  revelationType: 'Makkah' | 'Madina';
  pageStart: number;
  pageEnd: number;
  primaryJuz: number;
}

export interface JuzSegment {
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  ayahCount: number;
}

export interface JuzMetaEntry {
  juzNumber: number;
  nameAr: string;
  nameUz: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  segments: JuzSegment[];
  totalAyahs: number;
}

const SURAH_BY_NUMBER = new Map<number, SurahMetaEntry>();

// Build exact pageEnd and primaryJuz for each of the 114 surahs
for (let i = 0; i < SURAHS_LIST.length; i++) {
  const s = SURAHS_LIST[i];
  const next = SURAHS_LIST[i + 1];
  const pageStart = s.pageNumber;
  const pageEnd = next ? Math.max(pageStart, next.pageNumber - (next.pageNumber > pageStart ? 0 : 0)) : TOTAL_MUSHAF_PAGES;
  const computedEnd = next ? Math.max(pageStart, next.pageNumber > pageStart ? next.pageNumber : pageStart) : TOTAL_MUSHAF_PAGES;

  // Determine primary juz where surah begins
  let primaryJuz = 1;
  for (const j of JUZ_LIST) {
    const startsAfterOrAt =
      s.number > j.startSurah || (s.number === j.startSurah && 1 >= j.startAyah);
    const startsBeforeOrAt =
      s.number < j.endSurah || (s.number === j.endSurah && 1 <= j.endAyah);
    if (startsAfterOrAt && startsBeforeOrAt) {
      primaryJuz = j.juzNumber;
      break;
    }
  }

  SURAH_BY_NUMBER.set(s.number, {
    number: s.number,
    nameAr: s.nameAr,
    nameUz: s.nameUz,
    meaningUz: s.meaningUz,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
    pageStart,
    pageEnd: Math.min(TOTAL_MUSHAF_PAGES, Math.max(pageStart, pageEnd, computedEnd === pageStart ? pageStart : computedEnd - 1)),
    primaryJuz,
  });
}

// Build exact surah/ayah segments for all 30 juzs
export const JUZ_META_MAP: JuzMetaEntry[] = JUZ_LIST.map((j) => {
  const segments: JuzSegment[] = [];
  for (let sn = j.startSurah; sn <= j.endSurah; sn++) {
    const surah = SURAH_BY_NUMBER.get(sn);
    if (!surah) continue;
    const startAyah = sn === j.startSurah ? j.startAyah : 1;
    const endAyah = sn === j.endSurah ? j.endAyah : surah.numberOfAyahs;
    const ayahCount = Math.max(0, endAyah - startAyah + 1);
    if (ayahCount > 0) {
      segments.push({ surahNumber: sn, startAyah, endAyah, ayahCount });
    }
  }
  const totalAyahs = segments.reduce((sum, seg) => sum + seg.ayahCount, 0);
  return {
    ...j,
    segments,
    totalAyahs,
  };
});

export function getSurahMeta(surahNumber: number): SurahMetaEntry | null {
  return SURAH_BY_NUMBER.get(surahNumber) || null;
}

export function listAllSurahMeta(): SurahMetaEntry[] {
  return Array.from(SURAH_BY_NUMBER.values()).sort((a, b) => a.number - b.number);
}

export function getJuzMeta(juzNumber: number): JuzMetaEntry | null {
  return JUZ_META_MAP.find((j) => j.juzNumber === juzNumber) || null;
}

export function getJuzForAyah(surahNumber: number, ayahNumber: number): number {
  for (const j of JUZ_LIST) {
    const afterStart =
      surahNumber > j.startSurah || (surahNumber === j.startSurah && ayahNumber >= j.startAyah);
    const beforeEnd =
      surahNumber < j.endSurah || (surahNumber === j.endSurah && ayahNumber <= j.endAyah);
    if (afterStart && beforeEnd) return j.juzNumber;
  }
  return 1;
}

export function estimatePagesForRange(
  surahNumber: number,
  startAyah: number,
  endAyah: number
): { pageStart: number; pageEnd: number } {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return { pageStart: 1, pageEnd: 1 };
  const span = Math.max(0, meta.pageEnd - meta.pageStart);
  const startRatio = (Math.max(1, startAyah) - 1) / Math.max(1, meta.numberOfAyahs);
  const endRatio = Math.min(meta.numberOfAyahs, endAyah) / Math.max(1, meta.numberOfAyahs);
  return {
    pageStart: Math.min(TOTAL_MUSHAF_PAGES, meta.pageStart + Math.floor(span * startRatio)),
    pageEnd: Math.min(TOTAL_MUSHAF_PAGES, meta.pageStart + Math.floor(span * endRatio)),
  };
}

/**
 * Merges and clamps overlapping or adjacent ayah ranges within [1, maxAyahs].
 */
export function normalizeAyahRanges(
  ranges: HifzAyahRange[],
  maxAyahs: number
): HifzAyahRange[] {
  const clamped = ranges
    .map((r) => ({
      startAyah: Math.max(1, Math.min(maxAyahs, Math.floor(Math.min(r.startAyah, r.endAyah)))),
      endAyah: Math.max(1, Math.min(maxAyahs, Math.floor(Math.max(r.startAyah, r.endAyah)))),
    }))
    .filter((r) => r.startAyah >= 1 && r.endAyah >= r.startAyah && r.endAyah <= maxAyahs)
    .sort((a, b) => a.startAyah - b.startAyah || a.endAyah - b.endAyah);

  const merged: HifzAyahRange[] = [];
  for (const r of clamped) {
    const last = merged[merged.length - 1];
    if (!last || r.startAyah > last.endAyah + 1) {
      merged.push({ ...r });
    } else {
      last.endAyah = Math.max(last.endAyah, r.endAyah);
    }
  }
  return merged;
}

export function countAyahsInRanges(ranges: HifzAyahRange[]): number {
  return ranges.reduce((sum, r) => sum + Math.max(0, r.endAyah - r.startAyah + 1), 0);
}

/**
 * Computes exact intersection count of a user's memorized ranges against a target [startAyah..endAyah].
 */
export function countOverlapAyahs(
  ranges: HifzAyahRange[],
  targetStart: number,
  targetEnd: number
): number {
  let count = 0;
  for (const r of ranges) {
    const lo = Math.max(r.startAyah, targetStart);
    const hi = Math.min(r.endAyah, targetEnd);
    if (hi >= lo) {
      count += hi - lo + 1;
    }
  }
  return count;
}

export function formatRangesCompact(ranges: HifzAyahRange[]): string {
  if (!ranges.length) return '—';
  return ranges
    .map((r) => (r.startAyah === r.endAyah ? `${r.startAyah}` : `${r.startAyah}-${r.endAyah}`))
    .join(', ');
}

/**
 * Computes exact memorization status for all 30 Juzs based on user's surah progress.
 */
export function computeAllJuzProgress(surahs: Record<string, HifzSurahProgress>): Array<{
  juzNumber: number;
  nameUz: string;
  nameAr: string;
  memorizedAyahs: number;
  totalAyahs: number;
  percent: number;
  isComplete: boolean;
  isPartial: boolean;
}> {
  return JUZ_META_MAP.map((juz) => {
    let memorizedAyahs = 0;
    for (const seg of juz.segments) {
      const sp = surahs[String(seg.surahNumber)];
      if (!sp || !sp.memorizedRanges.length) continue;
      memorizedAyahs += countOverlapAyahs(sp.memorizedRanges, seg.startAyah, seg.endAyah);
    }
    const percent = juz.totalAyahs > 0 ? Math.round((memorizedAyahs / juz.totalAyahs) * 100) : 0;
    const isComplete = juz.totalAyahs > 0 && memorizedAyahs >= juz.totalAyahs;
    return {
      juzNumber: juz.juzNumber,
      nameUz: juz.nameUz,
      nameAr: juz.nameAr,
      memorizedAyahs,
      totalAyahs: juz.totalAyahs,
      percent,
      isComplete,
      isPartial: memorizedAyahs > 0 && !isComplete,
    };
  });
}

/**
 * Returns the next unmemorized ayah range in a surah given a daily ayah goal.
 */
export function findNextUnmemorizedRange(
  surahNumber: number,
  memorizedRanges: HifzAyahRange[],
  maxAyahsToAssign: number
): HifzAyahRange | null {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return null;
  const normalized = normalizeAyahRanges(memorizedRanges, meta.numberOfAyahs);

  let cursor = 1;
  for (const r of normalized) {
    if (cursor < r.startAyah) {
      const endAyah = Math.min(r.startAyah - 1, cursor + Math.max(1, maxAyahsToAssign) - 1);
      return { startAyah: cursor, endAyah };
    }
    cursor = Math.max(cursor, r.endAyah + 1);
  }
  if (cursor <= meta.numberOfAyahs) {
    const endAyah = Math.min(meta.numberOfAyahs, cursor + Math.max(1, maxAyahsToAssign) - 1);
    return { startAyah: cursor, endAyah };
  }
  return null;
}

/**
 * Returns verified Arabic text snippet for a surah/ayah range if present in VERIFIED_AYAHS.
 * Never fabricates or AI-generates Quran text.
 */
export function getVerifiedArabicAyahsForRange(
  surahNumber: number,
  startAyah: number,
  endAyah: number
): Array<{ numberInSurah: number; textAr: string; translationUz: string }> {
  const list = VERIFIED_AYAHS[surahNumber];
  if (!Array.isArray(list) || list.length === 0) return [];
  return list
    .filter((a) => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah)
    .map((a) => ({
      numberInSurah: a.numberInSurah,
      textAr: a.textAr,
      translationUz: a.translationUz,
    }));
}

export function getHifzReciterOptions() {
  return QURAN_RECITERS.filter((r) => r.isActive !== false).slice(0, 8);
}

export function resolveHifzSurahAudioUrl(reciterId: string, surahNumber: number): string {
  return getReciterSurahAudioUrl(reciterId || 'mishary', surahNumber);
}

export function resolveHifzAyahAudioUrl(
  reciterId: string,
  surahNumber: number,
  ayahNumber: number
): string {
  return getReciterAyahAudioUrl(reciterId || 'mishary', surahNumber, ayahNumber);
}
