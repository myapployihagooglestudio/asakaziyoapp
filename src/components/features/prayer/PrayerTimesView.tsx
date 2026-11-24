import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { PrayerSchedule, PrayerTimeEntry, SupportedLocale } from '../../../types';
import { MONTHLY_CALENDAR_PREVIEW } from '../../../data/prayerTimesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import {
  GeometricPattern,
  IslamicMihrabArch,
  CalligraphyBasmalahBadge,
  VolumetricGodRays,
} from '../../ui/GeometricPattern';
import { AnimatedProgressRing, PREMIUM_EASE } from '../../ui/MotionPrimitives';
import { resolveAsakaDateContext } from '../../../../telegram/services/dateCalendarService';
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
  Tv,
} from 'lucide-react';

interface PrayerTimesViewProps {
  schedule: PrayerSchedule;
  onOpenAdmin: () => void;
  onOpenReminderDashboard: () => void;
  onOpenTvMode?: () => void;
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
  onOpenTvMode,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'qibla' | 'history'>('daily');
  const [prayerCalculation, setPrayerCalculation] = useState<NextPrayerInfo>(() =>
    getNextPrayerCalculation(schedule.times)
  );
  const [liveDateContext, setLiveDateContext] = useState(() =>
    resolveAsakaDateContext(new Date(), currentLocale)
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

  // Real DeviceOrientationEvent Qibla Compass Sensor (241° WSW for Asaka, Andijan)
  const ASAKA_QIBLA_BEARING = 241;
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassStatus, setCompassStatus] = useState<'idle' | 'active' | 'unsupported' | 'denied'>('idle');

  const handleEnableCompass = useCallback(async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setCompassStatus('unsupported');
      return;
    }
    try {
      const OrientationCtor = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof OrientationCtor?.requestPermission === 'function') {
        const perm = await OrientationCtor.requestPermission();
        if (perm !== 'granted') {
          setCompassStatus('denied');
          return;
        }
      }
      setCompassStatus('active');
    } catch {
      setCompassStatus('denied');
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'qibla' || compassStatus !== 'active') return;
    if (typeof window === 'undefined') return;

    let receivedReading = false;
    const onOrientation = (ev: DeviceOrientationEvent) => {
      const webkitHeading = (ev as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      let heading: number | null = null;
      if (typeof webkitHeading === 'number' && Number.isFinite(webkitHeading)) {
        heading = webkitHeading;
      } else if (typeof ev.alpha === 'number' && Number.isFinite(ev.alpha)) {
        heading = (360 - ev.alpha) % 360;
      }
      if (heading !== null) {
        receivedReading = true;
        setCompassHeading(Math.round(((heading % 360) + 360) % 360));
      }
    };

    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
    window.addEventListener('deviceorientation', onOrientation as EventListener, true);

    const fallbackTimer = window.setTimeout(() => {
      if (!receivedReading) {
        setCompassStatus('unsupported');
      }
    }, 2500);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', onOrientation as EventListener, true);
    };
  }, [activeTab, compassStatus]);

  // Live dynamic countdown calculation for the actual next prayer
  useEffect(() => {
    const updateCountdown = () => {
      setPrayerCalculation(getNextPrayerCalculation(schedule.times));
      setLiveDateContext(resolveAsakaDateContext(new Date(), currentLocale));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [schedule.times, currentLocale]);

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

  // Progress percentage passed directly to AnimatedProgressRing

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
      {/* 1. NEO 2026 AURORA OBSIDIAN HERO BANNER */}
      <div className="relative rounded-[28px] overflow-hidden az-aurora-surface text-[#F7F5F0] p-6 sm:p-9">
        <img
          src="/images/asaka_dawn_spiritual_1793634658872.jpg"
          alt="Asaka Dawn Spiritual"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-18 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050C0A]/92 via-[#071813]/82 to-[#09241C]/65" />
        <GeometricPattern opacity={0.045} />
        <IslamicMihrabArch opacity={0.1} className="right-6 max-w-[260px] ml-auto hidden md:block" />

        <div className="relative z-10 max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#C2D1CB]">
              <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="font-semibold text-[#F7F5F0]">{t('prayer:regionCity')}</span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span>{t('prayer:regionProvince')}</span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span className="text-[#F7F5F0] font-semibold">{liveDateContext.gregorian.formatted}</span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span className="az-type-numeric text-emerald-300 font-semibold">
                {liveDateContext.hijri.formatted}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenTvMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenTvMode}
                  className="gap-2 text-xs"
                >
                  <Tv className="w-4 h-4" />
                  <span>Masjid Jamoat Ekrani (TV)</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReminderDashboard}
                className="gap-2 bg-white/[0.06] backdrop-blur-md border-white/[0.16] text-[#F7F5F0] hover:bg-white/[0.12] text-xs"
              >
                <Sliders className="w-4 h-4 text-[#10B981]" />
                <span>Eslatma Dashboardi</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAzanModal(true)}
                className="gap-2 bg-white/[0.06] backdrop-blur-md border-white/[0.16] text-[#F7F5F0] hover:bg-white/[0.12] text-xs"
              >
                <Bell className="w-4 h-4 text-[#C8A85E]" />
                <span>Azon Bildirishnomalari</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-w-2xl">
            <h1 className="az-type-hero text-[#F7F5F0]">
              {t('prayer:title')}
            </h1>
            <p className="az-type-body text-[#C2D1CB]">
              {t('prayer:subtitle')}
            </p>
          </div>
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

      {/* 3. FLUID SEGMENTED TABS (APPLE-INSPIRED SPRING INDICATOR) */}
      <div className="inline-flex max-w-full overflow-x-auto p-1.5 rounded-2xl bg-[#EFECE5] dark:bg-[#0B1411] border border-[#064E3B]/[0.08] dark:border-white/[0.08] gap-1">
        {(
          [
            { id: 'daily' as const, icon: Clock, label: t('prayer:tabDaily') },
            { id: 'monthly' as const, icon: Calendar, label: t('prayer:tabMonthly') },
            { id: 'qibla' as const, icon: Compass, label: t('prayer:tabQibla') },
            {
              id: 'history' as const,
              icon: History,
              label: `Rasmiy Eʼlonlar (${schedule.publicationHistory?.length || 0})`,
            },
          ]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'text-[#0B1B16] dark:text-[#F7F5F0]'
                  : 'text-[#5F776F] dark:text-[#8FA69D] hover:text-[#0B1B16] dark:hover:text-[#F7F5F0]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="prayerActiveTabPill"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-white dark:bg-[#14241E] border border-[#064E3B]/[0.1] dark:border-white/[0.1] shadow-xs"
                />
              )}
              <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-[#064E3B] dark:text-[#10B981]' : ''}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DAILY PRAYER SCHEDULE & ANIMATED CIRCULAR COUNTDOWN */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Active Countdown Card with Animated Circular Progress Bar */}
          <Card elevated className="p-6 sm:p-10 bg-gradient-to-br from-[#051d18] via-[#072620] to-[#031d17] text-white border-[#c5a869]/50 relative overflow-hidden shadow-2xl">
            <GeometricPattern opacity={0.06} />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left max-w-lg">
                <div className="inline-flex items-center gap-2 text-[#DFBD69] text-xs font-bold uppercase tracking-[0.2em]">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                  <span>{t('prayer:nextPrayer')}</span>
                  <span className="text-[#DFBD69]/45" aria-hidden="true">·</span>
                  <span className="font-mono-numbers text-emerald-300">{liveDateContext.hijri.formatted}</span>
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

              {/* Spring-animated circular countdown ring */}
              <AnimatedProgressRing
                progress={progressPercent}
                size={176}
                strokeWidth={11}
                trackClassName="stroke-emerald-950/80"
                strokeColor="#e6ce8a"
                secondaryStrokeColor="#c5a869"
                className="shrink-0"
              >
                  <div className="text-2xl sm:text-3xl font-mono-numbers font-extrabold text-white tracking-wider">
                    {prayerCalculation.countdownText}
                  </div>
                  <div className="text-[10px] text-[#c5a869] uppercase tracking-widest font-bold mt-1">
                    {Math.round(progressPercent)}% oʻtdi
                  </div>
              </AnimatedProgressRing>
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
                  variant={isNext ? 'emerald' : 'elevated'}
                  ornamental={isNext}
                  className={`p-5 space-y-4 transition-all duration-300 relative overflow-hidden ${
                    isNext
                      ? 'border-2 border-[#DFBD69] ring-4 ring-[#DFBD69]/25 shadow-[0_24px_65px_rgba(223,189,105,0.22)] scale-[1.01]'
                      : 'hover:border-[#DFBD69]/60 hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#DFBD69]/15 border border-[#DFBD69]/30 flex items-center justify-center shrink-0">
                        {getPrayerIcon(item.key)}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isNext ? 'text-[#FFF8E8]' : 'text-[#03170F] dark:text-[#FFF8E8]'}`}>
                          {localizedName}
                        </div>
                        <div className="text-xs font-arabic text-[#DFBD69]">{item.nameAr}</div>
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
                              ? 'az-gold-foil-bg text-[#010906] border-[#DFBD69] shadow'
                              : 'bg-[#DFBD69]/10 text-[#8A6621] dark:text-[#DFBD69] border-[#DFBD69]/35 hover:bg-[#DFBD69]/20'
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
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'chime' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Mayin ohang (Chime) yoqilgan"
                          className="p-1.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/30 cursor-pointer"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'silent' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Ovozsiz bildirishnoma"
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mode === 'off' && (
                        <button
                          type="button"
                          onClick={() => setShowAzanModal(true)}
                          title="Bildirishnoma oʻchirilgan"
                          className="p-1.5 rounded-lg bg-stone-500/20 text-stone-500 dark:text-stone-400 hover:bg-stone-500/30 cursor-pointer"
                        >
                          <BellOff className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isNext && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full az-gold-foil-bg text-[#010906] uppercase tracking-wider">
                          Keyingi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explicit Sections for Azon and Iqomat */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#DFBD69]/20 text-xs">
                    <div className={`p-2.5 rounded-xl border ${isNext ? 'bg-[#010906]/55 border-[#DFBD69]/30' : 'bg-[#F8F5EC] dark:bg-[#010906]/55 border-[#DFBD69]/25'}`}>
                      <div className={`text-[11px] font-medium ${isNext ? 'text-[#FFF8E8]/75' : 'text-[#5C746C] dark:text-[#FFF8E8]/65'}`}>Azon vaqti</div>
                      <div className={`text-lg sm:text-xl font-bold font-mono-numbers tracking-tight mt-0.5 ${isNext ? 'text-[#FFF8E8]' : 'text-[#03170F] dark:text-[#FFF8E8]'}`}>
                        {item.time}
                      </div>
                    </div>
                    <div className="bg-[#DFBD69]/12 dark:bg-[#DFBD69]/10 p-2.5 rounded-xl border border-[#DFBD69]/35 text-right">
                      <div className="text-[10px] text-[#8A6621] dark:text-[#DFBD69] uppercase font-bold">Jamoat (Iqomat)</div>
                      <div className="text-lg sm:text-xl font-bold font-mono-numbers text-[#8A6621] dark:text-[#FFF6C8] mt-0.5">
                        {item.iqamahTime || '—'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Regional Verification Disclaimer Card — Dual-Theme Light + Dark */}
          <Card className="p-5 bg-[#F2EFE9] dark:bg-[#0B1411] border-[#064E3B]/10 dark:border-white/[0.08] text-xs text-[#334F46] dark:text-[#C2D1CB] flex items-start gap-3.5">
            <Info className="w-5 h-5 text-[#064E3B] dark:text-[#C8A85E] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {getLocalizedText(schedule.disclaimer)}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: MONTHLY CALENDAR PREVIEW — FULL DUAL-THEME CONTRAST */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="az-type-section text-[#0B1B16] dark:text-[#F7F5F0]">
                {t('prayer:monthlyTitle')}
              </h3>
              <p className="az-type-caption text-[#5F776F] dark:text-[#8FA69D]">
                Asaka shahri va tumanlar uchun tasdiqlangan oylik jadval
              </p>
            </div>
            <span className="az-type-numeric text-xs font-bold text-[#064E3B] dark:text-[#C8A85E]">
              {t('prayer:monthlyHijri')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#064E3B]/[0.1] dark:border-white/[0.08]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F2EFE9] dark:bg-[#0F1A16] text-[#064E3B] dark:text-[#C8A85E] text-[11px] uppercase tracking-wider font-bold border-b border-[#064E3B]/[0.1] dark:border-white/[0.08]">
                  <th className="py-3.5 px-3.5">{t('prayer:tableDay')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:tableDate')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:tahajjud')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:subh')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:bomdod')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:quyosh')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:peshin')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:asr')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:shom')}</th>
                  <th className="py-3.5 px-3.5">{t('prayer:xufton')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#064E3B]/[0.07] dark:divide-white/[0.06] az-type-numeric text-[#1F3A32] dark:text-[#D4DDD8]">
                {MONTHLY_CALENDAR_PREVIEW.map((row) => (
                  <tr
                    key={row.day}
                    className="hover:bg-[#064E3B]/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-[#064E3B] dark:text-[#C8A85E]">{row.day}</td>
                    <td className="py-3 px-3.5 text-[#5F776F] dark:text-[#8FA69D]">2026-11-{String(row.day).padStart(2, '0')}</td>
                    <td className="py-3 px-3.5 text-emerald-700 dark:text-emerald-400 font-semibold">{row.tahajjud}</td>
                    <td className="py-3 px-3.5 text-teal-700 dark:text-teal-300">{row.subh}</td>
                    <td className="py-3 px-3.5 font-bold text-[#0B1B16] dark:text-[#F7F5F0]">{row.bomdod}</td>
                    <td className="py-3 px-3.5 text-[#5F776F] dark:text-[#8FA69D]">{row.quyosh}</td>
                    <td className="py-3 px-3.5 font-semibold text-[#0B1B16] dark:text-[#F7F5F0]">{row.peshin}</td>
                    <td className="py-3 px-3.5">{row.asr}</td>
                    <td className="py-3 px-3.5 font-semibold text-[#0B1B16] dark:text-[#F7F5F0]">{row.shom}</td>
                    <td className="py-3 px-3.5 text-indigo-700 dark:text-indigo-300">{row.xufton}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: SPATIAL 3D QIBLA COMPASS (LIVE DEVICE ORIENTATION + HONEST CALIBRATION FALLBACK) */}
      {activeTab === 'qibla' && (() => {
        const isLiveCompass = compassStatus === 'active' && compassHeading !== null;
        const needleAngle = isLiveCompass
          ? (ASAKA_QIBLA_BEARING - compassHeading + 360) % 360
          : ASAKA_QIBLA_BEARING;
        const dialRotation = isLiveCompass ? -compassHeading : 0;
        const angularDelta = isLiveCompass
          ? Math.min(needleAngle, 360 - needleAngle)
          : null;
        const isAligned = angularDelta !== null && angularDelta <= 5;

        return (
          <div className="rounded-[28px] az-aurora-surface p-7 sm:p-11 text-center max-w-xl mx-auto space-y-7 relative overflow-hidden">
            <GeometricPattern opacity={0.04} />

            <div className="relative z-10 space-y-2">
              <span className="az-type-overline text-[#10B981] block">
                {t('prayer:qiblaDirectionTitle')}
              </span>
              <h3 className="az-type-page text-[#F7F5F0]">
                {t('prayer:qiblaFromAsaka')}
              </h3>
              <p className="az-type-caption text-[#C2D1CB]">
                {t('prayer:qiblaCoordinates')}
              </p>
            </div>

            {/* Spatial 3D Calibrated Qibla Instrument */}
            <div className="relative z-10 py-2" style={{ perspective: '900px' }}>
              <motion.div
                animate={{
                  boxShadow: isAligned
                    ? '0 0 46px rgba(16, 185, 129, 0.42), inset 0 1px 0 rgba(255,255,255,0.18)'
                    : '0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
                transition={{ duration: 0.35, ease: PREMIUM_EASE }}
                className={`relative w-68 h-68 sm:w-76 sm:h-76 mx-auto rounded-full border-2 flex items-center justify-center bg-gradient-to-b from-[#0B1E18] via-[#071410] to-[#040A08] ${
                  isAligned ? 'border-[#10B981]' : 'border-white/[0.16]'
                }`}
              >
                {/* Rotating Compass Dial Ring */}
                <motion.div
                  animate={{ rotate: dialRotation }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="absolute inset-0 rounded-full"
                >
                  <div className="absolute inset-3 rounded-full border border-dashed border-white/[0.14]" />
                  <div className="absolute inset-8 rounded-full border border-white/[0.06]" />
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-[#C8A85E] tracking-widest">N</span>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#8FA69D]">E</span>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-[#8FA69D]">S</span>
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#8FA69D]">W</span>
                </motion.div>

                {/* Calibrated Qibla Pointer Needle */}
                <motion.div
                  animate={{ rotate: needleAngle }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                  className="absolute w-3 h-36 origin-bottom bottom-1/2 flex flex-col items-center"
                >
                  <div
                    className={`w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[18px] transition-colors ${
                      isAligned
                        ? 'border-b-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]'
                        : 'border-b-[#C8A85E] drop-shadow-[0_0_10px_rgba(200,168,94,0.75)]'
                    }`}
                  />
                  <div
                    className={`w-1.5 flex-1 rounded-full ${
                      isAligned
                        ? 'bg-gradient-to-t from-white/30 to-[#10B981]'
                        : 'bg-gradient-to-t from-white/25 to-[#C8A85E]'
                    }`}
                  />
                </motion.div>

                {/* Center Bearing Hub */}
                <div
                  className={`relative z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center border transition-colors ${
                    isAligned
                      ? 'bg-[#10B981] text-[#04140F] border-emerald-200/70 shadow-[0_0_24px_rgba(16,185,129,0.5)]'
                      : 'bg-[#0D1E18] text-[#F7F5F0] border-white/[0.16] shadow-xl'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                  <span className="az-type-numeric text-[10px] font-bold mt-0.5">
                    {isLiveCompass ? `${compassHeading}°` : '241°'}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Live Bearing Readout + Sensor Activation Control */}
            <div className="relative z-10 space-y-3">
              <div className="az-type-numeric text-3xl sm:text-4xl font-extrabold text-[#F7F5F0] tracking-tight">
                {ASAKA_QIBLA_BEARING}° <span className="text-[#C8A85E]">WSW</span>
              </div>

              {isAligned ? (
                <div className="text-xs font-semibold text-emerald-300">
                  Qibla yoʻnalishi aniq topildi (Kaʼba tomoni ±5°)
                </div>
              ) : isLiveCompass ? (
                <div className="text-xs text-[#C2D1CB] az-type-numeric">
                  Jonli kompas faol · Qurilma burchagi: {compassHeading}° · Farq: {angularDelta}°
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleEnableCompass}
                    className="gap-2 text-xs"
                  >
                    <Compass className="w-4 h-4" />
                    <span>
                      {compassStatus === 'active'
                        ? 'Kompas sensori kutilmoqda...'
                        : 'Jonli Kompas Sensorini Yoqish'}
                    </span>
                  </Button>
                  {compassStatus === 'unsupported' && (
                    <p className="text-[11px] text-amber-200/90 max-w-sm">
                      Ushbu qurilmada magnit kompas sensori aniqlanmadi. Yuqoridagi statik 241° (Janubi-gʻarb) azimut koʻrsatkichidan foydalaning.
                    </p>
                  )}
                  {compassStatus === 'denied' && (
                    <p className="text-[11px] text-amber-200/90 max-w-sm">
                      Kompas ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering yoki 241° WSW azimutidan foydalaning.
                    </p>
                  )}
                </div>
              )}

              <p className="az-type-caption text-[#9CAFA7] max-w-md mx-auto">
                {t('prayer:qiblaCompassTip')}
              </p>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: OFFICIAL SCHEDULE PUBLICATION HISTORY — DUAL-THEME LIGHT + DARK */}
      {activeTab === 'history' && (
        <Card elevated className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#064E3B]/[0.1] dark:border-white/[0.08] pb-4">
            <div>
              <h3 className="az-type-section text-[#0B1B16] dark:text-[#F7F5F0] flex items-center gap-2">
                <History className="w-5 h-5 text-[#064E3B] dark:text-[#C8A85E]" />
                <span>Rasmiy Namoz Taqvimi Nashr Tarixi</span>
              </h3>
              <p className="az-type-caption text-[#5F776F] dark:text-[#8FA69D]">
                Asaka jome masjidi maʼmuriyati tomonidan rasmiy tasdiqlangan va oʻzgartirilgan barcha vaqtlar tarixi
              </p>
            </div>
            <span className="az-type-numeric text-xs font-bold text-[#064E3B] dark:text-emerald-300">
              Versiya: v{schedule.version || 1}
            </span>
          </div>

          {(!schedule.publicationHistory || schedule.publicationHistory.length === 0) ? (
            <div className="p-8 text-center rounded-2xl border border-[#064E3B]/[0.08] dark:border-white/[0.08] bg-[#F7F5F0] dark:bg-[#0F1A16] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#064E3B] dark:text-[#10B981] mx-auto" />
              <p className="text-[#0B1B16] dark:text-[#F7F5F0] text-sm font-semibold">
                Joriy jadval boshlangʻich nashr sifatida amal qilmoqda.
              </p>
              <p className="text-[#5F776F] dark:text-[#8FA69D] text-xs max-w-md mx-auto">
                Maʼmuriyat jadvalga har safar rasmiy tuzatish yoki yangi vaqtlar kiritganida ushbu boʻlimda toʻliq arxiv saqlanib boradi.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.publicationHistory.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="p-5 rounded-2xl border border-[#064E3B]/[0.1] dark:border-white/[0.08] bg-[#F7F5F0] dark:bg-[#0F1A16] space-y-3 hover:border-[#10B981]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#064E3B]/[0.08] dark:border-white/[0.08] pb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-[#064E3B]/10 dark:bg-[#10B981]/20 text-[#064E3B] dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#0B1B16] dark:text-[#F7F5F0]">{rec.formattedDateUz}</span>
                      <span className="text-[11px] text-[#064E3B] dark:text-emerald-400 az-type-numeric font-semibold">
                        · {rec.publishedBy}
                      </span>
                    </div>
                    <span className="text-[11px] az-type-numeric text-[#5F776F] dark:text-[#8FA69D]">
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
                      <div key={t.key} className="p-2.5 rounded-xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.07] dark:border-white/[0.06]">
                        <div className="text-[10px] text-[#5F776F] dark:text-[#8FA69D] uppercase font-semibold">{t.nameUz}</div>
                        <div className="text-xs font-bold az-type-numeric text-[#064E3B] dark:text-[#C8A85E] mt-0.5">
                          {t.time}
                        </div>
                        {t.iqamahTime && (
                          <div className="text-[9px] text-[#5F776F] dark:text-[#8FA69D] az-type-numeric">
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
