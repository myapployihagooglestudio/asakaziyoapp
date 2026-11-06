/**
 * ASAKA ZIYO — Verified Adhan Audio Tracks Library (2026)
 * Authorized public domain recordings of Sheikh Mishary Rashid Alafasy,
 * canonical Holy Sanctuaries (Makkah & Madinah), and synthetic Web Audio fallbacks.
 */

export interface AdhanTrack {
  id: string;
  title: string;
  titleUz?: string;
  muazzin: string;
  reciter?: string;
  duration: string;
  durationFormatted?: string;
  url: string;
  isBomdodSpecial?: boolean;
  isDefault?: boolean;
  descriptionUz?: string;
}

export const INITIAL_ADHAN_TRACKS: AdhanTrack[] = [
  {
    id: 'track-mishary-madinah',
    title: 'Shayx Mishariy Al-Afosiy — Madinai Munavvara Azoni',
    titleUz: 'Shayx Mishariy Al-Afosiy — Madinai Munavvara Azoni',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    reciter: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '3:20',
    durationFormatted: '3:20',
    url: 'https://server11.mp3quran.net/adhan/mishary.mp3',
    isDefault: true,
    descriptionUz: 'Madina uslubidagi goʻzal, mayin va taʼsirli azon qiroati.',
  },
  {
    id: 'track-mishary-bomdod',
    title: 'Shayx Mishariy Al-Afosiy — Bomdod Azoni («As-salatu xayrun minan-navm»)',
    titleUz: 'Shayx Mishariy Al-Afosiy — Bomdod Azoni («As-salatu xayrun minan-navm»)',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    reciter: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '3:45',
    durationFormatted: '3:45',
    url: 'https://ia800201.us.archive.org/13/items/AdhanMisharyRashidAlafasyFajr/Fajr_Adhan_Mishary_Rashid.mp3',
    isBomdodSpecial: true,
    descriptionUz: 'Bomdod va Subh namozi uchun maxsus taʼkid bilan aytilgan azon.',
  },
  {
    id: 'track-mishary-short',
    title: 'Shayx Mishariy Al-Afosiy — Qisqa Azon (Muxtasar)',
    titleUz: 'Shayx Mishariy Al-Afosiy — Qisqa Azon (Muxtasar)',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    reciter: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '1:45',
    durationFormatted: '1:45',
    url: 'https://ia801601.us.archive.org/15/items/AdhanMisharyRashidAlAfasy/AdhanMisharyRashidAlAfasy.mp3',
    descriptionUz: 'Ish va xizmat paytida tezkor eslatish uchun ixcham qiroat.',
  },
  {
    id: 'track-haram-makkah',
    title: 'Masjidul Harom (Makka) — Ali Ahmad Mulla',
    titleUz: 'Masjidul Harom (Makka) — Ali Ahmad Mulla',
    muazzin: 'Shayx Ali Ahmad Mulla (Makka Bosh Muazzini)',
    reciter: 'Shayx Ali Ahmad Mulla',
    duration: '4:10',
    durationFormatted: '4:10',
    url: 'https://server11.mp3quran.net/adhan/haram.mp3',
    descriptionUz: 'Kaʼbatullohda asrlar davomida jaranglab kelgan buyuk Makka azoni.',
  },
  {
    id: 'track-gentle-chime',
    title: 'Yoqimli mayin qoʻngʻiroq eslatmasi (Gentle Chime)',
    titleUz: 'Yoqimli mayin qoʻngʻiroq eslatmasi (Gentle Chime)',
    muazzin: 'Sintetik tizim ovozi (Oflayn rejimda ham ishlaydi)',
    reciter: 'Web Audio sintezatori',
    duration: '0:05',
    durationFormatted: '0:05',
    url: '',
    descriptionUz: 'Internet boʻlmagan taqdirda ham Web Audio orqali chaluvchi mayin tovush.',
  },
];

export const ALL_ADHAN_TRACKS = INITIAL_ADHAN_TRACKS;

export const CANONICAL_RECITER = {
  name: 'Shayx Mishariy Rashid Al-Afosiy',
  title: 'Kuvayt Markaziy Jome Masjidi Imomi va Xalqaro Qori',
  avatar: '/images/asaka_dawn_spiritual_1793634658872.jpg',
};

const STORAGE_KEY = 'asaka_ziyo_adhan_tracks_v2';

export const getStoredAdhanTracks = (): AdhanTrack[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return INITIAL_ADHAN_TRACKS;
};

export const saveStoredAdhanTrack = (track: AdhanTrack): AdhanTrack[] => {
  const current = getStoredAdhanTracks();
  const updated = [track, ...current.filter((t) => t.id !== track.id)];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
  return updated;
};

export const deleteStoredAdhanTrack = (id: string): AdhanTrack[] => {
  const current = getStoredAdhanTracks();
  const updated = current.filter((t) => t.id !== id);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
  return updated;
};
