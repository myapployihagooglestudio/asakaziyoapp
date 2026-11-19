/**
 * ASAKA ZIYO — Telegram Super Platform Command Handlers (Complete 27-Command Suite)
 *
 * Implements: /start, /menu, /prayer, /ramadan, /calendar, /quran, /tafsir, /khatm,
 * /hadith, /dhikr, /dua, /glossary, /academy, /quiz, /leaderboard, /library, /mosque,
 * /ask, /support, /search, /bookmarks, /profile, /language, /settings, /stop, /admin, /help.
 */

import { TelegramAdminRole, TelegramApiMessage, TelegramUserRecord } from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramUserService } from '../services/userService';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';
import { TelegramAcademyQuizService } from '../services/academyQuizService';
import { TelegramSupportService } from '../support/supportService';
import { TelegramAiBridge } from '../ai/aiBridge';
import { TelegramAdminService } from '../admin/adminService';
import { TelegramRepository } from '../database/telegramRepository';
import { AppReleaseService } from '../services/appReleaseService';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import {
  buildAcademyKeyboard,
  buildAdminHomeKeyboard,
  buildAiModeKeyboard,
  buildAndroidAppKeyboard,
  buildBackOnlyKeyboard,
  buildDhikrKeyboard,
  buildDuaKeyboard,
  buildHadithKeyboard,
  buildKhatmKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildMediaLibraryKeyboard,
  buildOnboardingLanguageKeyboard,
  buildPersistentReplyKeyboard,
  buildPrayerKeyboard,
  buildProfileKeyboard,
  buildQuizQuestionKeyboard,
  buildQuranKeyboard,
  buildSettingsKeyboard,
  buildSupportHomeKeyboard,
  buildTafsirKeyboard,
} from '../keyboards/keyboards';
import { sanitizeTelegramInputText } from '../middlewares/securityMiddleware';

export interface CommandHandlerContext {
  apiClient: TelegramApiClient;
  config: TelegramPlatformConfig;
  emojiRegistry: CustomEmojiRegistry;
  userService: TelegramUserService;
  prayerAdapter: TelegramPrayerAdapter;
  contentAdapter: TelegramIslamicContentAdapter;
  academyQuizService: TelegramAcademyQuizService;
  supportService: TelegramSupportService;
  aiBridge: TelegramAiBridge;
  adminService: TelegramAdminService;
  repository: TelegramRepository;
  appReleaseService: AppReleaseService;
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
  emojiRegistry: CustomEmojiRegistry,
  repository?: TelegramRepository
) {
  const dict = getTelegramLocaleBundle(user.language);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const handle = user.username ? ` (@${user.username})` : '';
  const joinedDate = (user.createdAt || '').slice(0, 10) || '—';
  const status = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);
  const eng = repository ? repository.getUserEngagement(user.telegramId) : null;

  const lines = [
    dict.profileTitle,
    '',
    `• ${dict.profileUserLabel}: ${fullName}${handle}`,
    `• ${dict.profileIdLabel}: ${user.telegramId}`,
    `• ${dict.profileLanguageLabel}: ${TELEGRAM_LANGUAGE_NATIVE_NAMES[user.language]}`,
    `• ${dict.profileRoleLabel}: ${role ? role.toUpperCase() : 'USER'}`,
    `• ${dict.profileJoinedLabel}: ${joinedDate}`,
    `• ${dict.profileInteractionsLabel}: ${user.interactionCount}`,
  ];

  if (eng) {
    const readCount = Array.isArray(eng.readArticleIds) ? eng.readArticleIds.length : 0;
    const watchedCount = Array.isArray(eng.watchedVideoIds) ? eng.watchedVideoIds.length : 0;
    lines.push(
      `• Xatchoʻplar: ${eng.bookmarks.length} | Darslar: ${eng.completedLessonIds.length} | Viktorina balli: ${eng.quizTotalPoints}`,
      `• Oʻqilgan maqolalar: ${readCount} | Koʻrilgan videolar: ${watchedCount}`,
      `• Tasbeh (bugun / jami): ${eng.dhikr.todayCount} / ${eng.dhikr.totalAllTimeCount}`
    );
    if (eng.audioResume?.title) {
      lines.push(`• Oxirgi audio: ${eng.audioResume.title}`);
    }
  }

  lines.push(
    '',
    `• ${dict.settingsPrayerAlerts}: ${status(user.prayerNotificationsEnabled)}`,
    `• ${dict.settingsDailyWisdom}: ${status(user.dailyWisdomEnabled)}`,
    `• ${dict.settingsAnnouncements}: ${status(user.announcementsEnabled)}`
  );
  return emojiRegistry.formatMessage(lines.join('\n'));
}

export function formatBookmarksMessageText(
  user: TelegramUserRecord,
  repository: TelegramRepository,
  emojiRegistry: CustomEmojiRegistry
) {
  const dict = getTelegramLocaleBundle(user.language);
  const eng = repository.getUserEngagement(user.telegramId);
  if (eng.bookmarks.length === 0) {
    return emojiRegistry.formatMessage(`${dict.bookmarksTitle}\n\n${dict.bookmarksEmpty}`);
  }
  const lines = [
    dict.bookmarksTitle,
    '',
    ...eng.bookmarks.slice(0, 15).map((b, i) => `${i + 1}. [${b.kind.toUpperCase()}] ${b.title}`),
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
  const fsSync = repository.getFirestoreSyncStatus();
  const tag = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);

  const lines = [
    dict.adminTitle,
    '',
    `• ${dict.adminStatsUsers}: ${stats.usersCount} (Faol: ${stats.activeUsersCount})`,
    `• ${dict.adminStatsChannels}: ${stats.channelsCount} | ${dict.adminStatsPublications}: ${stats.publicationsCount}`,
    `• Ochiq murojaatlar: ${stats.openTicketsCount} / ${stats.totalTicketsCount}`,
    `• Broadcast kampaniyalar: ${stats.broadcastsCount} | Content drafts: ${stats.contentDraftsCount}`,
    `• ${dict.adminStatsEmojis}: ${emojiReport.verifiedCustomCount} / ${emojiReport.totalRegisteredKeys}`,
    `• AI Engine: ${tag(settings.aiAssistantEnabled)} (${aiStatus.apiKeyConfigured ? aiStatus.primaryModel : 'API key yoʻq'})`,
    `• Firestore Sync: ${fsSync.bridgeActive ? `${fsSync.totalWritesSucceeded}/${fsSync.totalWritesAttempted} OK` : 'Local cache only'}`,
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

  // Reset active input flow and exit AI mode when switching commands (except /ask & /ai)
  if (user.activeFlow && user.activeFlow.type !== 'idle') {
    await ctx.userService.setActiveFlow(user.telegramId, { type: 'idle' });
  }
  if (parsed.command !== '/ask' && parsed.command !== '/ai') {
    ctx.aiBridge.exitAiMode(user.telegramId);
  }

  const sendMediaCategory = async (
    kind: 'articles' | 'news' | 'announcements' | 'adhan' | 'audio' | 'video',
    index = 0
  ) => {
    const res = ctx.contentAdapter.formatMediaLibraryItem(kind, index, user.language, ctx.emojiRegistry);
    if (res.itemId) {
      if (kind === 'articles') {
        await ctx.contentAdapter.recordArticleRead(ctx.repository, user.telegramId, res.itemId);
      } else if (kind === 'video') {
        await ctx.contentAdapter.recordVideoWatched(ctx.repository, user.telegramId, res.itemId);
      } else if (kind === 'audio' || kind === 'adhan') {
        await ctx.contentAdapter.recordAudioResume(
          ctx.repository,
          user.telegramId,
          res.itemId,
          res.itemTitle || kind
        );
      }
    }
    await ctx.apiClient.sendMessage({
      chat_id: chatId,
      text: res.formatted.text,
      ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
      reply_markup: buildMediaLibraryKeyboard(
        user.language,
        kind,
        res.index,
        res.total,
        ctx.emojiRegistry,
        res.itemId
      ),
      disable_web_page_preview: true,
    });
  };

  const sendAndroidAppScreen = async (checkGitHub = false) => {
    const info = await ctx.appReleaseService.getResolvedReleaseInfo({ checkGitHub });
    const card = ctx.appReleaseService.formatTelegramAndroidAppCard(
      info,
      user.language,
      ctx.emojiRegistry
    );
    await ctx.apiClient.sendMessage({
      chat_id: chatId,
      text: card.text,
      ...(card.entities.length > 0 ? { entities: card.entities } : {}),
      reply_markup: buildAndroidAppKeyboard(
        user.language,
        info,
        ctx.emojiRegistry,
        ctx.config,
        menuOpts.miniAppEnabled
      ),
      disable_web_page_preview: true,
    });
  };

  switch (parsed.command) {
    case '/start': {
      // Handle deep-link payloads: /start article_<id>, news_<id>, announcement_<id>, hadith_<id>, audio_<id>, video_<id>, apk, prayer, quran
      const deepLink = parsed.args.trim();
      if (deepLink) {
        if (deepLink === 'apk' || deepLink === 'android' || deepLink.startsWith('app_release_')) {
          await sendAndroidAppScreen(false);
          return { handled: true, command: '/start' };
        }
        if (deepLink === 'prayer' || deepLink.startsWith('prayer_')) {
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
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('article_')) {
          const id = deepLink.slice('article_'.length);
          const list = ctx.contentAdapter.centralContent.getPublishedArticles();
          const idx = Math.max(0, list.findIndex((a) => String(a.id) === id));
          await sendMediaCategory('articles', idx);
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('news_')) {
          const id = deepLink.slice('news_'.length);
          const list = ctx.contentAdapter.centralContent.getPublishedNews();
          const idx = Math.max(0, list.findIndex((n) => String(n.id) === id));
          await sendMediaCategory('news', idx);
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('announcement_')) {
          const id = deepLink.slice('announcement_'.length);
          const list = ctx.contentAdapter.centralContent.getPublishedAnnouncements();
          const idx = Math.max(0, list.findIndex((a) => String(a.id) === id));
          await sendMediaCategory('announcements', idx);
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('audio_')) {
          const id = deepLink.slice('audio_'.length);
          const list = ctx.contentAdapter.centralContent.getPublishedAudioItems();
          const idx = Math.max(0, list.findIndex((a) => String(a.id) === id));
          await sendMediaCategory('audio', idx);
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('video_')) {
          const id = deepLink.slice('video_'.length);
          const list = ctx.contentAdapter.centralContent.getPublishedVideoItems();
          const idx = Math.max(0, list.findIndex((v) => String(v.id) === id));
          await sendMediaCategory('video', idx);
          return { handled: true, command: '/start' };
        }
        if (deepLink.startsWith('hadith_')) {
          const id = deepLink.slice('hadith_'.length);
          const list = ctx.contentAdapter.getHadithsByCollection('all');
          const idx = Math.max(0, list.findIndex((h) => String(h.id) === id));
          const res = ctx.contentAdapter.formatHadithCard(idx, user.language, ctx.emojiRegistry);
          await ctx.apiClient.sendMessage({
            chat_id: chatId,
            text: res.formatted.text,
            ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
            reply_markup: buildHadithKeyboard(user.language, res.index, res.total, ctx.emojiRegistry),
            disable_web_page_preview: true,
          });
          return { handled: true, command: '/start' };
        }
      }

      // Attach persistent 20-item 2-column Reply Keyboard seamlessly
      const replyBanner = ctx.emojiRegistry.formatMessage(
        `${dict.welcomeTitle}\n\n${dict.welcomeBody}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: replyBanner.text,
        ...(replyBanner.entities.length > 0 ? { entities: replyBanner.entities } : {}),
        reply_markup: buildPersistentReplyKeyboard(user.language),
        disable_web_page_preview: true,
      });

      // If first-time user hasn't picked language manually yet, show onboarding inline selector
      if (!user.onboardingCompleted && !user.languageSelectedManually) {
        const onboard = ctx.emojiRegistry.formatMessage(dict.onboardingPrompt);
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: onboard.text,
          ...(onboard.entities.length > 0 ? { entities: onboard.entities } : {}),
          reply_markup: buildOnboardingLanguageKeyboard(ctx.emojiRegistry),
          disable_web_page_preview: true,
        });
        return { handled: true, command: '/start' };
      }

      const menuMsg = ctx.emojiRegistry.formatMessage(
        `${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: menuMsg.text,
        ...(menuMsg.entities.length > 0 ? { entities: menuMsg.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/start' };
    }

    case '/menu':
    case '/home': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts),
        disable_web_page_preview: true,
      });
      return { handled: true, command: parsed.command };
    }

    case '/prayer':
    case '/namoz': {
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

    case '/ramadan': {
      const formatted = ctx.prayerAdapter.formatRamadanModeMessage(
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
      return { handled: true, command: '/ramadan' };
    }

    case '/calendar': {
      const formatted = ctx.prayerAdapter.formatReligiousCalendarMessage(
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
      return { handled: true, command: '/calendar' };
    }

    case '/quran':
    case '/quron': {
      if (parsed.args) {
        const matches = ctx.contentAdapter.searchSurahs(parsed.args);
        if (matches.length > 0) {
          const card = ctx.contentAdapter.formatSurahCard(
            matches[0].number,
            user.language,
            ctx.emojiRegistry
          );
          await ctx.apiClient.sendMessage({
            chat_id: chatId,
            text: card.text,
            ...(card.entities.length > 0 ? { entities: card.entities } : {}),
            reply_markup: buildQuranKeyboard(
              user.language,
              0,
              ctx.contentAdapter.getTotalDailyAyahs(),
              ctx.emojiRegistry,
              ctx.config,
              menuOpts.miniAppEnabled
            ),
            disable_web_page_preview: true,
          });
          return { handled: true, command: '/quran' };
        }
      }
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

    case '/tafsir': {
      const res = ctx.contentAdapter.formatTafsirCard(0, user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildTafsirKeyboard(user.language, res.index, res.total, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/tafsir' };
    }

    case '/khatm': {
      const card = ctx.contentAdapter.formatKhatmCard(
        ctx.repository,
        user.telegramId,
        user.language,
        ctx.emojiRegistry
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: card.text,
        ...(card.entities.length > 0 ? { entities: card.entities } : {}),
        reply_markup: buildKhatmKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/khatm' };
    }

    case '/hadith':
    case '/hadislar': {
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

    case '/dhikr':
    case '/zikr': {
      const eng = ctx.repository.getUserEngagement(user.telegramId);
      const res = ctx.contentAdapter.formatDhikrCard(
        0,
        0,
        user.language,
        ctx.emojiRegistry,
        undefined,
        eng.dhikr.todayCount
      );
      const count = eng.dhikr.countsByDhikrId[res.dhikrId] || 0;
      const goal = eng.dhikr.dailyGoals[res.dhikrId];
      const finalCard = ctx.contentAdapter.formatDhikrCard(
        0,
        count,
        user.language,
        ctx.emojiRegistry,
        goal,
        eng.dhikr.todayCount
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: finalCard.formatted.text,
        ...(finalCard.formatted.entities.length > 0
          ? { entities: finalCard.formatted.entities }
          : {}),
        reply_markup: buildDhikrKeyboard(
          user.language,
          finalCard.index,
          finalCard.total,
          count,
          ctx.emojiRegistry
        ),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/dhikr' };
    }

    case '/dua': {
      const res = ctx.contentAdapter.formatSituationalDuaCard(0, user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildDuaKeyboard(user.language, res.index, res.total, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/dua' };
    }

    case '/glossary': {
      const formatted = ctx.contentAdapter.formatGlossaryPage(user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/glossary' };
    }

    case '/academy':
    case '/talim': {
      const res = ctx.academyQuizService.formatLessonCard(
        0,
        user.telegramId,
        user.language,
        ctx.emojiRegistry
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: res.formatted.text,
        ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
        reply_markup: buildAcademyKeyboard(
          user.language,
          res.index,
          res.total,
          res.lessonId,
          ctx.emojiRegistry
        ),
      });
      return { handled: true, command: '/academy' };
    }

    case '/quiz':
    case '/viktorina': {
      const started = ctx.academyQuizService.startQuizSession(user.telegramId, 5);
      if (!started.currentQuestion) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: dict.quizEmpty,
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/quiz' };
      }
      const q = started.currentQuestion;
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.quizTitle} (1/${started.total})\n\n❓ ${q.questionUz}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildQuizQuestionKeyboard(user.language, q.optionsUz, ctx.emojiRegistry),
      });
      return { handled: true, command: '/quiz' };
    }

    case '/leaderboard': {
      const formatted = ctx.academyQuizService.formatLeaderboardMessage(
        user.language,
        ctx.emojiRegistry
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/leaderboard' };
    }

    case '/library':
    case '/maqolalar':
    case '/articles': {
      await sendMediaCategory('articles', 0);
      return { handled: true, command: parsed.command };
    }

    case '/elonlar':
    case '/announcements': {
      await sendMediaCategory('announcements', 0);
      return { handled: true, command: parsed.command };
    }

    case '/yangiliklar':
    case '/news': {
      await sendMediaCategory('news', 0);
      return { handled: true, command: parsed.command };
    }

    case '/audio': {
      await sendMediaCategory('audio', 0);
      return { handled: true, command: '/audio' };
    }

    case '/video': {
      await sendMediaCategory('video', 0);
      return { handled: true, command: '/video' };
    }

    case '/android':
    case '/apk': {
      await sendAndroidAppScreen(false);
      return { handled: true, command: '/android' };
    }

    case '/webapp': {
      const webUrl = (ctx.config.miniAppUrl || 'https://asakaziyo.ai.studio').replace(/\/+$/, '');
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.webAppTitle}\n\n${dict.webAppBody}\n\n🌐 ${webUrl}`
      );
      const openBtn =
        menuOpts.miniAppEnabled && webUrl.startsWith('https://')
          ? ctx.emojiRegistry.buildKeyboardButton('nav.miniapp', dict.buttons.miniApp, {
              web_app: { url: webUrl },
            })
          : ctx.emojiRegistry.buildKeyboardButton('nav.web', dict.buttons.openWebApp, {
              url: webUrl,
            });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: {
          inline_keyboard: [
            [openBtn],
            [
              ctx.emojiRegistry.buildKeyboardButton('nav.back', dict.buttons.backToMenu, {
                callback_data: 'nav:home',
              }),
            ],
          ],
        },
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/webapp' };
    }

    case '/mosque': {
      const formatted = ctx.contentAdapter.formatMosqueInfoCard(user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/mosque' };
    }

    case '/search':
    case '/qidiruv': {
      if (parsed.args) {
        const resText =
          ctx.contentAdapter.performGlobalSearch(parsed.args, user.language) ||
          dict.searchNoResults;
        const formatted = ctx.emojiRegistry.formatMessage(
          `${dict.searchTitle}: "${parsed.args}"\n\n${resText}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/search' };
      }
      await ctx.userService.setActiveFlow(user.telegramId, { type: 'global_search' });
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.searchTitle}\n\n${dict.searchPrompt}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/search' };
    }

    case '/bookmarks':
    case '/sevimlilar': {
      const formatted = formatBookmarksMessageText(user, ctx.repository, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/bookmarks' };
    }

    case '/support':
    case '/aloqa': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.supportTitle}\n\n${dict.supportPrompt}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildSupportHomeKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/support' };
    }

    case '/ask':
    case '/ai': {
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

    case '/profile':
    case '/profil': {
      const formatted = formatProfileMessageText(user, role, ctx.emojiRegistry, ctx.repository);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildProfileKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/profile' };
    }

    case '/language':
    case '/til': {
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

    case '/settings':
    case '/sozlamalar':
    case '/bildirishnomalar':
    case '/notifications': {
      const formatted = formatSettingsMessageText(user, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildSettingsKeyboard(user, ctx.emojiRegistry),
      });
      return { handled: true, command: parsed.command };
    }

    case '/stop': {
      await ctx.userService.optOutAllNotifications(user.telegramId);
      const formatted = ctx.emojiRegistry.formatMessage(dict.stopOptOutMessage);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/stop' };
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
