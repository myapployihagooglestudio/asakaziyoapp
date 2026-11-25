import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  ASAKA_CANONICAL_CITY_ID,
  AsrMethodId,
  CalculationMethodId,
  HighLatitudeRuleId,
  MidnightModeId,
  UZBEKISTAN_14_REGIONS,
} from '../../../data/globalLocationsData';
import {
  ShieldCheck,
  Globe,
  Cloud,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Trash2,
  Calendar,
  Activity,
  History,
  Settings,
  Loader2,
} from 'lucide-react';

interface GlobalPrayerWeatherAdminPanelProps {
  getAdminToken: () => string | null;
  onAsakaScheduleReload?: () => void;
}

export const GlobalPrayerWeatherAdminPanel: React.FC<GlobalPrayerWeatherAdminPanelProps> = ({
  getAdminToken,
  onAsakaScheduleReload,
}) => {
  const [subTab, setSubTab] = useState<'asaka' | 'uzbekistan' | 'global' | 'weather' | 'logs'>('asaka');
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Asaka Future Date Form
  const [futureDate, setFutureDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [futureTimes, setFutureTimes] = useState({
    tahajjud: '04:05',
    subh: '04:55',
    bomdod: '05:25',
    quyosh: '06:45',
    peshin: '12:25',
    asr: '15:50',
    shom: '17:45',
    xufton: '19:10',
  });
  const [asakaImportJson, setAsakaImportJson] = useState('');

  // Uzbekistan Official Table Import
  const [importRegionId, setImportRegionId] = useState(UZBEKISTAN_14_REGIONS[13].regionId);
  const [importSourceName, setImportSourceName] = useState('O‘zbekiston musulmonlari idorasi (Fatvo.uz / Muslim.uz)');
  const [uzTableJson, setUzTableJson] = useState('');
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  // Global AUTO Settings
  const [globalCfg, setGlobalCfg] = useState<{
    defaultUzMethod: CalculationMethodId;
    defaultGlobalMethod: CalculationMethodId;
    defaultGlobalAsr: AsrMethodId;
    defaultHighLatitudeRule: HighLatitudeRuleId;
    defaultMidnightMode: MidnightModeId;
    preferOfficialUzLiveSync: boolean;
  }>({
    defaultUzMethod: 'UZBEKISTAN_OMI',
    defaultGlobalMethod: 'MWL',
    defaultGlobalAsr: 'HANAFI',
    defaultHighLatitudeRule: 'ANGLE_BASED',
    defaultMidnightMode: 'STANDARD',
    preferOfficialUzLiveSync: true,
  });

  const authHeaders = useCallback(() => {
    const token = getAdminToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getAdminToken]);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/global-prayer/overview', {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Global Prayer overview yuklanmadi');
      }
      setOverview(json.overview);
      if (json.overview?.globalAutoConfig) {
        setGlobalCfg({
          defaultUzMethod: json.overview.globalAutoConfig.defaultUzMethod,
          defaultGlobalMethod: json.overview.globalAutoConfig.defaultGlobalMethod,
          defaultGlobalAsr: json.overview.globalAutoConfig.defaultGlobalAsr,
          defaultHighLatitudeRule: json.overview.globalAutoConfig.defaultHighLatitudeRule,
          defaultMidnightMode: json.overview.globalAutoConfig.defaultMidnightMode,
          preferOfficialUzLiveSync: json.overview.globalAutoConfig.preferOfficialUzLiveSync,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setErrorMsg(null);
    window.setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleSaveAsakaFutureDate = async () => {
    try {
      const timesArr = [
        { key: 'tahajjud', nameUz: 'Tahajjud', nameAr: 'التهجد', time: futureTimes.tahajjud },
        { key: 'subh', nameUz: 'Subh (Saharlik)', nameAr: 'السحور', time: futureTimes.subh },
        { key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفجر', time: futureTimes.bomdod },
        { key: 'quyosh', nameUz: 'Quyosh', nameAr: 'الشروق', time: futureTimes.quyosh },
        { key: 'peshin', nameUz: 'Peshin', nameAr: 'الظهر', time: futureTimes.peshin },
        { key: 'asr', nameUz: 'Asr', nameAr: 'العصر', time: futureTimes.asr },
        { key: 'shom', nameUz: 'Shom', nameAr: 'المغرب', time: futureTimes.shom },
        { key: 'xufton', nameUz: 'Xufton', nameAr: 'العشاء', time: futureTimes.xufton },
      ];
      const res = await fetch('/api/admin/global-prayer/asaka/publish', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          futureDate,
          futureTimes: timesArr,
          note: `Kelgusi sana jadvali (${futureDate})`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Saqlashda xatolik');
      showToast(`Asaka ${futureDate} kelgusi sanasi MANUAL_ADMIN arxiviga saqlandi.`);
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Xatolik');
    }
  };

  const handleRollbackAsaka = async (versionId: string) => {
    try {
      const res = await fetch('/api/admin/global-prayer/asaka/rollback', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Rollback xatoligi');
      showToast('Asaka jadvali oldingi tasdiqlangan versiyaga muvaffaqiyatli qaytarildi!');
      loadOverview();
      onAsakaScheduleReload?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Rollback xatoligi');
    }
  };

  const handleExportAsakaJson = () => {
    if (!overview?.asakaManual) return;
    const payload = {
      cityId: ASAKA_CANONICAL_CITY_ID,
      sourceMode: 'MANUAL_ADMIN',
      exportedAt: new Date().toISOString(),
      currentSchedule: overview.asakaManual.currentSchedule,
      futureDates: overview.asakaManual.futureDates,
      versions: overview.asakaManual.versions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asaka_manual_prayer_schedule_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Asaka MANUAL jadvali JSON fayl sifatida eksport qilindi.');
  };

  const handleImportAsakaJson = async () => {
    try {
      const parsed = JSON.parse(asakaImportJson);
      const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
      if (!Array.isArray(entries)) throw new Error('JSON format: [{ "date": "2026-12-01", "times": [...] }]');
      const res = await fetch('/api/admin/global-prayer/asaka/import', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ entries }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Import xatoligi');
      showToast(`${json.importedCount} kunlik Asaka MANUAL jadvali import qilindi.`);
      setAsakaImportJson('');
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'JSON tahlilida xatolik');
    }
  };

  const handleRunUzAudit = async () => {
    setIsRunningAudit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/global-prayer/verify-uzbekistan', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Audit xatoligi');
      showToast(
        `14 hudud tekshirildi: ${json.report.verifiedRegionsCount}/${json.report.totalRegionsCount} tasdiqlangan (${json.report.auditedDate}).`
      );
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification audit xatoligi');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleImportUzOfficialTable = async () => {
    try {
      const rows = JSON.parse(uzTableJson);
      if (!Array.isArray(rows)) {
        throw new Error('JSON massiv bo‘lishi kerak: [{ "date": "2026-11-25", "fajr": "05:55", "sunrise": "07:20", "dhuhr": "12:15", "asr": "15:10", "maghrib": "17:02", "isha": "18:24" }]');
      }
      const res = await fetch('/api/admin/global-prayer/uzbekistan/import', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          regionId: importRegionId,
          sourceName: importSourceName,
          rows,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Import xatoligi');
      showToast(`${json.importedCount} kunlik rasmiy O‘MI jadvali yuklandi (Asaka MANUAL o‘zgarmadi).`);
      setUzTableJson('');
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'JSON import xatoligi');
    }
  };

  const handleSaveGlobalConfig = async () => {
    try {
      const res = await fetch('/api/admin/global-prayer/config', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(globalCfg),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Sozlamalarni saqlashda xatolik');
      showToast('Global AUTO sozlamalari saqlandi. Asaka MANUAL jadvali daxlsiz qoldi!');
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Xatolik');
    }
  };

  const handleClearCaches = async () => {
    try {
      const res = await fetch('/api/admin/global-prayer/weather-cache/clear', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Keshni tozalashda xatolik');
      showToast(
        `Kesh tozalandi: Weather (${json.weatherCleared}) va AUTO Prayer (${json.prayerCleared}). Asaka MANUAL saqlanib qoldi.`
      );
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Xatolik');
    }
  };

  return (
    <Card elevated className="p-6 space-y-6 mt-6 border-[#C8A85E]/35">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            <span>Global Namoz Vaqtlari & Ob-havo Boshqaruv Markazi (2026)</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Asaka MANUAL versiyalar/rollback · O‘zbekiston 14 hudud O‘MI tekshiruvi · Global AUTO · Open-Meteo Telemetry
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOverview} disabled={isLoading} className="text-xs gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </Button>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-[#071411] border border-stone-200 dark:border-white/10 text-xs">
        {[
          { id: 'asaka' as const, label: 'Asaka MANUAL & Rollback', icon: ShieldCheck },
          { id: 'uzbekistan' as const, label: 'O‘zbekiston 14 Hudud (Audit)', icon: CheckCircle2 },
          { id: 'global' as const, label: 'Global AUTO & Metodlar', icon: Settings },
          { id: 'weather' as const, label: 'Ob-havo API & Kesh', icon: Cloud },
          { id: 'logs' as const, label: 'Audit & Xatoliklar', icon: History },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                active
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-semibold text-rose-800 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      {/* SUBTAB 1: ASAKA MANUAL FUTURE DATES, IMPORT/EXPORT, VERSION HISTORY & ROLLBACK */}
      {subTab === 'asaka' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>ASAKA HIMOYA REJIMI: sourceMode = MANUAL_ADMIN</span>
              </div>
              <div className="text-stone-600 dark:text-stone-300">
                AUTO astronomik hisob-kitob va tashqi APIlar Asaka vaqtlarini hech qachon o‘zgartira olmaydi.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportAsakaJson} className="text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>JSON Eksport</span>
            </Button>
          </div>

          {/* Future Date Entry */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C8A85E]" />
                <span>Kelgusi sana uchun Asaka MANUAL vaqtlarini oldindan kiritish</span>
              </div>
              <input
                type="date"
                value={futureDate}
                onChange={(e) => setFutureDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613] text-xs font-mono-numbers"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {(Object.keys(futureTimes) as Array<keyof typeof futureTimes>).map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-[11px] uppercase font-semibold text-stone-500">{k}</label>
                  <input
                    type="time"
                    value={futureTimes[k]}
                    onChange={(e) => setFutureTimes((prev) => ({ ...prev, [k]: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613] font-mono-numbers"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleSaveAsakaFutureDate} className="text-xs">
                Kelgusi Sana Jadvalini Saqlash
              </Button>
            </div>
          </div>

          {/* Version History & Rollback */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-[#C8A85E]" />
              <span>Asaka Tasdiqlangan Versiyalar Tarixi va 1-Bosishda Qaytish (Rollback)</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(overview?.asakaManual?.versions || []).map((v: any) => (
                <div
                  key={v.versionId}
                  className="p-3 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold">
                      v{v.versionNumber} · {v.date} ({v.publishedBy})
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      {v.note || 'Tasdiqlangan jadval'} · {v.publishedAt?.slice(0, 19).replace('T', ' ')}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollbackAsaka(v.versionId)}
                    className="text-[11px] gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Shu versiyaga qaytish</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk JSON Import */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-white/10 space-y-2.5">
            <div className="text-xs font-bold flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#C8A85E]" />
              <span>Asaka Oylik / Ko‘p Kunlik JSON Import</span>
            </div>
            <textarea
              rows={3}
              value={asakaImportJson}
              onChange={(e) => setAsakaImportJson(e.target.value)}
              placeholder='[{"date":"2026-12-01","times":[{"key":"bomdod","nameUz":"Bomdod","nameAr":"الفجر","time":"05:45"},...]}]'
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleImportAsakaJson} className="text-xs">
                JSON Import Qilish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: UZBEKISTAN 14 REGIONS VERIFICATION AUDIT & OFFICIAL TABLE IMPORT */}
      {subTab === 'uzbekistan' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200 dark:border-white/10">
            <div className="text-xs space-y-1">
              <div className="font-bold">
                O‘zbekiston 14 Hududi — Fatvo.uz / Muslim.uz / Namoz-vaqti.uz / Islomapi.uz Tekshiruvi
              </div>
              <div className="text-stone-500 dark:text-stone-400">
                Ruxsatsiz scraping ishlatilmaydi. Faqat ochiq API va Admin yuklagan O‘MI jadvallari orqali daqiqalik taqqoslash o‘tkaziladi.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={isRunningAudit}
              onClick={handleRunUzAudit}
              className="text-xs gap-1.5 shrink-0"
            >
              {isRunningAudit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              <span>14 Hudud Auditini Ishga Tushirish</span>
            </Button>
          </div>

          {/* Official Sources Live Probe Table */}
          {overview?.lastUzbekistanAudit?.sources && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {overview.lastUzbekistanAudit.sources.map((src: any) => (
                <div
                  key={src.url}
                  className="p-3 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#081613] text-xs space-y-1"
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{src.name}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        src.hasDocumentedPublicJsonApi ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      HTTP {src.httpStatus ?? 'ERR'}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                    {src.notes}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 14 Regions Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-100 dark:bg-[#0B1B17] text-[11px] uppercase font-bold border-b border-stone-200 dark:border-white/10">
                  <th className="p-3">#</th>
                  <th className="p-3">Hudud</th>
                  <th className="p-3">Shahar/Tuman</th>
                  <th className="p-3">Holat (Verified)</th>
                  <th className="p-3">Max Farq (daq)</th>
                  <th className="p-3">Manba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-white/10">
                {(overview?.uzbekistan14Regions || []).map((r: any, idx: number) => (
                  <tr key={r.regionId}>
                    <td className="p-3 font-mono-numbers">{idx + 1}</td>
                    <td className="p-3 font-semibold">{r.regionName}</td>
                    <td className="p-3 font-mono-numbers">
                      {r.citiesCount} shahar · {r.districtsCount} tuman
                    </td>
                    <td className="p-3">
                      {r.verified ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Tasdiqlangan
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Tekshirilmagan / Farq bor
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono-numbers">
                      {r.maxAbsDiffMinutes !== null ? `±${r.maxAbsDiffMinutes} daq` : '—'}
                    </td>
                    <td className="p-3 text-[11px] text-stone-500 dark:text-stone-400">
                      {r.referenceSource}
                      {r.importedDaysCount > 0 ? ` (+${r.importedDaysCount} kun import)` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Admin Official O'MI Table Import */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-white/10 space-y-3">
            <div className="text-xs font-bold">
              Rasmiy O‘MI (Fatvo.uz / Muslim.uz) Jadvalini Hudud Bo‘yicha Import Qilish
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={importRegionId}
                onChange={(e) => setImportRegionId(e.target.value)}
                className="p-2 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613] text-xs"
              >
                {UZBEKISTAN_14_REGIONS.map((r) => (
                  <option key={r.regionId} value={r.regionId}>
                    {r.regionName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={importSourceName}
                onChange={(e) => setImportSourceName(e.target.value)}
                className="p-2 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613] text-xs"
              />
            </div>
            <textarea
              rows={3}
              value={uzTableJson}
              onChange={(e) => setUzTableJson(e.target.value)}
              placeholder='[{"date":"2026-11-25","fajr":"05:57","sunrise":"07:22","dhuhr":"12:19","asr":"15:11","maghrib":"17:02","isha":"18:24"}]'
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleImportUzOfficialTable} className="text-xs">
                Rasmiy Hudud Jadvalini Yuklash
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: GLOBAL AUTO METHODS & SETTINGS */}
      {subTab === 'global' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Bu sozlamalar faqat AUTO_CALCULATED (O‘zbekiston viloyatlari va dunyo shaharlari) uchun qo‘llanadi. Asaka MANUAL_ADMIN jadvali daxlsiz qoladi.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold">O‘zbekiston AUTO usuli</label>
              <select
                value={globalCfg.defaultUzMethod}
                onChange={(e) =>
                  setGlobalCfg((p) => ({ ...p, defaultUzMethod: e.target.value as CalculationMethodId }))
                }
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
              >
                <option value="UZBEKISTAN_OMI">O‘zbekiston O‘MI (Hanafiy)</option>
                <option value="MWL">Muslim World League (MWL)</option>
                <option value="KARACHI">Karachi (18°/18°)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Global standart usul</label>
              <select
                value={globalCfg.defaultGlobalMethod}
                onChange={(e) =>
                  setGlobalCfg((p) => ({ ...p, defaultGlobalMethod: e.target.value as CalculationMethodId }))
                }
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
              >
                <option value="MWL">Muslim World League (MWL)</option>
                <option value="UMM_AL_QURA">Umm al-Qura (Makkah)</option>
                <option value="DIYANET_TURKEY">Diyanet (Turkiya)</option>
                <option value="DUBAI">Dubai / BAA</option>
                <option value="ISNA">ISNA (Shimoliy Amerika)</option>
                <option value="EGYPT">Egypt General Authority</option>
                <option value="KARACHI">Karachi</option>
                <option value="RUSSIA_DUM">Rossiya DUM</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Asr mazhabi (Global)</label>
              <select
                value={globalCfg.defaultGlobalAsr}
                onChange={(e) => setGlobalCfg((p) => ({ ...p, defaultGlobalAsr: e.target.value as AsrMethodId }))}
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
              >
                <option value="HANAFI">Hanafiy (2x soya)</option>
                <option value="STANDARD">Standart (Shofeiy/Molikiy/Hanbaliy)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Yuqori kenglik qoidasi (High-Lat)</label>
              <select
                value={globalCfg.defaultHighLatitudeRule}
                onChange={(e) =>
                  setGlobalCfg((p) => ({ ...p, defaultHighLatitudeRule: e.target.value as HighLatitudeRuleId }))
                }
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
              >
                <option value="ANGLE_BASED">Burchak asosida (Angle-based)</option>
                <option value="ONE_SEVENTH">Tun 1/7 qismi</option>
                <option value="MIDDLE_OF_THE_NIGHT">Tun yarmi</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Yarim tun rejimi (Midnight)</label>
              <select
                value={globalCfg.defaultMidnightMode}
                onChange={(e) =>
                  setGlobalCfg((p) => ({ ...p, defaultMidnightMode: e.target.value as MidnightModeId }))
                }
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#081613]"
              >
                <option value="STANDARD">Standart (Quyosh botishidan chiqishigacha)</option>
                <option value="JAFARI">Jafari (Quyosh botishidan Bomdodgacha)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={globalCfg.preferOfficialUzLiveSync}
                onChange={(e) => setGlobalCfg((p) => ({ ...p, preferOfficialUzLiveSync: e.target.checked }))}
              />
              <span>O‘zbekiston hududlari uchun Namoz-vaqti.uz rasmiy sinxronizatsiyasi</span>
            </label>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveGlobalConfig} className="text-xs">
              Global AUTO Sozlamalarini Saqlash
            </Button>
          </div>
        </div>
      )}

      {/* SUBTAB 4: WEATHER API HEALTH, QUOTA & CACHE */}
      {subTab === 'weather' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10">
              <div className="text-stone-500">Bugungi API chaqiruvlar</div>
              <div className="text-xl font-bold az-type-numeric mt-1">
                {overview?.weatherTelemetry?.dailyRequestsUsed ?? 0} /{' '}
                {overview?.weatherTelemetry?.dailyQuotaLimit ?? 10000}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10">
              <div className="text-stone-500">Kesh xitlari / Kesh hajmi</div>
              <div className="text-xl font-bold az-type-numeric mt-1">
                {overview?.weatherTelemetry?.cacheHits ?? 0} / {overview?.weatherTelemetry?.cacheEntries ?? 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10">
              <div className="text-stone-500">So‘rov xatoliklari</div>
              <div className="text-xl font-bold az-type-numeric mt-1">
                {overview?.weatherTelemetry?.failedRequests ?? 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10">
              <div className="text-stone-500">Sinxronlangan foydalanuvchilar</div>
              <div className="text-xl font-bold az-type-numeric mt-1">
                {overview?.syncedUsersCount ?? 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold">Open-Meteo Free Tier Policy (CC BY 4.0)</div>
              <div className="text-stone-600 dark:text-stone-300">
                Notijorat bepul limit: 10 000 so‘rov/kun · 5 000/soat · 600/daq · 15 daqiqa SWR server keshi faol.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCaches} className="text-xs gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Weather & AUTO Keshni Tozalash</span>
            </Button>
          </div>
        </div>
      )}

      {/* SUBTAB 5: AUDIT & ERROR MONITOR */}
      {subTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="font-bold">Audit Log (So‘nggi 50 amal)</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {(overview?.auditLogs || []).map((a: any) => (
                <div key={a.id} className="p-2.5 rounded-lg border border-stone-200 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                    <span>
                      [{a.scope}] {a.action} · {a.actor}
                    </span>
                    <span>{a.timestamp?.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  <div className="mt-0.5 text-stone-700 dark:text-stone-300">{a.details}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold">Xatoliklar Monitori</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {(overview?.errorLogs || []).length === 0 ? (
                <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Faol tizim xatoliklari qayd etilmagan.
                </div>
              ) : (
                (overview?.errorLogs || []).map((e: any) => (
                  <div key={e.id} className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
                    <div className="font-mono text-[10px] text-rose-500">
                      [{e.component}] {e.timestamp?.slice(0, 19).replace('T', ' ')}
                    </div>
                    <div className="mt-0.5">{e.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
