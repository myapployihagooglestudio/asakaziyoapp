/**
 * Unit Tests for New Uzbek Alphabet (uz-Latn-new) Transformation
 *
 * Verifies:
 * 1. Exact character mappings: sh->ş, ch->ç, oʻ->ö, gʻ->ğ
 * 2. Case variations: lower, TitleCase, UPPERCASE
 * 3. All apostrophe variants: ', `, ʻ, ‘, ’, ʹ, ʼ
 * 4. Punctuation and mixed words
 * 5. Arabic text preservation
 * 6. URLs and email address preservation
 * 7. Non-interference with already-transformed or other languages
 */

import { toNewUzbekAlphabet, transformResourceObject } from './newUzbekAlphabet';

interface TestCase {
  description: string;
  input: string;
  expected: string;
}

const testCases: TestCase[] = [
  // 1. Mandatory examples from specification
  {
    description: 'Example: shahar -> şahar',
    input: 'shahar',
    expected: 'şahar',
  },
  {
    description: 'Example: chiroyli -> çiroyli',
    input: 'chiroyli',
    expected: 'çiroyli',
  },
  {
    description: 'Example: oʻzbekiston -> özbekiston',
    input: 'oʻzbekiston',
    expected: 'özbekiston',
  },
  {
    description: 'Example: gʻalaba -> ğalaba',
    input: 'gʻalaba',
    expected: 'ğalaba',
  },

  // 2. Case variations
  {
    description: 'Uppercase SH / Sh / sh',
    input: 'SHOH Shoshilinch shoh',
    expected: 'ŞOH Şoşilinç şoh',
  },
  {
    description: 'Uppercase CH / Ch / ch',
    input: 'CHORRAHA Chiroyli chust',
    expected: 'ÇORRAHA Çiroyli çust',
  },
  {
    description: 'Uppercase Oʻ / oʻ with different apostrophes',
    input: "Oʻquvchi O'zbek O`tkinchi oʻrik o'rdak o`simlik o‘tish o’tkinchi",
    expected: 'Öquvçi Özbek Ötkinçi örik ördak ösimlik ötiş ötkinçi',
  },
  {
    description: 'Uppercase Gʻ / gʻ with different apostrophes',
    input: "Gʻayrat G'olib G`urur gʻam g'oz g`urur g‘aroyib g’animat",
    expected: 'Ğayrat Ğolib Ğurur ğam ğoz ğurur ğaroyib ğanimat',
  },

  // 3. Combined real phrases
  {
    description: 'Sentence with multiple transformations',
    input: 'Bosh sahifa, Qurʼon, Hadislar, Zikr va duolar, Namoz vaqtlari',
    expected: 'Boş sahifa, Qurʼon, Hadislar, Zikr va duolar, Namoz vaqtlari',
  },
  {
    description: 'Sentence: Charchamang, oʻgʻlim!',
    input: 'Charchamang, oʻgʻlim!',
    expected: 'Çarçamang, öğlim!',
  },
  {
    description: 'Asaka specific: Asaka shahri, Andijon viloyati, oʻzbekcha qiroat',
    input: 'Asaka shahri, Andijon viloyati, oʻzbekcha qiroat',
    expected: 'Asaka şahri, Andijon viloyati, özbekça qiroat',
  },

  // 4. Preservation of Arabic text (Quran, Hadith, Duas)
  {
    description: 'Arabic text must remain untouched',
    input: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — shahar',
    expected: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — şahar',
  },
  {
    description: 'Pure Arabic Quran verse',
    input: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    expected: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  },

  // 5. Preservation of URLs, Emails, and Code
  {
    description: 'URL should not have sh or ch transformed',
    input: 'Batafsil maʼlumot: https://asaka-ziyo.uz/shahar/chorraha sahifasida',
    expected: 'Batafsil maʼlumot: https://asaka-ziyo.uz/shahar/chorraha sahifasida',
  },
  {
    description: 'Email address should not be transformed',
    input: 'Murojaat uchun: info.shahar@asaka-ziyo.uz manzili',
    expected: 'Murojaat uçun: info.shahar@asaka-ziyo.uz manzili',
  },

  // 6. Already transformed text should not be damaged
  {
    description: 'Idempotency: already converted characters',
    input: 'şahar, çiroyli, özbekiston, ğalaba',
    expected: 'şahar, çiroyli, özbekiston, ğalaba',
  },

  // 7. Russian and English text preservation
  {
    description: 'Russian and English preserved',
    input: 'Shahar — город (city) in Uzbek',
    expected: 'Şahar — город (city) in Uzbek',
  },
];

export function runTests(): boolean {
  console.log('--- RUNNING NEW UZBEK ALPHABET UNIT TESTS ---');
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = toNewUzbekAlphabet(tc.input);
    if (result === tc.expected) {
      passed++;
      console.log(`✅ [PASS] ${tc.description}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${tc.description}`);
      console.error(`   Input:    "${tc.input}"`);
      console.error(`   Expected: "${tc.expected}"`);
      console.error(`   Actual:   "${result}"`);
    }
  }

  // Test object recursive transformation
  const sampleObj = {
    title: 'Bosh sahifa',
    items: ['shahar', 'chiroyli', 'oʻzbekcha'],
    nested: {
      action: 'Oʻqish',
    },
  };
  const transformedObj = transformResourceObject(sampleObj);
  if (
    transformedObj.title === 'Boş sahifa' &&
    transformedObj.items[0] === 'şahar' &&
    transformedObj.items[1] === 'çiroyli' &&
    transformedObj.items[2] === 'özbekça' &&
    transformedObj.nested.action === 'Öqiş'
  ) {
    passed++;
    console.log('✅ [PASS] Recursive resource object transformation');
  } else {
    failed++;
    console.error('❌ [FAIL] Recursive resource object transformation', transformedObj);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return failed === 0;
}

// Auto-run if executed directly via node/tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('newUzbekAlphabet.test')) {
  const success = runTests();
  if (!success) {
    process.exit(1);
  }
}
