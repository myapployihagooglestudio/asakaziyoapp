import { createRoot } from 'react-dom/client';
import './i18n.ts';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from './data/prayerTimesData';
import { ASAKA_ZIYO_APK_RELEASE } from './utils/apkPackage';

const CLOUD_API_ORIGIN: string = (
  (import.meta as any).env?.VITE_API_BASE_URL || 'https://asakaziyo.ai.studio'
).replace(/\/+$/, '');

function isRunningInNativeAndroidApk(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { AsakaAndroidBridge?: unknown }).AsakaAndroidBridge ||
      window.location.hostname === 'appassets.androidplatform.net' ||
      window.location.protocol === 'file:'
  );
}

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function handleOfflineNativeApiRequest(path: string): Response {
  const cleanPath = path.split('?')[0];

  if (cleanPath === '/api/health') {
    return createJsonResponse({
      status: 'ok',
      app: 'ASAKA ZIYO',
      mode: 'native_android_apk',
      serverTime: new Date().toISOString(),
      firestoreReady: true,
    });
  }

  if (cleanPath === '/api/database') {
    let savedSchedule = INITIAL_ASAKA_PRAYER_SCHEDULE;
    let savedArticles: unknown[] = [];
    let savedMedia: unknown[] = [];
    let savedHadiths: unknown[] = [];
    let savedDhikrs: unknown[] = [];
    let savedNotifications: unknown[] = [];

    try {
      const rawSchedule = localStorage.getItem('asaka_ziyo_db_prayer_v5_admin') || localStorage.getItem('asaka_ziyo_prayer_schedule');
      if (rawSchedule) {
        const parsed = JSON.parse(rawSchedule);
        if (parsed && Array.isArray(parsed.times)) savedSchedule = parsed;
      }
      const rawArticles = localStorage.getItem('asaka_ziyo_db_articles_v5_admin');
      if (rawArticles) {
        const parsed = JSON.parse(rawArticles);
        if (Array.isArray(parsed)) savedArticles = parsed;
      }
      const rawMedia = localStorage.getItem('asaka_ziyo_db_media_posts_v5_admin');
      if (rawMedia) {
        const parsed = JSON.parse(rawMedia);
        if (Array.isArray(parsed)) savedMedia = parsed;
      }
      const rawHadiths = localStorage.getItem('asaka_ziyo_db_hadiths_v5_admin');
      if (rawHadiths) {
        const parsed = JSON.parse(rawHadiths);
        if (Array.isArray(parsed)) savedHadiths = parsed;
      }
      const rawDhikrs = localStorage.getItem('asaka_ziyo_db_dhikrs_v5_admin');
      if (rawDhikrs) {
        const parsed = JSON.parse(rawDhikrs);
        if (Array.isArray(parsed)) savedDhikrs = parsed;
      }
      const rawNotifications = localStorage.getItem('asaka_ziyo_db_notifications_v5_admin');
      if (rawNotifications) {
        const parsed = JSON.parse(rawNotifications);
        if (Array.isArray(parsed)) savedNotifications = parsed;
      }
    } catch {
      // fallback to initial
    }

    return createJsonResponse({
      success: true,
      data: {
        prayerSchedule: savedSchedule,
        articles: savedArticles,
        mediaPosts: savedMedia,
        hadiths: savedHadiths,
        dhikrs: savedDhikrs,
        notifications: savedNotifications,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  if (cleanPath === '/api/admin/session') {
    return createJsonResponse({ success: false, authenticated: false }, 401);
  }

  if (cleanPath === '/api/admin/logout') {
    return createJsonResponse({ success: true, message: 'Administrator sessiyasi yakunlandi.' });
  }

  if (
    cleanPath.startsWith('/api/admin/') ||
    cleanPath === '/api/ugc/report' ||
    cleanPath === '/api/user/delete-account'
  ) {
    return createJsonResponse(
      {
        success: false,
        offline: true,
        error: 'Ushbu amal uchun internet aloqasi va rasmiy server ulanishi talab qilinadi.',
      },
      503
    );
  }

  if (cleanPath === '/api/apk/info') {
    return createJsonResponse({ success: true, apk: ASAKA_ZIYO_APK_RELEASE });
  }

  if (cleanPath === '/api/ai/status') {
    return createJsonResponse({
      success: true,
      configured: false,
      model: 'gemini-3-flash-preview',
      status: 'offline',
    });
  }

  if (cleanPath.startsWith('/api/ai/conversations')) {
    return createJsonResponse({ success: true, conversations: [] });
  }

  return createJsonResponse({ success: false, offline: true, data: {} }, 503);
}

if (typeof window !== 'undefined' && isRunningInNativeAndroidApk()) {
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Intercept relative /api/*, ./api/*, file:///api/*, or appassets.androidplatform.net/api/* calls inside Android APK
    let apiPath: string | null = null;
    if (urlStr.startsWith('/api/')) {
      apiPath = urlStr;
    } else if (urlStr.startsWith('./api/')) {
      apiPath = urlStr.slice(1);
    } else if (urlStr.startsWith('file:///api/')) {
      apiPath = urlStr.slice('file://'.length);
    } else if (urlStr.includes('appassets.androidplatform.net/api/')) {
      apiPath = urlStr.slice(urlStr.indexOf('/api/'));
    }

    if (apiPath) {
      if (navigator.onLine !== false && CLOUD_API_ORIGIN.startsWith('https://')) {
        try {
          const isLongRunningMediaRoute =
            apiPath.startsWith('/api/quran-quiz/') || apiPath.startsWith('/api/apk/download');
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), isLongRunningMediaRoute ? 120000 : 8000);
          const remoteRes = await origFetch(`${CLOUD_API_ORIGIN}${apiPath}`, {
            ...init,
            signal: controller.signal,
          });
          clearTimeout(timer);
          const ct = (remoteRes.headers.get('content-type') || '').toLowerCase();
          if (
            remoteRes.ok &&
            !ct.includes('text/html') &&
            (ct.includes('application/json') ||
              ct.includes('video/mp4') ||
              ct.includes('video/') ||
              ct.includes('audio/') ||
              ct.includes('application/octet-stream') ||
              apiPath.startsWith('/api/apk/download') ||
              apiPath.startsWith('/api/quran-quiz/'))
          ) {
            return remoteRes;
          }
          if (ct.includes('application/json')) {
            return remoteRes;
          }
        } catch {
          // Fall through to native APK offline handler
        }
      }
      return handleOfflineNativeApiRequest(apiPath);
    }

    return origFetch(input, init);
  };

  // Normalize root-relative local asset paths (/images/*, /pwa-*, /icon.svg) on file:///android_asset/public/index.html
  if (window.location.protocol === 'file:' && typeof document !== 'undefined') {
    const normalizeImgElement = (el: Element) => {
      if (el.tagName !== 'IMG') return;
      const rawAttr = el.getAttribute('src');
      if (
        rawAttr &&
        (rawAttr.startsWith('/images/') ||
          rawAttr.startsWith('/assets/aistudio/') ||
          rawAttr.startsWith('/pwa-') ||
          rawAttr === '/icon.svg' ||
          rawAttr === '/apple-touch-icon.png')
      ) {
        el.setAttribute('src', `.${rawAttr}`);
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof Element) {
          normalizeImgElement(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              normalizeImgElement(node);
              node.querySelectorAll('img').forEach(normalizeImgElement);
            }
          });
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });
    }
  }
}

// Auto-register service worker ONLY on standard web/PWA origins (never inside native Android APK where assets are locally bundled)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  !isRunningInNativeAndroidApk() &&
  window.location.protocol.startsWith('http')
) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('[PWA] ASAKA ZIYO offline cache ready');
      },
      onNeedRefresh() {
        console.log('[PWA] ASAKA ZIYO new update detected — refreshing to latest bundle');
        updateSW(true);
      },
    });
  } catch {
    // ignore SW registration failure in restricted environments
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

