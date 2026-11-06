/**
 * ASAKA ZIYO — Firebase Cloud Messaging & Push Notification Client
 * Handles service worker registration, FCM token lifecycle, foreground message listener,
 * and device token persistence to Firestore and local storage.
 */

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { app } from './firebaseClient';
import { syncDocToFirestore } from './firebaseClient';
import { triggerBrowserNotification, playGentleChime, saveNotification } from './notificationService';

let messagingInstance: Messaging | null = null;
const FCM_TOKEN_STORAGE_KEY = 'asaka_ziyo_fcm_token';

export interface FCMRegistrationResult {
  supported: boolean;
  permission: NotificationPermission;
  token?: string;
  error?: string;
}

/**
 * Initializes FCM messaging instance if supported by the browser environment
 */
export async function initializeFCM(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('[FCM] Firebase Messaging is not supported in this browser environment.');
      return null;
    }

    messagingInstance = getMessaging(app);

    // Register foreground message listener
    onMessage(messagingInstance, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      const title = payload?.notification?.title || payload?.data?.title || 'ASAKA ZIYO';
      const body = payload?.notification?.body || payload?.data?.body || 'Yangi xabar keldi.';
      const category = (payload?.data?.category as any) || 'announcement';

      // Play soft chime
      playGentleChime();

      // Save to local notifications store
      saveNotification({
        title,
        message: body,
        category,
        priority: 'high',
      });

      // Show native browser notification if granted
      triggerBrowserNotification(title, body);
    });

    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Initialization notice:', err);
    return null;
  }
}

/**
 * Register Service Worker and acquire FCM device push token
 */
export async function requestFCMToken(vapidKey?: string): Promise<FCMRegistrationResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      supported: false,
      permission: 'default',
      error: 'Ushbu brauzerda bildirishnomalar (Notifications API) qoʻllab-quvvatlanmaydi.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      error: 'Foydalanuvchi tomonidan push bildirishnomalari rad etildi.',
    };
  }

  try {
    // Register the FCM service worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] Service Worker registration note:', swErr);
      }
    }

    const messaging = await initializeFCM();
    if (!messaging) {
      return {
        supported: false,
        permission,
        error: 'Firebase Cloud Messaging moduli yuklanmadi.',
      };
    }

    // Get FCM token
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

      // Persist token in Firestore for admin push broadcasting
      const tokenId = `fcm_${token.slice(0, 32)}`;
      await syncDocToFirestore('fcmTokens', tokenId, {
        token,
        platform: /android/i.test(navigator.userAgent)
          ? 'android'
          : /iphone|ipad/i.test(navigator.userAgent)
          ? 'ios'
          : 'web',
        userAgent: navigator.userAgent.slice(0, 150),
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });

      // Also register with server proxy
      try {
        await fetch('/api/notifications/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: 'web' }),
        });
      } catch {
        // ignore
      }

      return {
        supported: true,
        permission,
        token,
      };
    }

    return {
      supported: true,
      permission,
      error: 'FCM token olinmadi.',
    };
  } catch (err: any) {
    console.warn('[FCM] Token acquisition notice:', err);
    return {
      supported: true,
      permission,
      error: err?.message || 'FCM token generatsiyasida xatolik.',
    };
  }
}

export function getStoredFCMToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    }
  } catch {
    // fallback
  }
  return null;
}
