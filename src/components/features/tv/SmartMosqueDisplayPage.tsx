import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Link2,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  PauseCircle,
  CheckCircle2,
  X,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { PrayerKey, SupportedLocale } from '../../../types';
import { SUPPORTED_LOCALES } from '../../../i18n';
import {
  DEFAULT_SMART_DISPLAY_SETTINGS,
  DisplayAnnouncementItem,
  DisplayTemplateId,
  SmartDisplaySettings,
  computeSmartDisplayTimeline,
  validateDisplaySchedule,
} from '../../../utils/smartMosqueDisplayEngine';
import {
  adaptDisplayTextForLocale,
  getDisplayLocaleBundle,
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

interface SmartMosqueDisplayPageProps {
  onExitToApp?: () => void;
}

type OrientationMode = 'auto' | 'landscape' | 'portrait';

const TEMPLATE_ORDER: DisplayTemplateId[] = [
  'classic_mosque',
  'premium_emerald',
  'minimal_modern',
];

/** Classical Masjid an-Nabawi calligraphic prayer titles with balanced kashida elongation */
const HARAMAYN_ARABIC_NAMES: Record<PrayerKey | 'ishroq' | 'juma', string> = {
  tahajjud: 'التهجد',
  subh: 'الصبح',
  bomdod: 'الفجـــر',
  quyosh: 'الشروق',
  ishroq: 'ابتداء وقت الضحى',
  peshin: 'الظهـــر',
  juma: 'الجمعـــة',
  asr: 'العصـــر',
  shom: 'المغـــرب',
  xufton: 'العشـــاء',
};

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function parseHijriParts(rawHijri: string): { day: string; month: string; year: string } {
  const clean = (rawHijri || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return { day: '', month: '', year: '' };
  const tokens = clean.split(' ');
  let day = '';
  let year = '';
  const middle: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!day && /^\d{1,2}$/.test(tk)) {
      day = tk;
    } else if (!year && /^\d{4}$/.test(tk)) {
      year = tk;
    } else {
      middle.push(tk);
    }
  }

  return {
    day,
    month: middle.join(' '),
    year,
  };
}

/**
 * Refined double-lined Islamic octagonal shield medallion (inspired by Masjid an-Nabawi day medallions)
 */
const DayMedallion: React.FC<{
  value: string;
  strokeColor: string;
  fillColor: string;
  textColor: string;
  sizeClass?: string;
}> = ({ value, strokeColor, fillColor, textColor, sizeClass = 'w-[clamp(44px,5.2vw,92px)] h-[clamp(44px,5.2vw,92px)]' }) => {
  if (!value) return null;
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass}`}>
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
      >
        <polygon
          points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2.4"
        />
        <polygon
          points="33,10 67,10 90,33 90,67 67,90 33,90 10,67 10,33"
          fill="none"
          stroke={strokeColor}
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
      </svg>
      <span
        className="relative z-10 font-mono-numbers tabular-nums font-extrabold leading-none"
        style={{ color: textColor, fontSize: '42%' }}
      >
        {value}
      </span>
    </div>
  );
};

/**
 * Ultra-subtle architectural silhouette of the Grand Mosque dome & arches + filigree corners
 * Never reduces text contrast (kept at ~4.5%–6% opacity like authentic Masjid an-Nabawi displays)
 */
const HaramaynArchitecturalBackdrop: React.FC<{ isDark: boolean; goldHex: string }> = ({
  isDark,
  goldHex,
}) => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden select-none">
    {/* Subtle geometric lattice pattern */}
    <svg className="absolute inset-0 w-full h-full" opacity={isDark ? 0.045 : 0.04}>
      <defs>
        <pattern id="haramayn-star-tile" width="96" height="96" patternUnits="userSpaceOnUse">
          <path
            d="M48 4 L60 36 L92 48 L60 60 L48 92 L36 60 L4 48 L36 36 Z"
            fill="none"
            stroke={goldHex}
            strokeWidth="0.9"
          />
          <circle cx="48" cy="48" r="14" fill="none" stroke={goldHex} strokeWidth="0.7" />
          <path d="M0 0 L96 96 M96 0 L0 96" stroke={goldHex} strokeWidth="0.35" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#haramayn-star-tile)" />
    </svg>

    {/* Iconic delicate Mosque Dome & Minaret architectural silhouette watermark */}
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 w-full h-[62%]"
      opacity={isDark ? 0.06 : 0.055}
    >
      <g fill={isDark ? '#DFBD69' : '#0D4A2E'}>
        {/* Main Central Green Dome silhouette */}
        <path d="M600 115 C592 140 535 168 505 225 C485 262 478 295 478 330 L722 330 C722 295 715 262 695 225 C665 168 608 140 600 115 Z" />
        <rect x="597" y="72" width="6" height="46" rx="3" />
        <circle cx="600" cy="68" r="7" />
        {/* Left & Right Flanking Domes */}
        <path d="M360 215 C325 235 302 278 302 330 L418 330 C418 278 395 235 360 215 Z" />
        <path d="M840 215 C805 235 782 278 782 330 L898 330 C898 278 875 235 840 215 Z" />
        {/* Left & Right Slender Minarets */}
        <path d="M210 75 L220 130 L224 330 L196 330 L200 130 Z" />
        <rect x="190" y="160" width="40" height="10" rx="2" />
        <rect x="193" y="215" width="34" height="8" rx="2" />
        <path d="M990 75 L1000 130 L1004 330 L976 330 L980 130 Z" />
        <rect x="970" y="160" width="40" height="10" rx="2" />
        <rect x="973" y="215" width="34" height="8" rx="2" />
        {/* Colonnade Arcade Base */}
        <path d="M0 330 L1200 330 L1200 600 L0 600 Z" opacity="0.5" />
      </g>
    </svg>

    {/* Soft architectural radial vignette for gallery-grade depth */}
    <div
      className="absolute inset-0"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse 85% 65% at 50% 10%, rgba(16, 102, 63, 0.24) 0%, transparent 65%)'
          : 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 255, 255, 0.55) 0%, rgba(214, 198, 165, 0.14) 100%)',
      }}
    />
  </div>
);

/** Classical architectural corner brass bracket */
const ArchitecturalCorner: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
  color: string;
}> = ({ position, color }) => {
  const posClass =
    position === 'tl'
      ? 'top-3 left-3'
      : position === 'tr'
        ? 'top-3 right-3 rotate-90'
        : position === 'br'
          ? 'bottom-3 right-3 rotate-180'
          : 'bottom-3 left-3 -rotate-90';
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={`pointer-events-none absolute w-7 h-7 sm:w-9 sm:h-9 ${posClass}`}
    >
      <path d="M2 34 L2 6 Q2 2 6 2 L34 2" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
      <path d="M8 28 L8 10 Q8 8 10 8 L28 8" fill="none" stroke={color} strokeWidth="1" opacity="0.45" />
      <circle cx="8" cy="8" r="2" fill={color} opacity="0.75" />
    </svg>
  );
};

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
  const [previewLocale, setPreviewLocale] = useState<SupportedLocale>('uz-Latn');
  const [previewTemplate, setPreviewTemplate] = useState<DisplayTemplateId>('classic_mosque');
  const [orientationMode, setOrientationMode] = useState<OrientationMode>('auto');
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [pairModalOpen, setPairModalOpen] = useState<boolean>(false);
  const [pairCodeInput, setPairCodeInput] = useState<string>('');
  const [pairError, setPairError] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [activeAnnIdx, setActiveAnnIdx] = useState<number>(0);

  // Derived active language, template, orientation, and display settings
  const isPaired = Boolean(session && snapshot.mode === 'paired' && snapshot.monitor);
  const activeLocale: SupportedLocale = isPaired
    ? snapshot.monitor!.language
    : previewLocale;
  const activeTemplate: DisplayTemplateId = isPaired
    ? snapshot.monitor!.template
    : previewTemplate;
  const settings: SmartDisplaySettings = useMemo(
    () => ({
      ...DEFAULT_SMART_DISPLAY_SETTINGS,
      ...(snapshot.monitor?.settings || {}),
    }),
    [snapshot.monitor]
  );

  const isPortraitLayout =
    orientationMode === 'portrait' ||
    (orientationMode === 'auto' && viewport.h > viewport.w * 1.05);

  const t = useMemo(() => getDisplayLocaleBundle(activeLocale), [activeLocale]);

  // Deterministic live Asia/Tashkent timeline (never resets on refresh!)
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

  // Viewport tracker for seamless portrait/landscape adaptation
  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. WAKE LOCK API (24/7 SCREEN AWAKE)
  // ---------------------------------------------------------------------------
  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (settings.autoWakeLock !== false && nav?.wakeLock?.request) {
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener?.('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch {
      setWakeLockActive(false);
    }
  }, [settings.autoWakeLock]);

  useEffect(() => {
    requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
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

  // ---------------------------------------------------------------------------
  // 2. SERVER SYNC, URL QR AUTO-PAIRING, HEARTBEAT & FIRESTORE LIVE LISTENERS
  // ---------------------------------------------------------------------------
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

  // Auto-pair if URL contains ?code=XXXXXX (from QR code scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code')?.replace(/\D/g, '');
    const urlTemplate = params.get('template') as DisplayTemplateId | null;
    const urlLang = params.get('lang') as SupportedLocale | null;
    const urlLayout = params.get('layout') as OrientationMode | null;

    if (urlTemplate && TEMPLATE_ORDER.includes(urlTemplate)) {
      setPreviewTemplate(urlTemplate);
    }
    if (urlLang && SUPPORTED_LOCALES.some((l) => l.code === urlLang)) {
      setPreviewLocale(urlLang);
    }
    if (urlLayout && ['auto', 'landscape', 'portrait'].includes(urlLayout)) {
      setOrientationMode(urlLayout);
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

  // Periodic sync (every 20s) + heartbeat (every 30s) + online recovery
  useEffect(() => {
    const syncTimer = setInterval(() => {
      if (navigator.onLine !== false) {
        performSync(session);
      }
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

  // Real-time Firestore listener on assigned displaySchedule + displayAnnouncements
  useEffect(() => {
    const scheduleId = snapshot.monitor?.scheduleId || snapshot.schedule.id || 'asaka-main';
    const unsub = subscribeToLiveDisplayFirestoreUpdates(scheduleId, {
      onScheduleUpdate: (updatedSchedule) => {
        setSnapshot((prev) => ({
          ...prev,
          schedule: updatedSchedule,
          validation: validateDisplaySchedule(updatedSchedule),
        }));
      },
      onAnnouncementsUpdate: (updatedAnnouncements) => {
        setSnapshot((prev) => ({
          ...prev,
          announcements: updatedAnnouncements,
        }));
      },
    });
    return unsub;
  }, [snapshot.monitor?.scheduleId, snapshot.schedule.id]);

  // ---------------------------------------------------------------------------
  // 3. 1-SECOND WALL CLOCK TICK + TASHKENT MIDNIGHT ROLLOVER DETECTION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentDay = timeline.clock.dateStr;
    if (lastDateStrRef.current && lastDateStrRef.current !== currentDay) {
      performSync(session);
    }
    lastDateStrRef.current = currentDay;
  }, [timeline.clock.dateStr, performSync, session]);

  // Announcement rotation timer
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

  // ---------------------------------------------------------------------------
  // 4. FULLSCREEN & AUTO-HIDING SMART TV TOOLBAR + KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
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
    const revealControls = () => {
      setControlsVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!pairModalOpen) setControlsVisible(false);
      }, 4500);
    };

    revealControls();
    window.addEventListener('mousemove', revealControls);
    window.addEventListener('touchstart', revealControls);
    window.addEventListener('keydown', revealControls);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('mousemove', revealControls);
      window.removeEventListener('touchstart', revealControls);
      window.removeEventListener('keydown', revealControls);
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
      } else if (lower === 'm') {
        e.preventDefault();
        setOrientationMode((prev) =>
          prev === 'portrait' ? 'landscape' : 'portrait'
        );
      } else if (!isPaired && lower === 't') {
        e.preventDefault();
        setPreviewTemplate((prev) => {
          const nextIdx = (TEMPLATE_ORDER.indexOf(prev) + 1) % TEMPLATE_ORDER.length;
          return TEMPLATE_ORDER[nextIdx];
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

  // ---------------------------------------------------------------------------
  // 5. PREPARE EXACT ADMIN PRAYER DATA (ZERO AUTO-CALCULATION)
  // ---------------------------------------------------------------------------
  const timesByKey = useMemo(() => {
    const map = new Map<PrayerKey, (typeof snapshot.schedule.times)[number]>();
    for (const item of snapshot.schedule.times || []) {
      map.set(item.key, item);
    }
    return map;
  }, [snapshot.schedule.times]);

  const fiveMainPrayers = useMemo(() => {
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
        nameAr: HARAMAYN_ARABIC_NAMES[effectiveKey],
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

  const gregorianDay = String(timeline.clock.day).padStart(2, '0');
  const gregorianMonth = t.months[timeline.clock.monthIndex] || '';
  const gregorianYear = String(timeline.clock.year);
  const localizedWeekday = t.weekdays[timeline.clock.weekdayIndex] || '';
  const arabicWeekday = ARABIC_WEEKDAYS[timeline.clock.weekdayIndex] || '';

  const hijriRawDisplay = useMemo(
    () => adaptDisplayTextForLocale(snapshot.schedule.hijriDate || '', activeLocale),
    [snapshot.schedule.hijriDate, activeLocale]
  );
  const hijriParts = useMemo(() => parseHijriParts(hijriRawDisplay), [hijriRawDisplay]);

  const mosqueTitleDisplay = useMemo(
    () =>
      adaptDisplayTextForLocale(
        snapshot.monitor?.mosqueName || snapshot.schedule.mosqueName || t.mosqueSubtitleDefault,
        activeLocale
      ),
    [snapshot.monitor?.mosqueName, snapshot.schedule.mosqueName, t.mosqueSubtitleDefault, activeLocale]
  );

  const locationDisplay = useMemo(
    () =>
      adaptDisplayTextForLocale(
        snapshot.monitor?.locationLabel || snapshot.schedule.location || 'Asaka, Andijon',
        activeLocale
      ),
    [snapshot.monitor?.locationLabel, snapshot.schedule.location, activeLocale]
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
        priority: 'normal' as const,
        mediaUrl: undefined,
      };
    }
    const translated = currentAnnouncement.translations?.[activeLocale];
    return {
      title: translated?.title || adaptDisplayTextForLocale(currentAnnouncement.title, activeLocale),
      body: translated?.body || adaptDisplayTextForLocale(currentAnnouncement.body, activeLocale),
      priority: currentAnnouncement.priority,
      mediaUrl: currentAnnouncement.mediaUrl,
    };
  }, [currentAnnouncement, activeLocale, t]);

  const nextPrayerLabel = timeline.nextAzanKey ? t.prayerNames[timeline.nextAzanKey] : '--';
  const iqamahPrayerLabel = timeline.iqamahPrayerKey
    ? t.prayerNames[timeline.iqamahPrayerKey]
    : nextPrayerLabel;

  // ---------------------------------------------------------------------------
  // 6. MONITOR DISABLED OR BLOCKED FULL-SCREEN STANDBY
  // ---------------------------------------------------------------------------
  if (isPaired && (snapshot.monitorStatus === 'disabled' || snapshot.monitorStatus === 'blocked')) {
    const isBlocked = snapshot.monitorStatus === 'blocked';
    return (
      <div
        ref={rootRef}
        className="w-screen h-screen bg-[#041A12] text-[#FAF6EC] flex flex-col items-center justify-center p-8 text-center select-none relative overflow-hidden"
      >
        <HaramaynArchitecturalBackdrop isDark goldHex="#DFBD69" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <img
            src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
            alt="ASAKA ZIYO"
            className="w-28 h-28 rounded-full mx-auto border-2 border-[#DFBD69] object-cover shadow-lg"
          />
          <div className="flex justify-center">
            {isBlocked ? (
              <ShieldAlert className="w-14 h-14 text-rose-400" />
            ) : (
              <PauseCircle className="w-14 h-14 text-[#DFBD69]" />
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#FFF6C8]">
            {isBlocked ? t.monitorBlockedTitle : t.monitorDisabledTitle}
          </h1>
          <p className="text-base sm:text-xl text-[#FAF6EC]/80 leading-relaxed">
            {isBlocked ? t.monitorBlockedSubtitle : t.monitorDisabledSubtitle}
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPairModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#DFBD69] text-[#041A12] font-bold text-sm cursor-pointer"
            >
              {t.pairMonitorButton}
            </button>
            <button
              type="button"
              onClick={handleDisconnectMonitor}
              className="px-5 py-2.5 rounded-xl border border-[#DFBD69]/40 text-[#FAF6EC] text-sm font-semibold cursor-pointer"
            >
              {t.pairPreviewButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 7. THREE ARCHITECTURAL HARAMAYN PALETTES
  // ---------------------------------------------------------------------------
  // 1) classic_mosque (Default): Authentic Masjid an-Nabawi Luminous Pearl Ivory + Royal Mosque Green + Brushed Gold
  // 2) premium_emerald: Haramayn Night Velvet Deep Emerald + 24K Gold + Warm Ivory
  // 3) minimal_modern: Pure Alabaster Marble + High-Contrast Obsidian Emerald + Antique Bronze
  const isClassic = activeTemplate === 'classic_mosque';
  const isEmerald = activeTemplate === 'premium_emerald';
  const isDarkTheme = isEmerald;

  const palette = isClassic
    ? {
        pageBg: 'bg-gradient-to-b from-[#F5F2EA] via-[#EFECE2] to-[#E8E3D5]',
        boardBg: 'bg-gradient-to-b from-[#F9F7F1] via-[#F2EFE6] to-[#ECE7DA]',
        inkPrimary: 'text-[#0B231A]',
        inkSecondary: 'text-[#355247]',
        inkMuted: 'text-[#5A7268]',
        goldHex: '#B68934',
        goldText: 'text-[#9B7022]',
        hairline: 'border-[#0D4A2E]/18',
        goldHairline: 'border-[#B68934]/45',
        medallionFill: 'rgba(182, 137, 52, 0.08)',
        medallionText: '#9B7022',
        activeRowBg: 'bg-gradient-to-r from-[#0C5231] via-[#0F633B] to-[#0C5231] text-[#FFFDF7] shadow-[0_8px_28px_rgba(12,82,49,0.28)]',
        activeRowGold: 'text-[#F3D586]',
        nextRowBg: 'bg-[#0D5A36]/[0.07]',
        haramaynBand: 'bg-gradient-to-r from-[#0B4F2F] via-[#11643C] to-[#0B4F2F] text-[#FFFFFF]',
        haramaynBandAccent: 'text-[#F4D88A]',
        footerBg: 'bg-[#EAE4D6]/90 text-[#112A20]',
      }
    : isEmerald
      ? {
          pageBg: 'bg-gradient-to-b from-[#03160F] via-[#052318] to-[#02100B]',
          boardBg: 'bg-gradient-to-b from-[#052117] via-[#041B12] to-[#03140E]',
          inkPrimary: 'text-[#FFFDF6]',
          inkSecondary: 'text-[#D6E5DD]',
          inkMuted: 'text-[#98B4A7]',
          goldHex: '#DFBD69',
          goldText: 'text-[#DFBD69]',
          hairline: 'border-[#DFBD69]/18',
          goldHairline: 'border-[#DFBD69]/45',
          medallionFill: 'rgba(223, 189, 105, 0.10)',
          medallionText: '#F0D488',
          activeRowBg: 'bg-gradient-to-r from-[#0F5D38] via-[#157246] to-[#0F5D38] text-[#FFFFFF] shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-[#DFBD69]/65',
          activeRowGold: 'text-[#FFE699]',
          nextRowBg: 'bg-[#DFBD69]/[0.07]',
          haramaynBand: 'bg-gradient-to-r from-[#0B4D2E] via-[#12683F] to-[#0B4D2E] text-[#FFFFFF]',
          haramaynBandAccent: 'text-[#FFE394]',
          footerBg: 'bg-[#02120C]/95 text-[#EFE9DA]',
        }
      : {
          pageBg: 'bg-[#FAF9F5]',
          boardBg: 'bg-[#FFFFFF]',
          inkPrimary: 'text-[#0A1F17]',
          inkSecondary: 'text-[#395047]',
          inkMuted: 'text-[#61756D]',
          goldHex: '#9D762D',
          goldText: 'text-[#8C6621]',
          hairline: 'border-[#0A1F17]/12',
          goldHairline: 'border-[#9D762D]/35',
          medallionFill: 'rgba(157, 118, 45, 0.06)',
          medallionText: '#8C6621',
          activeRowBg: 'bg-[#0A4A2D] text-[#FFFFFF] shadow-[0_6px_22px_rgba(10,74,45,0.22)]',
          activeRowGold: 'text-[#F3D88C]',
          nextRowBg: 'bg-[#0A4A2D]/[0.05]',
          haramaynBand: 'bg-[#0A4A2D] text-[#FFFFFF]',
          haramaynBandAccent: 'text-[#F3D88C]',
          footerBg: 'bg-[#F3F1EA] text-[#142C22]',
        };

  const fontScaleMultiplier =
    settings.fontScale === 'xlarge' ? 1.1 : settings.fontScale === 'large' ? 1.05 : 1;

  const brightnessStyle =
    settings.brightnessPct && settings.brightnessPct !== 100
      ? { filter: `brightness(${Math.max(55, Math.min(115, settings.brightnessPct))}%)` }
      : undefined;

  // Shared Reusable Monumental 5-Prayer Calligraphic Ledger (used in both Portrait & Landscape)
  const renderPrayerLedger = (compactVertical: boolean) => (
    <div className="flex-1 min-h-0 flex flex-col justify-between">
      {/* Subtle column header row so Azan vs Iqamah is unmistakable */}
      <div
        className={`grid grid-cols-[1.15fr_1fr_0.9fr_1.1fr] items-center px-[clamp(14px,2vw,34px)] pb-1.5 border-b ${palette.goldHairline} ${palette.inkMuted} text-[clamp(0.68rem,0.9vw,1.15rem)] font-bold tracking-[0.12em] uppercase`}
      >
        <span>{t.timeColumnLabel}</span>
        <span className="text-center">{t.azanColumnLabel}</span>
        <span className="text-center">{t.iqamahColumnLabel}</span>
        <span className="text-right font-arabic tracking-normal normal-case text-[1.15em]" dir="rtl">
          الصلاة
        </span>
      </div>

      {/* 5 Generous Monumental Prayer Rows */}
      <div className={`flex-1 min-h-0 flex flex-col justify-evenly divide-y ${palette.hairline}`}>
        {fiveMainPrayers.map((prayer) => {
          const isActive = prayer.isCurrent;
          const isNext = prayer.isNext && !isActive;

          return (
            <div
              key={prayer.key}
              className={`grid grid-cols-[1.15fr_1fr_0.9fr_1.1fr] items-center px-[clamp(14px,2vw,34px)] ${
                compactVertical ? 'py-[clamp(6px,1.05vh,18px)]' : 'py-[clamp(8px,1.5vh,24px)]'
              } transition-all duration-300 rounded-xl ${
                isActive
                  ? palette.activeRowBg
                  : isNext
                    ? palette.nextRowBg
                    : ''
              }`}
            >
              {/* Left: Localized Prayer Name */}
              <div className="min-w-0 pr-2">
                <div
                  className={`font-display font-extrabold uppercase tracking-[0.06em] leading-none truncate ${
                    compactVertical
                      ? 'text-[clamp(1.2rem,2.45vh,2.8rem)]'
                      : 'text-[clamp(1.25rem,2.15vw,3.1rem)]'
                  } ${isActive ? 'text-white' : palette.inkPrimary}`}
                >
                  {prayer.label}
                </div>
                {(isActive || isNext) && (
                  <div
                    className={`mt-1 text-[clamp(0.62rem,0.78vw,1rem)] font-bold tracking-wide truncate ${
                      isActive ? palette.activeRowGold : palette.goldText
                    }`}
                  >
                    {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                  </div>
                )}
              </div>

              {/* Center-Left: GIANT Azan Time */}
              <div
                className={`text-center font-mono-numbers tabular-nums font-extrabold tracking-tight leading-none ${
                  compactVertical
                    ? 'text-[clamp(1.75rem,4.1vh,4.2rem)]'
                    : 'text-[clamp(1.85rem,3.6vw,5.2rem)]'
                } ${isActive ? 'text-white' : palette.inkPrimary}`}
              >
                {prayer.azanTime}
              </div>

              {/* Center-Right: Crisp Iqamah Time */}
              <div
                className={`text-center font-mono-numbers tabular-nums font-bold tracking-tight leading-none ${
                  compactVertical
                    ? 'text-[clamp(1.2rem,2.55vh,2.65rem)]'
                    : 'text-[clamp(1.25rem,2.2vw,3.2rem)]'
                } ${isActive ? palette.activeRowGold : palette.inkSecondary}`}
              >
                {prayer.iqamahTime || '—'}
              </div>

              {/* Right: Monumental Arabic Calligraphic Name */}
              <div
                dir="rtl"
                className={`text-right font-arabic font-bold leading-none ${
                  compactVertical
                    ? 'text-[clamp(1.55rem,3.6vh,3.8rem)]'
                    : 'text-[clamp(1.7rem,3.1vw,4.5rem)]'
                } ${isActive ? palette.activeRowGold : palette.inkPrimary}`}
              >
                {prayer.nameAr}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Shared Iconic Haramayn Green Band (Juma + Next Azan After + Iqamah Countdown)
  const renderHaramaynGreenBand = (verticalLayout: boolean) => (
    <section
      aria-label="Juma and Prayer Countdowns"
      className={`relative border-y-2 ${palette.goldHairline} ${palette.haramaynBand} ${
        verticalLayout
          ? 'px-[clamp(16px,3vw,42px)] py-[clamp(12px,1.8vh,28px)]'
          : 'rounded-2xl border-2 px-[clamp(18px,2vw,36px)] py-[clamp(14px,2vh,28px)] shadow-[0_12px_36px_rgba(7,52,32,0.28)]'
      }`}
    >
      <div
        className={`grid items-center gap-x-[clamp(12px,2vw,36px)] gap-y-3 ${
          settings.showIqamahCountdown
            ? verticalLayout
              ? 'grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-2'
        }`}
      >
        {/* Block 1: Al-Juma */}
        {settings.showJuma && (
          <div className="text-center">
            <div
              dir="rtl"
              className={`font-arabic font-bold leading-none ${
                verticalLayout
                  ? 'text-[clamp(1.1rem,2.3vh,2.2rem)]'
                  : 'text-[clamp(1.15rem,1.45vw,2rem)]'
              } ${palette.haramaynBandAccent}`}
            >
              الجمعة
            </div>
            <div className="text-[clamp(0.7rem,0.9vw,1.15rem)] font-bold tracking-wider uppercase text-white/85 mt-0.5">
              {t.jumaLabel}
            </div>
            <div
              className={`font-mono-numbers tabular-nums font-extrabold leading-none tracking-tight mt-1.5 text-white ${
                verticalLayout
                  ? 'text-[clamp(1.6rem,3.8vh,3.8rem)]'
                  : 'text-[clamp(1.7rem,2.6vw,3.6rem)]'
              }`}
            >
              {jumaTimeDisplay}
            </div>
            {jumaIqamahDisplay && jumaIqamahDisplay !== jumaTimeDisplay && (
              <div className="text-[clamp(0.65rem,0.78vw,0.98rem)] font-mono-numbers text-white/75 mt-1">
                {t.iqamahColumnLabel}: {jumaIqamahDisplay}
              </div>
            )}
          </div>
        )}

        {/* Block 2: Next Azan After (Primary Live Countdown) */}
        <div
          className={`text-center ${
            settings.showJuma ? 'sm:border-l border-white/20 sm:pl-3' : ''
          }`}
        >
          <div
            dir="rtl"
            className={`font-arabic font-bold leading-none ${
              verticalLayout
                ? 'text-[clamp(1.1rem,2.3vh,2.2rem)]'
                : 'text-[clamp(1.15rem,1.45vw,2rem)]'
            } ${palette.haramaynBandAccent}`}
          >
            الأذان التالي بعد
          </div>
          <div className="text-[clamp(0.7rem,0.9vw,1.15rem)] font-bold tracking-wider uppercase text-white/90 mt-0.5 truncate">
            {t.nextAzanLabel} · {nextPrayerLabel}
          </div>
          <div
            className={`font-mono-numbers tabular-nums font-extrabold leading-none tracking-tight mt-1.5 text-white ${
              verticalLayout
                ? 'text-[clamp(1.6rem,3.8vh,3.8rem)]'
                : 'text-[clamp(1.7rem,2.6vw,3.6rem)]'
            }`}
          >
            {timeline.nextAzanCountdown}
          </div>
          <div className="text-[clamp(0.65rem,0.78vw,0.98rem)] font-mono-numbers text-white/75 mt-1">
            {t.azanColumnLabel}: {timeline.nextAzanTime}
            {timeline.isNextAzanTomorrow ? ` (${t.tomorrowPrefix})` : ''}
          </div>
        </div>

        {/* Block 3: Iqamah Countdown (Illuminates in Gold during Azan->Iqamah waiting window) */}
        {settings.showIqamahCountdown && (
          <div
            className={`text-center sm:border-l border-white/20 sm:pl-3 rounded-xl transition-colors ${
              timeline.isBetweenAzanAndIqamah
                ? 'bg-[#F4D88A]/18 py-2 px-2 ring-1 ring-[#F4D88A]/70'
                : ''
            }`}
          >
            <div
              dir="rtl"
              className={`font-arabic font-bold leading-none ${
                verticalLayout
                  ? 'text-[clamp(1.1rem,2.3vh,2.2rem)]'
                  : 'text-[clamp(1.15rem,1.45vw,2rem)]'
              } ${palette.haramaynBandAccent}`}
            >
              الإقامة بعد
            </div>
            <div className="text-[clamp(0.7rem,0.9vw,1.15rem)] font-bold tracking-wider uppercase text-white/90 mt-0.5 truncate">
              {timeline.isBetweenAzanAndIqamah
                ? t.iqamahWaitingLabel
                : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
            </div>
            <div
              className={`font-mono-numbers tabular-nums font-extrabold leading-none tracking-tight mt-1.5 ${
                timeline.isBetweenAzanAndIqamah ? palette.haramaynBandAccent : 'text-white'
              } ${
                verticalLayout
                  ? 'text-[clamp(1.6rem,3.8vh,3.8rem)]'
                  : 'text-[clamp(1.7rem,2.6vw,3.6rem)]'
              }`}
            >
              {timeline.iqamahCountdown}
            </div>
            <div className="text-[clamp(0.65rem,0.78vw,0.98rem)] font-mono-numbers text-white/75 mt-1 truncate">
              {timeline.isBetweenAzanAndIqamah
                ? t.iqamahPrepareNotice
                : `${t.iqamahColumnLabel}: ${timeline.iqamahTime}`}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // Shared Slim Bottom Announcement Ribbon
  const renderAnnouncementRibbon = () => (
    <footer
      className={`border-t ${palette.hairline} ${palette.footerBg} px-[clamp(16px,2.2vw,40px)] py-[clamp(8px,1.1vh,16px)] flex items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {localizedAnnouncement.mediaUrl && (
          <img
            src={localizedAnnouncement.mediaUrl}
            alt={localizedAnnouncement.title}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-lg object-cover border border-[#B68934]/45 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentAnnouncement?.id || 'default'}-${activeLocale}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0"
            >
              <span className={`font-extrabold text-[clamp(0.76rem,0.95vw,1.3rem)] shrink-0 ${palette.goldText}`}>
                {settings.showAnnouncements ? localizedAnnouncement.title : t.etiquetteTitle}
              </span>
              <span aria-hidden="true" className="opacity-35">
                ·
              </span>
              <span className="text-[clamp(0.76rem,0.95vw,1.3rem)] font-medium opacity-90 truncate">
                {settings.showAnnouncements ? localizedAnnouncement.body : t.etiquetteSubtitle}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Quiet Arabic Mosque Etiquette + Online/Offline Indicator */}
      <div className="flex items-center gap-3 shrink-0 text-[clamp(0.7rem,0.82vw,1.08rem)]">
        <span
          dir="rtl"
          className={`font-arabic text-[1.35em] font-semibold hidden md:inline ${palette.goldText}`}
        >
          استووا واعتدلوا
        </span>
        <span aria-hidden="true" className="opacity-25 hidden md:inline">
          |
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap opacity-80">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>{isOnline ? t.onlineLabel : t.offlineLabel}</span>
        </span>
      </div>
    </footer>
  );

  // Shared Top Clock + Twin Medallions + 3-Column Calendar Block
  const renderMonumentalClockAndCalendar = (verticalLayout: boolean) => (
    <div className="text-center space-y-[clamp(6px,1vh,16px)]">
      {/* Subtle Top Mosque Brand Crest & Name */}
      <div className="flex items-center justify-center gap-3">
        <img
          src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
          alt="ASAKA ZIYO"
          className="w-[clamp(34px,2.8vw,58px)] h-[clamp(34px,2.8vw,58px)] rounded-full object-cover border-2 border-[#B68934] shrink-0 shadow-xs"
        />
        <div className="text-left min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`font-display font-extrabold tracking-[0.16em] text-[clamp(0.85rem,1.2vw,1.65rem)] ${palette.goldText}`}
            >
              {t.brandTitle}
            </span>
            <span aria-hidden="true" className={`opacity-40 ${palette.inkMuted}`}>
              ·
            </span>
            <span
              className={`font-editorial font-bold text-[clamp(0.88rem,1.25vw,1.7rem)] truncate ${palette.inkPrimary}`}
            >
              {mosqueTitleDisplay}
            </span>
          </div>
          <div className={`text-[clamp(0.65rem,0.78vw,1rem)] font-medium ${palette.inkMuted}`}>
            {locationDisplay} · {t.tashkentTimeLabel}
          </div>
        </div>
      </div>

      {/* Iconic Masjid an-Nabawi Clock Row: [Gregorian Day Medallion]  04:44:20  [Hijri Day Medallion] */}
      <div className="flex items-center justify-center gap-[clamp(12px,2.2vw,36px)] pt-1">
        <DayMedallion
          value={gregorianDay}
          strokeColor={palette.goldHex}
          fillColor={palette.medallionFill}
          textColor={palette.medallionText}
          sizeClass={
            verticalLayout
              ? 'w-[clamp(48px,6.8vh,86px)] h-[clamp(48px,6.8vh,86px)]'
              : 'w-[clamp(48px,4.8vw,86px)] h-[clamp(48px,4.8vw,86px)]'
          }
        />

        <div
          className={`font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.02em] ${
            verticalLayout
              ? 'text-[clamp(2.8rem,7.2vh,6.6rem)]'
              : 'text-[clamp(2.8rem,5.2vw,6.8rem)]'
          } ${palette.inkPrimary}`}
        >
          <span>{timeline.clock.hh}</span>
          <span className={`${palette.goldText} mx-[0.03em]`}>:</span>
          <span>{timeline.clock.mm}</span>
          {settings.showSeconds && (
            <>
              <span className={`${palette.goldText} mx-[0.03em]`}>:</span>
              <span className={palette.inkSecondary}>{timeline.clock.ss}</span>
            </>
          )}
        </div>

        <DayMedallion
          value={settings.showHijriDate ? hijriParts.day : ''}
          strokeColor={palette.goldHex}
          fillColor={palette.medallionFill}
          textColor={palette.medallionText}
          sizeClass={
            verticalLayout
              ? 'w-[clamp(48px,6.8vh,86px)] h-[clamp(48px,6.8vh,86px)]'
              : 'w-[clamp(48px,4.8vw,86px)] h-[clamp(48px,4.8vw,86px)]'
          }
        />
      </div>

      {/* Triple-Column Calendar Band (Gregorian Month+Year | Arabic + Local Weekday | Hijri Month+Year) */}
      <div
        className={`grid grid-cols-3 items-center pt-1 pb-2 border-b ${palette.goldHairline}`}
      >
        {/* Left: Gregorian Month & Year */}
        <div className="text-center">
          <div
            className={`font-display font-bold leading-tight ${
              verticalLayout
                ? 'text-[clamp(0.95rem,2vh,1.9rem)]'
                : 'text-[clamp(0.95rem,1.35vw,1.85rem)]'
            } ${palette.inkPrimary}`}
          >
            {gregorianMonth}
          </div>
          <div
            className={`font-mono-numbers tabular-nums font-extrabold leading-tight ${
              verticalLayout
                ? 'text-[clamp(0.95rem,1.9vh,1.8rem)]'
                : 'text-[clamp(0.95rem,1.25vw,1.7rem)]'
            } ${palette.inkSecondary}`}
          >
            {gregorianYear}
          </div>
        </div>

        {/* Center: Classical Arabic Weekday + Localized Weekday */}
        <div className={`text-center border-x ${palette.hairline} px-2`}>
          <div
            dir="rtl"
            className={`font-arabic font-bold leading-tight ${
              verticalLayout
                ? 'text-[clamp(1.2rem,2.5vh,2.4rem)]'
                : 'text-[clamp(1.2rem,1.75vw,2.4rem)]'
            } ${palette.inkPrimary}`}
          >
            {arabicWeekday}
          </div>
          <div
            className={`font-display font-bold leading-tight ${
              verticalLayout
                ? 'text-[clamp(0.85rem,1.7vh,1.6rem)]'
                : 'text-[clamp(0.85rem,1.15vw,1.55rem)]'
            } ${palette.goldText}`}
          >
            {localizedWeekday}
          </div>
        </div>

        {/* Right: Hijri Month & Year */}
        <div className="text-center">
          {settings.showHijriDate && hijriRawDisplay ? (
            <>
              <div
                className={`font-display font-bold leading-tight truncate px-1 ${
                  verticalLayout
                    ? 'text-[clamp(0.92rem,1.9vh,1.85rem)]'
                    : 'text-[clamp(0.92rem,1.3vw,1.8rem)]'
                } ${palette.inkPrimary}`}
              >
                {hijriParts.month || hijriRawDisplay}
              </div>
              {hijriParts.year && (
                <div
                  className={`font-mono-numbers tabular-nums font-extrabold leading-tight ${
                    verticalLayout
                      ? 'text-[clamp(0.95rem,1.9vh,1.8rem)]'
                      : 'text-[clamp(0.95rem,1.25vw,1.7rem)]'
                  } ${palette.inkSecondary}`}
                >
                  {hijriParts.year}
                </div>
              )}
            </>
          ) : (
            <div className={`text-xs ${palette.inkMuted}`}>Asia/Tashkent</div>
          )}
        </div>
      </div>
    </div>
  );

  // Shared Twin Special Times Band: Ishraq (Duha) & Sunrise + optional Tahajjud/Subh
  const renderSpecialTimesBand = (verticalLayout: boolean) => {
    const showAuxRow =
      (settings.showTahajjud && Boolean(tahajjudTime)) ||
      (settings.showSubh && Boolean(subhTime));

    return (
      <div className={`border-t ${palette.goldHairline} pt-[clamp(8px,1.2vh,18px)] space-y-2`}>
        {/* Primary Twin Strip: Ishroq (ابتداء وقت الضحى) & Quyosh (الشروق) — exact reference photo homage */}
        <div className={`grid ${settings.showIshraq ? 'grid-cols-2' : 'grid-cols-1'} items-center`}>
          {settings.showIshraq && (
            <div className={`text-center pr-3 border-r ${palette.hairline}`}>
              <div
                dir="rtl"
                className={`font-arabic font-bold leading-tight ${
                  verticalLayout
                    ? 'text-[clamp(0.95rem,1.9vh,1.8rem)]'
                    : 'text-[clamp(0.95rem,1.2vw,1.65rem)]'
                } ${palette.inkSecondary}`}
              >
                {HARAMAYN_ARABIC_NAMES.ishroq}
              </div>
              <div
                className={`text-[clamp(0.68rem,0.85vw,1.1rem)] font-extrabold uppercase tracking-wider ${palette.goldText}`}
              >
                {t.ishraqLabel}
              </div>
              <div
                className={`font-mono-numbers tabular-nums font-extrabold leading-none mt-1 ${
                  verticalLayout
                    ? 'text-[clamp(1.65rem,3.9vh,3.8rem)]'
                    : 'text-[clamp(1.65rem,2.6vw,3.5rem)]'
                } ${palette.inkPrimary}`}
              >
                {ishraqTime}
              </div>
            </div>
          )}

          <div className="text-center pl-3">
            <div
              dir="rtl"
              className={`font-arabic font-bold leading-tight ${
                verticalLayout
                  ? 'text-[clamp(0.95rem,1.9vh,1.8rem)]'
                  : 'text-[clamp(0.95rem,1.2vw,1.65rem)]'
              } ${palette.inkSecondary}`}
            >
              {HARAMAYN_ARABIC_NAMES.quyosh}
            </div>
            <div
              className={`text-[clamp(0.68rem,0.85vw,1.1rem)] font-extrabold uppercase tracking-wider ${palette.goldText}`}
            >
              {t.sunriseLabel}
            </div>
            <div
              className={`font-mono-numbers tabular-nums font-extrabold leading-none mt-1 ${
                verticalLayout
                  ? 'text-[clamp(1.65rem,3.9vh,3.8rem)]'
                  : 'text-[clamp(1.65rem,2.6vw,3.5rem)]'
              } ${palette.inkPrimary}`}
            >
              {sunriseTime}
            </div>
          </div>
        </div>

        {/* Quiet Tahajjud & Subh row (compatible with existing ASAKA ZIYO 8-prayer schedule) */}
        {showAuxRow && (
          <div
            className={`flex items-center justify-center gap-6 pt-1.5 border-t ${palette.hairline} text-[clamp(0.75rem,0.95vw,1.25rem)]`}
          >
            {settings.showTahajjud && tahajjudTime && (
              <div className="flex items-baseline gap-2">
                <span className={`font-semibold ${palette.inkMuted}`}>{t.tahajjudLabel}:</span>
                <span className={`font-mono-numbers tabular-nums font-extrabold ${palette.inkPrimary}`}>
                  {tahajjudTime}
                </span>
              </div>
            )}
            {settings.showTahajjud && tahajjudTime && settings.showSubh && subhTime && (
              <span aria-hidden="true" className={`opacity-35 ${palette.inkMuted}`}>
                ·
              </span>
            )}
            {settings.showSubh && subhTime && (
              <div className="flex items-baseline gap-2">
                <span className={`font-semibold ${palette.inkMuted}`}>{t.subhLabel}:</span>
                <span className={`font-mono-numbers tabular-nums font-extrabold ${palette.inkPrimary}`}>
                  {subhTime}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      style={brightnessStyle}
      className={`relative w-screen min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden select-none flex flex-col transition-colors duration-300 ${
        isPortraitLayout && viewport.w > viewport.h * 1.15
          ? 'bg-[#09120E] items-center justify-center p-2 sm:p-4'
          : palette.pageBg
      }`}
      role="application"
      aria-label="ASAKA ZIYO Smart Mosque Display"
    >
      {/* =====================================================================
          AUTO-HIDING FLOATING TV CONTROL BAR (Fades away after 4.5s for pure 24/7 TV)
          ===================================================================== */}
      <div
        className={`fixed top-3 right-3 z-40 flex flex-wrap items-center gap-1.5 transition-opacity duration-300 ${
          controlsVisible || pairModalOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 1-click Orientation Toggle: 16:9 TV Landscape vs 9:16 Madina Nabaviy Portrait */}
        <button
          type="button"
          onClick={() =>
            setOrientationMode((prev) =>
              prev === 'portrait' || (prev === 'auto' && isPortraitLayout)
                ? 'landscape'
                : 'portrait'
            )
          }
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#07261A]/92 text-[#F4D88A] border border-[#DFBD69]/50 hover:bg-[#0B3C29] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
          title="Ekran yoʻnalishi: 16:9 TV yoki 9:16 Madina Nabaviy Ustun (M)"
        >
          {isPortraitLayout ? (
            <Monitor className="w-3.5 h-3.5" />
          ) : (
            <Smartphone className="w-3.5 h-3.5" />
          )}
          <span>{isPortraitLayout ? '16:9 TV' : '9:16 Madina'}</span>
        </button>

        {!isPaired && (
          <>
            <select
              aria-label={t.templateLabel}
              value={previewTemplate}
              onChange={(e) => setPreviewTemplate(e.target.value as DisplayTemplateId)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#07261A]/92 text-[#FFF8E8] border border-[#DFBD69]/50 cursor-pointer shadow-md"
            >
              <option value="classic_mosque">Madina Haramayn (Ivory)</option>
              <option value="premium_emerald">Haramayn Night (Emerald)</option>
              <option value="minimal_modern">Alabaster Minimal</option>
            </select>

            <select
              aria-label={t.languageLabel}
              value={previewLocale}
              onChange={(e) => setPreviewLocale(e.target.value as SupportedLocale)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#07261A]/92 text-[#FFF8E8] border border-[#DFBD69]/50 cursor-pointer shadow-md"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={() => setPairModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#07261A]/92 text-[#DFBD69] border border-[#DFBD69]/50 hover:bg-[#0B3C29] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>{isPaired ? snapshot.monitor?.name : t.pairMonitorButton}</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#DFBD69] text-[#051B12] hover:brightness-105 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? t.fullscreenExit : t.fullscreenEnter}</span>
        </button>

        {onExitToApp && (
          <button
            type="button"
            onClick={onExitToApp}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#07261A]/92 text-[#FAF6EC] border border-white/25 hover:border-white/50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.exitDisplayButton}</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          MAIN ARCHITECTURAL HARAMAYN DISPLAY BOARD
          Adapts seamlessly between 9:16 Madina Nabaviy Portrait & 16:9 Full HD / 4K TV
          ===================================================================== */}
      <div
        style={{ fontSize: `${fontScaleMultiplier}rem` }}
        className={`relative flex flex-col overflow-hidden ${palette.boardBg} ${
          isPortraitLayout
            ? viewport.w > viewport.h * 1.15
              ? 'w-full max-w-[min(94vw,620px)] h-[min(96vh,1120px)] rounded-2xl border-[3px] border-[#1A1A1A] shadow-[0_32px_90px_rgba(0,0,0,0.85)]'
              : 'w-full flex-1 min-h-screen'
            : 'w-full flex-1 lg:h-full'
        }`}
      >
        <HaramaynArchitecturalBackdrop isDark={isDarkTheme} goldHex={palette.goldHex} />
        <ArchitecturalCorner position="tl" color={palette.goldHex} />
        <ArchitecturalCorner position="tr" color={palette.goldHex} />
        <ArchitecturalCorner position="bl" color={palette.goldHex} />
        <ArchitecturalCorner position="br" color={palette.goldHex} />

        {/* Offline / Schedule Expiry Alert Banner (ONLY rendered when genuinely needed) */}
        {(!isOnline || scheduleValidation.isExpired || scheduleValidation.isUnpublished) && (
          <div
            role="status"
            className="relative z-20 px-5 py-1.5 bg-amber-900/95 text-[#FFF6D6] text-xs font-bold flex items-center justify-center gap-2 border-b border-[#DFBD69]/50"
          >
            {!isOnline ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#DFBD69]" />
            )}
            <span className="truncate">
              {!isOnline
                ? t.offlineNotice
                : scheduleValidation.isExpired
                  ? t.scheduleExpiredWarning
                  : t.scheduleUnpublishedNotice}
            </span>
          </div>
        )}

        {isPortraitLayout ? (
          /* =================================================================
             PORTRAIT LAYOUT — EXACT MASJID AN-NABAWI PILLAR PROPORTION (9:16)
             ================================================================= */
          <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-between">
            <div className="px-[clamp(16px,3.2vw,42px)] pt-[clamp(16px,2.2vh,32px)] pb-1">
              {renderMonumentalClockAndCalendar(true)}
            </div>

            <div className="flex-1 min-h-0 flex flex-col px-[clamp(10px,2.2vw,30px)] py-[clamp(6px,1vh,14px)]">
              {renderPrayerLedger(true)}
            </div>

            <div className="px-[clamp(16px,3.2vw,42px)] pb-[clamp(10px,1.5vh,22px)]">
              {renderSpecialTimesBand(true)}
            </div>

            {renderHaramaynGreenBand(true)}

            {renderAnnouncementRibbon()}
          </div>
        ) : (
          /* =================================================================
             16:9 WIDESCREEN FULL HD / 4K MOSQUE TV LAYOUT
             Two Balanced Architectural Zones — Zero Cluttered Card Boxes
             ================================================================= */
          <div className="relative z-10 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 items-stretch px-[clamp(20px,3vw,60px)] py-[clamp(16px,2.4vh,38px)] gap-[clamp(18px,2.6vw,48px)]">
              {/* LEFT MONUMENTAL PANEL (5 cols ~42%): Clock + Twin Medallions + Dates + Special Times + Royal Green Countdown */}
              <section className="lg:col-span-5 flex flex-col justify-between gap-[clamp(12px,1.8vh,26px)] min-h-0">
                {renderMonumentalClockAndCalendar(false)}

                {renderSpecialTimesBand(false)}

                {renderHaramaynGreenBand(false)}
              </section>

              {/* RIGHT MONUMENTAL PANEL (7 cols ~58%): Full-Height Masjid an-Nabawi 5-Prayer Calligraphic Ledger */}
              <section
                aria-label="Daily Prayer Schedule"
                className={`lg:col-span-7 flex flex-col min-h-0 lg:border-l lg:pl-[clamp(18px,2.6vw,48px)] ${palette.goldHairline}`}
              >
                {renderPrayerLedger(false)}
              </section>
            </div>

            {renderAnnouncementRibbon()}
          </div>
        )}
      </div>

      {/* =====================================================================
          6-DIGIT MONITOR PAIRING MODAL
          ===================================================================== */}
      {pairModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.pairScreenTitle}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#041D15] border border-[#DFBD69]/50 text-[#FAF6EC] p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#DFBD69]">
                  {t.pairScreenTitle}
                </h2>
                <p className="text-xs text-[#FAF6EC]/75 mt-1">{t.pairScreenSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPairModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#FAF6EC]/80 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isPaired && snapshot.monitor && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-400/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ulangan monitor: {snapshot.monitor.name}</span>
                </div>
                <div className="text-[#FAF6EC]/75">
                  Masjid: {snapshot.monitor.mosqueName} · Shablon: {t.templates[activeTemplate]}
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectMonitor}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-white font-semibold text-xs cursor-pointer"
                >
                  Ulanishni uzish
                </button>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pairCodeInput}
                  onChange={(e) => setPairCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t.pairCodePlaceholder}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#02110C] border border-[#DFBD69]/45 text-center font-mono-numbers tabular-nums text-2xl font-bold tracking-[0.35em] text-[#FFF6C8] focus:outline-none focus:border-[#DFBD69]"
                  autoFocus
                />
              </div>

              {pairError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200">
                  {pairError}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isPairing || pairCodeInput.length !== 6}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#DFBD69] text-[#02120E] font-extrabold text-sm hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  {isPairing ? '...' : t.pairButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setPairModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/20 text-xs font-semibold text-[#FAF6EC]/85 hover:bg-white/5 cursor-pointer"
                >
                  {t.pairPreviewButtonLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
