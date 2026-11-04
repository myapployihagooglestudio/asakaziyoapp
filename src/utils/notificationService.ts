/**
 * ASAKA ZIYO — Notification and Prayer Alert Service
 * Handles Web Notifications API, Web Audio Azan chime, and in-app push broadcasts
 */

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'prayer' | 'announcement' | 'news' | 'system';
  read: boolean;
  priority?: 'normal' | 'high';
}

const STORAGE_KEY = 'asaka_ziyo_notifications';
const PRAYER_SETTINGS_KEY = 'asaka_ziyo_prayer_alert_settings';

export interface PrayerAlertSettings {
  enabled: boolean;
  minutesBefore: number; // 5, 10, 15, 20
  soundEnabled: boolean;
  notifyOnExactTime: boolean;
}

export const DEFAULT_PRAYER_ALERT_SETTINGS: PrayerAlertSettings = {
  enabled: true,
  minutesBefore: 15,
  soundEnabled: true,
  notifyOnExactTime: true,
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
      if (data) return JSON.parse(data);
    }
  } catch (e) {
    // fallback
  }
  return [
    {
      id: 'notif-welcome',
      title: 'Asaka Ziyo tizimiga xush kelibsiz!',
      message: 'Asaka jome masjidi rasmiy mobil va veb portaliga xush kelibsiz. Namoz vaqtlari va Qurʼon qiroatlari yangilandi.',
      timestamp: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      category: 'system',
      read: false,
      priority: 'high',
    },
    {
      id: 'notif-pwa',
      title: 'Ilovani telefonga oʻrnatish',
      message: 'Tezkor kirish uchun "Bosh ekranga qoʻshish" yoki "APK v1.0" orqali ilovani smartfoningizga oʻrnating.',
      timestamp: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      category: 'announcement',
      read: false,
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
 * Web Audio synthetic Azan tone / gentle chime
 */
export const playGentleChime = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic frequencies for gentle meditative Islamic bell
    const freqs = [528, 660, 792, 1056];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2 / (idx + 1), now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 2.0);
    });
  } catch (e) {
    // audio context might be locked or unsupported
  }
};

/**
 * Request Browser Notification permission
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Trigger native browser notification
 */
export const triggerBrowserNotification = (title: string, body: string): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
      playGentleChime();
    } catch (e) {
      // ignore
    }
  }
};
