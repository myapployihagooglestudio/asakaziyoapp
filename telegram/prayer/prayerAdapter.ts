/**
 * ASAKA ZIYO — Strictly Read-Only Prayer Schedule Adapter for Telegram Platform
 *
 * Reads the official Asaka prayer schedule without ANY write access to existing
 * Web App or Mobile App prayer schedule collections.
 */

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { PrayerSchedule } from '../../src/types';
import { TelegramLocale } from '../types';
import { getTelegramLocaleBundle } from '../locales';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';

export type ReadOnlyPrayerScheduleProvider = () => PrayerSchedule | null;

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

  formatPrayerScheduleMessage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const schedule = this.getCurrentSchedule();

    const findTime = (key: string): string => {
      const item = schedule.times.find((t) => t.key === key);
      return item?.time || '--:--';
    };

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
      '',
      dict.prayerFooterNote,
    ];

    return emojiRegistry.formatMessage(lines.join('\n'));
  }
}
