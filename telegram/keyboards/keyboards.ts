/**
 * ASAKA ZIYO — Telegram Super Platform Keyboards Factory (Reply + Complete Audited Inline Set)
 *
 * Every button label is localized across all 5 official ASAKA ZIYO languages,
 * uses CustomEmojiRegistry (with honest Unicode fallback when custom keyboard icons
 * are not verified/enabled), and maps to a real verified callback or HTTPS Mini App URL.
 */

import {
  TELEGRAM_SUPPORTED_LOCALES,
  TelegramBotSettingsRecord,
  TelegramBroadcastRecord,
  TelegramChannelRecord,
  TelegramContentDraftRecord,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramReplyKeyboardMarkup,
  TelegramSupportTicketRecord,
  TelegramUserRecord,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import { buildMiniAppEntryUrl } from '../miniapp/miniAppConfig';

export type ReplyKeyboardAction =
  | 'prayer'
  | 'quran_center'
  | 'ai'
  | 'academy_quiz'
  | 'support'
  | 'menu';

function makeAppAction(
  config: TelegramPlatformConfig,
  locale: TelegramLocale,
  section: 'home' | 'prayer' | 'quran' | 'masjid-tv',
  useMiniApp: boolean
): { url?: string; web_app?: { url: string } } {
  const targetUrl = buildMiniAppEntryUrl(config, locale, section);
  if (useMiniApp && targetUrl.startsWith('https://')) {
    return { web_app: { url: targetUrl } };
  }
  return { url: targetUrl };
}

/**
 * Persistent ReplyKeyboardMarkup working harmoniously alongside Inline keyboards.
 */
export function buildPersistentReplyKeyboard(
  locale: TelegramLocale
): TelegramReplyKeyboardMarkup {
  const rb = getTelegramLocaleBundle(locale).replyButtons;
  return {
    keyboard: [
      [{ text: rb.prayerTimes }, { text: rb.quranCenter }],
      [{ text: rb.aiAssistant }, { text: rb.academyQuiz }],
      [{ text: rb.support }, { text: rb.menuMiniApp }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: 'ASAKA ZIYO...',
  };
}

/**
 * Matches a tapped persistent Reply Keyboard label across ALL 5 languages
 * (so tapping an old button right after switching language still works smoothly).
 */
export function matchReplyKeyboardAction(text: string | undefined): ReplyKeyboardAction | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
    const rb = getTelegramLocaleBundle(loc).replyButtons;
    if (trimmed === rb.prayerTimes) return 'prayer';
    if (trimmed === rb.quranCenter) return 'quran_center';
    if (trimmed === rb.aiAssistant) return 'ai';
    if (trimmed === rb.academyQuiz) return 'academy_quiz';
    if (trimmed === rb.support) return 'support';
    if (trimmed === rb.menuMiniApp) return 'menu';
  }
  return null;
}

export function buildOnboardingLanguageKeyboard(
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const rows = TELEGRAM_SUPPORTED_LOCALES.map((loc) => [
    emoji.buildKeyboardButton('language.globe', TELEGRAM_LANGUAGE_NATIVE_NAMES[loc], {
      callback_data: `onboard:lang:${loc}`,
    }),
  ]);
  return { inline_keyboard: rows };
}

export function buildMainMenuKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry,
  config: TelegramPlatformConfig,
  options?: { isAdmin?: boolean; miniAppEnabled?: boolean }
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const useMiniApp = Boolean(options?.miniAppEnabled);

  const bottomRow: TelegramInlineKeyboardButton[] = [];
  if (options?.isAdmin) {
    bottomRow.push(
      emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' })
    );
  }
  bottomRow.push(emoji.buildKeyboardButton('nav.help', b.help, { callback_data: 'nav:help' }));

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prayer', b.prayerTimes, { callback_data: 'nav:prayer' }),
        emoji.buildKeyboardButton('nav.quran', b.quran, { callback_data: 'nav:quran' }),
      ],
      [
        emoji.buildKeyboardButton('nav.hadith', b.hadith, { callback_data: 'nav:hadith' }),
        emoji.buildKeyboardButton('nav.dhikr', b.dhikr, { callback_data: 'nav:dhikr' }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', b.academyLessons, { callback_data: 'nav:academy' }),
        emoji.buildKeyboardButton('brand.star', b.dailyQuiz, { callback_data: 'quiz:start' }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', b.mediaLibrary, { callback_data: 'library:view:articles:0' }),
        emoji.buildKeyboardButton('nav.ai', b.aiAssistant, { callback_data: 'nav:ai' }),
      ],
      [
        emoji.buildKeyboardButton('admin.shield', b.supportCenter, { callback_data: 'nav:support' }),
        emoji.buildKeyboardButton('brand.star', b.globalSearch, { callback_data: 'nav:search' }),
      ],
      [
        emoji.buildKeyboardButton('nav.profile', b.profile, { callback_data: 'nav:profile' }),
        emoji.buildKeyboardButton('nav.settings', b.settings, { callback_data: 'nav:settings' }),
      ],
      [
        emoji.buildKeyboardButton('nav.language', b.language, { callback_data: 'nav:language' }),
        emoji.buildKeyboardButton('nav.channels', b.channels, { callback_data: 'nav:channels' }),
      ],
      [
        emoji.buildKeyboardButton(
          useMiniApp ? 'nav.miniapp' : 'nav.web',
          useMiniApp ? b.miniApp : b.webApp,
          makeAppAction(config, locale, 'home', useMiniApp)
        ),
        emoji.buildKeyboardButton('brand.mosque', b.mosqueInfo, { callback_data: 'nav:mosque' }),
      ],
      bottomRow,
    ],
  };
}

export function buildLanguageKeyboard(
  currentLocale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(currentLocale);

  const langRows = TELEGRAM_SUPPORTED_LOCALES.map((loc) => {
    const label = TELEGRAM_LANGUAGE_NATIVE_NAMES[loc];
    const isCurrent = loc === currentLocale;
    return [
      emoji.buildKeyboardButton(
        isCurrent ? 'language.selected' : 'language.globe',
        label,
        { callback_data: `lang:${loc}` }
      ),
    ];
  });

  return {
    inline_keyboard: [
      ...langRows,
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildSettingsKeyboard(
  user: TelegramUserRecord,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(user.language);
  const b = dict.buttons;
  const stateTag = (on: boolean) => (on ? dict.statusEnabled : dict.statusDisabled);

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton(
          user.prayerNotificationsEnabled ? 'settings.bell_on' : 'settings.bell_off',
          `${b.togglePrayerAlerts}: ${stateTag(user.prayerNotificationsEnabled)}`,
          { callback_data: 'settings:toggle:prayerNotificationsEnabled' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          user.dailyWisdomEnabled ? 'settings.bell_on' : 'settings.bell_off',
          `${b.toggleDailyWisdom}: ${stateTag(user.dailyWisdomEnabled)}`,
          { callback_data: 'settings:toggle:dailyWisdomEnabled' }
        ),
      ],
      [
        emoji.buildKeyboardButton(
          user.announcementsEnabled ? 'settings.bell_on' : 'settings.bell_off',
          `${b.toggleAnnouncements}: ${stateTag(user.announcementsEnabled)}`,
          { callback_data: 'settings:toggle:announcementsEnabled' }
        ),
      ],
      [
        emoji.buildKeyboardButton('nav.language', b.changeLanguage, {
          callback_data: 'nav:language',
        }),
        emoji.buildKeyboardButton('settings.bell_off', b.stopNotifications, {
          callback_data: 'settings:stop_all',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildPrayerKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry,
  config: TelegramPlatformConfig,
  miniAppEnabled = false
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prayer', b.refreshPrayer, {
          callback_data: 'prayer:refresh',
        }),
        emoji.buildKeyboardButton('brand.crescent', b.ramadanMode, {
          callback_data: 'prayer:ramadan',
        }),
      ],
      [
        emoji.buildKeyboardButton('calendar.date', b.religiousCalendar, {
          callback_data: 'prayer:calendar',
        }),
        emoji.buildKeyboardButton('brand.mosque', b.mosqueInfo, {
          callback_data: 'nav:mosque',
        }),
      ],
      [
        emoji.buildKeyboardButton(
          'brand.mosque',
          b.masjidTv,
          makeAppAction(config, locale, 'masjid-tv', miniAppEnabled)
        ),
        emoji.buildKeyboardButton(
          miniAppEnabled ? 'nav.miniapp' : 'nav.web',
          b.openWebApp,
          makeAppAction(config, locale, 'prayer', miniAppEnabled)
        ),
      ],
      [
        emoji.buildKeyboardButton('nav.settings', b.togglePrayerAlerts, {
          callback_data: 'nav:settings',
        }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildQuranKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  emoji: CustomEmojiRegistry,
  config: TelegramPlatformConfig,
  miniAppEnabled = false
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, { callback_data: `quran:ayah:${prevIdx}` }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, { callback_data: `quran:ayah:${nextIdx}` }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', b.allSurahs, { callback_data: 'quran:surahs:0' }),
        emoji.buildKeyboardButton('brand.book', b.tafsirHilol, { callback_data: 'quran:tafsir:0' }),
      ],
      [
        emoji.buildKeyboardButton('brand.star', b.khatmPlanner, { callback_data: 'quran:khatm' }),
        emoji.buildKeyboardButton('brand.star', b.bookmarkToggle, {
          callback_data: `bookmark:ayah:${currentIndex}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.quran', b.quranSearch, { callback_data: 'quran:search' }),
        emoji.buildKeyboardButton(
          miniAppEnabled ? 'nav.miniapp' : 'nav.web',
          b.openWebApp,
          makeAppAction(config, locale, 'quran', miniAppEnabled)
        ),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildSurahListKeyboard(
  locale: TelegramLocale,
  surahs: Array<{ number: number; nameUz: string }>,
  emoji: CustomEmojiRegistry,
  page = 0,
  totalPages = 1
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (let i = 0; i < surahs.length; i += 2) {
    const pair = surahs.slice(i, i + 2).map((s) =>
      emoji.buildKeyboardButton('brand.book', `${s.number}. ${s.nameUz}`, {
        callback_data: `quran:surah:${s.number}`,
      })
    );
    rows.push(pair);
  }

  if (totalPages > 1) {
    const prevPage = (page - 1 + totalPages) % totalPages;
    const nextPage = (page + 1) % totalPages;
    rows.push([
      emoji.buildKeyboardButton('nav.prev', `${dict.buttons.prevItem} (${prevPage + 1}/${totalPages})`, {
        callback_data: `quran:surahs:${prevPage}`,
      }),
      emoji.buildKeyboardButton('nav.next', `${dict.buttons.nextItem} (${nextPage + 1}/${totalPages})`, {
        callback_data: `quran:surahs:${nextPage}`,
      }),
    ]);
  }

  rows.push([
    emoji.buildKeyboardButton('nav.quran', dict.buttons.quranSearch, { callback_data: 'quran:search' }),
    emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildTafsirKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prev', dict.buttons.prevItem, {
          callback_data: `quran:tafsir:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', dict.buttons.nextItem, {
          callback_data: `quran:tafsir:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.quran', dict.buttons.quran, { callback_data: 'nav:quran' }),
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildKhatmKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('status.ok', b.khatmLogJuz, { callback_data: 'quran:khatm:log_juz' }),
        emoji.buildKeyboardButton('settings.gear', b.khatmStartPlan, {
          callback_data: 'quran:khatm:set_days',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.quran', b.quran, { callback_data: 'nav:quran' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildHadithKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  emoji: CustomEmojiRegistry,
  collection: 'all' | 'bukhari' | 'muslim' | 'nawawi' = 'all'
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, {
          callback_data: `hadith:col:${collection}:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, {
          callback_data: `hadith:col:${collection}:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.hadith', b.hadithBukhari, {
          callback_data: 'hadith:col:bukhari:0',
        }),
        emoji.buildKeyboardButton('nav.hadith', b.hadithMuslim, {
          callback_data: 'hadith:col:muslim:0',
        }),
        emoji.buildKeyboardButton('nav.hadith', b.hadithNawawi, {
          callback_data: 'hadith:col:nawawi:0',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.star', b.bookmarkToggle, {
          callback_data: `bookmark:hadith:${currentIndex}`,
        }),
        emoji.buildKeyboardButton('brand.book', b.hadithSearch, { callback_data: 'hadith:search' }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildDhikrKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  tasbehCount: number,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('content.tasbeh', `${b.tasbehPlus} (${tasbehCount})`, {
          callback_data: `dhikr:tasbeh:${currentIndex}:${tasbehCount + 1}`,
        }),
        emoji.buildKeyboardButton('settings.gear', b.tasbehReset, {
          callback_data: `dhikr:tasbeh:${currentIndex}:0`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, {
          callback_data: `dhikr:view:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, {
          callback_data: `dhikr:view:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('settings.gear', b.tasbehSetGoal, {
          callback_data: `dhikr:goal:${currentIndex}`,
        }),
        emoji.buildKeyboardButton('content.dua', b.situationalDuas, {
          callback_data: 'dua:view:0',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', b.glossary, { callback_data: 'nav:glossary' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildDuaKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, { callback_data: `dua:view:${prevIdx}` }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, { callback_data: `dua:view:${nextIdx}` }),
      ],
      [
        emoji.buildKeyboardButton('nav.dhikr', b.dhikr, { callback_data: 'nav:dhikr' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildAcademyKeyboard(
  locale: TelegramLocale,
  currentIndex: number,
  total: number,
  lessonId: string,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('status.ok', b.academyMarkDone, {
          callback_data: `academy:done:${currentIndex}:${lessonId}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, {
          callback_data: `academy:lesson:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, {
          callback_data: `academy:lesson:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.star', b.dailyQuiz, { callback_data: 'quiz:start' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildQuizQuestionKeyboard(
  locale: TelegramLocale,
  options: string[],
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const labels = ['A', 'B', 'C', 'D'];
  const rows: TelegramInlineKeyboardButton[][] = options.slice(0, 4).map((opt, idx) => [
    {
      text: `${labels[idx] || idx + 1}) ${opt.slice(0, 56)}`,
      callback_data: `quiz:ans:${idx}`,
    },
  ]);
  rows.push([
    emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
  ]);
  return { inline_keyboard: rows };
}

export function buildQuizResultKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('brand.star', b.leaderboard, { callback_data: 'quiz:leaderboard' }),
        emoji.buildKeyboardButton('brand.star', b.dailyQuiz, { callback_data: 'quiz:start' }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildMediaLibraryKeyboard(
  locale: TelegramLocale,
  kind: 'articles' | 'news' | 'announcements' | 'adhan',
  currentIndex: number,
  total: number,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prev', b.prevItem, {
          callback_data: `library:view:${kind}:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', b.nextItem, {
          callback_data: `library:view:${kind}:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', dict.mediaArticlesLabel, {
          callback_data: 'library:view:articles:0',
        }),
        emoji.buildKeyboardButton('channel.broadcast', dict.mediaNewsLabel, {
          callback_data: 'library:view:news:0',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.channels', dict.mediaAnnouncementsLabel, {
          callback_data: 'library:view:announcements:0',
        }),
        emoji.buildKeyboardButton('nav.prayer', dict.mediaAdhanLabel, {
          callback_data: 'library:view:adhan:0',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildSupportHomeKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('admin.shield', b.supportImam, {
          callback_data: 'support:cat:imam_question',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.mosque', b.supportService, {
          callback_data: 'support:cat:mosque_service',
        }),
        emoji.buildKeyboardButton('settings.gear', b.supportTech, {
          callback_data: 'support:cat:technical',
        }),
      ],
      [
        emoji.buildKeyboardButton('profile.user', b.supportMyTickets, {
          callback_data: 'support:my_tickets',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildProfileKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('brand.star', b.myBookmarks, { callback_data: 'nav:bookmarks' }),
        emoji.buildKeyboardButton('brand.book', b.khatmPlanner, { callback_data: 'quran:khatm' }),
      ],
      [
        emoji.buildKeyboardButton('nav.language', b.changeLanguage, {
          callback_data: 'nav:language',
        }),
        emoji.buildKeyboardButton('nav.settings', b.settings, {
          callback_data: 'nav:settings',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildAiModeKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('settings.gear', b.aiClearHistory, {
          callback_data: 'ai:clear',
        }),
        emoji.buildKeyboardButton('nav.back', b.exitAiMode, {
          callback_data: 'ai:exit',
        }),
      ],
    ],
  };
}

// ---------------------------------------------------------------------------
// Super Admin Control Center Keyboards
// ---------------------------------------------------------------------------

export function buildAdminHomeKeyboard(
  locale: TelegramLocale,
  settings: TelegramBotSettingsRecord,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const tag = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('channel.broadcast', b.adminBroadcasts, {
          callback_data: 'admin:broadcasts',
        }),
        emoji.buildKeyboardButton('admin.shield', b.adminSupport, {
          callback_data: 'admin:support',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.channels', b.adminChannels, {
          callback_data: 'admin:channels',
        }),
        emoji.buildKeyboardButton('brand.book', b.adminContent, {
          callback_data: 'admin:content',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.ai', b.adminAiControl, {
          callback_data: 'admin:ai',
        }),
        emoji.buildKeyboardButton('profile.user', b.adminUsers, {
          callback_data: 'admin:users',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.star', b.adminEmojis, {
          callback_data: 'admin:emojis',
        }),
        emoji.buildKeyboardButton('brand.star', b.adminAnalytics, {
          callback_data: 'admin:analytics',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.ai', `${b.adminToggleAi}: ${tag(settings.aiAssistantEnabled)}`, {
          callback_data: 'admin:ai:toggle',
        }),
        emoji.buildKeyboardButton(
          'status.lock',
          `${b.adminToggleMaintenance}: ${tag(settings.maintenanceMode)}`,
          { callback_data: 'admin:maintenance:toggle' }
        ),
      ],
      [
        emoji.buildKeyboardButton('admin.shield', b.adminDiagnostics, {
          callback_data: 'admin:diagnostics',
        }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildAdminAiControlKeyboard(
  locale: TelegramLocale,
  settings: TelegramBotSettingsRecord,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const tag = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('status.ok', b.adminAiProbe, {
          callback_data: 'admin:ai:probe',
        }),
      ],
      [
        emoji.buildKeyboardButton('settings.gear', b.adminAiSwitchPrimary, {
          callback_data: 'admin:ai:set_primary',
        }),
      ],
      [
        emoji.buildKeyboardButton(
          'nav.ai',
          `${b.adminAiToggleFallback}: ${tag(Boolean(settings.aiAutoFallbackEnabled))}`,
          { callback_data: 'admin:ai:toggle_fallback' }
        ),
        emoji.buildKeyboardButton(
          'nav.ai',
          `${b.adminAiToggleVoice}: ${tag(Boolean(settings.aiVoiceReplyEnabled ?? true))}`,
          { callback_data: 'admin:ai:toggle_voice' }
        ),
      ],
      [
        emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildAdminSupportKeyboard(
  locale: TelegramLocale,
  tickets: TelegramSupportTicketRecord[],
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (const t of tickets.slice(0, 5)) {
    rows.push([
      {
        text: `💬 ${t.id} (${t.status}) — ${t.userName.slice(0, 22)}`,
        callback_data: `admin:support:reply:${t.id}`,
      },
      {
        text: '✅ Close',
        callback_data: `admin:support:close:${t.id}`,
      },
    ]);
  }

  rows.push([
    emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
    emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildAdminBroadcastsKeyboard(
  locale: TelegramLocale,
  campaigns: TelegramBroadcastRecord[],
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const rows: TelegramInlineKeyboardButton[][] = [
    [
      emoji.buildKeyboardButton('channel.broadcast', b.adminBroadcastNew, {
        callback_data: 'admin:broadcast:new',
      }),
    ],
  ];

  for (const c of campaigns.slice(0, 4)) {
    const actionRow: TelegramInlineKeyboardButton[] = [];
    if (c.status === 'draft' || c.status === 'paused') {
      actionRow.push({
        text: `▶️ Start ${c.title.slice(0, 14)}`,
        callback_data: `admin:broadcast:start:${c.id}`,
      });
    } else if (c.status === 'running') {
      actionRow.push({
        text: `⏸ Pause ${c.title.slice(0, 14)}`,
        callback_data: `admin:broadcast:pause:${c.id}`,
      });
    }
    if (c.status !== 'completed' && c.status !== 'cancelled') {
      actionRow.push({
        text: '🧪 Preview',
        callback_data: `admin:broadcast:test:${c.id}`,
      });
      actionRow.push({
        text: '⛔ Cancel',
        callback_data: `admin:broadcast:cancel:${c.id}`,
      });
    }
    if (actionRow.length > 0) rows.push(actionRow);
  }

  rows.push([
    emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
    emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildAdminContentKeyboard(
  locale: TelegramLocale,
  drafts: TelegramContentDraftRecord[],
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (const d of drafts.slice(0, 5)) {
    if (d.status !== 'published') {
      rows.push([
        {
          text: `📢 Publish: ${d.title.slice(0, 26)}`,
          callback_data: `admin:content:publish:${d.id}`,
        },
      ]);
    }
  }

  rows.push([
    emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
    emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildAdminUsersKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const b = getTelegramLocaleBundle(locale).buttons;
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('profile.user', '🔍 Search User (ID / @username)', {
          callback_data: 'admin:users:search',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildAdminChannelsKeyboard(
  locale: TelegramLocale,
  channels: TelegramChannelRecord[],
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (const ch of channels.slice(0, 5)) {
    const autoTag = ch.autoPublishPrayerTimes ? dict.statusEnabled : dict.statusDisabled;
    rows.push([
      emoji.buildKeyboardButton('status.ok', `${ch.username}: ${b.adminCheckChannelPerms}`, {
        callback_data: `admin:channel:check:${ch.id}`,
      }),
    ]);
    rows.push([
      emoji.buildKeyboardButton('channel.broadcast', `${b.adminPublishPrayerNow} (${ch.username})`, {
        callback_data: `admin:channel:publish_prayer:${ch.id}`,
      }),
      emoji.buildKeyboardButton('settings.gear', `${b.adminToggleAutoPublish}: ${autoTag}`, {
        callback_data: `admin:channel:toggle_auto:${ch.id}`,
      }),
    ]);
  }

  rows.push([
    emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
    emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildAdminEmojisKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('status.ok', b.adminVerifyEmojis, {
          callback_data: 'admin:emojis:verify',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.star', b.adminTestEmojiSend, {
          callback_data: 'admin:emojis:test',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.admin', b.adminPanel, { callback_data: 'admin:home' }),
        emoji.buildKeyboardButton('nav.back', b.backToMenu, { callback_data: 'nav:home' }),
      ],
    ],
  };
}

export function buildChannelsKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('channel.broadcast', b.openChannelPrimary, {
          url: 'https://t.me/Asaka_Ziyo',
        }),
      ],
      [
        emoji.buildKeyboardButton('brand.book', b.openChannelSecondary, {
          url: 'https://t.me/muhiddinsahhofuz',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', b.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildBackOnlyKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}
