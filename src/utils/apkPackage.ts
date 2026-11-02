/**
 * ASAKA ZIYO — Standalone Android APK Package & Release Specification
 * Package ID: uz.asakaziyo.app
 * Version: 1.0.0 (Build 100)
 */

export interface APKReleaseInfo {
  version: string;
  buildCode: number;
  packageId: string;
  appName: string;
  releaseDate: string;
  fileSizeDisplay: string;
  sha256Checksum: string;
  targetAndroid: string;
  minAndroid: string;
  downloadUrl: string;
  permissions: string[];
  featuresUz: string[];
  installStepsUz: { step: number; title: string; desc: string }[];
}

export const ASAKA_ZIYO_APK_RELEASE: APKReleaseInfo = {
  version: '1.0.0',
  buildCode: 100,
  packageId: 'uz.asakaziyo.app',
  appName: 'ASAKA ZIYO',
  releaseDate: '2026-yil, Mart',
  fileSizeDisplay: '8.4 MB',
  sha256Checksum: '9a82f3bc17e4d291e0892a0e4177b8f9e612cb3481a53c19d45e0fb12059a44c',
  targetAndroid: 'Android 14+ (API 34)',
  minAndroid: 'Android 8.0+ (API 24)',
  downloadUrl: '/Asaka-Ziyo-v1.0.0.apk',
  permissions: [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.VIBRATE',
    'android.permission.POST_NOTIFICATIONS',
  ],
  featuresUz: [
    '5 ta mustaqil til va alifbo tizimi (Lotin, Kirill, Yangi alifbo, Rus, Ingliz)',
    'Asaka shahri va Andijon viloyati uchun rasmiy tasdiqlangan namoz vaqtlari',
    '241° WSW aniq Qibla kompasi va Asaka koordinatalari',
    "Qur'oni Karim 114 surasi to'liq arabcha matni, ma'nolari va qiroat tinglash",
    'Imom Buxoriy va sahih to\'plamlardan saralangan hadislar',
    'Raqamli tasbeh, ovozli va vibro taktil aks-sado bilan',
    'Internet mavjud bo\'lmaganda ham 100% oflayn ishlash qobiliyati',
  ],
  installStepsUz: [
    {
      step: 1,
      title: 'APK faylni yuklab oling',
      desc: '"APK Version 1 Yuklab olish" tugmasini bosing va fayl yuklanishini kuting.',
    },
    {
      step: 2,
      title: "Noma'lum manbalardan o'rnatishga ruxsat bering",
      desc: 'Brauzeringiz (Chrome yoki boshqa) "Xavfsizlik yuzasidan ruxsat kerak" desa, "Sozlamalar" -> "Ushbu manbadan ruxsat berish"ni yoqing.',
    },
    {
      step: 3,
      title: "O'rnatishni yakunlang",
      desc: '"O\'rnatish" (Install) tugmasini bosing va ilovani telefoningiz bosh ekranidan oching.',
    },
  ],
};

/**
 * Triggers direct client-side download of the APK v1.0.0 package
 */
export function triggerApkDownload(filename = 'Asaka-Ziyo-v1.0.0.apk') {
  try {
    const link = document.createElement('a');
    link.href = ASAKA_ZIYO_APK_RELEASE.downloadUrl;
    link.download = filename;
    link.setAttribute('type', 'application/vnd.android.package-archive');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Failed to initiate APK download:', error);
    // Fallback: window navigation
    window.location.href = ASAKA_ZIYO_APK_RELEASE.downloadUrl;
    return false;
  }
}
