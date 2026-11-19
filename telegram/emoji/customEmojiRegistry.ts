/**
 * ASAKA ZIYO — Telegram Premium Custom Emoji Registry & Entity Formatter
 *
 * STRICT HONESTY & SAFETY RULES:
 * 1. NEVER invents or hardcodes fake custom_emoji_id strings.
 * 2. Every semantic slot ships with a clean, dignified Unicode fallback.
 * 3. Custom emojis are only emitted when:
 *    - A real numeric custom_emoji_id (15–22 digits) has been registered by the owner/admin,
 *    - Verified via Telegram Bot API `getCustomEmojiStickers`, AND
 *    - Bot eligibility is explicitly enabled (`premiumEnabled === true`).
 * 4. Correctly computes UTF-16 code unit offsets/lengths required by Telegram Bot API
 *    `MessageEntity` (`type: "custom_emoji"`).
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
  | 'nav.home'
  | 'nav.prayer'
  | 'nav.language'
  | 'nav.settings'
  | 'nav.help'
  | 'nav.channels'
  | 'nav.web'
  | 'nav.back'
  | 'prayer.fajr'
  | 'prayer.sunrise'
  | 'prayer.dhuhr'
  | 'prayer.asr'
  | 'prayer.maghrib'
  | 'prayer.isha'
  | 'prayer.juma'
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
  {
    key: 'brand.mosque',
    category: 'brand',
    unicodeFallback: '🕌',
    supportsKeyboardIcon: true,
    description: 'ASAKA ZIYO official mosque emblem',
  },
  {
    key: 'brand.crescent',
    category: 'brand',
    unicodeFallback: '🌙',
    supportsKeyboardIcon: true,
    description: 'Islamic crescent accent',
  },
  {
    key: 'brand.book',
    category: 'brand',
    unicodeFallback: '📖',
    supportsKeyboardIcon: true,
    description: 'Quran & knowledge symbol',
  },
  {
    key: 'nav.home',
    category: 'navigation',
    unicodeFallback: '🏛️',
    supportsKeyboardIcon: true,
    description: 'Main menu button icon',
  },
  {
    key: 'nav.prayer',
    category: 'navigation',
    unicodeFallback: '🕰️',
    supportsKeyboardIcon: true,
    description: 'Prayer times navigation icon',
  },
  {
    key: 'nav.language',
    category: 'navigation',
    unicodeFallback: '🌐',
    supportsKeyboardIcon: true,
    description: 'Language selection icon',
  },
  {
    key: 'nav.settings',
    category: 'navigation',
    unicodeFallback: '⚙️',
    supportsKeyboardIcon: true,
    description: 'User settings icon',
  },
  {
    key: 'nav.help',
    category: 'navigation',
    unicodeFallback: 'ℹ️',
    supportsKeyboardIcon: true,
    description: 'Help & guidance icon',
  },
  {
    key: 'nav.channels',
    category: 'navigation',
    unicodeFallback: '📢',
    supportsKeyboardIcon: true,
    description: 'Official Telegram channels icon',
  },
  {
    key: 'nav.web',
    category: 'navigation',
    unicodeFallback: '🔗',
    supportsKeyboardIcon: true,
    description: 'Web & Mobile App link icon',
  },
  {
    key: 'nav.back',
    category: 'navigation',
    unicodeFallback: '↩️',
    supportsKeyboardIcon: true,
    description: 'Return to previous menu icon',
  },
  {
    key: 'prayer.fajr',
    category: 'prayer',
    unicodeFallback: '🌅',
    supportsKeyboardIcon: false,
    description: 'Bomdod / Fajr time indicator',
  },
  {
    key: 'prayer.sunrise',
    category: 'prayer',
    unicodeFallback: '☀️',
    supportsKeyboardIcon: false,
    description: 'Sunrise time indicator',
  },
  {
    key: 'prayer.dhuhr',
    category: 'prayer',
    unicodeFallback: '🌤️',
    supportsKeyboardIcon: false,
    description: 'Peshin / Dhuhr time indicator',
  },
  {
    key: 'prayer.asr',
    category: 'prayer',
    unicodeFallback: '🌇',
    supportsKeyboardIcon: false,
    description: 'Asr time indicator',
  },
  {
    key: 'prayer.maghrib',
    category: 'prayer',
    unicodeFallback: '🌆',
    supportsKeyboardIcon: false,
    description: 'Shom / Maghrib time indicator',
  },
  {
    key: 'prayer.isha',
    category: 'prayer',
    unicodeFallback: '🌌',
    supportsKeyboardIcon: false,
    description: 'Xufton / Isha time indicator',
  },
  {
    key: 'prayer.juma',
    category: 'prayer',
    unicodeFallback: '✨',
    supportsKeyboardIcon: false,
    description: 'Juma prayer highlight',
  },
  {
    key: 'language.globe',
    category: 'language',
    unicodeFallback: '🌐',
    supportsKeyboardIcon: true,
    description: 'Five-language selector icon',
  },
  {
    key: 'language.selected',
    category: 'language',
    unicodeFallback: '✅',
    supportsKeyboardIcon: true,
    description: 'Active language checkmark',
  },
  {
    key: 'settings.bell_on',
    category: 'settings',
    unicodeFallback: '🔔',
    supportsKeyboardIcon: true,
    description: 'Notifications enabled',
  },
  {
    key: 'settings.bell_off',
    category: 'settings',
    unicodeFallback: '🔕',
    supportsKeyboardIcon: true,
    description: 'Notifications muted',
  },
  {
    key: 'settings.gear',
    category: 'settings',
    unicodeFallback: '⚙️',
    supportsKeyboardIcon: true,
    description: 'Preferences header icon',
  },
  {
    key: 'status.ok',
    category: 'status',
    unicodeFallback: '✅',
    supportsKeyboardIcon: false,
    description: 'Success status',
  },
  {
    key: 'status.warn',
    category: 'status',
    unicodeFallback: '⚠️',
    supportsKeyboardIcon: false,
    description: 'Warning / rate-limit notice',
  },
  {
    key: 'status.lock',
    category: 'status',
    unicodeFallback: '🔐',
    supportsKeyboardIcon: false,
    description: 'Security / admin access',
  },
  {
    key: 'channel.broadcast',
    category: 'channel',
    unicodeFallback: '📣',
    supportsKeyboardIcon: true,
    description: 'Channel publication indicator',
  },
  {
    key: 'calendar.date',
    category: 'calendar',
    unicodeFallback: '📅',
    supportsKeyboardIcon: false,
    description: 'Gregorian & Hijri date indicator',
  },
];

export interface FormattedEmojiMessage {
  text: string;
  entities: TelegramMessageEntity[];
  usedCustomEmojiCount: number;
}

export interface EmojiCompatibilityReport {
  totalRegisteredKeys: number;
  verifiedCustomCount: number;
  fallbackOnlyCount: number;
  premiumRenderingActive: boolean;
  invalidEntries: string[];
}

export class CustomEmojiRegistry {
  private readonly entries = new Map<string, CustomEmojiEntry>();
  private premiumEnabled = false;

  constructor(initialEntries?: CustomEmojiEntry[], premiumEnabled = false) {
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
  }

  setPremiumEnabled(enabled: boolean): void {
    this.premiumEnabled = Boolean(enabled);
  }

  isPremiumEnabled(): boolean {
    return this.premiumEnabled;
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
   * Marks verified=false until verified against Telegram Bot API `getCustomEmojiStickers`,
   * unless `markVerified` is explicitly passed after API confirmation.
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
   * exact UTF-16 Telegram `custom_emoji` MessageEntity array (falling back gracefully to Unicode).
   */
  formatMessage(template: string): FormattedEmojiMessage {
    const tokenRegex = /\{\{emoji:([a-z0-9_.-]+)\}\}/gi;
    const entities: TelegramMessageEntity[] = [];
    let output = '';
    let lastIndex = 0;
    let usedCustomEmojiCount = 0;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(template)) !== null) {
      output += template.slice(lastIndex, match.index);
      const key = match[1];
      const resolved = this.resolve(key);
      const offsetUtf16 = output.length; // JS string length IS UTF-16 code units (exact Telegram Bot API unit)
      output += resolved.glyph;
      if (resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph.length > 0) {
        entities.push({
          type: 'custom_emoji',
          offset: offsetUtf16,
          length: resolved.glyph.length,
          custom_emoji_id: resolved.customEmojiId,
        });
        usedCustomEmojiCount++;
      }
      lastIndex = match.index + match[0].length;
    }

    output += template.slice(lastIndex);
    return { text: output, entities, usedCustomEmojiCount };
  }

  /**
   * Creates an inline keyboard button with verified `icon_custom_emoji_id` when supported & eligible,
   * otherwise cleanly prefixes the Unicode fallback emoji in the button text.
   */
  buildKeyboardButton(
    emojiKey: SemanticEmojiKey,
    label: string,
    action: { callback_data?: string; url?: string; web_app?: { url: string } }
  ): TelegramInlineKeyboardButton {
    const entry = this.entries.get(emojiKey);
    const resolved = this.resolve(emojiKey);

    if (entry?.supportsKeyboardIcon && resolved.isPremiumActive && resolved.customEmojiId) {
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
      invalidEntries,
    };
  }
}
