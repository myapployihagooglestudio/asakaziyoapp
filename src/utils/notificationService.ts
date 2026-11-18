/**
 * ASAKA ZIYO — Unified Telegram-Style Heads-Up Notification, Smart Adhan Reminder & Audio Engine
 *
 * Features:
 * 1. Per-prayer individual scheduling for Tahajjud, Subh, Bomdod, Peshin, Asr, Shom, Xufton:
 *    - Pre-reminder offsets: 5, 10, 15, 30 minutes before, or Off (0) — separate from exact Adhan entry!
 *    - Exact time notification: Full Adhan audio ('sound'), Gentle Chime ('chime'), Vibration only ('silent'), or Off ('off').
 * 2. Deterministic Deduplication & Auto-Rescheduling in Asia/Tashkent (UTC+5):
 *    - Cancels old scheduled alarms immediately when Admin updates prayer times in Firestore.
 *    - Persists schedule across app restarts / device reboots and works 100% offline.
 * 3. Telegram-Style Heads-Up Notification Banner & Native Android High-Importance Channel Bridge:
 *    - Supports Prayer Pre-Reminders, Exact Adhan Alerts, Admin Announcements, News, Articles, and Chat Messages.
 */

import { ADHAN_TRACKS, getAdhanTrackById, getDefaultTrackForPrayer, AdhanTrack } from '../data/adhanTracksData';
import { PrayerSchedule } from '../types';
import { auth, syncDocToFirestore } from './firebaseClient';

export type NotificationCategory =
  | 'prayer'
  | 'prayer_pre_reminder'
  | 'prayer_exact'
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
  | 'event'
  | 'chat';

export type SoundMode = 'adhan' | 'chime' | 'silent';
export type PrayerAzanMode = 'sound' | 'chime' | 'silent' | 'off';
export type SchedulablePrayerKey =
  | 'tahajjud'
  | 'subh'
  | 'bomdod'
  | 'peshin'
  | 'asr'
  | 'shom'
  | 'xufton';

export type PreReminderMinutesOption = 0 | 5 | 10 | 15 | 30;
export type PrayerPreReminderOffset = PreReminderMinutesOption;
export type PrayerExactMode = PrayerAzanMode;

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
  dedupKey?: string;
}

export interface HeadsUpNotificationPayload {
  id: string;
  title: string;
  message: string;
  subtitle?: string;
  timestamp: string;
  category: NotificationCategory;
  routeTab: string;
  isAdhanPlaying?: boolean;
  prayerKey?: SchedulablePrayerKey;
  badgeText?: string;
}

export interface ScheduledPrayerAlarmItem {
  alarmId: string;
  dateKey: string;
  prayerKey: SchedulablePrayerKey;
  prayerNameUz: string;
  prayerTimeStr: string;
  triggerTimeStr: string;
  stage: 'pre' | 'exact';
  minutesBefore: number;
  mode: PrayerAzanMode;
  targetTimestampMs: number;
}

export interface PrayerAlertSettings {
  enabled: boolean;
  minutesBefore: number;
  notifyOnExactTime: boolean;
  soundEnabled: boolean;
  soundMode: SoundMode;
  preReminderSoundMode: 'chime' | 'silent';
  selectedAdhanTrackId: string;
  defaultAdhanTrackId: string;
  bomdodAdhanTrackId: string;
  vibrationEnabled: boolean;
  volume: number; // 0.1 to 1.0
  headsUpBannerEnabled: boolean;
  announcementsPushEnabled: boolean;
  newsArticlesPushEnabled: boolean;
  chatMessagesPushEnabled: boolean;
  perPrayerTracks: Record<string, string> & {
    tahajjud: string;
    subh: string;
    bomdod: string;
    peshin: string;
    asr: string;
    shom: string;
    xufton: string;
  };
  perPrayerPreReminderMinutes: Record<SchedulablePrayerKey, PreReminderMinutesOption>;
  individualPrayerAlerts: {
    tahajjud: boolean;
    subh: boolean;
    bomdod: boolean;
    peshin: boolean;
    asr: boolean;
    shom: boolean;
    xufton: boolean;
  };
  individualPrayerModes: {
    tahajjud: PrayerAzanMode;
    subh: PrayerAzanMode;
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
  preReminderMinutes?: Record<string, PreReminderMinutesOption>;
  perPrayerMode?: Record<string, PrayerAzanMode>;
  announcementAlertsEnabled?: boolean;
  newsAlertsEnabled?: boolean;
  chatAlertsEnabled?: boolean;
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
const FIRED_EVENTS_STORAGE_KEY = 'asaka_ziyo_fired_notif_keys_v3';
const SCHEDULED_ALARMS_STORAGE_KEY = 'asaka_ziyo_scheduled_alarms_v3';

export const SCHEDULABLE_PRAYERS: {
  key: SchedulablePrayerKey;
  nameUz: string;
  defaultPreMins: PreReminderMinutesOption;
}[] = [
  { key: 'tahajjud', nameUz: 'Tahajjud', defaultPreMins: 15 },
  { key: 'subh', nameUz: 'Subhi Sodiq (Saharlik)', defaultPreMins: 15 },
  { key: 'bomdod', nameUz: 'Bomdod', defaultPreMins: 10 },
  { key: 'peshin', nameUz: 'Peshin', defaultPreMins: 10 },
  { key: 'asr', nameUz: 'Asr', defaultPreMins: 10 },
  { key: 'shom', nameUz: 'Shom (Iftorlik)', defaultPreMins: 5 },
  { key: 'xufton', nameUz: 'Xufton', defaultPreMins: 10 },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const DEFAULT_ALERT_SETTINGS: PrayerAlertSettings = {
  enabled: true,
  minutesBefore: 10,
  notifyOnExactTime: true,
  soundEnabled: true,
  soundMode: 'adhan',
  preReminderSoundMode: 'chime',
  selectedAdhanTrackId: 'mishary-alafasy-standard',
  defaultAdhanTrackId: 'mishary-alafasy-standard',
  bomdodAdhanTrackId: 'mishary-alafasy-fajr',
  vibrationEnabled: true,
  volume: 0.85,
  headsUpBannerEnabled: true,
  announcementsPushEnabled: true,
  newsArticlesPushEnabled: true,
  chatMessagesPushEnabled: true,
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
  perPrayerPreReminderMinutes: {
    tahajjud: 15,
    subh: 15,
    bomdod: 10,
    peshin: 10,
    asr: 10,
    shom: 5,
    xufton: 10,
  },
  individualPrayerAlerts: {
    tahajjud: true,
    subh: true,
    bomdod: true,
    peshin: true,
    asr: true,
    shom: true,
    xufton: true,
  },
  individualPrayerModes: {
    tahajjud: 'chime',
    subh: 'chime',
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

// Heads-up notification listeners (Telegram-style top banner)
type HeadsUpListener = (payload: HeadsUpNotificationPayload | null) => void;
const headsUpListeners = new Set<HeadsUpListener>();
let currentHeadsUpPayload: HeadsUpNotificationPayload | null = null;

// Active scheduled timers so old schedule timers can be cleanly cancelled on admin update
let activeScheduleTimers: ReturnType<typeof setTimeout>[] = [];
let lastScheduleSignature = '';
let latestSyncedSchedule: PrayerSchedule | null = null;

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

export function subscribeToHeadsUpNotifications(listener: HeadsUpListener): () => void {
  headsUpListeners.add(listener);
  listener(currentHeadsUpPayload);
  return () => {
    headsUpListeners.delete(listener);
  };
}

export function dismissHeadsUpNotification(): void {
  currentHeadsUpPayload = null;
  headsUpListeners.forEach((cb) => {
    try {
      cb(null);
    } catch {
      // ignore
    }
  });
}

export function emitHeadsUpNotification(payload: HeadsUpNotificationPayload): void {
  const settings = getPrayerAlertSettings();
  if (settings.headsUpBannerEnabled !== false) {
    currentHeadsUpPayload = payload;
    headsUpListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // ignore
      }
    });
  }

  // Also forward to Native Android Bridge if running inside Android APK
  if (typeof window !== 'undefined') {
    const win = window as unknown as {
      AsakaAndroidBridge?: {
        showHeadsUpNotification?: (
          title: string,
          body: string,
          channelId: string,
          routeTab: string
        ) => void;
      };
    };
    if (win.AsakaAndroidBridge?.showHeadsUpNotification) {
      const channelId =
        payload.category === 'prayer'
          ? 'asaka_ziyo_prayer_adhan'
          : payload.category === 'announcement' || payload.category === 'news'
          ? 'asaka_ziyo_announcements'
          : 'asaka_ziyo_daily_wisdom';
      try {
        win.AsakaAndroidBridge.showHeadsUpNotification(
          payload.title,
          payload.message,
          channelId,
          payload.routeTab || 'prayer'
        );
      } catch {
        // ignore bridge error
      }
    }
  }
}

export function triggerTelegramHeadsUpNotification(params: {
  title: string;
  body: string;
  category?: NotificationCategory;
  targetView?: string;
  playChime?: boolean;
}): void {
  emitHeadsUpNotification({
    id: `heads-up-${Date.now()}`,
    title: params.title,
    message: params.body,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    category: params.category || 'prayer',
    routeTab: params.targetView || 'home',
  });
}

/**
 * Checks and records deterministic deduplication keys so the same notification never fires twice
 */
export function hasNotificationEventFired(dedupKey: string): boolean {
  if (!dedupKey) return false;
  try {
    const raw = localStorage.getItem(FIRED_EVENTS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(dedupKey);
  } catch {
    return false;
  }
}

export function markNotificationEventFired(dedupKey: string): void {
  if (!dedupKey) return;
  try {
    const raw = localStorage.getItem(FIRED_EVENTS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(dedupKey)) {
      const next = [dedupKey, ...list].slice(0, 250);
      localStorage.setItem(FIRED_EVENTS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
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
  if (notification.dedupKey && hasNotificationEventFired(notification.dedupKey)) {
    return getStoredNotifications();
  }
  if (notification.dedupKey) {
    markNotificationEventFired(notification.dedupKey);
  }

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
    dedupKey: notification.dedupKey,
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

    const mergedPreMins: PrayerAlertSettings['perPrayerPreReminderMinutes'] = {
      ...DEFAULT_ALERT_SETTINGS.perPrayerPreReminderMinutes,
      ...(parsed.perPrayerPreReminderMinutes || {}),
    };

    if (!parsed.individualPrayerModes && legacyRaw) {
      try {
        const legacyModes = JSON.parse(legacyRaw) as Record<string, string>;
        (['tahajjud', 'subh', 'bomdod', 'peshin', 'asr', 'shom', 'xufton'] as const).forEach((k) => {
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
      perPrayerPreReminderMinutes: mergedPreMins,
      individualPrayerAlerts: mergedIndividualAlerts,
      individualPrayerModes: mergedIndividualModes,
    };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

export function savePrayerAlertSettings(settings: PrayerAlertSettings): void {
  try {
    const normalizedModes = {
      ...DEFAULT_ALERT_SETTINGS.individualPrayerModes,
      ...settings.individualPrayerModes,
    };
    const normalizedAlerts = {
      ...DEFAULT_ALERT_SETTINGS.individualPrayerAlerts,
      ...settings.individualPrayerAlerts,
    };
    (['tahajjud', 'subh', 'bomdod', 'peshin', 'asr', 'shom', 'xufton'] as const).forEach((key) => {
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
      ...DEFAULT_ALERT_SETTINGS,
      ...settings,
      selectedAdhanTrackId: primaryTrack,
      defaultAdhanTrackId: primaryTrack,
      individualPrayerAlerts: normalizedAlerts,
      individualPrayerModes: normalizedModes,
      perPrayerPreReminderMinutes: {
        ...DEFAULT_ALERT_SETTINGS.perPrayerPreReminderMinutes,
        ...(settings.perPrayerPreReminderMinutes || {}),
      },
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

    // Re-sync scheduled alarms immediately when user changes settings
    if (latestSyncedSchedule) {
      syncPrayerScheduleAlarms(latestSyncedSchedule, true);
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
export function triggerVibration(pattern: number | number[] = [220, 100, 220]): boolean {
  try {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        AsakaAndroidBridge?: { vibrate?: (ms: number) => void };
      };
      if (win.AsakaAndroidBridge?.vibrate) {
        win.AsakaAndroidBridge.vibrate(250);
        return true;
      }
    }
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
          const dur =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : track.durationSeconds;
          emitPlayerState({
            duration: dur,
            isLoading: false,
          });
        };

        audio.ontimeupdate = () => {
          const cur = audio.currentTime || 0;
          const dur =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : track.durationSeconds;
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

    const primaryOk = await tryPlaySource(track.audioUrl, false);
    if (primaryOk) return true;

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
 * Plays the configured Adhan or Chime for a specific prayer
 */
export async function playPrayerAdhanSound(prayerKey?: SchedulablePrayerKey): Promise<void> {
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
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 * Trigger a real Browser Notification, Telegram-style Heads-up Banner, and optional sound
 */
export function triggerBrowserNotification(
  title: string,
  body: string,
  category: NotificationCategory = 'prayer',
  prayerKey?: SchedulablePrayerKey,
  playFullAdhan: boolean = true,
  dedupKey?: string,
  routeTab: string = 'prayer'
): AppNotification {
  if (dedupKey && hasNotificationEventFired(dedupKey)) {
    const existing = getStoredNotifications();
    return existing[0] || {
      id: `notif-${Date.now()}`,
      title,
      message: body,
      timestamp: 'Hozirgina',
      category,
      read: false,
    };
  }
  if (dedupKey) {
    markNotificationEventFired(dedupKey);
  }

  const settings = getPrayerAlertSettings();

  if (settings.vibrationEnabled) {
    triggerVibration();
  }

  if (settings.soundEnabled) {
    if (category === 'prayer' && playFullAdhan) {
      playPrayerAdhanSound(prayerKey);
    } else if (
      category === 'prayer' &&
      !playFullAdhan &&
      settings.preReminderSoundMode !== 'silent'
    ) {
      playGentleChime();
    } else if (settings.soundMode !== 'silent') {
      playGentleChime();
    }
  }

  const nowTimeStr = new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  // 1. Trigger Telegram-style top Heads-Up Notification Banner + Android Native Channel
  emitHeadsUpNotification({
    id: dedupKey || `headsup-${Date.now()}`,
    title,
    message: body,
    timestamp: nowTimeStr,
    category,
    routeTab,
    isAdhanPlaying: Boolean(category === 'prayer' && playFullAdhan),
    prayerKey,
    badgeText:
      category === 'prayer'
        ? playFullAdhan
          ? 'Azon Vaqti'
          : 'Oldindan Eslatma'
        : category === 'announcement'
        ? 'Masjid Eʼloni'
        : category === 'news'
        ? 'Yangilik'
        : category === 'chat'
        ? 'Yangi Xabar'
        : 'ASAKA ZIYO',
  });

  // 2. Trigger OS / Browser Notification with official brand icon
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: dedupKey || `asaka-ziyo-${Date.now()}`,
      });
    } catch {
      // Fallback to in-app notification
    }
  }

  const newNotif: AppNotification = {
    id: `notif-${Date.now()}`,
    title,
    message: body,
    timestamp: nowTimeStr,
    category,
    read: false,
    priority: category === 'prayer' || category === 'ramadan' ? 'high' : 'normal',
    routeTab,
    actionTab: routeTab,
    dedupKey,
  };

  const existing = getStoredNotifications();
  saveStoredNotifications([newNotif, ...existing]);
  return newNotif;
}

/**
 * Helper to get current Tashkent YYYY-MM-DD and seconds since midnight
 */
function getTashkentDateAndSeconds(): {
  dateKey: string;
  secondsSinceMidnight: number;
  nowMs: number;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const h = parseInt(map.hour || '0', 10) % 24;
  const m = parseInt(map.minute || '0', 10);
  const s = parseInt(map.second || '0', 10);
  return {
    dateKey,
    secondsSinceMidnight: h * 3600 + m * 60 + s,
    nowMs: now.getTime(),
  };
}

function parseTimeStrToMinutes(timeStr: string): number | null {
  const match = String(timeStr || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

/**
 * Returns the currently active scheduled prayer alarms for inspection in UI
 */
export function getActiveScheduledAlarms(): ScheduledPrayerAlarmItem[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_ALARMS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Cancels all old prayer timers and reschedules both Pre-Reminders (5/10/15/30 min before)
 * and Exact Adhan Reminders for all 7 prayers based on the latest Admin Firestore schedule.
 */
export function syncPrayerScheduleAlarms(
  schedule: PrayerSchedule,
  forceRebuild: boolean = false
): ScheduledPrayerAlarmItem[] {
  latestSyncedSchedule = schedule;
  const settings = getPrayerAlertSettings();

  const signature = JSON.stringify({
    times: schedule.times.map((t) => `${t.key}:${t.time}:${t.iqamahTime || ''}`),
    enabled: settings.enabled,
    notifyOnExactTime: settings.notifyOnExactTime,
    preMins: settings.perPrayerPreReminderMinutes,
    indivAlerts: settings.individualPrayerAlerts,
    indivModes: settings.individualPrayerModes,
  });

  if (!forceRebuild && signature === lastScheduleSignature && activeScheduleTimers.length > 0) {
    return getActiveScheduledAlarms();
  }

  // 1. Cancel all previous timers immediately so old schedule times never fire
  activeScheduleTimers.forEach((t) => clearTimeout(t));
  activeScheduleTimers = [];
  lastScheduleSignature = signature;

  if (!settings.enabled) {
    localStorage.setItem(SCHEDULED_ALARMS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  const { dateKey, secondsSinceMidnight, nowMs } = getTashkentDateAndSeconds();
  const upcomingAlarms: ScheduledPrayerAlarmItem[] = [];

  for (const meta of SCHEDULABLE_PRAYERS) {
    const entry = schedule.times.find((t) => t.key === meta.key);
    if (!entry) continue;

    const prayerMinutes = parseTimeStrToMinutes(entry.time);
    if (prayerMinutes === null) continue;

    const preMins = settings.perPrayerPreReminderMinutes?.[meta.key] ?? 0;
    const isExactEnabled =
      settings.notifyOnExactTime !== false &&
      settings.individualPrayerAlerts?.[meta.key] !== false &&
      settings.individualPrayerModes?.[meta.key] !== 'off';
    const prayerMode = settings.individualPrayerModes?.[meta.key] || 'sound';

    // Stage A: Pre-reminder (5, 10, 15, or 30 minutes before prayer time) — separate event!
    if (preMins > 0) {
      const triggerMins = prayerMinutes - preMins;
      const triggerSec = ((triggerMins % 1440) + 1440) % 1440 * 60;
      let deltaSec = triggerSec - secondsSinceMidnight;
      let targetDateKey = dateKey;
      if (deltaSec < -30) {
        deltaSec += 86400;
        targetDateKey = `${dateKey}+1`;
      }

      const alarmId = `asaka_prayer_${targetDateKey}_${meta.key}_pre_${preMins}m_${entry.time}`;
      const item: ScheduledPrayerAlarmItem = {
        alarmId,
        dateKey: targetDateKey,
        prayerKey: meta.key,
        prayerNameUz: entry.nameUz || meta.nameUz,
        prayerTimeStr: entry.time,
        triggerTimeStr: formatMinutesToHHMM(triggerMins),
        stage: 'pre',
        minutesBefore: preMins,
        mode: settings.preReminderSoundMode === 'silent' ? 'silent' : 'chime',
        targetTimestampMs: nowMs + Math.max(1, deltaSec) * 1000,
      };
      upcomingAlarms.push(item);

      if (deltaSec >= -30 && deltaSec <= 86400) {
        const timer = setTimeout(() => {
          triggerBrowserNotification(
            `⏳ ${item.prayerNameUz} namoziga ${preMins} daqiqa qoldi`,
            `Asaka vaqti bilan soat ${item.prayerTimeStr} da ${item.prayerNameUz} vaqti kiradi. Tahorat va ibodatga tayyorgarlik koʻring.`,
            'prayer',
            meta.key,
            false,
            item.alarmId,
            'prayer'
          );
        }, Math.max(500, deltaSec * 1000));
        activeScheduleTimers.push(timer);
      }
    }

    // Stage B: Exact prayer entry time notification (Azon vaqti) — separate event!
    if (isExactEnabled) {
      const triggerSec = prayerMinutes * 60;
      let deltaSec = triggerSec - secondsSinceMidnight;
      let targetDateKey = dateKey;
      if (deltaSec < -30) {
        deltaSec += 86400;
        targetDateKey = `${dateKey}+1`;
      }

      const alarmId = `asaka_prayer_${targetDateKey}_${meta.key}_exact_${entry.time}`;
      const item: ScheduledPrayerAlarmItem = {
        alarmId,
        dateKey: targetDateKey,
        prayerKey: meta.key,
        prayerNameUz: entry.nameUz || meta.nameUz,
        prayerTimeStr: entry.time,
        triggerTimeStr: entry.time,
        stage: 'exact',
        minutesBefore: 0,
        mode: prayerMode,
        targetTimestampMs: nowMs + Math.max(1, deltaSec) * 1000,
      };
      upcomingAlarms.push(item);

      if (deltaSec >= -30 && deltaSec <= 86400) {
        const timer = setTimeout(() => {
          triggerBrowserNotification(
            `🕌 ${item.prayerNameUz} vaqti kirdi (${item.prayerTimeStr})`,
            `Asaka shahri («MuhammadSolih Hoji» jomeʼ masjidi) jadvali boʻyicha ${item.prayerNameUz} vaqti kirdi.${
              entry.iqamahTime ? ` Jamoat (Iqomat): ${entry.iqamahTime}.` : ''
            }`,
            'prayer',
            meta.key,
            prayerMode === 'sound',
            item.alarmId,
            'prayer'
          );
        }, Math.max(500, deltaSec * 1000));
        activeScheduleTimers.push(timer);
      }
    }
  }

  upcomingAlarms.sort((a, b) => a.targetTimestampMs - b.targetTimestampMs);
  try {
    localStorage.setItem(SCHEDULED_ALARMS_STORAGE_KEY, JSON.stringify(upcomingAlarms));
  } catch {
    // ignore
  }
  return upcomingAlarms;
}

export { ADHAN_TRACKS, getAdhanTrackById };
