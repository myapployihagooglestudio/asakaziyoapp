import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeToAdhanPlayerState,
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  seekAdhanAudio,
  setAdhanAudioVolume,
  playAdhanTrackById,
  ADHAN_TRACKS,
  AdhanPlayerState,
} from '../../utils/notificationService';
import { drawerSlideVariants } from '../../utils/motionSystem';
import { AudioWaveformBars, PREMIUM_EASE } from './MotionPrimitives';
import {
  updateNativeMediaSession,
  updateNativeMediaPositionState,
} from '../../utils/nativeMobileBridge';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
  Music,
} from 'lucide-react';

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PersistentAudioPlayer: React.FC = () => {
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAdhanPlayerState((state) => {
      setPlayerState(state);
    });
    return unsub;
  }, []);

  const currentIdx = ADHAN_TRACKS.findIndex((t) => t.id === playerState.playingTrackId);
  const handleSkip = (dir: -1 | 1) => {
    const nextIdx =
      currentIdx >= 0
        ? (currentIdx + dir + ADHAN_TRACKS.length) % ADHAN_TRACKS.length
        : 0;
    const nextTrack = ADHAN_TRACKS[nextIdx];
    if (nextTrack) {
      playAdhanTrackById(nextTrack.id, playerState.volume);
    }
  };

  useEffect(() => {
    if (!playerState.playingTrackId || !playerState.track) return;
    updateNativeMediaSession(
      {
        title: playerState.track.titleUz || 'Azon Audio',
        artist: playerState.track.muezzinUz || 'ASAKA ZIYO',
        album: 'ASAKA ZIYO — Azon va Tilovatlar',
        artworkUrl: '/pwa-512x512.png',
      },
      {
        onPlay: () =>
          playerState.playingTrackId &&
          toggleAdhanAudio(playerState.playingTrackId, playerState.volume),
        onPause: () =>
          playerState.playingTrackId &&
          toggleAdhanAudio(playerState.playingTrackId, playerState.volume),
        onStop: () => stopActiveAdhanAudio(),
        onPreviousTrack: () => handleSkip(-1),
        onNextTrack: () => handleSkip(1),
        onSeekTo: (sec) => seekAdhanAudio(sec),
      },
      playerState.isPlaying ? 'playing' : 'paused'
    );
    updateNativeMediaPositionState(playerState.duration, playerState.currentTime, 1.0);
  }, [
    playerState.playingTrackId,
    playerState.track,
    playerState.isPlaying,
    playerState.duration,
    playerState.currentTime,
  ]);

  if (!playerState.playingTrackId && !playerState.error) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        variants={drawerSlideVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-[86px] lg:bottom-5 right-3 left-3 sm:left-auto sm:w-[430px] z-40 rounded-[26px] bg-[#0B1411]/94 backdrop-blur-2xl border border-white/[0.12] text-[#F7F5F0] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.78)] overflow-hidden"
        role="region"
        aria-label="Global Azon va Audio Pleyer"
      >
        {/* Top Progress Strip */}
        <div className="h-[3px] w-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-[#C8A85E] transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(0, playerState.progressPercent || 0))}%` }}
          />
        </div>

        <div className="p-3.5 space-y-3">
          {/* Compact Mini-Player Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() =>
                  playerState.playingTrackId &&
                  toggleAdhanAudio(playerState.playingTrackId, playerState.volume)
                }
                className="w-10 h-10 rounded-2xl bg-[#C8A85E] text-[#07110D] flex items-center justify-center shrink-0 shadow-xs hover:bg-[#D6B974] transition-colors cursor-pointer"
                aria-label={playerState.isPlaying ? 'Toʻxtatib turish' : 'Davom ettirish'}
              >
                {playerState.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : playerState.isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AudioWaveformBars
                    isPlaying={playerState.isPlaying}
                    className="h-3.5 shrink-0"
                    barClassName="bg-[#c5a869]"
                  />
                  <span className="text-xs font-bold text-white truncate">
                    {playerState.track?.titleUz || 'Azon Audio'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-300 truncate">
                  <span className="truncate">{playerState.track?.muezzinUz}</span>
                  <span>·</span>
                  <span className="font-mono-numbers text-[#c5a869]">
                    {formatSeconds(playerState.currentTime)} / {formatSeconds(playerState.duration)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={expanded ? 'Kichraytirish' : 'Kengaytirish'}
                aria-label={expanded ? 'Pleyerni yigʻish' : 'Pleyerni kengaytirish'}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => stopActiveAdhanAudio()}
                className="p-2 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="Yopish va toʻxtatish"
                aria-label="Audio ijrosini toʻxtatish"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          {playerState.error && (
            <div className="p-2 rounded-lg bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{playerState.error}</span>
            </div>
          )}

          {/* Expanded Spatial Player Drawer */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="expanded-audio-drawer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: PREMIUM_EASE }}
                className="overflow-hidden pt-2 border-t border-white/10 space-y-3"
              >
              <div className="text-right font-arabic text-sm text-[#e6ce8a]" dir="rtl">
                {playerState.track?.titleAr}
              </div>

              {/* Interactive Seek Scrubber */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.round(playerState.duration || 180))}
                  value={Math.round(playerState.currentTime || 0)}
                  onChange={(e) => seekAdhanAudio(Number(e.target.value))}
                  className="w-full accent-[#c5a869] cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  aria-label="Audio vaqtini surish"
                />
                <div className="flex justify-between text-[10px] font-mono-numbers text-stone-400">
                  <span>{formatSeconds(playerState.currentTime)}</span>
                  <span>{formatSeconds(playerState.duration)}</span>
                </div>
              </div>

              {/* Queue Transport & Volume Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSkip(-1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-stone-200 cursor-pointer"
                    title="Oldingi azon yozuvi"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      playerState.playingTrackId &&
                      toggleAdhanAudio(playerState.playingTrackId, playerState.volume)
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#c5a869]/20 hover:bg-[#c5a869]/30 text-[#c5a869] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>{playerState.isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkip(1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-stone-200 cursor-pointer"
                    title="Keyingi azon yozuvi"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {playerState.volume <= 0.05 ? (
                    <VolumeX className="w-4 h-4 text-stone-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#c5a869]" />
                  )}
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={playerState.volume}
                    onChange={(e) => setAdhanAudioVolume(parseFloat(e.target.value))}
                    className="w-24 accent-[#c5a869] cursor-pointer"
                    aria-label="Ovoz balandligi"
                  />
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
