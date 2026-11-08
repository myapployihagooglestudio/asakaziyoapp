/**
 * ASAKA ZIYO — Global Intelligent Search Engine Utility
 * Unified indexing across Quran (Surahs & Ayahs), Hadith, Dhikr, Articles, News, Announcements,
 * Islamic Books, Academy Lessons, Quiz Archive, Mosque Events, and Media & Audio.
 * Supports Uzbek Latin, Uzbek Cyrillic (with automatic transliteration), New Uzbek Latin,
 * Russian, English, and Arabic (with tashkeel/harakat stripping).
 */

import { NavigationTab } from '../types';
import { SURAHS_LIST, VERIFIED_AYAHS } from '../data/quranData';
import { AUTHENTIC_HADITHS } from '../data/hadithData';
import { AUTHENTIC_DHIKRS } from '../data/dhikrData';
import { EDITORIAL_ARTICLES } from '../data/articlesData';
import { COMMUNITY_NEWS, COMMUNITY_ANNOUNCEMENTS } from '../data/newsAndAnnouncementsData';
import { getAllQuizQuestions } from '../data/quizQuestionsData';
import { ADHAN_TRACKS } from '../data/adhanTracksData';
import {
  getStoredArticles,
  getStoredHadiths,
  getStoredDhikrs,
  getStoredAnnouncements,
  getStoredNews,
  getStoredMediaPosts,
  getStoredDigitalBooks,
  getStoredAcademyLessons,
  getStoredMosqueEvents,
} from './databaseService';

export type SearchCategory =
  | 'all'
  | 'quran'
  | 'hadith'
  | 'dhikr'
  | 'articles'
  | 'news'
  | 'announcements'
  | 'books'
  | 'academy'
  | 'quiz'
  | 'events'
  | 'media';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  categoryLabelUz: string;
  title: string;
  subtitle: string;
  snippet: string;
  sourceOrAuthor?: string;
  routeTab: NavigationTab;
  routeId: string;
  score: number;
  arabicText?: string;
  date?: string;
}

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  ъ: '',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

function transliterateCyrillicToLatin(input: string): string {
  let out = '';
  for (const ch of input) {
    const lower = ch.toLowerCase();
    out += CYRILLIC_TO_LATIN_MAP[lower] !== undefined ? CYRILLIC_TO_LATIN_MAP[lower] : ch;
  }
  return out;
}

/**
 * Normalizes text for robust multilingual search matching:
 * - Converts Uzbek Cyrillic to Latin for cross-script matching
 * - Lowercases, strips diacritics, normalizes Uzbek apostrophes (ʻ, ʼ, ', `) and New Uzbek letters (ō, ğ, ş, ç)
 * - Strips Arabic tashkeel/harakat without altering canonical Quran display text
 */
export function normalizeSearchQuery(text: string): string {
  if (!text) return '';
  const transliterated = transliterateCyrillicToLatin(text.toLowerCase());
  return transliterated
    .replace(/ō/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 'sh')
    .replace(/ç/g, 'ch')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Latin diacritics
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove Arabic tashkeel / harakat
    .replace(/[أإآٱ]/g, 'ا') // normalize Arabic Alif forms for search matching only
    .replace(/[ʻʼ'`‘’]/g, '')
    .trim();
}

let memorySearchHistory: string[] = [];

/**
 * Retrieves search history from localStorage (with in-memory fallback)
 */
export function getSearchHistory(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('asaka_ziyo_search_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    }
  } catch {
    // fallback
  }
  return [...memorySearchHistory];
}

/**
 * Saves search query to history (capped at 15 recent unique queries)
 */
export function saveSearchHistoryQuery(query: string) {
  const clean = query.trim();
  if (!clean || clean.length < 2) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 15);
    memorySearchHistory = updated;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asaka_ziyo_search_history', JSON.stringify(updated));
    }
  } catch {
    // storage policy
  }
}

/**
 * Clears or removes a query from search history
 */
export function removeSearchHistoryQuery(query?: string) {
  try {
    if (!query) {
      memorySearchHistory = [];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('asaka_ziyo_search_history');
      }
    } else {
      const history = getSearchHistory();
      const updated = history.filter((item) => item !== query);
      memorySearchHistory = updated;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('asaka_ziyo_search_history', JSON.stringify(updated));
      }
    }
  } catch {
    // storage policy
  }
}

/**
 * Performs unified search across all 11 application content modules
 */
export function performGlobalSearch(query: string, category: SearchCategory = 'all'): SearchResultItem[] {
  const qNorm = normalizeSearchQuery(query);
  if (!qNorm || qNorm.length < 1) return [];

  const results: SearchResultItem[] = [];

  // 1. Quran Surahs & Verified Ayahs
  if (category === 'all' || category === 'quran') {
    SURAHS_LIST.forEach((sura) => {
      const titleMatch =
        normalizeSearchQuery(sura.nameUz).includes(qNorm) ||
        normalizeSearchQuery(sura.meaningUz).includes(qNorm) ||
        normalizeSearchQuery(sura.nameAr).includes(qNorm) ||
        String(sura.number) === qNorm;
      if (titleMatch) {
        results.push({
          id: `surah-${sura.number}`,
          category: 'quran',
          categoryLabelUz: 'Qurʼoni Karim (Sura)',
          title: `${sura.number}. ${sura.nameUz} (${sura.nameAr})`,
          subtitle: `${sura.meaningUz} · ${sura.numberOfAyahs} oyat · ${sura.revelationType}`,
          snippet: `${sura.nameUz} surasi — ${sura.meaningUz}. Mushaf sahifasi: ${sura.pageNumber}`,
          sourceOrAuthor: 'Qurʼoni Karim (Shayx Muhammad Sodiq Muhammad Yusuf tarjimasi)',
          routeTab: 'quran',
          routeId: String(sura.number),
          score: String(sura.number) === qNorm ? 100 : 88,
          arabicText: sura.nameAr,
        });
      }
    });

    // Search Verified Ayahs (Arabic text, Uzbek translation, Tafsir)
    Object.entries(VERIFIED_AYAHS).forEach(([surahNumStr, ayahs]) => {
      const surahNum = Number(surahNumStr);
      const suraMeta = SURAHS_LIST.find((s) => s.number === surahNum);
      ayahs.forEach((ayah: any) => {
        const refCode = `${surahNum}:${ayah.numberInSurah}`;
        const match =
          refCode === query.trim() ||
          normalizeSearchQuery(ayah.translationUz).includes(qNorm) ||
          normalizeSearchQuery(ayah.tafsirUz || ayah.footnoteUz || '').includes(qNorm) ||
          normalizeSearchQuery(ayah.textAr).includes(qNorm);
        if (match) {
          results.push({
            id: `ayah-${surahNum}-${ayah.numberInSurah}`,
            category: 'quran',
            categoryLabelUz: 'Qurʼoni Karim (Oyat)',
            title: `${suraMeta?.nameUz || 'Sura'} (${surahNum}:${ayah.numberInSurah}-oyat)`,
            subtitle: `Juz ${ayah.juzNumber || ayah.juz || 1} · Sahifa ${ayah.pageNumber || ayah.page || suraMeta?.pageNumber || 1}`,
            snippet: ayah.translationUz,
            sourceOrAuthor: 'Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf)',
            routeTab: 'quran',
            routeId: String(surahNum),
            score: refCode === query.trim() ? 98 : 84,
            arabicText: ayah.textAr,
          });
        }
      });
    });
  }

  // 2. Hadiths
  if (category === 'all' || category === 'hadith') {
    const storedHadiths = getStoredHadiths();
    const seenIds = new Set<string>();
    const allHadiths = [...storedHadiths, ...AUTHENTIC_HADITHS].filter((h: any) => {
      if (!h || h.isArchived || seenIds.has(h.id)) return false;
      seenIds.add(h.id);
      return true;
    });

    allHadiths.forEach((h: any) => {
      const match =
        normalizeSearchQuery(h.translationUz).includes(qNorm) ||
        normalizeSearchQuery(h.chapterUz || '').includes(qNorm) ||
        normalizeSearchQuery(h.narratorUz || '').includes(qNorm) ||
        normalizeSearchQuery(h.explanationUz || '').includes(qNorm) ||
        normalizeSearchQuery(h.textAr || '').includes(qNorm);
      if (match) {
        results.push({
          id: `hadith-${h.id}`,
          category: 'hadith',
          categoryLabelUz: 'Hadisi Sharif',
          title: h.chapterUz || `${h.collectionNameUz || 'Hadis'} #${h.number}`,
          subtitle: `Roviy: ${h.narratorUz || 'Sahoba'} · ${h.grade || 'Sahih'}`,
          snippet: h.translationUz,
          sourceOrAuthor: h.collectionNameUz || h.reference || 'Moʻtabar Hadis Toʻplami',
          routeTab: 'hadith',
          routeId: h.id,
          score: 80,
          arabicText: h.textAr,
        });
      }
    });
  }

  // 3. Dhikrs and Duas
  if (category === 'all' || category === 'dhikr') {
    const storedDhikrs = getStoredDhikrs();
    const seenIds = new Set<string>();
    const allDhikrs = [...storedDhikrs, ...AUTHENTIC_DHIKRS].filter((d: any) => {
      if (!d || d.isArchived || seenIds.has(d.id)) return false;
      seenIds.add(d.id);
      return true;
    });

    allDhikrs.forEach((d: any) => {
      const match =
        normalizeSearchQuery(d.titleUz || '').includes(qNorm) ||
        normalizeSearchQuery(d.translationUz || '').includes(qNorm) ||
        normalizeSearchQuery(d.virtueUz || '').includes(qNorm) ||
        normalizeSearchQuery(d.textAr || '').includes(qNorm);
      if (match) {
        results.push({
          id: `dhikr-${d.id}`,
          category: 'dhikr',
          categoryLabelUz: 'Zikr va Duo',
          title: d.titleUz,
          subtitle: `Maqsad: ${d.targetCount || 33} marta · ${d.categoryTitleUz || 'Kundalik zikr'}`,
          snippet: d.translationUz || d.virtueUz || '',
          sourceOrAuthor: d.source || 'Sunnat va Sahih Duolar',
          routeTab: 'dhikr',
          routeId: d.id,
          score: 76,
          arabicText: d.textAr,
        });
      }
    });
  }

  // 4. Articles
  if (category === 'all' || category === 'articles') {
    const storedArticles = getStoredArticles();
    const seenIds = new Set<string>();
    const allArticles = [...storedArticles, ...EDITORIAL_ARTICLES].filter((a: any) => {
      if (!a || a.isArchived || seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });

    allArticles.forEach((a: any) => {
      const match =
        normalizeSearchQuery(a.title || '').includes(qNorm) ||
        normalizeSearchQuery(a.excerpt || '').includes(qNorm) ||
        normalizeSearchQuery(a.author || '').includes(qNorm) ||
        normalizeSearchQuery(a.category || '').includes(qNorm);
      if (match) {
        results.push({
          id: `article-${a.id}`,
          category: 'articles',
          categoryLabelUz: 'Ilmiy Maqola',
          title: a.title,
          subtitle: `${a.category} · ${a.author || 'Tahririyat'} · ${a.readTimeMinutes || 5} daqiqa`,
          snippet: a.excerpt || '',
          sourceOrAuthor: a.author || 'Asaka Ziyo Tahririyati',
          routeTab: 'articles',
          routeId: a.id,
          score: 85,
          date: a.publishedDate,
        });
      }
    });
  }

  // 5. News
  if (category === 'all' || category === 'news') {
    const storedNews = getStoredNews();
    const seenIds = new Set<string>();
    const allNews = [...storedNews, ...COMMUNITY_NEWS].filter((n: any) => {
      if (!n || n.isArchived || seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });

    allNews.forEach((n: any) => {
      const match =
        normalizeSearchQuery(n.title || '').includes(qNorm) ||
        normalizeSearchQuery(n.summary || '').includes(qNorm);
      if (match) {
        results.push({
          id: `news-${n.id}`,
          category: 'news',
          categoryLabelUz: 'Yangilik',
          title: n.title,
          subtitle: `${n.category || 'Xabar'} · ${n.publishedDate}`,
          snippet: n.summary || '',
          sourceOrAuthor: n.source || 'Asaka Jome Masjidi',
          routeTab: 'news',
          routeId: n.id,
          score: 68,
          date: n.publishedDate,
        });
      }
    });
  }

  // 6. Announcements
  if (category === 'all' || category === 'announcements') {
    const storedAnnouncements = getStoredAnnouncements();
    const seenIds = new Set<string>();
    const allAnnouncements = [...storedAnnouncements, ...COMMUNITY_ANNOUNCEMENTS].filter((an: any) => {
      if (!an || an.isArchived || seenIds.has(an.id)) return false;
      seenIds.add(an.id);
      return true;
    });

    allAnnouncements.forEach((an: any) => {
      const match =
        normalizeSearchQuery(an.title || '').includes(qNorm) ||
        normalizeSearchQuery(an.description || '').includes(qNorm) ||
        normalizeSearchQuery(an.location || '').includes(qNorm);
      if (match) {
        results.push({
          id: `announcement-${an.id}`,
          category: 'announcements',
          categoryLabelUz: 'Jamoat Eʼloni',
          title: an.title,
          subtitle: `${an.typeLabelUz || 'Eʼlon'} · ${an.date} · ${an.location}`,
          snippet: an.description || '',
          sourceOrAuthor: an.organizer || 'Masjid Maʼmuriyati',
          routeTab: 'announcements',
          routeId: an.id,
          score: 72,
          date: an.date,
        });
      }
    });
  }

  // 7. Islamic Digital Books Library
  if (category === 'all' || category === 'books') {
    const books = getStoredDigitalBooks().filter((b: any) => !b.isArchived && b.isPublished !== false);
    books.forEach((b: any) => {
      const bookTitle = b.title || b.titleUz || '';
      const bookAuthor = b.author || b.authorUz || '';
      const bookDesc = b.description || b.descriptionUz || '';
      const bookCat = b.categoryTitleUz || b.category || '';
      const match =
        normalizeSearchQuery(bookTitle).includes(qNorm) ||
        normalizeSearchQuery(bookAuthor).includes(qNorm) ||
        normalizeSearchQuery(bookDesc).includes(qNorm) ||
        normalizeSearchQuery(bookCat).includes(qNorm);
      if (match) {
        results.push({
          id: `book-${b.id}`,
          category: 'books',
          categoryLabelUz: 'Islomiy Kitob',
          title: bookTitle,
          subtitle: `${bookAuthor} · ${b.pagesCount || 120} bet`,
          snippet: bookDesc,
          sourceOrAuthor: b.publisher || b.publisherUz || bookAuthor,
          routeTab: 'library',
          routeId: b.id,
          score: 79,
        });
      }
    });
  }

  // 8. Islamic Learning Academy Lessons
  if (category === 'all' || category === 'academy') {
    const lessons = getStoredAcademyLessons().filter((l: any) => !l.isArchived);
    lessons.forEach((l: any) => {
      const lessonTitle = l.title || l.titleUz || '';
      const lessonDesc = l.description || l.summaryUz || l.contentMarkdown || '';
      const lessonInstructor = l.instructor || l.instructorUz || 'Asaka Ziyo';
      const lessonTrack = l.trackTitleUz || l.trackId || l.track || '';
      const match =
        normalizeSearchQuery(lessonTitle).includes(qNorm) ||
        normalizeSearchQuery(lessonDesc).includes(qNorm) ||
        normalizeSearchQuery(lessonInstructor).includes(qNorm) ||
        normalizeSearchQuery(lessonTrack).includes(qNorm);
      if (match) {
        results.push({
          id: `academy-${l.id}`,
          category: 'academy',
          categoryLabelUz: 'Ilm Akademiyasi Darsi',
          title: lessonTitle,
          subtitle: `Yoʻnalish: ${lessonTrack} · Ustoz: ${lessonInstructor}`,
          snippet: l.description || l.summaryUz || '',
          sourceOrAuthor: l.verifiedSource || l.sourceReferenceUz || lessonInstructor,
          routeTab: 'academy',
          routeId: l.id,
          score: 77,
          arabicText: l.arabicText,
        });
      }
    });
  }

  // 9. Quiz Archive
  if (category === 'all' || category === 'quiz') {
    const allQuiz = getAllQuizQuestions().filter((q: any) => !q.isArchived);
    allQuiz.forEach((q: any) => {
      const match =
        normalizeSearchQuery(q.questionUz || '').includes(qNorm) ||
        normalizeSearchQuery(q.explanationUz || '').includes(qNorm) ||
        normalizeSearchQuery(q.source || '').includes(qNorm);
      if (match) {
        results.push({
          id: `quiz-${q.id}`,
          category: 'quiz',
          categoryLabelUz: 'Viktorina Savoli',
          title: q.questionUz,
          subtitle: `Qiyinlik: ${q.difficulty || 'Oʻrta'} · ${q.category || 'Ilm'}`,
          snippet: q.explanationUz || '',
          sourceOrAuthor: q.source || 'Islomiy Manbalar',
          routeTab: 'quiz',
          routeId: q.id,
          score: 64,
        });
      }
    });
  }

  // 10. Mosque Events & Islamic Calendar
  if (category === 'all' || category === 'events') {
    const events = getStoredMosqueEvents().filter(
      (ev: any) => !ev.isArchived && ev.status !== 'cancelled' && ev.isPublished !== false
    );
    events.forEach((ev: any) => {
      const evTitle = ev.title || ev.titleUz || '';
      const evDesc = ev.description || ev.descriptionUz || '';
      const evTime = ev.time || ev.startTime || '12:00';
      const match =
        normalizeSearchQuery(evTitle).includes(qNorm) ||
        normalizeSearchQuery(evDesc).includes(qNorm) ||
        normalizeSearchQuery(ev.instructor || '').includes(qNorm) ||
        normalizeSearchQuery(ev.location || '').includes(qNorm);
      if (match) {
        results.push({
          id: `event-${ev.id}`,
          category: 'events',
          categoryLabelUz: 'Masjid Tadbiri',
          title: evTitle,
          subtitle: `${ev.date} (${evTime}) · ${ev.location}`,
          snippet: evDesc,
          sourceOrAuthor: ev.instructor || 'Asaka Jome Masjidi',
          routeTab: 'mosque_events',
          routeId: ev.id,
          score: 74,
          date: ev.date,
        });
      }
    });
  }

  // 11. Media Posts & Verified Adhan Audio Recordings
  if (category === 'all' || category === 'media') {
    const allMedia = getStoredMediaPosts().filter((m: any) => !m.isArchived && m.isPublished !== false);
    allMedia.forEach((m: any) => {
      const match =
        normalizeSearchQuery(m.title || '').includes(qNorm) ||
        normalizeSearchQuery(m.caption || '').includes(qNorm) ||
        normalizeSearchQuery(m.author || '').includes(qNorm);
      if (match) {
        results.push({
          id: `media-${m.id}`,
          category: 'media',
          categoryLabelUz: 'Media va Video',
          title: m.title,
          subtitle: `${m.type?.toUpperCase() || 'VIDEO'} · ${m.author || 'Asaka Ziyo'}`,
          snippet: m.caption || '',
          sourceOrAuthor: m.author || 'Asaka Jome Masjidi',
          routeTab: 'messages',
          routeId: m.id,
          score: 70,
        });
      }
    });

    ADHAN_TRACKS.forEach((track) => {
      const match =
        normalizeSearchQuery(track.titleUz).includes(qNorm) ||
        normalizeSearchQuery(track.muezzinUz).includes(qNorm) ||
        normalizeSearchQuery(track.styleUz).includes(qNorm) ||
        normalizeSearchQuery('azon adhan mishary alafasy').includes(qNorm);
      if (match) {
        results.push({
          id: `adhan-${track.id}`,
          category: 'media',
          categoryLabelUz: 'Azon Audio Yozuvi',
          title: track.titleUz,
          subtitle: `${track.muezzinUz} · Davomiyligi: ${track.durationLabel}`,
          snippet: track.styleUz,
          sourceOrAuthor: track.attribution,
          routeTab: 'reminder_dashboard',
          routeId: track.id,
          score: 75,
          arabicText: track.titleAr,
        });
      }
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
