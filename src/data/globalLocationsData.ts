/**
 * ASAKA ZIYO — GLOBAL PRAYER TIMES & WEATHER ECOSYSTEM 2026
 * Canonical Locations Registry:
 * - Asaka (MANUAL_ADMIN — strictly protected administrator schedule)
 * - All 14 official regions of the Republic of Uzbekistan with cities & districts
 * - Featured Haramain (Makkah & Madinah) & Global Cities with exact coordinates & IANA timezones
 */

export type PrayerSourceMode = 'MANUAL_ADMIN' | 'AUTO_CALCULATED';

export type CalculationMethodId =
  | 'UZBEKISTAN_OMI'
  | 'UMM_AL_QURA'
  | 'MWL'
  | 'KARACHI'
  | 'ISNA'
  | 'EGYPT'
  | 'DIYANET_TURKEY'
  | 'DUBAI'
  | 'RUSSIA_DUM';

export type AsrMethodId = 'HANAFI' | 'STANDARD';

export type HighLatitudeRuleId =
  | 'ANGLE_BASED'
  | 'MIDDLE_OF_NIGHT'
  | 'SEVENTH_OF_NIGHT'
  | 'NONE';

export type MidnightModeId = 'STANDARD' | 'JAFARI';

export interface DistrictDefinition {
  id: string;
  name: string;
  nameCyrl?: string;
  latitude: number;
  longitude: number;
  namozVaqtiSlug?: string;
  isAsakaManual?: boolean;
}

export interface CityLocationDefinition {
  id: string;
  countryCode: string;
  countryName: string;
  regionId: string;
  regionName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  sourceMode: PrayerSourceMode;
  defaultMethod: CalculationMethodId;
  defaultAsr: AsrMethodId;
  featuredGroup?: 'asaka' | 'uzbekistan' | 'haramain' | 'central_asia' | 'global';
  namozVaqtiSlug?: string;
  isOfficialUzRegionCapital?: boolean;
  districts?: DistrictDefinition[];
}

export interface UzbekistanRegionDefinition {
  regionId: string;
  regionName: string;
  regionNameCyrl: string;
  capitalCityId: string;
  timezone: 'Asia/Tashkent';
  namozVaqtiSlug: string;
  cities: CityLocationDefinition[];
}

export const ASAKA_CANONICAL_CITY_ID = 'uz-andijan-asaka';

/**
 * Complete 14 official regions of Uzbekistan with major cities, districts, and exact coordinates.
 * NOTE: Asaka (uz-andijan-asaka) is permanently bound to sourceMode = 'MANUAL_ADMIN'.
 */
export const UZBEKISTAN_14_REGIONS: UzbekistanRegionDefinition[] = [
  {
    regionId: 'uz-karakalpakstan',
    regionName: 'Qoraqalpog‘iston Respublikasi',
    regionNameCyrl: 'Қорақалпоғистон Республикаси',
    capitalCityId: 'uz-karakalpakstan-nukus',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'nukus',
    cities: [
      {
        id: 'uz-karakalpakstan-nukus',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-karakalpakstan',
        regionName: 'Qoraqalpog‘iston Respublikasi',
        cityId: 'nukus',
        cityName: 'Nukus',
        districtId: 'nukus-center',
        districtName: 'Nukus shahri',
        latitude: 42.4619,
        longitude: 59.6166,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'nukus',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'nukus-center', name: 'Nukus shahri', latitude: 42.4619, longitude: 59.6166, namozVaqtiSlug: 'nukus' },
          { id: 'beruniy', name: 'Beruniy tumani', latitude: 41.6911, longitude: 60.7525, namozVaqtiSlug: 'beruniy' },
          { id: 'qongirot', name: 'Qo‘ng‘irot tumani', latitude: 43.0425, longitude: 58.8503, namozVaqtiSlug: 'qongirot' },
          { id: 'tortkol', name: 'To‘rtko‘l tumani', latitude: 41.5500, longitude: 61.0000, namozVaqtiSlug: 'tortkol' },
          { id: 'chimboy', name: 'Chimboy tumani', latitude: 42.9333, longitude: 59.7833, namozVaqtiSlug: 'chimboy' },
          { id: 'moynoq', name: 'Mo‘ynoq tumani', latitude: 43.7683, longitude: 59.0214, namozVaqtiSlug: 'moynoq' },
        ],
      },
      {
        id: 'uz-karakalpakstan-beruniy',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-karakalpakstan',
        regionName: 'Qoraqalpog‘iston Respublikasi',
        cityId: 'beruniy',
        cityName: 'Beruniy',
        districtId: 'beruniy',
        districtName: 'Beruniy tumani',
        latitude: 41.6911,
        longitude: 60.7525,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'beruniy',
      },
    ],
  },
  {
    regionId: 'uz-andijan',
    regionName: 'Andijon viloyati',
    regionNameCyrl: 'Андижон вилояти',
    capitalCityId: 'uz-andijan-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'andijon',
    cities: [
      {
        id: ASAKA_CANONICAL_CITY_ID,
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-andijan',
        regionName: 'Andijon viloyati',
        cityId: 'asaka',
        cityName: 'Asaka',
        districtId: 'asaka-tumani',
        districtName: 'Asaka tumani',
        latitude: 40.6415,
        longitude: 72.2387,
        timezone: 'Asia/Tashkent',
        sourceMode: 'MANUAL_ADMIN',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'asaka',
        namozVaqtiSlug: 'andijon',
        districts: [
          { id: 'asaka-tumani', name: 'Asaka shahri va tumani (Admin Jadval)', latitude: 40.6415, longitude: 72.2387, isAsakaManual: true },
        ],
      },
      {
        id: 'uz-andijan-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-andijan',
        regionName: 'Andijon viloyati',
        cityId: 'andijan',
        cityName: 'Andijon',
        districtId: 'andijan-center',
        districtName: 'Andijon shahri',
        latitude: 40.7821,
        longitude: 72.3442,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'andijon',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'andijan-center', name: 'Andijon shahri', latitude: 40.7821, longitude: 72.3442, namozVaqtiSlug: 'andijon' },
          { id: 'shahrixon', name: 'Shahrixon tumani', latitude: 40.7133, longitude: 72.0571, namozVaqtiSlug: 'shahrixon' },
          { id: 'xonobod', name: 'Xonobod shahri', latitude: 40.8039, longitude: 72.9767, namozVaqtiSlug: 'xonobod' },
          { id: 'qorgontepa', name: 'Qo‘rg‘ontepa tumani', latitude: 40.7319, longitude: 72.7617, namozVaqtiSlug: 'qorgontepa' },
          { id: 'marhamat', name: 'Marhamat tumani', latitude: 40.5064, longitude: 72.3336, namozVaqtiSlug: 'andijon' },
          { id: 'baliqchi', name: 'Baliqchi tumani', latitude: 40.9000, longitude: 71.8500, namozVaqtiSlug: 'andijon' },
          { id: 'oltinkol', name: 'Oltinko‘l tumani', latitude: 40.8011, longitude: 72.1634, namozVaqtiSlug: 'andijon' },
        ],
      },
      {
        id: 'uz-andijan-shahrixon',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-andijan',
        regionName: 'Andijon viloyati',
        cityId: 'shahrixon',
        cityName: 'Shahrixon',
        districtId: 'shahrixon',
        districtName: 'Shahrixon tumani',
        latitude: 40.7133,
        longitude: 72.0571,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'shahrixon',
      },
    ],
  },
  {
    regionId: 'uz-bukhara',
    regionName: 'Buxoro viloyati',
    regionNameCyrl: 'Бухоро вилояти',
    capitalCityId: 'uz-bukhara-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'buxoro',
    cities: [
      {
        id: 'uz-bukhara-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-bukhara',
        regionName: 'Buxoro viloyati',
        cityId: 'bukhara',
        cityName: 'Buxoro',
        districtId: 'bukhara-center',
        districtName: 'Buxoro shahri',
        latitude: 39.7747,
        longitude: 64.4286,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'buxoro',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'bukhara-center', name: 'Buxoro shahri', latitude: 39.7747, longitude: 64.4286, namozVaqtiSlug: 'buxoro' },
          { id: 'gijduvon', name: 'G‘ijduvon tumani', latitude: 40.1000, longitude: 64.6833, namozVaqtiSlug: 'gijduvon' },
          { id: 'kogon', name: 'Kogon shahri', latitude: 39.7228, longitude: 64.5517, namozVaqtiSlug: 'buxoro' },
          { id: 'qorakol', name: 'Qorako‘l tumani', latitude: 39.5333, longitude: 63.8333, namozVaqtiSlug: 'qorakol' },
          { id: 'romitan', name: 'Romitan tumani', latitude: 39.9294, longitude: 64.3794, namozVaqtiSlug: 'buxoro' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-fergana',
    regionName: 'Farg‘ona viloyati',
    regionNameCyrl: 'Фарғона вилояти',
    capitalCityId: 'uz-fergana-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'fargona',
    cities: [
      {
        id: 'uz-fergana-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-fergana',
        regionName: 'Farg‘ona viloyati',
        cityId: 'fergana',
        cityName: 'Farg‘ona',
        districtId: 'fergana-center',
        districtName: 'Farg‘ona shahri',
        latitude: 40.3842,
        longitude: 71.7843,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'fargona',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'fergana-center', name: 'Farg‘ona shahri', latitude: 40.3842, longitude: 71.7843, namozVaqtiSlug: 'fargona' },
          { id: 'qoqon', name: 'Qo‘qon shahri', latitude: 40.5286, longitude: 70.9425, namozVaqtiSlug: 'qoqon' },
          { id: 'margilon', name: 'Marg‘ilon shahri', latitude: 40.4711, longitude: 71.7247, namozVaqtiSlug: 'margilon' },
          { id: 'quva', name: 'Quva tumani', latitude: 40.5220, longitude: 72.0729, namozVaqtiSlug: 'quva' },
          { id: 'rishton', name: 'Rishton tumani', latitude: 40.3567, longitude: 71.2847, namozVaqtiSlug: 'rishton' },
        ],
      },
      {
        id: 'uz-fergana-qoqon',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-fergana',
        regionName: 'Farg‘ona viloyati',
        cityId: 'qoqon',
        cityName: 'Qo‘qon',
        districtId: 'qoqon',
        districtName: 'Qo‘qon shahri',
        latitude: 40.5286,
        longitude: 70.9425,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'qoqon',
      },
    ],
  },
  {
    regionId: 'uz-jizzakh',
    regionName: 'Jizzax viloyati',
    regionNameCyrl: 'Жиззах вилояти',
    capitalCityId: 'uz-jizzakh-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'jizzax',
    cities: [
      {
        id: 'uz-jizzakh-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-jizzakh',
        regionName: 'Jizzax viloyati',
        cityId: 'jizzakh',
        cityName: 'Jizzax',
        districtId: 'jizzakh-center',
        districtName: 'Jizzax shahri',
        latitude: 40.1158,
        longitude: 67.8422,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'jizzax',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'jizzakh-center', name: 'Jizzax shahri', latitude: 40.1158, longitude: 67.8422, namozVaqtiSlug: 'jizzax' },
          { id: 'zomin', name: 'Zomin tumani', latitude: 39.9606, longitude: 68.3958, namozVaqtiSlug: 'zomin' },
          { id: 'gallaorol', name: 'G‘allaorol tumani', latitude: 40.0258, longitude: 67.5900, namozVaqtiSlug: 'gallaorol' },
          { id: 'forish', name: 'Forish tumani', latitude: 40.5625, longitude: 67.2650, namozVaqtiSlug: 'jizzax' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-kashkadarya',
    regionName: 'Qashqadaryo viloyati',
    regionNameCyrl: 'Қашқадарё вилояти',
    capitalCityId: 'uz-kashkadarya-qarshi',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'qarshi',
    cities: [
      {
        id: 'uz-kashkadarya-qarshi',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-kashkadarya',
        regionName: 'Qashqadaryo viloyati',
        cityId: 'qarshi',
        cityName: 'Qarshi',
        districtId: 'qarshi-center',
        districtName: 'Qarshi shahri',
        latitude: 38.8606,
        longitude: 65.7891,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'qarshi',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'qarshi-center', name: 'Qarshi shahri', latitude: 38.8606, longitude: 65.7891, namozVaqtiSlug: 'qarshi' },
          { id: 'shahrisabz', name: 'Shahrisabz shahri', latitude: 39.0578, longitude: 66.8342, namozVaqtiSlug: 'shahrisabz' },
          { id: 'kitob', name: 'Kitob tumani', latitude: 39.1200, longitude: 66.8833, namozVaqtiSlug: 'qarshi' },
          { id: 'guzor', name: 'G‘uzor tumani', latitude: 38.6208, longitude: 66.2481, namozVaqtiSlug: 'guzor' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-navoi',
    regionName: 'Navoiy viloyati',
    regionNameCyrl: 'Навоий вилояти',
    capitalCityId: 'uz-navoi-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'navoiy',
    cities: [
      {
        id: 'uz-navoi-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-navoi',
        regionName: 'Navoiy viloyati',
        cityId: 'navoi',
        cityName: 'Navoiy',
        districtId: 'navoi-center',
        districtName: 'Navoiy shahri',
        latitude: 40.0844,
        longitude: 65.3792,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'navoiy',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'navoi-center', name: 'Navoiy shahri', latitude: 40.0844, longitude: 65.3792, namozVaqtiSlug: 'navoiy' },
          { id: 'zarafshon', name: 'Zarafshon shahri', latitude: 41.5764, longitude: 64.2056, namozVaqtiSlug: 'zarafshon' },
          { id: 'uchquduq', name: 'Uchquduq tumani', latitude: 42.1567, longitude: 63.5556, namozVaqtiSlug: 'uchquduq' },
          { id: 'nurota', name: 'Nurota tumani', latitude: 40.5614, longitude: 65.6886, namozVaqtiSlug: 'nurota' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-namangan',
    regionName: 'Namangan viloyati',
    regionNameCyrl: 'Наманган вилояти',
    capitalCityId: 'uz-namangan-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'namangan',
    cities: [
      {
        id: 'uz-namangan-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-namangan',
        regionName: 'Namangan viloyati',
        cityId: 'namangan',
        cityName: 'Namangan',
        districtId: 'namangan-center',
        districtName: 'Namangan shahri',
        latitude: 40.9983,
        longitude: 71.6726,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'namangan',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'namangan-center', name: 'Namangan shahri', latitude: 40.9983, longitude: 71.6726, namozVaqtiSlug: 'namangan' },
          { id: 'chust', name: 'Chust tumani', latitude: 41.0033, longitude: 71.2378, namozVaqtiSlug: 'chust' },
          { id: 'pop', name: 'Pop tumani', latitude: 40.8736, longitude: 71.1089, namozVaqtiSlug: 'pop' },
          { id: 'kosonsoy', name: 'Kosonsoy tumani', latitude: 41.2500, longitude: 71.5500, namozVaqtiSlug: 'kosonsoy' },
          { id: 'uchqorgon', name: 'Uchqo‘rg‘on tumani', latitude: 41.1136, longitude: 72.0792, namozVaqtiSlug: 'uchqorgon' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-samarkand',
    regionName: 'Samarqand viloyati',
    regionNameCyrl: 'Самарқанд вилояти',
    capitalCityId: 'uz-samarkand-city',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'samarqand',
    cities: [
      {
        id: 'uz-samarkand-city',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-samarkand',
        regionName: 'Samarqand viloyati',
        cityId: 'samarkand',
        cityName: 'Samarqand',
        districtId: 'samarkand-center',
        districtName: 'Samarqand shahri',
        latitude: 39.6542,
        longitude: 66.9597,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'samarqand',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'samarkand-center', name: 'Samarqand shahri', latitude: 39.6542, longitude: 66.9597, namozVaqtiSlug: 'samarqand' },
          { id: 'kattaqorgon', name: 'Kattaqo‘rg‘on shahri', latitude: 39.8989, longitude: 66.2561, namozVaqtiSlug: 'kattaqorgon' },
          { id: 'urgut', name: 'Urgut tumani', latitude: 39.4022, longitude: 67.2431, namozVaqtiSlug: 'urgut' },
          { id: 'ishtixon', name: 'Ishtixon tumani', latitude: 39.9664, longitude: 66.4861, namozVaqtiSlug: 'samarqand' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-surkhandarya',
    regionName: 'Surxondaryo viloyati',
    regionNameCyrl: 'Сурхондарё вилояти',
    capitalCityId: 'uz-surkhandarya-termez',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'termiz',
    cities: [
      {
        id: 'uz-surkhandarya-termez',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-surkhandarya',
        regionName: 'Surxondaryo viloyati',
        cityId: 'termez',
        cityName: 'Termiz',
        districtId: 'termez-center',
        districtName: 'Termiz shahri',
        latitude: 37.2242,
        longitude: 67.2783,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'termiz',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'termez-center', name: 'Termiz shahri', latitude: 37.2242, longitude: 67.2783, namozVaqtiSlug: 'termiz' },
          { id: 'denov', name: 'Denov tumani', latitude: 38.2675, longitude: 67.8989, namozVaqtiSlug: 'denov' },
          { id: 'sherobod', name: 'Sherobod tumani', latitude: 37.6681, longitude: 67.0089, namozVaqtiSlug: 'sherobod' },
          { id: 'boysun', name: 'Boysun tumani', latitude: 38.2061, longitude: 67.1986, namozVaqtiSlug: 'boysun' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-syrdarya',
    regionName: 'Sirdaryo viloyati',
    regionNameCyrl: 'Сирдарё вилояти',
    capitalCityId: 'uz-syrdarya-guliston',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'guliston',
    cities: [
      {
        id: 'uz-syrdarya-guliston',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-syrdarya',
        regionName: 'Sirdaryo viloyati',
        cityId: 'guliston',
        cityName: 'Guliston',
        districtId: 'guliston-center',
        districtName: 'Guliston shahri',
        latitude: 40.4897,
        longitude: 68.7842,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'guliston',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'guliston-center', name: 'Guliston shahri', latitude: 40.4897, longitude: 68.7842, namozVaqtiSlug: 'guliston' },
          { id: 'yangiyer', name: 'Yangiyer shahri', latitude: 40.2750, longitude: 68.8225, namozVaqtiSlug: 'guliston' },
          { id: 'sirdaryo-tumani', name: 'Sirdaryo tumani', latitude: 40.8436, longitude: 68.6617, namozVaqtiSlug: 'guliston' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-tashkent-region',
    regionName: 'Toshkent viloyati',
    regionNameCyrl: 'Тошкент вилояти',
    capitalCityId: 'uz-tashkent-region-nurafshon',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'angren',
    cities: [
      {
        id: 'uz-tashkent-region-nurafshon',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-tashkent-region',
        regionName: 'Toshkent viloyati',
        cityId: 'nurafshon',
        cityName: 'Nurafshon',
        districtId: 'nurafshon-center',
        districtName: 'Nurafshon shahri',
        latitude: 41.0422,
        longitude: 69.3578,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'toshkent',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'nurafshon-center', name: 'Nurafshon shahri', latitude: 41.0422, longitude: 69.3578, namozVaqtiSlug: 'toshkent' },
          { id: 'angren', name: 'Angren shahri', latitude: 41.0167, longitude: 70.1436, namozVaqtiSlug: 'angren' },
          { id: 'olmaliq', name: 'Olmaliq shahri', latitude: 40.8447, longitude: 69.5983, namozVaqtiSlug: 'olmaliq' },
          { id: 'chirchiq', name: 'Chirchiq shahri', latitude: 41.4689, longitude: 69.5822, namozVaqtiSlug: 'toshkent' },
          { id: 'bekobod', name: 'Bekobod shahri', latitude: 40.2208, longitude: 69.2697, namozVaqtiSlug: 'bekobod' },
          { id: 'yangiyol', name: 'Yangiyo‘l shahri', latitude: 41.1120, longitude: 69.0471, namozVaqtiSlug: 'toshkent' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-khorezm',
    regionName: 'Xorazm viloyati',
    regionNameCyrl: 'Хоразм вилояти',
    capitalCityId: 'uz-khorezm-urgench',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'urganch',
    cities: [
      {
        id: 'uz-khorezm-urgench',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-khorezm',
        regionName: 'Xorazm viloyati',
        cityId: 'urgench',
        cityName: 'Urganch',
        districtId: 'urgench-center',
        districtName: 'Urganch shahri',
        latitude: 41.5500,
        longitude: 60.6333,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'urganch',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'urgench-center', name: 'Urganch shahri', latitude: 41.5500, longitude: 60.6333, namozVaqtiSlug: 'urganch' },
          { id: 'xiva', name: 'Xiva shahri', latitude: 41.3783, longitude: 60.3639, namozVaqtiSlug: 'xiva' },
          { id: 'hazorasp', name: 'Hazorasp tumani', latitude: 41.3194, longitude: 61.0742, namozVaqtiSlug: 'hazorasp' },
          { id: 'shovot', name: 'Shovot tumani', latitude: 41.6558, longitude: 60.3025, namozVaqtiSlug: 'urganch' },
        ],
      },
    ],
  },
  {
    regionId: 'uz-tashkent-city',
    regionName: 'Toshkent shahri',
    regionNameCyrl: 'Тошкент шаҳри',
    capitalCityId: 'uz-tashkent-city-main',
    timezone: 'Asia/Tashkent',
    namozVaqtiSlug: 'toshkent',
    cities: [
      {
        id: 'uz-tashkent-city-main',
        countryCode: 'UZ',
        countryName: 'O‘zbekiston',
        regionId: 'uz-tashkent-city',
        regionName: 'Toshkent shahri',
        cityId: 'tashkent',
        cityName: 'Toshkent',
        districtId: 'tashkent-center',
        districtName: 'Toshkent shahri (Markaz)',
        latitude: 41.2995,
        longitude: 69.2401,
        timezone: 'Asia/Tashkent',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'UZBEKISTAN_OMI',
        defaultAsr: 'HANAFI',
        featuredGroup: 'uzbekistan',
        namozVaqtiSlug: 'toshkent',
        isOfficialUzRegionCapital: true,
        districts: [
          { id: 'tashkent-center', name: 'Toshkent shahri (Markaz)', latitude: 41.2995, longitude: 69.2401, namozVaqtiSlug: 'toshkent' },
          { id: 'chilonzor', name: 'Chilonzor tumani', latitude: 41.2753, longitude: 69.2036, namozVaqtiSlug: 'toshkent' },
          { id: 'yunusobod', name: 'Yunusobod tumani', latitude: 41.3667, longitude: 69.2889, namozVaqtiSlug: 'toshkent' },
          { id: 'shayxontohur', name: 'Shayxontohur tumani', latitude: 41.3211, longitude: 69.2422, namozVaqtiSlug: 'toshkent' },
          { id: 'olmazor', name: 'Olmazor tumani', latitude: 41.3456, longitude: 69.2225, namozVaqtiSlug: 'toshkent' },
          { id: 'mirzo-ulugbek', name: 'Mirzo Ulug‘bek tumani', latitude: 41.3385, longitude: 69.3345, namozVaqtiSlug: 'toshkent' },
          { id: 'sergeli', name: 'Sergeli tumani', latitude: 41.2261, longitude: 69.2219, namozVaqtiSlug: 'toshkent' },
          { id: 'yashnobod', name: 'Yashnobod tumani', latitude: 41.2925, longitude: 69.3364, namozVaqtiSlug: 'toshkent' },
        ],
      },
    ],
  },
];

/**
 * Global Cities Registry (Saudi Arabia Haramain, Central Asia, Turkey, UAE, DST Global Cities)
 * Every city operates strictly in AUTO_CALCULATED mode with its own coordinates & IANA timezone.
 */
export const GLOBAL_CANONICAL_CITIES: CityLocationDefinition[] = [
  // Saudi Arabia (Haramain Featured)
  {
    id: 'sa-makkah',
    countryCode: 'SA',
    countryName: 'Saudiya Arabistoni',
    regionId: 'sa-makkah-province',
    regionName: 'Makka viloyati',
    cityId: 'makkah',
    cityName: 'Makka (Makkah)',
    districtId: 'masjid-al-haram',
    districtName: 'Masjidul Harom',
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: 'Asia/Riyadh',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'UMM_AL_QURA',
    defaultAsr: 'STANDARD',
    featuredGroup: 'haramain',
  },
  {
    id: 'sa-madinah',
    countryCode: 'SA',
    countryName: 'Saudiya Arabistoni',
    regionId: 'sa-madinah-province',
    regionName: 'Madina viloyati',
    cityId: 'madinah',
    cityName: 'Madina (Madinah)',
    districtId: 'masjid-an-nabawi',
    districtName: 'Masjidun Nabaviy',
    latitude: 24.4672,
    longitude: 39.6112,
    timezone: 'Asia/Riyadh',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'UMM_AL_QURA',
    defaultAsr: 'STANDARD',
    featuredGroup: 'haramain',
  },
  {
    id: 'sa-riyadh',
    countryCode: 'SA',
    countryName: 'Saudiya Arabistoni',
    regionId: 'sa-riyadh-province',
    regionName: 'Riyod viloyati',
    cityId: 'riyadh',
    cityName: 'Riyod (Riyadh)',
    districtId: 'riyadh-center',
    districtName: 'Riyod markazi',
    latitude: 24.7136,
    longitude: 46.6753,
    timezone: 'Asia/Riyadh',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'UMM_AL_QURA',
    defaultAsr: 'STANDARD',
    featuredGroup: 'haramain',
  },
  {
    id: 'sa-jeddah',
    countryCode: 'SA',
    countryName: 'Saudiya Arabistoni',
    regionId: 'sa-makkah-province',
    regionName: 'Makka viloyati',
    cityId: 'jeddah',
    cityName: 'Jidda (Jeddah)',
    districtId: 'jeddah-center',
    districtName: 'Jidda shahri',
    latitude: 21.4858,
    longitude: 39.1925,
    timezone: 'Asia/Riyadh',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'UMM_AL_QURA',
    defaultAsr: 'STANDARD',
    featuredGroup: 'haramain',
  },
  // Kazakhstan
  {
    id: 'kz-almaty',
    countryCode: 'KZ',
    countryName: 'Qozog‘iston',
    regionId: 'kz-almaty-reg',
    regionName: 'Olmaota',
    cityId: 'almaty',
    cityName: 'Almaty (Olmaota)',
    districtId: 'almaty-center',
    districtName: 'Almaty shahri',
    latitude: 43.2220,
    longitude: 76.8512,
    timezone: 'Asia/Almaty',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  {
    id: 'kz-astana',
    countryCode: 'KZ',
    countryName: 'Qozog‘iston',
    regionId: 'kz-astana-reg',
    regionName: 'Astana',
    cityId: 'astana',
    cityName: 'Astana',
    districtId: 'astana-center',
    districtName: 'Astana shahri',
    latitude: 51.1605,
    longitude: 71.4704,
    timezone: 'Asia/Almaty',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  {
    id: 'kz-shymkent',
    countryCode: 'KZ',
    countryName: 'Qozog‘iston',
    regionId: 'kz-shymkent-reg',
    regionName: 'Chimkent',
    cityId: 'shymkent',
    cityName: 'Shymkent (Chimkent)',
    districtId: 'shymkent-center',
    districtName: 'Shymkent shahri',
    latitude: 42.3417,
    longitude: 69.5901,
    timezone: 'Asia/Almaty',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  // Kyrgyzstan
  {
    id: 'kg-bishkek',
    countryCode: 'KG',
    countryName: 'Qirg‘iziston',
    regionId: 'kg-chuy',
    regionName: 'Bishkek',
    cityId: 'bishkek',
    cityName: 'Bishkek',
    districtId: 'bishkek-center',
    districtName: 'Bishkek shahri',
    latitude: 42.8746,
    longitude: 74.5698,
    timezone: 'Asia/Bishkek',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  {
    id: 'kg-osh',
    countryCode: 'KG',
    countryName: 'Qirg‘iziston',
    regionId: 'kg-osh-reg',
    regionName: 'O‘sh viloyati',
    cityId: 'osh',
    cityName: 'Osh (O‘sh)',
    districtId: 'osh-center',
    districtName: 'O‘sh shahri',
    latitude: 40.5140,
    longitude: 72.8161,
    timezone: 'Asia/Bishkek',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  // Tajikistan
  {
    id: 'tj-dushanbe',
    countryCode: 'TJ',
    countryName: 'Tojikiston',
    regionId: 'tj-dushanbe-reg',
    regionName: 'Dushanbe',
    cityId: 'dushanbe',
    cityName: 'Dushanbe',
    districtId: 'dushanbe-center',
    districtName: 'Dushanbe shahri',
    latitude: 38.5598,
    longitude: 68.7870,
    timezone: 'Asia/Dushanbe',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'KARACHI',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  {
    id: 'tj-khujand',
    countryCode: 'TJ',
    countryName: 'Tojikiston',
    regionId: 'tj-sughd',
    regionName: 'Sug‘d viloyati',
    cityId: 'khujand',
    cityName: 'Khujand (Xo‘jand)',
    districtId: 'khujand-center',
    districtName: 'Xo‘jand shahri',
    latitude: 40.2826,
    longitude: 69.6222,
    timezone: 'Asia/Dushanbe',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'KARACHI',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  // Turkmenistan
  {
    id: 'tm-ashgabat',
    countryCode: 'TM',
    countryName: 'Turkmaniston',
    regionId: 'tm-ashgabat-reg',
    regionName: 'Ashxobod',
    cityId: 'ashgabat',
    cityName: 'Ashgabat (Ashxobod)',
    districtId: 'ashgabat-center',
    districtName: 'Ashxobod shahri',
    latitude: 37.9601,
    longitude: 58.3261,
    timezone: 'Asia/Ashgabat',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  {
    id: 'tm-turkmenabat',
    countryCode: 'TM',
    countryName: 'Turkmaniston',
    regionId: 'tm-lebap',
    regionName: 'Lebap viloyati',
    cityId: 'turkmenabat',
    cityName: 'Turkmenabat',
    districtId: 'turkmenabat-center',
    districtName: 'Turkmanobod shahri',
    latitude: 39.0733,
    longitude: 63.5786,
    timezone: 'Asia/Ashgabat',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'central_asia',
  },
  // Turkey & UAE
  {
    id: 'tr-istanbul',
    countryCode: 'TR',
    countryName: 'Turkiya',
    regionId: 'tr-istanbul-reg',
    regionName: 'Istanbul',
    cityId: 'istanbul',
    cityName: 'Istanbul',
    districtId: 'istanbul-fatih',
    districtName: 'Istanbul shahri',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'DIYANET_TURKEY',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
  {
    id: 'tr-ankara',
    countryCode: 'TR',
    countryName: 'Turkiya',
    regionId: 'tr-ankara-reg',
    regionName: 'Anqara',
    cityId: 'ankara',
    cityName: 'Ankara (Anqara)',
    districtId: 'ankara-center',
    districtName: 'Anqara shahri',
    latitude: 39.9334,
    longitude: 32.8597,
    timezone: 'Europe/Istanbul',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'DIYANET_TURKEY',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
  {
    id: 'ae-dubai',
    countryCode: 'AE',
    countryName: 'BAA (UAE)',
    regionId: 'ae-dubai-reg',
    regionName: 'Dubay amirligi',
    cityId: 'dubai',
    cityName: 'Dubai (Dubay)',
    districtId: 'dubai-center',
    districtName: 'Dubay shahri',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'DUBAI',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
  {
    id: 'ae-abudhabi',
    countryCode: 'AE',
    countryName: 'BAA (UAE)',
    regionId: 'ae-abudhabi-reg',
    regionName: 'Abu-Dabi amirligi',
    cityId: 'abudhabi',
    cityName: 'Abu Dhabi (Abu-Dabi)',
    districtId: 'abudhabi-center',
    districtName: 'Abu-Dabi shahri',
    latitude: 24.4539,
    longitude: 54.3773,
    timezone: 'Asia/Dubai',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'DUBAI',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
  // Additional Major Global Cities (including Daylight Saving Time regions)
  {
    id: 'gb-london',
    countryCode: 'GB',
    countryName: 'Buyuk Britaniya',
    regionId: 'gb-london-reg',
    regionName: 'Greater London',
    cityId: 'london',
    cityName: 'London',
    districtId: 'london-center',
    districtName: 'London (DST)',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'global',
  },
  {
    id: 'us-newyork',
    countryCode: 'US',
    countryName: 'AQSh (USA)',
    regionId: 'us-ny',
    regionName: 'New York',
    cityId: 'newyork',
    cityName: 'New York',
    districtId: 'newyork-center',
    districtName: 'New York (DST)',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'ISNA',
    defaultAsr: 'HANAFI',
    featuredGroup: 'global',
  },
  {
    id: 'de-berlin',
    countryCode: 'DE',
    countryName: 'Germaniya',
    regionId: 'de-berlin-reg',
    regionName: 'Berlin',
    cityId: 'berlin',
    cityName: 'Berlin',
    districtId: 'berlin-center',
    districtName: 'Berlin (DST)',
    latitude: 52.5200,
    longitude: 13.4050,
    timezone: 'Europe/Berlin',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'HANAFI',
    featuredGroup: 'global',
  },
  {
    id: 'ru-moscow',
    countryCode: 'RU',
    countryName: 'Rossiya',
    regionId: 'ru-moscow-reg',
    regionName: 'Moskva',
    cityId: 'moscow',
    cityName: 'Moskva (Moscow)',
    districtId: 'moscow-center',
    districtName: 'Moskva shahri',
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: 'Europe/Moscow',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'RUSSIA_DUM',
    defaultAsr: 'HANAFI',
    featuredGroup: 'global',
  },
  {
    id: 'eg-cairo',
    countryCode: 'EG',
    countryName: 'Misr',
    regionId: 'eg-cairo-reg',
    regionName: 'Qohira',
    cityId: 'cairo',
    cityName: 'Cairo (Qohira)',
    districtId: 'cairo-center',
    districtName: 'Qohira shahri',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'EGYPT',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
  {
    id: 'my-kualalumpur',
    countryCode: 'MY',
    countryName: 'Malayziya',
    regionId: 'my-kl',
    regionName: 'Kuala Lumpur',
    cityId: 'kualalumpur',
    cityName: 'Kuala Lumpur',
    districtId: 'kl-center',
    districtName: 'Kuala Lumpur',
    latitude: 3.1390,
    longitude: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
    sourceMode: 'AUTO_CALCULATED',
    defaultMethod: 'MWL',
    defaultAsr: 'STANDARD',
    featuredGroup: 'global',
  },
];

export function getAllBuiltInLocations(customCities: CityLocationDefinition[] = []): CityLocationDefinition[] {
  const uzCities: CityLocationDefinition[] = [];
  for (const reg of UZBEKISTAN_14_REGIONS) {
    for (const c of reg.cities) {
      uzCities.push(c);
    }
  }
  const byId = new Map<string, CityLocationDefinition>();
  for (const loc of [...uzCities, ...GLOBAL_CANONICAL_CITIES, ...customCities]) {
    if (!loc?.id) continue;
    // Asaka canonical definition is ALWAYS MANUAL_ADMIN and cannot be overridden by custom global cities
    if (loc.id === ASAKA_CANONICAL_CITY_ID && byId.has(ASAKA_CANONICAL_CITY_ID)) {
      continue;
    }
    byId.set(loc.id, loc);
  }
  return Array.from(byId.values());
}

export function findBuiltInLocationById(
  cityId: string,
  districtId?: string,
  customCities: CityLocationDefinition[] = []
): CityLocationDefinition | null {
  const all = getAllBuiltInLocations(customCities);
  const exact = all.find((c) => c.id === cityId || c.cityId === cityId);
  if (!exact) return null;
  if (districtId && exact.districts && exact.districts.length > 0) {
    const dist = exact.districts.find((d) => d.id === districtId);
    if (dist) {
      return {
        ...exact,
        districtId: dist.id,
        districtName: dist.name,
        latitude: dist.latitude,
        longitude: dist.longitude,
        namozVaqtiSlug: dist.namozVaqtiSlug || exact.namozVaqtiSlug,
        sourceMode: dist.isAsakaManual ? 'MANUAL_ADMIN' : exact.sourceMode,
      };
    }
  }
  return exact;
}

/**
 * Haversine distance in km between two WGS84 coordinates.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves nearest known city (or Asaka if within 16 km of Asaka center).
 */
export function findNearestLocation(
  latitude: number,
  longitude: number,
  customCities: CityLocationDefinition[] = []
): { location: CityLocationDefinition; distanceKm: number; isWithinKnownCity: boolean } {
  const all = getAllBuiltInLocations(customCities);
  let best = all[0];
  let bestDist = Infinity;

  for (const loc of all) {
    const dist = haversineDistanceKm(latitude, longitude, loc.latitude, loc.longitude);
    if (dist < bestDist) {
      bestDist = dist;
      best = loc;
    }
    if (loc.districts) {
      for (const d of loc.districts) {
        const dDist = haversineDistanceKm(latitude, longitude, d.latitude, d.longitude);
        if (dDist < bestDist) {
          bestDist = dDist;
          best = {
            ...loc,
            districtId: d.id,
            districtName: d.name,
            latitude: d.latitude,
            longitude: d.longitude,
            namozVaqtiSlug: d.namozVaqtiSlug || loc.namozVaqtiSlug,
            sourceMode: d.isAsakaManual ? 'MANUAL_ADMIN' : loc.sourceMode,
          };
        }
      }
    }
  }

  return {
    location: best,
    distanceKm: Math.round(bestDist * 10) / 10,
    isWithinKnownCity: bestDist <= 85,
  };
}
