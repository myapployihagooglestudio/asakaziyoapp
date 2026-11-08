/**
 * ASAKA ZIYO — Unified Notification, Real Adhan Audio Player & Reminder Service
 * Supports Mishary Rashid Alafasy & Haramain Adhan audio playback,
 * real-time audio progress/scrubbing/volume state, per-prayer Adhan track selection,
 * Web Audio gentle chime option, browser notifications, and Firestore + localStorage sync.
 */

import { ADHAN_TRACKS, getAdhanTrackById, getDefaultTrackForPrayer, AdhanTrack } from '../data/adhanTracksData';
import { auth, syncDocToFirestore } from './firebaseClient';

export type NotificationCategory =
  | 'prayer'
  | 'ramadan'
  | 'daily_content'
  | 'announcement'
  | 'news'
  | 'article'
  | 'quiz'
  | 'hadith'
  | 'dhikr'
  | 'system'
  | 'media'
  | 'event';

export type SoundMode = 'adhan' | 'chime' | 'silent';
export type PrayerAzanMode = 'sound' | 'chime' | 'silent' | 'off';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  priority?: 'high' | 'normal' | 'urgent';
  actionTab?: string;
  routeTab?: string;
  routeId?: string;
}

export interface PrayerAlertSettings {
  enabled: boolean;
  minutesBefore: number;
  notifyOnExactTime: boolean;
  soundEnabled: boolean;
  soundMode: SoundMode;
  selectedAdhanTrackId: string;
  defaultAdhanTrackId: string;
  bomdodAdhanTrackId: string;
  vibrationEnabled: boolean;
  volume: number; // 0.1 to 1.0
  perPrayerTracks: Record<string, string> & {
    bomdod: string;
    peshin: string;
    asr: string;
    shom: string;
    xufton: string;
  };
  individualPrayerAlerts: {
    bomdod: boolean;
    peshin: boolean;
    asr: boolean;
    shom: boolean;
    xufton: boolean;
  };
  individualPrayerModes: {
    bomdod: PrayerAzanMode;
    peshin: PrayerAzanMode;
    asr: PrayerAzanMode;
    shom: PrayerAzanMode;
    xufton: PrayerAzanMode;
  };
  ramadanSuhoorAlert: boolean;
  ramadanIftarAlert: boolean;
  dailyVerseHadithAlert: boolean;
  fridayJummahAlert: boolean;
}

export interface AdhanPlayerState {
  playingTrackId: string | null;
  track: AdhanTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  volume: number;
  error: string | null;
}

const NOTIFICATIONS_STORAGE_KEY = 'asaka_ziyo_notifications_v2';
const ALERT_SETTINGS_STORAGE_KEY = 'asaka_ziyo_prayer_alert_settings_v3';
const LEGACY_AZAN_SETTINGS_KEY = 'asaka_ziyo_azan_settings_v2';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const DEFAULT_ALERT_SETTINGS: PrayerAlertSettings = {
  enabled: true,
  minutesBefore: 10,
  notifyOnExactTime: true,
  soundEnabled: true,
  soundMode: 'adhan',
  selectedAdhanTrackId: 'mishary-alafasy-standard',
  defaultAdhanTrackId: 'mishary-alafasy-standard',
  bomdodAdhanTrackId: 'mishary-alafasy-fajr',
  vibrationEnabled: true,
  volume: 0.85,
  perPrayerTracks: {
    tahajjud: 'mishary-alafasy-fajr-hijaz',
    subh: 'mishary-alafasy-fajr',
    bomdod: 'mishary-alafasy-fajr',
    quyosh: 'mishary-alafasy-standard',
    peshin: 'mishary-alafasy-standard',
    asr: 'mishary-alafasy-standard',
    shom: 'mishary-alafasy-hijaz',
    xufton: 'mishary-alafasy-standard',
  },
  individualPrayerAlerts: {
    bomdod: true,
    peshin: true,
    asr: true,
    shom: true,
    xufton: true,
  },
  individualPrayerModes: {
    bomdod: 'sound',
    peshin: 'sound',
    asr: 'sound',
    shom: 'sound',
    xufton: 'sound',
  },
  ramadanSuhoorAlert: true,
  ramadanIftarAlert: true,
  dailyVerseHadithAlert: true,
  fridayJummahAlert: true,
};

export const DEFAULT_PRAYER_ALERT_SETTINGS = DEFAULT_ALERT_SETTINGS;

// Active HTMLAudioElement instance and reactive state for Adhan playback
let activeAdhanAudio: HTMLAudioElement | null = null;
let activePlayerState: AdhanPlayerState = {
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
};

type AdhanPlayerListener = (state: AdhanPlayerState) => void;
const playerListeners = new Set<AdhanPlayerListener>();

function emitPlayerState(partial?: Partial<AdhanPlayerState>) {
  if (partial) {
    activePlayerState = { ...activePlayerState, ...partial };
  }
  const snapshot = { ...activePlayerState };
  playerListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  });
}

export function getAdhanPlayerState(): AdhanPlayerState {
  return { ...activePlayerState };
}

export function isAdhanAudioPlaying(): boolean {
  return Boolean(activePlayerState.isPlaying || activePlayerState.isLoading);
}

export function subscribeToAdhanPlayerState(listener: AdhanPlayerListener): () => void {
  playerListeners.add(listener);
  listener({ ...activePlayerState });
  return () => {
    playerListeners.delete(listener);
  };
}

// Settings change listeners for cross-component reactivity
type AlertSettingsListener = (settings: PrayerAlertSettings) => void;
const settingsListeners = new Set<AlertSettingsListener>();

export function subscribeToPrayerAlertSettings(listener: AlertSettingsListener): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(items: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export function saveNotification(
  notification: Partial<AppNotification> & { title: string; message: string }
): AppNotification[] {
  const fullNotif: AppNotification = {
    id: notification.id || `notif-${Date.now()}`,
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp || 'Hozirgina',
    category: notification.category || 'announcement',
    read: notification.read ?? false,
    priority: notification.priority || 'normal',
    actionTab: notification.actionTab || notification.routeTab,
    routeTab: notification.routeTab || notification.actionTab,
  };
  const existing = getStoredNotifications();
  const updated = [fullNotif, ...existing.filter((n) => n.id !== fullNotif.id)];
  saveStoredNotifications(updated);
  return updated;
}

export function getPrayerAlertSettings(): PrayerAlertSettings {
  try {
    const raw = localStorage.getItem(ALERT_SETTINGS_STORAGE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_AZAN_SETTINGS_KEY);
    let parsed: Partial<PrayerAlertSettings> = {};
    if (raw) {
      parsed = JSON.parse(raw);
    }

    const mergedIndividualAlerts = {
      ...DEFAULT_ALERT_SETTINGS.individualPrayerAlerts,
      ...(parsed.individualPrayerAlerts || {}),
    };

    const mergedIndividualModes: PrayerAlertSettings['individualPrayerModes'] = {
      ...DEFAULT_ALERT_SETTINGS.individualPrayerModes,
      ...(parsed.individualPrayerModes || {}),
    };

    if (!parsed.individualPrayerModes && legacyRaw) {
      try {
        const legacyModes = JSON.parse(legacyRaw) as Record<string, string>;
        (['bomdod', 'peshin', 'asr', 'shom', 'xufton'] as const).forEach((k) => {
          const val = legacyModes[k];
          if (val === 'sound' || val === 'chime' || val === 'silent' || val === 'off') {
            mergedIndividualModes[k] = val;
            mergedIndividualAlerts[k] = val !== 'off';
          }
        });
      } catch {
        // ignore
      }
    }

    const selectedTrack =
      parsed.selectedAdhanTrackId ||
      parsed.defaultAdhanTrackId ||
      DEFAULT_ALERT_SETTINGS.selectedAdhanTrackId;
    const bomdodTrack =
      parsed.bomdodAdhanTrackId ||
      parsed.perPrayerTracks?.bomdod ||
      DEFAULT_ALERT_SETTINGS.bomdodAdhanTrackId;

    return {
      ...DEFAULT_ALERT_SETTINGS,
      ...parsed,
      selectedAdhanTrackId: selectedTrack,
      defaultAdhanTrackId: selectedTrack,
      bomdodAdhanTrackId: bomdodTrack,
      perPrayerTracks: {
        ...DEFAULT_ALERT_SETTINGS.perPrayerTracks,
        ...(parsed.perPrayerTracks || {}),
      },
      individualPrayerAlerts: mergedIndividualAlerts,
      individualPrayerModes: mergedIndividualModes,
    };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

export function savePrayerAlertSettings(settings: PrayerAlertSettings): void {
  try {
    const normalizedModes = { ...settings.individualPrayerModes };
    const normalizedAlerts = { ...settings.individualPrayerAlerts };
    (['bomdod', 'peshin', 'asr', 'shom', 'xufton'] as const).forEach((key) => {
      if (!normalizedAlerts[key]) {
        normalizedModes[key] = 'off';
      } else if (normalizedModes[key] === 'off') {
        normalizedModes[key] =
          settings.soundMode === 'chime'
            ? 'chime'
            : settings.soundMode === 'silent'
            ? 'silent'
            : 'sound';
      }
    });

    const primaryTrack =
      settings.selectedAdhanTrackId ||
      settings.defaultAdhanTrackId ||
      DEFAULT_ALERT_SETTINGS.selectedAdhanTrackId;

    const finalSettings: PrayerAlertSettings = {
      ...settings,
      selectedAdhanTrackId: primaryTrack,
      defaultAdhanTrackId: primaryTrack,
      individualPrayerAlerts: normalizedAlerts,
      individualPrayerModes: normalizedModes,
    };

    localStorage.setItem(ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(finalSettings));
    localStorage.setItem(LEGACY_AZAN_SETTINGS_KEY, JSON.stringify(normalizedModes));

    const currentUser = auth?.currentUser;
    if (currentUser?.uid) {
      syncDocToFirestore('user_preferences', `prayer_alerts_${currentUser.uid}`, {
        id: `prayer_alerts_${currentUser.uid}`,
        userId: currentUser.uid,
        prayerAlertSettings: finalSettings,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    settingsListeners.forEach((listener) => {
      try {
        listener(finalSettings);
      } catch {
        // ignore
      }
    });
  } catch (e) {
    console.error('Failed to save alert settings:', e);
  }
}

/**
 * Triggers device vibration if supported and enabled
 */
export function triggerVibration(pattern: number | number[] = [200, 100, 200]): boolean {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Downloads Adhan MP3 file for offline device access
 */
export function downloadAdhanTrackFile(track: AdhanTrack): void {
  try {
    const link = document.createElement('a');
    link.href = track.fallbackAudioUrl || `/api/audio/adhan/${track.id}` || track.audioUrl;
    link.download = `${track.id}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to download Adhan track:', err);
  }
}

/**
 * Stops any currently playing Adhan audio immediately and resets player state
 */
export function stopActiveAdhanAudio(): void {
  try {
    if (activeAdhanAudio) {
      activeAdhanAudio.onended = null;
      activeAdhanAudio.onerror = null;
      activeAdhanAudio.ontimeupdate = null;
      activeAdhanAudio.onloadedmetadata = null;
      activeAdhanAudio.pause();
      activeAdhanAudio.currentTime = 0;
      activeAdhanAudio = null;
    }
  } catch {
    // ignore audio stop error
  }
  emitPlayerState({
    playingTrackId: null,
    track: null,
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    progressPercent: 0,
    error: null,
  });
}

/**
 * Pauses currently playing Adhan audio without resetting position
 */
export function pauseAdhanAudio(): void {
  if (activeAdhanAudio && !activeAdhanAudio.paused) {
    activeAdhanAudio.pause();
    emitPlayerState({ isPlaying: false, isPaused: true });
  }
}

/**
 * Resumes paused Adhan audio
 */
export async function resumeAdhanAudio(): Promise<void> {
  if (activeAdhanAudio && activeAdhanAudio.paused) {
    try {
      await activeAdhanAudio.play();
      emitPlayerState({ isPlaying: true, isPaused: false, error: null });
    } catch (err: any) {
      emitPlayerState({
        isPlaying: false,
        error: err?.message || 'Audio davom ettirishda xatolik yuz berdi.',
      });
    }
  }
}

/**
 * Seeks active Adhan audio to specific second
 */
export function seekAdhanAudio(seconds: number): void {
  if (activeAdhanAudio && Number.isFinite(seconds)) {
    const duration = activeAdhanAudio.duration || activePlayerState.duration || 180;
    const clamped = Math.max(0, Math.min(seconds, duration));
    activeAdhanAudio.currentTime = clamped;
    const pct = duration > 0 ? Math.min(100, Math.round((clamped / duration) * 100)) : 0;
    emitPlayerState({ currentTime: clamped, progressPercent: pct });
  }
}

/**
 * Updates live volume of active Adhan audio
 */
export function setAdhanAudioVolume(volume: number): void {
  const clamped = Math.max(0.05, Math.min(1, volume));
  if (activeAdhanAudio) {
    activeAdhanAudio.volume = clamped;
  }
  emitPlayerState({ volume: clamped });
}

/**
 * Toggles Play/Pause for a specific Adhan track ID
 */
export async function toggleAdhanAudio(trackId: string, volumeOverride?: number): Promise<boolean> {
  if (activePlayerState.playingTrackId === trackId && activeAdhanAudio) {
    if (activePlayerState.isPlaying) {
      pauseAdhanAudio();
      return true;
    } else if (activePlayerState.isPaused) {
      await resumeAdhanAudio();
      return true;
    }
  }
  return playAdhanTrackById(trackId, volumeOverride);
}

/**
 * Plays a verified Adhan track object directly (backward compatible with AdminPortal)
 */
export async function playAdhanAudioTrack(track: AdhanTrack, volumeOverride?: number): Promise<boolean> {
  return playAdhanTrackById(track.id, volumeOverride);
}

/**
 * Plays a verified Adhan recording (e.g. Mishary Rashid Alafasy)
 * Automatically tries primary Archive.org stream, then server proxy fallback (/api/audio/adhan/:trackId).
 */
export async function playAdhanTrackById(
  trackId: string,
  volumeOverride?: number,
  onEnded?: () => void
): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;
    stopActiveAdhanAudio();

    const settings = getPrayerAlertSettings();
    const track = getAdhanTrackById(trackId);
    const effectiveVol = Math.max(0.1, Math.min(1.0, volumeOverride ?? settings.volume ?? 0.85));

    emitPlayerState({
      playingTrackId: track.id,
      track,
      isPlaying: false,
      isPaused: false,
      isLoading: true,
      currentTime: 0,
      duration: track.durationSeconds || 180,
      progressPercent: 0,
      volume: effectiveVol,
      error: null,
    });

    const tryPlaySource = (sourceUrl: string, isFallbackAttempt: boolean): Promise<boolean> => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audio.src = sourceUrl;
        audio.volume = effectiveVol;
        activeAdhanAudio = audio;

        let settled = false;

        audio.onloadedmetadata = () => {
          const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.durationSeconds;
          emitPlayerState({
            duration: dur,
            isLoading: false,
          });
        };

        audio.ontimeupdate = () => {
          const cur = audio.currentTime || 0;
          const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.durationSeconds;
          const pct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0;
          emitPlayerState({
            currentTime: cur,
            duration: dur,
            progressPercent: pct,
          });
        };

        audio.onended = () => {
          activeAdhanAudio = null;
          emitPlayerState({
            playingTrackId: null,
            track: null,
            isPlaying: false,
            isPaused: false,
            isLoading: false,
            currentTime: 0,
            progressPercent: 100,
          });
          if (onEnded) onEnded();
        };

        audio.onerror = () => {
          if (!settled) {
            settled = true;
            resolve(false);
          } else if (!isFallbackAttempt && track.fallbackAudioUrl) {
            tryPlaySource(track.fallbackAudioUrl, true);
          } else {
            activeAdhanAudio = null;
            emitPlayerState({
              isPlaying: false,
              isLoading: false,
              error: 'Azon audio yozuvini yuklashda xatolik yuz berdi. Internet aloqasini tekshiring.',
            });
            if (onEnded) onEnded();
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              settled = true;
              emitPlayerState({
                isPlaying: true,
                isPaused: false,
                isLoading: false,
                error: null,
              });
              resolve(true);
            })
            .catch(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            });
        } else {
          settled = true;
          emitPlayerState({ isPlaying: true, isPaused: false, isLoading: false });
          resolve(true);
        }
      });
    };

    // 1. Try primary verified Archive.org stream
    const primaryOk = await tryPlaySource(track.audioUrl, false);
    if (primaryOk) return true;

    // 2. Try local server proxy fallback (/api/audio/adhan/:trackId)
    const fallbackUrl = track.fallbackAudioUrl || `/api/audio/adhan/${track.id}`;
    const fallbackOk = await tryPlaySource(fallbackUrl, true);
    if (fallbackOk) return true;

    emitPlayerState({
      isPlaying: false,
      isLoading: false,
      error: 'Azon audio faylini ijro etib boʻlmadi. Brauzer ovoz ruxsatini tekshiring.',
    });
    if (onEnded) onEnded();
    return false;
  } catch (err: any) {
    emitPlayerState({
      isPlaying: false,
      isLoading: false,
      error: err?.message || 'Audio tizimida xatolik yuz berdi.',
    });
    if (onEnded) onEnded();
    return false;
  }
}

/**
 * Plays the configured Adhan or Chime for a specific prayer (bomdod, peshin, asr, shom, xufton)
 */
export async function playPrayerAdhanSound(
  prayerKey?: 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton'
): Promise<void> {
  const settings = getPrayerAlertSettings();
  if (settings.vibrationEnabled) {
    triggerVibration();
  }
  if (!settings.soundEnabled || settings.soundMode === 'silent') return;

  if (prayerKey) {
    const mode = settings.individualPrayerModes?.[prayerKey];
    if (mode === 'off' || mode === 'silent') return;
    if (mode === 'chime') {
      playGentleChime();
      return;
    }
  }

  if (settings.soundMode === 'chime') {
    playGentleChime();
    return;
  }

  const trackId =
    (prayerKey && settings.perPrayerTracks?.[prayerKey]) ||
    settings.selectedAdhanTrackId ||
    getDefaultTrackForPrayer(prayerKey || 'peshin').id;

  const played = await playAdhanTrackById(trackId, settings.volume);
  if (!played) {
    playGentleChime();
  }
}

/**
 * Plays a gentle, spiritual harmonic chime using Web Audio API
 */
export function playGentleChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const frequencies = [528, 660, 792];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0.001, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.18 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 1.9);
    });
  } catch {
    // AudioContext might be blocked if no user interaction occurred yet
  }
}

/**
 * Request Browser Notification Permission
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

export const requestPushPermission = requestBrowserNotificationPermission;

/**
 * Trigger a real Browser Notification and optional sound
 */
export function triggerBrowserNotification(
  title: string,
  body: string,
  category: NotificationCategory = 'prayer',
  prayerKey?: 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton',
  playFullAdhan: boolean = true
): AppNotification {
  const settings = getPrayerAlertSettings();

  if (settings.soundEnabled) {
    if (category === 'prayer' && playFullAdhan) {
      playPrayerAdhanSound(prayerKey);
    } else if (settings.soundMode !== 'silent') {
      playGentleChime();
    }
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.svg',
        tag: `asaka-ziyo-${Date.now()}`,
      });
    } catch {
      // Fallback to in-app notification
    }
  }

  const newNotif: AppNotification = {
    id: `notif-${Date.now()}`,
    title,
    message: body,
    timestamp: 'Hozirgina',
    category,
    read: false,
    priority: category === 'prayer' || category === 'ramadan' ? 'high' : 'normal',
  };

  const existing = getStoredNotifications();
  saveStoredNotifications([newNotif, ...existing]);
  return newNotif;
}

export { ADHAN_TRACKS, getAdhanTrackById };
