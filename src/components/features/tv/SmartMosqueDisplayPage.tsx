import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Link2, Maximize2, Minimize2 } from 'lucide-react';
import { PrayerKey, SupportedLocale } from '../../../types';
import { SUPPORTED_LOCALES } from '../../../i18n';
import {
  CanonicalDisplayProfileId,
  DEFAULT_SMART_DISPLAY_SETTINGS,
  DisplayAnnouncementItem,
  SmartDisplaySettings,
  computeSmartDisplayTimeline,
  normalizeDisplayTemplate,
  validateDisplaySchedule,
} from '../../../utils/smartMosqueDisplayEngine';
import {
  DISPLAY_SUPPORTED_LOCALES,
  getDisplayLocaleBundle,
  localizeHijriDate,
  sanitizeDisplayDynamicText,
} from '../../../utils/smartMosqueDisplayI18n';
import {
  DisplaySyncSnapshot,
  PairedMonitorSession,
  buildFallbackLocalSnapshot,
  clearMonitorSession,
  getSavedMonitorSession,
  pairMonitorWithCode,
  sendMonitorHeartbeat,
  subscribeToLiveDisplayFirestoreUpdates,
  syncDisplaySnapshotFromServer,
} from '../../../utils/smartMosqueDisplayService';
import {
  CANONICAL_PROFILE_ORDER,
  DISPLAY_PROFILE_THEMES,
  DisplayPrayerRowItem,
  parseHijriParts,
} from './display/displayProfiles';
import { DisplayClockHeader } from './display/DisplayClockHeader';
import { DisplayPrayerLedger } from './display/DisplayPrayerLedger';
import { DisplayCountdownBand } from './display/DisplayCountdownBand';
import { DisplayAnnouncementBar } from './display/DisplayAnnouncementBar';
import { DisplayPairingModal, DisplayStandbyScreen } from './display/DisplayPairingModal';
import {
  Phase2GalleryProfileId,
  Phase2PremiumDisplayRenderer,
} from './display/Phase2PremiumDisplayRenderer';
import { MasjidAlNabawiDisplay } from './display/MasjidAlNabawiDisplay';
import { useDisplayResponsiveLayout } from '../../../utils/smartMosqueResponsiveEngine';

interface SmartMosqueDisplayPageProps {
  onExitToApp?: () => void;
}

function resolveInitialPreviewLocale(): SupportedLocale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('asaka_ziyo_locale') as SupportedLocale | null;
      if (saved && DISPLAY_SUPPORTED_LOCALES.includes(saved)) {
        return saved;
      }
    }
  } catch {
    // ignore storage errors
  }
  return 'uz-Latn';
}

export const SmartMosqueDisplayPage: React.FC<SmartMosqueDisplayPageProps> = ({
  onExitToApp,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const lastDateStrRef = useRef<string>('');

  const [session, setSession] = useState<PairedMonitorSession | null>(() =>
    getSavedMonitorSession()
  );
  const [snapshot, setSnapshot] = useState<DisplaySyncSnapshot>(() =>
    buildFallbackLocalSnapshot()
  );
  const [previewLocale, setPreviewLocale] = useState<SupportedLocale>(() =>
    resolveInitialPreviewLocale()
  );
  const [previewProfile, setPreviewProfile] = useState<CanonicalDisplayProfileId>('royal_ivory');

  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [pairModalOpen, setPairModalOpen] = useState<boolean>(false);
  const [pairCodeInput, setPairCodeInput] = useState<string>('');
  const [pairError, setPairError] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [activeAnnIdx, setActiveAnnIdx] = useState<number>(0);

  const isPaired = Boolean(session && snapshot.mode === 'paired' && snapshot.monitor);

  const settings: SmartDisplaySettings = useMemo(
    () => ({
      ...DEFAULT_SMART_DISPLAY_SETTINGS,
      ...(snapshot.monitor?.settings || {}),
    }),
    [snapshot.monitor]
  );

  // Shared Automatic Universal Responsive Layout Engine (strictly independent of design profile!)
  const responsiveLayout = useDisplayResponsiveLayout(settings.orientationPreference || 'auto');
  const isNativePortraitViewport = responsiveLayout.isPortrait;

  const activeLocale: SupportedLocale = useMemo(() => {
    const candidate = isPaired ? snapshot.monitor?.language : previewLocale;
    return candidate && DISPLAY_SUPPORTED_LOCALES.includes(candidate) ? candidate : 'uz-Latn';
  }, [isPaired, snapshot.monitor?.language, previewLocale]);

  // Design selection is strictly independent of viewport dimensions or orientation
  const activeProfile: CanonicalDisplayProfileId = useMemo(() => {
    if (isPaired && snapshot.monitor?.template) {
      return normalizeDisplayTemplate(snapshot.monitor.template);
    }
    return previewProfile;
  }, [isPaired, snapshot.monitor?.template, previewProfile]);

  const theme = DISPLAY_PROFILE_THEMES[activeProfile];

  const t = useMemo(() => getDisplayLocaleBundle(activeLocale), [activeLocale]);

  const timeline = useMemo(
    () => computeSmartDisplayTimeline(snapshot.schedule, nowTick),
    [snapshot.schedule, nowTick]
  );

  const scheduleValidation = useMemo(
    () => validateDisplaySchedule(snapshot.schedule, nowTick),
    [snapshot.schedule, nowTick]
  );

  const activeAnnouncements = useMemo(() => {
    const today = timeline.clock.dateStr;
    return (snapshot.announcements || []).filter((a) => {
      if (a.isActive === false) return false;
      if (a.startsAt && /^\d{4}-\d{2}-\d{2}$/.test(a.startsAt) && today < a.startsAt) return false;
      if (a.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(a.expiresAt) && today > a.expiresAt) return false;
      return true;
    });
  }, [snapshot.announcements, timeline.clock.dateStr]);

  // Wake Lock API (24/7 awake)
  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (settings.autoWakeLock !== false && nav?.wakeLock?.request) {
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener?.('release', () => setWakeLockActive(false));
      }
    } catch {
      setWakeLockActive(false);
    }
  }, [settings.autoWakeLock]);

  useEffect(() => {
    requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        wakeLockRef.current?.release?.();
      } catch {
        // ignore
      }
    };
  }, [requestWakeLock]);

  // Server sync, QR auto-pairing, heartbeat & live Firestore updates
  const performSync = useCallback(async (activeSess: PairedMonitorSession | null) => {
    const res = await syncDisplaySnapshotFromServer({
      monitorToken: activeSess?.monitorToken,
      preview: !activeSess,
    });
    if (res.revoked) {
      setSession(null);
      setPairModalOpen(true);
      return;
    }
    if (res.success && res.snapshot) {
      setSnapshot(res.snapshot);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code')?.replace(/\D/g, '');
    const urlTemplate = params.get('template');
    const urlLang = params.get('lang') as SupportedLocale | null;

    if (urlTemplate) {
      setPreviewProfile(normalizeDisplayTemplate(urlTemplate));
    }
    if (urlLang && DISPLAY_SUPPORTED_LOCALES.includes(urlLang)) {
      setPreviewLocale(urlLang);
    }

    if (urlCode && urlCode.length === 6) {
      setIsPairing(true);
      pairMonitorWithCode(urlCode, {
        resolution: `${window.innerWidth}x${window.innerHeight}`,
        fullscreen: Boolean(document.fullscreenElement),
        wakeLockActive,
      })
        .then((res) => {
          if (res.success && res.session && res.snapshot) {
            setSession(res.session);
            setSnapshot(res.snapshot);
            setPairModalOpen(false);
            setPairError(null);
            try {
              window.history.replaceState({}, '', '/display');
            } catch {
              // ignore
            }
          } else {
            setPairCodeInput(urlCode);
            setPairError(res.error || t.pairInvalidError);
            setPairModalOpen(true);
          }
        })
        .finally(() => setIsPairing(false));
    } else {
      performSync(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncTimer = setInterval(() => {
      if (navigator.onLine !== false) performSync(session);
    }, 20_000);

    const heartbeatTimer = setInterval(() => {
      if (session?.monitorToken && navigator.onLine !== false) {
        sendMonitorHeartbeat(session.monitorToken, {
          resolution: `${window.innerWidth}x${window.innerHeight}`,
          fullscreen: Boolean(document.fullscreenElement),
          wakeLockActive,
          scheduleVersion: snapshot.schedule.version,
        }).then((hb) => {
          if (hb.success && hb.status && hb.status !== snapshot.monitorStatus) {
            performSync(session);
          }
        });
      }
    }, 30_000);

    const handleOnline = () => {
      setIsOnline(true);
      performSync(session);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(syncTimer);
      clearInterval(heartbeatTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, performSync, wakeLockActive, snapshot.schedule.version, snapshot.monitorStatus]);

  useEffect(() => {
    const scheduleId = snapshot.monitor?.scheduleId || snapshot.schedule.id || 'asaka-main';
    return subscribeToLiveDisplayFirestoreUpdates(scheduleId, {
      onScheduleUpdate: (updatedSchedule) => {
        setSnapshot((prev) => ({
          ...prev,
          schedule: updatedSchedule,
          validation: validateDisplaySchedule(updatedSchedule),
        }));
      },
      onAnnouncementsUpdate: (updatedAnnouncements) => {
        setSnapshot((prev) => ({ ...prev, announcements: updatedAnnouncements }));
      },
    });
  }, [snapshot.monitor?.scheduleId, snapshot.schedule.id]);

  // 1-second wall clock tick & midnight rollover
  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentDay = timeline.clock.dateStr;
    if (lastDateStrRef.current && lastDateStrRef.current !== currentDay) {
      performSync(session);
    }
    lastDateStrRef.current = currentDay;
  }, [timeline.clock.dateStr, performSync, session]);

  // Announcement rotation
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const currentItem = activeAnnouncements[activeAnnIdx % activeAnnouncements.length];
    const durationMs =
      Math.max(5, currentItem?.displayDurationSec || settings.announcementIntervalSec || 10) * 1000;
    const rot = setTimeout(() => {
      setActiveAnnIdx((prev) => (prev + 1) % activeAnnouncements.length);
    }, durationMs);
    return () => clearTimeout(rot);
  }, [activeAnnouncements, activeAnnIdx, settings.announcementIntervalSec]);

  // Fullscreen & auto-hiding interaction reveal
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        rootRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const reveal = () => {
      setControlsVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!pairModalOpen) setControlsVisible(false);
      }, 3500);
    };

    window.addEventListener('mousemove', reveal);
    window.addEventListener('touchstart', reveal);
    window.addEventListener('keydown', reveal);
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('touchstart', reveal);
      window.removeEventListener('keydown', reveal);
    };
  }, [pairModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const lower = e.key.toLowerCase();
      if (lower === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (lower === 'p') {
        e.preventDefault();
        setPairModalOpen((prev) => !prev);
      } else if (!isPaired && lower === 't') {
        e.preventDefault();
        setPreviewProfile((prev) => {
          const idx = (CANONICAL_PROFILE_ORDER.indexOf(prev) + 1) % CANONICAL_PROFILE_ORDER.length;
          return CANONICAL_PROFILE_ORDER[idx];
        });
      } else if (!isPaired && lower === 'l') {
        e.preventDefault();
        setPreviewLocale((prev) => {
          const idx = SUPPORTED_LOCALES.findIndex((l) => l.code === prev);
          return SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length].code;
        });
      } else if (e.key === 'Escape' && pairModalOpen) {
        setPairModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen, isPaired, pairModalOpen]);

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairError(null);
    setIsPairing(true);
    const res = await pairMonitorWithCode(pairCodeInput, {
      resolution: `${window.innerWidth}x${window.innerHeight}`,
      fullscreen: isFullscreen,
      wakeLockActive,
    });
    setIsPairing(false);
    if (res.success && res.session && res.snapshot) {
      setSession(res.session);
      setSnapshot(res.snapshot);
      setPairModalOpen(false);
      setPairCodeInput('');
    } else {
      setPairError(res.error || t.pairInvalidError);
    }
  };

  const handleDisconnectMonitor = () => {
    clearMonitorSession();
    setSession(null);
    performSync(null);
  };

  // Prepare exact admin prayer schedule rows (zero auto-calculation, zero Arabic fields)
  const timesByKey = useMemo(() => {
    const map = new Map<PrayerKey, (typeof snapshot.schedule.times)[number]>();
    for (const item of snapshot.schedule.times || []) {
      map.set(item.key, item);
    }
    return map;
  }, [snapshot.schedule.times]);

  const fiveMainPrayers: DisplayPrayerRowItem[] = useMemo(() => {
    const isFriday = timeline.clock.isFriday;
    const keys: PrayerKey[] = ['bomdod', 'peshin', 'asr', 'shom', 'xufton'];
    return keys.map((key) => {
      const entry = timesByKey.get(key);
      const isJumaSlot = key === 'peshin' && isFriday && Boolean(snapshot.schedule.jumaTime);
      const effectiveKey: PrayerKey | 'juma' = isJumaSlot ? 'juma' : key;
      const azanTime = isJumaSlot ? snapshot.schedule.jumaTime : entry?.time || '--:--';
      const iqamahTime = isJumaSlot
        ? snapshot.schedule.jumaIqamahTime || entry?.iqamahTime || ''
        : entry?.iqamahTime || '';
      return {
        key: effectiveKey,
        label: t.prayerNames[effectiveKey],
        azanTime,
        iqamahTime,
        isCurrent: timeline.currentPrayerKey === effectiveKey,
        isNext: timeline.nextAzanKey === effectiveKey,
      };
    });
  }, [
    timesByKey,
    timeline.clock.isFriday,
    timeline.currentPrayerKey,
    timeline.nextAzanKey,
    snapshot.schedule,
    t.prayerNames,
  ]);

  const sunriseTime = timesByKey.get('quyosh')?.time || '--:--';
  const ishraqTime = snapshot.schedule.ishraqTime || '--:--';
  const tahajjudTime = timesByKey.get('tahajjud')?.time || '';
  const subhTime = timesByKey.get('subh')?.time || '';
  const jumaTimeDisplay = snapshot.schedule.jumaTime || timesByKey.get('peshin')?.time || '--:--';
  const jumaIqamahDisplay = snapshot.schedule.jumaIqamahTime || '';

  const gregorianMonth = t.months[timeline.clock.monthIndex] || '';
  const gregorianYear = String(timeline.clock.year);
  const localizedWeekday = t.weekdays[timeline.clock.weekdayIndex] || '';

  // Strictly sanitize and localize ALL dynamic strings (zero Arabic script ever rendered)
  const hijriLocalized = useMemo(
    () => localizeHijriDate(snapshot.schedule.hijriDate, activeLocale),
    [snapshot.schedule.hijriDate, activeLocale]
  );
  const hijriParts = useMemo(() => parseHijriParts(hijriLocalized), [hijriLocalized]);

  const mosqueTitleDisplay = useMemo(
    () =>
      sanitizeDisplayDynamicText(
        snapshot.monitor?.mosqueName || snapshot.schedule.mosqueName,
        activeLocale,
        t.mosqueSubtitleDefault
      ),
    [snapshot.monitor?.mosqueName, snapshot.schedule.mosqueName, t.mosqueSubtitleDefault, activeLocale]
  );

  const locationDisplay = useMemo(
    () =>
      sanitizeDisplayDynamicText(
        snapshot.monitor?.locationLabel || snapshot.schedule.location,
        activeLocale,
        t.tashkentTimeLabel
      ),
    [snapshot.monitor?.locationLabel, snapshot.schedule.location, t.tashkentTimeLabel, activeLocale]
  );

  const safeMonitorName = useMemo(
    () => sanitizeDisplayDynamicText(snapshot.monitor?.name, activeLocale, t.brandTitle),
    [snapshot.monitor?.name, activeLocale, t.brandTitle]
  );

  const currentAnnouncement: DisplayAnnouncementItem | null =
    activeAnnouncements.length > 0
      ? activeAnnouncements[activeAnnIdx % activeAnnouncements.length]
      : null;

  const localizedAnnouncement = useMemo(() => {
    if (!currentAnnouncement) {
      return {
        title: t.defaultAnnouncementTitle,
        body: t.defaultAnnouncementBody,
        mediaUrl: undefined,
      };
    }
    const translated = currentAnnouncement.translations?.[activeLocale];
    return {
      title: sanitizeDisplayDynamicText(
        translated?.title || currentAnnouncement.title,
        activeLocale,
        t.defaultAnnouncementTitle
      ),
      body: sanitizeDisplayDynamicText(
        translated?.body || currentAnnouncement.body,
        activeLocale,
        t.defaultAnnouncementBody
      ),
      mediaUrl: currentAnnouncement.mediaUrl,
    };
  }, [currentAnnouncement, activeLocale, t]);

  const nextPrayerLabel = timeline.nextAzanKey ? t.prayerNames[timeline.nextAzanKey] : '--';
  const iqamahPrayerLabel = timeline.iqamahPrayerKey
    ? t.prayerNames[timeline.iqamahPrayerKey]
    : nextPrayerLabel;

  // Disabled or Blocked Monitor Full-Screen Standby
  if (isPaired && (snapshot.monitorStatus === 'disabled' || snapshot.monitorStatus === 'blocked')) {
    return (
      <>
        <DisplayStandbyScreen
          isBlocked={snapshot.monitorStatus === 'blocked'}
          t={t}
          onOpenPairModal={() => setPairModalOpen(true)}
          onDisconnect={handleDisconnectMonitor}
        />
        <DisplayPairingModal
          isOpen={pairModalOpen}
          isPaired={isPaired}
          monitorName={safeMonitorName}
          pairCodeInput={pairCodeInput}
          pairError={pairError}
          isPairing={isPairing}
          t={t}
          onChangeCode={setPairCodeInput}
          onSubmit={handlePairSubmit}
          onDisconnect={handleDisconnectMonitor}
          onClose={() => setPairModalOpen(false)}
        />
      </>
    );
  }

  const rootStyle: React.CSSProperties = {
    ...(settings.brightnessPct && settings.brightnessPct !== 100
      ? { filter: `brightness(${Math.max(55, Math.min(115, settings.brightnessPct))}%)` }
      : {}),
    fontSize:
      settings.fontScale === 'xlarge'
        ? '110%'
        : settings.fontScale === 'large'
          ? '105%'
          : '100%',
  };

  const sharedClockHeaderProps = {
    profileId: activeProfile,
    theme,
    clock: timeline.clock,
    showSeconds: settings.showSeconds,
    showHijriDate: settings.showHijriDate,
    mosqueTitle: mosqueTitleDisplay,
    locationLabel: locationDisplay,
    gregorianMonth,
    gregorianYear,
    localizedWeekday,
    hijriLocalized,
    hijriParts,
    t,
  };

  const sharedCountdownProps = {
    profileId: activeProfile,
    theme,
    settings,
    timeline,
    sunriseTime,
    ishraqTime,
    jumaTime: jumaTimeDisplay,
    jumaIqamahTime: jumaIqamahDisplay,
    tahajjudTime,
    subhTime,
    nextPrayerLabel,
    iqamahPrayerLabel,
    t,
  };

  const sharedAnnouncementProps = {
    theme,
    showAnnouncements: settings.showAnnouncements,
    announcementKey: currentAnnouncement?.id || 'default',
    title: localizedAnnouncement.title,
    body: localizedAnnouncement.body,
    mediaUrl: localizedAnnouncement.mediaUrl,
    totalAnnouncements: activeAnnouncements.length,
    activeIndex: activeAnnIdx,
    isOnline,
    scheduleValidation,
    activeLocale,
    t,
  };

  return (
    <div
      ref={rootRef}
      style={rootStyle}
      className={`relative w-screen h-screen overflow-hidden select-none ${theme.pageBg} ${theme.inkPrimary}`}
    >
      {/* =================================================================== */}
      {/* FLOATING CONTROLS: ZERO ADMIN CONTROLS ON PAIRED TV MONITORS        */}
      {/* =================================================================== */}
      {isPaired ? (
        <div
          className={`fixed top-3 right-3 z-40 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            className="p-2.5 rounded-xl bg-black/55 backdrop-blur-md text-white/90 hover:text-white border border-white/15 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div
          className={`fixed top-3 right-3 z-40 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#041A12]/90 backdrop-blur-md border border-[#DFBD69]/35 text-[#FAF7F0] shadow-xl transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {onExitToApp && (
            <button
              type="button"
              onClick={onExitToApp}
              className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.exitDisplayButton}</span>
            </button>
          )}

          <select
            aria-label={t.templateLabel}
            value={activeProfile}
            onChange={(e) => {
              setPreviewProfile(e.target.value as CanonicalDisplayProfileId);
            }}
            className="bg-white/10 text-[#FAF7F0] text-xs font-semibold px-2 py-1 rounded-lg border border-white/15 cursor-pointer"
          >
            {CANONICAL_PROFILE_ORDER.map((pid) => (
              <option key={pid} value={pid} className="bg-[#041A12] text-white">
                {t.templates[pid]}
              </option>
            ))}
          </select>

          <select
            aria-label={t.languageLabel}
            value={activeLocale}
            onChange={(e) => setPreviewLocale(e.target.value as SupportedLocale)}
            className="bg-white/10 text-[#FAF7F0] text-xs font-semibold px-2 py-1 rounded-lg border border-white/15 cursor-pointer"
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <option key={loc.code} value={loc.code} className="bg-[#041A12] text-white">
                {loc.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPairModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-[#DFBD69] text-[#041A12] text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{t.pairMonitorButton}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* PROFILE COMPOSITIONS: 4 ORIGINAL + 6 PHASE 2 + UZBEK CYRILLIC TABLO */}
      {/* =================================================================== */}

      {/* PHASE 2 DESIGN 6 (MASJID AL-NABAWI) & DEDICATED UZBEK CYRILLIC TABLO */}
      {(activeProfile === 'masjid_al_nabawi' ||
        activeProfile === 'masjid_namoz_tablosa_uz_cyrl') && (
        <MasjidAlNabawiDisplay
          languageMode={
            activeProfile === 'masjid_namoz_tablosa_uz_cyrl' ? 'uz_cyrl_locked' : 'multilingual'
          }
          layout={responsiveLayout}
          settings={settings}
          timeline={timeline}
          prayers={fiveMainPrayers}
          sunriseTime={sunriseTime}
          ishraqTime={ishraqTime}
          jumaTime={jumaTimeDisplay}
          mosqueTitle={mosqueTitleDisplay}
          locationLabel={locationDisplay}
          hijriLocalized={hijriLocalized}
          rawHijriDate={snapshot.schedule.hijriDate}
          t={t}
          isOnline={isOnline}
        />
      )}

      {/* PHASE 2 DESIGNS 1–5 (SULTAN ROYAL, NOOR CLASSIC, MIDNIGHT PREMIUM, VISION MODERN, ISLAMIC HERITAGE) */}
      {(activeProfile === 'sultan_royal' ||
        activeProfile === 'noor_classic' ||
        activeProfile === 'midnight_premium' ||
        activeProfile === 'vision_modern' ||
        activeProfile === 'islamic_heritage') && (
        <Phase2PremiumDisplayRenderer
          profileId={activeProfile as Phase2GalleryProfileId}
          theme={theme}
          layout={responsiveLayout}
          settings={settings}
          timeline={timeline}
          prayers={fiveMainPrayers}
          sunriseTime={sunriseTime}
          ishraqTime={ishraqTime}
          jumaTime={jumaTimeDisplay}
          jumaIqamahTime={jumaIqamahDisplay}
          tahajjudTime={tahajjudTime}
          subhTime={subhTime}
          mosqueTitle={mosqueTitleDisplay}
          locationLabel={locationDisplay}
          gregorianMonth={gregorianMonth}
          gregorianYear={gregorianYear}
          localizedWeekday={localizedWeekday}
          hijriLocalized={hijriLocalized}
          nextPrayerLabel={nextPrayerLabel}
          iqamahPrayerLabel={iqamahPrayerLabel}
          announcementKey={currentAnnouncement?.id || 'default'}
          announcementTitle={localizedAnnouncement.title}
          announcementBody={localizedAnnouncement.body}
          announcementMediaUrl={localizedAnnouncement.mediaUrl}
          totalAnnouncements={activeAnnouncements.length}
          activeAnnouncementIndex={activeAnnIdx}
          isOnline={isOnline}
          scheduleValidation={scheduleValidation}
          activeLocale={activeLocale}
          t={t}
        />
      )}

      {/* ORIGINAL 4 PROFILES — COMPACT SMARTPHONE PORTRAIT FALLBACK (NEVER SQUEEZES DESKTOP COLUMNS) */}
      {(activeProfile === 'royal_ivory' ||
        activeProfile === 'emerald_royal' ||
        activeProfile === 'modern_minimal') &&
        responsiveLayout.deviceTier === 'mobile_portrait' && (
          <Phase2PremiumDisplayRenderer
            profileId={
              activeProfile === 'emerald_royal'
                ? 'sultan_royal'
                : activeProfile === 'modern_minimal'
                  ? 'vision_modern'
                  : 'noor_classic'
            }
            theme={theme}
            layout={responsiveLayout}
            settings={settings}
            timeline={timeline}
            prayers={fiveMainPrayers}
            sunriseTime={sunriseTime}
            ishraqTime={ishraqTime}
            jumaTime={jumaTimeDisplay}
            jumaIqamahTime={jumaIqamahDisplay}
            tahajjudTime={tahajjudTime}
            subhTime={subhTime}
            mosqueTitle={mosqueTitleDisplay}
            locationLabel={locationDisplay}
            gregorianMonth={gregorianMonth}
            gregorianYear={gregorianYear}
            localizedWeekday={localizedWeekday}
            hijriLocalized={hijriLocalized}
            nextPrayerLabel={nextPrayerLabel}
            iqamahPrayerLabel={iqamahPrayerLabel}
            announcementKey={currentAnnouncement?.id || 'default'}
            announcementTitle={localizedAnnouncement.title}
            announcementBody={localizedAnnouncement.body}
            announcementMediaUrl={localizedAnnouncement.mediaUrl}
            totalAnnouncements={activeAnnouncements.length}
            activeAnnouncementIndex={activeAnnIdx}
            isOnline={isOnline}
            scheduleValidation={scheduleValidation}
            activeLocale={activeLocale}
            t={t}
          />
        )}

      {/* D. MADINA PORTRAIT (Original Untouched 9:16 Vertical Pillar — Native Full-Bleed or Centered 9:16 Frame) */}
      {activeProfile === 'madina_portrait' && (
        <div
          className={`w-full h-full flex items-center justify-center ${
            isNativePortraitViewport ? '' : 'p-[clamp(8px,1.4vh,20px)]'
          }`}
        >
          <main
            className={`h-full flex flex-col ${
              responsiveLayout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
            } ${theme.surfaceBg} ${theme.inkPrimary} ${
              isNativePortraitViewport
                ? 'w-full'
                : 'aspect-[9/16] max-w-full rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-[#DFBD69]/25'
            }`}
          >
            <DisplayClockHeader {...sharedClockHeaderProps} />
            <DisplayPrayerLedger
              profileId="madina_portrait"
              theme={theme}
              prayers={fiveMainPrayers}
              t={t}
            />
            <DisplayCountdownBand {...sharedCountdownProps} />
            <DisplayAnnouncementBar {...sharedAnnouncementProps} />
          </main>
        </div>
      )}

      {/* B. EMERALD ROYAL (Original Untouched 16:9 Asymmetric Left Sanctuary + Right Monumental Ledger) */}
      {activeProfile === 'emerald_royal' &&
        responsiveLayout.deviceTier !== 'mobile_portrait' && (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <div
              style={
                responsiveLayout.contentMaxWidthPx
                  ? { maxWidth: `${responsiveLayout.contentMaxWidthPx}px` }
                  : undefined
              }
              className="w-full h-full flex flex-col overflow-hidden"
            >
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
                <aside
                  className={`lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 ${theme.secondarySurfaceBg} border-b lg:border-b-0 lg:border-r ${theme.hairline} px-[clamp(20px,2.8vw,48px)] py-[clamp(18px,2.8vh,38px)]`}
                >
                  <DisplayClockHeader {...sharedClockHeaderProps} />
                  <DisplayCountdownBand {...sharedCountdownProps} />
                </aside>
                <main className={`lg:col-span-7 xl:col-span-7 flex flex-col min-h-0 ${theme.surfaceBg}`}>
                  <DisplayPrayerLedger
                    profileId="emerald_royal"
                    theme={theme}
                    prayers={fiveMainPrayers}
                    t={t}
                  />
                </main>
              </div>
              <DisplayAnnouncementBar {...sharedAnnouncementProps} />
            </div>
          </div>
        )}

      {/* A. ROYAL IVORY & C. MODERN MINIMAL (Original Untouched Full-Bleed 16:9 Horizontal Signage) */}
      {(activeProfile === 'royal_ivory' || activeProfile === 'modern_minimal') &&
        responsiveLayout.deviceTier !== 'mobile_portrait' && (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <main
              style={
                responsiveLayout.contentMaxWidthPx
                  ? { maxWidth: `${responsiveLayout.contentMaxWidthPx}px` }
                  : undefined
              }
              className={`w-full h-full flex flex-col ${
                responsiveLayout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
              } ${theme.surfaceBg}`}
            >
              <DisplayClockHeader {...sharedClockHeaderProps} />
              <DisplayPrayerLedger
                profileId={activeProfile}
                theme={theme}
                prayers={fiveMainPrayers}
                t={t}
              />
              <DisplayCountdownBand {...sharedCountdownProps} />
              <DisplayAnnouncementBar {...sharedAnnouncementProps} />
            </main>
          </div>
        )}

      {/* Monitor Pairing Modal */}
      <DisplayPairingModal
        isOpen={pairModalOpen}
        isPaired={isPaired}
        monitorName={safeMonitorName}
        pairCodeInput={pairCodeInput}
        pairError={pairError}
        isPairing={isPairing}
        t={t}
        onChangeCode={setPairCodeInput}
        onSubmit={handlePairSubmit}
        onDisconnect={handleDisconnectMonitor}
        onClose={() => setPairModalOpen(false)}
      />
    </div>
  );
};
