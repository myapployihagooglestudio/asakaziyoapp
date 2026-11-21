/**
 * ASAKA ZIYO HIFZ — 5-Language UI Formatter & Inline Keyboard Builders
 *
 * Covers all 9 dedicated HIFZ sub-sections:
 * 1. Mening Hifzim            (`hifz:home`)
 * 2. Yangi yodlash            (`hifz:new`)
 * 3. Yodlaganlarim            (`hifz:memorized`)
 * 4. Bugungi murojaa          (`hifz:today`)
 * 5. Murojaa kalendari        (`hifz:calendar`)
 * 6. Mening murabbiyim        (`hifz:coach`)
 * 7. Audio tekshirish         (`hifz:audio`)
 * 8. Hifz statistikasi        (`hifz:stats`)
 * 9. Bildirishnoma sozlamalari (`hifz:reminders`)
 *
 * Strictly preserves Arabic Quran script verbatim across all 5 languages (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new`, `ru`, `en`).
 */

import { TelegramInlineKeyboardMarkup, TelegramLocale } from '../types';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import {
  HifzAudioCheckResult,
  HifzDailyPlan,
  HifzDailyTask,
  HifzStatsSummary,
  TelegramHifzProfile,
} from './hifzTypes';
import {
  TOTAL_QURAN_AYAHS,
  computeAllJuzProgress,
  formatRangesCompact,
  getHifzReciterOptions,
  getSurahMeta,
  getVerifiedArabicAyahsForRange,
  listAllSurahMeta,
} from './quranMetadataMap';

interface HifzLocaleStrings {
  hubTitle: string;
  btnMyHifz: string;
  btnNewMem: string;
  btnMemorized: string;
  btnTodayReview: string;
  btnCalendar: string;
  btnCoach: string;
  btnAudioCheck: string;
  btnStats: string;
  btnReminders: string;
  btnJuzMap: string;
  btnReciters: string;
  btnBackHifz: string;
  btnBackMain: string;
  lifelongActiveBadge: string;
  lifelongLockedNote: string;
  ratingPrompt: string;
  rate1: string;
  rate2: string;
  rate3: string;
  rate4: string;
  rate5: string;
  audioDisclaimer: string;
}

const HIFZ_STRINGS_BASE: Record<Exclude<TelegramLocale, 'uz-Latn-new'>, HifzLocaleStrings> = {
  'uz-Latn': {
    hubTitle: '{{emoji:hifz}} ASAKA ZIYO HIFZ — Qurʼon Yodlash va Murojaa Markazi',
    btnMyHifz: '{{emoji:quran}} Mening Hifzim',
    btnNewMem: '{{emoji:brand}} Yangi yodlash',
    btnMemorized: '{{emoji:quran}} Yodlaganlarim',
    btnTodayReview: '{{emoji:next}} Bugungi murojaa',
    btnCalendar: '{{emoji:calendar}} Murojaa kalendari',
    btnCoach: '{{emoji:hifz}} Mening murabbiyim',
    btnAudioCheck: '{{emoji:quran_mp3}} Audio tekshirish',
    btnStats: '{{emoji:statistics}} Hifz statistikasi',
    btnReminders: '{{emoji:notifications}} Bildirishnoma sozlamalari',
    btnJuzMap: '{{emoji:statistics}} 30 Juz xaritasi',
    btnReciters: '{{emoji:quran_mp3}} Qori tanlash',
    btnBackHifz: '{{emoji:back}} HIFZ menyusi',
    btnBackMain: '{{emoji:home}} Asosiy menyu',
    lifelongActiveBadge: '{{emoji:admin}} UMRLIK 30 JUZ MUROJAA REJIMI FAOL',
    lifelongLockedNote: '{{emoji:admin}} Umrlik 30 Juz rejimi barcha 6,236 oyat (30 juz) toʻliq yodlangach ochiladi.',
    ratingPrompt: ' Active Recall: Musʼhafga qaramasdan oʻqish natijangizni baholang:',
    rate1: '1. Juda yaxshi',
    rate2: '2. Yaxshi',
    rate3: '3. Oʻrtacha',
    rate4: '4. Qiyin',
    rate5: '5. Qayta yodlash kerak',
    audioDisclaimer:
      '{{emoji:warning}} Muhim eslatma: Avtomatik nutqni aniqlash (STT) soʻz tushib qolishi yoki almashishini koʻrsatishda yordam beradi, biroq tajvid va maxrajni toʻliq tekshira olmaydi. Asosiy tekshiruv uchun malakali Qurʼon ustozi (Qori)ga oʻqib bering.',
  },
  'uz-Cyrl': {
    hubTitle: '{{emoji:hifz}} ASAKA ZIYO ҲИФЗ — Қуръон Ёдлаш ва Мурожаа Маркази',
    btnMyHifz: '{{emoji:quran}} Менинг Ҳифзим',
    btnNewMem: '{{emoji:brand}} Янги ёдлаш',
    btnMemorized: '{{emoji:quran}} Ёдлаганларим',
    btnTodayReview: '{{emoji:next}} Бугунги мурожаа',
    btnCalendar: '{{emoji:calendar}} Мурожаа календари',
    btnCoach: '{{emoji:hifz}} Менинг мураббийим',
    btnAudioCheck: '{{emoji:quran_mp3}} Аудио текшириш',
    btnStats: '{{emoji:statistics}} Ҳифз статистикаси',
    btnReminders: '{{emoji:notifications}} Билдиришнома созламалари',
    btnJuzMap: '{{emoji:statistics}} 30 Жуз харитаси',
    btnReciters: '{{emoji:quran_mp3}} Қори танлаш',
    btnBackHifz: '{{emoji:back}} ҲИФЗ менюси',
    btnBackMain: '{{emoji:home}} Асосий меню',
    lifelongActiveBadge: '{{emoji:admin}} УМРЛИК 30 ЖУЗ МУРОЖАА РЕЖИМИ ФАОЛ',
    lifelongLockedNote: '{{emoji:admin}} Умрлик 30 Жуз режими барча 6,236 оят (30 жуз) тўлиқ ёдлангач очилади.',
    ratingPrompt: ' Active Recall: Мусҳафга қарамасдан ўқиш натижангизни баҳоланг:',
    rate1: '1. Жуда яхши',
    rate2: '2. Яхши',
    rate3: '3. Ўртача',
    rate4: '4. Қийин',
    rate5: '5. Қайта ёдлаш керак',
    audioDisclaimer:
      '{{emoji:warning}} Муҳим эслатма: Автоматик нутқни аниқлаш (STT) сўз тушиб қолиши ёки алмашишини кўрсатишда ёрдам беради, бироқ тажвид ва махражни тўлиқ текшира олмайди. Асосий текширув учун малакали Қуръон устози (Қори)га ўқиб беринг.',
  },
  ru: {
    hubTitle: '{{emoji:hifz}} ASAKA ZIYO ХИФЗ — Центр заучивания Корана и Мурожаа',
    btnMyHifz: '{{emoji:quran}} Мой Хифз',
    btnNewMem: '{{emoji:brand}} Новое заучивание',
    btnMemorized: '{{emoji:quran}} Мои суры',
    btnTodayReview: '{{emoji:next}} Мурожаа на сегодня',
    btnCalendar: '{{emoji:calendar}} Календарь повторения',
    btnCoach: '{{emoji:hifz}} Мой наставник',
    btnAudioCheck: '{{emoji:quran_mp3}} Аудио-проверка',
    btnStats: '{{emoji:statistics}} Статистика Хифза',
    btnReminders: '{{emoji:notifications}} Напоминания Хифза',
    btnJuzMap: '{{emoji:statistics}} Карта 30 Джузов',
    btnReciters: '{{emoji:quran_mp3}} Выбор чтеца',
    btnBackHifz: '{{emoji:back}} Меню ХИФЗ',
    btnBackMain: '{{emoji:home}} Главное меню',
    lifelongActiveBadge: '{{emoji:admin}} ПОЖИЗНЕННЫЙ РЕЖИМ 30 ДЖУЗОВ АКТИВЕН',
    lifelongLockedNote: '{{emoji:admin}} Пожизненный режим 30 джузов открывается после полного заучивания всех 6 236 аятов.',
    ratingPrompt: ' Active Recall: Оцените чтение по памяти (до открытия Мусхафа):',
    rate1: '1. Отлично',
    rate2: '2. Хорошо',
    rate3: '3. Средне',
    rate4: '4. Сложно',
    rate5: '5. Выучить заново',
    audioDisclaimer:
      '{{emoji:warning}} Важно: Автоматическое распознавание речи (STT) помогает заметить пропуски или замены слов, но НЕ является проверкой таджвида и махраджа. Для полноценной проверки читайте квалифицированному устазу/кари.',
  },
  en: {
    hubTitle: '{{emoji:hifz}} ASAKA ZIYO HIFZ — Qurʼan Memorization & Murojaa Hub',
    btnMyHifz: '{{emoji:quran}} My Hifz',
    btnNewMem: '{{emoji:brand}} New Memorization',
    btnMemorized: '{{emoji:quran}} Memorized Surahs',
    btnTodayReview: '{{emoji:next}} Todayʼs Murojaa',
    btnCalendar: '{{emoji:calendar}} Review Calendar',
    btnCoach: '{{emoji:hifz}} My Hifz Coach',
    btnAudioCheck: '{{emoji:quran_mp3}} Audio Recitation Check',
    btnStats: '{{emoji:statistics}} Hifz Statistics',
    btnReminders: '{{emoji:notifications}} Hifz Reminders',
    btnJuzMap: '{{emoji:statistics}} 30-Juz Map',
    btnReciters: '{{emoji:quran_mp3}} Select Qori',
    btnBackHifz: '{{emoji:back}} HIFZ Menu',
    btnBackMain: '{{emoji:home}} Main Menu',
    lifelongActiveBadge: '{{emoji:admin}} LIFELONG 30-JUZ MAINTENANCE MODE ACTIVE',
    lifelongLockedNote: '{{emoji:admin}} Lifelong 30-Juz Mode unlocks once all 6,236 ayahs across all 30 juzs are verified memorized.',
    ratingPrompt: ' Active Recall: Rate your recitation from memory before checking the Mushaf:',
    rate1: '1. Excellent',
    rate2: '2. Good',
    rate3: '3. Average',
    rate4: '4. Difficult',
    rate5: '5. Re-memorize',
    audioDisclaimer:
      '{{emoji:warning}} Important: Automated speech recognition (STT) only assists with potential missing/substituted words and does NOT verify full tajwid or makhraj. Please recite to a qualified Qurʼan teacher (Qori).',
  },
};

export function getHifzStrings(locale: TelegramLocale): HifzLocaleStrings {
  if (locale === 'uz-Latn-new') {
    const src = HIFZ_STRINGS_BASE['uz-Latn'];
    const converted: Record<string, string> = {};
    for (const [k, v] of Object.entries(src)) {
      converted[k] = toNewUzbekAlphabet(v);
    }
    return converted as unknown as HifzLocaleStrings;
  }
  return HIFZ_STRINGS_BASE[locale] || HIFZ_STRINGS_BASE['uz-Latn'];
}

function adaptText(locale: TelegramLocale, uzLatn: string): string {
  return locale === 'uz-Latn-new' ? toNewUzbekAlphabet(uzLatn) : uzLatn;
}

export function buildProgressBar(percent: number, width = 12): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return '▓'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

export function formatHifzHomeText(
  profile: TelegramHifzProfile,
  stats: HifzStatsSummary,
  locale: TelegramLocale
): string {
  const s = getHifzStrings(locale);
  const bar = buildProgressBar(stats.memorizedPercent);
  const badge = profile.lifelong.active ? `\n${s.lifelongActiveBadge}\n` : '';

  if (locale === 'ru') {
    return (
      `${s.hubTitle}\n${badge}\n` +
      `{{emoji:statistics}} Общий прогресс: [${bar}] ${stats.memorizedPercent}%\n` +
      `• Выучено аятов: ${stats.memorizedAyahsCount} / ${stats.totalAyahsInQuran}\n` +
      `• Полных сур: ${stats.completedSurahsCount} / 114 (частично: ${stats.partialSurahsCount})\n` +
      `• Полных джузов: ${stats.completedJuzsCount} / 30 (частично: ${stats.partialJuzsCount})\n` +
      `• План на сегодня: ${stats.todayCompletedTasks}/${stats.todayTotalTasks} задач\n` +
      `• Ежедневная цель: ${profile.dailyNewAyahsGoal} нов. аятов · ${profile.dailyReviewMinutesGoal} мин мурожаа\n` +
      `• Серия дней: {{emoji:statistics}} ${stats.streakDays}\n\n` +
      `Выберите нужный раздел ниже:`
    );
  }
  if (locale === 'en') {
    return (
      `${s.hubTitle}\n${badge}\n` +
      `{{emoji:statistics}} Overall Progress: [${bar}] ${stats.memorizedPercent}%\n` +
      `• Memorized Ayahs: ${stats.memorizedAyahsCount} / ${stats.totalAyahsInQuran}\n` +
      `• Complete Surahs: ${stats.completedSurahsCount} / 114 (partial: ${stats.partialSurahsCount})\n` +
      `• Complete Juzs: ${stats.completedJuzsCount} / 30 (partial: ${stats.partialJuzsCount})\n` +
      `• Todayʼs Tasks: ${stats.todayCompletedTasks}/${stats.todayTotalTasks}\n` +
      `• Daily Goals: ${profile.dailyNewAyahsGoal} new ayahs · ${profile.dailyReviewMinutesGoal} min review\n` +
      `• Streak: {{emoji:statistics}} ${stats.streakDays} days\n\n` +
      `Choose a section below:`
    );
  }
  if (locale === 'uz-Cyrl') {
    return (
      `${s.hubTitle}\n${badge}\n` +
      `{{emoji:statistics}} Умумий натижа: [${bar}] ${stats.memorizedPercent}%\n` +
      `• Ёдланган оятлар: ${stats.memorizedAyahsCount} / ${stats.totalAyahsInQuran}\n` +
      `• Тўлиқ суралар: ${stats.completedSurahsCount} / 114 (қисман: ${stats.partialSurahsCount})\n` +
      `• Тўлиқ жузлар: ${stats.completedJuzsCount} / 30 (қисман: ${stats.partialJuzsCount})\n` +
      `• Бугунги режа: ${stats.todayCompletedTasks}/${stats.todayTotalTasks} вазифа\n` +
      `• Кунлик мақсад: ${profile.dailyNewAyahsGoal} янги оят · ${profile.dailyReviewMinutesGoal} дақ мурожаа\n` +
      `• Кетма-кетлик: {{emoji:statistics}} ${stats.streakDays} кун\n\n` +
      `Қуйидаги бўлимлардан бирини танланг:`
    );
  }

  return adaptText(
    locale,
    `${s.hubTitle}\n${badge}\n` +
      `{{emoji:statistics}} Umumiy natija: [${bar}] ${stats.memorizedPercent}%\n` +
      `• Yodlangan oyatlar: ${stats.memorizedAyahsCount} / ${stats.totalAyahsInQuran}\n` +
      `• Toʻliq suralar: ${stats.completedSurahsCount} / 114 (qisman: ${stats.partialSurahsCount})\n` +
      `• Toʻliq juzlar: ${stats.completedJuzsCount} / 30 (qisman: ${stats.partialJuzsCount})\n` +
      `• Bugungi reja: ${stats.todayCompletedTasks}/${stats.todayTotalTasks} vazifa\n` +
      `• Kunlik maqsad: ${profile.dailyNewAyahsGoal} yangi oyat · ${profile.dailyReviewMinutesGoal} daq murojaa\n` +
      `• Ketma-ketlik: {{emoji:statistics}} ${stats.streakDays} kun\n\n` +
      `Quyidagi boʻlimlardan birini tanlang:`
  );
}

export function buildHifzHomeKeyboard(locale: TelegramLocale): TelegramInlineKeyboardMarkup {
  const s = getHifzStrings(locale);
  return {
    inline_keyboard: [
      [
        { text: s.btnTodayReview, callback_data: 'hifz:today' },
        { text: s.btnNewMem, callback_data: 'hifz:new' },
      ],
      [
        { text: s.btnMemorized, callback_data: 'hifz:memorized:0' },
        { text: s.btnJuzMap, callback_data: 'hifz:juzmap' },
      ],
      [
        { text: s.btnCalendar, callback_data: 'hifz:calendar' },
        { text: s.btnStats, callback_data: 'hifz:stats' },
      ],
      [
        { text: s.btnCoach, callback_data: 'hifz:coach' },
        { text: s.btnAudioCheck, callback_data: 'hifz:audio' },
      ],
      [
        { text: s.btnReminders, callback_data: 'hifz:reminders' },
        { text: s.btnReciters, callback_data: 'hifz:reciters' },
      ],
      [{ text: s.btnBackMain, callback_data: 'nav:main' }],
    ],
  };
}

export function formatHifzTodayPlanText(
  plan: HifzDailyPlan,
  locale: TelegramLocale
): string {
  const s = getHifzStrings(locale);
  const typeLabel = (t: HifzDailyTask['taskType']): string => {
    const map: Record<HifzDailyTask['taskType'], Record<string, string>> = {
      error_drill: { 'uz-Latn': '{{emoji:warning}} Xatolar ustida ishlash', 'uz-Cyrl': '{{emoji:warning}} Хатолар устида ишлаш', ru: '{{emoji:warning}} Работа над ошибками', en: '{{emoji:warning}} Error Drill' },
      spaced_review: { 'uz-Latn': '{{emoji:next}} Oraliqli murojaa', 'uz-Cyrl': '{{emoji:next}} Оралиқли мурожаа', ru: '{{emoji:next}} Интервальное повторение', en: '{{emoji:next}} Spaced Review' },
      cumulative: { 'uz-Latn': ' Jamlovchi mustahkamlash', 'uz-Cyrl': ' Жамловчи мустаҳкамлаш', ru: ' Накопительное повторение', en: ' Cumulative Review' },
      new_memorization: { 'uz-Latn': '{{emoji:brand}} Yangi yodlash', 'uz-Cyrl': '{{emoji:brand}} Янги ёдлаш', ru: '{{emoji:brand}} Новое заучивание', en: '{{emoji:brand}} New Memorization' },
      lifelong_juz: { 'uz-Latn': '{{emoji:admin}} Umrlik Juz murojaasi', 'uz-Cyrl': '{{emoji:admin}} Умрлик Жуз мурожааси', ru: '{{emoji:admin}} Пожизненное повторение Джуза', en: '{{emoji:admin}} Lifelong Juz Review' },
    };
    const key = locale === 'uz-Latn-new' ? 'uz-Latn' : locale;
    return adaptText(locale, map[t][key] || map[t]['uz-Latn']);
  };

  const lines: string[] = [];
  const header =
    locale === 'ru'
      ? `{{emoji:next}} План Мурожаа на сегодня (${plan.dateKey})`
      : locale === 'en'
        ? `{{emoji:next}} Todayʼs Murojaa & Hifz Plan (${plan.dateKey})`
        : locale === 'uz-Cyrl'
          ? `{{emoji:next}} Бугунги Мурожаа ва Ҳифз режаси (${plan.dateKey})`
          : adaptText(locale, `{{emoji:next}} Bugungi Murojaa va Hifz rejasi (${plan.dateKey})`);

  lines.push(header);
  if (plan.isLifelongMode) lines.push(s.lifelongActiveBadge);
  if (plan.carriedOverCount > 0) {
    lines.push(
      locale === 'ru'
        ? `{{emoji:brand}} Учтены незавершённые задачи вчерашнего дня (${plan.carriedOverCount}) без перегрузки.`
        : locale === 'en'
          ? `{{emoji:brand}} Rebalanced ${plan.carriedOverCount} missed task(s) cleanly without overload.`
          : adaptText(locale, `{{emoji:brand}} Kechagi tugallanmagan vazifalar (${plan.carriedOverCount}) yuklamasiz qayta taqsimlandi.`)
    );
  }
  lines.push('');

  if (plan.tasks.length === 0) {
    lines.push(
      locale === 'ru'
        ? 'На сегодня задач нет. Отметьте выученные суры или начните новое заучивание!'
        : locale === 'en'
          ? 'No tasks scheduled yet. Mark memorized surahs or start new memorization!'
          : adaptText(locale, 'Hozircha vazifalar yoʻq. «Yodlaganlarim» boʻlimidan suralarni belgilang yoki «Yangi yodlash»ni boshlang!')
    );
  } else {
    plan.tasks.forEach((task, idx) => {
      const meta = getSurahMeta(task.surahNumber);
      const status = task.completed ? '{{emoji:success}}' : '';
      const title =
        task.taskType === 'lifelong_juz'
          ? `${task.juzNumber}-juz (${meta?.nameUz || ''})`
          : `${task.surahNumber}. ${meta?.nameUz || ''} (${task.startAyah}-${task.endAyah}-oyat)`;
      lines.push(
        `${status} ${idx + 1}. ${typeLabel(task.taskType)}\n` +
          `   {{emoji:quran}} ${title} · Juz ${task.juzNumber} · Sahifa ${task.pageStart}-${task.pageEnd} · ~${task.estimatedMinutes} min`
      );
    });
  }

  lines.push('');
  lines.push(
    locale === 'ru'
      ? `{{emoji:notifications}} Оценка времени: ~${plan.totalEstimatedMinutes} мин · Выполнено: ${plan.completedTaskCount}/${plan.tasks.length}`
      : locale === 'en'
        ? `{{emoji:notifications}} Est. time: ~${plan.totalEstimatedMinutes} min · Done: ${plan.completedTaskCount}/${plan.tasks.length}`
        : adaptText(locale, `{{emoji:notifications}} Taxminiy vaqt: ~${plan.totalEstimatedMinutes} daqiqa · Bajarildi: ${plan.completedTaskCount}/${plan.tasks.length}`)
  );

  return lines.join('\n');
}

export function buildHifzTodayPlanKeyboard(
  plan: HifzDailyPlan,
  locale: TelegramLocale
): TelegramInlineKeyboardMarkup {
  const s = getHifzStrings(locale);
  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];

  for (const task of plan.tasks) {
    if (task.completed) continue;
    const meta = getSurahMeta(task.surahNumber);
    const label =
      task.taskType === 'lifelong_juz'
 ? `${task.juzNumber}-juz`
 : `${meta?.nameUz || `Sura ${task.surahNumber}`} (${task.startAyah}-${task.endAyah})`;
    rows.push([{ text: label, callback_data: `hifz:task:${task.id}` }]);
  }

  rows.push([
 { text: locale === 'ru'? 'Обновить план': locale === 'en'? 'Refresh Plan': adaptText(locale, 'Rejani yangilash'), callback_data: 'hifz:today:refresh'},
    { text: s.btnBackHifz, callback_data: 'hifz:home' },
  ]);

  return { inline_keyboard: rows };
}

export function formatHifzTaskDetailText(
  task: HifzDailyTask,
  locale: TelegramLocale
): string {
  const s = getHifzStrings(locale);
  const meta = getSurahMeta(task.surahNumber);
  const verified = getVerifiedArabicAyahsForRange(task.surahNumber, task.startAyah, Math.min(task.endAyah, task.startAyah + 2));

  const header =
    task.taskType === 'lifelong_juz'
      ? `{{emoji:admin}} ${task.juzNumber}-Juz (${meta?.nameUz || ''})`
      : `{{emoji:quran}} ${task.surahNumber}. ${meta?.nameUz || ''} — ${meta?.nameAr || ''}`;

  const info =
    locale === 'ru'
      ? `• Аяты: ${task.startAyah}–${task.endAyah}\n• Джуз: ${task.juzNumber} · Страницы: ${task.pageStart}–${task.pageEnd}\n• Время: ~${task.estimatedMinutes} мин`
      : locale === 'en'
        ? `• Ayahs: ${task.startAyah}–${task.endAyah}\n• Juz: ${task.juzNumber} · Pages: ${task.pageStart}–${task.pageEnd}\n• Est. Time: ~${task.estimatedMinutes} min`
        : adaptText(locale, `• Oyatlar: ${task.startAyah}–${task.endAyah}\n• Juz: ${task.juzNumber} · Sahifa: ${task.pageStart}–${task.pageEnd}\n• Vaqt: ~${task.estimatedMinutes} daqiqa`);

  // Preserve Arabic Quran text verbatim if present in VERIFIED_AYAHS
  const previewBlock =
    verified.length > 0
      ? `\n\n{{emoji:hadith}} ${verified.map((v) => `(${v.numberInSurah}) ${v.textAr}`).join('\n')}`
      : '';

  return `${header}\n\n${info}${previewBlock}\n\n${s.ratingPrompt}`;
}

export function buildHifzTaskRatingKeyboard(
  task: HifzDailyTask,
  locale: TelegramLocale
): TelegramInlineKeyboardMarkup {
  const s = getHifzStrings(locale);
  return {
    inline_keyboard: [
      [
        { text: s.rate1, callback_data: `hifz:rate:${task.id}:1` },
        { text: s.rate2, callback_data: `hifz:rate:${task.id}:2` },
      ],
      [
        { text: s.rate3, callback_data: `hifz:rate:${task.id}:3` },
        { text: s.rate4, callback_data: `hifz:rate:${task.id}:4` },
      ],
      [{ text: s.rate5, callback_data: `hifz:rate:${task.id}:5` }],
      [
        {
 text: locale === 'ru'? 'Слушать чтеца': locale === 'en'? 'Listen Qori': adaptText(locale, 'Qori tilovatini tinglash'),
          callback_data: `hifz:play:${task.surahNumber}`,
        },
        {
 text: locale === 'ru'? 'Проверить голосом': locale === 'en'? 'Check by Voice': adaptText(locale, 'Ovozli tekshirish'),
          callback_data: `hifz:audiostart:${task.surahNumber}:${task.startAyah}:${task.endAyah}`,
        },
      ],
      [{ text: s.btnTodayReview, callback_data: 'hifz:today' }],
    ],
  };
}

export function formatMemorizedSurahsPage(
  profile: TelegramHifzProfile,
  page: number,
  locale: TelegramLocale
): { text: string; keyboard: TelegramInlineKeyboardMarkup } {
  const s = getHifzStrings(locale);
  const all = listAllSurahMeta();
  const pageSize = 12;
  const totalPages = Math.ceil(all.length / pageSize);
  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const slice = all.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const lines: string[] = [
    locale === 'ru'
 ? `Мои суры (114 сур · стр. ${safePage + 1}/${totalPages})`
      : locale === 'en'
 ? `Memorized Surahs (114 Surahs · Page ${safePage + 1}/${totalPages})`
 : adaptText(locale, `Yodlagan suralarim (114 sura · ${safePage + 1}/${totalPages}-sahifa)`),
    locale === 'ru'
 ? '[ON] Полностью · Частично · [OFF] Не начато\nНажмите на суру для отметки (полностью или диапазон аятов):'
      : locale === 'en'
 ? '[ON] Complete · Partial · [OFF] Not started\nTap any surah to mark full or partial ayah range:'
 : adaptText(locale, '[ON] Toʻliq · Qisman · [OFF] Boshlanmagan\nToʻliq yoki oyat oraligʻini belgilash uchun surani tanlang:'),
    '',
  ];

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  for (let i = 0; i < slice.length; i += 2) {
    const pair = slice.slice(i, i + 2);
    rows.push(
      pair.map((m) => {
        const prog = profile.surahs[String(m.number)];
 const icon = prog?.isComplete ? '[ON]': prog && prog.memorizedAyahCount > 0 ? '': '[OFF]';
        return {
          text: `${icon} ${m.number}. ${m.nameUz}`,
          callback_data: `hifz:surah:${m.number}:${safePage}`,
        };
      })
    );
  }

  for (const m of slice) {
    const prog = profile.surahs[String(m.number)];
    if (prog && prog.memorizedAyahCount > 0) {
      lines.push(
 `${prog.isComplete ? '[ON]': ''} ${m.number}. ${m.nameUz} (${prog.memorizedAyahCount}/${m.numberOfAyahs}) · ${formatRangesCompact(prog.memorizedRanges)} · ${prog.strengthScore}%`
      );
    }
  }

  const navRow: TelegramInlineKeyboardMarkup['inline_keyboard'][number] = [];
 if (safePage > 0) navRow.push({ text: '', callback_data: `hifz:memorized:${safePage - 1}`});
  navRow.push({ text: `${safePage + 1}/${totalPages}`, callback_data: 'hifz:juzmap' });
 if (safePage < totalPages - 1) navRow.push({ text: '', callback_data: `hifz:memorized:${safePage + 1}`});
  rows.push(navRow);
  rows.push([{ text: s.btnBackHifz, callback_data: 'hifz:home' }]);

  return { text: lines.join('\n'), keyboard: { inline_keyboard: rows } };
}

export function formatSurahHifzDetail(
  profile: TelegramHifzProfile,
  surahNumber: number,
  returnPage: number,
  locale: TelegramLocale
): { text: string; keyboard: TelegramInlineKeyboardMarkup } {
  const s = getHifzStrings(locale);
  const meta = getSurahMeta(surahNumber)!;
  const prog = profile.surahs[String(surahNumber)];
  const statusStr = prog?.isComplete
 ? '[ON] 100%'
    : prog && prog.memorizedAyahCount > 0
 ? `${prog.memorizedAyahCount}/${meta.numberOfAyahs} (${formatRangesCompact(prog.memorizedRanges)})`
 : `[OFF] 0/${meta.numberOfAyahs}`;

  const text =
 `${meta.number}. ${meta.nameUz} — ${meta.nameAr}\n`+
    `• ${adaptText(locale, `Jami oyatlar: ${meta.numberOfAyahs} · Juz: ${meta.primaryJuz} · Sahifa: ${meta.pageStart}-${meta.pageEnd}`)}\n` +
    `• ${adaptText(locale, `Holati: ${statusStr}`)}\n` +
    (prog
      ? `• ${adaptText(locale, `Mustahkamlik: ${prog.strengthScore}% · Keyingi murojaa: ${prog.nextReviewDate || '—'}`)}\n`
      : '');

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [
    [
      {
 text: locale === 'ru'? '[ON] Отметить полностью': locale === 'en'? '[ON] Mark Complete': adaptText(locale, '[ON] Toʻliq yodlandi'),
        callback_data: `hifz:markfull:${surahNumber}:${returnPage}`,
      },
      {
 text: locale === 'ru'? 'Диапазон аятов': locale === 'en'? 'Partial Range': adaptText(locale, 'Oyat oraligʻi (mas. 1-10)'),
        callback_data: `hifz:markrange:${surahNumber}`,
      },
    ],
    [
      {
 text: locale === 'ru'? 'Слушать суру': locale === 'en'? 'Listen Surah': adaptText(locale, 'Surani tinglash'),
        callback_data: `hifz:play:${surahNumber}`,
      },
      {
 text: locale === 'ru'? '[!] Отметить сложный аят': locale === 'en'? '[!] Log Difficult Ayah': adaptText(locale, '[!] Qiyin oyat qoʻshish'),
        callback_data: `hifz:logdiff:${surahNumber}`,
      },
    ],
    [
      {
 text: locale === 'ru'? 'Проверить голосом': locale === 'en'? 'Voice Check': adaptText(locale, 'Ovozli tekshirish'),
        callback_data: `hifz:audiostart:${surahNumber}:1:${Math.min(meta.numberOfAyahs, 7)}`,
      },
      ...(prog && prog.memorizedAyahCount > 0
        ? [
            {
 text: locale === 'ru'? 'Del Сбросить суру': locale === 'en'? 'Del Unmark Surah': adaptText(locale, 'Del Belgini oʻchirish'),
              callback_data: `hifz:unmark:${surahNumber}:${returnPage}`,
            },
          ]
        : []),
    ],
    [
      { text: s.btnMemorized, callback_data: `hifz:memorized:${returnPage}` },
      { text: s.btnBackHifz, callback_data: 'hifz:home' },
    ],
  ];

  return { text, keyboard: { inline_keyboard: rows } };
}

export function formatJuzMapView(
  profile: TelegramHifzProfile,
  locale: TelegramLocale
): { text: string; keyboard: TelegramInlineKeyboardMarkup } {
  const s = getHifzStrings(locale);
  const juzStats = computeAllJuzProgress(profile.surahs);
  const completed = juzStats.filter((j) => j.isComplete).length;

  const summary =
    locale === 'ru'
 ? `Карта 30 Джузов Корана (Завершено: ${completed}/30)\nНажмите на джуз, чтобы отметить его полностью выученным:`
      : locale === 'en'
 ? `30-Juz Qurʼan Map (Completed: ${completed}/30)\nTap any juz to mark all its ayahs memorized:`
 : adaptText(locale, `Qurʼoni Karimning 30 Juz xaritasi (Toʻliq: ${completed}/30)\nToʻliq yodlangan juzni belgilash uchun tanlang:`);

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  for (let i = 0; i < 30; i += 5) {
    rows.push(
      juzStats.slice(i, i + 5).map((j) => ({
 text: `${j.isComplete ? '[ON]': j.isPartial ? '': '[OFF]'}${j.juzNumber}`,
        callback_data: `hifz:markjuz:${j.juzNumber}`,
      }))
    );
  }
  rows.push([{ text: s.btnBackHifz, callback_data: 'hifz:home' }]);

  const note = profile.lifelong.active ? s.lifelongActiveBadge : s.lifelongLockedNote;
  return { text: `${summary}\n\n${note}`, keyboard: { inline_keyboard: rows } };
}

export function formatHifzStatsText(
  profile: TelegramHifzProfile,
  stats: HifzStatsSummary,
  locale: TelegramLocale
): string {
  const s = getHifzStrings(locale);
  const bar = buildProgressBar(stats.memorizedPercent, 14);
  const groupLine = profile.groupPlan
    ? `\n{{emoji:community}} ${profile.groupPlan.groupName} (${profile.groupPlan.weeklyAyahTarget} oyat/hafta)`
    : '';

  if (locale === 'ru') {
    return (
      `{{emoji:statistics}} Статистика ASAKA ZIYO ХИФЗ\n\n` +
      `[${bar}] ${stats.memorizedPercent}%\n\n` +
      `• Выучено аятов: ${stats.memorizedAyahsCount} / ${TOTAL_QURAN_AYAHS}\n` +
      `• Осталось аятов: ${stats.remainingAyahsCount}\n` +
      `• Полных сур: ${stats.completedSurahsCount} / 114 (частичных: ${stats.partialSurahsCount})\n` +
      `• Полных джузов: ${stats.completedJuzsCount} / 30 (частичных: ${stats.partialJuzsCount})\n` +
      `• Закреплённых сур (mastered): ${stats.masteredSurahsCount}\n` +
      `• Сложных аятов в работе: ${stats.difficultAyahsCount}\n` +
      `• Повторений за неделю / месяц: ${stats.weeklyReviewsCount} / ${stats.monthlyReviewsCount}\n` +
      `• Успешность мурожаа: ${stats.reviewSuccessRatePercent}%\n` +
      `• Серия: {{emoji:statistics}} ${stats.streakDays} дн. (рекорд: ${profile.longestStreakDays || stats.streakDays})\n` +
      `• Достижений:  ${profile.achievements.length}${groupLine}\n\n` +
      `${profile.lifelong.active ? s.lifelongActiveBadge : s.lifelongLockedNote}`
    );
  }
  if (locale === 'en') {
    return (
      `{{emoji:statistics}} ASAKA ZIYO HIFZ Statistics\n\n` +
      `[${bar}] ${stats.memorizedPercent}%\n\n` +
      `• Memorized Ayahs: ${stats.memorizedAyahsCount} / ${TOTAL_QURAN_AYAHS}\n` +
      `• Remaining Ayahs: ${stats.remainingAyahsCount}\n` +
      `• Complete Surahs: ${stats.completedSurahsCount} / 114 (partial: ${stats.partialSurahsCount})\n` +
      `• Complete Juzs: ${stats.completedJuzsCount} / 30 (partial: ${stats.partialJuzsCount})\n` +
      `• Mastered Surahs: ${stats.masteredSurahsCount}\n` +
      `• Active Difficult Ayahs: ${stats.difficultAyahsCount}\n` +
      `• Reviews (7d / 30d): ${stats.weeklyReviewsCount} / ${stats.monthlyReviewsCount}\n` +
      `• Recall Success Rate: ${stats.reviewSuccessRatePercent}%\n` +
      `• Streak: {{emoji:statistics}} ${stats.streakDays} days (best: ${profile.longestStreakDays || stats.streakDays})\n` +
      `• Milestones:  ${profile.achievements.length}${groupLine}\n\n` +
      `${profile.lifelong.active ? s.lifelongActiveBadge : s.lifelongLockedNote}`
    );
  }

  return adaptText(
    locale,
    `{{emoji:statistics}} ASAKA ZIYO HIFZ Statistikasi\n\n` +
      `[${bar}] ${stats.memorizedPercent}%\n\n` +
      `• Yodlangan oyatlar: ${stats.memorizedAyahsCount} / ${TOTAL_QURAN_AYAHS}\n` +
      `• Qolgan oyatlar: ${stats.remainingAyahsCount}\n` +
      `• Toʻliq suralar: ${stats.completedSurahsCount} / 114 (qisman: ${stats.partialSurahsCount})\n` +
      `• Toʻliq juzlar: ${stats.completedJuzsCount} / 30 (qisman: ${stats.partialJuzsCount})\n` +
      `• Mustahkamlangan suralar: ${stats.masteredSurahsCount}\n` +
      `• Qiyin oyatlar (faol): ${stats.difficultAyahsCount}\n` +
      `• Haftalik / Oylik murojaa: ${stats.weeklyReviewsCount} / ${stats.monthlyReviewsCount}\n` +
      `• Murojaa muvaffaqiyati: ${stats.reviewSuccessRatePercent}%\n` +
      `• Ketma-ketlik: {{emoji:statistics}} ${stats.streakDays} kun (rekord: ${profile.longestStreakDays || stats.streakDays})\n` +
      `• Yutuqlar:  ${profile.achievements.length}${groupLine}\n\n` +
      `${profile.lifelong.active ? s.lifelongActiveBadge : s.lifelongLockedNote}`
  );
}

export function formatHifzCalendarText(
  calendar: Array<{ dateKey: string; items: string[] }>,
  isLifelong: boolean,
  locale: TelegramLocale
): string {
  const header =
    locale === 'ru'
      ? `{{emoji:calendar}} Календарь Мурожаа на 7 дней${isLifelong ? ' (30 Джузов)' : ''}`
      : locale === 'en'
        ? `{{emoji:calendar}} 7-Day Murojaa Schedule${isLifelong ? ' (Lifelong 30 Juz)' : ''}`
        : adaptText(locale, `{{emoji:calendar}} 7 kunlik Murojaa kalendari${isLifelong ? ' (Umrlik 30 Juz)' : ''}`);

  const lines = calendar.map((day, idx) => {
    const body = day.items.length > 0 ? day.items.join(', ') : '—';
    return `${idx === 0 ? '{{emoji:brand}}' : ''} ${day.dateKey}: ${body}`;
  });
  return `${header}\n\n${lines.join('\n')}`;
}

export function buildHifzRemindersKeyboard(
  profile: TelegramHifzProfile,
  locale: TelegramLocale
): TelegramInlineKeyboardMarkup {
  const s = getHifzStrings(locale);
  const r = profile.reminders;
 const onOff = (v: boolean) => (v ? '[ON]': '');
  return {
    inline_keyboard: [
      [
        {
 text: `${onOff(r.morningEnabled)} ${r.morningTime}`,
          callback_data: 'hifz:rem:morning',
        },
        {
 text: `${onOff(r.middayEnabled)} ${r.middayTime}`,
          callback_data: 'hifz:rem:midday',
        },
      ],
      [
        {
 text: `${onOff(r.eveningEnabled)} ${r.eveningTime}`,
          callback_data: 'hifz:rem:evening',
        },
        {
 text: `${onOff(r.dueReviewAlertEnabled)} Murojaa`,
          callback_data: 'hifz:rem:due',
        },
      ],
      [
        {
 text: `${onOff(r.newMemorizationReminderEnabled)} Yangi yodlash`,
          callback_data: 'hifz:rem:new',
        },
      ],
      [{ text: s.btnBackHifz, callback_data: 'hifz:home' }],
    ],
  };
}

export function buildHifzRecitersKeyboard(
  profile: TelegramHifzProfile,
  locale: TelegramLocale
): TelegramInlineKeyboardMarkup {
  const s = getHifzStrings(locale);
  const reciters = getHifzReciterOptions();
  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = reciters.map((r) => [
    {
 text: `${profile.preferredReciterId === r.id ? '[ON] ': ''}${r.name}`,
      callback_data: `hifz:setreciter:${r.id}`,
    },
  ]);
  rows.push([{ text: s.btnBackHifz, callback_data: 'hifz:home' }]);
  return { inline_keyboard: rows };
}

export function formatHifzAudioCheckResult(
  result: HifzAudioCheckResult,
  locale: TelegramLocale
): string {
  const s = getHifzStrings(locale);
  const meta = getSurahMeta(result.surahNumber);
  const title = `{{emoji:quran_mp3}} ${meta?.number || result.surahNumber}. ${meta?.nameUz || ''} (${result.startAyah}-${result.endAyah})`;

  if (!result.ok) {
    return `${title}\n\n{{emoji:error}} ${result.error || 'Audio check failed.'}\n\n${s.audioDisclaimer}`;
  }

  const pct =
    result.hasVerifiedArabicReference && result.matchedWordRatio !== undefined
      ? `${Math.round(result.matchedWordRatio * 100)}%`
      : '—';

  const lines: string[] = [title, ''];
  if (result.transcript) {
    lines.push(`{{emoji:quran}} STT: ${result.transcript.slice(0, 450)}`);
  }
  if (result.hasVerifiedArabicReference) {
    lines.push(
      locale === 'ru'
        ? `{{emoji:statistics}} Совпадение слов (STT): ${pct}`
        : locale === 'en'
          ? `{{emoji:statistics}} Word Match Ratio (STT): ${pct}`
          : adaptText(locale, `{{emoji:statistics}} Soʻz mosligi (STT): ${pct}`)
    );
    if (result.potentiallyMissingWords.length > 0) {
      lines.push(
        `{{emoji:warning}} ${locale === 'ru' ? 'Возможно пропущены слова' : locale === 'en' ? 'Potentially omitted words' : adaptText(locale, 'Ehtimoliy tushib qolgan soʻzlar')}: ${result.potentiallyMissingWords.join(' · ')}`
      );
    }
    if (result.potentiallySubstitutedWords.length > 0) {
      lines.push(
        `{{emoji:next}} ${locale === 'ru' ? 'Возможные замены' : locale === 'en' ? 'Possible substitutions' : adaptText(locale, 'Ehtimoliy almashgan soʻzlar')}: ${result.potentiallySubstitutedWords.join(' · ')}`
      );
    }
  } else {
    lines.push(
      locale === 'ru'
        ? '{{emoji:warning}} Для данного диапазона полная побуквенная сверка недоступна локально — выше приведена распознанная расшифровка для самопроверки по Мусхафу.'
        : locale === 'en'
          ? '{{emoji:warning}} Local verse-by-verse reference is not stored for this slice; compare the transcript above directly against your Mushaf.'
          : adaptText(locale, '{{emoji:warning}} Ushbu oyatlar uchun mahalliy matn taqqoslash bazasi kiritilmagan; yuqoridagi matnni Musʼhaf bilan solishtiring.')
    );
  }
  lines.push('');
  lines.push(s.audioDisclaimer);
  return lines.join('\n');
}
