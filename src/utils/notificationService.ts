/**
 * ASAKA ZIYO — Notification and Prayer Alert Service (2026)
 * Handles Web Notifications API, Web Audio synthetic Azan tone,
 * and Sheikh Mishary Rashid Alafasy canonical Adhan audio streams.
 */

import { getStoredAdhanTracks, AdhanTrack } from '../data/adhanTracksData';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'prayer' | 'announcement' | 'news' | 'system' | 'quiz' | 'article' | 'hadith' | 'dhikr' | 'general';
  read: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  imageUrl?: string;
  linkTab?: string;
  routeTab?: string;
  routeId?: string;
}

const STORAGE_KEY = 'asaka_ziyo_notifications_v3';
const PRAYER_SETTINGS_KEY = 'asaka_ziyo_prayer_alert_settings_v3';

export interface PrayerAlertSettings {
  enabled: boolean;
  minutesBefore: number;
  soundEnabled: boolean;
  volume: number; // 0.1 to 1.0
  notifyOnExactTime: boolean;
  defaultAdhanTrackId: string;
  bomdodAdhanTrackId: string;
  perPrayerTracks?: Record<string, string>; // prayerKey -> trackId
  individualPrayerAlerts?: Record<string, boolean>; // prayerKey -> boolean
}

export const DEFAULT_PRAYER_ALERT_SETTINGS: PrayerAlertSettings = {
  enabled: true,
  minutesBefore: 15,
  soundEnabled: true,
  volume: 0.85,
  notifyOnExactTime: true,
  defaultAdhanTrackId: 'track-mishary-madinah',
  bomdodAdhanTrackId: 'track-mishary-bomdod',
  perPrayerTracks: {
    bomdod: 'track-mishary-bomdod',
    subh: 'track-mishary-bomdod',
    peshin: 'track-mishary-madinah',
    asr: 'track-mishary-madinah',
    shom: 'track-mishary-short',
    xufton: 'track-mishary-madinah',
  },
  individualPrayerAlerts: {
    tahajjud: true,
    subh: true,
    bomdod: true,
    quyosh: true,
    peshin: true,
    asr: true,
    shom: true,
    xufton: true,
  },
};

export const getPrayerAlertSettings = (): PrayerAlertSettings => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(PRAYER_SETTINGS_KEY);
      if (data) return { ...DEFAULT_PRAYER_ALERT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_PRAYER_ALERT_SETTINGS;
};

export const savePrayerAlertSettings = (settings: PrayerAlertSettings): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (e) {
    // ignore
  }
};

export const getStoredNotifications = (): AppNotification[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return [
    {
      id: 'notif-welcome',
      title: 'Asaka Ziyo tizimiga xush kelibsiz!',
      message: 'Asaka markaziy jome masjidi rasmiy mobil va veb portaliga xush kelibsiz. Namoz vaqtlari, Qurʼon qiroatlari va kunlik viktorina faol.',
      timestamp: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      category: 'system',
      read: false,
      priority: 'high',
    },
  ];
};

export const saveNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification => {
  const current = getStoredNotifications();
  const newNotif: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    read: false,
  };

  const updated = [newNotif, ...current];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('asaka-ziyo-new-notification', { detail: newNotif }));
    }
  } catch (e) {
    // ignore
  }

  // Trigger browser push notification if permitted
  triggerBrowserNotification(newNotif.title, newNotif.message);

  return newNotif;
};

export const markNotificationAsRead = (id: string): void => {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('asaka-ziyo-notifications-updated'));
    }
  } catch (e) {
    // ignore
  }
};

/**
 * Web Audio synthetic Azan chime (Guaranteed to work 100% offline without external network)
 */
export const playGentleChime = (): void => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const freqs = [528, 660, 792, 1056];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.25 / (idx + 1), now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 2.0);
    });
  } catch (e) {
    // ignore
  }
};

// Global active audio instance to prevent audio overlap
let activeAdhanAudio: HTMLAudioElement | null = null;

export const stopActiveAdhanAudio = (): void => {
  if (activeAdhanAudio) {
    try {
      activeAdhanAudio.pause();
      activeAdhanAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAdhanAudio = null;
  }
};

/**
 * Play specific Adhan track by ID with volume control and overlap prevention
 */
export const playAdhanTrackById = (trackId: string, customVolume?: number): Promise<boolean> => {
  return new Promise((resolve) => {
    stopActiveAdhanAudio();

    const tracks = getStoredAdhanTracks();
    const track = tracks.find((t) => t.id === trackId);
    if (!track || !track.url) {
      playGentleChime();
      resolve(true);
      return;
    }

    try {
      const audio = new Audio(track.url);
      const settings = getPrayerAlertSettings();
      audio.volume = Math.max(0.1, Math.min(1.0, customVolume ?? settings.volume ?? 0.85));

      activeAdhanAudio = audio;

      audio.onended = () => {
        activeAdhanAudio = null;
        resolve(true);
      };

      audio.onerror = () => {
        console.warn('[Adhan] Failed to stream audio file, falling back to gentle chime.');
        activeAdhanAudio = null;
        playGentleChime();
        resolve(false);
      };

      audio.play().then(() => resolve(true)).catch((err) => {
        console.warn('[Adhan] Browser autoplay restrictions prevented audio:', err);
        playGentleChime();
        resolve(false);
      });
    } catch (e) {
      playGentleChime();
      resolve(false);
    }
  });
};

/**
 * Play Adhan for specific prayer key
 */
export const playPrayerAdhanSound = (prayerKey: string): void => {
  const settings = getPrayerAlertSettings();
  if (!settings.soundEnabled) return;

  // Check individual prayer switch
  if (settings.individualPrayerAlerts && settings.individualPrayerAlerts[prayerKey] === false) {
    return;
  }

  let trackId = settings.defaultAdhanTrackId;
  if (prayerKey === 'bomdod' || prayerKey === 'subh') {
    trackId = settings.bomdodAdhanTrackId || trackId;
  }
  if (settings.perPrayerTracks && settings.perPrayerTracks[prayerKey]) {
    trackId = settings.perPrayerTracks[prayerKey];
  }

  playAdhanTrackById(trackId, settings.volume);
};

/**
 * Request Browser Notification permission
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    import('./fcmClient').then((m) => m.requestFCMToken()).catch(() => {});
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        import('./fcmClient').then((m) => m.requestFCMToken()).catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * Trigger native browser notification
 */
export const triggerBrowserNotification = (
  title: string,
  body: string,
  prayerKey: string = 'peshin'
): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon.ico',
        tag: `asaka_${prayerKey}_${Date.now()}`,
      });
      playPrayerAdhanSound(prayerKey);
    } catch (e) {
      // ignore
    }
  }
};

export const playAdhanAudioTrack = (track: { id: string; url?: string }, customVolume?: number): Promise<boolean> => {
  return playAdhanTrackById(track.id, customVolume);
};

export const isAdhanAudioPlaying = (): boolean => {
  return activeAdhanAudio !== null && !activeAdhanAudio.paused;
};

export const downloadAdhanTrackFile = (track: { id: string; title?: string; url: string }): void => {
  if (!track.url || typeof window === 'undefined') return;
  try {
    const link = document.createElement('a');
    link.href = track.url;
    link.download = `${track.title || track.id}.mp3`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.warn('[Adhan] Download action error:', e);
  }
};
