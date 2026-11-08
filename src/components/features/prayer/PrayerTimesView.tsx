import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PrayerSchedule, PrayerTimeEntry, SupportedLocale } from '../../../types';
import { MONTHLY_CALENDAR_PREVIEW } from '../../../data/prayerTimesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern, IslamicMihrabArch, CalligraphyBasmalahBadge } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  playGentleChime,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  subscribeToPrayerAlertSettings,
  subscribeToAdhanPlayerState,
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  seekAdhanAudio,
  setAdhanAudioVolume,
  ADHAN_TRACKS,
  getAdhanTrackById,
  PrayerAlertSettings,
  AdhanPlayerState,
  PrayerAzanMode,
} from '../../../utils/notificationService';
import {
  getNextPrayerCalculation,
  NextPrayerInfo,
  timeStringToSeconds,
  getCurrentTashkentSeconds,
} from '../../../utils/prayerTimeUtils';
import {
  Clock,
  Compass,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Info,
  MapPin,
  Navigation,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Bell,
  Volume2,
  VolumeX,
  BellOff,
  Check,
  Sliders,
  History,
  Play,
  Pause,
  Square,
  Music,
  Loader2,
} from 'lucide-react';

interface PrayerTimesViewProps {
  schedule: PrayerSchedule;
  onOpenAdmin: () => void;
  onOpenReminderDashboard: () => void;
}

export type AzonAlertMode = PrayerAzanMode;

function formatAudioSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  schedule,
  onOpenAdmin,
  onOpenReminderDashboard,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'qibla' | 'history'>('daily');
  const [prayerCalculation, setPrayerCalculation] = useState<NextPrayerInfo>(() =>
    getNextPrayerCalculation(schedule.times)
  );

  // Unified Prayer Alert & Adhan Audio Settings
  const [showAzanModal, setShowAzanModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState<PrayerAlertSettings>(() => getPrayerAlertSettings());
  const [playerState, setPlayerState] = useState<AdhanPlayerState>({
    playingTrackId: null,
    track: null,
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    progressPercent: 0,
    volume: 0.85,
    error: null,
  });

  useEffect(() => {
    const unsubSettings = subscribeToPrayerAlertSettings((updated) => {
      setAlertSettings(updated);
    });
    const unsubPlayer = subscribeToAdhanPlayerState((state) => {
      setPlayerState(state);
    });
    return () => {
      unsubSettings();
      unsubPlayer();
    };
  }, []);

  // Live dynamic countdown calculation for the actual next prayer
  useEffect(() => {
    const updateCountdown = () => {
      setPrayerCalculation(getNextPrayerCalculation(schedule.times));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [schedule.times]);

  const getLocalizedPrayerName = (key: string, defaultName: string) => {
    return t(`prayer:${key}`, { defaultValue: defaultName });
  };

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const getPrayerIcon = (key: string) => {
    switch (key) {
      case 'tahajjud':
      case 'xufton':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'subh':
      case 'bomdod':
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'quyosh':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'peshin':
      case 'asr':
        return <Sun className="w-5 h-5 text-[#c5a869]" />;
      case 'shom':
        return <Sunset className="w-5 h-5 text-orange-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#c5a869]" />;
    }
  };

  // Calculate circular progress percentage
  let progressPercent = 65;
  try {
    const { totalSeconds } = getCurrentTashkentSeconds();
    if (prayerCalculation.currentPrayer && prayerCalculation.nextPrayer) {
      const curSec = timeStringToSeconds(prayerCalculation.currentPrayer.time);
      const nxtSec = timeStringToSeconds(prayerCalculation.nextPrayer.time);
      if (nxtSec > curSec) {
        const total = nxtSec - curSec;
        const elapsed = totalSeconds - curSec;
        progressPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      }
    }
  } catch {
    // fallback
  }

  // SVG Circle calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const isFiveDailyPrayer = (key: string): key is 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton' => {
    return ['bomdod', 'peshin', 'asr', 'shom', 'xufton'].includes(key);
  };

  const getPrayerMode = (key: string): AzonAlertMode => {
    if (isFiveDailyPrayer(key)) {
      return alertSettings.individualPrayerModes?.[key] || (alertSettings.individualPrayerAlerts?.[key] === false ? 'off' : 'sound');
    }
    return 'silent';
  };

  const getPrayerTrackId = (key: string): string => {
    if (isFiveDailyPrayer(key)) {
      return alertSettings.perPrayerTracks?.[key] || alertSettings.selectedAdhanTrackId || 'mishary-alafasy-standard';
    }
    return alertSettings.selectedAdhanTrackId || 'mishary-alafasy-standard';
  };

  const handleUpdateAzanMode = (key: string, mode: AzonAlertMode) => {
    if (!isFiveDailyPrayer(key)) return;
    const updated: PrayerAlertSettings = {
      ...alertSettings,
      individualPrayerAlerts: {
        ...alertSettings.individualPrayerAlerts,
        [key]: mode !== 'off',
      },
      individualPrayerModes: {
        ...alertSettings.individualPrayerModes,
        [key]: mode,
      },
    };
    setAlertSettings(updated);
    savePrayerAlertSettings(updated);

    if (mode === 'chime') {
      stopActiveAdhanAudio();
      playGentleChime();
    } else if (mode === 'silent' || mode === 'off') {
      stopActiveAdhanAudio();
    }
  };

  const handleUpdatePrayerTrack = (key: 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton', trackId: string) => {
    const updated: PrayerAlertSettings = {
      ...alertSettings,
      perPrayerTracks: {
        ...alertSettings.perPrayerTracks,
        [key]: trackId,
      },
    };
    setAlertSettings(updated);
    savePrayerAlertSettings(updated);
  };

  const handleUpdateDefaultTrack = (trackId: string) => {
    const updated: PrayerAlertSettings = {
      ...alertSettings,
      selectedAdhanTrackId: trackId,
    };
    setAlertSettings(updated);
    savePrayerAlertSettings(updated);
  };

  const handleVolumeChange = (vol: number) => {
    setAdhanAudioVolume(vol);
    const updated: PrayerAlertSettings = {
      ...alertSettings,
      volume: vol,
    };
    setAlertSettings(updated);
    savePrayerAlertSettings(updated);
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. 2026 LUXURY ARCHITECTURAL HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-[#C6A45C]/40 bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] text-white p-6 sm:p-10 shadow-2xl">
        <img
          src="/images/asaka_dawn_spiritual_1793634658872.jpg"
          alt="Asaka Dawn Spiritual"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#042B25]/95 via-[#063D32]/85 to-transparent" />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.15} className="right-6 max-w-[280px] ml-auto hidden md:block" />

        <div className="relative z-10 max-w-3xl space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <CalligraphyBasmalahBadge />
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#C6A45C] uppercase tracking-wider bg-[#031814]/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#C6A45C]/35 shadow-lg">
                <MapPin className="w-3.5 h-3.5 text-[#C6A45C]" />
                <span>{t('prayer:regionCity')}</span>
                <span aria-hidden="true">·</span>
                <span>{t('prayer:regionProvince')}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers text-emerald-400">Asia/Tashkent (UTC+5)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReminderDashboard}
                className="gap-2 bg-[#031814]/60 backdrop-blur-md border-[#C6A45C]/60 text-[#C6A45C] hover:bg-[#C6A45C]/20 text-xs shadow-md"
              >
                <Sliders className="w-4 h-4 text-[#C6A45C]" />
                <span>Eslatma Dashboardi</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAzanModal(true)}
                className="gap-2 bg-[#031814]/60 backdrop-blur-md border-[#C6A45C]/60 text-[#C6A45C] hover:bg-[#C6A45C]/20 text-xs shadow-md"
              >
                <Bell className="w-4 h-4 text-[#C6A45C]" />
                <span>Azon Bildirishnomalari</span>
              </Button>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#F8F5EC] leading-tight">
            {t('prayer:title')}
          </h1>

          <p className="text-xs sm:text-sm text-[#DCC58C]/90 max-w-2xl leading-relaxed">
            {t('prayer:subtitle')}
          </p>
        </div>
      </div>

      {/* 2. VERIFICATION & PUBLICATION STATUS BANNER */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          schedule.isAdministratorPublished
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-100'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              schedule.isAdministratorPublished
                ? 'bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-600/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {schedule.isAdministratorPublished ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base">
              {schedule.isAdministratorPublished
                ? t('prayer:statusVerified')
                : t('prayer:statusPending')}
            </div>
            <div className="opacity-80 text-xs font-mono-numbers mt-0.5">
              {schedule.isAdministratorPublished
                ? `${t('prayer:verifiedByLabel')}: ${schedule.publishedBy} · ${schedule.verifiedAt}`
                : t('prayer:pendingDisclaimer')}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAdmin}
          className="text-xs shrink-0 self-end sm:self-center border-[#c5a869]/50 text-[#c5a869] hover:bg-[#c5a869]/10"
        >
          {t('prayer:verifyButton')}
        </Button>
      </div>

      {/* 3. TABS */}
      <div className="flex border-b border-stone-200 dark:border-emerald-950/80 gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'daily'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('prayer:tabDaily')}</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'monthly'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('prayer:tabMonthly')}</span>
        </button>

        <button
          onClick={() => setActiveTab('qibla')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'qibla'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>{t('prayer:tabQibla')}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Rasmiy Eʼlonlar Tarixi ({schedule.publicationHistory?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: DAILY PRAYER SCHEDULE & ANIMATED CIRCULAR COUNTDOWN */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Active Countdown Card with Animated Circular Progress Bar */}
          <Card elevated className="p-6 sm:p-10 bg-gradient-to-br from-[#051d18] via-[#072620] to-[#031d17] text-white border-[#c5a869]/50 relative overflow-hidden shadow-2xl">
            <GeometricPattern opacity={0.06} />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left max-w-lg">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold uppercase tracking-widest border border-[#c5a869]/30">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('prayer:nextPrayer')}</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
                  {prayerCalculation.nextPrayer
                    ? getLocalizedPrayerName(
                        prayerCalculation.nextPrayer.key,
                        prayerCalculation.nextPrayer.nameUz
                      )
                    : t('prayer:peshin')}{' '}
                  {prayerCalculation.isTomorrow && `(${getLocalizedText('Ertangi')})`}
                </h2>

                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  {t('prayer:countdownSubtext')}
                </p>
              </div>

              {/* Visually stunning animated circular progress bar */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-emerald-950/80"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="url(#goldGradient)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e6ce8a" />
                      <stop offset="100%" stopColor="#c5a869" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <div className="text-2xl sm:text-3xl font-mono-numbers font-extrabold text-white tracking-wider">
                    {prayerCalculation.countdownText}
                  </div>
                  <div className="text-[10px] text-[#c5a869] uppercase tracking-widest font-bold mt-1">
                    {Math.round(progressPercent)}% oʻtdi
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Live Adhan Audio Player Bar (visible whenever an Adhan track is playing, paused, or loading) */}
          {(playerState.playingTrackId || playerState.error) && (
            <Card className="p-4 sm:p-5 bg-gradient-to-r from-[#04241d] via-[#063127] to-[#041d17] border border-[#c5a869]/60 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() =>
                      playerState.playingTrackId &&
                      toggleAdhanAudio(playerState.playingTrackId, alertSettings.volume)
                    }
                    className="w-11 h-11 rounded-2xl bg-[#c5a869] text-[#031d17] flex items-center justify-center shadow-lg hover:bg-[#d6ba7b] transition-all cursor-pointer shrink-0"
                    title={playerState.isPlaying ? 'Vaqtincha toʻxtatish' : 'Davom ettirish'}
                  >
                    {playerState.isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : playerState.isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#c5a869]/20 text-[#c5a869] border border-[#c5a869]/40">
                        {playerState.isLoading
                          ? 'Yuklanmoqda...'
                          : playerState.isPlaying
                          ? 'Azon yangramoqda'
                          : 'Toʻxtatilgan'}
                      </span>
                      <span className="text-xs font-arabic text-[#e6ce8a]">
                        {playerState.track?.titleAr}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {playerState.track?.titleUz || 'Mishari Roshid Al-Afasiy — Azon'}
                    </div>
                    {playerState.error && (
                      <div className="text-xs text-rose-300 mt-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{playerState.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 max-w-md space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.round(playerState.duration || 180))}
                    value={Math.round(playerState.currentTime || 0)}
                    onChange={(e) => seekAdhanAudio(Number(e.target.value))}
                    className="w-full accent-[#c5a869] cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono-numbers text-stone-300">
                    <span>{formatAudioSeconds(playerState.currentTime)}</span>
                    <span>{formatAudioSeconds(playerState.duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => stopActiveAdhanAudio()}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Toʻxtatish</span>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Today's 8 Prayer Times Cards Grid with explicit Azon & Iqomat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedule.times.map((item) => {
              const isNext = prayerCalculation.nextPrayer?.key === item.key;
              const localizedName = getLocalizedPrayerName(item.key, item.nameUz);
              const mode = getPrayerMode(item.key);
              const isAzanCapable = isFiveDailyPrayer(item.key);
              const prayerTrackId = getPrayerTrackId(item.key);
              const isThisTrackPlaying =
                isAzanCapable &&
                playerState.playingTrackId === prayerTrackId &&
                (playerState.isPlaying || playerState.isLoading);

              return (
                <Card
                  key={item.key}
                  elevated={isNext}
                  className={`p-5 space-y-4 transition-all duration-300 relative overflow-hidden ${
                    isNext
                      ? 'border-2 border-[#c5a869] ring-4 ring-[#c5a869]/30 bg-gradient-to-br from-[#052620] to-[#071614] shadow-2xl scale-[1.02]'
                      : 'hover:border-[#c5a869]/60 hover:shadow-xl bg-stone-900/40 backdrop-blur-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#c5a869]/15 flex items-center justify-center shrink-0">
                        {getPrayerIcon(item.key)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-100">{localizedName}</div>
                        <div className="text-xs font-arabic text-[#c5a869]">{item.nameAr}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {isAzanCapable && (
                        <button
                          type="button"
                          onClick={() => toggleAdhanAudio(prayerTrackId, alertSettings.volume)}
                          title={isThisTrackPlaying ? 'Azonni toʻxtatish' : 'Ushbu namoz azonini tinglash'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                            isThisTrackPlaying
                              ? 'bg-[#c5a869] text-[#031d17] border-[#c5a869] shadow'
                              : 'bg-white/5 text-[#c5a869] border-[#c5a869]/30 hover:bg-[#c5a869]/20'
                          }`}
                        >
                          {isThisTrackPlaying ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span>Azon</span>
                        </button>
                      )}
                      {mode === 'sound' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Toʻliq ovozli azon yoqilgan (Sozlash uchun bosing)"
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'chime' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Mayin ohang (Chime) yoqilgan"
                          className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 cursor-pointer"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'silent' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Ovozsiz bildirishnoma"
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'off' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Bildirishnoma oʻchirilgan"
                          className="p-1.5 rounded-lg bg-stone-700/40 text-stone-400 hover:bg-stone-700/60 cursor-pointer"
                        >
                          <BellOff className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isNext && (
                        <span className="text-[11px] font-semibold text-[#064e3b] dark:text-[#c5a869] tracking-wide">
                          Keyingi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explicit Sections for Azon and Iqomat */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-200/80 dark:border-white/10 text-xs">
                    <div className="bg-[#F6F2E9] dark:bg-black/25 p-2.5 rounded-xl border border-stone-200/70 dark:border-white/5">
                      <div className="text-[11px] text-[#6C7C73] dark:text-stone-400 font-medium">Azon vaqti</div>
                      <div className="text-lg sm:text-xl font-bold font-mono-numbers text-[#14221B] dark:text-white tracking-tight mt-0.5">
                        {item.time}
                      </div>
                    </div>
                    <div className="bg-[#c5a869]/12 dark:bg-[#c5a869]/10 p-2.5 rounded-xl border border-[#9e7f3c]/25 dark:border-[#c5a869]/20 text-right">
                      <div className="text-[10px] text-[#c5a869] uppercase font-semibold">Iqomat vaqti</div>
                      <div className="text-lg sm:text-xl font-bold font-mono-numbers text-[#c5a869] mt-0.5">
                        {item.iqamahTime || '—'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Regional Verification Disclaimer Card */}
          <Card className="p-5 bg-stone-900/60 dark:bg-[#071614]/80 border-[#c5a869]/30 text-xs text-stone-300 flex items-start gap-3.5 shadow-lg">
            <Info className="w-5 h-5 text-[#c5a869] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {getLocalizedText(schedule.disclaimer)}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: MONTHLY CALENDAR PREVIEW */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 sm:p-8 space-y-6 shadow-2xl bg-stone-950/60 backdrop-blur-md border-[#c5a869]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-display font-bold text-white">
                {t('prayer:monthlyTitle')}
              </h3>
              <p className="text-xs text-stone-400">Asaka shahri va tumanlar uchun tasdiqlangan oylik jadval</p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold font-mono-numbers w-fit">
              {t('prayer:monthlyHijri')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#051d18] text-[#c5a869] text-xs uppercase tracking-wider font-semibold border-b border-white/10">
                  <th className="py-3 px-3.5">{t('prayer:tableDay')}</th>
                  <th className="py-3 px-3.5">{t('prayer:tableDate')}</th>
                  <th className="py-3 px-3.5">{t('prayer:tahajjud')}</th>
                  <th className="py-3 px-3.5">{t('prayer:subh')}</th>
                  <th className="py-3 px-3.5">{t('prayer:bomdod')}</th>
                  <th className="py-3 px-3.5">{t('prayer:quyosh')}</th>
                  <th className="py-3 px-3.5">{t('prayer:peshin')}</th>
                  <th className="py-3 px-3.5">{t('prayer:asr')}</th>
                  <th className="py-3 px-3.5">{t('prayer:shom')}</th>
                  <th className="py-3 px-3.5">{t('prayer:xufton')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono-numbers text-stone-200">
                {MONTHLY_CALENDAR_PREVIEW.map((row) => (
                  <tr
                    key={row.day}
                    className="hover:bg-[#c5a869]/10 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-[#c5a869]">{row.day}</td>
                    <td className="py-3 px-3.5 text-stone-400">2026-11-{String(row.day).padStart(2, '0')}</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-semibold">{row.tahajjud}</td>
                    <td className="py-3 px-3.5 text-teal-300">{row.subh}</td>
                    <td className="py-3 px-3.5 font-bold">{row.bomdod}</td>
                    <td className="py-3 px-3.5 text-stone-400">{row.quyosh}</td>
                    <td className="py-3 px-3.5 font-semibold text-white">{row.peshin}</td>
                    <td className="py-3 px-3.5">{row.asr}</td>
                    <td className="py-3 px-3.5 font-semibold text-white">{row.shom}</td>
                    <td className="py-3 px-3.5 text-indigo-300">{row.xufton}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: QIBLA COMPASS */}
      {activeTab === 'qibla' && (
        <Card elevated className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-8 shadow-2xl bg-gradient-to-br from-[#051d18] via-[#071614] to-black border-[#c5a869]/50 relative overflow-hidden">
          <GeometricPattern opacity={0.05} />
          
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-semibold text-[#c5a869] uppercase tracking-widest bg-[#c5a869]/20 px-3.5 py-1 rounded-full border border-[#c5a869]/30">
              {t('prayer:qiblaDirectionTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t('prayer:qiblaFromAsaka')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300">
              {t('prayer:qiblaCoordinates')}
            </p>
          </div>

          {/* Compass Visual Instrument */}
          <div className="relative w-68 h-68 sm:w-72 sm:h-72 mx-auto rounded-full border-4 border-[#c5a869]/45 bg-gradient-to-b from-[#071614] to-[#02110e] flex items-center justify-center shadow-xl">
            <div className="absolute inset-3 rounded-full border border-dashed border-[#c5a869]/30" />

            {/* Cardinal marks */}
            <span className="absolute top-3 text-xs font-bold text-[#c5a869] tracking-widest">N (0°)</span>
            <span className="absolute right-3 text-xs font-bold text-stone-400 tracking-widest">E (90°)</span>
            <span className="absolute bottom-3 text-xs font-bold text-stone-400 tracking-widest">S (180°)</span>
            <span className="absolute left-3 text-xs font-bold text-stone-400 tracking-widest">W (270°)</span>

            {/* Qibla Needle pointing at 241 degrees */}
            <div
              className="absolute w-1.5 h-36 origin-bottom transition-transform duration-1000 ease-out"
              style={{ transform: 'rotate(241deg)' }}
            >
              <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-16 border-b-[#c5a869] mx-auto filter drop-shadow-[0_0_8px_#c5a869]" />
              <div className="w-1.5 h-24 bg-gradient-to-t from-stone-500 via-[#c5a869] to-[#c5a869] mx-auto rounded-full shadow-lg" />
            </div>

            {/* Center Dial */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c5a869] to-[#9e7f3c] text-[#071614] flex items-center justify-center font-bold text-xs shadow-2xl z-10 border-2 border-white/30">
              <Compass className="w-6 h-6 animate-spin duration-1000" />
            </div>
          </div>

          <div className="relative z-10 space-y-2">
            <div className="text-4xl font-extrabold font-mono-numbers text-[#c5a869] tracking-wider">
              241° WSW
            </div>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
              {t('prayer:qiblaCompassTip')}
            </p>
          </div>
        </Card>
      )}

      {/* TAB 4: OFFICIAL SCHEDULE PUBLICATION HISTORY */}
      {activeTab === 'history' && (
        <Card elevated className="p-6 sm:p-8 space-y-6 shadow-2xl bg-stone-950/60 backdrop-blur-md border-[#c5a869]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#c5a869]" />
                <span>Rasmiy Namoz Taqvimi Nashr Tarixi</span>
              </h3>
              <p className="text-xs text-stone-400">
                Asaka jome masjidi maʼmuriyati tomonidan rasmiy tasdiqlangan va oʻzgartirilgan barcha vaqtlar tarixi
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono-numbers w-fit">
              Versiya: v{schedule.version || 1}
            </span>
          </div>

          {(!schedule.publicationHistory || schedule.publicationHistory.length === 0) ? (
            <div className="p-8 text-center rounded-2xl border border-white/5 bg-stone-900/40 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#c5a869] mx-auto opacity-70" />
              <p className="text-stone-300 text-sm font-semibold">
                Joriy jadval boshlangʻich nashr sifatida amal qilmoqda.
              </p>
              <p className="text-stone-400 text-xs">
                Maʼmuriyat jadvalga har safar rasmiy tuzatish yoki yangi vaqtlar kiritganida ushbu boʻlimda toʻliq arxiv saqlanib boradi.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.publicationHistory.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="p-5 rounded-2xl border border-white/10 bg-black/40 space-y-3 hover:border-[#c5a869]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">{rec.formattedDateUz}</span>
                      <span className="text-[10px] text-emerald-400 font-mono-numbers px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        {rec.publishedBy}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-numbers text-stone-400">
                      {new Date(rec.publishedAt).toLocaleString('uz-UZ', {
                        timeZone: 'Asia/Tashkent',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                    {rec.times.map((t) => (
                      <div key={t.key} className="p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-[10px] text-stone-400 uppercase">{t.nameUz}</div>
                        <div className="text-xs font-bold font-mono-numbers text-[#c5a869] mt-0.5">
                          {t.time}
                        </div>
                        {t.iqamahTime && (
                          <div className="text-[9px] text-stone-400 font-mono-numbers">
                            Iq: {t.iqamahTime}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ---------------- MODAL: AZON NOTIFICATION & AUDIO PLAYER SETTINGS ---------------- */}
      <Modal
        isOpen={showAzanModal}
        onClose={() => setShowAzanModal(false)}
        title="Azon Audio Tizimi va Bildirishnomalar"
        subtitle="Shayx Mishari Roshid Al-Afasiy va Masjidul Harom azon yozuvlarini tinglang hamda har bir namoz uchun alohida sozlang"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* 1. Interactive Adhan Audio Player & Track Selector */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#04221b] to-[#061814] border border-[#c5a869]/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#c5a869] flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>Asosiy Azon Audio Yozuvi (Haqiqiy MP3 Tilovat)</span>
                </div>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Tanlangan muazzin azoni namoz vaqti kirganda toʻliq yangraydi
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    toggleAdhanAudio(alertSettings.selectedAdhanTrackId, alertSettings.volume)
                  }
                  className="text-xs gap-1.5"
                >
                  {playerState.playingTrackId === alertSettings.selectedAdhanTrackId &&
                  playerState.isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : playerState.playingTrackId === alertSettings.selectedAdhanTrackId &&
                    playerState.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Toʻxtatib turish</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Azonni Tinglash</span>
                    </>
                  )}
                </Button>
                {playerState.playingTrackId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopActiveAdhanAudio()}
                    className="text-xs border-rose-500/50 text-rose-300 hover:bg-rose-500/20"
                  >
                    <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                    <span>Stop</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Active Playback Progress & Scrubber inside Modal */}
            {playerState.playingTrackId && (
              <div className="p-3 rounded-xl bg-black/40 border border-[#c5a869]/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#e6ce8a] truncate">
                    {playerState.track?.titleUz}
                  </span>
                  <span className="font-mono-numbers text-stone-300">
                    {formatAudioSeconds(playerState.currentTime)} /{' '}
                    {formatAudioSeconds(playerState.duration)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.round(playerState.duration || 180))}
                  value={Math.round(playerState.currentTime || 0)}
                  onChange={(e) => seekAdhanAudio(Number(e.target.value))}
                  className="w-full accent-[#c5a869] cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
              </div>
            )}

            {playerState.error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{playerState.error}</span>
              </div>
            )}

            {/* Track Selection List */}
            <div className="grid grid-cols-1 gap-2">
              {ADHAN_TRACKS.map((track) => {
                const isSelected = alertSettings.selectedAdhanTrackId === track.id;
                const isPlayingThis =
                  playerState.playingTrackId === track.id &&
                  (playerState.isPlaying || playerState.isLoading);

                return (
                  <div
                    key={track.id}
                    onClick={() => handleUpdateDefaultTrack(track.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#c5a869]/15 border-[#c5a869] text-white'
                        : 'bg-white/5 border-white/10 text-stone-300 hover:border-white/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {track.titleUz}
                        </span>
                        <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-black/40 text-[#c5a869]">
                          {track.durationLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 truncate mt-0.5">
                        {track.styleUz}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAdhanAudio(track.id, alertSettings.volume);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                        isPlayingThis
                          ? 'bg-[#c5a869] text-[#031d17]'
                          : 'bg-white/10 text-[#c5a869] hover:bg-[#c5a869]/20'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Tinglash</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Volume Slider */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-stone-300">
                <Volume2 className="w-4 h-4 text-[#c5a869]" />
                <span>Azon ovoz balandligi:</span>
                <span className="font-mono-numbers font-bold text-[#c5a869]">
                  {Math.round((alertSettings.volume || 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={alertSettings.volume || 0.85}
                onChange={(e) => handleVolumeChange( parseFloat(e.target.value) )}
                className="w-36 sm:w-48 accent-[#c5a869] cursor-pointer"
              />
            </div>
          </div>

          {/* 2. Per-Prayer Mode & Specific Adhan Track Selection */}
          <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
            {schedule.times
              .filter((item) => isFiveDailyPrayer(item.key))
              .map((item) => {
                const pKey = item.key as 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton';
                const mode = getPrayerMode(pKey);
                const prayerName = getLocalizedPrayerName(pKey, item.nameUz);
                const selectedTrackId = getPrayerTrackId(pKey);
                const isThisPlaying =
                  playerState.playingTrackId === selectedTrackId &&
                  (playerState.isPlaying || playerState.isLoading);

                return (
                  <div
                    key={pKey}
                    className="p-4 rounded-xl border border-white/10 bg-stone-900/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#c5a869]/20 flex items-center justify-center text-[#c5a869]">
                          {getPrayerIcon(pKey)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{prayerName}</div>
                          <div className="text-xs font-mono-numbers text-stone-400">
                            Azon: {item.time} {item.iqamahTime ? `· Iqomat: ${item.iqamahTime}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleUpdateAzanMode(pKey, 'sound')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            mode === 'sound'
                              ? 'bg-emerald-500 text-black font-bold shadow'
                              : 'bg-white/5 text-stone-400 hover:text-white'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Azon</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateAzanMode(pKey, 'chime')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            mode === 'chime'
                              ? 'bg-sky-400 text-black font-bold shadow'
                              : 'bg-white/5 text-stone-400 hover:text-white'
                          }`}
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>Ohang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateAzanMode(pKey, 'silent')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            mode === 'silent'
                              ? 'bg-amber-500 text-black font-bold shadow'
                              : 'bg-white/5 text-stone-400 hover:text-white'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Ovozsiz</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateAzanMode(pKey, 'off')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            mode === 'off'
                              ? 'bg-rose-500 text-white font-bold shadow'
                              : 'bg-white/5 text-stone-400 hover:text-white'
                          }`}
                        >
                          <BellOff className="w-3.5 h-3.5" />
                          <span>Oʻchiq</span>
                        </button>
                      </div>
                    </div>

                    {mode === 'sound' && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <select
                          value={selectedTrackId}
                          onChange={(e) => handleUpdatePrayerTrack(pKey, e.target.value)}
                          className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-[#c5a869]"
                        >
                          {ADHAN_TRACKS.map((tr) => (
                            <option key={tr.id} value={tr.id} className="bg-stone-900 text-white">
                              {tr.titleUz} ({tr.durationLabel})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => toggleAdhanAudio(selectedTrackId, alertSettings.volume)}
                          className="px-3 py-1.5 rounded-lg bg-[#c5a869]/20 hover:bg-[#c5a869]/30 text-[#c5a869] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {isThisPlaying ? (
                            <>
                              <Pause className="w-3 h-3" />
                              <span>Toʻxtatish</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Sinash</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAzanModal(false);
                onOpenReminderDashboard();
              }}
              className="text-xs border-[#c5a869]/40 text-[#c5a869]"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              <span>Batafsil Eslatma Dashboardi</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAzanModal(false)}>
              Saqlash va Yopish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
