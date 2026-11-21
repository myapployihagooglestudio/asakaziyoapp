/**
 * ASAKA ZIYO — Typed Telegram Bot API Client
 *
 * Uses Node.js built-in fetch (zero external bot framework dependency bloat).
 * Supports text, HTML, Reply & Inline keyboards, file downloads (voice/photo/doc),
 * multimedia dispatch (photo/video/audio/voice/document/animation/mediaGroup),
 * Flood-wait (`retry_after`) reporting, and injectable fetch for deterministic tests.
 */

import {
  TelegramApiChat,
  TelegramApiFile,
  TelegramApiMessage,
  TelegramApiResponse,
  TelegramApiUpdate,
  TelegramBotProfile,
  TelegramChatMemberInfo,
  TelegramMessageEntity,
  TelegramReplyMarkup,
  TelegramStickerInfo,
  TelegramStickerSet,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramLogger } from '../middlewares/logger';

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  entities?: TelegramMessageEntity[];
  reply_markup?: TelegramReplyMarkup;
  disable_web_page_preview?: boolean;
}

export interface EditMessageTextParams {
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  entities?: TelegramMessageEntity[];
  reply_markup?: TelegramReplyMarkup;
  disable_web_page_preview?: boolean;
}

export interface SendMediaParams {
  chat_id: number | string;
  caption?: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_markup?: TelegramReplyMarkup;
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

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
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
        description: 'TELEGRAM_BOT_TOKEN1 is not configured.',
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
        const desc = String(parsed.description || '');
        const isBenignNotModified =
          method.startsWith('editMessage') &&
          desc.toLowerCase().includes('message is not modified');
        if (isBenignNotModified) {
          return {
            ok: true,
            result: true as unknown as T,
            description: desc,
          };
        }
        const isPollingConflict = method === 'getUpdates' && (parsed.error_code === 409 || response.status === 409);
        if (!isPollingConflict) {
          this.logger.warn(`Telegram API ${method} failed`, {
            status: response.status,
            errorCode: parsed.error_code,
            description: parsed.description,
            retryAfter: parsed.parameters?.retry_after,
          });
        }
        return {
          ok: false,
          error_code: parsed.error_code || response.status,
          description: parsed.description || `HTTP ${response.status}`,
          ...(parsed.parameters ? { parameters: parsed.parameters } : {}),
        };
      }
      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Telegram API ${method} network error`, { error: msg });
      return {
        ok: false,
        error_code: 500,
        description: msg,
      };
    }
  }

  private async callMultipartMethod<T>(
    method: string,
    form: FormData
  ): Promise<TelegramApiResponse<T>> {
    if (!this.config.botToken) {
      return {
        ok: false,
        error_code: 503,
        description: 'TELEGRAM_BOT_TOKEN1 is not configured.',
      };
    }

    const url = `${this.config.apiBaseUrl}/bot${this.config.botToken}/${method}`;
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        body: form,
      });
      const parsed = (await response.json().catch(() => ({}))) as TelegramApiResponse<T>;
      if (!response.ok || !parsed.ok) {
        return {
          ok: false,
          error_code: parsed.error_code || response.status,
          description: parsed.description || `HTTP ${response.status}`,
          ...(parsed.parameters ? { parameters: parsed.parameters } : {}),
        };
      }
      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error_code: 500, description: msg };
    }
  }

  async getMe(): Promise<TelegramApiResponse<TelegramBotProfile>> {
    return this.callMethod<TelegramBotProfile>('getMe');
  }

  async sendMessage(params: SendMessageParams): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendMessage',
      params as unknown as Record<string, unknown>
    );
  }

  async editMessageText(
    params: EditMessageTextParams
  ): Promise<TelegramApiResponse<TelegramApiMessage | boolean>> {
    return this.callMethod<TelegramApiMessage | boolean>(
      'editMessageText',
      params as unknown as Record<string, unknown>
    );
  }

  async sendPhoto(
    params: SendMediaParams & { photo: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendPhoto',
      params as unknown as Record<string, unknown>
    );
  }

  async sendVideo(
    params: SendMediaParams & { video: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendVideo',
      params as unknown as Record<string, unknown>
    );
  }

  async sendAudio(
    params: SendMediaParams & { audio: string; title?: string; performer?: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendAudio',
      params as unknown as Record<string, unknown>
    );
  }

  async sendVoice(
    params: SendMediaParams & { voice: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendVoice',
      params as unknown as Record<string, unknown>
    );
  }

  async sendAudioBuffer(params: {
    chat_id: number | string;
    audioBuffer: Buffer;
    filename: string;
    mimeType?: string;
    caption?: string;
    title?: string;
    performer?: string;
    asVoice?: boolean;
  }): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const form = new FormData();
    form.append('chat_id', String(params.chat_id));
    if (params.caption) form.append('caption', params.caption.slice(0, 1020));
    if (params.title) form.append('title', params.title);
    if (params.performer) form.append('performer', params.performer);
    const blob = new Blob([new Uint8Array(params.audioBuffer)], {
      type: params.mimeType || 'audio/wav',
    });
    const fieldName = params.asVoice ? 'voice' : 'audio';
    const method = params.asVoice ? 'sendVoice' : 'sendAudio';
    form.append(fieldName, blob, params.filename);
    return this.callMultipartMethod<TelegramApiMessage>(method, form);
  }

  async sendDocument(
    params: SendMediaParams & { document: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendDocument',
      params as unknown as Record<string, unknown>
    );
  }

  async sendAnimation(
    params: SendMediaParams & { animation: string }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    return this.callMethod<TelegramApiMessage>(
      'sendAnimation',
      params as unknown as Record<string, unknown>
    );
  }

  async sendMediaGroup(params: {
    chat_id: number | string;
    media: Array<{ type: 'photo' | 'video' | 'audio' | 'document'; media: string; caption?: string }>;
  }): Promise<TelegramApiResponse<TelegramApiMessage[]>> {
    return this.callMethod<TelegramApiMessage[]>(
      'sendMediaGroup',
      params as unknown as Record<string, unknown>
    );
  }

  async getFile(fileId: string): Promise<TelegramApiResponse<TelegramApiFile>> {
    return this.callMethod<TelegramApiFile>('getFile', { file_id: fileId });
  }

  async downloadFileBuffer(
    filePath: string
  ): Promise<{ ok: boolean; buffer?: Buffer; error?: string }> {
    if (!this.config.botToken) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN1 is not configured.' };
    }
    const cleanPath = filePath.replace(/^\/+/, '');
    const url = `${this.config.apiBaseUrl}/file/bot${this.config.botToken}/${cleanPath}`;
    try {
      const response = await this.fetchImpl(url, { method: 'GET' });
      if (!response.ok || !response.arrayBuffer) {
        return { ok: false, error: `File download HTTP ${response.status}` };
      }
      const ab = await response.arrayBuffer();
      return { ok: true, buffer: Buffer.from(ab) };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async answerCallbackQuery(
    params: AnswerCallbackQueryParams
  ): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>(
      'answerCallbackQuery',
      params as unknown as Record<string, unknown>
    );
  }

  async sendChatAction(
    chatId: number | string,
    action: 'typing' | 'upload_document' | 'record_voice' | 'upload_voice' | 'find_location' = 'typing'
  ): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('sendChatAction', { chat_id: chatId, action });
  }

  async getChat(chatId: number | string): Promise<TelegramApiResponse<TelegramApiChat>> {
    return this.callMethod<TelegramApiChat>('getChat', { chat_id: chatId });
  }

  async getChatMember(
    chatId: number | string,
    userId: number
  ): Promise<TelegramApiResponse<TelegramChatMemberInfo>> {
    return this.callMethod<TelegramChatMemberInfo>('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  async getChatMemberCount(chatId: number | string): Promise<TelegramApiResponse<number>> {
    return this.callMethod<number>('getChatMemberCount', { chat_id: chatId });
  }

  async setWebhook(params: SetWebhookParams): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('setWebhook', params as unknown as Record<string, unknown>);
  }

  async deleteWebhook(dropPendingUpdates = false): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('deleteWebhook', {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  async getWebhookInfo(): Promise<TelegramApiResponse<WebhookInfoResult>> {
    return this.callMethod<WebhookInfoResult>('getWebhookInfo');
  }

  async getUpdates(
    offset?: number,
    timeoutSec = 10
  ): Promise<TelegramApiResponse<TelegramApiUpdate[]>> {
    return this.callMethod<TelegramApiUpdate[]>('getUpdates', {
      ...(offset !== undefined ? { offset } : {}),
      timeout: timeoutSec,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  async setMyCommands(
    commands: BotCommandSpec[],
    languageCode?: string
  ): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>('setMyCommands', {
      commands,
      ...(languageCode ? { language_code: languageCode } : {}),
    });
  }

  async setChatMenuButton(params: {
    chat_id?: number;
    menu_button:
      | { type: 'commands' }
      | { type: 'default' }
      | { type: 'web_app'; text: string; web_app: { url: string } };
  }): Promise<TelegramApiResponse<boolean>> {
    return this.callMethod<boolean>(
      'setChatMenuButton',
      params as unknown as Record<string, unknown>
    );
  }

  async getStickerSet(name: string): Promise<TelegramApiResponse<TelegramStickerSet>> {
    return this.callMethod<TelegramStickerSet>('getStickerSet', { name });
  }

  async getCustomEmojiStickers(
    customEmojiIds: string[]
  ): Promise<TelegramApiResponse<TelegramStickerInfo[]>> {
    if (customEmojiIds.length === 0) {
      return { ok: true, result: [] };
    }
    return this.callMethod<TelegramStickerInfo[]>('getCustomEmojiStickers', {
      custom_emoji_ids: customEmojiIds.slice(0, 200),
    });
  }

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
        reason: 'TELEGRAM_BOT_TOKEN1 is not configured; Unicode fallback active.',
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
          'Bot connected. No verified custom_emoji_id registered yet; Unicode fallback remains active until real Telegram sticker set custom_emoji_id values are imported & verified.',
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
      supportsKeyboardIconCustomEmoji: false,
      botUsername: me.result.username,
      reason: stickerFound
        ? 'Verified custom_emoji_id confirmed via getCustomEmojiStickers. Note: live rendering in Telegram messages requires bot custom-emoji eligibility; Unicode fallback remains active wherever unsupported.'
        : `Custom emoji verification failed: ${stickerRes.description || 'Sticker not found'}. Unicode fallback active.`,
      checkedAt,
    };
  }
}
