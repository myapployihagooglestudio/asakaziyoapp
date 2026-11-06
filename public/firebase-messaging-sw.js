/**
 * ASAKA ZIYO — Firebase Cloud Messaging Service Worker (2026)
 * Handles background push messages, adhan reminders, and notification click navigation.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
  apiKey: "AIzaSyC8VWfdYr4ZIA3wlcPgnoDqgfPp9uiDuM8",
  authDomain: "basic-petal-001dl.firebaseapp.com",
  projectId: "basic-petal-001dl",
  storageBucket: "basic-petal-001dl.firebasestorage.app",
  messagingSenderId: "47567919569",
  appId: "1:47567919569:web:39133ff83f3d7ab919a8f0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  const notificationTitle = payload?.notification?.title || payload?.data?.title || 'ASAKA ZIYO Bildirishnomasi';
  const notificationOptions = {
    body: payload?.notification?.body || payload?.data?.body || 'Asaka jome masjididan yangi maʼlumot.',
    icon: payload?.notification?.icon || '/pwa-192x192.png',
    badge: '/favicon.ico',
    tag: payload?.data?.tag || 'asaka-ziyo-alert',
    data: {
      url: payload?.data?.url || '/',
      tab: payload?.data?.tab || 'notifications',
    },
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
