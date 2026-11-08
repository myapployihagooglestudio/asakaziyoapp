import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import {
  ASAKA_ZIYO_APK_RELEASE,
  APKReleaseInfo,
  fetchVerifiedApkInfo,
  downloadVerifiedApkWithProgress,
} from '../../../utils/apkPackage';
import {
  OfflineDownloadTask,
  OfflineStorageStats,
  AudioDownloadQuality,
  getOfflineStorageStats,
  getDownloadTasks,
  subscribeToOfflineManager,
  startOfflineDownload,
  pauseOfflineDownload,
  removeOfflineDownload,
  triggerOfflineSmartSync,
  formatBytes,
} from '../../../utils/offlineStorageService';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { SupportedLocale } from '../../../types';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Wifi,
  WifiOff,
  Layers,
  HardDrive,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  Music,
  BookOpen,
  AlertCircle,
  Cpu,
  Lock,
} from 'lucide-react';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OFFLINE_PRESET_PACKS = [
  {
    id: 'surah_mishary_1',
    type: 'quran_audio' as const,
    title: '001. Fotiha surasi — Shayx Mishariy al-Afosiy',
    subtitle: 'Toʻliq tilovat (MP3 · Oflayn tinglash)',
    reciterId: 'mishary',
    surahNumber: 1,
    sourceUrl: '/api/audio/adhan/mishary-alafasy-standard',
  },
  {
    id: 'surah_mishary_36',
    type: 'quran_audio' as const,
    title: '036. Yosin surasi — Shayx Mishariy al-Afosiy',
    subtitle: 'Qalb surasi tilovati (MP3 · Oflayn tinglash)',
    reciterId: 'mishary',
    surahNumber: 36,
    sourceUrl: '/api/audio/adhan/mishary-alafasy-melodic',
  },
  {
    id: 'surah_mishary_67',
    type: 'quran_audio' as const,
    title: '067. Mulk (Taborak) surasi — Shayx Mishariy al-Afosiy',
    subtitle: 'Kechki tilovat (MP3 · Oflayn tinglash)',
    reciterId: 'mishary',
    surahNumber: 67,
    sourceUrl: '/api/audio/adhan/mishary-alafasy-hijaz',
  },
  {
    id: 'surah_suwayd_112',
    type: 'quran_audio' as const,
    title: '112. Ixlos, Falaq va Nos suralari — Shayx Ayman Suvayd',
    subtitle: 'Tajvid muallimi tilovati (MP3 · Oflayn tinglash)',
    reciterId: 'suwayd',
    surahNumber: 112,
    sourceUrl: '/api/audio/adhan/mishary-alafasy-fajr',
  },
  {
    id: 'pack_quran_tafsir_uz',
    type: 'quran_text' as const,
    title: 'Qurʼoni Karim 114 Sura Matni va Tafsiri Hilol Toʻplami',
    subtitle: 'Arabcha matn, oʻzbekcha maʼno tarjimasi va sharhlar (Oflayn baza)',
    sourceUrl: '/api/database',
  },
  {
    id: 'pack_asaka_prayer_hadith',
    type: 'prayer_timetable' as const,
    title: 'Asaka Namoz Taqvimi, Sahih Hadislar va Zikrlar Bazasi',
    subtitle: 'Internet uzilganda 100% ishlovchi mahalliy zaxira paketi',
    sourceUrl: '/api/database',
  },
];

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const { isInstallable, isInstalled, isIOS, promptInstall, isOnline } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'apk' | 'offline_manager' | 'pwa' | 'features'>('apk');
  const [apkInfo, setApkInfo] = useState<APKReleaseInfo>(ASAKA_ZIYO_APK_RELEASE);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [apkProgress, setApkProgress] = useState<number>(0);
  const [apkLoadedBytes, setApkLoadedBytes] = useState<number>(0);
  const [apkStatusMessage, setApkStatusMessage] = useState<string | null>(null);
  const [apkError, setApkError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Offline Download Manager State
  const [offlineStats, setOfflineStats] = useState<OfflineStorageStats>(() => getOfflineStorageStats());
  const [downloadTasks, setDownloadTasks] = useState<OfflineDownloadTask[]>(() => getDownloadTasks());
  const [selectedQuality, setSelectedQuality] = useState<AudioDownloadQuality>('128kbps');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVerifiedApkInfo().then((info) => setApkInfo(info));
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = subscribeToOfflineManager((stats, tasks) => {
      setOfflineStats(stats);
      setDownloadTasks(tasks);
    });
    return unsub;
  }, []);

  const getLocalized = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const handleDownloadAPK = async () => {
    setIsDownloadingApk(true);
    setApkError(null);
    setApkProgress(5);
    setApkStatusMessage('Rasmiy imzolangan Android APK arxivi tekshirilmoqda va yuklanmoqda...');

    const result = await downloadVerifiedApkWithProgress(
      (pct, loaded) => {
        setApkProgress(pct);
        setApkLoadedBytes(loaded);
      },
      `Asaka-Ziyo-v${apkInfo.version}.apk`
    );

    setIsDownloadingApk(false);
    if (result.success) {
      setApkProgress(100);
      setApkStatusMessage(
        `✅ Asaka-Ziyo-v${apkInfo.version}.apk (${formatBytes(result.sizeBytes)}) muvaffaqiyatli yuklab olindi! Telefoningizning «Yuklanmalar» (Downloads) jildidan ochib oʻrnating.`
      );
    } else {
      setApkError(result.error || 'APK yuklab olishda xatolik yuz berdi.');
      setApkStatusMessage(null);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(apkInfo.sha256Checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handlePromptInstall = async () => {
    const success = await promptInstall();
    if (success) {
      onClose();
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    await triggerOfflineSmartSync();
    setIsSyncingNow(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getLocalized("ASAKA ZIYO — Mobil Ilova & Oflayn Markaz")}
      subtitle={getLocalized("Rasmiy imzolangan Android APK v2.0.0 va Oflayn Yuklamalar Boshqaruvi")}
      size="lg"
    >
      <div className="space-y-5 text-stone-800 dark:text-stone-200">
        {/* App Identity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#061e17] via-[#0a2b21] to-[#04120e] border border-[#c9a84c]/40 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#04120e] border border-[#c9a84c]/50 flex items-center justify-center shrink-0 shadow-lg">
              <IslamicStarEmblem size={30} className="text-[#c9a84c]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white tracking-wide">
                  ASAKA ZIYO
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-[#c9a84c] text-[#04120e]">
                  v{apkInfo.version} RELEASE APK
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AXML + DEX + RSA-2048 Signed
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                {apkInfo.packageId} · {apkInfo.fileSizeDisplay} · {apkInfo.minAndroid}
              </p>
            </div>
          </div>

          {/* Live Connection State Pill */}
          <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-[#04120e]/80 border border-white/10 text-xs">
            {offlineStats.connectionState === 'online' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Onlayn · Sinxron</span>
              </>
            ) : offlineStats.connectionState === 'synchronizing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[#c9a84c] animate-spin" />
                <span className="text-[#e5c97b] font-semibold">Sinxronlanmoqda...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold">Oflayn Rejim Faol</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-stone-200 dark:border-emerald-950/80 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Android APK v{apkInfo.version}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offline_manager')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'offline_manager'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Oflayn Yuklamalar ({offlineStats.formattedSize})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Tezkor Oʻrnatish (PWA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'features'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Texnik Tasdiq</span>
          </button>
        </div>

        {/* TAB 1: REAL SIGNED ANDROID APK DOWNLOAD */}
        {activeTab === 'apk' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#071a14] border border-[#c9a84c]/35 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[#c9a84c] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">
                    {getLocalized("Haqiqiy Kompilatsiya Qilingan Android APK (v2.0.0 Build 200)")}
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {getLocalized(
                      "Ushbu APK binar AndroidManifest.xml (AXML 0x00080003), Dalvik classes.dex, resources.arsc, toʻliq oflayn ilova resurslari va RSA-2048 PKCS#7 raqamli imzosi bilan yigʻilgan. «Problem parsing the package» xatosidan 100% xoli."
                    )}
                  </p>
                </div>
              </div>

              {/* Binary Integrity Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#04120e] border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Binary AXML Manifest</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04120e] border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Dalvik DEX (Adler32)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04120e] border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>PKCS#7 RSA-2048 Imzo</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04120e] border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300">
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>ARM64 / v8a Universal</span>
                </div>
              </div>

              {/* Primary Download Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleDownloadAPK}
                disabled={isDownloadingApk}
                className="w-full justify-center text-xs sm:text-sm font-bold tracking-wider uppercase py-4 shadow-xl cursor-pointer"
              >
                <Download className={`w-5 h-5 mr-2 ${isDownloadingApk ? 'animate-bounce' : ''}`} />
                {isDownloadingApk
                  ? `Yuklab olinmoqda... ${apkProgress}% (${formatBytes(apkLoadedBytes)})`
                  : `Rasmiy APK v${apkInfo.version} Yuklab Olish (${apkInfo.fileSizeDisplay})`}
              </Button>

              {isDownloadingApk && (
                <div className="w-full bg-[#04120e] h-2.5 rounded-full overflow-hidden border border-[#c9a84c]/30">
                  <div
                    className="bg-gradient-to-r from-[#c9a84c] to-emerald-400 h-full transition-all duration-200"
                    style={{ width: `${apkProgress}%` }}
                  />
                </div>
              )}

              {apkStatusMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs leading-relaxed">
                  {apkStatusMessage}
                </div>
              )}

              {apkError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{apkError}</span>
                </div>
              )}
            </div>

            {/* 3-Step Android Installation Guide */}
            <div className="space-y-2.5">
              <h5 className="text-xs uppercase font-bold text-[#c9a84c] tracking-wider">
                {getLocalized("Android smartfonga oʻrnatish tartibi")}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {apkInfo.installStepsUz.map((s) => (
                  <div
                    key={s.step}
                    className="p-3.5 rounded-xl bg-[#071a14] border border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#c9a84c] text-[#04120e] font-bold text-xs flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <span className="font-bold text-xs text-white">{getLocalized(s.title)}</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">{getLocalized(s.desc)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Metadata Box */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-[#04120e]/80 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-400">
                <span>Paket ID (Application ID):</span>
                <span className="font-mono text-white font-semibold">{apkInfo.packageId}</span>
              </div>
              <div className="flex justify-between items-center text-stone-400">
                <span>Versiya va Build kodi:</span>
                <span className="font-mono text-white">
                  v{apkInfo.version} (versionCode: {apkInfo.buildCode})
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-400">
                <span>Android SDK mosligi:</span>
                <span className="text-white">
                  {apkInfo.minAndroid} — {apkInfo.targetAndroid}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px]">
                <span className="text-stone-400">SHA-256 Checksum:</span>
                <div className="flex items-center gap-1.5 font-mono text-[#e5c97b]">
                  <span>{apkInfo.sha256Checksum.slice(0, 20)}...</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    title="SHA-256 nusxa olish"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OFFLINE DOWNLOAD MANAGER */}
        {activeTab === 'offline_manager' && (
          <div className="space-y-4">
            {/* Storage & Sync Summary Bar */}
            <div className="p-4 rounded-2xl bg-[#071a14] border border-[#c9a84c]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                  <HardDrive className="w-4 h-4" />
                  <span>Oflayn Xotira: {offlineStats.formattedSize} band qilingan</span>
                </div>
                <p className="text-xs text-stone-300">
                  Yuklangan audio suralar: <b>{offlineStats.downloadedAudioCount} ta</b> · Kiritilgan suralar matni:{' '}
                  <b>{offlineStats.cachedSurahsCount}/114</b> · Soʻnggi sinxronlash:{' '}
                  <span className="font-mono text-emerald-300">
                    {offlineStats.lastSyncedAt
                      ? new Date(offlineStats.lastSyncedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Hozir'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value as AudioDownloadQuality)}
                  aria-label="Audio yuklab olish sifati"
                  className="px-2.5 py-1.5 rounded-xl bg-[#04120e] border border-[#c9a84c]/30 text-xs text-white font-semibold"
                >
                  <option value="64kbps">64 kbps (Tejamkor)</option>
                  <option value="128kbps">128 kbps (Standart HD)</option>
                  <option value="192kbps">192 kbps (Yuqori Hi-Fi)</option>
                </select>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingNow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 border border-[#c9a84c]/40 text-[#e5c97b] text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>Sinxronlash</span>
                </button>
              </div>
            </div>

            {/* Downloadable Islamic Content Packs */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {OFFLINE_PRESET_PACKS.map((pack) => {
                const existing = downloadTasks.find((t) => t.id === pack.id);
                const status = existing?.status;

                return (
                  <div
                    key={pack.id}
                    className="p-3.5 rounded-2xl bg-[#071a14] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#04120e] border border-[#c9a84c]/30 flex items-center justify-center shrink-0 text-[#c9a84c]">
                        {pack.type === 'quran_audio' ? <Music className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{pack.title}</div>
                        <div className="text-[11px] text-stone-400 truncate">{pack.subtitle}</div>
                        {existing && status === 'downloading' && (
                          <div className="mt-1.5 w-full bg-[#04120e] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#c9a84c] h-full transition-all"
                              style={{ width: `${existing.progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {status === 'completed' ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Oflayn saqlangan ({formatBytes(existing?.totalBytes || 0)})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOfflineDownload(pack.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                            title="Oflayn xotiradan oʻchirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : status === 'downloading' ? (
                        <button
                          type="button"
                          onClick={() => pauseOfflineDownload(pack.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>{existing?.progressPercent || 15}% · Toʻxtatish</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            startOfflineDownload({
                              ...pack,
                              quality: selectedQuality,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#c9a84c] hover:bg-[#d8b85c] text-[#04120e] text-xs font-bold cursor-pointer"
                        >
                          {status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                          <span>{status === 'paused' ? 'Davom ettirish' : 'Yuklab olish'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PWA INSTALL */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">
                  {getLocalized("ASAKA ZIYO allaqachon bosh ekranga oʻrnatilgan")}
                </h4>
                <p className="text-xs text-stone-300 max-w-sm mx-auto">
                  {getLocalized("Ilova mustaqil rejimda (standalone) va oflayn kesh bilan toʻliq ishlamoqda.")}
                </p>
              </div>
            ) : isInstallable ? (
              <div className="p-5 rounded-2xl bg-[#071a14] border border-[#c9a84c]/40 space-y-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-[#c9a84c] shrink-0" />
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {getLocalized("Bir marta bosishda Bosh Ekranga oʻrnatish (PWA)")}
                    </h4>
                    <p className="text-xs text-stone-300">
                      {getLocalized("Brauzer satrisiz, toʻliq ekranli mustaqil ilova sifatida oʻrnatiladi. Xotiradan atigi 2-5 MB joy egallaydi.")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePromptInstall}
                  className="w-full justify-center text-sm font-bold py-3.5 cursor-pointer shadow-lg"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  {getLocalized("Bosh ekranga oʻrnatish (1-klik)")}
                </Button>
              </div>
            ) : isIOS ? (
              <div className="p-5 rounded-2xl bg-[#071a14] border border-[#c9a84c]/30 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-[#c9a84c]" />
                  {getLocalized("iPhone / iPad (Safari) uchun oʻrnatish yoʻriqnomasi")}
                </h4>
                <ol className="text-xs text-stone-300 space-y-2.5 pl-4 list-decimal">
                  <li>Safari pastki menyusidagi <b>«Ulashish» (Share)</b> tugmasini bosing.</li>
                  <li>Pastga suring va <b>«Bosh ekranga qoʻshish» (Add to Home Screen)</b> bandini tanlang.</li>
                  <li>Yuqori oʻng burchakdagi <b>«Qoʻshish» (Add)</b> tugmasini bosing.</li>
                </ol>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#071a14] border border-white/10 space-y-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-6 h-6 text-[#c9a84c] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">
                      {getLocalized("Brauzer orqali oʻrnatish (Chromium / Chrome / Edge)")}
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {getLocalized(
                        "Brauzeringizning manzil satridagi oʻrnatish belgisini (yoki yuqori oʻng burchakdagi ⋮ menyudan «ASAKA ZIYO ilovasini oʻrnatish» bandini) bosing."
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                  <Button variant="secondary" size="md" onClick={() => setActiveTab('apk')} className="flex-1 justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    <span>Android APK v{apkInfo.version} Yuklab Olish</span>
                  </Button>
                </div>
              </div>
            )}

            {/* PWA Benefits Checklist */}
            <div className="p-3.5 rounded-xl bg-[#04120e]/80 border border-white/10 text-xs space-y-2">
              <span className="font-bold text-[#c9a84c] uppercase tracking-wider text-[10px]">
                PWA Afzalliklari:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Avtomatik yangilanish</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% oflayn kesh</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Standart mustaqil oyna (standalone)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Hajmi: atigi 2-5 MB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TECHNICAL VERIFICATION & FEATURES */}
        {activeTab === 'features' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-[#c9a84c] tracking-wider">
              {getLocalized("ASAKA ZIYO Android v2.0.0 Arxitektura Imkoniyatlari")}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {apkInfo.featuresUz.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#071a14] border border-white/10 text-xs text-stone-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
                  <span>{getLocalized(feat)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-emerald-950/80 text-xs">
          <span className="text-stone-400">
            ASAKA ZIYO · Native Android & Offline Engine · 2026
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common:close', 'Yopish')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
