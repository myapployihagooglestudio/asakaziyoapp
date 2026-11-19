/**
 * ASAKA ZIYO — Telegram Inline Callback Query Router
 *
 * Handles all structured inline keyboard actions:
 * - nav:home | nav:prayer | nav:language | nav:settings | nav:channels | nav:help
 * - lang:<uz-Latn|uz-Cyrl|uz-Latn-new|ru|en>
 * - settings:toggle:<prayerNotificationsEnabled|dailyWisdomEnabled|announcementsEnabled>
 * - prayer:refresh
 */

import {
  TelegramApiCallbackQuery,
  TelegramInlineKeyboardMarkup,
  TelegramMessageEntity,
  TelegramUserRecord,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramUserService } from '../services/userService';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { getTelegramLocaleBundle, isValidTelegramLocale } from '../locales';
import {
  buildBackOnlyKeyboard,
  buildChannelsKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildPrayerKeyboard,
  buildSettingsKeyboard,
} from '../keyboards/keyboards';
import { formatSettingsMessageText } from './commandHandlers';

export interface CallbackHandlerContext {
  apiClient: TelegramApiClient;
  config: TelegramPlatformConfig;
  emojiRegistry: CustomEmojiRegistry;
  userService: TelegramUserService;
  prayerAdapter: TelegramPrayerAdapter;
}

async function renderScreenUpdate(
  apiClient: TelegramApiClient,
  callback: TelegramApiCallbackQuery,
  payload: {
    text: string;
    entities?: TelegramMessageEntity[];
    reply_markup: TelegramInlineKeyboardMarkup;
  }
) {
  const chatId = callback.message?.chat.id || callback.from.id;
  const messageId = callback.message?.message_id;

  if (messageId) {
    const edited = await apiClient.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: payload.text,
      ...(payload.entities && payload.entities.length > 0 ? { entities: payload.entities } : {}),
      reply_markup: payload.reply_markup,
      disable_web_page_preview: true,
    });
    if (edited.ok) return;
  }

  await apiClient.sendMessage({
    chat_id: chatId,
    text: payload.text,
    ...(payload.entities && payload.entities.length > 0 ? { entities: payload.entities } : {}),
    reply_markup: payload.reply_markup,
    disable_web_page_preview: true,
  });
}

export async function handleCallbackQuery(
  callback: TelegramApiCallbackQuery,
  user: TelegramUserRecord,
  ctx: CallbackHandlerContext
): Promise<{ handled: boolean; action: string }> {
  const data = (callback.data || '').trim();
  const dict = getTelegramLocaleBundle(user.language);

  // 1. Language Selection: lang:<locale>
  if (data.startsWith('lang:')) {
    const requestedLocale = data.slice('lang:'.length);
    if (!isValidTelegramLocale(requestedLocale)) {
      await ctx.apiClient.answerCallbackQuery({
        callback_query_id: callback.id,
        text: dict.genericError,
      });
      return { handled: true, action: 'lang:invalid' };
    }

    const updatedUser =
      (await ctx.userService.setUserLanguage(user.telegramId, requestedLocale)) || {
        ...user,
        language: requestedLocale,
      };
    const nextDict = getTelegramLocaleBundle(updatedUser.language);
    const formatted = ctx.emojiRegistry.formatMessage(
      `${nextDict.languageChangedMessage}\n\n${nextDict.mainMenuPrompt}`
    );

    await ctx.apiClient.answerCallbackQuery({
      callback_query_id: callback.id,
      text: nextDict.languageChangedToast,
    });
    await renderScreenUpdate(ctx.apiClient, callback, {
      text: formatted.text,
      entities: formatted.entities,
      reply_markup: buildMainMenuKeyboard(updatedUser.language, ctx.emojiRegistry, ctx.config),
    });
    return { handled: true, action: `lang:${requestedLocale}` };
  }

  // 2. Settings Toggles: settings:toggle:<field>
  if (data.startsWith('settings:toggle:')) {
    const field = data.slice('settings:toggle:'.length);
    if (
      field === 'prayerNotificationsEnabled' ||
      field === 'dailyWisdomEnabled' ||
      field === 'announcementsEnabled'
    ) {
      const updatedUser =
        (await ctx.userService.toggleSetting(user.telegramId, field)) || user;
      const nextDict = getTelegramLocaleBundle(updatedUser.language);
      const formatted = formatSettingsMessageText(updatedUser, ctx.emojiRegistry);

      await ctx.apiClient.answerCallbackQuery({
        callback_query_id: callback.id,
        text: nextDict.settingUpdatedToast,
      });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildSettingsKeyboard(updatedUser, ctx.emojiRegistry),
      });
      return { handled: true, action: `settings:toggle:${field}` };
    }
  }

  // 3. Navigation & Content Views
  switch (data) {
    case 'nav:home': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`
      );
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config),
      });
      return { handled: true, action: 'nav:home' };
    }

    case 'nav:prayer':
    case 'prayer:refresh': {
      const formatted = ctx.prayerAdapter.formatPrayerScheduleMessage(
        user.language,
        ctx.emojiRegistry
      );
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildPrayerKeyboard(user.language, ctx.emojiRegistry, ctx.config),
      });
      return { handled: true, action: data };
    }

    case 'nav:language': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.languageTitle}\n\n${dict.languagePrompt}`
      );
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildLanguageKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, action: 'nav:language' };
    }

    case 'nav:settings': {
      const formatted = formatSettingsMessageText(user, ctx.emojiRegistry);
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildSettingsKeyboard(user, ctx.emojiRegistry),
      });
      return { handled: true, action: 'nav:settings' };
    }

    case 'nav:channels': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.channelsTitle}\n\n${dict.channelsBody}`
      );
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildChannelsKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, action: 'nav:channels' };
    }

    case 'nav:help': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.helpTitle}\n\n${dict.helpBody}`
      );
      await ctx.apiClient.answerCallbackQuery({ callback_query_id: callback.id });
      await renderScreenUpdate(ctx.apiClient, callback, {
        text: formatted.text,
        entities: formatted.entities,
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, action: 'nav:help' };
    }

    default: {
      await ctx.apiClient.answerCallbackQuery({
        callback_query_id: callback.id,
        text: dict.unknownCommand,
      });
      return { handled: false, action: data || 'unknown' };
    }
  }
}
