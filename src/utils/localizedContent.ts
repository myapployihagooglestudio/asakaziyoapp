import { SupportedLocale, TranslationStatus, LocalizedContentEntry } from '../types';
import { toNewUzbekAlphabet } from './newUzbekAlphabet';

interface LocalizableItem {
  title: string;
  subtitle?: string;
  excerpt?: string;
  bodyParagraphs?: string[];
  content?: string;
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

/**
 * Returns the localized text for a field with a defined fallback chain:
 * 1. Exact translation for requested locale if available and published/draft.
 * 2. If uz-Latn-new and uz-Latn exists: transforms uz-Latn via toNewUzbekAlphabet.
 * 3. Fallback to default uz-Latn field.
 */
export function getLocalizedField(
  item: LocalizableItem,
  field: 'title' | 'subtitle' | 'excerpt' | 'content',
  currentLocale: SupportedLocale
): string {
  // 1. Direct match in translations
  const directMatch = item.translations?.[currentLocale]?.[field];
  if (directMatch) return directMatch;

  // 2. New Uzbek Alphabet dynamic conversion from standard Latin
  if (currentLocale === 'uz-Latn-new') {
    const uzLatnVal = item.translations?.['uz-Latn']?.[field] || item[field] || '';
    return toNewUzbekAlphabet(uzLatnVal);
  }

  // 3. Fallback to base field (uz-Latn)
  return item[field] || '';
}

/**
 * Returns localized body paragraphs for articles with fallback.
 */
export function getLocalizedParagraphs(
  item: LocalizableItem,
  currentLocale: SupportedLocale
): string[] {
  const directMatch = item.translations?.[currentLocale]?.bodyParagraphs;
  if (directMatch && directMatch.length > 0) return directMatch;

  if (currentLocale === 'uz-Latn-new') {
    const baseParas = item.translations?.['uz-Latn']?.bodyParagraphs || item.bodyParagraphs || [];
    return baseParas.map((p) => toNewUzbekAlphabet(p));
  }

  return item.bodyParagraphs || [];
}

/**
 * Returns the translation management status for an editorial item.
 */
export function getTranslationStatus(
  item: LocalizableItem,
  locale: SupportedLocale
): TranslationStatus {
  if (locale === 'uz-Latn') return 'PUBLISHED';
  if (locale === 'uz-Latn-new') return 'PUBLISHED'; // Automated verified conversion
  return item.translations?.[locale]?.status || 'MISSING';
}
