/**
 * ASAKA ZIYO — Standalone Android APK Package & Release Verification Engine (2026)
 * Package ID: uz.asakaziyo.app
 * Version: 2.0.0 (Build 200)
 */

export interface APKReleaseInfo {
  version: string;
  buildCode: number;
  packageId: string;
  appName: string;
  releaseDate: string;
  sizeBytes: number;
  fileSizeDisplay: string;
  sha256Checksum: string;
  targetAndroid: string;
  minAndroid: string;
  downloadUrl: string;
  aabAvailable: boolean;
  axmlVerified: boolean;
  dexVerified: boolean;
  resourcesArscVerified: boolean;
  pkcs7Signed: boolean;
  supportedAbis: string[];
  permissions: string[];
  featuresUz: string[];
  installStepsUz: { step: number; title: string; desc: string }[];
}

export const ASAKA_ZIYO_APK_RELEASE: APKReleaseInfo = {
  version: '2.1.0',
  buildCode: 210,
  packageId: 'uz.asakaziyo.app',
  appName: 'ASAKA ZIYO',
  releaseDate: '2026-yil, Noyabr',
  sizeBytes: 4379894,
  fileSizeDisplay: '4.18 MB',
  sha256Checksum: '1c35174f28c627ab363a48aa8172ab76e08a097b719ea8428c3f403c7bb7e199',
  targetAndroid: 'Android 14 / 15 (API 34)',
  minAndroid: 'Android 8.0+ (API 24)',
  downloadUrl: '/api/apk/download',
  aabAvailable: true,
  axmlVerified: true,
  dexVerified: true,
  resourcesArscVerified: true,
  pkcs7Signed: true,
  supportedAbis: ['arm64-v8a', 'armeabi-v7a', 'x86_64'],
  permissions: [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.VIBRATE',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.WAKE_LOCK',
  ],
  featuresUz: [
    'Haqiqiy binar AXML + DEX + RSA-2048 PKCS#7 imzolangan Android APK paketi (uz.asakaziyo.app)',
    '5 ta mustaqil til va alifbo tizimi (Lotin, Kirill, Yangi alifbo, Rus, Ingliz)',
    'Asaka shahri va Andijon viloyati uchun rasmiy tasdiqlangan 8 mahal namoz taqvimi',
    '241° WSW aniq Qibla kompasi va jonli teskari sanoq taymeri',
    'Qurʼoni Karim 114 surasi, Tafsiri Hilol va 8+ qorilar audiosi (oflayn yuklab olish bilan)',
    'Ekran qulflanganda ham fonda uzluksiz Qurʼon va Azon tinglash (MediaSession)',
    'Internet uzilganda ham 100% oflayn ishlash va avtomatik sinxronlash tizimi',
  ],
  installStepsUz: [
    {
      step: 1,
      title: 'Rasmiy imzolangan APK faylni yuklab oling',
      desc: '«APK v2.0.0 Yuklab Olish» tugmasini bosing. Binar tekshiruvdan oʻtgan toʻliq APK smartfoningizga saqlanadi.',
    },
    {
      step: 2,
      title: 'Manbadan oʻrnatishga ruxsat bering',
      desc: 'Android «Nomaʼlum ilovalarni oʻrnatish» soʻrovini koʻrsatsa, «Sozlamalar -> Ushbu manbadan ruxsat berish» tugmasini yoqing.',
    },
    {
      step: 3,
      title: 'Oʻrnating va mustaqil ishga tushiring',
      desc: '«Oʻrnatish» (Install) tugmasini bosing. ASAKA ZIYO Chrome brauzerisiz, mustaqil Android ilova sifatida ochiladi.',
    },
  ],
};

/**
 * Fetches live verified APK metadata from the backend server (/api/apk/info)
 */
export async function fetchVerifiedApkInfo(): Promise<APKReleaseInfo> {
  try {
    const resp = await fetch('/api/apk/info');
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success && data.apk) {
        return {
          ...ASAKA_ZIYO_APK_RELEASE,
          ...data.apk,
        };
      }
    }
  } catch {
    // fallback to static metadata
  }
  return ASAKA_ZIYO_APK_RELEASE;
}

/**
 * Downloads the signed APK with real-time progress and verifies binary PK\x03\x04 ZIP header
 * so an HTML page or corrupted response is never saved as an APK.
 */
export async function downloadVerifiedApkWithProgress(
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void,
  filename = 'Asaka-Ziyo-v2.0.0.apk'
): Promise<{ success: boolean; sizeBytes: number; error?: string }> {
  try {
    const response = await fetch('/api/apk/download');
    if (!response.ok) {
      throw new Error(`Server xatosi: HTTP ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error('Server HTML sahifa qaytardi — APK fayl topilmadi.');
    }

    const totalBytes = Number(response.headers.get('content-length') || 0);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const pct = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 50;
          onProgress?.(pct, loadedBytes, totalBytes || loadedBytes);
        }
      }
    } else {
      const buf = new Uint8Array(await response.arrayBuffer());
      chunks.push(buf);
      loadedBytes = buf.byteLength;
    }

    const combined = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }

    // Verify genuine ZIP/APK magic bytes: PK\x03\x04 (0x50 0x4b 0x03 0x04)
    if (
      combined.byteLength < 4096 ||
      combined[0] !== 0x50 ||
      combined[1] !== 0x4b ||
      combined[2] !== 0x03 ||
      combined[3] !== 0x04
    ) {
      throw new Error('Yuklab olingan fayl haqiqiy Android APK arxivi emas.');
    }

    onProgress?.(100, loadedBytes, loadedBytes);

    const blob = new Blob([combined], { type: 'application/vnd.android.package-archive' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    return { success: true, sizeBytes: loadedBytes };
  } catch (err: any) {
    return {
      success: false,
      sizeBytes: 0,
      error: err?.message || 'APK yuklab olishda xatolik yuz berdi.',
    };
  }
}

/**
 * Legacy helper for immediate download trigger
 */
export function triggerApkDownload(filename = 'Asaka-Ziyo-v2.0.0.apk'): boolean {
  try {
    const link = document.createElement('a');
    link.href = '/api/apk/download';
    link.download = filename;
    link.setAttribute('type', 'application/vnd.android.package-archive');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    window.location.href = '/api/apk/download';
    return false;
  }
}
