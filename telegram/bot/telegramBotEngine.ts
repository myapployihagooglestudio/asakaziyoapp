/**
 * ASAKA ZIYO — Telegram Bot Platform Core Engine
 *
 * Orchestrates the entire isolated Telegram Platform:
 * - Safe startup bootstrap for both polling (auto-selected when token set without webhook)
 *   and webhook modes (auto-registers webhook when URL + secret are set)
 * - Live diagnostics (`runLiveDiagnostics`) checking token presence, Telegram API getMe,
 *   webhook info, polling telemetry, and explicit startup/error reasons
 * - Update dispatch (commands, inline callbacks, fallback guidance)
 * - Rate limiting & maintenance mode guard
 * - Automatic user registration & 5-language persistence
 * - Centralized Premium Custom Emoji Registry & eligibility verification
 * - Read-only prayer timetable bridge, channels, publishing, admin RBAC, Mini App & AI seams
 */

import { TelegramApiUpdate } from '../types';
import { TelegramPlatformConfig, getSafeTelegramConfigSummary, loadTelegramPlatformConfig } from '../config';
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
import { AiGenerateFn, TelegramAiBridge } from '../ai/aiBridge';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';
import { TelegramJobScheduler, TelegramPollingStatus } from '../jobs/jobScheduler';
import { handleBotCommand, parseBotCommand } from '../handlers/commandHandlers';
import { handleCallbackQuery } from '../handlers/callbackHandlers';
import { getTelegramLocaleBundle } from '../locales';
import { buildAiModeKeyboard, buildMainMenuKeyboard } from '../keyboards/keyboards';

export interface TelegramBotEngineOptions {
  config?: TelegramPlatformConfig;
  firestore?: ScopedFirestoreBridge;
  storePath?: string;
  readOnlyPrayerProvider?: ReadOnlyPrayerScheduleProvider;
  fetchImpl?: FetchLike;
  aiGenerator?: AiGenerateFn;
  silentLogger?: boolean;
}

export interface UpdateDispatchOutcome {
  ok: boolean;
  updateId: number;
  kind: 'command' | 'callback' | 'ai_reply' | 'text_fallback' | 'ignored' | 'rate_limited' | 'maintenance' | 'error';
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

export class TelegramBotEngine {
  public readonly config: TelegramPlatformConfig;
  public readonly logger: TelegramLogger;
  public readonly apiClient: TelegramApiClient;
  public readonly repository: TelegramRepository;
  public readonly emojiRegistry: CustomEmojiRegistry;
  public readonly rateLimiter: TelegramRateLimiter;
  public readonly userService: TelegramUserService;
  public readonly prayerAdapter: TelegramPrayerAdapter;
  public readonly contentAdapter: TelegramIslamicContentAdapter;
  public readonly channelService: TelegramChannelService;
  public readonly publishingService: TelegramPublishingService;
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
  private totalUpdatesHandled = 0;
  private lastUpdateHandledAt: string | null = null;
  private lastError: string | null = null;
  private lastErrorAt: string | null = null;
  private startupRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private startupRetryCount = 0;

  constructor(options: TelegramBotEngineOptions = {}) {
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
    this.contentAdapter = new TelegramIslamicContentAdapter();
    this.channelService = new TelegramChannelService(this.repository);
    this.publishingService = new TelegramPublishingService(
      this.apiClient,
      this.repository,
      this.emojiRegistry
    );
    this.adminService = new TelegramAdminService(this.config, this.repository);
    this.aiBridge = new TelegramAiBridge(this.repository, {
      logger: this.logger,
      generator: options.aiGenerator,
    });
    this.jobScheduler = new TelegramJobScheduler({
      apiClient: this.apiClient,
      onUpdate: (u) => this.processUpdate(u),
      logger: this.logger,
      prayerAdapter: this.prayerAdapter,
      repository: this.repository,
      emojiRegistry: this.emojiRegistry,
      publishingService: this.publishingService,
    });
  }

  /**
   * Initializes and starts the Telegram bot runtime safely in the background.
   * Logs clear diagnostic messages explaining whether the bot started in polling/webhook mode
   * or the exact reason it could not start.
   */
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

    // Step 1: Verify bot token & API reachability via getMe()
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

      // Retry automatically on transient network/5xx failures (never retry on 401 invalid token)
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

    // Step 2: Mode-specific startup
    if (this.config.mode === 'polling') {
      // Clear any stale webhook first so Telegram getUpdates does not return 409 Conflict
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

    // Webhook mode
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
      totalUpdatesHandled: this.totalUpdatesHandled,
      lastUpdateHandledAt: this.lastUpdateHandledAt,
      lastError: this.lastError || polling.lastError,
      lastErrorAt: this.lastErrorAt || polling.lastErrorAt,
      polling,
    };
  }

  /**
   * Executes live end-to-end diagnostics against Telegram Bot API (getMe + getWebhookInfo)
   * and returns actionable findings without ever exposing secret values.
   */
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
          `Bot username mismatch: TELEGRAM_BOT_USERNAME is "@${this.config.botUsername}", but TELEGRAM_BOT_TOKEN1 belongs to "@${me.result!.username}". Sending /start to "@${this.config.botUsername}" will not reach this token's bot.`
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
      if (!this.config.webhookUrl) {
        issues.push('TELEGRAM_WEBHOOK_URL is not set.');
      }
      if (!this.config.webhookSecret) {
        issues.push(
          'TELEGRAM_WEBHOOK_SECRET is not set (webhook endpoint rejects requests with HTTP 403 without it).'
        );
      }
      if (whResult && !whResult.url) {
        issues.push('Telegram currently has NO webhook URL registered (call POST /api/telegram/platform/webhook/register).');
      } else if (whResult && this.config.webhookUrl && whResult.url !== this.config.webhookUrl) {
        issues.push(`Registered Telegram webhook (${whResult.url}) does not match TELEGRAM_WEBHOOK_URL (${this.config.webhookUrl}).`);
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
      { command: 'prayer', description: dict.commands.prayer },
      { command: 'quran', description: dict.commands.quran },
      { command: 'hadith', description: dict.commands.hadith },
      { command: 'dhikr', description: dict.commands.dhikr },
      { command: 'ask', description: dict.commands.ask },
      { command: 'profile', description: dict.commands.profile },
      { command: 'language', description: dict.commands.language },
      { command: 'settings', description: dict.commands.settings },
      { command: 'admin', description: dict.commands.admin },
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
          aiBridge: this.aiBridge,
          adminService: this.adminService,
          channelService: this.channelService,
          publishingService: this.publishingService,
          repository: this.repository,
          runDiagnostics: () => this.runLiveDiagnostics(),
        });
        return {
          ok: true,
          updateId,
          kind: 'callback',
          detail: result.action,
        };
      }

      // 5. Bot Commands (/start, /prayer, /quran, /hadith, /dhikr, /ask, /profile, /language, /settings, /admin, /help)
      if (update.message?.text) {
        const parsedCmd = parseBotCommand(update.message.text);
        if (parsedCmd) {
          const cmdRes = await handleBotCommand(update.message, user, {
            apiClient: this.apiClient,
            config: this.config,
            emojiRegistry: this.emojiRegistry,
            prayerAdapter: this.prayerAdapter,
            contentAdapter: this.contentAdapter,
            aiBridge: this.aiBridge,
            adminService: this.adminService,
            repository: this.repository,
          });
          return {
            ok: true,
            updateId,
            kind: 'command',
            detail: cmdRes.command,
          };
        }

        // Private chat plain text: route to AI Assistant when active, otherwise return main menu
        if (update.message.chat.type === 'private') {
          if (this.aiBridge.isUserInAiMode(actorId)) {
            await this.apiClient.sendChatAction(chatId, 'typing');
            const aiRes = await this.aiBridge.handleQuestion(
              actorId,
              user.language,
              update.message.text
            );
            const formatted = this.emojiRegistry.formatMessage(
              `${dict.aiTitle}\n\n${aiRes.answerText || dict.aiErrorNotice}`
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
      phase: 2,
      config: getSafeTelegramConfigSummary(this.config),
      pollingActive: this.jobScheduler.isPolling(),
      runtime,
      emojiCompatibility: this.emojiRegistry.validateCompatibility(),
      aiBridge: this.aiBridge.getStatus(),
      stats: this.repository.getStats(),
    };
  }
}
