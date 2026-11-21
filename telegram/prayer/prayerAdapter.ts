/**
 * ASAKA ZIYO — Strictly Read-Only Smart Prayer Intelligence Adapter
 *
 * Rules:
 * - Reads ONLY administrator-verified / canonical ASAKA ZIYO prayer schedule.
 * - NEVER overrides prayer times with external unverified calculations.
 * - Provides Asia/Tashkent (UTC+5) next prayer countdown, Juma card,
 *   Ramadan Saharlik/Iftorlik card (using verified Subh/Shom schedule fields),
 *   Asaka Qibla bearing (241° WSW), and religious holidays calendar.
 */

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { PrayerSchedule } from '../../src/types';
import { TelegramLocale, TelegramPrayerNotificationKey } from '../types';
import { getTelegramLocaleBundle } from '../locales';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';
import { getDynamicHijriDate } from '../services/qiblaHijriService';

export type ReadOnlyPrayerScheduleProvider = () => PrayerSchedule | null;

const CORE_PRAYER_KEYS = ['bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'] as const;

export interface ReligiousCalendarEvent {
  id: string;
  dateLabel: string;
  hijriLabel: string;
  titles: Record<TelegramLocale, string>;
}

export const RELIGIOUS_CALENDAR_MILESTONES: ReligiousCalendarEvent[] = [
  {
    id: 'juma-weekly',
    dateLabel: 'Har Juma',
    hijriLabel: 'Sayyidul Ayyom',
    titles: {
      'uz-Latn': 'Juma kuni — Kahf surasi, koʻp salavot va Juma namozi (Masjidda)',
      'uz-Cyrl': 'Жума куни — Каҳф сураси, кўп салавот ва Жума намози (Масжидда)',
      'uz-Latn-new': 'Juma kuni — Kahf surasi, köp salavot va Juma namozi (Masjidda)',
      ru: 'Пятница — сура Аль-Кахф, благословения Пророку ﷺ и Джума-намаз',
      en: 'Friday (Jumuah) — Surah Al-Kahf, abundant Salawat, and Jumuah congregation',
    },
  },
  {
    id: 'ramazon-start',
    dateLabel: 'Hijriy 1-Ramazon',
    hijriLabel: '1 Ramazon',
    titles: {
      'uz-Latn': 'Muborak Ramazon oyi boshlanishi (OʻMI rasmiy oy koʻrish qarori bilan)',
      'uz-Cyrl': 'Муборак Рамазон ойи бошланиши (ЎМИ расмий ой кўриш қарори билан)',
      'uz-Latn-new': 'Muborak Ramazon oyi boşlanişi (ÖMI rasmiy oy köriş qarori bilan)',
      ru: 'Начало благословенного месяца Рамадан (по официальному объявлению ДУМУ)',
      en: 'Start of Blessed Ramadan (confirmed by Muslim Board of Uzbekistan crescent sighting)',
    },
  },
  {
    id: 'laylatul-qadr',
    dateLabel: '27-Ramazon kechasi',
    hijriLabel: '27 Ramazon',
    titles: {
      'uz-Latn': 'Qadr kechasi (oxirgi oʻn kunlik toq kechalarida izlanadi)',
      'uz-Cyrl': 'Қадр кечаси (охирги ўн кунлик тоқ кечаларида изланади)',
      'uz-Latn-new': 'Qadr keçasі (oxirgi ön kunlik toq keçalarida izlanadi)',
      ru: 'Ночь Предопределения (Ляйлятуль-Кадр — нечетные ночи последних 10 дней)',
      en: 'Laylat al-Qadr (sought in odd nights of the last ten days of Ramadan)',
    },
  },
  {
    id: 'ramazon-hayit',
    dateLabel: '1-Shavvol',
    hijriLabel: '1 Shavvol',
    titles: {
      'uz-Latn': 'Iydul Fitr — Ramazon hayiti bayrami',
      'uz-Cyrl': 'Ийдул Фитр — Рамазон ҳайити байрами',
      'uz-Latn-new': 'Iydul Fitr — Ramazon hayiti bayrami',
      ru: 'Ид аль-Фитр — Праздник разговения (Рамазан хайит)',
      en: 'Eid al-Fitr — Festival of Breaking the Fast',
    },
  },
  {
    id: 'qurbon-hayit',
    dateLabel: '10-Zulhijja',
    hijriLabel: '10 Zulhijja',
    titles: {
      'uz-Latn': 'Iydul Adho — Qurbon hayiti (9-Zulhijja — Arafa roʻzasi)',
      'uz-Cyrl': 'Ийдул Адҳо — Қурбон ҳайити (9-Зулҳижжа — Арафа рўзаси)',
      'uz-Latn-new': 'Iydul Adho — Qurbon hayiti (9-Zulhijja — Arafa rözasi)',
      ru: 'Ид аль-Адха — Курбан хайит (9 Зуль-хиджа — День Арафа)',
      en: 'Eid al-Adha — Festival of Sacrifice (9 Dhul-Hijjah — Day of Arafah)',
    },
  },
];

export function getTashkentNowParts(now: Date = new Date()): {
  dateKey: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  hhmm: string;
  totalMinutes: number;
} {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const tashkent = new Date(utcMs + 5 * 3600_000);
  const yyyy = tashkent.getFullYear();
  const mm = String(tashkent.getMonth() + 1).padStart(2, '0');
  const dd = String(tashkent.getDate()).padStart(2, '0');
  const hour = tashkent.getHours();
  const minute = tashkent.getMinutes();
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    hour,
    minute,
    dayOfWeek: tashkent.getDay(),
    hhmm,
    totalMinutes: hour * 60 + minute,
  };
}

function parseMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export class TelegramPrayerAdapter {
  private readonly getScheduleReadOnly: ReadOnlyPrayerScheduleProvider;
  private lastKnownScheduleSignature = '';

  constructor(getScheduleReadOnly?: ReadOnlyPrayerScheduleProvider) {
    this.getScheduleReadOnly =
      getScheduleReadOnly || (() => INITIAL_ASAKA_PRAYER_SCHEDULE);
    this.lastKnownScheduleSignature = this.computeScheduleSignature(this.getCurrentSchedule());
  }

  private computeScheduleSignature(schedule: PrayerSchedule): string {
    const core = schedule.times.map((t) => `${t.key}:${t.time}:${t.iqamahTime || ''}`).join('|');
    return `${schedule.date}::${core}`;
  }

  hasScheduleChangedSinceLastCheck(): boolean {
    const nextSig = this.computeScheduleSignature(this.getCurrentSchedule());
    if (nextSig !== this.lastKnownScheduleSignature) {
      this.lastKnownScheduleSignature = nextSig;
      return true;
    }
    return false;
  }

  getCurrentSchedule(): PrayerSchedule {
    try {
      const live = this.getScheduleReadOnly();
      if (live && Array.isArray(live.times) && live.times.length > 0) {
        return {
          ...live,
          times: live.times.map((t) => ({ ...t })),
        };
      }
    } catch {
      // Fall back cleanly to canonical Asaka schedule
    }
    return {
      ...INITIAL_ASAKA_PRAYER_SCHEDULE,
      times: INITIAL_ASAKA_PRAYER_SCHEDULE.times.map((t) => ({ ...t })),
    };
  }

  getNextPrayerInfo(
    locale: TelegramLocale,
    now: Date = new Date()
  ): { key: string; name: string; time: string; remainingMinutes: number } | null {
    const schedule = this.getCurrentSchedule();
    const dict = getTelegramLocaleBundle(locale);
    const { totalMinutes } = getTashkentNowParts(now);

    const candidates = CORE_PRAYER_KEYS.map((key) => {
      const item = schedule.times.find((t) => t.key === key);
      const mins = parseMinutes(item?.time);
      return item && mins !== null ? { key, time: item.time, mins } : null;
    }).filter((c): c is { key: (typeof CORE_PRAYER_KEYS)[number]; time: string; mins: number } =>
      Boolean(c)
    );

    if (candidates.length === 0) return null;

    const upcoming = candidates.find((c) => c.mins > totalMinutes);
    if (upcoming) {
      return {
        key: upcoming.key,
        name: dict.prayerNames[upcoming.key],
        time: upcoming.time,
        remainingMinutes: upcoming.mins - totalMinutes,
      };
    }

    const firstTomorrow = candidates[0];
    return {
      key: firstTomorrow.key,
      name: dict.prayerNames[firstTomorrow.key],
      time: firstTomorrow.time,
      remainingMinutes: 24 * 60 - totalMinutes + firstTomorrow.mins,
    };
  }

  getDueAzanPrayerAt(now: Date = new Date()): {
    key: TelegramPrayerNotificationKey;
    time: string;
    dateKey: string;
  } | null {
    const schedule = this.getCurrentSchedule();
    const parts = getTashkentNowParts(now);
    const alertKeys: TelegramPrayerNotificationKey[] = [
      'tahajjud',
      'subh',
      'bomdod',
      'peshin',
      'asr',
      'shom',
      'xufton',
      ...(parts.dayOfWeek === 5 ? (['juma'] as TelegramPrayerNotificationKey[]) : []),
    ];
    for (const key of alertKeys) {
      const item = schedule.times.find((t) => t.key === key);
      if (item?.time?.trim() === parts.hhmm) {
        return { key, time: item.time.trim(), dateKey: parts.dateKey };
      }
    }
    return null;
  }

  getResolvedHijriLabel(locale: TelegramLocale, now: Date = new Date()): string {
    const schedule = this.getCurrentSchedule();
    if (schedule.hijriDate && schedule.hijriDate.trim() && schedule.hijriDate.trim() !== '—') {
      return schedule.hijriDate.trim();
    }
    return getDynamicHijriDate(now, locale).formatted;
  }

  formatAzanReminderMessage(
    prayerKey: TelegramPrayerNotificationKey,
    time: string,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry,
    now: Date = new Date()
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();
    const prayerName = dict.prayerNames[prayerKey];
    const hijri = this.getResolvedHijriLabel(locale, now);
    const template =
      `${dict.azanReminderPrefix}: ${prayerName} (${time})\n` +
      `{{emoji:brand.crescent}} ${dict.prayerLocationLine}: ${schedule.location || 'Asaka, Andijon'}\n` +
      `{{emoji:calendar.date}} ${hijri}`;
    return emojiRegistry.formatMessage(template);
  }

  buildPrayerScheduleTemplate(locale: TelegramLocale, now: Date = new Date()): string {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();
    const tashkentNow = getTashkentNowParts(now);

    const findEntry = (key: string) =>
      schedule.times.find((t) => t.key === key);

    const fmtTime = (key: string): string => {
      const e = findEntry(key);
      if (!e?.time) return '--:--';
      return e.iqamahTime ? `${e.time} (${dict.iqamahLabel}: ${e.iqamahTime})` : e.time;
    };

    const next = this.getNextPrayerInfo(locale, now);
    const nextLine = next
      ? `{{emoji:brand.star}} ${dict.prayerNextLabel}: ${next.name} (${next.time}) — ${Math.floor(next.remainingMinutes / 60)}h ${next.remainingMinutes % 60}m`
      : null;

    const hijriLabel = this.getResolvedHijriLabel(locale, now);
    const tahajjudTime = findEntry('tahajjud')?.time;
    const subhTime = findEntry('subh')?.time;

    const lines: string[] = [
      dict.prayerTitle,
      '',
      `{{emoji:calendar.date}} ${dict.prayerDateLine}: ${schedule.formattedDateUz || schedule.date}`,
      `{{emoji:brand.crescent}} ${dict.prayerHijriLine}: ${hijriLabel}`,
      `{{emoji:brand.mosque}} ${dict.prayerLocationLine}: ${schedule.location || 'Asaka, Andijon'} (Qibla: ${schedule.qiblaAngleDeg || 241}°)`,
      '',
      ...(tahajjudTime ? [`{{emoji:brand}} ${dict.prayerNames.tahajjud}: ${tahajjudTime}`] : []),
      ...(subhTime ? [`{{emoji:brand}} ${dict.prayerNames.subh}: ${subhTime}`] : []),
      `{{emoji:prayer.fajr}} ${dict.prayerNames.bomdod}: ${fmtTime('bomdod')}`,
      `{{emoji:prayer.sunrise}} ${dict.prayerNames.quyosh}: ${fmtTime('quyosh')}`,
      `{{emoji:prayer.dhuhr}} ${dict.prayerNames.peshin}: ${fmtTime('peshin')}`,
      `{{emoji:prayer.asr}} ${dict.prayerNames.asr}: ${fmtTime('asr')}`,
      `{{emoji:prayer.maghrib}} ${dict.prayerNames.shom}: ${fmtTime('shom')}`,
      `{{emoji:prayer.isha}} ${dict.prayerNames.xufton}: ${fmtTime('xufton')}`,
    ];

    const jumaTime = findEntry('juma')?.time;
    if (jumaTime) {
      lines.push(`{{emoji:prayer.juma}} ${dict.prayerNames.juma}: ${jumaTime}`);
    }
    if (tashkentNow.dayOfWeek === 5) {
      lines.push(`{{emoji:brand.star}} ${dict.jumaSpecialNotice}`);
    }
    if (nextLine) {
      lines.push('', nextLine);
    }

    lines.push('', dict.prayerFooterNote);
    return lines.join('\n');
  }

  formatPrayerScheduleMessage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry,
    now: Date = new Date()
  ): FormattedEmojiMessage {
    return emojiRegistry.formatMessage(this.buildPrayerScheduleTemplate(locale, now));
  }

  formatRamadanModeMessage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();
    const subh = schedule.times.find((t) => t.key === 'subh')?.time || '--:--';
    const shom = schedule.times.find((t) => t.key === 'shom')?.time || '--:--';

    const lines = [
      dict.ramadanTitle,
      '',
      `{{emoji:brand.crescent}} ${dict.prayerLocationLine}: ${schedule.location || 'Asaka, Andijon'}`,
      `{{emoji:calendar.date}} ${schedule.hijriDate || schedule.date}`,
      '',
      `• ${dict.saharlikLabel} (${dict.prayerNames.subh}): ${subh}`,
      `• ${dict.iftorlikLabel} (${dict.prayerNames.shom}): ${shom}`,
      '',
      dict.ramadanVerifiedNote,
      '',
      dict.prayerFooterNote,
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  formatReligiousCalendarMessage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry,
    now: Date = new Date()
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const hijri = this.getResolvedHijriLabel(locale, now);
    const lines = [
      dict.calendarTitle,
      `{{emoji:brand.crescent}} ${dict.prayerHijriLine}: ${hijri}`,
      '',
      ...RELIGIOUS_CALENDAR_MILESTONES.map(
        (ev, idx) => `${idx + 1}. [${ev.dateLabel}] ${ev.titles[locale] || ev.titles['uz-Latn']}`
      ),
      '',
      dict.prayerFooterNote,
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }

  formatDailySmartDigest(params: {
    locale: TelegramLocale;
    emojiRegistry: CustomEmojiRegistry;
    userDisplayName?: string;
    verseSummary: string;
    hadithSummary: string;
    dhikrSummary: string;
    announcementTitle?: string;
    hifzSummaryLine?: string;
    now?: Date;
  }): FormattedEmojiMessage {
    const { locale, emojiRegistry } = params;
    const now = params.now || new Date();
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();
    const parts = getTashkentNowParts(now);
    const hijri = this.getResolvedHijriLabel(locale, now);
    const getT = (k: string) => schedule.times.find((t) => t.key === k)?.time || '--:--';

    const greeting = params.userDisplayName
      ? `Assalomu alaykum, ${params.userDisplayName}!`
      : 'Assalomu alaykum!';

    const lines = [
      dict.dailyDigestTitle,
      greeting,
      `{{emoji:calendar.date}} ${parts.dateKey} | {{emoji:brand.crescent}} ${hijri}`,
      '',
      `{{emoji:prayer}} ${dict.prayerNames.bomdod}: ${getT('bomdod')} • ${dict.prayerNames.peshin}: ${getT('peshin')} • ${dict.prayerNames.asr}: ${getT('asr')} • ${dict.prayerNames.shom}: ${getT('shom')} • ${dict.prayerNames.xufton}: ${getT('xufton')}`,
      ...(parts.dayOfWeek === 5 ? [`{{emoji:brand.star}} ${dict.jumaSpecialNotice}`] : []),
      '',
      `{{emoji:quran}} ${params.verseSummary}`,
      '',
      `{{emoji:hadith}} ${params.hadithSummary}`,
      '',
      `{{emoji:dhikr}} ${params.dhikrSummary}`,
      ...(params.hifzSummaryLine ? ['', `{{emoji:hifz}} ${params.hifzSummaryLine}`] : []),
      ...(params.announcementTitle ? ['', `{{emoji:community}} ${params.announcementTitle}`] : []),
    ];

    return emojiRegistry.formatMessage(lines.join('\n'));
  }
}
