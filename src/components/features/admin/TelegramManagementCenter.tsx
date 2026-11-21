import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Smartphone,
  Terminal,
  ShieldCheck,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { getActiveAdminToken } from '../../../utils/firebaseClient';
import { PremiumEmojiManagerPanel } from './PremiumEmojiManagerPanel';

interface PlatformHealth {
  status?: string;
  botUsername?: string;
  mode?: string;
  tokenConfigured?: boolean;
  stats?: {
    totalUsers?: number;
    activeUsers?: number;
    blockedUsers?: number;
    totalBookmarks?: number;
    pendingSupportTickets?: number;
  };
  sync?: {
    pending?: number;
    processing?: number;
    completed?: number;
    delivered?: number;
    failed?: number;
    deadLetter?: number;
    workerRunning?: boolean;
  };
}

interface SyncOutboxItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  title?: string;
  payload?: { title?: string };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  attempts: number;
  lastError?: string;
  updatedAt: string;
}

interface ReleaseSummary {
  version: string;
  buildCode: number;
  packageId: string;
  apkAvailable: boolean;
  signed: boolean;
  apksignerVerified: boolean;
  fileSizeDisplay: string;
  sha256Checksum: string;
  downloadCount?: number;
  source?: string;
  status?: string;
  statusMessageUz?: string;
}

export const TelegramManagementCenter: React.FC = () => {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [outbox, setOutbox] = useState<SyncOutboxItem[]>([]);
  const [release, setRelease] = useState<ReleaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getActiveAdminToken();
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const [hRes, sRes, rRes] = await Promise.all([
        fetch('/api/telegram/platform/health', { cache: 'no-store' }),
        fetch('/api/telegram/platform/sync/status', { headers, cache: 'no-store' }),
        fetch('/api/apk/info', { cache: 'no-store' }),
      ]);

      if (hRes.ok) {
        const hJson = await hRes.json();
        setHealth(hJson);
      }
      if (sRes.ok) {
        const sJson = await sRes.json();
        const events = Array.isArray(sJson.recentEvents)
          ? sJson.recentEvents
          : Array.isArray(sJson.events)
          ? sJson.events
          : [];
        setOutbox(events.slice(0, 12));
      }
      if (rRes.ok) {
        const rJson = await rRes.json();
        setRelease(rJson.apk || rJson);
      }
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Platforma maʼlumotlarini yuklashda xatolik.' });
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSyncCommands = async () => {
    setActionBusy('commands');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/commands/sync', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'BotFather komandalarini sinxronlashda xatolik.');
      }
      setNotice({ type: 'ok', text: 'BotFather komandalari va menyu muvaffaqiyatli sinxronlandi.' });
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Xatolik yuz berdi.' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleRetryFailed = async () => {
    setActionBusy('retry');
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/platform/sync/retry-failed', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Qayta yuborishda xatolik.');
      }
      setNotice({
        type: 'ok',
        text: `Qayta yuborishga navbatga qoʻshildi: ${json.retriedCount ?? 0} ta hodisa.`,
      });
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err?.message || 'Xatolik yuz berdi.' });
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-6">
    <Card elevated className="p-6 space-y-6 border border-[#c5a869]/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>ASAKA ZIYO Unified Ecosystem V4 — Telegram & Android Sinxronizatsiya Markazi</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Web App, Android APK v4.0.0 va Telegram Bot oʻrtasidagi yagona maʼlumotlar oqimi, Outbox navbati va reliz nazorati.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncCommands}
            disabled={actionBusy === 'commands'}
          >
            <Terminal className="w-3.5 h-3.5 mr-1" />
            <span>BotFather Menyu Sinxron</span>
          </Button>
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
          {notice.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span>Telegram Bot Holati</span>
            <Send className="w-4 h-4 text-[#c5a869]" />
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {health?.tokenConfigured ? 'Faol (TELEGRAM_BOT_TOKEN1)' : 'Token kutilmoqda'}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>Rejim: {health?.mode || 'polling'}</span>
            <span>Foydalanuvchilar: {health?.stats?.totalUsers ?? 0}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span>Android APK Reliz</span>
            <Smartphone className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>v{release?.version || '4.0.0'} (Build {release?.buildCode || 400})</span>
            {release?.apkAvailable && release?.signed && (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>{release?.apkAvailable ? `Tayyor · ${release.fileSizeDisplay}` : 'Tayyorlanmoqda'}</span>
            <span>Yuklab olishlar: {release?.downloadCount ?? 0}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span>Sinxronizatsiya Navbati (Outbox)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {health?.sync?.completed ?? health?.sync?.delivered ?? 0} yetkazildi · {(health?.sync?.failed ?? 0) + (health?.sync?.deadLetter ?? 0)} xato
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>Kutilmoqda: {health?.sync?.pending ?? 0}</span>
            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={actionBusy === 'retry'}
              className="text-[#c5a869] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xatolarni qayta urinish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sync Outbox Table */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Soʻnggi Avtomatik Sinxronizatsiya Hodisalari
        </div>
        {outbox.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-emerald-950 text-xs text-stone-500 dark:text-stone-400 text-center">
            Hozircha sinxronizatsiya hodisalari qayd etilmagan. Admin panelda maqola, eʼlon, yangilik yoki namoz vaqti saqlanganda bu yerda koʻrinadi.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-emerald-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-[#071614] text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="py-2 px-3">Tur</th>
                  <th className="py-2 px-3">Amal</th>
                  <th className="py-2 px-3">Sarlavha / ID</th>
                  <th className="py-2 px-3">Holat</th>
                  <th className="py-2 px-3">Urinish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-emerald-950/60">
                {outbox.map((ev) => (
                  <tr key={ev.id} className="bg-white dark:bg-[#091a18]">
                    <td className="py-2 px-3 font-mono text-[11px]">{ev.entityType}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{ev.action}</td>
                    <td className="py-2 px-3 max-w-[260px] truncate">{ev.payload?.title || ev.title || ev.entityId}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ev.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : ev.status === 'pending' || ev.status === 'processing'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-stone-500">{ev.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
    <PremiumEmojiManagerPanel />
    </div>
  );
};
