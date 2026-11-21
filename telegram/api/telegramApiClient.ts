/**
 * ASAKA ZIYO — Typed Telegram Bot API Client
 *
 * Uses Node.js built-in fetch (zero external bot framework dependency bloat).
 * Supports text, HTML, Reply & Inline keyboards, file downloads (voice/photo/doc),
 * multimedia dispatch (photo/video/audio/voice/document/animation/mediaGroup),
 * Flood-wait (`retry_after`) reporting, and injectable fetch for deterministic tests.
 */

import zlib from 'zlib';
import {
  SendMessageDraftParams,
  SendRichMessageParams,
  SendWidgetParams,
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
import type { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import {
  auditTelegramOutgoingPayload,
  stripPlainUnicodeEmojis,
  stripTgEmojiHtmlTags as stripTgEmojiTagsToEmpty,
} from '../emoji/customEmojiRegistry';

export const TELEGRAM_WIDGET_MAX_RAW_BYTES = 32_768;
export const TELEGRAM_WIDGET_MAX_ZLIB_BYTES = 4_096;

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
  private emojiRegistry?: CustomEmojiRegistry;

  constructor(
    config: TelegramPlatformConfig,
    logger: TelegramLogger,
    fetchImpl?: FetchLike
  ) {
    this.config = config;
    this.logger = logger;
    this.fetchImpl = fetchImpl || ((url, init) => fetch(url, init));
  }

  attachEmojiRegistry(registry: CustomEmojiRegistry): void {
    this.emojiRegistry = registry;
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

  private stripCustomEmojiFieldsFromMarkup(
    markup?: TelegramReplyMarkup,
    stripStyle = true
  ): TelegramReplyMarkup | undefined {
    if (!markup) return undefined;
    if ('inline_keyboard' in markup && Array.isArray(markup.inline_keyboard)) {
      return {
        inline_keyboard: markup.inline_keyboard.map((row) =>
          row.map((btn) => {
            if (!btn.icon_custom_emoji_id && !(stripStyle && btn.style)) return btn;
            const clone = { ...btn };
            delete clone.icon_custom_emoji_id;
            if (stripStyle) delete clone.style;
            return clone;
          })
        ),
      };
    }
    if ('keyboard' in markup && Array.isArray(markup.keyboard)) {
      return {
        ...markup,
        keyboard: markup.keyboard.map((row) =>
          row.map((btn) => {
            if (!btn.icon_custom_emoji_id && !(stripStyle && btn.style)) return btn;
            const clone = { ...btn };
            delete clone.icon_custom_emoji_id;
            if (stripStyle) delete clone.style;
            return clone;
          })
        ),
      };
    }
    return markup;
  }

  private stripTgEmojiHtmlTags(html: string): string {
    return stripTgEmojiTagsToEmpty(html);
  }

  private sanitizeOutgoingMarkup(markup?: TelegramReplyMarkup): TelegramReplyMarkup | undefined {
    if (!markup) return undefined;
    if (this.emojiRegistry) {
      return this.emojiRegistry.sanitizeReplyMarkup(markup);
    }
    if ('inline_keyboard' in markup && Array.isArray(markup.inline_keyboard)) {
      return {
        inline_keyboard: markup.inline_keyboard.map((row) =>
          row.map((btn) => ({ ...btn, text: stripPlainUnicodeEmojis(btn.text || '').trim() || 'Tanlash' }))
        ),
      };
    }
    if ('keyboard' in markup && Array.isArray(markup.keyboard)) {
      return {
        ...markup,
        keyboard: markup.keyboard.map((row) =>
          row.map((btn) => ({ ...btn, text: stripPlainUnicodeEmojis(btn.text || '').trim() || 'Menyu' }))
        ),
      };
    }
    return markup;
  }

  private sanitizeOutgoingTextAndEntities(params: {
    text: string;
    parse_mode?: 'HTML' | 'MarkdownV2';
    entities?: TelegramMessageEntity[];
  }): { text: string; entities?: TelegramMessageEntity[] } {
    if (params.parse_mode === 'HTML') {
      if (this.emojiRegistry) {
        const expanded = params.text.includes('{{emoji:')
          ? this.emojiRegistry.formatHtmlMessage(params.text).html
          : params.text;
        return { text: this.emojiRegistry.sanitizeHtmlPayload(expanded) };
      }
      return { text: stripPlainUnicodeEmojis(params.text.replace(/\{\{emoji:[a-z0-9._-]+\}\}\s*/gi, '')) };
    }
    if (this.emojiRegistry) {
      if ((!params.entities || params.entities.length === 0) && params.text.includes('{{emoji:')) {
        const formatted = this.emojiRegistry.formatMessage(params.text);
        return {
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        };
      }
      const strict = this.emojiRegistry.enforceStrictEntitiesPayload(params.text, params.entities);
      return {
        text: strict.text,
        ...(strict.entities.length > 0 ? { entities: strict.entities } : {}),
      };
    }
    return { text: stripPlainUnicodeEmojis(params.text.replace(/\{\{emoji:[a-z0-9._-]+\}\}\s*/gi, '')) };
  }

  private sanitizeOutgoingCaptionAndEntities(params: {
    caption?: string;
    parse_mode?: 'HTML' | 'MarkdownV2';
    caption_entities?: TelegramMessageEntity[];
  }): { caption?: string; caption_entities?: TelegramMessageEntity[] } {
    if (!params.caption) return {};
    const res = this.sanitizeOutgoingTextAndEntities({
      text: params.caption,
      parse_mode: params.parse_mode,
      entities: params.caption_entities,
    });
    return {
      caption: res.text,
      ...(res.entities && res.entities.length > 0 ? { caption_entities: res.entities } : {}),
    };
  }

  private sanitizeRichBlocks(blocks: SendRichMessageParams['blocks']): SendRichMessageParams['blocks'] {
    const cleanRichNode = (node: any): any => {
      if (!node || typeof node !== 'object') return node;
      if (node.type === 'plain' || node.type === 'code') {
        return { ...node, text: stripPlainUnicodeEmojis(String(node.text || '')) };
      }
      if (node.type === 'bold' || node.type === 'italic' || node.type === 'link') {
        return { ...node, text: cleanRichNode(node.text) };
      }
      if (node.type === 'concatenation' && Array.isArray(node.texts)) {
        return { ...node, texts: node.texts.map(cleanRichNode) };
      }
      return node;
    };
    const cleanBlock = (blk: any): any => {
      if (!blk || typeof blk !== 'object') return blk;
      const out = { ...blk };
      if (out.text) out.text = cleanRichNode(out.text);
      if (out.title) out.title = cleanRichNode(out.title);
      if (out.caption) out.caption = cleanRichNode(out.caption);
      if (Array.isArray(out.items)) {
        out.items = out.items.map((it: any) => ({ ...it, text: cleanRichNode(it?.text) }));
      }
      if (Array.isArray(out.header)) {
        out.header = out.header.map(cleanRichNode);
      }
      if (Array.isArray(out.rows)) {
        out.rows = out.rows.map((r: any[]) => r.map(cleanRichNode));
      }
      if (Array.isArray(out.blocks)) {
        out.blocks = out.blocks.map(cleanBlock);
      }
      if (Array.isArray(out.buttons)) {
        const cleanedMarkup = this.sanitizeOutgoingMarkup({ inline_keyboard: out.buttons });
        if (cleanedMarkup && 'inline_keyboard' in cleanedMarkup) {
          out.buttons = cleanedMarkup.inline_keyboard;
        }
      }
      return out;
    };
    return Array.isArray(blocks) ? blocks.map(cleanBlock) : blocks;
  }

  private auditPreparedPayload(method: string, payload: Record<string, unknown>): void {
    const audit = auditTelegramOutgoingPayload(payload);
    this.emojiRegistry?.recordOutgoingAudit(audit.clean);
    if (!audit.clean) {
      this.logger.warn(`Outgoing ${method} payload audit detected plain emoji violation`, {
        violations: audit.violations.slice(0, 5),
      });
    }
  }

  private hasKeyboardIconsInMarkup(markup?: TelegramReplyMarkup): boolean {
    if (!markup) return false;
    if ('inline_keyboard' in markup) {
      return markup.inline_keyboard.some((row) => row.some((b) => Boolean(b.icon_custom_emoji_id)));
    }
    if ('keyboard' in markup) {
      return markup.keyboard.some((row) => row.some((b) => Boolean(b.icon_custom_emoji_id)));
    }
    return false;
  }

  private isCustomEmojiRejectionError(res: TelegramApiResponse<unknown>): boolean {
    if (res.ok || res.error_code !== 400) return false;
    const desc = String(res.description || '').toLowerCase();
    return (
      desc.includes('custom_emoji') ||
      desc.includes('custom emoji') ||
      desc.includes('icon_custom_emoji') ||
      desc.includes('button_icon') ||
      desc.includes('button_style') ||
      desc.includes('style') ||
      desc.includes('document_invalid') ||
      desc.includes('can\'t parse entities')
    );
  }

  private hasCustomEmojiInPayload(params: {
    text?: string;
    parse_mode?: string;
    entities?: TelegramMessageEntity[];
    reply_markup?: TelegramReplyMarkup;
  }): boolean {
    if (Array.isArray(params.entities) && params.entities.some((e) => e.type === 'custom_emoji')) {
      return true;
    }
    if (params.parse_mode === 'HTML' && typeof params.text === 'string' && params.text.includes('<tg-emoji')) {
      return true;
    }
    const rm = params.reply_markup;
    if (rm && 'inline_keyboard' in rm) {
      return rm.inline_keyboard.some((row) =>
        row.some((b) => Boolean(b.icon_custom_emoji_id || b.style))
      );
    }
    if (rm && 'keyboard' in rm) {
      return rm.keyboard.some((row) =>
        row.some((b) => Boolean(b.icon_custom_emoji_id || b.style))
      );
    }
    return false;
  }

  async sendMessage(params: SendMessageParams): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cleanText = this.sanitizeOutgoingTextAndEntities({
      text: params.text,
      parse_mode: params.parse_mode,
      entities: params.entities,
    });
    const prepared: SendMessageParams = {
      ...params,
      text: cleanText.text || 'ASAKA ZIYO',
      ...(cleanText.entities && cleanText.entities.length > 0 ? { entities: cleanText.entities } : {}),
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    if (!cleanText.entities || cleanText.entities.length === 0) {
      delete prepared.entities;
    }
    this.auditPreparedPayload('sendMessage', prepared as unknown as Record<string, unknown>);

    const res = await this.callMethod<TelegramApiMessage>(
      'sendMessage',
      prepared as unknown as Record<string, unknown>
    );
    if (!res.ok && this.hasCustomEmojiInPayload(prepared) && this.isCustomEmojiRejectionError(res)) {
      this.emojiRegistry?.recordDeliveryFailure(`sendMessage HTTP 400: ${res.description || 'rejected'}`);
      if (this.hasKeyboardIconsInMarkup(prepared.reply_markup)) {
        this.emojiRegistry?.recordKeyboardIconWarning(
          `sendMessage keyboard icon rejected by Telegram: ${res.description || '400'}`
        );
      }
      const excised =
        prepared.parse_mode === 'HTML'
          ? { text: this.stripTgEmojiHtmlTags(prepared.text), entities: [] as TelegramMessageEntity[] }
          : this.emojiRegistry
            ? this.emojiRegistry.exciseCustomEmojiEntities(prepared.text, prepared.entities)
            : { text: stripPlainUnicodeEmojis(prepared.text), entities: [] as TelegramMessageEntity[] };
      const fallbackParams: SendMessageParams = {
        ...prepared,
        text: excised.text || 'ASAKA ZIYO',
        ...(excised.entities.length > 0 ? { entities: excised.entities } : {}),
        reply_markup: this.stripCustomEmojiFieldsFromMarkup(prepared.reply_markup, true),
      };
      if (excised.entities.length === 0) {
        delete fallbackParams.entities;
      }
      this.auditPreparedPayload('sendMessage:fallback', fallbackParams as unknown as Record<string, unknown>);
      this.logger.warn('Premium emoji/style delivery rejected by Telegram API; retrying with clean emoji-free text', {
        description: res.description,
      });
      return this.callMethod<TelegramApiMessage>(
        'sendMessage',
        fallbackParams as unknown as Record<string, unknown>
      );
    }
    return res;
  }

  async editMessageText(
    params: EditMessageTextParams
  ): Promise<TelegramApiResponse<TelegramApiMessage | boolean>> {
    const cleanText = this.sanitizeOutgoingTextAndEntities({
      text: params.text,
      parse_mode: params.parse_mode,
      entities: params.entities,
    });
    const prepared: EditMessageTextParams = {
      ...params,
      text: cleanText.text || 'ASAKA ZIYO',
      ...(cleanText.entities && cleanText.entities.length > 0 ? { entities: cleanText.entities } : {}),
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    if (!cleanText.entities || cleanText.entities.length === 0) {
      delete prepared.entities;
    }
    this.auditPreparedPayload('editMessageText', prepared as unknown as Record<string, unknown>);

    const res = await this.callMethod<TelegramApiMessage | boolean>(
      'editMessageText',
      prepared as unknown as Record<string, unknown>
    );
    if (!res.ok && this.hasCustomEmojiInPayload(prepared) && this.isCustomEmojiRejectionError(res)) {
      this.emojiRegistry?.recordDeliveryFailure(`editMessageText HTTP 400: ${res.description || 'rejected'}`);
      if (this.hasKeyboardIconsInMarkup(prepared.reply_markup)) {
        this.emojiRegistry?.recordKeyboardIconWarning(
          `editMessageText keyboard icon rejected by Telegram: ${res.description || '400'}`
        );
      }
      const excised =
        prepared.parse_mode === 'HTML'
          ? { text: this.stripTgEmojiHtmlTags(prepared.text), entities: [] as TelegramMessageEntity[] }
          : this.emojiRegistry
            ? this.emojiRegistry.exciseCustomEmojiEntities(prepared.text, prepared.entities)
            : { text: stripPlainUnicodeEmojis(prepared.text), entities: [] as TelegramMessageEntity[] };
      const fallbackParams: EditMessageTextParams = {
        ...prepared,
        text: excised.text || 'ASAKA ZIYO',
        ...(excised.entities.length > 0 ? { entities: excised.entities } : {}),
        reply_markup: this.stripCustomEmojiFieldsFromMarkup(prepared.reply_markup, true),
      };
      if (excised.entities.length === 0) {
        delete fallbackParams.entities;
      }
      this.auditPreparedPayload('editMessageText:fallback', fallbackParams as unknown as Record<string, unknown>);
      this.logger.warn('Premium emoji/style editMessageText rejected by Telegram API; retrying with clean emoji-free text', {
        description: res.description,
      });
      return this.callMethod<TelegramApiMessage | boolean>(
        'editMessageText',
        fallbackParams as unknown as Record<string, unknown>
      );
    }
    return res;
  }

  /**
   * Telegram Bot API 10.1–10.3: Send Rich Message (`sendRichMessage`).
   * Automatically falls back to standard `sendMessage` if Telegram rejects the method
   * or blocks (e.g., older Bot API version, unsupported block, or invalid emoji).
   */
  async sendRichMessage(
    params: SendRichMessageParams,
    fallbackMessageParams?: SendMessageParams
  ): Promise<TelegramApiResponse<TelegramApiMessage> & { usedFallback?: boolean }> {
    const prepared: SendRichMessageParams = {
      ...params,
      blocks: this.sanitizeRichBlocks(params.blocks),
    };
    this.auditPreparedPayload('sendRichMessage', prepared as unknown as Record<string, unknown>);
    const res = await this.callMethod<TelegramApiMessage>(
      'sendRichMessage',
      prepared as unknown as Record<string, unknown>
    );
    if (res.ok) {
      return { ...res, usedFallback: false };
    }
    if (fallbackMessageParams) {
      this.logger.warn('sendRichMessage rejected by Telegram API; falling back to standard sendMessage', {
        errorCode: res.error_code,
        description: res.description,
      });
      const fb = await this.sendMessage(fallbackMessageParams);
      return { ...fb, usedFallback: true };
    }
    return { ...res, usedFallback: false };
  }

  /**
   * Telegram Bot API 9.5+/10.4: Stream partial draft preview in private chats (`sendMessageDraft`).
   * Non-fatal: returns `{ ok: false }` cleanly if the client or API does not support drafts.
   */
  async sendMessageDraft(
    params: SendMessageDraftParams
  ): Promise<TelegramApiResponse<boolean>> {
    const clean = this.sanitizeOutgoingTextAndEntities({
      text: params.text,
      parse_mode: params.parse_mode,
      entities: params.entities,
    });
    const prepared: SendMessageDraftParams = {
      ...params,
      text: clean.text || '...',
      ...(clean.entities && clean.entities.length > 0 ? { entities: clean.entities } : {}),
    };
    if (!clean.entities || clean.entities.length === 0) {
      delete prepared.entities;
    }
    this.auditPreparedPayload('sendMessageDraft', prepared as unknown as Record<string, unknown>);
    return this.callMethod<boolean>(
      'sendMessageDraft',
      prepared as unknown as Record<string, unknown>
    );
  }

  /**
   * Validates Bot API 10.4 HTML Widget size constraints before sending:
   * - No NUL bytes (\0)
   * - Raw UTF-8 <= 32,768 bytes
   * - Zlib deflate level 9 <= 4,096 bytes
   */
  validateWidgetHtml(html: string): {
    ok: boolean;
    rawBytes: number;
    zlibBytes: number;
    error?: string;
  } {
    return validateWidgetHtml(html);
  }

  /**
   * Telegram Bot API 10.4: Send interactive HTML Widget (`sendWidget`).
   * Production constraint: strictly private chats only; automatically falls back to
   * standard `sendMessage` if validation fails, chat is non-private, or API rejects.
   */
  async sendWidget(
    params: SendWidgetParams,
    options?: {
      chatType?: 'private' | 'group' | 'supergroup' | 'channel';
      fallbackMessageParams?: SendMessageParams;
      fallbackText?: string;
    }
  ): Promise<
    TelegramApiResponse<TelegramApiMessage> & {
      usedFallback?: boolean;
      validation?: { rawBytes: number; zlibBytes: number };
    }
  > {
    const resolvedFallback: SendMessageParams | undefined =
      options?.fallbackMessageParams ||
      (options?.fallbackText
        ? { chat_id: params.chat_id, text: options.fallbackText }
        : undefined);

    if (options?.chatType && options.chatType !== 'private') {
      if (resolvedFallback) {
        const fb = await this.sendMessage(resolvedFallback);
        return { ...fb, usedFallback: true };
      }
      return {
        ok: false,
        error_code: 400,
        description: 'Telegram Bot API 10.4 sendWidget is supported only in private chats.',
        usedFallback: false,
      };
    }

    const validation = this.validateWidgetHtml(params.html);
    if (!validation.ok) {
      this.logger.warn('HTML widget failed size/safety validation; using standard fallback', {
        error: validation.error,
        rawBytes: validation.rawBytes,
        zlibBytes: validation.zlibBytes,
      });
      if (resolvedFallback) {
        const fb = await this.sendMessage(resolvedFallback);
        return { ...fb, usedFallback: true, validation };
      }
      return {
        ok: false,
        error_code: 400,
        description: validation.error,
        usedFallback: false,
        validation,
      };
    }

    const res = await this.callMethod<TelegramApiMessage>(
      'sendWidget',
      params as unknown as Record<string, unknown>
    );
    if (res.ok) {
      return { ...res, usedFallback: false, validation };
    }
    if (resolvedFallback) {
      this.logger.warn('sendWidget rejected by Telegram API; falling back to standard sendMessage', {
        errorCode: res.error_code,
        description: res.description,
      });
      const fb = await this.sendMessage(resolvedFallback);
      return { ...fb, usedFallback: true, validation };
    }
    return { ...res, usedFallback: false, validation };
  }

  async sendPhoto(
    params: SendMediaParams & { photo: string; caption_entities?: TelegramMessageEntity[] }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    this.auditPreparedPayload('sendPhoto', prepared as unknown as Record<string, unknown>);
    return this.callMethod<TelegramApiMessage>(
      'sendPhoto',
      prepared as unknown as Record<string, unknown>
    );
  }

  async sendVideo(
    params: SendMediaParams & { video: string; caption_entities?: TelegramMessageEntity[] }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    this.auditPreparedPayload('sendVideo', prepared as unknown as Record<string, unknown>);
    return this.callMethod<TelegramApiMessage>(
      'sendVideo',
      prepared as unknown as Record<string, unknown>
    );
  }

  async sendAudio(
    params: SendMediaParams & {
      audio: string;
      title?: string;
      performer?: string;
      duration?: number;
      caption_entities?: TelegramMessageEntity[];
    }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    if (!cap.caption_entities || cap.caption_entities.length === 0) {
      delete (prepared as Record<string, unknown>).caption_entities;
    }
    this.auditPreparedPayload('sendAudio', prepared as unknown as Record<string, unknown>);

    const res = await this.callMethod<TelegramApiMessage>(
      'sendAudio',
      prepared as unknown as Record<string, unknown>
    );
    if (
      !res.ok &&
      this.hasCustomEmojiInPayload({
        text: prepared.caption,
        parse_mode: prepared.parse_mode,
        entities: prepared.caption_entities,
        reply_markup: prepared.reply_markup,
      }) &&
      this.isCustomEmojiRejectionError(res)
    ) {
      this.emojiRegistry?.recordDeliveryFailure(`sendAudio HTTP 400: ${res.description || 'rejected'}`);
      const excised =
        prepared.caption
          ? prepared.parse_mode === 'HTML'
            ? { text: this.stripTgEmojiHtmlTags(prepared.caption), entities: [] as TelegramMessageEntity[] }
            : this.emojiRegistry
              ? this.emojiRegistry.exciseCustomEmojiEntities(prepared.caption, prepared.caption_entities)
              : { text: stripPlainUnicodeEmojis(prepared.caption), entities: [] as TelegramMessageEntity[] }
          : { text: undefined, entities: [] as TelegramMessageEntity[] };
      const fallback = {
        ...prepared,
        ...(excised.text !== undefined ? { caption: excised.text } : {}),
        reply_markup: this.stripCustomEmojiFieldsFromMarkup(prepared.reply_markup, true),
        ...(excised.entities.length > 0 ? { caption_entities: excised.entities } : {}),
      };
      if (excised.entities.length === 0) {
        delete (fallback as Record<string, unknown>).caption_entities;
      }
      this.auditPreparedPayload('sendAudio:fallback', fallback as unknown as Record<string, unknown>);
      return this.callMethod<TelegramApiMessage>(
        'sendAudio',
        fallback as unknown as Record<string, unknown>
      );
    }
    return res;
  }

  async sendVoice(
    params: SendMediaParams & { voice: string; caption_entities?: TelegramMessageEntity[] }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    this.auditPreparedPayload('sendVoice', prepared as unknown as Record<string, unknown>);
    return this.callMethod<TelegramApiMessage>(
      'sendVoice',
      prepared as unknown as Record<string, unknown>
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
    duration?: number;
    reply_markup?: TelegramReplyMarkup;
    asVoice?: boolean;
  }): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities({ caption: params.caption });
    const cleanMarkup = params.reply_markup ? this.sanitizeOutgoingMarkup(params.reply_markup) : undefined;
    const form = new FormData();
    form.append('chat_id', String(params.chat_id));
    if (cap.caption) form.append('caption', cap.caption.slice(0, 1020));
    if (cap.caption_entities && cap.caption_entities.length > 0) {
      form.append('caption_entities', JSON.stringify(cap.caption_entities));
    }
    if (params.title) form.append('title', stripPlainUnicodeEmojis(params.title));
    if (params.performer) form.append('performer', stripPlainUnicodeEmojis(params.performer));
    if (typeof params.duration === 'number' && params.duration > 0) {
      form.append('duration', String(Math.round(params.duration)));
    }
    if (cleanMarkup) {
      form.append('reply_markup', JSON.stringify(cleanMarkup));
    }
    const blob = new Blob([new Uint8Array(params.audioBuffer)], {
      type: params.mimeType || 'audio/mpeg',
    });
    const fieldName = params.asVoice ? 'voice' : 'audio';
    const method = params.asVoice ? 'sendVoice' : 'sendAudio';
    form.append(fieldName, blob, params.filename);
    return this.callMultipartMethod<TelegramApiMessage>(method, form);
  }

  async sendDocument(
    params: SendMediaParams & { document: string; caption_entities?: TelegramMessageEntity[] }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    this.auditPreparedPayload('sendDocument', prepared as unknown as Record<string, unknown>);
    return this.callMethod<TelegramApiMessage>(
      'sendDocument',
      prepared as unknown as Record<string, unknown>
    );
  }

  async sendDocumentBuffer(params: {
    chat_id: number | string;
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    caption?: string;
    parse_mode?: 'HTML' | 'MarkdownV2';
    reply_markup?: TelegramReplyMarkup;
  }): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities({
      caption: params.caption,
      parse_mode: params.parse_mode,
    });
    const cleanMarkup = params.reply_markup ? this.sanitizeOutgoingMarkup(params.reply_markup) : undefined;
    const form = new FormData();
    form.append('chat_id', String(params.chat_id));
    if (cap.caption) form.append('caption', cap.caption.slice(0, 1020));
    if (params.parse_mode) form.append('parse_mode', params.parse_mode);
    if (cap.caption_entities && cap.caption_entities.length > 0 && !params.parse_mode) {
      form.append('caption_entities', JSON.stringify(cap.caption_entities));
    }
    if (cleanMarkup) form.append('reply_markup', JSON.stringify(cleanMarkup));
    const blob = new Blob([new Uint8Array(params.buffer)], {
      type: params.mimeType || 'application/vnd.android.package-archive',
    });
    form.append('document', blob, params.filename);
    return this.callMultipartMethod<TelegramApiMessage>('sendDocument', form);
  }

  async sendAnimation(
    params: SendMediaParams & { animation: string; caption_entities?: TelegramMessageEntity[] }
  ): Promise<TelegramApiResponse<TelegramApiMessage>> {
    const cap = this.sanitizeOutgoingCaptionAndEntities(params);
    const prepared = {
      ...params,
      ...cap,
      ...(params.reply_markup ? { reply_markup: this.sanitizeOutgoingMarkup(params.reply_markup) } : {}),
    };
    this.auditPreparedPayload('sendAnimation', prepared as unknown as Record<string, unknown>);
    return this.callMethod<TelegramApiMessage>(
      'sendAnimation',
      prepared as unknown as Record<string, unknown>
    );
  }

  async sendMediaGroup(params: {
    chat_id: number | string;
    media: Array<{ type: 'photo' | 'video' | 'audio' | 'document'; media: string; caption?: string }>;
  }): Promise<TelegramApiResponse<TelegramApiMessage[]>> {
    const prepared = {
      ...params,
      media: params.media.map((m) => {
        if (!m.caption) return m;
        const cap = this.sanitizeOutgoingCaptionAndEntities({ caption: m.caption });
        return { ...m, ...cap };
      }),
    };
    return this.callMethod<TelegramApiMessage[]>(
      'sendMediaGroup',
      prepared as unknown as Record<string, unknown>
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
    // Telegram callback query toasts do NOT support custom_emoji entities -> strictly strip plain emojis & tokens!
    const prepared: AnswerCallbackQueryParams = {
      ...params,
      ...(params.text !== undefined
        ? {
            text: stripPlainUnicodeEmojis(
              params.text.replace(/\{\{emoji:[a-z0-9._-]+\}\}\s*/gi, '')
            ).slice(0, 200),
          }
        : {}),
    };
    this.auditPreparedPayload('answerCallbackQuery', prepared as unknown as Record<string, unknown>);
    return this.callMethod<boolean>(
      'answerCallbackQuery',
      prepared as unknown as Record<string, unknown>
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
      supportsKeyboardIconCustomEmoji: stickerFound,
      botUsername: me.result.username,
      reason: stickerFound
        ? 'Verified custom_emoji_id confirmed via getCustomEmojiStickers (Telegram Bot API 9.4+ MessageEntity & icon_custom_emoji_id supported for bots whose owner holds Telegram Premium; automatic Unicode fallback active on any delivery rejection).'
        : `Custom emoji verification failed: ${stickerRes.description || 'Sticker not found'}. Unicode fallback active.`,
      checkedAt,
    };
  }
}

export function validateWidgetHtml(html: string): {
  ok: boolean;
  valid: boolean;
  rawBytes: number;
  zlibBytes: number;
  error?: string;
} {
  if (html.includes('\0')) {
    return {
      ok: false,
      valid: false,
      rawBytes: Buffer.byteLength(html, 'utf-8'),
      zlibBytes: 0,
      error: 'HTML widget must not contain NUL bytes.',
    };
  }
  const rawBuf = Buffer.from(html, 'utf-8');
  const rawBytes = rawBuf.byteLength;
  if (rawBytes > TELEGRAM_WIDGET_MAX_RAW_BYTES) {
    return {
      ok: false,
      valid: false,
      rawBytes,
      zlibBytes: 0,
      error: `HTML widget exceeds max raw size (${rawBytes} > ${TELEGRAM_WIDGET_MAX_RAW_BYTES} bytes).`,
    };
  }
  const deflated = zlib.deflateSync(rawBuf, { level: 9 });
  const zlibBytes = deflated.byteLength;
  if (zlibBytes > TELEGRAM_WIDGET_MAX_ZLIB_BYTES) {
    return {
      ok: false,
      valid: false,
      rawBytes,
      zlibBytes,
      error: `HTML widget exceeds max zlib-9 size (${zlibBytes} > ${TELEGRAM_WIDGET_MAX_ZLIB_BYTES} bytes).`,
    };
  }
  return { ok: true, valid: true, rawBytes, zlibBytes };
}
