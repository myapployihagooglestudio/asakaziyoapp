import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  Eye,
  History,
  Info,
  Plus,
  Power,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { getActiveAdminToken } from '../../../utils/firebaseClient';

interface EmojiSlotEntry {
  key: string;
  name?: string;
  category: string;
  description: string;
  semanticPurpose?: string;
  usedIn?: string[];
  isCustomAdminSlot?: boolean;
  isExtended30Slot?: boolean;
  status?: 'verified' | 'unverified' | 'missing' | 'disabled';
  customEmojiId?: string | null;
  stickerSetName?: string;
  verified: boolean;
  enabled?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

interface EmojiAuditReport {
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

interface EmojiHistoryLog {
  id: string;
  actorTelegramId: string;
  actorRole: string;
  action: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface RuntimeDiagnosticsPayload {
  instanceId: string;
  deploymentId: string;
  gitCommit: string;
  buildVersion: string;
  processId: number;
  startedAt: string;
  uptimeSec: number;
  mode: string;
  startupState: string;
  startupReason: string;
  configVersion: number;
  configUpdatedAt: string;
  emojiRegistryVersion: number;
  firestoreOnline: boolean;
  degradedMode: boolean;
  lastFirestoreReadAt: string | null;
  lastFirestoreWriteAt: string | null;
  lastCacheRefreshAt: string | null;
  activeInstanceCount: number;
  outdatedInstancesDetected: boolean;
  polling: {
    pollingActive: boolean;
    conflictCount: number;
    lastConflictAt: string | null;
    multiInstanceConflictDetected: boolean;
    updatesProcessedCount: number;
  };
  rollbackWarnings: Array<{
    id: string;
    target: string;
    source: string;
    currentVersion: number;
    incomingVersion: number;
    reason: string;
    createdAt: string;
  }>;
  performance: {
    activeUserQueues: number;
    inFlightUpdates: number;
    deduplicatedUpdates: number;
    totalProcessed: number;
    overall: { count: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number; errorCount: number };
    database: { count: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number };
    telegramApi: { count: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number };
    byCategory: Record<string, { count: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number }>;
  };
}

type ManagerTab = 'registry' | 'missing' | 'create' | 'audit' | 'health' | 'history';

export const PremiumEmojiManagerPanel: React.FC = () => {
  const [tab, setTab] = useState<ManagerTab>('registry');
  const [entries, setEntries] = useState<EmojiSlotEntry[]>([]);
  const [missingEntries, setMissingEntries] = useState<EmojiSlotEntry[]>([]);
  const [audit, setAudit] = useState<EmojiAuditReport | null>(null);
  const [runtimeDiag, setRuntimeDiag] = useState<RuntimeDiagnosticsPayload | null>(null);
  const [history, setHistory] = useState<EmojiHistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [filterMode, setFilterMode] = useState<
    'all' | 'owner34' | 'extended30' | 'active' | 'missing' | 'disabled' | 'custom'
  >('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [appConfigVersion, setAppConfigVersion] = useState<number>(0);
  const [idDrafts, setIdDrafts] = useState<Record<string, string>>({});
  const [previewChatId, setPreviewChatId] = useState('');

  // Custom slot creation state
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newPurpose, setNewPurpose] = useState('');
  const [newUsedIn, setNewUsedIn] = useState('');
  const [newCustomEmojiId, setNewCustomEmojiId] = useState('');

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getActiveAdminToken();
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const [listRes, auditRes, histRes, diagRes] = await Promise.all([
        fetch('/api/telegram/platform/emojis', { headers, cache: 'no-store' }),
        fetch('/api/telegram/platform/emojis/audit', { headers, cache: 'no-store' }),
        fetch('/api/telegram/platform/emojis/history?limit=40', { headers, cache: 'no-store' }),
        fetch('/api/telegram/platform/diagnostics/runtime', { headers, cache: 'no-store' }),
      ]);
      if (listRes.ok) {
        const j = await listRes.json();
        const rows: EmojiSlotEntry[] = Array.isArray(j.entries) ? j.entries : [];
        setEntries(rows);
        setMissingEntries(Array.isArray(j.missingCanonical) ? j.missingCanonical : []);
        if (typeof j.appConfigVersion === 'number') setAppConfigVersion(j.appConfigVersion);
        setIdDrafts((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            if (next[row.key] === undefined) {
              next[row.key] = row.customEmojiId || '';
            }
          }
          return next;
        });
      }
      if (auditRes.ok) {
        const aj = await auditRes.json();
        if (aj.audit) setAudit(aj.audit);
      }
      if (histRes.ok) {
        const hj = await histRes.json();
        setHistory(Array.isArray(hj.logs) ? hj.logs : []);
      }
      if (diagRes.ok) {
        const dj = await diagRes.json();
        if (dj.diagnostics) setRuntimeDiag(dj.diagnostics);
      }
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Emoji reyestrini yuklashda xatolik.' });
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.category) set.add(e.category);
    }
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterMode === 'owner34' && (e.isExtended30Slot || e.isCustomAdminSlot)) return false;
      if (filterMode === 'extended30' && !e.isExtended30Slot) return false;
      if (filterMode === 'active' && !Boolean(e.customEmojiId && e.verified && e.enabled !== false))
        return false;
      if (filterMode === 'missing' && Boolean(e.customEmojiId)) return false;
      if (filterMode === 'disabled' && e.enabled !== false) return false;
      if (filterMode === 'custom' && !e.isCustomAdminSlot) return false;
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (q) {
        const hay = `${e.key} ${e.name || ''} ${e.category} ${e.description} ${e.semanticPurpose || ''} ${e.customEmojiId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filterMode, selectedCategory, searchQuery]);

  const handleCopyId = async (entry: EmojiSlotEntry) => {
    const idVal = (entry.customEmojiId || idDrafts[entry.key] || '').trim();
    if (!idVal) return;
    try {
      await navigator.clipboard.writeText(idVal);
      setCopiedKey(entry.key);
      setTimeout(() => setCopiedKey((cur) => (cur === entry.key ? null : cur)), 1800);
    } catch {
      setNotice({ type: 'err', text: 'Nusxalashda xatolik yuz berdi.' });
    }
  };

  const handleSaveId = async (entry: EmojiSlotEntry) => {
    const val = (idDrafts[entry.key] || '').trim();
    setBusyKey(`save:${entry.key}`);
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/emojis', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          key: entry.key,
          customEmojiId: val || null,
          verifyNow: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Saqlashda xatolik yuz berdi.');
      }
      setNotice({
        type: 'ok',
        text: json.verified
          ? `«${entry.key}» Telegram API orqali tasdiqlandi va Firestore ga saqlandi.`
          : json.verificationNote
            ? `«${entry.key}» saqlandi, lekin Telegram API tasdiqlamadi: ${json.verificationNote}`
            : `«${entry.key}» yangilandi.`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Saqlashda xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggle = async (entry: EmojiSlotEntry) => {
    setBusyKey(`toggle:${entry.key}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/telegram/platform/emojis/${encodeURIComponent(entry.key)}/toggle`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ enabled: entry.enabled === false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Holatni oʻzgartirishda xatolik.');
      setNotice({
        type: 'ok',
        text: `«${entry.key}» ${entry.enabled === false ? 'faollashtirildi' : 'vaqtincha oʻchirildi (oddiy emoji chiqmaydi)'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteOrClear = async (entry: EmojiSlotEntry) => {
    setConfirmDeleteKey(null);
    setBusyKey(`del:${entry.key}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/telegram/platform/emojis/${encodeURIComponent(entry.key)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Oʻchirishda xatolik.');
      setIdDrafts((prev) => ({ ...prev, [entry.key]: '' }));
      setNotice({
        type: 'ok',
        text: json.removed
          ? `«${entry.key}» custom sloti butunlay oʻchirildi.`
          : `«${entry.key}» dan Premium Emoji ID tozalandi.`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Oʻchirishda xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handlePreview = async (key: string) => {
    setBusyKey(`preview:${key}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/telegram/platform/emojis/${encodeURIComponent(key)}/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(previewChatId.trim() ? { chatId: previewChatId.trim() } : {}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Telegram preview yuborilmadi.');
      }
      setNotice({
        type: 'ok',
        text: json.isPremiumActive
          ? `«${key}» Telegram chatga haqiqiy Premium Custom Emoji bilan yuborildi.`
          : `«${key}» preview yuborildi (Premium ID bogʻlanmagan — toza matn rejimi).`,
      });
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Preview yuborishda xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleVerifyAll = async () => {
    setBusyKey('verify_all');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/emojis/verify', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Tekshirishda xatolik.');
      setNotice({
        type: 'ok',
        text: `Telegram API tekshiruvi yakunlandi — Tasdiqlangan: ${json.verification?.verifiedKeys?.length ?? 0}, Rad etilgan: ${json.verification?.rejectedKeys?.length ?? 0}. (appConfig v${json.appConfigVersion ?? '-'})`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'API tekshiruvi xatosi.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSeed34OfficialIds = async () => {
    setBusyKey('seed_34');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/emojis/seed-defaults', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ verifyWithTelegram: true, forceOverwrite: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '34 ta rasmiy ID migratsiya qilinmadi.');
      setNotice({
        type: 'ok',
        text: `34 ta rasmiy Premium Emoji ID + 30 ta yangi slot Firestore (app_config/premium_emojis v${json.appConfigVersion ?? 1}) ga saqlandi. Tasdiqlangan: ${json.verifiedCount ?? 0}/34, Telegram API tekshirildi: ${json.telegramChecked ? 'Ha' : 'Yoʻq'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || '34 ta ID migratsiyasida xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSendFullTest = async () => {
    setBusyKey('test_send');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/emojis/test-send', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(previewChatId.trim() ? { chatId: previewChatId.trim() } : {}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Test xabari yuborilmadi.');
      setNotice({
        type: 'ok',
        text: `Toʻliq test xabari Telegram ga yuborildi (Faol Premium: ${json.usedCustomEmojiCount ?? 0}, Bogʻlanmagan: ${json.usedFallbackCount ?? 0}).`,
      });
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Test xabarini yuborishda xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateCustomSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('create_custom');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/emojis/custom', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          key: newKey.trim().toLowerCase(),
          category: newCategory.trim() || 'custom',
          semanticPurpose: newPurpose.trim(),
          description: newPurpose.trim(),
          usedIn: newUsedIn
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          customEmojiId: newCustomEmojiId.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Custom slot yaratilmadi.');
      setNotice({
        type: 'ok',
        text: `Yangi custom slot «${json.entry?.key}» Firestore ga saqlandi.`,
      });
      setNewKey('');
      setNewPurpose('');
      setNewUsedIn('');
      setNewCustomEmojiId('');
      setTab('registry');
      await loadData();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Yaratishda xatolik.' });
    } finally {
      setBusyKey(null);
    }
  };

  const statusBadge = (entry: EmojiSlotEntry) => {
    if (entry.enabled === false) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-500/15 text-stone-600 dark:text-stone-400">
          Oʻchirilgan (OFF)
        </span>
      );
    }
    if (entry.customEmojiId && entry.verified) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          Tasdiqlangan Premium
        </span>
      );
    }
    if (entry.customEmojiId && !entry.verified) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400">
          Tekshirilmagan ID
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-700 dark:text-rose-400">
        Bogʻlanmagan
      </span>
    );
  };

  return (
    <Card elevated className="p-6 space-y-5 border border-[#c5a869]/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c5a869]" />
            <span>100% Telegram Premium Custom Emoji Boshqaruv Markazi</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Botning barcha xabarlari va tugmalari faqat tasdiqlangan Telegram Premium Custom Emoji ID laridan foydalanadi. Oddiy Unicode emoji qatʼiy taqiqlangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed34OfficialIds}
            disabled={busyKey === 'seed_34'}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span>34 ID + 30 Slot Migratsiya</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyAll}
            disabled={busyKey === 'verify_all'}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            <span>API Tekshirish</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendFullTest}
            disabled={busyKey === 'test_send'}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>Telegram Test Yuborish</span>
          </Button>
        </div>
      </div>

      {/* Honest Platform Technical Notice */}
      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Telegram Client Rendering Eslatmasi:</strong> Telegram <code className="font-mono">custom_emoji_id</code> faqat Telegram ilovalari (Android, iOS, Desktop) ichida native koʻrinadi. Web Admin Panelda oddiy Unicode emoji fallback ishlatilmaydi — yangi Premium emojini avtomatik aniqlash uchun Telegram botda <code className="font-mono">/emoji_setup</code> buyrugʻi orqali Premium tanlagichdan yuboring yoki bu yerdan <code className="font-mono">custom_emoji_id</code> kiriting va <em>Preview</em> orqali Telegram chatda koʻring.
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            notice.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notice.type === 'ok' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Summary KPI Row */}
      {audit && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
            <div className="text-[11px] text-stone-500">Jami Slotlar</div>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {audit.totalRegistered}
            </div>
            <div className="text-[10px] text-stone-400">
              {audit.canonicalTotal} standart · {audit.customAdminSlotsCount} custom
            </div>
          </div>
          <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
            <div className="text-[11px] text-stone-500">Faol Tasdiqlangan</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {audit.workingVerifiedCount}
            </div>
            <div className="text-[10px] text-stone-400">Oʻchirilgan: {audit.disabledCount}</div>
          </div>
          <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
            <div className="text-[11px] text-stone-500">Yetishmayotgan</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {audit.missingCanonicalKeys.length} / {audit.canonicalTotal}
            </div>
            <div className="text-[10px] text-stone-400">
              Tekshirilmagan: {audit.invalidOrUnverifiedKeys.length}
            </div>
          </div>
          <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
            <div className="text-[11px] text-stone-500">Kod Oddiy Emoji Auditi</div>
            <div
              className={`text-lg font-bold ${
                audit.codebasePlainEmojiMatches.length === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {audit.codebasePlainEmojiMatches.length} ta qoldiq
            </div>
            <div className="text-[10px] text-stone-400">
              Payload leaks: {audit.outgoingPayloadAudit.violationCount}
            </div>
          </div>
          <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
            <div className="text-[11px] text-stone-500">Preview Chat ID (ixtiyoriy)</div>
            <input
              type="text"
              value={previewChatId}
              onChange={(e) => setPreviewChatId(e.target.value)}
              placeholder="Default: OWNER_ID"
              className="mt-1 w-full rounded-lg border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-2 py-1 text-xs text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-emerald-950 pb-3">
        {(
          [
            ['registry', `Barcha Emojilar (${entries.length})`],
            ['missing', `Yetishmayotganlar (${missingEntries.length})`],
            ['create', 'Yangi Custom Slot'],
            ['audit', 'Toʻliq Audit va Test'],
            ['health', `Bot Salomatligi & Tezlik${runtimeDiag?.rollbackWarnings?.length ? ` (${runtimeDiag.rollbackWarnings.length})` : ''}`],
            ['history', `Oʻzgarishlar Tarixi (${history.length})`],
          ] as Array<[ManagerTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === key
                ? 'bg-[#c5a869] text-stone-950'
                : 'bg-stone-100 dark:bg-[#071614] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-emerald-950/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Registry */}
      {tab === 'registry' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', `Barchasi (${entries.length})`],
                  ['owner34', '34 Rasmiy ID'],
                  ['extended30', 'Yangi 30 ta Slot'],
                  ['active', 'Faol Premium'],
                  ['missing', 'ID Kiritilmagan'],
                  ['disabled', 'Oʻchirilgan'],
                  ['custom', 'Custom Admin'],
                ] as const
              ).map(([f, lbl]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterMode(f)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer ${
                    filterMode === f
                      ? 'border-[#c5a869] bg-[#c5a869]/15 text-stone-900 dark:text-stone-100'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-500'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kalit, nom yoki ID qidirish..."
                  className="pl-8 pr-2.5 py-1 rounded-lg border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] text-[11px] text-stone-900 dark:text-stone-100 w-48"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-2 py-1 text-[11px] text-stone-900 dark:text-stone-100"
              >
                <option value="all">Barcha kategoriyalar</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                Firestore: app_config/premium_emojis (v{appConfigVersion})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-emerald-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-[#071614] text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="py-2 px-3">Kalit / Kategoriya</th>
                  <th className="py-2 px-3">Maqsad & Ishlatilish</th>
                  <th className="py-2 px-3">Holat</th>
                  <th className="py-2 px-3">Telegram custom_emoji_id</th>
                  <th className="py-2 px-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {filteredEntries.map((entry) => (
                  <tr key={entry.key} className="bg-white dark:bg-[#091a18] align-top">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {entry.key}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {entry.category}
                        {entry.isExtended30Slot ? ' · Yangi 30 Slot' : ''}
                        {entry.isCustomAdminSlot ? ' · Custom' : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="text-stone-800 dark:text-stone-200">
                        {entry.semanticPurpose || entry.description}
                      </div>
                      {entry.usedIn && entry.usedIn.length > 0 && (
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          Ishlatiladi: {entry.usedIn.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{statusBadge(entry)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={idDrafts[entry.key] ?? ''}
                          onChange={(e) =>
                            setIdDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          placeholder={entry.isExtended30Slot ? 'ID kiritilmagan (yangi slot)...' : 'Raqamli custom_emoji_id...'}
                          className="w-44 rounded-lg border border-stone-300 dark:border-emerald-900 bg-stone-50 dark:bg-[#071614] px-2 py-1 font-mono text-[11px] text-stone-900 dark:text-stone-100"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void handleSaveId(entry)}
                          disabled={busyKey === `save:${entry.key}`}
                        >
                          Saqlash
                        </Button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {Boolean(entry.customEmojiId || idDrafts[entry.key]) && (
                          <button
                            type="button"
                            title="custom_emoji_id ni nusxalash"
                            onClick={() => void handleCopyId(entry)}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/60 cursor-pointer"
                          >
                            {copiedKey === entry.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          title="Telegram chatga preview yuborish"
                          onClick={() => void handlePreview(entry.key)}
                          disabled={busyKey === `preview:${entry.key}`}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/60 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={entry.enabled === false ? 'Yoqish' : 'Vaqtincha oʻchirish'}
                          onClick={() => void handleToggle(entry)}
                          disabled={busyKey === `toggle:${entry.key}`}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/60 cursor-pointer"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteKey === entry.key ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteOrClear(entry)}
                              disabled={busyKey === `del:${entry.key}`}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Tasdiqlash
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(null)}
                              className="px-1.5 py-1 rounded-lg border border-stone-300 dark:border-emerald-900 text-[10px] text-stone-600 dark:text-stone-300 cursor-pointer"
                            >
                              Bekor
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            title={entry.isCustomAdminSlot ? 'Butunlay oʻchirish' : 'ID ni tozalash'}
                            onClick={() => setConfirmDeleteKey(entry.key)}
                            disabled={busyKey === `del:${entry.key}`}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Missing Categories */}
      {tab === 'missing' && (
        <div className="space-y-3">
          {missingEntries.length === 0 ? (
            <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
              Barcha 34 ta rasmiy kategoriya Telegram Premium Custom Emoji bilan toʻliq bogʻlangan!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {missingEntries.map((m) => (
                <div
                  key={m.key}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                      {m.key}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                      {m.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {m.semanticPurpose || m.description}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={idDrafts[m.key] ?? ''}
                      onChange={(e) =>
                        setIdDrafts((prev) => ({ ...prev, [m.key]: e.target.value }))
                      }
                      placeholder="custom_emoji_id kiriting..."
                      className="flex-1 rounded-lg border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-2.5 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleSaveId(m)}
                      disabled={busyKey === `save:${m.key}`}
                    >
                      Bogʻlash
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Create Custom Slot */}
      {tab === 'create' && (
        <form onSubmit={handleCreateCustomSlot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Slot Kaliti (key) *
            </label>
            <input
              type="text"
              required
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="masalan: ramadan_banner"
              className="w-full rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-3 py-2 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Kategoriya *
            </label>
            <input
              type="text"
              required
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="masalan: seasonal, announcement, quran"
              className="w-full rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Semantik Maqsad (Semantic Purpose) *
            </label>
            <input
              type="text"
              required
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              placeholder="masalan: Ramazon oyi maxsus eʼlon va iftorlik sarlavhalari"
              className="w-full rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Ishlatiladigan joylar (vergul bilan)
            </label>
            <input
              type="text"
              value={newUsedIn}
              onChange={(e) => setNewUsedIn(e.target.value)}
              placeholder="Broadcasts, Scheduled Reminders"
              className="w-full rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Telegram custom_emoji_id (ixtiyoriy — keyin /emoji_setup orqali ham qoʻshish mumkin)
            </label>
            <input
              type="text"
              value={newCustomEmojiId}
              onChange={(e) => setNewCustomEmojiId(e.target.value)}
              placeholder="Raqamli ID (masalan: 5368324170671202286)"
              className="w-full rounded-xl border border-stone-300 dark:border-emerald-900 bg-white dark:bg-[#091a18] px-3 py-2 font-mono text-xs"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button variant="primary" size="sm" type="submit" disabled={busyKey === 'create_custom'}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Yangi Custom Slot Yaratish</span>
            </Button>
          </div>
        </form>
      )}

      {/* TAB 4: Audit & Test */}
      {tab === 'audit' && audit && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Chiquvchi Xabarlar Gateway Auditi</span>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Tekshirilgan Telegram API soʻrovlari: <strong>{audit.outgoingPayloadAudit.auditedCount}</strong>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Oddiy Unicode emoji sizib chiqishlari: <strong>{audit.outgoingPayloadAudit.violationCount}</strong>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Ishlatilmayotgan roʻyxatdagi slotlar: <strong>{audit.unusedRegisteredKeys.length}</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Ogohlantirishlar va Xatoliklar</span>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Keyboard icon ogohlantirishlari: <strong>{audit.keyboardIconWarnings.length}</strong>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Yetkazib berish rad etishlari (HTTP 400 fallback): <strong>{audit.deliveryFailures.length}</strong>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Kodda topilgan oddiy Unicode emojilar: <strong>{audit.codebasePlainEmojiMatches.length} ta</strong>
              </div>
            </div>
          </div>

          {audit.deliveryFailures.length > 0 && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
              <div className="font-semibold text-rose-700 dark:text-rose-300">Oxirgi Yetkazib Berish Xatolari:</div>
              {audit.deliveryFailures.slice(-5).map((f, idx) => (
                <div key={idx} className="font-mono text-[11px] text-rose-600 dark:text-rose-400">
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4B: Bot System Health, Anti-Rollback Guard & Latency Telemetry */}
      {tab === 'health' && runtimeDiag && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
              <div className="text-[11px] text-stone-500">Konfiguratsiya Versiyasi</div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">
                v{runtimeDiag.configVersion}
              </div>
              <div className="text-[10px] text-stone-400">
                Emoji Registry: v{runtimeDiag.emojiRegistryVersion}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
              <div className="text-[11px] text-stone-500">Firestore Holati</div>
              <div
                className={`text-lg font-bold ${
                  runtimeDiag.firestoreOnline && !runtimeDiag.degradedMode
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {runtimeDiag.firestoreOnline ? 'ONLINE' : 'DEGRADED'}
              </div>
              <div className="text-[10px] text-stone-400">
                Rejim: {runtimeDiag.mode} · PID {runtimeDiag.processId}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
              <div className="text-[11px] text-stone-500">Faol Instansiyalar / 409 Konflikt</div>
              <div
                className={`text-lg font-bold ${
                  runtimeDiag.polling.multiInstanceConflictDetected || runtimeDiag.outdatedInstancesDetected
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {runtimeDiag.activeInstanceCount} ta / {runtimeDiag.polling.conflictCount} konflikt
              </div>
              <div className="text-[10px] text-stone-400">
                Eski instansiya: {runtimeDiag.outdatedInstancesDetected ? 'ANIQLANDI!' : 'Yoʻq'}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70">
              <div className="text-[11px] text-stone-500">Bot Javob Tezligi (p50 / p95 / p99)</div>
              <div className="text-base font-bold text-stone-900 dark:text-stone-100">
                {runtimeDiag.performance.overall.p50Ms} / {runtimeDiag.performance.overall.p95Ms} / {runtimeDiag.performance.overall.p99Ms} ms
              </div>
              <div className="text-[10px] text-stone-400">
                Qayta ishlangan: {runtimeDiag.performance.totalProcessed} · Dedupe: {runtimeDiag.performance.deduplicatedUpdates}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-1.5">
              <div className="font-bold text-stone-900 dark:text-stone-100">Instansiya va Deployment Identifikatori</div>
              <div className="font-mono text-[11px] text-stone-600 dark:text-stone-300">Instance: {runtimeDiag.instanceId}</div>
              <div className="font-mono text-[11px] text-stone-600 dark:text-stone-300">Deployment: {runtimeDiag.deploymentId} · Commit: {runtimeDiag.gitCommit}</div>
              <div className="text-stone-500">Oxirgi Firestore oʻqish: {runtimeDiag.lastFirestoreReadAt || 'Hali yoʻq'}</div>
              <div className="text-stone-500">Oxirgi Firestore yozish: {runtimeDiag.lastFirestoreWriteAt || 'Hali yoʻq'}</div>
              <div className="text-stone-500">Uptime: {runtimeDiag.uptimeSec}s · Parallel navbatlar: {runtimeDiag.performance.activeUserQueues}</div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-1.5">
              <div className="font-bold text-stone-900 dark:text-stone-100">Rollback Himoyasi Ogohlantirishlari ({runtimeDiag.rollbackWarnings.length})</div>
              {runtimeDiag.rollbackWarnings.length === 0 ? (
                <div className="text-emerald-600 dark:text-emerald-400">
                  Barcha konfiguratsiya va emoji versiyalari barqaror — hech qanday rollback urinishi qayd etilmagan.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {runtimeDiag.rollbackWarnings.slice(0, 8).map((w) => (
                    <div key={w.id} className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300">
                      <div className="font-mono font-bold">[{w.target}] v{w.incomingVersion} &lt; v{w.currentVersion}</div>
                      <div>{w.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Change History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-emerald-950 text-xs text-stone-500 text-center">
              Hozircha emoji oʻzgarishlari tarixi qayd etilmagan.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-emerald-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 dark:bg-[#071614] text-stone-600 dark:text-stone-300">
                  <tr>
                    <th className="py-2 px-3">Vaqt</th>
                    <th className="py-2 px-3">Amal</th>
                    <th className="py-2 px-3">Kategoriya / Slot</th>
                    <th className="py-2 px-3">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                  {history.map((log) => (
                    <tr key={log.id} className="bg-white dark:bg-[#091a18]">
                      <td className="py-2 px-3 font-mono text-[11px] text-stone-500">
                        <History className="w-3 h-3 inline mr-1" />
                        {log.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">{log.action}</td>
                      <td className="py-2 px-3 font-mono text-[11px] font-semibold">
                        {log.targetId || '-'}
                      </td>
                      <td className="py-2 px-3 text-stone-500">{log.actorTelegramId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
