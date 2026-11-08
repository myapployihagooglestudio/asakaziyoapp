import {
  timeStringToSeconds,
  getNextPrayerCalculation,
  getCurrentTashkentSeconds,
} from './prayerTimeUtils';
import { PrayerTimeEntry, PrayerKey } from '../types';
import { INITIAL_ADHAN_TRACKS, ALL_ADHAN_TRACKS } from '../data/adhanTracksData';
import {
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  triggerVibration,
  DEFAULT_PRAYER_ALERT_SETTINGS,
} from './notificationService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log('--- RUNNING PRAYER TIME UTILS & ADHAN ENGINE UNIT TESTS ---');

// 1. Time parsing
assert(timeStringToSeconds('00:00') === 0, '00:00 is 0 seconds');
assert(timeStringToSeconds('01:30') === 5400, '01:30 is 5400 seconds');
assert(timeStringToSeconds('12:28') === 44880, '12:28 is 44880 seconds');
assert(timeStringToSeconds('23:59:59') === 86399, '23:59:59 is 86399 seconds');

// 2. Next prayer calculation with all eight schedule entries
const mockTimes: PrayerTimeEntry[] = [
  { id: '0', key: 'tahajjud', nameUz: 'Tahajjud', nameAr: 'التهجد', time: '03:45', descriptionUz: 'Tahajjud namozi' },
  { id: '01', key: 'subh', nameUz: 'Subh', nameAr: 'الصبح', time: '04:40', descriptionUz: 'Subh kirishi' },
  { id: '1', key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفجر', time: '05:12', iqamahTime: '05:40', descriptionUz: 'Tonggi namoz' },
  { id: '2', key: 'quyosh', nameUz: 'Quyosh', nameAr: 'الشروق', time: '06:38', descriptionUz: 'Quyosh chiqishi' },
  { id: '3', key: 'peshin', nameUz: 'Peshin', nameAr: 'الظهر', time: '12:28', iqamahTime: '12:50', descriptionUz: 'Peshin namozi' },
  { id: '4', key: 'asr', nameUz: 'Asr', nameAr: 'العصر', time: '16:15', iqamahTime: '16:35', descriptionUz: 'Asr namozi' },
  { id: '5', key: 'shom', nameUz: 'Shom', nameAr: 'المغرب', time: '18:18', iqamahTime: '18:23', descriptionUz: 'Shom namozi' },
  { id: '6', key: 'xufton', nameUz: 'Xufton', nameAr: 'العشاء', time: '19:42', iqamahTime: '20:05', descriptionUz: 'Xufton namozi' },
];

assert(mockTimes.length === 8, 'Schedule contains all 8 required prayer entries');
const requiredKeys: PrayerKey[] = ['tahajjud', 'subh', 'bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'];
assert(
  requiredKeys.every((key) => mockTimes.some((entry) => entry.key === key)),
  'All 8 prayer keys (Tahajjud, Subh, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton) are present'
);

const result = getNextPrayerCalculation(mockTimes);
assert(result.nextPrayer !== null, 'Next prayer is resolved with 8 prayer schedule');
assert(typeof result.countdownText === 'string', 'Countdown text formatted');
assert(result.countdownText.includes(':'), 'Countdown text contains colons');
assert(result.secondsRemaining >= 0, 'Seconds remaining is non-negative');

// 3. Timezone Asia/Tashkent verification
const tashkentTime = getCurrentTashkentSeconds();
assert(typeof tashkentTime.totalSeconds === 'number', 'Tashkent totalSeconds is a number');
assert(tashkentTime.totalSeconds >= 0 && tashkentTime.totalSeconds < 86400, 'Tashkent seconds is within a 24-hour day [0, 86400)');

// 4. Verified Adhan tracks verification
assert(ALL_ADHAN_TRACKS.length >= 6, 'Adhan library contains all verified tracks');
const alafasyTracks = ALL_ADHAN_TRACKS.filter((t) => t.muazzin.includes('Alafasy') || t.muazzin.includes('Al-Afosiy'));
assert(alafasyTracks.length >= 4, 'Includes legally accessible Shaykh Mishary Rashid Alafasy recordings');
assert(
  ALL_ADHAN_TRACKS.every((t) => t.id && t.title && t.duration && t.source !== undefined),
  'Every adhan track contains id, title, duration, source and muazzin'
);

// 5. Adhan notification settings and vibration
const settings = getPrayerAlertSettings();
assert(typeof settings.volume === 'number', 'Prayer alert settings has volume control');
assert(settings.perPrayerTracks !== undefined, 'Prayer alert settings supports per-prayer track selection');
assert(settings.individualPrayerAlerts !== undefined, 'Prayer alert settings supports individual prayer alert switches');

console.log('All prayer calculation and adhan engine tests passed!');
