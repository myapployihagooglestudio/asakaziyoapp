import assert from 'assert';
import {
  parseMp3DurationMs,
  normalizeArabicForComparison,
  splitAyahForQuiz,
  splitAyahLastWord,
  selectDiverseDailyCandidates,
  validateGeminiAnalysisResult,
  shuffleQuestionOptions,
  parseQuotaErrorInfo,
  mapBatchItemsToQuestions,
  type PreparedQuizCandidate,
} from '../../server/quranQuizEngine';
import {
  QURAN_RECITERS,
  SURAHS_LIST,
  getQuranReciterAudioCapabilities,
  resolveUnifiedAyahContent,
} from '../data/quranData';
import {
  USED_VERSES_STORAGE_KEY,
  archiveUsedAyahKeys,
  buildQuizAudioCacheKey,
  buildQuizQuestionAudioCandidates,
  cacheDailyQuranQuiz,
  calculateAttemptSummary,
  computeQuestionAudioSlice,
  getCachedDailyQuranQuiz,
  getUsedAyahKeys,
  getYesterdayTashkentDateStr,
  rebindQuizSetToReciter,
} from './quranQuizService';
import type { DailyQuranQuizSet, QuranQuizQuestion } from '../types';
import {
  buildStrictReciterAudioUrls,
  formatCanonicalQuizVideoFilename,
  hasMp4FtypSignature,
  startQuizPartRenderJob,
} from '../../server/quranQuizVideoRenderer';
import {
  formatQuizMp4Filename,
  verifyMp4BinaryBuffer,
} from './cinemaQuizExporter';

function buildSyntheticMp3Buffer(frameCount: number): Buffer {
  // MPEG 1 Layer III, 128 kbps (idx 9 = 0x90), 44100 Hz (idx 0), no padding => 417 bytes/frame
  // Header: 0xFF 0xFB 0x90 0x00
  const frameSize = 417;
  const id3Header = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, // 10-byte ID3 payload size
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const frames: Buffer[] = [id3Header];
  for (let i = 0; i < frameCount; i++) {
    const frame = Buffer.alloc(frameSize, 0xaa);
    frame[0] = 0xff;
    frame[1] = 0xfb;
    frame[2] = 0x90;
    frame[3] = 0x00;
    frames.push(frame);
  }
  return Buffer.concat(frames);
}

function setupMockLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  };
}

function runTests() {
  // 1. MP3 frame parser verification
  const synthetic100Frames = buildSyntheticMp3Buffer(100);
  const parsedMs = parseMp3DurationMs(synthetic100Frames);
  // 100 * (1152 / 44100) * 1000 = 2612.24ms => ~2612ms
  assert.ok(Math.abs(parsedMs - 2612) <= 2, `Expected ~2612ms, got ${parsedMs}`);
  assert.strictEqual(parseMp3DurationMs(Buffer.from('<html>404 Not Found</html>')), 0);
  assert.strictEqual(parseMp3DurationMs(Buffer.alloc(10)), 0);

  // 2. Canonical Arabic word splitting & trailing waqf marks handling
  const split1 = splitAyahLastWord('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
  assert.strictEqual(split1.spokenWordCount, 4);
  assert.strictEqual(split1.maskedArabicPrefix, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ');
  assert.strictEqual(split1.hiddenWord, 'الرَّحِيمِ');
  assert.strictEqual(split1.trailingMarker, '');

  const split2 = splitAyahLastWord('ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَۚ');
  assert.strictEqual(split2.hiddenWord, 'لِّلْمُتَّقِينَ');
  assert.strictEqual(split2.trailingMarker, 'ۚ');
  assert.strictEqual(split2.hiddenWordCount, 1);
  assert.ok(split2.spokenWordCount >= 6);

  // 2B. 2-word ending hiding for longer ayahs
  const splitTwoWords = splitAyahLastWord('صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', 2);
  assert.strictEqual(splitTwoWords.hiddenWordCount, 2);
  assert.strictEqual(splitTwoWords.hiddenWord, 'وَلَا الضَّالِّينَ');
  assert.strictEqual(splitTwoWords.maskedArabicPrefix, 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ');

  // 2-word distractor validation
  const validTwoWordDistractors = validateGeminiAnalysisResult(
    {
      startTimeMs: 120,
      pauseBeforeLastWordMs: 4200,
      endTimeMs: 5600,
      distractors: ['وَلَا الْمُفْسِدِينَ', 'وَلَا الْخَاسِرِينَ', 'وَلَا الْكَافِرِينَ'],
    },
    6000,
    'وَلَا الضَّالِّينَ'
  );
  assert.ok(validTwoWordDistractors);
  assert.strictEqual(validTwoWordDistractors?.distractors[0], 'وَلَا الْمُفْسِدِينَ');

  // 3. Arabic normalization for duplicate detection
  assert.strictEqual(
    normalizeArabicForComparison('الرَّحِيمِ'),
    normalizeArabicForComparison('الرحيم')
  );
  assert.notStrictEqual(
    normalizeArabicForComparison('الرَّحِيمِ'),
    normalizeArabicForComparison('الْعَلِيمِ')
  );

  // 4. Daily diverse candidate selection across surahs & exclusion of used keys
  const usedSet = new Set<string>(['103:2', '112:2', '1:2', '55:13']);
  const cands = selectDiverseDailyCandidates(usedSet, '2026-11-17', 20);
  assert.ok(cands.length >= 10);
  const surahMap = new Map(SURAHS_LIST.map((s) => [s.number, s]));
  for (const c of cands) {
    assert.ok(!usedSet.has(c.ayahKey), `Excluded key leaked: ${c.ayahKey}`);
    const sInfo = surahMap.get(c.surahNumber);
    assert.ok(sInfo, `Invalid surah ${c.surahNumber}`);
    assert.ok(
      c.ayahNumberInSurah >= 1 && c.ayahNumberInSurah <= sInfo!.numberOfAyahs,
      `Ayah out of bounds: ${c.ayahKey}`
    );
  }
  const firstTenUniqueSurahs = new Set(cands.slice(0, 10).map((c) => c.surahNumber));
  assert.strictEqual(firstTenUniqueSurahs.size, 10, 'First 10 candidates must span 10 distinct surahs');

  // 5. Gemini analysis strict validator
  const validAnalysis = validateGeminiAnalysisResult(
    {
      startTimeMs: 120,
      pauseBeforeLastWordMs: 3650,
      endTimeMs: 4820,
      distractors: ['الْعَلِيمِ', 'الْحَكِيمِ', 'الْكَرِيمِ'],
    },
    5000,
    'الرَّحِيمِ'
  );
  assert.ok(validAnalysis);
  assert.strictEqual(validAnalysis?.distractors.length, 3);

  // Reject reversed pause/end timestamps or out-of-bounds
  assert.strictEqual(
    validateGeminiAnalysisResult(
      {
        startTimeMs: 100,
        pauseBeforeLastWordMs: 4800,
        endTimeMs: 3900,
        distractors: ['الْعَلِيمِ', 'الْحَكِيمِ', 'الْكَرِيمِ'],
      },
      5000,
      'الرَّحِيمِ'
    ),
    null
  );

  // Reject distractors matching hiddenWord after harakat stripping
  assert.strictEqual(
    validateGeminiAnalysisResult(
      {
        startTimeMs: 100,
        pauseBeforeLastWordMs: 3000,
        endTimeMs: 4600,
        distractors: ['الرحيم', 'الْحَكِيمِ', 'الْكَرِيمِ'],
      },
      5000,
      'الرَّحِيمِ'
    ),
    null
  );

  // 6. Deterministic shuffling preserves correct answer index
  const shuffled = shuffleQuestionOptions(
    'الرَّحِيمِ',
    ['الْعَلِيمِ', 'الْحَكِيمِ', 'الْكَرِيمِ'],
    '1:1_mishary_3650'
  );
  assert.strictEqual(shuffled.options.length, 4);
  assert.strictEqual(shuffled.options[shuffled.correctIndex], 'الرَّحِيمِ');

  // 7. LocalStorage used_verses & same-day caching + score summary
  setupMockLocalStorage();
  archiveUsedAyahKeys(['103:2', '112:3']);
  const archived = getUsedAyahKeys();
  assert.ok(archived.includes('103:2') && archived.includes('112:3'));
  assert.ok(
    (globalThis as any).window.localStorage.getItem(USED_VERSES_STORAGE_KEY)?.includes('103:2'),
    'Must persist directly into localStorage["used_verses"]'
  );

  const mockQuestions: QuranQuizQuestion[] = Array.from({ length: 10 }).map((_, idx) => ({
    id: `q_${idx}`,
    ayahKey: `${idx + 1}:2`,
    globalAyahNumber: idx + 2,
    surahNumber: idx + 1,
    surahNameUz: `Surah ${idx + 1}`,
    surahNameAr: 'سورة',
    ayahNumberInSurah: 2,
    reciterId: 'mishary',
    reciterName: 'Shayx Mishariy',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001002.mp3',
    audioDurationMs: 5000,
    fullArabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    hidePos: 'end',
    maskedArabicBefore: 'الْحَمْدُ لِلَّهِ رَبِّ',
    maskedArabicPrefix: 'الْحَمْدُ لِلَّهِ رَبِّ',
    maskedArabicAfter: '',
    hiddenWord: 'الْعَالَمِينَ',
    pauseRatio: 0.64,
    resumeRatio: 0.64,
    startTimeMs: 100,
    pauseBeforeLastWordMs: 3200,
    endTimeMs: 4800,
    options: ['الْعَالَمِينَ', 'الرَّحِيمِ', 'الْعَلِيمِ', 'الْحَكِيمِ'],
    correctIndex: 0,
    aiModel: 'gemini-4-hydrogen',
    analyzedAt: '2026-11-17T05:00:00.000Z',
  }));

  const mockSet: DailyQuranQuizSet = {
    id: '2026-11-17',
    dateStr: '2026-11-17',
    reciterId: 'mishary',
    reciterName: 'Shayx Mishariy',
    questions: mockQuestions,
    usedAyahKeys: mockQuestions.map((q) => q.ayahKey),
    createdAt: '2026-11-17T05:00:00.000Z',
  };
  cacheDailyQuranQuiz(mockSet);
  const reloadedSet = getCachedDailyQuranQuiz('2026-11-17', 'mishary');
  assert.ok(reloadedSet);
  assert.strictEqual(reloadedSet?.questions.length, 10);
  assert.strictEqual(reloadedSet?.questions[0].ayahKey, '1:2');

  const summary = calculateAttemptSummary(mockQuestions, {
    0: { selectedIndex: 0, responseTimeMs: 1400 },
    1: { selectedIndex: 0, responseTimeMs: 1900 },
    2: { selectedIndex: 1, responseTimeMs: 2500 },
    3: { selectedIndex: null, responseTimeMs: 3500 },
  });
  assert.strictEqual(summary.score, 2);
  assert.strictEqual(summary.incorrectCount, 8);
  assert.strictEqual(summary.total, 10);
  assert.strictEqual(summary.percentage, 20);

  // 8. Gemini 429 RESOURCE_EXHAUSTED & retryDelay parsing
  const quotaErr = new Error(
    JSON.stringify({
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'Quota exceeded. Please retry in 17h34m28.02s.',
        details: [{ retryDelay: '63268s' }],
      },
    })
  );
  const parsedQuota = parseQuotaErrorInfo(quotaErr);
  assert.strictEqual(parsedQuota.isQuotaExceeded, true);
  assert.strictEqual(parsedQuota.isAuthError, false);
  assert.strictEqual(parsedQuota.retryAfterSeconds, 63268);

  const notFoundErr = { status: 404, message: 'Model not found: gemini-2.5-flash' };
  const parsed404 = parseQuotaErrorInfo(notFoundErr);
  assert.strictEqual(parsed404.isModelNotFound, true);
  assert.strictEqual(parsed404.isQuotaExceeded, false);

  // 9. Single-request batched Gemini response mapper validates 10 distinct surahs & drops invalid entries
  const batchCandidates: PreparedQuizCandidate[] = Array.from({ length: 11 }).map((_, idx) => ({
    candidate: {
      surahNumber: idx === 10 ? 1 : idx + 1, // 11th duplicates surah 1 to verify deduplication
      ayahNumberInSurah: idx === 10 ? 3 : 2,
      ayahKey: `${idx === 10 ? 1 : idx + 1}:${idx === 10 ? 3 : 2}`,
      surahNameUz: `Surah ${idx + 1}`,
      surahNameAr: 'سورة',
    },
    audioUrl: `https://everyayah.com/data/Alafasy_128kbps/00${idx + 1}002.mp3`,
    audioBuffer: synthetic100Frames,
    audioDurationMs: 5000,
    fullArabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    maskedArabicPrefix: 'الْحَمْدُ لِلَّهِ رَبِّ',
    hiddenWord: 'الْعَالَمِينَ',
    hiddenWordCount: 1,
    trailingMarker: '',
  }));

  const rawBatchItems = [
    ...batchCandidates.map((b) => ({
      ayahKey: b.candidate.ayahKey,
      startTimeMs: 120,
      pauseBeforeLastWordMs: 3300,
      endTimeMs: 4700,
      distractors: ['الرَّحِيمِ', 'الْعَلِيمِ', 'الْحَكِيمِ'] as [string, string, string],
      translationUz: 'FAKE_GEMINI_SHOULD_BE_IGNORED',
    })),
    {
      // Unknown ayahKey should be ignored
      ayahKey: '999:99',
      startTimeMs: 100,
      pauseBeforeLastWordMs: 3000,
      endTimeMs: 4500,
      distractors: ['الرَّحِيمِ', 'الْعَلِيمِ', 'الْحَكِيمِ'] as [string, string, string],
    },
  ];

  const mappedQuestions = mapBatchItemsToQuestions({
    rawItems: rawBatchItems,
    batchCandidates,
    reciterId: 'mishary',
    reciterName: 'Shayx Mishariy',
    aiModel: 'gemini-3.1-flash-lite',
  });
  assert.strictEqual(mappedQuestions.length, 10, 'Must keep exactly 10 unique-surah validated questions');
  assert.strictEqual(new Set(mappedQuestions.map((q) => q.surahNumber)).size, 10);
  assert.strictEqual(mappedQuestions[0].aiModel, 'gemini-3.1-flash-lite');
  const expectedUnified1_2 = resolveUnifiedAyahContent(1, 2);
  assert.strictEqual(mappedQuestions[0].translationUz, expectedUnified1_2.translationUz);
  assert.ok(!String(mappedQuestions[0].translationUz || '').includes('FAKE_GEMINI'));

  // 10. hidePos ('start' | 'middle' | 'end') splitting, validation & AudioBuffer slicing
  const ayahWordsText = 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ';
  const startSplit = splitAyahForQuiz(ayahWordsText, 'start', 1);
  assert.strictEqual(startSplit.hidePos, 'start');
  assert.strictEqual(startSplit.maskedArabicBefore, '');
  assert.strictEqual(startSplit.hiddenWord, 'إِنَّ');
  assert.ok(startSplit.maskedArabicAfter.startsWith('الْإِنسَانَ'));

  const middleSplit = splitAyahForQuiz(ayahWordsText, 'middle', 1);
  assert.strictEqual(middleSplit.hidePos, 'middle');
  assert.ok(middleSplit.maskedArabicBefore.length > 0 && middleSplit.maskedArabicAfter.length > 0);
  assert.ok(middleSplit.hiddenWord.length > 0);

  const validStartGemini = validateGeminiAnalysisResult(
    {
      pauseRatio: 0.18,
      resumeRatio: 0.18,
      startTimeMs: 900,
      pauseBeforeLastWordMs: 900,
      endTimeMs: 5000,
      distractors: ['كَانَ', 'قَدْ', 'لَقَدْ'],
    },
    5000,
    startSplit.hiddenWord,
    'start'
  );
  assert.ok(validStartGemini && validStartGemini.resumeRatio === 0.18);

  const validMiddleGemini = validateGeminiAnalysisResult(
    {
      pauseRatio: 0.42,
      resumeRatio: 0.61,
      startTimeMs: 0,
      pauseBeforeLastWordMs: 2100,
      endTimeMs: 5000,
      distractors: ['الْمُؤْمِنُونَ', 'الصَّابِرُونَ', 'الشَّاكِرُونَ'],
    },
    5000,
    middleSplit.hiddenWord,
    'middle'
  );
  assert.ok(validMiddleGemini && validMiddleGemini.pauseRatio === 0.42 && validMiddleGemini.resumeRatio === 0.61);

  // AudioBuffer slicing exact bounds check
  const endQSlice = computeQuestionAudioSlice({
    durationSec: 10,
    hidePos: 'end',
    pauseRatio: 0.72,
    resumeRatio: 0.72,
    phase: 'question',
  });
  assert.strictEqual(endQSlice.offsetSec, 0);
  assert.ok(Math.abs(endQSlice.durationSec - 7.2) < 1e-6);

  const endRSlice = computeQuestionAudioSlice({
    durationSec: 10,
    hidePos: 'end',
    pauseRatio: 0.72,
    resumeRatio: 0.72,
    phase: 'reveal',
  });
  assert.ok(Math.abs(endRSlice.offsetSec - 7.2) < 1e-6);
  assert.ok(Math.abs(endRSlice.durationSec - 2.8) < 1e-6);

  const startQSlice = computeQuestionAudioSlice({
    durationSec: 10,
    hidePos: 'start',
    pauseRatio: 0.22,
    resumeRatio: 0.22,
    phase: 'question',
  });
  assert.ok(Math.abs(startQSlice.offsetSec - 2.2) < 1e-6);
  assert.ok(Math.abs(startQSlice.durationSec - 7.8) < 1e-6);

  const startRSlice = computeQuestionAudioSlice({
    durationSec: 10,
    hidePos: 'start',
    pauseRatio: 0.22,
    resumeRatio: 0.22,
    phase: 'reveal',
  });
  assert.strictEqual(startRSlice.offsetSec, 0);
  assert.strictEqual(startRSlice.durationSec, 10);

  const midQSlice = computeQuestionAudioSlice({
    durationSec: 10,
    hidePos: 'middle',
    pauseRatio: 0.45,
    resumeRatio: 0.65,
    phase: 'question',
  });
  assert.strictEqual(midQSlice.offsetSec, 0);
  assert.ok(Math.abs(midQSlice.durationSec - 4.5) < 1e-6);

  // 11. Cache keying `${qariId}:${globalAyahNumber}`, Shayx Alijon qori ordering, and islamic.network fallback
  assert.strictEqual(QURAN_RECITERS[0].id, 'alijon');
  assert.strictEqual(QURAN_RECITERS[0].name, 'Shayx Alijon qori');
  assert.strictEqual(buildQuizAudioCacheKey('alijon', 6178), 'alijon:6178');
  assert.notStrictEqual(buildQuizAudioCacheKey('alijon', 6178), buildQuizAudioCacheKey('mishary', 6178));

  const fallbackUrls = buildQuizQuestionAudioCandidates(mockQuestions[0]);
  assert.ok(
    fallbackUrls.some((u) => u.includes('cdn.islamic.network/quran/audio/128/ar.alafasy/')),
    'Mishary candidates include his own CORS-enabled cdn.islamic.network stream'
  );

  // 12. Non-Mishary reciters NEVER leak Mishary (ar.alafasy / Alafasy_128kbps) audio URLs
  for (const nonMisharyId of ['suwayd', 'hussary', 'dussary', 'sudais', 'juhany', 'ghamidi', 'shatri', 'alijon']) {
    const reciterObj = QURAN_RECITERS.find((r) => r.id === nonMisharyId)!;
    const fakeQ: QuranQuizQuestion = {
      ...mockQuestions[0],
      reciterId: nonMisharyId,
      reciterName: reciterObj.name,
      audioUrl: '',
      fallbackAudioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6178.mp3',
    };
    const candidates = buildQuizQuestionAudioCandidates(fakeQ);
    assert.ok(
      candidates.every((u) => !u.includes('ar.alafasy') && !u.includes('Alafasy_128kbps')),
      `Reciter ${nonMisharyId} must NEVER receive Mishary fallback audio`
    );
  }
  assert.strictEqual(
    getQuranReciterAudioCapabilities(QURAN_RECITERS.find((r) => r.id === 'alijon')).quizReady,
    false
  );
  assert.strictEqual(
    getQuranReciterAudioCapabilities(QURAN_RECITERS.find((r) => r.id === 'suwayd')).quizReady,
    true
  );
}

// Extend tests at bottom before calling runTests()
function runExtendedTests() {
  // 13. Authentic Qur'on section translation & tafsir resolution (never fabricated)
  const fatiha1 = resolveUnifiedAyahContent(1, 1, 'uz-Latn');
  assert.ok(fatiha1.translationUz.length > 0, '1:1 must have official Uzbek translation');
  assert.ok(fatiha1.tafsirTextUz.length > 0, '1:1 must have authentic Tafsiri Hilol text');
  assert.ok(
    fatiha1.tafsirSource.includes('Tafsiri Hilol'),
    `Expected Tafsiri Hilol source for 1:1, got ${fatiha1.tafsirSource}`
  );

  const mulk1 = resolveUnifiedAyahContent(67, 1, 'uz-Latn');
  assert.strictEqual(mulk1.tafsirScope, 'surah');
  assert.ok(mulk1.tafsirTextUz.includes('Asosiy mavzular') || mulk1.tafsirTextUz.length > 20);

  const nonTafsir84_6 = resolveUnifiedAyahContent(84, 6, 'uz-Latn');
  assert.strictEqual(nonTafsir84_6.tafsirScope, 'none');
  assert.strictEqual(nonTafsir84_6.tafsirTextUz, '', 'Must never fabricate tafsir when not in DB');

  // 14. Canonical daily quiz rebinds cleanly to any selected reciter without changing the 10 questions
  const canonicalSet: DailyQuranQuizSet = {
    id: '2026-11-17',
    dateStr: '2026-11-17',
    reciterId: 'mishary',
    reciterName: 'Shayx Mishariy al-Afosiy',
    questions: Array.from({ length: 10 }).map((_, idx) => ({
      id: `p_${idx}`,
      ayahKey: `1:${(idx % 7) + 1}`,
      globalAyahNumber: (idx % 7) + 1,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      surahNameAr: 'الفاتحة',
      ayahNumberInSurah: (idx % 7) + 1,
      reciterId: 'mishary',
      reciterName: 'Shayx Mishariy al-Afosiy',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
      audioDurationMs: 4000,
      fullArabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      hidePos: 'end',
      maskedArabicBefore: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ',
      maskedArabicPrefix: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ',
      maskedArabicAfter: '',
      hiddenWord: 'الرَّحِيمِ',
      pauseRatio: 0.72,
      resumeRatio: 0.72,
      startTimeMs: 100,
      pauseBeforeLastWordMs: 2800,
      endTimeMs: 3900,
      options: ['الرَّحِيمِ', 'الْعَلِيمِ', 'الْحَكِيمِ', 'الْكَرِيمِ'],
      correctIndex: 0,
      aiModel: 'gemini-4-hydrogen',
      analyzedAt: '2026-11-17T05:00:00.000Z',
    })),
    usedAyahKeys: ['1:1'],
    createdAt: '2026-11-17T05:00:00.000Z',
  };
  cacheDailyQuranQuiz(canonicalSet);
  const reboundSuwayd = getCachedDailyQuranQuiz('2026-11-17', 'suwayd');
  assert.ok(reboundSuwayd, 'Canonical date quiz must load for Suwayd');
  assert.strictEqual(reboundSuwayd?.reciterId, 'suwayd');
  assert.strictEqual(reboundSuwayd?.questions.length, 10);
  assert.ok(
    reboundSuwayd!.questions.every(
      (q) => !q.audioUrl.includes('Alafasy_128kbps') && q.audioUrl.includes('Ayman_Sowaid')
    ),
    'Rebound Suwayd quiz must use Suwayd audio URLs while preserving all 10 questions'
  );
  const directRebound = rebindQuizSetToReciter(canonicalSet, 'sudais');
  assert.strictEqual(directRebound.id, '2026-11-17');
  assert.strictEqual(directRebound.reciterId, 'sudais');
  assert.ok(directRebound.questions.every((q) => q.audioUrl.includes('Abdurrahmaan_As-Sudais')));

  // 15. Server video renderer strict per-reciter audio guard, canonical filenames (quiz-01.mp4 .. quiz-10.mp4), & 1-question per video validation
  assert.strictEqual(formatCanonicalQuizVideoFilename(1), 'quiz-01.mp4');
  assert.strictEqual(formatCanonicalQuizVideoFilename(10), 'quiz-10.mp4');
  assert.strictEqual(formatQuizMp4Filename(1), 'quiz-01.mp4');
  assert.strictEqual(formatQuizMp4Filename(10), 'quiz-10.mp4');
  assert.strictEqual(getYesterdayTashkentDateStr('2026-04-12'), '2026-04-11');

  // MP4 ftyp binary verification vs HTML fallback rejection
  const validMp4Buf = Buffer.alloc(8192, 0);
  validMp4Buf.writeUInt32BE(32, 0);
  validMp4Buf.write('ftypisom', 4, 'ascii');
  assert.strictEqual(hasMp4FtypSignature(validMp4Buf), true);
  assert.strictEqual(verifyMp4BinaryBuffer(new Uint8Array(validMp4Buf).buffer).valid, true);

  const htmlFallbackBuf = Buffer.from('<!DOCTYPE html><html><body>SPA Fallback</body></html>'.padEnd(6000, ' '));
  assert.strictEqual(hasMp4FtypSignature(htmlFallbackBuf), false);
  const htmlVerify = verifyMp4BinaryBuffer(new Uint8Array(htmlFallbackBuf).buffer);
  assert.strictEqual(htmlVerify.valid, false);
  assert.ok(String(htmlVerify.error || '').includes('HTML'));

  const strictSuwaydUrls = buildStrictReciterAudioUrls({
    id: 'q1',
    ayahKey: '1:1',
    surahNumber: 1,
    ayahNumberInSurah: 1,
    reciterId: 'suwayd',
    reciterName: 'Shayx Ayman Suwayd',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    fallbackAudioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
    hidePos: 'end',
    pauseRatio: 0.72,
    resumeRatio: 0.72,
    prefixJpgBase64: '',
    revealJpgBase64: '',
  });
  assert.ok(
    strictSuwaydUrls.length > 0 &&
      strictSuwaydUrls.every((u) => !u.includes('Alafasy_128kbps') && !u.includes('/ar.alafasy/')),
    'Video renderer must strip leaked Mishary URLs for non-Mishary reciters'
  );

  assert.throws(
    () =>
      startQuizPartRenderJob({
        questionNumber: 11,
        quizDateStr: '2026-11-17',
        reciterName: 'Shayx Mishariy',
        introJpgBase64: 'x',
        outroJpgBase64: 'y',
        questions: [],
      }),
    /1 dan 10 gacha boʻlishi kerak/
  );
  assert.throws(
    () =>
      startQuizPartRenderJob({
        questionNumber: 1,
        quizDateStr: '2026-11-17',
        reciterName: 'Shayx Mishariy',
        introJpgBase64: 'x',
        outroJpgBase64: 'y',
        questions: Array.from({ length: 2 }).map((_, idx) => ({
          id: `q_${idx}`,
          ayahKey: `1:${idx + 1}`,
          surahNumber: 1,
          ayahNumberInSurah: idx + 1,
          reciterId: 'mishary',
          reciterName: 'Shayx Mishariy',
          audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
          hidePos: 'end',
          pauseRatio: 0.72,
          resumeRatio: 0.72,
          prefixJpgBase64: 'x',
          revealJpgBase64: 'y',
        })),
      }),
    /faqat 1 ta savol boʻlishi shart/
  );
}

runTests();
runExtendedTests();
console.log('✅ [PASS] All Kunlik Qurʼon Viktorinasi tests passed!');

