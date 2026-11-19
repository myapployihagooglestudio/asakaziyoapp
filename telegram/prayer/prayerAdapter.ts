/**
 * ASAKA ZIYO — Strictly Read-Only Prayer Schedule Adapter for Telegram Platform
 *
 * Reads the official Asaka prayer schedule without ANY write access to existing
 * Web App or Mobile App prayer schedule collections.
 * Computes Asia/Tashkent (UTC+5) next-prayer countdown and Azan reminder templates.
 */

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { PrayerSchedule } from '../../src/types';
import { TelegramLocale } from '../types';
import { getTelegramLocaleBundle } from '../locales';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';

export type ReadOnlyPrayerScheduleProvider = () => PrayerSchedule | null;

const CORE_PRAYER_KEYS = ['bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'] as const;

export function getTashkentNowParts(now: Date = new Date()): {
  dateKey: string;
  hour: number;
  minute: number;
  hhmm: string;
  totalMinutes: number;
} {
  // Asia/Tashkent is fixed UTC+5 (no DST)
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

  constructor(getScheduleReadOnly?: ReadOnlyPrayerScheduleProvider) {
    this.getScheduleReadOnly =
      getScheduleReadOnly || (() => INITIAL_ASAKA_PRAYER_SCHEDULE);
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

  /**
   * Returns a prayer key if the current Tashkent HH:MM matches one of the 5 fard prayers.
   */
  getDueAzanPrayerAt(now: Date = new Date()): { key: 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton'; time: string; dateKey: string } | null {
    const schedule = this.getCurrentSchedule();
    const parts = getTashkentNowParts(now);
    const fardKeys: Array<'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton'> = [
      'bomdod',
      'peshin',
      'asr',
      'shom',
      'xufton',
    ];
    for (const key of fardKeys) {
      const item = schedule.times.find((t) => t.key === key);
      if (item?.time?.trim() === parts.hhmm) {
        return { key, time: item.time.trim(), dateKey: parts.dateKey };
      }
    }
    return null;
  }

  formatAzanReminderMessage(
    prayerKey: 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton',
    time: string,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();
    const prayerName = dict.prayerNames[prayerKey];
    const template =
      `${dict.azanReminderPrefix}: ${prayerName} (${time})\n` +
      `{{emoji:brand.crescent}} ${dict.prayerLocationLine}: ${schedule.location || 'Asaka, Andijon'}\n` +
      `{{emoji:calendar.date}} ${schedule.hijriDate || schedule.date}`;
    return emojiRegistry.formatMessage(template);
  }

  buildPrayerScheduleTemplate(locale: TelegramLocale, now: Date = new Date()): string {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();

    const findTime = (key: string): string => {
      const item = schedule.times.find((t) => t.key === key);
      return item?.time || '--:--';
    };

    const next = this.getNextPrayerInfo(locale, now);
    const nextLine = next
      ? `{{emoji:brand.star}} ${dict.prayerNextLabel}: ${next.name} (${next.time}) — ${Math.floor(next.remainingMinutes / 60)}h ${next.remainingMinutes % 60}m`
      : null;

    const lines: string[] = [
      dict.prayerTitle,
      '',
      `{{emoji:calendar.date}} ${dict.prayerDateLine}: ${schedule.formattedDateUz || schedule.date}`,
      `{{emoji:brand.crescent}} ${dict.prayerHijriLine}: ${schedule.hijriDate || '—'}`,
      `{{emoji:brand.mosque}} ${dict.prayerLocationLine}: ${schedule.location || 'Asaka, Andijon'}`,
      '',
      `{{emoji:prayer.fajr}} ${dict.prayerNames.bomdod}: ${findTime('bomdod')}`,
      `{{emoji:prayer.sunrise}} ${dict.prayerNames.quyosh}: ${findTime('quyosh')}`,
      `{{emoji:prayer.dhuhr}} ${dict.prayerNames.peshin}: ${findTime('peshin')}`,
      `{{emoji:prayer.asr}} ${dict.prayerNames.asr}: ${findTime('asr')}`,
      `{{emoji:prayer.maghrib}} ${dict.prayerNames.shom}: ${findTime('shom')}`,
      `{{emoji:prayer.isha}} ${dict.prayerNames.xufton}: ${findTime('xufton')}`,
    ];

    const jumaTime = (schedule.times as Array<{ key: string; time: string }>).find(
      (t) => t.key === 'juma'
    )?.time;
    if (jumaTime) {
      lines.push(`{{emoji:prayer.juma}} ${dict.prayerNames.juma}: ${jumaTime}`);
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
}
