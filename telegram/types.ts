/**
 * ASAKA ZIYO — Telegram Platform Core TypeScript Types
 *
 * Isolated domain & Telegram Bot API types for the Telegram Platform module.
 * Supports exactly the 5 official ASAKA ZIYO languages.
 */

export type TelegramLocale = 'uz-Latn' | 'uz-Cyrl' | 'uz-Latn-new' | 'ru' | 'en';

export const TELEGRAM_SUPPORTED_LOCALES: readonly TelegramLocale[] = [
  'uz-Latn',
  'uz-Cyrl',
  'uz-Latn-new',
  'ru',
  'en',
] as const;

// ---------------------------------------------------------------------------
// Minimal Typed Telegram Bot API Subsets (Zero external dependency bloat)
// ---------------------------------------------------------------------------

export interface TelegramApiUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramApiChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessageEntity {
  type:
    | 'mention'
    | 'hashtag'
    | 'bot_command'
    | 'url'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  custom_emoji_id?: string;
}

export interface TelegramApiMessage {
  message_id: number;
  from?: TelegramApiUser;
  chat: TelegramApiChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramApiCallbackQuery {
  id: string;
  from: TelegramApiUser;
  message?: TelegramApiMessage;
  chat_instance?: string;
  data?: string;
}

export interface TelegramApiUpdate {
  update_id: number;
  message?: TelegramApiMessage;
  edited_message?: TelegramApiMessage;
  callback_query?: TelegramApiCallbackQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  /**
   * Optional Bot API icon_custom_emoji_id (only attached when verified & bot-eligible).
   */
  icon_custom_emoji_id?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramBotProfile {
  id: number;
  is_bot: true;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  can_connect_to_business?: boolean;
  has_main_web_app?: boolean;
}

export interface TelegramStickerInfo {
  file_id: string;
  file_unique_id: string;
  type: string;
  custom_emoji_id?: string;
  emoji?: string;
  is_animated?: boolean;
  is_video?: boolean;
}

export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Isolated Telegram Platform Database Models (telegram* collections ONLY)
// ---------------------------------------------------------------------------

export type TelegramAdminRole = 'owner' | 'admin' | 'editor' | 'moderator';

export interface TelegramUserRecord {
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  language: TelegramLocale;
  languageSelectedManually: boolean;
  prayerNotificationsEnabled: boolean;
  dailyWisdomEnabled: boolean;
  announcementsEnabled: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  interactionCount: number;
}

export interface TelegramBotSettingsRecord {
  id: 'default';
  defaultLanguage: TelegramLocale;
  maintenanceMode: boolean;
  premiumEmojiEnabled: boolean;
  premiumEmojiEligibilityVerified: boolean;
  premiumEmojiEligibilityCheckedAt?: string;
  premiumEmojiEligibilityReason?: string;
  miniAppEnabled: boolean;
  aiAssistantEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TelegramChannelRecord {
  id: string;
  username: string;
  chatId?: string;
  title: string;
  isPrimary: boolean;
  isActive: boolean;
  autoPublishPrayerTimes: boolean;
  autoPublishAnnouncements: boolean;
  language: TelegramLocale;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramAdminRecord {
  telegramId: string;
  role: TelegramAdminRole;
  displayName: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TelegramPublicationRecord {
  id: string;
  channelId: string;
  channelUsername: string;
  category: 'prayer_times' | 'announcement' | 'wisdom' | 'news' | 'manual';
  language: TelegramLocale;
  textPreview: string;
  telegramMessageId?: number;
  status: 'queued' | 'sent' | 'failed';
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
}

export interface TelegramAuditLogRecord {
  id: string;
  actorTelegramId: string;
  actorRole: 'user' | TelegramAdminRole | 'system';
  action: string;
  targetType: 'user' | 'settings' | 'channel' | 'admin' | 'publication' | 'emoji' | 'webhook' | 'system';
  targetId?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export type CustomEmojiCategory =
  | 'brand'
  | 'navigation'
  | 'prayer'
  | 'language'
  | 'settings'
  | 'status'
  | 'channel'
  | 'calendar';

export interface CustomEmojiEntry {
  key: string;
  category: CustomEmojiCategory;
  unicodeFallback: string;
  /**
   * Verified Telegram custom_emoji_id (numeric string from Bot API getCustomEmojiStickers).
   * MUST NEVER be invented. Remains null until registered & verified against Telegram Bot API.
   */
  customEmojiId: string | null;
  verified: boolean;
  verifiedAt?: string;
  stickerSetName?: string;
  supportsKeyboardIcon: boolean;
  description: string;
  updatedAt: string;
}
