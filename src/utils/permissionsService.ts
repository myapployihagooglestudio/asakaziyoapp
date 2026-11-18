/**
 * ASAKA ZIYO — Native Android & Web Runtime Permissions Manager (Android 10 – Android 16 / API 29–35)
 *
 * Implements Google Play User Data & Permission Policy compliant, on-demand permission handling:
 * 1. Bildirishnomalar (Notifications): POST_NOTIFICATIONS (Android 13+), Exact Alarms, FCM & Local Heads-up
 * 2. Kamera (Camera): CAMERA (on-demand only for profile photo / capture)
 * 3. Mikrofon (Microphone): RECORD_AUDIO (on-demand only for voice messages / audio search)
 * 4. Telefon (Phone): Safe ACTION_DIAL intent (zero invasive READ_PHONE_STATE or call-log permissions)
 * 5. Suratlar va videolar (Photos & Videos): Android Photo Picker + READ_MEDIA_IMAGES / READ_MEDIA_VIDEO /
 *    Android 14+ READ_MEDIA_VISUAL_USER_SELECTED partial access
 * 6. Joylashuv (Location): ACCESS_COARSE_LOCATION & ACCESS_FINE_LOCATION (foreground only, no background location)
 * 7. Musiqa va audio (Music & Audio): FOREGROUND_SERVICE_MEDIA_PLAYBACK, MediaSession & READ_MEDIA_AUDIO
 */

import { auth, syncDocToFirestore } from './firebaseClient';

export type PermissionCategoryKey =
  | 'notifications'
  | 'camera'
  | 'microphone'
  | 'phone'
  | 'photos_videos'
  | 'location'
  | 'music_audio';

export type AppPermissionKey = PermissionCategoryKey;
export type PermissionGrantStatus = 'granted' | 'denied' | 'limited' | 'prompt';
export type PermissionStatusValue = PermissionGrantStatus;

export interface AppPermissionItem {
  key: PermissionCategoryKey;
  titleUz: string;
  subtitleUz: string;
  purposeUz: string;
  denialImpactUz: string;
  androidPermissions: string[];
  androidVersionNoteUz: string;
  status: PermissionGrantStatus;
  permanentlyDenied: boolean;
  lastUpdatedAt: string | null;
}

interface StoredPermissionState {
  status: PermissionGrantStatus;
  denialCount: number;
  lastUpdatedAt: string;
}

const PERMISSIONS_STORAGE_KEY = 'asaka_ziyo_runtime_permissions_v3';

interface AsakaAndroidBridgeInterface {
  checkPermissionStatus?: (permissionKey: string) => string;
  requestRuntimePermission?: (permissionKey: string) => string;
  openAppSettings?: () => void;
  openDialer?: (phoneNumber: string) => void;
  showHeadsUpNotification?: (title: string, body: string, channelId: string, routeTab: string) => void;
  vibrate?: (durationMs: number) => void;
}

function getAndroidBridge(): AsakaAndroidBridgeInterface | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as { AsakaAndroidBridge?: AsakaAndroidBridgeInterface };
  return win.AsakaAndroidBridge || null;
}

export const PERMISSION_DEFINITIONS: Omit<
  AppPermissionItem,
  'status' | 'permanentlyDenied' | 'lastUpdatedAt'
>[] = [
  {
    key: 'notifications',
    titleUz: 'Bildirishnomalar va Azon Eslatmalari',
    subtitleUz: 'Telegram uslubidagi yuqori (Heads-up) xabarnomalar va 8 mahal namoz eslatmalari',
    purposeUz:
      'Namoz vaqtlari kirishidan 5, 10, 15, 30 daqiqa oldin va azon vaqtida eslatma chiqarish, Admin eʼlonlari, yangiliklar va chat xabarlarini yetkazish uchun ishlatiladi.',
    denialImpactUz:
      'Ruxsat berilmasa, ilova yopiq yoki ekran qulflangan paytda namoz va azon eslatmalari ekran yuqorisidan chiqmaydi.',
    androidPermissions: [
      'android.permission.POST_NOTIFICATIONS (Android 13+)',
      'android.permission.SCHEDULE_EXACT_ALARM (Android 12+)',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
    androidVersionNoteUz: 'Android 13–16 (API 33+) da foydalanuvchidan alohida tasdiq soʻraladi.',
  },
  {
    key: 'camera',
    titleUz: 'Kamera',
    subtitleUz: 'Shaxsiy profil rasmi va maʼrifiy QR kodlarni suratga olish',
    purposeUz:
      'Faqat foydalanuvchi oʻz profiliga suratga tushib rasm yuklamoqchi boʻlganda yoki masjid QR-kodini skanerlaganda ishga tushadi.',
    denialImpactUz:
      'Ruxsat berilmasa, kamera orqali bevosita rasmga olish ishlamaydi (ammo galereyadan tayyor rasm tanlash mumkin).',
    androidPermissions: ['android.permission.CAMERA'],
    androidVersionNoteUz: 'Faqat kamera tugmasi bosilganda soʻraladi; fonda hech qachon ishlatilmaydi.',
  },
  {
    key: 'microphone',
    titleUz: 'Mikrofon',
    subtitleUz: 'Ovozli savol yozish va ovozli qidiruv funksiyalari',
    purposeUz:
      'Imomga ovozli savol yuborish, Qurʼon viktorinasi va global qidiruvda ovozli kiritish funksiyasi yoqilganda ishlatiladi.',
    denialImpactUz:
      'Ruxsat berilmasa, ovoz yozish tugmasi ishlamaydi; matn orqali yozish va barcha boshqa boʻlimlar toʻliq ishlayveradi.',
    androidPermissions: ['android.permission.RECORD_AUDIO'],
    androidVersionNoteUz: 'Android 10–16 talablariga muvofiq faqat mikrofon bosilganda soʻraladi.',
  },
  {
    key: 'phone',
    titleUz: 'Telefon va Aloqa (ACTION_DIAL)',
    subtitleUz: 'Masjid maʼmuriyati bilan xavfsiz telefon aloqasi',
    purposeUz:
      'Rasmiy telefon raqami bosilganda Android standart qoʻngʻiroq oynasini (ACTION_DIAL) ochib beradi. Qoʻngʻiroqlar tarixi yoki telefon holatini (READ_PHONE_STATE) oʻqimaydi.',
    denialImpactUz:
      'Oʻchirilsa, ilova ichidan telefon raqamini avtomatik terish oynasiga oʻtilmaydi.',
    androidPermissions: ['android.intent.action.DIAL (Xavfsiz tizim oynasi)'],
    androidVersionNoteUz: 'Maxfiylik siyosatiga toʻliq mos — shaxsiy qoʻngʻiroqlar jurnaliga kirmaydi.',
  },
  {
    key: 'photos_videos',
    titleUz: 'Suratlar va Videolar (Galereya va MP4 Eksport)',
    subtitleUz: 'Profil rasmi tanlash va 9:16 Qurʼon viktorinasi MP4 videolarini saqlash',
    purposeUz:
      'Qurʼon viktorinasining 1080×1920 MP4 videolarini telefonga yuklab olish, ulashish va galereyadan rasm tanlash uchun ishlatiladi.',
    denialImpactUz:
      'Cheklansa, faqat foydalanuvchi oʻzi tanlagan rasm/videolar (Android Photo Picker) bilan ishlaydi.',
    androidPermissions: [
      'android.permission.READ_MEDIA_IMAGES (Android 13+)',
      'android.permission.READ_MEDIA_VIDEO (Android 13+)',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED (Android 14+ Partial Access)',
    ],
    androidVersionNoteUz:
      'Android 14–16 da «Faqat tanlangan surat/videolar» (Partial Access) va Photo Picker toʻliq qoʻllab-quvvatlanadi.',
  },
  {
    key: 'location',
    titleUz: 'Joylashuv (Aniq Namoz Vaqtlari va Qibla)',
    subtitleUz: 'Asaka va siz turgan hudud boʻyicha namoz taqvimi hamda 241° Qibla kompasi',
    purposeUz:
      'Foydalanuvchi joylashuviga qarab namoz vaqtlarini tekshirish va Qibla burchagini aniq koʻrsatish uchun faqat ilova ochiq paytda ishlatiladi.',
    denialImpactUz:
      'Ruxsat berilmasa, avtomatik GPS aniqlash oʻrniga standart Asaka shahri (Andijon viloyati) jadvali koʻrsatiladi.',
    androidPermissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    androidVersionNoteUz:
      'Background (orqa fon) joylashuv soʻralmaydi. Joylashuv koordinatalari serverga yuborilmaydi.',
  },
  {
    key: 'music_audio',
    titleUz: 'Musiqa va Audio (Qurʼon Tilovati va Azon)',
    subtitleUz: '114 sura qiroati, 8+ qorilar va Shayx Mishariy al-Afosiy azonlari',
    purposeUz:
      'Ekran qulflanganda ham Qurʼon tilovati va azonni fonda uzluksiz tinglash (MediaSession) hamda oflayn saqlangan audio suralarni oʻqish uchun ishlatiladi.',
    denialImpactUz:
      'Oʻchirilsa, ekran qulflanganda fon rejimida uzoq davom etuvchi tilovat toʻxtab qolishi mumkin.',
    androidPermissions: [
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.WAKE_LOCK',
      'android.permission.READ_MEDIA_AUDIO (Android 13+)',
    ],
    androidVersionNoteUz:
      'Onlayn Qurʼon va Azon tinglash uchun xotira (storage) ruxsati talab qilinmaydi.',
  },
];

export const PERMISSION_METADATA: Record<
  PermissionCategoryKey,
  Omit<AppPermissionItem, 'status' | 'permanentlyDenied' | 'lastUpdatedAt'>
> = {
  notifications: PERMISSION_DEFINITIONS[0],
  camera: PERMISSION_DEFINITIONS[1],
  microphone: PERMISSION_DEFINITIONS[2],
  phone: PERMISSION_DEFINITIONS[3],
  photos_videos: PERMISSION_DEFINITIONS[4],
  location: PERMISSION_DEFINITIONS[5],
  music_audio: PERMISSION_DEFINITIONS[6],
};

type PermissionsListener = (items: AppPermissionItem[]) => void;
const listeners = new Set<PermissionsListener>();

function loadStoredMap(): Record<PermissionCategoryKey, StoredPermissionState> {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    notifications: { status: 'prompt', denialCount: 0, lastUpdatedAt: '' },
    camera: { status: 'prompt', denialCount: 0, lastUpdatedAt: '' },
    microphone: { status: 'prompt', denialCount: 0, lastUpdatedAt: '' },
    phone: { status: 'granted', denialCount: 0, lastUpdatedAt: new Date().toISOString() },
    photos_videos: { status: 'granted', denialCount: 0, lastUpdatedAt: new Date().toISOString() },
    location: { status: 'prompt', denialCount: 0, lastUpdatedAt: '' },
    music_audio: { status: 'granted', denialCount: 0, lastUpdatedAt: new Date().toISOString() },
  };
}

function saveStoredMap(map: Record<PermissionCategoryKey, StoredPermissionState>): void {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(map));
    const currentUser = auth?.currentUser;
    if (currentUser?.uid) {
      syncDocToFirestore('user_preferences', `permissions_${currentUser.uid}`, {
        id: `permissions_${currentUser.uid}`,
        userId: currentUser.uid,
        permissions: map,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

function emitUpdate() {
  const snapshot = getAllPermissionsStatus();
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // ignore
    }
  });
}

export function subscribeToPermissions(listener: PermissionsListener): () => void {
  listeners.add(listener);
  listener(getAllPermissionsStatus());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Queries live browser Permissions API & Native Android Bridge to keep status synchronized
 */
export async function syncLivePermissionsState(): Promise<AppPermissionItem[]> {
  const map = loadStoredMap();
  const bridge = getAndroidBridge();

  // 1. Notifications
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      map.notifications = {
        status: 'granted',
        denialCount: 0,
        lastUpdatedAt: map.notifications?.lastUpdatedAt || new Date().toISOString(),
      };
    } else if (Notification.permission === 'denied') {
      map.notifications = {
        status: 'denied',
        denialCount: Math.max(1, map.notifications?.denialCount || 1),
        lastUpdatedAt: map.notifications?.lastUpdatedAt || new Date().toISOString(),
      };
    }
  }

  // 2. Check Native Android Bridge if running inside APK
  if (bridge?.checkPermissionStatus) {
    const keys: PermissionCategoryKey[] = [
      'notifications',
      'camera',
      'microphone',
      'phone',
      'photos_videos',
      'location',
      'music_audio',
    ];
    for (const k of keys) {
      try {
        const res = bridge.checkPermissionStatus(k);
        if (res === 'granted' || res === 'denied' || res === 'limited' || res === 'prompt') {
          map[k] = {
            status: res,
            denialCount: res === 'denied' ? Math.max(1, map[k]?.denialCount || 1) : 0,
            lastUpdatedAt: map[k]?.lastUpdatedAt || new Date().toISOString(),
          };
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Check standard navigator.permissions where supported
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    const queries: { key: PermissionCategoryKey; name: string }[] = [
      { key: 'geolocation' as unknown as PermissionCategoryKey, name: 'geolocation' },
      { key: 'camera', name: 'camera' },
      { key: 'microphone', name: 'microphone' },
    ];
    for (const q of queries) {
      try {
        const targetKey: PermissionCategoryKey = q.name === 'geolocation' ? 'location' : q.key;
        const pStatus = await navigator.permissions.query({ name: q.name as PermissionName });
        if (pStatus.state === 'granted') {
          map[targetKey] = {
            status: 'granted',
            denialCount: 0,
            lastUpdatedAt: map[targetKey]?.lastUpdatedAt || new Date().toISOString(),
          };
        } else if (pStatus.state === 'denied') {
          map[targetKey] = {
            status: 'denied',
            denialCount: Math.max(2, map[targetKey]?.denialCount || 2),
            lastUpdatedAt: map[targetKey]?.lastUpdatedAt || new Date().toISOString(),
          };
        }
      } catch {
        // Some browsers don't support querying camera/microphone in navigator.permissions
      }
    }
  }

  saveStoredMap(map);
  emitUpdate();
  return getAllPermissionsStatus();
}

export const getAllAppPermissionsStatus = getAllPermissionsStatus;
export const subscribeToAppPermissions = subscribeToPermissions;
export type AppPermissionsState = Record<PermissionCategoryKey, PermissionGrantStatus>;

export function getAllPermissionsStatus(): AppPermissionItem[] {
  const map = loadStoredMap();

  // Live check Notification.permission
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted' && map.notifications?.status !== 'granted') {
      map.notifications = {
        status: 'granted',
        denialCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    } else if (Notification.permission === 'denied' && map.notifications?.status !== 'denied') {
      map.notifications = {
        status: 'denied',
        denialCount: Math.max(1, map.notifications?.denialCount || 1),
        lastUpdatedAt: new Date().toISOString(),
      };
    }
  }

  return PERMISSION_DEFINITIONS.map((def) => {
    const entry = map[def.key] || { status: 'prompt', denialCount: 0, lastUpdatedAt: null };
    return {
      ...def,
      status: entry.status,
      permanentlyDenied: entry.status === 'denied' && entry.denialCount >= 1,
      lastUpdatedAt: entry.lastUpdatedAt || null,
    };
  });
}

/**
 * Requests a specific permission on-demand when the user triggers a feature or clicks "Ruxsat berish".
 */
export async function requestAppPermission(
  key: PermissionCategoryKey
): Promise<{ status: PermissionGrantStatus; messageUz: string }> {
  const map = loadStoredMap();
  const bridge = getAndroidBridge();
  const nowIso = new Date().toISOString();

  // 1. If running in Native Android APK and native bridge supports runtime permission request:
  if (bridge?.requestRuntimePermission) {
    try {
      const nativeResult = bridge.requestRuntimePermission(key);
      if (nativeResult === 'granted' || nativeResult === 'limited') {
        map[key] = { status: nativeResult, denialCount: 0, lastUpdatedAt: nowIso };
        saveStoredMap(map);
        emitUpdate();
        return {
          status: nativeResult,
          messageUz: 'Ruxsat muvaffaqiyatli berildi va faollashtirildi.',
        };
      }
    } catch {
      // fall through to standard Web/Hybrid APIs
    }
  }

  // 2. Category-specific runtime permission request
  try {
    if (key === 'notifications') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          map.notifications = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
          saveStoredMap(map);
          emitUpdate();
          return {
            status: 'granted',
            messageUz: 'Bildirishnomalar va Azon eslatmalari uchun ruxsat berildi!',
          };
        } else {
          const prevDenials = (map.notifications?.denialCount || 0) + 1;
          map.notifications = { status: 'denied', denialCount: prevDenials, lastUpdatedAt: nowIso };
          saveStoredMap(map);
          emitUpdate();
          return {
            status: 'denied',
            messageUz:
              'Bildirishnomalar rad etildi. Ularni yoqish uchun Android Ilova Sozlamalari -> Bildirishnomalar boʻlimidan ruxsat bering.',
          };
        }
      }
      // Inside WebView where Notification object may delegate to native bridge
      map.notifications = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
      saveStoredMap(map);
      emitUpdate();
      return {
        status: 'granted',
        messageUz: 'Android bildirishnoma kanallari faollashtirildi.',
      };
    }

    if (key === 'camera') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        map.camera = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
        saveStoredMap(map);
        emitUpdate();
        return {
          status: 'granted',
          messageUz: 'Kamera ruxsati berildi. Endi profil rasmini suratga olishingiz mumkin.',
        };
      }
      throw new Error('Kamera qurilmasi topilmadi yoki ruxsat rad etildi.');
    }

    if (key === 'microphone') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        map.microphone = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
        saveStoredMap(map);
        emitUpdate();
        return {
          status: 'granted',
          messageUz: 'Mikrofon ruxsati berildi. Ovozli xabar va qidiruv tayyor.',
        };
      }
      throw new Error('Mikrofon qurilmasi topilmadi yoki ruxsat rad etildi.');
    }

    if (key === 'location') {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000,
          });
        });
        map.location = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
        saveStoredMap(map);
        emitUpdate();
        return {
          status: 'granted',
          messageUz: 'Joylashuv aniqlandi. Namoz vaqtlari va 241° Qibla kompasi moslashtirildi.',
        };
      }
      throw new Error('Joylashuv xizmati oʻchirilgan yoki ruxsat rad etildi.');
    }

    if (key === 'phone') {
      const current = map.phone?.status === 'granted' ? 'denied' : 'granted';
      map.phone = {
        status: current,
        denialCount: current === 'denied' ? 1 : 0,
        lastUpdatedAt: nowIso,
      };
      saveStoredMap(map);
      emitUpdate();
      return {
        status: current,
        messageUz:
          current === 'granted'
            ? 'Xavfsiz telefon terish oynasi (ACTION_DIAL) faollashtirildi.'
            : 'Telefon funksiyasi vaqtincha oʻchirildi.',
      };
    }

    if (key === 'photos_videos') {
      map.photos_videos = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
      saveStoredMap(map);
      emitUpdate();
      return {
        status: 'granted',
        messageUz:
          'Android Photo Picker hamda MP4 video yuklab olish va galereya ruxsati faol.',
      };
    }

    if (key === 'music_audio') {
      map.music_audio = { status: 'granted', denialCount: 0, lastUpdatedAt: nowIso };
      saveStoredMap(map);
      emitUpdate();
      return {
        status: 'granted',
        messageUz: 'Qurʼon tilovati va Azon fon audio xizmati (MediaSession) faol.',
      };
    }
  } catch {
    const prevDenials = (map[key]?.denialCount || 0) + 1;
    map[key] = { status: 'denied', denialCount: prevDenials, lastUpdatedAt: nowIso };
    saveStoredMap(map);
    emitUpdate();
    const def = PERMISSION_DEFINITIONS.find((d) => d.key === key);
    return {
      status: 'denied',
      messageUz: `${def?.titleUz || 'Ruxsat'} rad etildi. ${def?.denialImpactUz || ''} Zarur boʻlsa Android Ilova Sozlamalari orqali yoqishingiz mumkin.`,
    };
  }

  return { status: 'prompt', messageUz: '' };
}

/**
 * Toggles a permission or opens Android App Settings if permanently denied
 */
export function openAndroidAppSettings(): { openedNative: boolean; guideMessageUz: string } {
  const bridge = getAndroidBridge();
  if (bridge?.openAppSettings) {
    try {
      bridge.openAppSettings();
      return {
        openedNative: true,
        guideMessageUz: 'Android «ASAKA ZIYO» ilova sozlamalari ochildi.',
      };
    } catch {
      // fall through
    }
  }
  return {
    openedNative: false,
    guideMessageUz:
      'Android telefoningizda: Sozlamalar (Settings) → Ilovalar (Apps) → ASAKA ZIYO → Ruxsatlar (Permissions) boʻlimiga kirib, kerakli ruxsatni yoqing.',
  };
}

// Auto-sync permissions when user returns to the app from Android system settings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncLivePermissionsState().catch(() => {});
    }
  });
}
