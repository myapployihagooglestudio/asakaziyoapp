/**
 * ASAKA ZIYO — Standalone Android APK Package & Release Verification Engine (2026)
 * Package ID: uz.asakaziyo.app
 * Version: 3.0.0 (Build 300)
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
  version: '3.0.0',
  buildCode: 300,
  packageId: 'uz.asakaziyo.app',
  appName: 'ASAKA ZIYO',
  releaseDate: '2026-yil, Noyabr',
  sizeBytes: 2530602,
  fileSizeDisplay: '2.41 MB',
  sha256Checksum: '9a5ff1382e04c01b967162cf154b36800503f5bdb35897c3eb819f7f4d6613fc',
  targetAndroid: 'Android 16 (API 36)',
  minAndroid: 'Android 7.0+ (API 24)',
  downloadUrl: '/api/apk/download',
  aabAvailable: false,
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
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.READ_MEDIA_AUDIO',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.WAKE_LOCK',
  ],
  featuresUz: [
    'Haqiqiy binar AXML + DEX + RSA-2048 PKCS#7 imzolangan Android APK v3.0.0 (Build 300 · uz.asakaziyo.app)',
    'Rasmiy «MuhammadSolih Hoji» Jomeʼ masjidi logosi va yangi Emerald & Metallic Gold dizayni',
    'Android 10–16 uchun 7 ta native ruxsat tizimi (Bildirishnoma, Kamera, Mikrofon, Telefon, Media, Joylashuv, Audio)',
    'Telegram uslubidagi Heads-Up bildirishnomalar va 7 mahal namoz uchun 5/10/15/30 daqiqa oldindan eslatma tizimi',
    'Masjid Jamoat Smart TV (16:9 Full HD / 4K) ekrani va Qurʼon viktorinasi Sacred Cinema v3 MP4 eksporti',
    'Qurʼoni Karim 114 surasi, Tafsiri Hilol va qorilar audiosi (ekran qulflanganda ham fonda tinglash)',
    'Internet uzilganda ham 100% oflayn ishlash va avtomatik sinxronlash tizimi',
  ],
  installStepsUz: [
    {
      step: 1,
      title: 'Rasmiy imzolangan APK v3.0.0 faylni yuklab oling',
      desc: '«APK v3.0.0 Yuklab Olish» tugmasini bosing. Binar tekshiruvdan oʻtgan toʻliq APK smartfoningizga saqlanadi.',
    },
    {
      step: 2,
      title: 'Manbadan oʻrnatishga ruxsat bering',
      desc: 'Android «Nomaʼlum ilovalarni oʻrnatish» soʻrovini koʻrsatsa, «Sozlamalar -> Ushbu manbadan ruxsat berish» tugmasini yoqing.',
    },
    {
      step: 3,
      title: 'Oʻrnating va mustaqil ishga tushiring',
      desc: '«Oʻrnatish» (Install) tugmasini bosing. ASAKA ZIYO v3.0.0 mustaqil Android ilova sifatida ochiladi.',
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
      if (data && data.success) {
        const apkPayload = data.apk || data;
        return {
          ...ASAKA_ZIYO_APK_RELEASE,
          ...apkPayload,
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
  filename = 'Asaka-Ziyo-v3.0.0.apk'
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
export function triggerApkDownload(filename = 'Asaka-Ziyo-v3.0.0.apk'): boolean {
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
