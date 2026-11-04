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

// Monthly sample calendar days for preview/admin management
export const MONTHLY_CALENDAR_PREVIEW = [
  { day: 1, tahajjud: '03:45', subh: '04:38', bomdod: '05:20', quyosh: '06:44', peshin: '12:05', asr: '15:11', shom: '17:23', xufton: '18:43' },
  { day: 2, tahajjud: '03:45', subh: '04:40', bomdod: '05:22', quyosh: '06:46', peshin: '12:05', asr: '15:10', shom: '17:21', xufton: '18:42' },
  { day: 3, tahajjud: '03:46', subh: '04:41', bomdod: '05:23', quyosh: '06:47', peshin: '12:05', asr: '15:09', shom: '17:20', xufton: '18:40' },
  { day: 4, tahajjud: '03:47', subh: '04:42', bomdod: '05:24', quyosh: '06:48', peshin: '12:05', asr: '15:07', shom: '17:19', xufton: '18:39' },
  { day: 5, tahajjud: '03:48', subh: '04:43', bomdod: '05:25', quyosh: '06:49', peshin: '12:05', asr: '15:06', shom: '17:18', xufton: '18:38' },
  { day: 6, tahajjud: '03:49', subh: '04:44', bomdod: '05:26', quyosh: '06:51', peshin: '12:05', asr: '15:05', shom: '17:16', xufton: '18:37' },
  { day: 7, tahajjud: '03:50', subh: '04:45', bomdod: '05:27', quyosh: '06:52', peshin: '12:05', asr: '15:04', shom: '17:15', xufton: '18:36' },
];
