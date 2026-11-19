import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PrayerSchedule, Ayah, HadithItem, AnnouncementItem } from '../../../types';
import {
  getNextPrayerCalculation,
  NextPrayerInfo,
  timeStringToSeconds,
  getCurrentTashkentSeconds,
} from '../../../utils/prayerTimeUtils';
import {
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  subscribeToAdhanPlayerState,
  getPrayerAlertSettings,
  ADHAN_TRACKS,
  AdhanPlayerState,
} from '../../../utils/notificationService';
import { getStoredAnnouncements, isPubliclyPublished } from '../../../utils/databaseService';
import {
  GeometricPattern,
  IslamicStarEmblem,
  ArabesqueCornerOrnaments,
  VolumetricGodRays,
} from '../../ui/GeometricPattern';
import {
  Tv,
  X,
  Volume2,
  Play,
  Pause,
  Square,
  Clock,
  MapPin,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Smartphone,
  Users,
  Compass,
  Megaphone,
  Monitor,
} from 'lucide-react';

interface SmartTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
  onOpenSmartDisplay?: () => void;
}

type TvFocusableZone = 'prev' | 'play' | 'next' | 'mode' | 'fullscreen' | 'close';

function formatSecondsHms(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SmartTvModal: React.FC<SmartTvModalProps> = ({
  isOpen,
  onClose,
  schedule,
  dailyAyah,
  dailyHadith,
  onOpenSmartDisplay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('12:00:00');
  const [gregorianDateStr, setGregorianDateStr] = useState<string>('');
  const [nextInfo, setNextInfo] = useState<NextPrayerInfo>(() =>
    getNextPrayerCalculation(schedule.times)
  );
  const [iqamahCountdown, setIqamahCountdown] = useState<{
    activePrayerNameUz: string;
    activePrayerNameAr: string;
    iqamahTime: string;
    secondsLeft: number;
    isWaitingForIqamah: boolean;
  } | null>(null);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    getStoredAnnouncements().filter(isPubliclyPublished)
  );
  const [activeAnnouncementIdx, setActiveAnnouncementIdx] = useState(0);

  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<'landscape' | 'totem'>('landscape');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedZone, setFocusedZone] = useState<TvFocusableZone>('play');
  const [viewportInfo, setViewportInfo] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

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

  const playBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const modeBtnRef = useRef<HTMLButtonElement>(null);
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Sync live announcements & viewport dimensions for HD / Full HD / 4K adaptation
  useEffect(() => {
    if (!isOpen) return;

    const refreshData = () => {
      setAnnouncements(getStoredAnnouncements().filter(isPubliclyPublished));
    };
    const handleResize = () => {
      setViewportInfo({ w: window.innerWidth, h: window.innerHeight });
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    refreshData();
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);
    window.addEventListener('asaka_ziyo_db_updated', refreshData);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);
      window.removeEventListener('asaka_ziyo_db_updated', refreshData);
    };
  }, [isOpen]);

  // Rotate announcements every 9 seconds for 24/7 Mosque Display
  useEffect(() => {
    if (!isOpen || announcements.length <= 1) return;
    const rot = setInterval(() => {
      setActiveAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 9000);
    return () => clearInterval(rot);
  }, [isOpen, announcements.length]);

  useEffect(() => {
    if (!isOpen) return;
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setGregorianDateStr(
        now.toLocaleDateString('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
      const calc = getNextPrayerCalculation(schedule.times);
      setNextInfo(calc);

      // Compute Haramayn-style Iqamah (Jamoat) countdown
      try {
        const { totalSeconds } = getCurrentTashkentSeconds();
        let foundWaiting: {
          activePrayerNameUz: string;
          activePrayerNameAr: string;
          iqamahTime: string;
          secondsLeft: number;
          isWaitingForIqamah: boolean;
        } | null = null;

        for (const p of schedule.times) {
          if (!p.iqamahTime) continue;
          const azanSec = timeStringToSeconds(p.time);
          const iqamahSec = timeStringToSeconds(p.iqamahTime);
          if (totalSeconds >= azanSec && totalSeconds < iqamahSec) {
            foundWaiting = {
              activePrayerNameUz: p.nameUz,
              activePrayerNameAr: p.nameAr,
              iqamahTime: p.iqamahTime,
              secondsLeft: iqamahSec - totalSeconds,
              isWaitingForIqamah: true,
            };
            break;
          }
        }

        if (!foundWaiting && calc.nextPrayer) {
          const targetIqamah = calc.nextPrayer.iqamahTime || calc.nextPrayer.time;
          const iqamahSec = timeStringToSeconds(targetIqamah);
          let diff = iqamahSec - totalSeconds;
          if (diff < 0) diff += 86400;
          foundWaiting = {
            activePrayerNameUz: calc.nextPrayer.nameUz,
            activePrayerNameAr: calc.nextPrayer.nameAr,
            iqamahTime: targetIqamah,
            secondsLeft: diff,
            isWaitingForIqamah: false,
          };
        }
        setIqamahCountdown(foundWaiting);
      } catch {
        // fallback
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [isOpen, schedule.times]);

  useEffect(() => {
    const unsub = subscribeToAdhanPlayerState((st) => setPlayerState(st));
    return unsub;
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {
      // ignore in restricted iframe
    }
  };

  // Remote-Control & Keyboard D-Pad Directional Navigation
  useEffect(() => {
    if (!isOpen) return;
    playBtnRef.current?.focus();

    const focusZoneElement = (zone: TvFocusableZone) => {
      setFocusedZone(zone);
      if (zone === 'play') playBtnRef.current?.focus();
      if (zone === 'prev') prevBtnRef.current?.focus();
      if (zone === 'next') nextBtnRef.current?.focus();
      if (zone === 'mode') modeBtnRef.current?.focus();
      if (zone === 'fullscreen') fullscreenBtnRef.current?.focus();
      if (zone === 'close') closeBtnRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setDisplayMode((prev) => (prev === 'landscape' ? 'totem' : 'landscape'));
        return;
      }
      const order: TvFocusableZone[] = ['prev', 'play', 'next', 'mode', 'fullscreen', 'close'];
      const idx = order.indexOf(focusedZone);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextZone = order[(idx + 1) % order.length];
        focusZoneElement(nextZone);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevZone = order[(idx - 1 + order.length) % order.length];
        focusZoneElement(prevZone);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedZone, onClose]);

  const tvResolutionBadge = useMemo(() => {
    if (viewportInfo.w >= 3200) return '4K UHD · 16:9';
    if (viewportInfo.w >= 1800) return 'Full HD 1080p · 16:9';
    if (viewportInfo.w >= 1200) return 'HD 720p · 16:9';
    return `${viewportInfo.w}×${viewportInfo.h}`;
  }, [viewportInfo.h, viewportInfo.w]);

  if (!isOpen) return null;

  const currentTrack = ADHAN_TRACKS[selectedTrackIndex] || ADHAN_TRACKS[0];
  const isPlayingCurrent =
    playerState.playingTrackId === currentTrack.id &&
    (playerState.isPlaying || playerState.isLoading);

  const handleTogglePlay = () => {
    const settings = getPrayerAlertSettings();
    toggleAdhanAudio(currentTrack.id, settings.volume);
  };

  const handleCycleTrack = (dir: -1 | 1) => {
    const nextIdx = (selectedTrackIndex + dir + ADHAN_TRACKS.length) % ADHAN_TRACKS.length;
    setSelectedTrackIndex(nextIdx);
  };

  const timeParts = currentTimeStr.split(':');
  const hh = timeParts[0] || '00';
  const mm = timeParts[1] || '00';
  const ss = timeParts[2] || '00';

  const currentAnnouncement =
    announcements.length > 0
      ? announcements[activeAnnouncementIdx % announcements.length]
      : null;

  const isLandscapeTv = displayMode === 'landscape';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 qz-stage text-[#FFF8E8] select-none ${
        isLandscapeTv
          ? 'overflow-y-auto lg:overflow-hidden w-screen h-screen'
          : 'overflow-y-auto w-screen h-screen'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="ASAKA ZIYO — Haramayn Masjid Jamoat Ekrani va Smart TV Rejimi"
    >
      {/* Multi-Layer Sacred Cinema Backdrop (GPU compositor-friendly for 24/7 TV operation) */}
      <VolumetricGodRays />
      <GeometricPattern opacity={0.05} />
      <div className="qz-vignette pointer-events-none" />

      {/* TV OVERSCAN SAFE-AREA CONTAINER:
          In 16:9 Landscape mode on lg+ screens (1280x720, 1920x1080, 3840x2160),
          locks to exact 100vw x 100vh with proportional CSS Grid rows so nothing clips or scrolls. */}
      <div
        className={`relative z-10 w-full mx-auto ${
          isLandscapeTv
            ? 'min-h-screen lg:h-screen lg:max-h-screen px-[clamp(12px,2vw,56px)] py-[clamp(10px,1.6vh,36px)] flex flex-col lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[clamp(8px,1.2vh,20px)]'
            : 'max-w-[680px] min-h-screen px-4 py-5 flex flex-col justify-between gap-4'
        }`}
      >
        {/* =====================================================================
            ROW 1: HARAMAYN MOSQUE TOP HEADER + GIANT LIVE TOSHKENT CLOCK
            ===================================================================== */}
        <header className="relative rounded-2xl 2xl:rounded-3xl qz-obsidian-card px-[clamp(14px,1.6vw,36px)] py-[clamp(8px,1.1vh,20px)] flex flex-wrap items-center justify-between gap-3 border border-[#DFBD69]/45">
          <ArabesqueCornerOrnaments size={20} />

          {/* Left Mosque Identity & Hijri/Milodiy Dates */}
          <div className="flex items-center gap-[clamp(10px,1.1vw,22px)] min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="MuhammadSolih Hoji Jome Masjidi Rasmiy Muhr Logosi"
                className="w-[clamp(44px,3.6vw,76px)] h-[clamp(44px,3.6vw,76px)] rounded-full object-cover border-2 border-[#DFBD69] shadow-[0_0_24px_rgba(223,189,105,0.32)]"
              />
              <img
                src="/assets/aistudio/file_0000000087dc8246a5c928f8312a5a0e_6755725a.png"
                alt="ASAKA ZIYO Rasmiy Brend Nishoni"
                className="w-[clamp(44px,3.6vw,76px)] h-[clamp(44px,3.6vw,76px)] rounded-2xl object-cover border-2 border-[#DFBD69] shadow-[0_0_24px_rgba(223,189,105,0.32)] hidden sm:block"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[clamp(1.05rem,1.75vw,2.5rem)] font-extrabold tracking-[0.06em] qz-gold-foil-text leading-tight truncate">
                  ASAKA ZIYO · «MUHAMMADSOLIH HOJI» JOME MASJIDI
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#DFBD69]/18 border border-[#DFBD69]/55 text-[#FFF6C8] text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest hidden sm:inline-flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-[#DFBD69]" />
                  <span>{tvResolutionBadge}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[clamp(11px,0.88vw,18px)] text-[#FFF8E8]/90 mt-0.5">
                <span className="inline-flex items-center gap-1 font-bold text-[#DFBD69]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{schedule.location || 'Asaka shahri, Andijon viloyati'}</span>
                </span>
                <span className="text-[#DFBD69]/50">•</span>
                <span className="font-extrabold text-emerald-300">{schedule.hijriDate}</span>
                {gregorianDateStr && (
                  <>
                    <span className="text-[#DFBD69]/50 hidden md:inline">•</span>
                    <span className="text-[#FFF8E8]/80 capitalize hidden md:inline">
                      {gregorianDateStr}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Giant Digital Clock + Remote D-Pad Action Bar */}
          <div className="flex items-center gap-[clamp(10px,1.2vw,24px)] ml-auto">
            <div className="text-right px-[clamp(12px,1.3vw,28px)] py-[clamp(4px,0.6vh,12px)] rounded-2xl bg-[#010805]/90 border border-[#DFBD69]/55 shadow-inner">
              <div className="text-[clamp(8px,0.6vw,13px)] uppercase tracking-[0.2em] text-[#DFBD69] font-extrabold">
                Asaka / Toshkent Vaqti
              </div>
              <div className="text-[clamp(1.6rem,2.85vw,4.25rem)] font-mono-numbers tabular-nums font-extrabold text-[#FFF8E8] tracking-wider leading-none mt-0.5">
                {hh}:{mm}:<span className="text-[#DFBD69]">{ss}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSmartDisplay && (
                <button
                  type="button"
                  onClick={onOpenSmartDisplay}
                  className="px-[clamp(10px,0.9vw,18px)] py-[clamp(8px,1vh,16px)] rounded-2xl bg-[#DFBD69] hover:bg-[#ebd08a] text-[#03170F] text-[clamp(10px,0.75vw,15px)] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                  title="Mustaqil 24/7 Smart Mosque Display (/display)"
                >
                  <Tv className="w-4 h-4" />
                  <span className="hidden xl:inline">24/7 Display</span>
                </button>
              )}
              <button
                ref={modeBtnRef}
                type="button"
                onFocus={() => setFocusedZone('mode')}
                onClick={() =>
                  setDisplayMode((prev) => (prev === 'landscape' ? 'totem' : 'landscape'))
                }
                className={`px-[clamp(10px,0.9vw,18px)] py-[clamp(8px,1vh,16px)] rounded-2xl bg-[#041D13] hover:bg-[#092E1F] border text-[#FFF6C8] text-[clamp(10px,0.75vw,15px)] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  focusedZone === 'mode'
                    ? 'border-[#FFF6C8] ring-4 ring-[#DFBD69]/60 shadow-[0_0_20px_rgba(223,189,105,0.6)]'
                    : 'border-[#DFBD69]/45'
                }`}
                title="16:9 TV yoki 9:16 Vertikal Ustun koʻrinishi (M)"
              >
                {isLandscapeTv ? (
                  <Smartphone className="w-4 h-4 text-[#DFBD69]" />
                ) : (
                  <Monitor className="w-4 h-4 text-[#DFBD69]" />
                )}
                <span className="hidden xl:inline">
                  {isLandscapeTv ? '9:16 Ustun' : '16:9 Smart TV'}
                </span>
              </button>

              <button
                ref={fullscreenBtnRef}
                type="button"
                onFocus={() => setFocusedZone('fullscreen')}
                onClick={handleToggleFullscreen}
                className={`px-[clamp(10px,0.9vw,18px)] py-[clamp(8px,1vh,16px)] rounded-2xl bg-[#041D13] hover:bg-[#092E1F] border text-[#FFF6C8] text-[clamp(10px,0.75vw,15px)] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  focusedZone === 'fullscreen'
                    ? 'border-[#FFF6C8] ring-4 ring-[#DFBD69]/60 shadow-[0_0_20px_rgba(223,189,105,0.6)]'
                    : 'border-[#DFBD69]/45'
                }`}
                title="Toʻliq ekran (F)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-[#DFBD69]" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-[#DFBD69]" />
                )}
                <span className="hidden sm:inline">Toʻliq Ekran</span>
              </button>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                onFocus={() => setFocusedZone('close')}
                className={`px-[clamp(10px,1vw,20px)] py-[clamp(8px,1vh,16px)] rounded-2xl bg-rose-950/80 hover:bg-rose-800/90 border text-white font-bold text-[clamp(10px,0.78vw,16px)] flex items-center gap-1.5 cursor-pointer transition-all ${
                  focusedZone === 'close'
                    ? 'border-white ring-4 ring-rose-400/70 shadow-[0_0_24px_rgba(244,63,94,0.7)]'
                    : 'border-rose-400/50'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Yopish</span>
              </button>
            </div>
          </div>
        </header>

        {/* =====================================================================
            ROW 2 (MAIN STAGE): LEFT MIHRAB COUNTDOWN + RIGHT 8-PRAYER BOARD
            Stretches proportionally (`minmax(0, 1fr)`) so cards fill 720p/1080p/4K cleanly.
            ===================================================================== */}
        <div
          className={`min-h-0 ${
            isLandscapeTv
              ? 'grid grid-cols-1 lg:grid-cols-12 gap-[clamp(10px,1.2vw,24px)] items-stretch'
              : 'flex flex-col gap-4'
          }`}
        >
          {/* Left 4 Cols: Mihrab Sanctuary Dual Countdown (Azon & Jamoat Iqomat) */}
          <div
            className={`${
              isLandscapeTv ? 'lg:col-span-4' : ''
            } relative rounded-2xl 2xl:rounded-3xl qz-obsidian-card p-[clamp(12px,1.4vw,28px)] flex flex-col justify-between gap-[clamp(8px,1.1vh,18px)] border border-[#DFBD69]/45 min-h-0`}
          >
            <ArabesqueCornerOrnaments size={22} />

            {/* Top Sanctuary Status Bar */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-[#DFBD69]/15 border border-[#DFBD69]/45 text-[#FFF6C8] text-[clamp(10px,0.72vw,15px)] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                <span>Haramayn Jamoat Vaqti</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[clamp(10px,0.72vw,15px)] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Qibla: {schedule.qiblaAngleDeg || 241}°</span>
              </span>
            </div>

            {/* Dual Azon & Iqamah Live Countdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-[clamp(8px,0.9vw,16px)] my-auto">
              {/* Next Azon Box */}
              <div className="p-[clamp(10px,1.1vw,22px)] rounded-2xl bg-[#010805]/85 border border-[#DFBD69]/50 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest text-[#DFBD69] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Navbatdagi Azon</span>
                  </span>
                  <span className="font-arabic text-[clamp(1rem,1.25vw,1.75rem)] text-[#FFF6C8] leading-none">
                    {nextInfo.nextPrayer?.nameAr || 'الصلاة'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-[clamp(1.2rem,1.65vw,2.35rem)] font-display font-extrabold text-[#FFF8E8] truncate">
                    {nextInfo.nextPrayer?.nameUz || 'Peshin'}
                  </span>
                  <span className="text-[#DFBD69] font-mono-numbers tabular-nums font-extrabold text-[clamp(1.1rem,1.45vw,2.1rem)]">
                    {nextInfo.nextPrayer?.time || '12:30'}
                  </span>
                </div>
                <div className="pt-1 border-t border-[#DFBD69]/20">
                  <span className="text-[clamp(9px,0.62vw,13px)] uppercase tracking-widest text-[#FFF8E8]/65 block">
                    Azongacha qolgan vaqt:
                  </span>
                  <div className="text-[clamp(1.45rem,2.15vw,3.25rem)] font-mono-numbers tabular-nums font-extrabold qz-gold-foil-text tracking-wider leading-tight">
                    {nextInfo.countdownText}
                  </div>
                </div>
              </div>

              {/* Next Jamoat (Iqamah) Box */}
              <div
                className={`p-[clamp(10px,1.1vw,22px)] rounded-2xl border flex flex-col justify-between gap-1 ${
                  iqamahCountdown?.isWaitingForIqamah
                    ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.45)]'
                    : 'bg-[#010805]/85 border-emerald-500/45'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest text-emerald-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {iqamahCountdown?.isWaitingForIqamah
                        ? 'Jamoat Takbirigacha!'
                        : 'Jamoat (Iqomat)'}
                    </span>
                  </span>
                  <span className="font-arabic text-[clamp(1rem,1.25vw,1.75rem)] text-emerald-300 leading-none">
                    إقامة الجماعة
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-[clamp(1.2rem,1.65vw,2.35rem)] font-display font-extrabold text-[#FFF8E8] truncate">
                    {iqamahCountdown?.activePrayerNameUz || nextInfo.nextPrayer?.nameUz || 'Peshin'}
                  </span>
                  <span className="text-emerald-300 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.1rem,1.45vw,2.1rem)]">
                    {iqamahCountdown?.iqamahTime || nextInfo.nextPrayer?.iqamahTime || '13:00'}
                  </span>
                </div>
                <div className="pt-1 border-t border-emerald-500/25">
                  <span className="text-[clamp(9px,0.62vw,13px)] uppercase tracking-widest text-emerald-200/75 block">
                    Iqomatgacha qolgan vaqt:
                  </span>
                  <div className="text-[clamp(1.45rem,2.15vw,3.25rem)] font-mono-numbers tabular-nums font-extrabold text-emerald-300 tracking-wider leading-tight">
                    {iqamahCountdown
                      ? formatSecondsHms(iqamahCountdown.secondsLeft)
                      : nextInfo.countdownText}
                  </div>
                </div>
              </div>
            </div>

            {/* Haramayn Congregation Etiquette Banner */}
            <div className="px-[clamp(10px,1vw,20px)] py-[clamp(6px,0.8vh,14px)] rounded-2xl bg-[linear-gradient(90deg,rgba(138,102,33,0.22),rgba(4,29,19,0.92),rgba(138,102,33,0.22))] border border-[#DFBD69]/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[clamp(10px,0.75vw,15px)] font-extrabold text-[#FFF6C8] uppercase tracking-wider truncate">
                  🕌 Safni tekislang va telefonni ovozsiz qiling
                </div>
                <div className="text-[clamp(9px,0.66vw,13px)] text-[#FFF8E8]/75 truncate">
                  Ibodat xushuʼsi uchun uyali aloqa vositalarini ovozsiz rejimga oʻtkazing.
                </div>
              </div>
              <span
                dir="rtl"
                className="font-arabic text-[clamp(1rem,1.25vw,1.8rem)] text-[#DFBD69] shrink-0 hidden sm:inline-block"
              >
                استووا واعتدلوا
              </span>
            </div>

            {/* Remote-Friendly Adhan Audio Controller */}
            <div className="space-y-1.5 pt-1.5 border-t border-[#DFBD69]/25">
              <div className="flex items-center justify-between text-[clamp(10px,0.72vw,15px)]">
                <span className="font-bold text-[#FFF6C8] truncate">{currentTrack.titleUz}</span>
                <span className="font-mono-numbers tabular-nums text-[#DFBD69]">
                  {currentTrack.durationLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  ref={prevBtnRef}
                  type="button"
                  onFocus={() => setFocusedZone('prev')}
                  onClick={() => handleCycleTrack(-1)}
                  className={`p-[clamp(8px,0.8vw,14px)] rounded-2xl bg-white/10 hover:bg-white/20 border text-white cursor-pointer transition-all ${
                    focusedZone === 'prev'
                      ? 'border-[#FFF6C8] ring-4 ring-[#DFBD69]/65 shadow-[0_0_20px_rgba(223,189,105,0.65)]'
                      : 'border-[#DFBD69]/35'
                  }`}
                  title="Oldingi azon maqomi"
                >
                  <ChevronLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
                <button
                  ref={playBtnRef}
                  type="button"
                  onFocus={() => setFocusedZone('play')}
                  onClick={handleTogglePlay}
                  className={`flex-1 py-[clamp(8px,0.9vh,16px)] px-4 rounded-2xl qz-gold-foil-bg text-[#010906] font-extrabold text-[clamp(11px,0.82vw,17px)] flex items-center justify-center gap-2 shadow-lg cursor-pointer border transition-all ${
                    focusedZone === 'play'
                      ? 'border-white ring-4 ring-[#FFF6C8]/80 shadow-[0_0_28px_rgba(255,246,200,0.8)]'
                      : 'border-[#FFF6C8]'
                  }`}
                >
                  {isPlayingCurrent ? (
                    <>
                      <Pause className="w-4 h-4 2xl:w-5 2xl:h-5 fill-current shrink-0" />
                      <span className="truncate">Azonni Toʻxtatish</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 2xl:w-5 2xl:h-5 fill-current shrink-0" />
                      <span className="truncate">Azonni Yangratish (OK)</span>
                    </>
                  )}
                </button>
                {playerState.playingTrackId && (
                  <button
                    type="button"
                    onClick={() => stopActiveAdhanAudio()}
                    className="p-[clamp(8px,0.8vw,14px)] rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 cursor-pointer"
                    title="Toʻxtatish"
                  >
                    <Square className="w-4 h-4 2xl:w-5 2xl:h-5 fill-current" />
                  </button>
                )}
                <button
                  ref={nextBtnRef}
                  type="button"
                  onFocus={() => setFocusedZone('next')}
                  onClick={() => handleCycleTrack(1)}
                  className={`p-[clamp(8px,0.8vw,14px)] rounded-2xl bg-white/10 hover:bg-white/20 border text-white cursor-pointer transition-all ${
                    focusedZone === 'next'
                      ? 'border-[#FFF6C8] ring-4 ring-[#DFBD69]/65 shadow-[0_0_20px_rgba(223,189,105,0.65)]'
                      : 'border-[#DFBD69]/35'
                  }`}
                  title="Keyingi azon maqomi"
                >
                  <ChevronRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right 8 Cols: 8 Prayer Times Haramayn Congregation Board (4x2 Proportional Grid) */}
          <div
            className={`${
              isLandscapeTv
                ? 'lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-rows-2 gap-[clamp(8px,0.9vw,18px)] min-h-0'
                : 'grid grid-cols-2 gap-3'
            }`}
          >
            {schedule.times.map((item) => {
              const isNext = nextInfo.nextPrayer?.key === item.key;
              const isCurrent = nextInfo.currentPrayer?.key === item.key;
              return (
                <div
                  key={item.key}
                  className={`relative p-[clamp(10px,1.1vw,24px)] rounded-2xl 2xl:rounded-3xl border-2 flex flex-col justify-between transition-all overflow-hidden min-h-0 ${
                    isNext
                      ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(223,189,105,0.34),rgba(4,29,19,0.96)_75%)] border-[#FFF6C8] shadow-[0_0_32px_rgba(223,189,105,0.35)]'
                      : isCurrent
                        ? 'bg-[#092E1F]/92 border-emerald-400/80 shadow-[0_0_22px_rgba(16,185,129,0.28)]'
                        : 'qz-obsidian-card border-[#DFBD69]/35'
                  }`}
                >
                  <ArabesqueCornerOrnaments size={16} />

                  {/* Prayer Name (Uzbek + Arabic) */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[clamp(0.95rem,1.25vw,1.85rem)] font-display font-extrabold truncate ${
                        isNext ? 'text-[#FFF6C8]' : 'text-[#FFF8E8]'
                      }`}
                    >
                      {item.nameUz}
                    </span>
                    <span className="text-[clamp(1rem,1.3vw,1.9rem)] font-arabic text-[#DFBD69] shrink-0 leading-none">
                      {item.nameAr}
                    </span>
                  </div>

                  {/* Azon & Jamoat (Iqomat) High-Contrast Time Readout */}
                  <div className="my-auto py-1 space-y-[clamp(4px,0.6vh,10px)]">
                    <div className="px-[clamp(8px,0.8vw,16px)] py-[clamp(4px,0.6vh,10px)] rounded-xl bg-[#010805]/80 border border-[#DFBD69]/30 flex items-center justify-between gap-2">
                      <span className="text-[clamp(8px,0.62vw,13px)] uppercase tracking-wider text-[#DFBD69] font-extrabold">
                        {item.iqamahTime ? 'Azon' : 'Vaqt'}
                      </span>
                      <span className="text-[clamp(1.3rem,1.95vw,3rem)] font-mono-numbers tabular-nums font-extrabold text-[#FFF8E8] leading-none">
                        {item.time}
                      </span>
                    </div>

                    <div
                      className={`px-[clamp(8px,0.8vw,16px)] py-[clamp(4px,0.6vh,10px)] rounded-xl border flex items-center justify-between gap-2 ${
                        item.iqamahTime
                          ? 'bg-emerald-950/75 border-emerald-400/45'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <span className="text-[clamp(8px,0.62vw,13px)] uppercase tracking-wider text-emerald-300 font-extrabold">
                        {item.iqamahTime ? 'Jamoat' : 'Maqom'}
                      </span>
                      <span className="text-[clamp(1.05rem,1.55vw,2.35rem)] font-mono-numbers tabular-nums font-extrabold text-emerald-300 leading-none">
                        {item.iqamahTime || 'Sunnat / Nafl'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Status Indicator */}
                  <div className="flex items-center justify-between text-[clamp(9px,0.65vw,14px)] font-extrabold pt-0.5">
                    {isNext ? (
                      <span className="uppercase tracking-widest text-[#FFF6C8] flex items-center gap-1 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-[#DFBD69] shrink-0" />
                        <span>Navbatdagi Namoz</span>
                      </span>
                    ) : isCurrent ? (
                      <span className="uppercase tracking-widest text-emerald-300 truncate">
                        ● Joriy Namoz Vaqti
                      </span>
                    ) : (
                      <span className="text-[#FFF8E8]/55 truncate">Asaka rasmiy jadvali</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            ROW 3: SPIRITUAL WISDOM & LIVE MOSQUE ANNOUNCEMENTS BAR
            Compact 3-column 10-foot layout: Kun Oyati | Kun Hadisi | Masjid E'loni
            ===================================================================== */}
        <div
          className={`grid grid-cols-1 ${
            isLandscapeTv ? 'lg:grid-cols-12 gap-[clamp(8px,1vw,20px)]' : 'gap-3'
          }`}
        >
          {/* Kun Oyati (5 cols) */}
          <div
            className={`${
              isLandscapeTv ? 'lg:col-span-5' : ''
            } relative px-[clamp(12px,1.2vw,24px)] py-[clamp(8px,1vh,16px)] rounded-2xl qz-obsidian-card border border-[#DFBD69]/35 flex flex-col justify-between gap-1`}
          >
            <ArabesqueCornerOrnaments size={16} />
            <div className="flex items-center justify-between gap-2 text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest text-[#DFBD69]">
              <span className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Kun Oyati · Tafsiri Hilol</span>
              </span>
              <span className="text-emerald-300 shrink-0">
                {dailyAyah.surahNameUz} ({dailyAyah.surahNumber}:{dailyAyah.numberInSurah})
              </span>
            </div>
            <p
              className="text-[clamp(1.05rem,1.35vw,2rem)] font-arabic text-right text-[#FFF6C8] leading-snug line-clamp-1"
              dir="rtl"
            >
              {dailyAyah.textAr}
            </p>
            <p className="text-[clamp(11px,0.82vw,17px)] text-[#FFF8E8]/92 leading-snug line-clamp-2">
              «{dailyAyah.translationUz}»
            </p>
          </div>

          {/* Kun Hadisi (4 cols) */}
          <div
            className={`${
              isLandscapeTv ? 'lg:col-span-4' : ''
            } relative px-[clamp(12px,1.2vw,24px)] py-[clamp(8px,1vh,16px)] rounded-2xl qz-obsidian-card border border-[#DFBD69]/35 flex flex-col justify-between gap-1`}
          >
            <ArabesqueCornerOrnaments size={16} />
            <div className="flex items-center justify-between gap-2 text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest text-[#DFBD69]">
              <span className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>Kun Hadisi · {dailyHadith.collectionNameUz}</span>
              </span>
              <span className="text-emerald-300 shrink-0">{dailyHadith.grade}</span>
            </div>
            <p
              className="text-[clamp(1.05rem,1.35vw,2rem)] font-arabic text-right text-[#FFF6C8] leading-snug line-clamp-1"
              dir="rtl"
            >
              {dailyHadith.textAr}
            </p>
            <p className="text-[clamp(11px,0.82vw,17px)] text-[#FFF8E8]/92 leading-snug line-clamp-2">
              «{dailyHadith.translationUz}»
            </p>
          </div>

          {/* Live Mosque Announcements / Jamoat Xabarnomasi (3 cols) */}
          <div
            className={`${
              isLandscapeTv ? 'lg:col-span-3' : ''
            } relative px-[clamp(12px,1.2vw,24px)] py-[clamp(8px,1vh,16px)] rounded-2xl bg-[linear-gradient(145deg,rgba(6,61,50,0.88),rgba(2,14,9,0.95))] border border-emerald-400/45 flex flex-col justify-between gap-1`}
          >
            <ArabesqueCornerOrnaments size={16} />
            <div className="flex items-center justify-between gap-2 text-[clamp(9px,0.68vw,14px)] font-extrabold uppercase tracking-widest text-emerald-300">
              <span className="flex items-center gap-1.5 truncate">
                <Megaphone className="w-3.5 h-3.5 shrink-0 text-[#DFBD69]" />
                <span>Masjid Eʼloni</span>
              </span>
              {announcements.length > 1 && (
                <span className="font-mono-numbers tabular-nums text-[#DFBD69]">
                  {(activeAnnouncementIdx % announcements.length) + 1}/{announcements.length}
                </span>
              )}
            </div>
            {currentAnnouncement ? (
              <>
                <div className="text-[clamp(12px,0.92vw,19px)] font-display font-extrabold text-[#FFF6C8] line-clamp-1">
                  {currentAnnouncement.title}
                </div>
                <p className="text-[clamp(11px,0.78vw,16px)] text-[#FFF8E8]/90 leading-snug line-clamp-2">
                  {currentAnnouncement.description}
                </p>
              </>
            ) : (
              <>
                <div className="text-[clamp(12px,0.92vw,19px)] font-display font-extrabold text-[#FFF6C8]">
                  Juma va Jamoat Eslatmasi
                </div>
                <p className="text-[clamp(11px,0.78vw,16px)] text-[#FFF8E8]/90 leading-snug line-clamp-2">
                  Jamoat namoziga 15 daqiqa oldin kelib sunnat va zikrlarni ado etishingiz tavsiya etiladi.
                </p>
              </>
            )}
          </div>
        </div>

        {/* =====================================================================
            ROW 4: SMART TV / ANDROID TV REMOTE CONTROL FOOTER
            ===================================================================== */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#DFBD69]/25 text-[clamp(10px,0.72vw,15px)] text-[#FFF8E8]/75">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Masjid Smart TV Pult:{' '}
              <strong className="text-[#DFBD69]">← / →</strong> Tanlash
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#DFBD69]">OK / Enter</strong> Azon yangratish
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#DFBD69]">F</strong> Toʻliq ekran
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#DFBD69]">M</strong> 16:9 / 9:16 Rejim
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#DFBD69]">Esc / Back</strong> Chiqish
            </span>
          </div>
          <div className="font-mono-numbers tabular-nums text-[#DFBD69] font-bold">
            ASAKA ZIYO · SMART TV DISPLAY ({viewportInfo.w}×{viewportInfo.h})
          </div>
        </footer>
      </div>
    </div>
  );
};
