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
  | 'messages'
  | 'daily_archive'
  | 'quiz'
  | 'calendar'
  | 'reminder_dashboard'
  | 'profile'
  | 'khatm_planner'
  | 'prayer_journal'
  | 'mosque_events'
  | 'academy'
  | 'charity'
  | 'fasting'
  | 'library'
  | 'ask_imam'
  | 'achievements'
  | 'ai_assistant'
  | 'search';

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

export interface ScheduleHistoryRecord {
  id: string;
  publishedAt: string;
  publishedBy: string;
  date: string;
  formattedDateUz: string;
  notes?: string;
  times: PrayerTimeEntry[];
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
  version?: number;
  publicationHistory?: ScheduleHistoryRecord[];
}

export interface Surah {
  number: number;
  nameAr: string;
  nameUz: string;
  meaningUz: string;
  numberOfAyahs: number;
  revelationType: 'Makkah' | 'Madina';
  pageNumber: number;
  juzNumber?: number;
}

export interface QuranBookmark {
  id: string;
  surahNumber: number;
  ayahNumberInSurah: number;
  surahNameUz: string;
  snippet: string;
  snippetAr?: string;
  snippetUz?: string;
  createdAt: string;
}

export interface QuranNote {
  id: string;
  surahNumber: number;
  ayahNumberInSurah: number;
  surahNameUz: string;
  ayahSnippet: string;
  noteText: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuranReadingProgress {
  lastReadSurah: number;
  lastReadAyah: number;
  lastReadAt: string;
  dailyGoalAyahs: number;
  todayAyahsRead: number;
  todayDateStr: string;
  khatmCompletedSurahs: number[]; // array of completed surah numbers
  khatmCompletionDate?: string;
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
  juzNumber?: number;
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
  nameAr?: string;
  country?: string;
  style?: string;
  rewaya?: string;
  biographyUz?: string;
  profileImageUrl?: string;
  surahServerBaseUrl?: string;
  ayahServerBaseUrl?: string;
  subtext: string;
  previewUrl: string;
  isCustomUploaded?: boolean;
  uploadedSurahsCount?: number;
  missingSurahsCount?: number;
  isActive?: boolean;
}

export type PublishMode = 'published' | 'draft' | 'archived' | 'test';

export interface Archivable {
  publishMode?: PublishMode;
  createdAtIso?: string;
  mediaUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HadithItem extends Archivable {
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

export interface DhikrItem extends Archivable {
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

export interface MediaPost extends Archivable {
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
  viewsCount?: number;
  commentsCount: number;
  comments?: CommentItem[];
  isPublished: boolean;
}

export interface SupportInquiry extends Archivable {
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

export interface Article extends Archivable {
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
  viewsCount?: number;
  rating?: number; // 1-5 stars
  ratingsCount?: number;
  comments?: CommentItem[];
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export interface NewsItem extends Archivable {
  id: string;
  title: string;
  publishedDate: string;
  category: string;
  summary: string;
  content: string;
  source: string;
  imageUrl?: string;
  isImportant?: boolean;
  viewsCount?: number;
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export interface AnnouncementItem extends Archivable {
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
  viewsCount?: number;
  translations?: Partial<Record<SupportedLocale, LocalizedContentEntry>>;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_MANAGER'
  | 'QURAN_AUDIO_MANAGER'
  | 'PRAYER_TIMES_MANAGER'
  | 'EDITOR'
  | 'MODERATOR'
  | 'ANALYST'
  | 'CONTENT_ADMIN'
  | 'PRAYER_ADMIN'
  | 'NOTIFICATION_ADMIN'
  | 'VIEWER';

export interface AdminRoleConfig {
  role: UserRole;
  labelUz: string;
  descriptionUz: string;
  permissions: string[];
  allowedModules?: string[];
  allowedActions?: ('view' | 'create' | 'edit' | 'publish' | 'archive' | 'delete' | 'manage_permissions')[];
}

export interface AdminUser {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
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
  theme: 'dark' | 'light' | 'system';
  arabicFontSize: 'standard' | 'large' | 'huge';
  showTransliteration: boolean;
  activeReciterId: string;
  hapticFeedback: boolean;
  tasbihSound: boolean;
  prayerAlertsEnabled: boolean;
  prayerReminders?: Record<string, { triggerMinutesBefore: number; soundProfile: 'chime' | 'azan' | 'silent'; enabled: boolean }>;
}

export interface TelegramDraftItem extends Archivable {
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

export type MessageCategory =
  | 'announcement'
  | 'content'
  | 'news'
  | 'lesson'
  | 'hadith'
  | 'dhikr'
  | 'prayer'
  | 'quran'
  | 'quiz'
  | 'urgent'
  | 'direct'
  | 'system'
  | 'general';

export interface InboxMessageItem extends Archivable {
  id: string;
  title: string;
  body: string;
  category: MessageCategory;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  createdAt: string;
  timestampMs: number;
  read: boolean;
  linkUrl?: string;
  linkTab?: NavigationTab;
  imageUrl?: string;
  isBroadcast: boolean;
  targetUserId?: string;
  priority?: 'normal' | 'high' | 'urgent';
  userReply?: string;
  userRepliedAt?: string;
}

export interface QuizAttemptItem {
  id: string;
  quizDate: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  answers: { questionId: string; selectedIndex: number; isCorrect: boolean }[];
  streakDays?: number;
}

// ---------------------------------------------------------------------------
// 1. QURAN KHATM PLANNER INTERFACES
// ---------------------------------------------------------------------------
export type KhatmDurationType = '30_days' | '60_days' | '90_days' | 'custom';

export interface KhatmPlan {
  id: string;
  userId: string;
  title: string;
  durationType: KhatmDurationType;
  totalDays: number;
  startDate: string; // ISO date YYYY-MM-DD
  targetEndDate: string; // ISO date
  totalPages: number; // 604 standard Madinah Mushaf
  completedPages: number;
  completedAyahs: number;
  completedJuz: number[]; // 1..30
  status: 'active' | 'paused' | 'completed';
  remindersEnabled: boolean;
  reminderTime: string; // "06:30"
  pagesPerDay: number;
  lastReadDate?: string;
  lastReadPage?: number;
  missedPagesAdjustment: number; // auto-recalculated when behind
  dailyLog: Record<string, { pagesRead: number; completedAt: string }>;
  completionHistory?: { completedAt: string; daysTaken: number; notes?: string }[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 2. PERSONAL PRAYER JOURNAL INTERFACES
// ---------------------------------------------------------------------------
export type PrayerStatus = 'completed' | 'missed' | 'not_recorded';

export interface DailyPrayerRecord {
  date: string; // YYYY-MM-DD
  userId: string;
  prayers: Record<PrayerKey, { status: PrayerStatus; loggedAt?: string; inCongregation?: boolean }>;
  notes?: string;
  dailyGoalMet: boolean;
  updatedAt: string;
}

export interface PrayerJournalPreferences {
  userId: string;
  enableReminders: boolean;
  targetDailyPrayers: number; // usually 5
  trackTahajjud: boolean;
  isPrivate: boolean;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 3. SMART DIGITAL TASBIH INTERFACES
// ---------------------------------------------------------------------------
export interface TasbihSession {
  id: string;
  userId: string;
  dhikrId: string;
  dhikrTitleUz: string;
  dhikrTextAr: string;
  count: number;
  targetCount: number;
  completedRounds: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface TasbihStats {
  todayTotal: number;
  monthTotal: number;
  allTimeTotal: number;
  favoriteDhikrId?: string;
  dailyTarget: number;
  vibrationIntensity: 'light' | 'medium' | 'strong' | 'off';
  clickSound: 'click' | 'subtle' | 'off';
  history: { date: string; totalCount: number }[];
}

// ---------------------------------------------------------------------------
// 4. MOSQUE EVENTS & ISLAMIC CALENDAR
// ---------------------------------------------------------------------------
export type MosqueEventType = 'lecture' | 'quran_class' | 'tajwid' | 'friday_program' | 'charity_drive' | 'community';

export interface MosqueEventItem extends Archivable {
  id: string;
  title: string;
  type: MosqueEventType;
  date: string; // YYYY-MM-DD
  time: string; // "14:30"
  location: string;
  instructor: string;
  instructorTitle?: string;
  description: string;
  imageUrl?: string;
  capacity?: number;
  registeredUserIds: string[];
  isPublished: boolean;
  publishedAt: string;
  createdBy: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 5. ISLAMIC LEARNING ACADEMY
// ---------------------------------------------------------------------------
export type AcademyTrackKey = 'aqida' | 'fiqh' | 'tajwid' | 'hadith' | 'seerah' | 'history';

export interface AcademyLesson {
  id: string;
  trackId: AcademyTrackKey;
  trackTitleUz: string;
  order: number;
  title: string;
  description: string;
  durationMinutes: number;
  instructor: string;
  verifiedSource: string;
  audioUrl?: string;
  videoUrl?: string;
  contentMarkdown: string;
  quizQuestions?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    sourceReference: string;
  }[];
}

export interface StudentProgress {
  userId: string;
  completedLessons: string[]; // lesson IDs
  trackProgress: Record<AcademyTrackKey, { completedCount: number; examScore?: number }>;
  enrolledDate: string;
  lastActiveDate: string;
  certificatesEarned: string[];
}

// ---------------------------------------------------------------------------
// 6. CHARITY & SADAQAH MODULE
// ---------------------------------------------------------------------------
export type CampaignStatus = 'active' | 'completed' | 'urgent';

export interface CharityCampaign extends Archivable {
  id: string;
  title: string;
  category: 'masjid_tamiri' | 'muhtojlar' | 'talabalar' | 'ramazon_ehson' | 'iftorlik';
  description: string;
  targetAmountUzs: number;
  collectedAmountUzs: number;
  pledgedAmountUzs: number;
  deadlineDate: string;
  beneficiaryLocation: string;
  supportingDocuments: { title: string; docUrl: string }[];
  isVerified: boolean;
  status: CampaignStatus;
  paymentInstructions: {
    providerName: string; // Click / Payme / Bank Transfer (Non-credentialed standard payment flow)
    accountReference: string;
    legalEntityName: string;
    officialInvoiceUrl?: string;
  };
  financialAuditRecords: {
    recordId: string;
    date: string;
    amountUzs: number;
    purpose: string;
    receiptUrl?: string;
    verifiedBy: string;
  }[];
  publishedAt: string;
  updatedAt: string;
}

export interface UserDonationPledge {
  id: string;
  userId: string;
  campaignId: string;
  campaignTitle: string;
  amountUzs: number;
  status: 'pledged' | 'confirmed';
  transactionReference?: string;
  donatedAt: string;
  isAnonymous: boolean;
}

// ---------------------------------------------------------------------------
// 7. RAMADAN & VOLUNTARY FASTING ASSISTANT
// ---------------------------------------------------------------------------
export type FastingPlanType = 'ramadan' | 'monday_thursday' | 'ayamul_beed' | 'ashura' | 'arafah' | 'qazo';

export interface FastingDayEntry {
  date: string; // YYYY-MM-DD
  hijriDate: string;
  imsakTime: string; // 10 minutes prior to subh/fajr
  fajrTime: string;
  iftarTime: string; // Maghrib prayer time
  suhoorDuaAr: string;
  suhoorDuaUz: string;
  iftarDuaAr: string;
  iftarDuaUz: string;
  isCompleted?: boolean;
  notes?: string;
}

export interface UserFastingJournal {
  userId: string;
  completedFasts: string[]; // dates YYYY-MM-DD
  qazoFastsTotal: number;
  qazoFastsCompleted: number;
  activePlan: FastingPlanType;
  reminderMinutesBeforeImsak: number;
  reminderMinutesBeforeIftar: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 8. ISLAMIC DIGITAL LIBRARY
// ---------------------------------------------------------------------------
export type BookCategory = 'quran' | 'hadith' | 'aqida' | 'fiqh' | 'tarbiya' | 'tarix';

export interface DigitalBookItem extends Archivable {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  categoryTitleUz: string;
  publisher: string;
  year: number;
  pagesCount: number;
  coverImageUrl?: string;
  description: string;
  isCopyrightCleared: boolean;
  permissionNote?: string;
  pdfUrl?: string;
  sampleChapters?: { title: string; contentText: string }[];
  isPublished: boolean;
  publishedAt: string;
  viewsCount: number;
  readsCount: number;
}

export interface UserReadingBookmark {
  userId: string;
  bookId: string;
  bookTitle: string;
  lastPage: number;
  totalPages: number;
  percent: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 9. ASK THE IMAM SYSTEM
// ---------------------------------------------------------------------------
export type QuestionCategory = 'ibodat' | 'oilaviy' | 'muomala' | 'aqida' | 'ramazon' | 'umumiy';
export type QuestionStatus = 'submitted' | 'assigned' | 'answered' | 'archived';

export interface ImamQuestionItem {
  id: string;
  userId: string;
  userDisplayName: string;
  isAnonymous: boolean;
  category: QuestionCategory;
  title: string;
  questionText: string;
  supportingInfo?: string;
  submittedAt: string;
  status: QuestionStatus;
  assignedScholarName?: string;
  answerText?: string;
  sourceReferences?: string;
  answeredAt?: string;
  isPubliclyVisible: boolean; // Only if approved for public Q&A
  adminModerationNotes?: string;
}

// ---------------------------------------------------------------------------
// 10. PERSONAL ISLAMIC ACHIEVEMENTS
// ---------------------------------------------------------------------------
export interface IslamicAchievementMilestone {
  id: string;
  category: 'quran' | 'prayer' | 'dhikr' | 'academy' | 'quiz' | 'fasting';
  titleUz: string;
  descriptionUz: string;
  iconName: string;
  unlockedAt?: string;
  targetCount: number;
  currentCount: number;
  isUnlocked: boolean;
}

export interface PersonalProgressSummary {
  userId: string;
  streakDays: number;
  quranPagesReadTotal: number;
  prayersCompletedTotal: number;
  dhikrsCountTotal: number;
  quizzesCompletedTotal: number;
  academyLessonsCompleted: number;
  isPrivate: boolean;
  achievements: IslamicAchievementMilestone[];
  updatedAt: string;
}


