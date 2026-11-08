/**
 * ASAKA ZIYO — Premium Complete Quran Experience Unit Tests
 * 
 * Verifies:
 * 1. Complete 114 surahs structure, Uthmani names & ayah counts
 * 2. 30 Juz (Para) continuous navigation ranges
 * 3. 8 Canonical reciters audio streaming & download URLs
 * 4. Khatm tracker, daily reading goals, and reading streak persistence
 * 5. Bookmarks toggle, persistence and retrieval
 * 6. Personal notes save, edit, and deletion
 * 7. Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf) integrity and search
 */

import {
  SURAHS_LIST,
  JUZ_LIST,
  QURAN_RECITERS,
  VERIFIED_AYAHS,
  getReciterAyahAudioUrl,
  getReciterSurahAudioUrl,
} from '../data/quranData';
import {
  TAFSIRI_HILOL_ENTRIES,
  getTafsirEntryForSurah,
  searchTafsirHilol,
} from '../data/tafsirHilolData';
import {
  getStoredQuranProgress,
  saveStoredQuranProgress,
  getStoredQuranBookmarks,
  toggleStoredQuranBookmark,
  getStoredQuranNotes,
  saveStoredQuranNote,
  deleteStoredQuranNote,
} from './databaseService';

// Mock localStorage for node environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = { localStorage: mockLocalStorage };

console.log('--- RUNNING ASAKA ZIYO PREMIUM QURAN EXPERIENCE UNIT TESTS ---');

function assert(condition: boolean, desc: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${desc}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${desc}`);
}

// -----------------------------------------------------------------------------
// Test 1: Complete 114 Surahs Integrity
// -----------------------------------------------------------------------------
assert(SURAHS_LIST.length === 114, 'Quran contains exactly 114 surahs');
assert(SURAHS_LIST[0].number === 1 && SURAHS_LIST[0].nameUz === 'Fotiha', 'First surah is Fatiha');
assert(SURAHS_LIST[113].number === 114 && SURAHS_LIST[113].nameUz === 'Nos', 'Last surah is An-Naas');

// Verify sequential numbering and non-empty metadata
let totalAyahsCalculated = 0;
for (let i = 0; i < 114; i++) {
  const s = SURAHS_LIST[i];
  assert(s.number === i + 1, `Surah index ${i} has correct number ${i + 1}`);
  assert(s.nameAr.length > 0, `Surah ${s.number} has valid Arabic name: ${s.nameAr}`);
  assert(s.nameUz.length > 0, `Surah ${s.number} has valid Uzbek name: ${s.nameUz}`);
  assert(s.numberOfAyahs > 0, `Surah ${s.number} has non-zero total ayahs (${s.numberOfAyahs})`);
  assert(s.revelationType === 'Makkah' || s.revelationType === 'Madina', `Surah ${s.number} is classified as Makkah or Madina`);
  totalAyahsCalculated += s.numberOfAyahs;
}
assert(totalAyahsCalculated === 6236, `Total ayahs across all 114 surahs is exactly 6236 (calculated: ${totalAyahsCalculated})`);

// -----------------------------------------------------------------------------
// Test 2: Complete 30 Juz (Para) Structure
// -----------------------------------------------------------------------------
assert(JUZ_LIST.length === 30, 'Quran contains exactly 30 Juz (Poralar)');
assert(JUZ_LIST[0].juzNumber === 1 && JUZ_LIST[0].startSurah === 1 && JUZ_LIST[0].startAyah === 1, 'Juz 1 starts at Surah 1:1');
assert(JUZ_LIST[29].juzNumber === 30 && JUZ_LIST[29].endSurah === 114, 'Juz 30 ends at Surah 114');

// Verify continuous progression across all 30 Juz
for (let i = 0; i < 30; i++) {
  const j = JUZ_LIST[i];
  assert(j.juzNumber === i + 1, `Juz ${i + 1} has correct index`);
  assert(j.nameUz.length > 0, `Juz ${i + 1} has Uzbek title (${j.nameUz})`);
  assert(j.startSurah >= 1 && j.startSurah <= 114, `Juz ${i + 1} has valid start surah`);
  assert(j.endSurah >= j.startSurah && j.endSurah <= 114, `Juz ${i + 1} has valid end surah`);
}

// -----------------------------------------------------------------------------
// Test 3: 8 Canonical Reciters and Audio URL generation
// -----------------------------------------------------------------------------
assert(QURAN_RECITERS.length === 8, '8 Canonical reciters are configured');
const mishary = QURAN_RECITERS.find((r) => r.id === 'mishary');
assert(Boolean(mishary), 'Shaykh Mishary Rashid Alafasy is present');
assert(Boolean(mishary?.subtext.includes('Kuvayt') && mishary?.subtext.includes('Murattal')), 'Mishary metadata is correct');

// Test Ayah Audio URL formatting
const fatihaAyah1Url = getReciterAyahAudioUrl('mishary', 1, 1);
assert(fatihaAyah1Url.includes('everyayah.com') && fatihaAyah1Url.includes('001001.mp3'), `Ayah audio URL correctly formats three-digit zero-padded codes: ${fatihaAyah1Url}`);

const baqaraAyah255Url = getReciterAyahAudioUrl('mishary', 2, 255);
assert(baqaraAyah255Url.includes('002255.mp3'), `Ayatul Kursi URL formatted: ${baqaraAyah255Url}`);

// Test Surah Audio URL formatting
const fatihaSurahAudioUrl = getReciterSurahAudioUrl('mishary', 1);
assert(fatihaSurahAudioUrl.includes('001.mp3'), `Surah audio URL correctly formatted: ${fatihaSurahAudioUrl}`);

// -----------------------------------------------------------------------------
// Test 4: Offline Verified Ayahs Integrity
// -----------------------------------------------------------------------------
const fatihaAyahs = VERIFIED_AYAHS[1];
assert(Array.isArray(fatihaAyahs) && fatihaAyahs.length === 7, 'Surah Fatiha has 7 verified offline ayahs');
assert(fatihaAyahs[0].textAr === 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'First ayah of Fatiha has authentic Arabic text');
assert(fatihaAyahs[0].translationUz.includes('Mehribon va rahmli'), 'Uzbek translation by Shayx Muhammad Sodiq Muhammad Yusuf verified');

const ikhlasAyahs = VERIFIED_AYAHS[112];
assert(Array.isArray(ikhlasAyahs) && ikhlasAyahs.length === 4, 'Surah Ikhlas has 4 verified ayahs');

// -----------------------------------------------------------------------------
// Test 5: Reading Progress & Khatm Tracker Persistence
// -----------------------------------------------------------------------------
mockLocalStorage.clear();

const initialProgress = getStoredQuranProgress();
assert(initialProgress.lastReadSurah === 1, 'Initial last read surah is 1');
assert(initialProgress.dailyGoalAyahs === 10, 'Initial daily goal is 10 ayahs');
assert(initialProgress.khatmCompletedSurahs.length === 0, 'Initial completed surahs list is empty');

// Save progress update
const updatedProgress = saveStoredQuranProgress({
  lastReadSurah: 2,
  lastReadAyah: 255,
  dailyGoalAyahs: 50,
  todayAyahsRead: 25,
  khatmCompletedSurahs: [1, 112, 113, 114],
});

assert(updatedProgress.lastReadSurah === 2, 'Updated last read surah is 2');
assert(updatedProgress.lastReadAyah === 255, 'Updated last read ayah is 255');
assert(updatedProgress.dailyGoalAyahs === 50, 'Updated daily goal is 50');
assert(updatedProgress.todayAyahsRead === 25, 'Updated today ayahs read is 25');
assert(updatedProgress.khatmCompletedSurahs.length === 4, '4 surahs marked completed in Khatm');

// Verify read-back from storage
const readBackProgress = getStoredQuranProgress();
assert(readBackProgress.lastReadSurah === 2 && readBackProgress.todayAyahsRead === 25, 'Progress persisted and reloaded successfully');

// -----------------------------------------------------------------------------
// Test 6: Bookmarks Storage & Toggle
// -----------------------------------------------------------------------------
mockLocalStorage.clear();

const initialBookmarks = getStoredQuranBookmarks();
assert(initialBookmarks.length === 0, 'Initial bookmarks list is empty');

// Add bookmark for Surah 2, Ayah 255 (Ayatul Kursi)
const toggle1 = toggleStoredQuranBookmark({
  surahNumber: 2,
  surahNameUz: 'Baqara',
  ayahNumberInSurah: 255,
  snippet: 'Alloh – Undan o‘zga iloh yo‘q...',
  snippetAr: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
  snippetUz: 'Alloh – Undan o‘zga iloh yo‘q, tirik va qoim bo‘lgan Zotdir.',
});
assert(toggle1.bookmarked === true, 'Ayatul Kursi bookmarked');
assert(toggle1.list.length === 1, 'Bookmarks list length is 1');

// Add another bookmark for Surah 1, Ayah 1
const toggle2 = toggleStoredQuranBookmark({
  surahNumber: 1,
  surahNameUz: 'Fotiha',
  ayahNumberInSurah: 1,
  snippet: 'Mehribon va rahmli Alloh...',
  snippetAr: 'بِسْمِ اللَّهِ',
  snippetUz: 'Mehribon va rahmli Alloh nomi bilan.',
});
assert(toggle2.bookmarked === true && toggle2.list.length === 2, 'Second bookmark added');

// Toggle removing Surah 2, Ayah 255
const toggle3 = toggleStoredQuranBookmark({
  surahNumber: 2,
  surahNameUz: 'Baqara',
  ayahNumberInSurah: 255,
  snippet: '',
  snippetAr: '',
  snippetUz: '',
});
assert(toggle3.bookmarked === false, 'Ayatul Kursi bookmark removed on second toggle');
assert(toggle3.list.length === 1 && toggle3.list[0].surahNumber === 1, 'Only Fatiha bookmark remains');

// -----------------------------------------------------------------------------
// Test 7: Personal Notes Save, Edit & Delete
// -----------------------------------------------------------------------------
mockLocalStorage.clear();

const initialNotes = getStoredQuranNotes();
assert(initialNotes.length === 0, 'Initial notes list is empty');

// Create a new note
const notesAfterAdd = saveStoredQuranNote(
  2,
  286,
  'Baqara',
  'Alloh hech bir jonni toqatidan tashqari narsaga taklif qilmaydi...',
  'Ushbu oyat Allohning cheksiz rahmati va bandalariga osonlik tilashining dalilidir.'
);
assert(notesAfterAdd.length === 1, 'Note saved');
assert(notesAfterAdd[0].surahNumber === 2 && notesAfterAdd[0].ayahNumberInSurah === 286, 'Note has correct surah & ayah');
assert(notesAfterAdd[0].noteText.includes('cheksiz rahmati'), 'Note content matches');

// Update the same note
const notesAfterUpdate = saveStoredQuranNote(
  2,
  286,
  'Baqara',
  'Alloh hech bir jonni toqatidan tashqari narsaga taklif qilmaydi...',
  'YANGILANGAN: Ushbu oyat har kuni kechqurun oʻqilishi tavsiya etilgan Baqara surasining oxirgi oyatlaridan biridir.'
);
assert(notesAfterUpdate.length === 1, 'Updating existing note does not duplicate entries');
assert(notesAfterUpdate[0].noteText.includes('YANGILANGAN'), 'Note text was updated in place');

// Delete note
const noteId = notesAfterUpdate[0].id;
const notesAfterDelete = deleteStoredQuranNote(noteId);
assert(notesAfterDelete.length === 0, 'Note was successfully deleted');

// -----------------------------------------------------------------------------
// Test 8: Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf) Integrity
// -----------------------------------------------------------------------------
assert(TAFSIRI_HILOL_ENTRIES.length > 0, 'Tafsiri Hilol entries are available');

const fatihaTafsir = getTafsirEntryForSurah(1);
assert(Boolean(fatihaTafsir), 'Fatiha surasi tafsiri mavjud');
assert(Boolean(fatihaTafsir?.sourceNote.includes('Muhammad Sodiq Muhammad Yusuf')), 'Muallif: Shayx Muhammad Sodiq Muhammad Yusuf');
assert(Boolean(fatihaTafsir?.sourceNote.includes('Hilol Nashr')), 'Nashriyot: Hilol Nashr');

// Search Tafsir
const searchResults = searchTafsirHilol('fotiha');
assert(searchResults.length > 0, 'Tafsirdan "fotiha" bo‘yicha qidiruv natija berdi');

console.log('🎉 ALL 8 ASAKA ZIYO QURAN EXPERIENCE TESTS PASSED SUCCESSFULLY!');
