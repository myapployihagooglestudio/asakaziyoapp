/**
 * ASAKA ZIYO — Verified Adhan Audio Tracks Library
 * Shayx Mishary Rashid Alafasy and canonical Muazzin adhan audio streams.
 */

export interface AdhanTrack {
  id: string;
  title: string;
  muazzin: string;
  duration: string;
  url: string;
  isBomdodSpecial?: boolean;
  isDefault?: boolean;
}

export const INITIAL_ADHAN_TRACKS: AdhanTrack[] = [
  {
    id: 'track-mishary-short',
    title: 'Shayx Mishariy Al-Afosiy — Qisqa Azon',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '1:45',
    url: 'https://ia801601.us.archive.org/15/items/AdhanMisharyRashidAlAfasy/AdhanMisharyRashidAlAfasy.mp3',
    isDefault: true,
  },
  {
    id: 'track-mishary-full',
    title: 'Shayx Mishariy Al-Afosiy — Toʻliq Madina Azani',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '3:20',
    url: 'https://server11.mp3quran.net/adhan/mishary.mp3',
  },
  {
    id: 'track-mishary-bomdod',
    title: 'Shayx Mishariy Al-Afosiy — Bomdod Azoni («As-salatu khayrun minan-nawm»)',
    muazzin: 'Shayx Mishariy Rashid Al-Afosiy',
    duration: '3:45',
    url: 'https://ia800201.us.archive.org/13/items/AdhanMisharyRashidAlafasyFajr/Fajr_Adhan_Mishary_Rashid.mp3',
    isBomdodSpecial: true,
  },
  {
    id: 'track-haram-makkah',
    title: 'Masjidul Harom (Makka) — Buyuk Azon',
    muazzin: 'Makka Muazzama Muazzinlari',
    duration: '4:10',
    url: 'https://server11.mp3quran.net/adhan/haram.mp3',
  },
  {
    id: 'track-gentle-chime',
    title: 'Yoqimli qoʻngʻiroq eslatmasi (Gentle Chime)',
    muazzin: 'Tizim ovozi',
    duration: '0:05',
    url: '',
  },
];

const STORAGE_KEY = 'asaka_ziyo_adhan_tracks_v1';

export const getStoredAdhanTracks = (): AdhanTrack[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch (e) {
    // fallback
  }
  return INITIAL_ADHAN_TRACKS;
};

export const saveStoredAdhanTrack = (track: AdhanTrack): AdhanTrack[] => {
  const current = getStoredAdhanTracks();
  const updated = [track, ...current];
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
