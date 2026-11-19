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
  icon_custom_emoji_id?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramKeyboardButton {
  text: string;
  web_app?: { url: string };
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
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
  | { type: 'admin_channel_post_draft'; channelId: string };

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
  | 'calendar';

export interface CustomEmojiEntry {
  key: string;
  category: CustomEmojiCategory;
  unicodeFallback: string;
  customEmojiId: string | null;
  verified: boolean;
  verifiedAt?: string;
  stickerSetName?: string;
  supportsKeyboardIcon: boolean;
  description: string;
  updatedAt: string;
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
  kind: 'ayah' | 'surah' | 'hadith' | 'dhikr' | 'article';
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

export interface TelegramUserEngagementRecord {
  telegramId: string;
  bookmarks: TelegramUserBookmark[];
  resumeQuran?: { surahNumber: number; ayahIndex: number; updatedAt: string };
  khatmPlan?: TelegramKhatmPlan;
  dhikr: TelegramDhikrProgress;
  completedLessonIds: string[];
  quizTotalAttempts: number;
  quizBestScore: number;
  quizTotalPoints: number;
  quizStreak: number;
  aiHistory: TelegramAiChatTurn[];
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
