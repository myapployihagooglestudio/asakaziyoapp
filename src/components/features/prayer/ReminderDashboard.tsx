import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, PrayerSchedule, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { AudioWaveformBars } from '../../ui/MotionPrimitives';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getStoredAdhanTracks,
  AdhanTrack,
} from '../../../data/adhanTracksData';
import {
  playAdhanTrackById,
  toggleAdhanAudio,
  seekAdhanAudio,
  subscribeToAdhanPlayerState,
  subscribeToPrayerAlertSettings,
  downloadAdhanTrackFile,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  stopActiveAdhanAudio,
  syncPrayerScheduleAlarms,
  triggerTelegramHeadsUpNotification,
  AdhanPlayerState,
  PrayerPreReminderOffset,
  PrayerExactMode,
} from '../../../utils/notificationService';
import {
  Clock,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Download,
  Play,
  Pause,
  Square,
  Music,
  Loader2,
  AlertCircle,
  Send,
} from 'lucide-react';

interface ReminderDashboardProps {
  schedule: PrayerSchedule;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onBack: () => void;
}

function formatAudioSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ReminderDashboard: React.FC<ReminderDashboardProps> = ({
  schedule,
  onBack,
}) => {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [tracks] = useState<AdhanTrack[]>(() => getStoredAdhanTracks());
  const [alertSettings, setAlertSettings] = useState(() => getPrayerAlertSettings());
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
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const unsubPlayer = subscribeToAdhanPlayerState((state) => {
      setPlayerState(state);
    });
    const unsubSettings = subscribeToPrayerAlertSettings((updated) => {
      setAlertSettings(updated);
    });
    return () => {
      unsubPlayer();
      unsubSettings();
    };
  }, []);

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const handlePreviewPlay = (track: AdhanTrack) => {
    toggleAdhanAudio(track.id, alertSettings.volume);
  };

  const handleSaveAlertSettings = () => {
    savePrayerAlertSettings(alertSettings);
    syncPrayerScheduleAlarms(schedule, true);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const getPrayerIcon = (key: string) => {
    switch (key) {
      case 'tahajjud':
      case 'xufton':
        return <Moon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case 'subh':
      case 'bomdod':
        return <Sunrise className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      case 'quyosh':
        return <Sun className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
      case 'peshin':
      case 'asr':
        return <Sun className="w-5 h-5 text-[#C8A85E]" />;
      case 'shom':
        return <Sunset className="w-5 h-5 text-orange-500 dark:text-orange-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#C8A85E]" />;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      <PageHero
        variant="studio"
        kicker="Shayx Mishariy Al-Afosiy · Azon Audio va Eslatma Markazi"
        title="Azon Audio va 7 Mahal Namoz Eslatmalari"
        subtitle="Har bir namoz uchun oldindan ogohlantirish (5 / 10 / 15 / 30 daqiqa oldin), namoz vaqti kirganda Toʻliq Azon, Ohang yoki Vibratsiya hamda Telegram uslubidagi Heads-Up bildirishnomalar."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              triggerTelegramHeadsUpNotification({
                title: '🕋 Bomdod namoziga 15 daqiqa qoldi',
                body: 'Bomdod namozi vaqti: 05:55. Tahorat olib, namozga tayyorgarlik koʻring.',
                category: 'prayer_pre_reminder',
                targetView: 'prayer',
                playChime: true,
              })
            }
          >
            <Send className="w-4 h-4 mr-1.5" />
            <span>Telegram Heads-Up sinovi</span>
          </Button>
        }
      />

      {savedStatus && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-[#064E3B] dark:text-[#34D399] text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Azon va bildirishnoma sozlamalari muvaffaqiyatli saqlandi hamda jadval qayta sinxronlandi!</span>
        </div>
      )}

      {/* 1. ADHAN AUDIO LIBRARY & PLAYERS */}
      <Card elevated className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C8A85E]" />
              <span>Azon Audio Kutubxonasi (Shayx Mishariy Al-Afosiy)</span>
            </h3>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7] mt-0.5">
              Muazzin, davomiyligi, qonuniy manbasi va oflayn yuklab olish imkoniyati bilan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toggleAdhanAudio(
                  alertSettings.defaultAdhanTrackId || alertSettings.selectedAdhanTrackId,
                  alertSettings.volume
                )
              }
            >
              <Volume2 className="w-4 h-4 mr-1.5" />
              <span>Azon sinovi</span>
            </Button>
            {playerState.playingTrackId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => stopActiveAdhanAudio()}
                className="border-rose-500/40 text-rose-600 dark:text-rose-400"
              >
                <Square className="w-3.5 h-3.5 fill-current mr-1.5" />
                <span>Toʻxtatish</span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Progress Scrubber */}
        {(playerState.playingTrackId || playerState.error) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#052920] text-[#F7F4EC] border border-[#C8A85E]/40 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#E5C983]">
                {playerState.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C8A85E]" />
                ) : (
                  <AudioWaveformBars isPlaying={playerState.isPlaying} barCount={4} />
                )}
                <span>{playerState.track?.titleUz || 'Azon tinglanmoqda'}</span>
              </div>
              <span className="font-mono-numbers text-[#C2D4CD]">
                {formatAudioSeconds(playerState.currentTime)} / {formatAudioSeconds(playerState.duration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.round(playerState.duration || 180))}
              value={Math.round(playerState.currentTime || 0)}
              onChange={(e) => seekAdhanAudio(Number(e.target.value))}
              className="w-full accent-[#C8A85E] cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
            {playerState.error && (
              <div className="text-xs text-rose-200 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                <span>{playerState.error}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track) => {
            const isPlaying =
              playerState.playingTrackId === track.id &&
              (playerState.isPlaying || playerState.isLoading);

            return (
              <div
                key={track.id}
                className="p-5 rounded-2xl bg-[#F4EFE3]/65 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between gap-4 hover:border-[#C8A85E]/45 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">
                      {track.title}
                    </span>
                    <span className="text-xs font-mono-numbers font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      {track.duration}
                    </span>
                  </div>
                  <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">{track.muazzin}</p>
                  <div className="text-xs text-[#587068] dark:text-[#9CAFA7] flex items-center gap-1.5">
                    <span className="text-[#8B6B2E] dark:text-[#C8A85E] font-medium">Manba:</span>
                    <span className="italic">{track.source}</span>
                  </div>
                  {track.descriptionUz && (
                    <p className="text-xs text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed pt-1">
                      {track.descriptionUz}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.07]">
                  <Button
                    variant={isPlaying ? 'emerald' : 'outline'}
                    size="sm"
                    onClick={() => handlePreviewPlay(track)}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current mr-1.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
                    )}
                    <span>{isPlaying ? 'Pauza' : 'Tinglash'}</span>
                  </Button>

                  {track.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAdhanTrackFile(track)}
                      title="Qurilmaga oflayn yuklab olish"
                    >
                      <Download className="w-3.5 h-3.5 text-[#C8A85E] mr-1.5" />
                      <span>Yuklab olish</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. VOLUME & HARDWARE CONTROLS */}
      <Card elevated className="p-6 sm:p-7 space-y-6">
        <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] border-b border-black/[0.06] dark:border-white/[0.08] pb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#C8A85E]" />
          <span>Azon ovoz balandligi va uskuna sozlamalari</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-2xl bg-[#F4EFE3]/65 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08]">
            <label className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2 font-mono-numbers">
              <Volume2 className="w-4 h-4 text-[#C8A85E]" />
              <span>Azon ovoz balandligi: {Math.round((alertSettings.volume ?? 0.85) * 100)}%</span>
            </label>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-[#587068] shrink-0" />
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={alertSettings.volume ?? 0.85}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setAlertSettings({ ...alertSettings, volume: vol });
                }}
                className="w-full accent-[#064E3B] dark:accent-[#10B981] cursor-pointer"
              />
              <Volume2 className="w-4 h-4 text-[#C8A85E] shrink-0" />
            </div>
          </div>

          <div className="space-y-2.5 p-4 rounded-2xl bg-[#F4EFE3]/65 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC]">
                Tebranish (Vibratsiya)
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSettings.vibrationEnabled ?? true}
                  onChange={(e) =>
                    setAlertSettings({ ...alertSettings, vibrationEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-black/15 dark:bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#064E3B] dark:peer-checked:bg-[#10B981]" />
              </label>
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
              Namoz vaqti kirganda mobil qurilmada maxsus tebranish signali beriladi.
            </p>
          </div>
        </div>

        {/* Global Track Selections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1] block">
              Barcha namozlar uchun standart Azon
            </label>
            <select
              value={alertSettings.defaultAdhanTrackId}
              onChange={(e) => {
                const updated = { ...alertSettings, defaultAdhanTrackId: e.target.value };
                setAlertSettings(updated);
                playAdhanTrackById(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
            >
              {tracks.map((tr) => (
                <option key={tr.id} value={tr.id} className="text-black">
                  {tr.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1] block">
              Bomdod va Subh azoni uchun maxsus («As-salatu khayrun...»)
            </label>
            <select
              value={alertSettings.bomdodAdhanTrackId}
              onChange={(e) => {
                const updated = { ...alertSettings, bomdodAdhanTrackId: e.target.value };
                setAlertSettings(updated);
                playAdhanTrackById(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
            >
              {tracks.map((tr) => (
                <option key={tr.id} value={tr.id} className="text-black">
                  {tr.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 3. PER-PRAYER AZON, PRE-REMINDER OFFSET & EXACT-TIME MODE */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] px-1">
          {getLocalizedText('Har bir namoz uchun oldindan eslatma (5/10/15/30 daqiqa) va Azon tanlovi')}
        </h3>

        {schedule.times
          .filter((item) => item.key !== 'quyosh')
          .map((item) => {
            const currentTrackId =
              (alertSettings.perPrayerTracks && alertSettings.perPrayerTracks[item.key]) ||
              (item.key === 'bomdod' || item.key === 'subh'
                ? alertSettings.bomdodAdhanTrackId
                : alertSettings.defaultAdhanTrackId);
            const currentPreOffset: PrayerPreReminderOffset =
              alertSettings.preReminderMinutes?.[item.key] ?? 15;
            const currentExactMode: PrayerExactMode =
              alertSettings.perPrayerMode?.[item.key] ?? 'sound';

            return (
              <Card key={item.key} elevated className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#C8A85E]/15 flex items-center justify-center shrink-0">
                      {getPrayerIcon(item.key)}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base text-[#091813] dark:text-[#F7F4EC]">
                        {item.nameUz}
                      </h4>
                      <p className="text-xs font-mono-numbers text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                        Namoz vaqti: {item.time}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
                    <select
                      value={currentPreOffset}
                      onChange={(e) => {
                        const val = Number(e.target.value) as PrayerPreReminderOffset;
                        setAlertSettings({
                          ...alertSettings,
                          preReminderMinutes: {
                            ...(alertSettings.preReminderMinutes || {}),
                            [item.key]: val,
                          },
                        });
                      }}
                      className="px-3 py-2.5 min-h-[42px] text-xs rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
                    >
                      <option value={0} className="text-black">Oldindan: Oʻchirilgan</option>
                      <option value={5} className="text-black">Oldindan: 5 daqiqa</option>
                      <option value={10} className="text-black">Oldindan: 10 daqiqa</option>
                      <option value={15} className="text-black">Oldindan: 15 daqiqa</option>
                      <option value={30} className="text-black">Oldindan: 30 daqiqa</option>
                    </select>

                    <select
                      value={currentExactMode}
                      onChange={(e) => {
                        const mode = e.target.value as PrayerExactMode;
                        setAlertSettings({
                          ...alertSettings,
                          perPrayerMode: {
                            ...(alertSettings.perPrayerMode || {}),
                            [item.key]: mode,
                          },
                        });
                      }}
                      className="px-3 py-2.5 min-h-[42px] text-xs rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
                    >
                      <option value="sound" className="text-black">Vaqtida: Toʻliq Azon</option>
                      <option value="chime" className="text-black">Vaqtida: Qisqa ohang</option>
                      <option value="silent" className="text-black">Vaqtida: Vibratsiya</option>
                      <option value="off" className="text-black">Vaqtida: Oʻchirilgan</option>
                    </select>

                    <select
                      value={currentTrackId}
                      onChange={(e) => {
                        const updatedPerPrayer = {
                          ...(alertSettings.perPrayerTracks || {}),
                          [item.key]: e.target.value,
                        };
                        const updated = { ...alertSettings, perPrayerTracks: updatedPerPrayer };
                        setAlertSettings(updated);
                        playAdhanTrackById(e.target.value);
                      }}
                      className="px-3 py-2.5 min-h-[42px] text-xs rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
                    >
                      {tracks.map((tr) => (
                        <option key={tr.id} value={tr.id} className="text-black">
                          {tr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          Ortga qaytish
        </Button>
        <Button variant="emerald" size="sm" onClick={handleSaveAlertSettings}>
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          <span>Azon va eslatma sozlamalarini saqlash</span>
        </Button>
      </div>
    </div>
  );
};
