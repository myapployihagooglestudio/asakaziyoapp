/**
 * Unit tests for prayerTimeUtils.ts
 */
import {
  timeStringToSeconds,
  getNextPrayerCalculation,
} from './prayerTimeUtils';
import { PrayerTimeEntry } from '../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log('--- RUNNING PRAYER TIME UTILS UNIT TESTS ---');

// 1. Time parsing
assert(timeStringToSeconds('00:00') === 0, '00:00 is 0 seconds');
assert(timeStringToSeconds('01:30') === 5400, '01:30 is 5400 seconds');
assert(timeStringToSeconds('12:28') === 44880, '12:28 is 44880 seconds');

// 2. Next prayer calculation with dummy times
const mockTimes: PrayerTimeEntry[] = [
  { id: '1', key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفجر', time: '05:12', status: 'upcoming' },
  { id: '2', key: 'quyosh', nameUz: 'Quyosh', nameAr: 'الشروق', time: '06:38', status: 'upcoming' },
  { id: '3', key: 'peshin', nameUz: 'Peshin', nameAr: 'الظهر', time: '12:28', status: 'upcoming' },
  { id: '4', key: 'asr', nameUz: 'Asr', nameAr: 'العصر', time: '16:15', status: 'upcoming' },
  { id: '5', key: 'shom', nameUz: 'Shom', nameAr: 'المغرب', time: '18:18', status: 'upcoming' },
  { id: '6', key: 'xufton', nameUz: 'Xufton', nameAr: 'العشاء', time: '19:42', status: 'upcoming' },
];

const result = getNextPrayerCalculation(mockTimes);
assert(result.nextPrayer !== null, 'Next prayer is resolved');
assert(typeof result.countdownText === 'string', 'Countdown text formatted');
assert(result.countdownText.includes(':'), 'Countdown text contains colons');
assert(result.secondsRemaining >= 0, 'Seconds remaining is non-negative');

console.log('All prayer calculation tests passed!');
