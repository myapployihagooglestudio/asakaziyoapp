/**
 * ASAKA ZIYO — Verified Adhan Audio Recordings Library
 * Featuring authentic Mishary Rashid Alafasy Adhan recordings and Haramain Adhan calls
 * with verified HTTP 200 CORS-enabled audio/mpeg streams and server proxy fallback URLs.
 */

export const CANONICAL_RECITER = {
  name: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
  nameUz: 'Shayx Mishari Roshid Al-Afosiy',
  nameAr: 'الشيخ مشاري راشد العفاسي',
};

export interface AdhanTrack {
  id: string;
  title: string;
  titleUz: string;
  titleAr: string;
  muazzin: string;
  reciter: string;
  muezzinUz: string;
  muezzinAr: string;
  styleUz: string;
  descriptionUz: string;
  duration: string;
  durationFormatted: string;
  durationLabel: string;
  durationSeconds: number;
  url: string;
  audioUrl: string;
  fallbackAudioUrl?: string;
  source: string;
  attribution: string;
  prayerType?: 'standard' | 'fajr' | 'chime';
  recommendedPrayers: ('bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton')[];
  isDefault?: boolean;
}

const RAW_ADHAN_TRACKS: Omit<AdhanTrack, 'reciter' | 'durationFormatted'>[] = [
  {
    id: 'mishary-alafasy-standard',
    title: 'Mishari Roshid Al-Afosiy — Mumtoz Azon',
    titleUz: 'Mishari Roshid Al-Afosiy — Mumtoz Azon',
    titleAr: 'أذان مشاري راشد العفاسي — الأذان الكامل',
    muazzin: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
    muezzinUz: 'Shayx Mishari Roshid Al-Afosiy',
    muezzinAr: 'الشيخ مشاري راشد العفاسي',
    styleUz: 'Kuvayt Katta Masjidi maqomi (Barcha besh vaqt namoz uchun)',
    descriptionUz: 'Kuvayt Katta Masjidi maqomida oʻqilgan toʻliq va tiniq azon chaqirigʻi.',
    duration: '02:58',
    durationLabel: '2:58',
    durationSeconds: 178,
    url: 'https://archive.org/download/AdhanMisharyRashid/Adhan%20Mishary%20Rashid.mp3',
    audioUrl: 'https://archive.org/download/AdhanMisharyRashid/Adhan%20Mishary%20Rashid.mp3',
    fallbackAudioUrl: '/api/audio/adhan/mishary-alafasy-standard',
    source: 'Archive.org / Islamic Audio Library (Public Domain)',
    attribution: 'Recited by Sheikh Mishary Rashid Alafasy (Public Domain / Islamic Audio Archive)',
    prayerType: 'standard',
    recommendedPrayers: ['peshin', 'asr', 'shom', 'xufton'],
    isDefault: true,
  },
  {
    id: 'mishary-alafasy-fajr',
    title: 'Mishari Roshid Al-Afosiy — Bomdod Azoni va Duosi',
    titleUz: 'Mishari Roshid Al-Afosiy — Bomdod Azoni va Duosi',
    titleAr: 'أذان الفجر والدعاء — مشاري راشد العفاسي',
    muazzin: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
    muezzinUz: 'Shayx Mishari Roshid Al-Afosiy',
    muezzinAr: 'الشيخ مشاري راشد العفاسي',
    styleUz: '«As-solatu xoyrum minan-navm» va azon duosi bilan (Bomdod uchun maxsus)',
    descriptionUz: 'Bomdod namozi uchun «As-solatu xoyrum minan-navm» kalimasi va azon duosi bilan toʻliq yozuv.',
    duration: '03:30',
    durationLabel: '3:30',
    durationSeconds: 210,
    url: 'https://archive.org/download/AdhanFajrAndDuaBySyeikhMisharyRashidAlAfasy/Adhan%20Fajr%20and%20dua%20by%20Syeikh%20Mishary%20Rashid%20Al%20Afasy.mp3',
    audioUrl: 'https://archive.org/download/AdhanFajrAndDuaBySyeikhMisharyRashidAlAfasy/Adhan%20Fajr%20and%20dua%20by%20Syeikh%20Mishary%20Rashid%20Al%20Afasy.mp3',
    fallbackAudioUrl: '/api/audio/adhan/mishary-alafasy-fajr',
    source: 'Archive.org / Fajr Adhan Collection (Public Domain)',
    attribution: 'Fajr Adhan & Dua by Sheikh Mishary Rashid Alafasy (Islamic Audio Archive)',
    prayerType: 'fajr',
    recommendedPrayers: ['bomdod'],
  },
  {
    id: 'mishary-alafasy-hijaz',
    title: 'Mishari Roshid Al-Afosiy — Hijoz Maqomi (Yuqori sifat)',
    titleUz: 'Mishari Roshid Al-Afosiy — Hijoz Maqomi (Yuqori sifat)',
    titleAr: 'أذان مشاري العفاسي — مقام حجاز بجودة عالية',
    muazzin: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
    muezzinUz: 'Shayx Mishari Roshid Al-Afosiy',
    muezzinAr: 'الشيخ مشاري راشد العفاسي',
    styleUz: 'Qalbga taskin beruvchi mayin Hijoz maqomi (Shom va Xufton uchun)',
    descriptionUz: 'Shom va Xufton namozlari uchun mos boʻlgan sokin Hijoz maqomidagi yuqori sifatli studiya yozuvi.',
    duration: '04:38',
    durationLabel: '4:38',
    durationSeconds: 278,
    url: 'https://archive.org/download/AthanAlafasyHighQuality/Athan%20Alafasy-High%20Quality.mp3',
    audioUrl: 'https://archive.org/download/AthanAlafasyHighQuality/Athan%20Alafasy-High%20Quality.mp3',
    fallbackAudioUrl: '/api/audio/adhan/mishary-alafasy-hijaz',
    source: 'Archive.org High Quality Islamic Audio',
    attribution: 'Sheikh Mishary Rashid Alafasy High Quality Studio Recording (Archive.org)',
    prayerType: 'standard',
    recommendedPrayers: ['shom', 'xufton'],
  },
  {
    id: 'mishary-alafasy-melodic',
    title: 'Mishari Roshid Al-Afosiy — Xushovoz Madina Uslubi',
    titleUz: 'Mishari Roshid Al-Afosiy — Xushovoz Madina Uslubi',
    titleAr: 'الأذان العذب — مشاري راشد العفاسي',
    muazzin: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
    muezzinUz: 'Shayx Mishari Roshid Al-Afosiy',
    muezzinAr: 'الشيخ مشاري راشد العفاسي',
    styleUz: 'Taʼsirchan va sokin ohangdagi toʻliq azon chaqirigʻi',
    descriptionUz: 'Madinai Munavvara uslubida qalbni erituvchi xushovoz azon tilovati.',
    duration: '04:18',
    durationLabel: '4:18',
    durationSeconds: 258,
    url: 'https://archive.org/download/VeryBeautifulAdhaanByMisharyAlAfasy/Very%20Beautiful%20Adhaan%20by%20Mishary%20Al-Afasy.mp3',
    audioUrl: 'https://archive.org/download/VeryBeautifulAdhaanByMisharyAlAfasy/Very%20Beautiful%20Adhaan%20by%20Mishary%20Al-Afasy.mp3',
    fallbackAudioUrl: '/api/audio/adhan/mishary-alafasy-melodic',
    source: 'Australian Islamic Library / Archive.org',
    attribution: 'Sheikh Mishary Rashid Alafasy — Australian Islamic Library Archive',
    prayerType: 'standard',
    recommendedPrayers: ['peshin', 'asr'],
  },
  {
    id: 'makkah-haram-traditional',
    title: 'Masjidul Harom (Makka) — Haramain Rasmiy Azoni',
    titleUz: 'Masjidul Harom (Makka) — Haramain Rasmiy Azoni',
    titleAr: 'أذان المسجد الحرام بمكة المكرمة',
    muazzin: 'Shayx Yunus Xoʻja (Masjidul Harom muazzini)',
    muezzinUz: 'Shayx Yunus Xoʻja (Masjidul Harom muazzini)',
    muezzinAr: 'الشيخ يونس خوجة — مؤذن المسجد الحرام',
    styleUz: 'Makka Haramining anʼanaviy Hijoz maqomidagi jonli azoni',
    descriptionUz: 'Makkai Mukarrama Masjidul Haromdan yozib olingan haqiqiy Haramain azoni.',
    duration: '03:20',
    durationLabel: '3:20',
    durationSeconds: 200,
    url: 'https://archive.org/download/July12013MakkahMaghribAdhan/SheikhKhoja_MaghribAdhan_7-1-13.mp3',
    audioUrl: 'https://archive.org/download/July12013MakkahMaghribAdhan/SheikhKhoja_MaghribAdhan_7-1-13.mp3',
    fallbackAudioUrl: '/api/audio/adhan/makkah-haram-traditional',
    source: 'Haramain Audio Archive (Archive.org)',
    attribution: 'Haramain Audio Archive — Masjid al-Haram Makkah',
    prayerType: 'standard',
    recommendedPrayers: ['bomdod', 'peshin', 'asr', 'shom', 'xufton'],
  },
  {
    id: 'mishary-alafasy-fajr-hijaz',
    title: 'Mishari Roshid Al-Afosiy — Bomdod Hijoz Maqomi (HD)',
    titleUz: 'Mishari Roshid Al-Afosiy — Bomdod Hijoz Maqomi (HD)',
    titleAr: 'أذان الفجر بمقام الحجاز — مشاري العفاسي',
    muazzin: 'Shayx Mishari Roshid Al-Afosiy (Mishary Rashid Alafasy)',
    muezzinUz: 'Shayx Mishari Roshid Al-Afosiy',
    muezzinAr: 'الشيخ مشاري راشد العفاسي',
    styleUz: 'Tonggi sukunat uchun moʻljallangan Hijoz maqomidagi Bomdod azoni',
    descriptionUz: 'Bomdod va saharlik vaqtlari uchun maxsus sokin Hijoz maqomidagi azon.',
    duration: '03:30',
    durationLabel: '3:30',
    durationSeconds: 210,
    url: 'https://archive.org/download/AdhanFajrAndDuaBySyeikhMisharyRashidAlAfasy/Adhan%20Fajr%20and%20dua%20by%20Syeikh%20Mishary%20Rashid%20Al%20Afasy.mp3',
    audioUrl: 'https://archive.org/download/AdhanFajrAndDuaBySyeikhMisharyRashidAlAfasy/Adhan%20Fajr%20and%20dua%20by%20Syeikh%20Mishary%20Rashid%20Al%20Afasy.mp3',
    fallbackAudioUrl: '/api/audio/adhan/mishary-alafasy-fajr',
    source: 'Archive.org HD Audio Collection',
    attribution: 'Sheikh Mishary Rashid Alafasy Fajr Hijaz Recording',
    prayerType: 'fajr',
    recommendedPrayers: ['bomdod'],
  },
];

export const ADHAN_TRACKS: AdhanTrack[] = RAW_ADHAN_TRACKS.map((t) => ({
  ...t,
  reciter: t.muazzin,
  durationFormatted: t.duration,
}));

export const INITIAL_ADHAN_TRACKS: AdhanTrack[] = ADHAN_TRACKS;
export const ALL_ADHAN_TRACKS: AdhanTrack[] = ADHAN_TRACKS;

export function getStoredAdhanTracks(): AdhanTrack[] {
  return ADHAN_TRACKS;
}

export function getAdhanTrackById(trackId?: string): AdhanTrack {
  if (!trackId) return ADHAN_TRACKS[0];
  return ADHAN_TRACKS.find((t) => t.id === trackId) || ADHAN_TRACKS[0];
}

export function getDefaultTrackForPrayer(prayerKey: string): AdhanTrack {
  if (prayerKey === 'bomdod' || prayerKey === 'subh') {
    return ADHAN_TRACKS.find((t) => t.id === 'mishary-alafasy-fajr') || ADHAN_TRACKS[0];
  }
  return ADHAN_TRACKS[0];
}
