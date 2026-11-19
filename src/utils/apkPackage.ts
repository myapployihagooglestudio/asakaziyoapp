/**
 * ASAKA ZIYO — Standalone Android APK Package & Release Verification Engine (2026)
 * Package ID: uz.asakaziyo.app
 * Version: 4.0.0 (Build 400)
 */

export interface APKReleaseInfo {
  version: string;
  buildCode: number;
  packageId: string;
  appName: string;
  releaseDate: string;
  apkFilename: string;
  aabFilename: string;
  apkAvailable: boolean;
  aabAvailable: boolean;
  signed: boolean;
  status?: 'ready' | 'awaiting_ci_artifact';
  statusMessageUz?: string;
  sizeBytes: number;
  fileSizeDisplay: string;
  sha256Checksum: string;
  targetAndroid: string;
  minAndroid: string;
  downloadUrl: string;
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
  version: '4.0.0',
  buildCode: 400,
  packageId: 'uz.asakaziyo.app',
  appName: 'ASAKA ZIYO',
  releaseDate: '2026-11-19',
  apkFilename: 'Asaka-Ziyo-v4.0.0.apk',
  aabFilename: 'Asaka-Ziyo-v4.0.0.aab',
  apkAvailable: false,
  aabAvailable: false,
  signed: false,
  status: 'awaiting_ci_artifact',
  statusMessageUz:
    'ASAKA ZIYO v4.0.0 (Build 400) Android manba kodi va CI/CD tizimi tayyor. Imzolangan APK serverga yuklangach, yuklab olish tugmasi avtomatik faollashadi.',
  sizeBytes: 0,
  fileSizeDisplay: 'CI/CD orqali yigʻilmoqda',
  sha256Checksum: '',
  targetAndroid: 'Android 16 (API 36)',
  minAndroid: 'Android 7.0+ (API 24)',
  downloadUrl: '/api/apk/download',
  axmlVerified: false,
  dexVerified: false,
  resourcesArscVerified: false,
  pkcs7Signed: false,
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
    'ASAKA ZIYO v4.0.0 (Build 400 · uz.asakaziyo.app) — Android 7.0–16 (API 24–36) uchun toʻliq qayta tiklangan native Gradle build tizimi',
    'Rasmiy «MuhammadSolih Hoji» Jomeʼ masjidi muhr logosi asosida yagona Web, PWA va Android Adaptive Icon (66% safe-zone) tizimi',
    'Android 12+ SplashScreen API, monoxrom status-bar bildirishnoma ikonkasi va chuqur havolalar (Deep Link) marshrutizatsiyasi',
    'R8/ProGuard himoyasi bilan toʻliq ishlovchi AsakaNativeBridge (ruxsatlar, aniq namoz budilniklari, ulashish, vibratsiya)',
    'Masjid Jamoat Smart TV (10 ta premium dizayn) va Qurʼon viktorinasi MP4 video eksporti',
    'Qurʼoni Karim 114 surasi, Tafsiri Hilol va qorilar audiosi (Media3 fonda ijro + 100% oflayn ishlash)',
  ],
  installStepsUz: [
    {
      step: 1,
      title: 'Rasmiy imzolangan APK v4.0.0 faylni yuklab oling',
      desc: '«Rasmiy APK v4.0.0 Yuklab Olish» tugmasini bosing. Binar tekshiruvdan oʻtgan toʻliq APK smartfoningizga saqlanadi.',
    },
    {
      step: 2,
      title: 'Manbadan oʻrnatishga ruxsat bering',
      desc: 'Android «Nomaʼlum ilovalarni oʻrnatish» soʻrovini koʻrsatsa, «Sozlamalar -> Ushbu manbadan ruxsat berish» tugmasini yoqing.',
    },
    {
      step: 3,
      title: 'Yangilang yoki toza oʻrnating',
      desc: '«Oʻrnatish» (Install / Update) tugmasini bosing. Mavjud uz.asakaziyo.app foydalanuvchilari maʼlumotlarni yoʻqotmasdan v4.0.0 ga oʻtadi.',
    },
  ],
};

/**
 * Fetches live verified APK metadata from the backend server (/api/apk/info)
 */
export async function fetchVerifiedApkInfo(): Promise<APKReleaseInfo> {
  try {
    const resp = await fetch('/api/apk/info', { cache: 'no-store' });
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
    // fallback to honest static metadata (apkAvailable: false)
  }
  return ASAKA_ZIYO_APK_RELEASE;
}

/**
 * Downloads the signed APK with real-time progress and verifies binary PK\x03\x04 ZIP header
 * so an HTML page, JSON 404, or corrupted response is never saved as an APK.
 */
export async function downloadVerifiedApkWithProgress(
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void,
  filename = 'Asaka-Ziyo-v4.0.0.apk'
): Promise<{ success: boolean; sizeBytes: number; error?: string }> {
  try {
    const response = await fetch('/api/apk/download', { cache: 'no-store' });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errBody = await response.json().catch(() => null);
        throw new Error(
          errBody?.error ||
            `ASAKA ZIYO v4.0.0 APK fayli hali serverda mavjud emas (HTTP ${response.status}).`
        );
      }
      throw new Error(`Server xatosi: HTTP ${response.status}`);
    }

    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('Server haqiqiy APK fayl oʻrniga matn/HTML qaytardi — yuklab olish toʻxtatildi.');
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
      combined.byteLength < 65536 ||
      combined[0] !== 0x50 ||
      combined[1] !== 0x4b ||
      combined[2] !== 0x03 ||
      combined[3] !== 0x04
    ) {
      throw new Error('Yuklab olingan fayl haqiqiy Android APK arxivi emas (ZIP/APK sarlavhasi tasdiqlanmadi).');
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
 * Verified download helper (checks availability & binary magic bytes before saving)
 */
export async function triggerApkDownload(filename = 'Asaka-Ziyo-v4.0.0.apk'): Promise<{ success: boolean; error?: string }> {
  const result = await downloadVerifiedApkWithProgress(undefined, filename);
  return { success: result.success, error: result.error };
}
