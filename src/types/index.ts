/**
 * ASAKA ZIYO — Domain-driven Type Definitions
 * Phase 1: Foundation & Application Shell
 */

export type NavigationTab =
  | 'home'
  | 'quran'
  | 'hadith'
  | 'dhikr'
  | 'prayer'
  | 'articles'
  | 'news'
  | 'announcements'
  | 'favorites'
  | 'settings'
  | 'admin'
  | 'notifications'
  | 'daily_archive'
  | 'quiz'
  | 'calendar'
  | 'reminder_dashboard';

export type SupportedLocale = 'uz-Latn' | 'uz-Cyrl' | 'uz-Latn-new' | 'ru' | 'en';

export type TranslationStatus = 'PUBLISHED' | 'DRAFT' | 'MISSING';

export interface LocalizedContentEntry {
  title: string;
  subtitle?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
  bodyParagraphs?: string[];
  content?: string;
  status: TranslationStatus;
  translator?: string;
  lastUpdated?: string;
}

export type PrayerKey =
  | 'tahajjud'
  | 'subh'
  | 'bomdod'
  | 'quyosh'
  | 'peshin'
  | 'asr'
  | 'shom'
  | 'xufton';

export interface PrayerTimeEntry {
  id: string;
  key: PrayerKey;
  nameUz: string;
  nameAr: string;
  time: string; // e.g. "05:14"
  iqamahTime?: string; // e.g. "05:40"
  descriptionUz: string;
}

export interface PrayerSchedule {
  date: string; // e.g. "2026-11-02"
  formattedDateUz: string; // e.g. "2-Noyabr, Dushanba"
  hijriDate: string; // e.g. "22 Jumadul avval, 1448"
  location: string; // "Asaka shahri, Andijon viloyati"
  qiblaAngleDeg: number; // 241 for Asaka (West-South-West)
  timezone: string; // "Asia/Tashkent"
  isAdministratorPublished: boolean; // strict verification requirement
  publishedBy?: string;
  verifiedAt?: string;
  disclaimer: string;
  times: PrayerTimeEntry[];
}

export interface Surah {
  number: number;
  nameAr: string;
  nameUz: string;
  meaningUz: string;
  numberOfAyahs: number;
  revelationType: 'Makkah' | 'Madina';
  pageNumber: number;
}

export interface AyahTranslationMetadata {
  language: SupportedLocale;
  translator: string;
  source: string;
  version: string;
  text: string;
  tafsir?: string;
}

export interface Ayah {
  id: string;
  number: number;
  numberInSurah: number;
  surahNumber: number;
  surahNameUz: string;
  textAr: string; // Arabic source text — NEVER modified during locale changes
  translationUz: string;
  transliterationUz: string;
  translations?: Partial<Record<SupportedLocale, AyahTranslationMetadata>>;
  audioUrl?: string;
  tafsirSummaryUz?: string;
}

export interface QuranReciter {
  id: string;
  name: string;
  subtext: string;
  previewUrl: string;
}

export interface HadithItem {
  id: string;
  collection: 'bukhari' | 'muslim' | 'nawawi' | 'tirmidhi';
  collectionNameUz: string;
  number: number;
  chapterUz: string;
  narratorUz: string;
  textAr: string;
  translationUz: string;
  grade: 'Sahih' | 'Hasan';
  reference: string;
  keywords: string[];
}

export interface DhikrItem {
  id: string;
  category: 'tonggi' | 'kechki' | 'namozdan_keyin' | 'sayyidul_istigfor';
  categoryTitleUz: string;
  titleUz: string;
  textAr: string;
  transliterationUz: string;
  translationUz: string;
  targetCount: number;
  virtueUz: string;
  source: string;
}

export interface CommentItem {
  id: string;
  targetType: 'article' | 'post';
  targetId: string;
  authorName: string;
  text: string;
  createdAt: string;
  likesCount?: number;
}

export interface MediaPost {
  id: string;
  title: string;
  type: 'reel' | 'video' | 'audio' | 'image';
  mediaUrl: string;
  thumbnail?: string;
  caption: string;
  author: string;
  publishedDate: string;
  category: string;
  likesCount: number;
  commentsCount: number;
  comments?: CommentItem[];
  isPublished: boolean;
}

export interface SupportInquiry {
  id: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'answered';
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: 'Aqoid' | 'Fiqh' | 'Axloq' | 'Tarix' | 'Oila';
  author: string;
  authorRole: string;
  publishedDate: string;
  readTimeMinutes: number;
  featuredImage: string;
  excerpt: string;
  bodyParagraphs: string[];
  keyQuote?: string;
  isFeatured?: boolean;
  likesCount?: number;
  rating?: number; // 1-5 stars
  ratingsCount?: number;
  comments?: CommentItem[];
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export interface NewsItem {
  id: string;
  title: string;
  publishedDate: string;
  category: string;
  summary: string;
  content: string;
  source: string;
  imageUrl?: string;
  isImportant?: boolean;
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  type: 'juma' | 'talim' | 'xayriya' | 'masjid';
  typeLabelUz: string;
  date: string;
  time?: string;
  location: string;
  speaker?: string;
  organizer?: string;
  description: string;
  contact?: string;
  contactPhone?: string;
  isPinned?: boolean;
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'CONTENT_ADMIN'
  | 'PRAYER_ADMIN'
  | 'EDITOR'
  | 'NOTIFICATION_ADMIN'
  | 'VIEWER';

export interface AdminRoleConfig {
  role: UserRole;
  labelUz: string;
  descriptionUz: string;
  permissions: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'WARNING' | 'SECURITY';
  detailsUz: string;
}

export interface FavoriteItem {
  id: string;
  type: 'ayah' | 'hadith' | 'dhikr' | 'article';
  title: string;
  subtitle: string;
  snippet: string;
  timestamp: number;
  savedAt?: string | number;
  routeTab: NavigationTab;
  routeId: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  arabicFontSize: 'standard' | 'large' | 'huge';
  showTransliteration: boolean;
  activeReciterId: string;
  hapticFeedback: boolean;
  tasbihSound: boolean;
  prayerAlertsEnabled: boolean;
  prayerReminders?: Record<string, { triggerMinutesBefore: number; soundProfile: 'chime' | 'azan' | 'silent'; enabled: boolean }>;
}

export interface TelegramDraftItem {
  id: string;
  sourceChannel: string; // '@Asaka_Ziyo' | '@muhiddinsahhofuz'
  targetSection: 'prayer' | 'announcements' | 'news' | 'articles' | 'media';
  title: string;
  content: string;
  prayerTimesDraft?: {
    tahajjud?: string;
    subh?: string;
    bomdod?: string;
    quyosh?: string;
    peshin?: string;
    asr?: string;
    shom?: string;
    xufton?: string;
  };
  mediaUrl?: string;
  receivedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}
