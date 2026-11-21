/**
 * ASAKA ZIYO — Smart Islamic Center & Knowledge Library Service (Read-Only Core + User Engagement)
 *
 * Covers:
 * - Quran: All 114 surahs paginated search/browser, Ayah reader across 5 locales,
 *   Tafsiri Hilol commentary, Audio recitation URLs, Bookmarks, Resume Reading, Personal Khatm Plan
 * - Hadith: Authentic Bukhari/Muslim/Nawawi browser, collection filter, search, bookmarks
 * - Dhikr & Dua Center: Categories, situational Duas, Tasbeh counter with custom goals, daily/all-time logs
 * - Islamic Terms Glossary (5 locales)
 * - Media Library: Verified Articles, News, Juma Announcements, Adhan Tracks, Mosque Guide
 * - Global Search across all ASAKA ZIYO datasets
 */

import {
  SURAHS_LIST,
  VERIFIED_AYAHS,
  QURAN_RECITERS,
  getReciterSurahAudioUrl,
} from '../../src/data/quranData';
const DEFAULT_RECITER_ID = 'mishary';
const getSurahAudioUrl = (surahNumber: number, reciterId = DEFAULT_RECITER_ID) =>
  getReciterSurahAudioUrl(reciterId, surahNumber);
import { AUTHENTIC_DAILY_BUNDLES } from '../../src/data/dailyContentData';
import { AUTHENTIC_HADITHS } from '../../src/data/hadithData';
import { AUTHENTIC_DHIKRS } from '../../src/data/dhikrData';
import { TAFSIRI_HILOL_ENTRIES } from '../../src/data/tafsirHilolData';
import { EDITORIAL_ARTICLES } from '../../src/data/articlesData';
import { COMMUNITY_ANNOUNCEMENTS, COMMUNITY_NEWS } from '../../src/data/newsAndAnnouncementsData';
import { ADHAN_TRACKS } from '../../src/data/adhanTracksData';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import {
  TelegramLocale,
  TelegramNotificationHistoryEntry,
  TelegramUserBookmark,
} from '../types';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';
import { TelegramRepository } from '../database/telegramRepository';
import { getTelegramLocaleBundle } from '../locales';
import { CentralContentProvider } from './centralContentProvider';

const FEATURED_SURAH_NUMBERS = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114];

export interface IslamicGlossaryEntry {
  key: string;
  term: Record<TelegramLocale, string>;
  definition: Record<TelegramLocale, string>;
}

export const ISLAMIC_GLOSSARY: IslamicGlossaryEntry[] = [
  {
    key: 'tavhid',
    term: {
      'uz-Latn': 'Tavhid',
      'uz-Cyrl': 'Тавҳид',
      'uz-Latn-new': 'Tavhid',
      ru: 'Таухид',
      en: 'Tawhid',
    },
    definition: {
      'uz-Latn': 'Alloh taoloning yakkayu yagonaligiga, sherigi yoʻqligiga qatʼiy iymon keltirish — Islom aqidasining asosi.',
      'uz-Cyrl': 'Аллоҳ таолонинг яккаю ягоналигига, шериги йўқлигига қатъий иймон келтириш — Ислом ақидасининг асоси.',
      'uz-Latn-new': 'Alloh taoloning yakkayu yagonaligiga, şerigi yöqligiga qatʼiy iymon keltiriş — Islom aqidasining asosi.',
      ru: 'Единобожие — твёрдая вера в Единственность Всевышнего Аллаха, основа исламского вероучения.',
      en: 'Islamic monotheism — affirming the absolute Oneness and uniqueness of Allah, the foundation of Islam.',
    },
  },
  {
    key: 'ihson',
    term: {
      'uz-Latn': 'Ihson',
      'uz-Cyrl': 'Иҳсон',
      'uz-Latn-new': 'Ihson',
      ru: 'Ихсан',
      en: 'Ihsan',
    },
    definition: {
      'uz-Latn': 'Allohni koʻrib turgandek ibodat qilish; agar sen Uni koʻrmasang ham, U seni koʻrib turganini his etish.',
      'uz-Cyrl': 'Аллоҳни кўриб тургандек ибодат қилиш; агар сен Уни кўрмасанг ҳам, У сени кўриб турганини ҳис этиш.',
      'uz-Latn-new': 'Allohni körib turgandek ibodat qiliş; agar sen Uni körmasang ham, U seni körib turganini his etiş.',
      ru: 'Искреннее совершенство в поклонении Аллаху, будто ты видишь Его, зная, что Он видит тебя.',
      en: 'Spiritual excellence: worshipping Allah as though you see Him, knowing that He always sees you.',
    },
  },
  {
    key: 'taqvo',
    term: {
      'uz-Latn': 'Taqvo',
      'uz-Cyrl': 'Тақво',
      'uz-Latn-new': 'Taqvo',
      ru: 'Таква (Богобоязненность)',
      en: 'Taqwa',
    },
    definition: {
      'uz-Latn': 'Allohning buyruqlarini bajarish va qaytargan narsalaridan saqlanish orqali qalbni gunohdan himoya qilish.',
      'uz-Cyrl': 'Аллоҳнинг буйруқларини бажариш ва қайтарган нарсаларидан сақланиш орқали қалбни гуноҳдан ҳимоя қилиш.',
      'uz-Latn-new': 'Allohning buyruqlarini bajariş va qaytargan narsalaridan saqlaniş orqali qalbni gunohdan himoya qiliş.',
      ru: 'Богобоязненность — оберегание души от грехов через соблюдение велений Аллаха.',
      en: 'God-consciousness and piety: protecting oneself from displeasure of Allah through obedience.',
    },
  },
  {
    key: 'iqomat',
    term: {
      'uz-Latn': 'Iqomat',
      'uz-Cyrl': 'Иқомат',
      'uz-Latn-new': 'Iqomat',
      ru: 'Икамат',
      en: 'Iqamah',
    },
    definition: {
      'uz-Latn': 'Jamoat namozi bevosita boshlanishi oldidan aytiladigan takbir va chaqiriq.',
      'uz-Cyrl': 'Жамоат намози бевосита бошланиши олдидан айтиладиган такбир ва чақириқ.',
      'uz-Latn-new': 'Jamoat namozi bevosita boşlanişi oldidan aytiladigan takbir va çaqiriq.',
      ru: 'Второй призыв непосредственно перед началом коллективной молитвы.',
      en: 'The second call to prayer announcing the immediate start of the congregational prayer.',
    },
  },
  {
    key: 'xatm',
    term: {
      'uz-Latn': 'Xatmi Qurʼon',
      'uz-Cyrl': 'Хатми Қуръон',
      'uz-Latn-new': 'Xatmi Qurʼon',
      ru: 'Хатм Корана',
      en: 'Khatm al-Quran',
    },
    definition: {
      'uz-Latn': 'Qurʼoni Karimning barcha 114 surasi va 30 juzini boshidan oxirigacha toʻliq oʻqib tugatish.',
      'uz-Cyrl': 'Қуръони Каримнинг барча 114 сураси ва 30 жузини бошидан охиригача тўлиқ ўқиб тугатиш.',
      'uz-Latn-new': 'Qurʼoni Karimning barça 114 surasi va 30 juzini boşidan oxirigacha töliq öqib tugatiş.',
      ru: 'Полное прочтение всего Священного Корана (всех 30 джузов и 114 сур).',
      en: 'Complete recitation of the entire Holy Quran from Surah Al-Fatihah to An-Nas.',
    },
  },
  {
    key: 'sunnat',
    term: {
      'uz-Latn': 'Sunnat',
      'uz-Cyrl': 'Суннат',
      'uz-Latn-new': 'Sunnat',
      ru: 'Сунна',
      en: 'Sunnah',
    },
    definition: {
      'uz-Latn': 'Paygʻambarimiz Muhammad sollallohu alayhi vasallamning soʻzlari, amallari va tasdiqlagan yoʻllari.',
      'uz-Cyrl': 'Пайғамбаримиз Муҳаммад соллаллоҳу алайҳи васалламнинг сўзлари, амаллари ва тасдиқлаган йўллари.',
      'uz-Latn-new': 'Payğambarimiz Muhammad sollallohu alayhi vasallamning sözlari, amallari va tasdiqlagan yöllari.',
      ru: 'Высказывания, дела и одобренный жизненный путь Пророка Мухаммада ﷺ.',
      en: 'The prophetic tradition, sayings, actions, and tacit approvals of Prophet Muhammad (PBUH).',
    },
  },
];

export interface SituationDuaEntry {
  id: string;
  situation: Record<TelegramLocale, string>;
  textAr: string;
  translit: string;
  translation: Record<TelegramLocale, string>;
  source: string;
}

export const SITUATIONAL_DUAS: SituationDuaEntry[] = [
  {
    id: 'dua-ilm',
    situation: {
      'uz-Latn': 'Ilm va hikmat soʻrash duosi',
      'uz-Cyrl': 'Илм ва ҳикмат сўраш дуоси',
      'uz-Latn-new': 'Ilm va hikmat sörash duosi',
      ru: 'Дуа о даровании полезного знания',
      en: 'Dua for Beneficial Knowledge',
    },
    textAr: 'رَبِّ زِدْنِي عِلْمًا',
    translit: 'Robbi zidniy ʻilman',
    translation: {
      'uz-Latn': '«Robbim, ilmimni ziyoda qilgin!»',
      'uz-Cyrl': '«Роббим, илмимни зиёда қилгин!»',
      'uz-Latn-new': '«Robbim, ilmimni ziyoda qilgin!»',
      ru: '«Господи, приумножь мои знания!»',
      en: '“My Lord, increase me in knowledge!”',
    },
    source: 'Toha surasi, 114-oyat',
  },
  {
    id: 'dua-parents',
    situation: {
      'uz-Latn': 'Ota-ona haqiga duo',
      'uz-Cyrl': 'Ота-она ҳақига дуо',
      'uz-Latn-new': 'Ota-ona haqiga duo',
      ru: 'Дуа за родителей',
      en: 'Dua for Parents',
    },
    textAr: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    translit: 'Robbirhamhuma kama robbayaniy sogʻiyro',
    translation: {
      'uz-Latn': '«Robbim, ular meni goʻdakligimda tarbiya qilganlaridek, Ularga rahm qilgin!»',
      'uz-Cyrl': '«Роббим, улар мени гўдаклигимда тарбия қилганларидек, Уларга раҳм қилгин!»',
      'uz-Latn-new': '«Robbim, ular meni gödakligimda tarbiya qilganlaridek, Ularga rahm qilgin!»',
      ru: '«Господи! Помилуй их, ведь они растили меня ребенком!»',
      en: '“My Lord, have mercy upon them as they brought me up when I was small!”',
    },
    source: 'Isro surasi, 24-oyat',
  },
  {
    id: 'dua-travel',
    situation: {
      'uz-Latn': 'Safarga chiqish va omonlik duosi',
      'uz-Cyrl': 'Сафарга чиқиш ва омонлик дуоси',
      'uz-Latn-new': 'Safarga çiqiş va omonlik duosi',
      ru: 'Дуа перед выходом в путь',
      en: 'Dua When Beginning Travel',
    },
    textAr: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ',
    translit: 'Subhanallaziy saxxoro lana haza va ma kunna lahu muqriniyn',
    translation: {
      'uz-Latn': '«Bizga bu ulovni boʻysundirib qoʻygan Zot pokdir, biz oʻzimiz bunga qodir emas edik».',
      'uz-Cyrl': '«Бизга бу уловни бўйсундириб қўйган Зот покдир, биз ўзимиз бунга қодир эмас эдик».',
      'uz-Latn-new': '«Bizga bu ulovni böysundirib qöygan Zot pokdir, biz özimiz bunga qodir emas edik».',
      ru: '«Пречист Тот, Кто подчинил нам это, ведь сами мы не смогли бы сделать этого».',
      en: '“Glory to Him who has subjected this to us, and we could never have had it by our efforts.”',
    },
    source: 'Zuxruf surasi, 13-oyat; Sahih Muslim',
  },
  {
    id: 'dua-anxiety',
    situation: {
      'uz-Latn': 'Gʻam-tashvish va qiyinchilikda oʻqiladigan duo',
      'uz-Cyrl': 'Ғам-ташвиш ва қийинчиликда ўқиладиган дуо',
      'uz-Latn-new': 'Ğam-taşviş va qiyinçilikda öqiladigan duo',
      ru: 'Дуа при тревоге и трудностях',
      en: 'Dua for Relief from Anxiety',
    },
    textAr: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    translit: 'Hasbunallohu va niʼmal vakiyl',
    translation: {
      'uz-Latn': '«Bizga Allohning Oʻzi kifoya va U naqadar goʻzal Vakildir!»',
      'uz-Cyrl': '«Бизга Аллоҳнинг Ўзи кифоя ва У нақадар гўзал Вакилдир!»',
      'uz-Latn-new': '«Bizga Allohning Özi kifoya va U naqadar gözal Vakildir!»',
      ru: '«Достаточно нам Аллаха, и какой же Он прекрасный Попечитель и Хранитель!»',
      en: '“Sufficient for us is Allah, and He is the best Disposer of affairs!”',
    },
    source: 'Oli Imron surasi, 173-oyat; Sahih al-Buxoriy',
  },
];

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

  public readonly centralContent: CentralContentProvider;

  constructor(centralContent?: CentralContentProvider) {
    this.centralContent = centralContent || new CentralContentProvider();
  }

  getCentralContentProvider(): CentralContentProvider {
    return this.centralContent;
  }

  getTotalSurahs(): number {
    return SURAHS_LIST.length;
  }

  getFeaturedSurahs() {
    return FEATURED_SURAH_NUMBERS.map((num) => SURAHS_LIST.find((s) => s.number === num)).filter(
      (s): s is NonNullable<typeof s> => Boolean(s)
    );
  }

  getSurahPage(page = 0, pageSize = 10) {
    const totalPages = Math.max(1, Math.ceil(SURAHS_LIST.length / pageSize));
    const safePage = ((page % totalPages) + totalPages) % totalPages;
    const items = SURAHS_LIST.slice(safePage * pageSize, (safePage + 1) * pageSize);
    return { items, page: safePage, totalPages, total: SURAHS_LIST.length };
  }

  searchSurahs(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const numMatch = Number(q);
    return SURAHS_LIST.filter(
      (s) =>
        (!Number.isNaN(numMatch) && s.number === numMatch) ||
        s.nameUz.toLowerCase().includes(q) ||
        s.meaningUz.toLowerCase().includes(q)
    ).slice(0, 12);
  }

  searchHadiths(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.centralContent.getPublishedHadiths().filter((h) =>
      `${h.collectionNameUz || ''} ${h.chapterUz || ''} ${h.translationUz || ''} ${h.narratorUz || ''} ${(h.keywords || []).join(' ')}`
        .toLowerCase()
        .includes(q)
    );
  }

  getHadithsByCollection(collection: 'all' | 'bukhari' | 'muslim' | 'nawawi') {
    const all = this.centralContent.getPublishedHadiths();
    if (collection === 'all') return all;
    return all.filter((h) => h.collection === collection);
  }

  formatQuranDailyAyah(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): {
    formatted: FormattedEmojiMessage;
    index: number;
    total: number;
    surahNumber: number;
    ayahId: string;
    audioUrl?: string;
    title: string;
  } {
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
    const title = `${surahName} (${ayah.surahNumber}:${ayah.numberInSurah})`;

    const lines: string[] = [
      dict.quranTitle,
      `{{emoji:brand.book}} ${title} — ${safeIdx + 1}/${total}`,
      '',
      ayah.textAr,
      '',
      localizedTranslation,
    ];

    if (localizedTafsir) {
      lines.push('', `{{emoji:brand.star}} ${localizedTafsir}`);
    }
    if (ayah.audioUrl) {
      lines.push(`{{emoji:quran_mp3}} Audio (Al-Afasy): ${ayah.audioUrl}`);
    }

    lines.push('', dict.quranFooterNote);

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      surahNumber: ayah.surahNumber,
      ayahId: `${ayah.surahNumber}:${ayah.numberInSurah}`,
      audioUrl: ayah.audioUrl,
      title,
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
    const tafsir = TAFSIRI_HILOL_ENTRIES.find((t) => t.surahNumber === surah.number);
    const padded = String(surah.number).padStart(3, '0');
    const audioSampleUrl = `https://everyayah.com/data/Alafasy_128kbps/${padded}001.mp3`;

    const lines = [
      `${dict.quranSurahHeader}: ${surah.number}. ${name} (${surah.nameAr})`,
      '',
      `• ${dict.quranMeaningLabel}: ${meaning}`,
      `• ${dict.quranAyahCountLabel}: ${surah.numberOfAyahs}`,
      `• ${dict.quranRevelationLabel}: ${surah.revelationType}`,
      `• ${dict.quranPageLabel}: ${surah.pageNumber}`,
      `{{emoji:quran_mp3}} 1-oyat qiroati (Al-Afasy): ${audioSampleUrl}`,
    ];

    if (tafsir) {
      lines.push(
        '',
        `{{emoji:quran}} Tafsiri Hilol: ${localizeUzbekString(tafsir.tafsirOverview, locale).slice(0, 420)}`
      );
      if (tafsir.audioLessonUrl) {
        lines.push(`{{emoji:quran_mp3}} Audio Tafsir (${tafsir.audioDuration || ''}): ${tafsir.audioLessonUrl}`);
      }
    }

    lines.push('', dict.quranFooterNote);
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  getDayIndexedVerseIndex(now: Date = new Date()): number {
    const total = Math.max(1, AUTHENTIC_DAILY_BUNDLES.length);
    return Math.floor(now.getTime() / 86_400_000) % total;
  }

  getReciterAudioUrl(surahNumber: number, reciterId?: string): {
    url: string;
    reciterName: string;
    surahName: string;
  } {
    const surah = SURAHS_LIST.find((s) => s.number === surahNumber) || SURAHS_LIST[0];
    const reciter =
      QURAN_RECITERS.find((r) => r.id === reciterId) ||
      QURAN_RECITERS.find((r) => r.id === DEFAULT_RECITER_ID) ||
      QURAN_RECITERS[0];
    return {
      url: getSurahAudioUrl(surah.number, reciter.id),
      reciterName: reciter.name,
      surahName: `${surah.number}. ${surah.nameUz}`,
    };
  }

  async formatSurahAyahReader(params: {
    repo: TelegramRepository;
    telegramId: string;
    surahNumber: number;
    ayahNumber: number;
    locale: TelegramLocale;
    emojiRegistry: CustomEmojiRegistry;
  }): Promise<{
    formatted: FormattedEmojiMessage;
    surahNumber: number;
    ayahNumber: number;
    totalAyahs: number;
    surahName: string;
  }> {
    const surah = SURAHS_LIST.find((s) => s.number === params.surahNumber) || SURAHS_LIST[0];
    const safeAyah = Math.max(1, Math.min(surah.numberOfAyahs, Math.round(params.ayahNumber) || 1));
    const dict = getTelegramLocaleBundle(params.locale);
    const surahName = localizeUzbekString(surah.nameUz, params.locale);

    const eng = params.repo.getUserEngagement(params.telegramId);
    eng.resumeQuran = {
      surahNumber: surah.number,
      ayahNumber: safeAyah,
      surahNameUz: surah.nameUz,
      updatedAt: new Date().toISOString(),
    };
    await params.repo.saveUserEngagement(eng);

    const verifiedList = VERIFIED_AYAHS[surah.number] || [];
    const verifiedAyah = verifiedList.find((a) => a.numberInSurah === safeAyah);
    const tafsirEntry = TAFSIRI_HILOL_ENTRIES.find((t) => t.surahNumber === surah.number);
    const sampleTafsir = tafsirEntry?.sampleAyahTafsir.find((s) => s.ayahNumber === safeAyah);
    const reciterInfo = this.getReciterAudioUrl(surah.number, eng.preferredReciterId);

    const lines: string[] = [
      `{{emoji:nav.quran}} ${surah.number}. ${surahName} (${surah.nameAr}) — ${safeAyah}/${surah.numberOfAyahs}`,
      `{{emoji:quran_mp3}} ${reciterInfo.reciterName}`,
      '',
    ];

    if (verifiedAyah) {
      // Preserve Arabic script verbatim; never transliterate Arabic
      lines.push(verifiedAyah.textAr, '');
      const translation =
        verifiedAyah.translations?.[params.locale]?.text ||
        localizeUzbekString(verifiedAyah.translationUz, params.locale);
      lines.push(translation);
      if (verifiedAyah.tafsirSummaryUz) {
        lines.push('', `{{emoji:quran}} ${localizeUzbekString(verifiedAyah.tafsirSummaryUz, params.locale)}`);
      }
    } else if (sampleTafsir) {
      lines.push(sampleTafsir.textAr, '');
      lines.push(localizeUzbekString(sampleTafsir.translationUz, params.locale));
      if (sampleTafsir.tafsirHilolBody[0]) {
        lines.push('', `{{emoji:quran}} ${localizeUzbekString(sampleTafsir.tafsirHilolBody[0], params.locale).slice(0, 420)}`);
      }
    } else {
      lines.push(
        `{{emoji:quran}} ${surah.number}:${safeAyah} — ${localizeUzbekString(surah.meaningUz, params.locale)}`,
        `• ${dict.quranPageLabel}: ${surah.pageNumber}`,
        dict.quranFooterNote
      );
    }

    return {
      formatted: params.emojiRegistry.formatMessage(lines.join('\n')),
      surahNumber: surah.number,
      ayahNumber: safeAyah,
      totalAyahs: surah.numberOfAyahs,
      surahName,
    };
  }

  formatNotificationHistory(
    history: TelegramNotificationHistoryEntry[],
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    if (!history || history.length === 0) {
      return emojiRegistry.formatMessage(
        `${dict.profileNotifHistoryTitle}\n\n${dict.profileNotifHistoryEmpty}`
      );
    }
    const lines = [
      dict.profileNotifHistoryTitle,
      '',
      ...history.slice(0, 15).map((item, idx) => {
        const dt = item.sentAt ? item.sentAt.slice(0, 16).replace('T', ' ') : '';
        return `${idx + 1}. [${item.category || item.kind}] ${item.title} (${dt})`;
      }),
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  formatTafsirCard(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number; surahNumber: number } {
    const total = TAFSIRI_HILOL_ENTRIES.length;
    const safeIdx = ((index % total) + total) % total;
    const entry = TAFSIRI_HILOL_ENTRIES[safeIdx];
    const dict = getTelegramLocaleBundle(locale);
    const sample = entry.sampleAyahTafsir[0];

    const lines = [
      `${dict.tafsirTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:brand.book}} ${entry.surahNumber}. ${localizeUzbekString(entry.surahNameUz, locale)} (${entry.nameAr})`,
      '',
      localizeUzbekString(entry.tafsirOverview, locale),
      '',
      `• Fazilat: ${localizeUzbekString(entry.virtuesUz, locale)}`,
    ];

    if (sample) {
      lines.push(
        '',
        `[${entry.surahNumber}:${sample.ayahNumber}] ${sample.textAr}`,
        localizeUzbekString(sample.translationUz, locale),
        localizeUzbekString(sample.tafsirHilolBody[0] || '', locale).slice(0, 350)
      );
    }

    lines.push('', `{{emoji:quran}} ${localizeUzbekString(entry.sourceNote, locale)}`);

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      surahNumber: entry.surahNumber,
    };
  }

  formatHadithCard(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number; hadithId: string; title: string } {
    const hadiths = this.centralContent.getPublishedHadiths();
    const total = Math.max(1, hadiths.length);
    const safeIdx = ((index % total) + total) % total;
    const hadith = hadiths[safeIdx] || AUTHENTIC_HADITHS[0];
    const dict = getTelegramLocaleBundle(locale);

    const collection = localizeUzbekString(hadith.collectionNameUz || 'Hadis', locale);
    const chapter = localizeUzbekString(hadith.chapterUz || '', locale);
    const narrator = localizeUzbekString(hadith.narratorUz || '', locale);
    const translation = localizeUzbekString(hadith.translationUz || '', locale);
    const reference = localizeUzbekString(hadith.reference || '', locale);

    const lines = [
      `${dict.hadithTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:nav.hadith}} ${collection}${chapter ? ` — ${chapter}` : ''}`,
      '',
      hadith.textAr,
      '',
      translation,
      '',
      ...(narrator ? [`• ${dict.hadithNarratorLabel}: ${narrator}`] : []),
      ...(reference ? [`• ${dict.hadithSourceLabel}: ${reference}${hadith.grade ? ` (${hadith.grade})` : ''}`] : []),
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      hadithId: hadith.id,
      title: `${collection} #${hadith.number || safeIdx + 1}`,
    };
  }

  formatDhikrCard(
    index: number,
    tasbehCount: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry,
    personalGoal?: number,
    todayTotal?: number
  ): {
    formatted: FormattedEmojiMessage;
    index: number;
    total: number;
    targetCount: number;
    dhikrId: string;
  } {
    const dhikrs = this.centralContent.getPublishedDhikrs();
    const total = Math.max(1, dhikrs.length);
    const safeIdx = ((index % total) + total) % total;
    const dhikr = dhikrs[safeIdx] || AUTHENTIC_DHIKRS[0];
    const dict = getTelegramLocaleBundle(locale);

    const category = localizeUzbekString(dhikr.categoryTitleUz || 'Zikr', locale);
    const title = localizeUzbekString(dhikr.titleUz || '', locale);
    const translit = localizeUzbekString(dhikr.transliterationUz, locale);
    const translation = localizeUzbekString(dhikr.translationUz, locale);
    const virtue = localizeUzbekString(dhikr.virtueUz, locale);
    const source = localizeUzbekString(dhikr.source, locale);

    const goal = personalGoal || dhikr.targetCount;
    const safeCount = Math.max(0, Math.min(99999, tasbehCount));
    const progressMark =
      safeCount >= goal ? '{{emoji:status.ok}}' : '{{emoji:content.tasbeh}}';

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
      `${progressMark} ${dict.dhikrTasbehCounterLabel}: ${safeCount} / ${goal}`,
      ...(todayTotal !== undefined ? [`• ${dict.tasbehTodayLabel}: ${todayTotal}`] : []),
      `• ${dict.dhikrVirtueLabel}: ${virtue}`,
      `• ${dict.hadithSourceLabel}: ${source}`,
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      targetCount: goal,
      dhikrId: dhikr.id,
    };
  }

  formatSituationalDuaCard(
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number } {
    const total = SITUATIONAL_DUAS.length;
    const safeIdx = ((index % total) + total) % total;
    const d = SITUATIONAL_DUAS[safeIdx];
    const dict = getTelegramLocaleBundle(locale);

    const lines = [
      `${dict.duaLibraryTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:content.dua}} ${d.situation[locale] || d.situation['uz-Latn']}`,
      '',
      d.textAr,
      '',
      localizeUzbekString(d.translit, locale),
      '',
      d.translation[locale] || d.translation['uz-Latn'],
      '',
      `• ${dict.hadithSourceLabel}: ${localizeUzbekString(d.source, locale)}`,
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
    };
  }

  formatGlossaryPage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const lines = [
      dict.glossaryTitle,
      '',
      ...ISLAMIC_GLOSSARY.map(
        (g, idx) =>
          `${idx + 1}. ${g.term[locale] || g.term['uz-Latn']} — ${g.definition[locale] || g.definition['uz-Latn']}`
      ),
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  formatMediaLibraryItem(
    kind: 'articles' | 'news' | 'announcements' | 'adhan' | 'audio' | 'video',
    index: number,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): {
    formatted: FormattedEmojiMessage;
    index: number;
    total: number;
    itemId?: string;
    itemTitle?: string;
    audioUrl?: string;
    videoUrl?: string;
  } {
    const dict = getTelegramLocaleBundle(locale);

    if (kind === 'articles') {
      const list = this.centralContent.getPublishedArticles();
      if (list.length === 0) {
        return {
          formatted: emojiRegistry.formatMessage(`${dict.mediaLibraryTitle} — ${dict.mediaArticlesLabel}\n\nHozircha maqolalar mavjud emas.`),
          index: 0,
          total: 0,
        };
      }
      const total = list.length;
      const safeIdx = ((index % total) + total) % total;
      const a = list[safeIdx];
      const tr = (a.translations as any)?.[locale];
      const title = tr?.title || localizeUzbekString(a.title || '', locale);
      const excerpt = tr?.excerpt || localizeUzbekString(a.excerpt || '', locale);
      const body = tr?.bodyParagraphs?.[0] || localizeUzbekString((a.bodyParagraphs || [])[0] || '', locale);
      const lines = [
        `${dict.mediaLibraryTitle} — ${dict.mediaArticlesLabel} (${safeIdx + 1}/${total})`,
        `{{emoji:brand.book}} ${title}`,
        `{{emoji:quran}} ${localizeUzbekString(a.author || 'ASAKA ZIYO', locale)} | ${localizeUzbekString(a.publishedDate || '', locale)}`,
        '',
        excerpt,
        ...(body ? ['', body] : []),
      ];
      return {
        formatted: emojiRegistry.formatMessage(lines.join('\n')),
        index: safeIdx,
        total,
        itemId: a.id,
        itemTitle: title,
      };
    }

    if (kind === 'news') {
      const list = this.centralContent.getPublishedNews();
      if (list.length === 0) {
        return {
          formatted: emojiRegistry.formatMessage(`${dict.mediaLibraryTitle} — ${dict.mediaNewsLabel}\n\nHozircha yangiliklar mavjud emas.`),
          index: 0,
          total: 0,
        };
      }
      const total = list.length;
      const safeIdx = ((index % total) + total) % total;
      const n = list[safeIdx];
      const tr = (n.translations as any)?.[locale];
      const title = tr?.title || localizeUzbekString(n.title || '', locale);
      const summary = tr?.summary || localizeUzbekString(n.summary || '', locale);
      const content = tr?.content || localizeUzbekString(n.content || '', locale);
      const lines = [
        `${dict.mediaLibraryTitle} — ${dict.mediaNewsLabel} (${safeIdx + 1}/${total})`,
        `{{emoji:channel.broadcast}} ${title}`,
        `{{emoji:calendar}} ${localizeUzbekString(n.publishedDate || '', locale)}`,
        '',
        summary,
        ...(content && content !== summary ? ['', content] : []),
      ];
      return {
        formatted: emojiRegistry.formatMessage(lines.join('\n')),
        index: safeIdx,
        total,
        itemId: n.id,
        itemTitle: title,
      };
    }

    if (kind === 'announcements') {
      const list = this.centralContent.getPublishedAnnouncements();
      if (list.length === 0) {
        return {
          formatted: emojiRegistry.formatMessage(`${dict.mediaLibraryTitle} — ${dict.mediaAnnouncementsLabel}\n\nHozircha eʼlonlar mavjud emas.`),
          index: 0,
          total: 0,
        };
      }
      const total = list.length;
      const safeIdx = ((index % total) + total) % total;
      const ann = list[safeIdx];
      const tr = (ann.translations as any)?.[locale];
      const title = tr?.title || localizeUzbekString(ann.title || '', locale);
      const desc = tr?.description || localizeUzbekString(ann.description || '', locale);
      const lines = [
        `${dict.mediaLibraryTitle} — ${dict.mediaAnnouncementsLabel} (${safeIdx + 1}/${total})`,
        `{{emoji:community}} ${title}`,
        `{{emoji:calendar}} ${localizeUzbekString(ann.date || '', locale)}${ann.time ? ` • {{emoji:notifications}} ${ann.time}` : ''}`,
        ...(ann.location ? [`{{emoji:prayer}} ${localizeUzbekString(ann.location, locale)}`] : []),
        '',
        desc,
      ];
      return {
        formatted: emojiRegistry.formatMessage(lines.join('\n')),
        index: safeIdx,
        total,
        itemId: ann.id,
        itemTitle: title,
      };
    }

    if (kind === 'video') {
      const videos = this.centralContent.getPublishedVideoItems();
      if (videos.length === 0) {
        return {
          formatted: emojiRegistry.formatMessage(
            `${dict.mediaLibraryTitle} — ${dict.mediaVideoLabel}\n\n{{emoji:play}} Hozircha nashr qilingan video materiallar yoʻq. Admin panelda yangi video qoʻshilishi bilan bu yerda avtomatik koʻrinadi.`
          ),
          index: 0,
          total: 0,
        };
      }
      const total = videos.length;
      const safeIdx = ((index % total) + total) % total;
      const v = videos[safeIdx];
      const title = localizeUzbekString(v.title, locale);
      const lines = [
        `${dict.mediaLibraryTitle} — ${dict.mediaVideoLabel} (${safeIdx + 1}/${total})`,
        `{{emoji:play}} ${title}`,
        `{{emoji:profile}} ${localizeUzbekString(v.author, locale)} | {{emoji:support}} ${localizeUzbekString(v.category, locale)}`,
        ...(v.caption ? ['', localizeUzbekString(v.caption, locale)] : []),
        '',
        `{{emoji:play}} Video: ${v.mediaUrl}`,
      ];
      return {
        formatted: emojiRegistry.formatMessage(lines.join('\n')),
        index: safeIdx,
        total,
        itemId: v.id,
        itemTitle: title,
        videoUrl: v.mediaUrl,
      };
    }

    // Audio Library & Adhan tracks unified from central content provider
    const audios = this.centralContent.getPublishedAudioItems();
    const total = Math.max(1, audios.length);
    const safeIdx = ((index % total) + total) % total;
    const track = audios[safeIdx];
    const title = localizeUzbekString(track?.title || 'Audio', locale);
    const lines = [
      `${dict.mediaLibraryTitle} — ${kind === 'adhan' ? dict.mediaAdhanLabel : dict.mediaAudioLabel} (${safeIdx + 1}/${total})`,
      `{{emoji:quran_mp3}} ${title}`,
      `{{emoji:profile}} ${localizeUzbekString(track?.author || 'ASAKA ZIYO', locale)}${track?.duration ? ` | {{emoji:notifications}} ${track.duration}` : ''}`,
      ...(track?.category ? [`{{emoji:support}} ${localizeUzbekString(track.category, locale)}`] : []),
      ...(track?.caption ? ['', localizeUzbekString(track.caption, locale)] : []),
      '',
      `{{emoji:play}} Audio: ${track?.mediaUrl || ''}`,
    ];
    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      itemId: track?.id,
      itemTitle: title,
      audioUrl: track?.mediaUrl,
    };
  }

  async recordArticleRead(repo: TelegramRepository, telegramId: string, articleId: string): Promise<void> {
    if (!articleId) return;
    const eng = repo.getUserEngagement(telegramId);
    const prev = Array.isArray(eng.readArticleIds) ? eng.readArticleIds : [];
    eng.readArticleIds = [articleId, ...prev.filter((x) => x !== articleId)].slice(0, 100);
    await repo.saveUserEngagement(eng);
  }

  async recordVideoWatched(repo: TelegramRepository, telegramId: string, videoId: string): Promise<void> {
    if (!videoId) return;
    const eng = repo.getUserEngagement(telegramId);
    const prev = Array.isArray(eng.watchedVideoIds) ? eng.watchedVideoIds : [];
    eng.watchedVideoIds = [videoId, ...prev.filter((x) => x !== videoId)].slice(0, 100);
    await repo.saveUserEngagement(eng);
  }

  async recordAudioResume(
    repo: TelegramRepository,
    telegramId: string,
    audioId: string,
    title: string
  ): Promise<void> {
    if (!audioId) return;
    const eng = repo.getUserEngagement(telegramId);
    eng.audioResume = { audioId, title, updatedAt: new Date().toISOString() };
    await repo.saveUserEngagement(eng);
  }

  formatMosqueInfoCard(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const lines = [
      dict.mosqueInfoTitle,
      '',
      `{{emoji:brand.mosque}} MuhammadSolih Hoji Jome Masjidi`,
      `{{emoji:prayer}} Asaka shahri, Andijon viloyati, Oʻzbekiston`,
      `{{emoji:prayer}} Qibla yoʻnalishi (Asaka): 241° (Janubi-Gʻarb)`,
      `{{emoji:community}} Rasmiy kanal: @Asaka_Ziyo`,
      `{{emoji:quran}} Ilmiy kanal: @muhiddinsahhofuz`,
      '',
      dict.mosqueInfoBody,
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  // ---- Personal Engagement (Bookmarks, Khatm Plan, Tasbeh Goals) ----

  async toggleBookmark(
    repo: TelegramRepository,
    telegramId: string,
    bookmark: Omit<TelegramUserBookmark, 'createdAt'>
  ): Promise<{ saved: boolean; total: number }> {
    const eng = repo.getUserEngagement(telegramId);
    const idx = eng.bookmarks.findIndex((b) => b.id === bookmark.id);
    let saved = false;
    if (idx >= 0) {
      eng.bookmarks.splice(idx, 1);
      saved = false;
    } else {
      eng.bookmarks.unshift({ ...bookmark, createdAt: new Date().toISOString() });
      if (eng.bookmarks.length > 100) eng.bookmarks = eng.bookmarks.slice(0, 100);
      saved = true;
    }
    await repo.saveUserEngagement(eng);
    return { saved, total: eng.bookmarks.length };
  }

  async startOrUpdateKhatmPlan(
    repo: TelegramRepository,
    telegramId: string,
    targetDays: number
  ) {
    const safeDays = Math.max(7, Math.min(365, Math.round(targetDays) || 30));
    const eng = repo.getUserEngagement(telegramId);
    const nowIso = new Date().toISOString();
    eng.khatmPlan = {
      targetDays: safeDays,
      completedJuz: eng.khatmPlan?.completedJuz || [],
      completedSurahs: eng.khatmPlan?.completedSurahs || [],
      dailyPagesGoal: Math.max(1, Math.ceil(604 / safeDays)),
      pagesReadTotal: eng.khatmPlan?.pagesReadTotal || 0,
      startedAt: eng.khatmPlan?.startedAt || nowIso,
      updatedAt: nowIso,
    };
    await repo.saveUserEngagement(eng);
    return eng.khatmPlan;
  }

  async logKhatmJuzCompleted(repo: TelegramRepository, telegramId: string, juzNumber?: number) {
    const eng = repo.getUserEngagement(telegramId);
    if (!eng.khatmPlan) {
      await this.startOrUpdateKhatmPlan(repo, telegramId, 30);
    }
    const plan = eng.khatmPlan!;
    const nextJuz =
      juzNumber ||
      Array.from({ length: 30 }, (_, i) => i + 1).find((j) => !plan.completedJuz.includes(j));
    if (nextJuz && nextJuz >= 1 && nextJuz <= 30 && !plan.completedJuz.includes(nextJuz)) {
      plan.completedJuz.push(nextJuz);
      plan.pagesReadTotal = Math.min(604, plan.completedJuz.length * 20);
      plan.updatedAt = new Date().toISOString();
      await repo.saveUserEngagement(eng);
    }
    return plan;
  }

  formatKhatmCard(
    repo: TelegramRepository,
    telegramId: string,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const eng = repo.getUserEngagement(telegramId);
    const plan = eng.khatmPlan;

    if (!plan) {
      return emojiRegistry.formatMessage(
        `${dict.khatmTitle}\n\n${dict.khatmNoPlanBody}`
      );
    }

    const pct = Math.min(100, Math.round((plan.completedJuz.length / 30) * 100));
    const lines = [
      dict.khatmTitle,
      '',
      `• ${dict.khatmGoalDaysLabel}: ${plan.targetDays}`,
      `• ${dict.khatmDailyPagesLabel}: ~${plan.dailyPagesGoal}`,
      `• ${dict.khatmCompletedJuzLabel}: ${plan.completedJuz.length} / 30 (${pct}%)`,
      `• Jami sahifalar: ${plan.pagesReadTotal} / 604`,
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  async incrementTasbeh(
    repo: TelegramRepository,
    telegramId: string,
    dhikrId: string,
    newCount: number
  ) {
    const eng = repo.getUserEngagement(telegramId);
    const prev = eng.dhikr.countsByDhikrId[dhikrId] || 0;
    const delta = newCount > prev ? newCount - prev : 0;
    eng.dhikr.countsByDhikrId[dhikrId] = newCount;
    eng.dhikr.todayCount += delta;
    eng.dhikr.totalAllTimeCount += delta;
    await repo.saveUserEngagement(eng);
    return eng.dhikr;
  }

  async setDhikrCustomGoal(
    repo: TelegramRepository,
    telegramId: string,
    dhikrId: string,
    goal: number
  ) {
    const safeGoal = Math.max(1, Math.min(100_000, Math.round(goal) || 33));
    const eng = repo.getUserEngagement(telegramId);
    eng.dhikr.dailyGoals[dhikrId] = safeGoal;
    await repo.saveUserEngagement(eng);
    return safeGoal;
  }

  performGlobalSearch(query: string, locale: TelegramLocale): string {
    const surahs = this.searchSurahs(query);
    const hadiths = this.searchHadiths(query);
    const q = query.trim().toLowerCase();
    const dhikrs = this.centralContent.getPublishedDhikrs().filter((d) =>
      `${d.titleUz || ''} ${d.translationUz || ''}`.toLowerCase().includes(q)
    );
    const articles = this.centralContent.getPublishedArticles().filter((a) =>
      `${a.title || ''} ${a.excerpt || ''}`.toLowerCase().includes(q)
    );
    const glossary = ISLAMIC_GLOSSARY.filter((g) =>
      `${g.term[locale]} ${g.definition[locale]}`.toLowerCase().includes(q)
    );

    const lines: string[] = [];
    if (surahs.length > 0) {
      lines.push('{{emoji:quran}} Qurʼon suralari:');
      surahs.slice(0, 4).forEach((s) =>
        lines.push(`• /quran — ${s.number}. ${localizeUzbekString(s.nameUz, locale)} (${s.numberOfAyahs} oyat)`)
      );
    }
    if (hadiths.length > 0) {
      lines.push('', '{{emoji:hadith}} Hadislar:');
      hadiths.slice(0, 3).forEach((h) =>
        lines.push(`• ${localizeUzbekString(h.reference, locale)}: ${localizeUzbekString(h.translationUz, locale).slice(0, 120)}...`)
      );
    }
    if (dhikrs.length > 0) {
      lines.push('', '{{emoji:dhikr}} Zikrlar:');
      dhikrs.slice(0, 3).forEach((d) =>
        lines.push(`• ${localizeUzbekString(d.titleUz, locale)}`)
      );
    }
    if (articles.length > 0) {
      lines.push('', '{{emoji:quran}} Maqolalar:');
      articles.slice(0, 2).forEach((a) =>
        lines.push(`• ${localizeUzbekString(a.title, locale)}`)
      );
    }
    if (glossary.length > 0) {
      lines.push('', '{{emoji:quran}} Lugʻat:');
      glossary.slice(0, 2).forEach((g) =>
        lines.push(`• ${g.term[locale]}: ${g.definition[locale]}`)
      );
    }
    return lines.join('\n').trim();
  }
}
