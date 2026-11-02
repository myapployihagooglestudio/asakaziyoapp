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
  | 'admin';

export interface PrayerTimeEntry {
  id: string;
  key: 'bomdod' | 'quyosh' | 'peshin' | 'asr' | 'shom' | 'xufton';
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

export interface Ayah {
  id: string;
  number: number;
  numberInSurah: number;
  surahNumber: number;
  surahNameUz: string;
  textAr: string;
  translationUz: string;
  transliterationUz: string;
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
  description: string;
  contact?: string;
  isPinned?: boolean;
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
}
