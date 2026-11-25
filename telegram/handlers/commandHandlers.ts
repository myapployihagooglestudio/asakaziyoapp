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
import { TelegramHifzService } from '../hifz/hifzService';
import { TelegramQuranMp3Service } from '../services/quranMp3Service';
import { TelegramStyleManager } from '../style/styleManager';
import type { GlobalPrayerEcosystemService } from '../../src/services/globalPrayerEcosystemServer';
import type { QuranEcosystemService } from '../../src/services/quranEcosystemServer';
import type { SubscriptionEcosystemService } from '../../src/services/subscriptionEcosystemServer';
import {
  buildGlobalRegionPickerKeyboard,
  buildWeatherInlineKeyboard,
  formatTelegramUnifiedPrayerMessage,
  formatTelegramWeatherMessage,
  getTelegramUserPrefKey,
  resolveLocationFromQueryOrGeocoding,
} from '../services/globalPrayerWeatherBotHelper';
import {
  appendDeveloperAttributionEntity,
  formatTelegramAboutMessage,
  formatTelegramPremiumMessage,
  formatTelegramQarisLibraryMessage,
  formatTelegramRandomDrawsMessage,
  getTelegramCanonicalUserKey,
} from '../services/quranPremiumBotHelper';
import {
  buildHifzHomeKeyboard,
  formatHifzHomeText,
} from '../hifz/hifzKeyboardsAndFormatter';
import {
  getUserDisplayFullName,
  isUserProfileRegistered,
} from '../services/profileValidation';
import {
  ASAKA_DEFAULT_QIBLA_BEARING,
  ASAKA_DISTANCE_TO_KAABA_KM,
  getCompassDirectionLabel,
} from '../services/qiblaHijriService';
import { getTashkentCalendarParts } from '../services/dateCalendarService';
import {
  buildCommunityServicesHubKeyboard,
  buildCyberSafetyKeyboard,
  buildHabitsKeyboard,
  buildRegionalTaqvimKeyboard,
  buildSourceVerificationKeyboard,
  buildUmrahGuideKeyboard,
  ensureHabitState,
  formatCyberSafetyHomeText,
  formatHabitsDashboardText,
  formatRegionalTaqvimNotice,
  formatSourceVerificationGuide,
  formatUmrahGuideMessage,
} from '../services/communityServicesSuite';
import { getTelegramLocaleBundle, TELEGRAM_LANGUAGE_NATIVE_NAMES } from '../locales';
import {
  buildAcademyKeyboard,
  buildAdminEmojiCategoriesKeyboard,
  buildAdminHomeKeyboard,
  buildAdminStyleHomeKeyboard,
  buildAiModeKeyboard,
  buildAndroidAppKeyboard,
  buildBackOnlyKeyboard,
  buildDhikrKeyboard,
  buildDuaKeyboard,
  buildHadithKeyboard,
  buildInteractiveBookmarksKeyboard,
  buildKhatmKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildMediaLibraryKeyboard,
  buildNotificationCenterKeyboard,
  buildOnboardingLanguageKeyboard,
  buildPersistentReplyKeyboard,
  buildPersonalRemindersKeyboard,
  buildPrayerKeyboard,
  buildPrivacyCenterKeyboard,
  buildProfileKeyboard,
  buildQiblaReplyKeyboard,
  buildQuizQuestionKeyboard,
  buildQuranKeyboard,
  buildQuranMp3HomeKeyboard,
  buildRegistrationCancelKeyboard,
  buildSettingsKeyboard,
  buildSupportHomeKeyboard,
  buildSurahDetailKeyboard,
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
  hifzService?: TelegramHifzService;
  quranMp3Service?: TelegramQuranMp3Service;
  styleManager?: TelegramStyleManager;
  globalPrayerEcosystem?: GlobalPrayerEcosystemService;
  quranEcosystem?: QuranEcosystemService;
  subscriptionEcosystem?: SubscriptionEcosystemService;
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
  repository?: TelegramRepository,
  hifzService?: TelegramHifzService
) {
  const dict = getTelegramLocaleBundle(user.language);
  const fullName = getUserDisplayFullName(user);
  const handle = user.username ? ` (@${user.username})` : '';
  const joinedDate = (user.createdAt || '').slice(0, 10) || '—';
  const status = (v: boolean) => (v ? dict.statusEnabled : dict.statusDisabled);
  const eng = repository ? repository.getUserEngagement(user.telegramId) : null;
  const registered = isUserProfileRegistered(user);
  const statusBadge = registered ? dict.profileRegisteredBadge : dict.profileNotRegisteredBadge;
  const userTickets = repository
    ? repository.listSupportTickets().filter((t) => t.userId === user.telegramId).length
    : 0;

  const lines = [
    dict.profileTitle,
    '',
    `• ${dict.profileUserLabel}: ${fullName}${handle}`,
    `• ${statusBadge}`,
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
      `• Oʻqilgan maqolalar: ${readCount} | Koʻrilgan videolar: ${watchedCount} | Murojaatlar: ${userTickets}`,
      `• Tasbeh (bugun / jami): ${eng.dhikr.todayCount} / ${eng.dhikr.totalAllTimeCount}`
    );
    if (eng.resumeQuran) {
      lines.push(
        `• Oxirgi oʻqilgan Qurʼon: ${eng.resumeQuran.surahNumber}-sura, ${eng.resumeQuran.ayahIndex}-oyat`
      );
    }
    if (eng.khatmPlan) {
      lines.push(
        `• Xatm rejasi: ${eng.khatmPlan.completedJuz.length}/30 juz (${eng.khatmPlan.targetDays} kunlik)`
      );
    }
    if (eng.audioResume?.title) {
      lines.push(`• Oxirgi audio: ${eng.audioResume.title}`);
    }
  }

  if (hifzService) {
    const hifzProfile = hifzService.getProfileIfExists(user.telegramId);
    if (hifzProfile) {
      const hs = hifzService.getStats(hifzProfile);
      lines.push(
        `• {{emoji:hifz}} HIFZ: ${hs.memorizedAyahsCount}/6236 oyat (${hs.memorizedPercent}%) | Toʻliq suralar: ${hs.completedSurahsCount}/114 | Streak: ${hs.streakDays} kun`
      );
    }
  }

  const np = user.notificationPreferences;
  const quietLabel =
    np?.quietHoursEnabled && np.quietHoursStart && np.quietHoursEnd
      ? `${np.quietHoursStart}–${np.quietHoursEnd}`
      : dict.statusDisabled;
  lines.push(
    '',
    `• ${dict.settingsPrayerAlerts}: ${status(user.prayerNotificationsEnabled)}`,
    `• ${dict.settingsDailyWisdom}: ${status(user.dailyWisdomEnabled)}`,
    `• ${dict.settingsAnnouncements}: ${status(user.announcementsEnabled)}`,
    `• ${dict.quietHoursBtn}: ${quietLabel}`
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
    `• ${dict.adminStatsUsers}: ${stats.usersCount} (Faol: ${stats.activeUsersCount} | Roʻyxatdan oʻtgan: ${stats.registeredProfilesCount} | HIFZ: ${stats.hifzProfilesCount})`,
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
            reply_markup: buildHadithKeyboard(
              user.language,
              res.index,
              res.total,
              ctx.emojiRegistry,
              'all',
              res.hadithId
            ),
            disable_web_page_preview: true,
          });
          return { handled: true, command: '/start' };
        }
      }

      // Attach persistent 20-item 2-column Reply Keyboard seamlessly
      const registered = isUserProfileRegistered(user);
      const displayName = getUserDisplayFullName(user);
      const welcomeText = registered
        ? `${dict.welcomeTitle}\n\n{{emoji:brand}} ${displayName}!\n\n${dict.welcomeBody}`
        : `${dict.welcomeTitle}\n\n${dict.welcomeBody}`;
      const replyBanner = ctx.emojiRegistry.formatMessage(welcomeText);
      const replyKb = buildPersistentReplyKeyboard(user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: replyBanner.text,
        ...(replyBanner.entities.length > 0 ? { entities: replyBanner.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateReplyMarkup(replyKb) : replyKb,
        disable_web_page_preview: true,
      });

      // If first-time user hasn't picked language manually yet, show onboarding inline selector first
      if (!user.onboardingCompleted && !user.languageSelectedManually && !registered) {
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

      // If language already chosen but profile registration not yet completed, prompt step 1 (First Name)
      if (!registered) {
        await ctx.userService.setActiveFlow(user.telegramId, {
          type: 'register_first_name',
          mode: 'register',
        });
        const regPrompt = ctx.emojiRegistry.formatMessage(
          `${dict.registerWelcomeIntro}\n\n${dict.registerAskFirstName}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: regPrompt.text,
          ...(regPrompt.entities.length > 0 ? { entities: regPrompt.entities } : {}),
          reply_markup: buildRegistrationCancelKeyboard(user.language),
          disable_web_page_preview: true,
        });
        return { handled: true, command: '/start' };
      }

      // Returning registered user -> go directly to Main Menu (never re-prompt registration)
      const menuMsg = appendDeveloperAttributionEntity(
        ctx.emojiRegistry.formatMessage(`${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`)
      );
      const mainKb = buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: menuMsg.text,
        ...(menuMsg.entities.length > 0 ? { entities: menuMsg.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(mainKb) : mainKb,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/start' };
    }

    case '/menu':
    case '/home': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`
      );
      const mainKb = buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(mainKb) : mainKb,
        disable_web_page_preview: true,
      });
      return { handled: true, command: parsed.command };
    }

    case '/prayer':
    case '/namoz': {
      const rawPrayerKb = buildPrayerKeyboard(
        user.language,
        ctx.emojiRegistry,
        ctx.config,
        menuOpts.miniAppEnabled
      );
      const canShowWidget = Boolean(
        settings.htmlWidgetsEnabled && message.chat.type === 'private'
      );
      const prayerKb = canShowWidget
        ? {
            inline_keyboard: [
              ...rawPrayerKb.inline_keyboard.slice(0, -1),
              [
                ctx.emojiRegistry.buildKeyboardButton('calendar', 'Interaktiv Namoz Kartasi', {
                  callback_data: 'widget:prayer',
                }),
              ],
              ...rawPrayerKb.inline_keyboard.slice(-1),
            ],
          }
        : rawPrayerKb;
      const styledKb = ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(prayerKb) : prayerKb;

      if (ctx.globalPrayerEcosystem) {
        let overrideLoc = undefined;
        if (parsed.args.trim()) {
          overrideLoc =
            (await resolveLocationFromQueryOrGeocoding(ctx.globalPrayerEcosystem, parsed.args)) ||
            undefined;
        }
        const unified = await formatTelegramUnifiedPrayerMessage({
          ecosystem: ctx.globalPrayerEcosystem,
          telegramId: user.telegramId,
          locale: user.language,
          emojiRegistry: ctx.emojiRegistry,
          overrideCityId: overrideLoc?.id,
          overrideCustomLocation: overrideLoc,
        });
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: unified.formatted.text,
          ...(unified.formatted.entities.length > 0 ? { entities: unified.formatted.entities } : {}),
          reply_markup: styledKb,
          disable_web_page_preview: true,
        });
        return { handled: true, command: '/prayer' };
      }

      const formatted = ctx.prayerAdapter.formatPrayerScheduleMessage(
        user.language,
        ctx.emojiRegistry
      );
      if (ctx.styleManager && settings.richMessagesEnabled) {
        const rich = ctx.styleManager.buildPrayerRichMessage(
          ctx.prayerAdapter,
          user.language,
          canShowWidget
        );
        await ctx.apiClient.sendRichMessage(
          { chat_id: chatId, blocks: rich.blocks },
          {
            chat_id: chatId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
            reply_markup: styledKb,
            disable_web_page_preview: true,
          }
        );
      } else {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: styledKb,
          disable_web_page_preview: true,
        });
      }
      return { handled: true, command: '/prayer' };
    }

    case '/obhavo':
    case '/weather': {
      if (!ctx.globalPrayerEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: 'Ob-havo xizmati vaqtincha mavjud emas.',
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/obhavo' };
      }
      try {
        const res = await formatTelegramWeatherMessage({
          ecosystem: ctx.globalPrayerEcosystem,
          telegramId: user.telegramId,
          emojiRegistry: ctx.emojiRegistry,
          cityQuery: parsed.args.trim() || undefined,
        });
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: res.formatted.text,
          ...(res.formatted.entities.length > 0 ? { entities: res.formatted.entities } : {}),
          reply_markup: buildWeatherInlineKeyboard(res.cityId, ctx.emojiRegistry),
          disable_web_page_preview: true,
        });
      } catch (err: any) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: `Ob-havo ma'lumotini yuklashda xatolik: ${err?.message || 'tarmoq xatosi'}. Keyinroq qayta urinib ko‘ring.`,
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
      }
      return { handled: true, command: '/obhavo' };
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
            reply_markup: buildSurahDetailKeyboard(
              user.language,
              matches[0].number,
              ctx.emojiRegistry
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
        reply_markup: buildHadithKeyboard(
          user.language,
          res.index,
          res.total,
          ctx.emojiRegistry,
          'all',
          res.hadithId
        ),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/hadith' };
    }

    case '/hifz': {
      if (!ctx.hifzService) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: dict.genericError,
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/hifz' };
      }
      const { profile } = await ctx.hifzService.getOrGenerateTodayPlan(user.telegramId);
      const stats = ctx.hifzService.getStats(profile);
      const homeText = formatHifzHomeText(profile, stats, user.language);
      const baseHifzKb = buildHifzHomeKeyboard(user.language);
      const canShowWidget = Boolean(
        settings.htmlWidgetsEnabled && message.chat.type === 'private'
      );
      const hifzKb = canShowWidget
        ? {
            inline_keyboard: [
              ...baseHifzKb.inline_keyboard.slice(0, -1),
              [
 ctx.emojiRegistry.buildKeyboardButton('statistics', '30-Juz Visual Karta', {
                  callback_data: 'widget:hifz',
                }),
              ],
              ...baseHifzKb.inline_keyboard.slice(-1),
            ],
          }
        : baseHifzKb;
      const styledKb = ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(hifzKb) : hifzKb;

      if (ctx.styleManager && settings.richMessagesEnabled) {
        const rich = ctx.styleManager.buildHifzRichMessage(profile, stats, canShowWidget);
        await ctx.apiClient.sendRichMessage(
          { chat_id: chatId, blocks: rich.blocks },
          {
            chat_id: chatId,
            text: homeText,
            reply_markup: styledKb,
            disable_web_page_preview: true,
          }
        );
      } else {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: homeText,
          reply_markup: styledKb,
          disable_web_page_preview: true,
        });
      }
      return { handled: true, command: '/hifz' };
    }

    case '/quran_mp3':
    case '/mp3': {
      const eng = ctx.repository.getUserEngagement(user.telegramId);
      const recitersCount = ctx.quranMp3Service ? ctx.quranMp3Service.listReciters().length : 10;
      const statsLine = eng.audioListeningStats?.totalPlays
        ? `\n{{emoji:statistics}} Tinglashlar: ${eng.audioListeningStats.totalPlays} ta (~${eng.audioListeningStats.totalEstimatedMinutes} daq)`
        : '';
      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:quran_mp3}} ASAKA ZIYO — QURʼON MP3 KUTUBXONASI\n\n` +
          `{{emoji:quran_mp3}} ${recitersCount} ta qori • 114 ta sura • Telegram native audio pleyer${statsLine}\n\n` +
          `Qorini tanlang yoki oxirgi tinglagan surangizdan davom eting:`
      );
      const kb = buildQuranMp3HomeKeyboard(
        user.language,
        ctx.emojiRegistry,
        ctx.config,
        Boolean(eng.audioResume?.reciterId && eng.audioResume?.surahNumber),
        menuOpts.miniAppEnabled
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/quran_mp3' };
    }

    case '/daily':
    case '/today':
    case '/kunlik': {
      const dayIdx = ctx.contentAdapter.getDayIndexedVerseIndex();
      const ayah = ctx.contentAdapter.formatQuranDailyAyah(dayIdx, user.language, ctx.emojiRegistry);
      const hadith = ctx.contentAdapter.formatHadithCard(dayIdx, user.language, ctx.emojiRegistry);
      const dhikr = ctx.contentAdapter.formatDhikrCard(dayIdx, 0, user.language, ctx.emojiRegistry);
      const announcements = ctx.contentAdapter.centralContent.getPublishedAnnouncements();
      let hifzSummary: string | undefined;
      if (ctx.hifzService && ctx.hifzService.getProfileIfExists(user.telegramId)) {
        const { profile: hpProfile, plan: hp } = await ctx.hifzService.getOrGenerateTodayPlan(
          user.telegramId
        );
        const hs = ctx.hifzService.getStats(hpProfile);
        const pending = hp.tasks.filter((t) => !t.completed).length;
        hifzSummary = `${hs.memorizedAyahsCount}/6236 (${hs.memorizedPercent}%) | Bugungi vazifalar: ${pending}`;
      }
      const digest = ctx.prayerAdapter.formatDailySmartDigest({
        locale: user.language,
        emojiRegistry: ctx.emojiRegistry,
        userDisplayName: getUserDisplayFullName(user),
        verseSummary: ayah.formatted.text.split('\n').slice(2, 6).join('\n'),
        hadithSummary: hadith.formatted.text.split('\n').slice(2, 5).join('\n'),
        dhikrSummary: dhikr.formatted.text.split('\n').slice(2, 5).join('\n'),
        hifzSummaryLine: hifzSummary,
        announcementTitle: announcements[0]?.title,
      });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: digest.text,
        ...(digest.entities.length > 0 ? { entities: digest.entities } : {}),
        reply_markup: buildMainMenuKeyboard(user.language, ctx.emojiRegistry, ctx.config, menuOpts),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/daily' };
    }

    case '/qibla':
    case '/qibla_topish': {
      const dirLabel = getCompassDirectionLabel(ASAKA_DEFAULT_QIBLA_BEARING, user.language);
      const formatted = ctx.emojiRegistry.formatMessage(
        `${dict.qiblaTitle}\n\n` +
          `{{emoji:prayer}} Asaka: ${ASAKA_DEFAULT_QIBLA_BEARING}° (${dirLabel}) • ~${ASAKA_DISTANCE_TO_KAABA_KM} km\n\n` +
          `${dict.qiblaPromptLocation}\n\n` +
          `${dict.qiblaCompassNotice}`
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildQiblaReplyKeyboard(user.language),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/qibla' };
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
        `${dict.quizTitle} (1/${started.total})\n\n{{emoji:warning}} ${q.questionUz}`
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
        `${dict.webAppTitle}\n\n${dict.webAppBody}\n\n{{emoji:settings}} ${webUrl}`
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
      const eng = ctx.repository.getUserEngagement(user.telegramId);
      const formatted = formatBookmarksMessageText(user, ctx.repository, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildInteractiveBookmarksKeyboard(
          user.language,
          eng.bookmarks,
          ctx.emojiRegistry
        ),
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
        if (settings.aiStreamingDraftsEnabled && message.chat.type === 'private') {
          await ctx.apiClient.sendMessageDraft({
            chat_id: chatId,
            draft_id: Date.now() % 1_000_000,
            text: '{{emoji:notifications}} ASAKA ZIYO AI javob tayyorlamoqda...',
            can_stop: true,
          });
        }
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
      const formatted = formatProfileMessageText(
        user,
        role,
        ctx.emojiRegistry,
        ctx.repository,
        ctx.hifzService
      );
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

    case '/bildirishnomalar':
    case '/notifications': {
      const prefs = ctx.userService.getEffectiveNotificationPreferences(user);
      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:notifications}} Bildirishnoma Markazi\n\n` +
          `• Oldindan eslatmalar: ${(prefs.leadMinutes || [0]).map((m) => `${m}m`).join(', ')}${prefs.customLeadMinutes ? ` + ${prefs.customLeadMinutes}m` : ''}\n` +
          `• Vaqt zonasi: ${prefs.timezone || 'Asia/Tashkent'}`
      );
      const kb = buildNotificationCenterKeyboard(user, prefs, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: parsed.command };
    }

    case '/settings':
    case '/sozlamalar': {
      const formatted = formatSettingsMessageText(user, ctx.emojiRegistry);
      const kb = buildSettingsKeyboard(user, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: parsed.command };
    }

    case '/privacy': {
      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:profile}} Maxfiylik va Maʼlumotlar Markazi\n\n` +
          `• Shaxsiy maʼlumotlaringiz izolyatsiyalangan holda saqlanadi.\n` +
          `• Istalgan vaqtda JSON eksport qilishingiz yoki profilingizni toʻliq oʻchirishingiz mumkin.`
      );
      const kb = buildPrivacyCenterKeyboard(user.language, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: '/privacy' };
    }

    case '/reminders': {
      const reminders = ctx.userService.listPersonalReminders(user.telegramId);
      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:calendar}} Shaxsiy Eslatmalarim (${reminders.length})\n\n` +
          `Har kuni belgilangan vaqtda (Asia/Tashkent) eslatma olish uchun yangi eslatma qoʻshing:`
      );
      const kb = buildPersonalRemindersKeyboard(user.language, reminders, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: '/reminders' };
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

    case '/emoji_setup': {
      if (!role || !ctx.adminService.hasPermission(user.telegramId, 'manage_emojis')) {
        const formatted = ctx.emojiRegistry.formatMessage(
          `{{emoji:status.lock}} ${dict.adminAccessDenied}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/emoji_setup' };
      }

      // Direct-Emoji-First mode: admin can immediately send ANY Telegram Premium emoji
      // OR tap any of the 27 canonical categories below.
      await ctx.userService.setActiveFlow(user.telegramId, {
        type: 'admin_emoji_capture',
        key: '__ANY__',
      });
      const rep = ctx.emojiRegistry.validateCompatibility();
      const missingCount = ctx.emojiRegistry.listMissingCanonicalSlots().length;
      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:brand}} ASAKA ZIYO — 100% Premium Custom Emoji Boshqaruvi (Bot API 9.4+)\n\n` +
          `• Faol tasdiqlangan Premium emojilar: ${rep.verifiedCustomCount} / ${rep.totalRegisteredKeys}\n` +
          `• Yetishmayotgan asosiy kategoriyalar: ${missingCount} / 27\n` +
          `• Oddiy Unicode emoji qoidasi: QATʼIY TAQIQLANGAN (0 ta oddiy emoji)\n` +
          `• Premium Rendering: ${rep.premiumRenderingActive ? 'ON' : 'OFF (toza matn rejimi)'}\n` +
          `• Tugma ikonkalari (icon_custom_emoji_id): ${rep.keyboardCustomIconsActive ? 'ON' : 'OFF'}\n\n` +
          `{{emoji:brand}} Hoziroq Telegram Premium tanlagichidan tayyor Premium emoji yuboring (bot real custom_emoji_id ni tekshirib, qaysi kategoriya uchun saqlashni soʻraydi) YOKI pastdan boʻlimni tanlang:`
      );
      const kb = buildAdminEmojiCategoriesKeyboard(user.language, 0, ctx.emojiRegistry, settings);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: '/emoji_setup' };
    }

    case '/style': {
      if (
        !role ||
        (!ctx.adminService.hasPermission(user.telegramId, 'manage_emojis') &&
          !ctx.adminService.hasPermission(user.telegramId, 'manage_settings'))
      ) {
        const formatted = ctx.emojiRegistry.formatMessage(
          `{{emoji:status.lock}} ${dict.adminAccessDenied}`
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildBackOnlyKeyboard(user.language, ctx.emojiRegistry),
        });
        return { handled: true, command: '/style' };
      }

      const formatted = ctx.emojiRegistry.formatMessage(
        `{{emoji:settings}} ASAKA ZIYO — Markaziy Style & Rich Message Boshqaruvi (Bot API 9.4–10.4)\n\n` +
          `• Button Styles (primary/success/danger): ${settings.buttonStylesEnabled ?? true ? 'ON' : 'OFF'}\n` +
          `• Rich Messages (10.1–10.3): ${settings.richMessagesEnabled ? 'ON' : 'OFF'}\n` +
          `• HTML Widgets (10.4, faqat private chat): ${settings.htmlWidgetsEnabled ? 'ON' : 'OFF'}\n` +
          `• AI Streaming Drafts: ${settings.aiStreamingDraftsEnabled ? 'ON' : 'OFF'}`
      );
      const kb = buildAdminStyleHomeKeyboard(user.language, settings, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: '/style' };
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
      const kb = buildAdminHomeKeyboard(user.language, settings, ctx.emojiRegistry);
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: ctx.styleManager ? ctx.styleManager.decorateInlineMarkup(kb) : kb,
      });
      return { handled: true, command: '/admin' };
    }

    case '/habits':
    case '/odatlar': {
      const todayKey = getTashkentCalendarParts().dateKey;
      const eng = ctx.repository.getUserEngagement(user.telegramId);
      const state = ensureHabitState(eng.worshipHabits, todayKey);
      const formatted = ctx.emojiRegistry.formatMessage(
        formatHabitsDashboardText(user.language, state)
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildHabitsKeyboard(user.language, state, ctx.emojiRegistry),
      });
      return { handled: true, command: '/habits' };
    }

    case '/umrah':
    case '/umra': {
      const formatted = ctx.emojiRegistry.formatMessage(
        formatUmrahGuideMessage(user.language, 'home')
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildUmrahGuideKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/umrah' };
    }

    case '/verify_source':
    case '/manba': {
      const formatted = ctx.emojiRegistry.formatMessage(
        formatSourceVerificationGuide(user.language, parsed.args || undefined)
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildSourceVerificationKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/verify_source' };
    }

    case '/cybersafety':
    case '/xavfsizlik': {
      const formatted = ctx.emojiRegistry.formatMessage(
        formatCyberSafetyHomeText(user.language)
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildCyberSafetyKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/cybersafety' };
    }

    case '/hudud':
    case '/region':
    case '/regions':
    case '/hududlar': {
      if (ctx.globalPrayerEcosystem) {
        const query = parsed.args.trim();
        if (query) {
          const found = await resolveLocationFromQueryOrGeocoding(ctx.globalPrayerEcosystem, query);
          if (found) {
            await ctx.globalPrayerEcosystem.saveUserLocationPref({
              userId: getTelegramUserPrefKey(user.telegramId),
              cityId: found.id,
              districtId: found.districtId,
              customLocation: found.regionId === 'global-geocoded' ? found : null,
              syncAcrossDevices: true,
              platformSource: 'telegram',
              updatedAt: new Date().toISOString(),
            });
            const unified = await formatTelegramUnifiedPrayerMessage({
              ecosystem: ctx.globalPrayerEcosystem,
              telegramId: user.telegramId,
              locale: user.language,
              emojiRegistry: ctx.emojiRegistry,
              overrideCityId: found.id,
              overrideCustomLocation: found,
            });
            await ctx.apiClient.sendMessage({
              chat_id: chatId,
              text: `Hudud saqlandi: ${found.cityName} (${found.countryName})\n\n${unified.formatted.text}`,
              ...(unified.formatted.entities.length > 0 ? { entities: unified.formatted.entities } : {}),
              reply_markup: buildPrayerKeyboard(
                user.language,
                ctx.emojiRegistry,
                ctx.config,
                menuOpts.miniAppEnabled
              ),
              disable_web_page_preview: true,
            });
            return { handled: true, command: '/hudud' };
          }
        }
        const formatted = ctx.emojiRegistry.formatMessage(
          '{{emoji:prayer}} HUDUD VA SHAHAR TANLASH\n\n' +
            'Asaka (Admin MANUAL rasmiy jadval), O‘zbekistonning barcha 14 hududi, Makka/Madina yoki istalgan dunyo shahrini tanlang.\n' +
            'Masalan: /hudud Toshkent, /hudud Makka, /hudud Istanbul'
        );
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildGlobalRegionPickerKeyboard(ctx.emojiRegistry, 'uz1'),
          disable_web_page_preview: true,
        });
        return { handled: true, command: '/hudud' };
      }

      const formatted = ctx.emojiRegistry.formatMessage(
        formatRegionalTaqvimNotice(user.language)
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildRegionalTaqvimKeyboard(user.language, ctx.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/regions' };
    }

    case '/services':
    case '/xizmatlar': {
      const formatted = ctx.emojiRegistry.formatMessage(
        user.language === 'ru'
          ? '{{emoji:admin.shield}} Полезные сервисы ASAKA ZIYO\n\nВыберите нужный раздел:'
          : user.language === 'en'
            ? '{{emoji:admin.shield}} ASAKA ZIYO Community Services\n\nSelect a module below:'
            : user.language === 'uz-Cyrl'
              ? '{{emoji:admin.shield}} ASAKA ZIYO Фойдали хизматлар маркази\n\nКеракли бўлимни танланг:'
              : '{{emoji:admin.shield}} ASAKA ZIYO Foydali xizmatlar markazi\n\nKerakli boʻlimni tanlang:'
      );
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        reply_markup: buildCommunityServicesHubKeyboard(user.language, ctx.emojiRegistry),
      });
      return { handled: true, command: '/services' };
    }

    case '/premium':
    case '/obuna':
    case '/tarif': {
      if (!ctx.subscriptionEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '👑 Premium obuna markazi hozir yuklanmoqda. Iltimos, birozdan keyin urinib koʻring.',
        });
        return { handled: true, command: '/premium' };
      }
      const view = formatTelegramPremiumMessage({
        subscriptionService: ctx.subscriptionEcosystem,
        telegramId: user.telegramId,
        config: ctx.config,
        miniAppEnabled: menuOpts.miniAppEnabled,
      });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: view.html,
        parse_mode: 'HTML',
        reply_markup: view.reply_markup,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/premium' };
    }

    case '/promo': {
      if (!ctx.subscriptionEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '🎟 Promokod tizimi hozir yuklanmoqda.',
        });
        return { handled: true, command: '/promo' };
      }
      const code = parsed.args.trim().toUpperCase();
      if (!code) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '🎟 Promokod kiritish uchun quyidagicha yozing:\n<code>/promo RAMAZON2026</code>',
          parse_mode: 'HTML',
        });
        return { handled: true, command: '/promo' };
      }
      const tgKey = getTelegramCanonicalUserKey(user.telegramId);
      const res = await ctx.subscriptionEcosystem.redeemFreeDaysPromo(code, tgKey);
      if (!res.ok) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: `⚠️ ${res.error || 'Promokod qabul qilinmadi.'}`,
        });
        return { handled: true, command: '/promo' };
      }
      if (res.subscription) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text:
            `✅ <b>Promokod faollashtirildi!</b>\n\n` +
            `🎟 Kod: <code>${code}</code>\n` +
            `👑 Holat: <b>${res.subscription.status}</b>\n` +
            `⏳ Muddati: <b>${(res.subscription.expiresAt || '—').slice(0, 10)}</b>\n\n` +
            `Barcha platformalarda (Web, Android, Telegram Mini App) Premium huquqlaringiz avtomatik yangilandi.`,
          parse_mode: 'HTML',
        });
      } else {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: `ℹ️ <b>${code}</b> — chegirma promokodi tasdiqlandi! ${res.error || 'Mini App Premium boʻlimida tarif tanlashda kiriting.'}`,
          parse_mode: 'HTML',
        });
      }
      return { handled: true, command: '/promo' };
    }

    case '/tanlov':
    case '/draw':
    case '/hadya': {
      if (!ctx.subscriptionEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '🎁 Tanlovlar boʻlimi hozir yuklanmoqda.',
        });
        return { handled: true, command: '/tanlov' };
      }
      const view = formatTelegramRandomDrawsMessage({
        subscriptionService: ctx.subscriptionEcosystem,
        telegramId: user.telegramId,
        config: ctx.config,
        miniAppEnabled: menuOpts.miniAppEnabled,
      });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: view.html,
        parse_mode: 'HTML',
        reply_markup: view.reply_markup,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/tanlov' };
    }

    case '/link': {
      if (!ctx.subscriptionEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '🔗 Hisob bogʻlash xizmati hozir yuklanmoqda.',
        });
        return { handled: true, command: '/link' };
      }
      const code = parsed.args.trim().replace(/\s+/g, '');
      if (!code || !/^\d{6}$/.test(code)) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text:
            `🔗 <b>Hisobni Web / Android ilova bilan bogʻlash</b>\n\n` +
            `1. Websayt yoki Android ilovada <b>Premium</b> boʻlimini oching.\n` +
            `2. «Telegram bilan bogʻlash kodi» tugmasini bosib 6 xonali kod oling.\n` +
            `3. Shu yerga <code>/link 123456</code> shaklida yuboring.\n\n` +
            `Natijada barcha qurilmalarda yagona Premium obuna va Qurʼon progressi sinxronlanadi.`,
          parse_mode: 'HTML',
        });
        return { handled: true, command: '/link' };
      }
      const tgKey = getTelegramCanonicalUserKey(user.telegramId);
      const linked = ctx.subscriptionEcosystem.redeemAccountLinkCode(code, tgKey);
      if (!linked.ok) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: `⚠️ ${linked.error || 'Kod yaroqsiz yoki muddati tugagan.'}`,
        });
        return { handled: true, command: '/link' };
      }
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Hisoblar muvaffaqiyatli bogʻlandi!</b>\n\n` +
          `🔗 Yagona hisob ID: <code>${linked.canonicalUserId}</code>\n` +
          `Endi Web App, Android APK, Telegram Bot va Mini App bitta Premium obuna hamda Qurʼon profilidan foydalanadi.`,
        parse_mode: 'HTML',
      });
      return { handled: true, command: '/link' };
    }

    case '/qorilar':
    case '/quran_pro': {
      if (!ctx.quranEcosystem) {
        await ctx.apiClient.sendMessage({
          chat_id: chatId,
          text: '🎙 Qorilar kutubxonasi hozir yuklanmoqda.',
        });
        return { handled: true, command: '/qorilar' };
      }
      const view = formatTelegramQarisLibraryMessage({
        quranService: ctx.quranEcosystem,
        config: ctx.config,
        miniAppEnabled: menuOpts.miniAppEnabled,
      });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: view.html,
        parse_mode: 'HTML',
        reply_markup: view.reply_markup,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/qorilar' };
    }

    case '/about':
    case '/info': {
      const view = formatTelegramAboutMessage({
        config: ctx.config,
        miniAppEnabled: menuOpts.miniAppEnabled,
      });
      await ctx.apiClient.sendMessage({
        chat_id: chatId,
        text: view.html,
        parse_mode: 'HTML',
        reply_markup: view.reply_markup,
        disable_web_page_preview: true,
      });
      return { handled: true, command: '/about' };
    }

    case '/help': {
      const formatted = appendDeveloperAttributionEntity(
        ctx.emojiRegistry.formatMessage(
          `${dict.helpTitle}\n\n${dict.helpBody}\n\n` +
            `• /qorilar — Qorilar audio kutubxonasi & Tajvid\n` +
            `• /premium — Premium obuna va tariflar\n` +
            `• /promo KOD — Promokod faollashtirish\n` +
            `• /tanlov — Bepul hadya tanlovlari\n` +
            `• /link KOD — Web/Android hisobini bogʻlash\n` +
            `• /about — Loyiha haqida`
        )
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
