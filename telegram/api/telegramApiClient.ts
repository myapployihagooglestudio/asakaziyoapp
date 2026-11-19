/**
 * ASAKA ZIYO — Typed Telegram Bot API Client
 *
 * Uses Node.js built-in fetch (zero external bot framework dependency bloat).
 * Supports injectable fetch implementation for deterministic unit & integration testing.
 */

import {
  TelegramApiMessage,
  TelegramApiResponse,
  TelegramApiUpdate,
  TelegramBotProfile,
  TelegramInlineKeyboardMarkup,
  TelegramMessageEntity,
  TelegramStickerInfo,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramLogger } from '../middlewares/logger';

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  entities?: TelegramMessageEntity[];
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface EditMessageTextParams {
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  entities?: TelegramMessageEntity[];
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface AnswerCallbackQueryParams {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
}

export interface SetWebhookParams {
  url: string;
  secret_token?: string;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
}

export interface WebhookInfoResult {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export interface BotCommandSpec {
  command: string;
  description: string;
}

export interface PremiumEligibilityCheckResult {
  checked: boolean;
  botConnected: boolean;
  canVerifyCustomEmojis: boolean;
  supportsMessageCustomEmojiEntities: boolean;
  supportsKeyboardIconCustomEmoji: boolean;
  botUsername?: string;
  reason: string;
  checkedAt: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export class TelegramApiClient {
  private readonly config: TelegramPlatformConfig;
  private readonly logger: TelegramLogger;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: TelegramPlatformConfig,
    logger: TelegramLogger,
    fetchImpl?: FetchLike
  ) {
    this.config = config;
    this.logger = logger;
    this.fetchImpl = fetchImpl || ((url, init) => fetch(url, init));
  }

  get isConfigured(): boolean {
    return Boolean(this.config.botToken);
  }

  async callMethod<T>(
    method: string,
    payload?: Record<string, unknown>
  ): Promise<TelegramApiResponse<T>> {
    if (!this.config.botToken) {
      return {
        ok: false,
        error_code: 503,
        description: 'TELEGRAM_BOT_TOKEN is not configured.',
      };
    }

    const url = `${this.config.apiBaseUrl}/bot${this.config.botToken}/${method}`;

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : '{}',
      });

      const parsed = (await response.json().catch(() => ({}))) as TelegramApiResponse<T>;
      if (!response.ok || !parsed.ok) {
        this.logger.warn(`Telegram Bot API method "${method}" returned error`, {
          httpStatus: response.status,
          errorCode: parsed.error_code,
          description: parsed.description,
        });
        return {
          ok: false,
          error_code: parsed.error_code || response.status,
          description: parsed.description || `HTTP ${response.status}`,
        };
      }

      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      this.logger.error(`Telegram Bot API call "${method}" failed`, { error: msg });
      return {
        ok: false,
        error_code: 500,
        description: msg,
      };
    }
  }

  getMe(): Promise<TelegramApiResponse<TelegramBotProfile>> {
    return this.callMethod<TelegramBotProfile>('getMe');
  }

  sendMessage(params: SendMessageParams): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>('sendMessage', params as unknown as Record<string, unknown>);
  }

  editMessageText(params: EditMessageTextParams): Promise<TelegramApiResponse<TelegramApiMessage | boolean>> {
    return this.callMethod<TelegramApiMessage | boolean>(
      'editMessageText',
      params as unknown as Record<string, unknown>
    );
  }

  answerCallbackQuery(params: AnswerCallbackQueryParams): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>(
      'answerCallbackQuery',
      params as unknown as Record<string, unknown>
    );
  }

  setWebhook(params: SetWebhookParams): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('setWebhook', params as unknown as Record<string, unknown>);
  }

  deleteWebhook(dropPendingUpdates = false): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('deleteWebhook', {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  getWebhookInfo(): Promise<TelegramApiResponse<WebhookInfoResult>> {
    return this.callMethod<WebhookInfoResult>('getWebhookInfo');
  }

  getUpdates(offset?: number, timeoutSec = 15): Promise<TelegramApiResponse<TelegramApiUpdate[]>> {
    return this.callMethod<TelegramApiUpdate[]>('getUpdates', {
      ...(offset !== undefined ? { offset } : {}),
      timeout: timeoutSec,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  setMyCommands(
    commands: BotCommandSpec[],
    languageCode?: string
  ): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('setMyCommands', {
      commands,
      ...(languageCode ? { language_code: languageCode } : {}),
    });
  }

  getCustomEmojiStickers(customEmojiIds: string[]): Promise<TelegramApiResponse<TelegramStickerInfo[]>> {
    return this.callMethod<TelegramStickerInfo[]>('getCustomEmojiStickers', {
      custom_emoji_ids: customEmojiIds,
    });
  }

  /**
   * Honest Bot API capability probe for Telegram Premium Custom Emoji eligibility.
   * Never assumes Premium features are available until verified via Telegram Bot API.
   *
   * Note: Telegram Bot API allows bots to render custom_emoji entities only if the bot
   * holds a Fragment collectible username or is granted premium emoji rights by Telegram,
   * and keyboard icon_custom_emoji_id requires Bot API 9.4+ bot eligibility.
   * Until an actual verified custom_emoji_id is tested live against the bot token,
   * the registry safely falls back to standard Unicode emoji.
   */
  async verifyPremiumEmojiEligibility(
    sampleCustomEmojiId?: string | null
  ): Promise<PremiumEligibilityCheckResult> {
    const checkedAt = new Date().toISOString();

    if (!this.isConfigured) {
      return {
        checked: false,
        botConnected: false,
        canVerifyCustomEmojis: false,
        supportsMessageCustomEmojiEntities: false,
        supportsKeyboardIconCustomEmoji: false,
        reason: 'TELEGRAM_BOT_TOKEN is not configured; Unicode fallback active.',
        checkedAt,
      };
    }

    const me = await this.getMe();
    if (!me.ok || !me.result) {
      return {
        checked: true,
        botConnected: false,
        canVerifyCustomEmojis: false,
        supportsMessageCustomEmojiEntities: false,
        supportsKeyboardIconCustomEmoji: false,
        reason: `Bot API connection failed: ${me.description || 'Unknown error'}`,
        checkedAt,
      };
    }

    if (!sampleCustomEmojiId) {
      return {
        checked: true,
        botConnected: true,
        canVerifyCustomEmojis: true,
        supportsMessageCustomEmojiEntities: false,
        supportsKeyboardIconCustomEmoji: false,
        botUsername: me.result.username,
        reason:
          'Bot connected. No verified custom_emoji_id registered yet; Unicode fallback remains active until owner registers and verifies real custom_emoji_id values.',
        checkedAt,
      };
    }

    const stickerRes = await this.getCustomEmojiStickers([sampleCustomEmojiId]);
    const stickerFound = Boolean(
      stickerRes.ok &&
        Array.isArray(stickerRes.result) &&
        stickerRes.result.some((s) => s.custom_emoji_id === sampleCustomEmojiId)
    );

    return {
      checked: true,
      botConnected: true,
      canVerifyCustomEmojis: true,
      supportsMessageCustomEmojiEntities: stickerFound,
      supportsKeyboardIconCustomEmoji: stickerFound,
      botUsername: me.result.username,
      reason: stickerFound
        ? 'Verified custom_emoji_id confirmed via getCustomEmojiStickers.'
        : `Custom emoji verification failed: ${stickerRes.description || 'Sticker not found'}. Unicode fallback active.`,
      checkedAt,
    };
  }
}
