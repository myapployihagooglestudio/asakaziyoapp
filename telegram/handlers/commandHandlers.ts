/**
 * ASAKA ZIYO — Telegram Bot Command Handlers
 *
 * Implements /start, /help, /language, and /settings with automatic user registration,
 * persistent 5-language preferences, and CustomEmojiRegistry entity formatting.
 */

import { TelegramApiMessage, TelegramUserRecord } from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import {
  buildBackOnlyKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildSettingsKeyboard,
} from '../keyboards/keyboards';
import { sanitizeTelegramInputText } from '../middlewares/securityMiddleware';

export interface CommandHandlerContext {
  apiClient: TelegramApiClient;
  config: TelegramPlatformConfig;
  emojiRegistry: CustomEmojiRegistry;
}

export function parseBotCommand(text: string | undefined): { command: string; args: string } | null {
  const cleaned = sanitizeTelegramInputText(text, 512);
  if (!cleaned.startsWith('/')) return null;
  const firstSpace = cleaned.indexOf(' ');
  const rawHead = firstSpace === -1 ? cleaned : cleaned.slice(0, firstSpace);
  const args = firstSpace === -1 ? '' : cleaned.slice(firstSpace + 1).trim();
  const commandPart = rawHead.split('@')[0].toLowerCase();
  return { command: commandPart, args };
}

export function formatSettingsMessageText(
  user: TelegramUserRecord,
  emojiRegistry: CustomEmojiRegistry
) {
  const dict = getTelegramLocaleBundle(user.language);
  const status = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);
  const lines = [
    dict.settingsTitle,
    '',
    dict.settingsBody,
    '',
    `• ${dict.settingsCurrentLanguage}: ${TELEGRAM_LANGUAGE_NATIVE_NAMES[user.language]}`,
    `• ${dict.settingsPrayerAlerts}: ${status(user.prayerNotificationsEnabled)}`,
    `• ${dict.settingsDailyWisdom}: ${status(user.dailyWisdomEnabled)}`,
    `• ${dict.settingsAnnouncements}: ${status(user.announcementsEnabled)}`,
  ];
  return emojiRegistry.formatMessage(lines.join('\n'));
}

export async function handleBotCommand(
  message: TelegramApiMessage,
  user: TelegramUserRecord,
  ctx: CommandHandlerContext
): Promise<{ handled: boolean; command: string }> {
  const parsed = parseBotCommand(message.text);
  if (!parsed) {
    return { handled: false, command: '' };
  }

  const dict = getTelegramLocaleBundle(user.language);
  const chatId = message.chat.id;

  switch (parsed.command) {
    case '/start': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.welcomeTitle}\n\n${dict.welcomeBody}`
      );
      const sendRes = await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config),
        disable_web_page_preview: true,
      });
      if (!sendRes.ok) {
        // Fallback: retry without reply_markup in case a button URL was rejected by Telegram
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          disable_web_page_preview: true,
        });
      }
      return { handled: true, command: '/start' };
    }

    case '/help': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.helpTitle}\n\n${dict.helpBody}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/help' };
    }

    case '/language': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.languageTitle}\n\n${dict.languagePrompt}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildLanguageKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/language' };
    }

    case '/settings': {
      const formatted = formatSettingsMessageText(user, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildSettingsKeyboard(user, ctx.emojiRegistry),
      });
      return { handled: true, command: '/settings' };
    }

    default: {
      const formatted = ctx.emojiRegistry.formatMessage(dict.unknownCommand);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config),
      });
      return { handled: true, command: parsed.command };
    }
  }
}
