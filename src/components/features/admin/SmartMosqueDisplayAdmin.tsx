import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Tv,
  Plus,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  Edit3,
  Trash2,
  Power,
  ShieldAlert,
  Ban,
  Clock,
  Calendar,
  Megaphone,
  Activity,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  X,
  Save,
  Wifi,
  WifiOff,
  Languages,
  Monitor,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { PrayerSchedule, PrayerTimeEntry, SupportedLocale } from '../../../types';
import {
  DEFAULT_SMART_DISPLAY_SETTINGS,
  DisplayAnnouncementItem,
  DisplayMonitorStatus,
  DisplayTemplateId,
  SmartDisplayMonitor,
  SmartDisplaySettings,
  SmartMosqueScheduleProfile,
  buildDisplayScheduleFromMainSchedule,
  isMonitorOnline,
  normalizeDisplayTemplate,
  validateDisplaySchedule,
} from '../../../utils/smartMosqueDisplayEngine';
import {
  AdminDisplayOverview,
  createAdminDisplayMonitor,
  deleteAdminDisplayAnnouncement,
  deleteAdminDisplayMonitor,
  deleteAdminDisplaySchedule,
  fetchAdminDisplayOverview,
  saveAdminDisplayAnnouncement,
  saveAdminDisplaySchedule,
  updateAdminDisplayMonitor,
} from '../../../utils/smartMosqueDisplayService';
import { DISPLAY_LANGUAGE_LABELS } from '../../../utils/smartMosqueDisplayI18n';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface SmartMosqueDisplayAdminProps {
  currentMainSchedule: PrayerSchedule;
  onStatusMessage?: (msg: string) => void;
  onMainScheduleUpdated?: (updated: PrayerSchedule) => void;
}

type DisplayAdminSubTab = 'monitors' | 'schedules' | 'announcements' | 'connections';

const TEMPLATE_OPTIONS: { id: DisplayTemplateId; label: string; desc: string }[] = [
  {
    id: 'royal_ivory',
    label: 'Royal Ivory (16:9)',
    desc: 'Yorugʻ va nafis ivory fon, oltin chiziq va qirollik yashil hisoblagich tasmasi',
  },
  {
    id: 'emerald_royal',
    label: 'Emerald Royal (16:9)',
    desc: 'Toʻq zumrad premium 2 ustunli kompozitsiya — yirik soat va yuqori kontrast',
  },
  {
    id: 'modern_minimal',
    label: 'Modern Minimal (16:9)',
    desc: 'Ortiqcha bezaksiz, 5 ustunli zamonaviy arxitekturaviy namoz jadvali',
  },
  {
    id: 'madina_portrait',
    label: 'Madina Portrait (9:16)',
    desc: 'Vertikal 1080×1920 monitorlar uchun Masjidi Nabaviy uslubidagi maxsus kompozitsiya',
  },
];

const LANGUAGE_LIST: SupportedLocale[] = ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en'];

function formatShortDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export const SmartMosqueDisplayAdmin: React.FC<SmartMosqueDisplayAdminProps> = ({
  currentMainSchedule,
  onStatusMessage,
  onMainScheduleUpdated,
}) => {
  const [subTab, setSubTab] = useState<DisplayAdminSubTab>('monitors');
  const [overview, setOverview] = useState<AdminDisplayOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Monitor modal state
  const [showAddMonitor, setShowAddMonitor] = useState(false);
  const [newMonName, setNewMonName] = useState('');
  const [newMonMosque, setNewMonMosque] = useState('«MuhammadSolih Hoji» Jomeʼ Masjidi');
  const [newMonLocation, setNewMonLocation] = useState('Asosiy namozxona · Asaka');
  const [newMonScheduleId, setNewMonScheduleId] = useState('asaka-main');
  const [newMonLanguage, setNewMonLanguage] = useState<SupportedLocale>('uz-Latn');
  const [newMonTemplate, setNewMonTemplate] = useState<DisplayTemplateId>('royal_ivory');

  // QR Pairing Modal state
  const [qrMonitor, setQrMonitor] = useState<SmartDisplayMonitor | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Edit Monitor Modal state
  const [editingMonitor, setEditingMonitor] = useState<SmartDisplayMonitor | null>(null);

  // Schedule Editor state
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('asaka-main');
  const [scheduleDraft, setScheduleDraft] = useState<SmartMosqueScheduleProfile>(() =>
    buildDisplayScheduleFromMainSchedule(currentMainSchedule)
  );
  const [syncToMainSchedule, setSyncToMainSchedule] = useState<boolean>(true);
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleLocation, setNewScheduleLocation] = useState('Asaka tumani, Andijon viloyati');

  // Announcement Editor state
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [annMediaUrl, setAnnMediaUrl] = useState('');
  const [annDurationSec, setAnnDurationSec] = useState(10);
  const [annIsActive, setAnnIsActive] = useState(true);
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [annTargetMonitorIds, setAnnTargetMonitorIds] = useState<string[]>([]);
  const [annTitleCyrl, setAnnTitleCyrl] = useState('');
  const [annBodyCyrl, setAnnBodyCyrl] = useState('');
  const [annTitleRu, setAnnTitleRu] = useState('');
  const [annBodyRu, setAnnBodyRu] = useState('');
  const [annTitleEn, setAnnTitleEn] = useState('');
  const [annBodyEn, setAnnBodyEn] = useState('');
  const [showAnnTranslations, setShowAnnTranslations] = useState(false);

  const notify = useCallback(
    (msg: string) => {
      onStatusMessage?.(msg);
    },
    [onStatusMessage]
  );

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    const res = await fetchAdminDisplayOverview();
    if (res.success && res.data) {
      setOverview(res.data);
      const found =
        res.data.schedules.find((s) => s.id === selectedScheduleId) || res.data.schedules[0];
      if (found) {
        setSelectedScheduleId(found.id);
        setScheduleDraft(found);
      }
    } else {
      setErrorMsg(res.error || 'Smart Mosque Display maʼlumotlarini yuklab boʻlmadi.');
    }
    if (!silent) setLoading(false);
  }, [selectedScheduleId]);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(() => {
      loadOverview(true);
    }, 30_000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  // Generate QR code whenever qrMonitor changes
  useEffect(() => {
    if (!qrMonitor) {
      setQrDataUrl('');
      return;
    }
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://asakaziyo.uz';
    const pairUrl = `${origin}/display?code=${encodeURIComponent(qrMonitor.pairingCode)}`;
    QRCode.toDataURL(pairUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#03170F',
        light: '#FFFDF7',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [qrMonitor]);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // MONITOR ACTIONS
  // =========================================================================
  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonName.trim()) {
      setErrorMsg('Monitor nomini kiriting (masalan: Asosiy Zal TV #1).');
      return;
    }
    setBusyAction('create_monitor');
    setErrorMsg(null);
    const res = await createAdminDisplayMonitor({
      name: newMonName.trim(),
      mosqueName: newMonMosque.trim() || '«MuhammadSolih Hoji» Jomeʼ Masjidi',
      locationLabel: newMonLocation.trim() || 'Asosiy zal',
      scheduleId: newMonScheduleId || 'asaka-main',
      language: newMonLanguage,
      template: newMonTemplate,
      settings: { ...DEFAULT_SMART_DISPLAY_SETTINGS },
    });
    setBusyAction(null);
    if (res.success && res.monitor) {
      setShowAddMonitor(false);
      setNewMonName('');
      setQrMonitor(res.monitor);
      notify(`Yangi monitor yaratildi: ${res.monitor.name} (Kod: ${res.monitor.pairingCode})`);
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Monitor yaratishda xatolik.');
    }
  };

  const handleUpdateMonitorStatus = async (monitor: SmartDisplayMonitor, status: DisplayMonitorStatus) => {
    setBusyAction(`status_${monitor.id}`);
    const res = await updateAdminDisplayMonitor(monitor.id, { status });
    setBusyAction(null);
    if (res.success) {
      const label = status === 'active' ? 'faollashtirildi' : status === 'disabled' ? 'toʻxtatildi' : 'bloklandi';
      notify(`«${monitor.name}» monitori ${label}.`);
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Monitor holatini oʻzgartirib boʻlmadi.');
    }
  };

  const handleRegeneratePairingCode = async (monitor: SmartDisplayMonitor) => {
    setBusyAction(`regen_${monitor.id}`);
    const res = await updateAdminDisplayMonitor(monitor.id, { regeneratePairingCode: true });
    setBusyAction(null);
    if (res.success && res.monitor) {
      setQrMonitor(res.monitor);
      notify(`«${monitor.name}» uchun yangi 6 xonali kod yaratildi: ${res.monitor.pairingCode}`);
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Yangi kod yaratishda xatolik.');
    }
  };

  const handleSaveEditedMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonitor) return;
    setBusyAction(`edit_${editingMonitor.id}`);
    const res = await updateAdminDisplayMonitor(editingMonitor.id, {
      name: editingMonitor.name,
      mosqueName: editingMonitor.mosqueName,
      locationLabel: editingMonitor.locationLabel,
      scheduleId: editingMonitor.scheduleId,
      language: editingMonitor.language,
      template: editingMonitor.template,
      status: editingMonitor.status,
      settings: editingMonitor.settings,
    });
    setBusyAction(null);
    if (res.success) {
      notify(`«${editingMonitor.name}» monitor sozlamalari saqlandi va TV ekraniga yuborildi.`);
      setEditingMonitor(null);
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Monitor sozlamalarini saqlab boʻlmadi.');
    }
  };

  const handleDeleteMonitor = async (monitor: SmartDisplayMonitor) => {
    setBusyAction(`del_${monitor.id}`);
    const res = await deleteAdminDisplayMonitor(monitor.id);
    setBusyAction(null);
    if (res.success) {
      notify(`«${monitor.name}» monitori oʻchirildi.`);
      if (qrMonitor?.id === monitor.id) setQrMonitor(null);
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Monitorni oʻchirib boʻlmadi.');
    }
  };

  // =========================================================================
  // SCHEDULE ACTIONS
  // =========================================================================
  const handleSelectSchedule = (sched: SmartMosqueScheduleProfile) => {
    setSelectedScheduleId(sched.id);
    setScheduleDraft(sched);
    setSyncToMainSchedule(sched.id === 'asaka-main');
  };

  const handleCreateNewSchedule = () => {
    if (!newScheduleName.trim()) {
      setErrorMsg('Yangi masjid/jadval nomini kiriting.');
      return;
    }
    const slug = `mosque-${Date.now().toString(36)}`;
    const fresh = buildDisplayScheduleFromMainSchedule(currentMainSchedule, {
      id: slug,
      mosqueName: newScheduleName.trim(),
      location: newScheduleLocation.trim() || 'Asaka tumani, Andijon viloyati',
      sourceScheduleId: slug,
      version: 1,
    });
    setSelectedScheduleId(slug);
    setScheduleDraft(fresh);
    setSyncToMainSchedule(false);
    setShowNewScheduleForm(false);
    setNewScheduleName('');
    notify('Yangi jadval qoralamasi tayyorlandi. Vaqtlarni tekshirib «Jadvalni Saqlash» tugmasini bosing.');
  };

  const handleUpdateScheduleTimeField = (
    key: PrayerTimeEntry['key'],
    field: 'time' | 'iqamahTime',
    value: string
  ) => {
    setScheduleDraft((prev) => ({
      ...prev,
      times: prev.times.map((entry) =>
        entry.key === key ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const handleSaveSchedule = async () => {
    setBusyAction('save_schedule');
    setErrorMsg(null);
    const payload = {
      ...scheduleDraft,
      syncToMainSchedule: scheduleDraft.id === 'asaka-main' && syncToMainSchedule,
    } as SmartMosqueScheduleProfile & { syncToMainSchedule?: boolean };

    const res = await saveAdminDisplaySchedule(payload);
    setBusyAction(null);
    if (res.success && res.schedule) {
      setScheduleDraft(res.schedule);
      notify(`«${res.schedule.mosqueName}» namoz jadvali saqlandi (v${res.schedule.version}). Barcha ulangan TV ekranlar yangilanmoqda.`);
      if (scheduleDraft.id === 'asaka-main' && syncToMainSchedule && onMainScheduleUpdated) {
        onMainScheduleUpdated({
          ...currentMainSchedule,
          date: res.schedule.effectiveDate,
          hijriDate: res.schedule.hijriDate || currentMainSchedule.hijriDate,
          location: res.schedule.location,
          times: res.schedule.times,
          isAdministratorPublished: res.schedule.isAdministratorPublished,
          verifiedAt: res.schedule.updatedAt,
          version: res.schedule.version,
        });
      }
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Namoz jadvalini saqlashda xatolik.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (id === 'asaka-main') return;
    setBusyAction(`del_sched_${id}`);
    const res = await deleteAdminDisplaySchedule(id);
    setBusyAction(null);
    if (res.success) {
      notify('Qoʻshimcha jadval oʻchirildi.');
      setSelectedScheduleId('asaka-main');
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Jadvalni oʻchirib boʻlmadi.');
    }
  };

  // =========================================================================
  // ANNOUNCEMENT ACTIONS
  // =========================================================================
  const resetAnnouncementForm = () => {
    setEditingAnnouncementId(null);
    setAnnTitle('');
    setAnnBody('');
    setAnnPriority('normal');
    setAnnMediaUrl('');
    setAnnDurationSec(10);
    setAnnIsActive(true);
    setAnnExpiresAt('');
    setAnnTargetMonitorIds([]);
    setAnnTitleCyrl('');
    setAnnBodyCyrl('');
    setAnnTitleRu('');
    setAnnBodyRu('');
    setAnnTitleEn('');
    setAnnBodyEn('');
    setShowAnnTranslations(false);
  };

  const handleEditAnnouncement = (ann: DisplayAnnouncementItem) => {
    setEditingAnnouncementId(ann.id);
    setAnnTitle(ann.title);
    setAnnBody(ann.body);
    setAnnPriority(ann.priority);
    setAnnMediaUrl(ann.mediaUrl || '');
    setAnnDurationSec(ann.displayDurationSec || 10);
    setAnnIsActive(ann.isActive !== false);
    setAnnExpiresAt(ann.expiresAt ? ann.expiresAt.slice(0, 10) : '');
    setAnnTargetMonitorIds(ann.monitorIds || []);
    setAnnTitleCyrl(ann.translations?.['uz-Cyrl']?.title || '');
    setAnnBodyCyrl(ann.translations?.['uz-Cyrl']?.body || '');
    setAnnTitleRu(ann.translations?.ru?.title || '');
    setAnnBodyRu(ann.translations?.ru?.body || '');
    setAnnTitleEn(ann.translations?.en?.title || '');
    setAnnBodyEn(ann.translations?.en?.body || '');
    setShowAnnTranslations(Boolean(ann.translations && Object.keys(ann.translations).length > 0));
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) {
      setErrorMsg('Eʼlon sarlavhasi va matnini kiriting.');
      return;
    }
    setBusyAction('save_announcement');
    setErrorMsg(null);
    const translations: DisplayAnnouncementItem['translations'] = {};
    if (annTitleCyrl.trim() || annBodyCyrl.trim()) {
      translations['uz-Cyrl'] = { title: annTitleCyrl.trim() || annTitle.trim(), body: annBodyCyrl.trim() || annBody.trim() };
    }
    if (annTitleRu.trim() || annBodyRu.trim()) {
      translations.ru = { title: annTitleRu.trim() || annTitle.trim(), body: annBodyRu.trim() || annBody.trim() };
    }
    if (annTitleEn.trim() || annBodyEn.trim()) {
      translations.en = { title: annTitleEn.trim() || annTitle.trim(), body: annBodyEn.trim() || annBody.trim() };
    }

    const res = await saveAdminDisplayAnnouncement({
      id: editingAnnouncementId || undefined,
      title: annTitle.trim(),
      body: annBody.trim(),
      priority: annPriority,
      mediaUrl: annMediaUrl.trim() || undefined,
      displayDurationSec: Math.max(4, Math.min(60, Number(annDurationSec) || 10)),
      isActive: annIsActive,
      expiresAt: annExpiresAt ? `${annExpiresAt}T23:59:59+05:00` : undefined,
      monitorIds: annTargetMonitorIds.length > 0 ? annTargetMonitorIds : undefined,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
    });
    setBusyAction(null);
    if (res.success) {
      notify(editingAnnouncementId ? 'TV eʼloni yangilandi.' : 'Yangi TV eʼloni qoʻshildi va barcha ekranlarga yuborildi.');
      resetAnnouncementForm();
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Eʼlonni saqlab boʻlmadi.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setBusyAction(`del_ann_${id}`);
    const res = await deleteAdminDisplayAnnouncement(id);
    setBusyAction(null);
    if (res.success) {
      notify('TV eʼloni oʻchirildi.');
      if (editingAnnouncementId === id) resetAnnouncementForm();
      await loadOverview(true);
    } else {
      setErrorMsg(res.error || 'Eʼlonni oʻchirib boʻlmadi.');
    }
  };

  // Computed metrics
  const monitors = overview?.monitors || [];
  const schedules = overview?.schedules || [];
  const announcements = overview?.announcements || [];
  const connections = overview?.connections || [];

  const onlineCount = monitors.filter(
    (m) => m.onlineStatus === 'online' || isMonitorOnline(m.lastHeartbeatAt)
  ).length;
  const offlineCount = Math.max(0, monitors.length - onlineCount);
  const draftValidation = validateDisplaySchedule(scheduleDraft);
  const scheduleAlertCount = Object.values(overview?.scheduleValidations || {}).filter(
    (v) => v.severity !== 'ok'
  ).length;

  const pairBaseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/display`
      : '/display';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card elevated className="p-5 sm:p-6 border-[#DFBD69]/40 bg-gradient-to-br from-[#041D13] via-[#062C1E] to-[#02100A] text-[#FFF8E8]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#DFBD69]/15 border border-[#DFBD69]/50 flex items-center justify-center shrink-0">
              <Tv className="w-6 h-6 text-[#DFBD69]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#FFF8E8]">
                  ASAKA ZIYO — Smart Mosque Display Boshqaruvi
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  24/7 TV & LED Ekranlar
                </span>
              </div>
              <p className="text-xs text-[#DFBD69]/85 mt-1 max-w-2xl">
                Masjid va madrasalardagi barcha televizor monitorlarini QR/6-xonali kod bilan ulang,
                administrator tasdiqlagan aniq namoz jadvallari, 5 til, 4 dizayn profili va eʼlonlarni markazlashgan holda boshqaring.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/display"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-[#DFBD69]/40 text-xs font-bold text-[#FFF8E8] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#DFBD69]" />
              <span>/display Ekranini Ochish</span>
            </a>
            <button
              type="button"
              onClick={() => loadOverview()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-[#FFF8E8] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab('monitors');
                setShowAddMonitor(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DFBD69] hover:bg-[#e8ca7e] text-[#03170F] text-xs font-extrabold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Monitor Qoʻshish</span>
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl bg-black/25 border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">
              Jami Monitorlar
            </div>
            <div className="text-2xl font-extrabold font-mono-numbers text-[#FFF8E8] mt-1">
              {monitors.length}
            </div>
            <div className="text-[11px] text-[#DFBD69]/80 mt-0.5">
              {schedules.length} ta namoz jadvali mavjud
            </div>
          </div>
          <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/30 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> Onlayn Ekranlar
            </div>
            <div className="text-2xl font-extrabold font-mono-numbers text-emerald-300 mt-1">
              {onlineCount}
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">
              Jonli heartbeat aloqada
            </div>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" /> Oflayn / Toʻxtatilgan
            </div>
            <div className="text-2xl font-extrabold font-mono-numbers text-amber-300 mt-1">
              {offlineCount}
            </div>
            <div className="text-[11px] text-white/60 mt-0.5">
              Faol eʼlonlar: {announcements.filter((a) => a.isActive).length} ta
            </div>
          </div>
          <div
            className={`rounded-xl border p-3.5 ${
              scheduleAlertCount > 0
                ? 'bg-amber-950/50 border-amber-400/50'
                : 'bg-emerald-950/35 border-[#DFBD69]/30'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-[#DFBD69] font-semibold flex items-center gap-1.5">
              {scheduleAlertCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              Jadval Nazorati
            </div>
            <div className="text-2xl font-extrabold font-mono-numbers text-[#FFF8E8] mt-1">
              {scheduleAlertCount === 0 ? 'Aniq' : `${scheduleAlertCount} ogoh`}
            </div>
            <div className="text-[11px] text-white/70 mt-0.5">
              {overview?.firestoreConnected ? 'Firestore: Ulangan' : 'Mahalliy zaxira rejimi'}
            </div>
          </div>
        </div>
      </Card>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'monitors', label: `Monitorlar (${monitors.length})`, icon: Monitor },
          { id: 'schedules', label: `Namoz Jadvallari (${schedules.length})`, icon: Clock },
          { id: 'announcements', label: `TV Eʼlonlar va Media (${announcements.length})`, icon: Megaphone },
          { id: 'connections', label: `Ulanishlar Tarixi (${connections.length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as DisplayAdminSubTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                active
                  ? 'bg-[#063D32] text-[#FFF8E8] border-[#DFBD69]/60 shadow-sm'
                  : 'bg-canvas/70 text-secondary border-divider hover:border-[#DFBD69]/40'
              }`}
            >
              <Icon className="w-4 h-4 text-[#DFBD69]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: MONITOR FLEET & PAIRING                                  */}
      {/* =================================================================== */}
      {subTab === 'monitors' && (
        <div className="space-y-5">
          {showAddMonitor && (
            <Card elevated className="p-5 border-[#DFBD69]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#DFBD69]" />
                  Yangi Smart TV / LED Monitor Roʻyxatdan Oʻtkazish
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMonitor(false)}
                  className="text-secondary hover:text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateMonitor} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Monitor Nomi (noyob nom) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMonName}
                    onChange={(e) => setNewMonName(e.target.value)}
                    placeholder="Masalan: Asosiy Zal TV #1"
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Masjid / Madrasa Nomi
                  </label>
                  <input
                    type="text"
                    value={newMonMosque}
                    onChange={(e) => setNewMonMosque(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Joylashuv / Zal Belgisi
                  </label>
                  <input
                    type="text"
                    value={newMonLocation}
                    onChange={(e) => setNewMonLocation(e.target.value)}
                    placeholder="Masalan: Kirish foyesi / 2-qavat"
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Biriktirilgan Namoz Jadvali
                  </label>
                  <select
                    value={newMonScheduleId}
                    onChange={(e) => setNewMonScheduleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.mosqueName} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Ekran Tili (5 til)
                  </label>
                  <select
                    value={newMonLanguage}
                    onChange={(e) => setNewMonLanguage(e.target.value as SupportedLocale)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {LANGUAGE_LIST.map((lang) => (
                      <option key={lang} value={lang}>
                        {DISPLAY_LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Dizayn Profili (4 ta)
                  </label>
                  <select
                    value={newMonTemplate}
                    onChange={(e) => setNewMonTemplate(e.target.value as DisplayTemplateId)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {TEMPLATE_OPTIONS.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.label} — {tpl.desc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddMonitor(false)}
                  >
                    Bekor qilish
                  </Button>
                  <Button type="submit" size="sm" disabled={busyAction === 'create_monitor'}>
                    {busyAction === 'create_monitor' ? 'Yaratilmoqda...' : 'Yaratish va QR/Kod Olish'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {loading && monitors.length === 0 ? (
            <Card className="p-8 text-center text-xs text-secondary">
              Monitorlar roʻyxati yuklanmoqda...
            </Card>
          ) : monitors.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Tv className="w-10 h-10 text-[#DFBD69] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-primary">Hali monitor roʻyxatdan oʻtkazilmagan</h3>
              <p className="text-xs text-secondary max-w-md mx-auto">
                Masjiddagi har bir televizor yoki LED ekran uchun alohida monitor yarating va 6 xonali kod yoki QR-kod orqali ulang.
              </p>
              <Button size="sm" onClick={() => setShowAddMonitor(true)}>
                <Plus className="w-4 h-4 mr-1" /> Birinchi Monitorni Qoʻshish
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {monitors.map((mon) => {
                const online = mon.onlineStatus === 'online' || isMonitorOnline(mon.lastHeartbeatAt);
                const boundSchedule = schedules.find((s) => s.id === mon.scheduleId);
                const schedValidation = overview?.scheduleValidations?.[mon.scheduleId];
                return (
                  <Card
                    key={mon.id}
                    elevated
                    className={`p-5 border transition-all ${
                      mon.status === 'blocked'
                        ? 'border-rose-500/45 bg-rose-500/[0.03]'
                        : mon.status === 'disabled'
                          ? 'border-amber-500/40 bg-amber-500/[0.03]'
                          : 'border-divider hover:border-[#DFBD69]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-stone-400'
                            }`}
                          />
                          <h4 className="text-sm font-extrabold text-primary truncate">{mon.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              online
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-stone-500/15 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {online ? 'Onlayn' : 'Oflayn'}
                          </span>
                          {mon.status !== 'active' && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                mon.status === 'blocked'
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {mon.status === 'blocked' ? 'Bloklangan' : 'Toʻxtatilgan'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-secondary mt-1 truncate">
                          {mon.mosqueName} · {mon.locationLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQrMonitor(mon)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#063D32] text-[#FFF8E8] border border-[#DFBD69]/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:brightness-110"
                          title="QR-kod va 6 xonali ulash kodi"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#DFBD69]" />
                          <span className="font-mono-numbers tracking-wider">{mon.pairingCode}</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 text-[11px]">
                      <div className="p-2 rounded-lg bg-canvas/70 border border-divider/60">
                        <span className="text-muted block">Jadval</span>
                        <span className="font-bold text-primary truncate block">
                          {boundSchedule?.mosqueName || mon.scheduleId}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-canvas/70 border border-divider/60">
                        <span className="text-muted block">Til & Shablon</span>
                        <span className="font-bold text-primary truncate block">
                          {DISPLAY_LANGUAGE_LABELS[mon.language] || mon.language} ·{' '}
                          {TEMPLATE_OPTIONS.find((t) => t.id === normalizeDisplayTemplate(mon.template))?.label || mon.template}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-canvas/70 border border-divider/60 col-span-2 sm:col-span-1">
                        <span className="text-muted block">Oxirgi sinxronlash</span>
                        <span className="font-mono-numbers font-bold text-primary block">
                          {formatShortDateTime(mon.lastHeartbeatAt || mon.lastSyncAt)}
                        </span>
                      </div>
                    </div>

                    {mon.deviceInfo?.resolution && (
                      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px] text-secondary">
                        <span className="px-2 py-0.5 rounded bg-canvas border border-divider/60 font-mono-numbers">
                          Ekran: {mon.deviceInfo.resolution}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-canvas border border-divider/60">
                          Fullscreen: {mon.deviceInfo.fullscreen ? 'Ha' : 'Yoʻq'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-canvas border border-divider/60">
                          WakeLock: {mon.deviceInfo.wakeLockActive ? 'Faol' : 'Kutilmoqda'}
                        </span>
                      </div>
                    )}

                    {schedValidation && schedValidation.severity !== 'ok' && (
                      <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/35 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{schedValidation.warnings[0]}</span>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-divider/60">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingMonitor({
                              ...mon,
                              template: normalizeDisplayTemplate(mon.template),
                              settings: { ...DEFAULT_SMART_DISPLAY_SETTINGS, ...mon.settings },
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-canvas/90 border border-divider text-[11px] font-bold text-primary flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#DFBD69]" />
                          Sozlamalar
                        </button>
                        {mon.status === 'active' ? (
                          <button
                            type="button"
                            disabled={busyAction === `status_${mon.id}`}
                            onClick={() => handleUpdateMonitorStatus(mon, 'disabled')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                            Toʻxtatish
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction === `status_${mon.id}`}
                            onClick={() => handleUpdateMonitorStatus(mon, 'active')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                            Faollashtirish
                          </button>
                        )}
                        {mon.status !== 'blocked' && (
                          <button
                            type="button"
                            disabled={busyAction === `status_${mon.id}`}
                            onClick={() => handleUpdateMonitorStatus(mon, 'blocked')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/35 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Bloklash
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={busyAction === `del_${mon.id}`}
                        onClick={() => handleDeleteMonitor(mon)}
                        className="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Oʻchirish
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: PRAYER SCHEDULES & ACCURACY CONTROL                      */}
      {/* =================================================================== */}
      {subTab === 'schedules' && (
        <div className="space-y-5">
          {/* Policy & Accuracy Guarantee Banner */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-primary flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-extrabold">
                Qatʼiy Aniqlik Kafolati (Avtomatik hisoblash oʻchirilgan)
              </strong>
              <p className="text-secondary mt-0.5">
                Barcha TV ekranlari faqat shu yerda kiritilgan va tasdiqlangan namoz vaqtlari (Azon va Iqomat), Quyosh, Ishroq va Juma vaqtlarini <strong>Asia/Tashkent</strong> vaqt zonasi boʻyicha koʻrsatadi.
              </p>
            </div>
          </div>

          {/* Schedule Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {schedules.map((s) => {
                const v = overview?.scheduleValidations?.[s.id];
                const selected = s.id === scheduleDraft.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSchedule(s)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                      selected
                        ? 'bg-[#c5a869] text-[#071614] border-[#c5a869] shadow-sm'
                        : 'bg-canvas border-divider text-primary hover:border-[#DFBD69]/50'
                    }`}
                  >
                    <span>{s.mosqueName}</span>
                    {v && v.severity !== 'ok' && (
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${
                          v.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setScheduleDraft((prev) =>
                    buildDisplayScheduleFromMainSchedule(currentMainSchedule, {
                      id: prev.id,
                      mosqueName: prev.mosqueName,
                      location: prev.location,
                      ishraqTime: prev.ishraqTime,
                      jumaTime: prev.jumaTime,
                      jumaIqamahTime: prev.jumaIqamahTime,
                      validUntil: prev.validUntil,
                    })
                  )
                }
                className="px-3 py-2 rounded-xl bg-canvas border border-divider text-xs font-bold text-primary hover:border-[#DFBD69]/50 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#DFBD69]" />
                Asosiy Jadvaldan Yuklash
              </button>
              <button
                type="button"
                onClick={() => setShowNewScheduleForm((v) => !v)}
                className="px-3 py-2 rounded-xl bg-[#063D32] text-[#FFF8E8] border border-[#DFBD69]/50 text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#DFBD69]" />
                Yangi Masjid Jadvali
              </button>
            </div>
          </div>

          {showNewScheduleForm && (
            <Card className="p-4 border-[#DFBD69]/40 flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Yangi Masjid / Filial Nomi
                </label>
                <input
                  type="text"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  placeholder="Masalan: Asaka Markaziy Madrasa"
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-secondary mb-1">Manzil</label>
                <input
                  type="text"
                  value={newScheduleLocation}
                  onChange={(e) => setNewScheduleLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>
              <Button size="sm" onClick={handleCreateNewSchedule}>
                Yaratish
              </Button>
            </Card>
          )}

          {/* Live Validation Status */}
          {draftValidation.warnings.length > 0 && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1 ${
                draftValidation.severity === 'error'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-200'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Jadval Tekshiruvi Ogohlantirishlari ({draftValidation.warnings.length})
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {draftValidation.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule Editor Card */}
          <Card elevated className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Masjid / Muassasa Nomi
                </label>
                <input
                  type="text"
                  value={scheduleDraft.mosqueName}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, mosqueName: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Joylashuv (Shahar / Viloyat)
                </label>
                <input
                  type="text"
                  value={scheduleDraft.location}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, location: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Hijriy Sana (TV da koʻrinadi)
                </label>
                <input
                  type="text"
                  value={scheduleDraft.hijriDate}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, hijriDate: e.target.value }))
                  }
                  placeholder="Masalan: 26 Ramazon 1447"
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Amal Qilish Boshlanishi (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={scheduleDraft.effectiveDate}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, effectiveDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Amal Qilish Muddati Tugashi (validUntil)
                </label>
                <input
                  type="date"
                  value={scheduleDraft.validUntil}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, validUntil: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Vaqt Zonasi
                </label>
                <div className="px-3 py-2 rounded-xl border border-divider bg-canvas/50 text-xs font-mono-numbers text-secondary">
                  Asia/Tashkent (UTC+5 · Qatʼiy)
                </div>
              </div>
            </div>

            {/* Special Admin-Managed Times: Ishraq & Juma */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#063D32]/8 dark:bg-[#092E1F]/50 border border-[#DFBD69]/35">
              <div>
                <label className="block text-[11px] font-extrabold text-primary mb-1">
                  Ishroq Vaqti (HH:MM)
                </label>
                <input
                  type="time"
                  value={scheduleDraft.ishraqTime}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, ishraqTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-sm font-mono-numbers font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-primary mb-1">
                  Juma Namozi Azoni (HH:MM)
                </label>
                <input
                  type="time"
                  value={scheduleDraft.jumaTime}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, jumaTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-sm font-mono-numbers font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-primary mb-1">
                  Juma Namozi Iqomati (HH:MM)
                </label>
                <input
                  type="time"
                  value={scheduleDraft.jumaIqamahTime}
                  onChange={(e) =>
                    setScheduleDraft((p) => ({ ...p, jumaIqamahTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-sm font-mono-numbers font-bold"
                />
              </div>
            </div>

            {/* 8 Prayer Rows (Tahajjud, Subh, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-divider text-secondary uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Namoz</th>
                    <th className="py-2.5 px-3">Arabcha</th>
                    <th className="py-2.5 px-3">Azon / Kirish Vaqti (HH:MM)</th>
                    <th className="py-2.5 px-3">Iqomat / Jamoat Vaqti (HH:MM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/60">
                  {scheduleDraft.times.map((entry) => {
                    const hasIqamahSlot = !['quyosh', 'tahajjud', 'subh'].includes(entry.key);
                    return (
                      <tr key={entry.key} className="hover:bg-canvas/50">
                        <td className="py-2.5 px-3 font-bold text-primary">
                          {entry.nameUz}
                          {['tahajjud', 'subh'].includes(entry.key) && (
                            <span className="ml-1.5 text-[10px] font-normal text-secondary">
                              (ixtiyoriy)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-arabic text-base text-[#C6A45C]" dir="rtl">
                          {entry.nameAr}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="time"
                            value={entry.time}
                            onChange={(e) =>
                              handleUpdateScheduleTimeField(entry.key, 'time', e.target.value)
                            }
                            className="px-3 py-1.5 rounded-lg border border-divider bg-canvas text-primary font-mono-numbers font-bold text-sm"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          {hasIqamahSlot ? (
                            <input
                              type="time"
                              value={entry.iqamahTime || ''}
                              onChange={(e) =>
                                handleUpdateScheduleTimeField(entry.key, 'iqamahTime', e.target.value)
                              }
                              className="px-3 py-1.5 rounded-lg border border-divider bg-canvas text-primary font-mono-numbers font-bold text-sm"
                            />
                          ) : (
                            <span className="text-muted text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Publish switches & Save */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-divider">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.isAdministratorPublished}
                    onChange={(e) =>
                      setScheduleDraft((p) => ({
                        ...p,
                        isAdministratorPublished: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#063D32]"
                  />
                  <span>Rasmiy tasdiqlangan (TV ekranlarida faol koʻrsatilsin)</span>
                </label>
                {scheduleDraft.id === 'asaka-main' && (
                  <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToMainSchedule}
                      onChange={(e) => setSyncToMainSchedule(e.target.checked)}
                      className="w-4 h-4 accent-[#063D32]"
                    />
                    <span>Asosiy ilova namoz vaqtlari (`schedules/asaka-main`) bilan ham sinxronlash</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2">
                {scheduleDraft.id !== 'asaka-main' && (
                  <button
                    type="button"
                    disabled={busyAction === `del_sched_${scheduleDraft.id}`}
                    onClick={() => handleDeleteSchedule(scheduleDraft.id)}
                    className="px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/10 cursor-pointer"
                  >
                    Jadvalni Oʻchirish
                  </button>
                )}
                <Button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={busyAction === 'save_schedule'}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {busyAction === 'save_schedule' ? 'Saqlanmoqda...' : 'Jadvalni Saqlash va TV ga Yuborish'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: TV ANNOUNCEMENTS & MEDIA MANAGER                         */}
      {/* =================================================================== */}
      {subTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Announcement Editor Form */}
          <Card elevated className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#DFBD69]" />
                {editingAnnouncementId ? 'TV Eʼlonini Tahrirlash' : 'Yangi TV Eʼloni Qoʻshish'}
              </h3>
              {editingAnnouncementId && (
                <button
                  type="button"
                  onClick={resetAnnouncementForm}
                  className="text-xs text-secondary hover:text-primary cursor-pointer"
                >
                  Bekor qilish
                </button>
              )}
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Sarlavha (Oʻzbekcha Lotin) *
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Masalan: Juma namozi eslatmasi"
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary mb-1">
                  Eʼlon Matni *
                </label>
                <textarea
                  rows={3}
                  required
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Masjid pastki panelida aylanib turadigan aniq matn..."
                  className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Muhimlik</label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as 'normal' | 'important' | 'urgent')}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    <option value="normal">Oddiy (Maʼlumot)</option>
                    <option value="important">Muhim (Oltin belgi)</option>
                    <option value="urgent">Shoshilinch (Yuqori urgʻu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Koʻrsatish vaqti (soniya)
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={60}
                    value={annDurationSec}
                    onChange={(e) => setAnnDurationSec(Number(e.target.value) || 10)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Media / Rasm URL (ixtiyoriy)
                  </label>
                  <input
                    type="url"
                    value={annMediaUrl}
                    onChange={(e) => setAnnMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Tugash sanasi (ixtiyoriy)
                  </label>
                  <input
                    type="date"
                    value={annExpiresAt}
                    onChange={(e) => setAnnExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs font-mono-numbers"
                  />
                </div>
              </div>

              {/* Target Monitors */}
              {monitors.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Qaysi monitorlarda koʻrinsin? (Hech biri tanlanmasa — barchasida)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {monitors.map((m) => {
                      const checked = annTargetMonitorIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setAnnTargetMonitorIds((prev) =>
                              checked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            checked
                              ? 'bg-[#063D32] text-[#FFF8E8] border-[#DFBD69]'
                              : 'bg-canvas text-secondary border-divider'
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Multilingual Translations */}
              <div className="border-t border-divider/60 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnTranslations((v) => !v)}
                  className="text-xs font-bold text-[#063D32] dark:text-[#DFBD69] flex items-center gap-1.5 cursor-pointer"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>
                    {showAnnTranslations
                      ? 'Qoʻshimcha tillarni yopish'
                      : 'Kirill / Rus / Ingliz tarjimalarini kiritish (ixtiyoriy)'}
                  </span>
                </button>
                {showAnnTranslations && (
                  <div className="mt-3 space-y-2.5 p-3 rounded-xl bg-canvas/70 border border-divider">
                    <div className="text-[10px] text-secondary">
                      Yangi oʻzbek alifbosi (Oʻzbekcha Yangi) avtomatik transliteratsiya qilinadi.
                    </div>
                    <input
                      type="text"
                      value={annTitleCyrl}
                      onChange={(e) => setAnnTitleCyrl(e.target.value)}
                      placeholder="Ўзбекча (Кирилл) сарлавҳа"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                    <input
                      type="text"
                      value={annBodyCyrl}
                      onChange={(e) => setAnnBodyCyrl(e.target.value)}
                      placeholder="Ўзбекча (Кирилл) матн"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                    <input
                      type="text"
                      value={annTitleRu}
                      onChange={(e) => setAnnTitleRu(e.target.value)}
                      placeholder="Русский заголовок"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                    <input
                      type="text"
                      value={annBodyRu}
                      onChange={(e) => setAnnBodyRu(e.target.value)}
                      placeholder="Русский текст объявления"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                    <input
                      type="text"
                      value={annTitleEn}
                      onChange={(e) => setAnnTitleEn(e.target.value)}
                      placeholder="English title"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                    <input
                      type="text"
                      value={annBodyEn}
                      onChange={(e) => setAnnBodyEn(e.target.value)}
                      placeholder="English announcement text"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={annIsActive}
                  onChange={(e) => setAnnIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#063D32]"
                />
                <span>TV ekranlarida faol koʻrsatilsin</span>
              </label>

              <Button type="submit" className="w-full" disabled={busyAction === 'save_announcement'}>
                <Save className="w-4 h-4 mr-1.5" />
                {busyAction === 'save_announcement'
                  ? 'Saqlanmoqda...'
                  : editingAnnouncementId
                    ? 'Eʼlonni Yangilash'
                    : 'Eʼlonni Saqlash va TV ga Chiqarish'}
              </Button>
            </form>
          </Card>

          {/* Announcement List */}
          <div className="lg:col-span-7 space-y-3">
            {announcements.length === 0 ? (
              <Card className="p-8 text-center text-xs text-secondary">
                Hozircha TV eʼlonlari qoʻshilmagan. Chapdagi forma orqali masjid eʼlonlarini yarating.
              </Card>
            ) : (
              announcements.map((ann) => (
                <Card
                  key={ann.id}
                  className={`p-4 border ${
                    ann.priority === 'urgent'
                      ? 'border-rose-500/45'
                      : ann.priority === 'important'
                        ? 'border-[#DFBD69]/55'
                        : 'border-divider'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            ann.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : ann.priority === 'important'
                                ? 'bg-[#DFBD69]/25 text-amber-900 dark:text-[#DFBD69]'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {ann.priority === 'urgent'
                            ? 'Shoshilinch'
                            : ann.priority === 'important'
                              ? 'Muhim'
                              : 'Oddiy'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ann.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-stone-500/20 text-stone-500'
                          }`}
                        >
                          {ann.isActive ? 'Faol' : 'Nofaol'}
                        </span>
                        <span className="text-[10px] text-muted font-mono-numbers">
                          {ann.displayDurationSec}s
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-primary mt-1.5">{ann.title}</h4>
                      <p className="text-xs text-secondary mt-1">{ann.body}</p>
                      {ann.mediaUrl && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span className="truncate max-w-xs">{ann.mediaUrl}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditAnnouncement(ann)}
                        className="p-2 rounded-lg bg-canvas border border-divider hover:border-[#DFBD69] text-primary cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busyAction === `del_ann_${ann.id}`}
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: CONNECTIONS LOG                                          */}
      {/* =================================================================== */}
      {subTab === 'connections' && (
        <Card elevated className="p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#DFBD69]" />
              Ulangan TV Monitorlar Tarixi (`displayConnections`)
            </h3>
            <span className="text-[11px] text-secondary">Oxirgi ulanish va heartbeat qaydlar</span>
          </div>

          {connections.length === 0 ? (
            <div className="p-6 text-center text-xs text-secondary">
              Hali birorta TV qurilma pairing orqali ulanmagan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-divider text-secondary uppercase text-[10px]">
                  <th className="py-2 px-3">Monitor</th>
                  <th className="py-2 px-3">Ulangan vaqt</th>
                  <th className="py-2 px-3">Oxirgi Heartbeat</th>
                  <th className="py-2 px-3">Ekran Oʻlchami</th>
                  <th className="py-2 px-3">Fullscreen / WakeLock</th>
                  <th className="py-2 px-3">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-canvas/50">
                    <td className="py-2.5 px-3 font-bold text-primary">{conn.monitorName}</td>
                    <td className="py-2.5 px-3 font-mono-numbers text-secondary">
                      {formatShortDateTime(conn.pairedAt)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers text-primary">
                      {formatShortDateTime(conn.lastHeartbeatAt)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers">{conn.resolution || '—'}</td>
                    <td className="py-2.5 px-3">
                      {conn.fullscreen ? 'Fullscreen' : 'Oyna'} ·{' '}
                      {conn.wakeLockActive ? 'WakeLock' : 'Standart'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          conn.status === 'connected'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {conn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* =================================================================== */}
      {/* MODAL: QR CODE & 6-DIGIT PAIRING CODE                               */}
      {/* =================================================================== */}
      {qrMonitor && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQrMonitor(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#041D13] border border-[#DFBD69]/60 text-[#FFF8E8] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-[#FFF8E8] flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#DFBD69]" />
                  TV Monitorni Ulash
                </h3>
                <p className="text-xs text-[#DFBD69]/85 mt-0.5">{qrMonitor.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrMonitor(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center p-4 rounded-2xl bg-[#FFFDF7] text-[#03170F]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${qrMonitor.name}`}
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-stone-500">
                  QR-kod tayyorlanmoqda...
                </div>
              )}
              <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#063D32]">
                6 Xonali Ulash Kodi
              </div>
              <div className="text-4xl font-mono-numbers font-black tracking-[0.22em] text-[#03170F] mt-1">
                {qrMonitor.pairingCode}
              </div>
            </div>

            <div className="text-[11px] text-white/80 space-y-1 bg-black/25 rounded-xl p-3 border border-white/10">
              <div>1. Masjid televizori brauzerida <strong className="text-[#DFBD69]">{pairBaseUrl}</strong> sahifasini oching.</div>
              <div>2. QR-kodni skanerlang yoki yuqoridagi 6 xonali kodni kiriting.</div>
              <div>3. Monitor avtomatik saqlanadi va qayta yoqilganda ham oʻzi tiklanadi.</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(qrMonitor.pairingCode, `code_${qrMonitor.id}`)}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedId === `code_${qrMonitor.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#DFBD69]" />
                )}
                <span>{copiedId === `code_${qrMonitor.id}` ? 'Nusxalandi' : 'Kodni Nusxalash'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCopyText(`${pairBaseUrl}?code=${qrMonitor.pairingCode}`, `url_${qrMonitor.id}`)
                }
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedId === `url_${qrMonitor.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#DFBD69]" />
                )}
                <span>{copiedId === `url_${qrMonitor.id}` ? 'Havola olindi' : 'QR Havola'}</span>
              </button>
              <button
                type="button"
                disabled={busyAction === `regen_${qrMonitor.id}`}
                onClick={() => handleRegeneratePairingCode(qrMonitor)}
                className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kodni Yangilash</span>
              </button>
              <a
                href={`/display?code=${encodeURIComponent(qrMonitor.pairingCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 rounded-xl bg-[#DFBD69] hover:bg-[#e8ca7e] text-[#03170F] text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ekranni Ochish</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: MONITOR SETTINGS EDITOR                                      */}
      {/* =================================================================== */}
      {editingMonitor && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingMonitor(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-surface border border-[#DFBD69]/50 p-6 shadow-2xl space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#DFBD69]" />
                Monitor Sozlamalari: {editingMonitor.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMonitor(null)}
                className="p-1.5 rounded-lg hover:bg-canvas cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMonitor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Monitor Nomi</label>
                  <input
                    type="text"
                    required
                    value={editingMonitor.name}
                    onChange={(e) => setEditingMonitor({ ...editingMonitor, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Masjid Nomi</label>
                  <input
                    type="text"
                    value={editingMonitor.mosqueName}
                    onChange={(e) =>
                      setEditingMonitor({ ...editingMonitor, mosqueName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Joylashuv</label>
                  <input
                    type="text"
                    value={editingMonitor.locationLabel}
                    onChange={(e) =>
                      setEditingMonitor({ ...editingMonitor, locationLabel: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Namoz Jadvali</label>
                  <select
                    value={editingMonitor.scheduleId}
                    onChange={(e) =>
                      setEditingMonitor({ ...editingMonitor, scheduleId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.mosqueName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">Ekran Tili</label>
                  <select
                    value={editingMonitor.language}
                    onChange={(e) =>
                      setEditingMonitor({
                        ...editingMonitor,
                        language: e.target.value as SupportedLocale,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {LANGUAGE_LIST.map((l) => (
                      <option key={l} value={l}>
                        {DISPLAY_LANGUAGE_LABELS[l]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary mb-1">
                    Dizayn Shabloni
                  </label>
                  <select
                    value={editingMonitor.template}
                    onChange={(e) =>
                      setEditingMonitor({
                        ...editingMonitor,
                        template: e.target.value as DisplayTemplateId,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-canvas text-primary text-xs"
                  >
                    {TEMPLATE_OPTIONS.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Screen Display Parameters */}
              <div className="p-4 rounded-2xl bg-canvas/70 border border-divider space-y-3">
                <div className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                  Ekran Elementlari va Vizual Sozlamalar
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {(
                    [
                      ['showSeconds', 'Soniya koʻrsatish'],
                      ['showHijriDate', 'Hijriy sana'],
                      ['showTahajjud', 'Tahajjud vaqti'],
                      ['showSubh', 'Subh vaqti'],
                      ['showIshraq', 'Ishroq vaqti'],
                      ['showJuma', 'Juma vaqti'],
                      ['showIqamahCountdown', 'Iqomat taymeri'],
                      ['showAnnouncements', 'Pastki eʼlonlar'],
                      ['autoWakeLock', 'Wake Lock (uyqusiz)'],
                    ] as [keyof SmartDisplaySettings, string][]
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingMonitor.settings[key])}
                        onChange={(e) =>
                          setEditingMonitor({
                            ...editingMonitor,
                            settings: {
                              ...editingMonitor.settings,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 accent-[#063D32]"
                      />
                      <span className="text-primary">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-divider/60">
                  <div>
                    <label className="block text-[11px] font-bold text-secondary mb-1">
                      Shrift Kattaligi
                    </label>
                    <select
                      value={editingMonitor.settings.fontScale}
                      onChange={(e) =>
                        setEditingMonitor({
                          ...editingMonitor,
                          settings: {
                            ...editingMonitor.settings,
                            fontScale: e.target.value as SmartDisplaySettings['fontScale'],
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs"
                    >
                      <option value="standard">Standart (100%)</option>
                      <option value="large">Katta (110%)</option>
                      <option value="xlarge">Juda Katta (118%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-secondary mb-1">
                      Yorqinlik: {editingMonitor.settings.brightnessPct}%
                    </label>
                    <input
                      type="range"
                      min={55}
                      max={115}
                      value={editingMonitor.settings.brightnessPct}
                      onChange={(e) =>
                        setEditingMonitor({
                          ...editingMonitor,
                          settings: {
                            ...editingMonitor.settings,
                            brightnessPct: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[#063D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-secondary mb-1">
                      Eʼlon almashishi (soniya)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={60}
                      value={editingMonitor.settings.announcementIntervalSec}
                      onChange={(e) =>
                        setEditingMonitor({
                          ...editingMonitor,
                          settings: {
                            ...editingMonitor.settings,
                            announcementIntervalSec: Number(e.target.value) || 10,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-divider bg-canvas text-xs font-mono-numbers"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingMonitor(null)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" size="sm" disabled={busyAction === `edit_${editingMonitor.id}`}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {busyAction === `edit_${editingMonitor.id}` ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
