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
import {
  AnimatedProgressRing,
  AudioWaveformBars,
  MaskedSplitText,
  PREMIUM_EASE,
  ScrollReveal,
  StaggerCard,
  StaggerGrid,
} from '../../ui/MotionPrimitives';
import { triggerTactileHaptic } from '../../../utils/motionSystem';
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
  ShieldCheck,
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
  BellOff,
  Sliders,
  History,
  Play,
  Pause,
  Square,
  Music,
  Loader2,
  Tv,
  Globe,
  Cloud,
  LocateFixed,
  ChevronDown,
} from 'lucide-react';
import {
  ASAKA_CANONICAL_CITY_ID,
  AsrMethodId,
  CalculationMethodId,
  findBuiltInLocationById,
} from '../../../data/globalLocationsData';
import type { UnifiedPrayerRecord } from '../../../services/globalPrayerEngine';
import {
  buildAsakaManualUnifiedRecord,
  computeNextPrayerInTimezone,
  getLocalDateTimeInTimezone,
} from '../../../services/globalPrayerEngine';
import type { GlobalWeatherResponse } from '../../../services/globalWeatherService';
import {
  UserLocationPreference,
  fetchGlobalWeatherClient,
  fetchMonthlyPrayerCalendarClient,
  fetchUnifiedPrayerScheduleClient,
  loadLocalLocationPreference,
  resolveGpsLocationClient,
  syncLocationPreferenceToServer,
} from '../../../utils/globalPrayerClient';
import { GlobalLocationPickerModal } from './GlobalLocationPickerModal';
import { WeatherCenterPanel } from './WeatherCenterPanel';

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
  const [locationPref, setLocationPref] = useState<UserLocationPreference>(() =>
    loadLocalLocationPreference()
  );
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsBanner, setGpsBanner] = useState<string | null>(null);

  const [activeRecord, setActiveRecord] = useState<UnifiedPrayerRecord>(() => {
    const asakaLoc = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
    return buildAsakaManualUnifiedRecord(schedule, asakaLoc);
  });
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Visually separated Global Weather state
  const [weather, setWeather] = useState<GlobalWeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Real API-driven Monthly Calendar rows
  const [monthlyRows, setMonthlyRows] = useState<
    Array<{
      day: number;
      localDate: string;
      hijriDate: string;
      tahajjud: string;
      subh: string;
      fajr: string;
      sunrise: string;
      dhuhr: string;
      asr: string;
      maghrib: string;
      isha: string;
      isDstActive?: boolean;
      sourceMode?: string;
    }>
  >([]);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  // Live timezone clock & countdown
  const [liveLocalClock, setLiveLocalClock] = useState<string>('');
  const [liveCountdownText, setLiveCountdownText] = useState<string>('--:--:--');
  const [liveNextPrayerName, setLiveNextPrayerName] = useState<string>('');
  const [liveNextPrayerKey, setLiveNextPrayerKey] = useState<string>('');
  const [liveIsTomorrow, setLiveIsTomorrow] = useState<boolean>(false);

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

  // Fetch Unified Prayer Schedule (Asaka MANUAL_ADMIN or any AUTO city)
  useEffect(() => {
    let cancelled = false;
    setIsLoadingSchedule(true);
    fetchUnifiedPrayerScheduleClient({
      pref: locationPref,
      asakaFallbackSchedule: schedule,
    })
      .then(({ record }) => {
        if (!cancelled) {
          setActiveRecord(record);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchedule(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationPref, schedule]);

  // Fetch Weather whenever activeRecord coordinates change
  const loadWeatherForActiveCity = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingWeather(true);
      setWeatherError(null);
      try {
        const res = await fetchGlobalWeatherClient({
          cityId: activeRecord.cityId,
          districtId: activeRecord.districtId,
          latitude: activeRecord.latitude,
          longitude: activeRecord.longitude,
          timezone: activeRecord.timezone,
          locationLabel: `${activeRecord.cityName}, ${activeRecord.countryName}`,
          forceRefresh,
        });
        setWeather(res.weather);
        if (res.error) setWeatherError(res.error);
      } finally {
        setIsLoadingWeather(false);
      }
    },
    [
      activeRecord.cityId,
      activeRecord.districtId,
      activeRecord.latitude,
      activeRecord.longitude,
      activeRecord.timezone,
      activeRecord.cityName,
      activeRecord.countryName,
    ]
  );

  useEffect(() => {
    loadWeatherForActiveCity(false);
  }, [loadWeatherForActiveCity]);

  // Sync snapshot to Android Home Screen Widget if running inside Android WebView
  useEffect(() => {
    try {
      const win = window as any;
      if (win?.AsakaAndroidBridge?.syncPrayerWidgetSnapshot) {
        win.AsakaAndroidBridge.syncPrayerWidgetSnapshot(
          JSON.stringify({
            cityId: activeRecord.cityId,
            cityName: activeRecord.cityName,
            sourceMode: activeRecord.sourceMode,
            localDate: activeRecord.localDate,
            fajr: activeRecord.fajr,
            dhuhr: activeRecord.dhuhr,
            asr: activeRecord.asr,
            maghrib: activeRecord.maghrib,
            isha: activeRecord.isha,
            nextPrayerName: liveNextPrayerName || activeRecord.nextPrayer?.nameUz || '',
            nextPrayerTime: activeRecord.nextPrayer?.time || '',
            weatherTempC: weather?.current?.temperatureC ?? null,
            weatherCondition: weather?.current?.conditionUz ?? '',
          })
        );
      }
    } catch {
      // ignore outside Android
    }
  }, [activeRecord, liveNextPrayerName, weather]);

  // Fetch real monthly calendar when monthly tab is open
  useEffect(() => {
    if (activeTab !== 'monthly') return;
    let cancelled = false;
    const nowParts = activeRecord.localDate.split('-').map(Number);
    const year = nowParts[0] || new Date().getFullYear();
    const month = nowParts[1] || new Date().getMonth() + 1;
    setIsLoadingMonthly(true);
    fetchMonthlyPrayerCalendarClient({ pref: locationPref, year, month })
      .then((res) => {
        if (!cancelled) setMonthlyRows(res.rows);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMonthly(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, locationPref, activeRecord.localDate]);

  const handleSelectLocationPref = useCallback((nextPref: UserLocationPreference) => {
    setLocationPref(nextPref);
    let userId: string | null = null;
    try {
      const storedUser = window.localStorage.getItem('asaka_ziyo_device_id');
      if (storedUser) {
        userId = storedUser;
      } else {
        userId = `web-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem('asaka_ziyo_device_id', userId);
      }
    } catch {
      userId = null;
    }
    syncLocationPreferenceToServer(userId, nextPref);
  }, []);

  const handleQuickCitySwitch = (cityId: string) => {
    const loc = findBuiltInLocationById(cityId);
    if (!loc) return;
    handleSelectLocationPref({
      ...locationPref,
      cityId: loc.id,
      districtId: loc.districtId,
      customLocation: null,
      calculationMethod: loc.id === ASAKA_CANONICAL_CITY_ID ? undefined : loc.defaultMethod,
      asrMethod: loc.id === ASAKA_CANONICAL_CITY_ID ? undefined : loc.defaultAsr,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleQuickGps = async () => {
    setIsGpsLoading(true);
    setGpsBanner(null);
    try {
      const res = await resolveGpsLocationClient();
      if (res.ok && res.location) {
        handleSelectLocationPref({
          ...locationPref,
          cityId: res.location.id,
          districtId: res.location.districtId,
          customLocation: null,
          calculationMethod:
            res.location.id === ASAKA_CANONICAL_CITY_ID ? undefined : res.location.defaultMethod,
          asrMethod:
            res.location.id === ASAKA_CANONICAL_CITY_ID ? undefined : res.location.defaultAsr,
          updatedAt: new Date().toISOString(),
        });
        setGpsBanner(`GPS aniqlandi: ${res.location.cityName}, ${res.location.regionName}`);
      } else {
        setGpsBanner(res.error || 'GPS ruxsati berilmadi — shaharni qo‘lda tanlang.');
      }
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Real DeviceOrientationEvent Qibla Compass Sensor (Dynamic per selected city!)
  const ACTIVE_QIBLA_BEARING = Math.round(activeRecord.qiblaAngleDeg || 241);
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

  // Build active display PrayerTimeEntry[] from activeRecord (preserving iqamah times for Asaka MANUAL!)
  const isAsakaManual = activeRecord.sourceMode === 'MANUAL_ADMIN';
  const activePrayerTimes: PrayerTimeEntry[] = isAsakaManual
    ? schedule.times
    : activeRecord.times;

  // Live dynamic countdown calculation in the SELECTED CITY'S IANA timezone
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      setPrayerCalculation(getNextPrayerCalculation(activePrayerTimes));
      setLiveDateContext(resolveAsakaDateContext(now, currentLocale));

      const tzNow = getLocalDateTimeInTimezone(activeRecord.timezone, now);
      setLiveLocalClock(tzNow.localTimeNow);
      const nextInfo = computeNextPrayerInTimezone(
        activePrayerTimes,
        activeRecord.timezone,
        now
      );
      const sec = Math.max(0, nextInfo.secondsRemaining || 0);
      const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      setLiveCountdownText(`${hh}:${mm}:${ss}`);
      setLiveNextPrayerName(nextInfo.nameUz || 'Bomdod');
      setLiveNextPrayerKey(nextInfo.key || 'bomdod');
      setLiveIsTomorrow(nextInfo.isTomorrow);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeRecord, currentLocale, activePrayerTimes]);

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
              <span className="font-semibold text-[#F7F5F0]">
                {activeRecord.cityName}
                {activeRecord.districtName && activeRecord.districtName !== activeRecord.cityName
                  ? ` (${activeRecord.districtName})`
                  : ''}
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span>
                {activeRecord.regionName}, {activeRecord.countryName}
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span className="text-[#F7F5F0] font-semibold font-mono-numbers">
                {activeRecord.localDate} ({liveLocalClock || activeRecord.localTimeNow})
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span className="az-type-numeric text-emerald-300 font-semibold">
                {isAsakaManual ? liveDateContext.hijri.formatted : activeRecord.hijriDate}
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span className="font-mono-numbers text-[#C8A85E]">
                {activeRecord.timezone}
                {activeRecord.isDstActive ? ' (DST)' : ''}
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
            <MaskedSplitText
              as="h1"
              text={`${t('prayer:title')} — ${activeRecord.cityName}`}
              className="az-type-hero text-[#F7F4EC]"
            />
            <p className="az-type-body text-[#C8D6D0]">
              {isAsakaManual
                ? t('prayer:subtitle')
                : `${activeRecord.regionName}, ${activeRecord.countryName} uchun global namoz taqvimi va jonli ob-havo markazi`}
            </p>
          </div>

          {/* TOP SECTION: GLOBAL LOCATION SWITCHER BAR */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowLocationModal(true)}
              className="gap-2 text-xs"
            >
              <Globe className="w-4 h-4" />
              <span>Hudud / Shahar tanlash</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>

            <button
              type="button"
              onClick={() => handleQuickCitySwitch(ASAKA_CANONICAL_CITY_ID)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeRecord.cityId === ASAKA_CANONICAL_CITY_ID
                  ? 'bg-emerald-500/25 border-emerald-400 text-white'
                  : 'bg-white/[0.06] border-white/[0.14] text-[#C8D6D0] hover:bg-white/[0.12]'
              }`}
            >
              Asaka (MANUAL)
            </button>
            <button
              type="button"
              onClick={() => handleQuickCitySwitch('uz-tashkent-city-main')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeRecord.cityId === 'uz-tashkent-city-main'
                  ? 'bg-emerald-500/25 border-emerald-400 text-white'
                  : 'bg-white/[0.06] border-white/[0.14] text-[#C8D6D0] hover:bg-white/[0.12]'
              }`}
            >
              Toshkent
            </button>
            <button
              type="button"
              onClick={() => handleQuickCitySwitch('sa-makkah')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeRecord.cityId === 'sa-makkah'
                  ? 'bg-[#C8A85E]/30 border-[#C8A85E] text-white'
                  : 'bg-white/[0.06] border-white/[0.14] text-[#C8D6D0] hover:bg-white/[0.12]'
              }`}
            >
              Makka
            </button>
            <button
              type="button"
              onClick={() => handleQuickCitySwitch('sa-madinah')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeRecord.cityId === 'sa-madinah'
                  ? 'bg-[#C8A85E]/30 border-[#C8A85E] text-white'
                  : 'bg-white/[0.06] border-white/[0.14] text-[#C8D6D0] hover:bg-white/[0.12]'
              }`}
            >
              Madina
            </button>
            <button
              type="button"
              disabled={isGpsLoading}
              onClick={handleQuickGps}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#C8A85E]/40 bg-[#C8A85E]/15 text-[#F7F4EC] hover:bg-[#C8A85E]/25 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              {isGpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-[#C8A85E]" />
              )}
              <span>GPS</span>
            </button>
            {isLoadingSchedule && (
              <span className="text-xs text-emerald-300 inline-flex items-center gap-1.5 ml-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Yangilanmoqda...
              </span>
            )}
          </div>

          {gpsBanner && (
            <div className="text-xs text-amber-200 bg-black/30 border border-amber-400/30 rounded-xl px-3 py-2">
              {gpsBanner}
            </div>
          )}
        </div>
      </div>

      {/* 2. SOURCE MODE & VERIFICATION HONESTY BANNER (MANUAL_ADMIN vs AUTO_CALCULATED) */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          isAsakaManual
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100'
            : activeRecord.verified
              ? 'border-teal-200 bg-teal-50/90 text-teal-950 dark:border-teal-500/35 dark:bg-teal-950/40 dark:text-teal-100'
              : 'border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-100'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAsakaManual
                ? 'bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : activeRecord.verified
                  ? 'bg-teal-600/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400'
                  : 'bg-amber-600/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {isAsakaManual ? (
              <ShieldCheck className="w-5 h-5" />
            ) : activeRecord.verified ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base">
              {isAsakaManual
                ? 'Asaka Shahri — Rasmiy Administrator Jadvali (MANUAL_ADMIN)'
                : activeRecord.verified
                  ? `${activeRecord.cityName} — Tasdiqlangan AUTO Taqvim (${activeRecord.sourceName})`
                  : `${activeRecord.cityName} — Astronomik AUTO Taqvim (Tekshirilmagan / Mahalliy taqvim bilan ±1-2 daq farq bo‘lishi mumkin)`}
            </div>
            <div className="opacity-85 text-xs font-mono-numbers mt-0.5">
              {isAsakaManual
                ? `${t('prayer:verifiedByLabel')}: ${schedule.publishedBy} · ${schedule.verifiedAt} · Avtomatik hisob-kitob bilan o‘zgartirilmaydi`
                : `Usul: ${activeRecord.calculationMethodLabel || activeRecord.calculationMethod} · Asr: ${activeRecord.asrMethod} · ${activeRecord.verificationNote || activeRecord.sourceName}`}
            </div>
            {activeRecord.staleWarning && (
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1">
                {activeRecord.staleWarning}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {!isAsakaManual && (
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={
                  locationPref.calculationMethod ||
                  (activeRecord.calculationMethod !== 'MANUAL_ADMIN'
                    ? activeRecord.calculationMethod
                    : 'UZBEKISTAN_OMI')
                }
                onChange={(e) =>
                  handleSelectLocationPref({
                    ...locationPref,
                    calculationMethod: e.target.value as CalculationMethodId,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#091A16] text-xs font-semibold"
              >
                <option value="UZBEKISTAN_OMI">O‘MI (O‘zbekiston)</option>
                <option value="UMM_AL_QURA">Umm al-Qura</option>
                <option value="MWL">MWL</option>
                <option value="KARACHI">Karachi</option>
                <option value="DIYANET_TURKEY">Diyanet</option>
                <option value="DUBAI">Dubai</option>
                <option value="ISNA">ISNA</option>
                <option value="EGYPT">Egypt</option>
                <option value="RUSSIA_DUM">Russia DUM</option>
              </select>
              <select
                value={locationPref.asrMethod || activeRecord.asrMethod}
                onChange={(e) =>
                  handleSelectLocationPref({
                    ...locationPref,
                    asrMethod: e.target.value as AsrMethodId,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#091A16] text-xs font-semibold"
              >
                <option value="HANAFI">Hanafiy</option>
                <option value="STANDARD">Standart</option>
              </select>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAdmin}
            className="text-xs shrink-0 border-[#c5a869]/50 text-[#c5a869] hover:bg-[#c5a869]/10"
          >
            {t('prayer:verifyButton')}
          </Button>
        </div>
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

      {/* TAB 1: DAILY PRAYER SCHEDULE, LIVE COUNTDOWN + VISUALLY SEPARATED WEATHER */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* TOP GRID: Next Prayer Countdown (Left) + Visually Separated Current Weather Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card elevated className="lg:col-span-7 p-6 sm:p-8 bg-gradient-to-br from-[#051d18] via-[#072620] to-[#031d17] text-white border-[#c5a869]/50 relative overflow-hidden shadow-2xl">
              <GeometricPattern opacity={0.06} />
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 h-full">
                <div className="space-y-3 text-center sm:text-left max-w-md">
                  <div className="inline-flex items-center gap-2 text-[#DFBD69] text-xs font-bold uppercase tracking-[0.2em]">
                    <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                    <span>{t('prayer:nextPrayer')}</span>
                    <span className="text-[#DFBD69]/45" aria-hidden="true">·</span>
                    <span className="font-mono-numbers text-emerald-300">
                      {activeRecord.cityName}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
                    {liveNextPrayerName ||
                      (prayerCalculation.nextPrayer
                        ? getLocalizedPrayerName(
                            prayerCalculation.nextPrayer.key,
                            prayerCalculation.nextPrayer.nameUz
                          )
                        : t('prayer:peshin'))}{' '}
                    {liveIsTomorrow && `(${getLocalizedText('Ertangi')})`}
                  </h2>

                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {activeRecord.timezone} vaqt zonasi bo‘yicha hisoblanmoqda · Qibla: {ACTIVE_QIBLA_BEARING}°
                  </p>
                </div>

                {/* Spring-animated circular countdown ring */}
                <AnimatedProgressRing
                  progress={progressPercent}
                  size={168}
                  strokeWidth={11}
                  trackClassName="stroke-emerald-950/80"
                  strokeColor="#e6ce8a"
                  secondaryStrokeColor="#c5a869"
                  className="shrink-0"
                >
                  <div className="text-2xl font-mono-numbers font-extrabold text-white tracking-wider">
                    {liveCountdownText}
                  </div>
                  <div className="text-[10px] text-[#c5a869] uppercase tracking-widest font-bold mt-1">
                    {activeRecord.nextPrayer?.time || '--:--'}
                  </div>
                </AnimatedProgressRing>
              </div>
            </Card>

            {/* Visually Distinct Current Weather Card */}
            <div className="lg:col-span-5">
              <WeatherCenterPanel
                weather={weather}
                isLoading={isLoadingWeather}
                error={weatherError}
                onRefresh={() => loadWeatherForActiveCity(true)}
                mode="compact"
              />
            </div>
          </div>

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
                      <AudioWaveformBars
                        isPlaying={playerState.isPlaying}
                        barCount={4}
                        barClassName="bg-[#10B981]"
                      />
                      <span className="az-type-overline text-[#C8A85E]">
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

          {/* MIDDLE SECTION: Today's 8 Prayer Times Cards Grid */}
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.035}>
            {activePrayerTimes.map((item) => {
              const isNext =
                liveNextPrayerKey === item.key || prayerCalculation.nextPrayer?.key === item.key;
              const localizedName = getLocalizedPrayerName(item.key, item.nameUz);
              const mode = getPrayerMode(item.key);
              const isAzanCapable = isFiveDailyPrayer(item.key);
              const prayerTrackId = getPrayerTrackId(item.key);
              const isThisTrackPlaying =
                isAzanCapable &&
                playerState.playingTrackId === prayerTrackId &&
                (playerState.isPlaying || playerState.isLoading);

              return (
                <StaggerCard key={item.key}>
                <Card
                  variant={isNext ? 'emerald' : 'elevated'}
                  className={`p-5 h-full space-y-4 transition-all duration-300 relative overflow-hidden ${
                    isNext
                      ? 'ring-1 ring-[#10B981]/60 shadow-[0_24px_64px_-16px_rgba(16,185,129,0.28)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#C8A85E]/15 border border-[#C8A85E]/30 flex items-center justify-center shrink-0">
                        {getPrayerIcon(item.key)}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isNext ? 'text-[#F7F4EC]' : 'text-[#091813] dark:text-[#F7F4EC]'}`}>
                          {localizedName}
                        </div>
                        <div className="text-xs font-arabic text-[#C8A85E]">{item.nameAr}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAzanCapable && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerTactileHaptic(8);
                            toggleAdhanAudio(prayerTrackId, alertSettings.volume);
                          }}
                          title={isThisTrackPlaying ? 'Azonni toʻxtatish' : 'Ushbu namoz azonini tinglash'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                            isThisTrackPlaying
                              ? 'bg-[#C8A85E] text-[#030706] border-[#C8A85E] shadow'
                              : 'bg-[#C8A85E]/12 text-[#8A6621] dark:text-[#C8A85E] border-[#C8A85E]/35 hover:bg-[#C8A85E]/22'
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
                    </div>
                  </div>

                  {isNext && (
                    <div className="az-type-overline text-[#34D399]">
                      Keyingi namoz
                    </div>
                  )}

                  {/* Explicit Sections for Azon and Iqomat */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#064E3B]/10 dark:border-white/[0.08] text-xs">
                    <div className={`p-2.5 rounded-xl border ${isNext ? 'bg-black/35 border-white/[0.12]' : 'bg-[#F2EFE7] dark:bg-[#0B1612] border-[#064E3B]/10 dark:border-white/[0.08]'}`}>
                      <div className={`text-[11px] font-medium ${isNext ? 'text-[#C8D6D0]' : 'text-[#5F776F] dark:text-[#8FA69D]'}`}>Azon vaqti</div>
                      <div className={`text-lg sm:text-xl font-bold font-mono-numbers tracking-tight mt-0.5 ${isNext ? 'text-[#F7F4EC]' : 'text-[#091813] dark:text-[#F7F4EC]'}`}>
                        {item.time}
                      </div>
                    </div>
                    <div className="bg-[#C8A85E]/12 dark:bg-[#C8A85E]/10 p-2.5 rounded-xl border border-[#C8A85E]/30 text-right">
                      <div className="text-[10px] text-[#8A6621] dark:text-[#C8A85E] uppercase font-bold">Jamoat (Iqomat)</div>
                      <div className="text-lg sm:text-xl font-bold font-mono-numbers text-[#8A6621] dark:text-[#F7F4EC] mt-0.5">
                        {item.iqamahTime || '—'}
                      </div>
                    </div>
                  </div>
                </Card>
                </StaggerCard>
              );
            })}
          </StaggerGrid>

          {/* BOTTOM SECTION: VISUALLY SEPARATED 24H + 7-DAY / 16-DAY WEATHER FORECAST CENTER */}
          <WeatherCenterPanel
            weather={weather}
            isLoading={isLoadingWeather}
            error={weatherError}
            onRefresh={() => loadWeatherForActiveCity(true)}
            mode="forecast"
          />

          {/* Regional Verification Disclaimer Card — Dual-Theme Light + Dark */}
          <Card className="p-5 bg-[#F2EFE9] dark:bg-[#0B1411] border-[#064E3B]/10 dark:border-white/[0.08] text-xs text-[#334F46] dark:text-[#C2D1CB] flex items-start gap-3.5">
            <Info className="w-5 h-5 text-[#064E3B] dark:text-[#C8A85E] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isAsakaManual
                ? getLocalizedText(schedule.disclaimer)
                : `${activeRecord.cityName} (${activeRecord.regionName}, ${activeRecord.countryName}) uchun namoz vaqtlari AUTO rejimda (${activeRecord.sourceName}) shakllantirilgan. Asaka shahrining MANUAL_ADMIN jadvaliga ta’sir qilmaydi.`}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: MONTHLY CALENDAR — REAL API-DRIVEN FOR SELECTED CITY */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="az-type-section text-[#0B1B16] dark:text-[#F7F5F0]">
                {t('prayer:monthlyTitle')} — {activeRecord.cityName}
              </h3>
              <p className="az-type-caption text-[#5F776F] dark:text-[#8FA69D]">
                {isAsakaManual
                  ? 'Asaka shahri uchun administrator boshqaruvidagi oylik jadval (MANUAL_ADMIN)'
                  : `${activeRecord.regionName}, ${activeRecord.countryName} · ${activeRecord.timezone} (${activeRecord.calculationMethodLabel || activeRecord.calculationMethod})`}
              </p>
            </div>
            <span className="az-type-numeric text-xs font-bold text-[#064E3B] dark:text-[#C8A85E]">
              {activeRecord.localDate.slice(0, 7)} · {activeRecord.hijriDate}
            </span>
          </div>

          {isLoadingMonthly ? (
            <div className="py-10 text-center text-xs text-[#5F776F] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#064E3B]" />
              <span>Oylik taqvim yuklanmoqda...</span>
            </div>
          ) : (
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
                  {(monthlyRows.length > 0
                    ? monthlyRows
                    : MONTHLY_CALENDAR_PREVIEW.map((r) => ({
                        day: r.day,
                        localDate: `2026-11-${String(r.day).padStart(2, '0')}`,
                        hijriDate: '',
                        tahajjud: r.tahajjud,
                        subh: r.subh,
                        fajr: r.bomdod,
                        sunrise: r.quyosh,
                        dhuhr: r.peshin,
                        asr: r.asr,
                        maghrib: r.shom,
                        isha: r.xufton,
                      }))
                  ).map((row) => (
                    <tr
                      key={row.day}
                      className={`hover:bg-[#064E3B]/[0.04] dark:hover:bg-white/[0.04] transition-colors ${
                        row.localDate === activeRecord.localDate
                          ? 'bg-emerald-500/10 font-semibold'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-bold text-[#064E3B] dark:text-[#C8A85E]">{row.day}</td>
                      <td className="py-3 px-3.5 text-[#5F776F] dark:text-[#8FA69D]">{row.localDate}</td>
                      <td className="py-3 px-3.5 text-emerald-700 dark:text-emerald-400 font-semibold">{row.tahajjud}</td>
                      <td className="py-3 px-3.5 text-teal-700 dark:text-teal-300">{row.subh}</td>
                      <td className="py-3 px-3.5 font-bold text-[#0B1B16] dark:text-[#F7F5F0]">{row.fajr}</td>
                      <td className="py-3 px-3.5 text-[#5F776F] dark:text-[#8FA69D]">{row.sunrise}</td>
                      <td className="py-3 px-3.5 font-semibold text-[#0B1B16] dark:text-[#F7F5F0]">{row.dhuhr}</td>
                      <td className="py-3 px-3.5">{row.asr}</td>
                      <td className="py-3 px-3.5 font-semibold text-[#0B1B16] dark:text-[#F7F5F0]">{row.maghrib}</td>
                      <td className="py-3 px-3.5 text-indigo-700 dark:text-indigo-300">{row.isha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: SPATIAL 3D QIBLA COMPASS (DYNAMIC FOR ANY SELECTED CITY) */}
      {activeTab === 'qibla' && (() => {
        const isLiveCompass = compassStatus === 'active' && compassHeading !== null;
        const needleAngle = isLiveCompass
          ? (ACTIVE_QIBLA_BEARING - compassHeading + 360) % 360
          : ACTIVE_QIBLA_BEARING;
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
                    {isLiveCompass ? `${compassHeading}°` : `${ACTIVE_QIBLA_BEARING}°`}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Live Bearing Readout + Sensor Activation Control */}
            <div className="relative z-10 space-y-3">
              <div className="az-type-numeric text-3xl sm:text-4xl font-extrabold text-[#F7F5F0] tracking-tight">
                {ACTIVE_QIBLA_BEARING}° <span className="text-[#C8A85E]">{activeRecord.cityName}</span>
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

      {/* GLOBAL LOCATION PICKER MODAL */}
      <GlobalLocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentPref={locationPref}
        onSelectLocation={handleSelectLocationPref}
      />
    </div>
  );
};
