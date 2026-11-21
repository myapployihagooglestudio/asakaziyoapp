/**
 * ASAKA ZIYO — Central Telegram Style Manager (Bot API 9.4 – 10.4)
 *
 * Unifies:
 * 1. Bot API 9.4+ Button Styles (`primary`, `success`, `danger`) + `icon_custom_emoji_id`
 *    with semantic role mapping and Firestore-persisted overrides.
 * 2. Bot API 10.1–10.3 Rich Messages (`sendRichMessage`, `RichTextCustomEmoji`,
 *    `section_heading`, `paragraph`, `table`, `list`, `expandable_blockquote`,
 *    `buttons`, media blocks) with 100% safe older-client plain-text fallback.
 * 3. Bot API 10.4 HTML Widgets (`sendWidget`) strictly gated to private chats,
 *    zero external network, XSS-escaped, zlib-9 <= 4,096 bytes & raw <= 32,768 bytes,
 *    used ONLY where genuinely beneficial (Prayer Countdown Card, HIFZ 30-Juz Visual Card,
 *    Interactive Tasbeh Counter Card — never forced over ordinary bot menus).
 */

import {
  InputRichBlock,
  InputRichText,
  RichMessageButton,
  RichTextCustomEmoji,
  TelegramBotSettingsRecord,
  TelegramButtonStyle,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramReplyKeyboardMarkup,
} from '../types';
import { CustomEmojiRegistry, escapeTelegramHtml } from '../emoji/customEmojiRegistry';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { HifzStatsSummary, TelegramHifzProfile } from '../hifz/hifzTypes';

export interface StyleManagerConfig {
  buttonStylesEnabled: boolean;
  richMessagesEnabled: boolean;
  htmlWidgetsEnabled: boolean;
  aiStreamingDraftsEnabled: boolean;
  buttonStyleOverrides: Record<string, TelegramButtonStyle>;
  richMessageTemplates: Record<string, string>;
}

export const DEFAULT_RICH_MESSAGE_TEMPLATES: Record<string, string> = {
  prayer_header: 'ASAKA ZIYO — Asaka Tumani Namoz Vaqtlari',
  prayer_footer: 'Asaka tumani rasmiy jadvali • Asia/Tashkent',
  hifz_header: 'ASAKA ZIYO — HIFZ & MUROJAA MARKAZI',
  hifz_footer: 'Har kuni oz-ozdan, ammo bardavom murojaa qiling.',
  quran_mp3_header: 'ASAKA ZIYO — QURʼON MP3 KUTUBXONASI',
  quran_mp3_footer: '10 ta qori • 114 ta sura • Telegram native audio pleyer',
  admin_header: 'ASAKA ZIYO — SUPER ADMIN BOSHQARUV PANELI',
  admin_footer: 'Barcha oʻzgarishlar Firestore va audit logda saqlanadi.',
};

export type StyleTemplateKey = keyof typeof DEFAULT_RICH_MESSAGE_TEMPLATES;

const VALID_BUTTON_STYLES = new Set<TelegramButtonStyle>(['primary', 'success', 'danger', 'link']);

export class TelegramStyleManager {
  private readonly emojiRegistry: CustomEmojiRegistry;
  private config: StyleManagerConfig;

  constructor(
    emojiRegistry: CustomEmojiRegistry,
    initialSettings?: Partial<TelegramBotSettingsRecord>
  ) {
    this.emojiRegistry = emojiRegistry;
    this.config = this.extractConfig(initialSettings);
  }

  private extractConfig(settings?: Partial<TelegramBotSettingsRecord>): StyleManagerConfig {
    return {
      buttonStylesEnabled: settings?.buttonStylesEnabled ?? true,
      richMessagesEnabled: settings?.richMessagesEnabled ?? false,
      htmlWidgetsEnabled: settings?.htmlWidgetsEnabled ?? false,
      aiStreamingDraftsEnabled: settings?.aiStreamingDraftsEnabled ?? false,
      buttonStyleOverrides: { ...(settings?.buttonStyleOverrides || {}) },
      richMessageTemplates: {
        ...DEFAULT_RICH_MESSAGE_TEMPLATES,
        ...(settings?.richMessageTemplates || {}),
      },
    };
  }

  syncFromSettings(settings: Partial<TelegramBotSettingsRecord>): void {
    this.config = this.extractConfig(settings);
  }

  getConfig(): StyleManagerConfig {
    return {
      ...this.config,
      buttonStyleOverrides: { ...this.config.buttonStyleOverrides },
      richMessageTemplates: { ...this.config.richMessageTemplates },
    };
  }

  getTemplate(key: string): string {
    return this.config.richMessageTemplates[key] || DEFAULT_RICH_MESSAGE_TEMPLATES[key] || '';
  }

  setTemplate(key: string, value: string): void {
    this.config.richMessageTemplates[key] = value.trim().slice(0, 240);
  }

  setButtonStyleOverride(roleOrCallback: string, style: TelegramButtonStyle | null): void {
    if (!style || !VALID_BUTTON_STYLES.has(style)) {
      delete this.config.buttonStyleOverrides[roleOrCallback];
      return;
    }
    this.config.buttonStyleOverrides[roleOrCallback] = style;
  }

  /**
   * Resolves semantic Bot API 9.4 button style (`primary` | `success` | `danger`)
   * strictly based on role/callback meaning — never randomly or excessively.
   */
  resolveButtonStyle(
    callbackData?: string,
    explicitStyle?: TelegramButtonStyle
  ): TelegramButtonStyle | undefined {
    if (!this.config.buttonStylesEnabled) return undefined;
    if (explicitStyle && VALID_BUTTON_STYLES.has(explicitStyle)) return explicitStyle;
    if (!callbackData) return undefined;

    if (this.config.buttonStyleOverrides[callbackData]) {
      return this.config.buttonStyleOverrides[callbackData];
    }

    const cb = callbackData.toLowerCase();

    // Danger: destructive, cancel, delete, reset, opt-out
    if (
      cb.includes(':del') ||
      cb.includes('delete') ||
      cb.includes('cancel') ||
      cb.includes('remove') ||
      cb.includes('stop_all') ||
      cb.includes('reset') ||
      cb.includes('unmark') ||
      cb === 'ai:exit'
    ) {
      return 'danger';
    }

    // Success: confirm, save, verify, download APK, mark complete, play audio
    if (
      cb.includes('confirm') ||
      cb.includes('verify') ||
      cb.includes('markfull') ||
      cb.includes('rate:easy') ||
      cb.includes('rate:good') ||
      cb.includes('apk:download') ||
      cb.includes('qmp3:play:') ||
      cb.includes('qmp3:resume') ||
      cb.includes('admin:broadcast:start:') ||
      cb.includes('admin:content:publish:') ||
      cb.includes('reminder:add') ||
      cb.includes('admin:audio:add_reciter')
    ) {
      return 'success';
    }

    // Primary: main navigation hubs and flagship entry buttons
    if (
      cb === 'nav:home' ||
      cb === 'nav:prayer' ||
      cb === 'nav:quran' ||
      cb === 'qmp3:home' ||
      cb === 'qmp3:reciters:0' ||
      cb === 'hifz:home' ||
      cb === 'hifz:today' ||
      cb === 'nav:ai' ||
      cb === 'nav:android_app' ||
      cb === 'notif:center' ||
      cb === 'admin:home' ||
      cb === 'admin:style:home' ||
      cb.startsWith('admin:emoji:home') ||
      cb === 'admin:audio:home' ||
      cb.startsWith('widget:')
    ) {
      return 'primary';
    }

    return undefined;
  }

  /**
   * Non-destructively decorates an InlineKeyboardMarkup with Bot API 9.4 button styles.
   * Safe when `buttonStylesEnabled` is false (returns markup unmodified).
   */
  decorateInlineMarkup(markup: TelegramInlineKeyboardMarkup): TelegramInlineKeyboardMarkup {
    if (!this.config.buttonStylesEnabled) return markup;
    return {
      inline_keyboard: markup.inline_keyboard.map((row) =>
        row.map((btn: TelegramInlineKeyboardButton) => {
          const resolved = this.resolveButtonStyle(btn.callback_data, btn.style);
          if (!resolved || btn.style === resolved) return btn;
          return { ...btn, style: resolved };
        })
      ),
    };
  }

  /**
   * Non-destructively decorates a ReplyKeyboardMarkup (first primary row gets `primary` style).
   */
  decorateReplyMarkup(markup: TelegramReplyKeyboardMarkup): TelegramReplyKeyboardMarkup {
    if (!this.config.buttonStylesEnabled) return markup;
    return {
      ...markup,
      keyboard: markup.keyboard.map((row, rowIdx) =>
        row.map((btn) => {
          if (btn.style) return btn;
          if (rowIdx === 0) return { ...btn, style: 'primary' as TelegramButtonStyle };
          return btn;
        })
      ),
    };
  }

  // -------------------------------------------------------------------------
  // Bot API 10.1–10.3 Rich Text & Rich Message Builders
  // -------------------------------------------------------------------------

  /**
   * Builds a Bot API 10.1+ `RichTextCustomEmoji` when a verified custom emoji is active,
   * or empty plain text otherwise (STRICT ZERO-PLAIN-EMOJI POLICY).
   */
  richEmoji(key: string): InputRichText {
    const resolved = this.emojiRegistry.resolve(key);
    if (resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph) {
      const node: RichTextCustomEmoji = {
        type: 'custom_emoji',
        custom_emoji_id: resolved.customEmojiId,
        alternative_text: resolved.glyph,
      };
      return node;
    }
    return { type: 'plain', text: '' };
  }

  richWithIcon(key: string, text: string, bold = false): InputRichText {
    const resolved = this.emojiRegistry.resolve(key);
    if (resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph) {
      const label: InputRichText = bold
        ? { type: 'bold', text: { type: 'plain', text: ` ${text}` } }
        : { type: 'plain', text: ` ${text}` };
      return {
        type: 'concatenation',
        texts: [this.richEmoji(key), label],
      };
    }
    return bold
      ? { type: 'bold', text: { type: 'plain', text } }
      : { type: 'plain', text };
  }

  toRichButton(
    emojiKey: string,
    label: string,
    action: { callback_data?: string; url?: string; web_app?: { url: string } },
    explicitStyle?: TelegramButtonStyle
  ): RichMessageButton {
    const built = this.emojiRegistry.buildKeyboardButton(emojiKey, label, action);
    const style = this.resolveButtonStyle(action.callback_data, explicitStyle);
    return {
      ...built,
      ...(style ? { style } : {}),
    };
  }

  /**
   * Converts any `InputRichText` into clean Unicode plain text for guaranteed fallback
   * on older Telegram clients or when `sendRichMessage` is unavailable.
   */
  renderRichTextToPlain(node: InputRichText): string {
    if (typeof node === 'string') return node;
    switch (node.type) {
      case 'plain':
      case 'code':
        return node.text;
      case 'custom_emoji':
        // Strict zero-plain-emoji rule: never leak protocol anchor as visible plain emoji in fallback text
        return '';
      case 'bold':
      case 'italic':
      case 'link':
        return this.renderRichTextToPlain(node.text);
      case 'concatenation':
        return node.texts
          .map((t) => this.renderRichTextToPlain(t))
          .join('')
          .replace(/^[ \t]+/, '');
      default:
        return '';
    }
  }

  /**
   * Converts an array of Bot API 10.1–10.3 `InputRichBlock[]` into readable plain text
   * (with `CustomEmojiRegistry` entities if needed) for seamless automatic fallback.
   */
  renderRichBlocksToFallbackText(blocks: InputRichBlock[]): string {
    const lines: string[] = [];
    for (const block of blocks) {
      switch (block.type) {
        case 'section_heading':
          lines.push(this.renderRichTextToPlain(block.text));
          break;
        case 'paragraph':
          lines.push(this.renderRichTextToPlain(block.text));
          break;
        case 'divider':
          lines.push('────────────────');
          break;
        case 'list':
          block.items.forEach((item, idx) => {
            const prefix = block.is_ordered ? `${idx + 1}. ` : '• ';
            lines.push(`${prefix}${this.renderRichTextToPlain(item.text)}`);
          });
          break;
        case 'table':
          if (block.header && block.header.length > 0) {
            lines.push(block.header.map((c) => this.renderRichTextToPlain(c)).join(' | '));
          }
          for (const row of block.rows) {
            lines.push(row.map((c) => this.renderRichTextToPlain(c)).join(' — '));
          }
          break;
        case 'expandable_blockquote':
          if (block.title) {
            lines.push(`▸ ${this.renderRichTextToPlain(block.title)}`);
          }
          lines.push(this.renderRichBlocksToFallbackText(block.blocks));
          break;
        case 'photo':
        case 'audio':
        case 'video':
          if (block.caption) {
            lines.push(this.renderRichTextToPlain(block.caption));
          }
          break;
        case 'buttons':
          // Buttons are passed via fallback reply_markup
          break;
      }
    }
    return lines.filter((l) => l.trim().length > 0).join('\n');
  }

  /**
   * Bot API 10.1–10.3 Rich Message for Asaka Prayer Times (Heading + Compact Table + Expandable Note + Action Buttons).
   */
  buildPrayerRichMessage(
    prayerAdapter: TelegramPrayerAdapter,
    locale: TelegramLocale,
    includeWidgetBtn = false
  ): { blocks: InputRichBlock[]; fallbackText: string } {
    const sched = prayerAdapter.getCurrentSchedule();
    const headerText = this.getTemplate('prayer_header');
    const footerText = this.getTemplate('prayer_footer');
    const rows: InputRichText[][] = sched.times.map((t) => [
      { type: 'bold', text: { type: 'plain', text: t.nameUz } },
      { type: 'code', text: t.time },
    ]);

    const actionRow: RichMessageButton[] = [
      this.toRichButton('prayer', 'Yangilash', { callback_data: 'prayer:refresh' }, 'primary'),
      this.toRichButton('notifications', 'Bildirishnoma', { callback_data: 'notif:center' }),
    ];
    const extraRow: RichMessageButton[] = includeWidgetBtn
      ? [
          this.toRichButton('calendar', 'Interaktiv Karta (Widget)', { callback_data: 'widget:prayer' }, 'primary'),
          this.toRichButton('back', 'Bosh menyu', { callback_data: 'nav:home' }),
        ]
      : [this.toRichButton('back', 'Bosh menyu', { callback_data: 'nav:home' })];

    const blocks: InputRichBlock[] = [
      { type: 'section_heading', text: this.richWithIcon('prayer', headerText, true) },
      {
        type: 'paragraph',
        text: this.richWithIcon(
          'calendar',
          `${sched.formattedDateUz || sched.date} • ${sched.hijriDate || ''} (${locale})`
        ),
      },
      {
        type: 'table',
        header: [
          { type: 'bold', text: { type: 'plain', text: 'Namoz' } },
          { type: 'bold', text: { type: 'plain', text: 'Vaqt' } },
        ],
        rows,
        is_compact: true,
      },
      {
        type: 'expandable_blockquote',
        title: { type: 'bold', text: { type: 'plain', text: 'Manba va eslatma' } },
        blocks: [
          {
            type: 'paragraph',
            text: { type: 'plain', text: footerText },
          },
        ],
      },
      {
        type: 'buttons',
        buttons: [actionRow, extraRow],
      },
    ];

    return {
      blocks,
      fallbackText: this.renderRichBlocksToFallbackText(blocks),
    };
  }

  /**
   * Bot API 10.1–10.3 Rich Message for HIFZ Progress Dashboard.
   */
  buildHifzRichMessage(
    profile: TelegramHifzProfile,
    stats: HifzStatsSummary,
    includeWidgetBtn = false
  ): { blocks: InputRichBlock[]; fallbackText: string } {
    const headerText = this.getTemplate('hifz_header');
    const footerText = this.getTemplate('hifz_footer');

    const blocks: InputRichBlock[] = [
      { type: 'section_heading', text: this.richWithIcon('hifz', headerText, true) },
      {
        type: 'table',
        header: [
          { type: 'bold', text: { type: 'plain', text: 'Koʻrsatkich' } },
          { type: 'bold', text: { type: 'plain', text: 'Qiymat' } },
        ],
        rows: [
          [{ type: 'plain', text: 'Yodlangan oyatlar' }, { type: 'code', text: `${stats.memorizedAyahsCount} / 6236 (${stats.memorizedPercent}%)` }],
          [{ type: 'plain', text: 'Toʻliq suralar' }, { type: 'code', text: `${stats.completedSurahsCount} / 114` }],
          [{ type: 'plain', text: 'Barqarorlik (Streak)' }, { type: 'code', text: `${stats.streakDays} kun` }],
          [{ type: 'plain', text: 'Kunlik maqsad' }, { type: 'code', text: `${profile.dailyNewAyahsGoal} oyat / ${profile.dailyReviewMinutesGoal} daq` }],
        ],
        is_compact: true,
      },
      {
        type: 'expandable_blockquote',
        title: { type: 'bold', text: { type: 'plain', text: 'Murojaa tavsiyasi' } },
        blocks: [{ type: 'paragraph', text: { type: 'plain', text: footerText } }],
      },
      {
        type: 'buttons',
        buttons: [
          [
            this.toRichButton('hifz', 'Bugungi reja', { callback_data: 'hifz:today' }, 'primary'),
            this.toRichButton('quran', 'Yodlangan suralar', { callback_data: 'hifz:memorized:0' }),
          ],
          ...(includeWidgetBtn
            ? [[this.toRichButton('statistics', '30-Juz Visual Karta (Widget)', { callback_data: 'widget:hifz' }, 'primary')]]
            : []),
        ],
      },
    ];

    return {
      blocks,
      fallbackText: this.renderRichBlocksToFallbackText(blocks),
    };
  }

  /**
   * Bot API 10.1–10.3 Rich Message for Admin Style & Diagnostics Test.
   */
  buildStylePreviewRichMessage(stats: {
    verifiedEmojis: number;
    totalEmojis: number;
    recitersCount: number;
    usersCount: number;
  }): { blocks: InputRichBlock[]; fallbackText: string } {
    const blocks: InputRichBlock[] = [
      { type: 'section_heading', text: this.richWithIcon('admin', this.getTemplate('admin_header'), true) },
      {
        type: 'list',
        items: [
          { text: this.richWithIcon('brand', `Tasdiqlangan Premium Emojilar: ${stats.verifiedEmojis}/${stats.totalEmojis}`) },
          { text: this.richWithIcon('quran_mp3', `Qurʼon MP3 qorilar: ${stats.recitersCount} ta`) },
          { text: this.richWithIcon('profile', `Bot foydalanuvchilari: ${stats.usersCount} ta`) },
        ],
      },
      {
        type: 'table',
        header: [
          { type: 'bold', text: { type: 'plain', text: 'Bot API Imkoniyat' } },
          { type: 'bold', text: { type: 'plain', text: 'Holat' } },
        ],
        rows: [
          [{ type: 'plain', text: 'Button Styles (9.4+)' }, { type: 'code', text: this.config.buttonStylesEnabled ? 'ON' : 'OFF' }],
          [{ type: 'plain', text: 'Rich Messages (10.1+)' }, { type: 'code', text: this.config.richMessagesEnabled ? 'ON' : 'OFF' }],
          [{ type: 'plain', text: 'HTML Widgets (10.4, private)' }, { type: 'code', text: this.config.htmlWidgetsEnabled ? 'ON' : 'OFF' }],
          [{ type: 'plain', text: 'AI Draft Streaming' }, { type: 'code', text: this.config.aiStreamingDraftsEnabled ? 'ON' : 'OFF' }],
        ],
        is_compact: true,
      },
      {
        type: 'expandable_blockquote',
        title: { type: 'bold', text: { type: 'plain', text: 'Muvofiqlik kafolati' } },
        blocks: [
          {
            type: 'paragraph',
            text: {
              type: 'plain',
              text: 'Eski Telegram mijozlarida Rich Message va Premium Emoji avtomatik ravishda oddiy xabar va Unicode fallbackga oʻtadi.',
            },
          },
        ],
      },
      {
        type: 'buttons',
        buttons: [
          [
            this.toRichButton('success', 'Tasdiq (Success)', { callback_data: 'admin:style:home' }, 'success'),
            this.toRichButton('admin', 'Asosiy (Primary)', { callback_data: 'admin:home' }, 'primary'),
            this.toRichButton('error', 'Xavf (Danger)', { callback_data: 'admin:style:home' }, 'danger'),
          ],
        ],
      },
    ];

    return {
      blocks,
      fallbackText: this.renderRichBlocksToFallbackText(blocks),
    };
  }

  // -------------------------------------------------------------------------
  // Bot API 10.4 Interactive Private-Chat HTML Widgets (Zero Network, <= 4KB zlib)
  // -------------------------------------------------------------------------

  /**
   * Interactive Prayer Schedule Card (Bot API 10.4 HTML Widget).
   * Strictly self-contained (zero network calls, zero external fonts/scripts), XSS-escaped.
   */
  buildPrayerCountdownWidgetHtml(prayerAdapter: TelegramPrayerAdapter): {
    html: string;
    fallbackText: string;
  } {
    const sched = prayerAdapter.getCurrentSchedule();
    const safeDate = escapeTelegramHtml(sched.formattedDateUz || sched.date);
    const safeHijri = escapeTelegramHtml(sched.hijriDate || '');
    const rowsHtml = sched.times
      .map(
        (t) =>
          `<div class="r"><span>${escapeTelegramHtml(t.nameUz)}</span><b>${escapeTelegramHtml(t.time)}</b></div>`
      )
      .join('');

    const html =
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0f1f1a;color:#f3f7f4;padding:12px}` +
      `.c{background:linear-gradient(145deg,#133229,#0b1d17);border:1px solid #2b6b53;border-radius:14px;padding:14px}` +
      `.h{font-size:15px;font-weight:700;color:#e6c77a;margin-bottom:4px}.s{font-size:12px;opacity:.8;margin-bottom:10px}` +
      `.r{display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}` +
      `.r:last-child{border-bottom:0}.r b{color:#7ee2b8;font-variant-numeric:tabular-nums}` +
      `.f{margin-top:8px;font-size:11px;opacity:.65;text-align:center}</style></head><body>` +
      `<div class="c"><div class="h">ASAKA ZIYO • Namoz Vaqtlari</div>` +
      `<div class="s">${safeDate} • ${safeHijri}</div>${rowsHtml}` +
      `<div class="f">Asaka tumani • Asia/Tashkent</div></div></body></html>`;

    const fallbackText =
      `{{emoji:prayer}} ASAKA ZIYO — Asaka Namoz Vaqtlari\n` +
      `{{emoji:calendar}} ${sched.formattedDateUz || sched.date} • ${sched.hijriDate || ''}\n\n` +
      sched.times.map((t) => `• ${t.nameUz}: ${t.time}`).join('\n');

    return { html, fallbackText };
  }

  /**
   * Interactive HIFZ 30-Juz Visual Progress Card (Bot API 10.4 HTML Widget).
   */
  buildHifzProgressWidgetHtml(
    profile: TelegramHifzProfile,
    stats: HifzStatsSummary
  ): { html: string; fallbackText: string } {
    const pct = Math.max(0, Math.min(100, Number(stats.memorizedPercent) || 0));
    const memorizedCount = Number(stats.memorizedAyahsCount) || 0;
    const completedSurahs = Number(stats.completedSurahsCount) || 0;
    const streak = Number(stats.streakDays) || 0;

    const juzCells = Array.from({ length: 30 }, (_, idx) => {
      const j = idx + 1;
      const done = j <= Math.round((pct / 100) * 30);
      return `<div class="j${done ? ' d' : ''}">${j}</div>`;
    }).join('');

    const html =
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#101923;color:#f1f5f9;padding:12px}` +
      `.c{background:#162331;border:1px solid #2c4a63;border-radius:14px;padding:14px}` +
      `.h{font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:6px}` +
      `.bar{height:10px;background:#24374a;border-radius:6px;overflow:hidden;margin:8px 0}` +
      `.fill{height:100%;width:${pct}%;background:#34d399}` +
      `.m{display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px;opacity:.9}` +
      `.g{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}` +
      `.j{text-align:center;font-size:11px;padding:4px 0;border-radius:6px;background:#223447;color:#94a3b8}` +
      `.j.d{background:#059669;color:#fff;font-weight:700}</style></head><body>` +
      `<div class="c"><div class="h">ASAKA ZIYO • HIFZ 30-Juz Xaritasi</div>` +
      `<div class="bar"><div class="fill"></div></div>` +
      `<div class="m"><span>${memorizedCount}/6236 oyat (${pct}%)</span><span>${completedSurahs}/114 sura • ${streak} kun</span></div>` +
      `<div class="g">${juzCells}</div></div></body></html>`;

    const fallbackText =
      `{{emoji:hifz}} ASAKA ZIYO — HIFZ Progress\n` +
      `• Yodlangan oyatlar: ${memorizedCount}/6236 (${pct}%)\n` +
      `• Toʻliq suralar: ${completedSurahs}/114\n` +
      `• Barqarorlik: ${streak} kun\n` +
      `• Kunlik maqsad: ${profile.dailyNewAyahsGoal} oyat`;

    return { html, fallbackText };
  }

  /**
   * Interactive Local Tasbeh Counter Card (Bot API 10.4 HTML Widget — offline JS counter, zero network).
   */
  buildTasbehWidgetHtml(
    dhikrTitle: string,
    arabicText: string,
    initialCount: number,
    goal = 33
  ): { html: string; fallbackText: string } {
    const safeTitle = escapeTelegramHtml(dhikrTitle.slice(0, 80));
    const safeArabic = escapeTelegramHtml(arabicText.slice(0, 120));
    const startVal = Math.max(0, Math.floor(initialCount));
    const targetVal = Math.max(1, Math.floor(goal));

    const html =
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0e1b18;color:#ecfdf5;padding:12px;text-align:center}` +
      `.c{background:#122a24;border:1px solid #2b6a58;border-radius:16px;padding:14px}` +
      `.ar{font-size:20px;color:#fcd34d;margin:4px 0}.t{font-size:13px;opacity:.85;margin-bottom:10px}` +
      `.n{font-size:40px;font-weight:800;color:#6ee7b7;margin:6px 0}` +
      `button{border:0;border-radius:12px;padding:10px 22px;font-size:15px;font-weight:700;cursor:pointer;margin:4px}` +
      `.p{background:#10b981;color:#052e16}.r{background:#334155;color:#e2e8f0;font-size:12px;padding:8px 14px}</style></head><body>` +
      `<div class="c"><div class="ar">${safeArabic}</div><div class="t">${safeTitle} (${targetVal})</div>` +
      `<div class="n" id="n">${startVal}</div>` +
      `<button class="p" onclick="var e=document.getElementById('n');e.textContent=Number(e.textContent)+1">+1 Zikr</button>` +
      `<button class="r" onclick="document.getElementById('n').textContent='0'">0</button></div></body></html>`;

    const fallbackText = `{{emoji:dhikr}} ${dhikrTitle}\n${arabicText}\n• Sanoq: ${startVal} / ${targetVal}`;
    return { html, fallbackText };
  }

  /**
   * Sends a live Rich Message test (with automatic fallback if rejected by Telegram).
   */
  async sendRichMessageTest(
    apiClient: TelegramApiClient,
    chatId: number | string,
    stats: { verifiedEmojis: number; totalEmojis: number; recitersCount: number; usersCount: number }
  ) {
    const built = this.buildStylePreviewRichMessage(stats);
    return apiClient.sendRichMessage(
      { chat_id: chatId, blocks: built.blocks },
      {
        chat_id: chatId,
        text: built.fallbackText,
        reply_markup: this.decorateInlineMarkup({
          inline_keyboard: [
            [
              this.emojiRegistry.buildKeyboardButton('admin', 'Style Panel', {
                callback_data: 'admin:style:home',
              }),
            ],
          ],
        }),
      }
    );
  }

  /**
   * Sends a live HTML Widget test (strictly private chat only, with automatic fallback).
   */
  async sendWidgetTest(
    apiClient: TelegramApiClient,
    chatId: number | string,
    chatType: 'private' | 'group' | 'supergroup' | 'channel',
    prayerAdapter: TelegramPrayerAdapter
  ) {
    const widget = this.buildPrayerCountdownWidgetHtml(prayerAdapter);
    return apiClient.sendWidget(
      { chat_id: chatId, html: widget.html },
      {
        chatType,
        fallbackMessageParams: {
          chat_id: chatId,
          text: `${widget.fallbackText}\n\n{{emoji:support}} (Widget faqat shaxsiy chatlarda / Bot API 10.4 mijozlarida ishlaydi — oddiy koʻrinish koʻrsatildi.)`,
        },
      }
    );
  }
}
