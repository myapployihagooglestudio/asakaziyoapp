/**
 * ASAKA ZIYO — New Uzbek Alphabet Transformation Utility
 *
 * Implements the official reform mappings for the New Uzbek Alphabet:
 * - sh / Sh / SH -> ş / Ş / Ş
 * - ch / Ch / CH -> ç / Ç / Ç
 * - oʻ / Oʻ (and apostrophe variants ', `, ‘, ’, ʹ) -> ö / Ö
 * - gʻ / Gʻ (and apostrophe variants ', `, ‘, ’, ʹ) -> ğ / Ğ
 *
 * Safety requirements:
 * 1. Never transform Arabic script (Quran, Hadith, Duas).
 * 2. Never transform URLs, email addresses, code identifiers, HTML tags.
 * 3. Never double-transform characters already in the target set (ş, ç, ö, ğ).
 * 4. Preserve case accurately (lower, TitleCase, UPPERCASE).
 */

// All common single-quote and modifier letter variants used in Uzbek orthography
const APOSTROPHE_VARIANTS = "['`ʻ‘'’ʹʼ]";

// Regex patterns with case variants
// Order matters: digraphs (sh, ch) and apostrophe pairs (o', g') must be matched precisely.
const SH_REGEX_LOWER = /sh/g;
const SH_REGEX_TITLE = /Sh/g;
const SH_REGEX_UPPER = /SH/g;

const CH_REGEX_LOWER = /ch/g;
const CH_REGEX_TITLE = /Ch/g;
const CH_REGEX_UPPER = /CH/g;

const O_APOS_REGEX_LOWER = new RegExp(`o${APOSTROPHE_VARIANTS}`, 'g');
const O_APOS_REGEX_UPPER = new RegExp(`O${APOSTROPHE_VARIANTS}`, 'g');

const G_APOS_REGEX_LOWER = new RegExp(`g${APOSTROPHE_VARIANTS}`, 'g');
const G_APOS_REGEX_UPPER = new RegExp(`G${APOSTROPHE_VARIANTS}`, 'g');

// Pattern to detect segments that MUST NOT be transformed:
// - URLs (https://..., http://...)
// - Email addresses
// - Arabic text segments (\u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF)
// - HTML tags (<...>)
const UNTOUCHABLE_PATTERN = /(https?:\/\/[^\s]+|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|<[^>]+>)/g;

/**
 * Transforms an individual plain-text slice from standard Uzbek Latin to the New Uzbek Alphabet.
 */
function transformPlainSlice(text: string): string {
  if (!text) return '';

  return text
    // 1. Sh / sh transformations
    .replace(SH_REGEX_UPPER, 'Ş')
    .replace(SH_REGEX_TITLE, 'Ş')
    .replace(SH_REGEX_LOWER, 'ş')
    // 2. Ch / ch transformations
    .replace(CH_REGEX_UPPER, 'Ç')
    .replace(CH_REGEX_TITLE, 'Ç')
    .replace(CH_REGEX_LOWER, 'ç')
    // 3. Oʻ / oʻ transformations (all apostrophe variants)
    .replace(O_APOS_REGEX_UPPER, 'Ö')
    .replace(O_APOS_REGEX_LOWER, 'ö')
    // 4. Gʻ / gʻ transformations (all apostrophe variants)
    .replace(G_APOS_REGEX_UPPER, 'Ğ')
    .replace(G_APOS_REGEX_LOWER, 'ğ');
}

/**
 * Transforms standard Uzbek Latin text to the New Uzbek Alphabet (uz-Latn-new),
 * preserving Arabic script, URLs, email addresses, and HTML tags.
 */
export function toNewUzbekAlphabet(input: string): string {
  if (!input || typeof input !== 'string') return input;

  // Split input into touchable and untouchable tokens
  const tokens = input.split(UNTOUCHABLE_PATTERN);

  return tokens
    .map((token, index) => {
      // Tokens at odd indices match the UNTOUCHABLE_PATTERN capture group
      if (index % 2 === 1) {
        return token; // Preserved exactly as-is
      }
      return transformPlainSlice(token);
    })
    .join('');
}

/**
 * Recursively transforms all string values in an object or array to the New Uzbek Alphabet.
 * Used to transform locale resource dictionaries.
 */
export function transformResourceObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return toNewUzbekAlphabet(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => transformResourceObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformResourceObject(value);
    }
    return result as T;
  }
  return obj;
}
