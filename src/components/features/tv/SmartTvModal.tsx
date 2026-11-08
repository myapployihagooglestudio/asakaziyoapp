import React, { useState, useEffect, useRef } from 'react';
import { PrayerSchedule, Ayah, HadithItem } from '../../../types';
import { getNextPrayerCalculation, NextPrayerInfo } from '../../../utils/prayerTimeUtils';
import {
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  subscribeToAdhanPlayerState,
  getPrayerAlertSettings,
  ADHAN_TRACKS,
  AdhanPlayerState,
} from '../../../utils/notificationService';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';
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
} from 'lucide-react';

interface SmartTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
}

export const SmartTvModal: React.FC<SmartTvModalProps> = ({
  isOpen,
  onClose,
  schedule,
  dailyAyah,
  dailyHadith,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('12:00:00');
  const [nextInfo, setNextInfo] = useState<NextPrayerInfo>(() =>
    getNextPrayerCalculation(schedule.times)
  );
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [focusedZone, setFocusedZone] = useState<'play' | 'prev' | 'next' | 'close'>('play');
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
      setNextInfo(getNextPrayerCalculation(schedule.times));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [isOpen, schedule.times]);

  useEffect(() => {
    const unsub = subscribeToAdhanPlayerState((st) => setPlayerState(st));
    return unsub;
  }, []);

  // Remote-Control & Keyboard D-Pad Directional Navigation (ArrowLeft/Right/Up/Down, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;
    playBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
        return;
      }
      const order: ('prev' | 'play' | 'next' | 'close')[] = ['prev', 'play', 'next', 'close'];
      const idx = order.indexOf(focusedZone);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextZone = order[(idx + 1) % order.length];
        setFocusedZone(nextZone);
        if (nextZone === 'play') playBtnRef.current?.focus();
        if (nextZone === 'prev') prevBtnRef.current?.focus();
        if (nextZone === 'next') nextBtnRef.current?.focus();
        if (nextZone === 'close') closeBtnRef.current?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevZone = order[(idx - 1 + order.length) % order.length];
        setFocusedZone(prevZone);
        if (prevZone === 'play') playBtnRef.current?.focus();
        if (prevZone === 'prev') prevBtnRef.current?.focus();
        if (prevZone === 'next') nextBtnRef.current?.focus();
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

  return (
    <div
      className="fixed inset-0 z-50 bg-[#03120e] text-[#F4F1EA] overflow-y-auto flex flex-col justify-between p-6 sm:p-10 lg:p-14 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="ASAKA ZIYO Smart TV va Masjid Ekrani Rejimi"
    >
      <GeometricPattern opacity={0.07} />

      {/* Top Bar: Brand, Live Tashkent Clock, and Remote Exit Button */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6 border-b border-[#c5a869]/30 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#07261f] border-2 border-[#c5a869] flex items-center justify-center shadow-xl">
            <IslamicStarEmblem size={28} className="text-[#c5a869]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white">
                ASAKA ZIYO
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#c5a869]/20 border border-[#c5a869]/50 text-[#c5a869] text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>Smart TV · 10-Foot Display</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-300 mt-1">
              <MapPin className="w-4 h-4 text-[#c5a869]" />
              <span>{schedule.location || 'Asaka shahri, Andijon viloyati'}</span>
              <span>·</span>
              <span className="text-[#e6ce8a] font-semibold">{schedule.hijriDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-[#c5a869] font-bold">
              Toshkent / Asaka Vaqti
            </div>
            <div className="text-3xl sm:text-5xl font-mono-numbers font-extrabold text-white tracking-wider">
              {currentTimeStr}
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            onFocus={() => setFocusedZone('close')}
            className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-rose-500/30 border-2 border-white/20 focus:border-[#c5a869] text-white font-bold text-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
            <span>Yopish (Esc)</span>
          </button>
        </div>
      </div>

      {/* Center Content: Next Prayer Hero + 8 Prayer Times Grid */}
      <div className="relative z-10 my-auto py-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Next Prayer Large Countdown Card */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#062921] via-[#041d17] to-[#031510] border-2 border-[#c5a869]/60 p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                <span>Navbatdagi Namoz</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-display font-bold text-white">
                {nextInfo.nextPrayer?.nameUz || 'Peshin'}
              </h2>
              <div className="text-2xl font-arabic text-[#e6ce8a]">
                {nextInfo.nextPrayer?.nameAr}
              </div>
            </div>

            <div className="my-6 py-4 px-5 rounded-2xl bg-black/40 border border-[#c5a869]/30">
              <div className="text-xs uppercase tracking-widest text-stone-400">
                Namoz kirishiga qolgan vaqt:
              </div>
              <div className="text-4xl sm:text-6xl font-mono-numbers font-extrabold text-[#c5a869] tracking-wider mt-1">
                {nextInfo.countdownText}
              </div>
            </div>

            {/* Remote-Friendly Adhan Audio Controller */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-stone-300">
                <span className="font-bold text-[#e6ce8a] truncate">
                  {currentTrack.titleUz}
                </span>
                <span className="font-mono-numbers text-[#c5a869]">
                  {currentTrack.durationLabel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  ref={prevBtnRef}
                  onFocus={() => setFocusedZone('prev')}
                  onClick={() => handleCycleTrack(-1)}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-transparent focus:border-[#c5a869] text-white cursor-pointer"
                  title="Oldingi azon maqomi"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  ref={playBtnRef}
                  onFocus={() => setFocusedZone('play')}
                  onClick={handleTogglePlay}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-[#c5a869] hover:bg-[#d8be80] text-[#03120e] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer border-2 border-white/40"
                >
                  {isPlayingCurrent ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      <span>Azonni Toʻxtatib Turish</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Azonni Tinglash (Enter)</span>
                    </>
                  )}
                </button>
                {playerState.playingTrackId && (
                  <button
                    onClick={() => stopActiveAdhanAudio()}
                    className="p-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border-2 border-rose-500/40 text-rose-200 cursor-pointer"
                    title="Toʻxtatish"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                )}
                <button
                  ref={nextBtnRef}
                  onFocus={() => setFocusedZone('next')}
                  onClick={() => handleCycleTrack(1)}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-transparent focus:border-[#c5a869] text-white cursor-pointer"
                  title="Keyingi azon maqomi"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 8 Prayer Times Large High-Contrast Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {schedule.times.map((item) => {
              const isNext = nextInfo.nextPrayer?.key === item.key;
              return (
                <div
                  key={item.key}
                  className={`p-5 rounded-3xl border-2 flex flex-col justify-between transition-all ${
                    isNext
                      ? 'bg-gradient-to-b from-[#c5a869]/25 to-[#062921] border-[#c5a869] shadow-2xl scale-[1.02]'
                      : 'bg-[#071f1a]/90 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-bold text-stone-200">
                      {item.nameUz}
                    </span>
                    <span className="text-base font-arabic text-[#c5a869]">
                      {item.nameAr}
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl sm:text-4xl font-mono-numbers font-extrabold text-white">
                      {item.time}
                    </div>
                    {item.iqamahTime ? (
                      <div className="text-xs font-mono-numbers text-emerald-300 mt-1">
                        Iqomat: {item.iqamahTime}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400 mt-1">Asaka vaqti</div>
                    )}
                  </div>

                  {isNext && (
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#c5a869] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Navbatdagi</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: Daily Quran Verse & Hadith for Mosque / Living Room TV */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#071f1a]/80 border border-[#c5a869]/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#c5a869]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Kun Oyati</span>
              </span>
              <span>Qurʼoni Karim ({dailyAyah.surahNumber}:{dailyAyah.numberInSurah})</span>
            </div>
            <p className="text-xl sm:text-2xl font-arabic text-right text-[#e6ce8a] leading-loose" dir="rtl">
              {dailyAyah.textAr}
            </p>
            <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
              «{dailyAyah.translationUz}»
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#071f1a]/80 border border-[#c5a869]/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#c5a869]">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Kun Hadisi</span>
              </span>
              <span>{dailyHadith.collectionNameUz}</span>
            </div>
            <p className="text-xl sm:text-2xl font-arabic text-right text-[#e6ce8a] leading-loose" dir="rtl">
              {dailyHadith.textAr}
            </p>
            <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
              «{dailyHadith.translationUz}»
            </p>
          </div>
        </div>
      </div>

      {/* Footer Instructions for TV Remote / Keyboard */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-stone-400">
        <div>
          Pult (Remote) yoki klaviatura boshqaruvi: <strong className="text-[#c5a869]">← / →</strong> tugmalari orqali tanlash, <strong className="text-[#c5a869]">Enter / OK</strong> orqali Azon ijrosi, <strong className="text-[#c5a869]">Esc / Back</strong> orqali chiqish.
        </div>
        <div>ASAKA ZIYO — Universal Smart TV & Masjid Display v2026</div>
      </div>
    </div>
  );
};
