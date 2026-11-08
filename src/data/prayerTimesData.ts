import { PrayerSchedule, PrayerTimeEntry } from '../types';

export const INITIAL_ASAKA_PRAYER_SCHEDULE: PrayerSchedule = {
  date: '2026-11-02',
  formattedDateUz: '2-Noyabr, Dushanba, 2026',
  hijriDate: '22 Jumodul avval, 1448',
  location: 'Asaka shahri, Andijon viloyati',
  qiblaAngleDeg: 241, // West-South-West from Asaka (40.6415° N, 72.2387° E)
  timezone: 'Asia/Tashkent',
  isAdministratorPublished: false, // Strict requirement: sample/preview data until published by admin
  publishedBy: 'Asaka Jome Masjidi Maʼmuriyati (Kutilmoqda)',
  verifiedAt: undefined,
  disclaimer:
    'DIQQAT: Ushbu jadval Phase 1 bosqichidagi koʻrgazmali namuna (preview) hisoblanadi. Namoz vaqtlari Oʻzbekiston musulmonlari idorasi va Asaka masjidi masʼul maʼmurlari tomonidan tasdiqlanib kiritiladi. Fiqhiy hisob-kitoblar OʻMI meʼyorlariga muvofiq kiritilishi rejalashtirilgan.',
  times: [
    {
      id: 'p-0',
      key: 'tahajjud',
      nameUz: 'Tahajjud',
      nameAr: 'التَّهَجُّد',
      time: '03:45',
      descriptionUz: 'Kechasi uyqudan uygʻonib oʻqiladigan qimmatli nafl namozi',
    },
    {
      id: 'p-01',
      key: 'subh',
      nameUz: 'Subh (Saharlik)',
      nameAr: 'الصُّبْح',
      time: '04:40',
      descriptionUz: 'Subhi sodiq kirishi, saharlik (imsoq) toʻxtash vaqti',
    },
    {
      id: 'p-1',
      key: 'bomdod',
      nameUz: 'Bomdod',
      nameAr: 'الفَجْر',
      time: '05:22',
      iqamahTime: '05:50',
      descriptionUz: 'Tong yorishishidan quyosh chiqishigacha boʻlgan vaqt',
    },
    {
      id: 'p-2',
      key: 'quyosh',
      nameUz: 'Quyosh',
      nameAr: 'الشُّرُوق',
      time: '06:46',
      descriptionUz: 'Quyosh koʻtarilishi (namoz oʻqish makruh boʻlgan vaqt)',
    },
    {
      id: 'p-3',
      key: 'peshin',
      nameUz: 'Peshin',
      nameAr: 'الظُّهْر',
      time: '12:05',
      iqamahTime: '12:25',
      descriptionUz: 'Quyosh tikkadan oqqandan asrgacha boʻlgan vaqt',
    },
    {
      id: 'p-4',
      key: 'asr',
      nameUz: 'Asr',
      nameAr: 'العَصْر',
      time: '15:10',
      iqamahTime: '15:30',
      descriptionUz: 'Har bir narsaning soyasi oʻziga teng boʻlgandan quyosh botguncha',
    },
    {
      id: 'p-5',
      key: 'shom',
      nameUz: 'Shom',
      nameAr: 'المَغْرِب',
      time: '17:21',
      iqamahTime: '17:26',
      descriptionUz: 'Quyosh toʻliq botgandan soʻnggi shafaq yoʻqolguncha',
    },
    {
      id: 'p-6',
      key: 'xufton',
      nameUz: 'Xufton',
      nameAr: 'العِشَاء',
      time: '18:42',
      iqamahTime: '19:05',
      descriptionUz: 'Qizil shafaq botgandan soʻnggi tong otguncha boʻlgan vaqt',
    },
  ],
};

// Monthly calendar schedule for 30 days of the month for Asaka region
export const MONTHLY_CALENDAR_PREVIEW = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const shift = Math.floor(day * 0.7);
  const subhMin = (40 + shift) % 60;
  const bomdodMin = (22 + shift) % 60;
  const quyoshMin = (46 + shift) % 60;
  const asrMin = Math.max(0, 10 - Math.floor(day * 0.4));
  const shomMin = Math.max(0, 21 - Math.floor(day * 0.6));
  const xuftonMin = Math.max(0, 42 - Math.floor(day * 0.6));

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    day,
    tahajjud: '03:45',
    subh: `04:${pad(subhMin)}`,
    bomdod: `05:${pad(bomdodMin)}`,
    quyosh: `06:${pad(quyoshMin)}`,
    peshin: '12:05',
    asr: `15:${pad(asrMin)}`,
    shom: `17:${pad(shomMin)}`,
    xufton: `18:${pad(xuftonMin)}`,
  };
});

