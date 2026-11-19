import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Maximize2,
  Minimize2,
  Save,
  Settings,
  X,
} from 'lucide-react';
import { PrayerKey } from '../../../types';
import {
  DEFAULT_SMART_DISPLAY_SETTINGS,
  SmartDisplaySettings,
  SmartMosqueScheduleProfile,
  computeSmartDisplayTimeline,
  validateDisplaySchedule,
} from '../../../utils/smartMosqueDisplayEngine';
import {
  getDisplayLocaleBundle,
  localizeHijriDate,
  sanitizeDisplayDynamicText,
} from '../../../utils/smartMosqueDisplayI18n';
import {
  DisplaySyncSnapshot,
  buildFallbackLocalSnapshot,
  fetchAdminDisplayOverview,
  getSavedMonitorSession,
  saveAdminDisplaySchedule,
  subscribeToLiveDisplayFirestoreUpdates,
  syncDisplaySnapshotFromServer,
} from '../../../utils/smartMosqueDisplayService';
import { useDisplayResponsiveLayout } from '../../../utils/smartMosqueResponsiveEngine';
import { MasjidAlNabawiDisplay } from './display/MasjidAlNabawiDisplay';
import { DisplayPrayerRowItem } from './display/displayProfiles';

interface MasjidTvTabloPageProps {
  onExitToApp?: () => void;
}

interface MasjidTvLocalPrefs {
  clockFormat: '24h' | '12h';
  showSeconds: boolean;
  showBackgroundTexture: boolean;
  showSideIndicators: boolean;
  brightnessPct: number;
  orientationPreference: 'auto' | 'portrait' | 'landscape';
  selectedScheduleId: string;
}

const PREFS_STORAGE_KEY = 'asaka_masjid_tv_prefs_v1';

const DEFAULT_PREFS: MasjidTvLocalPrefs = {
  clockFormat: '24h',
  showSeconds: true,
  showBackgroundTexture: true,
  showSideIndicators: true,
  brightnessPct: 100,
  orientationPreference: 'auto',
  selectedScheduleId: 'asaka-main',
};

function loadLocalPrefs(): MasjidTvLocalPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      clockFormat: parsed.clockFormat === '12h' ? '12h' : '24h',
      showSeconds: parsed.showSeconds !== false,
      showBackgroundTexture: parsed.showBackgroundTexture !== false,
      showSideIndicators: parsed.showSideIndicators !== false,
      brightnessPct:
        typeof parsed.brightnessPct === 'number'
          ? Math.max(55, Math.min(115, parsed.brightnessPct))
          : 100,
      orientationPreference:
        parsed.orientationPreference === 'portrait' ||
        parsed.orientationPreference === 'landscape'
          ? parsed.orientationPreference
          : 'auto',
      selectedScheduleId:
        typeof parsed.selectedScheduleId === 'string' && parsed.selectedScheduleId.trim()
          ? parsed.selectedScheduleId.trim()
          : 'asaka-main',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * ASAKA ZIYO — МАСЖИД НАМОЗ ВАҚТЛАРИ ТАБЛОСИ (/masjid-tv)
 * Independent Uzbek Cyrillic-only prayer timetable display faithfully modeled after
 * the Masjid Al-Nabawi mosque timetable monitor reference.
 */
export const MasjidTvTabloPage: React.FC<MasjidTvTabloPageProps> = ({ onExitToApp }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const lastDateStrRef = useRef<string>('');

  const [prefs, setPrefs] = useState<MasjidTvLocalPrefs>(() => loadLocalPrefs());
  const [snapshot, setSnapshot] = useState<DisplaySyncSnapshot>(() =>
    buildFallbackLocalSnapshot()
  );
  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);

  // Discreet Admin Settings Drawer state (protected by real backend admin session)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminSchedules, setAdminSchedules] = useState<SmartMosqueScheduleProfile[]>([]);
  const [jumaDraft, setJumaDraft] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const fullscreenSupported =
    typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
  const wakeLockSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const layout = useDisplayResponsiveLayout(prefs.orientationPreference);
  const cyrlBundle = useMemo(() => getDisplayLocaleBundle('uz-Cyrl'), []);

  const persistPrefs = useCallback((next: MasjidTvLocalPrefs) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const performSync = useCallback(async () => {
    const savedSession = getSavedMonitorSession();
    const res = await syncDisplaySnapshotFromServer({
      monitorToken: savedSession?.monitorToken,
      preview: !savedSession,
    });
    if (res.success && res.snapshot) {
      setSnapshot(res.snapshot);
      setJumaDraft((prev) => prev || res.snapshot?.schedule.jumaTime || '');
    }
  }, []);

  // Initial sync + 20s periodic server refresh + online/offline listeners
  useEffect(() => {
    performSync();
    const syncTimer = setInterval(() => {
      if (navigator.onLine !== false) performSync();
    }, 20_000);

    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  // Live Firestore real-time schedule subscription
  useEffect(() => {
    const activeScheduleId = prefs.selectedScheduleId || snapshot.schedule.id || 'asaka-main';
    return subscribeToLiveDisplayFirestoreUpdates(activeScheduleId, {
      onScheduleUpdate: (updatedSchedule) => {
        setSnapshot((prev) => ({
          ...prev,
          schedule: updatedSchedule,
          validation: validateDisplaySchedule(updatedSchedule),
        }));
        setJumaDraft(updatedSchedule.jumaTime || '');
      },
      onAnnouncementsUpdate: (updatedAnnouncements) => {
        setSnapshot((prev) => ({ ...prev, announcements: updatedAnnouncements }));
      },
    });
  }, [prefs.selectedScheduleId, snapshot.schedule.id]);

  // 1-second wall clock tick + automatic midnight date rollover sync
  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeline = useMemo(
    () => computeSmartDisplayTimeline(snapshot.schedule, nowTick),
    [snapshot.schedule, nowTick]
  );

  useEffect(() => {
    const currentDay = timeline.clock.dateStr;
    if (lastDateStrRef.current && lastDateStrRef.current !== currentDay) {
      performSync();
    }
    lastDateStrRef.current = currentDay;
  }, [timeline.clock.dateStr, performSync]);

  // Wake Lock API (checked honestly for browser support)
  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (nav?.wakeLock?.request) {
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener?.('release', () => setWakeLockActive(false));
      }
    } catch {
      setWakeLockActive(false);
    }
  }, []);

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

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!fullscreenSupported) return;
    try {
      if (!document.fullscreenElement) {
        rootRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [fullscreenSupported]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hiding discreet controls (hidden completely during normal mosque viewing)
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const reveal = () => {
      setControlsVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!settingsOpen) setControlsVisible(false);
      }, 3200);
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
  }, [settingsOpen]);

  const checkAdminSessionAndLoad = useCallback(async () => {
    setCheckingAdmin(true);
    setAuthError(null);
    try {
      const resp = await fetch('/api/admin/session', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.authenticated) {
          setIsAdminVerified(true);
          const ov = await fetchAdminDisplayOverview();
          if (ov.success && ov.data?.schedules) {
            setAdminSchedules(ov.data.schedules);
          }
          setJumaDraft(snapshot.schedule.jumaTime || '');
          return;
        }
      }
      setIsAdminVerified(false);
    } catch {
      setIsAdminVerified(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, [snapshot.schedule.jumaTime]);

  const openAdminSettings = useCallback(() => {
    setSettingsOpen(true);
    setSaveNotice(null);
    checkAdminSessionAndLoad();
  }, [checkAdminSessionAndLoad]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setCheckingAdmin(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        setAdminPassword('');
        setIsAdminVerified(true);
        const ov = await fetchAdminDisplayOverview();
        if (ov.success && ov.data?.schedules) {
          setAdminSchedules(ov.data.schedules);
        }
        setJumaDraft(snapshot.schedule.jumaTime || '');
      } else {
        setAuthError('Логин ёки парол нотўғри. Администратор маълумотларини текширинг.');
      }
    } catch {
      setAuthError('Сервер билан алоқа ўрнатилмади.');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleSaveAdminSettings = async () => {
    setSavingSettings(true);
    setSaveNotice(null);
    try {
      // Persist Juma prayer time to existing Firestore schedule if modified by verified admin
      const cleanJuma = jumaDraft.trim();
      if (
        isAdminVerified &&
        /^\d{2}:\d{2}$/.test(cleanJuma) &&
        cleanJuma !== snapshot.schedule.jumaTime
      ) {
        const updatedSchedule: SmartMosqueScheduleProfile = {
          ...snapshot.schedule,
          jumaTime: cleanJuma,
        };
        const res = await saveAdminDisplaySchedule(updatedSchedule);
        if (res.success && res.schedule) {
          setSnapshot((prev) => ({
            ...prev,
            schedule: res.schedule!,
            validation: validateDisplaySchedule(res.schedule!),
          }));
        }
      }

      // If administrator switched assigned schedule, load it cleanly
      const chosen = adminSchedules.find((s) => s.id === prefs.selectedScheduleId);
      if (chosen && chosen.id !== snapshot.schedule.id) {
        setSnapshot((prev) => ({
          ...prev,
          schedule: chosen,
          validation: validateDisplaySchedule(chosen),
        }));
      }

      persistPrefs(prefs);
      setSaveNotice('Созламалар муваффақиятли сақланди.');
    } catch {
      setSaveNotice('Сақлашда хатолик юз берди.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Prepare exact administrator-verified prayer times (NEVER auto-calculated)
  const timesByKey = useMemo(() => {
    const map = new Map<PrayerKey, (typeof snapshot.schedule.times)[number]>();
    for (const item of snapshot.schedule.times || []) {
      map.set(item.key, item);
    }
    return map;
  }, [snapshot.schedule.times]);

  const fiveMainPrayers: DisplayPrayerRowItem[] = useMemo(() => {
    const keys: PrayerKey[] = ['bomdod', 'peshin', 'asr', 'shom', 'xufton'];
    return keys.map((key) => {
      const entry = timesByKey.get(key);
      return {
        key,
        label: cyrlBundle.prayerNames[key],
        azanTime: entry?.time || '--:--',
        iqamahTime: entry?.iqamahTime || '',
        isCurrent:
          timeline.currentPrayerKey === key ||
          (key === 'peshin' && timeline.currentPrayerKey === 'juma'),
        isNext:
          timeline.nextAzanKey === key ||
          (key === 'peshin' && timeline.nextAzanKey === 'juma'),
      };
    });
  }, [timesByKey, cyrlBundle.prayerNames, timeline.currentPrayerKey, timeline.nextAzanKey]);

  const sunriseTime = timesByKey.get('quyosh')?.time || '--:--';
  const ishraqTime = snapshot.schedule.ishraqTime || '--:--';
  const jumaTime = snapshot.schedule.jumaTime || timesByKey.get('peshin')?.time || '--:--';

  const hijriCyrl = useMemo(
    () => localizeHijriDate(snapshot.schedule.hijriDate, 'uz-Cyrl'),
    [snapshot.schedule.hijriDate]
  );

  const mosqueTitleCyrl = useMemo(() => {
    const raw = snapshot.monitor?.mosqueName || snapshot.schedule.mosqueName || '';
    if (!raw || /[A-Za-z]/.test(raw)) {
      return cyrlBundle.mosqueSubtitleDefault;
    }
    return sanitizeDisplayDynamicText(raw, 'uz-Cyrl', cyrlBundle.mosqueSubtitleDefault);
  }, [snapshot.monitor?.mosqueName, snapshot.schedule.mosqueName, cyrlBundle.mosqueSubtitleDefault]);

  const effectiveSettings: SmartDisplaySettings = useMemo(
    () => ({
      ...DEFAULT_SMART_DISPLAY_SETTINGS,
      ...(snapshot.monitor?.settings || {}),
      showSeconds: prefs.showSeconds,
      clockFormat: prefs.clockFormat,
      showBackgroundTexture: prefs.showBackgroundTexture,
      showSideIndicators: prefs.showSideIndicators,
      brightnessPct: prefs.brightnessPct,
      orientationPreference: prefs.orientationPreference,
    }),
    [snapshot.monitor?.settings, prefs]
  );

  const rootStyle: React.CSSProperties =
    prefs.brightnessPct !== 100
      ? { filter: `brightness(${prefs.brightnessPct}%)` }
      : {};

  return (
    <div
      ref={rootRef}
      style={rootStyle}
      className="relative w-screen h-screen overflow-hidden select-none bg-[#121917]"
    >
      {/* Discreet Floating Utility Trigger (Completely Hidden During Normal Viewing) */}
      <div
        className={`fixed top-3 right-3 z-40 flex items-center gap-1.5 transition-opacity duration-300 ${
          controlsVisible || settingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onExitToApp && (
          <button
            type="button"
            onClick={onExitToApp}
            title="Асосий иловага қайтиш"
            className="p-2.5 rounded-xl bg-[#15241D]/85 backdrop-blur-md text-white/90 hover:text-white border border-white/15 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {fullscreenSupported && (
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Тўлиқ экрандан чиқиш' : 'Тўлиқ экран'}
            className="p-2.5 rounded-xl bg-[#15241D]/85 backdrop-blur-md text-white/90 hover:text-white border border-white/15 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={openAdminSettings}
          title="Администратор созламалари"
          className="p-2.5 rounded-xl bg-[#1E6B38]/90 backdrop-blur-md text-white hover:brightness-110 border border-white/20 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Faithful Masjid Al-Nabawi Uzbek Cyrillic Tablo */}
      <MasjidAlNabawiDisplay
        languageMode="uz_cyrl_locked"
        layout={layout}
        settings={effectiveSettings}
        timeline={timeline}
        prayers={fiveMainPrayers}
        sunriseTime={sunriseTime}
        ishraqTime={ishraqTime}
        jumaTime={jumaTime}
        mosqueTitle={mosqueTitleCyrl}
        locationLabel="Асака шаҳри, Андижон вилояти"
        hijriLocalized={hijriCyrl}
        rawHijriDate={snapshot.schedule.hijriDate}
        t={cyrlBundle}
        isOnline={isOnline}
      />

      {/* Discreet Admin-Authenticated Settings Drawer (Strictly Uzbek Cyrillic) */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[#F6F8F9] text-[#1B252B] shadow-2xl border-l border-[#1E6B38]/25 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#1E6B38] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-extrabold text-base truncate">
                  Табло Администратор Созламалари
                </h2>
                <p className="text-xs text-white/80 truncate">
                  Масжид Намоз Вақтлари Таблоси
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {checkingAdmin ? (
                <div className="py-12 text-center text-sm text-[#4A5A63]">
                  Администратор рухсати текширилмоқда...
                </div>
              ) : !isAdminVerified ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#E7F2EC] border border-[#1E6B38]/25 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-[#1E6B38] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#1B3A29] leading-relaxed">
                      Ушбу бўлим фақат тасдиқланган масжид администратори учун ҳимояланган.
                      Давом этиш учун администратор ҳисобига киринг.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Администратор логини
                    </label>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5DC] bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Парол
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5DC] bg-white text-sm"
                    />
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#1E6B38] text-white font-bold text-sm hover:brightness-110 cursor-pointer"
                  >
                    Тасдиқлаш ва кириш
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* City / Assigned Prayer Schedule */}
                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Бириктирилган намоз жадвали (шаҳар / масжид)
                    </label>
                    <select
                      value={prefs.selectedScheduleId}
                      onChange={(e) =>
                        setPrefs({ ...prefs, selectedScheduleId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5DC] bg-white text-sm"
                    >
                      {adminSchedules.length > 0 ? (
                        adminSchedules.map((sch) => (
                          <option key={sch.id} value={sch.id}>
                            {sch.mosqueName} — {sch.location}
                          </option>
                        ))
                      ) : (
                        <option value={snapshot.schedule.id}>
                          Асака шаҳри, Андижон вилояти
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Clock Format 12h / 24h */}
                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Соат формати
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrefs({ ...prefs, clockFormat: '24h' })}
                        className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                          prefs.clockFormat === '24h'
                            ? 'bg-[#1E6B38] text-white border-[#1E6B38]'
                            : 'bg-white text-[#2C3A42] border-[#CBD5DC]'
                        }`}
                      >
                        24 соатлик (17:37)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrefs({ ...prefs, clockFormat: '12h' })}
                        className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                          prefs.clockFormat === '12h'
                            ? 'bg-[#1E6B38] text-white border-[#1E6B38]'
                            : 'bg-white text-[#2C3A42] border-[#CBD5DC]'
                        }`}
                      >
                        12 соатлик (05:37)
                      </button>
                    </div>
                  </div>

                  {/* Orientation Preference */}
                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Экран йўналиши
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['auto', 'Автоматик'],
                          ['portrait', 'Вертикал'],
                          ['landscape', 'Горизонтал'],
                        ] as const
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPrefs({ ...prefs, orientationPreference: val })}
                          className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            prefs.orientationPreference === val
                              ? 'bg-[#1E6B38] text-white border-[#1E6B38]'
                              : 'bg-white text-[#2C3A42] border-[#CBD5DC]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Friday Prayer Time */}
                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Жума намози вақти (соат:дақиқа)
                    </label>
                    <input
                      type="time"
                      value={jumaDraft}
                      onChange={(e) => setJumaDraft(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5DC] bg-white text-sm font-mono-numbers"
                    />
                  </div>

                  {/* Brightness Slider */}
                  <div>
                    <label className="block text-xs font-bold text-[#2C3A42] mb-1">
                      Экран ёрқинлиги: {prefs.brightnessPct}%
                    </label>
                    <input
                      type="range"
                      min={55}
                      max={115}
                      value={prefs.brightnessPct}
                      onChange={(e) =>
                        setPrefs({ ...prefs, brightnessPct: Number(e.target.value) })
                      }
                      className="w-full accent-[#1E6B38]"
                    />
                  </div>

                  {/* Visual Toggles */}
                  <div className="space-y-2.5 pt-2 border-t border-[#DCE3E8]">
                    <label className="flex items-center justify-between gap-3 text-xs font-semibold cursor-pointer">
                      <span>Сонияларни кўрсатиш</span>
                      <input
                        type="checkbox"
                        checked={prefs.showSeconds}
                        onChange={(e) => setPrefs({ ...prefs, showSeconds: e.target.checked })}
                        className="w-4 h-4 accent-[#1E6B38]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs font-semibold cursor-pointer">
                      <span>Мармар ва масжид фон текстураси</span>
                      <input
                        type="checkbox"
                        checked={prefs.showBackgroundTexture}
                        onChange={(e) =>
                          setPrefs({ ...prefs, showBackgroundTexture: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#1E6B38]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs font-semibold cursor-pointer">
                      <span>Ён сана белгилари (Милодий / Ҳижрий кун)</span>
                      <input
                        type="checkbox"
                        checked={prefs.showSideIndicators}
                        onChange={(e) =>
                          setPrefs({ ...prefs, showSideIndicators: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#1E6B38]"
                      />
                    </label>
                  </div>

                  {/* Honest Hardware Capabilities Report */}
                  <div className="p-3 rounded-xl bg-[#EDF2F5] text-[11px] text-[#3B4B54] space-y-1">
                    <div>
                      Тўлиқ экран қўллаб-қувватлови:{' '}
                      <strong>{fullscreenSupported ? 'Мавжуд' : 'Ушбу браузерда чекланган'}</strong>
                    </div>
                    <div>
                      Экранни уйғоқ сақлаш:{' '}
                      <strong>
                        {wakeLockSupported
                          ? wakeLockActive
                            ? 'Фаол'
                            : 'Мавжуд'
                          : 'Ушбу браузерда қўллаб-қувватланмайди'}
                      </strong>
                    </div>
                  </div>

                  {saveNotice && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                      {saveNotice}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {fullscreenSupported && (
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="flex-1 py-2.5 rounded-xl border border-[#1E6B38] text-[#1E6B38] font-bold text-xs cursor-pointer hover:bg-[#1E6B38]/5"
                      >
                        {isFullscreen ? 'Тўлиқ экрандан чиқиш' : 'Тўлиқ экран'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={savingSettings}
                      onClick={handleSaveAdminSettings}
                      className="flex-1 py-2.5 rounded-xl bg-[#1E6B38] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingSettings ? 'Сақланмоқда...' : 'Сақлаш'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
