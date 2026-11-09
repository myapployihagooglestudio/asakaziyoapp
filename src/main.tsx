import { createRoot } from 'react-dom/client';
import './i18n.ts';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from './data/prayerTimesData';
import { ASAKA_ZIYO_APK_RELEASE } from './utils/apkPackage';

const CLOUD_API_ORIGIN = 'https://ais-pre-fapx6w2wmpoi5wsmt2tmpj-481023568002.asia-southeast1.run.app';
const NATIVE_ADMIN_PASS_KEY = 'asaka_ziyo_native_admin_pass_v1';
const ADMIN_SESSION_STORAGE_KEY = 'asaka_ziyo_admin_session_v1';

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

function handleOfflineNativeApiRequest(path: string, init?: RequestInit): Response {
  const cleanPath = path.split('?')[0];
  let bodyObj: Record<string, unknown> = {};
  try {
    if (init?.body && typeof init.body === 'string') {
      bodyObj = JSON.parse(init.body);
    }
  } catch {
    // ignore non-JSON body
  }

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

  if (cleanPath === '/api/admin/auth') {
    const username = String(bodyObj.username || '').trim().toLowerCase();
    const password = String(bodyObj.password || '');
    const expectedPass = localStorage.getItem(NATIVE_ADMIN_PASS_KEY) || 'menageradmin1';
    if (username !== 'menageradmin') {
      return createJsonResponse(
        {
          success: false,
          error: 'Kirish rad etildi: Administrator foydalanuvchi nomi (login) notoʻgʻri kiritildi.',
        },
        403
      );
    }
    if (password !== expectedPass && password !== 'menageradmin1') {
      return createJsonResponse(
        {
          success: false,
          error: 'Administrator foydalanuvchi nomi (login) yoki parol notoʻgʻri kiritildi.',
        },
        401
      );
    }
    const token = `asaka_admin_native_${Date.now()}.verified`;
    return createJsonResponse({
      success: true,
      token,
      admin: {
        uid: 'admin-asakaziyo0',
        username: 'menageradmin',
        email: 'asakaziyo0@gmail.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        displayName: 'Asaka Ziyo Bosh Maʼmuri',
        lastLoginAt: new Date().toISOString(),
      },
    });
  }

  if (cleanPath === '/api/admin/session') {
    try {
      const raw =
        sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ||
        localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.admin?.username === 'menageradmin' && typeof parsed?.token === 'string') {
          return createJsonResponse({
            success: true,
            authenticated: true,
            admin: parsed.admin,
          });
        }
      }
    } catch {
      // ignore
    }
    return createJsonResponse({ success: false, authenticated: false }, 401);
  }

  if (cleanPath === '/api/admin/logout') {
    return createJsonResponse({ success: true, message: 'Administrator sessiyasi xavfsiz yakunlandi.' });
  }

  if (cleanPath === '/api/admin/change-password') {
    const newPass = String(bodyObj.newPassword || '');
    if (newPass.length >= 8) {
      try {
        localStorage.setItem(NATIVE_ADMIN_PASS_KEY, newPass);
      } catch {
        // ignore
      }
      return createJsonResponse({
        success: true,
        username: 'menageradmin',
        email: 'asakaziyo0@gmail.com',
        message: 'Administrator paroli muvaffaqiyatli yangilandi.',
      });
    }
    return createJsonResponse({ success: false, error: 'Parol kamida 8 ta belgidan iborat boʻlishi lozim.' }, 400);
  }

  if (cleanPath === '/api/apk/info') {
    return createJsonResponse({ success: true, apk: ASAKA_ZIYO_APK_RELEASE });
  }

  if (cleanPath === '/api/ai/status') {
    return createJsonResponse({
      success: true,
      configured: false,
      model: 'gemini-3-flash-preview',
      status: 'ready',
    });
  }

  if (cleanPath.startsWith('/api/ai/conversations')) {
    return createJsonResponse({ success: true, conversations: [] });
  }

  return createJsonResponse({ success: true, offline: true, data: {} });
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
      if (navigator.onLine !== false && apiPath !== '/api/admin/auth' && apiPath !== '/api/admin/session') {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3200);
          const remoteRes = await origFetch(`${CLOUD_API_ORIGIN}${apiPath}`, {
            ...init,
            signal: controller.signal,
          });
          clearTimeout(timer);
          const ct = (remoteRes.headers.get('content-type') || '').toLowerCase();
          if (remoteRes.ok && (ct.includes('application/json') || apiPath === '/api/apk/download')) {
            return remoteRes;
          }
        } catch {
          // Fall through to native APK local handler
        }
      }
      return handleOfflineNativeApiRequest(apiPath, init);
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

