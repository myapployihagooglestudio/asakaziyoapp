import React, { useEffect, useState, useCallback } from 'react';
import { getActiveAdminToken } from '../../../utils/firebaseClient';
import { SURAHS_LIST } from '../../../data/quranData';
import {
  Headphones,
  Upload,
  Crown,
  CreditCard,
  Users,
  Gift,
  GraduationCap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Database,
  Play,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

type AdminSubTab = 'qorilar' | 'education' | 'plans' | 'payments' | 'users' | 'promos_draws';

function fmtUzs(v: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(v || 0)} UZS`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Faylni oʻqib boʻlmadi'));
    reader.readAsDataURL(file);
  });
}

export const UltimateEcosystemAdminPanel: React.FC = () => {
  const [tab, setTab] = useState<AdminSubTab>('qorilar');
  const [quranData, setQuranData] = useState<any | null>(null);
  const [subData, setSubData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Qari & 114-Surah Upload state
  const [selectedQariId, setSelectedQariId] = useState<string>('');
  const [qariSurahs, setQariSurahs] = useState<any[]>([]);
  const [newQariName, setNewQariName] = useState('');
  const [newQariAr, setNewQariAr] = useState('');
  const [newQariCountry, setNewQariCountry] = useState('Oʻzbekiston');
  const [newQariStyle, setNewQariStyle] = useState('Murattal');
  const [uploadSurahNum, setUploadSurahNum] = useState<number>(1);
  const [uploadAutoPublish, setUploadAutoPublish] = useState<boolean>(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Education state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonLevel, setLessonLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonPremium, setLessonPremium] = useState(false);

  // Card settings form
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    bankName: '',
    paymentNoteUz: '',
    instructionsUz: '',
    isActive: true,
    supportTelegramUrl: 'https://t.me/Ulugbek_Mirzayev_uz',
  });

  // User subscription grant form
  const [targetUserId, setTargetUserId] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [grantReason, setGrantReason] = useState('Admin hadyasi');

  // Promo & Random Draw forms
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoType, setPromoType] = useState<'percent_discount' | 'fixed_discount' | 'free_premium_days'>('percent_discount');
  const [promoValue, setPromoValue] = useState(20);
  const [drawTitle, setDrawTitle] = useState('');
  const [drawDays, setDrawDays] = useState(30);
  const [drawWinners, setDrawWinners] = useState(3);

  const authHeaders = () => {
    const token = getActiveAdminToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/admin/quran-ecosystem/overview', { headers: authHeaders(), credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/subscriptions/overview', { headers: authHeaders(), credentials: 'include' }).then((r) => r.json()),
      ]);
      if (qRes?.success) {
        setQuranData(qRes);
        if (!selectedQariId && qRes.qaris?.[0]?.id) {
          setSelectedQariId(qRes.qaris[0].id);
        }
      }
      if (sRes?.success) {
        setSubData(sRes);
        if (sRes.cardSettings) setCardForm(sRes.cardSettings);
      }
    } catch (err: any) {
      setNotice({ type: 'err', msg: err?.message || 'Admin maʼlumotlarini yuklashda xatolik.' });
    } finally {
      setLoading(false);
    }
  }, [selectedQariId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadQariSurahs = useCallback(async (qId: string) => {
    if (!qId) return;
    const res = await fetch(`/api/admin/quran-ecosystem/qaris/${encodeURIComponent(qId)}/surahs`, {
      headers: authHeaders(),
      credentials: 'include',
    }).then((r) => r.json());
    if (res?.success) setQariSurahs(res.surahs || []);
  }, []);

  useEffect(() => {
    if (selectedQariId) void loadQariSurahs(selectedQariId);
  }, [selectedQariId, loadQariSurahs]);

  const handleCreateQari = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQariName.trim()) return;
    const res = await fetch('/api/admin/quran-ecosystem/qaris', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        nameUz: newQariName.trim(),
        nameAr: newQariAr.trim() || newQariName.trim(),
        countryUz: newQariCountry.trim(),
        styleUz: newQariStyle.trim(),
        isActive: true,
        isVerified: true,
      }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Qori "${res.qari.nameUz}" muvaffaqiyatli qoʻshildi!` });
      setNewQariName('');
      setNewQariAr('');
      setSelectedQariId(res.qari.id);
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Qori qoʻshishda xatolik.' });
    }
  };

  const handleAudioFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedQariId) return;
    setUploadingAudio(true);
    setNotice(null);
    let okCount = 0;
    let lastError = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Support bulk filename numbering like 001.mp3, 036_yasin.mp3 or fallback to selected surah + i
      const numMatch = file.name.match(/(\d{1,3})/);
      const parsedNum = numMatch ? parseInt(numMatch[1], 10) : uploadSurahNum + i;
      const targetSurah = parsedNum >= 1 && parsedNum <= 114 ? parsedNum : Math.min(114, uploadSurahNum + i);

      try {
        const b64 = await fileToBase64(file);
        const res = await fetch('/api/admin/quran-ecosystem/audio/upload', {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            qariId: selectedQariId,
            surahNumber: targetSurah,
            audioBase64: b64,
            mimeType: file.type || 'audio/mpeg',
            originalFilename: file.name,
            autoPublish: uploadAutoPublish,
          }),
        }).then((r) => r.json());
        if (res?.success) okCount += 1;
        else lastError = res?.error || 'Yuklashda xatolik';
      } catch (e: any) {
        lastError = e?.message || 'Yuklashda xatolik';
      }
    }

    setUploadingAudio(false);
    if (okCount > 0) {
      setNotice({
        type: 'ok',
        msg: `${okCount} ta sura audio fayli server xotirasiga doimiy saqlandi (SHA-256 tasdiqlangan).${lastError ? ` Izoh: ${lastError}` : ''}`,
      });
      void loadQariSurahs(selectedQariId);
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: lastError || 'Audio yuklab boʻlmadi.' });
    }
  };

  const handleCreateBackup = async () => {
    const res = await fetch('/api/admin/quran-ecosystem/backup', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Zaxira nusxa yaratildi: ${res.backup.filename}` });
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/quran-ecosystem/lessons', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        titleUz: lessonTitle,
        level: lessonLevel,
        summaryUz: lessonSummary,
        contentUz: lessonContent,
        isPremium: lessonPremium,
        isPublished: true,
      }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Tajvid darsi saqlandi: ${res.lesson.titleUz}` });
      setLessonTitle('');
      setLessonSummary('');
      setLessonContent('');
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Dars saqlanmadi' });
    }
  };

  const handleUpdatePlan = async (plan: any) => {
    const res = await fetch(`/api/admin/subscriptions/plans/${encodeURIComponent(plan.id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify(plan),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `${plan.nameUz} tarifi yangilandi (${fmtUzs(plan.priceUzs)})` });
      void loadAll();
    }
  };

  const handleToggleFeatureGate = async (gate: any) => {
    const nextAccess = gate.access === 'free' ? 'premium' : 'free';
    const res = await fetch(`/api/admin/subscriptions/feature-gates/${encodeURIComponent(gate.key)}`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ access: nextAccess }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `${gate.labelUz} -> ${nextAccess.toUpperCase()}` });
      void loadAll();
    }
  };

  const handleSaveCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/subscriptions/card-settings', {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify(cardForm),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: 'Karta toʻlov rekvizitlari saqlandi va barcha platformalarda yangilandi.' });
      void loadAll();
    }
  };

  const handleOrderAction = async (orderId: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/admin/subscriptions/orders/${encodeURIComponent(orderId)}/${action}`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason: action === 'reject' ? 'Oʻtkazma tasdiqlanmadi' : undefined }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({
        type: 'ok',
        msg:
          action === 'approve'
            ? `Buyurtma ${orderId} tasdiqlandi va Premium faollashtirildi!`
            : `Buyurtma ${orderId} rad etildi.`,
      });
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Amal bajarilmadi.' });
    }
  };

  const handleModifyUserSub = async (action: 'grant' | 'extend' | 'shorten' | 'suspend' | 'cancel', isGift = false, uid?: string) => {
    const user = (uid || targetUserId).trim();
    if (!user) return;
    const res = await fetch(`/api/admin/subscriptions/users/${encodeURIComponent(user)}/modify`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ action, days: grantDays, reason: grantReason, isGift }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `${user} uchun obuna holati yangilandi: ${res.effective?.status}` });
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Obunani oʻzgartirib boʻlmadi.' });
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/subscriptions/promos', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        code: promoCode,
        titleUz: promoTitle || promoCode,
        type: promoType,
        value: promoValue,
        maxUses: 500,
        applicablePlans: ['premium_1m', 'premium_3m', 'premium_6m'],
        isActive: true,
      }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Promokod ${res.promo.code} yaratildi!` });
      setPromoCode('');
      setPromoTitle('');
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Promokod xatoligi.' });
    }
  };

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/subscriptions/random-draws', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        titleUz: drawTitle,
        prizeDays: drawDays,
        winnersCount: drawWinners,
      }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Bepul Random Tanlov yaratildi: ${res.draw.titleUz}` });
      setDrawTitle('');
      void loadAll();
    }
  };

  const handleDrawStep = async (drawId: string, step: 'run' | 'approve') => {
    const res = await fetch(`/api/admin/subscriptions/random-draws/${encodeURIComponent(drawId)}/${step}`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({
        type: 'ok',
        msg:
          step === 'run'
            ? `Server CSPRNG gʻoliblar tanlandi: ${(res.draw?.selectedWinnerUserIds || []).join(', ')}`
            : `${res.grantedCount || 0} nafar gʻolibga GIFTED Premium berildi!`,
      });
      void loadAll();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Tanlov xatoligi.' });
    }
  };

  const subTabs: Array<{ id: AdminSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'qorilar', label: 'A. Qorilar & 114 Audio', icon: <Headphones className="w-4 h-4" /> },
    { id: 'education', label: 'B. Tajvid & Testlar', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'plans', label: 'C. Tariflar & Huquqlar', icon: <Crown className="w-4 h-4" /> },
    { id: 'payments', label: 'D. Karta & Toʻlovlar', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'users', label: 'E. Obunalar (Gift/Admin)', icon: <Users className="w-4 h-4" /> },
    { id: 'promos_draws', label: 'F. Promo & Random Tanlov', icon: <Gift className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C8A85E]" />
            <span>Ultimate Qurʼon, Audio Storage & Premium Boshqaruv Markazi</span>
          </h2>
          <p className="text-xs text-[#5F776F] dark:text-[#8FA69D]">
            Barcha oʻzgarishlar markaziy serverda saqlanadi va Web, Android APK, Telegram Bot hamda Mini Appda darhol sinxronlanadi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCreateBackup()}
            className="px-3.5 py-2 rounded-xl bg-[#064E3B]/15 dark:bg-white/10 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Zaxira (Backup)</span>
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-3.5 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Yuklangan Audio / Qorilar</div>
          <div className="text-lg font-mono-numbers font-extrabold mt-1">
            {quranData?.storageStats?.publishedAudioCount || 0} / {quranData?.storageStats?.activeQaris || 0}
          </div>
        </div>
        <div className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Kutilayotgan Toʻlovlar</div>
          <div className="text-lg font-mono-numbers font-extrabold text-amber-500 mt-1">
            {subData?.stats?.pendingOrdersCount || 0} ta
          </div>
        </div>
        <div className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Faol Premium Obunachilar</div>
          <div className="text-lg font-mono-numbers font-extrabold text-emerald-500 mt-1">
            {subData?.stats?.activePremiumCount || 0} nafar
          </div>
        </div>
        <div className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Oylik / Jami Tushum</div>
          <div className="text-sm font-mono-numbers font-extrabold text-[#C8A85E] mt-1">
            {fmtUzs(subData?.stats?.monthlyRevenueUzs || 0)}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'ok'
              ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700 dark:text-emerald-200'
              : 'bg-rose-500/12 border-rose-500/30 text-rose-700 dark:text-rose-200'
          }`}
        >
          {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === t.id
                ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D]'
                : 'az-liquid-glass border border-[#064E3B]/12 dark:border-white/10'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB A: QORILAR & PERSISTENT 114-SURAH AUDIO STORAGE */}
      {tab === 'qorilar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Add New Qari */}
          <form onSubmit={handleCreateQari} className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm">Yangi Qori Qoʻshish</h3>
            <input
              type="text"
              required
              value={newQariName}
              onChange={(e) => setNewQariName(e.target.value)}
              placeholder="Qori ismi (masalan: Jahongir qori Neʼmatov)"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
            <input
              type="text"
              value={newQariAr}
              onChange={(e) => setNewQariAr(e.target.value)}
              placeholder="Arabcha nomi (ixtiyoriy)"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newQariCountry}
                onChange={(e) => setNewQariCountry(e.target.value)}
                placeholder="Mamlakat"
                className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
              <input
                type="text"
                value={newQariStyle}
                onChange={(e) => setNewQariStyle(e.target.value)}
                placeholder="Qiroat uslubi"
                className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer"
            >
              Qorini Doimiy Bazaga Saqlash
            </button>

            <div className="pt-3 border-t border-[#064E3B]/10 dark:border-white/10 space-y-1.5 max-h-72 overflow-y-auto">
              {(quranData?.qaris || []).map((q: any) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQariId(q.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                    selectedQariId === q.id
                      ? 'bg-[#064E3B] text-white font-bold'
                      : 'hover:bg-[#064E3B]/10'
                  }`}
                >
                  <span className="truncate">{q.nameUz}</span>
                  <span className="font-mono-numbers text-[10px] opacity-80">{q.publishedSurahsCount}/114</span>
                </button>
              ))}
            </div>
          </form>

          {/* Upload 114 Surahs (Single or Bulk) */}
          <div className="lg:col-span-2 p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-sm">
                114 Sura Doimiy Audio Yuklash ({selectedQariId || 'Qori tanlang'})
              </h3>
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadAutoPublish}
                  onChange={(e) => setUploadAutoPublish(e.target.checked)}
                />
                <span>Yuklanganda darhol PUBLISHED qilish</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={uploadSurahNum}
                onChange={(e) => setUploadSurahNum(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameUz} ({s.nameAr})
                  </option>
                ))}
              </select>

              <label className="px-4 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingAudio ? 'Yuklanmoqda...' : 'MP3 / M4A / OGG Yuklash (1 yoki koʻp)'}</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.ogg,.wav"
                  multiple
                  disabled={uploadingAudio}
                  onChange={(e) => void handleAudioFileUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
              Ommaviy yuklashda fayl nomida sura raqami boʻlsa (masalan <code>001.mp3</code>, <code>036_yasin.mp3</code>), tizim uni avtomatik toʻgʻri suraga bogʻlaydi, magic-byte va SHA-256 tekshiruvidan oʻtkazadi.
            </div>

            {/* Uploaded Surahs Table */}
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {qariSurahs
                .filter((s) => s.uploadedRecord)
                .map((s) => (
                  <div
                    key={s.surahNumber}
                    className="p-2.5 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold">
                        {s.surahNumber}. {s.nameUz}
                      </span>
                      <span className="ml-2 text-[10px] font-mono-numbers opacity-70">
                        {Math.round((s.uploadedRecord.sizeBytes || 0) / 1024)} KB · {s.uploadedRecord.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`${s.audioUrl || `/api/quran-ecosystem/audio-stream/${s.audioId}`}?preview=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#064E3B]/15 text-[#064E3B] dark:text-emerald-300"
                        title="Tinglab tekshirish"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </a>
                      {s.uploadedRecord.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/quran-ecosystem/audio/${encodeURIComponent(s.audioId)}/status`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              credentials: 'include',
                              body: JSON.stringify({ status: 'PUBLISHED' }),
                            });
                            void loadQariSurahs(selectedQariId);
                            void loadAll();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {qariSurahs.filter((s) => s.uploadedRecord).length === 0 && (
                <div className="p-4 text-center text-xs opacity-70">
                  Ushbu qori uchun hali server diskiga alohida MP3 yuklanmagan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: TAJWEED LESSONS & QUIZZES */}
      {tab === 'education' && (
        <form onSubmit={handleSaveLesson} className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3 max-w-2xl">
          <h3 className="font-bold text-sm">Yangi Tajvid Darsi Qoʻshish</h3>
          <input
            type="text"
            required
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Dars nomi"
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={lessonLevel}
              onChange={(e) => setLessonLevel(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            >
              <option value="beginner">Boshlangʻich</option>
              <option value="intermediate">Oʻrta</option>
              <option value="advanced">Yuqori</option>
            </select>
            <label className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915]">
              <input type="checkbox" checked={lessonPremium} onChange={(e) => setLessonPremium(e.target.checked)} />
              <span>Faqat Premium dars</span>
            </label>
          </div>
          <input
            type="text"
            value={lessonSummary}
            onChange={(e) => setLessonSummary(e.target.value)}
            placeholder="Qisqa tavsif"
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
          />
          <textarea
            rows={4}
            value={lessonContent}
            onChange={(e) => setLessonContent(e.target.value)}
            placeholder="Toʻliq dars matni va qoidalar..."
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer">
            Darsni Eʼlon Qilish
          </button>
        </form>
      )}

      {/* TAB C: DYNAMIC PLANS & FEATURE GATING */}
      {tab === 'plans' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(subData?.plans || [])
              .filter((p: any) => p.id !== 'free')
              .map((plan: any) => (
                <div key={plan.id} className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
                  <div className="font-bold text-sm">{plan.nameUz}</div>
                  <div className="space-y-2 text-xs">
                    <label className="block">
                      <span className="opacity-70">Narxi (UZS)</span>
                      <input
                        type="number"
                        defaultValue={plan.priceUzs}
                        onBlur={(e) => void handleUpdatePlan({ ...plan, priceUzs: Number(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 font-mono-numbers"
                      />
                    </label>
                    <label className="block">
                      <span className="opacity-70">Muddati (kun)</span>
                      <input
                        type="number"
                        defaultValue={plan.durationDays}
                        onBlur={(e) => void handleUpdatePlan({ ...plan, durationDays: Number(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 font-mono-numbers"
                      />
                    </label>
                    <label className="block">
                      <span className="opacity-70">Badge yozuvi</span>
                      <input
                        type="text"
                        defaultValue={plan.badgeUz || ''}
                        onBlur={(e) => void handleUpdatePlan({ ...plan, badgeUz: e.target.value })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10"
                      />
                    </label>
                  </div>
                </div>
              ))}
          </div>

          <div className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm">Free vs Premium Funksiya Chegaralari</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(subData?.featureGates || []).map((g: any) => (
                <div key={g.key} className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold">{g.labelUz}</div>
                    <div className="text-[10px] opacity-70">{g.key}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleFeatureGate(g)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                      g.access === 'free'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                        : 'bg-[#C8A85E]/25 text-[#8A6B2D] dark:text-[#E6CE8A]'
                    }`}
                  >
                    {g.access.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB D: CARD SETTINGS & PAYMENT ORDERS */}
      {tab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleSaveCardSettings} className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm">Karta Rekvizitlari (Admin sozlaydi)</h3>
            <input
              type="text"
              value={cardForm.cardholderName}
              onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
              placeholder="Karta egasi F.I.Sh"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
            <input
              type="text"
              value={cardForm.cardNumber}
              onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
              placeholder="Karta raqami (8600 ... / 9860 ...)"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
            />
            <input
              type="text"
              value={cardForm.bankName}
              onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })}
              placeholder="Bank nomi (Uzcard / Humo)"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
            <textarea
              rows={3}
              value={cardForm.instructionsUz}
              onChange={(e) => setCardForm({ ...cardForm, instructionsUz: e.target.value })}
              placeholder="Foydalanuvchi uchun toʻlov yoʻriqnomasi"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={cardForm.isActive}
                onChange={(e) => setCardForm({ ...cardForm, isActive: e.target.checked })}
              />
              <span>Karta orqali toʻlovni faollashtirish</span>
            </label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer">
              Karta Sozlamalarini Saqlash
            </button>
          </form>

          <div className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm">Toʻlov Soʻrovlari ({(subData?.orders || []).length})</h3>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(subData?.orders || []).map((ord: any) => (
                <div key={ord.orderId} className="p-3.5 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold font-mono-numbers">{ord.orderId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        ord.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : ord.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-600'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-85">
                    User: <code>{ord.userId}</code> · {ord.planNameUz} · <strong>{fmtUzs(ord.finalAmountUzs)}</strong>
                  </div>
                  <div className="text-[11px] font-mono-numbers">Chek / Ref: <strong>{ord.receiptReference}</strong></div>
                  {ord.duplicateRefWarning && (
                    <div className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Diqqat: Bu chek raqami avval ham uchragan!</span>
                    </div>
                  )}
                  {ord.status === 'PENDING' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleOrderAction(ord.orderId, 'approve')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Tasdiqlash & Yoqish
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOrderAction(ord.orderId, 'reject')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-600 dark:text-rose-300 font-bold text-xs cursor-pointer"
                      >
                        Rad etish
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(subData?.orders || []).length === 0 && (
                <div className="text-center text-xs opacity-65 py-6">Hozircha toʻlov buyurtmalari yoʻq.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB E: USER SUBSCRIPTIONS & ADMIN GIFT */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8A85E]" />
              <span>Admin Qoʻlda Premium Berish / Hadya (ADMIN_GIFT) / Uzaytirish</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="User ID (web_... yoki tg:123456)"
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
              />
              <input
                type="number"
                min={1}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                placeholder="Kunlar soni (1, 7, 30, 90, 180)"
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
              />
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="Sabab / izoh"
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 7, 30, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setGrantDays(d)}
                  className="px-2.5 py-1 rounded-lg bg-[#064E3B]/10 dark:bg-white/10 text-[11px] font-mono-numbers font-bold cursor-pointer"
                >
                  +{d} kun
                </button>
              ))}
              <button
                type="button"
                onClick={() => void handleModifyUserSub('grant', true)}
                className="px-4 py-1.5 rounded-xl bg-[#C8A85E] text-[#050C09] font-bold text-xs cursor-pointer"
              >
                ADMIN_GIFT Berish
              </button>
              <button
                type="button"
                onClick={() => void handleModifyUserSub('extend', false)}
                className="px-4 py-1.5 rounded-xl bg-[#064E3B] text-white font-bold text-xs cursor-pointer"
              >
                Uzaytirish
              </button>
              <button
                type="button"
                onClick={() => void handleModifyUserSub('suspend', false)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs cursor-pointer"
              >
                Toʻxtatish
              </button>
              <button
                type="button"
                onClick={() => void handleModifyUserSub('cancel', false)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </div>

          <div className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-2.5">
            <h4 className="font-bold text-sm">Obunachilar Roʻyxati ({(subData?.subscriptions || []).length})</h4>
            {(subData?.subscriptions || []).map((s: any) => (
              <div key={s.userId} className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-mono-numbers font-bold">{s.userId}</span>
                  <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold text-[10px]">
                    {s.status}
                  </span>
                  <div className="text-[11px] opacity-75">
                    {s.planId} · Manba: {s.source} · Tugaydi: {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('uz-UZ') : '—'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetUserId(s.userId)}
                  className="px-3 py-1 rounded-lg bg-[#064E3B]/15 text-xs font-semibold cursor-pointer"
                >
                  Tanlash
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB F: PROMO CODES & FAIR SERVER-SIDE RANDOM DRAWS */}
      {tab === 'promos_draws' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Promo Codes */}
          <div className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm">Promokod Yaratish</h3>
            <form onSubmit={handleCreatePromo} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="KOD (masalan: RAMAZON2026)"
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers uppercase"
                />
                <input
                  type="text"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Nomi"
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
                >
                  <option value="percent_discount">Foiz chegirma (%)</option>
                  <option value="fixed_discount">Summa chegirma (UZS)</option>
                  <option value="free_premium_days">Bepul Premium kunlari</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={promoValue}
                  onChange={(e) => setPromoValue(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer">
                Promokodni Saqlash
              </button>
            </form>

            <div className="space-y-1.5 pt-2">
              {(subData?.promoCodes || []).map((p: any) => (
                <div key={p.code} className="p-2.5 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] flex items-center justify-between text-xs">
                  <div>
                    <strong className="font-mono-numbers">{p.code}</strong> · {p.type} ({p.value})
                  </div>
                  <span className="font-mono-numbers text-[11px] opacity-75">
                    {p.usedCount}/{p.maxUses}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fair Server-Side Random Draws */}
          <div className="p-5 rounded-3xl az-liquid-glass border border-[#C8A85E]/25 space-y-3">
            <h3 className="font-bold text-sm">Adolatli Bepul Random Tanlov (Server CSPRNG)</h3>
            <form onSubmit={handleCreateDraw} className="space-y-2.5">
              <input
                type="text"
                required
                value={drawTitle}
                onChange={(e) => setDrawTitle(e.target.value)}
                placeholder="Tanlov nomi (masalan: Juma Premium Hadya)"
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={drawDays}
                  onChange={(e) => setDrawDays(Number(e.target.value))}
                  placeholder="Premium kunlari"
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
                />
                <input
                  type="number"
                  min={1}
                  value={drawWinners}
                  onChange={(e) => setDrawWinners(Number(e.target.value))}
                  placeholder="Gʻoliblar soni"
                  className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#C8A85E] text-[#050C09] font-bold text-xs cursor-pointer">
                Yangi Bepul Tanlov Ochish
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {(subData?.randomDraws || []).map((d: any) => (
                <div key={d.id} className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{d.titleUz}</span>
                    <span className="px-2 py-0.5 rounded bg-[#064E3B]/15 text-[10px] font-bold">{d.status}</span>
                  </div>
                  <div className="text-[11px] opacity-80">
                    Ishtirokchilar: <strong>{d.entries?.length || 0}</strong> · Mukofot: +{d.prizeDays} kun · {d.winnersCount} gʻolib
                  </div>
                  {d.selectedWinnerUserIds?.length > 0 && (
                    <div className="text-[11px] font-mono-numbers text-emerald-600 dark:text-emerald-300">
                      Tanlangan gʻoliblar: {d.selectedWinnerUserIds.join(', ')}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {d.status === 'OPEN' && (
                      <button
                        type="button"
                        onClick={() => void handleDrawStep(d.id, 'run')}
                        className="px-3 py-1.5 rounded-lg bg-[#064E3B] text-white text-xs font-bold cursor-pointer"
                      >
                        1. CSPRNG Gʻolib Tanlash
                      </button>
                    )}
                    {d.status === 'DRAWN' && (
                      <button
                        type="button"
                        onClick={() => void handleDrawStep(d.id, 'approve')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        2. Tasdiqlash & GIFTED Premium Berish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
