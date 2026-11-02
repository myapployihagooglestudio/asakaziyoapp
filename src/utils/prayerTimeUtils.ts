import { PrayerTimeEntry } from '../types';

export interface NextPrayerInfo {
  currentPrayer: PrayerTimeEntry | null;
  nextPrayer: PrayerTimeEntry | null;
  secondsRemaining: number;
  countdownText: string;
  isTomorrow: boolean;
}

/**
 * Parses time string (e.g. "05:12" or "12:28") into total seconds from start of day
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Gets current seconds from midnight in Asia/Tashkent timezone
 */
export function getCurrentTashkentSeconds(): { totalSeconds: number; now: Date } {
  const now = new Date();
  try {
    // Get time string in Tashkent timezone
    const tashkentStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Tashkent',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = tashkentStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    return { totalSeconds: h * 3600 + m * 60 + s, now };
  } catch (e) {
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    return { totalSeconds: h * 3600 + m * 60 + s, now };
  }
}

/**
 * Computes exact next prayer and countdown from the daily prayer schedule
 */
export function getNextPrayerCalculation(times: PrayerTimeEntry[]): NextPrayerInfo {
  if (!times || times.length === 0) {
    return {
      currentPrayer: null,
      nextPrayer: null,
      secondsRemaining: 0,
      countdownText: '00:00:00',
      isTomorrow: false,
    };
  }

  const { totalSeconds } = getCurrentTashkentSeconds();

  // Find all times converted to seconds
  const sortedTimes = times.map((entry) => ({
    entry,
    seconds: timeStringToSeconds(entry.time),
  }));

  // Find next upcoming prayer today
  const upcomingToday = sortedTimes.find((p) => p.seconds > totalSeconds);

  if (upcomingToday) {
    const secondsRemaining = upcomingToday.seconds - totalSeconds;
    const h = Math.floor(secondsRemaining / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;

    // Previous prayer is the one right before upcomingToday
    const upcomingIndex = sortedTimes.indexOf(upcomingToday);
    const currentEntry = upcomingIndex > 0 ? sortedTimes[upcomingIndex - 1].entry : sortedTimes[sortedTimes.length - 1].entry;

    return {
      currentPrayer: currentEntry,
      nextPrayer: upcomingToday.entry,
      secondsRemaining,
      countdownText: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      isTomorrow: false,
    };
  }

  // If all prayers today have passed, next prayer is tomorrow's first prayer (Bomdod)
  const bomdod = sortedTimes[0];
  const secondsUntilMidnight = 86400 - totalSeconds;
  const secondsRemaining = secondsUntilMidnight + bomdod.seconds;
  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = secondsRemaining % 60;

  return {
    currentPrayer: sortedTimes[sortedTimes.length - 1].entry, // Xufton
    nextPrayer: bomdod.entry, // Tomorrow Bomdod
    secondsRemaining,
    countdownText: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    isTomorrow: true,
  };
}
