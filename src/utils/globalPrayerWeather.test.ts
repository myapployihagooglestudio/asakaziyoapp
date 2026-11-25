/**
 * ASAKA ZIYO — Global Prayer Times & Weather Ecosystem 2026
 * Live End-to-End Verification Suite
 *
 * Verifies against live server http://127.0.0.1:3000:
 * 1. Security: unauthenticated admin endpoints reject with 401.
 * 2. Asaka (MANUAL_ADMIN): Admin publish -> Web/Android/Telegram identical -> Global AUTO config & UZ audit NEVER overwrite Asaka -> Rollback cleanly restores original Asaka schedule.
 * 3. Uzbekistan 14 Official Regions: all 14 regions present, daily + monthly calendars work, live verification audit runs honestly against fatvo.uz, muslim.uz, namoz-vaqti.uz, islomapi.uz.
 * 4. Global Cities & DST: Makkah, Madinah, Riyadh, Istanbul, Dubai, Bishkek, Dushanbe + DST transitions for London (Europe/London) & New York (America/New_York) Jan vs Jul.
 * 5. Global Weather (Open-Meteo): Asaka, Toshkent, Makkah, Madinah -> current, 24h hourly, 7d/16d daily, CC BY 4.0 attribution, cache hit verification, and stale-data guard verification.
 * 6. Cross-Platform Sync & GPS: GPS nearest city resolution + /api/user/location-pref persistence + Telegram bot formatter parity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  formatPrayerScheduleForTelegram,
  formatWeatherForTelegram,
} from '../../telegram/services/globalPrayerWeatherBotHelper';
import { ASAKA_CANONICAL_CITY_ID, findBuiltInLocationById } from '../data/globalLocationsData';
import { calculateGlobalPrayerRecord } from '../services/globalPrayerEngine';
import { fetchGlobalWeather } from '../services/globalWeatherService';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log(`[PASS] ${name} — ${detail}`);
  } catch (err: any) {
    const detail = err?.message || String(err);
    results.push({ name, passed: false, detail });
    console.error(`[FAIL] ${name} — ${detail}`);
  }
}

async function obtainAdminToken(): Promise<string> {
  const secretPath = path.join(process.cwd(), 'data', '.admin_session_secret');
  if (fs.existsSync(secretPath)) {
    const secret = fs.readFileSync(secretPath, 'utf-8').trim();
    if (secret.length >= 16) {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const randomPart = crypto.randomBytes(16).toString('hex');
      const payload = `admin-asakaziyo0:menageradmin:${expiresAt}:${randomPart}`;
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return `asaka_admin_v2_${expiresAt}_${randomPart}.${sig}`;
    }
  }

  const username = process.env.ADMIN_INITIAL_USERNAME || 'menageradmin';
  const password = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || 'menageradmin1';
  const res = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json: any = await res.json();
  if (!res.ok || !json?.token) {
    throw new Error(`Admin auth failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return String(json.token);
}

async function fetchJson(endpoint: string, init?: RequestInit): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main(): Promise<void> {
  console.log('=== ASAKA ZIYO GLOBAL PRAYER & WEATHER VERIFICATION SUITE ===\n');

  const adminToken = await obtainAdminToken();
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // 1. Security guard on admin routes
  await runTest('1. Security: Unauthenticated admin request blocked (401)', async () => {
    const { status } = await fetchJson('/api/admin/global-prayer/overview');
    assert(status === 401, `Expected 401, got ${status}`);
    return `HTTP ${status} rejected as expected`;
  });

  // 2. Engine-level guard: calculateGlobalPrayerRecord MUST refuse Asaka
  await runTest('2. Isolation Guard: AUTO engine refuses Asaka cityId', async () => {
    const asakaLoc = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
    let threw = false;
    try {
      calculateGlobalPrayerRecord(asakaLoc);
    } catch (e: any) {
      threw = /MANUAL_ADMIN/i.test(e?.message || '');
    }
    assert(threw, 'calculateGlobalPrayerRecord did NOT throw MANUAL_ADMIN guard error for Asaka!');
    return 'calculateGlobalPrayerRecord strictly threw MANUAL_ADMIN isolation error';
  });

  // 3. Asaka MANUAL_ADMIN full publish -> verify parity -> AUTO config mutation -> rollback
  await runTest('3. Asaka MANUAL_ADMIN: Publish, Cross-Platform Parity, AUTO Isolation & Rollback', async () => {
    const overviewInit = await fetchJson('/api/admin/global-prayer/overview', { headers: adminHeaders });
    assert(overviewInit.status === 200 && overviewInit.data?.success, 'Failed to fetch admin overview');

    // If a prior interrupted test run left a test publish active, restore the real pre-test version first
    const initVersions: any[] = overviewInit.data.overview.asakaManual.versions || [];
    if (initVersions[0]?.note?.includes('Automated verification test publish')) {
      const realBaseline = initVersions.find((v) => !String(v.note || '').includes('Automated verification test publish'));
      if (realBaseline?.versionId) {
        await fetchJson('/api/admin/global-prayer/asaka/rollback', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ versionId: realBaseline.versionId }),
        });
      }
    }

    const before = await fetchJson(`/api/global-prayer/schedule?cityId=${ASAKA_CANONICAL_CITY_ID}`);
    assert(before.status === 200 && before.data?.success, 'Failed to fetch baseline Asaka schedule');
    const origRecord = before.data.record;
    assert(origRecord.sourceMode === 'MANUAL_ADMIN', `Expected MANUAL_ADMIN, got ${origRecord.sourceMode}`);

    const overviewBefore = await fetchJson('/api/admin/global-prayer/overview', { headers: adminHeaders });
    assert(overviewBefore.status === 200 && overviewBefore.data?.success, 'Failed to fetch admin overview');
    const baselineVersionId = overviewBefore.data.overview.asakaManual.versions?.[0]?.versionId;

    // Publish a controlled test adjustment on bomdod & shom using canonical PrayerSchedule.times format
    const testFajr = origRecord.fajr === '04:59' ? '04:58' : '04:59';
    const testMaghrib = origRecord.maghrib === '18:19' ? '18:18' : '18:19';
    const updatedTimes = (origRecord.times || []).map((t: any) => {
      if (t.key === 'bomdod') return { ...t, time: testFajr };
      if (t.key === 'shom') return { ...t, time: testMaghrib };
      return t;
    });
    const publishRes = await fetchJson('/api/admin/global-prayer/asaka/publish', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        schedule: {
          date: origRecord.localDate,
          times: updatedTimes,
        },
        note: 'Automated verification test publish (will be rolled back)',
      }),
    });
    assert(publishRes.status === 200 && publishRes.data?.success, `Publish failed: ${JSON.stringify(publishRes.data)}`);

    // Verify Web/Android REST reflects exact new Asaka MANUAL times (even if AUTO query params are passed!)
    const afterPub = await fetchJson(`/api/global-prayer/schedule?cityId=${ASAKA_CANONICAL_CITY_ID}&method=MWL&asr=STANDARD`);
    assert(afterPub.status === 200 && afterPub.data?.record, 'Failed to refetch Asaka after publish');
    assert(afterPub.data.record.sourceMode === 'MANUAL_ADMIN', 'Asaka sourceMode drifted!');
    assert(afterPub.data.record.fajr === testFajr, `Expected fajr ${testFajr}, got ${afterPub.data.record.fajr}`);
    assert(afterPub.data.record.maghrib === testMaghrib, `Expected maghrib ${testMaghrib}, got ${afterPub.data.record.maghrib}`);

    // Verify Telegram Bot formatter produces identical Asaka times
    const tgText = formatPrayerScheduleForTelegram(afterPub.data.record);
    assert(tgText.includes(testFajr) && tgText.includes(testMaghrib), 'Telegram bot output missing updated Asaka times');
    assert(tgText.includes('MANUAL_ADMIN') || tgText.includes('Administrator'), 'Telegram output missing MANUAL label');

    // Mutate Global AUTO config -> confirm Asaka is COMPLETELY UNAFFECTED
    const origConfig = overviewBefore.data.overview.globalAutoConfig;
    const configRes = await fetchJson('/api/admin/global-prayer/config', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        defaultGlobalMethod: 'ISNA',
        defaultGlobalAsr: 'STANDARD',
      }),
    });
    assert(configRes.status === 200 && configRes.data?.success, 'Global config update failed');

    const afterAutoChange = await fetchJson(`/api/global-prayer/schedule?cityId=${ASAKA_CANONICAL_CITY_ID}`);
    assert(
      afterAutoChange.data.record.fajr === testFajr &&
        afterAutoChange.data.record.maghrib === testMaghrib &&
        afterAutoChange.data.record.sourceMode === 'MANUAL_ADMIN',
      'Global AUTO config mutation altered Asaka MANUAL schedule!'
    );

    // Restore original Global AUTO config
    await fetchJson('/api/admin/global-prayer/config', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        defaultGlobalMethod: origConfig.defaultGlobalMethod,
        defaultGlobalAsr: origConfig.defaultGlobalAsr,
      }),
    });

    // Rollback Asaka to baseline version (or restore original times if no prior version existed)
    const versionsAfter = publishRes.data.overview.asakaManual.versions || [];
    const targetRollbackId = baselineVersionId || versionsAfter[1]?.versionId;
    if (targetRollbackId) {
      const rb = await fetchJson('/api/admin/global-prayer/asaka/rollback', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ versionId: targetRollbackId }),
      });
      assert(rb.status === 200 && rb.data?.success, `Rollback failed: ${JSON.stringify(rb.data)}`);
    } else {
      await fetchJson('/api/admin/global-prayer/asaka/publish', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          schedule: {
            date: origRecord.localDate,
            times: origRecord.times,
          },
          note: 'Restore baseline Asaka schedule after verification test',
        }),
      });
    }

    const restored = await fetchJson(`/api/global-prayer/schedule?cityId=${ASAKA_CANONICAL_CITY_ID}`);
    assert(
      restored.data.record.fajr === origRecord.fajr && restored.data.record.maghrib === origRecord.maghrib,
      `Rollback did not restore original times (expected ${origRecord.fajr}/${origRecord.maghrib}, got ${restored.data.record.fajr}/${restored.data.record.maghrib})`
    );
    return `Publish (${testFajr}/${testMaghrib}) -> Telegram/Web parity -> AUTO isolation -> Rollback restored (${origRecord.fajr}/${origRecord.maghrib})`;
  });

  // 4. Uzbekistan 14 Official Regions
  await runTest('4. Uzbekistan 14 Official Regions: Directory, Daily & Monthly Schedules', async () => {
    const locRes = await fetchJson('/api/global-prayer/locations');
    assert(locRes.status === 200 && locRes.data?.success, 'Locations endpoint failed');
    assert(locRes.data.uzbekistanRegionsCount === 14, `Expected 14 UZ regions, got ${locRes.data.uzbekistanRegionsCount}`);

    const sampleCities = [
      'uz-tashkent-city-main',
      'uz-samarkand-city',
      'uz-bukhara-city',
      'uz-karakalpakstan-nukus',
      'uz-fergana-city',
      'uz-surkhandarya-termez',
    ];
    const summaries: string[] = [];
    for (const cid of sampleCities) {
      const r = await fetchJson(`/api/global-prayer/schedule?cityId=${cid}`);
      assert(r.status === 200 && r.data?.record, `Failed daily schedule for ${cid}`);
      const rec = r.data.record;
      assert(rec.sourceMode === 'AUTO_CALCULATED', `Expected AUTO_CALCULATED for ${cid}, got ${rec.sourceMode}`);
      assert(rec.timezone === 'Asia/Tashkent', `Wrong TZ for ${cid}: ${rec.timezone}`);
      assert(/^\d{2}:\d{2}$/.test(rec.fajr) && /^\d{2}:\d{2}$/.test(rec.maghrib), `Invalid HH:MM for ${cid}`);
      summaries.push(`${rec.cityName}(${rec.fajr}/${rec.maghrib})`);
    }

    const monthly = await fetchJson('/api/global-prayer/monthly?cityId=uz-tashkent-city-main&year=2026&month=5');
    assert(monthly.status === 200 && Array.isArray(monthly.data?.rows) && monthly.data.rows.length === 31, 'Monthly calendar for Toshkent (May 2026) did not return 31 rows');
    return `14 regions confirmed; monthly=31d; samples: ${summaries.join(', ')}`;
  });

  // 5. Honest Uzbekistan Verification Audit against fatvo.uz, muslim.uz, namoz-vaqti.uz, islomapi.uz
  await runTest('5. Official Uzbekistan Source Verification Audit (fatvo.uz, muslim.uz, namoz-vaqti.uz, islomapi.uz)', async () => {
    const auditRes = await fetchJson('/api/admin/global-prayer/verify-uzbekistan', {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(auditRes.status === 200 && auditRes.data?.success && auditRes.data.report, `Audit failed: ${JSON.stringify(auditRes.data)}`);
    const report = auditRes.data.report;
    assert(Array.isArray(report.sources) && report.sources.length >= 4, 'Missing audited sources');
    assert(Array.isArray(report.regionResults) && report.regionResults.length === 14, 'Expected 14 region results');

    const srcSummary = report.sources
      .map((s: any) => `${s.name}:${s.reachable ? `HTTP ${s.httpStatus}` : 'DOWN'}(JSON_API=${s.hasPublicJsonApi ? 'yes' : 'no'})`)
      .join(' | ');
    const verifiedCount = report.verifiedRegionsCount ?? 0;
    const totalCount = report.totalRegionsCount ?? 14;
    const maxDelta = Math.max(0, ...report.regionResults.map((r: any) => Number(r.maxAbsDiffMinutes || 0)));

    // Confirm Asaka was NOT overwritten by the audit
    const asakaCheck = await fetchJson(`/api/global-prayer/schedule?cityId=${ASAKA_CANONICAL_CITY_ID}`);
    assert(asakaCheck.data?.record?.sourceMode === 'MANUAL_ADMIN', 'Audit corrupted Asaka sourceMode!');

    return `Verified=${verifiedCount}/${totalCount}, MaxDelta=${maxDelta}m | ${srcSummary}`;
  });

  // 6. Global Cities & DST Verification (Haramain + Central Asia + Turkey + UAE + London/NY DST)
  await runTest('6. Global Cities (Makkah, Madinah, Istanbul, Dubai, Bishkek, Dushanbe) + DST (London & New York)', async () => {
    const globals = [
      { id: 'sa-makkah', tz: 'Asia/Riyadh', method: 'UMM_AL_QURA' },
      { id: 'sa-madinah', tz: 'Asia/Riyadh', method: 'UMM_AL_QURA' },
      { id: 'sa-riyadh', tz: 'Asia/Riyadh', method: 'UMM_AL_QURA' },
      { id: 'tr-istanbul', tz: 'Europe/Istanbul', method: 'DIYANET_TURKEY' },
      { id: 'ae-dubai', tz: 'Asia/Dubai', method: 'DUBAI' },
      { id: 'kg-bishkek', tz: 'Asia/Bishkek', method: 'MWL' },
      { id: 'tj-dushanbe', tz: 'Asia/Dushanbe', method: 'MWL' },
    ];
    const samples: string[] = [];
    for (const g of globals) {
      const r = await fetchJson(`/api/global-prayer/schedule?cityId=${g.id}`);
      assert(r.status === 200 && r.data?.record, `Failed schedule for ${g.id}`);
      assert(r.data.record.timezone === g.tz, `Expected TZ ${g.tz} for ${g.id}, got ${r.data.record.timezone}`);
      samples.push(`${r.data.record.cityName}(${r.data.record.fajr}/${r.data.record.maghrib})`);
    }

    // DST verification: London (UTC+0 in Jan -> UTC+1 in Jul) & New York (UTC-5 in Jan -> UTC-4 in Jul)
    const lonJan = await fetchJson('/api/global-prayer/schedule?cityId=gb-london&date=2026-01-15');
    const lonJul = await fetchJson('/api/global-prayer/schedule?cityId=gb-london&date=2026-07-15');
    assert(lonJan.data.record.isDstActive === false, `London Jan DST should be false`);
    assert(lonJul.data.record.isDstActive === true, `London Jul DST should be true`);
    assert(
      lonJul.data.record.utcOffsetMinutes - lonJan.data.record.utcOffsetMinutes === 60,
      `London DST shift expected +60m, got ${lonJul.data.record.utcOffsetMinutes - lonJan.data.record.utcOffsetMinutes}m`
    );

    const nyJan = await fetchJson('/api/global-prayer/schedule?cityId=us-newyork&date=2026-01-15');
    const nyJul = await fetchJson('/api/global-prayer/schedule?cityId=us-newyork&date=2026-07-15');
    assert(nyJan.data.record.isDstActive === false, `NY Jan DST should be false`);
    assert(nyJul.data.record.isDstActive === true, `NY Jul DST should be true`);
    assert(
      nyJul.data.record.utcOffsetMinutes - nyJan.data.record.utcOffsetMinutes === 60,
      `NY DST shift expected +60m, got ${nyJul.data.record.utcOffsetMinutes - nyJan.data.record.utcOffsetMinutes}m`
    );

    const fmtOffset = (mins: number) => `UTC${mins >= 0 ? '+' : ''}${mins / 60}`;
    return `${samples.join(', ')} | DST PASS: London(${fmtOffset(lonJan.data.record.utcOffsetMinutes)}->${fmtOffset(lonJul.data.record.utcOffsetMinutes)}), NY(${fmtOffset(nyJan.data.record.utcOffsetMinutes)}->${fmtOffset(nyJul.data.record.utcOffsetMinutes)})`;
  });

  // 7. Global Weather (Open-Meteo) — Live Forecast, Attribution, Caching & Telegram Formatter
  await runTest('7. Open-Meteo Weather: Asaka, Toshkent, Makkah, Madinah + Cache Hit + CC BY 4.0', async () => {
    const cities = [
      { id: ASAKA_CANONICAL_CITY_ID, name: 'Asaka' },
      { id: 'uz-tashkent-city-main', name: 'Toshkent' },
      { id: 'sa-makkah', name: 'Makkah' },
      { id: 'sa-madinah', name: 'Madinah' },
    ];
    const temps: string[] = [];
    for (const c of cities) {
      const first = await fetchJson(`/api/weather?cityId=${c.id}`);
      assert(first.status === 200 && first.data?.success && first.data.weather, `Weather failed for ${c.name}: ${JSON.stringify(first.data)}`);
      const w = first.data.weather;
      assert(typeof w.current?.temperatureC === 'number', `Missing current temperatureC for ${c.name}`);
      assert(Array.isArray(w.hourly24) && w.hourly24.length >= 24, `Expected >=24 hourly entries for ${c.name}, got ${w.hourly24?.length}`);
      assert(Array.isArray(w.daily7) && w.daily7.length === 7, `Expected 7 daily7 entries for ${c.name}`);
      assert(Array.isArray(w.daily16) && w.daily16.length >= 14, `Expected >=14 daily16 entries for ${c.name}`);
      assert(
        String(w.attribution || '').includes('Open-Meteo.com') && String(w.attribution || '').includes('CC BY 4.0'),
        `Missing Open-Meteo CC BY 4.0 attribution for ${c.name}`
      );
      temps.push(`${c.name}:${Math.round(w.current.temperatureC)}°C(${w.current.conditionUz})`);
    }

    // Immediate 2nd request for Asaka MUST hit server cache
    const cached = await fetchJson(`/api/weather?cityId=${ASAKA_CANONICAL_CITY_ID}`);
    assert(cached.status === 200 && cached.data?.weather?.cacheHit === true, 'Expected cacheHit=true on 2nd weather fetch for Asaka');

    // Verify Telegram weather formatter includes CC BY 4.0 attribution & 7-day forecast
    const tgWeather = formatWeatherForTelegram(cached.data.weather);
    assert(tgWeather.includes('Open-Meteo.com') && tgWeather.includes('7 kunlik'), 'Telegram weather formatting incomplete');

    return `${temps.join(', ')} | CacheHit=true | CC BY 4.0 verified`;
  });

  // 8. GPS Resolver & Cross-Platform User Location Preference Sync
  await runTest('8. GPS Nearest-City Resolution & Cross-Platform Location Preference Sync', async () => {
    // GPS coords in Asaka (40.6415, 72.2386) -> must resolve to Asaka MANUAL_ADMIN
    const gpsAsaka = await fetchJson('/api/global-prayer/resolve-gps?lat=40.6415&lon=72.2386');
    assert(gpsAsaka.status === 200 && gpsAsaka.data?.location?.id === ASAKA_CANONICAL_CITY_ID, `GPS for Asaka resolved to ${gpsAsaka.data?.location?.id}`);

    // GPS coords in Makkah (21.4225, 39.8262) -> must resolve to sa-makkah
    const gpsMakkah = await fetchJson('/api/global-prayer/resolve-gps?lat=21.4225&lon=39.8262');
    assert(gpsMakkah.status === 200 && gpsMakkah.data?.location?.id === 'sa-makkah', `GPS for Makkah resolved to ${gpsMakkah.data?.location?.id}`);

    // Cross-platform user location pref save & read
    const testUserId = 'verify-cross-platform-user';
    const saveRes = await fetchJson('/api/user/location-pref', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-asaka-user-id': testUserId,
      },
      body: JSON.stringify({
        userId: testUserId,
        platformSource: 'android',
        preference: {
          cityId: 'uz-samarkand-city',
          districtId: 'samarkand-center',
          syncAcrossDevices: true,
        },
      }),
    });
    assert(saveRes.status === 200 && saveRes.data?.success, 'Failed to save cross-platform location pref');

    const getRes = await fetchJson(`/api/user/location-pref?userId=${testUserId}`, {
      headers: { 'x-asaka-user-id': testUserId },
    });
    assert(
      getRes.status === 200 && getRes.data?.preference?.cityId === 'uz-samarkand-city',
      `Expected synced cityId uz-samarkand-city, got ${getRes.data?.preference?.cityId}`
    );

    return `GPS(Asaka=${gpsAsaka.data.distanceKm}km, Makkah=${gpsMakkah.data.distanceKm}km) + Cross-platform sync(uz-samarkand-city) OK`;
  });

  // 9. Worldwide Open-Meteo Geocoding Search
  await runTest('9. Worldwide City Search (Built-in + Open-Meteo Geocoding)', async () => {
    const res = await fetchJson('/api/global-prayer/locations?q=Tokyo');
    assert(res.status === 200 && res.data?.success, 'Location search failed');
    const geocodedCount = Array.isArray(res.data.geocoded) ? res.data.geocoded.length : 0;
    assert(geocodedCount >= 1, `Expected Open-Meteo geocoding results for Tokyo, got ${geocodedCount}`);
    const first = res.data.geocoded[0];
    return `Tokyo geocoded -> ${first.cityName}, ${first.countryName} (${first.timezone})`;
  });

  // 10. Weather Stale-Data Guard (Simulated Open-Meteo Outage MUST mark isStale=true & NEVER lie as live)
  await runTest('10. Weather Stale-Data Guard: Simulated API outage labels stale cache honestly', async () => {
    const live = await fetchGlobalWeather({
      latitude: 40.6415,
      longitude: 72.2387,
      timezone: 'Asia/Tashkent',
      locationLabel: 'Asaka, O‘zbekiston',
      forceRefresh: true,
    });
    assert(live.isStale === false, 'Expected live weather isStale=false');

    const outage = await fetchGlobalWeather({
      latitude: 40.6415,
      longitude: 72.2387,
      timezone: 'Asia/Tashkent',
      locationLabel: 'Asaka, O‘zbekiston',
      forceRefresh: true,
      simulateOfflineForTest: true,
    });
    assert(outage.isStale === true, 'Expected outage weather isStale=true');
    assert(Boolean(outage.staleNotice && outage.staleNotice.includes(live.fetchedAt)), 'Missing explicit staleNotice with original fetchedAt');
    return `Outage cleanly marked isStale=true with original fetchedAt=${live.fetchedAt}`;
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== SUMMARY: ${passed}/${results.length} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
