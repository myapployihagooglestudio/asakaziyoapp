import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { uzLatn } from './locales/uz-Latn';
import { uzCyrl } from './locales/uz-Cyrl';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { transformResourceObject } from './utils/newUzbekAlphabet';

export type SupportedLocale = 'uz-Latn' | 'uz-Cyrl' | 'uz-Latn-new' | 'ru' | 'en';

export interface LanguageOption {
  code: SupportedLocale;
  label: string; // Visible label required by spec
  flagLabel: string;
  writingSystem: string;
}

export const SUPPORTED_LOCALES: LanguageOption[] = [
  {
    code: 'uz-Latn',
    label: 'O‘zbekcha (Lotin)',
    flagLabel: 'UZ',
    writingSystem: 'Amaldagi lotin alifbosi',
  },
  {
    code: 'uz-Cyrl',
    label: 'Ўзбекча (Кирилл)',
    flagLabel: 'УЗ',
    writingSystem: 'Кирилл ёзуви',
  },
  {
    code: 'uz-Latn-new',
    label: 'Özbekcha (Yangi alifbo)',
    flagLabel: 'UZ+',
    writingSystem: 'Yangi isloh qilingan alifbo (ş, ç, ö, ğ)',
  },
  {
    code: 'ru',
    label: 'Русский',
    flagLabel: 'RU',
    writingSystem: 'Русский литературный',
  },
  {
    code: 'en',
    label: 'English',
    flagLabel: 'EN',
    writingSystem: 'International English',
  },
];

// Dynamically generate first-class uz-Latn-new locale from uzLatn base
const uzLatnNew = transformResourceObject(uzLatn);

// Read saved locale safely from localStorage
const getSavedLocale = (): SupportedLocale => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('asaka_ziyo_locale') as SupportedLocale;
      if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
        return saved;
      }
    }
  } catch (e) {
    // Storage fallback
  }
  return 'uz-Latn';
};

const defaultLocale = getSavedLocale();

i18n.use(initReactI18next).init({
  resources: {
    'uz-Latn': uzLatn,
    'uz-Cyrl': uzCyrl,
    'uz-Latn-new': uzLatnNew,
    ru: ru,
    en: en,
  },
  lng: defaultLocale,
  fallbackLng: 'uz-Latn',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes values safely
  },
});

// Update document language attribute on language change
if (typeof document !== 'undefined') {
  document.documentElement.lang = defaultLocale;
}

i18n.on('languageChanged', (lng: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('asaka_ziyo_locale', lng);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (e) {
    // Storage policy fallback
  }
});

export default i18n;
