/**
 * ASAKA ZIYO — Read-Only Islamic Content Adapter for Telegram Platform
 *
 * Reads authentic Quran surahs/daily ayahs, Sahih Hadiths, and Dhikrs/Duas
 * strictly READ-ONLY from existing ASAKA ZIYO datasets (`src/data/*`).
 * Never modifies existing Web/Mobile datasets or collections.
 */

import { SURAHS_LIST } from '../../src/data/quranData';
import { AUTHENTIC_DAILY_BUNDLES } from '../../src/data/dailyContentData';
import { AUTHENTIC_HADITHS } from '../../src/data/hadithData';
import { AUTHENTIC_DHIKRS } from '../../src/data/dhikrData';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import { TelegramLocale } from '../types';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle } from '../locales';

const FEATURED_SURAH_NUMBERS = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114];

function localizeUzbekString(text: string, locale: TelegramLocale): string {
  if (locale === 'uz-Latn-new') {
    return toNewUzbekAlphabet(text);
  }
  return text;
}

export class TelegramIslamicContentAdapter {
  getTotalDailyAyahs(): number {
    return AUTHENTIC_DAILY_BUNDLES.length;
  }

  getTotalHadiths(): number {
    return AUTHENTIC_HADITHS.length;
  }

  getTotalDhikrs(): number {
    return AUTHENTIC_DHIKRS.length;
  }

  getFeaturedSurahs() {
    return FEATURED_SURAH_NUMBERS.map((num) => SURAHS_LIST.find((s) => s.number === num)).filter(
      (s): s is NonNullable<typeof s> => Boolean(s)
    );
  }

  formatQuranDailyAyah(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number; surahNumber: number } {
    const total = AUTHENTIC_DAILY_BUNDLES.length;
    const safeIdx = ((index % total) + total) % total;
    const bundle = AUTHENTIC_DAILY_BUNDLES[safeIdx];
    const ayah = bundle.ayah;
    const dict = getTelegramLocaleBundle(locale);

    const localizedTranslation =
      ayah.translations?.[locale]?.text ||
      (locale === 'uz-Latn-new' ? toNewUzbekAlphabet(ayah.translationUz) : ayah.translationUz);

    const localizedTafsir =
      ayah.translations?.[locale]?.tafsir ||
      (ayah.tafsirSummaryUz ? localizeUzbekString(ayah.tafsirSummaryUz, locale) : '');

    const surahName = localizeUzbekString(ayah.surahNameUz || '', locale);
    const lines: string[] = [
      dict.quranTitle,
      `{{emoji:brand.book}} ${surahName} (${ayah.surahNumber}:${ayah.numberInSurah}) — ${safeIdx + 1}/${total}`,
      '',
      ayah.textAr,
      '',
      localizedTranslation,
    ];

    if (localizedTafsir) {
      lines.push('', `{{emoji:brand.star}} ${localizedTafsir}`);
    }

    lines.push('', dict.quranFooterNote);

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      surahNumber: ayah.surahNumber,
    };
  }

  formatSurahCard(
    surahNumber: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const surah = SURAHS_LIST.find((s) => s.number === surahNumber) || SURAHS_LIST[0];
    const dict = getTelegramLocaleBundle(locale);
    const name = localizeUzbekString(surah.nameUz, locale);
    const meaning = localizeUzbekString(surah.meaningUz, locale);

    const lines = [
      `${dict.quranSurahHeader}: ${surah.number}. ${name} (${surah.nameAr})`,
      '',
      `• ${dict.quranMeaningLabel}: ${meaning}`,
      `• ${dict.quranAyahCountLabel}: ${surah.numberOfAyahs}`,
      `• ${dict.quranRevelationLabel}: ${surah.revelationType}`,
      `• ${dict.quranPageLabel}: ${surah.pageNumber}`,
      '',
      dict.quranFooterNote,
    ];

    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  formatHadithCard(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number } {
    const total = AUTHENTIC_HADITHS.length;
    const safeIdx = ((index % total) + total) % total;
    const hadith = AUTHENTIC_HADITHS[safeIdx];
    const dict = getTelegramLocaleBundle(locale);

    const collection = localizeUzbekString(hadith.collectionNameUz, locale);
    const chapter = localizeUzbekString(hadith.chapterUz, locale);
    const narrator = localizeUzbekString(hadith.narratorUz, locale);
    const translation = localizeUzbekString(hadith.translationUz, locale);
    const reference = localizeUzbekString(hadith.reference, locale);

    const lines = [
      `${dict.hadithTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:nav.hadith}} ${collection} — ${chapter}`,
      '',
      hadith.textAr,
      '',
      translation,
      '',
      `• ${dict.hadithNarratorLabel}: ${narrator}`,
      `• ${dict.hadithSourceLabel}: ${reference} (${hadith.grade})`,
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
    };
  }

  formatDhikrCard(
    index: number,
    tasbehCount: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number; targetCount: number } {
    const total = AUTHENTIC_DHIKRS.length;
    const safeIdx = ((index % total) + total) % total;
    const dhikr = AUTHENTIC_DHIKRS[safeIdx];
    const dict = getTelegramLocaleBundle(locale);

    const category = localizeUzbekString(dhikr.categoryTitleUz, locale);
    const title = localizeUzbekString(dhikr.titleUz, locale);
    const translit = localizeUzbekString(dhikr.transliterationUz, locale);
    const translation = localizeUzbekString(dhikr.translationUz, locale);
    const virtue = localizeUzbekString(dhikr.virtueUz, locale);
    const source = localizeUzbekString(dhikr.source, locale);

    const safeCount = Math.max(0, Math.min(9999, tasbehCount));
    const progressMark =
      safeCount >= dhikr.targetCount ? '{{emoji:status.ok}}' : '{{emoji:content.tasbeh}}';

    const lines = [
      `${dict.dhikrTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:content.dua}} ${category} — ${title}`,
      '',
      dhikr.textAr,
      '',
      translit,
      '',
      translation,
      '',
      `${progressMark} ${dict.dhikrTasbehCounterLabel}: ${safeCount} / ${dhikr.targetCount}`,
      `• ${dict.dhikrVirtueLabel}: ${virtue}`,
      `• ${dict.hadithSourceLabel}: ${source}`,
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      targetCount: dhikr.targetCount,
    };
  }
}
