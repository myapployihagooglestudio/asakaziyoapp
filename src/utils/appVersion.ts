/**
 * ASAKA ZIYO — CENTRAL APPLICATION BUILD VERSION & RELEASE SYSTEM (2026)
 *
 * Tracks:
 * - App Version (SemVer: 4.0.0)
 * - Build Number (versionCode: 400)
 * - Git Commit & Build Date
 * - Runtime Platform ('web' | 'pwa' | 'android_apk')
 * - In-App Update Verification against Server (/api/apk/info)
 */

export type AppPlatform = 'web' | 'pwa' | 'android_apk';

export interface AppBuildInfo {
  appVersion: string;
  buildNumber: number;
  gitCommit: string;
  buildDate: string;
  platform: AppPlatform;
  appName: string;
  packageId: string;
  releaseNotesUz: string[];
}

export function detectCurrentPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';

  // 1. Android APK Native WebView
  if (
    Boolean((window as unknown as { AsakaAndroidBridge?: unknown }).AsakaAndroidBridge) ||
    window.location.hostname === 'appassets.androidplatform.net' ||
    window.location.protocol === 'file:'
  ) {
    return 'android_apk';
  }

  // 2. Installed Progressive Web App (PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isStandalone) {
    return 'pwa';
  }

  // 3. Standard Mobile or Desktop Web Browser
  return 'web';
}

export const CURRENT_APP_BUILD_INFO: AppBuildInfo = {
  appVersion: '5.0.0',
  buildNumber: 500,
  gitCommit: 'main-release-20261125-v500',
  buildDate: '2026-11-25',
  platform: typeof window !== 'undefined' ? detectCurrentPlatform() : 'web',
  appName: 'ASAKA ZIYO',
  packageId: 'uz.asakaziyo.app',
  releaseNotesUz: [
    'ASAKA ZIYO v5.0.0 (Build 500) — Kotlin, Jetpack Compose, Material 3 va MVVM asosida butunlay qayta qurilgan yangi avlod native Android ilovasi.',
    '5 ta native boʻlim (Home, Qurʼon, Oʻrganish, Audio, Profil), Madina Mushaf, Media3 fon pleeri va SHA-256 oflayn yuklab olish menejeri.',
    '4 ta uy ekrani vidjeti, 4 ta tezkor Launcher App Shortcut, BiometricPrompt qulfi va 5 tilli mahalliylashtirish.',
    'Web App, Telegram Bot va Android ilovasi boʻylab yagona Free/Premium obuna tizimi (26 ta funksiya, 17 ta modul).',
    'Global namoz vaqtlari (Asaka MANUAL_ADMIN + 14 hudud + Jahon AUTO) va Open-Meteo ob-havo integratsiyasi.',
  ],
};

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isPlatformApk: boolean;
  currentVersion: string;
  currentBuildNumber: number;
  latestVersion?: string;
  latestBuildNumber?: number;
  downloadUrl?: string;
  fileSizeDisplay?: string;
  releaseDate?: string;
  releaseNotesUz?: string[];
  error?: string;
}

/**
 * Checks for new releases against the server (/api/apk/info)
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentPlatform = detectCurrentPlatform();
  const currentBuild = CURRENT_APP_BUILD_INFO.buildNumber;
  const currentVer = CURRENT_APP_BUILD_INFO.appVersion;

  try {
    const res = await fetch('/api/apk/info', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Server xatosi: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data || !data.success) {
      throw new Error(data?.error || 'Versiya maʼlumotlari olinmadi.');
    }

    const serverBuild = typeof data.buildCode === 'number' ? data.buildCode : parseInt(data.buildCode || '0', 10);
    const serverVer = data.version || '5.0.0';
    const hasUpdate = Boolean(data.apkAvailable) && serverBuild > currentBuild;

    return {
      hasUpdate,
      isPlatformApk: currentPlatform === 'android_apk',
      currentVersion: currentVer,
      currentBuildNumber: currentBuild,
      latestVersion: serverVer,
      latestBuildNumber: serverBuild,
      downloadUrl: data.downloadUrl || '/api/apk/download',
      fileSizeDisplay: data.fileSizeDisplay || 'Tayyorlanmoqda',
      releaseDate: data.releaseDate,
      releaseNotesUz: CURRENT_APP_BUILD_INFO.releaseNotesUz,
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      isPlatformApk: currentPlatform === 'android_apk',
      currentVersion: currentVer,
      currentBuildNumber: currentBuild,
      error: err?.message || 'Yangilanishni tekshirishda xatolik yuz berdi.',
    };
  }
}
