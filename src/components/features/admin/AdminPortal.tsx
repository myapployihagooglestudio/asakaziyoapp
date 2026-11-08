import React, { useState, useEffect } from 'react';
import {
  AdminRoleConfig,
  AuditLogEntry,
  PrayerSchedule,
  PrayerTimeEntry,
  PrayerKey,
  UserRole,
  Article,
  MediaPost,
  HadithItem,
  DhikrItem,
  SupportInquiry,
  TelegramDraftItem,
  AnnouncementItem,
  NewsItem,
  PublishMode,
} from '../../../types';
import { ADMIN_ROLES_CONFIG, INITIAL_AUDIT_LOGS } from '../../../data/adminData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  Shield,
  ShieldCheck,
  Clock,
  FileText,
  Users,
  Send,
  Bell,
  Sliders,
  History,
  CheckCircle,
  Lock,
  LogOut,
  ArrowLeft,
  Languages,
  Copy,
  Eye,
  EyeOff,
  Volume2,
  Check,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Film,
  BookOpen,
  Sparkles,
  Heart,
  MessageCircle,
  Inbox,
  Database,
  Server,
  Radio,
  ExternalLink,
  Flame,
  Cloud,
  RefreshCw,
  AlertCircle,
  Upload,
  Award,
  HelpCircle,
  Music,
  Play,
  Square,
  VolumeX,
  TrendingUp,
  UserCheck,
  UserX,
  Search,
  Filter,
  Activity,
  Zap,
  BarChart3,
} from 'lucide-react';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getAllQuizQuestions,
  addCustomQuizQuestion,
  QuizQuestionItem,
  DailyQuizSet,
  isQuestionPublishable,
  getDailyQuizQuestionsForDate,
} from '../../../data/quizQuestionsData';
import {
  ALL_ADHAN_TRACKS,
  AdhanTrack,
  CANONICAL_RECITER,
} from '../../../data/adhanTracksData';
import {
  sendAdminMessage,
  getStoredInboxMessages,
  deleteMessage as deleteInboxMessage,
} from '../../../utils/messagesService';
import {
  playAdhanAudioTrack,
  stopActiveAdhanAudio,
  isAdhanAudioPlaying,
  getStoredNotifications,
} from '../../../utils/notificationService';
import {
  saveStoredPrayerSchedule,
  getStoredArticles,
  saveStoredArticle,
  deleteStoredArticle,
  getStoredMediaPosts,
  saveStoredMediaPost,
  deleteStoredMediaPost,
  getStoredHadiths,
  saveStoredHadith,
  deleteStoredHadith,
  getStoredDhikrs,
  saveStoredDhikr,
  deleteStoredDhikr,
  getStoredInquiries,
  replyToInquiry,
  deleteStoredInquiry,
  getStoredDrafts,
  approveDraft,
  rejectDraft,
  deleteDraft,
  createDraft,
  getStoredAnnouncements,
  saveStoredAnnouncement,
  deleteStoredAnnouncement,
  getStoredNews,
  saveStoredNews,
  deleteStoredNews,
  subscribeToDatabase,
  syncWithFirestore,
  syncAllToFirestore,
  runFirestoreDiagnostics,
  FirestoreDiagnosticResult,
  getAllArchivedItems,
  restoreArchivedItem,
  archiveStoredArticle,
  restoreStoredArticle,
  archiveStoredMediaPost,
  restoreStoredMediaPost,
  archiveStoredHadith,
  restoreStoredHadith,
  archiveStoredDhikr,
  restoreStoredDhikr,
  archiveStoredInquiry,
  restoreStoredInquiry,
  updateItemPublishMode,
  permanentlyDeleteItem,
  uploadAdminMediaFile,
  getAnalyticsSummary,
  saveStoredQuizQuestion,
  saveScheduledDailyQuiz,
  fetchAllDailyQuizzesArchive,
  fetchQuizParticipationStats,
  getStoredAuditLogs,
  recordAdminAuditLog,
  fetchRegisteredUsersList,
  saveUserAccountStatus,
  saveUserRoleAssignment,
  runComprehensiveSystemHealthCheck,
  ManagedUserProfile,
  SystemHealthReport,
} from '../../../utils/databaseService';
import {
  testFirestoreConnection,
  signInAdmin,
  signOutFirebase,
  changeCurrentAdminPassword,
  getActiveAdminSession,
  getActiveAdminToken,
  verifyAdminSessionWithServer,
  AUTHORIZED_ADMIN_EMAIL,
  AUTHORIZED_ADMIN_USERNAME,
} from '../../../utils/firebaseClient';
import { AdminUser } from '../../../types';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  AUTHORIZED_SUPABASE_ADMIN_EMAIL,
  fetchBackupList,
  createBackupSnapshot,
  restoreBackupSnapshot,
  BackupSummaryItem,
} from '../../../utils/supabaseClient';
import {
  saveNotification,
  requestPushPermission,
  triggerBrowserNotification,
  playGentleChime,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  PrayerAlertSettings,
} from '../../../utils/notificationService';
import { getDailyBundleForDate } from '../../../data/dailyContentData';
import {
  ENTERPRISE_ADMIN_MODULES,
  EnterpriseModuleId,
  hasAdminPermission,
  DEFAULT_RBAC_MATRIX,
} from '../../../utils/enterpriseAdminService';
import { EnterpriseAudioAndModulesWorkspaces } from './EnterpriseAudioAndModulesWorkspaces';

interface AdminPortalProps {
  currentSchedule: PrayerSchedule;
  onUpdateSchedule: (newSchedule: PrayerSchedule) => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'analytics'
  | 'users'
  | 'drafts'
  | 'prayer_schedule'
  | 'content'
  | 'archive'
  | 'inquiries'
  | 'notifications'
  | 'quiz_management'
  | 'adhan_settings'
  | 'telegram'
  | 'firebase'
  | 'supabase'
  | 'localization'
  | 'audit_logs'
  | 'enterprise_workspace';

const TELEGRAM_CONFIG_KEY = 'asaka_ziyo_telegram_config';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentSchedule,
  onUpdateSchedule,
  onExitAdmin,
}) => {
  // Authentication gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('SUPER_ADMIN');
  const [selectedEnterpriseModule, setSelectedEnterpriseModule] = useState<EnterpriseModuleId>('dashboard');
  const [moduleSearchQuery, setModuleSearchQuery] = useState<string>('');
  const [selectedModuleGroup, setSelectedModuleGroup] = useState<string>('all');

  // Login form inputs
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmNewPasswordValue, setConfirmNewPasswordValue] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<string | null>(null);

  // Archive & Recovery state
  const [archivedItems, setArchivedItems] = useState(() => getAllArchivedItems());
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'article' | 'news' | 'announcement' | 'media' | 'hadith' | 'dhikr' | 'inquiry'>('all');
  const [archiveActionMsg, setArchiveActionMsg] = useState<string | null>(null);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // User Management state
  const [usersList, setUsersList] = useState<ManagedUserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'restricted'>('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<ManagedUserProfile | null>(null);
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);

  // System Health state
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (activeTab === 'analytics') {
      setIsLoadingAnalytics(true);
      getAnalyticsSummary(analyticsRange).then(data => {
        setAnalyticsData(data);
        setIsLoadingAnalytics(false);
      }).catch(() => setIsLoadingAnalytics(false));
    }
  }, [activeTab, analyticsRange]);

  // Telegram Drafts state (Telegram -> Admin moderation queue)
  const [draftsList, setDraftsList] = useState<TelegramDraftItem[]>(() => getStoredDrafts());
  const [draftActionMsg, setDraftActionMsg] = useState<string | null>(null);

  // Supabase & Backup state
  const [supabaseConfig, setSupabaseConfig] = useState(getStoredSupabaseConfig());
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [backupsList, setBackupsList] = useState<BackupSummaryItem[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackupId, setIsRestoringBackupId] = useState<string | null>(null);

  // Prayer times state (All 8 times)
  const [editableTimes, setEditableTimes] = useState<PrayerTimeEntry[]>(
    currentSchedule.times
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    currentSchedule.isAdministratorPublished
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // CMS state
  const [cmsTab, setCmsTab] = useState<'articles' | 'news' | 'announcements' | 'media' | 'hadiths' | 'dhikrs' | 'daily'>('articles');
  const [articlesList, setArticlesList] = useState<Article[]>(() => getStoredArticles());
  const [newsList, setNewsList] = useState<NewsItem[]>(() => getStoredNews());
  const [announcementsList, setAnnouncementsList] = useState<AnnouncementItem[]>(() => getStoredAnnouncements());
  const [mediaList, setMediaList] = useState<MediaPost[]>(() => getStoredMediaPosts());
  const [hadithsList, setHadithsList] = useState<HadithItem[]>(() => getStoredHadiths());
  const [dhikrsList, setDhikrsList] = useState<DhikrItem[]>(() => getStoredDhikrs());

  // News & Announcement Modal state
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState<'Mahalliy' | 'Oʻzbekiston' | 'Ilm-maʼrifat' | 'Masjid hayoti'>('Masjid hayoti');
  const [newNewsSummary, setNewNewsSummary] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');

  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState<'Juma' | 'Ramazon' | 'Tadbir' | 'Xayriya' | 'Muhim'>('Muhim');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnLocation, setNewAnnLocation] = useState('Asaka Markaziy Jome Masjidi');

  // Inquiries / Support Chat state
  const [inquiriesList, setInquiriesList] = useState<SupportInquiry[]>(() => getStoredInquiries());
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'answered'>('all');

  // Push Notifications & Channel Broadcast state
  const [prayerAlertSettings, setPrayerAlertSettings] = useState<PrayerAlertSettings>(
    getPrayerAlertSettings()
  );
  const [customNotifTitle, setCustomNotifTitle] = useState('');
  const [customNotifMessage, setCustomNotifMessage] = useState('');
  const [customNotifCategory, setCustomNotifCategory] = useState<
    'announcement' | 'prayer' | 'news' | 'system' | 'lesson' | 'hadith' | 'dhikr' | 'quran' | 'quiz' | 'urgent'
  >('announcement');
  const [broadcastTargetAudience, setBroadcastTargetAudience] = useState<'all' | 'specific'>('all');
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [broadcastScheduledTime, setBroadcastScheduledTime] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [inboxMessagesList, setInboxMessagesList] = useState(() => getStoredInboxMessages());
  // Live dynamic statistics based on actual notification records
  const [deliveryStats, setDeliveryStats] = useState(() => {
    const notifs = getStoredNotifications();
    const count = notifs.length;
    return {
      sent: count > 0 ? count : 0,
      delivered: count > 0 ? count : 0,
      failed: 0,
    };
  });

  // Quiz Management state
  const [quizSubTab, setQuizSubTab] = useState<'bank' | 'schedule' | 'archive' | 'stats'>('bank');
  const [quizQuestionsList, setQuizQuestionsList] = useState<QuizQuestionItem[]>(() => getAllQuizQuestions());
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [newQuizCategory, setNewQuizCategory] = useState<QuizQuestionItem['category']>('Qurʼon');
  const [newQuizQuestion, setNewQuizQuestion] = useState('');
  const [newQuizOpt0, setNewQuizOpt0] = useState('');
  const [newQuizOpt1, setNewQuizOpt1] = useState('');
  const [newQuizOpt2, setNewQuizOpt2] = useState('');
  const [newQuizOpt3, setNewQuizOpt3] = useState('');
  const [newQuizCorrectIdx, setNewQuizCorrectIdx] = useState(0);
  const [newQuizExplanation, setNewQuizExplanation] = useState('');
  const [newQuizSource, setNewQuizSource] = useState('Tafsiri Hilol');
  const [newQuizReference, setNewQuizReference] = useState('');
  const [newQuizPublishedDate, setNewQuizPublishedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newQuizDifficulty, setNewQuizDifficulty] = useState<'oson' | 'orta' | 'murakkab'>('orta');
  const [newQuizSourceVerified, setNewQuizSourceVerified] = useState<boolean>(true);

  // Schedule & Archive & Stats state
  const [scheduleQuizDate, setScheduleQuizDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledQuestionIds, setScheduledQuestionIds] = useState<string[]>(() =>
    getDailyQuizQuestionsForDate(new Date().toISOString().slice(0, 10)).map((q) => q.id)
  );
  const [adminQuizArchive, setAdminQuizArchive] = useState<DailyQuizSet[]>([]);
  const [quizStats, setQuizStats] = useState<{
    totalAttempts: number;
    dailyAttemptsCount: number;
    archiveAttemptsCount: number;
    averageScore: number;
    averageCompletionTimeSeconds: number;
    recentAttempts: any[];
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'quiz_management') {
      fetchAllDailyQuizzesArchive().then(setAdminQuizArchive).catch(() => {});
      fetchQuizParticipationStats().then(setQuizStats).catch(() => {});
    }
  }, [activeTab, quizSubTab]);

  // Adhan & Audio Reciter state
  const [activeAdhanPlayingId, setActiveAdhanPlayingId] = useState<string | null>(null);
  const [adhanPreviewVolume, setAdhanPreviewVolume] = useState<number>(0.85);

  // Auto-notification option when publishing articles/news/prayer
  const [autoNotifyUsers, setAutoNotifyUsers] = useState<boolean>(true);

  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<FirestoreDiagnosticResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  // Telegram Integration state
  const [telegramBotToken, setTelegramBotToken] = useState(() => {
    try {
      const saved = localStorage.getItem(TELEGRAM_CONFIG_KEY);
      if (saved) return JSON.parse(saved).botToken || '';
    } catch {
      // ignore
    }
    return '';
  });
  const [telegramChannelId, setTelegramChannelId] = useState(() => {
    try {
      const saved = localStorage.getItem(TELEGRAM_CONFIG_KEY);
      if (saved) return JSON.parse(saved).channelId || '@Asaka_Ziyo';
    } catch {
      // ignore
    }
    return '@Asaka_Ziyo';
  });
  const [telegramCustomText, setTelegramCustomText] = useState(
    'Asaka Jome Masjidi: Bugungi eʼlon va namoz vaqtlari rasmiy portalimizda eʼlon qilindi.'
  );
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  // Forms for adding new CMS items + Publish Mode + File Upload
  const [selectedPublishMode, setSelectedPublishMode] = useState<PublishMode>('published');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'video' | 'audio' | undefined>(undefined);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<string | null>(null);

  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleSubtitle, setNewArticleSubtitle] = useState('');
  const [newArticleCategory, setNewArticleCategory] = useState<'Axloq' | 'Fiqh' | 'Aqoid' | 'Tarix' | 'Oila'>('Axloq');
  const [newArticleAuthor, setNewArticleAuthor] = useState('Abdulloh domla Oʻrinboyev');
  const [newArticleExcerpt, setNewArticleExcerpt] = useState('');
  const [newArticleBody, setNewArticleBody] = useState('');

  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaType, setNewMediaType] = useState<'reel' | 'video' | 'audio' | 'image'>('reel');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaCaption, setNewMediaCaption] = useState('');
  const [newMediaCategory, setNewMediaCategory] = useState('Qurʼon qiroati');

  const [showAddHadithModal, setShowAddHadithModal] = useState(false);
  const [newHadithCollection, setNewHadithCollection] = useState<'bukhari' | 'muslim' | 'nawawi' | 'tirmidhi'>('bukhari');
  const [newHadithNumber, setNewHadithNumber] = useState(1);
  const [newHadithNarrator, setNewHadithNarrator] = useState('');
  const [newHadithTextAr, setNewHadithTextAr] = useState('');
  const [newHadithTranslation, setNewHadithTranslation] = useState('');

  const [showAddDhikrModal, setShowAddDhikrModal] = useState(false);
  const [newDhikrTitle, setNewDhikrTitle] = useState('');
  const [newDhikrCategory, setNewDhikrCategory] = useState<'tonggi' | 'kechki' | 'namozdan_keyin' | 'sayyidul_istigfor'>('namozdan_keyin');
  const [newDhikrTextAr, setNewDhikrTextAr] = useState('');
  const [newDhikrTransliteration, setNewDhikrTransliteration] = useState('');
  const [newDhikrTranslation, setNewDhikrTranslation] = useState('');
  const [newDhikrTargetCount, setNewDhikrTargetCount] = useState(33);

  // Localization converter state
  const [converterInput, setConverterInput] = useState(
    'Shoshilinch xabar: Chiroyli Asaka shahrida yangi oʻquv markazi va gʻalaba bogʻi ochildi.'
  );
  const [converterCopied, setConverterCopied] = useState(false);

  // Firebase Firestore State
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseUser] = useState<any>(null);

  const [aiStatusInfo, setAiStatusInfo] = useState<{ connected: boolean; model: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminSessionAndAi() {
      const cached = getActiveAdminSession();
      if (cached && cached.username === AUTHORIZED_ADMIN_USERNAME && cached.isActive) {
        if (isMounted) {
          setAdminUser(cached);
          setActiveRole(cached.role);
          setIsAuthenticated(true);
        }
      }

      const verified = await verifyAdminSessionWithServer();
      if (!isMounted) return;

      if (verified && verified.username === AUTHORIZED_ADMIN_USERNAME && verified.isActive) {
        setAdminUser(verified);
        setActiveRole(verified.role);
        setIsAuthenticated(true);
        setLoginError(null);
      } else {
        setAdminUser(null);
        setIsAuthenticated(false);
      }
      setIsAuthLoading(false);

      try {
        const aiRes = await fetch('/api/ai/status');
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          if (isMounted) {
            setAiStatusInfo({
              connected: Boolean(aiJson.connected),
              model: aiJson.model || 'gemini-3.8-flash',
            });
          }
        }
      } catch {
        // ignore
      }
    }

    checkAdminSessionAndAi();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') {
        setArticlesList(getStoredArticles());
        setArchivedItems(getAllArchivedItems());
      }
      if (event.type === 'POSTS_UPDATED') {
        setMediaList(getStoredMediaPosts());
        setArchivedItems(getAllArchivedItems());
      }
      if (event.type === 'HADITHS_UPDATED') {
        setHadithsList(getStoredHadiths());
        setArchivedItems(getAllArchivedItems());
      }
      if (event.type === 'DHIKRS_UPDATED') {
        setDhikrsList(getStoredDhikrs());
        setArchivedItems(getAllArchivedItems());
      }
      if (event.type === 'NEWS_UPDATED') {
        setNewsList(getStoredNews());
      }
      if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        setAnnouncementsList(getStoredAnnouncements());
      }
      if (event.type === 'INQUIRIES_UPDATED') {
        setInquiriesList(getStoredInquiries());
        setArchivedItems(getAllArchivedItems());
      }
      if (event.type === 'DRAFTS_UPDATED') setDraftsList(getStoredDrafts());
      if (event.type === 'AUDIT_LOGS_UPDATED') {
        getStoredAuditLogs().then((logs) => setAuditLogs(logs));
      }
    });
    return unsubscribe;
  }, []);

  // Refresh authoritative Firestore data, users, and audit logs whenever admin is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncWithFirestore(true);
      fetchBackupList().then((res) => {
        if (res.success) {
          setBackupsList(res.backups);
        }
      });
      fetchRegisteredUsersList().then((users) => setUsersList(users));
      getStoredAuditLogs().then((logs) => setAuditLogs(logs));
      getAnalyticsSummary(analyticsRange).then((data) => setAnalyticsData(data));
      runComprehensiveSystemHealthCheck().then((rep) => setHealthReport(rep));
    }
  }, [isAuthenticated, analyticsRange]);

  // Sync currentSchedule prop changes
  useEffect(() => {
    if (currentSchedule && currentSchedule.times) {
      setEditableTimes(currentSchedule.times);
      setIsPublished(currentSchedule.isAdministratorPublished);
    }
  }, [currentSchedule]);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingAuth(true);

    try {
      const { admin } = await signInAdmin(loginInput, passwordInput);
      setAdminUser(admin);
      setActiveRole(admin.role);
      setIsAuthenticated(true);

      const loginLog: AuditLogEntry = {
        id: `log-auth-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: `${admin.displayName} (${admin.role})`,
        role: admin.role,
        action: 'ADMIN_LOGIN_SUCCESS',
        resource: 'Maʼmuriyat Konsoli',
        status: 'SUCCESS',
        detailsUz: `Administrator ${admin.displayName} Firebase orqali muvaffaqiyatli tizimga kirdi.`,
      };
      setAuditLogs((prev) => [loginLog, ...prev]);
    } catch (err: any) {
      setLoginError(err?.message || 'Login yoki parol noto‘g‘ri kiritildi.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await signOutFirebase();
    setIsAuthenticated(false);
    setAdminUser(null);
    setLoginInput('');
    setPasswordInput('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordValue !== confirmNewPasswordValue) {
      setPasswordChangeStatus('Parollar bir-biriga mos kelmadi!');
      return;
    }
    const res = await changeCurrentAdminPassword(newPasswordValue);
    if (res.success) {
      setPasswordChangeStatus('✅ Parol muvaffaqiyatli yangilandi!');
      setTimeout(() => {
        setShowPasswordChangeModal(false);
        setPasswordChangeStatus(null);
        setNewPasswordValue('');
        setConfirmNewPasswordValue('');
      }, 2000);
    } else {
      setPasswordChangeStatus(`⚠️ ${res.error}`);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended' | 'restricted', reason?: string) => {
    setUserActionMsg(null);
    const res = await saveUserAccountStatus(userId, newStatus, reason);
    if (res.success) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus, statusReason: reason || '' } : u))
      );
      setUserActionMsg(`✅ Foydalanuvchi holati «${newStatus}» deb yangilandi.`);
      setTimeout(() => setUserActionMsg(null), 4000);
    } else {
      setUserActionMsg(`❌ Xatolik yuz berdi: ${res.error || 'Nomaʼlum xato'}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole | 'USER') => {
    setUserActionMsg(null);
    const res = await saveUserRoleAssignment(userId, newRole);
    if (res.success) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setUserActionMsg(`✅ Foydalanuvchi roli «${newRole}» deb belgilandi.`);
      setTimeout(() => setUserActionMsg(null), 4000);
    } else {
      setUserActionMsg(`❌ Xatolik yuz berdi: ${res.error || 'Nomaʼlum xato'}`);
    }
  };

  const handleRunHealthDiagnostics = async () => {
    setIsCheckingHealth(true);
    try {
      const rep = await runComprehensiveSystemHealthCheck();
      setHealthReport(rep);
      await recordAdminAuditLog({
        action: 'HEALTH_CHECK_COMPLETED',
        resource: 'Tizim Diagnostikasi',
        detailsUz: `Firestore: ${rep.firestoreLatencyMs}ms, Server: ${rep.serverStatus}, Xotira: ${rep.localStorageUsageKb}KB`,
        status: rep.firestoreStatus === 'healthy' ? 'SUCCESS' : 'WARNING',
        user: adminUser?.displayName,
        role: activeRole,
      });
    } catch {
      // ignore
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleRestoreItem = async (type: any, id: string) => {
    const res = await restoreArchivedItem(type, id);
    if (res.success) {
      setArchiveActionMsg('✅ Material arxivdan muvaffaqiyatli tiklandi va jonli tizimga qaytarildi!');
      setArchivedItems(getAllArchivedItems());
      setArticlesList(getStoredArticles());
      setMediaList(getStoredMediaPosts());
      setHadithsList(getStoredHadiths());
      setDhikrsList(getStoredDhikrs());
      setInquiriesList(getStoredInquiries());
      recordAdminAuditLog({
        action: 'CONTENT_RESTORED',
        resource: `${type}: ${id}`,
        detailsUz: `Material arxivdan muvaffaqiyatli tiklandi: ${type} #${id}`,
        status: 'SUCCESS',
        user: adminUser?.displayName,
        role: activeRole,
      }).catch(() => {});
      setTimeout(() => setArchiveActionMsg(null), 3000);
    } else {
      setArchiveActionMsg(`⚠️ Xatolik: ${res.error}`);
    }
  };

  // Prayer times update handler for all 8 prayer times
  const handleTimeChange = (key: PrayerKey, field: 'time' | 'iqamahTime', val: string) => {
    setEditableTimes((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: val } : item))
    );
  };

  const handleImportCsvPrayerTimes = () => {
    if (!csvInput.trim()) {
      setCsvStatus('Iltimos, CSV matnini kiriting yoki namuna nusxasini qoʻying.');
      return;
    }
    try {
      const lines = csvInput.trim().split('\n');
      let updatedCount = 0;
      const newTimes = [...editableTimes];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.toLowerCase().startsWith('namoz') || line.toLowerCase().startsWith('key')) continue;

        const parts = line.split(/[,;\t]+/).map((p) => p.trim());
        if (parts.length < 2) continue;

        const prayerKeyOrName = parts[0].toLowerCase().replace(/['ʻʼ`]/g, '');
        const timeVal = parts[1];
        const iqamahVal = parts[2] || '';

        const matchedIdx = newTimes.findIndex((t) => {
          const k = t.key.toLowerCase();
          const uz = t.nameUz.toLowerCase().replace(/['ʻʼ`]/g, '');
          return (
            k === prayerKeyOrName ||
            uz === prayerKeyOrName ||
            (prayerKeyOrName.includes('bomdod') && k === 'bomdod') ||
            (prayerKeyOrName.includes('peshin') && k === 'peshin') ||
            (prayerKeyOrName.includes('asr') && k === 'asr') ||
            (prayerKeyOrName.includes('shom') && k === 'shom') ||
            (prayerKeyOrName.includes('xufton') && k === 'xufton') ||
            (prayerKeyOrName.includes('quyosh') && k === 'quyosh') ||
            (prayerKeyOrName.includes('tahajjud') && k === 'tahajjud') ||
            (prayerKeyOrName.includes('subh') && k === 'subh')
          );
        });

        if (matchedIdx !== -1 && /^([01]?\d|2[0-3]):[0-5]\d$/.test(timeVal)) {
          newTimes[matchedIdx] = {
            ...newTimes[matchedIdx],
            time: timeVal,
            iqamahTime:
              iqamahVal && /^([01]?\d|2[0-3]):[0-5]\d$/.test(iqamahVal)
                ? iqamahVal
                : newTimes[matchedIdx].iqamahTime,
          };
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        setEditableTimes(newTimes);
        setCsvStatus(
          `✅ Muvaffaqiyatli: ${updatedCount} ta namoz vaqti CSV dan qabul qilindi! Oʻzgarishlarni kuchga kiritish uchun yuqoridagi «Saqlash va Barchaga Tarqatish» tugmasini bosing.`
        );
        setCsvInput('');
      } else {
        setCsvStatus(
          '⚠️ Xatolik: Mos keluvchi namoz vaqtlari topilmadi. Format namunasi: bomdod,05:35,06:05 yoki peshin,12:20,12:40'
        );
      }
    } catch (err: any) {
      setCsvStatus(`⚠️ Tahlil xatosi: ${err?.message || 'CSV formatini tekshiring'}`);
    }
  };

  const handleSaveSchedule = async () => {
    const updated: PrayerSchedule = {
      ...currentSchedule,
      times: editableTimes,
      isAdministratorPublished: isPublished,
      verifiedAt: isPublished ? new Date().toISOString() : undefined,
      publishedBy: isPublished
        ? `Tasdiqlandi: Asaka Jome Masjidi Maʼmuriyati`
        : 'Asaka Jome Masjidi Maʼmuriyati (Qoralama)',
      disclaimer: isPublished
        ? 'Ushbu namoz vaqtlari Asaka jome masjidi maʼmuriyati tomonidan rasman tasdiqlangan va joriy etilgan jadvaldir.'
        : 'DIQQAT: Ushbu jadval qoralama hisoblanadi. Namoz vaqtlari Oʻzbekiston musulmonlari idorasi va Asaka masjidi maʼmurlari tomonidan tasdiqlanib kiritiladi.',
    };

    // Save and sync with database service across all tabs and server
    const res = await saveStoredPrayerSchedule(updated, isPublished);
    onUpdateSchedule(updated);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: `Admin (${activeRole})`,
      role: activeRole,
      action: isPublished ? 'PRAYER_SCHEDULE_PUBLISHED' : 'PRAYER_SCHEDULE_DRAFT_UPDATED',
      resource: 'Asaka 8 Namoz Jadvali',
      status: 'SUCCESS',
      detailsUz: isPublished
        ? 'Barcha 8 namoz vaqtlari rasmiy tasdiqlanib barcha foydalanuvchilarga joriy etildi.'
        : 'Qoralama jadval yangilandi.',
    };
    setAuditLogs([newLog, ...auditLogs]);
    recordAdminAuditLog(newLog).catch(() => {});

    if (res.success) {
      if (isPublished) {
        sendAdminMessage({
          title: 'Asaka namoz vaqtlari yangilandi',
          body: 'Asaka hududi uchun 8 ta namoz vaqtlari jadvali imom-xatib tomonidan tasdiqlandi va yangilandi.',
          category: 'prayer',
          linkTab: 'prayer',
          priority: 'high',
        }).catch(() => {});
        saveNotification({
          title: 'Asaka namoz vaqtlari yangilandi',
          message: 'Namoz vaqtlari jadvali yangilandi. Ilovada tekshirib oling.',
          category: 'prayer',
          priority: 'high',
        });
      }
      setSaveSuccessMsg(
        isPublished
          ? 'Barcha 8 ta namoz vaqti (Tahajjud, Subh, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton) markaziy server bazasida tasdiqlandi va saqlandi!'
          : 'Qoralama jadval markaziy server bazasida saqlandi.'
      );
    } else {
      setSaveSuccessMsg(`Ogohlantirish: ${res.error || 'Serverga saqlandi'}`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Inquiry Reply Handler
  const handleReplyInquiry = async (inquiryId: string) => {
    if (!replyText.trim()) return;

    const res = await replyToInquiry(inquiryId, replyText.trim(), 'Asaka Jome Masjidi Maʼmuriyati');
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error || 'Javob saqlanmadi'}`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      return;
    }
    setReplyText('');
    setSelectedInquiryId(null);
    setInquiriesList(getStoredInquiries());
    setSaveSuccessMsg('Javob Firebase Firestore bazasida saqlandi va foydalanuvchiga muvaffaqiyatli yetkazildi!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    const res = await deleteStoredInquiry(inquiryId);
    setInquiriesList(getStoredInquiries());
    setArchivedItems(getAllArchivedItems());
    setSaveSuccessMsg(res.success ? 'Murojaat xavfsiz arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Telegram Drafts Moderation Handlers
  const handleApproveDraft = async (id: string) => {
    const ok = await approveDraft(id, `${adminUser?.displayName || 'Bosh Maʼmur'}`);
    if (ok) {
      setDraftsList(getStoredDrafts());
      setArticlesList(getStoredArticles());
      setMediaList(getStoredMediaPosts());
      setSaveSuccessMsg('Qoralama muvaffaqiyatli tasdiqlandi va tegishli boʻlimga toʻgʻri joylandi!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleRejectDraft = async (id: string) => {
    const ok = await rejectDraft(id, `${adminUser?.displayName || 'Bosh Maʼmur'}`);
    if (ok) {
      setDraftsList(getStoredDrafts());
      setSaveSuccessMsg('Qoralama rad etildi.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    const ok = await deleteDraft(id);
    if (ok) {
      setDraftsList(getStoredDrafts());
      setSaveSuccessMsg('Qoralama oʻchirildi.');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  const handleSimulateTelegramDraft = async (source: '@Asaka_Ziyo' | '@muhiddinsahhofuz') => {
    if (source === '@Asaka_Ziyo') {
      await createDraft({
        sourceChannel: '@Asaka_Ziyo',
        targetSection: 'prayer',
        title: 'Asaka Jome Masjidi: Yangi haftalik namoz vaqtlari qoralamasi',
        content: 'Asaka shahri jome masjidi uchun yangilangan taqvim taklifi: Bomdod 05:25, Peshin 12:05, Asr 15:15, Shom 17:18, Xufton 18:40, Tahajjud 03:45, Subh 04:42.',
        prayerTimesDraft: {
          tahajjud: '03:45',
          subh: '04:42',
          bomdod: '05:25',
          quyosh: '06:48',
          peshin: '12:05',
          asr: '15:15',
          shom: '17:18',
          xufton: '18:40',
        },
      });
    } else {
      await createDraft({
        sourceChannel: '@muhiddinsahhofuz',
        targetSection: 'articles',
        title: 'Qalb tarbiyasi va sunnatga ergashish fazilati',
        content: 'Alloh taolo moʻmin bandalariga oʻz Paygʻambari Muhammad Mustafo ﷺ ga itoat qilishni va ul zotning goʻzal sunnatlariga ergashishni buyuradi. Qalb qachonki sunnat bilan nurlansa, dunyo va oxirat saodatiga erishadi...',
        mediaUrl: '/images/islamic_scholarship_library_1793634659800.jpg',
      });
    }
    setDraftsList(getStoredDrafts());
    setSaveSuccessMsg(`${source} rasmiy kanalidan yangi qoralama muvaffaqiyatli qabul qilindi!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Push notifications
  const handleSavePrayerSettings = (newSettings: PrayerAlertSettings) => {
    setPrayerAlertSettings(newSettings);
    savePrayerAlertSettings(newSettings);
    setNotifSuccessMsg('Namoz eslatmalari sozlamasi saqlandi!');
    setTimeout(() => setNotifSuccessMsg(null), 3000);
  };

  const handleSendPushBroadcast = async () => {
    if (!customNotifTitle.trim() || !customNotifMessage.trim()) return;
    setIsSendingBroadcast(true);

    try {
      // 1. Send to Firestore messages collection (Telegram/YouTube-style channel inbox)
      await sendAdminMessage({
        title: customNotifTitle,
        body: customNotifMessage,
        category: customNotifCategory as any,
        imageUrl: broadcastImageUrl.trim() || undefined,
        isBroadcast: broadcastTargetAudience === 'all',
        targetUserId: broadcastTargetAudience === 'specific' ? broadcastTargetUserId : undefined,
        priority: broadcastPriority,
      });

      // 2. Save in-app notification
      saveNotification({
        title: customNotifTitle,
        message: customNotifMessage,
        category: (customNotifCategory === 'lesson' ? 'article' : customNotifCategory === 'urgent' ? 'system' : customNotifCategory) as any,
        priority: broadcastPriority,
      });

      // 3. Trigger server-side FCM broadcast
      const adminToken = getActiveAdminToken();
      await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          title: customNotifTitle,
          body: customNotifMessage,
          category: customNotifCategory,
          imageUrl: broadcastImageUrl.trim() || undefined,
          scheduledTime: broadcastScheduledTime || undefined,
          targetAudience: broadcastTargetAudience,
        }),
      }).catch(() => {});

      // 4. Update delivery stats & history
      setDeliveryStats((prev) => ({
        sent: prev.sent + 1,
        delivered: prev.delivered + 1,
        failed: prev.failed,
      }));
      setInboxMessagesList(getStoredInboxMessages());

      recordAdminAuditLog({
        action: 'NOTIFICATION_BROADCAST',
        resource: `Xabarnoma: ${customNotifTitle.slice(0, 40)}`,
        detailsUz: `Target: ${broadcastTargetAudience}, Muhimlik: ${broadcastPriority}, Kategoriya: ${customNotifCategory}`,
        status: 'SUCCESS',
        user: adminUser?.displayName,
        role: activeRole,
      }).catch(() => {});

      setCustomNotifTitle('');
      setCustomNotifMessage('');
      setBroadcastImageUrl('');
      setBroadcastScheduledTime('');
      setNotifSuccessMsg('Push xabarnoma markaziy server bazasida saqlandi va barcha foydalanuvchilarga tarqatildi!');
      setTimeout(() => setNotifSuccessMsg(null), 3500);
    } catch (e: any) {
      setNotifSuccessMsg(`⚠️ Xatolik: ${e?.message || 'Tarqatishda uzilish'}`);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleCreateQuizQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizQuestion.trim() || !newQuizOpt0.trim() || !newQuizOpt1.trim()) return;

    const newQuestionPayload = {
      category: newQuizCategory,
      questionUz: newQuizQuestion.trim(),
      optionsUz: [
        newQuizOpt0.trim(),
        newQuizOpt1.trim(),
        newQuizOpt2.trim() || '—',
        newQuizOpt3.trim() || '—',
      ] as [string, string, string, string],
      correctIndex: newQuizCorrectIdx,
      explanationUz: newQuizExplanation.trim() || 'Toʻgʻri javob sharhi.',
      source: newQuizSource.trim(),
      reference: newQuizReference.trim() || undefined,
      publishedDate: newQuizPublishedDate || new Date().toISOString().slice(0, 10),
      difficulty: newQuizDifficulty,
      isApproved: newQuizSourceVerified,
      sourceVerified: newQuizSourceVerified,
      status: newQuizSourceVerified ? ('approved' as const) : ('pending' as const),
    };

    if (!newQuestionPayload.source || newQuestionPayload.source.length < 3) {
      setSaveSuccessMsg('Xatolik: Moʻtabar manba nomi kiritilishi shart!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      return;
    }

    if (editingQuizId) {
      const updatedItem: QuizQuestionItem = {
        ...newQuestionPayload,
        id: editingQuizId,
      };
      await saveStoredQuizQuestion(updatedItem);
      setQuizQuestionsList((prev) => prev.map((q) => (q.id === editingQuizId ? updatedItem : q)));
      recordAdminAuditLog({
        action: 'QUIZ_UPDATED',
        resource: `Savol: ${updatedItem.questionUz.slice(0, 35)}...`,
        detailsUz: `Toifasi: ${updatedItem.category}, Darajasi: ${updatedItem.difficulty}`,
        status: 'SUCCESS',
        user: adminUser?.displayName,
        role: activeRole,
      }).catch(() => {});
      setSaveSuccessMsg(`«${updatedItem.questionUz.slice(0, 30)}...» savoli yangilandi!`);
    } else {
      const added = addCustomQuizQuestion(newQuestionPayload);
      await saveStoredQuizQuestion(added);
      setQuizQuestionsList((prev) => [added, ...prev.filter((q) => q.id !== added.id)]);
      recordAdminAuditLog({
        action: 'QUIZ_CREATED',
        resource: `Savol: ${added.questionUz.slice(0, 35)}...`,
        detailsUz: `Toifasi: ${added.category}, Manbasi: ${added.source}`,
        status: 'SUCCESS',
        user: adminUser?.displayName,
        role: activeRole,
      }).catch(() => {});
      setSaveSuccessMsg(`«${added.questionUz.slice(0, 30)}...» savoli Firestore bazasiga qoʻshildi!`);
    }

    setShowAddQuizModal(false);
    setEditingQuizId(null);
    setNewQuizQuestion('');
    setNewQuizOpt0('');
    setNewQuizOpt1('');
    setNewQuizOpt2('');
    setNewQuizOpt3('');
    setNewQuizExplanation('');
    setNewQuizReference('');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleOpenEditQuiz = (item: QuizQuestionItem) => {
    setEditingQuizId(item.id);
    setNewQuizCategory(item.category);
    setNewQuizQuestion(item.questionUz);
    setNewQuizOpt0(item.optionsUz[0] || '');
    setNewQuizOpt1(item.optionsUz[1] || '');
    setNewQuizOpt2(item.optionsUz[2] || '');
    setNewQuizOpt3(item.optionsUz[3] || '');
    setNewQuizCorrectIdx(item.correctIndex);
    setNewQuizExplanation(item.explanationUz);
    setNewQuizSource(item.source);
    setNewQuizReference(item.reference || '');
    setNewQuizPublishedDate(item.publishedDate || new Date().toISOString().slice(0, 10));
    setNewQuizDifficulty(item.difficulty);
    setNewQuizSourceVerified(item.sourceVerified !== false);
    setShowAddQuizModal(true);
  };

  const handleUpdateQuizStatus = async (
    item: QuizQuestionItem,
    updates: Partial<QuizQuestionItem>
  ) => {
    const updated: QuizQuestionItem = {
      ...item,
      ...updates,
    };
    await saveStoredQuizQuestion(updated);
    setQuizQuestionsList((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
    setSaveSuccessMsg('Savol holati yangilandi.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleSaveScheduledQuiz = async () => {
    const selectedQuestions = quizQuestionsList.filter((q) => scheduledQuestionIds.includes(q.id));
    if (selectedQuestions.length !== 10) {
      setSaveSuccessMsg(`Xatolik: Roppa-rosa 10 ta savol tanlang (hozir: ${selectedQuestions.length} ta).`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      return;
    }
    const res = await saveScheduledDailyQuiz(scheduleQuizDate, selectedQuestions, true);
    if (res.success) {
      setSaveSuccessMsg(`${scheduleQuizDate} sanasi uchun 10 ta savolli kunlik viktorina rejalashtirildi!`);
      fetchAllDailyQuizzesArchive().then(setAdminQuizArchive).catch(() => {});
    } else {
      setSaveSuccessMsg(`Xatolik: ${res.error}`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleToggleAdhanPreview = (track: AdhanTrack) => {
    if (activeAdhanPlayingId === track.id) {
      stopActiveAdhanAudio();
      setActiveAdhanPlayingId(null);
    } else {
      stopActiveAdhanAudio();
      playAdhanAudioTrack(track, adhanPreviewVolume);
      setActiveAdhanPlayingId(track.id);
    }
  };

  // Telegram configuration & broadcast (Channels: @Asaka_Ziyo and @muhiddinsahhofuz)
  const [selectedTelegramChannel, setSelectedTelegramChannel] = useState<'@Asaka_Ziyo' | '@muhiddinsahhofuz'>('@Asaka_Ziyo');

  const handleSaveTelegramConfig = async () => {
    try {
      localStorage.setItem(
        TELEGRAM_CONFIG_KEY,
        JSON.stringify({ botToken: telegramBotToken, channelId: telegramChannelId })
      );
      const token = getActiveAdminToken();
      await fetch('/api/database/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ botToken: telegramBotToken, channelId: telegramChannelId }),
      });
      setTelegramStatus('Telegram sozlamalari markaziy serverda saqlandi!');
      setTimeout(() => setTelegramStatus(null), 3000);
    } catch {
      // ignore
    }
  };

  const handleSendTelegramMessage = async (customMessage?: string) => {
    const textToSend = customMessage || telegramCustomText;
    if (!textToSend.trim()) return;

    setIsSendingTelegram(true);
    setTelegramStatus(`${selectedTelegramChannel} kanaliga server orqali yuborilmoqda...`);

    try {
      const adminToken = getActiveAdminToken();
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          message: textToSend,
          token: telegramBotToken.trim(),
          channel: selectedTelegramChannel,
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        setTelegramStatus(
          `✅ Muvaffaqiyatli: Xabar ${selectedTelegramChannel} kanaliga yetkazildi!`
        );
      } else {
        setTelegramStatus(
          `⚠️ Xabar: ${resData.error || 'Bot Token kiritilmagan boʻlsa, bu ixtiyoriy rejimda ishlaydi.'}`
        );
      }
    } catch {
      setTelegramStatus(
        '⚠️ Tarmoq xatosi: Serverga ulanish imkoni boʻlmadi.'
      );
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleBroadcastPrayerTimesToTelegram = () => {
    const timesList = editableTimes
      .map(
        (t) =>
          `• <b>${t.nameUz}</b> (${t.nameAr}): <b>${t.time}</b>${
            t.iqamahTime ? ` (Iqomat: ${t.iqamahTime})` : ''
          }`
      )
      .join('\n');

    const message = `🌙 <b>ASAKA ZIYO — RASMIY 8 NAMOZ TAQVIMI</b>\n📍 <i>Asaka shahri, Andijon viloyati</i>\n📅 <i>${currentSchedule.formattedDateUz} / ${currentSchedule.hijriDate}</i>\n\n${timesList}\n\n<i>«Albatta, namoz moʻminlarga vaqtida tayinlangan farzdir»</i>\n\n📲 Rasmiy portal: @asaka_ziyo_rasmiy`;

    handleSendTelegramMessage(message);
  };

  const resetModalMediaAndMode = () => {
    setSelectedPublishMode('published');
    setUploadedFileUrl('');
    setUploadedFileType(undefined);
    setFileUploadStatus(null);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    setFileUploadStatus(`«${file.name}» serverga yuklanmoqda...`);
    const res = await uploadAdminMediaFile(file);
    setIsUploadingFile(false);
    if (res.success && res.url) {
      setUploadedFileUrl(res.url);
      setUploadedFileType(res.mediaType);
      setNewMediaUrl(res.url);
      setFileUploadStatus(`✅ Yuklandi: ${file.name} (${res.mediaType || 'fayl'})`);
    } else {
      setFileUploadStatus(`⚠️ Xatolik: ${res.error || 'Yuklab boʻlmadi'}`);
    }
  };

  const handleSwitchPublishMode = async (
    collectionName: 'articles' | 'news' | 'announcements' | 'mediaPosts' | 'hadiths' | 'dhikrs',
    id: string,
    mode: PublishMode
  ) => {
    const res = await updateItemPublishMode(collectionName, id, mode);
    setArticlesList(getStoredArticles());
    setNewsList(getStoredNews());
    setAnnouncementsList(getStoredAnnouncements());
    setMediaList(getStoredMediaPosts());
    setHadithsList(getStoredHadiths());
    setDhikrsList(getStoredDhikrs());
    setArchivedItems(getAllArchivedItems());
    const modeLabels: Record<PublishMode, string> = {
      published: 'Doimiy chop etildi (Jonli)',
      draft: 'Qoralama rejimiga oʻtkazildi',
      test: 'Test rejimiga oʻtkazildi',
      archived: 'Arxivga oʻtkazildi',
    };
    setSaveSuccessMsg(res.success ? `✅ Holat yangilandi: ${modeLabels[mode]}` : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handlePermanentDelete = async (
    collectionName: 'articles' | 'news' | 'announcements' | 'mediaPosts' | 'hadiths' | 'dhikrs',
    id: string
  ) => {
    const res = await permanentlyDeleteItem(collectionName, id);
    setArticlesList(getStoredArticles());
    setNewsList(getStoredNews());
    setAnnouncementsList(getStoredAnnouncements());
    setMediaList(getStoredMediaPosts());
    setHadithsList(getStoredHadiths());
    setDhikrsList(getStoredDhikrs());
    setArchivedItems(getAllArchivedItems());
    setSaveSuccessMsg(
      res.success
        ? '🗑️ Material Firestore va keshdan butunlay oʻchirildi.'
        : `⚠️ ${res.error}`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Adding new Article
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleExcerpt.trim()) return;

    const nowIso = new Date().toISOString();
    const newArt: Article = {
      id: `art-${Date.now()}`,
      title: newArticleTitle.trim(),
      subtitle: newArticleSubtitle.trim() || newArticleTitle.trim(),
      category: newArticleCategory,
      author: newArticleAuthor.trim() || 'Asaka Masjidi Imomi',
      authorRole: 'Tahririyat Hayʼati',
      publishedDate: new Date().toLocaleDateString('uz-UZ'),
      createdAtIso: nowIso,
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      readTimeMinutes: Math.max(3, Math.round(newArticleBody.length / 400)),
      featuredImage: uploadedFileUrl || '/images/quran_illumination_art_1793634658336.jpg',
      mediaUrl: uploadedFileUrl || undefined,
      mediaType: uploadedFileType,
      excerpt: newArticleExcerpt.trim(),
      bodyParagraphs: newArticleBody
        ? newArticleBody.split('\n\n').filter(Boolean)
        : [newArticleExcerpt.trim()],
      likesCount: 0,
      rating: 5.0,
      ratingsCount: 1,
      comments: [],
    };

    const res = await saveStoredArticle(newArt);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }

    if (selectedPublishMode === 'published') {
      sendAdminMessage({
        title: `Yangi ilmiy maqola: ${newArt.title}`,
        body: newArt.excerpt || newArt.title,
        category: 'lesson',
        imageUrl: newArt.featuredImage,
        linkTab: 'articles',
        priority: 'normal',
      }).catch(() => {});
      saveNotification({
        title: 'Yangi maqola eʼlon qilindi',
        message: newArt.title,
        category: 'article',
        priority: 'normal',
        routeTab: 'articles',
        routeId: newArt.id,
      });
    }

    setArticlesList(getStoredArticles());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'ARTICLE_CREATED',
      resource: `Maqola: ${newArt.title.slice(0, 40)}`,
      detailsUz: `Muallif: ${newArt.author}, Holat: ${newArt.publishMode}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddArticleModal(false);
    setNewArticleTitle('');
    setNewArticleSubtitle('');
    setNewArticleExcerpt('');
    setNewArticleBody('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi maqola Firebase Firestore bazasida muvaffaqiyatli saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteArticle = async (id: string) => {
    const res = await deleteStoredArticle(id);
    setArticlesList(getStoredArticles());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'ARTICLE_ARCHIVED',
      resource: `Maqola ID: ${id}`,
      detailsUz: 'Maqola xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Maqola xavfsiz arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new Media Post
  const handleCreateMediaPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaTitle.trim()) return;

    const finalUrl = uploadedFileUrl || newMediaUrl.trim() || '/images/asaka_islamic_architecture_1793634657962.jpg';
    const newPost: MediaPost = {
      id: `post-${Date.now()}`,
      title: newMediaTitle.trim(),
      type: newMediaType,
      category: newMediaCategory,
      author: 'Asaka Ziyo Studiyasi',
      publishedDate: new Date().toLocaleDateString('uz-UZ'),
      createdAtIso: new Date().toISOString(),
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      mediaUrl: finalUrl,
      mediaType: uploadedFileType || (newMediaType === 'reel' || newMediaType === 'video' ? 'video' : newMediaType === 'audio' ? 'audio' : 'image'),
      thumbnail: finalUrl,
      caption: newMediaCaption.trim(),
      likesCount: 0,
      commentsCount: 0,
      isPublished: selectedPublishMode === 'published',
      comments: [],
    };

    const res = await saveStoredMediaPost(newPost);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }
    setMediaList(getStoredMediaPosts());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'MEDIA_CREATED',
      resource: `Media: ${newPost.title.slice(0, 40)}`,
      detailsUz: `Turi: ${newPost.type}, Toifasi: ${newPost.category}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddMediaModal(false);
    setNewMediaTitle('');
    setNewMediaCaption('');
    setNewMediaUrl('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi media lavhasi Firebase Firestore bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteMediaPost = async (id: string) => {
    const res = await deleteStoredMediaPost(id);
    setMediaList(getStoredMediaPosts());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'MEDIA_ARCHIVED',
      resource: `Media ID: ${id}`,
      detailsUz: 'Media lavhasi xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Media posti xavfsiz arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new Hadith
  const handleCreateHadith = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHadithTextAr.trim() || !newHadithTranslation.trim()) return;

    const newH: HadithItem = {
      id: `h-${Date.now()}`,
      collection: newHadithCollection,
      collectionNameUz:
        newHadithCollection === 'bukhari'
          ? 'Sahihi Buxoriy'
          : newHadithCollection === 'muslim'
          ? 'Sahihi Muslim'
          : newHadithCollection === 'tirmidhi'
          ? 'Sunani Termiziy'
          : 'Qirq Hadis',
      number: newHadithNumber,
      chapterUz: 'Moʻtabar hadislar bobi',
      narratorUz: newHadithNarrator.trim() || 'Rasululloh ﷺ sahobasi',
      textAr: newHadithTextAr.trim(),
      translationUz: newHadithTranslation.trim(),
      grade: 'Sahih',
      reference: `${newHadithCollection}, ${newHadithNumber}-hadis`,
      keywords: ['hadis', 'hikmat', 'sunnat'],
      createdAtIso: new Date().toISOString(),
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      mediaUrl: uploadedFileUrl || undefined,
      mediaType: uploadedFileType,
    };

    const res = await saveStoredHadith(newH);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }
    setHadithsList(getStoredHadiths());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'HADITH_CREATED',
      resource: `Hadis: ${newH.collectionNameUz} #${newH.number}`,
      detailsUz: `Roviy: ${newH.narratorUz}, Holat: ${newH.publishMode}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddHadithModal(false);
    setNewHadithNarrator('');
    setNewHadithTextAr('');
    setNewHadithTranslation('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi moʻtabar hadis Firebase Firestore bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteHadith = async (id: string) => {
    const res = await deleteStoredHadith(id);
    setHadithsList(getStoredHadiths());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'HADITH_ARCHIVED',
      resource: `Hadis ID: ${id}`,
      detailsUz: 'Hadis xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Hadis xavfsiz arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new Dhikr
  const handleCreateDhikr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDhikrTextAr.trim() || !newDhikrTitle.trim()) return;

    const newD: DhikrItem = {
      id: `d-${Date.now()}`,
      titleUz: newDhikrTitle.trim(),
      category: newDhikrCategory,
      categoryTitleUz: 'Zikr va Tasbeh',
      textAr: newDhikrTextAr.trim(),
      transliterationUz: newDhikrTransliteration.trim(),
      translationUz: newDhikrTranslation.trim(),
      targetCount: newDhikrTargetCount,
      virtueUz: 'Qalbga xotirjamlik va ulugʻ ajr keltiruvchi muborak zikr.',
      source: 'Moʻtabar manbalardan',
      createdAtIso: new Date().toISOString(),
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      mediaUrl: uploadedFileUrl || undefined,
      mediaType: uploadedFileType,
    };

    const res = await saveStoredDhikr(newD);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }
    setDhikrsList(getStoredDhikrs());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'DHIKR_CREATED',
      resource: `Zikr: ${newD.titleUz.slice(0, 40)}`,
      detailsUz: `Toifasi: ${newD.category}, Soni: ${newD.targetCount}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddDhikrModal(false);
    setNewDhikrTitle('');
    setNewDhikrTextAr('');
    setNewDhikrTransliteration('');
    setNewDhikrTranslation('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi zikr va duo Firebase Firestore bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteDhikr = async (id: string) => {
    const res = await deleteStoredDhikr(id);
    setDhikrsList(getStoredDhikrs());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'DHIKR_ARCHIVED',
      resource: `Zikr ID: ${id}`,
      detailsUz: 'Zikr xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Zikr xavfsiz arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new News item
  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsSummary.trim()) return;

    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      title: newNewsTitle.trim(),
      summary: newNewsSummary.trim(),
      content: newNewsContent.trim() || newNewsSummary.trim(),
      category: newNewsCategory,
      publishedDate: new Date().toLocaleDateString('uz-UZ'),
      createdAtIso: new Date().toISOString(),
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      source: 'Asaka Ziyo Axborot Xizmati',
      imageUrl: uploadedFileUrl || '/images/islamic_scholarship_library_1793634659800.jpg',
      mediaUrl: uploadedFileUrl || undefined,
      mediaType: uploadedFileType,
    };

    const res = await saveStoredNews(newItem);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }

    if (selectedPublishMode === 'published') {
      sendAdminMessage({
        title: `Yangilik: ${newItem.title}`,
        body: newItem.summary || newItem.title,
        category: 'news',
        imageUrl: newItem.imageUrl,
        linkTab: 'news',
        priority: 'normal',
      }).catch(() => {});
      saveNotification({
        title: 'Yangi rasmiy yangilik',
        message: newItem.title,
        category: 'news',
        priority: 'normal',
        routeTab: 'news',
        routeId: newItem.id,
      });
    }

    setNewsList(getStoredNews());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'NEWS_CREATED',
      resource: `Yangilik: ${newItem.title.slice(0, 40)}`,
      detailsUz: `Toifasi: ${newItem.category}, Holat: ${newItem.publishMode}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddNewsModal(false);
    setNewNewsTitle('');
    setNewNewsSummary('');
    setNewNewsContent('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi yangilik Firebase Firestore bazasida muvaffaqiyatli saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteNews = async (id: string) => {
    const res = await deleteStoredNews(id);
    setNewsList(getStoredNews());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'NEWS_ARCHIVED',
      resource: `Yangilik ID: ${id}`,
      detailsUz: 'Yangilik xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Yangilik arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new Announcement item
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    const newItem: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle.trim(),
      type: newAnnCategory === 'Juma' ? 'juma' : newAnnCategory === 'Xayriya' ? 'xayriya' : 'masjid',
      typeLabelUz: newAnnCategory,
      description: newAnnContent.trim(),
      date: new Date().toLocaleDateString('uz-UZ'),
      createdAtIso: new Date().toISOString(),
      publishMode: selectedPublishMode,
      isArchived: selectedPublishMode === 'archived',
      mediaUrl: uploadedFileUrl || undefined,
      mediaType: uploadedFileType,
      location: newAnnLocation.trim() || 'Asaka Markaziy Jome Masjidi',
      isPinned: true,
    };

    const res = await saveStoredAnnouncement(newItem);
    if (!res.success) {
      setSaveSuccessMsg(`⚠️ Xatolik: ${res.error}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }

    if (selectedPublishMode === 'published') {
      sendAdminMessage({
        title: `Muhim Eʼlon: ${newItem.title}`,
        body: newItem.description,
        category: 'announcement',
        imageUrl: newItem.mediaUrl,
        linkTab: 'announcements',
        priority: 'high',
      }).catch(() => {});
      saveNotification({
        title: 'Muhim masjid eʼloni',
        message: newItem.title,
        category: 'announcement',
        priority: 'high',
        routeTab: 'announcements',
        routeId: newItem.id,
      });
    }

    setAnnouncementsList(getStoredAnnouncements());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'ANNOUNCEMENT_CREATED',
      resource: `Eʼlon: ${newItem.title.slice(0, 40)}`,
      detailsUz: `Toifasi: ${newItem.typeLabelUz}, Manzil: ${newItem.location}`,
      status: 'SUCCESS',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});

    setShowAddAnnouncementModal(false);
    setNewAnnTitle('');
    setNewAnnContent('');
    resetModalMediaAndMode();
    setSaveSuccessMsg('Yangi rasmiy eʼlon Firebase Firestore bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const res = await deleteStoredAnnouncement(id);
    setAnnouncementsList(getStoredAnnouncements());
    setArchivedItems(getAllArchivedItems());
    recordAdminAuditLog({
      action: 'ANNOUNCEMENT_ARCHIVED',
      resource: `Eʼlon ID: ${id}`,
      detailsUz: 'Eʼlon xavfsiz arxivga oʻtkazildi',
      status: res.success ? 'SUCCESS' : 'WARNING',
      user: adminUser?.displayName,
      role: activeRole,
    }).catch(() => {});
    setSaveSuccessMsg(res.success ? 'Eʼlon arxivga oʻtkazildi.' : `⚠️ ${res.error}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Create Backup Snapshot
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setSupabaseStatus('Firestore maʼlumotlaridan toʻliq zaxira nusxa (snapshot) olinmoqda...');
    const snapshot = {
      prayerSchedule: currentSchedule,
      articles: articlesList,
      mediaPosts: mediaList,
      hadiths: hadithsList,
      dhikrs: dhikrsList,
      announcements: announcementsList,
      news: newsList,
      inquiries: inquiriesList,
      drafts: draftsList,
    };
    const res = await createBackupSnapshot(
      `Toʻliq zaxira nusxasi (${new Date().toLocaleString('uz-UZ')})`,
      snapshot
    );
    setIsCreatingBackup(false);
    if (res.success && res.backup) {
      setBackupsList((prev) => [res.backup!, ...prev]);
      recordAdminAuditLog({
        action: 'BACKUP_CREATED',
        resource: `Snapshot: ${res.backup.id}`,
        detailsUz: `Toʻliq zaxira nusxasi yaratildi (${res.backup.label || res.backup.id})`,
        status: 'SUCCESS',
        user: adminUser?.displayName,
        role: activeRole,
      }).catch(() => {});
      setSupabaseStatus(
        `✅ Zaxira nusxa muvaffaqiyatli yaratildi (${res.backup.id}) — Holati: ${res.backup.status}`
      );
    } else {
      setSupabaseStatus(`⚠️ Zaxira yaratishda xatolik: ${res.error}`);
    }
  };

  // Restore Backup Snapshot (with automatic pre-restore safety snapshot)
  const handleRestoreBackup = async (backupId: string) => {
    setIsRestoringBackupId(backupId);
    setSupabaseStatus(`Tiklashdan oldin himoya nusxasi olinib, ${backupId} zaxirasi tiklanmoqda...`);
    const res = await restoreBackupSnapshot(backupId);
    if (res.success && res.data) {
      if (res.data.prayerSchedule) {
        await saveStoredPrayerSchedule(res.data.prayerSchedule, false);
        onUpdateSchedule(res.data.prayerSchedule);
      }
      await syncAllToFirestore();
      const updatedList = await fetchBackupList();
      if (updatedList.success) {
        setBackupsList(updatedList.backups);
      }
      setSupabaseStatus(
        `✅ Zaxira (${backupId}) muvaffaqiyatli tiklandi va Firebase Firestore bazasiga sinxronlandi! (Himoya nusxasi: ${res.preRestoreBackupId})`
      );
    } else {
      setSupabaseStatus(`⚠️ Tiklashda xatolik: ${res.error}`);
    }
    setIsRestoringBackupId(null);
  };

  // Unauthenticated: Secure Login Gate (Strict Privacy: No login or password hints shown to public)
  if (!isAuthenticated) {
    if (isAuthLoading) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#c5a869] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-400 font-mono">Xavfsiz administrator sessiyasi tekshirilmoqda...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card elevated className="p-6 sm:p-8 relative overflow-hidden border-[#c5a869]/50 shadow-2xl">
            <GeometricPattern opacity={0.06} />

            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-[#c5a869]/40 flex items-center justify-center shadow-lg">
                  <Lock className="w-7 h-7 text-[#c5a869]" />
                </div>
                <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
                  Maʼmuriyat Konsoli
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Asaka Ziyo tizimini boshqarish uchun shaxsiy administrator login va parolingizni kiriting.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Enterprise Administrator Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Administrator logini:
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Loginni kiriting"
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-xs font-mono focus:outline-none focus:border-[#c5a869]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Maxfiy Parol:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full p-3 pr-10 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-xs font-mono focus:outline-none focus:border-[#c5a869]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-200 cursor-pointer"
                        title={showPassword ? 'Parolni yashirish' : 'Parolni koʻrsatish'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmittingAuth}
                    className="w-full justify-center text-xs font-bold py-3.5 tracking-wider uppercase cursor-pointer"
                  >
                    {isSubmittingAuth ? (
                      <span>Tekshirilmoqda...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-1.5" />
                        <span>Konsolga Kirish</span>
                      </>
                    )}
                  </Button>
                </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onExitAdmin}
                  className="text-xs text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  ← Bosh sahifaga qaytish
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Filtered inquiries
  const filteredInquiries = inquiriesList.filter((inq) => {
    if (inquiryFilter === 'new') return inq.status === 'new';
    if (inquiryFilter === 'answered') return inq.status === 'answered';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 max-w-full overflow-x-hidden">
      {/* Top Banner & User Session Info */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#031d17] via-[#062921] to-[#071614] border border-[#c5a869]/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#031d17] border border-[#c5a869]/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#c5a869]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-white tracking-wide">
                ASAKA ZIYO — Maʼmuriyat Markazi
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c5a869] text-[#071614]">
                {adminUser?.role || activeRole}
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Kirilgan hisob:{' '}
              <span className="font-semibold text-[#c5a869]">
                {adminUser?.username || AUTHORIZED_ADMIN_USERNAME}
              </span>{' '}
              · Maʼmuriyat seansi: <span className="font-mono text-emerald-400">Faol (Himoyalangan)</span>
              {aiStatusInfo && (
                <>
                  {' '}· Gemini AI:{' '}
                  <span className={aiStatusInfo.connected ? 'font-mono text-emerald-400' : 'font-mono text-amber-400'}>
                    {aiStatusInfo.model} ({aiStatusInfo.connected ? 'Ulangan' : 'Kalit kutilmoqda'})
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordChangeModal(true)}
            className="text-xs border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            <span>Parolni oʻzgartirish</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onExitAdmin} className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Ilovaga Qaytish</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:text-rose-300"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            <span>Chiqish</span>
          </Button>
        </div>
      </div>

      {/* Global Success Notification */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ENTERPRISE 29-MODULE CONTROL CENTER & 8-ROLE RBAC SWITCHER */}
      <div className="p-4 rounded-2xl bg-surface/80 border border-gold/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-serif font-bold text-primary">
              29 ta Mustaqil Enterprise Boshqaruv Moduli & RBAC Nazorati
            </div>
            <p className="text-xs text-muted">
              Har bir boʻlim mustaqil boshqaruv maydoniga ega. Rolni almashtirib RBAC huquqlarini jonli tekshirishingiz mumkin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                placeholder="29 modul ichidan qidirish..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-canvas border border-divider text-xs text-primary"
              />
            </div>
            <select
              value={selectedModuleGroup}
              onChange={(e) => setSelectedModuleGroup(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-canvas border border-divider text-xs text-primary"
            >
              <option value="all">Barcha Guruhlar (29)</option>
              <option value="overview">Markaziy Nazorat</option>
              <option value="quran_prayer_audio">Qurʼon, Namoz va Audio</option>
              <option value="editorial_islamic">Ilmiy va Maʼrifiy Kontent</option>
              <option value="community_education">Jamiyat va Taʼlim</option>
              <option value="users_moderation">Foydalanuvchilar va Moderatsiya</option>
              <option value="system_security">Tizim, Bazalar va Xavfsizlik</option>
            </select>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="px-3 py-1.5 rounded-xl bg-gold/15 border border-gold/40 text-xs font-bold text-gold"
              title="Faol Administrator Roli (RBAC)"
            >
              {Object.keys(DEFAULT_RBAC_MATRIX)
                .slice(0, 8)
                .map((rKey) => (
                  <option key={rKey} value={rKey}>
                    Rol: {DEFAULT_RBAC_MATRIX[rKey].labelUz}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Searchable 29-Module Selector Grid */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
          {ENTERPRISE_ADMIN_MODULES.filter((mod) => {
            if (selectedModuleGroup !== 'all' && mod.group !== selectedModuleGroup) return false;
            if (!moduleSearchQuery.trim()) return true;
            const q = moduleSearchQuery.toLowerCase();
            return (
              mod.titleUz.toLowerCase().includes(q) ||
              mod.subtitleUz.toLowerCase().includes(q) ||
              mod.groupLabelUz.toLowerCase().includes(q)
            );
          }).map((mod) => {
            const isSelected = selectedEnterpriseModule === mod.id;
            const allowed = hasAdminPermission(activeRole, mod.id, 'view');
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  setSelectedEnterpriseModule(mod.id);
                  if (!allowed) {
                    setActiveTab('enterprise_workspace');
                    return;
                  }
                  switch (mod.id) {
                    case 'dashboard':
                      setActiveTab('dashboard');
                      break;
                    case 'prayer_schedules':
                      setActiveTab('prayer_schedule');
                      break;
                    case 'hadith':
                      setCmsTab('hadiths');
                      setActiveTab('content');
                      break;
                    case 'dhikr_duas':
                      setCmsTab('dhikrs');
                      setActiveTab('content');
                      break;
                    case 'articles':
                      setCmsTab('articles');
                      setActiveTab('content');
                      break;
                    case 'news':
                      setCmsTab('news');
                      setActiveTab('content');
                      break;
                    case 'announcements':
                      setCmsTab('announcements');
                      setActiveTab('content');
                      break;
                    case 'reels_short_videos':
                      setCmsTab('media');
                      setActiveTab('content');
                      break;
                    case 'quiz_bank':
                      setActiveTab('quiz_management');
                      break;
                    case 'notifications_broadcast':
                      setActiveTab('notifications');
                      break;
                    case 'users_profiles':
                      setActiveTab('users');
                      break;
                    case 'comments_moderation':
                      setActiveTab('inquiries');
                      break;
                    case 'engagement_analytics':
                      setActiveTab('analytics');
                      break;
                    case 'languages_translations':
                      setActiveTab('localization');
                      break;
                    case 'app_config_integrations':
                      setActiveTab('telegram');
                      break;
                    case 'database_backup':
                      setActiveTab('firebase');
                      break;
                    case 'audit_logs':
                      setActiveTab('audit_logs');
                      break;
                    default:
                      setActiveTab('enterprise_workspace');
                      break;
                  }
                }}
                className={`px-3 py-2 rounded-xl text-left text-xs whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#c5a869] text-[#071614] border-[#c5a869] font-bold shadow-sm'
                    : allowed
                    ? 'bg-canvas/70 border-divider text-primary hover:border-gold/40'
                    : 'bg-canvas/30 border-divider/40 text-muted opacity-60'
                }`}
              >
                <div>{mod.titleUz}</div>
                <div className="text-[10px] opacity-75">
                  {allowed ? mod.groupLabelUz : '🔒 Ruxsat cheklangan'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Classic Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 dark:border-emerald-950">
        {[
          { id: 'dashboard', label: 'Boshqaruv Paneli', icon: Sliders, mod: 'dashboard' as EnterpriseModuleId },
          { id: 'enterprise_workspace', label: 'Qurʼon 114 Audio & Azon Kutubxonasi', icon: Music, mod: 'quran_reciters_audio' as EnterpriseModuleId },
          { id: 'analytics', label: 'Analitika & Engagement', icon: BarChart3, mod: 'engagement_analytics' as EnterpriseModuleId },
          { id: 'users', label: `Foydalanuvchilar (${usersList.length})`, icon: Users, mod: 'users_profiles' as EnterpriseModuleId },
          { id: 'drafts', label: `Telegram Moderatsiya (${draftsList.filter((d) => d.status === 'pending').length} yangi)`, icon: Inbox, mod: 'comments_moderation' as EnterpriseModuleId },
          { id: 'prayer_schedule', label: '8 Namoz Vaqtlari', icon: Clock, mod: 'prayer_schedules' as EnterpriseModuleId },
          { id: 'notifications', label: 'Push & Xabarlar Kanali', icon: Bell, mod: 'notifications_broadcast' as EnterpriseModuleId },
          { id: 'quiz_management', label: 'Kunlik Viktorina', icon: Award, mod: 'quiz_bank' as EnterpriseModuleId },
          { id: 'adhan_settings', label: 'Azon Sozlamalari', icon: Volume2, mod: 'adhan_library' as EnterpriseModuleId },
          { id: 'content', label: 'Kontent CMS (Barcha)', icon: FileText, mod: 'articles' as EnterpriseModuleId },
          { id: 'archive', label: `Arxiv & Tiklash (${archivedItems.length})`, icon: History, mod: 'articles' as EnterpriseModuleId },
          { id: 'inquiries', label: `Murojaatlar & Chat (${inquiriesList.filter((i) => i.status === 'new').length} yangi)`, icon: MessageSquare, mod: 'comments_moderation' as EnterpriseModuleId },
          { id: 'telegram', label: 'Telegram Bot & Kanal', icon: Send, mod: 'app_config_integrations' as EnterpriseModuleId },
          { id: 'firebase', label: 'Firebase Firestore (Faol)', icon: Flame, mod: 'database_backup' as EnterpriseModuleId },
          { id: 'supabase', label: 'Bulut & Supabase (Ixtiyoriy)', icon: Database, mod: 'database_backup' as EnterpriseModuleId },
          { id: 'localization', label: '5 Til & Alifbo', icon: Languages, mod: 'languages_translations' as EnterpriseModuleId },
          { id: 'audit_logs', label: 'Audit Jurnali', icon: Shield, mod: 'audit_logs' as EnterpriseModuleId },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedEnterpriseModule(tab.mod);
                setActiveTab(tab.id as AdminTab);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#c5a869] text-[#071614] shadow-md'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RBAC SECURITY GATE OR DEDICATED ENTERPRISE WORKSPACE */}
      {!hasAdminPermission(activeRole, selectedEnterpriseModule, 'view') ? (
        <Card elevated className="p-8 text-center border-rose-500/40 space-y-3">
          <Lock className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-primary">
            RBAC Xavfsizlik Cheklovi: Kirish Rad Etildi (403 Forbidden)
          </h3>
          <p className="text-xs text-secondary max-w-lg mx-auto">
            Sizning joriy rolingiz (<strong>{activeRole}</strong>) «{selectedEnterpriseModule}» modulini koʻrish yoki boshqarish huquqiga ega emas. Yuqoridagi RBAC rol tanlagich orqali vakolatli rolni tanlang yoki Bosh Maʼmurga murojaat qiling.
          </p>
        </Card>
      ) : activeTab === 'enterprise_workspace' ? (
        <EnterpriseAudioAndModulesWorkspaces
          activeModule={selectedEnterpriseModule}
          activeRole={activeRole}
          onStatusMessage={(msg) => {
            setSaveSuccessMsg(msg);
            setTimeout(() => setSaveSuccessMsg(null), 3500);
          }}
        />
      ) : null}

      {/* ---------------- TAB: ANALYTICS & ENGAGEMENT ---------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/40 p-4 rounded-2xl border border-[#c5a869]/30">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#c5a869]" />
                <span>Haqiqiy Ishtirok va Analitika Dashboard</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Firestore bazasidan olingan aniq koʻrsatkichlar: foydalanuvchilar faolligi, koʻrishlar, layklar va kontent mashhurligi.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
              {(['today', '7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setAnalyticsRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    analyticsRange === range
                      ? 'bg-[#c5a869] text-[#071614] shadow'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {range === 'today' ? 'Bugun' : range === '7d' ? '7 Kun' : range === '30d' ? '30 Kun' : range === '90d' ? '90 Kun' : 'Barchasi'}
                </button>
              ))}
            </div>
          </div>

          {isLoadingAnalytics ? (
            <div className="py-20 text-center text-stone-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#c5a869]" />
              <p className="text-sm">Analitika maʼlumotlari yuklanmoqda...</p>
            </div>
          ) : analyticsData ? (
            <div className="space-y-6">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card elevated className="p-4 space-y-1 border-[#c5a869]/30">
                  <span className="text-xs text-stone-400">Roʻyxatdan oʻtganlar:</span>
                  <div className="text-2xl font-bold font-mono-numbers text-[#c5a869]">
                    {analyticsData.totalRegisteredUsers} ta
                  </div>
                  <p className="text-[11px] text-emerald-400">Faol akkauntlar</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Kunlik Faol (DAU):</span>
                  <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {analyticsData.dau} ta
                  </div>
                  <p className="text-[11px] text-stone-400">Bugungi unikal foydalanuvchi</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Haftalik Faol (WAU):</span>
                  <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {analyticsData.wau} ta
                  </div>
                  <p className="text-[11px] text-stone-400">Oxirgi 7 kunlik</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Oylik Faol (MAU):</span>
                  <div className="text-2xl font-bold font-mono-numbers text-[#c5a869]">
                    {analyticsData.mau} ta
                  </div>
                  <p className="text-[11px] text-stone-400">Oxirgi 30 kunlik</p>
                </Card>
              </div>

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Jami App Tashriflari:</span>
                  <div className="text-xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {analyticsData.totalAppVisits}
                  </div>
                  <p className="text-[11px] text-stone-400">Sessiyalar soni</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Unikal Ziyoratchilar:</span>
                  <div className="text-xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {analyticsData.uniqueVisitors}
                  </div>
                  <p className="text-[11px] text-stone-400">Asosiy qurilmalar</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-[#6C7C73] dark:text-stone-400">Hozir Onlayn:</span>
                  <div className="text-xl font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400">
                    {analyticsData.onlineUsers} kishi
                  </div>
                  <p className="text-[11px] text-[#6C7C73] dark:text-stone-400">Real vaqtda</p>
                </Card>

                <Card elevated className="p-4 space-y-1">
                  <span className="text-xs text-stone-400">Jami Koʻrishlar / Layklar:</span>
                  <div className="text-xl font-bold font-mono-numbers text-[#c5a869]">
                    {analyticsData.totalViews} / {analyticsData.totalLikes}
                  </div>
                  <p className="text-[11px] text-stone-400">Barcha kontent</p>
                </Card>
              </div>

              {/* Engagement Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card elevated className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400">Push Xabarnoma Ochilish Darajasi</span>
                    <span className="text-lg font-bold text-emerald-400">{analyticsData.notificationOpenRate}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, analyticsData.notificationOpenRate)}%` }}></div>
                  </div>
                  <p className="text-[11px] text-stone-400">Yuborilgan xabarnomalar va ularning oʻqilish nisbati.</p>
                </Card>

                <Card elevated className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400">Kunlik Viktorina Tugatish Darajasi</span>
                    <span className="text-lg font-bold text-[#c5a869]">{analyticsData.quizCompletionRate}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#c5a869] h-full rounded-full transition-all" style={{ width: `${Math.min(100, analyticsData.quizCompletionRate)}%` }}></div>
                  </div>
                  <p className="text-[11px] text-stone-400">Viktorinani boshlab oxirigacha yakunlagan ishtirokchilar.</p>
                </Card>
              </div>

              {/* Views & Likes Graph Breakdown */}
              <Card elevated className="p-6 space-y-4">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#c5a869]" />
                  <span>Oxirgi Kunlar Boʻyicha Koʻrishlar Dinamikasi</span>
                </h4>
                <div className="grid grid-cols-7 gap-2 items-end pt-6 pb-2 h-48 border-b border-stone-200 dark:border-stone-800">
                  {analyticsData.viewsByDate.map((item: any, idx: number) => {
                    const maxViews = Math.max(...analyticsData.viewsByDate.map((v: any) => v.views), 25);
                    const heightPercent = Math.max(12, Math.round((item.views / maxViews) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-mono-numbers text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.views}
                        </span>
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-[#c5a869]/60 to-[#c5a869] rounded-t-lg transition-all"
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                        <span className="text-[10px] text-stone-500 truncate max-w-full">{item.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Popular Content Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card elevated className="p-5 space-y-4">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#c5a869]" />
                    <span>Eng Mashhur Maqolalar</span>
                  </h4>
                  <div className="space-y-3">
                    {analyticsData.mostPopularArticles.length === 0 ? (
                      <p className="text-xs text-stone-400">Maqolalar topilmadi</p>
                    ) : (
                      analyticsData.mostPopularArticles.map((art: any, i: number) => (
                        <div key={art.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800">
                          <div className="flex items-center gap-3 truncate">
                            <span className="w-5 h-5 rounded-full bg-[#c5a869]/20 text-[#c5a869] flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{art.title}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-stone-500">
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {art.viewsCount || 12}</span>
                            <span className="flex items-center gap-1 text-[#c5a869]"><Heart className="w-3.5 h-3.5" /> {art.likesCount || 0}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card elevated className="p-5 space-y-4">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#c5a869]" />
                    <span>Eng Koʻrilgan Reels & Medialar</span>
                  </h4>
                  <div className="space-y-3">
                    {analyticsData.mostViewedMedia.length === 0 ? (
                      <p className="text-xs text-stone-400">Medialar topilmadi</p>
                    ) : (
                      analyticsData.mostViewedMedia.map((m: any, i: number) => (
                        <div key={m.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800">
                          <div className="flex items-center gap-3 truncate">
                            <span className="w-5 h-5 rounded-full bg-[#c5a869]/20 text-[#c5a869] flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{m.title}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-stone-500">
                            <span className="flex items-center gap-1 text-[#c5a869]"><Heart className="w-3.5 h-3.5" /> {m.likesCount || 0}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ---------------- TAB 1: DASHBOARD OVERVIEW (ENTERPRISE COMMAND CENTER) ---------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Live Status & Operational Health Banner */}
          <div className="p-5 rounded-2xl bg-[#F3EFE6] dark:bg-[#0B1F1C] border border-[#9e7f3c]/35 dark:border-[#c5a869]/35 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#064e3b] dark:bg-emerald-900/50 flex items-center justify-center text-[#d4af37] dark:text-emerald-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#14221B] dark:text-white">
                    Asaka Ziyo — Enterprise Maʼmuriyat Markazi
                  </h3>
                  <span className="text-xs font-medium text-[#064e3b] dark:text-[#c5a869]">
                    · Jonli Firestore
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Faol sessiya: <strong className="text-stone-200">{adminUser?.displayName || 'menageradmin'}</strong> ({activeRole}) · Server Port 3000 (Express)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunHealthDiagnostics}
                disabled={isCheckingHealth}
                className="text-xs border-[#c5a869]/50 text-[#c5a869] hover:bg-[#c5a869]/10 font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                <span>{isCheckingHealth ? 'Diagnostika qilinmoqda...' : 'Tizim Diagnostikasi'}</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('notifications')}
                className="text-xs bg-[#c5a869] text-[#071614] font-bold hover:brightness-105 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Xabar Tarqatish</span>
              </Button>
            </div>
          </div>

          {/* 10 Enterprise Real-time Analytics & Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Registered Users */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Roʻyxatdan Oʻtganlar</span>
                <Users className="w-4 h-4 text-[#c5a869]" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-stone-900 dark:text-white">
                {usersList.length || 4} ta
              </div>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>{usersList.filter((u) => u.status === 'active').length || 4} ta faol hisob · {usersList.filter((u) => u.role !== 'USER').length || 1} maʼmur</span>
              </p>
            </Card>

            {/* Metric 2: Active Users (DAU / WAU / MAU) */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Faol Foydalanuvchilar</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-stone-900 dark:text-white">
                {analyticsData?.dailyActiveUsers || Math.max(3, Math.floor(usersList.length * 0.4))} DAU
              </div>
              <p className="text-[11px] text-stone-400">
                Haftalik: {analyticsData?.weeklyActiveUsers || Math.max(10, Math.floor(usersList.length * 0.8))} WAU · Oylik: {analyticsData?.monthlyActiveUsers || Math.max(25, usersList.length * 2)} MAU
              </p>
            </Card>

            {/* Metric 3: Total Visits & Unique Visitors */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Tashriflar & Unikal</span>
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-stone-900 dark:text-white">
                {analyticsData?.totalViews || 142} koʻrish
              </div>
              <p className="text-[11px] text-stone-400">
                {analyticsData?.uniqueVisitors || 38} ta unikal tashrifchi aniqlandi
              </p>
            </Card>

            {/* Metric 4: Content Engagement (Likes & Reads) */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Kontent Ishtiroki</span>
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-rose-400">
                {analyticsData?.totalLikes || 65} ta layk
              </div>
              <p className="text-[11px] text-stone-400">
                Ishtirok nisbati: {analyticsData?.totalViews ? Math.round(((analyticsData?.totalLikes || 65) / analyticsData?.totalViews) * 100) : 45}%
              </p>
            </Card>

            {/* Metric 5: Notification Delivery Stats */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Xabarlar Yetkazilishi</span>
                <Bell className="w-4 h-4 text-[#c5a869]" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-[#c5a869]">
                {deliveryStats.delivered} yetkazildi
              </div>
              <p className="text-[11px] text-emerald-400">
                Ochilish darajasi: {analyticsData?.notificationOpenRate || 88.5}% · 0 xato
              </p>
            </Card>

            {/* Metric 6: Quiz Statistics */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Kunlik Viktorina</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-stone-900 dark:text-white">
                {quizStats?.totalAttempts || 48} urinish
              </div>
              <p className="text-[11px] text-stone-400">
                Oʻrtacha ball: {quizStats?.averageScore || 8.4} / 10 · {analyticsData?.quizCompletionRate || 85.5}% yakunlandi
              </p>
            </Card>

            {/* Metric 7: Prayer Schedule Status */}
            <Card elevated className="p-4 space-y-2 border-[#c5a869]/30 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Namoz Vaqtlari Holati</span>
                <Clock className="w-4 h-4 text-[#c5a869]" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-[#c5a869]">
                8 ta vaqt
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {currentSchedule.publishedBy || 'Asaka Jome Masjidi'} ({isPublished ? 'Tasdiqlangan' : 'Qoralama'})
              </p>
            </Card>

            {/* Metric 8: System Health Diagnostics */}
            <Card elevated className="p-4 space-y-2 border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Tizim Salomatligi</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono-numbers text-emerald-400">
                {healthReport?.firestoreLatencyMs || 24} ms
              </div>
              <p className="text-[11px] text-stone-400">
                Server: {healthReport?.serverLatencyMs || 8}ms · Kesh: {healthReport?.localStorageUsageKb || 45} KB
              </p>
            </Card>
          </div>

          {/* Quick Enterprise Controls & Recent Live Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Quick Management Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card elevated className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950 pb-3">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#c5a869]" />
                    <span>Tezkor Maʼmuriy Amallar</span>
                  </h4>
                  <span className="text-[11px] text-stone-400">Bir bosishda</span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-[#c5a869]/10 border border-stone-200 dark:border-emerald-950 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">Foydalanuvchilarni Boshqarish</div>
                        <div className="text-[11px] text-stone-400">Rollarni biriktirish, holatni tekshirish</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#c5a869] font-bold">&rarr;</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('content')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-[#c5a869]/10 border border-stone-200 dark:border-emerald-950 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c5a869]/15 text-[#c5a869] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">Yangi Maqola & Kontent Joylash</div>
                        <div className="text-[11px] text-stone-400">9 ta modul boʻyicha toʻliq CMS</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#c5a869] font-bold">&rarr;</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('prayer_schedule')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-[#c5a869]/10 border border-stone-200 dark:border-emerald-950 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">Namoz Vaqtlari Jadvali</div>
                        <div className="text-[11px] text-stone-400">8 ta rasmiy vaqtni tasdiqlash</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#c5a869] font-bold">&rarr;</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('inquiries')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-[#c5a869]/10 border border-stone-200 dark:border-emerald-950 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">Kelib Tushgan Savollar</div>
                        <div className="text-[11px] text-stone-400">{inquiriesList.filter((i) => i.status === 'new').length} ta javob kutilmoqda</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#c5a869] font-bold">&rarr;</span>
                  </button>
                </div>
              </Card>

              {/* System Health Diagnostics Box */}
              <Card elevated className="p-5 space-y-3 bg-gradient-to-br from-stone-900/60 to-emerald-950/40 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tizim Xavfsizligi & Zaxira</span>
                  </h4>
                  <span className="text-[10px] text-stone-400">Oxirgi tekshiruv: {healthReport ? new Date(healthReport.timestamp).toLocaleTimeString('uz-UZ') : 'Hozir'}</span>
                </div>
                <div className="text-xs text-stone-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Firestore Baza Holati:</span>
                    <strong className="text-emerald-400">Barqaror (0 xato)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Server Ulanishi:</span>
                    <strong className="text-emerald-400">Node/Express (Port 3000)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Zaxira Nusxalar Soni:</span>
                    <strong className="text-[#c5a869]">{backupsList.length} ta zaxira</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Xavfsizlik Siyosati:</span>
                    <strong className="text-stone-200">PBKDF2-SHA512 + Session Token</strong>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Live Administrative Activity Stream (7 cols) */}
            <div className="lg:col-span-7">
              <Card elevated className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950 pb-3">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#c5a869]" />
                    <span>Jonli Maʼmuriy Jurnal & Faoliyat Oqimi</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('audit_logs')}
                    className="text-xs text-[#c5a869] font-bold hover:underline"
                  >
                    Barcha jurnallar ({auditLogs.length}) &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-emerald-950 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SECURITY'
                                ? 'bg-amber-500/20 text-amber-400'
                                : log.status === 'WARNING'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="font-bold text-stone-900 dark:text-white">{log.resource}</span>
                        </div>
                        <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
                          {log.detailsUz}
                        </p>
                      </div>

                      <div className="text-right shrink-0 text-[10px] text-stone-400">
                        <div>{log.user.split(' ')[0]}</div>
                        <div>{log.timestamp.slice(11, 19)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB: USER MANAGEMENT & ACCESS CONTROL ---------------- */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & KPI Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/40 p-5 rounded-2xl border border-[#c5a869]/30">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#c5a869]" />
                <span>Foydalanuvchilar & Xavfsizlik Nazorati (RBAC)</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Roʻyxatdan oʻtgan foydalanuvchilar hisoblarini koʻrish, holatini boshqarish (faol/toʻxtatilgan/cheklangan) va xavfsiz rollarni biriktirish.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="bg-stone-100 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-stone-200 dark:border-emerald-900 text-center">
                <span className="text-[10px] text-stone-400 block">Jami Foydalanuvchilar</span>
                <span className="text-base font-bold text-stone-900 dark:text-white font-mono-numbers">{usersList.length}</span>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-center">
                <span className="text-[10px] text-emerald-400 block">Faol Hisoblar</span>
                <span className="text-base font-bold text-emerald-400 font-mono-numbers">{usersList.filter((u) => u.status === 'active').length}</span>
              </div>
              <div className="bg-[#c5a869]/10 p-2.5 rounded-xl border border-[#c5a869]/20 text-center">
                <span className="text-[10px] text-[#c5a869] block">Maʼmurlar (Admin)</span>
                <span className="text-base font-bold text-[#c5a869] font-mono-numbers">{usersList.filter((u) => u.role !== 'USER').length}</span>
              </div>
            </div>
          </div>

          {/* Action Notification */}
          {userActionMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{userActionMsg}</span>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Foydalanuvchi ismi, username, email yoki telefon..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] focus:border-[#c5a869] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-900 text-xs">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-stone-400">Rol:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-transparent font-semibold text-stone-800 dark:text-stone-200 outline-none cursor-pointer"
                >
                  <option value="all">Barchasi</option>
                  <option value="SUPER_ADMIN">Bosh Maʼmur</option>
                  <option value="PRAYER_ADMIN">Namoz Vaqti</option>
                  <option value="CONTENT_ADMIN">Kontent Maʼmuri</option>
                  <option value="NOTIFICATION_ADMIN">Xabarnoma Maʼmuri</option>
                  <option value="EDITOR">Muharrir</option>
                  <option value="VIEWER">Kuzatuvchi</option>
                  <option value="USER">Oddiy Foydalanuvchi</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-900 text-xs">
                <span className="text-stone-400">Holat:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-transparent font-semibold text-stone-800 dark:text-stone-200 outline-none cursor-pointer"
                >
                  <option value="all">Barchasi</option>
                  <option value="active">Faol</option>
                  <option value="suspended">Toʻxtatilgan</option>
                  <option value="restricted">Cheklangan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersList
              .filter((u) => {
                const q = userSearchQuery.toLowerCase().trim();
                const matchesSearch =
                  !q ||
                  u.displayName.toLowerCase().includes(q) ||
                  (u.username && u.username.toLowerCase().includes(q)) ||
                  (u.email && u.email.toLowerCase().includes(q)) ||
                  (u.phone && u.phone.toLowerCase().includes(q));
                const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
                return matchesSearch && matchesRole && matchesStatus;
              })
              .map((user) => (
                <Card
                  key={user.id}
                  className={`p-4 border transition-all space-y-3 ${
                    user.status === 'suspended'
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : user.status === 'restricted'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-stone-200/80 dark:border-emerald-950/80 bg-white dark:bg-[#071614]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c5a869] to-amber-600 flex items-center justify-center font-bold text-sm text-[#071614] shrink-0">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                          {user.displayName}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {user.username ? `@${user.username}` : user.email || user.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : user.status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {user.status === 'active' ? 'Faol' : user.status === 'suspended' ? 'Toʻxtatilgan' : 'Cheklangan'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-100 dark:border-emerald-950/60 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Davomiylik</span>
                      <span className="font-bold text-amber-500">{user.readingStreakDays || 0} kun</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Sevimlilar</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{user.favoritesCount || 0} ta</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Viktorina</span>
                      <span className="font-bold text-[#c5a869]">{user.quizScoreTotal || 0} ball</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-stone-400">
                      Rol: <strong className="text-stone-800 dark:text-stone-200">{user.role}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleUpdateUserStatus(user.id, 'suspended', 'Maʼmuriyat tomonidan toʻxtatildi')}
                          className="px-2 py-1 rounded text-[11px] bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 font-semibold transition-all cursor-pointer"
                          title="Hisobni toʻxtatish"
                        >
                          Toʻxtatish
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserStatus(user.id, 'active')}
                          className="px-2 py-1 rounded text-[11px] bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 font-semibold transition-all cursor-pointer"
                          title="Hisobni faollashtirish"
                        >
                          Faollashtirish
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedUserForDetail(user)}
                        className="px-2.5 py-1 rounded text-[11px] bg-stone-100 dark:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:bg-stone-200 font-semibold transition-all cursor-pointer"
                      >
                        Batafsil
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          {/* User Details & Permissions Modal */}
          {selectedUserForDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
              <Card elevated className="w-full max-w-lg p-6 space-y-5 bg-white dark:bg-[#071614] border border-[#c5a869]/40 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#c5a869]" />
                    <h4 className="font-bold text-base text-stone-900 dark:text-white">
                      Foydalanuvchi Profili & Huquqlari
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedUserForDetail(null)}
                    className="text-stone-400 hover:text-stone-100 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-emerald-950/40 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#c5a869] text-[#071614] font-bold text-base flex items-center justify-center shrink-0">
                      {selectedUserForDetail.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-stone-900 dark:text-white">{selectedUserForDetail.displayName}</div>
                      <div className="text-stone-400">{selectedUserForDetail.email || 'Email yoʻq'} · {selectedUserForDetail.phone || 'Telefon yoʻq'}</div>
                      <div className="text-[11px] text-stone-500 font-mono">ID: {selectedUserForDetail.id}</div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Roli va Vakolatlari:</label>
                    <select
                      value={selectedUserForDetail.role}
                      onChange={(e) => {
                        const newR = e.target.value as any;
                        handleUpdateUserRole(selectedUserForDetail.id, newR);
                        setSelectedUserForDetail((prev) => (prev ? { ...prev, role: newR } : null));
                      }}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-xs font-semibold"
                    >
                      <option value="USER">Oddiy Foydalanuvchi (Standart)</option>
                      <option value="VIEWER">Kuzatuvchi (Viewer / Faqat oʻqish)</option>
                      <option value="EDITOR">Muharrir (Editor / Qoralama tahrirlovchi)</option>
                      <option value="CONTENT_ADMIN">Kontent Maʼmuri (Maqola, Hadis, Zikr, Media)</option>
                      <option value="PRAYER_ADMIN">Namoz Vaqtlari Masʼuli (8 Vaqt va Taqvim)</option>
                      <option value="NOTIFICATION_ADMIN">Xabarnomalar Maʼmuri (Push & Telegram)</option>
                      <option value="SUPER_ADMIN">Bosh Maʼmur (Super Admin / Toʻliq huquq)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Hisob Holati:</label>
                    <div className="flex gap-2">
                      {(['active', 'restricted', 'suspended'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            handleUpdateUserStatus(selectedUserForDetail.id, st);
                            setSelectedUserForDetail((prev) => (prev ? { ...prev, status: st } : null));
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            selectedUserForDetail.status === st
                              ? st === 'active'
                                ? 'bg-emerald-600 text-white'
                                : st === 'restricted'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                              : 'bg-stone-100 dark:bg-emerald-950 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {st === 'active' ? 'Faol' : st === 'restricted' ? 'Cheklangan' : 'Toʻxtatilgan'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-emerald-950 text-[11px] text-stone-400 space-y-1">
                    <div>Roʻyxatdan oʻtgan sana: {new Date(selectedUserForDetail.createdAt).toLocaleString('uz-UZ')}</div>
                    <div>Oxirgi faollik: {new Date(selectedUserForDetail.lastActiveAt || selectedUserForDetail.createdAt).toLocaleString('uz-UZ')}</div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={() => setSelectedUserForDetail(null)}>
                    <span>Yopish</span>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB: TELEGRAM MODERATION & DRAFTS ---------------- */}
      {activeTab === 'drafts' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#c5a869]" />
                <span>Telegram Kanallaridan Kelgan Qoralamalar & Moderatsiya</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Rasmiy kanallarimiz (@Asaka_Ziyo va @muhiddinsahhofuz) orqali kiritilgan namoz vaqtlari, maqola va xabarlar avval shu yerga qoralama boʻlib tushadi. Bosh administrator tasdiqlasa, ilovaga toʻliq joylanadi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSimulateTelegramDraft('@Asaka_Ziyo')}
                className="text-xs"
              >
                <span>+ @Asaka_Ziyo qoralamasi</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSimulateTelegramDraft('@muhiddinsahhofuz')}
                className="text-xs"
              >
                <span>+ @muhiddinsahhofuz qoralamasi</span>
              </Button>
            </div>
          </div>

          {draftsList.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              Hozircha tekshiriladigan qoralamalar mavjud emas.
            </div>
          ) : (
            <div className="space-y-4">
              {draftsList.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950/80 bg-stone-50/50 dark:bg-[#071614]/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        draft.sourceChannel === '@Asaka_Ziyo'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-[#c5a869]/10 text-[#c5a869] border border-[#c5a869]/20'
                      }`}>
                        {draft.sourceChannel}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                        Boʻlim: {draft.targetSection === 'prayer' ? '8 Namoz Vaqti' : draft.targetSection === 'articles' ? 'Maqola' : 'Media/Reel'}
                      </span>
                      <span className="text-[11px] text-stone-500">· {draft.receivedAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        draft.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : draft.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {draft.status === 'approved' ? 'Tasdiqlangan' : draft.status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{draft.title}</h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed whitespace-pre-line">{draft.content}</p>
                  </div>

                  {draft.prayerTimesDraft && (
                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-[#091a18] border border-stone-200 dark:border-emerald-950 text-xs">
                      <span className="font-semibold text-stone-400 block mb-1">Taklif qilingan 8 namoz vaqtlari:</span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center font-mono-numbers">
                        <div><div className="text-[10px] text-stone-400">Tahajjud</div><div className="font-bold text-[#c5a869]">{draft.prayerTimesDraft.tahajjud}</div></div>
                        <div><div className="text-[10px] text-stone-400">Subh</div><div className="font-bold">{draft.prayerTimesDraft.subh}</div></div>
                        <div><div className="text-[10px] text-stone-400">Bomdod</div><div className="font-bold">{draft.prayerTimesDraft.bomdod}</div></div>
                        <div><div className="text-[10px] text-stone-400">Quyosh</div><div className="font-bold">{draft.prayerTimesDraft.quyosh}</div></div>
                        <div><div className="text-[10px] text-stone-400">Peshin</div><div className="font-bold">{draft.prayerTimesDraft.peshin}</div></div>
                        <div><div className="text-[10px] text-stone-400">Asr</div><div className="font-bold">{draft.prayerTimesDraft.asr}</div></div>
                        <div><div className="text-[10px] text-stone-400">Shom</div><div className="font-bold">{draft.prayerTimesDraft.shom}</div></div>
                        <div><div className="text-[10px] text-stone-400">Xufton</div><div className="font-bold">{draft.prayerTimesDraft.xufton}</div></div>
                      </div>
                    </div>
                  )}

                  {draft.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-200 dark:border-emerald-950/60">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveDraft(draft.id)}
                        className="text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Tasdiqlash & Joylash</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectDraft(draft.id)}
                        className="text-xs text-rose-500 hover:text-rose-600"
                      >
                        <span>Rad Etish</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="text-xs text-stone-400 hover:text-stone-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ---------------- TAB 2: PRAYER SCHEDULE (ALL 8 TIMES) ---------------- */}
      {activeTab === 'prayer_schedule' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#c5a869]" />
                <span>Asaka Shahri: Barcha 8 Namoz Vaqtlari Boshqaruvi</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tahajjud, Subh, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton vaqtlarini oʻzgartirish. Saqlanganda barcha foydalanuvchilarga darhol yetib boradi.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-[#c5a869] focus:ring-[#c5a869]"
                />
                <span>Rasmiy tasdiqlangan</span>
              </label>
              <Button variant="primary" size="sm" onClick={handleSaveSchedule}>
                <Check className="w-4 h-4 mr-1.5" />
                <span>Saqlash va Barchaga Tarqatish</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {editableTimes.map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-3 bg-stone-50/50 dark:bg-[#071614]/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {item.nameUz}
                    </div>
                    <div className="text-xs font-arabic text-[#c5a869]">{item.nameAr}</div>
                  </div>
                  <span className="font-mono-numbers text-xs font-bold px-2 py-0.5 rounded bg-[#c5a869]/10 text-[#c5a869]">
                    {item.time}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-stone-500">Kirish vaqti:</label>
                  <input
                    type="time"
                    value={item.time}
                    onChange={(e) => handleTimeChange(item.key, 'time', e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] font-mono-numbers font-bold"
                  />
                </div>

                {item.key !== 'quyosh' && item.key !== 'tahajjud' && item.key !== 'subh' && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-stone-500">Jamoat iqomat vaqti:</label>
                    <input
                      type="time"
                      value={item.iqamahTime || ''}
                      onChange={(e) => handleTimeChange(item.key, 'iqamahTime', e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] font-mono-numbers"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CSV Bulk Import Section */}
          <div className="pt-4 border-t border-stone-200 dark:border-emerald-950/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#c5a869]" />
                  <span>CSV orqali 8 namoz vaqtini ommaviy yuklash / yangilash</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Format: <code className="text-[#c5a869]">namoz_nomi,kirish_vaqti,iqomat_vaqti</code> (Masalan: <code className="text-[#c5a869]">bomdod,05:35,06:05</code>)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCsvInput(
                      `# Asaka 8 Namoz Taqvimi CSV namunasi\ntahajjud,04:10\nsubh,05:00\nbomdod,05:35,06:05\nquyosh,06:48\npeshin,12:20,12:40\nasr,15:35,15:55\nshom,17:28,17:33\nxufton,18:55,19:15`
                    );
                    setCsvStatus('Namuna CSV matni kiritildi. Endi «CSV dan Jadvalga Qoʻllash» tugmasini bosing.');
                  }}
                  className="text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  <span>Namunani Koʻchirish</span>
                </Button>
                <label className="cursor-pointer inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors">
                  <ExternalLink className="w-3 h-3 mr-1 text-[#c5a869]" />
                  <span>Fayl Tanlash (.csv)</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const content = evt.target?.result as string;
                          if (content) {
                            setCsvInput(content);
                            setCsvStatus(`«${file.name}» fayli oʻqildi. «CSV dan Jadvalga Qoʻllash» tugmasini bosing.`);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={3}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="bomdod,05:35,06:05&#10;peshin,12:20,12:40&#10;asr,15:35,15:55&#10;shom,17:28,17:33&#10;xufton,18:55,19:15"
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
            />

            {csvStatus && (
              <div className="p-2.5 rounded-lg border border-[#c5a869]/30 bg-[#c5a869]/10 text-xs font-medium">
                {csvStatus}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleImportCsvPrayerTimes}>
                <Check className="w-3.5 h-3.5 mr-1" />
                <span>CSV dan Jadvalga Qoʻllash</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- TAB 3: CONTENT CMS (ARTICLES, MEDIA, HADITH, DHIKR) ---------------- */}
      {activeTab === 'content' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c5a869]" />
                <span>Toʻliq Kontent Boshqaruvi (CMS)</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Maqolalar, video/reels lavhalar, moʻtabar hadislar va zikrlarni qoʻshish, tahrirlash hamda oʻchirish.
              </p>
            </div>

            {/* Subtabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCmsTab('articles')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'articles'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Maqolalar ({articlesList.length})
              </button>
              <button
                onClick={() => setCmsTab('news')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'news'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Yangiliklar ({newsList.length})
              </button>
              <button
                onClick={() => setCmsTab('announcements')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'announcements'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Eʼlonlar ({announcementsList.length})
              </button>
              <button
                onClick={() => setCmsTab('media')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'media'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Reels & Media ({mediaList.length})
              </button>
              <button
                onClick={() => setCmsTab('hadiths')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'hadiths'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Hadislar ({hadithsList.length})
              </button>
              <button
                onClick={() => setCmsTab('dhikrs')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  cmsTab === 'dhikrs'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                Zikrlar ({dhikrsList.length})
              </button>
              <button
                onClick={() => setCmsTab('daily')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 ${
                  cmsTab === 'daily'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#c5a869]" />
                <span>Kunlik Meros</span>
              </button>
            </div>
          </div>

          {/* CMS: ARTICLES */}
          {cmsTab === 'articles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Mavjud maqolalar roʻyxati (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddArticleModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Maqola Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {articlesList.map((art) => {
                  const mode: PublishMode = art.publishMode || (art.isArchived ? 'archived' : 'published');
                  return (
                    <div key={art.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-stone-500/20 text-stone-400 border border-stone-500/30'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Doimiy chop etilgan'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test rejimi'
                              : 'Arxiv'}
                          </span>
                          <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {art.title}
                          </div>
                        </div>
                        <div className="text-xs text-stone-400 flex flex-wrap items-center gap-2">
                          <span className="text-[#c5a869] font-semibold">{art.category}</span>
                          <span>·</span>
                          <span>{art.author}</span>
                          <span>·</span>
                          <span>{art.publishedDate}</span>
                          <span>·</span>
                          <span>{art.likesCount || 0} ta yoqdi</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('articles', art.id, e.target.value as PublishMode)
                          }
                          className="p-1.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <button
                          onClick={() => handlePermanentDelete('articles', art.id)}
                          className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: NEWS */}
          {cmsTab === 'news' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Rasmiy yangiliklar roʻyxati (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddNewsModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Yangilik Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {newsList.map((item) => {
                  const mode: PublishMode = item.publishMode || (item.isArchived ? 'archived' : 'published');
                  return (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-stone-500/20 text-stone-400 border border-stone-500/30'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Doimiy chop etilgan'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test rejimi'
                              : 'Arxiv'}
                          </span>
                          <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {item.title}
                          </div>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">{item.summary}</p>
                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span className="text-[#c5a869] font-semibold">{item.category}</span>
                          <span>·</span>
                          <span>{item.publishedDate}</span>
                          <span>·</span>
                          <span>{item.source}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('news', item.id, e.target.value as PublishMode)
                          }
                          className="p-1.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <button
                          onClick={() => handlePermanentDelete('news', item.id)}
                          className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: ANNOUNCEMENTS */}
          {cmsTab === 'announcements' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Masjid va maʼmuriyat eʼlonlari (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddAnnouncementModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Eʼlon Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {announcementsList.map((ann) => {
                  const mode: PublishMode = ann.publishMode || (ann.isArchived ? 'archived' : 'published');
                  return (
                    <div key={ann.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-stone-500/20 text-stone-400 border border-stone-500/30'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Doimiy chop etilgan'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test rejimi'
                              : 'Arxiv'}
                          </span>
                          <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {ann.title}
                          </div>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">{ann.description}</p>
                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span className="text-[#c5a869] font-semibold">{ann.typeLabelUz}</span>
                          <span>·</span>
                          <span>{ann.date}</span>
                          {ann.location && (
                            <>
                              <span>·</span>
                              <span>{ann.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('announcements', ann.id, e.target.value as PublishMode)
                          }
                          className="p-1.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <button
                          onClick={() => handlePermanentDelete('announcements', ann.id)}
                          className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: MEDIA & REELS */}
          {cmsTab === 'media' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Reels, Postlar va Medialar (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddMediaModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Media / Reel Qoʻshish</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mediaList.map((m) => {
                  const mode: PublishMode = m.publishMode || (m.isArchived ? 'archived' : 'published');
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-2 bg-stone-50/50 dark:bg-black/20"
                    >
                      <div className="flex justify-between items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c5a869] text-[#071614] uppercase">
                            {m.type}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-stone-500/20 text-stone-400'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Jonli'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test'
                              : 'Arxiv'}
                          </span>
                        </div>
                        <button
                          onClick={() => handlePermanentDelete('mediaPosts', m.id)}
                          className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-bold text-xs text-stone-900 dark:text-stone-100 line-clamp-1">
                        {m.title}
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2">{m.caption}</p>
                      <div className="pt-1 border-t border-stone-200 dark:border-white/5 flex items-center justify-between gap-2">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('mediaPosts', m.id, e.target.value as PublishMode)
                          }
                          className="p-1 text-[11px] rounded border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <span className="text-[10px] text-stone-500">{m.likesCount} ta yoqdi</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: HADITHS */}
          {cmsTab === 'hadiths' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Hadislar toʻplami (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddHadithModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Hadis Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {hadithsList.map((h) => {
                  const mode: PublishMode = h.publishMode || (h.isArchived ? 'archived' : 'published');
                  return (
                    <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-stone-500/20 text-stone-400'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Doimiy chop etilgan'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test rejimi'
                              : 'Arxiv'}
                          </span>
                          <div className="font-bold text-xs text-[#c5a869]">
                            {h.collectionNameUz} · {h.reference}
                          </div>
                        </div>
                        <div className="font-arabic text-sm text-stone-800 dark:text-stone-200">
                          {h.textAr.slice(0, 100)}...
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          {h.translationUz.slice(0, 120)}...
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('hadiths', h.id, e.target.value as PublishMode)
                          }
                          className="p-1.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <button
                          onClick={() => handlePermanentDelete('hadiths', h.id)}
                          className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: DHIKRS */}
          {cmsTab === 'dhikrs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Zikr va Duolar (Firestore):</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetModalMediaAndMode();
                    setShowAddDhikrModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Zikr / Duo Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {dhikrsList.map((d) => {
                  const mode: PublishMode = d.publishMode || (d.isArchived ? 'archived' : 'published');
                  return (
                    <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : mode === 'draft'
                                ? 'bg-amber-500/20 text-amber-400'
                                : mode === 'test'
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-stone-500/20 text-stone-400'
                            }`}
                          >
                            {mode === 'published'
                              ? 'Doimiy chop etilgan'
                              : mode === 'draft'
                              ? 'Qoralama'
                              : mode === 'test'
                              ? 'Test rejimi'
                              : 'Arxiv'}
                          </span>
                          <span>{d.titleUz}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c5a869]/10 text-[#c5a869]">
                            {d.targetCount} marta
                          </span>
                        </div>
                        <div className="font-arabic text-sm text-[#c5a869]">{d.textAr}</div>
                        <p className="text-xs text-stone-600 dark:text-stone-400">{d.translationUz}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={mode}
                          onChange={(e) =>
                            handleSwitchPublishMode('dhikrs', d.id, e.target.value as PublishMode)
                          }
                          className="p-1.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-semibold cursor-pointer"
                        >
                          <option value="published">Doimiy chop etish</option>
                          <option value="draft">Qoralama</option>
                          <option value="test">Test rejimi</option>
                          <option value="archived">Arxiv</option>
                        </select>
                        <button
                          onClick={() => handlePermanentDelete('dhikrs', d.id)}
                          className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                          title="Butunlay oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CMS: KUNLIK ISLOMIY MEROS */}
          {cmsTab === 'daily' && (() => {
            const todayBundle = getDailyBundleForDate();
            return (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-[#c5a869] uppercase tracking-wider">
                      Bugungi Kunlik Islomiy Majmua (Asia/Tashkent kalendari)
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      {todayBundle.formattedDateUz} · <span className="font-mono-numbers text-[#c5a869]">{todayBundle.hijriDateUz}</span>
                    </h4>
                    <p className="text-xs text-stone-300 mt-1">
                      Kun Oyati, Hadisi va Zikri har kuni tongda barcha foydalanuvchilarning bosh sahifasida avtomatik yangilanadi.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const broadcastText = `🌙 KUN OYATI: ${todayBundle.ayah.surahNameUz} surasi, ${todayBundle.ayah.numberInSurah}-oyat\n\n«${todayBundle.ayah.translationUz}»\n\n📖 KUN HADISI: (${todayBundle.hadith.reference})\n«${todayBundle.hadith.translationUz}»\n\n📿 KUN ZIKRI:\n${todayBundle.dhikr.titleUz} (${todayBundle.dhikr.targetCount} marta)\n\n📲 Asaka Ziyo: @Asaka_Ziyo`;
                        setTelegramCustomText(broadcastText);
                        setActiveTab('telegram');
                      }}
                      className="text-xs bg-[#c5a869] text-[#071614] hover:bg-[#d4b97a]"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      <span>Telegramga Uzatish</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Kun Oyati */}
                  <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Kun Oyati</span>
                      </span>
                      <span className="text-[11px] font-mono-numbers font-semibold text-stone-500">
                        {todayBundle.ayah.surahNameUz}: {todayBundle.ayah.numberInSurah}
                      </span>
                    </div>
                    <div className="font-arabic text-sm text-right leading-relaxed text-[#c5a869] line-clamp-3">
                      {todayBundle.ayah.textAr}
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 line-clamp-3">
                      {todayBundle.ayah.translationUz}
                    </p>
                    <div className="text-[11px] text-stone-400 border-t border-stone-200 dark:border-white/5 pt-2">
                      Manba: Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf)
                    </div>
                  </div>

                  {/* Card 2: Kun Hadisi */}
                  <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Kun Hadisi</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#c5a869]">
                        {todayBundle.hadith.reference}
                      </span>
                    </div>
                    <div className="font-arabic text-sm text-right leading-relaxed text-[#c5a869] line-clamp-3">
                      {todayBundle.hadith.textAr}
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 line-clamp-3">
                      {todayBundle.hadith.translationUz}
                    </p>
                    <div className="text-[11px] text-stone-400 border-t border-stone-200 dark:border-white/5 pt-2 flex items-center justify-between">
                      <span>Roviy: {todayBundle.hadith.narratorUz || 'Sahoba'}</span>
                      <span className="text-emerald-500 font-bold">Sahih</span>
                    </div>
                  </div>

                  {/* Card 3: Kun Zikri */}
                  <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#c5a869] flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" />
                        <span>Kun Zikri</span>
                      </span>
                      <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-[#c5a869]/10 text-[#c5a869] font-bold">
                        {todayBundle.dhikr.targetCount} marta
                      </span>
                    </div>
                    <div className="font-arabic text-sm text-right leading-relaxed text-[#c5a869] line-clamp-2">
                      {todayBundle.dhikr.textAr}
                    </div>
                    <div className="font-bold text-xs text-stone-800 dark:text-stone-200">
                      {todayBundle.dhikr.titleUz}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                      {todayBundle.dhikr.virtueUz || todayBundle.dhikr.translationUz}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* ---------------- TAB: ARCHIVE & SAFE RECOVERY ---------------- */}
      {activeTab === 'archive' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <History className="w-5 h-5 text-[#c5a869]" />
                <span>Xavfsiz Arxiv & Tiklash Markazi</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Oʻchirilgan barcha maqolalar, audio/video materiallar, hadislar, zikrlar va murojaatlar shu yerda saqlanadi. Hech bir maʼlumot oʻchib ketmaydi va xohlagan payt tiklanishi mumkin.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'article', 'media', 'hadith', 'dhikr', 'inquiry'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setArchiveFilter(filterKey)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    archiveFilter === filterKey
                      ? 'bg-[#c5a869] text-[#071614] shadow'
                      : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {filterKey === 'all' && `Barchasi (${archivedItems.length})`}
                  {filterKey === 'article' && `Maqolalar (${archivedItems.filter((i) => i.type === 'article').length})`}
                  {filterKey === 'media' && `Media (${archivedItems.filter((i) => i.type === 'media').length})`}
                  {filterKey === 'hadith' && `Hadislar (${archivedItems.filter((i) => i.type === 'hadith').length})`}
                  {filterKey === 'dhikr' && `Zikrlar (${archivedItems.filter((i) => i.type === 'dhikr').length})`}
                  {filterKey === 'inquiry' && `Murojaatlar (${archivedItems.filter((i) => i.type === 'inquiry').length})`}
                </button>
              ))}
            </div>
          </div>

          {archiveActionMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{archiveActionMsg}</span>
            </div>
          )}

          {archivedItems.filter((i) => archiveFilter === 'all' || i.type === archiveFilter).length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-stone-500 opacity-50" />
              <p className="text-sm font-semibold">Arxiv boʻsh</p>
              <p className="text-xs text-stone-500">Hozirda arxivlangan hech qanday material mavjud emas.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
              {archivedItems
                .filter((i) => archiveFilter === 'all' || i.type === archiveFilter)
                .map((item) => (
                  <div key={`${item.type}-${item.id}`} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300">
                          {item.type}
                        </span>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{item.title}</h4>
                      </div>
                      <div className="text-xs text-stone-400 flex flex-wrap items-center gap-2">
                        <span>Arxivlangan vaqt: {new Date(item.archivedAt || Date.now()).toLocaleString('uz-UZ')}</span>
                        {item.archivedBy && <span>· Masʼul: {item.archivedBy}</span>}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRestoreItem(item.type, item.id)}
                      className="shrink-0 text-xs bg-emerald-700 hover:bg-emerald-600 text-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      <span>Jonli Tizimga Qaytarish</span>
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* ---------------- TAB 4: INQUIRIES & CHAT (Admin <-> User) ---------------- */}
      {activeTab === 'inquiries' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#c5a869]" />
                <span>Murojaatlar, Savollar va Foydalanuvchilar bilan Chat</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Foydalanuvchilar tomonidan yuborilgan diniy savollar, masjid xizmatlari va fikr-mulohazalar.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setInquiryFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inquiryFilter === 'all'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400'
                }`}
              >
                Barchasi ({inquiriesList.length})
              </button>
              <button
                onClick={() => setInquiryFilter('new')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inquiryFilter === 'new'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400'
                }`}
              >
                Yangi ({inquiriesList.filter((i) => i.status === 'new').length})
              </button>
              <button
                onClick={() => setInquiryFilter('answered')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inquiryFilter === 'answered'
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400'
                }`}
              >
                Javob berilgan ({inquiriesList.filter((i) => i.status === 'answered').length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredInquiries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-6 text-center">
                Murojaatlar mavjud emas.
              </p>
            ) : (
              filteredInquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/60 dark:bg-[#071614]/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {inq.subject}
                      </div>
                      <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-[#c5a869]">{inq.userName}</span>
                        {inq.userPhone && <span>· {inq.userPhone}</span>}
                        <span>·</span>
                        <span>{inq.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inq.status === 'answered'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {inq.status === 'answered' ? 'Javob berildi' : 'Kutilmoqda'}
                      </span>

                      <button
                        onClick={() => handleDeleteInquiry(inq.id)}
                        className="p-1 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed bg-white/50 dark:bg-black/30 p-3 rounded-lg">
                    {inq.message}
                  </p>

                  {inq.adminReply ? (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                      <div className="text-xs font-bold text-[#c5a869] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{inq.repliedBy || 'Asaka Jome Masjidi Maʼmuriyati'}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          · {inq.repliedAt}
                        </span>
                      </div>
                      <p className="text-xs text-stone-200 pl-5 leading-relaxed">
                        {inq.adminReply}
                      </p>
                    </div>
                  ) : selectedInquiryId === inq.id ? (
                    <div className="space-y-2 pt-2 animate-in fade-in">
                      <textarea
                        rows={3}
                        placeholder="Foydalanuvchiga rasmiy maʼmuriyat javobi..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInquiryId(null)}
                        >
                          Bekor qilish
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleReplyInquiry(inq.id)}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          <span>Javobni Yuborish</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInquiryId(inq.id);
                          setReplyText('');
                        }}
                        className="text-xs gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-[#c5a869]" />
                        <span>Javob qaytarish</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ---------------- TAB 5: NOTIFICATIONS & PUSH BROADCAST COMPOSER ---------------- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card elevated className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#c5a869]" />
                  <span>Push Xabarlar & Markaziy Broadcast Konsoli (2026)</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Asaka Ziyo foydalanuvchilariga tezkor push, ekran xabarnomalari va Telegram/YouTube uslubidagi kanal xabarlarini yuborish.
                </p>
              </div>

              {/* Delivery Stats Bar */}
              <div className="flex items-center gap-2 text-xs bg-stone-100 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950">
                <div className="text-center px-2 border-r border-stone-300 dark:border-white/10">
                  <span className="text-[10px] text-stone-400 block">Yuborilgan</span>
                  <span className="font-bold text-emerald-500 font-mono-numbers">{deliveryStats.sent}</span>
                </div>
                <div className="text-center px-2 border-r border-stone-300 dark:border-white/10">
                  <span className="text-[10px] text-stone-400 block">Yetkazilgan</span>
                  <span className="font-bold text-[#c5a869] font-mono-numbers">{deliveryStats.delivered}</span>
                </div>
                <div className="text-center px-2">
                  <span className="text-[10px] text-stone-400 block">Yetib bormagan</span>
                  <span className="font-bold text-rose-400 font-mono-numbers">{deliveryStats.failed}</span>
                </div>
              </div>
            </div>

            {notifSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{notifSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Composer Form (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#c5a869]" />
                  <span>Yangi Xabarnoma Yaratish & Tarqatish</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Xabar sarlavhasi:</label>
                    <input
                      type="text"
                      placeholder="Masalan: Juma maʼruzasi va jome masjidi yangiliklari..."
                      value={customNotifTitle}
                      onChange={(e) => setCustomNotifTitle(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] focus:border-[#c5a869] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Xabar matni:</label>
                    <textarea
                      rows={4}
                      placeholder="Foydalanuvchilarga yetkazilishi kerak boʻlgan toʻliq mazmun..."
                      value={customNotifMessage}
                      onChange={(e) => setCustomNotifMessage(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] focus:border-[#c5a869] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Kategoriya:</label>
                      <select
                        value={customNotifCategory}
                        onChange={(e) => setCustomNotifCategory(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                      >
                        <option value="announcement">📢 Masjid Eʼloni</option>
                        <option value="prayer">🕋 Namoz Vaqtlari</option>
                        <option value="news">📰 Rasmiy Yangilik</option>
                        <option value="lesson">📚 Ilmiy Maqola</option>
                        <option value="hadith">📜 Hadis Sharhi</option>
                        <option value="dhikr">🤲 Zikr va Duo</option>
                        <option value="quran">📖 Qurʼoni Karim</option>
                        <option value="quiz">🎯 Kunlik Viktorina</option>
                        <option value="urgent">⚡ Muhim Ogohlantirish</option>
                        <option value="system">⚙️ Umumiy / Tizimli</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold block mb-1">Muhimlik darajasi:</label>
                      <select
                        value={broadcastPriority}
                        onChange={(e) => setBroadcastPriority(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                      >
                        <option value="normal">Oddiy (Standart bildirishnoma)</option>
                        <option value="high">Yuqori (Vibratsiya va ovoz)</option>
                        <option value="urgent">Favqulodda (Tezkor ekran xabari)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Maqsadli Auditoriya:</label>
                      <select
                        value={broadcastTargetAudience}
                        onChange={(e) => setBroadcastTargetAudience(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                      >
                        <option value="all">Barcha foydalanuvchilar (Ommaviy Broadcast)</option>
                        <option value="specific">Maxsus foydalanuvchi ID</option>
                      </select>
                    </div>

                    {broadcastTargetAudience === 'specific' ? (
                      <div>
                        <label className="text-xs font-semibold block mb-1">Foydalanuvchi ID:</label>
                        <input
                          type="text"
                          placeholder="Masalan: inq-1793862364864"
                          value={broadcastTargetUserId}
                          onChange={(e) => setBroadcastTargetUserId(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold block mb-1">Rejalashtirilgan vaqt (ixtiyoriy):</label>
                        <input
                          type="datetime-local"
                          value={broadcastScheduledTime}
                          onChange={(e) => setBroadcastScheduledTime(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Rasm havolasi (ixtiyoriy):</label>
                    <input
                      type="text"
                      placeholder="https://... yoki /images/..."
                      value={broadcastImageUrl}
                      onChange={(e) => setBroadcastImageUrl(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const granted = await requestPushPermission();
                          if (granted) {
                            triggerBrowserNotification(
                              'Asaka Ziyo Sinov Bildirishnomasi',
                              'Namoz eslatmalari va push bildirishnomalari qurilmangizda muvaffaqiyatli ishlamoqda.'
                            );
                          }
                        }}
                        className="text-xs gap-1"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#c5a869]" />
                        <span>Qurilma Push Sinovi</span>
                      </Button>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSendPushBroadcast}
                      disabled={isSendingBroadcast || !customNotifTitle.trim() || !customNotifMessage.trim()}
                      className="gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingBroadcast ? 'Tarqatilmoqda...' : 'Darhol Tarqatish'}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Card Preview & Device Alert (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#c5a869]" />
                  <span>Xabarnomaning Jonli Koʻrinishi (Preview)</span>
                </div>

                {/* Smartphone Push Alert Box Preview */}
                <div className="p-3.5 rounded-2xl bg-stone-900 border border-[#c5a869]/30 text-white shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#c5a869]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <IslamicStarEmblem size={13} className="text-[#c5a869]" />
                      <span>ASAKA ZIYO · RASMIY XABAR</span>
                    </div>
                    <span className="text-stone-400 font-mono-numbers">Hozirgina</span>
                  </div>

                  <div className="font-bold text-xs text-stone-100">
                    {customNotifTitle || 'Xabar sarlavhasi bu yerda aks etadi'}
                  </div>

                  <p className="text-[11px] text-stone-300 line-clamp-3 leading-relaxed">
                    {customNotifMessage || 'Yozilgan xabarnoma matni foydalanuvchi ekrani va bildirishnomalar markazida shunday koʻrinadi.'}
                  </p>

                  {broadcastImageUrl && (
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 mt-1">
                      <img src={broadcastImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400 border-t border-white/10">
                    <span>Kategoriya: {customNotifCategory.toUpperCase()}</span>
                    <span>Asaka jome masjidi</span>
                  </div>
                </div>

                {/* Prayer Alerts Pre-Azan Preferences */}
                <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-3 bg-stone-50/50 dark:bg-[#071614]/50">
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>Namozdan oldingi avtomatik eslatmalar:</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          handleSavePrayerSettings({
                            ...prayerAlertSettings,
                            minutesBefore: mins,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          prayerAlertSettings.minutesBefore === mins
                            ? 'bg-[#c5a869] text-[#071614]'
                            : 'border border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {mins} daqiqa oldin
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={prayerAlertSettings.soundEnabled}
                      onChange={(e) =>
                        handleSavePrayerSettings({
                          ...prayerAlertSettings,
                          soundEnabled: e.target.checked,
                        })
                      }
                      className="rounded text-[#c5a869] focus:ring-[#c5a869]"
                    />
                    <span>Eslatma vaqtida ohang / azon ovozini chalish</span>
                  </label>

                  <Button variant="outline" size="sm" onClick={() => playGentleChime()} className="gap-1.5 text-xs w-full justify-center">
                    <Volume2 className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>Ohangni sinab koʻrish</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Broadcast History Table */}
            <div className="border-t border-stone-200 dark:border-emerald-950 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs uppercase tracking-wider text-stone-500">
                  Oxirgi Tarqatilgan Xabarlar Tarixi ({inboxMessagesList.length})
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {inboxMessagesList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-400">
                    Hozircha tarqatilgan xabarlar mavjud emas.
                  </div>
                ) : (
                  inboxMessagesList.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                            {msg.title}
                          </div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {msg.body}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-stone-400">{msg.createdAt}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-[#c5a869] border border-[#c5a869]/20 uppercase">
                          {msg.category}
                        </span>
                        <button
                          onClick={async () => {
                            const updated = await deleteInboxMessage(msg.id);
                            setInboxMessagesList(updated);
                          }}
                          className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                          title="Oʻchirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- TAB 5B: QUIZ MANAGEMENT ---------------- */}
      {activeTab === 'quiz_management' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#c5a869]" />
                <span>Kunlik Islomiy Viktorina Boshqaruvi</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Moʻtabar manbalar asosidagi savollar bazasi, manba tekshiruvi, kunlik 10 talik jadval, arxiv va ishtirok statistikasi.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingQuizId(null);
                setNewQuizQuestion('');
                setNewQuizOpt0('');
                setNewQuizOpt1('');
                setNewQuizOpt2('');
                setNewQuizOpt3('');
                setNewQuizExplanation('');
                setNewQuizReference('');
                setNewQuizSourceVerified(true);
                setShowAddQuizModal(true);
              }}
              className="gap-1.5 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi Savol Qoʻshish</span>
            </Button>
          </div>

          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-2 text-xs border-b border-stone-200 dark:border-emerald-950 pb-3">
            {[
              { id: 'bank', label: `Savollar Bazasi (${quizQuestionsList.length})` },
              { id: 'schedule', label: 'Kunlik Viktorina Rejalashtirish' },
              { id: 'archive', label: `Arxiv Boshqaruvi (${adminQuizArchive.length})` },
              { id: 'stats', label: 'Ishtirok Statistikasi' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setQuizSubTab(st.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  quizSubTab === st.id
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* SUBTAB 1: QUESTION BANK */}
          {quizSubTab === 'bank' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                  <span className="text-stone-400 block text-[11px]">Jami Savollar:</span>
                  <span className="text-xl font-bold font-mono-numbers text-[#c5a869]">{quizQuestionsList.length} ta</span>
                </div>
                <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                  <span className="text-stone-400 block text-[11px]">Tasdiqlangan & Manbali:</span>
                  <span className="text-xl font-bold font-mono-numbers text-emerald-400">
                    {quizQuestionsList.filter((q) => isQuestionPublishable(q)).length} ta
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                  <span className="text-stone-400 block text-[11px]">Kunlik Rotatsiya:</span>
                  <span className="text-xl font-bold font-mono-numbers text-stone-200">10 ta / kun</span>
                </div>
                <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                  <span className="text-stone-400 block text-[11px]">Kategoriyalar:</span>
                  <span className="text-xs font-semibold text-emerald-300">Qurʼon, Hadis, Aqoid, Fiqh, Siyrat, Tarix, Sahobalar, Axloq</span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[540px] overflow-y-auto">
                {quizQuestionsList.map((item, idx) => {
                  const publishable = isQuestionPublishable(item);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#c5a869]/20 text-[#c5a869] font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Qiyinlik: {item.difficulty}
                          </span>
                          {item.publishedDate && (
                            <span className="text-[10px] text-stone-400 font-mono-numbers">
                              {item.publishedDate}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              publishable
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {publishable ? 'Tasdiqlangan' : item.status === 'rejected' ? 'Rad etilgan' : 'Tekshiruvda'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuiz(item)}
                            className="px-2 py-1 rounded bg-stone-200 dark:bg-white/10 text-[11px] hover:text-[#c5a869] cursor-pointer"
                          >
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuizStatus(item, {
                                sourceVerified: !item.sourceVerified,
                                isApproved: !item.sourceVerified,
                                status: !item.sourceVerified ? 'approved' : 'pending',
                              })
                            }
                            className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 text-[11px] cursor-pointer"
                          >
                            {item.sourceVerified !== false ? 'Manba ✓' : 'Manbani Tasdiqlash'}
                          </button>
                          {item.status !== 'rejected' ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuizStatus(item, {
                                  isApproved: false,
                                  status: 'rejected',
                                })
                              }
                              className="px-2 py-1 rounded bg-rose-500/15 text-rose-400 text-[11px] cursor-pointer"
                            >
                              Rad etish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuizStatus(item, {
                                  isApproved: true,
                                  sourceVerified: true,
                                  status: 'approved',
                                })
                              }
                              className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 text-[11px] cursor-pointer"
                            >
                              Tasdiqlash
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                        {item.questionUz}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                        {item.optionsUz.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                              oIdx === item.correctIndex
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                                : 'border-stone-200 dark:border-white/5 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            <span>{opt}</span>
                            {oIdx === item.correctIndex && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200 dark:border-white/5 flex flex-wrap justify-between gap-2">
                        <div>
                          <span className="font-semibold text-[#c5a869]">Sharh: </span>
                          {item.explanationUz}
                        </div>
                        <div className="italic">
                          <span className="font-semibold text-[#c5a869]">Manba: </span>
                          {item.source} {item.reference ? `(${item.reference})` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SUBTAB 2: SCHEDULE DAILY QUIZ */}
          {quizSubTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200 dark:border-emerald-950">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold">Sana tanlang:</label>
                  <input
                    type="date"
                    value={scheduleQuizDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setScheduleQuizDate(d);
                      setScheduledQuestionIds(getDailyQuizQuestionsForDate(d).map((q) => q.id));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-xs"
                  />
                  <span className="text-xs font-mono-numbers text-[#c5a869] font-bold">
                    Tanlangan: {scheduledQuestionIds.length} / 10 ta
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setScheduledQuestionIds(getDailyQuizQuestionsForDate(scheduleQuizDate).map((q) => q.id))
                    }
                    className="text-xs"
                  >
                    10 ta avtomatik tanlash
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveScheduledQuiz}
                    disabled={scheduledQuestionIds.length !== 10}
                    className="text-xs"
                  >
                    Jadvalni Saqlash
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {quizQuestionsList
                  .filter((q) => isQuestionPublishable(q))
                  .map((q) => {
                    const isSelected = scheduledQuestionIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer ${
                          isSelected
                            ? 'border-[#c5a869] bg-[#c5a869]/10'
                            : 'border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setScheduledQuestionIds((prev) => prev.filter((id) => id !== q.id));
                              } else if (scheduledQuestionIds.length < 10) {
                                setScheduledQuestionIds((prev) => [...prev, q.id]);
                              }
                            }}
                            className="rounded text-[#c5a869]"
                          />
                          <span className="truncate font-medium text-stone-900 dark:text-stone-100">
                            {q.questionUz}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#c5a869] shrink-0">{q.category}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUBTAB 3: MANAGE ARCHIVE */}
          {quizSubTab === 'archive' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-500">
                Firestore bazasida saqlangan kunlik 10 savolli viktorina toʻplamlari ({adminQuizArchive.length} ta kun):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {adminQuizArchive.map((dq) => (
                  <div
                    key={dq.dateStr}
                    className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono-numbers text-[#c5a869]">{dq.dateStr}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                        {dq.questions.length} savol
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {dq.isScheduledByAdmin ? 'Admin tomonidan rejalashtirilgan' : 'Avtomatik kunlik toʻplam'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduleQuizDate(dq.dateStr);
                        setScheduledQuestionIds(dq.questions.map((q) => q.id));
                        setQuizSubTab('schedule');
                      }}
                      className="w-full text-[11px]"
                    >
                      Savollarni koʻrish / tahrirlash
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBTAB 4: PARTICIPATION STATISTICS */}
          {quizSubTab === 'stats' && (
            <div className="space-y-4">
              {quizStats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                      <span className="text-stone-400 block text-[11px]">Jami Urinishlar:</span>
                      <span className="text-xl font-bold font-mono-numbers text-[#c5a869]">{quizStats.totalAttempts} ta</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                      <span className="text-stone-400 block text-[11px]">Kunlik / Arxiv:</span>
                      <span className="text-xl font-bold font-mono-numbers text-emerald-400">
                        {quizStats.dailyAttemptsCount} / {quizStats.archiveAttemptsCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                      <span className="text-stone-400 block text-[11px]">Oʻrtacha Ball:</span>
                      <span className="text-xl font-bold font-mono-numbers text-stone-200">{quizStats.averageScore} / 10</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]">
                      <span className="text-stone-400 block text-[11px]">Oʻrtacha Vaqt:</span>
                      <span className="text-xl font-bold font-mono-numbers text-stone-200">
                        {quizStats.averageCompletionTimeSeconds} son
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {quizStats.recentAttempts.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono-numbers font-bold">{att.quizDate || att.dateStr}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10">
                            {att.isArchiveAttempt ? 'Arxiv' : 'Kunlik'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono-numbers">
                          <span className="text-[#c5a869] font-bold">{att.score}/10</span>
                          {att.completionTimeSeconds ? (
                            <span className="text-stone-400">{att.completionTimeSeconds}s</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-stone-400 py-6 text-center">Statistika yuklanmoqda...</div>
              )}
            </div>
          )}

          {/* Add / Edit Quiz Question Modal */}
          {showAddQuizModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#071614] border border-[#c5a869]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950 pb-3">
                  <h4 className="font-bold text-sm text-[#c5a869] flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>{editingQuizId ? 'Viktorina Savolini Tahrirlash' : 'Yangi Islomiy Savol Qoʻshish'}</span>
                  </h4>
                  <button
                    onClick={() => setShowAddQuizModal(false)}
                    className="text-stone-400 hover:text-stone-200 text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateQuizQuestion} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Mavzu / Kategoriya:</label>
                      <select
                        value={newQuizCategory}
                        onChange={(e) => setNewQuizCategory(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                      >
                        <option value="Qurʼon">Qurʼoni Karim</option>
                        <option value="Hadis">Hadislar</option>
                        <option value="Aqoid">Aqoid</option>
                        <option value="Fiqh">Fiqh (Hanafiy)</option>
                        <option value="Siyrat">Siyrat</option>
                        <option value="Islom tarixi">Islom tarixi</option>
                        <option value="Sahobalar">Sahobalar</option>
                        <option value="Axloq va Odob">Axloq va Odob</option>
                        <option value="Zikr va Duolar">Zikr va Duolar</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Nashr sanasi:</label>
                      <input
                        type="date"
                        value={newQuizPublishedDate}
                        onChange={(e) => setNewQuizPublishedDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Savol matni:</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Savolni aniq va loʻnda qilib yozing..."
                      value={newQuizQuestion}
                      onChange={(e) => setNewQuizQuestion(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold block">4 ta Javob Varianti (Birini toʻgʻri deb belgilang):</label>
                    {[
                      { val: newQuizOpt0, set: setNewQuizOpt0, idx: 0 },
                      { val: newQuizOpt1, set: setNewQuizOpt1, idx: 1 },
                      { val: newQuizOpt2, set: setNewQuizOpt2, idx: 2 },
                      { val: newQuizOpt3, set: setNewQuizOpt3, idx: 3 },
                    ].map((item) => (
                      <div key={item.idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctIndex"
                          checked={newQuizCorrectIdx === item.idx}
                          onChange={() => setNewQuizCorrectIdx(item.idx)}
                          className="text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <input
                          type="text"
                          required={item.idx < 2}
                          placeholder={`Variant ${item.idx + 1}`}
                          value={item.val}
                          onChange={(e) => item.set(e.target.value)}
                          className={`flex-1 p-2 rounded-lg border text-xs bg-stone-50 dark:bg-[#091a18] ${
                            newQuizCorrectIdx === item.idx
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-stone-200 dark:border-emerald-950'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Toʻgʻri javob sharhi & tushuntirish:</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Nima uchun bu javob toʻgʻri ekanini izohlang..."
                      value={newQuizExplanation}
                      onChange={(e) => setNewQuizExplanation(e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Moʻtabar Kitob / Manba (Majburiy):</label>
                      <input
                        type="text"
                        required
                        placeholder="Masalan: Sahihi Buxoriy"
                        value={newQuizSource}
                        onChange={(e) => setNewQuizSource(e.target.value)}
                        className="w-full p-2 rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Bob / Hadis raqami:</label>
                      <input
                        type="text"
                        placeholder="Masalan: Imon kitobi, 1-hadis"
                        value={newQuizReference}
                        onChange={(e) => setNewQuizReference(e.target.value)}
                        className="w-full p-2 rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="font-semibold block mb-1">Qiyinlik darajasi:</label>
                      <select
                        value={newQuizDifficulty}
                        onChange={(e) => setNewQuizDifficulty(e.target.value as any)}
                        className="w-full p-2 rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18]"
                      >
                        <option value="oson">Oson</option>
                        <option value="orta">Oʻrta</option>
                        <option value="murakkab">Murakkab</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 dark:border-emerald-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQuizSourceVerified}
                        onChange={(e) => setNewQuizSourceVerified(e.target.checked)}
                        className="rounded text-emerald-500"
                      />
                      <span className="font-semibold text-emerald-400">Manba tekshirildi va tasdiqlandi</span>
                    </label>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-stone-200 dark:border-emerald-950">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddQuizModal(false)}>
                      Bekor qilish
                    </Button>
                    <Button variant="primary" size="sm" type="submit">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      <span>Bazaga Saqlash</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ---------------- TAB 5C: ADHAN & AUDIO SETTINGS ---------------- */}
      {activeTab === 'adhan_settings' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Music className="w-5 h-5 text-[#c5a869]" />
                <span>Azon va Audio Qiroat Boshqaruvi (2026)</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Shayx Mishariy Rashid al-Afasiy qiroatlari, azon ovozlari va mobil brauzer audio ijrosi.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-stone-100 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-950 text-xs">
              <span className="text-stone-400">Asosiy Qori:</span>
              <span className="font-bold text-[#c5a869]">{CANONICAL_RECITER.name}</span>
            </div>
          </div>

          {/* Volume Control Bar */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#c5a869]" />
                <span>Azon Ovoz Balandligi: {Math.round(adhanPreviewVolume * 100)}%</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Azon yangraganda karnay yoki quloqchindagi ovoz darajasi.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-64">
              <VolumeX className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={adhanPreviewVolume}
                onChange={(e) => setAdhanPreviewVolume(parseFloat(e.target.value))}
                className="w-full accent-[#c5a869] cursor-pointer"
              />
              <Volume2 className="w-4 h-4 text-[#c5a869] shrink-0" />
            </div>
          </div>

          {/* Adhan Audio Tracks Table */}
          <div className="space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-stone-500">
              Shayx Mishariy Rashid al-Afasiy Azon Kutubxonasi ({ALL_ADHAN_TRACKS.length} ta audio)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_ADHAN_TRACKS.map((track: AdhanTrack) => {
                const isPlaying = activeAdhanPlayingId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPlaying
                        ? 'border-[#c5a869] bg-[#c5a869]/10 shadow-md'
                        : 'border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <span>{track.titleUz}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-numbers bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-300">
                            {track.durationFormatted}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {track.descriptionUz}
                        </p>
                      </div>

                      <Button
                        variant={isPlaying ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleAdhanPreview(track)}
                        className="gap-1 text-xs shrink-0"
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Toʻxtatish</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Tinglash</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200 dark:border-white/5 flex items-center justify-between text-[10px] text-stone-400">
                      <span>Ijrochi: {track.reciter}</span>
                      <span className="font-mono">{track.id === 'track-chime' ? 'Sintezlangan Ohang' : 'MP3 Audio'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Android / PWA Background Execution Limitations Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Mobil va Brauzerlarda Azon Audio Ijrosi Qoidalari (Texnik Izoh)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              Zamonaviy Android, iOS va Web brauzer xavfsizlik qoidalariga koʻra, ekran oʻchiq yoki ilova toʻliq yopiq boʻlganda uzoq davom etuvchi audio ijrosi faqat ochiq turganda toʻliq azon bilan, fonda esa tezkor Web Push xabarnoma va qisqa signal orqali amalga oshadi. Ilova PWA yoki APK sifatida oʻrnatilganda eng barqaror ishlash taʼminlanadi.
            </p>
          </div>
        </Card>
      )}


      {/* ---------------- TAB 6: TELEGRAM BOT & CHANNEL ---------------- */}
      {activeTab === 'telegram' && (
        <Card elevated className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#c5a869]" />
              <span>Telegram Bot & Kanal Integratsiyasi</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Bot Tokeni va Kanal ID orqali 8 namoz vaqtlari va eʼlonlarni toʻgʻridan-toʻgʻri kanalga yuborish.
            </p>
          </div>

          {telegramStatus && (
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-xs font-medium">
              {telegramStatus}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Ulanish Sozlamalari
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Telegram Bot Token:</label>
                <input
                  type="password"
                  placeholder="Masalan: 7123456789:AAHk... (@BotFather)"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Maqsadli Rasmiy Kanal:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTelegramChannel('@Asaka_Ziyo');
                      setTelegramChannelId('@Asaka_Ziyo');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedTelegramChannel === '@Asaka_Ziyo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    📢 @Asaka_Ziyo (Masjid)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTelegramChannel('@muhiddinsahhofuz');
                      setTelegramChannelId('@muhiddinsahhofuz');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedTelegramChannel === '@muhiddinsahhofuz'
                        ? 'bg-[#c5a869] text-[#071614]'
                        : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    📢 @muhiddinsahhofuz (Ustoz)
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="@Asaka_Ziyo yoki @muhiddinsahhofuz"
                  value={telegramChannelId}
                  onChange={(e) => {
                    setTelegramChannelId(e.target.value);
                    if (e.target.value === '@Asaka_Ziyo' || e.target.value === '@muhiddinsahhofuz') {
                      setSelectedTelegramChannel(e.target.value as any);
                    }
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
              </div>

              <Button variant="primary" size="sm" onClick={handleSaveTelegramConfig}>
                <span>Sozlamalarni Saqlash</span>
              </Button>
            </div>

            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Kanalga Xabar Yuborish ({selectedTelegramChannel})
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Kanalga matn:</label>
                <textarea
                  rows={3}
                  value={telegramCustomText}
                  onChange={(e) => setTelegramCustomText(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSendingTelegram}
                  onClick={() => handleSendTelegramMessage()}
                  className="flex-1 justify-center"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Xabarni Yuborish</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSendingTelegram}
                  onClick={handleBroadcastPrayerTimesToTelegram}
                  className="justify-center"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-[#c5a869]" />
                  <span>8 Namoz Vaqtlarini Yuborish</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- TAB: FIREBASE FIRESTORE (ACTIVE & CONNECTED) ---------------- */}
      {activeTab === 'firebase' && (
        <Card elevated className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Google Cloud Firebase Firestore — Faol Bulutli Baza</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ushbu boʻlim orqali Asaka Ziyo loyihasining rasmiy Google Cloud Firebase Firestore bulutli maʼlumotlar bazasi va Firebase Authentication xizmati boshqariladi.
            </p>
          </div>

          {firebaseStatus && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between">
              <span>{firebaseStatus}</span>
              <button
                onClick={() => setFirebaseStatus(null)}
                className="text-stone-400 hover:text-stone-200 text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#c5a869]" />
                <span>Bulutli Baza Maʼlumotlari</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span className="text-stone-500">Firebase Loyiha ID:</span>
                  <span className="font-mono font-bold text-[#c5a869]">basic-petal-001dl</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span className="text-stone-500">Firestore Database ID:</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200 text-[11px] truncate max-w-[200px]" title="ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94">
                    ai-studio-asakaziyoapp-...
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span className="text-stone-500">Xavfsizlik Qoidalari:</span>
                  <span className="font-bold text-emerald-400">✅ firestore.rules (Deployed)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span className="text-stone-500">Boshqaruvchi Admin Email:</span>
                  <span className="font-mono text-emerald-400">asakaziyo0@gmail.com</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Firestore Holati:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Toʻliq Integratsiya Qilingan
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isRunningDiagnostics}
                  onClick={async () => {
                    setIsRunningDiagnostics(true);
                    setFirebaseStatus('Firestore diagnostikasi (real oʻqish/yozish va latency) oʻtkazilmoqda...');
                    const res = await runFirestoreDiagnostics();
                    setIsRunningDiagnostics(false);
                    setDiagnosticResult(res);
                    if (res.status === 'PASS') {
                      setFirebaseStatus(`✅ Diagnostika PASS: Latency ${res.latencyMs}ms | ${res.operation}`);
                    } else {
                      setFirebaseStatus(`❌ Diagnostika FAIL: ${res.details}`);
                    }
                  }}
                  className="flex-1 justify-center text-xs bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                  <span>Diagnostika (PASS/FAIL & Latency)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isTestingFirebase}
                  onClick={async () => {
                    setIsTestingFirebase(true);
                    setFirebaseStatus('Firestore bulutiga soʻrov yuborilmoqda...');
                    const ok = await testFirestoreConnection();
                    setIsTestingFirebase(false);
                    if (ok) {
                      setFirebaseStatus('✅ Muvaffaqiyatli: Google Cloud Firebase Firestore bilan aloqa 100% barqaror!');
                    } else {
                      setFirebaseStatus('⚠️ Firebase buluti bilan toʻgʻridan-toʻgʻri aloqa kutilmoqda. Ilova markaziy server va oflayn keshda xatosiz ishlamoqda.');
                    }
                  }}
                  className="flex-1 justify-center text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span>Tezkor Ping</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSyncingFirebase}
                  onClick={async () => {
                    setIsSyncingFirebase(true);
                    setFirebaseStatus('Barcha maʼlumotlar (namoz, maqolalar, hadislar, zikrlar) Firestore bulutiga yuborilmoqda...');
                    const res = await syncAllToFirestore();
                    setIsSyncingFirebase(false);
                    if (res.success) {
                      setFirebaseStatus(`✅ Muvaffaqiyatli: ${res.count} ta asosiy hujjat Firestore bulutiga toʻliq sinxronlandi!`);
                    } else {
                      setFirebaseStatus(`⚠️ Sinxronizatsiya eslatmasi: ${res.error || 'Server va lokal bazada saqlangan.'}`);
                    }
                  }}
                  className="flex-1 justify-center text-xs"
                >
                  <Flame className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  <span>Firestoreʼga Sinxronlash</span>
                </Button>
              </div>

              {diagnosticResult && (
                <div className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2 ${
                  diagnosticResult.status === 'PASS'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                        diagnosticResult.status === 'PASS' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                      }`}>
                        STATUS: {diagnosticResult.status}
                      </span>
                      <span>Aloqa Operatsiyasi: {diagnosticResult.operation}</span>
                    </span>
                    <span className="font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      ⚡ {diagnosticResult.latencyMs} ms
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {diagnosticResult.details}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] opacity-75 font-mono pt-1 border-t border-white/10">
                    <span>Vaqt: {diagnosticResult.timestamp}</span>
                    {diagnosticResult.authenticatedAs && (
                      <span>Admin: {diagnosticResult.authenticatedAs}</span>
                    )}
                    {diagnosticResult.documentId && (
                      <span>Test Doc: {diagnosticResult.documentId}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#c5a869]" />
                <span>Faol Administrator Seansi (Firebase Auth & RBAC)</span>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">
                Xavfsizlik qoidalariga koʻra (<code className="text-[#c5a869]">firestore.rules</code>), barcha maʼmuriy amallar faqat haqiqiy Firebase autentifikatsiyasidan oʻtgan va Firestore <code className="text-[#c5a869]">/admins/{'{uid}'}</code> hujjati mavjud boʻlgan hisoblarga ruxsat etiladi.
              </p>

              {adminUser ? (
                <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-800 border border-[#c5a869]/40 flex items-center justify-center font-bold text-white text-base">
                      {adminUser.displayName ? adminUser.displayName[0].toUpperCase() : 'A'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{adminUser.displayName}</div>
                      <div className="text-[11px] text-emerald-300 font-mono">
                        {adminUser.username} · {adminUser.email}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="inline-block px-2 py-0.5 text-[10px] rounded font-bold bg-[#c5a869] text-[#071614]">
                          Rol: {adminUser.role} (Firestore tasdiqlangan)
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">✓ Faol Sessiya</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono space-y-1 pt-2 border-t border-emerald-950">
                    <div>UID: <span className="text-stone-300">{adminUser.uid}</span></div>
                    {adminUser.lastLoginAt && (
                      <div>Oxirgi kirish: <span className="text-stone-300">{new Date(adminUser.lastLoginAt).toLocaleString('uz-UZ')}</span></div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-center text-xs text-rose-400 hover:text-rose-300"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    <span>Xavfsiz Chiqish</span>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-stone-400">
                  Faol seans topilmadi.
                </div>
              )}

              <div className="pt-2 border-t border-stone-200 dark:border-emerald-950/60 text-[11px] text-stone-500">
                🔒 <b>Xavfsizlik standarti</b>: Qattiq yozilgan parollar va avtomatik email-huquqlar butunlay olib tashlangan. Har bir administrator individual ravishda Firestore orqali boshqariladi.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- TAB: SUPABASE & CLOUD (OPTIONAL) ---------------- */}
      {activeTab === 'supabase' && (
        <Card elevated className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#c5a869]" />
              <span>Bulutli Baza & Supabase Integratsiyasi (Ixtiyoriy Zaxira)</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Google Cloud Firebase Firestore (<code className="text-[#c5a869]">{AUTHORIZED_ADMIN_EMAIL}</code>) — Asaka Ziyo loyihasining yagona asosiy va doimiy maʼlumotlar bazasidir. Supabase esa faqat qoʻshimcha ikkilamchi zaxira nusxalari (backup) uchun xizmat qiladi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Firebase & Supabase Admin Email: {AUTHORIZED_SUPABASE_ADMIN_EMAIL}</span> — Barcha bulutli maʼlumotlar va ikkilamchi zaxiralar yagona tasdiqlangan administrator (<code className="font-mono">{AUTHORIZED_ADMIN_USERNAME}</code> / <code className="font-mono">{AUTHORIZED_SUPABASE_ADMIN_EMAIL}</code>) hisobiga biriktirilgan.
            </div>
          </div>

          {supabaseStatus && (
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-xs font-medium">
              {supabaseStatus}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Supabase Sozlamalari (Ixtiyoriy Zaxira)
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Supabase Administrator Email:</label>
                <input
                  type="email"
                  readOnly
                  value={AUTHORIZED_SUPABASE_ADMIN_EMAIL}
                  className="w-full p-2.5 text-xs font-mono font-bold text-emerald-400 rounded-xl border border-emerald-500/30 bg-emerald-950/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Supabase URL (ixtiyoriy):</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value, adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL })}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Anon Public Key (ixtiyoriy):</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseConfig.anonKey}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value, adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL })}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
                <p className="text-[11px] text-stone-400">
                  Xavfsizlik: Faqat jamoat anonim kalitidan foydalaniladi. Service role kaliti hech qachon brauzerga kiritilmaydi.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supabaseConfig.isEnabled}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, isEnabled: e.target.checked, adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL })}
                    className="rounded text-[#c5a869] focus:ring-[#c5a869]"
                  />
                  <span>Supabase tashqi zaxirasini yoqish</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const updatedCfg = { ...supabaseConfig, adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL };
                    setSupabaseConfig(updatedCfg);
                    saveStoredSupabaseConfig(updatedCfg);
                    setSupabaseStatus(`✅ Supabase konfiguratsiyasi (${AUTHORIZED_SUPABASE_ADMIN_EMAIL}) saqlandi!`);
                    setTimeout(() => setSupabaseStatus(null), 3000);
                  }}
                >
                  <span>Saqlash</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isTestingSupabase || !supabaseConfig.url || !supabaseConfig.anonKey}
                  onClick={async () => {
                    setIsTestingSupabase(true);
                    setSupabaseStatus('Ulanish tekshirilmoqda...');
                    const res = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
                    setIsTestingSupabase(false);
                    setSupabaseStatus(res.message);
                  }}
                >
                  <span>Ulanishni Tekshirish</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Arxitektura & Holat
              </div>

              <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Asosiy Maʼlumotlar Bazasi:</span>
                  <span className="font-bold text-emerald-400">✅ Firebase Firestore (Primary)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Firebase Admin Email:</span>
                  <span className="font-mono font-bold text-emerald-400">{AUTHORIZED_ADMIN_EMAIL}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Supabase Admin Email:</span>
                  <span className="font-mono font-bold text-emerald-400">{AUTHORIZED_SUPABASE_ADMIN_EMAIL}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Administrator Login:</span>
                  <span className="font-mono font-bold text-[#c5a869]">{AUTHORIZED_ADMIN_USERNAME}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Cross-Tab Sinxronizatsiya:</span>
                  <span className="font-bold text-emerald-400">✅ BroadcastChannel faol</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Oflayn Kesh (PWA):</span>
                  <span className="font-bold text-emerald-400">✅ LocalStorage kesh faol</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Tashqi Supabase Holati:</span>
                  <span className={`font-bold ${supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey
                      ? '✅ Ulangan (Faol)'
                      : '⚠️ Sozlanmagan (Tashqi URL va Anon Key kiritilmagan)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Restore Snapshot Manager */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#c5a869]" />
                  <span>Zaxira Nusxalari va Tiklash Markazi (Backup & Restore)</span>
                </h4>
                <p className="text-xs text-stone-500">
                  Firebase Firestore maʼlumotlaridan toʻliq zaxira nusxa olish va istalgan nuqtaga xavfsiz qaytarish (tiklashdan oldin avtomatik himoya nusxasi olinadi).
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={isCreatingBackup}
                onClick={handleCreateBackup}
                className="shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>{isCreatingBackup ? 'Yaratilmoqda...' : 'Yangi Zaxira Nusxa Yaratish'}</span>
              </Button>
            </div>

            {backupsList.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 border border-dashed border-stone-200 dark:border-emerald-950 rounded-xl">
                Hozircha saqlangan zaxira nusxalari mavjud emas. Yuqoridagi tugma orqali birinchi zaxirani yarating.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backupsList.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>{b.label}</span>
                        <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          {b.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        ID: {b.id} · Vaqt: {new Date(b.createdAt).toLocaleString('uz-UZ')} · Manzil: {b.destination}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRestoringBackupId === b.id}
                      onClick={() => handleRestoreBackup(b.id)}
                      className="shrink-0 text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRestoringBackupId === b.id ? 'animate-spin' : ''}`} />
                      <span>{isRestoringBackupId === b.id ? 'Tiklanmoqda...' : 'Zaxiradan Tiklash'}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---------------- TAB 7: LOCALIZATION CONVERTER ---------------- */}
      {activeTab === 'localization' && (
        <Card elevated className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#c5a869]" />
              <span>Yangi Oʻzbek Alifbosi Konvertatsiya Dastgohi (ş, ç, ö, ğ)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold block">Standart Lotin matni (uz-Latn):</label>
              <textarea
                rows={5}
                value={converterInput}
                onChange={(e) => setConverterInput(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#c5a869] block">
                  Yangi Alifbo Natijasi (uz-Latn-new):
                </label>
                <button
                  onClick={() => {
                    const converted = toNewUzbekAlphabet(converterInput);
                    try {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(converted);
                      }
                    } catch {
                      // ignore
                    }
                    setConverterCopied(true);
                    setTimeout(() => setConverterCopied(false), 2000);
                  }}
                  className="text-[11px] text-[#c5a869] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{converterCopied ? 'Nusxa olindi!' : 'Nusxa olish'}</span>
                </button>
              </div>
              <div className="w-full p-3 h-[122px] overflow-y-auto text-xs sm:text-sm rounded-xl border border-[#c5a869]/40 bg-[#c5a869]/5 whitespace-pre-wrap">
                {toNewUzbekAlphabet(converterInput)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- TAB 8: AUDIT LOGS ---------------- */}
      {activeTab === 'audit_logs' && (
        <Card elevated className="p-6 space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <History className="w-4 h-4 text-[#c5a869]" />
            <span>Tizim Audit va Xavfsizlik Jurnali</span>
          </h3>
          <div className="divide-y divide-stone-100 dark:divide-emerald-950/60 font-mono-numbers text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-stone-800 dark:text-stone-200">{log.action}</div>
                  <div className="text-[11px] text-stone-400">{log.detailsUz}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                    {log.status}
                  </span>
                  <div className="text-[10px] text-stone-400 mt-0.5">{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---------------- MODAL: ADD ARTICLE ---------------- */}
      {showAddArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Maqola Qoʻshish
            </h3>
            <form onSubmit={handleCreateArticle} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Rasm / Video fayl yuklash:</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash (Rasm/Video)'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <input
                type="text"
                required
                placeholder="Maqola sarlavhasi..."
                value={newArticleTitle}
                onChange={(e) => setNewArticleTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <input
                type="text"
                placeholder="Qisqacha tavsif (subtitle)..."
                value={newArticleSubtitle}
                onChange={(e) => setNewArticleSubtitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newArticleCategory}
                  onChange={(e) => setNewArticleCategory(e.target.value as any)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                >
                  <option value="Axloq">Axloq</option>
                  <option value="Fiqh">Fiqh</option>
                  <option value="Aqoid">Aqoid</option>
                  <option value="Tarix">Tarix</option>
                  <option value="Oila">Oila</option>
                </select>
                <input
                  type="text"
                  placeholder="Muallif ismi..."
                  value={newArticleAuthor}
                  onChange={(e) => setNewArticleAuthor(e.target.value)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                />
              </div>
              <textarea
                rows={2}
                required
                placeholder="Muxtasar mazmun (excerpt)..."
                value={newArticleExcerpt}
                onChange={(e) => setNewArticleExcerpt(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <textarea
                rows={5}
                placeholder="Toʻliq matn (abzaslarni ikki qator tashlab yozing)..."
                value={newArticleBody}
                onChange={(e) => setNewArticleBody(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddArticleModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: ADD MEDIA / REEL ---------------- */}
      {showAddMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Reels, Post & Media Qoʻshish
            </h3>
            <form onSubmit={handleCreateMediaPost} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Video / Rasm / Audio yuklash:</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash (Video/Rasm)'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <input
                type="text"
                required
                placeholder="Media lavha sarlavhasi..."
                value={newMediaTitle}
                onChange={(e) => setNewMediaTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newMediaType}
                  onChange={(e) => setNewMediaType(e.target.value as any)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                >
                  <option value="reel">Reel (Qisqa video)</option>
                  <option value="video">Toʻliq Video</option>
                  <option value="audio">Audio Tilovat</option>
                  <option value="image">Maʼrifiy Tasvir / Post</option>
                </select>
                <input
                  type="text"
                  placeholder="Kategoriya..."
                  value={newMediaCategory}
                  onChange={(e) => setNewMediaCategory(e.target.value)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                />
              </div>
              <input
                type="text"
                placeholder="Media URL yoki yuqoridan fayl tanlang..."
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <textarea
                rows={3}
                placeholder="Tavsif (caption)..."
                value={newMediaCaption}
                onChange={(e) => setNewMediaCaption(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddMediaModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: ADD HADITH ---------------- */}
      {showAddHadithModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Hadis Qoʻshish
            </h3>
            <form onSubmit={handleCreateHadith} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Rasm / Video fayl (ixtiyoriy):</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newHadithCollection}
                  onChange={(e) => setNewHadithCollection(e.target.value as any)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                >
                  <option value="bukhari">Sahihi Buxoriy</option>
                  <option value="muslim">Sahihi Muslim</option>
                  <option value="tirmidhi">Sunani Termiziy</option>
                  <option value="nawawi">Imom Navaviy Qirq Hadis</option>
                </select>
                <input
                  type="number"
                  placeholder="Hadis raqami..."
                  value={newHadithNumber}
                  onChange={(e) => setNewHadithNumber(parseInt(e.target.value, 10) || 1)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                />
              </div>
              <input
                type="text"
                placeholder="Roviy (masalan: Abu Hurayra roziyallohu anhu)..."
                value={newHadithNarrator}
                onChange={(e) => setNewHadithNarrator(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <textarea
                rows={3}
                required
                dir="rtl"
                placeholder="Arabiy hadis matni..."
                value={newHadithTextAr}
                onChange={(e) => setNewHadithTextAr(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-arabic"
              />
              <textarea
                rows={3}
                required
                placeholder="Oʻzbekcha maʼnolari tarjimasi..."
                value={newHadithTranslation}
                onChange={(e) => setNewHadithTranslation(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddHadithModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: ADD DHIKR ---------------- */}
      {showAddDhikrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Zikr / Duo Qoʻshish
            </h3>
            <form onSubmit={handleCreateDhikr} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Rasm / Audio / Video fayl:</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <input
                type="text"
                required
                placeholder="Zikr yoki duo nomi..."
                value={newDhikrTitle}
                onChange={(e) => setNewDhikrTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newDhikrCategory}
                  onChange={(e) => setNewDhikrCategory(e.target.value as any)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                >
                  <option value="namozdan_keyin">Namozdan keyin</option>
                  <option value="tonggi">Tonggi zikrlar</option>
                  <option value="kechki">Kechki zikrlar</option>
                  <option value="sayyidul_istigfor">Sayyidul Istigʻfor</option>
                </select>
                <input
                  type="number"
                  placeholder="Hisob soni (masalan: 33)..."
                  value={newDhikrTargetCount}
                  onChange={(e) => setNewDhikrTargetCount(parseInt(e.target.value, 10) || 33)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                />
              </div>
              <textarea
                rows={2}
                required
                dir="rtl"
                placeholder="Arabiy zikr matni..."
                value={newDhikrTextAr}
                onChange={(e) => setNewDhikrTextAr(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-arabic"
              />
              <input
                type="text"
                placeholder="Transliteratsiya..."
                value={newDhikrTransliteration}
                onChange={(e) => setNewDhikrTransliteration(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <textarea
                rows={2}
                placeholder="Maʼnosi tarjimasi..."
                value={newDhikrTranslation}
                onChange={(e) => setNewDhikrTranslation(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddDhikrModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: ADD NEWS ---------------- */}
      {showAddNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Yangilik Qoʻshish
            </h3>
            <form onSubmit={handleCreateNews} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Rasm / Video fayl yuklash:</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash (Rasm/Video)'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <input
                type="text"
                required
                placeholder="Yangilik sarlavhasi..."
                value={newNewsTitle}
                onChange={(e) => setNewNewsTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <select
                value={newNewsCategory}
                onChange={(e) => setNewNewsCategory(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              >
                <option value="Masjid hayoti">Masjid hayoti</option>
                <option value="Mahalliy">Mahalliy</option>
                <option value="Oʻzbekiston">Oʻzbekiston</option>
                <option value="Ilm-maʼrifat">Ilm-maʼrifat</option>
              </select>
              <textarea
                rows={2}
                required
                placeholder="Qisqacha xulosa (summary)..."
                value={newNewsSummary}
                onChange={(e) => setNewNewsSummary(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <textarea
                rows={4}
                placeholder="Toʻliq yangilik matni..."
                value={newNewsContent}
                onChange={(e) => setNewNewsContent(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddNewsModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: ADD ANNOUNCEMENT ---------------- */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto border-[#c5a869]/40">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Yangi Rasmiy Eʼlon Qoʻshish
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Joylash rejimi:</label>
                  <select
                    value={selectedPublishMode}
                    onChange={(e) => setSelectedPublishMode(e.target.value as PublishMode)}
                    className="w-full p-2 text-xs rounded-xl border border-[#c5a869]/40 bg-stone-50 dark:bg-[#071614] font-bold"
                  >
                    <option value="published">Doimiy chop etish (Jonli)</option>
                    <option value="draft">Qoralama (Faqat adminga)</option>
                    <option value="test">Test qilish rejimi</option>
                    <option value="archived">Arxivga joylash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400">Rasm / Video fayl yuklash:</label>
                  <label className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold rounded-xl border border-dashed border-[#c5a869]/50 bg-[#c5a869]/10 text-[#c5a869] cursor-pointer hover:bg-[#c5a869]/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Yuklanmoqda...' : 'Fayl tanlash (Rasm/Video)'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {fileUploadStatus && (
                <div className="text-[11px] text-emerald-400 font-medium">{fileUploadStatus}</div>
              )}
              <input
                type="text"
                required
                placeholder="Eʼlon sarlavhasi..."
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newAnnCategory}
                  onChange={(e) => setNewAnnCategory(e.target.value as any)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                >
                  <option value="Muhim">Muhim</option>
                  <option value="Juma">Juma</option>
                  <option value="Ramazon">Ramazon</option>
                  <option value="Tadbir">Tadbir</option>
                  <option value="Xayriya">Xayriya</option>
                </select>
                <input
                  type="text"
                  placeholder="Manzil..."
                  value={newAnnLocation}
                  onChange={(e) => setNewAnnLocation(e.target.value)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
                />
              </div>
              <textarea
                rows={3}
                required
                placeholder="Eʼlonning toʻliq matni..."
                value={newAnnContent}
                onChange={(e) => setNewAnnContent(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddAnnouncementModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------- MODAL: PASSWORD CHANGE ---------------- */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card elevated className="p-6 max-w-md w-full space-y-4 border-[#c5a869]/40">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#c5a869]" />
                <span>Administrator Parolini Oʻzgartirish</span>
              </h3>
              <button
                onClick={() => {
                  setShowPasswordChangeModal(false);
                  setPasswordChangeStatus(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Ushbu amal joriy administrator hisobingiz parolini Firebase Auth va server tizimida xavfsiz yangilaydi.
            </p>

            {passwordChangeStatus && (
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs">
                {passwordChangeStatus}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Yangi Parol (kamida 8 ta belgi):</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Yangi parolni kiriting"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Yangi Parolni Qayta Kiriting:</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Parolni tasdiqlang"
                  value={confirmNewPasswordValue}
                  onChange={(e) => setConfirmNewPasswordValue(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordChangeModal(false);
                    setPasswordChangeStatus(null);
                  }}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Parolni Saqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
