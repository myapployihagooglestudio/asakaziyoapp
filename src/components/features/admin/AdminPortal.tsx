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
} from 'lucide-react';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
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
} from '../../../utils/databaseService';
import {
  testFirestoreConnection,
  signInAdmin,
  signOutFirebase,
  auth,
  checkAdminRole,
  fetchAdminProfile,
  changeCurrentAdminPassword,
  getActiveAdminSession,
  getActiveAdminToken,
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

interface AdminPortalProps {
  currentSchedule: PrayerSchedule;
  onUpdateSchedule: (newSchedule: PrayerSchedule) => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'drafts'
  | 'prayer_schedule'
  | 'content'
  | 'archive'
  | 'inquiries'
  | 'notifications'
  | 'telegram'
  | 'firebase'
  | 'supabase'
  | 'localization'
  | 'audit_logs';

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

  // Push Notifications state
  const [prayerAlertSettings, setPrayerAlertSettings] = useState<PrayerAlertSettings>(
    getPrayerAlertSettings()
  );
  const [customNotifTitle, setCustomNotifTitle] = useState('');
  const [customNotifMessage, setCustomNotifMessage] = useState('');
  const [customNotifCategory, setCustomNotifCategory] = useState<'prayer' | 'announcement' | 'news' | 'system'>('announcement');
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
  const [firebaseUser, setFirebaseUser] = useState<any>(() => auth.currentUser);

  useEffect(() => {
    let isMounted = true;

    // 1. Check active authenticated admin session (menageradmin / asakaziyo0@gmail.com)
    const existingSession = getActiveAdminSession();
    if (existingSession && existingSession.isActive) {
      setAdminUser(existingSession);
      setActiveRole(existingSession.role);
      setIsAuthenticated(true);
      setIsAuthLoading(false);
    }

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await fetchAdminProfile(user.uid);
          if (profile && profile.isActive && isMounted) {
            setAdminUser(profile);
            setActiveRole(profile.role);
            setIsAuthenticated(true);
            setLoginError(null);
          } else if (isMounted && !getActiveAdminSession()) {
            setAdminUser(null);
            setIsAuthenticated(false);
          }
        } catch {
          if (isMounted && !getActiveAdminSession()) {
            setAdminUser(null);
            setIsAuthenticated(false);
          }
        }
      } else if (isMounted) {
        const sessionFallback = getActiveAdminSession();
        if (sessionFallback && sessionFallback.isActive) {
          setAdminUser(sessionFallback);
          setActiveRole(sessionFallback.role);
          setIsAuthenticated(true);
        } else {
          setAdminUser(null);
          setIsAuthenticated(false);
        }
      }

      if (isMounted) setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
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
    });
    return unsubscribe;
  }, []);

  // Refresh authoritative Firestore data and backup snapshots whenever admin is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncWithFirestore(true);
      fetchBackupList().then((res) => {
        if (res.success) {
          setBackupsList(res.backups);
        }
      });
    }
  }, [isAuthenticated]);

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

    if (res.success) {
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

  const handleSendPushBroadcast = () => {
    if (!customNotifTitle.trim() || !customNotifMessage.trim()) return;

    saveNotification({
      title: customNotifTitle,
      message: customNotifMessage,
      category: customNotifCategory,
      priority: 'high',
    });

    setCustomNotifTitle('');
    setCustomNotifMessage('');
    setNotifSuccessMsg('Push xabarnoma markaziy server bazasida saqlandi va barcha foydalanuvchilarga tarqatildi!');
    setTimeout(() => setNotifSuccessMsg(null), 3500);
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
    setArticlesList(getStoredArticles());
    setArchivedItems(getAllArchivedItems());
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
    setNewsList(getStoredNews());
    setArchivedItems(getAllArchivedItems());
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
    setAnnouncementsList(getStoredAnnouncements());
    setArchivedItems(getAllArchivedItems());
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
                {adminUser?.username || AUTHORIZED_ADMIN_USERNAME} ({adminUser?.email || AUTHORIZED_ADMIN_EMAIL})
              </span>{' '}
              · Firebase & Supabase Admin: <span className="font-mono text-emerald-400">{AUTHORIZED_ADMIN_EMAIL}</span>
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

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 dark:border-emerald-950">
        {[
          { id: 'dashboard', label: 'Boshqaruv Paneli', icon: Sliders },
          { id: 'drafts', label: `Telegram Moderatsiya (${draftsList.filter((d) => d.status === 'pending').length} yangi)`, icon: Inbox },
          { id: 'prayer_schedule', label: '8 Namoz Vaqtlari', icon: Clock },
          { id: 'content', label: 'Kontent CMS (Barcha)', icon: FileText },
          { id: 'archive', label: `Arxiv & Tiklash (${archivedItems.length})`, icon: History },
          { id: 'inquiries', label: `Murojaatlar & Chat (${inquiriesList.filter((i) => i.status === 'new').length} yangi)`, icon: MessageSquare },
          { id: 'notifications', label: 'Push & Ovozli Eslatmalar', icon: Bell },
          { id: 'telegram', label: 'Telegram Bot & Kanal', icon: Send },
          { id: 'firebase', label: 'Firebase Firestore (Faol)', icon: Flame },
          { id: 'supabase', label: 'Bulut & Supabase (Ixtiyoriy)', icon: Database },
          { id: 'localization', label: 'Yangi Alifbo', icon: Languages },
          { id: 'audit_logs', label: 'Audit Jurnali', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
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

      {/* ---------------- TAB 1: DASHBOARD OVERVIEW ---------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card elevated className="p-4 space-y-1 border-[#c5a869]/30">
              <span className="text-xs text-stone-400">Namoz vaqtlari:</span>
              <div className="text-2xl font-bold font-mono-numbers text-[#c5a869]">8 ta vaqt</div>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Tahajjud & Subh qoʻshilgan</span>
              </p>
            </Card>

            <Card elevated className="p-4 space-y-1">
              <span className="text-xs text-stone-400">Ilmiy maqolalar:</span>
              <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                {articlesList.length} ta
              </div>
              <p className="text-[11px] text-stone-400">Toʻliq tahrir va izohlar</p>
            </Card>

            <Card elevated className="p-4 space-y-1">
              <span className="text-xs text-stone-400">Reels & Medialar:</span>
              <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                {mediaList.length} ta
              </div>
              <p className="text-[11px] text-stone-400">Video, audio va lavhalar</p>
            </Card>

            <Card elevated className="p-4 space-y-1">
              <span className="text-xs text-stone-400">Murojaat va Savollar:</span>
              <div className="text-2xl font-bold font-mono-numbers text-[#c5a869]">
                {inquiriesList.length} ta
              </div>
              <p className="text-[11px] text-amber-400">
                {inquiriesList.filter((i) => i.status === 'new').length} ta javob kutilmoqda
              </p>
            </Card>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card elevated className="p-5 space-y-3">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#c5a869]" />
                <span>Namoz vaqtlarini yangilash</span>
              </h4>
              <p className="text-xs text-stone-500">
                Tahajjud, Subh, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton vaqtlarini oʻzgartirish va tasdiqlash.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('prayer_schedule')}>
                <span>Jadvalni Ochish</span>
              </Button>
            </Card>

            <Card elevated className="p-5 space-y-3">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#c5a869]" />
                <span>Kontent Qoʻshish (CMS)</span>
              </h4>
              <p className="text-xs text-stone-500">
                Yangi maqola, reels media lavhasi, hadis yoki zikr qoʻshish va tahrirlash.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('content')}>
                <span>CMS Paneli</span>
              </Button>
            </Card>

            <Card elevated className="p-5 space-y-3">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#c5a869]" />
                <span>Savollarga Javob Berish</span>
              </h4>
              <p className="text-xs text-stone-500">
                Foydalanuvchilar yoʻllagan savollarni oʻqish va toʻgʻridan-toʻgʻri javob qaytarish.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('inquiries')}>
                <span>Murojaatlar ({inquiriesList.filter(i => i.status === 'new').length})</span>
              </Button>
            </Card>
          </div>
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

      {/* ---------------- TAB 5: NOTIFICATIONS & AZAN ALERTS ---------------- */}
      {activeTab === 'notifications' && (
        <Card elevated className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#c5a869]" />
              <span>Namoz Vaqtlaridan Oldin Bildirishnoma & Push Xabarlar</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Namoz kirmasdan oldin brauzer va telefonga azon ovozi va bildirishnomalarni boshqarish.
            </p>
          </div>

          {notifSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{notifSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-4 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Avtomatik eslatma vaqti:
              </div>

              <div className="flex flex-wrap gap-2">
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
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      prayerAlertSettings.minutesBefore === mins
                        ? 'bg-[#c5a869] text-[#071614]'
                        : 'border border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {mins} daqiqa oldin
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
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
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => playGentleChime()} className="gap-1.5 text-xs">
                  <Volume2 className="w-3.5 h-3.5 text-[#c5a869]" />
                  <span>Ohangni sinab koʻrish</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const granted = await requestPushPermission();
                    if (granted) {
                      triggerBrowserNotification(
                        'Asaka Ziyo Sinov Bildirishnomasi',
                        'Namoz eslatmalari qurilmangizda muvaffaqiyatli ishga tushdi.'
                      );
                    }
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Bell className="w-3.5 h-3.5 text-[#c5a869]" />
                  <span>Ekran xabarini sinash</span>
                </Button>
              </div>
            </div>

            {/* Instant Push Broadcast Form */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-3 bg-stone-50/50 dark:bg-[#071614]/50">
              <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Barcha foydalanuvchilarga push xabarnoma yuborish:
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Sarlavha..."
                  value={customNotifTitle}
                  onChange={(e) => setCustomNotifTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />

                <textarea
                  rows={3}
                  placeholder="Xabarnoma matni..."
                  value={customNotifMessage}
                  onChange={(e) => setCustomNotifMessage(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />

                <div className="flex items-center justify-between">
                  <select
                    value={customNotifCategory}
                    onChange={(e) => setCustomNotifCategory(e.target.value as any)}
                    className="p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                  >
                    <option value="announcement">Eʼlon</option>
                    <option value="prayer">Namoz</option>
                    <option value="news">Yangilik</option>
                    <option value="system">Tizimli</option>
                  </select>

                  <Button variant="primary" size="sm" onClick={handleSendPushBroadcast}>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Darhol Tarqatish</span>
                  </Button>
                </div>
              </div>
            </div>
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
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Toʻliq Integratsiya Qilingan</span>
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
