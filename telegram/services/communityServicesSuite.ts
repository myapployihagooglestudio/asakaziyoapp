/**
 * ASAKA ZIYO — Professional Telegram Community Services Suite
 *
 * Implements 5 ethical, verified, Firestore-backed modules informed by the
 * 10-reference-bot audit (strictly zero fabricated legal verdicts, zero
 * unverified commercial prices/visas, zero commercialized worship prizes,
 * zero plain Unicode emojis):
 *
 *  A. Religious Source & Book Verification Guide (with official @dinuzbbot referral)
 *  B. Umrah & Hajj Rituals Guide + Checklist + Verified Inquiry Ticket Flow
 *  C. Private Daily Worship Habits & Spiritual Consistency Tracker (Firestore-backed)
 *  D. CyberSafety URL & Dangerous File (.apk/.exe) Heuristic Checker (with @cybershielduz_bot referral)
 *  E. Multi-Region Uzbekistan Taqvim Offset Info (preserving Asaka Admin schedule as primary + @fatvouz_taqvim_bot)
 */

import type {
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramUserHabitState,
} from '../types';
import type { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import type { TelegramRepository } from '../database/telegramRepository';
import { getTashkentCalendarParts } from './dateCalendarService';

// ---------------------------------------------------------------------------
// Module A — Religious Source & Book Verification Guide
// ---------------------------------------------------------------------------

export interface VerifiedSourceCatalogEntry {
  id: string;
  title: string;
  author: string;
  publisher: string;
  category: 'quran' | 'hadith' | 'fiqh' | 'aqeedah' | 'seerah' | 'adab';
  status: 'recognized_classic' | 'official_uz_edition';
  notes: Record<TelegramLocale, string>;
  keywords: string[];
}

export const VERIFIED_RELIGIOUS_SOURCES: readonly VerifiedSourceCatalogEntry[] = [
  {
    id: 'tafsiri-hilol',
    title: 'Tafsiri Hilol (6 jild)',
    author: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    publisher: 'Hilol-Nashr',
    category: 'quran',
    status: 'official_uz_edition',
    notes: {
      'uz-Latn': 'Oʻzbekistonda keng tan olingan va rasmiy nashr etilgan Qurʼon tafsiri.',
      'uz-Cyrl': 'Ўзбекистонда кенг тан олинган ва расмий нашр этилган Қуръон тафсири.',
      'uz-Latn-new': 'Özbekistonda keng tan olingan va rasmiy naşr etilgan Qurʼon tafsiri.',
      ru: 'Широко признанный и официально изданный в Узбекистане тафсир Корана.',
      en: 'Widely recognized and officially published Uzbek Quran commentary.',
    },
    keywords: ['tafsir', 'hilol', 'тафсир', 'ҳилол', 'shayx', 'quron', 'quran'],
  },
  {
    id: 'hadis-va-hayot',
    title: 'Hadis va Hayot (silsila)',
    author: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    publisher: 'Hilol-Nashr',
    category: 'hadith',
    status: 'official_uz_edition',
    notes: {
      'uz-Latn': 'Moʻtabar hadis manbalari asosida tayyorlangan ilmiy-maʼrifiy toʻplam.',
      'uz-Cyrl': 'Мўътабар ҳадис манбалари асосида тайёрланган илмий-маърифий тўплам.',
      'uz-Latn-new': 'Möʼtabar hadis manbalari asosida tayyorlangan ilmiy-maʼrifiy töplam.',
      ru: 'Научно-просветительский цикл на основе достоверных сборников хадисов.',
      en: 'Scholarly series compiled from canonical Hadith collections.',
    },
    keywords: ['hadis', 'hayot', 'ҳадис', 'ҳаёт', 'hilol', 'hadith'],
  },
  {
    id: 'kifoya-hanafiy',
    title: 'Kifoya — Sharhi Muxtasari Viqoya',
    author: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    publisher: 'Hilol-Nashr',
    category: 'fiqh',
    status: 'official_uz_edition',
    notes: {
      'uz-Latn': 'Hanafiy mazhabi fiqhiy masalalari boʻyicha moʻtabar sharh.',
      'uz-Cyrl': 'Ҳанафий мазҳаби фиқҳий масалалари бўйича мўътабар шарҳ.',
      'uz-Latn-new': 'Hanafiy mazhabi fiqhiy masalalari böyiça möʼtabar şarh.',
      ru: 'Авторитетный комментарий по ханафитскому фикху.',
      en: 'Authoritative Hanafi jurisprudence commentary in Uzbek.',
    },
    keywords: ['kifoya', 'fiqh', 'hanafiy', 'кифоя', 'фиқҳ', 'viqoya'],
  },
  {
    id: 'sahih-bukhari',
    title: 'Al-Jomeʼ as-Sahih (Sahih al-Buxoriy)',
    author: 'Imom Muhammad ibn Ismoil al-Buxoriy',
    publisher: 'Klassik islom merosi',
    category: 'hadith',
    status: 'recognized_classic',
    notes: {
      'uz-Latn': 'Ahli sunna val jamoaning eng sahih hadis kitobi (rasmiy tarjima nashrini tekshiring).',
      'uz-Cyrl': 'Аҳли сунна вал жамоанинг энг саҳиҳ ҳадис китоби (расмий таржима нашрини текширинг).',
      'uz-Latn-new': 'Ahli sunna val jamoaning eng sahih hadis kitobi (rasmiy tarjima naşrini tekşiring).',
      ru: 'Наиболее достоверный сборник хадисов (проверяйте конкретное издание перевода).',
      en: 'Most authentic classical Hadith collection (verify the specific edition/publisher).',
    },
    keywords: ['buxoriy', 'bukhari', 'бухорий', 'sahih', 'jome'],
  },
  {
    id: 'riyozus-solihin',
    title: 'Riyozus Solihiyn',
    author: 'Imom Yahyo ibn Sharaf an-Navaviy',
    publisher: 'Klassik islom merosi',
    category: 'adab',
    status: 'recognized_classic',
    notes: {
      'uz-Latn': 'Axloq, odob va ibodatga oid klassik hadislar toʻplami.',
      'uz-Cyrl': 'Ахлоқ, одоб ва ибодатга оид классик ҳадислар тўплами.',
      'uz-Latn-new': 'Axloq, odob va ibodatga oid klassik hadislar töplami.',
      ru: 'Классический сборник хадисов о нравственности и поклонении.',
      en: 'Classical collection of Hadith on character, manners, and worship.',
    },
    keywords: ['riyoz', 'solihin', 'navaviy', 'риёз', 'нававий', 'nawawi'],
  },
  {
    id: 'aqoid-tahoviya',
    title: 'Al-Aqida at-Tahoviya (sharhlari bilan)',
    author: 'Imom Abu Jaʼfar at-Tahoviy',
    publisher: 'Klassik islom merosi',
    category: 'aqeedah',
    status: 'recognized_classic',
    notes: {
      'uz-Latn': 'Ahli sunna aqidasining moʻtabar klassik matni (OʻMI tavsiya etgan nashrlardan foydalaning).',
      'uz-Cyrl': 'Аҳли сунна ақидасининг мўътабар классик матни (ЎМИ тавсия этган нашрлардан фойдаланинг).',
      'uz-Latn-new': 'Ahli sunna aqidasining möʼtabar klassik matni (ÖMI tavsiya etgan naşrlardan foydalaning).',
      ru: 'Классический текст акыды Ахлю-с-Сунна (используйте официально изданные переводы).',
      en: 'Classical Sunni creed text (use officially published editions).',
    },
    keywords: ['aqida', 'tahoviya', 'ақида', 'таҳовия', 'aqeedah'],
  },
];

export function searchVerifiedSources(query: string): VerifiedSourceCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...VERIFIED_RELIGIOUS_SOURCES];
  return VERIFIED_RELIGIOUS_SOURCES.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.publisher.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q) || q.includes(k))
  );
}

export function formatSourceVerificationGuide(
  locale: TelegramLocale,
  query?: string
): string {
  const matches = query ? searchVerifiedSources(query) : [...VERIFIED_RELIGIOUS_SOURCES];
  const headerByLoc: Record<TelegramLocale, string> = {
    'uz-Latn': '{{emoji:brand.book}} Diniy Manba va Kitob Tekshirish Yoʻriqnomasi',
    'uz-Cyrl': '{{emoji:brand.book}} Диний Манба ва Китоб Текшириш Йўриқномаси',
    'uz-Latn-new': '{{emoji:brand.book}} Diniy Manba va Kitob Tekşiriş Yöriqnomasi',
    ru: '{{emoji:brand.book}} Проверка религиозных источников и книг',
    en: '{{emoji:brand.book}} Religious Source & Book Verification Guide',
  };
  const disclaimerByLoc: Record<TelegramLocale, string> = {
    'uz-Latn':
      '{{emoji:warning}} Muhim: ASAKA ZIYO huquqiy ekspertiza organi emas va kitob/sayt ruxsatnomasi boʻyicha rasmiy huquqiy xulosa bermaydi. Diniy materiallarning Oʻzbekistonda ruxsat etilgan yoki taqiqlanganligini rasmiy @dinuzbbot orqali tekshiring.',
    'uz-Cyrl':
      '{{emoji:warning}} Муҳим: ASAKA ZIYO ҳуқуқий экспертиза органи эмас ва китоб/сайт рухсатномаси бўйича расмий ҳуқуқий хулоса бермайди. Диний материалларнинг Ўзбекистонда рухсат этилган ёки тақиқланганлигини расмий @dinuzbbot орқали текширинг.',
    'uz-Latn-new':
      '{{emoji:warning}} Muhim: ASAKA ZIYO huquqiy ekspertiza organi emas. Rasmiy huquqiy tekşiruv uçun @dinuzbbot orqali murojaat qiling.',
    ru: '{{emoji:warning}} Важно: ASAKA ZIYO не выдает официальных юридических заключений. Для официальной проверки разрешенных/запрещенных материалов в Узбекистане используйте @dinuzbbot.',
    en: '{{emoji:warning}} Important: ASAKA ZIYO is not a legal authority and does not issue official legal clearances. For official verification in Uzbekistan, check @dinuzbbot.',
  };

  const lines: string[] = [headerByLoc[locale], ''];

  if (query) {
    lines.push(`Qidiruv soʻrovi: "${query.slice(0, 80)}"`, '');
    if (matches.length === 0) {
      lines.push(
        locale === 'ru'
          ? 'В каталоге ASAKA ZIYO точного совпадения не найдено. Проверьте материал через официальный бот @dinuzbbot.'
          : locale === 'en'
            ? 'No exact match found in the ASAKA ZIYO reference list. Please verify officially via @dinuzbbot.'
            : locale === 'uz-Cyrl'
              ? 'ASAKA ZIYO маълумотномасида аниқ мослик топилмади. Материални расмий @dinuzbbot орқали текширинг.'
              : 'ASAKA ZIYO maʼlumotnomasida aniq moslik topilmadi. Materialni rasmiy @dinuzbbot orqali tekshiring.'
      );
    } else {
      for (const item of matches.slice(0, 5)) {
        lines.push(
          `• ${item.title}\n  Muallif: ${item.author} | Nashriyot: ${item.publisher}\n  Izoh: ${item.notes[locale] || item.notes['uz-Latn']}`
        );
      }
    }
  } else {
    lines.push(
      locale === 'ru'
        ? 'Признанные классические и официальные источники в каталоге ASAKA ZIYO:'
        : locale === 'en'
          ? 'Recognized classical and official editions in ASAKA ZIYO catalog:'
          : locale === 'uz-Cyrl'
            ? 'ASAKA ZIYO маълумотномасидаги тан олинган манбалар:'
            : 'ASAKA ZIYO maʼlumotnomasidagi tan olingan manbalar:',
      ''
    );
    for (const item of matches.slice(0, 6)) {
      lines.push(`• ${item.title} — ${item.author} (${item.publisher})`);
    }
  }

  lines.push('', disclaimerByLoc[locale]);
  return lines.join('\n');
}

export function buildSourceVerificationKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const searchLabel =
    locale === 'ru'
      ? 'Поиск книги / автора'
      : locale === 'en'
        ? 'Search Book / Author'
        : locale === 'uz-Cyrl'
          ? 'Китоб / муаллиф қидириш'
          : 'Kitob / muallif qidirish';
  const officialLabel =
    locale === 'ru'
      ? 'Официальный бот @dinuzbbot'
      : locale === 'en'
        ? 'Official @dinuzbbot'
        : locale === 'uz-Cyrl'
          ? 'Расмий @dinuzbbot га ўтиш'
          : 'Rasmiy @dinuzbbot ga oʻtish';
  const backLabel =
    locale === 'ru' ? 'Главное меню' : locale === 'en' ? 'Main Menu' : locale === 'uz-Cyrl' ? 'Бош меню' : 'Bosh menyu';

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('brand.book', searchLabel, {
          callback_data: 'tools:verify:search',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.web', officialLabel, {
          url: 'https://t.me/dinuzbbot',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', backLabel, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

// ---------------------------------------------------------------------------
// Module B — Umrah & Hajj Rituals Guide + Checklist + Verified Inquiry Flow
// ---------------------------------------------------------------------------

export function formatUmrahGuideMessage(
  locale: TelegramLocale,
  section: 'home' | 'rituals' | 'checklist' | 'duas'
): string {
  if (section === 'rituals') {
    const bodyByLoc: Record<TelegramLocale, string> = {
      'uz-Latn':
        '{{emoji:brand.mosque}} UMRA ARKONLARI VA TARTIBI (Hanafiy mazhabi)\n\n' +
        '1. Miqotdan Ehromga kirish: Gʻusl qilish, ehrom kiyish, 2 rakat sunnat va Umra niyati + Talbiya.\n' +
        '2. Tavof (Kaʼba atrofida 7 marta aylanish): Hajarul Asvad qarshisidan boshlanadi; tavofdan soʻng Maqomi Ibrohim ortida 2 rakat namoz va Zamzam ichish.\n' +
        '3. Saʼy (Safo va Marva orasida 7 bor yurish): Safodan boshlanib Marvada yakunlanadi.\n' +
        '4. Halq yoki Taqsir: Erkaklar sochini oldiradi yoki qisqartiradi; ayollar soch uchidan barmoq boʻgʻini miqdorida qisqartiradi. Shu bilan ehromdan chiqiladi.\n\n' +
        '{{emoji:warning}} Eslatma: Rasmiy safar narxlari, viza va litsenziya maʼlumotlarini faqat OʻMI va rasmiy litsenziyalangan operatorlardan aniqlang.',
      'uz-Cyrl':
        '{{emoji:brand.mosque}} УМРА АРКОНЛАРИ ВА ТАРТИБИ (Ҳанафий мазҳаби)\n\n' +
        '1. Миқотдан Эҳромга кириш: Ғусл қилиш, эҳром кийиш, 2 ракат суннат ва Умра нияти + Талбия.\n' +
        '2. Тавоф (Каъба атрофида 7 марта айланиш): Ҳажарул Асвад қаршисидан бошланади; тавофдан сўнг Мақоми Иброҳим ортида 2 ракат намоз ва Замзам ичиш.\n' +
        '3. Саъй (Сафо ва Марва орасида 7 бор юриш): Сафодан бошланиб Марвада якунланади.\n' +
        '4. Ҳалқ ёки Тақсир: Эркаклар сочини олдиради ёки қисқартиради; аёллар соч учидан бармоқ бўғини миқдорида қисқартиради.\n\n' +
        '{{emoji:warning}} Эслатма: Сафар нархлари ва виза шартларини фақат расмий лицензияланган операторлардан аниқланг.',
      'uz-Latn-new':
        '{{emoji:brand.mosque}} UMRA ARKONLARI VA TARTIBI (Hanafiy mazhabi)\n\n' +
        '1. Miqotdan Ehromga kiriş va Talbiya.\n' +
        '2. Kaʼba atrofida 7 marta Tavof va 2 rakat Tavof namozi.\n' +
        '3. Safo va Marva orasida 7 bor Saʼy.\n' +
        '4. Halq yoki Taqsir bilan ehromdan çiqiş.\n\n' +
        '{{emoji:warning}} Eslatma: Rasmiy safar narxlari va litsenziyani faqat rasmiy manbalardan aniqlang.',
      ru:
        '{{emoji:brand.mosque}} ПОРЯДОК СОВЕРШЕНИЯ УМРЫ (ханафитский мазхаб)\n\n' +
        '1. Ихрам с миката: гусль, надевание ихрама, намерение и Тальбия.\n' +
        '2. Таваф (7 кругов вокруг Каабы), 2 ракаата у Макама Ибрахима и вода Замзам.\n' +
        '3. Сай (7 проходов между Сафой и Марвой).\n' +
        '4. Хальк или Таксир (бритье или укорачивание волос) — выход из ихрама.\n\n' +
        '{{emoji:warning}} Примечание: цены, визы и лицензии уточняйте только у официально лицензированных операторов.',
      en:
        '{{emoji:brand.mosque}} UMRAH RITUALS STEP-BY-STEP (Hanafi Guide)\n\n' +
        '1. Enter Ihram at the Miqat with intention and Talbiyah.\n' +
        '2. Perform Tawaf (7 circuits around the Kaaba), 2 rakahs behind Maqam Ibrahim, and drink Zamzam.\n' +
        '3. Perform Saʼy (7 laps between Safa and Marwah).\n' +
        '4. Perform Halq or Taqsir to exit Ihram.\n\n' +
        '{{emoji:warning}} Note: Always verify package prices, visas, and licenses directly with officially licensed operators.',
    };
    return bodyByLoc[locale];
  }

  if (section === 'checklist') {
    const bodyByLoc: Record<TelegramLocale, string> = {
      'uz-Latn':
        '{{emoji:confirm}} UMRA VA HAJ SAFAR TAYYORGARLIK ROʻYXATI\n\n' +
        '• Xorijga chiqish pasporti (kamida 6 oy amal qilish muddati bilan)\n' +
        '• Rasmiy viza, aviachipta va mehmonxona vaucheri nusxalari\n' +
        '• Tibbiy koʻrik va zarur dori-darmonlar\n' +
        '• Ehrom kiyimi (erkaklar uchun 2 boʻlak tikilmagan mato), qulay oyoq kiyim\n' +
        '• Hidsiz sovun, kichik joynamoz, duo kitobchasi\n' +
        '• Qarz va omonatlarni tartibga solish, oila aʼzolari bilan rozilashish',
      'uz-Cyrl':
        '{{emoji:confirm}} УМРА ВА ҲАЖ САФАР ТАЙЁРГАРЛИК РЎЙХАТИ\n\n' +
        '• Хорижга чиқиш паспорти (камида 6 ой амал қилиш муддати билан)\n' +
        '• Расмий виза, авиачипта ва меҳмонхона ваучери нусхалари\n' +
        '• Тиббий кўрик ва зарур дори-дармонлар\n' +
        '• Эҳром кийими, қулай оёқ кийим, ҳидсиз совун, дуо китобчаси\n' +
        '• Қарз ва омонатларни тартибга солиш, оила аъзолари билан розилашиш',
      'uz-Latn-new':
        '{{emoji:confirm}} UMRA VA HAJ SAFAR TAYYORGARLIK RÖYXATI\n\n' +
        '• Xorijga çiqiş pasporti (kamida 6 oy muddatli)\n' +
        '• Rasmiy viza va çipta nusxalari\n' +
        '• Ehrom kiyimi, qulay oyoq kiyim, zarur dorilar\n' +
        '• Qarz va omonatlarni tartibga soliş',
      ru:
        '{{emoji:confirm}} ЧЕК-ЛИСТ ПОДГОТОВКИ К УМРЕ И ХАДЖУ\n\n' +
        '• Загранпаспорт (срок действия не менее 6 месяцев)\n' +
        '• Копии официальной визы, билетов и брони гостиницы\n' +
        '• Медосмотр и личная аптечка\n' +
        '• Ихрам, удобная обувь, мыло без запаха, сборник дуа\n' +
        '• Урегулирование долгов и завещаний перед поездкой',
      en:
        '{{emoji:confirm}} UMRAH & HAJJ PREPARATION CHECKLIST\n\n' +
        '• Passport valid for at least 6 months\n' +
        '• Official visa, flight tickets, and hotel confirmations\n' +
        '• Medical clearance and personal prescriptions\n' +
        '• Ihram garments, comfortable footwear, unscented soap, dua booklet\n' +
        '• Settle debts and trusts before departure',
    };
    return bodyByLoc[locale];
  }

  if (section === 'duas') {
    return (
      '{{emoji:dua}} TALBIYA VA ASOSIY UMRA DUOLARI\n\n' +
      'Talbiya:\n' +
      'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ\n' +
      'Labbaykallohumma labbayk, labbayka laa shariyka laka labbayk, innal-hamda van-niʼmata laka val-mulk, laa shariyka lak.\n\n' +
      'Rukni Yamoniy va Hajarul Asvad orasidagi duo:\n' +
      'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ\n' +
      'Robbanaa aatinaa fid-dunyaa hasanatan va fil-aaxiroti hasanatan va qinaa azaaban-naar.'
    );
  }

  const homeByLoc: Record<TelegramLocale, string> = {
    'uz-Latn':
      '{{emoji:brand.mosque}} UMRA VA HAJ YOʻRIQNOMASI — ASAKA ZIYO\n\n' +
      'Ushbu boʻlimda Umra va Haj amallari boʻyicha moʻtabar qoʻllanma, safar tayyorgarlik roʻyxati va Talbiya/tavof duolarini topasiz.\n\n' +
      '{{emoji:warning}} ASAKA ZIYO sayohat agentligi emas — tasdiqlanmagan narxlar yoki viza kafolatlari taqdim etilmaydi. Savolingiz boʻlsa, rasmiy maslahat soʻrovi yuborishingiz mumkin.',
    'uz-Cyrl':
      '{{emoji:brand.mosque}} УМРА ВА ҲАЖ ЙЎРИҚНОМАСИ — ASAKA ZIYO\n\n' +
      'Ушбу бўлимда Умра ва Ҳаж амаллари бўйича мўътабар қўлланма, сафар тайёргарлик рўйхати ва дуоларни топасиз.\n\n' +
      '{{emoji:warning}} ASAKA ZIYO саёҳат агентлиги эмас — тасдиқланмаган нархлар ёки виза кафолатлари берилмайди.',
    'uz-Latn-new':
      '{{emoji:brand.mosque}} UMRA VA HAJ YÖRIQNOMASI — ASAKA ZIYO\n\n' +
      'Umra amallari qöllanmasi, tayyorgarlik röyxati va duolar.',
    ru:
      '{{emoji:brand.mosque}} СПРАВОЧНИК ПО УМРЕ И ХАДЖУ — ASAKA ZIYO\n\n' +
      'Пошаговое руководство по обрядам, чек-лист документов и основные дуа.\n\n' +
      '{{emoji:warning}} ASAKA ZIYO не является туроператором и не публикует неподтвержденные цены или визовые гарантии.',
    en:
      '{{emoji:brand.mosque}} UMRAH & HAJJ GUIDE — ASAKA ZIYO\n\n' +
      'Step-by-step rituals, preparation checklist, and authentic supplications.\n\n' +
      '{{emoji:warning}} ASAKA ZIYO is not a travel agency and does not publish unverified pricing or visa guarantees.',
  };
  return homeByLoc[locale];
}

export function buildUmrahGuideKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const isRu = locale === 'ru';
  const isEn = locale === 'en';
  const isCyrl = locale === 'uz-Cyrl';
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton(
          'brand.mosque',
          isRu ? 'Порядок Умры' : isEn ? 'Umrah Rituals' : isCyrl ? 'Умра арконлари' : 'Umra arkonlari',
          { callback_data: 'tools:umrah:rituals' }
        ),
        emoji.buildKeyboardButton(
          'confirm',
          isRu ? 'Чек-лист' : isEn ? 'Checklist' : isCyrl ? 'Тайёргарлик' : 'Tayyorgarlik',
          { callback_data: 'tools:umrah:checklist' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'dua',
          isRu ? 'Тальбия и дуа' : isEn ? 'Talbiyah & Duas' : isCyrl ? 'Талбия ва дуолар' : 'Talbiya va duolar',
          { callback_data: 'tools:umrah:duas' }
        ),
        emoji.buildKeyboardButton(
          'support',
          isRu ? 'Задать вопрос имаму' : isEn ? 'Ask Imam' : isCyrl ? 'Имомга савол' : 'Imomga savol',
          { callback_data: 'support:cat:imam_question' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'nav.back',
          isRu ? 'Главное меню' : isEn ? 'Main Menu' : isCyrl ? 'Бош меню' : 'Bosh menyu',
          { callback_data: 'nav:home' }
        ),
      ],
    ],
  };
}

// ---------------------------------------------------------------------------
// Module C — Private Daily Worship Habits & Consistency Planner
// ---------------------------------------------------------------------------

export interface HabitItemDefinition {
  id: string;
  labels: Record<TelegramLocale, string>;
}

export const DEFAULT_WORSHIP_HABITS: readonly HabitItemDefinition[] = [
  {
    id: 'five_prayers',
    labels: {
      'uz-Latn': '5 vaqt namozni oʻz vaqtida ado etish',
      'uz-Cyrl': '5 вақт намозни ўз вақтида адо этиш',
      'uz-Latn-new': '5 vaqt namozni öz vaqtida ado etiş',
      ru: '5 обязательных намазов вовремя',
      en: 'Five daily prayers on time',
    },
  },
  {
    id: 'quran_reading',
    labels: {
      'uz-Latn': 'Kunlik Qurʼon tilovati (kamida 1 sahifa)',
      'uz-Cyrl': 'Кунлик Қуръон тиловати (камида 1 саҳифа)',
      'uz-Latn-new': 'Kunlik Qurʼon tilovati (kamida 1 sahifa)',
      ru: 'Ежедневное чтение Корана (от 1 стр.)',
      en: 'Daily Quran recitation (at least 1 page)',
    },
  },
  {
    id: 'morning_evening_dhikr',
    labels: {
      'uz-Latn': 'Tonggi va kechki zikrlar',
      'uz-Cyrl': 'Тонгги ва кечки зикрлар',
      'uz-Latn-new': 'Tonggi va keçki zikrlar',
      ru: 'Утренние и вечерние азкары',
      en: 'Morning & evening adhkar',
    },
  },
  {
    id: 'salawat_istighfar',
    labels: {
      'uz-Latn': 'Salavot va istigʻfor (kamida 33 marta)',
      'uz-Cyrl': 'Салавот ва истиғфор (камида 33 марта)',
      'uz-Latn-new': 'Salavot va istiğfor (kamida 33 marta)',
      ru: 'Салават и истигфар (от 33 раз)',
      en: 'Salawat & Istighfar (at least 33x)',
    },
  },
  {
    id: 'duha_witr',
    labels: {
      'uz-Latn': 'Zuho yoki Vitr namozi',
      'uz-Cyrl': 'Зуҳо ёки Витр намози',
      'uz-Latn-new': 'Zuho yoki Vitr namozi',
      ru: 'Намаз Духа или Витр',
      en: 'Duha or Witr prayer',
    },
  },
];

export function ensureHabitState(
  raw: TelegramUserHabitState | undefined,
  todayDateKey: string
): TelegramUserHabitState {
  if (!raw) {
    return {
      todayDateKey,
      completedTodayIds: [],
      historyByDate: {},
      currentStreakDays: 0,
      bestStreakDays: 0,
      reminderEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }
  const history = { ...(raw.historyByDate || {}) };
  if (raw.todayDateKey && raw.todayDateKey !== todayDateKey) {
    // Archive previous day's progress cleanly
    if (Array.isArray(raw.completedTodayIds) && raw.completedTodayIds.length > 0) {
      history[raw.todayDateKey] = [...raw.completedTodayIds];
    }
    return {
      ...raw,
      todayDateKey,
      completedTodayIds: Array.isArray(history[todayDateKey]) ? [...history[todayDateKey]] : [],
      historyByDate: history,
    };
  }
  return {
    ...raw,
    todayDateKey,
    completedTodayIds: Array.isArray(raw.completedTodayIds) ? [...raw.completedTodayIds] : [],
    historyByDate: history,
  };
}

function computePrivateStreak(historyByDate: Record<string, string[]>, todayDateKey: string): number {
  let streak = 0;
  const parts = todayDateKey.split('-').map(Number);
  if (parts.length !== 3) return 0;
  let cursor = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 7, 0, 0));
  for (let i = 0; i < 365; i++) {
    const key = getTashkentCalendarParts(cursor).dateKey;
    const items = historyByDate[key];
    if (Array.isArray(items) && items.length > 0) {
      streak++;
      cursor = new Date(cursor.getTime() - 86_400_000);
    } else if (i === 0) {
      // Today may not be finished yet — check yesterday
      cursor = new Date(cursor.getTime() - 86_400_000);
    } else {
      break;
    }
  }
  return streak;
}

export async function toggleUserWorshipHabit(
  repo: TelegramRepository,
  telegramId: string,
  habitId: string,
  now: Date = new Date()
): Promise<{ state: TelegramUserHabitState; completed: boolean }> {
  const todayKey = getTashkentCalendarParts(now).dateKey;
  const eng = repo.getUserEngagement(telegramId);
  const state = ensureHabitState(eng.worshipHabits, todayKey);
  const exists = state.completedTodayIds.includes(habitId);

  if (exists) {
    state.completedTodayIds = state.completedTodayIds.filter((id) => id !== habitId);
  } else {
    state.completedTodayIds = [...state.completedTodayIds, habitId];
  }
  state.historyByDate[todayKey] = [...state.completedTodayIds];

  // Keep latest 30 days bounded in Firestore document
  const sortedKeys = Object.keys(state.historyByDate).sort().slice(-30);
  const boundedHistory: Record<string, string[]> = {};
  for (const k of sortedKeys) boundedHistory[k] = state.historyByDate[k];
  state.historyByDate = boundedHistory;

  state.currentStreakDays = computePrivateStreak(state.historyByDate, todayKey);
  state.bestStreakDays = Math.max(state.bestStreakDays || 0, state.currentStreakDays);
  state.updatedAt = now.toISOString();

  await repo.saveUserEngagement({
    ...eng,
    worshipHabits: state,
    updatedAt: now.toISOString(),
  });

  return { state, completed: !exists };
}

export function formatHabitsDashboardText(
  locale: TelegramLocale,
  state: TelegramUserHabitState
): string {
  const doneCount = state.completedTodayIds.length;
  const totalCount = DEFAULT_WORSHIP_HABITS.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  // Count 7-day completions
  const recentKeys = Object.keys(state.historyByDate || {}).sort().slice(-7);
  const weeklyChecks = recentKeys.reduce(
    (sum, k) => sum + (Array.isArray(state.historyByDate[k]) ? state.historyByDate[k].length : 0),
    0
  );

  const titleByLoc: Record<TelegramLocale, string> = {
    'uz-Latn': '{{emoji:hifz}} SHAXSIY IBODAT REJASI VA ODATLAR (MAXFIY)',
    'uz-Cyrl': '{{emoji:hifz}} ШАХСИЙ ИБОДАТ РЕЖАСИ ВА ОДАТЛАР (МАХФИЙ)',
    'uz-Latn-new': '{{emoji:hifz}} ŞAXSIY IBODAT REJASI VA ODATLAR (MAXFIY)',
    ru: '{{emoji:hifz}} ЛИЧНЫЙ ПЛАН ПОКЛОНЕНИЯ И ПРИВЫЧКИ (ПРИВАТНО)',
    en: '{{emoji:hifz}} PRIVATE DAILY WORSHIP HABITS & PLANNER',
  };

  const lines: string[] = [
    titleByLoc[locale],
    `{{emoji:calendar.date}} ${state.todayDateKey} (Asia/Tashkent)`,
    '',
    ...DEFAULT_WORSHIP_HABITS.map((h) => {
      const done = state.completedTodayIds.includes(h.id);
      const mark = done ? '[BAJARILDI]' : '[   ]';
      return `${mark} ${h.labels[locale] || h.labels['uz-Latn']}`;
    }),
    '',
    `Bugungi natija: ${doneCount}/${totalCount} (${pct}%)`,
    `Shaxsiy bardavomlik: ${state.currentStreakDays} kun (Eng yaxshi: ${state.bestStreakDays} kun) | 7 kunlik belgilash: ${weeklyChecks}`,
    '',
    locale === 'ru'
      ? 'Статистика поклонения строго приватна (только для вас, без публичных рейтингов).'
      : locale === 'en'
        ? 'Your worship checklist is strictly private (visible only to you, never used for public prizes).'
        : locale === 'uz-Cyrl'
          ? 'Ибодат кўрсаткичларингиз фақат ўзингиз учун махфий сақланади (оммавий рейтингга чиқарилмайди).'
          : 'Ibodat koʻrsatkichlaringiz faqat oʻzingiz uchun maxfiy saqlanadi (ommaviy reytingga chiqarilmaydi).',
  ];
  return lines.join('\n');
}

export function buildHabitsKeyboard(
  locale: TelegramLocale,
  state: TelegramUserHabitState,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const rows = DEFAULT_WORSHIP_HABITS.map((h) => {
    const done = state.completedTodayIds.includes(h.id);
    const label = `${done ? '[OK] ' : ''}${(h.labels[locale] || h.labels['uz-Latn']).slice(0, 38)}`;
    return [
      emoji.buildKeyboardButton(done ? 'confirm' : 'hifz', label, {
        callback_data: `habits:toggle:${h.id}`,
      }),
    ];
  });
  const backLabel =
    locale === 'ru' ? 'Главное меню' : locale === 'en' ? 'Main Menu' : locale === 'uz-Cyrl' ? 'Бош меню' : 'Bosh menyu';
  rows.push([
    emoji.buildKeyboardButton('nav.back', backLabel, { callback_data: 'nav:home' }),
  ]);
  return { inline_keyboard: rows };
}

// ---------------------------------------------------------------------------
// Module D — CyberSafety Heuristic URL & Dangerous File Checker
// ---------------------------------------------------------------------------

export interface CyberSafetyCheckResult {
  riskLevel: 'high' | 'medium' | 'unverified';
  findings: string[];
  targetSample: string;
}

const DANGEROUS_EXTENSIONS = ['.apk', '.exe', '.bat', '.cmd', '.scr', '.msi', '.vbs', '.ps1', '.jar'];
const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'clck.ru',
  'cutt.ly',
  'is.gd',
  'rb.gy',
  'shorturl.at',
]);
const PHISHING_KEYWORDS = [
  'uzum-bonus',
  'uzum-pay',
  'click-verify',
  'payme-gift',
  'telegram-premium-free',
  'tg-gift',
  'humo-bonus',
  'uzcard-verify',
  'free-stars',
  'login-verify',
  'account-suspend',
];
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.gq', '.tk', '.ml', '.cf', '.zip', '.mov'];

/**
 * Pure static heuristic analyzer — NEVER downloads or executes files/URLs,
 * and NEVER falsely certifies an arbitrary link/file as "100% safe".
 */
export function analyzeCyberSafetyInput(input: string, fileName?: string): CyberSafetyCheckResult {
  const raw = (fileName || input || '').trim();
  const lower = raw.toLowerCase();
  const findings: string[] = [];
  let riskLevel: CyberSafetyCheckResult['riskLevel'] = 'unverified';

  // 1. Dangerous executable / Android APK extensions
  const matchedExt = DANGEROUS_EXTENSIONS.find((ext) => lower.endsWith(ext) || lower.includes(`${ext}?`) || lower.includes(`${ext} `));
  if (matchedExt) {
    riskLevel = 'high';
    findings.push(
      `Xavfli fayl kengaytmasi aniqlandi (${matchedExt}): notanish manbadan kelgan .apk/.exe fayllarni hech qachon oʻrnatmang — ular bank ilovalari va SMS kodlarni oʻgʻirlashi mumkin.`
    );
  }

  // 2. Extract URLs if present
  const urlMatch = raw.match(/https?:\/\/[^\s]+/i) || raw.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b[^\s]*/i);
  if (urlMatch) {
    const candidate = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();

      if (host.startsWith('xn--') || host.includes('.xn--')) {
        riskLevel = 'high';
        findings.push(
          'Punycode / oʻxshash harfli soxta domen (IDN homograph) aniqlandi — fishing xavfi yuqori.'
        );
      }
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        riskLevel = 'high';
        findings.push('Domen oʻrniga toʻgʻridan-toʻgʻri IP manzil ishlatilgan — yuqori fishing xavfi.');
      }
      if (parsed.protocol === 'http:') {
        if (riskLevel !== 'high') riskLevel = 'medium';
        findings.push('Shifrlanmagan HTTP havola (HTTPS emas) — parol va karta maʼlumotlarini kiritmang.');
      }
      if (SHORTENER_HOSTS.has(host)) {
        if (riskLevel !== 'high') riskLevel = 'medium';
        findings.push(
          `Qisqartirilgan havola (${host}): asl manzil yashirilgan, ochishdan oldin ehtiyot boʻling.`
        );
      }
      if (SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) {
        if (riskLevel !== 'high') riskLevel = 'medium';
        findings.push('Koʻpincha firibgarlikda ishlatiladigan domen zonasi aniqlandi.');
      }
      if (PHISHING_KEYWORDS.some((kw) => lower.includes(kw))) {
        riskLevel = 'high';
        findings.push(
          'Mashhur toʻlov/Telegram brendlariga taqlid qiluvchi fishing belgisi aniqlandi.'
        );
      }
      if (parsed.username || raw.includes('@') && parsed.href.includes('@')) {
        riskLevel = 'high';
        findings.push('Havola ichida "@" orqali manzilni chalgʻitish belgisi aniqlandi.');
      }
    } catch {
      if (riskLevel !== 'high') riskLevel = 'medium';
      findings.push('Havola formati nostandart yoki buzilgan — ehtiyotkorlik bilan tekshiring.');
    }
  } else if (!matchedExt) {
    // Keyword check on plain text message (e.g., suspicious scam message)
    if (PHISHING_KEYWORDS.some((kw) => lower.includes(kw)) || lower.includes('sms kod') || lower.includes('karta raqam')) {
      riskLevel = 'high';
      findings.push(
        'Firibgarlikka xos kalit soʻzlar aniqlandi: hech kimga SMS tasdiqlash kodi yoki bank karta maʼlumotini bermang.'
      );
    }
  }

  if (findings.length === 0) {
    findings.push(
      'Statik tekshiruvda aniq fishing/APK belgisi topilmadi, ammo bu fayl yoki havola antivirus orqali skanerlanmagan. Notanish manbalardan kelgan havola va fayllarni ochmang.'
    );
  }

  return {
    riskLevel,
    findings,
    targetSample: raw.slice(0, 120),
  };
}

export function formatCyberSafetyHomeText(locale: TelegramLocale): string {
  const byLoc: Record<TelegramLocale, string> = {
    'uz-Latn':
      '{{emoji:admin.shield}} KIBERXAVFSIZLIK TEKSHIRUVCHISI — ASAKA ZIYO\n\n' +
      'Shubhali havola (URL), matn yoki fayl nomini yuboring — tizim fishing, soxta domen va zararli .apk/.exe belgilarini statik tekshiradi.\n\n' +
      'Asosiy xavfsizlik qoidalari:\n' +
      '1. Telegram orqali kelgan notanish .apk fayllarni HECH QACHON oʻrnatmang.\n' +
      '2. Bank SMS kodlari va karta parollarini hech kimga bermang.\n' +
      '3. Guruhlarni zararli .apk fayllardan himoya qilish uchun rasmiy @cybershielduz_bot xizmatidan foydalanishingiz mumkin.',
    'uz-Cyrl':
      '{{emoji:admin.shield}} КИБЕРХАВФСИЗЛИК ТЕКШИРУВЧИСИ — ASAKA ZIYO\n\n' +
      'Шубҳали ҳавола (URL) ёки файл номини юборинг — тизим фишинг ва зарарли .apk/.exe белгиларини статик текширади.\n\n' +
      '1. Нотаниш .apk файлларни ҲЕЧ ҚАЧОН ўрнатманг.\n' +
      '2. Банк SMS кодларини ҳеч кимга берманг.\n' +
      '3. Гуруҳлар ҳимояси учун расмий @cybershielduz_bot хизмати мавжуд.',
    'uz-Latn-new':
      '{{emoji:admin.shield}} KIBERXAVFSIZLIK TEKŞIRUVÇISI — ASAKA ZIYO\n\n' +
      'Şubhali havola yoki fayl nomini yuboring — tizim fishing va zararli .apk belgilarini tekşiradi.',
    ru:
      '{{emoji:admin.shield}} ПРОВЕРКА КИБЕРБЕЗОПАСНОСТИ — ASAKA ZIYO\n\n' +
      'Отправьте подозрительную ссылку (URL) или имя файла — бот выполнит статическую проверку на признаки фишинга и опасных .apk/.exe файлов.\n\n' +
      '1. Никогда не устанавливайте неизвестные .apk файлы из Telegram.\n' +
      '2. Никому не сообщайте SMS-коды банков.\n' +
      '3. Для защиты групп от вредоносных .apk доступен официальный бот @cybershielduz_bot.',
    en:
      '{{emoji:admin.shield}} CYBERSAFETY CHECKER — ASAKA ZIYO\n\n' +
      'Send a suspicious URL or filename for static phishing & malicious .apk/.exe heuristic checks.\n\n' +
      '1. Never install unknown .apk files shared via Telegram.\n' +
      '2. Never share banking SMS codes.\n' +
      '3. For group protection against malicious .apk files, see @cybershielduz_bot.',
  };
  return byLoc[locale];
}

export function formatCyberSafetyResultText(
  locale: TelegramLocale,
  result: CyberSafetyCheckResult
): string {
  const statusLabel =
    result.riskLevel === 'high'
      ? locale === 'ru'
        ? 'ВЫСОКИЙ РИСК'
        : locale === 'en'
          ? 'HIGH RISK'
          : 'YUQORI XAVF'
      : result.riskLevel === 'medium'
        ? locale === 'ru'
          ? 'СРЕДНИЙ РИСК (ОСТОРОЖНО)'
          : locale === 'en'
            ? 'MEDIUM RISK (CAUTION)'
            : 'OʻRTACHA XAVF (EHTIYOT BOʻLING)'
        : locale === 'ru'
          ? 'НЕ ПРОВЕРЕНО АНТИВИРУСОМ'
          : locale === 'en'
            ? 'UNVERIFIED (NOT ANTIVIRUS-SCANNED)'
            : 'TASDIQLANMAGAN (ANTIVIRUS SKANERI YOʻQ)';

  const iconKey = result.riskLevel === 'high' ? 'error' : 'warning';
  return [
    `{{emoji:${iconKey}}} Kiberxavfsizlik tahlili: ${statusLabel}`,
    `Tekshirilgan: ${result.targetSample}`,
    '',
    ...result.findings.map((f, i) => `${i + 1}. ${f}`),
    '',
    'Rasmiy guruh himoyasi va ogohlantirishlar: @cybershielduz_bot',
  ].join('\n');
}

export function buildCyberSafetyKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const isRu = locale === 'ru';
  const isEn = locale === 'en';
  const isCyrl = locale === 'uz-Cyrl';
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton(
          'admin.shield',
          isRu ? 'Проверить ссылку / файл' : isEn ? 'Check URL / File' : isCyrl ? 'Ҳавола / файл текшириш' : 'Havola / fayl tekshirish',
          { callback_data: 'tools:cyber:check' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'nav.web',
          isRu ? 'Официальный @cybershielduz_bot' : isEn ? 'Official @cybershielduz_bot' : 'Rasmiy @cybershielduz_bot',
          { url: 'https://t.me/cybershielduz_bot' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'nav.back',
          isRu ? 'Главное меню' : isEn ? 'Main Menu' : isCyrl ? 'Бош меню' : 'Bosh menyu',
          { callback_data: 'nav:home' }
        ),
      ],
    ],
  };
}

// ---------------------------------------------------------------------------
// Module E — Multi-Region Uzbekistan Taqvim Info (Asaka Primary Preserved!)
// ---------------------------------------------------------------------------

export function formatRegionalTaqvimNotice(locale: TelegramLocale): string {
  const byLoc: Record<TelegramLocale, string> = {
    'uz-Latn':
      '{{emoji:prayer}} HUDUDIY TAQVIM MAʼLUMOTI\n\n' +
      'ASAKA ZIYO asosiy jadvali — Asaka tumani («MuhammadSolih Hoji» jomeʼ masjidi) uchun admin tomonidan tasdiqlangan rasmiy vaqtlardir. Bu vaqtlar hech qachon avtomatik almashtirilmaydi.\n\n' +
      'Toshkent vaqtiga nisbatan OʻMI taqvimiy taxminiy farqlar:\n' +
      '• Andijon / Asaka: -11..-12 daqiqa\n' +
      '• Namangan / Fargʻona: -10 daqiqa\n' +
      '• Toshkent: 0 daqiqa (markaz)\n' +
      '• Samarqand: +9 daqiqa\n' +
      '• Buxoro: +21 daqiqa\n' +
      '• Urganch / Nukus: +35..+38 daqiqa\n\n' +
      'Boshqa viloyatlar uchun aniq rasmiy taqvimni OʻMI Fatvo markazining @fatvouz_taqvim_bot botidan olishingiz mumkin.',
    'uz-Cyrl':
      '{{emoji:prayer}} ҲУДУДИЙ ТАҚВИМ МАЪЛУМОТИ\n\n' +
      'ASAKA ZIYO асосий жадвали — Асака тумани учун админ томонидан тасдиқланган расмий вақтлардир.\n\n' +
      'Тошкент вақтига нисбатан тахминий фарқлар:\n' +
      '• Андижон / Асака: -11..-12 дақиқа\n' +
      '• Наманган / Фарғона: -10 дақиқа\n' +
      '• Тошкент: 0 дақиқа\n' +
      '• Самарқанд: +9 дақиқа\n' +
      '• Бухоро: +21 дақиқа\n' +
      '• Урганч / Нукус: +35..+38 дақиқа\n\n' +
      'Бошқа вилоятлар учун расмий тақвим: @fatvouz_taqvim_bot',
    'uz-Latn-new':
      '{{emoji:prayer}} HUDUDIY TAQVIM MAʼLUMOTI\n\n' +
      'ASAKA ZIYO asosiy jadvali — Asaka tumani rasmiy vaqtlari. Boşqa viloyatlar uçun @fatvouz_taqvim_bot orqali rasmiy taqvimni oling.',
    ru:
      '{{emoji:prayer}} РЕГИОНАЛЬНЫЕ ПОПРАВКИ ТАКВИМА\n\n' +
      'Основное расписание ASAKA ZIYO — официально подтвержденное время для Асакинского района (не заменяется авторасчетом).\n\n' +
      'Ориентировочные сдвиги относительно Ташкента:\n' +
      '• Андижан / Асака: -11..-12 мин\n' +
      '• Наманган / Фергана: -10 мин\n' +
      '• Ташкент: 0 мин\n' +
      '• Самарканд: +9 мин\n' +
      '• Бухара: +21 мин\n' +
      '• Ургенч / Нукус: +35..+38 мин\n\n' +
      'Официальное расписание для других регионов: @fatvouz_taqvim_bot',
    en:
      '{{emoji:prayer}} REGIONAL TAQVIM INFORMATION\n\n' +
      'ASAKA ZIYO primary prayer times are administrator-verified for Asaka District and are never auto-overwritten.\n\n' +
      'Approximate regional offsets relative to Tashkent:\n' +
      '• Andijan / Asaka: -11 to -12 min\n' +
      '• Namangan / Fergana: -10 min\n' +
      '• Tashkent: 0 min\n' +
      '• Samarkand: +9 min\n' +
      '• Bukhara: +21 min\n' +
      '• Urgench / Nukus: +35 to +38 min\n\n' +
      'For official regional timetables across Uzbekistan, visit @fatvouz_taqvim_bot.',
  };
  return byLoc[locale];
}

export function buildRegionalTaqvimKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const isRu = locale === 'ru';
  const isEn = locale === 'en';
  const isCyrl = locale === 'uz-Cyrl';
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton(
          'nav.web',
          isRu ? 'Официальный @fatvouz_taqvim_bot' : isEn ? 'Official @fatvouz_taqvim_bot' : 'Rasmiy @fatvouz_taqvim_bot',
          { url: 'https://t.me/fatvouz_taqvim_bot' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'prayer',
          isRu ? 'Расписание Асаки' : isEn ? 'Asaka Schedule' : isCyrl ? 'Асака жадвали' : 'Asaka jadvali',
          { callback_data: 'nav:prayer' }
        ),
        emoji.buildKeyboardButton(
          'nav.back',
          isRu ? 'Главное меню' : isEn ? 'Main Menu' : isCyrl ? 'Бош меню' : 'Bosh menyu',
          { callback_data: 'nav:home' }
        ),
      ],
    ],
  };
}

// ---------------------------------------------------------------------------
// Unified Community Services Hub Keyboard
// ---------------------------------------------------------------------------

export function buildCommunityServicesHubKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const isRu = locale === 'ru';
  const isEn = locale === 'en';
  const isCyrl = locale === 'uz-Cyrl';
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton(
          'hifz',
          isRu ? 'Личные привычки и план' : isEn ? 'Daily Worship Habits' : isCyrl ? 'Кунлик ибодат режаси' : 'Kunlik ibodat rejasi',
          { callback_data: 'habits:home' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'brand.book',
          isRu ? 'Проверка источников' : isEn ? 'Verify Religious Source' : isCyrl ? 'Манба текшириш' : 'Manba tekshirish',
          { callback_data: 'tools:verify:home' }
        ),
        emoji.buildKeyboardButton(
          'brand.mosque',
          isRu ? 'Умра и Хадж' : isEn ? 'Umrah & Hajj Guide' : isCyrl ? 'Умра ва Ҳаж' : 'Umra va Haj',
          { callback_data: 'tools:umrah:home' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'admin.shield',
          isRu ? 'Кибербезопасность' : isEn ? 'CyberSafety Checker' : isCyrl ? 'Киберхавфсизлик' : 'Kiberxavfsizlik',
          { callback_data: 'tools:cyber:home' }
        ),
        emoji.buildKeyboardButton(
          'prayer',
          isRu ? 'Регионы (Таквим)' : isEn ? 'Regional Taqvim' : isCyrl ? 'Ҳудудий тақвим' : 'Hududiy taqvim',
          { callback_data: 'tools:regions' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'nav.back',
          isRu ? 'Главное меню' : isEn ? 'Main Menu' : isCyrl ? 'Бош меню' : 'Bosh menyu',
          { callback_data: 'nav:home' }
        ),
      ],
    ],
  };
}
