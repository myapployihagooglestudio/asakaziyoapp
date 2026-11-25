import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeGlobalQuranPlayer,
  toggleGlobalQuranPlayback,
  stopGlobalQuranPlayback,
  seekGlobalQuranAudio,
  setGlobalQuranSpeed,
  cycleGlobalQuranRepeatMode,
  toggleGlobalQuranShuffle,
  setGlobalQuranSleepTimer,
  playNextQuranTrack,
  playPrevQuranTrack,
  GlobalQuranPlayerState,
} from '../../utils/quranPlayerStore';
import { AudioWaveformBars, PREMIUM_EASE } from './MotionPrimitives';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Moon,
  X,
  ChevronUp,
  ChevronDown,
  WifiOff,
  Loader2,
  Gauge,
} from 'lucide-react';

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const SLEEP_OPTIONS = [null, 15, 30, 45, 60];

export const GlobalQuranMiniPlayer: React.FC = () => {
  const [st, setSt] = useState<GlobalQuranPlayerState | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    return subscribeGlobalQuranPlayer((next) => setSt(next));
  }, []);

  if (!st || !st.currentTrack) return null;

  const progressPct = st.duration > 0 ? Math.min(100, (st.currentTime / st.duration) * 100) : 0;

  const handleCycleSpeed = () => {
    const idx = SPEEDS.indexOf(st.playbackSpeed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setGlobalQuranSpeed(next);
  };

  const handleCycleSleep = () => {
    const idx = SLEEP_OPTIONS.indexOf(st.sleepTimerMinutes);
    const next = SLEEP_OPTIONS[(idx + 1) % SLEEP_OPTIONS.length];
    setGlobalQuranSleepTimer(next);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.28, ease: PREMIUM_EASE }}
        className="fixed bottom-[82px] lg:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[430px] z-40 rounded-3xl bg-[#071612]/95 backdrop-blur-xl text-[#F7F4EC] border border-[#C8A85E]/25 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] overflow-hidden"
        role="region"
        aria-label="Qurʼon Tilovat Pleyeri"
      >
        {/* Top Progress Strip */}
        <div className="h-[3px] w-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-[#C8A85E] transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={toggleGlobalQuranPlayback}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#DFC37E] to-[#B69142] text-[#050C09] flex items-center justify-center shrink-0 shadow-md hover:brightness-110 transition cursor-pointer"
                aria-label={st.isPlaying ? 'Toʻxtatish' : 'Ijro etish'}
              >
                {st.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : st.isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AudioWaveformBars
                    isPlaying={st.isPlaying}
                    barCount={5}
                    className="h-3 shrink-0"
                    barClassName="bg-emerald-400"
                  />
                  <span className="text-xs font-bold truncate text-[#F7F4EC]">
                    {st.currentTrack.surahNumber}. {st.currentTrack.surahNameUz}
                  </span>
                  {st.isOfflinePlayback && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold shrink-0"
                      title="Offline xotiradan ijro etilmoqda"
                    >
                      <WifiOff className="w-2.5 h-2.5" />
                      Offline
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#9AB0A7] truncate">
                  <span className="truncate">{st.currentTrack.qariNameUz}</span>
                  <span>·</span>
                  <span className="font-mono-numbers text-[#D8BC78] shrink-0">
                    {fmtTime(st.currentTime)} / {fmtTime(st.duration)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={playPrevQuranTrack}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Oldingi sura"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => playNextQuranTrack(false)}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Keyingi sura"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Pleyer boshqaruvi"
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={stopGlobalQuranPlayback}
                className="p-1.5 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 cursor-pointer"
                aria-label="Pleyerni yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {st.error && (
            <div className="text-[11px] text-rose-200 bg-rose-950/70 border border-rose-500/30 rounded-xl px-2.5 py-1.5">
              {st.error}
            </div>
          )}

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden pt-2 border-t border-white/10 space-y-3"
              >
                {st.currentTrack.surahNameAr && (
                  <div className="text-right font-arabic text-base text-[#E6CE8A]" dir="rtl">
                    {st.currentTrack.surahNameAr}
                  </div>
                )}

                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.round(st.duration || 100))}
                    value={Math.round(st.currentTime || 0)}
                    onChange={(e) => seekGlobalQuranAudio(Number(e.target.value))}
                    className="w-full accent-[#C8A85E] h-1.5 bg-white/15 rounded-lg cursor-pointer"
                    aria-label="Tilovat vaqtini surish"
                  />
                  <div className="flex justify-between text-[10px] font-mono-numbers text-stone-400">
                    <span>{fmtTime(st.currentTime)}</span>
                    <span>{fmtTime(st.duration)}</span>
                  </div>
                </div>

                {/* Speed, Repeat, Shuffle & Sleep Timer Controls */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleCycleSpeed}
                    className="px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-[#E6CE8A] font-mono-numbers font-bold inline-flex items-center gap-1 cursor-pointer"
                    title="Ijro tezligi (0.5x – 2x)"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{st.playbackSpeed}x</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleGlobalQuranRepeatMode}
                    className={`px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer ${
                      st.repeatMode !== 'off'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                        : 'bg-white/8 text-stone-300 hover:bg-white/15'
                    }`}
                    title="Takrorlash rejimi"
                  >
                    {st.repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                    <span>{st.repeatMode === 'off' ? 'Takror' : st.repeatMode === 'one' ? '1x Sura' : 'Barchasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleGlobalQuranShuffle}
                    className={`px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer ${
                      st.shuffle
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                        : 'bg-white/8 text-stone-300 hover:bg-white/15'
                    }`}
                    title="Aralash ijro"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleSleep}
                    className={`px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer ${
                      st.sleepTimerMinutes
                        ? 'bg-[#C8A85E]/25 text-[#E6CE8A] border border-[#C8A85E]/35'
                        : 'bg-white/8 text-stone-300 hover:bg-white/15'
                    }`}
                    title="Uyqu taymeri"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{st.sleepTimerMinutes ? `${st.sleepTimerMinutes}d` : 'Taymer'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
