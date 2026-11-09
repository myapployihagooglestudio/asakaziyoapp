import assert from 'assert';
import {
  CANONICAL_SURAH_AYAH_COUNTS,
  VERIFIED_MISHARY_FATIHA_ALIGNMENT,
  validateQuranAlignmentRecord,
  resolveActiveAyahFromIntervals,
} from './quranAudioSyncEngine';

function testSuite() {
  // Test 1: Verified canonical ayah counts
  assert.strictEqual(CANONICAL_SURAH_AYAH_COUNTS[1], 7);
  assert.strictEqual(CANONICAL_SURAH_AYAH_COUNTS[2], 286);
  assert.strictEqual(CANONICAL_SURAH_AYAH_COUNTS[36], 83);
  assert.strictEqual(CANONICAL_SURAH_AYAH_COUNTS[112], 4);
  assert.strictEqual(CANONICAL_SURAH_AYAH_COUNTS[114], 6);

  // Test 2: Authentic Mishary Al-Fatiha record
  const res = validateQuranAlignmentRecord(VERIFIED_MISHARY_FATIHA_ALIGNMENT);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedRecord);
  assert.strictEqual(res.validatedRecord?.verificationStatus, 'verified');
  assert.strictEqual(res.validatedRecord?.ayahAlignments.length, 7);

  // Test 3: Rejections
  const badCount = {
    reciterId: 'mishary',
    surahNumber: 1,
    audioUrl: 'https://example.com/1.mp3',
    ayahAlignments: [
      { ayahNumberInSurah: 1, startTimeMs: 0, endTimeMs: 5000, confidence: 0.9 },
      { ayahNumberInSurah: 2, startTimeMs: 5000, endTimeMs: 10000, confidence: 0.9 },
    ],
  };
  assert.strictEqual(validateQuranAlignmentRecord(badCount).valid, false);

  const overlapping = {
    reciterId: 'mishary',
    surahNumber: 1,
    audioUrl: 'https://example.com/1.mp3',
    ayahAlignments: [
      { ayahNumberInSurah: 1, startTimeMs: 0, endTimeMs: 6000, confidence: 0.9 },
      { ayahNumberInSurah: 2, startTimeMs: 5500, endTimeMs: 11000, confidence: 0.9 },
      { ayahNumberInSurah: 3, startTimeMs: 11000, endTimeMs: 16000, confidence: 0.9 },
      { ayahNumberInSurah: 4, startTimeMs: 16000, endTimeMs: 20000, confidence: 0.9 },
      { ayahNumberInSurah: 5, startTimeMs: 20000, endTimeMs: 27000, confidence: 0.9 },
      { ayahNumberInSurah: 6, startTimeMs: 27000, endTimeMs: 33000, confidence: 0.9 },
      { ayahNumberInSurah: 7, startTimeMs: 33000, endTimeMs: 46000, confidence: 0.9 },
    ],
  };
  assert.strictEqual(validateQuranAlignmentRecord(overlapping).valid, false);

  // Test 4: Accurate ayah resolution across timeline
  const intervals = VERIFIED_MISHARY_FATIHA_ALIGNMENT.ayahAlignments;
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 0), 1);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 3000), 1);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 6089), 1);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 6090), 2);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 9000), 2);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 11679), 2);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 11680), 3);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 14000), 3);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 16300), 4);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 18500), 4);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 21000), 5);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 30000), 6);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 35000), 7);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 46480), 7);
  assert.strictEqual(resolveActiveAyahFromIntervals(intervals, 55000), null);
}

testSuite();
console.log('✅ [PASS] All quranAudioSyncEngine tests passed successfully!');
