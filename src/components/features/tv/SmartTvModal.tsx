import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PrayerSchedule, Ayah, HadithItem, SupportedLocale } from '../../../types';
import {
  CanonicalDisplayProfileId,
  buildDisplayScheduleFromMainSchedule,
  computeSmartDisplayTimeline,
} from '../../../utils/smartMosqueDisplayEngine';
import {
  DISPLAY_SUPPORTED_LOCALES,
  getDisplayLocaleBundle,
  sanitizeDisplayDynamicText,
} from '../../../utils/smartMosqueDisplayI18n';
import {
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  subscribeToAdhanPlayerState,
  ADHAN_TRACKS,
  AdhanPlayerState,
} from '../../../utils/notificationService';
import {
  Monitor,
  X,
  Volume2,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Tv,
} from 'lucide-react';

interface SmartTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
  onOpenSmartDisplay?: (profile?: CanonicalDisplayProfileId) => void;
}

const PROFILE_SWATCHES: {
  id: CanonicalDisplayProfileId;
  aspect: string;
  swatchClass: string;
  accentClass: string;
}[] = [
  {
    id: 'royal_ivory',
    aspect: '16:9 TV',
    swatchClass: 'bg-[#F5F2EA] text-[#0B231A] border-[#B08533]/40',
    accentClass: 'bg-[#0D5A35] text-[#F3D788]',
  },
  {
    id: 'emerald_royal',
    aspect: '16:9 TV',
    swatchClass: 'bg-[#041A12] text-[#FAF7F0] border-[#DFBD69]/45',
    accentClass: 'bg-[#0E5E38] text-[#FFE498]',
  },
  {
    id: 'modern_minimal',
    aspect: '16:9 TV',
    swatchClass: 'bg-[#FAFAF8] text-[#0A1D16] border-[#0A1D16]/20',
    accentClass: 'bg-[#0B4C2E] text-[#F3D88E]',
  },
  {
    id: 'madina_portrait',
    aspect: '9:16',
    swatchClass: 'bg-[#F5F3EC] text-[#0D241C] border-[#B38A3B]/45',
    accentClass: 'bg-[#0E5A35] text-[#F3D788]',
  },
];

const PHASE2_SWATCHES: {
  id: CanonicalDisplayProfileId;
  aspect: string;
  swatchClass: string;
  accentClass: string;
}[] = [
  {
    id: 'sultan_royal',
    aspect: 'TV / 4K',
    swatchClass: 'bg-[#042117] text-[#FDFBF4] border-[#E5C36A]/45',
    accentClass: 'bg-[#0F633A] text-[#FFE69D]',
  },
  {
    id: 'noor_classic',
    aspect: 'TV / 4K',
    swatchClass: 'bg-[#FCFBF8] text-[#13221C] border-[#B88E3D]/45',
    accentClass: 'bg-[#125635] text-[#F5DC93]',
  },
  {
    id: 'midnight_premium',
    aspect: 'Night TV',
    swatchClass: 'bg-[#091529] text-[#F8FAFC] border-[#CBD5E1]/30',
    accentClass: 'bg-[#0F4C45] text-[#F0D898]',
  },
  {
    id: 'vision_modern',
    aspect: 'TV / Web',
    swatchClass: 'bg-[#FFFFFF] text-[#0F172A] border-[#0F5C3B]/30',
    accentClass: 'bg-[#0F5C3B] text-[#D1FAE5]',
  },
  {
    id: 'islamic_heritage',
    aspect: 'Heritage',
    swatchClass: 'bg-[#F7F3E9] text-[#10261D] border-[#C2953B]/55',
    accentClass: 'bg-[#0B4E2F] text-[#F5DB8F]',
  },
  {
    id: 'masjid_al_nabawi',
    aspect: '9:16 & 16:9',
    swatchClass: 'bg-[#ECEFF1] text-[#1D242B] border-[#1E6B38]/45',
    accentClass: 'bg-[#1E6B38] text-white',
  },
];

/**
 * Unified 5-Language TV Display Launcher & Adhan Audio Console.
 * Strictly supports uz-Latn, uz-Cyrl, uz-Latn-new, ru, en with zero Arabic script.
 */
export const SmartTvModal: React.FC<SmartTvModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onOpenSmartDisplay,
}) => {
  const { i18n } = useTranslation();
  const activeLocale: SupportedLocale = DISPLAY_SUPPORTED_LOCALES.includes(
    i18n.language as SupportedLocale
  )
    ? (i18n.language as SupportedLocale)
    : 'uz-Latn';
  const t = useMemo(() => getDisplayLocaleBundle(activeLocale), [activeLocale]);

  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
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

  const displaySchedule = useMemo(
    () => buildDisplayScheduleFromMainSchedule(schedule),
    [schedule]
  );

  const timeline = useMemo(
    () => computeSmartDisplayTimeline(displaySchedule, nowTick),
    [displaySchedule, nowTick]
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return subscribeToAdhanPlayerState(setPlayerState);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTrack = ADHAN_TRACKS[selectedTrackIndex] || ADHAN_TRACKS[0];
  const isCurrentTrackPlaying =
    playerState.isPlaying && playerState.playingTrackId === currentTrack.id;

  const nextPrayerName = timeline.nextAzanKey ? t.prayerNames[timeline.nextAzanKey] : '--';
  const safeMosqueName = sanitizeDisplayDynamicText(
    displaySchedule.mosqueName,
    activeLocale,
    t.mosqueSubtitleDefault
  );

  const handleLaunchProfile = (profileId: CanonicalDisplayProfileId) => {
    stopActiveAdhanAudio();
    if (onOpenSmartDisplay) {
      onOpenSmartDisplay(profileId);
    } else {
      window.location.href = `/display?template=${profileId}&lang=${encodeURIComponent(activeLocale)}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#041A12] border border-[#DFBD69]/40 text-[#FAF7F0] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DFBD69]/18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#DFBD69]/12 border border-[#DFBD69]/40 flex items-center justify-center shrink-0">
              <Tv className="w-5 h-5 text-[#DFBD69]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-lg text-[#FAF7F0] truncate">
                {t.brandTitle} — Smart Mosque Display
              </h2>
              <p className="text-xs text-[#FAF7F0]/70 truncate">
                {safeMosqueName} · {t.admin.headerBadge}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.admin.cancelBtn}
            className="p-2 rounded-xl text-[#FAF7F0]/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Schedule Snapshot Strip */}
          <div className="rounded-xl bg-[#06261B] border border-[#DFBD69]/22 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#DFBD69]">
                {t.tashkentTimeLabel}
              </div>
              <div className="font-mono-numbers tabular-nums font-extrabold text-3xl text-white mt-0.5">
                {timeline.clock.hh}:{timeline.clock.mm}
                <span className="text-lg text-[#DFBD69] ml-0.5">:{timeline.clock.ss}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#FAF7F0]/65">
                {t.nextAzanLabel} ({nextPrayerName} · {timeline.nextAzanTime})
              </div>
              <div className="font-mono-numbers tabular-nums font-extrabold text-2xl text-[#FFE498] mt-0.5">
                {timeline.nextAzanCountdown}
              </div>
            </div>
          </div>

          {/* 4 Official Display Profiles */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#DFBD69] mb-3">
              {t.admin.designProfileLabel}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROFILE_SWATCHES.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleLaunchProfile(card.id)}
                  className={`group text-left rounded-xl border p-4 transition-all hover:scale-[1.01] cursor-pointer ${card.swatchClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-extrabold text-base">
                      {t.templates[card.id]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${card.accentClass}`}
                    >
                      {card.id === 'madina_portrait' ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <Monitor className="w-3 h-3" />
                      )}
                      {card.aspect}
                    </span>
                  </div>
                  <p className="text-xs opacity-75 mt-1.5">
                    {t.admin.profileDescriptions[card.id]}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold opacity-85 group-hover:opacity-100">
                    <span>{t.fullscreenEnter}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 6 New Phase 2 Premium Designs + Dedicated /masjid-tv Tablo */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#DFBD69]">
                {t.admin.newPremiumDesignsHeading}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopActiveAdhanAudio();
                  window.location.href = '/masjid-tv';
                }}
                className="px-2.5 py-1 rounded-lg bg-[#1E6B38] text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:brightness-110 cursor-pointer"
              >
                <span>{t.admin.openMasjidTvBtn}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PHASE2_SWATCHES.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleLaunchProfile(card.id)}
                  className={`group text-left rounded-xl border p-3.5 transition-all hover:scale-[1.01] cursor-pointer ${card.swatchClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-extrabold text-sm truncate">
                      {t.templates[card.id]}
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${card.accentClass}`}
                    >
                      {card.aspect}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 mt-1 line-clamp-2">
                    {t.admin.profileDescriptions[card.id]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Integrated Adhan Audio Player */}
          <div className="rounded-xl bg-[#03130D] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-4 h-4 text-[#DFBD69] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#FAF7F0] truncate">
                    {t.azanColumnLabel} ·{' '}
                    {sanitizeDisplayDynamicText(currentTrack.titleUz, activeLocale, t.azanColumnLabel)}
                  </div>
                  <div className="text-[11px] text-[#FAF7F0]/60 truncate">
                    {sanitizeDisplayDynamicText(currentTrack.muazzin, activeLocale)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTrackIndex(
                      (prev) => (prev - 1 + ADHAN_TRACKS.length) % ADHAN_TRACKS.length
                    )
                  }
                  aria-label="Previous"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleAdhanAudio(currentTrack.id)}
                  className="px-3.5 py-2 rounded-lg bg-[#DFBD69] text-[#041A12] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isCurrentTrackPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
                {playerState.isPlaying && (
                  <button
                    type="button"
                    onClick={() => stopActiveAdhanAudio()}
                    aria-label="Stop"
                    className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTrackIndex((prev) => (prev + 1) % ADHAN_TRACKS.length)
                  }
                  aria-label="Next"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {playerState.progressPercent > 0 && (
              <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#DFBD69] transition-all duration-300"
                  style={{ width: `${Math.min(100, playerState.progressPercent)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
