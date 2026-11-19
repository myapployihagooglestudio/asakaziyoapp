/**
 * ASAKA ZIYO — Unified Telegram Premium Custom Emoji Registry & UTF-16 Entity Formatter
 *
 * STRICT HONESTY, ANTI-MIXING & SAFETY RULES:
 * 1. NEVER invents or hardcodes fake custom_emoji_id strings.
 * 2. Every semantic slot ships with a dignified, domain-matched Unicode fallback.
 * 3. Real `custom_emoji_id` values can be imported directly from official Telegram custom
 *    emoji sticker sets via `getStickerSet` and MUST pass live `getCustomEmojiStickers`
 *    verification before `verified` becomes `true`.
 * 4. Computes exact UTF-16 code unit offsets and lengths required by Telegram Bot API
 *    `MessageEntity` (`type: "custom_emoji"`), with built-in entity boundary validation.
 * 5. Anti-Mixing: a token renders EITHER as a verified Premium custom_emoji entity over its
 *    placeholder glyph OR cleanly as its Unicode fallback — never duplicated or mixed.
 * 6. Inline Keyboard Honesty: Telegram Bot API inline buttons do not support custom_emoji
 *    MessageEntity in button text; `icon_custom_emoji_id` is ONLY attached when explicitly
 *    enabled AND verified, defaulting honestly to clean Unicode fallback icons.
 */

import {
  CustomEmojiCategory,
  CustomEmojiEntry,
  TelegramInlineKeyboardButton,
  TelegramMessageEntity,
} from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';

export type SemanticEmojiKey =
  | 'brand.mosque'
  | 'brand.crescent'
  | 'brand.book'
  | 'brand.star'
  | 'nav.home'
  | 'nav.prayer'
  | 'nav.quran'
  | 'nav.hadith'
  | 'nav.dhikr'
  | 'nav.ai'
  | 'nav.profile'
  | 'nav.admin'
  | 'nav.language'
  | 'nav.settings'
  | 'nav.help'
  | 'nav.channels'
  | 'nav.web'
  | 'nav.miniapp'
  | 'nav.back'
  | 'nav.next'
  | 'nav.prev'
  | 'prayer.fajr'
  | 'prayer.sunrise'
  | 'prayer.dhuhr'
  | 'prayer.asr'
  | 'prayer.maghrib'
  | 'prayer.isha'
  | 'prayer.juma'
  | 'content.tasbeh'
  | 'content.dua'
  | 'ai.spark'
  | 'profile.user'
  | 'admin.shield'
  | 'language.globe'
  | 'language.selected'
  | 'settings.bell_on'
  | 'settings.bell_off'
  | 'settings.gear'
  | 'status.ok'
  | 'status.warn'
  | 'status.lock'
  | 'channel.broadcast'
  | 'calendar.date';

export const CUSTOM_EMOJI_ID_REGEX = /^\d{15,22}$/;

const DEFAULT_EMOJI_SEEDS: Array<
  Omit<CustomEmojiEntry, 'customEmojiId' | 'verified' | 'updatedAt'>
> = [
  // Brand
  { key: 'brand.mosque', category: 'brand', unicodeFallback: '🕌', supportsKeyboardIcon: true, description: 'ASAKA ZIYO official mosque emblem' },
  { key: 'brand.crescent', category: 'brand', unicodeFallback: '🌙', supportsKeyboardIcon: true, description: 'Islamic crescent accent' },
  { key: 'brand.book', category: 'brand', unicodeFallback: '📖', supportsKeyboardIcon: true, description: 'Quran & Islamic knowledge symbol' },
  { key: 'brand.star', category: 'brand', unicodeFallback: '✨', supportsKeyboardIcon: true, description: 'Highlight & premium accent' },

  // Navigation
  { key: 'nav.home', category: 'navigation', unicodeFallback: '🏛️', supportsKeyboardIcon: true, description: 'Main menu home icon' },
  { key: 'nav.prayer', category: 'navigation', unicodeFallback: '🕰️', supportsKeyboardIcon: true, description: 'Prayer times navigation icon' },
  { key: 'nav.quran', category: 'navigation', unicodeFallback: '📗', supportsKeyboardIcon: true, description: 'Quran section icon' },
  { key: 'nav.hadith', category: 'navigation', unicodeFallback: '📜', supportsKeyboardIcon: true, description: 'Hadith collection icon' },
  { key: 'nav.dhikr', category: 'navigation', unicodeFallback: '📿', supportsKeyboardIcon: true, description: 'Dhikr & Dua section icon' },
  { key: 'nav.ai', category: 'navigation', unicodeFallback: '💠', supportsKeyboardIcon: true, description: 'AI Islamic assistant icon' },
  { key: 'nav.profile', category: 'navigation', unicodeFallback: '👤', supportsKeyboardIcon: true, description: 'User profile icon' },
  { key: 'nav.admin', category: 'navigation', unicodeFallback: '🛡️', supportsKeyboardIcon: true, description: 'Admin control panel icon' },
  { key: 'nav.language', category: 'navigation', unicodeFallback: '🌐', supportsKeyboardIcon: true, description: 'Language selection icon' },
  { key: 'nav.settings', category: 'navigation', unicodeFallback: '⚙️', supportsKeyboardIcon: true, description: 'User settings icon' },
  { key: 'nav.help', category: 'navigation', unicodeFallback: 'ℹ️', supportsKeyboardIcon: true, description: 'Help & guide icon' },
  { key: 'nav.channels', category: 'navigation', unicodeFallback: '📢', supportsKeyboardIcon: true, description: 'Official Telegram channels icon' },
  { key: 'nav.web', category: 'navigation', unicodeFallback: '🔗', supportsKeyboardIcon: true, description: 'Web App link icon' },
  { key: 'nav.miniapp', category: 'navigation', unicodeFallback: '📱', supportsKeyboardIcon: true, description: 'Telegram Mini App icon' },
  { key: 'nav.back', category: 'navigation', unicodeFallback: '↩️', supportsKeyboardIcon: true, description: 'Return to previous menu icon' },
  { key: 'nav.next', category: 'navigation', unicodeFallback: '➡️', supportsKeyboardIcon: false, description: 'Next page button icon' },
  { key: 'nav.prev', category: 'navigation', unicodeFallback: '⬅️', supportsKeyboardIcon: false, description: 'Previous page button icon' },

  // Prayer Times
  { key: 'prayer.fajr', category: 'prayer', unicodeFallback: '🌅', supportsKeyboardIcon: false, description: 'Bomdod / Fajr time indicator' },
  { key: 'prayer.sunrise', category: 'prayer', unicodeFallback: '☀️', supportsKeyboardIcon: false, description: 'Sunrise time indicator' },
  { key: 'prayer.dhuhr', category: 'prayer', unicodeFallback: '🌤️', supportsKeyboardIcon: false, description: 'Peshin / Dhuhr time indicator' },
  { key: 'prayer.asr', category: 'prayer', unicodeFallback: '🌇', supportsKeyboardIcon: false, description: 'Asr time indicator' },
  { key: 'prayer.maghrib', category: 'prayer', unicodeFallback: '🌆', supportsKeyboardIcon: false, description: 'Shom / Maghrib time indicator' },
  { key: 'prayer.isha', category: 'prayer', unicodeFallback: '🌌', supportsKeyboardIcon: false, description: 'Xufton / Isha time indicator' },
  { key: 'prayer.juma', category: 'prayer', unicodeFallback: '🕌', supportsKeyboardIcon: false, description: 'Juma prayer highlight' },

  // Content, AI, Profile, Admin
  { key: 'content.tasbeh', category: 'content', unicodeFallback: '📿', supportsKeyboardIcon: false, description: 'Interactive Tasbeh counter' },
  { key: 'content.dua', category: 'content', unicodeFallback: '🤲', supportsKeyboardIcon: false, description: 'Dua & supplication header' },
  { key: 'ai.spark', category: 'ai', unicodeFallback: '💡', supportsKeyboardIcon: false, description: 'AI answer accent' },
  { key: 'profile.user', category: 'profile', unicodeFallback: '🪪', supportsKeyboardIcon: false, description: 'User profile card header' },
  { key: 'admin.shield', category: 'admin', unicodeFallback: '🛡️', supportsKeyboardIcon: false, description: 'Admin security header' },

  // Language, Settings, Status, Channel, Calendar
  { key: 'language.globe', category: 'language', unicodeFallback: '🌐', supportsKeyboardIcon: true, description: 'Five-language selector icon' },
  { key: 'language.selected', category: 'language', unicodeFallback: '✅', supportsKeyboardIcon: true, description: 'Active language checkmark' },
  { key: 'settings.bell_on', category: 'settings', unicodeFallback: '🔔', supportsKeyboardIcon: true, description: 'Notifications enabled' },
  { key: 'settings.bell_off', category: 'settings', unicodeFallback: '🔕', supportsKeyboardIcon: true, description: 'Notifications muted' },
  { key: 'settings.gear', category: 'settings', unicodeFallback: '⚙️', supportsKeyboardIcon: true, description: 'Preferences header icon' },
  { key: 'status.ok', category: 'status', unicodeFallback: '✅', supportsKeyboardIcon: false, description: 'Success status' },
  { key: 'status.warn', category: 'status', unicodeFallback: '⚠️', supportsKeyboardIcon: false, description: 'Warning / rate-limit notice' },
  { key: 'status.lock', category: 'status', unicodeFallback: '🔐', supportsKeyboardIcon: false, description: 'Security / admin access' },
  { key: 'channel.broadcast', category: 'channel', unicodeFallback: '📣', supportsKeyboardIcon: true, description: 'Channel publication indicator' },
  { key: 'calendar.date', category: 'calendar', unicodeFallback: '📅', supportsKeyboardIcon: false, description: 'Gregorian & Hijri date indicator' },
];

export interface FormattedEmojiMessage {
  text: string;
  entities: TelegramMessageEntity[];
  usedCustomEmojiCount: number;
  usedFallbackCount: number;
}

export interface EmojiCompatibilityReport {
  totalRegisteredKeys: number;
  verifiedCustomCount: number;
  fallbackOnlyCount: number;
  premiumRenderingActive: boolean;
  keyboardCustomIconsActive: boolean;
  invalidEntries: string[];
}

export interface StickerSetImportResult {
  ok: boolean;
  stickerSetName: string;
  totalStickersInSet: number;
  matchedKeys: Array<{ key: string; customEmojiId: string; verified: boolean }>;
  rejectedKeys: string[];
  error?: string;
}

export class CustomEmojiRegistry {
  private readonly entries = new Map<string, CustomEmojiEntry>();
  private premiumEnabled = false;
  private keyboardIconsEnabled = false;

  constructor(
    initialEntries?: CustomEmojiEntry[],
    premiumEnabled = false,
    keyboardIconsEnabled = false
  ) {
    const nowIso = new Date().toISOString();
    for (const seed of DEFAULT_EMOJI_SEEDS) {
      this.entries.set(seed.key, {
        ...seed,
        customEmojiId: null,
        verified: false,
        updatedAt: nowIso,
      });
    }
    if (Array.isArray(initialEntries)) {
      for (const item of initialEntries) {
        if (item?.key && this.entries.has(item.key)) {
          const base = this.entries.get(item.key)!;
          const validId =
            typeof item.customEmojiId === 'string' && CUSTOM_EMOJI_ID_REGEX.test(item.customEmojiId)
              ? item.customEmojiId
              : null;
          this.entries.set(item.key, {
            ...base,
            ...item,
            customEmojiId: validId,
            verified: Boolean(validId && item.verified),
          });
        }
      }
    }
    this.premiumEnabled = premiumEnabled;
    this.keyboardIconsEnabled = keyboardIconsEnabled;
  }

  setPremiumEnabled(enabled: boolean): void {
    this.premiumEnabled = Boolean(enabled);
  }

  setKeyboardIconsEnabled(enabled: boolean): void {
    this.keyboardIconsEnabled = Boolean(enabled);
  }

  isPremiumEnabled(): boolean {
    return this.premiumEnabled;
  }

  isKeyboardIconsEnabled(): boolean {
    return this.keyboardIconsEnabled;
  }

  getEntry(key: SemanticEmojiKey | string): CustomEmojiEntry | undefined {
    return this.entries.get(key);
  }

  listAll(): CustomEmojiEntry[] {
    return Array.from(this.entries.values());
  }

  listByCategory(category: CustomEmojiCategory): CustomEmojiEntry[] {
    return this.listAll().filter((e) => e.category === category);
  }

  /**
   * Registers a real owner-provided custom_emoji_id for a semantic key.
   * Remains verified=false until confirmed live via Telegram Bot API `getCustomEmojiStickers`.
   */
  registerCustomEmojiId(
    key: SemanticEmojiKey | string,
    customEmojiId: string | null,
    options?: { verified?: boolean; stickerSetName?: string }
  ): CustomEmojiEntry {
    const existing = this.entries.get(key);
    if (!existing) {
      throw new Error(`Unknown semantic emoji key: ${key}`);
    }
    if (customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(customEmojiId)) {
      throw new Error(
        `Invalid Telegram custom_emoji_id format for "${key}". Expected 15–22 numeric digits.`
      );
    }

    const nowIso = new Date().toISOString();
    const updated: CustomEmojiEntry = {
      ...existing,
      customEmojiId,
      verified: Boolean(customEmojiId && options?.verified),
      verifiedAt: customEmojiId && options?.verified ? nowIso : undefined,
      stickerSetName: options?.stickerSetName ?? existing.stickerSetName,
      updatedAt: nowIso,
    };
    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Imports real custom_emoji_id values from a Telegram custom emoji sticker set
   * via `getStickerSet` and live-verifies every candidate via `getCustomEmojiStickers`.
   */
  async importFromTelegramStickerSet(
    apiClient: TelegramApiClient,
    stickerSetName: string,
    explicitMapping?: Record<string, string>
  ): Promise<StickerSetImportResult> {
    const cleanName = stickerSetName.trim();
    if (!cleanName) {
      return {
        ok: false,
        stickerSetName: cleanName,
        totalStickersInSet: 0,
        matchedKeys: [],
        rejectedKeys: [],
        error: 'Sticker set name is required.',
      };
    }

    if (!apiClient.isConfigured) {
      return {
        ok: false,
        stickerSetName: cleanName,
        totalStickersInSet: 0,
        matchedKeys: [],
        rejectedKeys: [],
        error: 'TELEGRAM_BOT_TOKEN1 is not configured; cannot fetch Telegram sticker set.',
      };
    }

    const setRes = await apiClient.getStickerSet(cleanName);
    if (!setRes.ok || !setRes.result) {
      return {
        ok: false,
        stickerSetName: cleanName,
        totalStickersInSet: 0,
        matchedKeys: [],
        rejectedKeys: [],
        error: setRes.description || 'Unable to fetch sticker set from Telegram Bot API.',
      };
    }

    if (setRes.result.sticker_type !== 'custom_emoji') {
      return {
        ok: false,
        stickerSetName: cleanName,
        totalStickersInSet: setRes.result.stickers.length,
        matchedKeys: [],
        rejectedKeys: [],
        error: `Sticker set "${cleanName}" is of type "${setRes.result.sticker_type}", not "custom_emoji".`,
      };
    }

    const customStickers = setRes.result.stickers.filter(
      (s) => s.custom_emoji_id && CUSTOM_EMOJI_ID_REGEX.test(s.custom_emoji_id)
    );

    const normalizeGlyph = (g: string) => g.replace(/\uFE0F/g, '').trim();
    const matchedCandidates: Array<{ key: string; customEmojiId: string }> = [];

    if (explicitMapping) {
      for (const [key, customId] of Object.entries(explicitMapping)) {
        if (this.entries.has(key) && CUSTOM_EMOJI_ID_REGEX.test(customId)) {
          this.registerCustomEmojiId(key, customId, {
            verified: false,
            stickerSetName: cleanName,
          });
          matchedCandidates.push({ key, customEmojiId: customId });
        }
      }
    } else {
      for (const entry of this.listAll()) {
        const targetGlyph = normalizeGlyph(entry.unicodeFallback);
        const match = customStickers.find(
          (s) => s.emoji && normalizeGlyph(s.emoji) === targetGlyph
        );
        if (match?.custom_emoji_id) {
          this.registerCustomEmojiId(entry.key, match.custom_emoji_id, {
            verified: false,
            stickerSetName: cleanName,
          });
          matchedCandidates.push({ key: entry.key, customEmojiId: match.custom_emoji_id });
        }
      }
    }

    const verification = await this.verifyAllWithTelegramApi(apiClient);
    const verifiedSet = new Set(verification.verifiedKeys);

    return {
      ok: true,
      stickerSetName: cleanName,
      totalStickersInSet: setRes.result.stickers.length,
      matchedKeys: matchedCandidates.map((m) => ({
        ...m,
        verified: verifiedSet.has(m.key),
      })),
      rejectedKeys: verification.rejectedKeys,
    };
  }

  /**
   * Verifies all registered custom_emoji_id entries live via Telegram Bot API `getCustomEmojiStickers`.
   * Any unverified or rejected ID stays safely on Unicode fallback.
   */
  async verifyAllWithTelegramApi(apiClient: TelegramApiClient): Promise<{
    verifiedKeys: string[];
    rejectedKeys: string[];
    apiAvailable: boolean;
  }> {
    const candidates = this.listAll().filter(
      (e) => e.customEmojiId && CUSTOM_EMOJI_ID_REGEX.test(e.customEmojiId)
    );
    if (candidates.length === 0) {
      return { verifiedKeys: [], rejectedKeys: [], apiAvailable: apiClient.isConfigured };
    }
    if (!apiClient.isConfigured) {
      return { verifiedKeys: [], rejectedKeys: [], apiAvailable: false };
    }

    const ids = candidates.map((c) => c.customEmojiId!);
    const res = await apiClient.getCustomEmojiStickers(ids);
    if (!res.ok || !Array.isArray(res.result)) {
      return {
        verifiedKeys: [],
        rejectedKeys: candidates.map((c) => c.key),
        apiAvailable: false,
      };
    }

    const validSet = new Set(
      res.result.map((s) => s.custom_emoji_id).filter((id): id is string => Boolean(id))
    );
    const verifiedKeys: string[] = [];
    const rejectedKeys: string[] = [];
    const nowIso = new Date().toISOString();

    for (const entry of candidates) {
      if (entry.customEmojiId && validSet.has(entry.customEmojiId)) {
        this.entries.set(entry.key, {
          ...entry,
          verified: true,
          verifiedAt: nowIso,
          updatedAt: nowIso,
        });
        verifiedKeys.push(entry.key);
      } else {
        this.entries.set(entry.key, {
          ...entry,
          verified: false,
          verifiedAt: undefined,
          updatedAt: nowIso,
        });
        rejectedKeys.push(entry.key);
      }
    }

    return { verifiedKeys, rejectedKeys, apiAvailable: true };
  }

  /**
   * Resolves a single semantic key to its Unicode glyph plus optional verified custom_emoji_id.
   */
  resolve(key: SemanticEmojiKey | string): {
    glyph: string;
    customEmojiId: string | null;
    isPremiumActive: boolean;
  } {
    const entry = this.entries.get(key);
    if (!entry) {
      return { glyph: '', customEmojiId: null, isPremiumActive: false };
    }
    const isPremiumActive = Boolean(
      this.premiumEnabled &&
        entry.verified &&
        entry.customEmojiId &&
        CUSTOM_EMOJI_ID_REGEX.test(entry.customEmojiId)
    );
    return {
      glyph: entry.unicodeFallback,
      customEmojiId: isPremiumActive ? entry.customEmojiId : null,
      isPremiumActive,
    };
  }

  /**
   * Formats a message template containing `{{emoji:key}}` tokens into plain text +
   * exact UTF-16 Telegram `custom_emoji` MessageEntity array (falling back cleanly to Unicode
   * with zero mixing or duplication).
   */
  formatMessage(template: string): FormattedEmojiMessage {
    const tokenRegex = /\{\{emoji:([a-z0-9_.-]+)\}\}/gi;
    const entities: TelegramMessageEntity[] = [];
    let output = '';
    let lastIndex = 0;
    let usedCustomEmojiCount = 0;
    let usedFallbackCount = 0;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(template)) !== null) {
      output += template.slice(lastIndex, match.index);
      const key = match[1];
      const resolved = this.resolve(key);
      const offsetUtf16 = output.length; // JS string indices ARE exact UTF-16 code units required by Telegram Bot API
      output += resolved.glyph;
      if (resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph.length > 0) {
        entities.push({
          type: 'custom_emoji',
          offset: offsetUtf16,
          length: resolved.glyph.length,
          custom_emoji_id: resolved.customEmojiId,
        });
        usedCustomEmojiCount++;
      } else if (resolved.glyph.length > 0) {
        usedFallbackCount++;
      }
      lastIndex = match.index + match[0].length;
    }

    output += template.slice(lastIndex);
    return { text: output, entities, usedCustomEmojiCount, usedFallbackCount };
  }

  /**
   * Validates UTF-16 entity boundaries against the formatted message text
   * (zero out-of-bounds, zero overlapping offsets, valid custom_emoji_id format).
   */
  validateFormattedEntities(formatted: FormattedEmojiMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let prevEnd = 0;

    for (const ent of formatted.entities) {
      if (ent.offset < 0 || ent.length <= 0 || ent.offset + ent.length > formatted.text.length) {
        errors.push(`Entity out of UTF-16 bounds: offset=${ent.offset}, length=${ent.length}`);
      }
      if (ent.offset < prevEnd) {
        errors.push(`Overlapping entity detected at offset=${ent.offset} (prevEnd=${prevEnd})`);
      }
      if (ent.type === 'custom_emoji') {
        if (!ent.custom_emoji_id || !CUSTOM_EMOJI_ID_REGEX.test(ent.custom_emoji_id)) {
          errors.push(`Invalid custom_emoji_id: ${ent.custom_emoji_id}`);
        }
        const slice = formatted.text.slice(ent.offset, ent.offset + ent.length);
        if (!slice || slice.trim().length === 0) {
          errors.push(`Empty UTF-16 slice for custom_emoji entity at offset=${ent.offset}`);
        }
      }
      prevEnd = ent.offset + ent.length;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Creates an inline keyboard button.
   * Honors Telegram Bot API reality: `icon_custom_emoji_id` is ONLY attached when
   * `keyboardIconsEnabled` is explicitly verified/enabled; otherwise uses clean Unicode fallback.
   */
  buildKeyboardButton(
    emojiKey: SemanticEmojiKey,
    label: string,
    action: { callback_data?: string; url?: string; web_app?: { url: string } }
  ): TelegramInlineKeyboardButton {
    const entry = this.entries.get(emojiKey);
    const resolved = this.resolve(emojiKey);

    if (
      this.keyboardIconsEnabled &&
      entry?.supportsKeyboardIcon &&
      resolved.isPremiumActive &&
      resolved.customEmojiId
    ) {
      return {
        text: label,
        icon_custom_emoji_id: resolved.customEmojiId,
        ...action,
      };
    }

    const prefix = resolved.glyph ? `${resolved.glyph} ` : '';
    return {
      text: `${prefix}${label}`,
      ...action,
    };
  }

  /**
   * Sends a live diagnostic test message to a Telegram chat to prove real Telegram API
   * acceptance of custom_emoji entities (or cleanly verify Unicode fallback delivery).
   */
  async sendLiveEmojiTestMessage(
    apiClient: TelegramApiClient,
    chatId: number | string
  ): Promise<{
    ok: boolean;
    messageId?: number;
    usedCustomEmojiCount: number;
    usedFallbackCount: number;
    error?: string;
  }> {
    const sample = this.formatMessage(
      '{{emoji:brand.mosque}} ASAKA ZIYO — Telegram Emoji Test\n\n' +
        '{{emoji:nav.prayer}} Namoz vaqtlari | {{emoji:nav.quran}} Qurʼon | {{emoji:nav.hadith}} Hadis\n' +
        '{{emoji:nav.dhikr}} Zikr va Duo | {{emoji:nav.ai}} AI Yordamchi | {{emoji:status.ok}} Tayyor'
    );
    const check = this.validateFormattedEntities(sample);
    if (!check.valid) {
      return {
        ok: false,
        usedCustomEmojiCount: sample.usedCustomEmojiCount,
        usedFallbackCount: sample.usedFallbackCount,
        error: `Entity validation failed: ${check.errors.join('; ')}`,
      };
    }

    const res = await apiClient.sendMessage({
      chat_id: chatId,
      text: sample.text,
      ...(sample.entities.length > 0 ? { entities: sample.entities } : {}),
    });

    return {
      ok: res.ok,
      messageId: res.result?.message_id,
      usedCustomEmojiCount: sample.usedCustomEmojiCount,
      usedFallbackCount: sample.usedFallbackCount,
      error: res.ok ? undefined : res.description,
    };
  }

  validateCompatibility(): EmojiCompatibilityReport {
    const all = this.listAll();
    const invalidEntries: string[] = [];
    let verifiedCustomCount = 0;

    for (const entry of all) {
      if (!entry.unicodeFallback || entry.unicodeFallback.trim().length === 0) {
        invalidEntries.push(`${entry.key}: missing unicodeFallback`);
      }
      if (entry.customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(entry.customEmojiId)) {
        invalidEntries.push(`${entry.key}: invalid customEmojiId format`);
      }
      if (entry.verified && !entry.customEmojiId) {
        invalidEntries.push(`${entry.key}: verified=true without customEmojiId`);
      }
      if (entry.verified && entry.customEmojiId) {
        verifiedCustomCount++;
      }
    }

    return {
      totalRegisteredKeys: all.length,
      verifiedCustomCount,
      fallbackOnlyCount: all.length - verifiedCustomCount,
      premiumRenderingActive: this.premiumEnabled && verifiedCustomCount > 0,
      keyboardCustomIconsActive:
        this.keyboardIconsEnabled && this.premiumEnabled && verifiedCustomCount > 0,
      invalidEntries,
    };
  }
}
