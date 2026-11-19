/**
 * ASAKA ZIYO — Telegram Inline Keyboards Factory
 *
 * Every button label is localized across all 5 official ASAKA ZIYO languages
 * and uses CustomEmojiRegistry for verified keyboard icons with Unicode fallback.
 */

import {
  TELEGRAM_SUPPORTED_LOCALES,
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramUserRecord,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import { buildMiniAppEntryUrl } from '../miniapp/miniAppConfig';

export function buildMainMenuKeyboard(
  locale: TelegramLocale,
  emoji: CustomEmojiRegistry,
  config: TelegramPlatformConfig
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prayer', b.prayerTimes, { callback_data: 'nav:prayer' }),
        emoji.buildKeyboardButton('nav.channels', b.channels, { callback_data: 'nav:channels' }),
      ],
      [
        emoji.buildKeyboardButton('nav.language', b.language, { callback_data: 'nav:language' }),
        emoji.buildKeyboardButton('nav.settings', b.settings, { callback_data: 'nav:settings' }),
      ],
      [
        emoji.buildKeyboardButton('nav.web', b.webApp, {
          url: buildMiniAppEntryUrl(config, locale, 'home'),
        }),
        emoji.buildKeyboardButton('nav.help', b.help, { callback_data: 'nav:help' }),
      ],
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
  config: TelegramPlatformConfig
): TelegramInlineKeyboardMarkup {
  const dict = getTelegramLocaleBundle(locale);
  const b = dict.buttons;

  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prayer', b.refreshPrayer, {
          callback_data: 'prayer:refresh',
        }),
        emoji.buildKeyboardButton('nav.web', b.openWebApp, {
          url: buildMiniAppEntryUrl(config, locale, 'prayer'),
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
