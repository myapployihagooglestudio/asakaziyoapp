import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, PrayerSchedule, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getStoredAdhanTracks,
  AdhanTrack,
} from '../../../data/adhanTracksData';
import {
  playAdhanTrackById,
  toggleAdhanAudio,
  seekAdhanAudio,
  setAdhanAudioVolume,
  subscribeToAdhanPlayerState,
  subscribeToPrayerAlertSettings,
  downloadAdhanTrackFile,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  stopActiveAdhanAudio,
  AdhanPlayerState,
} from '../../../utils/notificationService';
import {
  Bell,
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
  Check,
  Music,
  Loader2,
  AlertCircle,
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
  settings,
  onUpdateSettings,
  onBack,
}) => {
  const { t, i18n } = useTranslation();
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
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const getPrayerIcon = (key: string) => {
    switch (key) {
      case 'tahajjud':
      case 'xufton':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'subh':
      case 'bomdod':
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'quyosh':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'peshin':
      case 'asr':
        return <Sun className="w-5 h-5 text-[#c5a869]" />;
      case 'shom':
        return <Sunset className="w-5 h-5 text-orange-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#c5a869]" />;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Music className="w-4 h-4 text-[#c5a869]" />
            <span>Shayx Mishariy Al-Afosiy Azon Audio Va Eslatma Markazi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Azon Audio va Eslatmalar Dashboardi
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Shayx Mishariy Rashid Al-Afosiyning barcha azon vaqti audio variantlari, Bomdod uchun maxsus azon («As-salatu khayrun minan-nawm»), oflayn yuklab olish va har bir namoz uchun alohida sozlamalar.
          </p>
        </div>
      </div>

      {savedStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Azon va bildirishnoma sozlamalari muvaffaqiyatli saqlandi va fonda faollashtirildi!</span>
        </div>
      )}

      {/* 1. ADHAN AUDIO LIBRARY & PLAYERS */}
      <Card elevated className="p-6 space-y-6 border-[#c5a869]/30 bg-stone-900/60 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#c5a869]" />
              <span>Mavjud Azon Audio Kutubxonasi (Shayx Mishariy Rashid Al-Afosiy)</span>
            </h3>
            <p className="text-xs text-stone-400">
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
              className="text-xs gap-1.5 border-[#c5a869]/50 text-[#c5a869]"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Azon Sinovi</span>
            </Button>
            {playerState.playingTrackId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => stopActiveAdhanAudio()}
                className="text-xs gap-1.5 border-rose-500/50 text-rose-300"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Toʻxtatish</span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Progress Scrubber */}
        {(playerState.playingTrackId || playerState.error) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#04241d] to-[#061814] border border-[#c5a869]/50 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#e6ce8a]">
                {playerState.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#c5a869]" />
                ) : (
                  <Music className="w-4 h-4 text-[#c5a869]" />
                )}
                <span>{playerState.track?.titleUz || 'Azon tinglanmoqda'}</span>
              </div>
              <span className="font-mono-numbers text-stone-300">
                {formatAudioSeconds(playerState.currentTime)} / {formatAudioSeconds(playerState.duration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.round(playerState.duration || 180))}
              value={Math.round(playerState.currentTime || 0)}
              onChange={(e) => seekAdhanAudio(Number(e.target.value))}
              className="w-full accent-[#c5a869] cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
            {playerState.error && (
              <div className="text-xs text-rose-300 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
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
                className="p-4 rounded-2xl border border-white/10 bg-black/40 flex flex-col justify-between gap-4 hover:border-[#c5a869]/50 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-white">{track.title}</span>
                    <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#c5a869]/20 text-[#c5a869]">
                      {track.duration}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">{track.muazzin}</p>
                  <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                    <span className="text-[#c5a869]">Manba:</span>
                    <span className="italic">{track.source}</span>
                  </div>
                  {track.descriptionUz && (
                    <p className="text-[11px] text-stone-400 leading-relaxed pt-1">
                      {track.descriptionUz}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <Button
                    variant={isPlaying ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePreviewPlay(track)}
                    className="text-xs gap-1.5 py-1 px-3"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{isPlaying ? 'Pause' : 'Tinglash'}</span>
                  </Button>

                  {track.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAdhanTrackFile(track)}
                      className="text-xs gap-1.5 py-1 px-3 border-white/20 text-stone-300 hover:text-white"
                      title="Qurilmaga oflayn yuklab olish"
                    >
                      <Download className="w-3.5 h-3.5 text-[#c5a869]" />
                      <span>Oflayn yuklab olish</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. VOLUME & HARDWARE CONTROLS */}
      <Card elevated className="p-6 space-y-6 border-[#c5a869]/30 bg-stone-900/60 backdrop-blur-md">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#c5a869]" />
          <span>Azon Ovoz Balandligi va Uskuna Sozlamalari</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#c5a869]" />
                <span>Azon ovoz balandligi: {Math.round((alertSettings.volume ?? 0.85) * 100)}%</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-stone-500 shrink-0" />
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
                className="w-full accent-[#c5a869] cursor-pointer"
              />
              <Volume2 className="w-4 h-4 text-[#c5a869] shrink-0" />
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">Tebranish (Vibratsiya):</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSettings.vibrationEnabled ?? true}
                  onChange={(e) =>
                    setAlertSettings({ ...alertSettings, vibrationEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c5a869]"></div>
              </label>
            </div>
            <p className="text-[11px] text-stone-400">
              Namoz vaqti kirganda mobil qurilmada maxsus tebranish signali beriladi.
            </p>
          </div>
        </div>

        {/* Global Track Selections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-300 block">
              Barcha namozlar uchun standart Azon:
            </label>
            <select
              value={alertSettings.defaultAdhanTrackId}
              onChange={(e) => {
                const updated = { ...alertSettings, defaultAdhanTrackId: e.target.value };
                setAlertSettings(updated);
                playAdhanTrackById(e.target.value);
              }}
              className="w-full p-3 text-xs rounded-xl border border-white/10 bg-black/40 text-white focus:border-[#c5a869]"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-300 block">
              Bomdod va Subh azoni uchun maxsus («As-salatu khayrun...»):
            </label>
            <select
              value={alertSettings.bomdodAdhanTrackId}
              onChange={(e) => {
                const updated = { ...alertSettings, bomdodAdhanTrackId: e.target.value };
                setAlertSettings(updated);
                playAdhanTrackById(e.target.value);
              }}
              className="w-full p-3 text-xs rounded-xl border border-white/10 bg-black/40 text-white focus:border-[#c5a869]"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PWA / Browser Background Limitations Reality Banner */}
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs space-y-2">
          <div className="font-bold flex items-center gap-2 text-amber-300">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Mobil Brauzer va PWA Fon Cheklovlari (Haqiqiy holat)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-300">
            Zamonaviy mobil operatsion tizimlar (iOS Safari va Android Chrome) batareyani tejash uchun fon rejimida turgan veb-ilovalarning audio ijrosini toʻxtatishi mumkin. Eng ishonchli azon eslatmasi uchun ilovani bosh ekranga oʻrnatib (PWA), bildirishnomalarga toʻliq ruxsat bering hamda ilova ochiq yoki fon rejimida minimallashtirilgan boʻlishini taʼminlang.
          </p>
        </div>
      </Card>

      {/* 3. PER-PRAYER AZON ASSIGNMENT */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white px-1">
          Har bir namoz uchun alohida Azon tanlovi
        </h3>

        {schedule.times.map((item) => {
          const currentTrackId =
            (alertSettings.perPrayerTracks && alertSettings.perPrayerTracks[item.key]) ||
            (item.key === 'bomdod' || item.key === 'subh'
              ? alertSettings.bomdodAdhanTrackId
              : alertSettings.defaultAdhanTrackId);

          return (
            <Card
              key={item.key}
              elevated
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[#c5a869]/30 bg-stone-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c5a869]/20 flex items-center justify-center shrink-0">
                  {getPrayerIcon(item.key)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{item.nameUz}</h4>
                  <p className="text-xs font-mono-numbers text-stone-400">Azon: {item.time}</p>
                </div>
              </div>

              <div className="w-full sm:w-72">
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
                  className="w-full p-2.5 text-xs rounded-xl border border-white/10 bg-black/40 text-white focus:border-[#c5a869]"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          Ortga qaytish
        </Button>
        <Button variant="primary" size="sm" onClick={handleSaveAlertSettings} className="gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Azon Sozlamalarini Saqlash</span>
        </Button>
      </div>
    </div>
  );
};
