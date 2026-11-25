/**
 * ASAKA ZIYO — Telegram Bot Global Prayer & Weather Helper
 *
 * Bridges Telegram Bot commands (/namoz, /obhavo, /weather, /hudud, /region)
 * and inline callbacks (`gpray:*`) to the single central `GlobalPrayerEcosystemService`.
 *
 * Architectural Rule:
 * - Asaka (`uz-andijan-asaka`) ALWAYS renders from `sourceMode = 'MANUAL_ADMIN'`
 *   matching Web App & Android App 1:1.
 * - All other 14 Uzbekistan regions & Global cities render from `AUTO_CALCULATED`.
 * - User's saved region preference (`tg:<telegramId>`) syncs via `userLocationPrefs`.
 */

import {
  ASAKA_CANONICAL_CITY_ID,
  GLOBAL_CANONICAL_CITIES,
  UZBEKISTAN_14_REGIONS,
  CityLocationDefinition,
  findBuiltInLocationById,
} from '../../src/data/globalLocationsData';
import { UnifiedPrayerRecord } from '../../src/services/globalPrayerEngine';
import { GlobalPrayerEcosystemService } from '../../src/services/globalPrayerEcosystemServer';
import {
  GlobalWeatherResponse,
  searchGlobalCitiesOpenMeteo,
} from '../../src/services/globalWeatherService';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramInlineKeyboardMarkup, TelegramLocale } from '../types';

export function getTelegramUserPrefKey(telegramId: string | number): string {
  return `tg:${String(telegramId)}`;
}

export function resolveCityQueryToLocation(
  ecosystem: GlobalPrayerEcosystemService,
  queryRaw: string
): CityLocationDefinition | null {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return null;
  const all = ecosystem.getAllLocations();
  // Exact id or cityName match first
  const exact = all.find(
    (loc) =>
      loc.id.toLowerCase() === q ||
      loc.cityId.toLowerCase() === q ||
      loc.cityName.toLowerCase() === q ||
      loc.regionName.toLowerCase() === q
  );
  if (exact) return exact;
  // Aliases for common Uzbek / Russian / English spellings
  const aliasMap: Record<string, string> = {
    asaka: ASAKA_CANONICAL_CITY_ID,
    makka: 'sa-makkah',
    makkah: 'sa-makkah',
    mecca: 'sa-makkah',
    madina: 'sa-madinah',
    madinah: 'sa-madinah',
    medina: 'sa-madinah',
    riyod: 'sa-riyadh',
    riyadh: 'sa-riyadh',
    jidda: 'sa-jeddah',
    jeddah: 'sa-jeddah',
    toshkent: 'uz-tashkent-city-main',
    tashkent: 'uz-tashkent-city-main',
    andijon: 'uz-andijan-city',
    andijan: 'uz-andijan-city',
    samarqand: 'uz-samarkand-city',
    samarkand: 'uz-samarkand-city',
    buxoro: 'uz-bukhara-city',
    bukhara: 'uz-bukhara-city',
    fargona: 'uz-fergana-city',
    "farg'ona": 'uz-fergana-city',
    fergana: 'uz-fergana-city',
    namangan: 'uz-namangan-city',
    nukus: 'uz-karakalpakstan-nukus',
    urganch: 'uz-khorezm-urgench',
    qarshi: 'uz-kashkadarya-karshi',
    termiz: 'uz-surkhandarya-termez',
    navoiy: 'uz-navoi-city',
    jizzax: 'uz-jizzakh-city',
    guliston: 'uz-syrdarya-gulistan',
    nurafshon: 'uz-tashkent-region-nurafshon',
    istanbul: 'tr-istanbul',
    ankara: 'tr-ankara',
    dubai: 'ae-dubai',
    dubay: 'ae-dubai',
    almaty: 'kz-almaty',
    olmaota: 'kz-almaty',
    astana: 'kz-astana',
    shymkent: 'kz-shymkent',
    chimkent: 'kz-shymkent',
    bishkek: 'kg-bishkek',
    osh: 'kg-osh',
    "o'sh": 'kg-osh',
    dushanbe: 'tj-dushanbe',
    khujand: 'tj-khujand',
    ashgabat: 'tm-ashgabat',
    london: 'gb-london',
    'new york': 'us-newyork',
    newyork: 'us-newyork',
    moskva: 'ru-moscow',
    moscow: 'ru-moscow',
    berlin: 'de-berlin',
    cairo: 'eg-cairo',
    qohira: 'eg-cairo',
  };
  if (aliasMap[q]) {
    const mapped = findBuiltInLocationById(aliasMap[q]);
    if (mapped) return mapped;
  }
  // Substring match
  return (
    all.find(
      (loc) =>
        loc.cityName.toLowerCase().includes(q) ||
        loc.regionName.toLowerCase().includes(q) ||
        loc.countryName.toLowerCase().includes(q) ||
        (loc.districts || []).some((d) => d.name.toLowerCase().includes(q))
    ) || null
  );
}

export async function resolveLocationFromQueryOrGeocoding(
  ecosystem: GlobalPrayerEcosystemService,
  queryRaw: string
): Promise<CityLocationDefinition | null> {
  const localMatch = resolveCityQueryToLocation(ecosystem, queryRaw);
  if (localMatch) return localMatch;
  try {
    const geo = await searchGlobalCitiesOpenMeteo(queryRaw);
    if (geo.length > 0) {
      const top = geo[0];
      return {
        id: top.id,
        countryCode: top.countryCode,
        countryName: top.countryName,
        regionId: 'global-geocoded',
        regionName: top.regionName || top.countryName,
        cityId: top.id,
        cityName: top.cityName,
        districtId: 'center',
        districtName: top.cityName,
        latitude: top.latitude,
        longitude: top.longitude,
        timezone: top.timezone,
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: 'MWL',
        defaultAsr: 'HANAFI',
        featuredGroup: 'global',
      };
    }
  } catch {
    // ignore geocoding network failure
  }
  return null;
}

function getCacheAgeMinutes(fetchedAt: string): number {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

function formatCountdownUz(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} soat ${m} daq`;
  return `${m} daqiqa`;
}

export async function formatTelegramUnifiedPrayerMessage(params: {
  ecosystem: GlobalPrayerEcosystemService;
  telegramId: string;
  locale: TelegramLocale;
  emojiRegistry: CustomEmojiRegistry;
  overrideCityId?: string;
  overrideCustomLocation?: CityLocationDefinition;
}): Promise<{
  record: UnifiedPrayerRecord;
  formatted: ReturnType<CustomEmojiRegistry['formatMessage']>;
  cityId: string;
}> {
  const prefKey = getTelegramUserPrefKey(params.telegramId);
  const savedPref = params.ecosystem.getUserLocationPref(prefKey);

  const cityId =
    params.overrideCityId ||
    params.overrideCustomLocation?.id ||
    savedPref?.cityId ||
    ASAKA_CANONICAL_CITY_ID;

  const customLoc = params.overrideCustomLocation || savedPref?.customLocation || undefined;

  const record = await params.ecosystem.resolvePrayerSchedule({
    cityId,
    districtId: savedPref?.districtId,
    method: savedPref?.calculationMethod,
    asrMethod: savedPref?.asrMethod,
    customCoords:
      customLoc && !findBuiltInLocationById(cityId)
        ? {
            latitude: customLoc.latitude,
            longitude: customLoc.longitude,
            timezone: customLoc.timezone,
            cityName: customLoc.cityName,
            countryName: customLoc.countryName,
            countryCode: customLoc.countryCode,
            regionName: customLoc.regionName,
          }
        : undefined,
  });

  // Non-blocking quick weather snippet (never blocks if weather fails)
  let weatherSnippet = '';
  try {
    const w = await params.ecosystem.resolveWeather({
      cityId: record.cityId,
      latitude: record.latitude,
      longitude: record.longitude,
      timezone: record.timezone,
      label: `${record.cityName}, ${record.countryName}`,
    });
    if (w?.current) {
      const staleMark = w.isStale ? ' (kesh)' : '';
      weatherSnippet = `\nOb-havo: ${Math.round(w.current.temperatureC)}°C · ${w.current.conditionUz}${staleMark}`;
    }
  } catch {
    // weather is optional inside /namoz card
  }

  const text = formatPrayerScheduleForTelegram(record, weatherSnippet);
  const formatted = params.emojiRegistry.formatMessage(text);
  return { record, formatted, cityId: record.cityId };
}

export function formatPrayerScheduleForTelegram(
  record: UnifiedPrayerRecord,
  weatherSnippet = ''
): string {
  const isManualAsaka = record.sourceMode === 'MANUAL_ADMIN';
  const modeBadge = isManualAsaka
    ? 'ASAKA RASMIY (MANUAL_ADMIN)'
    : record.verified
      ? `AUTO · TASDIQLANGAN (${record.sourceName})`
      : `AUTO · ASTRONOMIK (${record.calculationMethod})`;

  const lines: string[] = [
    `{{emoji:prayer}} NAMOZ VAQTLARI — ${record.cityName.toUpperCase()}`,
    `${record.regionName}, ${record.countryName}`,
    `Sana: ${record.localDate} (${record.hijriDate})`,
    `Vaqt zonasi: ${record.timezone} (${record.localTimeNow})`,
    `Manba: ${modeBadge}`,
    '',
  ];

  if (record.tahajjud) lines.push(`• Tahajjud: ${record.tahajjud}`);
  if (record.subh) lines.push(`• Subh (Saharlik): ${record.subh}`);
  lines.push(
    `• Bomdod: ${record.fajr}`,
    `• Quyosh: ${record.sunrise}`,
    `• Peshin: ${record.dhuhr}`,
    `• Asr: ${record.asr}`,
    `• Shom (Iftorlik): ${record.maghrib}`,
    `• Xufton: ${record.isha}`
  );

  if (record.nextPrayer?.nameUz && record.nextPrayer?.time) {
    lines.push(
      '',
      `Keyingi namoz: ${record.nextPrayer.nameUz} (${record.nextPrayer.time}) — ${formatCountdownUz(record.nextPrayer.secondsRemaining)} qoldi`
    );
  }

  lines.push(`Qibla: ${record.qiblaAngleDeg}°`);
  if (weatherSnippet) lines.push(weatherSnippet.trim());

  if (isManualAsaka) {
    lines.push(
      '',
      'Eslatma: Asaka namoz vaqtlari faqat administrator tomonidan boshqariladi va Web, Telegram hamda Android ilovalarida bir xil ko‘rsatiladi.'
    );
  } else if (record.verificationNote) {
    lines.push('', `Izoh: ${record.verificationNote}`);
  }

  return lines.join('\n');
}

export async function formatTelegramWeatherMessage(params: {
  ecosystem: GlobalPrayerEcosystemService;
  telegramId: string;
  emojiRegistry: CustomEmojiRegistry;
  cityQuery?: string;
  overrideCityId?: string;
}): Promise<{
  weather: GlobalWeatherResponse;
  formatted: ReturnType<CustomEmojiRegistry['formatMessage']>;
  cityId: string;
}> {
  const prefKey = getTelegramUserPrefKey(params.telegramId);
  const savedPref = params.ecosystem.getUserLocationPref(prefKey);

  let targetLoc: CityLocationDefinition | null = null;
  if (params.cityQuery && params.cityQuery.trim()) {
    targetLoc = await resolveLocationFromQueryOrGeocoding(params.ecosystem, params.cityQuery);
  } else if (params.overrideCityId) {
    targetLoc = findBuiltInLocationById(params.overrideCityId);
  } else if (savedPref?.cityId) {
    targetLoc =
      findBuiltInLocationById(savedPref.cityId, savedPref.districtId) ||
      savedPref.customLocation ||
      null;
  }

  if (!targetLoc) {
    targetLoc = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
  }

  const weather = await params.ecosystem.resolveWeather({
    cityId: targetLoc.id,
    latitude: targetLoc.latitude,
    longitude: targetLoc.longitude,
    timezone: targetLoc.timezone,
    label: `${targetLoc.cityName}, ${targetLoc.countryName}`,
  });

  const text = formatWeatherForTelegram(weather, targetLoc.cityName, `${targetLoc.regionName}, ${targetLoc.countryName}`);
  const formatted = params.emojiRegistry.formatMessage(text);
  return { weather, formatted, cityId: targetLoc.id };
}

export function formatWeatherForTelegram(
  weather: GlobalWeatherResponse,
  cityTitle?: string,
  subtitle?: string
): string {
  const c = weather.current;
  const tomorrow = weather.daily7[1];
  const weekSummary = weather.daily7
    .slice(0, 7)
    .map(
      (d) =>
        `  ${d.date.slice(5)}: ${Math.round(d.tempMinC)}°..${Math.round(d.tempMaxC)}°C · ${d.conditionUz} (yog‘in ${d.precipitationProbabilityMaxPct}%)`
    )
    .join('\n');

  const freshnessLine = weather.isStale
    ? `OGOHLANTIRISH: Jonli ob-havo yangilanmadi — keshdagi oxirgi ma'lumot (${weather.fetchedAt.slice(0, 16).replace('T', ' ')} UTC)`
    : weather.cacheHit
      ? `Yangilangan: ${weather.fetchedAt.slice(11, 16)} UTC (kesh · ${getCacheAgeMinutes(weather.fetchedAt)} daq)`
      : `Yangilangan: ${weather.fetchedAt.slice(11, 16)} UTC (jonli)`;

  const headerCity = (cityTitle || weather.locationLabel || 'SHAHAR').toUpperCase();
  const lines: string[] = [
    `{{emoji:brand.star}} OB-HAVO — ${headerCity}`,
    `${subtitle || weather.locationLabel} (${weather.timezone})`,
    '',
    `Hozir: ${c.temperatureC.toFixed(1)}°C (His qilinishi: ${c.apparentTemperatureC.toFixed(1)}°C)`,
    `Holat: ${c.conditionUz}`,
    `Namlik: ${c.humidityPct}% | Shamol: ${c.windSpeedKmh} km/s (${c.windDirectionLabel})`,
    `Bosim: ${c.surfacePressureHpa} hPa | Yog‘ingarchilik ehtimoli: ${c.precipitationProbabilityPct ?? 0}%`,
    `UV indeks: ${c.uvIndex ?? '—'} | Quyosh chiqishi/botishi: ${c.sunrise || '—'} / ${c.sunset || '—'}`,
  ];

  if (tomorrow) {
    lines.push(
      '',
      `Ertaga (${tomorrow.date}): ${Math.round(tomorrow.tempMinC)}°..${Math.round(tomorrow.tempMaxC)}°C · ${tomorrow.conditionUz} (yog‘in ${tomorrow.precipitationProbabilityMaxPct}%)`
    );
  }

  lines.push(
    '',
    '7 kunlik prognoz:',
    weekSummary,
    '',
    freshnessLine,
    `Manba: ${weather.attribution}`
  );

  return lines.join('\n');
}

export function buildGlobalRegionPickerKeyboard(
  emoji: CustomEmojiRegistry,
  page: 'uz1' | 'uz2' | 'global' = 'uz1'
): TelegramInlineKeyboardMarkup {
  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [
    [
      emoji.buildKeyboardButton('brand.mosque', 'Asaka (Rasmiy MANUAL)', {
        callback_data: `gpray:select:${ASAKA_CANONICAL_CITY_ID}`,
      }),
    ],
    [
      emoji.buildKeyboardButton('brand.crescent', 'Makka', {
        callback_data: 'gpray:select:sa-makkah',
      }),
      emoji.buildKeyboardButton('brand.crescent', 'Madina', {
        callback_data: 'gpray:select:sa-madinah',
      }),
    ],
  ];

  if (page === 'uz1') {
    const first7 = UZBEKISTAN_14_REGIONS.slice(0, 7);
    for (let i = 0; i < first7.length; i += 2) {
      rows.push(
        first7.slice(i, i + 2).map((r) => ({
          text: r.regionName.replace(' viloyati', '').replace(' Respublikasi', ''),
          callback_data: `gpray:select:${r.capitalCityId}`,
        }))
      );
    }
    rows.push([
      { text: 'O‘zbekiston (8–14) →', callback_data: 'gpray:regions:uz2' },
      { text: 'Dunyo shaharlari →', callback_data: 'gpray:regions:global' },
    ]);
  } else if (page === 'uz2') {
    const next7 = UZBEKISTAN_14_REGIONS.slice(7, 14);
    for (let i = 0; i < next7.length; i += 2) {
      rows.push(
        next7.slice(i, i + 2).map((r) => ({
          text: r.regionName.replace(' viloyati', '').replace(' shahri', ' sh.'),
          callback_data: `gpray:select:${r.capitalCityId}`,
        }))
      );
    }
    rows.push([
      { text: '← O‘zbekiston (1–7)', callback_data: 'gpray:regions:uz1' },
      { text: 'Dunyo shaharlari →', callback_data: 'gpray:regions:global' },
    ]);
  } else {
    const featured = GLOBAL_CANONICAL_CITIES.filter(
      (c) => c.id !== 'sa-makkah' && c.id !== 'sa-madinah'
    ).slice(0, 14);
    for (let i = 0; i < featured.length; i += 2) {
      rows.push(
        featured.slice(i, i + 2).map((c) => ({
          text: `${c.cityName} (${c.countryCode})`,
          callback_data: `gpray:select:${c.id}`,
        }))
      );
    }
    rows.push([
      { text: '← O‘zbekiston 14 hudud', callback_data: 'gpray:regions:uz1' },
    ]);
  }

  rows.push([
    emoji.buildKeyboardButton('nav.prayer', 'Namoz vaqtlari', { callback_data: 'nav:prayer' }),
    emoji.buildKeyboardButton('nav.back', 'Asosiy menyu', { callback_data: 'nav:home' }),
  ]);

  return { inline_keyboard: rows };
}

export function buildWeatherInlineKeyboard(
  cityId: string,
  emoji: CustomEmojiRegistry
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        emoji.buildKeyboardButton('nav.prayer', 'Namoz vaqtlari', {
          callback_data: `gpray:select:${cityId}`,
        }),
        emoji.buildKeyboardButton('brand.star', 'Yangilash', {
          callback_data: `gpray:weather:${cityId}`,
        }),
      ],
      [
        { text: 'Asaka ob-havosi', callback_data: `gpray:weather:${ASAKA_CANONICAL_CITY_ID}` },
        { text: 'Makka ob-havosi', callback_data: 'gpray:weather:sa-makkah' },
      ],
      [
        { text: 'Hudud tanlash (14 viloyat + Dunyo)', callback_data: 'gpray:regions:uz1' },
      ],
      [
        emoji.buildKeyboardButton('nav.back', 'Asosiy menyu', { callback_data: 'nav:home' }),
      ],
    ],
  };
}
