/**
 * ASAKA ZIYO — 100% Telegram Premium Custom Emoji Registry (Bot API 9.4+)
 *
 * STRICT ZERO-PLAIN-EMOJI ARCHITECTURE:
 * - Every visible emoji in any user-facing Telegram bot output MUST be a real,
 *   verified Telegram Premium Custom Emoji registered by OWNER_ID / authorized Admin.
 * - Zero hardcoded or guessed `custom_emoji_id` values anywhere in code.
 * - Live verification via `getCustomEmojiStickers` before saving/activating any ID.
 * - Zero-Plain-Emoji Fallback Rule:
 *   When a slot has no verified active `customEmojiId`, is disabled, or Telegram rejects it,
 *   the emoji is OMITTED cleanly (`""`) — NEVER emitting a visible plain Unicode emoji!
 *   (The internal `unicodeFallback` field is strictly a technical 1-grapheme anchor character
 *   required by Telegram's `MessageEntity(custom_emoji)` / `<tg-emoji>` protocol, and is
 *   ONLY emitted when wrapped in a verified active `custom_emoji` entity or `<tg-emoji>` tag.)
 * - Reply & Inline Keyboards attach `icon_custom_emoji_id` when active, and ALWAYS strip
 *   plain Unicode emojis from visible button text.
 * - Preserves all 5 languages (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new`, `ru`, `en`),
 *   Arabic Quran script verbatim, HTML/Markdown integrity, and UTF-16 entity offsets.
 */

import fs from 'fs';
import path from 'path';
import {
  CustomEmojiCategory,
  CustomEmojiEntry,
  TelegramApiMessage,
  TelegramEmojiAuditReport,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramKeyboardButton,
  TelegramMessageEntity,
  TelegramReplyMarkup,
} from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';

export type CanonicalEmojiSlot =
  | 'home'
  | 'quran'
  | 'quran_mp3'
  | 'hifz'
  | 'prayer'
  | 'hadith'
  | 'dhikr'
  | 'dua'
  | 'ai_assistant'
  | 'community'
  | 'profile'
  | 'favorites'
  | 'notifications'
  | 'settings'
  | 'admin'
  | 'back'
  | 'next'
  | 'previous'
  | 'play'
  | 'pause'
  | 'success'
  | 'warning'
  | 'error'
  | 'loading'
  | 'calendar'
  | 'statistics'
  | 'support';

export const CANONICAL_EMOJI_SLOTS: readonly CanonicalEmojiSlot[] = [
  'home',
  'quran',
  'quran_mp3',
  'hifz',
  'prayer',
  'hadith',
  'dhikr',
  'dua',
  'ai_assistant',
  'community',
  'profile',
  'favorites',
  'notifications',
  'settings',
  'admin',
  'back',
  'next',
  'previous',
  'play',
  'pause',
  'success',
  'warning',
  'error',
  'loading',
  'calendar',
  'statistics',
  'support',
] as const;

export type SemanticEmojiKey =
  | CanonicalEmojiSlot
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

// Never pre-constrain Telegram custom_emoji_id to a fixed 19-digit length; accept any genuine numeric ID returned by Telegram.
export const CUSTOM_EMOJI_ID_REGEX = /^\d{1,64}$/;
export const CUSTOM_EMOJI_KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{1,47}$/;

/**
 * Matches every plain Unicode pictographic emoji, flag sequence, keycap emoji,
 * ZWJ sequence, and skin-tone emoji cluster WITHOUT touching Arabic Quran script,
 * Cyrillic, Latin, Uzbek apostrophes, digits, or standard typographic symbols.
 */
export const PLAIN_UNICODE_EMOJI_CLUSTER_REGEX =
  /(?:[\u{1F1E6}-\u{1F1FF}]{2}|[#*0-9]\uFE0F?\u20E3|(?:\p{Extended_Pictographic})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic})|\p{Emoji_Modifier})*)/gu;

/**
 * Maps legacy or accidental Unicode pictographs to canonical semantic keys
 * so any registered Premium Custom Emoji replaces them automatically, and any
 * unregistered glyph is cleanly stripped (0 visible plain Unicode emojis).
 */
const UNICODE_GLYPH_TO_CANONICAL_KEY: Record<string, string> = {
  // Home & navigation
  '🏠': 'home',
  '🏛': 'home',
  '🏡': 'home',
  // Quran & knowledge
  '📖': 'quran',
  '📗': 'quran',
  '📘': 'quran',
  '📚': 'quran',
  '📕': 'quran',
  '📙': 'quran',
  '📄': 'quran',
  '📃': 'quran',
  '📰': 'quran',
  '📝': 'quran',
  '✏': 'quran',
  '🎓': 'quran',
  '🏫': 'quran',
  // Quran MP3 & audio
  '🎧': 'quran_mp3',
  '🎙': 'quran_mp3',
  '🎵': 'quran_mp3',
  '🎶': 'quran_mp3',
  '🔊': 'quran_mp3',
  '🎤': 'quran_mp3',
  '📻': 'quran_mp3',
  // Hifz & progress
  '🧠': 'hifz',
  '🎯': 'hifz',
  '🔥': 'hifz',
  '🏆': 'hifz',
  '🥇': 'hifz',
  '🥈': 'hifz',
  '🥉': 'hifz',
  '🏅': 'hifz',
  '🎖': 'hifz',
  '💎': 'hifz',
  // Prayer, mosque & Qibla
  '🕌': 'prayer',
  '🕋': 'prayer',
  '🧭': 'prayer',
  '🌅': 'prayer',
  '☀': 'prayer',
  '🌤': 'prayer',
  '🌇': 'prayer',
  '🌆': 'prayer',
  '🌃': 'prayer',
  '🌌': 'prayer',
  '🌙': 'prayer',
  '🌜': 'prayer',
  '🌛': 'prayer',
  '☪': 'prayer',
  '🕛': 'prayer',
  '🕰': 'prayer',
  '📏': 'prayer',
  '📍': 'prayer',
  // Hadith
  '📜': 'hadith',
  '🔖': 'hadith',
  // Dhikr & tasbeh
  '📿': 'dhikr',
  '🕊': 'dhikr',
  '💫': 'dhikr',
  // Dua
  '🤲': 'dua',
  '🙏': 'dua',
  '🤍': 'dua',
  '💚': 'dua',
  '❤': 'dua',
  // AI Assistant
  '💠': 'ai_assistant',
  '🤖': 'ai_assistant',
  '💡': 'ai_assistant',
  '✨': 'ai_assistant',
  '⚡': 'ai_assistant',
  '🔍': 'ai_assistant',
  '🔎': 'ai_assistant',
  '🧪': 'ai_assistant',
  '🔬': 'ai_assistant',
  // Community, broadcasts, web/mobile
  '📢': 'community',
  '📣': 'community',
  '📡': 'community',
  '🌐': 'language.globe',
  '🔗': 'nav.web',
  '📱': 'nav.miniapp',
  '📲': 'nav.miniapp',
  '👥': 'community',
  '🤝': 'community',
  '🎬': 'play',
  '🎥': 'play',
  '📺': 'community',
  '🖼': 'community',
  '📸': 'community',
  '📹': 'play',
  // Profile
  '👤': 'profile',
  '🪪': 'profile',
  '🆔': 'profile',
  '👋': 'profile',
  '🙋': 'profile',
  // Favorites
  '⭐': 'favorites',
  '🌟': 'favorites',
  // Notifications
  '🔔': 'notifications',
  '🔕': 'settings.bell_off',
  '⏰': 'notifications',
  '⏱': 'notifications',
  '⏲': 'notifications',
  // Settings
  '⚙': 'settings',
  '🔧': 'settings',
  '🔨': 'settings',
  '🛠': 'settings',
  '🎨': 'settings',
  '🧩': 'settings',
  '🗂': 'settings',
  '📂': 'settings',
  '📁': 'settings',
  '📦': 'settings',
  '📥': 'settings',
  '📤': 'settings',
  '📋': 'settings',
  '📌': 'settings',
  // Admin & security
  '🛡': 'admin',
  '🔐': 'admin',
  '🔒': 'admin',
  '🔓': 'admin',
  '👑': 'admin',
  '🔑': 'admin',
  '🩺': 'admin',
  // Navigation arrows & controls
  '↩': 'back',
  '🔙': 'back',
  '➡': 'next',
  '⏭': 'next',
  '⏩': 'next',
  '👉': 'next',
  '⬅': 'previous',
  '⏮': 'previous',
  '⏪': 'previous',
  '👈': 'previous',
  '▶': 'play',
  '⬇': 'play',
  '➕': 'play',
  '⏸': 'pause',
  '⏹': 'pause',
  '⬜': 'pause',
  // Status
  '✅': 'success',
  '☑': 'success',
  '✔': 'success',
  '🎉': 'success',
  '🎊': 'success',
  '⚠': 'warning',
  '🚧': 'warning',
  '🔄': 'warning',
  '❌': 'error',
  '⛔': 'error',
  '🚫': 'error',
  '🗑': 'error',
  '✖': 'error',
  // Loading, calendar, stats, support
  '⏳': 'loading',
  '⌛': 'loading',
  '🕘': 'loading',
  '📅': 'calendar',
  '📆': 'calendar',
  '🗓': 'calendar',
  '📊': 'statistics',
  '📈': 'statistics',
  '📉': 'statistics',
  '📑': 'statistics',
  '💬': 'support',
  '📩': 'support',
  '✉': 'support',
  'ℹ': 'support',
  '❓': 'support',
  '❔': 'support',
  '📞': 'support',
  '☎': 'support',
  '🆘': 'support',
  // Language flags
  '🇺🇿': 'language.globe',
  '🇷🇺': 'language.globe',
  '🇬🇧': 'language.globe',
  '🇺🇸': 'language.globe',
};

export function normalizeGlyphForLookup(glyph: string): string {
  return String(glyph || '').replace(/\uFE0F/g, '').trim();
}

export function lookupCanonicalKeyForUnicodeGlyph(glyph: string): string | null {
  const norm = normalizeGlyphForLookup(glyph);
  if (!norm) return null;
  if (UNICODE_GLYPH_TO_CANONICAL_KEY[norm]) {
    return UNICODE_GLYPH_TO_CANONICAL_KEY[norm];
  }
  // Check base character before ZWJ if composite
  const firstPart = norm.split('\u200D')[0];
  if (firstPart && UNICODE_GLYPH_TO_CANONICAL_KEY[firstPart]) {
    return UNICODE_GLYPH_TO_CANONICAL_KEY[firstPart];
  }
  return null;
}

export function escapeTelegramHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Strips `<tg-emoji ...>...</tg-emoji>` completely to `""` (zero plain Unicode emoji leak).
 */
export function stripTgEmojiHtmlTags(html: string): string {
  return String(html || '')
    .replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>[ \t]?/gi, '')
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Removes all plain Unicode emojis and `{{emoji:...}}` tokens from a string,
 * cleanly collapsing orphaned horizontal spacing while preserving newlines & Arabic script.
 */
export function stripPlainUnicodeEmojis(input: string): string {
  if (!input) return '';
  let out = String(input)
    .replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/gi, '')
    .replace(/\{\{emoji:[a-z0-9_.-]+\}\}/gi, '')
    .replace(PLAIN_UNICODE_EMOJI_CLUSTER_REGEX, '');
  // Clean orphaned horizontal spaces per line without losing newlines or Arabic letters
  out = out
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''))
    .join('\n');
  return out;
}

/**
 * Finds any plain Unicode emoji clusters NOT covered by valid `custom_emoji` entities.
 * Returns exact UTF-16 offset & glyph of every violation (must be empty in strict mode).
 */
export function findUncoveredPlainEmojis(
  text: string,
  entities?: TelegramMessageEntity[],
  parseMode?: 'HTML' | 'MarkdownV2'
): Array<{ glyph: string; offset: number }> {
  if (!text) return [];
  const coveredRanges: Array<[number, number]> = [];

  if (parseMode === 'HTML') {
    const tgTagRegex = /<tg-emoji\b[^>]*\bemoji-id="(\d{1,64})"[^>]*>[\s\S]*?<\/tg-emoji>/gi;
    let m: RegExpExecArray | null;
    while ((m = tgTagRegex.exec(text)) !== null) {
      coveredRanges.push([m.index, m.index + m[0].length]);
    }
  } else if (Array.isArray(entities)) {
    for (const ent of entities) {
      if (
        ent &&
        ent.type === 'custom_emoji' &&
        typeof ent.custom_emoji_id === 'string' &&
        CUSTOM_EMOJI_ID_REGEX.test(ent.custom_emoji_id) &&
        ent.offset >= 0 &&
        ent.length > 0
      ) {
        coveredRanges.push([ent.offset, ent.offset + ent.length]);
      }
    }
  }

  const isCovered = (start: number, end: number) =>
    coveredRanges.some(([rs, re]) => start >= rs && end <= re);

  const violations: Array<{ glyph: string; offset: number }> = [];
  const regex = new RegExp(PLAIN_UNICODE_EMOJI_CLUSTER_REGEX.source, 'gu');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (!isCovered(start, end)) {
      violations.push({ glyph: match[0], offset: start });
    }
  }
  return violations;
}

/**
 * Audits ANY outgoing Telegram Bot API payload (sendMessage, editMessageText, sendAudio,
 * sendPhoto, sendVideo, sendDocument, answerCallbackQuery, sendRichMessage, sendMessageDraft)
 * to prove 0 uncovered plain Unicode emojis appear in text, caption, toast, or keyboard buttons.
 */
export function auditTelegramOutgoingPayload(payload: Record<string, unknown>): {
  clean: boolean;
  violations: Array<{ field: string; glyph: string; offset?: number }>;
} {
  const violations: Array<{ field: string; glyph: string; offset?: number }> = [];
  const parseMode =
    payload.parse_mode === 'HTML' || payload.parse_mode === 'MarkdownV2'
      ? payload.parse_mode
      : undefined;

  if (typeof payload.text === 'string') {
    const ents = Array.isArray(payload.entities)
      ? (payload.entities as TelegramMessageEntity[])
      : undefined;
    for (const v of findUncoveredPlainEmojis(payload.text, ents, parseMode)) {
      violations.push({ field: 'text', glyph: v.glyph, offset: v.offset });
    }
  }

  if (typeof payload.caption === 'string') {
    const ents = Array.isArray(payload.caption_entities)
      ? (payload.caption_entities as TelegramMessageEntity[])
      : undefined;
    for (const v of findUncoveredPlainEmojis(payload.caption, ents, parseMode)) {
      violations.push({ field: 'caption', glyph: v.glyph, offset: v.offset });
    }
  }

  const rm = payload.reply_markup as TelegramReplyMarkup | undefined;
  if (rm && typeof rm === 'object') {
    if ('inline_keyboard' in rm && Array.isArray(rm.inline_keyboard)) {
      rm.inline_keyboard.forEach((row, rIdx) => {
        row.forEach((btn, cIdx) => {
          for (const v of findUncoveredPlainEmojis(btn.text || '')) {
            violations.push({
              field: `reply_markup.inline_keyboard[${rIdx}][${cIdx}].text`,
              glyph: v.glyph,
              offset: v.offset,
            });
          }
        });
      });
    }
    if ('keyboard' in rm && Array.isArray(rm.keyboard)) {
      rm.keyboard.forEach((row, rIdx) => {
        row.forEach((btn, cIdx) => {
          for (const v of findUncoveredPlainEmojis(btn.text || '')) {
            violations.push({
              field: `reply_markup.keyboard[${rIdx}][${cIdx}].text`,
              glyph: v.glyph,
              offset: v.offset,
            });
          }
        });
      });
    }
  }

  // Rich message blocks check
  if (Array.isArray(payload.blocks)) {
    const inspectRichNode = (node: any, fieldPath: string) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'plain' || node.type === 'code') {
        for (const v of findUncoveredPlainEmojis(String(node.text || ''))) {
          violations.push({ field: fieldPath, glyph: v.glyph, offset: v.offset });
        }
      } else if (node.type === 'bold' || node.type === 'italic' || node.type === 'link') {
        inspectRichNode(node.text, `${fieldPath}.text`);
      } else if (node.type === 'concatenation' && Array.isArray(node.texts)) {
        node.texts.forEach((t: any, i: number) => inspectRichNode(t, `${fieldPath}.texts[${i}]`));
      }
    };
    const inspectBlock = (blk: any, fieldPath: string) => {
      if (!blk || typeof blk !== 'object') return;
      if (blk.text) inspectRichNode(blk.text, `${fieldPath}.text`);
      if (blk.title) inspectRichNode(blk.title, `${fieldPath}.title`);
      if (blk.caption) inspectRichNode(blk.caption, `${fieldPath}.caption`);
      if (Array.isArray(blk.items)) {
        blk.items.forEach((it: any, i: number) => inspectRichNode(it?.text, `${fieldPath}.items[${i}]`));
      }
      if (Array.isArray(blk.header)) {
        blk.header.forEach((c: any, i: number) => inspectRichNode(c, `${fieldPath}.header[${i}]`));
      }
      if (Array.isArray(blk.rows)) {
        blk.rows.forEach((r: any[], rIdx: number) =>
          r.forEach((c: any, cIdx: number) => inspectRichNode(c, `${fieldPath}.rows[${rIdx}][${cIdx}]`))
        );
      }
      if (Array.isArray(blk.blocks)) {
        blk.blocks.forEach((b: any, i: number) => inspectBlock(b, `${fieldPath}.blocks[${i}]`));
      }
      if (Array.isArray(blk.buttons)) {
        blk.buttons.forEach((row: any[], rIdx: number) =>
          row.forEach((btn: any, cIdx: number) => {
            for (const v of findUncoveredPlainEmojis(String(btn?.text || ''))) {
              violations.push({
                field: `${fieldPath}.buttons[${rIdx}][${cIdx}].text`,
                glyph: v.glyph,
                offset: v.offset,
              });
            }
          })
        );
      }
    };
    payload.blocks.forEach((blk: any, idx: number) => inspectBlock(blk, `blocks[${idx}]`));
  }

  return { clean: violations.length === 0, violations };
}

/**
 * Links legacy dotted keys to the 27 canonical Admin `/emoji_setup` categories
 * so registering e.g. `quran` automatically upgrades `nav.quran` & `brand.book`
 * unless those legacy keys have their own explicit override.
 */
const LEGACY_KEY_TO_CANONICAL_FALLBACK: Partial<Record<string, CanonicalEmojiSlot>> = {
  brand: 'favorites',
  'brand.mosque': 'prayer',
  'brand.crescent': 'prayer',
  'brand.book': 'quran',
  'brand.star': 'favorites',
  'nav.home': 'home',
  'nav.prayer': 'prayer',
  'nav.quran': 'quran',
  'nav.hadith': 'hadith',
  'nav.dhikr': 'dhikr',
  'nav.ai': 'ai_assistant',
  'nav.profile': 'profile',
  'nav.admin': 'admin',
  'nav.settings': 'settings',
  'nav.help': 'support',
  'nav.channels': 'community',
  'nav.web': 'community',
  'nav.miniapp': 'home',
  'nav.back': 'back',
  'nav.next': 'next',
  'nav.prev': 'previous',
  'prayer.fajr': 'prayer',
  'prayer.sunrise': 'prayer',
  'prayer.dhuhr': 'prayer',
  'prayer.asr': 'prayer',
  'prayer.maghrib': 'prayer',
  'prayer.isha': 'prayer',
  'prayer.juma': 'prayer',
  'content.tasbeh': 'dhikr',
  'content.dua': 'dua',
  'ai.spark': 'ai_assistant',
  'profile.user': 'profile',
  'admin.shield': 'admin',
  'language.globe': 'settings',
  'language.selected': 'success',
  'settings.bell_on': 'notifications',
  'settings.bell_off': 'notifications',
  'settings.gear': 'settings',
  'status.ok': 'success',
  'status.warn': 'warning',
  'status.lock': 'admin',
  'channel.broadcast': 'community',
  'calendar.date': 'calendar',
};

const DEFAULT_EMOJI_SEEDS: Array<
  Omit<CustomEmojiEntry, 'customEmojiId' | 'verified' | 'updatedAt'>
> = [
  // 27 Canonical ASAKA ZIYO Premium Emoji Categories (Bot API 9.4+)
  {
    key: 'home',
    category: 'home',
    unicodeFallback: '🏠',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Asosiy menyu / Home',
    semanticPurpose: 'Bosh menyu sarlavhasi, Reply/Inline asosiy tugmalar va kirish kartalari',
    usedIn: ['main_menu', 'reply_keyboard', 'start_welcome', 'help'],
  },
  {
    key: 'quran',
    category: 'quran',
    unicodeFallback: '📖',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Qurʼoni Karim / Quran',
    semanticPurpose: 'Qurʼon boʻlimi, suralar roʻyxati, tafsir, xatm va maqolalar',
    usedIn: ['quran_section', 'tafsir_hilol', 'khatm_planner', 'reply_keyboard', 'inline_menus'],
  },
  {
    key: 'quran_mp3',
    category: 'quran_mp3',
    unicodeFallback: '🎧',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Qurʼon MP3 audio kutubxonasi',
    semanticPurpose: '10 qori, 114 sura MP3 pleyer, audio captionlar va qori tanlash',
    usedIn: ['quran_mp3_home', 'reciters_list', 'audio_captions', 'reply_keyboard'],
  },
  {
    key: 'hifz',
    category: 'hifz',
    unicodeFallback: '🧠',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'ASAKA ZIYO Hifz va murojaa',
    semanticPurpose: 'Hifz rejasi, murojaa eslatmalari, AI murabbiy va yodlash statistikasi',
    usedIn: ['hifz_home', 'hifz_daily_plan', 'hifz_reminders', 'hifz_coach'],
  },
  {
    key: 'prayer',
    category: 'prayer',
    unicodeFallback: '🕌',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Namoz vaqtlari va masjid',
    semanticPurpose: 'Asaka namoz jadvali, Qibla, Ramazon va masjid maʼlumotlari',
    usedIn: ['prayer_card', 'prayer_alerts', 'qibla_finder', 'ramadan_card', 'channel_prayer_post'],
  },
  {
    key: 'hadith',
    category: 'hadith',
    unicodeFallback: '📜',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Sahih hadislar',
    semanticPurpose: 'Buxoriy, Muslim, Navaviy hadislar kartalari va kun hadisi',
    usedIn: ['hadith_cards', 'daily_brief', 'reply_keyboard', 'inline_menus'],
  },
  {
    key: 'dhikr',
    category: 'dhikr',
    unicodeFallback: '📿',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Zikr va tasbeh',
    semanticPurpose: 'Interaktiv tasbeh sanoqchi, tonggi va kechki zikrlar',
    usedIn: ['dhikr_card', 'tasbeh_controls', 'dhikr_reminders', 'reply_keyboard'],
  },
  {
    key: 'dua',
    category: 'dua',
    unicodeFallback: '🤲',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Duolar',
    semanticPurpose: 'Vaziyatli duolar va kunlik duo kartalari',
    usedIn: ['dua_cards', 'daily_brief', 'inline_menus'],
  },
  {
    key: 'ai_assistant',
    category: 'ai_assistant',
    unicodeFallback: '💠',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'AI islomiy yordamchi',
    semanticPurpose: 'Gemini AI savol-javob, ovozli/rasmli tahlil va AI boshqaruv',
    usedIn: ['ai_chat_header', 'ai_voice_reply', 'ai_vision_reply', 'ai_draft_stream', 'reply_keyboard'],
  },
  {
    key: 'community',
    category: 'community',
    unicodeFallback: '📢',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Jamoa, yangiliklar va kanallar',
    semanticPurpose: 'Masjid eʼlonlari, yangiliklar, kanal nashrlari va broadcastlar',
    usedIn: ['announcements', 'news', 'channels', 'broadcasts', 'sync_notifications'],
  },
  {
    key: 'profile',
    category: 'profile',
    unicodeFallback: '👤',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Shaxsiy profil',
    semanticPurpose: 'Roʻyxatdan oʻtish, profil kartasi, maxfiylik va foydalanuvchi maʼlumotlari',
    usedIn: ['profile_card', 'registration_flow', 'privacy_center', 'reply_keyboard'],
  },
  {
    key: 'favorites',
    category: 'favorites',
    unicodeFallback: '⭐',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Sevimlilar va xatchoʻplar',
    semanticPurpose: 'Saqlangan oyat, hadis, sura va sevimli qorilar',
    usedIn: ['bookmarks', 'quran_mp3_favorites', 'reply_keyboard'],
  },
  {
    key: 'notifications',
    category: 'notifications',
    unicodeFallback: '🔔',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Bildirishnomalar markazi',
    semanticPurpose: 'Namoz, Hifz, kunlik xulosa va shaxsiy eslatmalar markazi',
    usedIn: ['notification_center', 'scheduled_alerts', 'reminder_list', 'reply_keyboard'],
  },
  {
    key: 'settings',
    category: 'settings',
    unicodeFallback: '⚙️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Sozlamalar',
    semanticPurpose: 'Til, jimjitlik soatlari, azon va bot sozlamalari',
    usedIn: ['settings_menu', 'language_picker', 'style_manager', 'reply_keyboard'],
  },
  {
    key: 'admin',
    category: 'admin',
    unicodeFallback: '🛡️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Admin boshqaruv markazi',
    semanticPurpose: 'Super Admin panel, diagnostika, CMS, Emoji Manager va xavfsizlik',
    usedIn: ['admin_home', 'admin_diagnostics', 'admin_emoji_manager', 'admin_cms'],
  },
  {
    key: 'back',
    category: 'back',
    unicodeFallback: '↩️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Ortga qaytish',
    semanticPurpose: 'Barcha ichki menyulardagi ortga / bosh menyuga qaytish tugmalari',
    usedIn: ['all_inline_submenus'],
  },
  {
    key: 'next',
    category: 'next',
    unicodeFallback: '➡️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Keyingi sahifa / sura',
    semanticPurpose: 'Sahifalash va keyingi sura/oyat/hadis tugmalari',
    usedIn: ['pagination_controls', 'quran_reader', 'mp3_track_controls'],
  },
  {
    key: 'previous',
    category: 'previous',
    unicodeFallback: '⬅️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Oldingi sahifa / sura',
    semanticPurpose: 'Sahifalash va oldingi sura/oyat/hadis tugmalari',
    usedIn: ['pagination_controls', 'quran_reader', 'mp3_track_controls'],
  },
  {
    key: 'play',
    category: 'play',
    unicodeFallback: '▶️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Audio tinglash',
    semanticPurpose: 'Sura tinglash, davom ettirish va video/media ochish',
    usedIn: ['quran_mp3_tracks', 'video_library', 'broadcast_start'],
  },
  {
    key: 'pause',
    category: 'pause',
    unicodeFallback: '⏸️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Pauza',
    semanticPurpose: 'Vaqtincha toʻxtatish / oʻchirish holatlari',
    usedIn: ['admin_emoji_toggle', 'admin_broadcast_pause', 'admin_audio_toggle'],
  },
  {
    key: 'success',
    category: 'success',
    unicodeFallback: '✅',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Muvaffaqiyatli holat',
    semanticPurpose: 'Saqlandi, tasdiqlandi, faol holat va bajarildi bildirishnomalari',
    usedIn: ['success_messages', 'confirm_buttons', 'active_toggles', 'verification'],
  },
  {
    key: 'warning',
    category: 'warning',
    unicodeFallback: '⚠️',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Ogohlantirish',
    semanticPurpose: 'Ogohlantirish, limit, yetishmayotgan element va texnik rejim xabarlari',
    usedIn: ['warning_messages', 'rate_limit', 'maintenance_mode', 'audit_warnings'],
  },
  {
    key: 'error',
    category: 'error',
    unicodeFallback: '❌',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Xatolik holati',
    semanticPurpose: 'Xatolik, rad etish, bekor qilish va oʻchirish tugmalari',
    usedIn: ['error_messages', 'cancel_buttons', 'delete_actions'],
  },
  {
    key: 'loading',
    category: 'loading',
    unicodeFallback: '⏳',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Yuklanmoqda',
    semanticPurpose: 'AI javob tayyorlash, fayl yuborish va tekshiruv jarayonlari',
    usedIn: ['ai_draft_stream', 'apk_delivery', 'audio_loading'],
  },
  {
    key: 'calendar',
    category: 'calendar',
    unicodeFallback: '📅',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Hijriy va milodiy taqvim',
    semanticPurpose: 'Hijriy sana, diniy bayramlar, eslatmalar va tarix roʻyxati',
    usedIn: ['prayer_calendar', 'personal_reminders', 'release_history', 'audit_history'],
  },
  {
    key: 'statistics',
    category: 'statistics',
    unicodeFallback: '📊',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Statistika va tahlil',
    semanticPurpose: 'Viktorina, reyting, Hifz/MP3 statistikasi va Admin analitikasi',
    usedIn: ['quiz_results', 'hifz_stats', 'mp3_stats', 'admin_analytics'],
  },
  {
    key: 'support',
    category: 'support',
    unicodeFallback: '💬',
    supportsKeyboardIcon: true,
    enabled: true,
    description: 'Qoʻllab-quvvatlash va ustoz',
    semanticPurpose: 'Imom/ustozga murojaat, texnik yordam va support tiketlari',
    usedIn: ['support_center', 'admin_support', 'help_menu', 'reply_keyboard'],
  },

  // Preserved Brand & Legacy Semantic Keys (100% backward compatible, auto-mapped to canonical slots)
  { key: 'brand.mosque', category: 'brand', unicodeFallback: '🕌', supportsKeyboardIcon: true, enabled: true, description: 'ASAKA ZIYO official mosque emblem', semanticPurpose: 'Brand mosque header', usedIn: ['prayer_card', 'mosque_info'] },
  { key: 'brand.crescent', category: 'brand', unicodeFallback: '🌙', supportsKeyboardIcon: true, enabled: true, description: 'Islamic crescent accent', semanticPurpose: 'Ramadan & daily assistant header', usedIn: ['daily_assistant', 'ramadan_card'] },
  { key: 'brand.book', category: 'brand', unicodeFallback: '📖', supportsKeyboardIcon: true, enabled: true, description: 'Quran & Islamic knowledge symbol', semanticPurpose: 'Quran, Academy & CMS', usedIn: ['quran_menu', 'academy', 'admin_cms'] },
  { key: 'brand.star', category: 'brand', unicodeFallback: '✨', supportsKeyboardIcon: true, enabled: true, description: 'Highlight & premium accent', semanticPurpose: 'Highlights, search & premium features', usedIn: ['main_menu', 'khatm_planner', 'bookmarks'] },
  { key: 'nav.home', category: 'navigation', unicodeFallback: '🏛️', supportsKeyboardIcon: true, enabled: true, description: 'Main menu home icon', semanticPurpose: 'Navigation home', usedIn: ['main_menu'] },
  { key: 'nav.prayer', category: 'navigation', unicodeFallback: '🕰️', supportsKeyboardIcon: true, enabled: true, description: 'Prayer times navigation icon', semanticPurpose: 'Prayer navigation', usedIn: ['prayer_menu'] },
  { key: 'nav.quran', category: 'navigation', unicodeFallback: '📗', supportsKeyboardIcon: true, enabled: true, description: 'Quran section icon', semanticPurpose: 'Quran navigation', usedIn: ['quran_menu'] },
  { key: 'nav.hadith', category: 'navigation', unicodeFallback: '📜', supportsKeyboardIcon: true, enabled: true, description: 'Hadith collection icon', semanticPurpose: 'Hadith navigation', usedIn: ['hadith_menu'] },
  { key: 'nav.dhikr', category: 'navigation', unicodeFallback: '📿', supportsKeyboardIcon: true, enabled: true, description: 'Dhikr & Dua section icon', semanticPurpose: 'Dhikr navigation', usedIn: ['dhikr_menu'] },
  { key: 'nav.ai', category: 'navigation', unicodeFallback: '💠', supportsKeyboardIcon: true, enabled: true, description: 'AI Islamic assistant icon', semanticPurpose: 'AI navigation', usedIn: ['ai_menu'] },
  { key: 'nav.profile', category: 'navigation', unicodeFallback: '👤', supportsKeyboardIcon: true, enabled: true, description: 'User profile icon', semanticPurpose: 'Profile navigation', usedIn: ['profile_menu'] },
  { key: 'nav.admin', category: 'navigation', unicodeFallback: '🛡️', supportsKeyboardIcon: true, enabled: true, description: 'Admin control panel icon', semanticPurpose: 'Admin navigation', usedIn: ['admin_menu'] },
  { key: 'nav.language', category: 'navigation', unicodeFallback: '🌐', supportsKeyboardIcon: true, enabled: true, description: 'Language selection icon', semanticPurpose: 'Language picker', usedIn: ['language_menu'] },
  { key: 'nav.settings', category: 'navigation', unicodeFallback: '⚙️', supportsKeyboardIcon: true, enabled: true, description: 'User settings icon', semanticPurpose: 'Settings navigation', usedIn: ['settings_menu'] },
  { key: 'nav.help', category: 'navigation', unicodeFallback: 'ℹ️', supportsKeyboardIcon: true, enabled: true, description: 'Help & guide icon', semanticPurpose: 'Help navigation', usedIn: ['help_menu'] },
  { key: 'nav.channels', category: 'navigation', unicodeFallback: '📢', supportsKeyboardIcon: true, enabled: true, description: 'Official Telegram channels icon', semanticPurpose: 'Channels navigation', usedIn: ['channels_menu'] },
  { key: 'nav.web', category: 'navigation', unicodeFallback: '🔗', supportsKeyboardIcon: true, enabled: true, description: 'Web App link icon', semanticPurpose: 'Web App button', usedIn: ['main_menu', 'android_menu'] },
  { key: 'nav.miniapp', category: 'navigation', unicodeFallback: '📱', supportsKeyboardIcon: true, enabled: true, description: 'Telegram Mini App / Android icon', semanticPurpose: 'Mobile/MiniApp button', usedIn: ['main_menu', 'reply_keyboard'] },
  { key: 'nav.back', category: 'navigation', unicodeFallback: '↩️', supportsKeyboardIcon: true, enabled: true, description: 'Return to previous menu icon', semanticPurpose: 'Back navigation', usedIn: ['all_inline_submenus'] },
  { key: 'nav.next', category: 'navigation', unicodeFallback: '➡️', supportsKeyboardIcon: true, enabled: true, description: 'Next page button icon', semanticPurpose: 'Next navigation', usedIn: ['pagination_controls'] },
  { key: 'nav.prev', category: 'navigation', unicodeFallback: '⬅️', supportsKeyboardIcon: true, enabled: true, description: 'Previous page button icon', semanticPurpose: 'Previous navigation', usedIn: ['pagination_controls'] },
  { key: 'prayer.fajr', category: 'prayer', unicodeFallback: '🌅', supportsKeyboardIcon: false, enabled: true, description: 'Bomdod / Fajr time indicator', semanticPurpose: 'Fajr prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.sunrise', category: 'prayer', unicodeFallback: '☀️', supportsKeyboardIcon: false, enabled: true, description: 'Sunrise time indicator', semanticPurpose: 'Sunrise prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.dhuhr', category: 'prayer', unicodeFallback: '🌤️', supportsKeyboardIcon: false, enabled: true, description: 'Peshin / Dhuhr time indicator', semanticPurpose: 'Dhuhr prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.asr', category: 'prayer', unicodeFallback: '🌇', supportsKeyboardIcon: false, enabled: true, description: 'Asr time indicator', semanticPurpose: 'Asr prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.maghrib', category: 'prayer', unicodeFallback: '🌆', supportsKeyboardIcon: false, enabled: true, description: 'Shom / Maghrib time indicator', semanticPurpose: 'Maghrib prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.isha', category: 'prayer', unicodeFallback: '🌌', supportsKeyboardIcon: false, enabled: true, description: 'Xufton / Isha time indicator', semanticPurpose: 'Isha prayer row', usedIn: ['prayer_card'] },
  { key: 'prayer.juma', category: 'prayer', unicodeFallback: '🕌', supportsKeyboardIcon: false, enabled: true, description: 'Juma prayer highlight', semanticPurpose: 'Juma highlight', usedIn: ['prayer_card'] },
  { key: 'content.tasbeh', category: 'content', unicodeFallback: '📿', supportsKeyboardIcon: false, enabled: true, description: 'Interactive Tasbeh counter', semanticPurpose: 'Tasbeh counter', usedIn: ['dhikr_card'] },
  { key: 'content.dua', category: 'content', unicodeFallback: '🤲', supportsKeyboardIcon: false, enabled: true, description: 'Dua & supplication header', semanticPurpose: 'Dua card header', usedIn: ['dua_cards'] },
  { key: 'ai.spark', category: 'ai', unicodeFallback: '💡', supportsKeyboardIcon: false, enabled: true, description: 'AI answer accent', semanticPurpose: 'AI reply header', usedIn: ['ai_chat_header'] },
  { key: 'profile.user', category: 'profile', unicodeFallback: '🪪', supportsKeyboardIcon: false, enabled: true, description: 'User profile card header', semanticPurpose: 'Profile card header', usedIn: ['profile_card'] },
  { key: 'admin.shield', category: 'admin', unicodeFallback: '🛡️', supportsKeyboardIcon: true, enabled: true, description: 'Admin security header', semanticPurpose: 'Admin security header', usedIn: ['admin_home', 'support_center'] },
  { key: 'language.globe', category: 'language', unicodeFallback: '🌐', supportsKeyboardIcon: true, enabled: true, description: 'Five-language selector icon', semanticPurpose: 'Language buttons', usedIn: ['language_menu', 'onboarding'] },
  { key: 'language.selected', category: 'language', unicodeFallback: '✅', supportsKeyboardIcon: true, enabled: true, description: 'Active language checkmark', semanticPurpose: 'Selected language', usedIn: ['language_menu'] },
  { key: 'settings.bell_on', category: 'settings', unicodeFallback: '🔔', supportsKeyboardIcon: true, enabled: true, description: 'Notifications enabled', semanticPurpose: 'Notification ON state', usedIn: ['settings_menu'] },
  { key: 'settings.bell_off', category: 'settings', unicodeFallback: '🔕', supportsKeyboardIcon: true, enabled: true, description: 'Notifications muted', semanticPurpose: 'Notification OFF state', usedIn: ['settings_menu'] },
  { key: 'settings.gear', category: 'settings', unicodeFallback: '⚙️', supportsKeyboardIcon: true, enabled: true, description: 'Preferences header icon', semanticPurpose: 'Preferences controls', usedIn: ['settings_menu'] },
  { key: 'status.ok', category: 'status', unicodeFallback: '✅', supportsKeyboardIcon: true, enabled: true, description: 'Success status', semanticPurpose: 'Success confirmation', usedIn: ['status_messages'] },
  { key: 'status.warn', category: 'status', unicodeFallback: '⚠️', supportsKeyboardIcon: true, enabled: true, description: 'Warning / rate-limit notice', semanticPurpose: 'Warning notice', usedIn: ['status_messages'] },
  { key: 'status.lock', category: 'status', unicodeFallback: '🔐', supportsKeyboardIcon: true, enabled: true, description: 'Security / admin access', semanticPurpose: 'Security notice', usedIn: ['admin_home'] },
  { key: 'channel.broadcast', category: 'channel', unicodeFallback: '📣', supportsKeyboardIcon: true, enabled: true, description: 'Channel publication indicator', semanticPurpose: 'Channel broadcasts', usedIn: ['channel_posts', 'broadcasts'] },
  { key: 'calendar.date', category: 'calendar', unicodeFallback: '📅', supportsKeyboardIcon: true, enabled: true, description: 'Gregorian & Hijri date indicator', semanticPurpose: 'Calendar dates', usedIn: ['prayer_calendar'] },
];

export interface FormattedEmojiMessage {
  text: string;
  entities: TelegramMessageEntity[];
  usedCustomEmojiCount: number;
  usedFallbackCount: number;
  omittedUnconfiguredCount: number;
}

export interface EmojiCompatibilityReport {
  totalRegisteredKeys: number;
  canonicalSlotsCount: number;
  verifiedCustomCount: number;
  enabledCustomCount: number;
  fallbackOnlyCount: number;
  missingCanonicalCount: number;
  strictZeroPlainEmojiMode: boolean;
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

export interface ExtractedCustomEmojiFromMessage {
  customEmojiId: string;
  glyph: string;
  offset: number;
  length: number;
}

export interface OwnerEmojiCaptureResult {
  ok: boolean;
  reason: 'registered' | 'no_custom_emoji_entity' | 'api_verification_failed' | 'unknown_key' | 'api_unconfigured';
  detectedCount: number;
  allDetected: ExtractedCustomEmojiFromMessage[];
  entry?: CustomEmojiEntry;
  ownerHasPremium?: boolean;
  error?: string;
}

/**
 * Inspects an incoming Telegram message's `entities` array for official
 * `type === 'custom_emoji'` entities using exact UTF-16 code unit slices.
 */
export function extractCustomEmojisFromMessage(
  message: Pick<TelegramApiMessage, 'text' | 'caption' | 'entities'>
): ExtractedCustomEmojiFromMessage[] {
  const sourceText = message.text || message.caption || '';
  const entities = Array.isArray(message.entities) ? message.entities : [];
  const results: ExtractedCustomEmojiFromMessage[] = [];

  for (const ent of entities) {
    if (
      ent &&
      ent.type === 'custom_emoji' &&
      typeof ent.custom_emoji_id === 'string' &&
      CUSTOM_EMOJI_ID_REGEX.test(ent.custom_emoji_id) &&
      ent.offset >= 0 &&
      ent.length > 0 &&
      ent.offset + ent.length <= sourceText.length
    ) {
      results.push({
        customEmojiId: ent.custom_emoji_id,
        glyph: sourceText.slice(ent.offset, ent.offset + ent.length),
        offset: ent.offset,
        length: ent.length,
      });
    }
  }
  return results;
}

export class CustomEmojiRegistry {
  private readonly entries = new Map<string, CustomEmojiEntry>();
  private premiumEnabled = false;
  private keyboardIconsEnabled = false;
  private readonly missingCategoryHits: Record<string, number> = {};
  private readonly usedSlotHits: Record<string, number> = {};
  private readonly keyboardIconWarnings: string[] = [];
  private readonly deliveryFailures: string[] = [];
  private outgoingAuditedCount = 0;
  private outgoingCleanCount = 0;
  private outgoingViolationCount = 0;

  constructor(
    initialEntries?: CustomEmojiEntry[],
    premiumEnabled = false,
    keyboardIconsEnabled = false
  ) {
    this.seedDefaults();
    this.hydrateFromEntries(initialEntries || [], premiumEnabled, keyboardIconsEnabled);
  }

  private seedDefaults(): void {
    const nowIso = new Date().toISOString();
    this.entries.clear();
    for (const seed of DEFAULT_EMOJI_SEEDS) {
      this.entries.set(seed.key, {
        ...seed,
        customEmojiId: null,
        verified: false,
        enabled: true,
        isCustomAdminSlot: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  /**
   * Reloads persisted custom emoji entries from Firestore/Repository on boot or after admin updates.
   * Preserves both built-in canonical/legacy slots AND Admin-created custom slots with zero data loss.
   */
  hydrateFromEntries(
    persistedEntries: CustomEmojiEntry[],
    premiumEnabled?: boolean,
    keyboardIconsEnabled?: boolean
  ): void {
    if (Array.isArray(persistedEntries)) {
      for (const item of persistedEntries) {
        if (!item?.key || typeof item.key !== 'string') continue;
        const validId =
          typeof item.customEmojiId === 'string' && CUSTOM_EMOJI_ID_REGEX.test(item.customEmojiId)
            ? item.customEmojiId
            : null;

        if (this.entries.has(item.key)) {
          const base = this.entries.get(item.key)!;
          this.entries.set(item.key, {
            ...base,
            ...item,
            unicodeFallback:
              typeof item.unicodeFallback === 'string' && item.unicodeFallback.trim().length > 0
                ? item.unicodeFallback
                : base.unicodeFallback,
            semanticPurpose: item.semanticPurpose || base.semanticPurpose,
            usedIn: Array.isArray(item.usedIn) && item.usedIn.length > 0 ? item.usedIn : base.usedIn,
            customEmojiId: validId,
            enabled: item.enabled !== false,
            verified: Boolean(validId && item.verified),
          });
        } else if (CUSTOM_EMOJI_KEY_REGEX.test(item.key)) {
          // Restore Admin-created custom slot from Firestore without losing data
          this.entries.set(item.key, {
            key: item.key,
            category: item.category || 'custom',
            unicodeFallback:
              typeof item.unicodeFallback === 'string' && item.unicodeFallback.trim().length > 0
                ? item.unicodeFallback
                : '⭐',
            customEmojiId: validId,
            stickerSetName: item.stickerSetName,
            supportsKeyboardIcon: item.supportsKeyboardIcon !== false,
            enabled: item.enabled !== false,
            verified: Boolean(validId && item.verified),
            verifiedAt: item.verifiedAt,
            description: item.description || item.key,
            semanticPurpose: item.semanticPurpose || item.description || item.key,
            usedIn: Array.isArray(item.usedIn) ? item.usedIn : ['custom_admin'],
            isCustomAdminSlot: true,
            updatedBy: item.updatedBy,
            createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
    if (typeof premiumEnabled === 'boolean') {
      this.premiumEnabled = premiumEnabled;
    }
    if (typeof keyboardIconsEnabled === 'boolean') {
      this.keyboardIconsEnabled = keyboardIconsEnabled;
    }
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

  recordKeyboardIconWarning(detail: string): void {
    const entry = `[${new Date().toISOString()}] ${detail}`;
    this.keyboardIconWarnings.unshift(entry);
    if (this.keyboardIconWarnings.length > 50) {
      this.keyboardIconWarnings.length = 50;
    }
  }

  recordDeliveryFailure(detail: string): void {
    const entry = `[${new Date().toISOString()}] ${detail}`;
    this.deliveryFailures.unshift(entry);
    if (this.deliveryFailures.length > 50) {
      this.deliveryFailures.length = 50;
    }
  }

  recordOutgoingAudit(clean: boolean): void {
    this.outgoingAuditedCount++;
    if (clean) this.outgoingCleanCount++;
    else this.outgoingViolationCount++;
  }

  private trackMissingCategory(key: string): void {
    const k = key || 'unmapped';
    this.missingCategoryHits[k] = (this.missingCategoryHits[k] || 0) + 1;
  }

  private trackUsedSlot(key: string): void {
    if (!key) return;
    this.usedSlotHits[key] = (this.usedSlotHits[key] || 0) + 1;
  }

  getActiveCustomEmojiId(key: SemanticEmojiKey | string): string | null {
    if (!this.premiumEnabled) return null;
    const direct = this.entries.get(key);
    const canonicalKey = LEGACY_KEY_TO_CANONICAL_FALLBACK[key];
    const canonical = canonicalKey ? this.entries.get(canonicalKey) : undefined;
    const resolved =
      direct && direct.enabled !== false && direct.verified && direct.customEmojiId
        ? direct
        : canonical && canonical.enabled !== false && canonical.verified && canonical.customEmojiId
          ? canonical
          : undefined;
    if (
      resolved &&
      resolved.customEmojiId &&
      CUSTOM_EMOJI_ID_REGEX.test(resolved.customEmojiId)
    ) {
      return resolved.customEmojiId;
    }
    return null;
  }

  getEntry(key: SemanticEmojiKey | string): CustomEmojiEntry | undefined {
    return this.entries.get(key);
  }

  listAll(): CustomEmojiEntry[] {
    return Array.from(this.entries.values());
  }

  listCanonicalSlots(): CustomEmojiEntry[] {
    return CANONICAL_EMOJI_SLOTS.map((slot) => this.entries.get(slot)!).filter(Boolean);
  }

  listCustomAdminSlots(): CustomEmojiEntry[] {
    return this.listAll().filter((e) => Boolean(e.isCustomAdminSlot));
  }

  listManagedSlots(): CustomEmojiEntry[] {
    return [...this.listCanonicalSlots(), ...this.listCustomAdminSlots()];
  }

  listMissingCanonicalSlots(): CustomEmojiEntry[] {
    return this.listCanonicalSlots().filter(
      (s) => !(s.verified && s.enabled !== false && s.customEmojiId && CUSTOM_EMOJI_ID_REGEX.test(s.customEmojiId))
    );
  }

  listByCategory(category: CustomEmojiCategory): CustomEmojiEntry[] {
    return this.listAll().filter((e) => e.category === category);
  }

  /**
   * Creates a new Admin custom emoji slot OR updates metadata + customEmojiId of an existing slot.
   */
  createOrUpdateSlot(params: {
    key: string;
    category?: CustomEmojiCategory;
    description?: string;
    semanticPurpose?: string;
    usedIn?: string[];
    customEmojiId?: string | null;
    verified?: boolean;
    enabled?: boolean;
    unicodeFallback?: string;
    stickerSetName?: string;
    supportsKeyboardIcon?: boolean;
    updatedBy?: string;
  }): CustomEmojiEntry {
    const cleanKey = params.key.trim().toLowerCase();
    if (!CUSTOM_EMOJI_KEY_REGEX.test(cleanKey)) {
      throw new Error(
        `Invalid emoji key "${params.key}". Use lowercase letters, digits, "_", "-" or "." (2-48 chars).`
      );
    }
    if (
      params.customEmojiId !== undefined &&
      params.customEmojiId !== null &&
      params.customEmojiId !== '' &&
      !CUSTOM_EMOJI_ID_REGEX.test(params.customEmojiId)
    ) {
      throw new Error(
        `Invalid Telegram custom_emoji_id format for "${cleanKey}". Expected numeric ID returned by Telegram.`
      );
    }

    const existing = this.entries.get(cleanKey);
    const nowIso = new Date().toISOString();
    const resolvedId =
      params.customEmojiId === undefined
        ? existing?.customEmojiId ?? null
        : params.customEmojiId === '' || params.customEmojiId === null
          ? null
          : params.customEmojiId;

    const updated: CustomEmojiEntry = {
      key: cleanKey,
      category: params.category || existing?.category || 'custom',
      unicodeFallback:
        params.unicodeFallback && params.unicodeFallback.trim().length > 0
          ? params.unicodeFallback.trim()
          : existing?.unicodeFallback || '⭐',
      customEmojiId: resolvedId,
      stickerSetName: params.stickerSetName ?? existing?.stickerSetName,
      supportsKeyboardIcon:
        params.supportsKeyboardIcon !== undefined
          ? Boolean(params.supportsKeyboardIcon)
          : existing?.supportsKeyboardIcon ?? true,
      enabled: params.enabled !== undefined ? Boolean(params.enabled) : existing?.enabled ?? true,
      verified:
        resolvedId !== null
          ? params.verified !== undefined
            ? Boolean(params.verified)
            : Boolean(existing?.verified && existing?.customEmojiId === resolvedId)
          : false,
      verifiedAt:
        resolvedId && params.verified
          ? nowIso
          : resolvedId && existing?.customEmojiId === resolvedId
            ? existing?.verifiedAt
            : undefined,
      description:
        params.description !== undefined
          ? params.description.trim().slice(0, 160) || existing?.description || cleanKey
          : existing?.description || cleanKey,
      semanticPurpose:
        params.semanticPurpose !== undefined
          ? params.semanticPurpose.trim().slice(0, 240)
          : existing?.semanticPurpose || params.description || cleanKey,
      usedIn:
        Array.isArray(params.usedIn) && params.usedIn.length > 0
          ? params.usedIn.slice(0, 30)
          : existing?.usedIn || ['custom_admin'],
      isCustomAdminSlot: existing ? Boolean(existing.isCustomAdminSlot) : true,
      updatedBy: params.updatedBy ?? existing?.updatedBy,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    this.entries.set(cleanKey, updated);
    return updated;
  }

  /**
   * Registers an owner-provided custom_emoji_id for a semantic key.
   * Remains verified=false unless verified via Telegram Bot API `getCustomEmojiStickers`.
   */
  registerCustomEmojiId(
    key: SemanticEmojiKey | string,
    customEmojiId: string | null,
    options?: {
      verified?: boolean;
      enabled?: boolean;
      unicodeFallback?: string;
      stickerSetName?: string;
      category?: CustomEmojiCategory;
      description?: string;
      semanticPurpose?: string;
      usedIn?: string[];
      updatedBy?: string;
    }
  ): CustomEmojiEntry {
    const existing = this.entries.get(key);
    if (!existing) {
      throw new Error(`Unknown semantic emoji key: ${key}`);
    }
    if (customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(customEmojiId)) {
      throw new Error(
        `Invalid Telegram custom_emoji_id format for "${key}". Expected numeric ID returned by Telegram.`
      );
    }

    const nowIso = new Date().toISOString();
    const updated: CustomEmojiEntry = {
      ...existing,
      customEmojiId,
      category: options?.category ?? existing.category,
      description: options?.description?.trim() || existing.description,
      semanticPurpose: options?.semanticPurpose?.trim() || existing.semanticPurpose,
      usedIn: Array.isArray(options?.usedIn) && options.usedIn.length > 0 ? options.usedIn : existing.usedIn,
      unicodeFallback:
        options?.unicodeFallback && options.unicodeFallback.trim().length > 0
          ? options.unicodeFallback.trim()
          : existing.unicodeFallback,
      enabled: options?.enabled !== undefined ? Boolean(options.enabled) : true,
      verified: Boolean(customEmojiId && options?.verified),
      verifiedAt: customEmojiId && options?.verified ? nowIso : undefined,
      stickerSetName: options?.stickerSetName ?? existing.stickerSetName,
      updatedBy: options?.updatedBy ?? existing.updatedBy,
      updatedAt: nowIso,
    };
    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Enables or disables a custom emoji slot without deleting its stored custom_emoji_id.
   */
  setEntryEnabled(
    key: SemanticEmojiKey | string,
    enabled: boolean,
    updatedBy?: string
  ): CustomEmojiEntry {
    const existing = this.entries.get(key);
    if (!existing) {
      throw new Error(`Unknown semantic emoji key: ${key}`);
    }
    const updated: CustomEmojiEntry = {
      ...existing,
      enabled: Boolean(enabled),
      updatedBy: updatedBy ?? existing.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Clears the bound `custom_emoji_id` on a slot (so it renders cleanly with NO visible plain emoji
   * until a new verified Telegram Premium Custom Emoji is bound by Admin).
   */
  resetEntryToUnicodeFallback(
    key: SemanticEmojiKey | string,
    updatedBy?: string
  ): CustomEmojiEntry {
    const existing = this.entries.get(key);
    if (!existing) {
      throw new Error(`Unknown semantic emoji key: ${key}`);
    }
    const seed = DEFAULT_EMOJI_SEEDS.find((s) => s.key === key);
    const updated: CustomEmojiEntry = {
      ...existing,
      customEmojiId: null,
      verified: false,
      verifiedAt: undefined,
      enabled: true,
      unicodeFallback: seed?.unicodeFallback || existing.unicodeFallback,
      updatedBy: updatedBy ?? existing.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Permanently deletes an Admin-created custom slot, OR clears the `customEmojiId` on
   * built-in canonical/system slots so system templates never break.
   */
  deleteSlot(
    key: string,
    updatedBy?: string
  ): { ok: boolean; permanentlyRemoved: boolean; entry?: CustomEmojiEntry } {
    const existing = this.entries.get(key);
    if (!existing) {
      return { ok: false, permanentlyRemoved: false };
    }
    if (existing.isCustomAdminSlot) {
      this.entries.delete(key);
      return { ok: true, permanentlyRemoved: true };
    }
    const cleared = this.resetEntryToUnicodeFallback(key, updatedBy);
    return { ok: true, permanentlyRemoved: false, entry: cleared };
  }

  /**
   * Admin `/emoji_setup` workflow handler:
   * Extracts `type === 'custom_emoji'` entities from an incoming Telegram message sent
   * from Telegram's Premium emoji picker, validates the ID via `getCustomEmojiStickers`,
   * and activates it cleanly in the registry.
   */
  async registerFromOwnerMessage(
    apiClient: TelegramApiClient,
    key: SemanticEmojiKey | string,
    message: TelegramApiMessage,
    updatedBy: string
  ): Promise<OwnerEmojiCaptureResult> {
    if (!this.entries.has(key)) {
      return {
        ok: false,
        reason: 'unknown_key',
        detectedCount: 0,
        allDetected: [],
        error: `Nomaʼlum emoji kategoriyasi: ${key}`,
      };
    }

    const detected = extractCustomEmojisFromMessage(message);
    if (detected.length === 0) {
      return {
        ok: false,
        reason: 'no_custom_emoji_entity',
        detectedCount: 0,
        allDetected: [],
        ownerHasPremium: Boolean(message.from?.is_premium),
        error:
          'Telegram Premium custom emoji aniqlanmadi. Oddiy Unicode emoji qabul qilinmaydi — iltimos, Telegram Premium emoji tanlagichidan tayyor Premium emojini yuboring.',
      };
    }

    if (!apiClient.isConfigured) {
      return {
        ok: false,
        reason: 'api_unconfigured',
        detectedCount: detected.length,
        allDetected: detected,
        ownerHasPremium: Boolean(message.from?.is_premium),
        error: 'TELEGRAM_BOT_TOKEN1 sozlanmagan; getCustomEmojiStickers orqali tekshirib boʻlmadi.',
      };
    }

    const primary = detected[0];
    const verifyRes = await apiClient.getCustomEmojiStickers([primary.customEmojiId]);
    const matchedSticker =
      verifyRes.ok && Array.isArray(verifyRes.result)
        ? verifyRes.result.find((s) => s.custom_emoji_id === primary.customEmojiId)
        : undefined;

    if (!matchedSticker) {
      return {
        ok: false,
        reason: 'api_verification_failed',
        detectedCount: detected.length,
        allDetected: detected,
        ownerHasPremium: Boolean(message.from?.is_premium),
        error:
          verifyRes.description ||
          `Telegram API getCustomEmojiStickers(${primary.customEmojiId}) tasdiqlamadi.`,
      };
    }

    const entry = this.registerCustomEmojiId(key, primary.customEmojiId, {
      verified: true,
      enabled: true,
      unicodeFallback: matchedSticker.emoji || primary.glyph || this.entries.get(key)?.unicodeFallback,
      stickerSetName: matchedSticker.set_name,
      updatedBy,
    });

    return {
      ok: true,
      reason: 'registered',
      detectedCount: detected.length,
      allDetected: detected,
      entry,
      ownerHasPremium: Boolean(message.from?.is_premium),
    };
  }

  /**
   * Direct-Emoji-First `/emoji_setup` helper:
   * Admin sends any Telegram Premium emoji directly -> bot inspects `message.entities`,
   * extracts the exact `custom_emoji_id`, verifies it via `getCustomEmojiStickers`,
   * and returns the verified candidate so the bot can ask which category to assign it to.
   */
  async verifyOwnerCustomEmojiFromMessage(
    apiClient: TelegramApiClient,
    message: TelegramApiMessage
  ): Promise<{
    ok: boolean;
    reason: 'verified' | 'no_custom_emoji_entity' | 'api_verification_failed' | 'api_unconfigured';
    detectedCount: number;
    allDetected: ExtractedCustomEmojiFromMessage[];
    customEmojiId?: string;
    fallbackUnicode?: string;
    stickerSetName?: string;
    ownerHasPremium?: boolean;
    error?: string;
  }> {
    const detected = extractCustomEmojisFromMessage(message);
    if (detected.length === 0) {
      return {
        ok: false,
        reason: 'no_custom_emoji_entity',
        detectedCount: 0,
        allDetected: [],
        ownerHasPremium: Boolean(message.from?.is_premium),
        error:
          'Telegram Premium custom emoji aniqlanmadi. Oddiy Unicode emoji qabul qilinmaydi — iltimos, Telegram Premium emoji tanlagichidan tayyor emojini yuboring.',
      };
    }
    if (!apiClient.isConfigured) {
      return {
        ok: false,
        reason: 'api_unconfigured',
        detectedCount: detected.length,
        allDetected: detected,
        ownerHasPremium: Boolean(message.from?.is_premium),
        error: 'TELEGRAM_BOT_TOKEN1 sozlanmagan; getCustomEmojiStickers orqali tekshirib boʻlmadi.',
      };
    }
    const primary = detected[0];
    const verifyRes = await apiClient.getCustomEmojiStickers([primary.customEmojiId]);
    const matchedSticker =
      verifyRes.ok && Array.isArray(verifyRes.result)
        ? verifyRes.result.find((s) => s.custom_emoji_id === primary.customEmojiId)
        : undefined;
    if (!matchedSticker) {
      return {
        ok: false,
        reason: 'api_verification_failed',
        detectedCount: detected.length,
        allDetected: detected,
        ownerHasPremium: Boolean(message.from?.is_premium),
        error:
          verifyRes.description ||
          `Telegram API getCustomEmojiStickers(${primary.customEmojiId}) ushbu ID ni tasdiqlamadi.`,
      };
    }
    return {
      ok: true,
      reason: 'verified',
      detectedCount: detected.length,
      allDetected: detected,
      customEmojiId: primary.customEmojiId,
      fallbackUnicode: matchedSticker.emoji || primary.glyph,
      stickerSetName: matchedSticker.set_name,
      ownerHasPremium: Boolean(message.from?.is_premium),
    };
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
        const targetGlyph = normalizeGlyphForLookup(entry.unicodeFallback);
        const match = customStickers.find(
          (s) => s.emoji && normalizeGlyphForLookup(s.emoji) === targetGlyph
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

    const ids = Array.from(new Set(candidates.map((c) => c.customEmojiId!)));
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
   * Resolves a semantic key.
   * STRICT ZERO-PLAIN-EMOJI RULE:
   * - When verified, enabled, and premiumEnabled: returns technical protocol anchor `glyph` + `customEmojiId` (`isPremiumActive: true`).
   * - Otherwise: returns `glyph: ''`, `customEmojiId: null`, `isPremiumActive: false` (NO visible plain Unicode emoji!).
   */
  resolve(key: SemanticEmojiKey | string): {
    glyph: string;
    customEmojiId: string | null;
    isPremiumActive: boolean;
    supportsKeyboardIcon: boolean;
    resolvedKey: string;
  } {
    const direct = this.entries.get(key);
    const canonicalKey = LEGACY_KEY_TO_CANONICAL_FALLBACK[key];
    const canonical = canonicalKey ? this.entries.get(canonicalKey) : undefined;

    const primaryEntry = direct || canonical;
    if (!primaryEntry) {
      return {
        glyph: '',
        customEmojiId: null,
        isPremiumActive: false,
        supportsKeyboardIcon: false,
        resolvedKey: key,
      };
    }

    const isUsableCustom = (e?: CustomEmojiEntry): e is CustomEmojiEntry & { customEmojiId: string } =>
      Boolean(
        this.premiumEnabled &&
          e &&
          e.enabled !== false &&
          e.verified &&
          e.customEmojiId &&
          CUSTOM_EMOJI_ID_REGEX.test(e.customEmojiId)
      );

    if (isUsableCustom(direct)) {
      this.trackUsedSlot(direct.key);
      return {
        glyph: direct.unicodeFallback || '⭐',
        customEmojiId: direct.customEmojiId,
        isPremiumActive: true,
        supportsKeyboardIcon: direct.supportsKeyboardIcon,
        resolvedKey: direct.key,
      };
    }

    if (isUsableCustom(canonical)) {
      this.trackUsedSlot(canonical.key);
      return {
        glyph: canonical.unicodeFallback || primaryEntry.unicodeFallback || '⭐',
        customEmojiId: canonical.customEmojiId,
        isPremiumActive: true,
        supportsKeyboardIcon: primaryEntry.supportsKeyboardIcon || canonical.supportsKeyboardIcon,
        resolvedKey: canonical.key,
      };
    }

    this.trackMissingCategory(canonical?.key || primaryEntry.key);
    return {
      glyph: '',
      customEmojiId: null,
      isPremiumActive: false,
      supportsKeyboardIcon: primaryEntry.supportsKeyboardIcon,
      resolvedKey: canonical?.key || primaryEntry.key,
    };
  }

  /**
   * Formats ANY message template containing `{{emoji:key}}` tokens AND/OR stray plain Unicode emojis
   * into strict 100% Premium Custom Emoji output + exact UTF-16 `custom_emoji` MessageEntities.
   *
   * - Active verified Premium Custom Emoji -> emits protocol anchor + `{ type: 'custom_emoji', offset, length, custom_emoji_id }`.
   * - Unconfigured / disabled / unmapped -> emits `""` (ZERO plain Unicode emoji) and swallows orphaned separator space.
   * - Preserves all 5 languages, Arabic Quran script verbatim, links, newlines, and punctuation.
   */
  formatMessage(template: string): FormattedEmojiMessage {
    const cleanSource = String(template || '').replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/gi, '');
    const combinedRegex = new RegExp(
      `\\{\\{emoji:([a-z0-9_.-]+)\\}\\}|${PLAIN_UNICODE_EMOJI_CLUSTER_REGEX.source}`,
      'giu'
    );

    const entities: TelegramMessageEntity[] = [];
    let output = '';
    let lastIndex = 0;
    let usedCustomEmojiCount = 0;
    let omittedUnconfiguredCount = 0;
    let swallowNextSingleSpace = false;

    const appendLiteral = (segment: string) => {
      if (!segment) return;
      let s = segment;
      if (swallowNextSingleSpace) {
        swallowNextSingleSpace = false;
        if (s.startsWith(' ')) {
          const prevChar = output.length > 0 ? output[output.length - 1] : '';
          if (!prevChar || prevChar === '\n' || prevChar === ' ' || prevChar === '(' || prevChar === '[' || prevChar === '«') {
            s = s.slice(1);
          } else if (s.startsWith('  ')) {
            s = s.slice(1);
          }
        }
      }
      output += s;
    };

    let match: RegExpExecArray | null;
    while ((match = combinedRegex.exec(cleanSource)) !== null) {
      appendLiteral(cleanSource.slice(lastIndex, match.index));

      const tokenKey = match[1];
      const lookupKey = tokenKey || lookupCanonicalKeyForUnicodeGlyph(match[0]) || '';
      const resolved = lookupKey ? this.resolve(lookupKey) : null;

      if (resolved && resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph.length > 0) {
        swallowNextSingleSpace = false;
        const offsetUtf16 = output.length;
        output += resolved.glyph;
        entities.push({
          type: 'custom_emoji',
          offset: offsetUtf16,
          length: resolved.glyph.length,
          custom_emoji_id: resolved.customEmojiId,
        });
        usedCustomEmojiCount++;
      } else {
        // Strict zero-plain-emoji rule: omit completely and clean orphaned space
        if (!lookupKey) {
          this.trackMissingCategory('unmapped_unicode');
        }
        omittedUnconfiguredCount++;
        swallowNextSingleSpace = true;
      }

      lastIndex = match.index + match[0].length;
    }

    appendLiteral(cleanSource.slice(lastIndex));

    return {
      text: output,
      entities,
      usedCustomEmojiCount,
      usedFallbackCount: omittedUnconfiguredCount,
      omittedUnconfiguredCount,
    };
  }

  /**
   * Formats AI-generated text (Gemini chat, voice, vision, Hifz coach, streaming drafts):
   * - Strips any hallucinated `<tg-emoji>` tags so Gemini can NEVER invent emoji IDs.
   * - Converts any accidental Unicode emojis to registered verified Premium emojis or removes them cleanly.
   * - Preserves Arabic script, links, code blocks, and all 5 languages.
   */
  formatAiResponse(rawAiText: string): FormattedEmojiMessage {
    return this.formatMessage(rawAiText);
  }

  /**
   * Renders a single semantic emoji safely for `parse_mode: 'HTML'` using official
   * `<tg-emoji emoji-id="REAL_ID">anchor</tg-emoji>` when verified & enabled,
   * or `""` (empty string — zero plain Unicode emoji) otherwise.
   */
  renderHtmlEmoji(key: SemanticEmojiKey | string): string {
    const resolved = this.resolve(key);
    const safeGlyph = escapeTelegramHtml(resolved.glyph);
    if (resolved.isPremiumActive && resolved.customEmojiId && safeGlyph) {
      return `<tg-emoji emoji-id="${resolved.customEmojiId}">${safeGlyph}</tg-emoji>`;
    }
    return '';
  }

  /**
   * Safely formats a plain template with `{{emoji:key}}` tokens into HTML (`parse_mode: 'HTML'`),
   * escaping all surrounding text and rendering verified Premium emojis as `<tg-emoji>`,
   * and omitting unconfigured/plain emojis cleanly (`""`).
   */
  formatHtmlMessage(template: string): {
    html: string;
    usedCustomEmojiCount: number;
    usedFallbackCount: number;
  } {
    const cleanSource = String(template || '').replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/gi, '');
    const combinedRegex = new RegExp(
      `\\{\\{emoji:([a-z0-9_.-]+)\\}\\}|${PLAIN_UNICODE_EMOJI_CLUSTER_REGEX.source}`,
      'giu'
    );
    let html = '';
    let lastIndex = 0;
    let usedCustomEmojiCount = 0;
    let omittedCount = 0;
    let swallowNextSingleSpace = false;

    const appendEscaped = (segment: string) => {
      if (!segment) return;
      let s = segment;
      if (swallowNextSingleSpace) {
        swallowNextSingleSpace = false;
        if (s.startsWith(' ')) {
          const prevChar = html.length > 0 ? html[html.length - 1] : '';
          if (!prevChar || prevChar === '\n' || prevChar === ' ' || prevChar === '>') {
            s = s.slice(1);
          }
        }
      }
      html += escapeTelegramHtml(s);
    };

    let match: RegExpExecArray | null;
    while ((match = combinedRegex.exec(cleanSource)) !== null) {
      appendEscaped(cleanSource.slice(lastIndex, match.index));
      const lookupKey = match[1] || lookupCanonicalKeyForUnicodeGlyph(match[0]) || '';
      const resolved = lookupKey ? this.resolve(lookupKey) : null;
      const safeGlyph = resolved ? escapeTelegramHtml(resolved.glyph) : '';
      if (resolved && resolved.isPremiumActive && resolved.customEmojiId && safeGlyph) {
        swallowNextSingleSpace = false;
        html += `<tg-emoji emoji-id="${resolved.customEmojiId}">${safeGlyph}</tg-emoji>`;
        usedCustomEmojiCount++;
      } else {
        omittedCount++;
        swallowNextSingleSpace = true;
      }
      lastIndex = match.index + match[0].length;
    }

    appendEscaped(cleanSource.slice(lastIndex));
    return { html, usedCustomEmojiCount, usedFallbackCount: omittedCount };
  }

  /**
   * Sanitizes an already-authored Telegram HTML string (preserving valid `<tg-emoji>` tags
   * and HTML markup like `<b>`, `<i>`, `<a href="...">`, `<code>`), replacing any stray
   * `{{emoji:key}}` or plain Unicode emoji outside tags with active `<tg-emoji>` or `""`.
   */
  sanitizeHtmlPayload(html: string): string {
    if (!html) return '';
    // Split on valid <tg-emoji>...</tg-emoji> or any HTML tag <...>
    const partRegex =
      /(<tg-emoji\b[^>]*\bemoji-id="(\d{1,64})"[^>]*>[\s\S]*?<\/tg-emoji>|<[^>]+>)/gi;
    let out = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const sanitizeTextSegment = (seg: string): string => {
      if (!seg) return '';
      const combined = new RegExp(
        `\\{\\{emoji:([a-z0-9_.-]+)\\}\\}|${PLAIN_UNICODE_EMOJI_CLUSTER_REGEX.source}`,
        'giu'
      );
      let res = '';
      let prev = 0;
      let swallowSpace = false;
      let m: RegExpExecArray | null;
      while ((m = combined.exec(seg)) !== null) {
        let lit = seg.slice(prev, m.index);
        if (swallowSpace && lit.startsWith(' ')) {
          lit = lit.slice(1);
        }
        swallowSpace = false;
        res += lit;
        const lookupKey = m[1] || lookupCanonicalKeyForUnicodeGlyph(m[0]) || '';
        const resolved = lookupKey ? this.resolve(lookupKey) : null;
        if (resolved && resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph) {
          res += `<tg-emoji emoji-id="${resolved.customEmojiId}">${escapeTelegramHtml(resolved.glyph)}</tg-emoji>`;
        } else {
          swallowSpace = true;
        }
        prev = m.index + m[0].length;
      }
      let tail = seg.slice(prev);
      if (swallowSpace && tail.startsWith(' ')) tail = tail.slice(1);
      res += tail;
      return res;
    };

    while ((match = partRegex.exec(html)) !== null) {
      out += sanitizeTextSegment(html.slice(lastIndex, match.index));
      const fullTag = match[1];
      const tgId = match[2];
      if (tgId) {
        // Keep genuine <tg-emoji> tag only if premiumEnabled and valid numeric ID
        if (this.premiumEnabled && CUSTOM_EMOJI_ID_REGEX.test(tgId)) {
          out += fullTag;
        }
      } else if (/^<tg-emoji\b/i.test(fullTag) || /^<\/tg-emoji>/i.test(fullTag)) {
        // Strip malformed tg-emoji tags
      } else {
        out += fullTag;
      }
      lastIndex = match.index + match[0].length;
    }
    out += sanitizeTextSegment(html.slice(lastIndex));
    return out;
  }

  /**
   * Gateway-level strict payload sanitizer for plain text + optional existing `TelegramMessageEntity[]`.
   * Preserves all valid existing `custom_emoji` entities and remaps UTF-16 offsets of all other entities
   * (`bold`, `url`, `code`, etc.) accurately while guaranteeing ZERO uncovered plain Unicode emojis!
   */
  enforceStrictEntitiesPayload(
    text: string,
    existingEntities?: TelegramMessageEntity[]
  ): { text: string; entities: TelegramMessageEntity[] } {
    const src = String(text || '');
    const srcEntities = Array.isArray(existingEntities) ? existingEntities : [];

    // Fast path: if no existing entities, just run formatMessage directly
    if (srcEntities.length === 0) {
      const fmt = this.formatMessage(src);
      return { text: fmt.text, entities: fmt.entities };
    }

    // Identify valid existing custom_emoji spans to preserve verbatim
    const validCustomSpans = srcEntities
      .filter(
        (e) =>
          e &&
          e.type === 'custom_emoji' &&
          typeof e.custom_emoji_id === 'string' &&
          CUSTOM_EMOJI_ID_REGEX.test(e.custom_emoji_id) &&
          e.offset >= 0 &&
          e.length > 0 &&
          e.offset + e.length <= src.length
      )
      .sort((a, b) => a.offset - b.offset);

    const otherEntities = srcEntities.filter((e) => e && e.type !== 'custom_emoji');

    // Build UTF-16 position mapping array: posMap[oldIdx] = newIdx
    const posMap = new Array<number>(src.length + 1).fill(0);
    let output = '';
    const newEntities: TelegramMessageEntity[] = [];

    const processUncoveredRange = (rangeStart: number, rangeEnd: number) => {
      if (rangeStart >= rangeEnd) return;
      const chunk = src.slice(rangeStart, rangeEnd);
      const combinedRegex = new RegExp(
        `\\{\\{emoji:([a-z0-9_.-]+)\\}\\}|${PLAIN_UNICODE_EMOJI_CLUSTER_REGEX.source}`,
        'giu'
      );
      let cursor = 0;
      let swallowSpace = false;
      let match: RegExpExecArray | null;

      const emitLiteralRange = (localStart: number, localEnd: number) => {
        for (let i = localStart; i < localEnd; i++) {
          const ch = chunk[i];
          posMap[rangeStart + i] = output.length;
          if (swallowSpace && ch === ' ') {
            const prevChar = output.length > 0 ? output[output.length - 1] : '';
            swallowSpace = false;
            if (!prevChar || prevChar === '\n' || prevChar === ' ' || prevChar === '(' || prevChar === '[') {
              continue;
            }
          }
          swallowSpace = false;
          output += ch;
        }
      };

      while ((match = combinedRegex.exec(chunk)) !== null) {
        emitLiteralRange(cursor, match.index);
        const matchStartGlobal = rangeStart + match.index;
        const matchLen = match[0].length;
        const outStart = output.length;

        const lookupKey = match[1] || lookupCanonicalKeyForUnicodeGlyph(match[0]) || '';
        const resolved = lookupKey ? this.resolve(lookupKey) : null;

        for (let k = 0; k < matchLen; k++) {
          posMap[matchStartGlobal + k] = outStart;
        }

        if (resolved && resolved.isPremiumActive && resolved.customEmojiId && resolved.glyph.length > 0) {
          swallowSpace = false;
          output += resolved.glyph;
          newEntities.push({
            type: 'custom_emoji',
            offset: outStart,
            length: resolved.glyph.length,
            custom_emoji_id: resolved.customEmojiId,
          });
        } else {
          swallowSpace = true;
        }
        cursor = match.index + matchLen;
      }

      emitLiteralRange(cursor, chunk.length);
    };

    let srcPos = 0;
    for (const span of validCustomSpans) {
      if (span.offset < srcPos) continue; // skip overlapping invalid span
      processUncoveredRange(srcPos, span.offset);
      const newOffset = output.length;
      const slice = src.slice(span.offset, span.offset + span.length);
      for (let i = 0; i < span.length; i++) {
        posMap[span.offset + i] = newOffset + i;
      }
      output += slice;
      newEntities.push({
        ...span,
        offset: newOffset,
        length: slice.length,
      });
      srcPos = span.offset + span.length;
    }

    processUncoveredRange(srcPos, src.length);
    posMap[src.length] = output.length;

    // Remap non-custom entities
    for (const ent of otherEntities) {
      const startOld = Math.max(0, Math.min(src.length, ent.offset));
      const endOld = Math.max(startOld, Math.min(src.length, ent.offset + ent.length));
      const newStart = posMap[startOld];
      const newEnd = posMap[endOld];
      if (newEnd > newStart) {
        newEntities.push({
          ...ent,
          offset: newStart,
          length: newEnd - newStart,
        });
      }
    }

    newEntities.sort((a, b) => a.offset - b.offset);
    return { text: output, entities: newEntities };
  }

  /**
   * Used when Telegram API rejects `custom_emoji` entities (HTTP 400):
   * Excises the underlying technical anchor characters completely AND strips any remaining
   * plain Unicode emojis so the retry NEVER leaks a visible plain Unicode emoji!
   */
  exciseCustomEmojiEntities(
    text: string,
    entities?: TelegramMessageEntity[]
  ): { text: string; entities: TelegramMessageEntity[] } {
    const src = String(text || '');
    const srcEntities = Array.isArray(entities) ? entities : [];
    const customSpans = srcEntities
      .filter((e) => e && e.type === 'custom_emoji' && e.offset >= 0 && e.length > 0)
      .sort((a, b) => a.offset - b.offset);
    const otherEntities = srcEntities.filter((e) => e && e.type !== 'custom_emoji');

    if (customSpans.length === 0) {
      return { text: stripPlainUnicodeEmojis(src), entities: [] };
    }

    const posMap = new Array<number>(src.length + 1).fill(0);
    let out = '';
    let srcIdx = 0;
    let swallowSpace = false;

    const copyRange = (from: number, to: number) => {
      for (let i = from; i < to; i++) {
        posMap[i] = out.length;
        const ch = src[i];
        if (swallowSpace && ch === ' ') {
          const prevChar = out.length > 0 ? out[out.length - 1] : '';
          swallowSpace = false;
          if (!prevChar || prevChar === '\n' || prevChar === ' ') continue;
        }
        swallowSpace = false;
        out += ch;
      }
    };

    for (const span of customSpans) {
      if (span.offset < srcIdx) continue;
      copyRange(srcIdx, span.offset);
      for (let k = span.offset; k < Math.min(src.length, span.offset + span.length); k++) {
        posMap[k] = out.length;
      }
      swallowSpace = true;
      srcIdx = Math.min(src.length, span.offset + span.length);
    }
    copyRange(srcIdx, src.length);
    posMap[src.length] = out.length;

    const remapped: TelegramMessageEntity[] = [];
    for (const ent of otherEntities) {
      const s = posMap[Math.max(0, Math.min(src.length, ent.offset))];
      const e = posMap[Math.max(0, Math.min(src.length, ent.offset + ent.length))];
      if (e > s) {
        remapped.push({ ...ent, offset: s, length: e - s });
      }
    }

    // Final guarantee: no stray plain emoji remains
    if (findUncoveredPlainEmojis(out).length > 0) {
      return { text: stripPlainUnicodeEmojis(out), entities: [] };
    }
    return { text: out, entities: remapped };
  }

  /**
   * Sanitizes ALL Reply & Inline keyboards before sending to Telegram:
   * - Strips ALL plain Unicode emojis and `{{emoji:...}}` tokens from button text.
   * - Auto-binds `icon_custom_emoji_id` if a recognized emoji was present and active in registry.
   * - Validates existing `icon_custom_emoji_id` and removes invalid ones with an Admin warning.
   */
  sanitizeReplyMarkup(markup?: TelegramReplyMarkup): TelegramReplyMarkup | undefined {
    if (!markup || typeof markup !== 'object') return markup;

    const cleanButton = <T extends { text: string; icon_custom_emoji_id?: string }>(btn: T): T => {
      const rawText = String(btn.text || '');
      let iconId = btn.icon_custom_emoji_id;

      // Validate existing icon_custom_emoji_id
      if (iconId && !CUSTOM_EMOJI_ID_REGEX.test(iconId)) {
        this.recordKeyboardIconWarning(`Invalid icon_custom_emoji_id "${iconId}" stripped from button "${rawText.slice(0, 30)}"`);
        iconId = undefined;
      }

      // If no icon_custom_emoji_id yet, inspect first emoji/token in text to auto-upgrade
      if (!iconId && this.keyboardIconsEnabled && this.premiumEnabled) {
        const tokenMatch = rawText.match(/\{\{emoji:([a-z0-9_.-]+)\}\}/i);
        const emojiMatch = rawText.match(PLAIN_UNICODE_EMOJI_CLUSTER_REGEX);
        const detectedKey =
          tokenMatch?.[1] || (emojiMatch?.[0] ? lookupCanonicalKeyForUnicodeGlyph(emojiMatch[0]) : null);
        if (detectedKey) {
          const resolved = this.resolve(detectedKey);
          if (resolved.isPremiumActive && resolved.supportsKeyboardIcon && resolved.customEmojiId) {
            iconId = resolved.customEmojiId;
          }
        }
      }

      let cleanedText = stripPlainUnicodeEmojis(rawText).trim();
      if (!cleanedText) {
        // Guard against icon-only buttons (e.g. a bare trash icon button)
        const emojiMatch = rawText.match(PLAIN_UNICODE_EMOJI_CLUSTER_REGEX);
        const key = emojiMatch?.[0] ? lookupCanonicalKeyForUnicodeGlyph(emojiMatch[0]) : null;
        cleanedText = key === 'error' ? 'Oʻchirish' : key === 'play' ? 'Tinglash' : 'Tanlash';
      }

      const clone: T = { ...btn, text: cleanedText };
      if (iconId) {
        clone.icon_custom_emoji_id = iconId;
      } else {
        delete clone.icon_custom_emoji_id;
      }
      return clone;
    };

    if ('inline_keyboard' in markup && Array.isArray(markup.inline_keyboard)) {
      return {
        inline_keyboard: markup.inline_keyboard.map((row) => row.map((b) => cleanButton(b))),
      };
    }
    if ('keyboard' in markup && Array.isArray(markup.keyboard)) {
      return {
        ...markup,
        keyboard: markup.keyboard.map((row) => row.map((b) => cleanButton(b))),
      };
    }
    return markup;
  }

  /**
   * Validates UTF-16 entity boundaries against the formatted message text.
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

    const plainLeaks = findUncoveredPlainEmojis(formatted.text, formatted.entities);
    if (plainLeaks.length > 0) {
      errors.push(`Uncovered plain Unicode emojis found: ${plainLeaks.map((l) => l.glyph).join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Builds an InlineKeyboardButton with official Bot API 9.4+ `icon_custom_emoji_id`
   * when verified & enabled, or clean emoji-free text otherwise (NEVER plain Unicode emoji!).
   */
  buildKeyboardButton(
    emojiKey: SemanticEmojiKey | string,
    label: string,
    action: { callback_data?: string; url?: string; web_app?: { url: string } }
  ): TelegramInlineKeyboardButton {
    const resolved = this.resolve(emojiKey);
    const cleanLabel = stripPlainUnicodeEmojis(label).trim() || label.trim();

    if (
      this.keyboardIconsEnabled &&
      resolved.supportsKeyboardIcon &&
      resolved.isPremiumActive &&
      resolved.customEmojiId
    ) {
      return {
        text: cleanLabel,
        icon_custom_emoji_id: resolved.customEmojiId,
        ...action,
      };
    }

    return {
      text: cleanLabel,
      ...action,
    };
  }

  /**
   * Builds a Reply KeyboardButton with official Bot API 9.4+ `icon_custom_emoji_id`
   * and strictly emoji-free localized text (matched emoji-agnostically by `matchReplyKeyboardAction`).
   */
  buildReplyKeyboardButton(
    emojiKey: SemanticEmojiKey | string,
    label: string,
    extra?: { web_app?: { url: string }; request_location?: boolean }
  ): TelegramKeyboardButton {
    const resolved = this.resolve(emojiKey);
    const cleanLabel = stripPlainUnicodeEmojis(label).trim() || label.trim();

    if (
      this.keyboardIconsEnabled &&
      resolved.supportsKeyboardIcon &&
      resolved.isPremiumActive &&
      resolved.customEmojiId
    ) {
      return {
        text: cleanLabel,
        icon_custom_emoji_id: resolved.customEmojiId,
        ...(extra || {}),
      };
    }
    return {
      text: cleanLabel,
      ...(extra || {}),
    };
  }

  /**
   * Sends a single-slot live preview message + button to an Admin chat so the owner can
   * visually verify how that exact Premium Custom Emoji renders in Telegram.
   */
  async sendSingleEmojiPreview(
    apiClient: TelegramApiClient,
    chatId: number | string,
    key: string
  ): Promise<{
    ok: boolean;
    messageId?: number;
    isPremiumActive: boolean;
    customEmojiId: string | null;
    error?: string;
  }> {
    const entry = this.entries.get(key);
    if (!entry) {
      return { ok: false, isPremiumActive: false, customEmojiId: null, error: `Unknown slot: ${key}` };
    }
    const resolved = this.resolve(key);
    const sample = this.formatMessage(
      `{{emoji:${key}}} ASAKA ZIYO — Premium Emoji Preview\n\n` +
        `• Kategoriya: ${entry.key} (${entry.category})\n` +
        `• Vazifasi: ${entry.semanticPurpose || entry.description}\n` +
        `• Holati: ${resolved.isPremiumActive ? 'FAOL (Telegram Premium Custom Emoji)' : 'SOZLANMAGAN / OʻCHIRILGAN (boʻsh koʻrinadi, oddiy emoji chiqmaydi)'}\n` +
        `• custom_emoji_id: ${entry.customEmojiId || 'bogʻlanmagan'}`
    );

    const res = await apiClient.sendMessage({
      chat_id: chatId,
      text: sample.text,
      ...(sample.entities.length > 0 ? { entities: sample.entities } : {}),
      reply_markup: {
        inline_keyboard: [
          [
            this.buildKeyboardButton(key, `Test tugma: ${entry.key}`, {
              callback_data: `admin:emoji:slot:${entry.key}`,
            }),
          ],
          [
            this.buildKeyboardButton('back', 'Premium Emoji Manager', {
              callback_data: 'admin:emoji:home:0',
            }),
          ],
        ],
      },
    });

    return {
      ok: res.ok,
      messageId: res.result?.message_id,
      isPremiumActive: resolved.isPremiumActive,
      customEmojiId: resolved.customEmojiId,
      error: res.ok ? undefined : res.description,
    };
  }

  /**
   * Sends a live diagnostic test message + inline keyboard to a Telegram chat to prove real
   * Telegram API acceptance of `custom_emoji` entities and `icon_custom_emoji_id` with ZERO plain emojis.
   */
  async sendLiveEmojiTestMessage(
    apiClient: TelegramApiClient,
    chatId: number | string
  ): Promise<{
    ok: boolean;
    messageId?: number;
    usedCustomEmojiCount: number;
    usedFallbackCount: number;
    usedKeyboardCustomIcons: number;
    plainEmojiLeakCount: number;
    error?: string;
  }> {
    const sample = this.formatMessage(
      '{{emoji:home}} ASAKA ZIYO — 100% Premium Custom Emoji Test (Bot API 9.4+)\n\n' +
        '{{emoji:prayer}} Namoz vaqtlari | {{emoji:quran}} Qurʼon | {{emoji:quran_mp3}} Qurʼon MP3\n' +
        '{{emoji:hifz}} Hifz | {{emoji:hadith}} Hadis | {{emoji:dhikr}} Zikr | {{emoji:ai_assistant}} AI\n' +
        '{{emoji:profile}} Profil | {{emoji:notifications}} Bildirishnomalar | {{emoji:success}} Tayyor'
    );
    const check = this.validateFormattedEntities(sample);
    const plainLeaks = findUncoveredPlainEmojis(sample.text, sample.entities);
    if (!check.valid) {
      return {
        ok: false,
        usedCustomEmojiCount: sample.usedCustomEmojiCount,
        usedFallbackCount: sample.usedFallbackCount,
        usedKeyboardCustomIcons: 0,
        plainEmojiLeakCount: plainLeaks.length,
        error: `Entity validation failed: ${check.errors.join('; ')}`,
      };
    }

    const testRow = [
      this.buildKeyboardButton('quran_mp3', 'Qurʼon MP3', { callback_data: 'qmp3:home' }),
      this.buildKeyboardButton('hifz', 'Hifz', { callback_data: 'hifz:home' }),
      this.buildKeyboardButton('prayer', 'Namoz', { callback_data: 'nav:prayer' }),
    ];
    const usedKeyboardCustomIcons = testRow.filter((b) => Boolean(b.icon_custom_emoji_id)).length;

    const res = await apiClient.sendMessage({
      chat_id: chatId,
      text: sample.text,
      ...(sample.entities.length > 0 ? { entities: sample.entities } : {}),
      reply_markup: {
        inline_keyboard: [
          testRow,
          [this.buildKeyboardButton('back', 'Premium Emoji Manager', { callback_data: 'admin:emoji:home:0' })],
        ],
      },
    });

    return {
      ok: res.ok,
      messageId: res.result?.message_id,
      usedCustomEmojiCount: sample.usedCustomEmojiCount,
      usedFallbackCount: sample.usedFallbackCount,
      usedKeyboardCustomIcons,
      plainEmojiLeakCount: plainLeaks.length,
      error: res.ok ? undefined : res.description,
    };
  }

  validateCompatibility(): EmojiCompatibilityReport {
    const all = this.listAll();
    const invalidEntries: string[] = [];
    let verifiedCustomCount = 0;
    let enabledCustomCount = 0;

    for (const entry of all) {
      if (!entry.unicodeFallback || entry.unicodeFallback.trim().length === 0) {
        invalidEntries.push(`${entry.key}: missing technical anchor`);
      }
      if (entry.customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(entry.customEmojiId)) {
        invalidEntries.push(`${entry.key}: invalid customEmojiId format`);
      }
      if (entry.verified && !entry.customEmojiId) {
        invalidEntries.push(`${entry.key}: verified=true without customEmojiId`);
      }
      if (entry.verified && entry.customEmojiId) {
        verifiedCustomCount++;
        if (entry.enabled !== false) {
          enabledCustomCount++;
        }
      }
    }

    const missingCanonicalCount = this.listMissingCanonicalSlots().length;

    return {
      totalRegisteredKeys: all.length,
      canonicalSlotsCount: CANONICAL_EMOJI_SLOTS.length,
      verifiedCustomCount,
      enabledCustomCount,
      fallbackOnlyCount: all.length - enabledCustomCount,
      missingCanonicalCount,
      strictZeroPlainEmojiMode: true,
      premiumRenderingActive: this.premiumEnabled && enabledCustomCount > 0,
      keyboardCustomIconsActive:
        this.keyboardIconsEnabled && this.premiumEnabled && enabledCustomCount > 0,
      invalidEntries,
    };
  }

  /**
   * Scans `telegram/` production source files (excluding internal technical anchor registry & tests)
   * for any leftover plain Unicode emoji literals.
   */
  scanCodebaseForPlainEmojis(telegramDir?: string): Array<{ file: string; count: number; samples: string[] }> {
    const root = telegramDir || path.resolve(process.cwd(), 'telegram');
    if (!fs.existsSync(root)) return [];

    const results: Array<{ file: string; count: number; samples: string[] }> = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'tests' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (entry.name.endsWith('.ts')) {
          // Skip the internal protocol anchor registry itself
          if (entry.name === 'customEmojiRegistry.ts') continue;
          const content = fs.readFileSync(full, 'utf8');
          const matches = content.match(PLAIN_UNICODE_EMOJI_CLUSTER_REGEX);
          if (matches && matches.length > 0) {
            results.push({
              file: path.relative(process.cwd(), full).replace(/\\/g, '/'),
              count: matches.length,
              samples: Array.from(new Set(matches)).slice(0, 8),
            });
          }
        }
      }
    };
    try {
      walk(root);
    } catch {
      // ignore FS errors in restricted runtimes
    }
    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Builds a comprehensive Admin Audit & Test Panel report covering all 12 required metrics.
   */
  buildFullAuditReport(options?: { scanCodebase?: boolean }): TelegramEmojiAuditReport {
    const all = this.listAll();
    const canonical = this.listCanonicalSlots();
    const customSlots = this.listCustomAdminSlots();

    const workingVerified = all.filter(
      (e) =>
        e.verified &&
        e.enabled !== false &&
        e.customEmojiId &&
        CUSTOM_EMOJI_ID_REGEX.test(e.customEmojiId)
    );
    const disabled = all.filter((e) => e.enabled === false);
    const invalidOrUnverifiedKeys = all
      .filter((e) => e.customEmojiId !== null && (!e.verified || !CUSTOM_EMOJI_ID_REGEX.test(e.customEmojiId)))
      .map((e) => e.key);

    const missingCanonicalKeys = this.listMissingCanonicalSlots().map((e) => e.key);
    const unusedRegisteredKeys = workingVerified
      .filter((e) => !this.usedSlotHits[e.key] && (!e.usedIn || e.usedIn.length === 0))
      .map((e) => e.key);

    const codebasePlainEmojiMatches = options?.scanCodebase
      ? this.scanCodebaseForPlainEmojis()
      : [];

    return {
      generatedAt: new Date().toISOString(),
      strictZeroPlainEmojiMode: true,
      premiumEnabled: this.premiumEnabled,
      keyboardIconsEnabled: this.keyboardIconsEnabled,
      totalRegistered: all.length,
      canonicalTotal: canonical.length,
      canonicalConfigured: canonical.length - missingCanonicalKeys.length,
      customAdminSlotsCount: customSlots.length,
      workingVerifiedCount: workingVerified.length,
      disabledCount: disabled.length,
      invalidOrUnverifiedKeys,
      unusedRegisteredKeys,
      missingCanonicalKeys,
      missingCategoryHits: { ...this.missingCategoryHits },
      codebasePlainEmojiMatches,
      outgoingPayloadAudit: {
        auditedCount: this.outgoingAuditedCount,
        cleanCount: this.outgoingCleanCount,
        violationCount: this.outgoingViolationCount,
        passed: this.outgoingViolationCount === 0,
      },
      keyboardIconWarnings: this.keyboardIconWarnings.slice(0, 20),
      deliveryFailures: this.deliveryFailures.slice(0, 20),
    };
  }
}
