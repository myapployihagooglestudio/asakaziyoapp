/**
 * ASAKA ZIYO — Telegram Bot Command Handlers (Full Audited Command Suite)
 *
 * Implements: /start, /prayer, /quran, /hadith, /dhikr, /ask, /profile,
 * /language, /settings, /admin, /help — with 5-language formatting,
 * CustomEmojiRegistry UTF-16 entity emission, and resilient delivery fallback.
 */

import { TelegramAdminRole, TelegramApiMessage, TelegramUserRecord } from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';
import { TelegramAiBridge } from '../ai/aiBridge';
import { TelegramAdminService } from '../admin/adminService';
import { TelegramRepository } from '../database/telegramRepository';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import {
  buildAdminHomeKeyboard,
  buildAiModeKeyboard,
  buildBackOnlyKeyboard,
  buildDhikrKeyboard,
  buildHadithKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildPrayerKeyboard,
  buildProfileKeyboard,
  buildQuranKeyboard,
  buildSettingsKeyboard,
} from '../keyboards/keyboards';
import { sanitizeTelegramInputText } from '../middlewares/securityMiddleware';

export interface CommandHandlerContext {
  apiClient: TelegramApiClient;
  config: TelegramPlatformConfig;
  emojiRegistry: CustomEmojiRegistry;
  prayerAdapter: TelegramPrayerAdapter;
  contentAdapter: TelegramIslamicContentAdapter;
  aiBridge: TelegramAiBridge;
  adminService: TelegramAdminService;
  repository: TelegramRepository;
}

export function parseBotCommand(text: string | undefined): { command: string; args: string } | null {
  const cleaned = sanitizeTelegramInputText(text, 1024);
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

export function formatProfileMessageText(
  user: TelegramUserRecord,
  role: TelegramAdminRole | null,
  emojiRegistry: CustomEmojiRegistry
) {
  const dict = getTelegramLocaleBundle(user.language);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const handle = user.username ? ` (@${user.username})` : '';
  const joinedDate = (user.createdAt || '').slice(0, 10) || '—';
  const status = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);

  const lines = [
    dict.profileTitle,
    '',
    `• ${dict.profileUserLabel}: ${fullName}${handle}`,
    `• ${dict.profileIdLabel}: ${user.telegramId}`,
    `• ${dict.profileLanguageLabel}: ${TELEGRAM_LANGUAGE_NATIVE_NAMES[user.language]}`,
    `• ${dict.profileRoleLabel}: ${role ? role.toUpperCase() : 'USER'}`,
    `• ${dict.profileJoinedLabel}: ${joinedDate}`,
    `• ${dict.profileInteractionsLabel}: ${user.interactionCount}`,
    '',
    `• ${dict.settingsPrayerAlerts}: ${status(user.prayerNotificationsEnabled)}`,
    `• ${dict.settingsDailyWisdom}: ${status(user.dailyWisdomEnabled)}`,
    `• ${dict.settingsAnnouncements}: ${status(user.announcementsEnabled)}`,
  ];
  return emojiRegistry.formatMessage(lines.join('\n'));
}

export function formatAdminOverviewText(
  locale: TelegramUserRecord['language'],
  repository: TelegramRepository,
  emojiRegistry: CustomEmojiRegistry,
  aiBridge: TelegramAiBridge
) {
  const dict = getTelegramLocaleBundle(locale);
  const stats = repository.getStats();
  const emojiReport = emojiRegistry.validateCompatibility();
  const aiStatus = aiBridge.getStatus();
  const settings = repository.getSettings();
  const tag = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);

  const lines = [
    dict.adminTitle,
    '',
    `• ${dict.adminStatsUsers}: ${stats.usersCount}`,
    `• ${dict.adminStatsChannels}: ${stats.channelsCount}`,
    `• ${dict.adminStatsPublications}: ${stats.publicationsCount}`,
    `• ${dict.adminStatsEmojis}: ${emojiReport.verifiedCustomCount} / ${emojiReport.totalRegisteredKeys}`,
    `• ${dict.buttons.adminToggleAi}: ${tag(settings.aiAssistantEnabled)} (${aiStatus.apiKeyConfigured ? aiStatus.model : 'API key yoʻq'})`,
    `• ${dict.buttons.adminToggleMaintenance}: ${tag(settings.maintenanceMode)}`,
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
  const role = ctx.adminService.getEffectiveRole(user.telegramId);
  const settings = ctx.repository.getSettings();
  const menuOpts = { isAdmin: Boolean(role), miniAppEnabled: Boolean(settings.miniAppEnabled) };

  // Exit AI mode automatically when invoking navigation commands (except /ask)
  if (parsed.command !== '/ask') {
    ctx.aiBridge.exitAiMode(user.telegramId);
  }

  switch (parsed.command) {
    case '/start': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.welcomeTitle}\n\n${dict.welcomeBody}`
      );
      const sendRes = await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts),
        disable_web_page_preview: true,
      });
      if (!sendRes.ok) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          disable_web_page_preview: true,
        });
      }
      return { handled: true, command: '/start' };
    }

    case '/prayer': {
      const formatted = ctx.prayerAdapter.formatPrayerScheduleMessage(
        user.language,
        ctx.emojiRegistry
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildPrayerKeyboard(
          user.language,
          ctx.emojiRegistry,
          ctx.config,
          menuOpts.miniAppEnabled
        ),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/prayer' };
    }

    case '/quran': {
      const res = ctx.contentAdapter.formatQuranDailyAyah(0, user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildQuranKeyboard(
          user.language,
          res.index,
          res.total,
          ctx.emojiRegistry,
          ctx.config,
          menuOpts.miniAppEnabled
        ),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/quran' };
    }

    case '/hadith': {
      const res = ctx.contentAdapter.formatHadithCard(0, user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildHadithKeyboard(user.language, res.index, res.total, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/hadith' };
    }

    case '/dhikr': {
      const res = ctx.contentAdapter.formatDhikrCard(0, 0, user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildDhikrKeyboard(user.language, res.index, res.total, 0, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/dhikr' };
    }

    case '/ask': {
      if (parsed.args.length > 0) {
        await ctx.apiClient.sendChatAction(chatId, 'typing');
        const aiRes = await ctx.aiBridge.handleQuestion(user.telegramId, user.language, parsed.args);
        const formatted = ctx.emojiRegistry.formatMessage(
          `${dict.aiTitle}\n\n${aiRes.answerText || dict.aiErrorNotice}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildAiModeKeyboard(user.language, ctx.emojiRegistry),
          disable_web_page_preview: true,
        });
        return { handled: true, command: '/ask' };
      }

      const aiStatus = ctx.aiBridge.getStatus();
      if (!aiStatus.enabled) {
        const formatted = ctx.emojiRegistry.formatMessage(
          `${dict.aiTitle}\n\n${dict.aiDisabledNotice}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/ask' };
      }
      if (!aiStatus.apiKeyConfigured) {
        const formatted = ctx.emojiRegistry.formatMessage(
          `${dict.aiTitle}\n\n${dict.aiMissingKeyNotice}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/ask' };
      }

      ctx.aiBridge.enterAiMode(user.telegramId);
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.aiTitle}\n\n${dict.aiPromptReady}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildAiModeKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/ask' };
    }

    case '/profile': {
      const formatted = formatProfileMessageText(user, role, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildProfileKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/profile' };
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

    case '/admin': {
      if (!role) {
        const formatted = ctx.emojiRegistry.formatMessage(
          `{{emoji:status.lock}} ${dict.adminAccessDenied}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/admin' };
      }

      const formatted = formatAdminOverviewText(
        user.language,
        ctx.repository,
        ctx.emojiRegistry,
        ctx.aiBridge
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildAdminHomeKeyboard(user.language, settings, ctx.emojiRegistry),
      });
      return { handled: true, command: '/admin' };
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

    default: {
      const formatted = ctx.emojiRegistry.formatMessage(dict.unknownCommand);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts),
      });
      return { handled: true, command: parsed.command };
    }
  }
}
