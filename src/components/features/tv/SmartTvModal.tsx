import React, { useState, useEffect, useRef } from 'react';
import { PrayerSchedule, Ayah, HadithItem } from '../../../types';
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
import {
  GeometricPattern,
  IslamicStarEmblem,
  ArabesqueCornerOrnaments,
  VolumetricGodRays,
  CalligraphyBasmalahBadge,
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
} from 'lucide-react';

interface SmartTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
}

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

  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<'landscape' | 'totem'>('landscape');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedZone, setFocusedZone] = useState<'play' | 'prev' | 'next' | 'fullscreen' | 'close'>('play');
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
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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
      const order: ('prev' | 'play' | 'next' | 'fullscreen' | 'close')[] = [
        'prev',
        'play',
        'next',
        'fullscreen',
        'close',
      ];
      const idx = order.indexOf(focusedZone);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextZone = order[(idx + 1) % order.length];
        setFocusedZone(nextZone);
        if (nextZone === 'play') playBtnRef.current?.focus();
        if (nextZone === 'prev') prevBtnRef.current?.focus();
        if (nextZone === 'next') nextBtnRef.current?.focus();
        if (nextZone === 'fullscreen') fullscreenBtnRef.current?.focus();
        if (nextZone === 'close') closeBtnRef.current?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevZone = order[(idx - 1 + order.length) % order.length];
        setFocusedZone(prevZone);
        if (prevZone === 'play') playBtnRef.current?.focus();
        if (prevZone === 'prev') prevBtnRef.current?.focus();
        if (prevZone === 'next') nextBtnRef.current?.focus();
        if (prevZone === 'fullscreen') fullscreenBtnRef.current?.focus();
        if (prevZone === 'close') closeBtnRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedZone, onClose]);

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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 qz-stage text-[#FFF8E8] overflow-y-auto flex flex-col justify-between p-4 sm:p-8 lg:p-10 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="ASAKA ZIYO — Haramayn Masjid Jamoat Ekrani va Smart TV Rejimi"
    >
      {/* Multi-Layer Sacred Cinema Backdrop */}
      <VolumetricGodRays />
      <GeometricPattern opacity={0.06} />
      <div className="qz-vignette" />

      <div
        className={`relative z-10 w-full mx-auto flex-1 flex flex-col justify-between gap-5 ${
          displayMode === 'totem' ? 'max-w-[620px]' : 'max-w-[1800px]'
        }`}
      >
        {/* 1. HARAMAYN MOSQUE TOP HEADER */}
        <div className="relative rounded-3xl qz-obsidian-card px-5 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4">
          <ArabesqueCornerOrnaments size={24} />

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[radial-gradient(circle_at_30%_25%,#092E1F_0%,#041D13_65%,#010906_100%)] border-2 border-[#DFBD69] flex items-center justify-center shadow-[0_0_26px_rgba(223,189,105,0.35)] shrink-0">
              <IslamicStarEmblem size={30} className="text-[#FFF6C8]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-xl sm:text-3xl font-extrabold tracking-[0.12em] qz-gold-foil-text">
                  ASAKA ZIYO · JOME MASJIDI EKRANI
                </span>
                <span className="px-3 py-1 rounded-full bg-[#DFBD69]/18 border border-[#DFBD69]/55 text-[#FFF6C8] text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-[#DFBD69]" />
                  <span>Haramayn Jamoat Display</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-[#FFF8E8]/85 mt-1">
                <span className="inline-flex items-center gap-1 font-semibold text-[#DFBD69]">
                  <MapPin className="w-4 h-4" />
                  {schedule.location || 'Asaka shahri, Andijon viloyati'}
                </span>
                <span className="text-[#DFBD69]/50">·</span>
                <span className="font-bold text-emerald-300">{schedule.hijriDate}</span>
                {gregorianDateStr && (
                  <>
                    <span className="text-[#DFBD69]/50">·</span>
                    <span className="text-[#FFF8E8]/75 capitalize">{gregorianDateStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: Live Giant Clock + Orientation + Fullscreen + Exit */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 ml-auto">
            <div className="text-right px-4 py-2 rounded-2xl bg-[#010805]/80 border border-[#DFBD69]/45 shadow-inner">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#DFBD69] font-extrabold">
                Asaka / Toshkent Vaqti
              </div>
              <div className="text-3xl sm:text-5xl font-mono-numbers font-extrabold text-[#FFF8E8] tracking-wider leading-none mt-0.5">
                {hh}:{mm}:<span className="text-[#DFBD69]">{ss}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDisplayMode((prev) => (prev === 'landscape' ? 'totem' : 'landscape'))
                }
                className="px-3.5 py-3 rounded-2xl bg-[#041D13] hover:bg-[#092E1F] border border-[#DFBD69]/45 text-[#FFF6C8] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Gorizontal TV yoki Vertikal Ustun (Totem) koʻrinishi"
              >
                <Smartphone className="w-4 h-4 text-[#DFBD69]" />
                <span className="hidden xl:inline">
                  {displayMode === 'landscape' ? '9:16 Ustun' : '16:9 TV'}
                </span>
              </button>

              <button
                ref={fullscreenBtnRef}
                type="button"
                onFocus={() => setFocusedZone('fullscreen')}
                onClick={handleToggleFullscreen}
                className="px-3.5 py-3 rounded-2xl bg-[#041D13] hover:bg-[#092E1F] border border-[#DFBD69]/45 text-[#FFF6C8] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
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
                className="px-4 py-3 rounded-2xl bg-rose-950/70 hover:bg-rose-800/80 border border-rose-400/50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                <span>Yopish</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. HARAMAYN DUAL COUNTDOWN + 8 PRAYER TIMES CONGREGATION BOARD */}
        <div
          className={`grid grid-cols-1 ${
            displayMode === 'totem' ? ' gap-5' : 'lg:grid-cols-12 gap-6'
          } items-stretch`}
        >
          {/* Left 5 Cols: Mihrab Sanctuary Countdown (Azon & Jamoat Iqomat) */}
          <div
            className={`${
              displayMode === 'totem' ? '' : 'lg:col-span-5'
            } relative rounded-3xl qz-obsidian-card p-6 sm:p-8 flex flex-col justify-between gap-5`}
          >
            <ArabesqueCornerOrnaments size={28} />

            <div className="flex items-center justify-between gap-3">
              <CalligraphyBasmalahBadge />
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Qibla: {schedule.qiblaAngleDeg || 241}°</span>
              </span>
            </div>

            {/* Dual Azon & Iqamah Live Countdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Next Azon Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#010805]/80 border border-[#DFBD69]/45 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#DFBD69] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Navbatdagi Azon</span>
                  </span>
                  <span className="font-arabic text-lg text-[#FFF6C8]">
                    {nextInfo.nextPrayer?.nameAr || 'الصلاة'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFF8E8]">
                  {nextInfo.nextPrayer?.nameUz || 'Peshin'}{' '}
                  <span className="text-[#DFBD69] font-mono-numbers text-xl">
                    ({nextInfo.nextPrayer?.time || '12:30'})
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] uppercase tracking-widest text-[#FFF8E8]/60 block">
                    Azongacha qolgan vaqt:
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono-numbers font-extrabold qz-gold-foil-text tracking-wider">
                    {nextInfo.countdownText}
                  </div>
                </div>
              </div>

              {/* Next Jamoat (Iqamah) Box */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-1.5 ${
                  iqamahCountdown?.isWaitingForIqamah
                    ? 'bg-emerald-950/85 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse'
                    : 'bg-[#010805]/80 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {iqamahCountdown?.isWaitingForIqamah
                        ? 'Jamoat Takbirigacha!'
                        : 'Jamoat (Iqomat)'}
                    </span>
                  </span>
                  <span className="font-arabic text-lg text-emerald-300">إقامة الجماعة</span>
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFF8E8]">
                  {iqamahCountdown?.activePrayerNameUz || nextInfo.nextPrayer?.nameUz || 'Peshin'}{' '}
                  <span className="text-emerald-300 font-mono-numbers text-xl">
                    ({iqamahCountdown?.iqamahTime || nextInfo.nextPrayer?.iqamahTime || '13:00'})
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-200/75 block">
                    Iqomatgacha qolgan vaqt:
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono-numbers font-extrabold text-emerald-300 tracking-wider">
                    {iqamahCountdown ? formatSecondsHms(iqamahCountdown.secondsLeft) : nextInfo.countdownText}
                  </div>
                </div>
              </div>
            </div>

            {/* Haramayn Congregation Etiquette Reminder */}
            <div className="p-3.5 rounded-2xl bg-[linear-gradient(90deg,rgba(138,102,33,0.22),rgba(4,29,19,0.9),rgba(138,102,33,0.22))] border border-[#DFBD69]/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold text-[#FFF6C8] uppercase tracking-wider">
                  🕌 Jamoat odobi: Safni tekislang va telefonni ovozsiz qiling
                </div>
                <div className="text-[11px] text-[#FFF8E8]/75">
                  Namoz vaqtida uyali aloqa vositalarini ovozsiz rejimga oʻtkazishingizni soʻraymiz.
                </div>
              </div>
              <span
                dir="rtl"
                className="font-arabic text-lg sm:text-xl text-[#DFBD69] shrink-0 hidden sm:inline-block"
              >
                استووا واعتدلوا
              </span>
            </div>

            {/* Remote-Friendly Adhan Audio Controller */}
            <div className="space-y-2.5 pt-2 border-t border-[#DFBD69]/25">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#FFF6C8] truncate">{currentTrack.titleUz}</span>
                <span className="font-mono-numbers text-[#DFBD69]">{currentTrack.durationLabel}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  ref={prevBtnRef}
                  onFocus={() => setFocusedZone('prev')}
                  onClick={() => handleCycleTrack(-1)}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#DFBD69]/35 text-white cursor-pointer"
                  title="Oldingi azon maqomi"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  ref={playBtnRef}
                  onFocus={() => setFocusedZone('play')}
                  onClick={handleTogglePlay}
                  className="flex-1 py-3 px-5 rounded-2xl qz-gold-foil-bg text-[#010906] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer border border-[#FFF6C8]"
                >
                  {isPlayingCurrent ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      <span>Azonni Toʻxtatib Turish</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Azonni Yangratish (Enter)</span>
                    </>
                  )}
                </button>
                {playerState.playingTrackId && (
                  <button
                    onClick={() => stopActiveAdhanAudio()}
                    className="p-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 cursor-pointer"
                    title="Toʻxtatish"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                )}
                <button
                  ref={nextBtnRef}
                  onFocus={() => setFocusedZone('next')}
                  onClick={() => handleCycleTrack(1)}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#DFBD69]/35 text-white cursor-pointer"
                  title="Keyingi azon maqomi"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: 8 Prayer Times Haramayn Congregation Board (Azon & Iqomat) */}
          <div
            className={`${
              displayMode === 'totem'
                ? 'grid grid-cols-2 gap-3.5'
                : 'lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4'
            }`}
          >
            {schedule.times.map((item) => {
              const isNext = nextInfo.nextPrayer?.key === item.key;
              const isCurrent = nextInfo.currentPrayer?.key === item.key;
              return (
                <div
                  key={item.key}
                  className={`relative p-5 rounded-3xl border-2 flex flex-col justify-between transition-all overflow-hidden ${
                    isNext
                      ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(223,189,105,0.32),rgba(4,29,19,0.95)_75%)] border-[#FFF6C8] shadow-[0_0_36px_rgba(223,189,105,0.38)] scale-[1.02]'
                      : isCurrent
                      ? 'bg-[#092E1F]/90 border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
                      : 'qz-obsidian-card border-[#DFBD69]/30'
                  }`}
                >
                  <ArabesqueCornerOrnaments size={18} />

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-base sm:text-lg font-display font-extrabold ${
                        isNext ? 'text-[#FFF6C8]' : 'text-[#FFF8E8]'
                      }`}
                    >
                      {item.nameUz}
                    </span>
                    <span className="text-xl font-arabic text-[#DFBD69]">{item.nameAr}</span>
                  </div>

                  {/* Azon & Iqomat split display */}
                  <div className="my-3 space-y-2">
                    <div className="p-2.5 rounded-2xl bg-[#010805]/70 border border-[#DFBD69]/25 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[#DFBD69] font-bold">
                        {item.iqamahTime ? 'Azon' : 'Kirish'}
                      </span>
                      <span className="text-2xl sm:text-3xl font-mono-numbers font-extrabold text-[#FFF8E8]">
                        {item.time}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                        item.iqamahTime
                          ? 'bg-emerald-950/65 border-emerald-400/40'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                        {item.iqamahTime ? 'Jamoat' : 'Maqom'}
                      </span>
                      <span className="text-xl sm:text-2xl font-mono-numbers font-extrabold text-emerald-300">
                        {item.iqamahTime || 'Nafl / Vaqt'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold">
                    {isNext ? (
                      <span className="uppercase tracking-widest text-[#FFF6C8] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                        <span>Navbatdagi Namoz</span>
                      </span>
                    ) : isCurrent ? (
                      <span className="uppercase tracking-widest text-emerald-300">
                        ● Joriy Vaqt
                      </span>
                    ) : (
                      <span className="text-[#FFF8E8]/55">Tasdiqlangan jadval</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. BOTTOM SPIRITUAL SCROLL: KUN OYATI & KUN HADISI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="relative p-5 sm:p-6 rounded-3xl qz-obsidian-card space-y-2">
            <ArabesqueCornerOrnaments size={20} />
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-[#DFBD69]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Kun Oyati · Tafsiri Hilol</span>
              </span>
              <span>
                {dailyAyah.surahNameUz} surasi ({dailyAyah.surahNumber}:{dailyAyah.numberInSurah})
              </span>
            </div>
            <p
              className="text-xl sm:text-2xl font-arabic text-right text-[#FFF6C8] leading-loose"
              dir="rtl"
            >
              {dailyAyah.textAr}
            </p>
            <p className="text-xs sm:text-sm text-[#FFF8E8]/90 leading-relaxed">
              «{dailyAyah.translationUz}»
            </p>
          </div>

          <div className="relative p-5 sm:p-6 rounded-3xl qz-obsidian-card space-y-2">
            <ArabesqueCornerOrnaments size={20} />
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-[#DFBD69]">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Kun Hadisi · {dailyHadith.collectionNameUz}</span>
              </span>
              <span className="text-emerald-300">{dailyHadith.grade}</span>
            </div>
            <p
              className="text-xl sm:text-2xl font-arabic text-right text-[#FFF6C8] leading-loose"
              dir="rtl"
            >
              {dailyHadith.textAr}
            </p>
            <p className="text-xs sm:text-sm text-[#FFF8E8]/90 leading-relaxed">
              «{dailyHadith.translationUz}»
            </p>
          </div>
        </div>

        {/* 4. FOOTER INSTRUCTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#DFBD69]/20 text-xs text-[#FFF8E8]/70">
          <div>
            Masjid TV / Pult boshqaruvi:{' '}
            <strong className="text-[#DFBD69]">← / →</strong> tanlash,{' '}
            <strong className="text-[#DFBD69]">Enter / OK</strong> Azon ijrosi,{' '}
            <strong className="text-[#DFBD69]">F</strong> Toʻliq ekran,{' '}
            <strong className="text-[#DFBD69]">Esc</strong> chiqish.
          </div>
          <div className="font-mono-numbers text-[#DFBD69]">
            ASAKA ZIYO — Haramayn Masjid Jamoat Ekrani v2026
          </div>
        </div>
      </div>
    </div>
  );
};

