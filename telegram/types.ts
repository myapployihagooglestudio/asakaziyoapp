/**
 * ASAKA ZIYO — Telegram Super Platform Core TypeScript Types
 *
 * Isolated domain & Telegram Bot API types for the Telegram Platform module.
 * Supports strictly the 5 official ASAKA ZIYO languages.
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
// Typed Telegram Bot API Subsets
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

export interface TelegramApiPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramApiVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramApiAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramApiDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramApiVideo {
  file_id: string;
  file_unique_id: string;
  duration: number;
  width: number;
  height: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramApiFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface TelegramApiMessage {
  message_id: number;
  from?: TelegramApiUser;
  chat: TelegramApiChat;
  date: number;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  voice?: TelegramApiVoice;
  audio?: TelegramApiAudio;
  photo?: TelegramApiPhotoSize[];
  document?: TelegramApiDocument;
  video?: TelegramApiVideo;
  location?: {
    latitude: number;
    longitude: number;
  };
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

export type TelegramButtonStyle = 'primary' | 'success' | 'danger' | 'link';

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  icon_custom_emoji_id?: string;
  style?: TelegramButtonStyle;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramKeyboardButton {
  text: string;
  web_app?: { url: string };
  request_location?: boolean;
  icon_custom_emoji_id?: string;
  style?: TelegramButtonStyle;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
}

// ---------------------------------------------------------------------------
// Telegram Bot API 10.1–10.4 Types (Rich Messages, Streaming Drafts, Widgets)
// ---------------------------------------------------------------------------

export interface RichTextCustomEmoji {
  type: 'custom_emoji';
  custom_emoji_id: string;
  alternative_text: string;
}

export interface RichTextPlain {
  type: 'plain';
  text: string;
}

export interface RichTextBold {
  type: 'bold';
  text: InputRichText;
}

export interface RichTextItalic {
  type: 'italic';
  text: InputRichText;
}

export interface RichTextCode {
  type: 'code';
  text: string;
}

export interface RichTextLink {
  type: 'link';
  text: InputRichText;
  url: string;
}

export interface RichTextConcatenation {
  type: 'concatenation';
  texts: InputRichText[];
}

export type InputRichText =
  | string
  | RichTextPlain
  | RichTextBold
  | RichTextItalic
  | RichTextCode
  | RichTextLink
  | RichTextCustomEmoji
  | RichTextConcatenation;

export interface RichMessageButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  icon_custom_emoji_id?: string;
  style?: TelegramButtonStyle;
}

export type InputRichBlock =
  | { type: 'section_heading'; text: InputRichText }
  | { type: 'paragraph'; text: InputRichText }
  | { type: 'divider' }
  | {
      type: 'list';
      items: Array<{ text: InputRichText }>;
      is_ordered?: boolean;
    }
  | {
      type: 'table';
      header?: InputRichText[];
      rows: InputRichText[][];
      is_compact?: boolean;
    }
  | {
      type: 'expandable_blockquote';
      title?: InputRichText;
      blocks: InputRichBlock[];
    }
  | {
      type: 'buttons';
      buttons: RichMessageButton[][];
    }
  | {
      type: 'photo';
      photo: string;
      caption?: InputRichText;
    }
  | {
      type: 'audio';
      audio: string;
      title?: string;
      performer?: string;
      caption?: InputRichText;
    }
  | {
      type: 'video';
      video: string;
      caption?: InputRichText;
    };

export interface SendRichMessageParams {
  chat_id: number | string;
  blocks: InputRichBlock[];
  reply_markup?: TelegramReplyMarkup;
  disable_notification?: boolean;
  protect_content?: boolean;
}

export interface SendMessageDraftParams {
  chat_id: number | string;
  draft_id: number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  entities?: TelegramMessageEntity[];
  can_stop?: boolean;
  keep_on_stop?: boolean;
}

export interface SendWidgetParams {
  chat_id: number | string;
  html: string;
  is_shared?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_markup?: TelegramReplyMarkup;
}

export interface TelegramReplyKeyboardRemove {
  remove_keyboard: true;
}

export type TelegramReplyMarkup =
  | TelegramInlineKeyboardMarkup
  | TelegramReplyKeyboardMarkup
  | TelegramReplyKeyboardRemove;

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
  set_name?: string;
}

export interface TelegramStickerSet {
  name: string;
  title: string;
  sticker_type: 'regular' | 'mask' | 'custom_emoji';
  stickers: TelegramStickerInfo[];
}

export interface TelegramChatMemberInfo {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  user: TelegramApiUser;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_delete_messages?: boolean;
  can_manage_chat?: boolean;
}

export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

// ---------------------------------------------------------------------------
// Isolated Telegram Platform Database Models (telegram* collections ONLY)
// ---------------------------------------------------------------------------

export type TelegramAdminRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'content_manager'
  | 'support_manager'
  | 'analyst';

export type TelegramUserFlowState =
  | { type: 'idle' }
  | { type: 'quran_search' }
  | { type: 'hadith_search' }
  | { type: 'khatm_set_days' }
  | { type: 'tasbeh_set_goal'; dhikrIndex: number }
  | { type: 'global_search' }
  | { type: 'support_new'; category: TelegramSupportTicketCategory }
  | { type: 'support_reply'; ticketId: string }
  | { type: 'admin_ticket_reply'; ticketId: string }
  | { type: 'admin_user_search' }
  | { type: 'admin_broadcast_title' }
  | { type: 'admin_broadcast_body'; title: string; segment: TelegramBroadcastSegment }
  | { type: 'admin_ai_set_model'; which: 'primary' | 'fallback' }
  | { type: 'admin_channel_post_draft'; channelId: string }
  | { type: 'admin_prayer_edit'; prayerKey: string }
  | { type: 'admin_cms_create_title'; entityType: 'article' | 'news' | 'announcement' | 'hadith' }
  | { type: 'admin_cms_create_body'; entityType: 'article' | 'news' | 'announcement' | 'hadith'; title: string }
  | { type: 'admin_channel_connect' }
  | { type: 'register_first_name'; mode?: 'register' | 'edit' }
  | { type: 'register_last_name'; firstName: string; mode?: 'register' | 'edit' }
  | { type: 'register_confirm'; firstName: string; lastName: string; mode?: 'register' | 'edit' }
  | { type: 'profile_edit_first_name' }
  | { type: 'profile_edit_last_name'; firstName: string }
  | { type: 'hifz_mark_range'; surahNumber: number }
  | { type: 'hifz_set_goal_ayahs' }
  | { type: 'hifz_set_goal_minutes' }
  | { type: 'hifz_new_goal_ayahs' }
  | { type: 'hifz_new_goal_minutes' }
  | { type: 'hifz_coach_ask' }
  | { type: 'hifz_audio_check'; surahNumber: number; startAyah: number; endAyah: number }
  | { type: 'hifz_log_difficult'; surahNumber: number }
  | { type: 'hifz_group_create' }
  | { type: 'admin_emoji_capture'; key: string }
  | {
      type: 'admin_emoji_pending_category';
      customEmojiId: string;
      fallbackUnicode: string;
      stickerSetName?: string;
    }
  | { type: 'admin_style_edit_template'; templateKey: string }
  | { type: 'quran_mp3_search'; reciterId?: string }
  | { type: 'admin_audio_add_reciter' }
  | { type: 'admin_audio_upload_track'; reciterId: string; surahNumber: number }
  | { type: 'admin_audio_bulk_manifest'; reciterId: string }
  | { type: 'personal_reminder_add' }
  | { type: 'notif_custom_lead_minutes' }
  | { type: 'privacy_delete_confirm' }
  | { type: 'admin_emoji_create_custom' };

export interface TelegramCentralAdminWriter {
  updatePrayerTime: (input: {
    prayerKey: string;
    newTime: string;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; error?: string; updatedLabel?: string }>;
  createContentItem: (input: {
    entityType: 'article' | 'news' | 'announcement' | 'hadith';
    title: string;
    body: string;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; id?: string; error?: string }>;
  deleteContentItem: (input: {
    entityType: 'article' | 'news' | 'announcement' | 'hadith';
    id: string;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  saveReciter?: (input: {
    reciter: Record<string, unknown>;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; id?: string; error?: string }>;
  saveSurahAudioOverride?: (input: {
    reciterId: string;
    surahNumber: number;
    override: Record<string, unknown>;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  uploadSurahAudioBuffer?: (input: {
    reciterId: string;
    surahNumber: number;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
    durationSeconds?: number;
    actorTelegramId: string;
  }) => Promise<{ ok: boolean; record?: Record<string, unknown>; error?: string }>;
}

export type TelegramPrayerNotificationKey =
  | 'tahajjud'
  | 'subh'
  | 'bomdod'
  | 'peshin'
  | 'asr'
  | 'shom'
  | 'xufton'
  | 'juma';

export interface TelegramUserNotificationPreferences {
  prayers: Record<TelegramPrayerNotificationKey, boolean>;
  /** Multi-select pre-prayer lead times in minutes (e.g. [15, 5, 0]) */
  leadMinutes?: number[];
  /** Optional custom lead time in minutes (1..120) */
  customLeadMinutes?: number | null;
  /** Timezone identifier (defaults to Asia/Tashkent) */
  timezone?: string;
  adhanAudioTrackId: 'none' | 'makkah' | 'madinah' | 'asaka';
  quietHoursEnabled?: boolean;
  quietHoursStart: string | null; // "HH:MM" Asia/Tashkent, e.g. "23:00"
  quietHoursEnd: string | null;   // "HH:MM" Asia/Tashkent, e.g. "04:30"
  dailyBriefEnabled: boolean;
  verseOfDayEnabled: boolean;
  hadithOfDayEnabled?: boolean;
  dhikrReminderEnabled?: boolean;
  hifzMurojaaEnabled?: boolean;
  hifzNewEnabled?: boolean;
  quranAudioUpdatesEnabled?: boolean;
  newContentEnabled: boolean;
  appUpdatesEnabled: boolean;
  botUpdatesEnabled?: boolean;
  adminRepliesEnabled: boolean;
}

export interface TelegramNotificationHistoryEntry {
  id: string;
  kind: 'prayer' | 'daily_brief' | 'hifz' | 'announcement' | 'support_reply' | 'app_update' | 'reminder';
  category?: string;
  title: string;
  sentAt: string;
  dateKey: string;
}

export interface TelegramUserRecord {
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  /** User-confirmed registered names (never overwritten by Telegram sync) */
  registeredFirstName?: string;
  registeredLastName?: string;
  /** Raw Telegram profile metadata captured automatically */
  telegramFirstName?: string;
  telegramLastName?: string;
  profileCompleted?: boolean;
  profileRegisteredAt?: string;
  profileUpdatedAt?: string;
  language: TelegramLocale;
  languageSelectedManually: boolean;
  prayerNotificationsEnabled: boolean;
  dailyWisdomEnabled: boolean;
  announcementsEnabled: boolean;
  notificationPreferences?: TelegramUserNotificationPreferences;
  notificationHistory?: TelegramNotificationHistoryEntry[];
  personalReminders?: TelegramPersonalReminder[];
  isBlocked: boolean;
  onboardingCompleted?: boolean;
  stoppedByUser?: boolean;
  stoppedAt?: string;
  selectedServices?: string[];
  referralSource?: string;
  activeFlow?: TelegramUserFlowState;
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
  premiumKeyboardIconsEnabled?: boolean;
  premiumEmojiEligibilityVerified: boolean;
  premiumEmojiEligibilityCheckedAt?: string;
  premiumEmojiEligibilityReason?: string;
  /** Bot API 9.4+ button styles (primary / success / danger) */
  buttonStylesEnabled?: boolean;
  /** Bot API 10.1-10.3 Rich Messages with automatic plain-text fallback */
  richMessagesEnabled?: boolean;
  /** Bot API 10.4 Private-chat HTML Widgets (strictly private chats only) */
  htmlWidgetsEnabled?: boolean;
  /** Bot API 9.5+/10.4 AI streaming draft previews in private chats */
  aiStreamingDraftsEnabled?: boolean;
  /** Admin-configurable semantic button style overrides */
  buttonStyleOverrides?: Record<string, TelegramButtonStyle>;
  /** Admin-configurable Rich Message header/footer templates */
  richMessageTemplates?: Record<string, string>;
  miniAppEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiPrimaryModel?: string;
  aiFallbackModel?: string | null;
  aiAutoFallbackEnabled?: boolean;
  aiVoiceReplyEnabled?: boolean;
  aiDailyBudgetTokens?: number;
  aiMaxRequestsPerUserPerDay?: number;
  aiSystemPromptOverride?: string;
  miniAppUrl?: string;
  schedulerDispatchLedger?: Record<string, string>;
  lastNotifiedApkVersion?: string;
  cachedApkTelegramFileId?: {
    sha256: string;
    fileId: string;
    version: string;
    uploadedAt: string;
  };
  /** Cached Telegram file_ids for Quran MP3 tracks keyed by `${reciterId}_${surahNumber}` */
  quranAudioFileIdCache?: Record<
    string,
    {
      fileId: string;
      sourceUrlOrPath: string;
      checksum?: string;
      cachedAt: string;
    }
  >;
  /** Audit trail of Admin Quran Audio bulk imports */
  quranAudioImportLogs?: Array<{
    id: string;
    reciterId: string;
    actorId: string;
    mode: 'single' | 'bulk_manifest' | 'zip_archive';
    matchedCount: number;
    unmatchedCount: number;
    failedCount: number;
    summary: string;
    createdAt: string;
  }>;
  /** Persistent idempotent notification delivery log (bounded latest 500) */
  notificationDispatchLog?: TelegramNotificationDispatchRecord[];
  /** Monotonic version counter preventing stale cache/container rollback */
  version?: number;
  /** Latest emoji registry version synchronized with appConfig/emojiRegistry */
  emojiRegistryVersion?: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RollbackWarningRecord {
  id: string;
  target: 'settings' | 'custom_emoji' | 'emoji_registry' | 'polling_conflict' | 'firestore_degraded' | 'supabase_guard';
  source: string;
  functionName: string;
  currentVersion: number;
  incomingVersion: number;
  reason: string;
  createdAt: string;
}

export interface TelegramRuntimeInstanceRecord {
  id: string;
  instanceId: string;
  deploymentId: string;
  gitCommit: string;
  buildVersion: string;
  processId: number;
  hostname: string;
  mode: string;
  configVersion: number;
  emojiRegistryVersion: number;
  startedAt: string;
  lastHeartbeatAt: string;
  pollingActive: boolean;
  pollingConflictCount: number;
}

export interface TelegramLatencyBucketStats {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  errorCount: number;
}

export interface TelegramLatencySample {
  update_id: number;
  user_id_masked: string;
  handler_name: string;
  category: 'start' | 'callback' | 'menu' | 'command' | 'ai' | 'media' | 'other';
  instance_id: string;
  deployment_id: string;
  git_commit: string;
  processing_time_ms: number;
  database_time_ms: number;
  api_time_ms: number;
  status: 'ok' | 'rate_limited' | 'maintenance' | 'ignored' | 'error';
  error_code?: string;
  timestamp: string;
}

export interface TelegramPerformanceSummary {
  instanceId: string;
  deploymentId: string;
  gitCommit: string;
  buildVersion: string;
  processId: number;
  uptimeSec: number;
  activeUserQueues: number;
  inFlightUpdates: number;
  deduplicatedUpdates: number;
  totalProcessed: number;
  overall: TelegramLatencyBucketStats;
  byCategory: Record<string, TelegramLatencyBucketStats>;
  database: TelegramLatencyBucketStats;
  telegramApi: TelegramLatencyBucketStats;
  recentSlowUpdates: TelegramLatencySample[];
}

export interface TelegramNotificationDispatchRecord {
  notificationId: string;
  userId: string;
  kind: string;
  timezone: string;
  scheduledTime: string;
  sentStatus: 'sent' | 'failed' | 'retrying';
  retryCount: number;
  sentAt?: string;
  error?: string;
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
  autoPublishWisdom?: boolean;
  language: TelegramLocale;
  templateHeader?: string;
  templateFooter?: string;
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
  category:
    | 'prayer_times'
    | 'announcement'
    | 'wisdom'
    | 'news'
    | 'hadith'
    | 'ayah'
    | 'media'
    | 'manual';
  language: TelegramLocale;
  textPreview: string;
  telegramMessageId?: number;
  idempotencyKey?: string;
  status: 'queued' | 'scheduled' | 'sent' | 'failed';
  errorMessage?: string;
  retryCount?: number;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
}

export interface TelegramAuditLogRecord {
  id: string;
  actorTelegramId: string;
  actorRole: 'user' | TelegramAdminRole | 'system';
  action: string;
  targetType:
    | 'user'
    | 'settings'
    | 'channel'
    | 'admin'
    | 'publication'
    | 'broadcast'
    | 'support'
    | 'content'
    | 'quiz'
    | 'emoji'
    | 'webhook'
    | 'ai'
    | 'hifz'
    | 'apk'
    | 'system';
  targetId?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export type CustomEmojiCategory =
  | 'brand'
  | 'navigation'
  | 'prayer'
  | 'content'
  | 'ai'
  | 'profile'
  | 'admin'
  | 'language'
  | 'settings'
  | 'status'
  | 'channel'
  | 'calendar'
  | 'home'
  | 'quran'
  | 'quran_mp3'
  | 'hifz'
  | 'hadith'
  | 'dhikr'
  | 'dua'
  | 'ai_assistant'
  | 'community'
  | 'favorites'
  | 'notifications'
  | 'back'
  | 'next'
  | 'previous'
  | 'play'
  | 'pause'
  | 'success'
  | 'warning'
  | 'error'
  | 'loading'
  | 'statistics'
  | 'support'
  | 'ramadan_banner'
  | 'welcome'
  | 'confirm'
  | 'error_cancel'
  | 'important_warning'
  | 'idea_advice'
  | 'fire_great'
  | 'learning'
  | 'media'
  | 'publishing'
  | 'custom'
  | 'seasonal'
  | 'announcement'
  | (string & {});

export type CustomEmojiWebAssetFormat = 'webp' | 'webm' | 'tgs' | 'png' | 'unknown';

export type CustomEmojiSlotStatus = 'verified' | 'unverified' | 'missing' | 'disabled';

export interface CustomEmojiEntry {
  key: string;
  name?: string;
  category: CustomEmojiCategory;
  /**
   * Internal 1-grapheme technical anchor required ONLY when Telegram renders a
   * genuine `custom_emoji` MessageEntity or `<tg-emoji>` tag.
   * NEVER emitted to users as a visible plain Unicode emoji fallback.
   */
  unicodeFallback: string;
  customEmojiId: string | null;
  semanticPurpose?: string;
  usedIn?: string[];
  isCustomAdminSlot?: boolean;
  isExtended30Slot?: boolean;
  status?: CustomEmojiSlotStatus;
  unicodeFallbackDisabled?: boolean;
  enabled?: boolean;
  verified: boolean;
  verifiedAt?: string;
  stickerSetName?: string;
  supportsKeyboardIcon: boolean;
  description: string;
  /** Server-side proxy asset URL for Web App & Android WebView (zero bot token leaked) */
  webAssetUrl?: string | null;
  /** Resolved sticker format from Telegram API (`webp` static, `webm` video, `tgs` Lottie) */
  webAssetFormat?: CustomEmojiWebAssetFormat;
  /** Whether the resolved format renders natively in browsers/WebView without plain emoji fallback */
  webRenderable?: boolean;
  /** Monotonic per-slot revision */
  version?: number;
  createdAt?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AppConfigEmojiRegistryDocument {
  id: 'emojiRegistry';
  version: number;
  updatedAt: string;
  updatedBy: string;
  totalSlots: number;
  canonicalCount: number;
  verifiedCount: number;
  emojis: Record<
    string,
    {
      key: string;
      category: string;
      customEmojiId: string | null;
      enabled: boolean;
      verified: boolean;
      verifiedAt?: string;
      stickerSetName?: string;
      webAssetUrl: string | null;
      webAssetFormat: CustomEmojiWebAssetFormat;
      webRenderable: boolean;
      description: string;
      semanticPurpose?: string;
      usedIn?: string[];
      isCustomAdminSlot?: boolean;
      version: number;
      updatedAt: string;
      updatedBy?: string;
    }
  >;
}

export interface TelegramEmojiAuditReport {
  generatedAt: string;
  strictZeroPlainEmojiMode: boolean;
  premiumEnabled: boolean;
  keyboardIconsEnabled: boolean;
  totalRegistered: number;
  canonicalTotal: number;
  canonicalConfigured: number;
  customAdminSlotsCount: number;
  workingVerifiedCount: number;
  disabledCount: number;
  invalidOrUnverifiedKeys: string[];
  unusedRegisteredKeys: string[];
  missingCanonicalKeys: string[];
  missingCategoryHits: Record<string, number>;
  codebasePlainEmojiMatches: Array<{ file: string; count: number; samples: string[] }>;
  outgoingPayloadAudit: {
    auditedCount: number;
    cleanCount: number;
    violationCount: number;
    passed: boolean;
  };
  keyboardIconWarnings: string[];
  deliveryFailures: string[];
}

// ---------------------------------------------------------------------------
// Broadcast Campaign Manager Types
// ---------------------------------------------------------------------------

export type TelegramBroadcastMediaType =
  | 'text'
  | 'html'
  | 'photo'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'animation'
  | 'sequence';

export type TelegramBroadcastSegment =
  | 'all_opt_in'
  | 'active_7d'
  | 'new_users_7d'
  | 'lang_uz-Latn'
  | 'lang_uz-Cyrl'
  | 'lang_uz-Latn-new'
  | 'lang_ru'
  | 'lang_en'
  | 'prayer_subscribers'
  | 'wisdom_subscribers'
  | 'announcement_subscribers'
  | 'custom_ids';

export type TelegramBroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface TelegramBroadcastButtonSpec {
  text: string;
  url?: string;
  callbackData?: string;
  webAppUrl?: string;
}

export interface TelegramBroadcastRecord {
  id: string;
  title: string;
  mediaType: TelegramBroadcastMediaType;
  textByLocale: Partial<Record<TelegramLocale, string>>;
  defaultText: string;
  mediaUrlOrFileId?: string;
  sequenceItems?: Array<{ text: string; delayMs?: number }>;
  buttons?: TelegramBroadcastButtonSpec[];
  segment: TelegramBroadcastSegment;
  customUserIds?: string[];
  status: TelegramBroadcastStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  idempotencyKey: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
  sentUserIds: string[];
  blockedUserIds: string[];
  failedDetails: Array<{ telegramId: string; errorCode?: number; error: string }>;
  statsByLocale: Partial<Record<TelegramLocale, { targeted: number; sent: number; failed: number; blocked: number }>>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Two-Way Support & Imam Inquiry Ticket System Types
// ---------------------------------------------------------------------------

export type TelegramSupportTicketCategory =
  | 'imam_question'
  | 'mosque_service'
  | 'technical'
  | 'suggestion'
  | 'prayer_issue'
  | 'content_error'
  | 'hifz_teacher'
  | 'other';

export type TelegramSupportPriority = 'normal' | 'high' | 'urgent';
export type TelegramSupportStatus = 'new' | 'in_progress' | 'answered' | 'closed';

export interface TelegramSupportMessageEntry {
  id: string;
  senderRole: 'user' | 'admin';
  senderId: string;
  senderName: string;
  text: string;
  mediaType?: 'photo' | 'video' | 'audio' | 'voice' | 'document';
  telegramFileId?: string;
  createdAt: string;
}

export interface TelegramSupportTicketRecord {
  id: string;
  userId: string;
  userName: string;
  userLanguage: TelegramLocale;
  category: TelegramSupportTicketCategory;
  priority: TelegramSupportPriority;
  status: TelegramSupportStatus;
  assignedTo?: string;
  subject: string;
  messages: TelegramSupportMessageEntry[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// ---------------------------------------------------------------------------
// Content Studio Drafts & Scheduler Types
// ---------------------------------------------------------------------------

export type TelegramContentType =
  | 'article'
  | 'news'
  | 'hadith'
  | 'ayah'
  | 'dhikr'
  | 'dua'
  | 'announcement'
  | 'media'
  | 'event';

export type TelegramContentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export interface TelegramContentDraftRecord {
  id: string;
  type: TelegramContentType;
  status: TelegramContentStatus;
  title: string;
  bodyByLocale: Partial<Record<TelegramLocale, string>>;
  defaultBody: string;
  tags: string[];
  targetChannelIds: string[];
  scheduledAt?: string;
  publishedAt?: string;
  mediaUrl?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// User Personalization, Bookmarks, Khatm, Goals, Academy, Quiz, AI Memory
// ---------------------------------------------------------------------------

export interface TelegramUserBookmark {
  id: string;
  kind: 'ayah' | 'surah' | 'hadith' | 'dhikr' | 'article' | 'news' | 'announcement' | 'audio' | 'video';
  refId: string;
  title: string;
  createdAt: string;
}

export interface TelegramKhatmPlan {
  targetDays: number;
  completedJuz: number[];
  completedSurahs: number[];
  dailyPagesGoal: number;
  pagesReadTotal: number;
  startedAt: string;
  updatedAt: string;
}

export interface TelegramDhikrProgress {
  countsByDhikrId: Record<string, number>;
  dailyGoals: Record<string, number>;
  todayDateKey: string;
  todayCount: number;
  totalAllTimeCount: number;
  reminderEnabled: boolean;
}

export interface TelegramAiChatTurn {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface TelegramPersonalReminder {
  id: string;
  label: string;
  timeHHMM: string;
  enabled: boolean;
  createdAt: string;
}

export interface TelegramUserEngagementRecord {
  telegramId: string;
  bookmarks: TelegramUserBookmark[];
  resumeQuran?: {
    surahNumber: number;
    ayahIndex?: number;
    ayahNumber?: number;
    surahNameUz?: string;
    updatedAt: string;
  };
  khatmPlan?: TelegramKhatmPlan;
  dhikr: TelegramDhikrProgress;
  completedLessonIds: string[];
  readArticleIds?: string[];
  watchedVideoIds?: string[];
  audioResume?: { audioId: string; title: string; reciterId?: string; surahNumber?: number; updatedAt: string };
  favoriteReciterIds?: string[];
  favoriteSurahTracks?: Array<{ reciterId: string; surahNumber: number; title: string; addedAt: string }>;
  audioListeningHistory?: Array<{ reciterId: string; surahNumber: number; title: string; playedAt: string }>;
  audioListeningStats?: {
    totalPlays: number;
    totalEstimatedMinutes: number;
    lastReciterId?: string;
    lastSurahNumber?: number;
    lastPlayedAt?: string;
  };
  personalReminders?: TelegramPersonalReminder[];
  quizTotalAttempts: number;
  quizBestScore: number;
  quizTotalPoints: number;
  quizStreak: number;
  aiHistory: TelegramAiChatTurn[];
  aiModeActive?: boolean;
  preferredReciterId?: string;
  activeQuizState?: {
    questionIds: string[];
    index?: number;
    currentIndex?: number;
    score?: number;
    answers: number[];
    category?: string;
    startedAt: string;
  } | null;
  updatedAt: string;
}

export interface TelegramAiLogRecord {
  id: string;
  telegramId: string;
  mode: 'chat' | 'voice' | 'vision' | 'admin_helper' | 'probe';
  modelRequested: string;
  modelUsed?: string;
  inputType: 'text' | 'voice' | 'photo' | 'document';
  locale: TelegramLocale;
  latencyMs: number;
  promptTokensEst: number;
  responseTokensEst: number;
  ok: boolean;
  errorCode?: string;
  errorDetail?: string;
  flaggedByAdmin?: boolean;
  adminNote?: string;
  rating?: number;
  createdAt: string;
}

export interface TelegramQuizAttemptRecord {
  id: string;
  telegramId: string;
  userName: string;
  quizType: 'daily' | 'weekly' | 'category';
  category?: string;
  questionIds: string[];
  answers: number[];
  score: number;
  total: number;
  pointsEarned: number;
  createdAt: string;
}
