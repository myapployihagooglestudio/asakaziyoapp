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

import { TelegramApiMessage, TelegramApiUpdate, TelegramUserRecord } from '../types';
import {
  TelegramPlatformConfig,
  getSafeTelegramConfigSummary,
  loadTelegramPlatformConfig,
} from '../config';
import { FetchLike, TelegramApiClient, WebhookInfoResult } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
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
import { UnifiedSyncEngine } from '../sync/syncEngine';
import { TelegramAcademyQuizService } from '../services/academyQuizService';
import { TelegramSupportService } from '../support/supportService';
import { TelegramBroadcastManager } from '../broadcast/broadcastManager';
import { TelegramContentStudio } from '../content/contentStudio';
import { TelegramJobScheduler, TelegramPollingStatus } from '../jobs/jobScheduler';
import { handleBotCommand, parseBotCommand } from '../handlers/commandHandlers';
import { handleCallbackQuery } from '../handlers/callbackHandlers';
import { getTelegramLocaleBundle } from '../locales';
import {
  ReplyKeyboardAction,
  buildAdminAiControlKeyboard,
  buildAdminBroadcastsKeyboard,
  buildAdminSupportKeyboard,
  buildAiModeKeyboard,
  buildBackOnlyKeyboard,
  buildDhikrKeyboard,
  buildKhatmKeyboard,
  buildMainMenuKeyboard,
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
  appReleaseService?: AppReleaseService;
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
  public readonly jobScheduler: TelegramJobScheduler;

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
  private startupRetryCount = 0;
  private readonly hasCustomAiGenerator: boolean;

  constructor(options: TelegramBotEngineOptions = {}) {
    this.hasCustomAiGenerator = Boolean(options.aiGenerator);
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

    this.rateLimiter = new TelegramRateLimiter(
      this.config.rateLimitMaxRequests,
      this.config.rateLimitWindowMs
    );
    this.userService = new TelegramUserService(this.repository);
    this.prayerAdapter = new TelegramPrayerAdapter(options.readOnlyPrayerProvider);
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
    // Hydrate from Firestore (if bridge attached) safely without blocking startup
    try {
      await this.repository.hydrateFromFirestore();
      await this.appReleaseService.hydrateFromFirestore();
    } catch (err) {
      this.logger.warn('Firestore hydration encountered an error during startup', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Start durable Unified Sync outbox worker & recover any interrupted jobs
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
    this.syncEngine.stopWorker();
    this.jobScheduler.stopPolling();
    this.jobScheduler.stopScheduledJobs();
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
      { command: 'prayer', description: dict.commands.prayer },
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
        `${dict.supportCreatedNotice}\n\n🆔 ${ticket.id}\n📂 ${ticket.category}`
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
        `${dict.supportCreatedNotice}\n🆔 ${flow.ticketId}`
      );
      await this.apiClient.sendMessage({
        chat_id: chatId,
        text: fmt.text,
        reply_markup: buildSupportHomeKeyboard(locale, this.emojiRegistry),
      });
      return { ok: true, updateId: 0, kind: 'flow_input', detail: `support_reply:${flow.ticketId}` };
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
            ? `✅ Javob yuborildi (${flow.ticketId}) | Foydalanuvchiga yetkazildi: ${res.deliveredToUser ? 'HA' : 'YOʻQ'}`
            : `❌ Xatolik: ${res.error || 'Ticket topilmadi'}`
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
          `👥 Qidiruv natijasi ("${text}"):\n\n${lines.join('\n')}`
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
          text: `📢 Sarlavha saqlandi: "${title}"\n\nEndi xabar matnini yuboring:`,
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
          text: `✅ Kampaniya yaratildi: ${campaign.title} (${campaign.id})\nMaqsadli auditoriya: ${campaign.totalTargets}`,
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
          text: `🧠 Model yangilandi: Primary=${aiStatus.primaryModel} | Fallback=${aiStatus.fallbackModel || 'none'}`,
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
          text: `📝 Kanal qoralamasi saqlandi: ${draft.id}`,
          reply_markup: buildMainMenuKeyboard(locale, this.emojiRegistry, this.config, {
            isAdmin: true,
            miniAppEnabled: Boolean(settings.miniAppEnabled),
          }),
        });
        return { ok: true, updateId: 0, kind: 'flow_input', detail: 'admin_channel_post_draft' };
      }
    }

    return null;
  }

  async processUpdate(update: TelegramApiUpdate): Promise<UpdateDispatchOutcome> {
    const updateId = update.update_id;

    try {
      const actor = update.callback_query?.from || update.message?.from;
      const chatId = update.callback_query?.message?.chat.id || update.message?.chat.id || actor?.id;

      if (!actor || actor.is_bot || !chatId) {
        return { ok: true, updateId, kind: 'ignored', detail: 'no_human_actor' };
      }

      const actorId = String(actor.id);
      this.totalUpdatesHandled++;
      this.lastUpdateHandledAt = new Date().toISOString();

      // 1. Register / update user in isolated `telegramUsers` collection
      const { user } = await this.userService.registerOrTouchUser(actor);
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

      // 5. Bot Commands (complete Unified Ecosystem V4 command suite)
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

      // 7. Stateful Active Flow input (text OR media attachment for support tickets)
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
          ? `${dict.aiTitle}\n\n🎤 "${voiceRes.transcript || ''}"\n\n${voiceRes.answerText || ''}`
          : `${dict.aiTitle}\n\n${voiceRes.reason || dict.aiErrorNotice}`;
        const formatted = this.emojiRegistry.formatMessage(textBody);
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
            const formatted = this.emojiRegistry.formatMessage(
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
          const aiRes = await this.aiBridge.handleQuestion(actorId, user.language, message.text);
          const formatted = this.emojiRegistry.formatMessage(
            `${dict.aiTitle}\n\n${aiRes.answerText || aiRes.reason || dict.aiErrorNotice}`
          );
          await this.apiClient.sendMessage({
            chat_id: chatId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
            reply_markup: buildAiModeKeyboard(user.language, this.emojiRegistry),
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
          reply_markup: buildMainMenuKeyboard(user.language, this.emojiRegistry, this.config, {
            isAdmin: Boolean(role),
            miniAppEnabled: Boolean(settings.miniAppEnabled),
          }),
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
      miniAppUrl: this.config.miniAppUrl,
      config: getSafeTelegramConfigSummary(this.config),
      pollingActive: this.jobScheduler.isPolling(),
      runtime,
      firestoreSync: this.repository.getFirestoreSyncStatus(),
      syncEngine: this.syncEngine.getStatusSummary(),
      centralContentCounts: this.centralContent.getSummaryCounts(),
      emojiCompatibility: this.emojiRegistry.validateCompatibility(),
      aiBridge: this.aiBridge.getStatus(),
      stats: this.repository.getStats(),
    };
  }
}
