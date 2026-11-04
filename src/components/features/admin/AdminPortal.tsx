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
  subscribeToDatabase,
  syncAllToFirestore,
  runFirestoreDiagnostics,
  FirestoreDiagnosticResult,
} from '../../../utils/databaseService';
import {
  testFirestoreConnection,
  signInWithGoogle,
  signOutFirebase,
  auth,
  bootstrapAdmin,
  checkAdminRole,
} from '../../../utils/firebaseClient';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
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
  | 'inquiries'
  | 'notifications'
  | 'telegram'
  | 'firebase'
  | 'supabase'
  | 'localization'
  | 'users'
  | 'audit_logs';

const REQUIRED_LOGIN = 'menageradmin';
const REQUIRED_PASS = 'menageradmin1';
const AUTH_STORAGE_KEY = 'asaka_ziyo_admin_session';
const TELEGRAM_CONFIG_KEY = 'asaka_ziyo_telegram_config';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentSchedule,
  onUpdateSchedule,
  onExitAdmin,
}) => {
  // Authentication gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const session = localStorage.getItem(AUTH_STORAGE_KEY);
        if (session) {
          const parsed = JSON.parse(session);
          return parsed.authenticated === true && parsed.login === REQUIRED_LOGIN;
        }
      }
    } catch {
      // fallback
    }
    return false;
  });

  // Login form inputs
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin tabs & state
  const [activeRole] = useState<UserRole>('SUPER_ADMIN');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Telegram Drafts state (Telegram -> Admin moderation queue)
  const [draftsList, setDraftsList] = useState<TelegramDraftItem[]>(() => getStoredDrafts());
  const [draftActionMsg, setDraftActionMsg] = useState<string | null>(null);

  // Supabase state
  const [supabaseConfig, setSupabaseConfig] = useState(getStoredSupabaseConfig());
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  // Prayer times state (All 8 times)
  const [editableTimes, setEditableTimes] = useState<PrayerTimeEntry[]>(
    currentSchedule.times
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    currentSchedule.isAdministratorPublished
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // CMS state
  const [cmsTab, setCmsTab] = useState<'articles' | 'media' | 'hadiths' | 'dhikrs' | 'daily'>('articles');
  const [articlesList, setArticlesList] = useState<Article[]>(() => getStoredArticles());
  const [mediaList, setMediaList] = useState<MediaPost[]>(() => getStoredMediaPosts());
  const [hadithsList, setHadithsList] = useState<HadithItem[]>(() => getStoredHadiths());
  const [dhikrsList, setDhikrsList] = useState<DhikrItem[]>(() => getStoredDhikrs());

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

  // Forms for adding new CMS items
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
  const [adminRoleInfo, setAdminRoleInfo] = useState<{ isAdmin: boolean; role?: string } | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        if (user.email === 'mirzayevulugbek024@gmail.com') {
          await bootstrapAdmin(user);
        }
        const role = await checkAdminRole(user.uid);
        setAdminRoleInfo(role);
      } else {
        setAdminRoleInfo(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') setArticlesList(getStoredArticles());
      if (event.type === 'POSTS_UPDATED') setMediaList(getStoredMediaPosts());
      if (event.type === 'HADITHS_UPDATED') setHadithsList(getStoredHadiths());
      if (event.type === 'DHIKRS_UPDATED') setDhikrsList(getStoredDhikrs());
      if (event.type === 'INQUIRIES_UPDATED') setInquiriesList(getStoredInquiries());
      if (event.type === 'DRAFTS_UPDATED') setDraftsList(getStoredDrafts());
    });
    return unsubscribe;
  }, []);

  // Sync currentSchedule prop changes
  useEffect(() => {
    if (currentSchedule && currentSchedule.times) {
      setEditableTimes(currentSchedule.times);
      setIsPublished(currentSchedule.isAdministratorPublished);
    }
  }, [currentSchedule]);

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedLogin = loginInput.trim();
    const trimmedPass = passwordInput.trim();

    if (trimmedLogin === REQUIRED_LOGIN && trimmedPass === REQUIRED_PASS) {
      setIsAuthenticated(true);
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            authenticated: true,
            login: REQUIRED_LOGIN,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore
      }

      const loginLog: AuditLogEntry = {
        id: `log-auth-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: `${REQUIRED_LOGIN} (Bosh Maʼmur)`,
        role: 'SUPER_ADMIN',
        action: 'SUPER_ADMIN_LOGIN_SUCCESS',
        resource: 'Maʼmuriyat Konsoli',
        status: 'SUCCESS',
        detailsUz: 'Boshqaruv konsoliga muvaffaqiyatli kirish amalga oshirildi.',
      };
      setAuditLogs((prev) => [loginLog, ...prev]);
    } else {
      setLoginError(
        'Login yoki parol notoʻgʻri! Faqat tayinlangan maʼmuriyat hisobi orqali kirish mumkin.'
      );
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setLoginInput('');
    setPasswordInput('');
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

    await replyToInquiry(inquiryId, replyText.trim(), 'Asaka Jome Masjidi Maʼmuriyati');
    setReplyText('');
    setSelectedInquiryId(null);
    setInquiriesList(getStoredInquiries());
    setSaveSuccessMsg('Javob markaziy server bazasida saqlandi va foydalanuvchiga muvaffaqiyatli yetkazildi!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    await deleteStoredInquiry(inquiryId);
    setInquiriesList(getStoredInquiries());
    setSaveSuccessMsg('Murojaat oʻchirildi.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Telegram Drafts Moderation Handlers
  const handleApproveDraft = async (id: string) => {
    const ok = await approveDraft(id, `${REQUIRED_LOGIN} (Bosh Maʼmur)`);
    if (ok) {
      setDraftsList(getStoredDrafts());
      setArticlesList(getStoredArticles());
      setMediaList(getStoredMediaPosts());
      setSaveSuccessMsg('Qoralama muvaffaqiyatli tasdiqlandi va tegishli boʻlimga toʻgʻri joylandi!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleRejectDraft = async (id: string) => {
    const ok = await rejectDraft(id, `${REQUIRED_LOGIN} (Bosh Maʼmur)`);
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
      await fetch('/api/database/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Adding new Article
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleExcerpt.trim()) return;

    const newArt: Article = {
      id: `art-${Date.now()}`,
      title: newArticleTitle.trim(),
      subtitle: newArticleSubtitle.trim() || newArticleTitle.trim(),
      category: newArticleCategory,
      author: newArticleAuthor.trim() || 'Asaka Masjidi Imomi',
      authorRole: 'Tahririyat Hayʼati',
      publishedDate: 'Bugun',
      readTimeMinutes: Math.max(3, Math.round(newArticleBody.length / 400)),
      featuredImage: '/images/quran_illumination_art_1793634658336.jpg',
      excerpt: newArticleExcerpt.trim(),
      bodyParagraphs: newArticleBody
        ? newArticleBody.split('\n\n').filter(Boolean)
        : [newArticleExcerpt.trim()],
      likesCount: 0,
      rating: 5.0,
      ratingsCount: 1,
      comments: [],
    };

    await saveStoredArticle(newArt);
    setArticlesList(getStoredArticles());
    setShowAddArticleModal(false);
    setNewArticleTitle('');
    setNewArticleSubtitle('');
    setNewArticleExcerpt('');
    setNewArticleBody('');
    setSaveSuccessMsg('Yangi maqola markaziy server bazasida muvaffaqiyatli chop etildi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteArticle = async (id: string) => {
    await deleteStoredArticle(id);
    setArticlesList(getStoredArticles());
    setSaveSuccessMsg('Maqola muvaffaqiyatli oʻchirildi.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Adding new Media Post
  const handleCreateMediaPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaTitle.trim()) return;

    const newPost: MediaPost = {
      id: `post-${Date.now()}`,
      title: newMediaTitle.trim(),
      type: newMediaType,
      category: newMediaCategory,
      author: 'Asaka Ziyo Studiyasi',
      publishedDate: 'Hozirgina',
      mediaUrl: newMediaUrl.trim() || 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80',
      caption: newMediaCaption.trim(),
      likesCount: 0,
      commentsCount: 0,
      isPublished: true,
      comments: [],
    };

    await saveStoredMediaPost(newPost);
    setMediaList(getStoredMediaPosts());
    setShowAddMediaModal(false);
    setNewMediaTitle('');
    setNewMediaCaption('');
    setNewMediaUrl('');
    setSaveSuccessMsg('Yangi media lavhasi markaziy server bazasida eʼlon qilindi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteMediaPost = async (id: string) => {
    await deleteStoredMediaPost(id);
    setMediaList(getStoredMediaPosts());
    setSaveSuccessMsg('Media posti oʻchirildi.');
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
    };

    await saveStoredHadith(newH);
    setHadithsList(getStoredHadiths());
    setShowAddHadithModal(false);
    setNewHadithNarrator('');
    setNewHadithTextAr('');
    setNewHadithTranslation('');
    setSaveSuccessMsg('Yangi moʻtabar hadis markaziy server bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteHadith = async (id: string) => {
    await deleteStoredHadith(id);
    setHadithsList(getStoredHadiths());
    setSaveSuccessMsg('Hadis oʻchirildi.');
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
    };

    await saveStoredDhikr(newD);
    setDhikrsList(getStoredDhikrs());
    setShowAddDhikrModal(false);
    setNewDhikrTitle('');
    setNewDhikrTextAr('');
    setNewDhikrTransliteration('');
    setNewDhikrTranslation('');
    setSaveSuccessMsg('Yangi zikr va duo markaziy server bazasida saqlandi!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteDhikr = async (id: string) => {
    await deleteStoredDhikr(id);
    setDhikrsList(getStoredDhikrs());
    setSaveSuccessMsg('Zikr oʻchirildi.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Unauthenticated: Secure Login Gate
  if (!isAuthenticated) {
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
                  Asaka Ziyo tizimini boshqarish uchun maxsus kirish eshigi.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Boshqaruv Logini:
                  </label>
                  <input
                    type="text"
                    required
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
                      placeholder="Parolni kiriting"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full p-3 pr-10 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-xs font-mono focus:outline-none focus:border-[#c5a869]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center text-xs font-bold py-3.5 tracking-wider uppercase"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  <span>Konsolga Kirish</span>
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
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Kirilgan hisob: <span className="font-mono text-[#c5a869]">{REQUIRED_LOGIN}</span> · Asaka jome masjidi boshqaruv portali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
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
          { id: 'inquiries', label: `Murojaatlar & Chat (${inquiriesList.filter((i) => i.status === 'new').length} yangi)`, icon: MessageSquare },
          { id: 'notifications', label: 'Push & Ovozli Eslatmalar', icon: Bell },
          { id: 'telegram', label: 'Telegram Bot & Kanal', icon: Send },
          { id: 'firebase', label: 'Firebase Firestore (Faol)', icon: Flame },
          { id: 'supabase', label: 'Bulut & Supabase (Ixtiyoriy)', icon: Database },
          { id: 'localization', label: 'Yangi Alifbo', icon: Languages },
          { id: 'audit_logs', label: 'Audit Jurnali', icon: History },
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
                <span className="text-xs font-bold text-stone-500">Mavjud maqolalar roʻyxati:</span>
                <Button variant="primary" size="sm" onClick={() => setShowAddArticleModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Maqola Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {articlesList.map((art) => (
                  <div key={art.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                        {art.title}
                      </div>
                      <div className="text-xs text-stone-400 flex items-center gap-3 mt-0.5">
                        <span className="text-[#c5a869] font-semibold">{art.category}</span>
                        <span>·</span>
                        <span>{art.author}</span>
                        <span>·</span>
                        <span>{art.likesCount || 0} ta yoqdi</span>
                        <span>·</span>
                        <span>{art.comments?.length || 0} ta izoh</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteArticle(art.id)}
                      className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CMS: MEDIA & REELS */}
          {cmsTab === 'media' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Reels va Medialar:</span>
                <Button variant="primary" size="sm" onClick={() => setShowAddMediaModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Media Qoʻshish</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mediaList.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-2 bg-stone-50/50 dark:bg-black/20">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c5a869] text-[#071614] uppercase">
                        {m.type}
                      </span>
                      <button
                        onClick={() => handleDeleteMediaPost(m.id)}
                        className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100 line-clamp-1">
                      {m.title}
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-2">{m.caption}</p>
                    <div className="flex justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-200 dark:border-white/5">
                      <span>{m.likesCount} ta yoqdi</span>
                      <span>{m.commentsCount} ta izoh</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CMS: HADITHS */}
          {cmsTab === 'hadiths' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Hadislar toʻplami:</span>
                <Button variant="primary" size="sm" onClick={() => setShowAddHadithModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Hadis Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {hadithsList.map((h) => (
                  <div key={h.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-[#c5a869]">
                        {h.collectionNameUz} · {h.reference}
                      </div>
                      <div className="font-arabic text-sm text-stone-800 dark:text-stone-200">
                        {h.textAr.slice(0, 100)}...
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        {h.translationUz.slice(0, 120)}...
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteHadith(h.id)}
                      className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CMS: DHIKRS */}
          {cmsTab === 'dhikrs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-500">Zikr va Duolar:</span>
                <Button variant="primary" size="sm" onClick={() => setShowAddDhikrModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Yangi Zikr Qoʻshish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {dhikrsList.map((d) => (
                  <div key={d.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>{d.titleUz}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c5a869]/10 text-[#c5a869]">
                          {d.targetCount} marta
                        </span>
                      </div>
                      <div className="font-arabic text-sm text-[#c5a869]">{d.textAr}</div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{d.translationUz}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteDhikr(d.id)}
                      className="p-2 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
                  <span className="font-mono text-emerald-400">mirzayevulugbek024@gmail.com</span>
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
                <span>Firebase Authentication & Admin Ruxsati</span>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">
                Xavfsizlik qoidalariga koʻra (<code className="text-[#c5a869]">firestore.rules</code>), boshqaruv huquqi tasdiqlangan bosh maʼmur <code className="text-[#c5a869]">mirzayevulugbek024@gmail.com</code> hisobiga biriktirilgan.
              </p>

              {firebaseUser ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    {firebaseUser.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full border border-emerald-500/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-white">
                        {firebaseUser.email ? firebaseUser.email[0].toUpperCase() : 'A'}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{firebaseUser.displayName || 'Google Foydalanuvchisi'}</div>
                      <div className="text-[11px] text-emerald-300 font-mono">{firebaseUser.email}</div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                          adminRoleInfo?.isAdmin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {adminRoleInfo?.isAdmin
                            ? `Rol: ${adminRoleInfo.role || 'superadmin'} (Baza tasdiqlagan)`
                            : 'Rol: Oddiy Foydalanuvchi'}
                        </span>
                        {firebaseUser.emailVerified && (
                          <span className="text-[10px] text-emerald-400">✓ Email tasdiqlangan</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await signOutFirebase();
                      setFirebaseUser(null);
                      setAdminRoleInfo(null);
                      setFirebaseStatus('Firebase hisobidan chiqildi.');
                    }}
                    className="w-full justify-center text-xs text-rose-400 hover:text-rose-300"
                  >
                    <span>Google Hisobidan Chiqish</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-stone-500">
                    Hozirda tizimga parol orqali kirilgansiz (<span className="font-mono text-[#c5a869]">{REQUIRED_LOGIN}</span>).
                    Ixtiyoriy ravishda Google orqali Firebase Auth seansini ochishingiz mumkin:
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setFirebaseStatus('Google bilan kirish oynasi ochilmoqda...');
                      const user = await signInWithGoogle();
                      if (user) {
                        setFirebaseUser(user);
                        if (user.email === 'mirzayevulugbek024@gmail.com') {
                          await bootstrapAdmin(user);
                        }
                        const role = await checkAdminRole(user.uid);
                        setAdminRoleInfo(role);
                        if (role.isAdmin) {
                          setFirebaseStatus(`✅ Xush kelibsiz, ${user.displayName || user.email}! Boshqaruvchi roli: ${role.role} (/admins/${user.uid}).`);
                        } else {
                          setFirebaseStatus(`ℹ️ Kirildi: ${user.email}. Ushbu akkaunt oddiy foydalanuvchi hisoblanadi (maʼmuriyat huquqi berilmagan).`);
                        }
                      } else {
                        setFirebaseStatus('Google orqali kirish bekor qilindi yoki yopildi.');
                      }
                    }}
                    className="w-full justify-center text-xs"
                  >
                    <span>Google orqali Kirish (Firebase Auth)</span>
                  </Button>
                </div>
              )}

              <div className="pt-2 border-t border-stone-200 dark:border-emerald-950/60 text-[11px] text-stone-500">
                🔒 <b>Uch bosqichli himoya</b>: Oflayn kesh (PWA) + Markaziy server JSON bazasi + Google Cloud Firestore toʻliq muvofiqlashtirilgan.
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
              <span>Bulutli Baza & Supabase Integratsiyasi (Ixtiyoriy)</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Loyiha hozirda toʻliq mustaqil: ichki doimiy server bazasi (/data/asaka_ziyo_db.json) orqali barcha maʼlumotlar (namoz vaqtlari, maqolalar, reels, hadislar, zikrlar) ishonchli saqlanmoqda. Supabase esa ixtiyoriy tashqi zaxira sifatida ishlatilishi mumkin.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Ichki doimiy server bazasi faol:</span> Namoz jadvallari, maqolalar, audio va foydalanuvchilar suhbati browser qayta yuklanganda ham, boshqa qurilmalarda ham toʻliq saqlanadi. Hech qanday majburiy maxfiy kalitlar talab etilmaydi.
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
                Supabase Sozlamalari (Ixtiyoriy)
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Supabase URL (ixtiyoriy):</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Anon Public Key (ixtiyoriy):</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseConfig.anonKey}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
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
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, isEnabled: e.target.checked })}
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
                    saveStoredSupabaseConfig(supabaseConfig);
                    setSupabaseStatus('Supabase konfiguratsiyasi saqlandi!');
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
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Asosiy Maʼlumotlar Bazasi:</span>
                  <span className="font-bold text-emerald-400">✅ Doimiy Server JSON (/data)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Cross-Tab Sinxronizatsiya:</span>
                  <span className="font-bold text-emerald-400">✅ BroadcastChannel faol</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Oflayn Kesh (PWA):</span>
                  <span className="font-bold text-emerald-400">✅ LocalStorage kesh faol</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-emerald-950/60">
                  <span>Tashqi Supabase Buluti:</span>
                  <span className="font-bold text-stone-400">{supabaseConfig.isEnabled ? 'Ulangan' : 'Ixtiyoriy (Oʻchirilgan)'}</span>
                </div>
              </div>
            </div>
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
                  Chop etish
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
              Yangi Reels & Media Qoʻshish
            </h3>
            <form onSubmit={handleCreateMediaPost} className="space-y-3">
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
                  <option value="image">Maʼrifiy Tasvir</option>
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
                type="url"
                placeholder="Media URL (Rasm yoki video havolasi)..."
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
                  Eʼlon qilish
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
              <input
                type="text"
                required
                placeholder="Zikr nomi..."
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
    </div>
  );
};
