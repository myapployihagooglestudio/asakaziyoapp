/**
 * ASAKA ZIYO — Telegram Inline Keyboards Factory (Complete Audited Set)
 *
 * Every button label is localized across all 5 official ASAKA ZIYO languages,
 * uses CustomEmojiRegistry (with honest Unicode fallback when custom keyboard icons
 * are not verified/enabled), and maps to a real verified callback or HTTPS Mini App URL.
 */

import {
  TELEGRAM_SUPPORTED_LOCALES,
  TelegramBotSettingsRecord,
  TelegramChannelRecord,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramUserRecord,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import { buildMiniAppEntryUrl } from '../miniapp/miniAppConfig';

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
        emoji.buildKeyboardButton('nav.ai', b.aiAssistant, { callback_data: 'nav:ai' }),
        emoji.buildKeyboardButton('nav.profile', b.profile, { callback_data: 'nav:profile' }),
      ],
      [
        emoji.buildKeyboardButton('nav.language', b.language, { callback_data: 'nav:language' }),
        emoji.buildKeyboardButton('nav.settings', b.settings, { callback_data: 'nav:settings' }),
      ],
      [
        emoji.buildKeyboardButton('nav.channels', b.channels, { callback_data: 'nav:channels' }),
        emoji.buildKeyboardButton(
          useMiniApp ? 'nav.miniapp' : 'nav.web',
          useMiniApp ? b.miniApp : b.webApp,
          makeAppAction(config, locale, 'home', useMiniApp)
        ),
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
        emoji.buildKeyboardButton(
          miniAppEnabled ? 'nav.miniapp' : 'nav.web',
          b.openWebApp,
          makeAppAction(config, locale, 'prayer', miniAppEnabled)
        ),
      ],
      [
        emoji.buildKeyboardButton(
          'brand.mosque',
          b.masjidTv,
          makeAppAction(config, locale, 'masjid-tv', miniAppEnabled)
        ),
        emoji.buildKeyboardButton('nav.settings', b.togglePrayerAlerts, {
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
        emoji.buildKeyboardButton('brand.book', b.surahList, { callback_data: 'quran:surahs' }),
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
  emoji: CustomEmojiRegistry
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

  rows.push([
    emoji.buildKeyboardButton('nav.quran', dict.buttons.quran, { callback_data: 'nav:quran' }),
    emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildHadithKeyboard(
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
          callback_data: `hadith:view:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', dict.buttons.nextItem, {
          callback_data: `hadith:view:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
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
  const prevIdx = (currentIndex - 1 + total) % total;
  const nextIdx = (currentIndex + 1) % total;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('content.tasbeh', `${dict.buttons.tasbehPlus} (${tasbehCount})`, {
          callback_data: `dhikr:tasbeh:${currentIndex}:${tasbehCount + 1}`,
        }),
        emoji.buildKeyboardButton('settings.gear', dict.buttons.tasbehReset, {
          callback_data: `dhikr:tasbeh:${currentIndex}:0`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.prev', dict.buttons.prevItem, {
          callback_data: `dhikr:view:${prevIdx}`,
        }),
        emoji.buildKeyboardButton('nav.next', dict.buttons.nextItem, {
          callback_data: `dhikr:view:${nextIdx}`,
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
          callback_data: 'nav:home',
        }),
      ],
    ],
  };
}

export function buildProfileKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.language', dict.buttons.changeLanguage, {
          callback_data: 'nav:language',
        }),
        emoji.buildKeyboardButton('nav.settings', dict.buttons.settings, {
          callback_data: 'nav:settings',
        }),
      ],
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
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
  const dict = getTelegramLocaleBundle(locale);
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.back', dict.buttons.exitAiMode, {
          callback_data: 'ai:exit',
        }),
      ],
    ],
  };
}

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
        emoji.buildKeyboardButton('channel.broadcast', b.adminChannels, {
          callback_data: 'admin:channels',
        }),
        emoji.buildKeyboardButton('brand.star', b.adminEmojis, {
          callback_data: 'admin:emojis',
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
      ],
      [
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
