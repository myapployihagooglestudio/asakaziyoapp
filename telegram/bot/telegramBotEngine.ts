/**
 * ASAKA ZIYO — Telegram Super Platform Core Engine
 *
 * Orchestrates the entire isolated Telegram Super Platform:
 * - Firestore hydration + local cache fallback across 13 isolated `telegram*` collections
 * - Safe startup bootstrap (polling & webhook), 20-command sync, and HTTPS Mini App menu button
 * - Live diagnostics (`runLiveDiagnostics`) with zero secret exposure
 * - Full update dispatcher:
 *   - 27 Bot Commands
 *   - Persistent ReplyKeyboardMarkup actions across all 5 languages
 *   - 100% audited InlineKeyboardMarkup callbacks
 *   - Stateful user & admin flows (`quran_search`, `hadith_search`, `global_search`,
 *     `khatm_set_days`, `tasbeh_set_goal`, `support_new`, `support_reply`,
 *     `admin_ticket_reply`, `admin_user_search`, `admin_broadcast_title`,
 *     `admin_broadcast_body`, `admin_ai_set_model`, `admin_channel_post_draft`)
 *   - Multimodal AI pipeline: text Q&A with memory, voice STT + optional WAV TTS,
 *     and photo/document inlineData analysis
 */

import crypto from 'crypto';
import os from 'os';
import {
  CustomEmojiWebAssetFormat,
  TelegramApiMessage,
  TelegramApiUpdate,
  TelegramCentralAdminWriter,
  TelegramLatencyBucketStats,
  TelegramLatencySample,
  TelegramPerformanceSummary,
  TelegramRuntimeInstanceRecord,
  TelegramUserRecord,
} from '../types';
import {
  TelegramPlatformConfig,
  getSafeTelegramConfigSummary,
  loadTelegramPlatformConfig,
} from '../config';
import { FetchLike, TelegramApiClient, WebhookInfoResult } from '../api/telegramApiClient';
import {
  CANONICAL_EMOJI_SLOTS,
  CustomEmojiRegistry,
  EXTENDED_30_EMOJI_SLOTS,
  OWNER_INITIAL_PREMIUM_EMOJI_CATALOG,
} from '../emoji/customEmojiRegistry';
import { ScopedFirestoreBridge, TelegramRepository } from '../database/telegramRepository';
import { TelegramLogger, createTelegramLogger } from '../middlewares/logger';
import { TelegramRateLimiter } from '../middlewares/rateLimiter';
import { TelegramUserService } from '../services/userService';
import { ReadOnlyPrayerScheduleProvider, TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { TelegramChannelService } from '../channels/channelService';
import { TelegramPublishingService } from '../publishing/publishingService';
import { TelegramAdminService } from '../admin/adminService';
import { AiGenerateFn, AiTranscribeFn, AiTtsFn, TelegramAiBridge } from '../ai/aiBridge';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';
import { CentralContentProvider, CentralDatabaseReader } from '../content/centralContentProvider';
import { AppReleaseService } from '../services/appReleaseService';
import type { GlobalPrayerEcosystemService } from '../../src/services/globalPrayerEcosystemServer';
import type { QuranEcosystemService } from '../../src/services/quranEcosystemServer';
import type { SubscriptionEcosystemService } from '../../src/services/subscriptionEcosystemServer';
import { UnifiedSyncEngine } from '../sync/syncEngine';
import { TelegramAcademyQuizService } from '../services/academyQuizService';
import { TelegramSupportService } from '../support/supportService';
import { TelegramBroadcastManager } from '../broadcast/broadcastManager';
import { TelegramContentStudio } from '../content/contentStudio';
import { TelegramJobScheduler, TelegramPollingStatus } from '../jobs/jobScheduler';
import { TelegramHifzService } from '../hifz/hifzService';
import { TelegramQuranMp3Service } from '../services/quranMp3Service';
import { TelegramStyleManager } from '../style/styleManager';
import {
  buildHifzHomeKeyboard,
  formatHifzAudioCheckResult,
  formatHifzHomeText,
  formatSurahHifzDetail,
  getHifzStrings,
} from '../hifz/hifzKeyboardsAndFormatter';
import { validateRegistrationName } from '../services/profileValidation';
import {
  calculateQiblaFromCoordinates,
  getCompassDirectionLabel,
} from '../services/qiblaHijriService';
import {
  analyzeCyberSafetyInput,
  buildCyberSafetyKeyboard,
  buildSourceVerificationKeyboard,
  formatCyberSafetyResultText,
  formatSourceVerificationGuide,
} from '../services/communityServicesSuite';
import { handleBotCommand, parseBotCommand } from '../handlers/commandHandlers';
import { handleCallbackQuery } from '../handlers/callbackHandlers';
import { getTelegramLocaleBundle } from '../locales';
import {
  ReplyKeyboardAction,
  buildAdminAiControlKeyboard,
  buildAdminAudioBulkConfirmKeyboard,
  buildAdminAudioHomeKeyboard,
  buildAdminAudioReciterKeyboard,
  buildAdminBroadcastsKeyboard,
  buildAdminChannelsKeyboard,
  buildAdminEmojiCategoriesKeyboard,
  buildAdminPrayerKeyboard,
  buildAdminStyleHomeKeyboard,
  buildAdminSupportKeyboard,
  buildAiModeKeyboard,
  buildBackOnlyKeyboard,
  buildDhikrKeyboard,
  buildKhatmKeyboard,
  buildMainMenuKeyboard,
  buildNotificationCenterKeyboard,
  buildPersistentReplyKeyboard,
  buildPersonalRemindersKeyboard,
  buildRegistrationCancelKeyboard,
  buildRegistrationConfirmKeyboard,
  buildSupportHomeKeyboard,
  buildSurahListKeyboard,
  matchReplyKeyboardAction,
} from '../keyboards/keyboards';

export interface TelegramBotEngineOptions {
  config?: TelegramPlatformConfig;
  firestore?: ScopedFirestoreBridge;
  storePath?: string;
  outboxPath?: string;
  readOnlyPrayerProvider?: ReadOnlyPrayerScheduleProvider;
  centralContentReader?: CentralDatabaseReader;
  centralAdminWriter?: TelegramCentralAdminWriter;
  appReleaseService?: AppReleaseService;
  globalPrayerEcosystem?: GlobalPrayerEcosystemService;
  quranEcosystem?: QuranEcosystemService;
  subscriptionEcosystem?: SubscriptionEcosystemService;
  serverWriteFirestoreDoc?: (
    collectionName: string,
    docId: string,
    data: Record<string, any>
  ) => Promise<{ success: boolean; error?: string }>;
  serverReadFirestoreCollection?: (collectionName: string) => Promise<any[]>;
  fetchImpl?: FetchLike;
  aiGenerator?: AiGenerateFn;
  aiTranscriber?: AiTranscribeFn;
  aiTts?: AiTtsFn;
  silentLogger?: boolean;
}

export interface UpdateDispatchOutcome {
  ok: boolean;
  updateId: number;
  kind:
    | 'command'
    | 'callback'
    | 'reply_keyboard'
    | 'flow_input'
    | 'ai_reply'
    | 'voice_ai_reply'
    | 'media_ai_reply'
    | 'text_fallback'
    | 'ignored'
    | 'rate_limited'
    | 'maintenance'
    | 'error';
  detail?: string;
}

export type TelegramStartupState =
  | 'not_started'
  | 'starting'
  | 'running_polling'
  | 'running_webhook'
  | 'misconfigured'
  | 'disabled'
  | 'error';

export interface TelegramRuntimeState {
  startupState: TelegramStartupState;
  startupReason: string;
  botApiConnected: boolean;
  botId: number | null;
  botUsername: string | null;
  botFirstName: string | null;
  webhookRegisteredOnStartup: boolean;
  commandsSynced: boolean;
  menuButtonConfigured: boolean;
  totalUpdatesHandled: number;
  lastUpdateHandledAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  polling: TelegramPollingStatus;
}

export interface TelegramLiveDiagnosticsReport {
  checkedAt: string;
  tokenConfigured: boolean;
  mode: TelegramPlatformConfig['mode'];
  modeAutoSelected: boolean;
  startupState: TelegramStartupState;
  startupReason: string;
  telegramApi: {
    connected: boolean;
    botId?: number;
    botUsername?: string;
    botFirstName?: string;
    errorCode?: number;
    error?: string;
  };
  webhookInfo: {
    checked: boolean;
    url?: string;
    pendingUpdateCount?: number;
    lastErrorMessage?: string;
    lastErrorDate?: number;
    error?: string;
  };
  polling: TelegramPollingStatus;
  configSummary: ReturnType<typeof getSafeTelegramConfigSummary>;
  issues: string[];
  readyToAnswerStart: boolean;
}

const REPLY_ACTION_TO_COMMAND: Record<ReplyKeyboardAction, string> = {
  // Unified 20-button Reply Keyboard
  home: '/menu',
  ai: '/ask',
  quran: '/quran',
  hadiths: '/hadith',
  prayer: '/prayer',
  dhikr_dua: '/dhikr',
  articles: '/maqolalar',
  announcements: '/elonlar',
  news: '/yangiliklar',
  audio_library: '/audio',
  video_library: '/video',
  education: '/academy',
  quizzes: '/quiz',
  android_app: '/android',
  web_app: '/webapp',
  favorites: '/bookmarks',
  notifications: '/bildirishnomalar',
  profile: '/profile',
  contact_admin: '/support',
  settings: '/settings',
  // Legacy 6-button Reply Keyboard compatibility
  quran_center: '/quran',
  academy_quiz: '/academy',
  support: '/support',
  menu: '/menu',
};

export class TelegramBotEngine {
  public readonly config: TelegramPlatformConfig;
  public readonly logger: TelegramLogger;
  public readonly apiClient: TelegramApiClient;
  public readonly repository: TelegramRepository;
  public readonly emojiRegistry: CustomEmojiRegistry;
  public readonly rateLimiter: TelegramRateLimiter;
  public readonly userService: TelegramUserService;
  public readonly prayerAdapter: TelegramPrayerAdapter;
  public readonly centralContent: CentralContentProvider;
  public readonly contentAdapter: TelegramIslamicContentAdapter;
  public readonly appReleaseService: AppReleaseService;
  public readonly syncEngine: UnifiedSyncEngine;
  public readonly academyQuizService: TelegramAcademyQuizService;
  public readonly supportService: TelegramSupportService;
  public readonly channelService: TelegramChannelService;
  public readonly publishingService: TelegramPublishingService;
  public readonly broadcastManager: TelegramBroadcastManager;
  public readonly contentStudio: TelegramContentStudio;
  public readonly adminService: TelegramAdminService;
  public readonly aiBridge: TelegramAiBridge;
  public readonly hifzService: TelegramHifzService;
  public readonly quranMp3Service: TelegramQuranMp3Service;
  public readonly styleManager: TelegramStyleManager;
  public readonly jobScheduler: TelegramJobScheduler;
  public readonly globalPrayerEcosystem?: GlobalPrayerEcosystemService;
  public readonly quranEcosystem?: QuranEcosystemService;
  public readonly subscriptionEcosystem?: SubscriptionEcosystemService;

  public readonly instanceId: string = `tg_${process.env.K_REVISION || os.hostname() || 'node'}_${process.pid}_${crypto.randomBytes(3).toString('hex')}`;
  public readonly deploymentId: string =
    process.env.K_REVISION || process.env.CLOUD_RUN_REVISION || process.env.HOSTNAME || 'local-runtime';
  public readonly gitCommit: string =
    process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.GITHUB_SHA || 'workspace-build';
  public readonly buildVersion: string = process.env.npm_package_version || '1.0.0';
  public readonly startedAt: string = new Date().toISOString();

  private startupState: TelegramStartupState = 'not_started';
  private startupReason = 'Telegram bot runtime has not been initialized yet.';
  private botApiConnected = false;
  private botId: number | null = null;
  private botUsername: string | null = null;
  private botFirstName: string | null = null;
  private webhookRegisteredOnStartup = false;
  private commandsSynced = false;
  private menuButtonConfigured = false;
  private totalUpdatesHandled = 0;
  private lastUpdateHandledAt: string | null = null;
  private lastError: string | null = null;
  private lastErrorAt: string | null = null;
  private startupRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private instanceHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly perUserQueues = new Map<string, Promise<void>>();
  private inFlightUpdates = 0;
  private deduplicatedUpdates = 0;
  private readonly latencySamples: TelegramLatencySample[] = [];
  private readonly emojiAssetCache = new Map<
    string,
    {
      buffer: Buffer;
      mimeType: string;
      format: CustomEmojiWebAssetFormat;
      renderable: boolean;
      cachedAt: number;
      customEmojiId: string;
    }
  >();
  private startupRetryCount = 0;
  private readonly processedUpdateIds = new Set<number>();
  private readonly hasCustomAiGenerator: boolean;
  private readonly centralAdminWriter?: TelegramCentralAdminWriter;

  constructor(options: TelegramBotEngineOptions = {}) {
    this.hasCustomAiGenerator = Boolean(options.aiGenerator);
    this.centralAdminWriter = options.centralAdminWriter;
    this.globalPrayerEcosystem = options.globalPrayerEcosystem;
    this.quranEcosystem = options.quranEcosystem;
    this.subscriptionEcosystem = options.subscriptionEcosystem;
    this.config = options.config || loadTelegramPlatformConfig();
    this.logger = createTelegramLogger('TelegramPlatform', Boolean(options.silentLogger));
    this.apiClient = new TelegramApiClient(this.config, this.logger, options.fetchImpl);
    this.repository = new TelegramRepository({
      storePath: options.storePath,
      firestore: options.firestore,
      logger: this.logger,
    });

    const settings = this.repository.getSettings();
    this.emojiRegistry = new CustomEmojiRegistry(
      this.repository.listCustomEmojis(),
      Boolean(settings.premiumEmojiEnabled && settings.premiumEmojiEligibilityVerified),
      Boolean(settings.premiumKeyboardIconsEnabled)
    );
    // Layer 2 outgoing gateway enforcement: zero plain Unicode emoji leakage on ALL Telegram API calls
    this.apiClient.attachEmojiRegistry(this.emojiRegistry);

    this.rateLimiter = new TelegramRateLimiter(
      this.config.rateLimitMaxRequests,
      this.config.rateLimitWindowMs
    );
    this.userService = new TelegramUserService(this.repository);
    this.prayerAdapter = new TelegramPrayerAdapter(options.readOnlyPrayerProvider, () => {
      const liveSettings = this.repository.getSettings();
      return {
        hijriOffsetDays: liveSettings.hijriDateOffsetDays ?? 0,
        hijriBoundaryMode: liveSettings.hijriBoundaryMode || 'civil',
      };
    });
    this.centralContent = new CentralContentProvider(options.centralContentReader);
    this.contentAdapter = new TelegramIslamicContentAdapter(this.centralContent);
    this.appReleaseService =
      options.appReleaseService ||
      new AppReleaseService({
        serverWriteFirestoreDoc: options.serverWriteFirestoreDoc,
        serverReadFirestoreCollection: options.serverReadFirestoreCollection,
        fetchImpl: options.fetchImpl as typeof fetch | undefined,
      });
    this.syncEngine = new UnifiedSyncEngine({
      storePath: options.outboxPath,
      repository: this.repository,
      apiClient: this.apiClient,
      emojiRegistry: this.emojiRegistry,
      miniAppUrl: this.config.miniAppUrl,
      logger: this.logger,
      serverWriteFirestoreDoc: options.serverWriteFirestoreDoc,
    });
    this.academyQuizService = new TelegramAcademyQuizService(this.repository);
    this.supportService = new TelegramSupportService(
      this.repository,
      this.apiClient,
      this.emojiRegistry
    );
    this.channelService = new TelegramChannelService(this.repository);
    this.publishingService = new TelegramPublishingService(
      this.apiClient,
      this.repository,
      this.emojiRegistry
    );
    this.broadcastManager = new TelegramBroadcastManager(
      this.repository,
      this.apiClient,
      this.emojiRegistry
    );
    this.contentStudio = new TelegramContentStudio(this.repository, this.publishingService);
    this.adminService = new TelegramAdminService(this.config, this.repository);
    this.aiBridge = new TelegramAiBridge(this.repository, {
      logger: this.logger,
      generator: options.aiGenerator,
      transcriber: options.aiTranscriber,
      tts: options.aiTts,
    });
    this.styleManager = new TelegramStyleManager(this.emojiRegistry, settings);
    this.quranMp3Service = new TelegramQuranMp3Service({
      repository: this.repository,
      centralContent: this.centralContent,
      apiClient: this.apiClient,
      emojiRegistry: this.emojiRegistry,
      centralAdminWriter: this.centralAdminWriter,
      fetchImpl: options.fetchImpl as typeof fetch | undefined,
    });
    this.hifzService = new TelegramHifzService(this.repository, this.aiBridge);
    this.jobScheduler = new TelegramJobScheduler({
      apiClient: this.apiClient,
      onUpdate: (u) => this.processUpdate(u),
      logger: this.logger,
      prayerAdapter: this.prayerAdapter,
      repository: this.repository,
      emojiRegistry: this.emojiRegistry,
      publishingService: this.publishingService,
      contentStudio: this.contentStudio,
      broadcastManager: this.broadcastManager,
      contentAdapter: this.contentAdapter,
      userService: this.userService,
      appReleaseService: this.appReleaseService,
      hifzService: this.hifzService,
    });
  }

  startRuntimeIfConfigured(): void {
    this.initializeRuntime().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.startupState = 'error';
      this.startupReason = `Unexpected startup error: ${msg}`;
      this.lastError = msg;
      this.lastErrorAt = new Date().toISOString();
      this.logger.error('Telegram bot startup failed unexpectedly', { error: msg });
    });
  }

  async initializeRuntime(): Promise<TelegramRuntimeState> {
    // 1. STRICT STARTUP HYDRATION FIRST — load authoritative Firestore state BEFORE polling/webhook!
    try {
      const hydrateRes = await this.repository.hydrateFromFirestore();
      await this.appReleaseService.hydrateFromFirestore();
      // Sync CustomEmojiRegistry from unified appConfig/emojiRegistry + telegramCustomEmojis
      const appCfgDoc = this.repository.getAppConfigEmojiRegistry();
      if (appCfgDoc) {
        this.emojiRegistry.hydrateFromAppConfigDocument(appCfgDoc);
      }
      this.emojiRegistry.hydrateFromEntries(this.repository.listCustomEmojis());
      const hydratedSettings = this.repository.getSettings();
      this.emojiRegistry.setPremiumEnabled(
        Boolean(hydratedSettings.premiumEmojiEnabled && hydratedSettings.premiumEmojiEligibilityVerified)
      );
      this.emojiRegistry.setKeyboardIconsEnabled(
        Boolean(hydratedSettings.premiumKeyboardIconsEnabled)
      );
      this.styleManager.syncFromSettings(hydratedSettings);
      const missingCanonicalAfterHydration = CANONICAL_EMOJI_SLOTS.filter(
        (k) => !this.emojiRegistry.getEntry(k)?.customEmojiId
      );
      if (missingCanonicalAfterHydration.length > 0 || !appCfgDoc) {
        void this.seedOwnerOfficialEmojis({
          verifyWithTelegram: false,
          preserveExistingCustomIds: true,
          updatedBy: 'auto_migration_34',
        }).catch(() => {});
      }
      this.logger.info('[BOOT_HYDRATION] Startup state synchronized before Telegram dispatch', {
        instanceId: this.instanceId,
        deploymentId: this.deploymentId,
        gitCommit: this.gitCommit,
        buildVersion: this.buildVersion,
        processId: process.pid,
        firestoreOk: hydrateRes.ok,
        collectionsLoaded: hydrateRes.collectionsLoaded,
        configVersion: hydratedSettings.version || 1,
        emojiRegistryVersion: appCfgDoc?.version || hydratedSettings.emojiRegistryVersion || 0,
        missingCanonicalAutoMigrating: missingCanonicalAfterHydration.length,
      });
    } catch (err) {
      this.logger.warn('Firestore hydration encountered an error during startup (degraded read-cache active)', {
        instanceId: this.instanceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 2. Register active instance heartbeat in Firestore (non-blocking) for multi-instance visibility
    void this.publishInstanceHeartbeat().catch(() => {});
    if (!this.instanceHeartbeatTimer) {
      this.instanceHeartbeatTimer = setInterval(() => {
        void this.publishInstanceHeartbeat().catch(() => {});
      }, 90_000);
      if (typeof this.instanceHeartbeatTimer.unref === 'function') {
        this.instanceHeartbeatTimer.unref();
      }
    }

    // 3. Start durable Unified Sync outbox worker & recover any interrupted jobs
    this.syncEngine.startWorker();

    if (!this.config.isConfigured) {
      this.startupState = 'disabled';
      this.startupReason =
        'TELEGRAM_BOT_TOKEN1 is not set in server environment variables. Bot is in standby mode.';
      this.logger.warn(this.startupReason);
      return this.getRuntimeState();
    }

    if (this.config.mode === 'disabled') {
      this.startupState = 'disabled';
      this.startupReason = 'Telegram bot explicitly disabled via TELEGRAM_MODE=disabled.';
      this.logger.info(this.startupReason);
      return this.getRuntimeState();
    }

    this.startupState = 'starting';
    this.startupReason = `Connecting to Telegram Bot API in ${this.config.mode} mode...`;

    const me = await this.apiClient.getMe();
    if (!me.ok || !me.result) {
      this.botApiConnected = false;
      this.startupState = 'error';
      this.lastError = me.description || 'Telegram getMe() failed';
      this.lastErrorAt = new Date().toISOString();
      this.startupReason = `Telegram Bot API connection failed (code=${me.error_code ?? 'network'}): ${this.lastError}. Verify TELEGRAM_BOT_TOKEN1 and outbound HTTPS access to api.telegram.org.`;
      this.logger.error(this.startupReason, {
        errorCode: me.error_code,
        mode: this.config.mode,
      });

      if (me.error_code !== 401 && !this.startupRetryTimer) {
        this.startupRetryCount++;
        const delayMs = Math.min(30_000, 4_000 * this.startupRetryCount);
        this.startupRetryTimer = setTimeout(() => {
          this.startupRetryTimer = null;
          this.initializeRuntime().catch(() => {});
        }, delayMs);
      }
      return this.getRuntimeState();
    }

    this.startupRetryCount = 0;
    if (this.startupRetryTimer) {
      clearTimeout(this.startupRetryTimer);
      this.startupRetryTimer = null;
    }

    this.botApiConnected = true;
    this.botId = me.result.id;
    this.botUsername = me.result.username || this.config.botUsername || null;
    this.botFirstName = me.result.first_name || null;
    if (
      this.config.botUsername &&
      me.result.username &&
      this.config.botUsername.toLowerCase() !== me.result.username.toLowerCase()
    ) {
      this.logger.warn(
        'TELEGRAM_BOT_USERNAME does not match the bot owned by TELEGRAM_BOT_TOKEN1',
        {
          configuredUsername: `@${this.config.botUsername}`,
          actualTokenBotUsername: `@${me.result.username}`,
        }
      );
    }
    this.logger.info('Connected to Telegram Bot API', {
      botId: this.botId,
      botUsername: this.botUsername ? `@${this.botUsername}` : null,
      mode: this.config.mode,
      modeAutoSelected: this.config.modeAutoSelected,
    });

    // Configure HTTPS Mini App menu button when available
    if (this.config.miniAppUrl && this.config.miniAppUrl.startsWith('https://')) {
      const mbRes = await this.apiClient.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: 'ASAKA ZIYO',
          web_app: { url: this.config.miniAppUrl },
        },
      });
      this.menuButtonConfigured = mbRes.ok;
    }

    // Non-blocking live verification probe for primary AI model (never runs in unit tests)
    if (!this.hasCustomAiGenerator && this.aiBridge.getStatus().apiKeyConfigured) {
      this.aiBridge
        .probeModelAvailability()
        .then((probe) => {
          this.logger.info('Telegram AI primary model live probe completed', {
            model: probe.model,
            available: probe.available,
            httpStatus: probe.httpStatus,
            latencyMs: probe.latencyMs,
          });
        })
        .catch(() => {});
    }

    if (this.config.mode === 'polling') {
      const delWh = await this.apiClient.deleteWebhook(false);
      if (!delWh.ok) {
        this.logger.warn('Failed to clear previous webhook before starting polling', {
          errorCode: delWh.error_code,
          description: delWh.description,
        });
      }

      const cmdSync = await this.syncBotCommandsWithTelegram();
      this.commandsSynced = cmdSync.ok;

      this.jobScheduler.startPolling();
      this.jobScheduler.startScheduledJobs();
      this.startupState = 'running_polling';
      this.startupReason = `Bot @${this.botUsername || 'unknown'} is active in long-polling mode and listening for /start updates.`;
      this.logger.info(this.startupReason);
      return this.getRuntimeState();
    }

    const missing: string[] = [];
    if (!this.config.webhookUrl) missing.push('TELEGRAM_WEBHOOK_URL');
    if (!this.config.webhookSecret) missing.push('TELEGRAM_WEBHOOK_SECRET');

    if (missing.length > 0) {
      this.startupState = 'misconfigured';
      this.startupReason = `TELEGRAM_MODE=webhook is active, but required environment variables are missing: ${missing.join(', ')}. Telegram cannot deliver /start updates until these are set or TELEGRAM_MODE=polling is used.`;
      this.lastError = this.startupReason;
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(this.startupReason, { missing });
      return this.getRuntimeState();
    }

    const reg = await this.registerConfiguredWebhook();
    if (!reg.ok) {
      this.startupState = 'error';
      this.webhookRegisteredOnStartup = false;
      this.lastError = reg.error || 'setWebhook failed';
      this.lastErrorAt = new Date().toISOString();
      this.startupReason = `Webhook registration failed for ${this.config.webhookUrl}: ${this.lastError}`;
      this.logger.error(this.startupReason);
      return this.getRuntimeState();
    }

    this.webhookRegisteredOnStartup = true;
    this.commandsSynced = true;
    this.jobScheduler.startScheduledJobs();
    this.startupState = 'running_webhook';
    this.startupReason = `Bot @${this.botUsername || 'unknown'} is active in webhook mode (${this.config.webhookUrl}).`;
    this.logger.info(this.startupReason);
    return this.getRuntimeState();
  }

  stopRuntime(): void {
    if (this.startupRetryTimer) {
      clearTimeout(this.startupRetryTimer);
      this.startupRetryTimer = null;
    }
    if (this.instanceHeartbeatTimer) {
      clearInterval(this.instanceHeartbeatTimer);
      this.instanceHeartbeatTimer = null;
    }
    this.syncEngine.stopWorker();
    this.jobScheduler.stopPolling();
    this.jobScheduler.stopScheduledJobs();
    this.repository.flushToDiskSync();
  }

  private async publishInstanceHeartbeat(): Promise<void> {
    const polling = this.jobScheduler.getPollingStatus();
    const settings = this.repository.getSettings();
    const rec: TelegramRuntimeInstanceRecord = {
      id: this.instanceId,
      instanceId: this.instanceId,
      deploymentId: this.deploymentId,
      gitCommit: this.gitCommit,
      buildVersion: this.buildVersion,
      processId: process.pid,
      hostname: os.hostname(),
      mode: this.config.mode,
      configVersion: settings.version || 1,
      emojiRegistryVersion:
        this.repository.getAppConfigEmojiRegistry()?.version || settings.emojiRegistryVersion || 0,
      startedAt: this.startedAt,
      lastHeartbeatAt: new Date().toISOString(),
      pollingActive: polling.pollingActive,
      pollingConflictCount: polling.conflictCount,
    };
    await this.repository.registerRuntimeInstance(rec);
  }

  /**
   * Synchronizes the in-memory CustomEmojiRegistry into Firestore `appConfig/emojiRegistry`
   * AND `app_config/premium_emojis` so Web App, Android App, Admin Panel, and Telegram Bot
   * share one authoritative catalog.
   */
  async syncEmojiRegistryToAppConfig(updatedBy = 'admin') {
    const currentVer = this.repository.getAppConfigEmojiRegistry()?.version || 0;
    const nextVer = currentVer + 1;
    const doc = this.emojiRegistry.toAppConfigDocument(nextVer, updatedBy);
    const premiumDoc = this.emojiRegistry.toPremiumEmojisConfigDocument(nextVer, updatedBy);
    return this.repository.saveAppConfigEmojiRegistry(doc, premiumDoc);
  }

  /**
   * Seeds all 34 permanent owner-provided Telegram Premium Custom Emoji IDs
   * (28 core + 6 welcome/reaction IDs) and registers all 30 extended managed slots (without fake IDs)
   * into Firestore `telegramCustomEmojis`, `appConfig/emojiRegistry`, AND `app_config/premium_emojis`.
   * Migration is idempotent and non-destructive by default (`preserveExistingCustomIds: true`).
   * If Telegram Bot API token is configured and `verifyWithTelegram` is true, runs live
   * `getCustomEmojiStickers` verification (unverified IDs are NEVER falsely marked verified).
   */
  async seedOwnerOfficialEmojis(options?: {
    verifyWithTelegram?: boolean;
    preserveExistingCustomIds?: boolean;
    updatedBy?: string;
  }): Promise<{
    ok: boolean;
    seededCount: number;
    canonicalCount: number;
    extended30SlotsCount: number;
    verifiedCount: number;
    unverifiedKeys: string[];
    telegramChecked: boolean;
    appConfigSaved: boolean;
    appConfigVersion: number;
    firestorePaths: string[];
    error?: string;
  }> {
    const updatedBy = options?.updatedBy || 'owner_seed_34';
    const preserveExistingCustomIds = options?.preserveExistingCustomIds !== false;
    const entries = this.emojiRegistry.buildOwnerInitialCatalogEntries(updatedBy, {
      preserveExistingCustomIds,
    });

    let telegramChecked = false;
    let verifiedCount = 0;
    const unverifiedKeys: string[] = [];

    if (options?.verifyWithTelegram !== false && this.apiClient.isConfigured) {
      telegramChecked = true;
      const ids = entries.map((e) => e.customEmojiId!).filter(Boolean);
      const stickerRes = await this.apiClient.getCustomEmojiStickers(ids);
      const stickerMap = new Map<string, any>();
      if (stickerRes.ok && Array.isArray(stickerRes.result)) {
        for (const st of stickerRes.result) {
          if (st?.custom_emoji_id) stickerMap.set(String(st.custom_emoji_id), st);
        }
      }
      const nowIso = new Date().toISOString();
      for (const entry of entries) {
        const st = entry.customEmojiId ? stickerMap.get(entry.customEmojiId) : undefined;
        if (st) {
          entry.verified = true;
          entry.verifiedAt = nowIso;
          entry.status = entry.enabled === false ? 'disabled' : 'verified';
          entry.stickerSetName = st.set_name || entry.stickerSetName;
          const fmt: CustomEmojiWebAssetFormat = st.is_video
            ? 'webm'
            : st.is_animated
              ? 'tgs'
              : 'webp';
          entry.webAssetFormat = fmt;
          entry.webRenderable = fmt === 'webp' || fmt === 'webm';
          verifiedCount++;
        } else {
          entry.verified = false;
          unverifiedKeys.push(entry.key);
        }
      }
    } else {
      for (const entry of entries) {
        if (entry.verified) verifiedCount++;
        else unverifiedKeys.push(entry.key);
      }
    }

    const savedEntries: typeof entries = [];
    for (const entry of entries) {
      const saved = await this.repository.saveCustomEmoji(entry);
      savedEntries.push(saved);
    }
    this.emojiRegistry.hydrateFromEntries(savedEntries);

    const appCfgRes = await this.syncEmojiRegistryToAppConfig(updatedBy);

    if (verifiedCount > 0) {
      await this.repository.saveSettings(
        {
          premiumEmojiEnabled: true,
          premiumKeyboardIconsEnabled: true,
          premiumEmojiEligibilityVerified: true,
          premiumEmojiEligibilityCheckedAt: new Date().toISOString(),
          emojiRegistryVersion: appCfgRes.doc.version,
        },
        updatedBy
      );
      this.emojiRegistry.setPremiumEnabled(true);
      this.emojiRegistry.setKeyboardIconsEnabled(true);
    }

    await this.repository.appendAuditLog({
      actorTelegramId: updatedBy,
      actorRole: 'admin',
      action: 'owner_34_emojis_seeded',
      targetType: 'emoji',
      metadata: {
        seededCount: entries.length,
        canonicalCount: CANONICAL_EMOJI_SLOTS.length,
        extended30SlotsCount: EXTENDED_30_EMOJI_SLOTS.length,
        preserveExistingCustomIds,
        verifiedCount,
        telegramChecked,
        appConfigVersion: appCfgRes.doc.version,
        aiAssistantId: OWNER_INITIAL_PREMIUM_EMOJI_CATALOG.ai_assistant,
      },
    });

    return {
      ok: true,
      seededCount: entries.length,
      canonicalCount: CANONICAL_EMOJI_SLOTS.length,
      extended30SlotsCount: EXTENDED_30_EMOJI_SLOTS.length,
      verifiedCount,
      unverifiedKeys,
      telegramChecked,
      appConfigSaved: appCfgRes.ok,
      appConfigVersion: appCfgRes.doc.version,
      firestorePaths: ['app_config/premium_emojis', 'appConfig/emojiRegistry', 'telegramCustomEmojis'],
      error: appCfgRes.error,
    };
  }

  /**
   * Resolves a Telegram custom emoji asset strictly server-side (ZERO bot token exposure!)
   * with in-memory caching for Web App & Android WebView rendering.
   * Detects `webp` (static), `webm` (video), or `tgs` (Lottie) honestly.
   */
  async resolveEmojiWebAsset(key: string): Promise<{
    ok: boolean;
    buffer?: Buffer;
    mimeType?: string;
    format: CustomEmojiWebAssetFormat;
    renderable: boolean;
    reason?: string;
  }> {
    const entry = this.emojiRegistry.getEntry(key);
    if (!entry || !entry.customEmojiId) {
      return { ok: false, format: 'unknown', renderable: false, reason: 'Emoji slot has no customEmojiId.' };
    }

    const cached = this.emojiAssetCache.get(key);
    if (
      cached &&
      cached.customEmojiId === entry.customEmojiId &&
      Date.now() - cached.cachedAt < 6 * 60 * 60_000
    ) {
      return {
        ok: true,
        buffer: cached.buffer,
        mimeType: cached.mimeType,
        format: cached.format,
        renderable: cached.renderable,
      };
    }

    if (!this.apiClient.isConfigured) {
      return {
        ok: false,
        format: entry.webAssetFormat || 'unknown',
        renderable: false,
        reason: 'TELEGRAM_BOT_TOKEN1 is not configured on server; Telegram sticker file cannot be fetched.',
      };
    }

    const stickers = await this.apiClient.getCustomEmojiStickers([entry.customEmojiId]);
    const sticker = stickers.ok && Array.isArray(stickers.result) ? stickers.result[0] : undefined;
    if (!sticker || !sticker.file_id) {
      return {
        ok: false,
        format: 'unknown',
        renderable: false,
        reason: stickers.description || 'Sticker not found in Telegram API.',
      };
    }

    const format: CustomEmojiWebAssetFormat = sticker.is_video
      ? 'webm'
      : sticker.is_animated
        ? 'tgs'
        : 'webp';
    // Prefer static thumbnail if animated TGS (browsers can render WebP thumbnail natively!)
    const targetFileId =
      format === 'tgs' && (sticker as any).thumbnail?.file_id
        ? String((sticker as any).thumbnail.file_id)
        : sticker.file_id;
    const effectiveFormat: CustomEmojiWebAssetFormat =
      format === 'tgs' && (sticker as any).thumbnail?.file_id ? 'webp' : format;

    const fileRes = await this.apiClient.getFile(targetFileId);
    if (!fileRes.ok || !fileRes.result?.file_path) {
      return {
        ok: false,
        format: effectiveFormat,
        renderable: false,
        reason: fileRes.description || 'Telegram getFile failed.',
      };
    }

    const dl = await this.apiClient.downloadFileBuffer(fileRes.result.file_path);
    if (!dl.ok || !dl.buffer) {
      return {
        ok: false,
        format: effectiveFormat,
        renderable: false,
        reason: dl.error || 'Telegram file download failed.',
      };
    }

    const mimeType =
      effectiveFormat === 'webm'
        ? 'video/webm'
        : effectiveFormat === 'tgs'
          ? 'application/x-tgsticker'
          : 'image/webp';
    const renderable = effectiveFormat === 'webp' || effectiveFormat === 'webm';

    this.emojiAssetCache.set(key, {
      buffer: dl.buffer,
      mimeType,
      format: effectiveFormat,
      renderable,
      cachedAt: Date.now(),
      customEmojiId: entry.customEmojiId,
    });
    if (this.emojiAssetCache.size > 200) {
      const oldestKey = this.emojiAssetCache.keys().next().value;
      if (oldestKey) this.emojiAssetCache.delete(oldestKey);
    }

    // Update entry metadata in memory so public catalog reports exact format & renderability
    entry.webAssetFormat = effectiveFormat;
    entry.webRenderable = renderable;

    return {
      ok: true,
      buffer: dl.buffer,
      mimeType,
      format: effectiveFormat,
      renderable,
    };
  }

  getRuntimeState(): TelegramRuntimeState {
    const polling = this.jobScheduler.getPollingStatus();
    return {
      startupState: this.startupState,
      startupReason: this.startupReason,
      botApiConnected: this.botApiConnected,
      botId: this.botId,
      botUsername: this.botUsername || this.config.botUsername || null,
      botFirstName: this.botFirstName,
      webhookRegisteredOnStartup: this.webhookRegisteredOnStartup,
      commandsSynced: this.commandsSynced,
      menuButtonConfigured: this.menuButtonConfigured,
      totalUpdatesHandled: this.totalUpdatesHandled,
      lastUpdateHandledAt: this.lastUpdateHandledAt,
      lastError: this.lastError || polling.lastError,
      lastErrorAt: this.lastErrorAt || polling.lastErrorAt,
      polling,
    };
  }

  async runLiveDiagnostics(): Promise<TelegramLiveDiagnosticsReport> {
    const checkedAt = new Date().toISOString();
    const configSummary = getSafeTelegramConfigSummary(this.config);
    const polling = this.jobScheduler.getPollingStatus();
    const issues: string[] = [];

    if (!this.config.isConfigured) {
      issues.push('TELEGRAM_BOT_TOKEN1 is missing from server environment variables.');
      return {
        checkedAt,
        tokenConfigured: false,
        mode: this.config.mode,
        modeAutoSelected: this.config.modeAutoSelected,
        startupState: this.startupState,
        startupReason: this.startupReason,
        telegramApi: { connected: false, error: 'TELEGRAM_BOT_TOKEN1 not configured' },
        webhookInfo: { checked: false, error: 'TELEGRAM_BOT_TOKEN1 not configured' },
        polling,
        configSummary,
        issues,
        readyToAnswerStart: false,
      };
    }

    const [me, wh] = await Promise.all([
      this.apiClient.getMe(),
      this.apiClient.getWebhookInfo(),
    ]);

    const telegramApi = me.ok && me.result
      ? {
          connected: true,
          botId: me.result.id,
          botUsername: me.result.username,
          botFirstName: me.result.first_name,
        }
      : {
          connected: false,
          errorCode: me.error_code,
          error: me.description || 'Unable to reach Telegram Bot API',
        };

    if (!telegramApi.connected) {
      issues.push(`Telegram API getMe() failed: ${telegramApi.error}`);
    } else {
      this.botApiConnected = true;
      this.botId = me.result!.id;
      this.botUsername = me.result!.username || this.botUsername;
      this.botFirstName = me.result!.first_name || this.botFirstName;
      if (
        this.config.botUsername &&
        me.result!.username &&
        this.config.botUsername.toLowerCase() !== me.result!.username.toLowerCase()
      ) {
        issues.push(
          `Bot username mismatch: TELEGRAM_BOT_USERNAME is "@${this.config.botUsername}", but TELEGRAM_BOT_TOKEN1 belongs to "@${me.result!.username}".`
        );
      }
    }

    const whResult: WebhookInfoResult | undefined = wh.ok ? wh.result : undefined;
    const webhookInfo = wh.ok && whResult
      ? {
          checked: true,
          url: whResult.url || '',
          pendingUpdateCount: whResult.pending_update_count,
          lastErrorMessage: whResult.last_error_message,
          lastErrorDate: whResult.last_error_date,
        }
      : {
          checked: true,
          error: wh.description || 'getWebhookInfo failed',
        };

    if (this.config.mode === 'disabled') {
      issues.push('Bot is disabled (TELEGRAM_MODE=disabled).');
    } else if (this.config.mode === 'polling') {
      if (!polling.pollingActive) {
        issues.push('Polling mode is configured, but the polling loop is not currently running.');
      }
      if (webhookInfo.url) {
        issues.push(
          `A Telegram webhook is still registered (${webhookInfo.url}); this blocks getUpdates polling with 409 Conflict.`
        );
      }
      if (polling.lastError) {
        issues.push(`Polling error: ${polling.lastError}`);
      }
    } else if (this.config.mode === 'webhook') {
      if (!this.config.webhookUrl) issues.push('TELEGRAM_WEBHOOK_URL is not set.');
      if (!this.config.webhookSecret) {
        issues.push('TELEGRAM_WEBHOOK_SECRET is not set.');
      }
      if (whResult && !whResult.url) {
        issues.push('Telegram currently has NO webhook URL registered.');
      } else if (whResult && this.config.webhookUrl && whResult.url !== this.config.webhookUrl) {
        issues.push(
          `Registered Telegram webhook (${whResult.url}) does not match TELEGRAM_WEBHOOK_URL (${this.config.webhookUrl}).`
        );
      }
      if (whResult?.last_error_message) {
        issues.push(`Telegram webhook delivery error: ${whResult.last_error_message}`);
      }
    }

    const readyToAnswerStart = Boolean(
      telegramApi.connected &&
        issues.length === 0 &&
        ((this.config.mode === 'polling' && polling.pollingActive) ||
          (this.config.mode === 'webhook' &&
            Boolean(this.config.webhookUrl) &&
            Boolean(this.config.webhookSecret) &&
            Boolean(whResult?.url)))
    );

    return {
      checkedAt,
      tokenConfigured: true,
      mode: this.config.mode,
      modeAutoSelected: this.config.modeAutoSelected,
      startupState: this.startupState,
      startupReason: this.startupReason,
      telegramApi,
      webhookInfo,
      polling,
      configSummary,
      issues,
      readyToAnswerStart,
    };
  }

  async syncBotCommandsWithTelegram(): Promise<{ ok: boolean; error?: string }> {
    if (!this.apiClient.isConfigured) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN1 not configured' };
    }
    const toCommandList = (dict: ReturnType<typeof getTelegramLocaleBundle>) => [
      { command: 'start', description: dict.commands.start },
      { command: 'menu', description: dict.commands.menu },
      { command: 'daily', description: dict.commands.daily },
      { command: 'hifz', description: dict.commands.hifz },
      { command: 'prayer', description: dict.commands.prayer },
      { command: 'obhavo', description: 'Ob-havo (7 kunlik prognoz)' },
      { command: 'hudud', description: 'Hudud va shahar tanlash' },
      { command: 'qibla', description: dict.commands.qibla },
      { command: 'ramadan', description: dict.commands.ramadan },
      { command: 'calendar', description: dict.commands.calendar },
      { command: 'quran', description: dict.commands.quran },
      { command: 'tafsir', description: dict.commands.tafsir },
      { command: 'khatm', description: dict.commands.khatm },
      { command: 'hadith', description: dict.commands.hadith },
      { command: 'dhikr', description: dict.commands.dhikr },
      { command: 'dua', description: dict.commands.dua },
      { command: 'maqolalar', description: dict.mediaArticlesLabel },
      { command: 'elonlar', description: dict.mediaAnnouncementsLabel },
      { command: 'yangiliklar', description: dict.mediaNewsLabel },
      { command: 'audio', description: dict.mediaAudioLabel },
      { command: 'video', description: dict.mediaVideoLabel },
      { command: 'academy', description: dict.commands.academy },
      { command: 'quiz', description: dict.commands.quiz },
      { command: 'android', description: dict.buttons.androidApp },
      { command: 'webapp', description: dict.buttons.webApp },
      { command: 'bookmarks', description: dict.commands.bookmarks },
      { command: 'ask', description: dict.commands.ask },
      { command: 'support', description: dict.commands.support },
      { command: 'profile', description: dict.commands.profile },
      { command: 'language', description: dict.commands.language },
      { command: 'settings', description: dict.commands.settings },
      { command: 'help', description: dict.commands.help },
    ];

    const uzDict = getTelegramLocaleBundle('uz-Latn');
    const ruDict = getTelegramLocaleBundle('ru');
    const enDict = getTelegramLocaleBundle('en');

    const defaultRes = await this.apiClient.setMyCommands(toCommandList(uzDict));
    await this.apiClient.setMyCommands(toCommandList(ruDict), 'ru');
    await this.apiClient.setMyCommands(toCommandList(enDict), 'en');
    return { ok: defaultRes.ok, error: defaultRes.description };
  }

  async registerConfiguredWebhook(): Promise<{
    ok: boolean;
    webhookUrl?: string;
    error?: string;
  }> {
    if (!this.apiClient.isConfigured) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN1 is not configured.' };
    }
    if (!this.config.webhookUrl) {
      return { ok: false, error: 'TELEGRAM_WEBHOOK_URL is not configured.' };
    }
    if (!this.config.webhookSecret) {
      return { ok: false, error: 'TELEGRAM_WEBHOOK_SECRET is not configured.' };
    }
    const res = await this.apiClient.setWebhook({
      url: this.config.webhookUrl,
      secret_token: this.config.webhookSecret,
      allowed_updates: ['message', 'callback_query'],
    });
    if (res.ok) {
      await this.syncBotCommandsWithTelegram();
      await this.repository.appendAuditLog({
        actorTelegramId: this.config.ownerId || 'system',
        actorRole: 'system',
        action: 'webhook_registered',
        targetType: 'webhook',
        metadata: { secretProtected: true },
      });
    }
    return {
      ok: res.ok,
      webhookUrl: this.config.webhookUrl,
      error: res.description,
    };
  }

  private async handleActiveFlowInput(
    message: TelegramApiMessage,
    user: TelegramUserRecord,
    chatId: number | string
  ): Promise<UpdateDispatchOutcome | null> {
    const flow = user.activeFlow;
    if (!flow || flow.type === 'idle') return null;

    const locale = user.language;
    const dict = getTelegramLocaleBundle(locale);
    const text = (message.text || message.caption || '').trim();
    const actorId = user.telegramId;
    const role = this.adminService.getEffectiveRole(actorId);
    const settings = this.repository.getSettings();

    const extractMediaAttachment = (): {
      mediaType?: 'photo' | 'video' | 'audio' | 'voice' | 'document';
      fileId?: string;
    } => {
      if (message.photo && message.photo.length > 0) {
        return { mediaType: 'photo', fileId: message.photo[message.photo.length - 1].file_id };
      }
      if (message.voice) return { mediaType: 'voice', fileId: message.voice.file_id };
      if (message.audio) return { mediaType: 'audio', fileId: message.audio.file_id };
      if (message.video) return { mediaType: 'video', fileId: message.video.file_id };
      if (message.document) return { mediaType: 'document', fileId: message.document.file_id };
      return {};
    };

    // Registration & Profile Name Editing Flows
    if (flow.type === 'register_first_name') {
      const check = validateRegistrationName(text);
      if (!check.valid || !check.sanitized) {
        const fmt = this.emojiRegistry.formatMessage(dict.registerInvalidName);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
          reply_markup: buildRegistrationCancelKeyboard(locale),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'register_first_name_invalid' };
      }
      await this.userService.setActiveFlow(actorId, {
        type: 'register_last_name',
        firstName: check.sanitized,
        mode: flow.mode,
      });
      const fmt = this.emojiRegistry.formatMessage(dict.registerAskLastName);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildRegistrationCancelKeyboard(locale),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'register_first_name' };
    }

    if (flow.type === 'register_last_name') {
      const check = validateRegistrationName(text);
      if (!check.valid || !check.sanitized) {
        const fmt = this.emojiRegistry.formatMessage(dict.registerInvalidName);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
          reply_markup: buildRegistrationCancelKeyboard(locale),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'register_last_name_invalid' };
      }
      await this.userService.setActiveFlow(actorId, {
        type: 'register_confirm',
        firstName: flow.firstName,
        lastName: check.sanitized,
        mode: flow.mode,
      });
      const confirmText = dict.registerConfirmPrompt
        .replace('{firstName}', flow.firstName)
        .replace('{lastName}', check.sanitized);
      const fmt = this.emojiRegistry.formatMessage(confirmText);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildRegistrationConfirmKeyboard(locale),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'register_last_name' };
    }

    // HIFZ Stateful Input Flows
    if (flow.type === 'hifz_mark_range') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const m = text.match(/^(\d{1,3})(?:\s*[-–:\s]\s*(\d{1,3}))?$/);
      const startAyah = m ? Number(m[1]) : NaN;
      const endAyah = m ? Number(m[2] || m[1]) : NaN;
      const res = await this.hifzService.markAyahRangeMemorized(
        actorId,
        flow.surahNumber,
        startAyah,
        endAyah
      );
      const profile = res.profile || (await this.hifzService.getOrCreateProfile(actorId));
      const view = formatSurahHifzDetail(profile, flow.surahNumber, 0, locale);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: res.ok
          ? `{{emoji:success}} ${flow.surahNumber}-sura (${startAyah}-${endAyah}-oyat) saqlandi!\n\n${view.text}`
          : `{{emoji:error}} Oyat oraligʻi notoʻgʻri: "${text}". Masalan: 1-10\n\n${view.text}`,
        reply_markup: view.keyboard,
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hifz_mark_range' };
    }

    if (flow.type === 'hifz_set_goal_ayahs') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const goal = Number.parseInt(text, 10);
      const profile = await this.hifzService.updateSettings(actorId, {
        dailyNewAyahsGoal: Number.isFinite(goal) ? goal : 5,
      });
      const stats = this.hifzService.getStats(profile);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: `{{emoji:success}} Kunlik yangi oyat maqsadi: ${profile.dailyNewAyahsGoal} oyat/kun\n\n${formatHifzHomeText(profile, stats, locale)}`,
        reply_markup: buildHifzHomeKeyboard(locale),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hifz_set_goal_ayahs' };
    }

    if (flow.type === 'hifz_set_goal_minutes') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const mins = Number.parseInt(text, 10);
      const profile = await this.hifzService.updateSettings(actorId, {
        dailyReviewMinutesGoal: Number.isFinite(mins) ? mins : 25,
      });
      const stats = this.hifzService.getStats(profile);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: `{{emoji:success}} Kunlik murojaa vaqti: ${profile.dailyReviewMinutesGoal} daqiqa\n\n${formatHifzHomeText(profile, stats, locale)}`,
        reply_markup: buildHifzHomeKeyboard(locale),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hifz_set_goal_minutes' };
    }

    if (flow.type === 'hifz_coach_ask') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      await this.apiClient.sendChatAction(chatId, 'typing');
      const coachRes = await this.hifzService.askCoach(actorId, locale, text);
      const hs = getHifzStrings(locale);
      const formattedCoach = this.emojiRegistry.formatAiResponse(coachRes.text);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: formattedCoach.text,
        ...(formattedCoach.entities.length > 0 ? { entities: formattedCoach.entities } : {}),
        reply_markup: {
          inline_keyboard: [
            [this.emojiRegistry.buildKeyboardButton('support', 'Yana savol berish', { callback_data: 'hifz:coach:ask' })],
            [this.emojiRegistry.buildKeyboardButton('back', hs.btnBackHifz, { callback_data: 'hifz:home' })],
          ],
        },
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hifz_coach_ask' };
    }

    if (flow.type === 'hifz_log_difficult') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const m = text.match(/^(\d{1,3})(?:\s+(.*))?$/);
      const ayahNum = m ? Number(m[1]) : NaN;
      const note = m?.[2]?.trim();
      const res = await this.hifzService.logDifficultAyah(actorId, flow.surahNumber, ayahNum, note);
      const profile = await this.hifzService.getOrCreateProfile(actorId);
      const view = formatSurahHifzDetail(profile, flow.surahNumber, 0, locale);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: res.ok
          ? `{{emoji:warning}} ${flow.surahNumber}:${ayahNum} qiyin oyatlar roʻyxatiga qoʻshildi (ertangi murojaada alohida mashq boʻladi).\n\n${view.text}`
          : `{{emoji:error}} Oyat raqami notoʻgʻri: "${text}".\n\n${view.text}`,
        reply_markup: view.keyboard,
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hifz_log_difficult' };
    }

    if (flow.type === 'quran_search') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const matches = this.contentAdapter.searchSurahs(text);
      if (matches.length === 0) {
        const fmt = this.emojiRegistry.formatMessage(dict.searchNoResults);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
        });
      } else {
        const fmt = this.emojiRegistry.formatMessage(
          `${dict.quranTitle} — "${text}" (${matches.length})`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
          reply_markup: buildSurahListKeyboard(locale, matches, this.emojiRegistry, 0, 1),
        });
      }
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'quran_search' };
    }

    if (flow.type === 'hadith_search') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const matches = this.contentAdapter.searchHadiths(text);
      const body =
        matches.length === 0
          ? dict.searchNoResults
          : matches
              .slice(0, 4)
              .map(
                (m, i) =>
                  `${i + 1}. ${m.chapterUz} — ${m.translationUz.slice(0, 180)}... (${m.collectionNameUz})`
              )
              .join('\n\n');
      const fmt = this.emojiRegistry.formatMessage(`${dict.hadithTitle}\n\n${body}`);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'hadith_search' };
    }

    if (flow.type === 'global_search') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const resultText = this.contentAdapter.performGlobalSearch(text, locale);
      const fmt = this.emojiRegistry.formatMessage(resultText);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'global_search' };
    }

    if (flow.type === 'tools_verify_search') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const fmt = this.emojiRegistry.formatMessage(
        formatSourceVerificationGuide(locale, text || 'Tafsiri Hilol')
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildSourceVerificationKeyboard(locale, this.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'tools_verify_search' };
    }

    if (flow.type === 'tools_cyber_check') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      // Static filename/URL inspection ONLY — NEVER download or execute attachments
      const docName = message.document?.file_name;
      const analysis = analyzeCyberSafetyInput(text, docName);
      const fmt = this.emojiRegistry.formatMessage(formatCyberSafetyResultText(locale, analysis));
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildCyberSafetyKeyboard(locale, this.emojiRegistry),
        disable_web_page_preview: true,
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: `tools_cyber_check:${analysis.riskLevel}` };
    }

    if (flow.type === 'khatm_set_days') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const days = Math.min(365, Math.max(7, Number.parseInt(text, 10) || 30));
      await this.contentAdapter.startOrUpdateKhatmPlan(this.repository, actorId, days);
      const khatm = this.contentAdapter.formatKhatmCard(
        this.repository,
        actorId,
        locale,
        this.emojiRegistry
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: khatm.text,
        ...(khatm.entities.length > 0 ? { entities: khatm.entities } : {}),
        reply_markup: buildKhatmKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'khatm_set_days' };
    }

    if (flow.type === 'tasbeh_set_goal') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const goal = Math.min(100000, Math.max(1, Number.parseInt(text, 10) || 33));
      const preview = this.contentAdapter.formatDhikrCard(
        flow.dhikrIndex,
        0,
        locale,
        this.emojiRegistry
      );
      const savedGoal = await this.contentAdapter.setDhikrCustomGoal(
        this.repository,
        actorId,
        preview.dhikrId,
        goal
      );
      const eng = this.repository.getUserEngagement(actorId);
      const currentCount = eng.dhikr.countsByDhikrId[preview.dhikrId] || 0;
      const dhikr = this.contentAdapter.formatDhikrCard(
        flow.dhikrIndex,
        currentCount,
        locale,
        this.emojiRegistry,
        savedGoal,
        eng.dhikr.todayCount
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: dhikr.formatted.text,
        ...(dhikr.formatted.entities.length > 0 ? { entities: dhikr.formatted.entities } : {}),
        reply_markup: buildDhikrKeyboard(
          locale,
          dhikr.index,
          dhikr.total,
          currentCount,
          this.emojiRegistry
        ),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'tasbeh_set_goal' };
    }

    if (flow.type === 'support_new') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const media = extractMediaAttachment();
      const bodyText = text || (media.mediaType ? `[${media.mediaType} attachment]` : 'Murojaat');
      const ticket = await this.supportService.createTicket({
        user,
        category: flow.category,
        subject: bodyText.slice(0, 90),
        text: bodyText,
        mediaType: media.mediaType,
        telegramFileId: media.fileId,
        notifyAdmins: this.config.adminIds,
      });
      const fmt = this.emojiRegistry.formatMessage(
        `${dict.supportCreatedNotice}\n\n{{emoji:profile}} ID: ${ticket.id}\n{{emoji:settings}} Boʻlim: ${ticket.category}`
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: buildSupportHomeKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: `support_new:${ticket.id}` };
    }

    if (flow.type === 'support_reply') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const media = extractMediaAttachment();
      const bodyText = text || (media.mediaType ? `[${media.mediaType}]` : '...');
      await this.supportService.addUserReply({
        ticketId: flow.ticketId,
        user,
        text: bodyText,
        mediaType: media.mediaType,
        telegramFileId: media.fileId,
      });
      const fmt = this.emojiRegistry.formatMessage(
        `${dict.supportCreatedNotice}\n{{emoji:profile}} ID: ${flow.ticketId}`
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        reply_markup: buildSupportHomeKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: `support_reply:${flow.ticketId}` };
    }

    if (flow.type === 'quran_mp3_search') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const hits = this.quranMp3Service.searchRecitersAndSurahs(text, flow.reciterId);
      const eng = this.repository.getUserEngagement(actorId);
      const defaultRecId = flow.reciterId || eng.preferredReciterId || 'mishary';
      const rows = [
        ...hits.reciters.slice(0, 4).map((r) => [
          this.emojiRegistry.buildKeyboardButton(
            'quran_mp3',
            `${r.nameUz} (${r.availableSurahCount}/114)`,
            { callback_data: `qmp3:reciter:${r.id}:0` }
          ),
        ]),
        ...hits.surahs.slice(0, 8).map((s) => [
          this.emojiRegistry.buildKeyboardButton(
            'play',
            `${s.number}. ${s.nameUz} (${s.nameAr})`,
            { callback_data: `qmp3:play:${defaultRecId}:${s.number}` }
          ),
        ]),
        [
          this.emojiRegistry.buildKeyboardButton('quran_mp3', 'Qurʼon MP3', {
            callback_data: 'qmp3:home',
          }),
          this.emojiRegistry.buildKeyboardButton('back', dict.buttons.backToMenu, {
            callback_data: 'nav:home',
          }),
        ],
      ];
      const hasAny = hits.reciters.length > 0 || hits.surahs.length > 0;
      const fmt = this.emojiRegistry.formatMessage(
        hasAny
          ? `{{emoji:quran_mp3}} Qidiruv: "${text}" — ${hits.reciters.length} qori, ${hits.surahs.length} sura topildi:`
          : `${dict.searchNoResults} ("${text}")`
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        ...(fmt.entities.length > 0 ? { entities: fmt.entities } : {}),
        reply_markup: this.styleManager.decorateInlineMarkup({ inline_keyboard: rows }),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'quran_mp3_search' };
    }

    if (flow.type === 'personal_reminder_add') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const m = text.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
      if (!m) {
        const rems = this.userService.listPersonalReminders(actorId);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: '{{emoji:error}} Notoʻgʻri format. Masalan: 06:30 Qurʼon tilovati',
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildPersonalRemindersKeyboard(locale, rems, this.emojiRegistry)
          ),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'personal_reminder_invalid' };
      }
      const timeHHMM = `${m[1].padStart(2, '0')}:${m[2]}`;
      const label = m[3].trim().slice(0, 80);
      await this.userService.addPersonalReminder(actorId, label, timeHHMM);
      const rems = this.userService.listPersonalReminders(actorId);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: `{{emoji:success}} Shaxsiy eslatma qoʻshildi: ${timeHHMM} — ${label}`,
        reply_markup: this.styleManager.decorateInlineMarkup(
          buildPersonalRemindersKeyboard(locale, rems, this.emojiRegistry)
        ),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'personal_reminder_add' };
    }

    if (flow.type === 'notif_custom_lead_minutes') {
      await this.userService.setActiveFlow(actorId, { type: 'idle' });
      const parsed = Number.parseInt(text, 10);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 120) {
        const prefs = this.userService.getNotificationPreferences(actorId);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: '{{emoji:error}} Iltimos 0 dan 120 gacha boʻlgan daqiqa sonini kiriting (masalan: 20).',
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildNotificationCenterKeyboard(user, prefs, this.emojiRegistry)
          ),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'notif_custom_lead_invalid' };
      }
      const updatedUser = await this.userService.setCustomLeadMinutes(
        actorId,
        parsed === 0 ? null : parsed
      );
      const prefs = this.userService.getNotificationPreferences(actorId);
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text:
          parsed === 0
            ? '{{emoji:success}} Maxsus oldindan eslatish vaqti oʻchirildi.'
            : `{{emoji:success}} Maxsus eslatma saqlandi: namozdan ${parsed} daqiqa oldin.`,
        reply_markup: this.styleManager.decorateInlineMarkup(
          buildNotificationCenterKeyboard(updatedUser.user || user, prefs, this.emojiRegistry)
        ),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: 'notif_custom_lead_minutes' };
    }

    // Admin-only flows
    if (flow.type.startsWith('admin_')) {
      if (!role) {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const fmt = this.emojiRegistry.formatMessage(dict.adminAccessDenied);
        await this.apiClient.sendMessage({ chat_id: chatId, text: fmt.text });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_flow_denied' };
      }

      if (flow.type === 'admin_ticket_reply') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const adminName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Admin';
        const res = await this.supportService.replyFromAdmin({
          ticketId: flow.ticketId,
          adminId: actorId,
          adminName,
          replyText: text || 'Javob yuborildi.',
        });
        const tickets = this.supportService.listAllTickets();
        const fmt = this.emojiRegistry.formatMessage(
          res.ok
            ? `{{emoji:success}} Javob yuborildi (${flow.ticketId}) | Foydalanuvchiga yetkazildi: ${res.deliveredToUser ? 'HA' : 'YOʻQ'}`
            : `{{emoji:error}} Xatolik: ${res.error || 'Ticket topilmadi'}`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          reply_markup: buildAdminSupportKeyboard(locale, tickets, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_ticket_reply' };
      }

      if (flow.type === 'admin_user_search') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const found = this.userService.searchUsers({ query: text }).slice(0, 10);
        const lines =
          found.length === 0
            ? [dict.searchNoResults]
            : found.map(
                (u) =>
                  `• ${u.firstName}${u.username ? ` (@${u.username})` : ''} — ID: ${u.telegramId} | ${u.language}${u.isBlocked ? ' [BLOCKED]' : ''}`
              );
        const fmt = this.emojiRegistry.formatMessage(
          `{{emoji:community}} Qidiruv natijasi ("${text}"):\n\n${lines.join('\n')}`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: fmt.text,
          reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_user_search' };
      }

      if (flow.type === 'admin_broadcast_title') {
        const title = text.slice(0, 140) || 'ASAKA ZIYO Eʼloni';
        await this.userService.setActiveFlow(actorId, {
          type: 'admin_broadcast_body',
          title,
          segment: 'all_opt_in',
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: `{{emoji:community}} Sarlavha saqlandi: "${title}"\n\nEndi xabar matnini yuboring:`,
          reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_broadcast_title' };
      }

      if (flow.type === 'admin_broadcast_body') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const campaign = await this.broadcastManager.createCampaign({
          title: flow.title,
          mediaType: 'text',
          defaultText: text || flow.title,
          segment: flow.segment,
          createdBy: actorId,
        });
        const list = this.repository.listBroadcasts();
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: `{{emoji:success}} Kampaniya yaratildi: ${campaign.title} (${campaign.id})\nMaqsadli auditoriya: ${campaign.totalTargets}`,
          reply_markup: buildAdminBroadcastsKeyboard(locale, list, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_broadcast_created:${campaign.id}` };
      }

      if (flow.type === 'admin_ai_set_model') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const modelName = text.trim();
        if (modelName) {
          await this.repository.saveSettings(
            flow.which === 'primary'
              ? { aiPrimaryModel: modelName }
              : { aiFallbackModel: modelName },
            actorId
          );
        }
        const nextSettings = this.repository.getSettings();
        const aiStatus = this.aiBridge.getStatus();
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: `{{emoji:hifz}} Model yangilandi: Primary=${aiStatus.primaryModel} | Fallback=${aiStatus.fallbackModel || 'none'}`,
          reply_markup: buildAdminAiControlKeyboard(locale, nextSettings, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_ai_set_model' };
      }

      if (flow.type === 'admin_channel_post_draft') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const draft = await this.contentStudio.createDraft({
          type: 'announcement',
          title: 'ASAKA ZIYO',
          defaultBody: text || '...',
          targetChannelIds: [flow.channelId],
          createdBy: actorId,
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: `{{emoji:quran}} Kanal qoralamasi saqlandi: ${draft.id}`,
          reply_markup: buildMainMenuKeyboard(locale, this.emojiRegistry, this.config, {
            isAdmin: true,
            miniAppEnabled: Boolean(settings.miniAppEnabled),
          }),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_channel_post_draft' };
      }

      if (flow.type === 'admin_prayer_edit') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const cleanTime = text.trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime)) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:error}} Notoʻgʻri vaqt formati: "${cleanTime}". Iltimos HH:MM formatida kiriting (masalan: 05:18).`,
            reply_markup: buildAdminPrayerKeyboard(locale, this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_prayer_edit_invalid' };
        }
        if (!this.centralAdminWriter) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Markaziy namoz jadvali yozish ulanmagan.',
            reply_markup: buildAdminPrayerKeyboard(locale, this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_prayer_edit_unavailable' };
        }
        const res = await this.centralAdminWriter.updatePrayerTime({
          prayerKey: flow.prayerKey,
          newTime: cleanTime,
          actorTelegramId: actorId,
        });
        await this.repository.appendAuditLog({
          actorTelegramId: actorId,
          actorRole: role,
          action: 'admin_prayer_time_updated',
          targetType: 'content',
          targetId: flow.prayerKey,
          metadata: { newTime: cleanTime, ok: res.ok, error: res.error || '' },
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: res.ok
            ? `{{emoji:success}} Asaka namoz jadvali Firestore ga saqlandi!\n• ${res.updatedLabel || flow.prayerKey}: ${cleanTime}\nWeb App, Android ilova va Telegram bot yangilandi.`
            : `{{emoji:error}} Saqlashda xatolik: ${res.error || 'Nomaʼlum xato'}`,
          reply_markup: buildAdminPrayerKeyboard(locale, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_prayer_edit:${flow.prayerKey}` };
      }

      if (flow.type === 'admin_cms_create_title') {
        const title = text.trim().slice(0, 180);
        if (!title) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Sarlavha boʻsh boʻlishi mumkin emas. Qayta yuboring:',
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_cms_title_empty' };
        }
        await this.userService.setActiveFlow(actorId, {
          type: 'admin_cms_create_body',
          entityType: flow.entityType,
          title,
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: `{{emoji:quran}} Sarlavha saqlandi: "${title}"\n\nEndi [${flow.entityType}] toʻliq matnini yuboring:`,
          reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_cms_create_title' };
      }

      if (flow.type === 'admin_cms_create_body') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const body = text.trim();
        if (!this.centralAdminWriter) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Markaziy CMS yozish ulanmagan.',
            reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_cms_unavailable' };
        }
        const res = await this.centralAdminWriter.createContentItem({
          entityType: flow.entityType,
          title: flow.title,
          body: body || flow.title,
          actorTelegramId: actorId,
        });
        await this.repository.appendAuditLog({
          actorTelegramId: actorId,
          actorRole: role,
          action: `cms_create_${flow.entityType}`,
          targetType: 'content',
          targetId: res.id || 'unknown',
          metadata: { entityType: flow.entityType, title: flow.title, ok: res.ok, error: res.error || '' },
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: res.ok
            ? `{{emoji:success}} [${flow.entityType}] muvaffaqiyatli Firestore ga saqlandi va nashr qilindi!\n• ID: ${res.id}\n• Sarlavha: ${flow.title}\nWeb App, Android ilova va Telegram botga sinxronizatsiya qilindi.`
            : `{{emoji:error}} Saqlashda xatolik: ${res.error || 'Nomaʼlum xato'}`,
          reply_markup: buildMainMenuKeyboard(locale, this.emojiRegistry, this.config, {
            isAdmin: true,
            miniAppEnabled: Boolean(settings.miniAppEnabled),
          }),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_cms_created:${flow.entityType}` };
      }

      if (flow.type === 'admin_channel_connect') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const rawTarget = text.trim();
        if (!rawTarget || (!rawTarget.startsWith('@') && !/^-100\d{6,}$/.test(rawTarget))) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Notoʻgʻri format. Kanal/guruh @username (masalan: @Asaka_Ziyo) yoki Chat ID (-100...) yuboring.',
            reply_markup: buildAdminChannelsKeyboard(locale, this.channelService.listChannels(), this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_channel_connect_invalid' };
        }
        const chId = rawTarget.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        await this.channelService.upsertChannel(actorId, {
          id: chId,
          username: rawTarget,
          title: rawTarget,
          isActive: true,
          autoPublishPrayerTimes: false,
          autoPublishAnnouncements: false,
          autoPublishWisdom: false,
          language: locale,
        });
        const perm = await this.publishingService.verifyChannelPermissions(chId);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text:
            `{{emoji:community}} Kanal/Guruh roʻyxatga olindi: ${rawTarget}\n` +
            `{{emoji:admin}} Telegram API huquq tekshiruvi: ${perm.canPostMessages ? '{{emoji:success}} ADMIN / NASHR RUXSATI BOR' : '{{emoji:warning}} RUXSAT TASDIQLANMADI'}\n` +
            ` Tafsilot: ${perm.reason}`,
          reply_markup: buildAdminChannelsKeyboard(locale, this.channelService.listChannels(), this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_channel_connected:${chId}` };
      }

      if (flow.type === 'admin_emoji_create_custom') {
        if (!this.adminService.hasPermission(actorId, 'manage_emojis')) {
          await this.userService.setActiveFlow(actorId, { type: 'idle' });
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_denied' };
        }
        const parts = text.split('|').map((s) => s.trim());
        const rawKey = (parts[0] || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
        const category = (parts[1] || 'custom') as any;
        const purpose = parts[2] || parts[0] || 'Maxsus Admin Premium Emoji';
        if (!rawKey || rawKey.length < 2) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Format: kalit | kategoriya | vazifasi\nMasalan: ramadan_badge | custom | Ramazon maxsus nishoni',
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, settings)
            ),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_custom_invalid' };
        }
        try {
          const created = this.emojiRegistry.createOrUpdateSlot({
            key: rawKey,
            category,
            description: purpose,
            semanticPurpose: purpose,
            usedIn: ['custom_admin'],
            updatedBy: actorId,
          });
          await this.repository.saveCustomEmoji(created);
          await this.syncEmojiRegistryToAppConfig(actorId);
          await this.repository.appendAuditLog({
            actorTelegramId: actorId,
            actorRole: role,
            action: 'custom_emoji_slot_created',
            targetType: 'emoji',
            targetId: created.key,
            metadata: { category: created.category, semanticPurpose: created.semanticPurpose || '' },
          });
          await this.userService.setActiveFlow(actorId, {
            type: 'admin_emoji_capture',
            key: created.key,
          });
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text:
              `{{emoji:success}} Yangi slot yaratildi: ${created.key}\n` +
              `• Kategoriya: ${created.category}\n` +
              `• Vazifasi: ${created.semanticPurpose}\n\n` +
              `Endi Telegram Premium emoji tanlagichidan ushbu slot uchun tayyor Premium emoji yuboring:`,
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, settings)
            ),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_emoji_custom_created:${created.key}` };
        } catch (err: unknown) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:error}} ${err instanceof Error ? err.message : String(err)}`,
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, settings)
            ),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_custom_err' };
        }
      }

      if (flow.type === 'admin_emoji_capture') {
        if (!this.adminService.hasPermission(actorId, 'manage_emojis')) {
          await this.userService.setActiveFlow(actorId, { type: 'idle' });
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_denied' };
        }

        if (flow.key === '__ANY__') {
          // Direct-Emoji-First flow: extract & verify via getCustomEmojiStickers, then ask category
          const verified = await this.emojiRegistry.verifyOwnerCustomEmojiFromMessage(
            this.apiClient,
            message
          );
          if (!verified.ok || !verified.customEmojiId) {
            await this.apiClient.sendMessage({
              chat_id: chatId,
              text:
                `{{emoji:error}} ${verified.error || 'Haqiqiy Telegram Premium custom_emoji topilmadi.'}\n\n` +
                `Oddiy Unicode emoji qabul qilinmaydi — Telegram Premium emoji tanlagichidan tayyor Premium emoji yuboring.`,
              reply_markup: this.styleManager.decorateInlineMarkup(
                buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, settings)
              ),
            });
            return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_invalid' };
          }
          await this.userService.setActiveFlow(actorId, {
            type: 'admin_emoji_pending_category',
            customEmojiId: verified.customEmojiId,
            fallbackUnicode: verified.fallbackUnicode || '\u2B50',
            stickerSetName: verified.stickerSetName,
          });
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text:
              `{{emoji:success}} Telegram Premium Custom Emoji tasdiqlandi!\n` +
              `• ID: ${verified.customEmojiId}\n` +
              `${verified.stickerSetName ? `• Toʻplam: ${verified.stickerSetName}\n` : ''}\n` +
              `Endi ushbu emoji qaysi kategoriya uchun ishlatilishini tanlang:`,
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminEmojiCategoriesKeyboard(
                locale,
                0,
                this.emojiRegistry,
                settings,
                verified.customEmojiId
              )
            ),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_pending_category' };
        }

        // Category-First flow: verify & bind directly to flow.key
        const reg = await this.emojiRegistry.registerFromOwnerMessage(
          this.apiClient,
          flow.key,
          message,
          actorId
        );
        if (!reg.ok || !reg.entry) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text:
              `{{emoji:error}} ${reg.error || 'Premium custom_emoji tasdiqlanmadi.'}\n\n` +
              `Qayta urinib koʻring: Telegram Premium tanlagichidan tayyor emoji yuboring.`,
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, settings)
            ),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_emoji_capture_failed' };
        }
        await this.repository.saveCustomEmoji(reg.entry);
        await this.syncEmojiRegistryToAppConfig(actorId);
        this.emojiRegistry.setPremiumEnabled(true);
        const savedSettings = await this.repository.saveSettings(
          {
            premiumEmojiEnabled: true,
            premiumEmojiEligibilityVerified: true,
            premiumEmojiEligibilityCheckedAt: new Date().toISOString(),
            premiumEmojiEligibilityReason: 'Verified live via owner Premium emoji & getCustomEmojiStickers',
          },
          actorId
        );
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        await this.repository.appendAuditLog({
          actorTelegramId: actorId,
          actorRole: role,
          action: 'custom_emoji_bound',
          targetType: 'emoji',
          targetId: reg.entry.key,
          metadata: { customEmojiId: reg.entry.customEmojiId || '' },
        });
        const confirmMsg = this.emojiRegistry.formatMessage(
          `{{emoji:${reg.entry.key}}} «${reg.entry.key}» kategoriyasi saqlandi!\n` +
            `• custom_emoji_id: ${reg.entry.customEmojiId}\n` +
            `• Firestore bazasida saqlandi va butun bot boʻylab darhol yangilandi.`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: confirmMsg.text,
          ...(confirmMsg.entities.length > 0 ? { entities: confirmMsg.entities } : {}),
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildAdminEmojiCategoriesKeyboard(locale, 0, this.emojiRegistry, savedSettings)
          ),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_emoji_bound:${reg.entry.key}` };
      }

      if (flow.type === 'admin_style_edit_template') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        if (
          !this.adminService.hasPermission(actorId, 'manage_emojis') &&
          !this.adminService.hasPermission(actorId, 'manage_settings')
        ) {
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_style_denied' };
        }
        if (text) {
          this.styleManager.setTemplate(flow.templateKey, text);
          const nextSettings = await this.repository.saveSettings(
            { richMessageTemplates: this.styleManager.getConfig().richMessageTemplates },
            actorId
          );
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:success}} Shablon yangilandi: ${flow.templateKey}\n"${this.styleManager.getTemplate(flow.templateKey)}"`,
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAdminStyleHomeKeyboard(locale, nextSettings, this.emojiRegistry)
            ),
          });
        }
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_style_template:${flow.templateKey}` };
      }

      if (flow.type === 'admin_audio_add_reciter') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        if (!this.adminService.hasPermission(actorId, 'manage_content')) {
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_denied' };
        }
        const [rawName, rawStyle, rawUrl] = text.split('|').map((s) => s.trim());
        const saved = await this.quranMp3Service.upsertReciter(
          {
            nameUz: rawName || text,
            styleUz: rawStyle || 'Murattal',
            serverUrl: rawUrl && rawUrl.startsWith('https://') ? rawUrl : '',
            isActive: true,
          },
          actorId
        );
        const reciters = this.quranMp3Service.listReciters({ includeInactive: true });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: saved.ok && saved.reciter
            ? `{{emoji:success}} Yangi qori saqlandi: ${saved.reciter.nameUz} (${saved.reciter.id})`
            : `{{emoji:error}} Qori saqlanmadi: ${saved.error || 'Xatolik'}`,
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildAdminAudioHomeKeyboard(locale, reciters, this.emojiRegistry)
          ),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_add_reciter' };
      }

      if (flow.type === 'admin_audio_upload_track') {
        if (!this.adminService.hasPermission(actorId, 'manage_content')) {
          await this.userService.setActiveFlow(actorId, { type: 'idle' });
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_denied' };
        }
        const mediaObj = message.audio || message.document;
        if (!mediaObj) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: '{{emoji:error}} Iltimos haqiqiy audio fayl (.mp3/.m4a/.ogg/.wav) yuboring.',
            reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_upload_missing_file' };
        }
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const captionNum = Number.parseInt((message.caption || '').trim(), 10);
        const targetSurah =
          Number.isFinite(captionNum) && captionNum >= 1 && captionNum <= 114
            ? captionNum
            : flow.surahNumber;
        const fileRes = await this.apiClient.getFile(mediaObj.file_id);
        const dl =
          fileRes.ok && fileRes.result?.file_path
            ? await this.apiClient.downloadFileBuffer(fileRes.result.file_path)
            : { ok: false, error: 'Fayl manzili olinmadi.' };
        const uploadRes =
          dl.ok && dl.buffer
            ? await this.quranMp3Service.uploadTrackBuffer({
                reciterId: flow.reciterId,
                surahNumber: targetSurah,
                fileName: mediaObj.file_name || `surah-${targetSurah}.mp3`,
                buffer: dl.buffer,
                mimeType: mediaObj.mime_type || 'audio/mpeg',
                durationSeconds:
                  'duration' in mediaObj && typeof mediaObj.duration === 'number'
                    ? mediaObj.duration
                    : undefined,
                actorId,
              })
            : { ok: false, error: dl.error || 'Audio faylni yuklab olishda xatolik.' };
        const rec = this.quranMp3Service.getReciterById(flow.reciterId);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: uploadRes.ok
            ? `{{emoji:success}} ${flow.reciterId} — ${targetSurah}-sura audio fayli tekshirildi va saqlandi!`
            : `{{emoji:error}} Audio qabul qilinmadi: ${uploadRes.error}`,
          reply_markup: rec
            ? this.styleManager.decorateInlineMarkup(
                buildAdminAudioReciterKeyboard(locale, rec, this.emojiRegistry)
              )
            : buildBackOnlyKeyboard(locale, this.emojiRegistry),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_upload_track' };
      }

      if (flow.type === 'admin_audio_bulk_manifest') {
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        if (!this.adminService.hasPermission(actorId, 'manage_content')) {
          await this.apiClient.sendMessage({ chat_id: chatId, text: dict.adminAccessDenied });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_denied' };
        }
        const entries = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            if (line.includes('|')) {
              const [left, right] = line.split('|').map((s) => s.trim());
              return { pathOrFileName: left, sourceUrl: right };
            }
            if (line.startsWith('https://') || line.startsWith('http://')) {
              const fname = line.split('/').pop() || line;
              return { pathOrFileName: fname, sourceUrl: line };
            }
            return { pathOrFileName: line };
          });
        const preview = this.quranMp3Service.createBulkImportPreview({
          reciterId: flow.reciterId,
          entries,
          actorId,
        });
        if (!preview.ok || !preview.plan) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:error}} Bulk preview xatoligi: ${preview.error || 'Roʻyxat boʻsh'}`,
            reply_markup: buildBackOnlyKeyboard(locale, this.emojiRegistry),
          });
          return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_audio_bulk_invalid' };
        }
        const p = preview.plan;
        const sampleLines = p.items
          .slice(0, 12)
          .map((it) =>
            it.status === 'matched'
              ? `{{emoji:success}} ${it.fileName} → ${it.detectedSurahNumber}. ${it.surahNameUz}`
              : `{{emoji:warning}} ${it.fileName} (${it.status}: ${it.reason})`
          )
          .join('\n');
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text:
            `{{emoji:brand}} Bulk Import Preview — ${p.reciterName}\n` +
            `• Mos kelgan: ${p.matchedCount} | Noaniq/Takror: ${p.ambiguousCount} | Rad etilgan: ${p.unmatchedCount}\n\n` +
            `${sampleLines}\n\n` +
            `Saqlash uchun «Tasdiqlash» tugmasini bosing (hali hech narsa yozilmadi):`,
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildAdminAudioBulkConfirmKeyboard(p.planId, this.emojiRegistry)
          ),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: `admin_audio_bulk_preview:${p.planId}` };
      }
    }

    return null;
  }

  private maskUserId(actorId: string): string {
    if (actorId.length <= 4) return `***${actorId}`;
    return `${actorId.slice(0, 2)}***${actorId.slice(-3)}`;
  }

  private computeLatencyBucket(values: number[], errorCount = 0): TelegramLatencyBucketStats {
    if (values.length === 0) {
      return { count: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, errorCount };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
    return {
      count: sorted.length,
      avgMs: Math.round((sum / sorted.length) * 100) / 100,
      p50Ms: Math.round(pct(50) * 100) / 100,
      p95Ms: Math.round(pct(95) * 100) / 100,
      p99Ms: Math.round(pct(99) * 100) / 100,
      maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
      errorCount,
    };
  }

  private recordLatencySample(sample: TelegramLatencySample): void {
    this.latencySamples.push(sample);
    if (this.latencySamples.length > 1000) {
      this.latencySamples.shift();
    }
  }

  getPerformanceSummary(): TelegramPerformanceSummary {
    const overallVals = this.latencySamples.map((s) => s.processing_time_ms);
    const overallErrors = this.latencySamples.filter((s) => s.status === 'error').length;
    const dbVals = this.latencySamples.map((s) => s.database_time_ms);
    const apiVals = this.latencySamples.map((s) => s.api_time_ms);

    const byCategory: Record<string, TelegramLatencyBucketStats> = {};
    const cats = ['start', 'callback', 'menu', 'command', 'ai', 'media', 'other'] as const;
    for (const c of cats) {
      const subset = this.latencySamples.filter((s) => s.category === c);
      if (subset.length > 0) {
        byCategory[c] = this.computeLatencyBucket(
          subset.map((s) => s.processing_time_ms),
          subset.filter((s) => s.status === 'error').length
        );
      }
    }

    const recentSlowUpdates = [...this.latencySamples]
      .sort((a, b) => b.processing_time_ms - a.processing_time_ms)
      .slice(0, 15);

    return {
      instanceId: this.instanceId,
      deploymentId: this.deploymentId,
      gitCommit: this.gitCommit,
      buildVersion: this.buildVersion,
      processId: process.pid,
      uptimeSec: Math.round(process.uptime()),
      activeUserQueues: this.perUserQueues.size,
      inFlightUpdates: this.inFlightUpdates,
      deduplicatedUpdates: this.deduplicatedUpdates,
      totalProcessed: this.totalUpdatesHandled,
      overall: this.computeLatencyBucket(overallVals, overallErrors),
      byCategory,
      database: this.computeLatencyBucket(dbVals, 0),
      telegramApi: this.computeLatencyBucket(apiVals, 0),
      recentSlowUpdates,
    };
  }

  getRuntimeDiagnostics() {
    const fsSync = this.repository.getFirestoreSyncStatus();
    const polling = this.jobScheduler.getPollingStatus();
    const activeInstances = this.repository.listRuntimeInstances(5 * 60_000);
    const currentVersion = fsSync.configVersion;
    const outdatedInstances = activeInstances.filter(
      (i) =>
        i.instanceId !== this.instanceId &&
        (i.configVersion < currentVersion || i.gitCommit !== this.gitCommit)
    );
    return {
      instanceId: this.instanceId,
      deploymentId: this.deploymentId,
      gitCommit: this.gitCommit,
      buildVersion: this.buildVersion,
      processId: process.pid,
      startedAt: this.startedAt,
      uptimeSec: Math.round(process.uptime()),
      mode: this.config.mode,
      startupState: this.startupState,
      startupReason: this.startupReason,
      configVersion: fsSync.configVersion,
      configUpdatedAt: fsSync.configUpdatedAt,
      emojiRegistryVersion: fsSync.emojiRegistryVersion,
      firestoreOnline: fsSync.firestoreOnline,
      degradedMode: fsSync.degradedMode,
      lastFirestoreReadAt: fsSync.lastFirestoreReadAt,
      lastFirestoreWriteAt: fsSync.lastFirestoreWriteAt,
      lastCacheRefreshAt: fsSync.lastCacheRefreshAt,
      syncWorker: this.syncEngine.getStatusSummary(),
      polling,
      activeInstanceCount: Math.max(1, activeInstances.length),
      activeInstances,
      outdatedInstancesDetected: outdatedInstances.length > 0,
      outdatedInstances,
      rollbackWarnings: fsSync.rollbackWarnings,
      performance: this.getPerformanceSummary(),
    };
  }

  /**
   * Concurrent update dispatcher:
   * - Deduplicates `update_id` immediately (O(1) bounded LRU set)
   * - Guarantees strict sequential ordering PER USER (`perUserQueues`)
   * - Executes DIFFERENT USERS in parallel so slow AI/audio/file tasks NEVER block other users
   * - Records structured per-stage latency telemetry (`processing_time_ms`, `database_time_ms`, `api_time_ms`)
   */
  async processUpdate(update: TelegramApiUpdate): Promise<UpdateDispatchOutcome> {
    const updateId = update.update_id;

    // Duplicate update_id deduplication (webhook retries / polling overlap)
    if (typeof updateId === 'number' && updateId > 0) {
      if (this.processedUpdateIds.has(updateId)) {
        this.deduplicatedUpdates++;
        return { ok: true, updateId, kind: 'ignored', detail: 'duplicate_update_id' };
      }
      this.processedUpdateIds.add(updateId);
      if (this.processedUpdateIds.size > 10_000) {
        const oldest = this.processedUpdateIds.values().next().value;
        if (oldest !== undefined) this.processedUpdateIds.delete(oldest);
      }
    }

    const actor = update.callback_query?.from || update.message?.from;
    const chatId = update.callback_query?.message?.chat.id || update.message?.chat.id || actor?.id;
    if (!actor || actor.is_bot || !chatId) {
      return { ok: true, updateId, kind: 'ignored', detail: 'no_human_actor' };
    }

    const queueKey = String(actor.id);
    const prevTail = this.perUserQueues.get(queueKey) || Promise.resolve();
    let releaseQueue!: () => void;
    const nextTail = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });
    const chainedTail = prevTail.catch(() => {}).then(() => nextTail);
    this.perUserQueues.set(queueKey, chainedTail);

    await prevTail.catch(() => {});
    this.inFlightUpdates++;
    const startedHr = performance.now();
    const timingCtx = {
      dbMs: 0,
      apiMs: 0,
      handlerName: 'unknown',
      category: 'other' as TelegramLatencySample['category'],
    };
    try {
      const outcome = await this.processUpdateSerialized(update, timingCtx);
      const totalMs = Math.max(0, performance.now() - startedHr);
      const effectiveApiMs = Math.max(0, timingCtx.apiMs > 0 ? timingCtx.apiMs : totalMs - timingCtx.dbMs);
      this.recordLatencySample({
        update_id: updateId,
        user_id_masked: this.maskUserId(queueKey),
        handler_name: outcome.detail || timingCtx.handlerName,
        category: timingCtx.category,
        instance_id: this.instanceId,
        deployment_id: this.deploymentId,
        git_commit: this.gitCommit,
        processing_time_ms: Math.round(totalMs * 100) / 100,
        database_time_ms: Math.round(timingCtx.dbMs * 100) / 100,
        api_time_ms: Math.round(effectiveApiMs * 100) / 100,
        status:
          outcome.kind === 'error'
            ? 'error'
            : outcome.kind === 'rate_limited'
              ? 'rate_limited'
              : outcome.kind === 'maintenance'
                ? 'maintenance'
                : outcome.kind === 'ignored'
                  ? 'ignored'
                  : 'ok',
        ...(outcome.kind === 'error' ? { error_code: outcome.detail || 'UPDATE_ERROR' } : {}),
        timestamp: new Date().toISOString(),
      });
      return outcome;
    } finally {
      this.inFlightUpdates = Math.max(0, this.inFlightUpdates - 1);
      releaseQueue();
      if (this.perUserQueues.get(queueKey) === chainedTail) {
        this.perUserQueues.delete(queueKey);
      }
    }
  }

  private async processUpdateSerialized(
    update: TelegramApiUpdate,
    timingCtx: {
      dbMs: number;
      apiMs: number;
      handlerName: string;
      category: TelegramLatencySample['category'];
    }
  ): Promise<UpdateDispatchOutcome> {
    const updateId = update.update_id;
    const actor = update.callback_query?.from || update.message?.from;
    const chatId = update.callback_query?.message?.chat.id || update.message?.chat.id || actor?.id;
    const actorId = actor ? String(actor.id) : '0';

    try {
      if (!actor || actor.is_bot || !chatId) {
        return { ok: true, updateId, kind: 'ignored', detail: 'no_human_actor' };
      }

      if (update.callback_query) {
        timingCtx.category = 'callback';
        timingCtx.handlerName = `callback:${(update.callback_query.data || '').split(':')[0] || 'unknown'}`;
      } else if (update.message?.text?.trim().startsWith('/start')) {
        timingCtx.category = 'start';
        timingCtx.handlerName = '/start';
      } else if (update.message?.text?.trim().startsWith('/')) {
        timingCtx.category = 'command';
        timingCtx.handlerName = update.message.text.trim().split(/\s+/)[0];
      } else if (update.message?.voice || update.message?.audio || update.message?.photo || update.message?.document) {
        timingCtx.category = 'media';
        timingCtx.handlerName = 'media_message';
      } else if (update.message?.text) {
        timingCtx.category = this.aiBridge.isUserInAiMode(actorId) ? 'ai' : 'menu';
        timingCtx.handlerName = timingCtx.category === 'ai' ? 'ai_text' : 'reply_or_text';
      }

      this.totalUpdatesHandled++;
      this.lastUpdateHandledAt = new Date().toISOString();

      // 1. Register / update user in isolated `telegramUsers` collection (timed DB stage)
      const dbStart = performance.now();
      const { user } = await this.userService.registerOrTouchUser(actor);
      timingCtx.dbMs += performance.now() - dbStart;
      if (user.isBlocked) {
        return { ok: true, updateId, kind: 'ignored', detail: 'user_blocked' };
      }

      const dict = getTelegramLocaleBundle(user.language);

      // 2. Maintenance mode guard (admins bypass maintenance)
      const settings = this.repository.getSettings();
      const role = this.adminService.getEffectiveRole(actorId);
      if (settings.maintenanceMode && !role) {
        const formatted = this.emojiRegistry.formatMessage(dict.maintenanceNotice);
        if (update.callback_query) {
          await this.apiClient.answerCallbackQuery({
            callback_query_id: update.callback_query.id,
            text: formatted.text,
            show_alert: true,
          });
        } else {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          });
        }
        return { ok: true, updateId, kind: 'maintenance' };
      }

      // 3. Per-user sliding-window rate limiting
      const rl = this.rateLimiter.check(actorId);
      if (!rl.allowed) {
        const formatted = this.emojiRegistry.formatMessage(dict.rateLimitExceeded);
        if (update.callback_query) {
          await this.apiClient.answerCallbackQuery({
            callback_query_id: update.callback_query.id,
            text: formatted.text,
            show_alert: true,
          });
        } else {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          });
        }
        return { ok: true, updateId, kind: 'rate_limited', detail: `retryAfterMs=${rl.retryAfterMs}` };
      }

      // 4. Inline Callback Queries
      if (update.callback_query) {
        const result = await handleCallbackQuery(update.callback_query, user, {
          apiClient: this.apiClient,
          config: this.config,
          emojiRegistry: this.emojiRegistry,
          userService: this.userService,
          prayerAdapter: this.prayerAdapter,
          contentAdapter: this.contentAdapter,
          academyQuizService: this.academyQuizService,
          supportService: this.supportService,
          broadcastManager: this.broadcastManager,
          contentStudio: this.contentStudio,
          aiBridge: this.aiBridge,
          adminService: this.adminService,
          channelService: this.channelService,
          publishingService: this.publishingService,
          repository: this.repository,
          appReleaseService: this.appReleaseService,
          hifzService: this.hifzService,
          quranMp3Service: this.quranMp3Service,
          styleManager: this.styleManager,
          globalPrayerEcosystem: this.globalPrayerEcosystem,
          quranEcosystem: this.quranEcosystem,
          subscriptionEcosystem: this.subscriptionEcosystem,
          centralAdminWriter: this.centralAdminWriter,
          runDiagnostics: () => this.runLiveDiagnostics(),
        });
        return {
          ok: true,
          updateId,
          kind: 'callback',
          detail: result.action,
        };
      }

      const message = update.message;
      if (!message) {
        return { ok: true, updateId, kind: 'ignored' };
      }

      // 4B. GPS Location -> Exact Qibla Bearing & Distance to Kaaba
      if (message.chat.type === 'private' && message.location) {
        const qibla = calculateQiblaFromCoordinates(
          message.location.latitude,
          message.location.longitude
        );
        const dirLabel = getCompassDirectionLabel(qibla.bearingDegrees, user.language);
        const formatted = this.emojiRegistry.formatMessage(
          `${dict.qiblaTitle}\n\n` +
            `{{emoji:prayer}} Yoʻnalish: ${qibla.bearingDegrees}° (${dirLabel})\n` +
            ` Makka (Kaʼba) gacha masofa: ${qibla.distanceKm} km\n` +
            `{{emoji:prayer}} Koordinata: ${message.location.latitude.toFixed(4)}, ${message.location.longitude.toFixed(4)}\n\n` +
            `${dict.qiblaCompassNotice}`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: this.styleManager.decorateReplyMarkup(
            buildPersistentReplyKeyboard(user.language, this.emojiRegistry)
          ),
        });
        return { ok: true, updateId, kind: 'flow_input', detail: 'qibla_location' };
      }

      // 5. Bot Commands (complete Unified Ecosystem V4 + Bot 2.0 + HIFZ + 2026 Ultimate command suite)
      if (message.text) {
        const parsedCmd = parseBotCommand(message.text);
        if (parsedCmd) {
          // Entering a slash command clears any pending stateful text flow
          if (user.activeFlow && user.activeFlow.type !== 'idle') {
            await this.userService.setActiveFlow(actorId, { type: 'idle' });
          }
          const cmdRes = await handleBotCommand(message, user, {
            apiClient: this.apiClient,
            config: this.config,
            emojiRegistry: this.emojiRegistry,
            userService: this.userService,
            prayerAdapter: this.prayerAdapter,
            contentAdapter: this.contentAdapter,
            academyQuizService: this.academyQuizService,
            supportService: this.supportService,
            aiBridge: this.aiBridge,
            adminService: this.adminService,
            repository: this.repository,
            appReleaseService: this.appReleaseService,
            hifzService: this.hifzService,
            quranMp3Service: this.quranMp3Service,
            styleManager: this.styleManager,
            globalPrayerEcosystem: this.globalPrayerEcosystem,
            quranEcosystem: this.quranEcosystem,
            subscriptionEcosystem: this.subscriptionEcosystem,
          });
          return {
            ok: true,
            updateId,
            kind: 'command',
            detail: cmdRes.command,
          };
        }

        // 6. Persistent Reply Keyboard button match across all 5 languages (20 new + 6 legacy)
        const replyAction = matchReplyKeyboardAction(message.text);
        if (replyAction) {
          if (user.activeFlow && user.activeFlow.type !== 'idle') {
            await this.userService.setActiveFlow(actorId, { type: 'idle' });
          }
          if (replyAction !== 'ai') {
            this.aiBridge.exitAiMode(actorId);
          }
          const syntheticCmd = REPLY_ACTION_TO_COMMAND[replyAction];
          await handleBotCommand(
            { ...message, text: syntheticCmd },
            user,
            {
              apiClient: this.apiClient,
              config: this.config,
              emojiRegistry: this.emojiRegistry,
              userService: this.userService,
              prayerAdapter: this.prayerAdapter,
              contentAdapter: this.contentAdapter,
              academyQuizService: this.academyQuizService,
              supportService: this.supportService,
              aiBridge: this.aiBridge,
              adminService: this.adminService,
              repository: this.repository,
              appReleaseService: this.appReleaseService,
              hifzService: this.hifzService,
              quranMp3Service: this.quranMp3Service,
              styleManager: this.styleManager,
              globalPrayerEcosystem: this.globalPrayerEcosystem,
              quranEcosystem: this.quranEcosystem,
              subscriptionEcosystem: this.subscriptionEcosystem,
            }
          );
          return {
            ok: true,
            updateId,
            kind: 'reply_keyboard',
            detail: replyAction,
          };
        }
      }

      // 7A. HIFZ Voice Recitation Check (when user is in `hifz_audio_check` flow)
      if (
        message.chat.type === 'private' &&
        (message.voice || message.audio) &&
        user.activeFlow?.type === 'hifz_audio_check'
      ) {
        const audioFlow = user.activeFlow;
        await this.userService.setActiveFlow(actorId, { type: 'idle' });
        const mediaObj = message.voice || message.audio!;
        await this.apiClient.sendChatAction(chatId, 'typing');
        const fileRes = await this.apiClient.getFile(mediaObj.file_id);
        const hs = getHifzStrings(user.language);
        if (!fileRes.ok || !fileRes.result?.file_path) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:error}} Audio faylni olishda xatolik.\n\n${hs.audioDisclaimer}`,
            reply_markup: buildHifzHomeKeyboard(user.language),
          });
          return { ok: true, updateId, kind: 'flow_input', detail: 'hifz_audio_lookup_failed' };
        }
        const dl = await this.apiClient.downloadFileBuffer(fileRes.result.file_path);
        if (!dl.ok || !dl.buffer) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: `{{emoji:error}} Audio faylni yuklashda xatolik.\n\n${hs.audioDisclaimer}`,
            reply_markup: buildHifzHomeKeyboard(user.language),
          });
          return { ok: true, updateId, kind: 'flow_input', detail: 'hifz_audio_download_failed' };
        }
        const checkRes = await this.hifzService.checkRecitationAudio({
          telegramId: actorId,
          locale: user.language,
          surahNumber: audioFlow.surahNumber,
          startAyah: audioFlow.startAyah,
          endAyah: audioFlow.endAyah,
          audioBuffer: dl.buffer,
          mimeType: mediaObj.mime_type || 'audio/ogg',
        });
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: formatHifzAudioCheckResult(checkRes, user.language),
          reply_markup: buildHifzHomeKeyboard(user.language),
        });
        return { ok: true, updateId, kind: 'flow_input', detail: 'hifz_audio_check' };
      }

      // 7B. Stateful Active Flow input (text OR media attachment for support tickets)
      if (message.chat.type === 'private' && user.activeFlow && user.activeFlow.type !== 'idle') {
        const flowOutcome = await this.handleActiveFlowInput(message, user, chatId);
        if (flowOutcome) {
          return { ...flowOutcome, updateId };
        }
      }

      // 8. Private chat Voice / Audio -> AI Speech-to-Text + Gemini + Optional WAV TTS
      if (message.chat.type === 'private' && (message.voice || message.audio)) {
        const mediaObj = message.voice || message.audio!;
        await this.apiClient.sendChatAction(chatId, 'typing');
        const fileRes = await this.apiClient.getFile(mediaObj.file_id);
        if (!fileRes.ok || !fileRes.result?.file_path) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: dict.aiErrorNotice,
            reply_markup: buildAiModeKeyboard(user.language, this.emojiRegistry),
          });
          return { ok: true, updateId, kind: 'voice_ai_reply', detail: 'file_lookup_failed' };
        }
        const dl = await this.apiClient.downloadFileBuffer(fileRes.result.file_path);
        if (!dl.ok || !dl.buffer) {
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: dict.aiErrorNotice,
            reply_markup: buildAiModeKeyboard(user.language, this.emojiRegistry),
          });
          return { ok: true, updateId, kind: 'voice_ai_reply', detail: 'file_download_failed' };
        }

        const voiceRes = await this.aiBridge.handleVoiceMessage({
          telegramId: actorId,
          locale: user.language,
          audioBuffer: dl.buffer,
          mimeType: mediaObj.mime_type || 'audio/ogg',
          synthesizeReply: Boolean(settings.aiVoiceReplyEnabled),
        });

        const textBody = voiceRes.ok
          ? `${dict.aiTitle}\n\n{{emoji:quran_mp3}} "${voiceRes.transcript || ''}"\n\n${voiceRes.answerText || ''}`
          : `${dict.aiTitle}\n\n${voiceRes.reason || dict.aiErrorNotice}`;
        const formatted = this.emojiRegistry.formatAiResponse(textBody);
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: buildAiModeKeyboard(user.language, this.emojiRegistry),
        });

        if (voiceRes.ok && voiceRes.ttsAudioBuffer) {
          await this.apiClient.sendAudioBuffer({
            chat_id: chatId,
            audioBuffer: voiceRes.ttsAudioBuffer,
            filename: 'asaka_ziyo_ai_reply.wav',
            mimeType: voiceRes.ttsMimeType || 'audio/wav',
            title: 'ASAKA ZIYO AI',
            performer: 'ASAKA ZIYO',
          });
        }

        return {
          ok: true,
          updateId,
          kind: 'voice_ai_reply',
          detail: voiceRes.ok ? 'answered' : voiceRes.errorCode || 'failed',
        };
      }

      // 9. Private chat Photo / Document -> AI Vision / Document Analysis
      if (
        message.chat.type === 'private' &&
        (message.photo?.length || message.document) &&
        (this.aiBridge.isUserInAiMode(actorId) || Boolean(message.caption))
      ) {
        await this.apiClient.sendChatAction(chatId, 'typing');
        const isPhoto = Boolean(message.photo && message.photo.length > 0);
        const fileId = isPhoto
          ? message.photo![message.photo!.length - 1].file_id
          : message.document!.file_id;
        const mimeType = isPhoto
          ? 'image/jpeg'
          : message.document!.mime_type || 'application/octet-stream';

        const fileRes = await this.apiClient.getFile(fileId);
        if (fileRes.ok && fileRes.result?.file_path) {
          const dl = await this.apiClient.downloadFileBuffer(fileRes.result.file_path);
          if (dl.ok && dl.buffer) {
            const mediaRes = await this.aiBridge.handleMediaAnalysis({
              telegramId: actorId,
              locale: user.language,
              buffer: dl.buffer,
              mimeType,
              caption: message.caption,
              inputType: isPhoto ? 'photo' : 'document',
            });
            const formatted = this.emojiRegistry.formatAiResponse(
              `${dict.aiTitle}\n\n${mediaRes.answerText || mediaRes.reason || dict.aiErrorNotice}`
            );
            await this.apiClient.sendMessage({
              chat_id: chatId,
              text: formatted.text,
              ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
              reply_markup: buildAiModeKeyboard(user.language, this.emojiRegistry),
            });
            return {
              ok: true,
              updateId,
              kind: 'media_ai_reply',
              detail: mediaRes.ok ? 'answered' : mediaRes.errorCode || 'failed',
            };
          }
        }
      }

      // 10. Private chat plain text: AI Assistant when active, otherwise main menu
      if (message.text && message.chat.type === 'private') {
        if (this.aiBridge.isUserInAiMode(actorId)) {
          await this.apiClient.sendChatAction(chatId, 'typing');
          if (settings.aiStreamingDraftsEnabled) {
            const draftFmt = this.emojiRegistry.formatMessage(
              `${dict.aiTitle}\n\n{{emoji:loading}} Javob tayyorlanmoqda...`
            );
            await this.apiClient
              .sendMessageDraft({
                chat_id: chatId,
                draft_id: Math.max(1, (Date.now() % 2_000_000_000) | 0),
                text: draftFmt.text,
                ...(draftFmt.entities.length > 0 ? { entities: draftFmt.entities } : {}),
              })
              .catch(() => {});
          }
          const aiRes = await this.aiBridge.handleQuestion(actorId, user.language, message.text);
          const formatted = this.emojiRegistry.formatAiResponse(
            `${dict.aiTitle}\n\n${aiRes.answerText || aiRes.reason || dict.aiErrorNotice}`
          );
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
            reply_markup: this.styleManager.decorateInlineMarkup(
              buildAiModeKeyboard(user.language, this.emojiRegistry)
            ),
            disable_web_page_preview: true,
          });
          return {
            ok: true,
            updateId,
            kind: 'ai_reply',
            detail: aiRes.ok ? 'answered' : aiRes.errorCode,
          };
        }

        const formatted = this.emojiRegistry.formatMessage(
          `${dict.mainMenuTitle}\n\n${dict.mainMenuPrompt}`
        );
        await this.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          reply_markup: this.styleManager.decorateInlineMarkup(
            buildMainMenuKeyboard(user.language, this.emojiRegistry, this.config, {
              isAdmin: Boolean(role),
              miniAppEnabled: Boolean(settings.miniAppEnabled),
            })
          ),
        });
        return { ok: true, updateId, kind: 'text_fallback' };
      }

      return { ok: true, updateId, kind: 'ignored' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      this.lastErrorAt = new Date().toISOString();
      this.logger.error('Telegram update processing error', { updateId, error: msg });
      return { ok: false, updateId, kind: 'error', detail: msg };
    }
  }

  getPlatformHealth() {
    const runtime = this.getRuntimeState();
    return {
      ok: true,
      module: 'asaka-ziyo-telegram-platform',
      phase: 'unified_ecosystem_v4',
      instanceId: this.instanceId,
      deploymentId: this.deploymentId,
      gitCommit: this.gitCommit,
      buildVersion: this.buildVersion,
      miniAppUrl: this.config.miniAppUrl,
      config: getSafeTelegramConfigSummary(this.config),
      pollingActive: this.jobScheduler.isPolling(),
      runtime,
      firestoreSync: this.repository.getFirestoreSyncStatus(),
      syncEngine: this.syncEngine.getStatusSummary(),
      performance: this.getPerformanceSummary(),
      centralContentCounts: this.centralContent.getSummaryCounts(),
      quranMp3RecitersCount: this.quranMp3Service.listReciters().length,
      styleConfig: this.styleManager.getConfig(),
      emojiCompatibility: this.emojiRegistry.validateCompatibility(),
      aiBridge: this.aiBridge.getStatus(),
      registrationStats: this.userService.getRegistrationStats(),
      stats: this.repository.getStats(),
    };
  }
}
