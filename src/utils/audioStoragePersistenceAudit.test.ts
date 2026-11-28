import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import {
  QuranEcosystemService,
  ODILJON_QORI_ID,
} from '../services/quranEcosystemServer';
import {
  AudioStorageError,
  InMemoryAudioStorageDriver,
  type AudioObjectStorageDriver,
} from '../services/firebaseAudioStorage';
import { createQuranPremiumEcosystemRouter } from '../../server/quranPremiumEcosystemRouter';
import { TelegramQuranMp3Service } from '../../telegram/services/quranMp3Service';

function makeValidMp3Buffer(tagText: string, bodyLen = 4096): Buffer {
  const header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10]);
  const tagBuf = Buffer.from(tagText.padEnd(16, '_').slice(0, 16), 'utf-8');
  const frameSync = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const digest = crypto.createHash('sha512').update(tagText).digest();
  const body = Buffer.alloc(bodyLen);
  for (let i = 0; i < bodyLen; i++) {
    body[i] = digest[i % digest.length] ^ (i & 0xff);
  }
  return Buffer.concat([header, tagBuf, frameSync, body]);
}

function assertNoBase64BinaryInObject(obj: unknown, pathLabel = 'root'): void {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const lk = k.toLowerCase();
    assert.ok(
      !['audiobase64', 'binarybase64', 'filebase64', 'rawbytes', 'buffer'].includes(lk),
      `Forbidden binary field "${pathLabel}.${k}" found in Firestore payload!`
    );
    if (typeof v === 'string') {
      assert.ok(
        !v.startsWith('data:audio/'),
        `Forbidden data:audio URI in Firestore field "${pathLabel}.${k}"!`
      );
      assert.ok(
        v.length < 20000,
        `Unexpectedly large string (${v.length} chars) in Firestore field "${pathLabel}.${k}"!`
      );
    } else if (typeof v === 'object') {
      assertNoBase64BinaryInObject(v, `${pathLabel}.${k}`);
    }
  }
}

async function httpRequest(
  baseUrl: string,
  method: string,
  urlPath: string,
  options: { headers?: Record<string, string>; body?: any } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const target = new URL(urlPath, baseUrl);
    const payload =
      options.body !== undefined
        ? typeof options.body === 'string'
          ? Buffer.from(options.body, 'utf-8')
          : Buffer.from(JSON.stringify(options.body), 'utf-8')
        : undefined;
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (payload && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (payload) {
      headers['Content-Length'] = String(payload.length);
    }

    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAuditTests() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-audit-14checks-'));
  const dataDir = path.join(tmpRoot, 'data');
  const uploadsDir = path.join(tmpRoot, 'data', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  // Simulated persistent Firestore database surviving container restarts
  const fakeFirestoreDb = new Map<string, Map<string, Record<string, any>>>();
  let simulateFirestoreFailure = false;

  const firestoreWriter = async (col: string, docId: string, payload: Record<string, any>) => {
    // Check #3: Strictly guarantee NO Base64 audio binary is ever sent to Firestore
    assertNoBase64BinaryInObject(payload, `${col}/${docId}`);
    if (simulateFirestoreFailure) {
      return { ok: false, error: 'Simulated Firestore 503 Unavailable' };
    }
    if (!fakeFirestoreDb.has(col)) fakeFirestoreDb.set(col, new Map());
    fakeFirestoreDb.get(col)!.set(docId, JSON.parse(JSON.stringify(payload)));
    return { ok: true };
  };

  const firestoreReader = async (col: string) => {
    const colMap = fakeFirestoreDb.get(col);
    const docs = colMap ? Array.from(colMap.values()).map((d) => JSON.parse(JSON.stringify(d))) : [];
    return { ok: true, docs };
  };

  // Shared Cloud Object Storage surviving container restarts
  const cloudStorage = new InMemoryAudioStorageDriver({ bucketName: 'basic-petal-001dl.firebasestorage.app' });

  // Legacy overrides store for Check #13
  const legacyOverrides: Record<string, any> = {};

  const svc = new QuranEcosystemService({
    dataDir,
    uploadsDir,
    audioStorage: cloudStorage,
    firestoreMirror: firestoreWriter,
    firestoreReadCollection: firestoreReader,
    legacyOverridesReader: () => legacyOverrides,
    legacyOverrideUpdater: async (key, patch) => {
      legacyOverrides[key] = { ...(legacyOverrides[key] || {}), ...patch };
    },
  });

  // Mount real Express router for HTTP streaming, range, and auth checks
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const ADMIN_TOKEN = 'asaka_admin_test_secret_token';
  const isAdminRequest = (req: express.Request) =>
    req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
  const requireAdminAuth: express.RequestHandler = (req, res, next) => {
    if (!isAdminRequest(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized: admin auth required' });
      return;
    }
    next();
  };
  const passThroughLimiter: express.RequestHandler = (_req, _res, next) => next();

  const router = createQuranPremiumEcosystemRouter({
    quranService: svc,
    subscriptionService: {} as any,
    requireAdminAuth,
    sensitiveActionLimiter: passThroughLimiter,
    isAdminRequest,
    extractAdminEmail: () => 'asakaziyo0@gmail.com',
  });
  app.use(router);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // -------------------------------------------------------------------------
    // CHECK 1 & 2 & 3 & 4: Upload -> SHA-256 -> Firestore metadata (no Base64) -> Storage read-back
    // -------------------------------------------------------------------------
    const mp3V1 = makeValidMp3Buffer('audit_surah_001_v1_fotiha', 4096);
    const expectedShaV1 = crypto.createHash('sha256').update(mp3V1).digest('hex');

    const upV1 = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 1,
      buffer: mp3V1,
      mimeType: 'audio/mpeg',
      originalFilename: '001_fotiha_v1.mp3',
      durationSec: 47,
      actor: 'asakaziyo0@gmail.com',
      autoPublish: true,
    });
    assert.equal(upV1.ok, true, 'Check 1: Upload to Firebase Storage must succeed');
    assert.ok(upV1.record);
    assert.equal(upV1.record.storageBackend, 'firebase_storage');
    assert.equal(upV1.record.storageBucket, 'basic-petal-001dl.firebasestorage.app');
    assert.equal(upV1.record.sha256, expectedShaV1, 'Check 2: SHA-256 must match exact uploaded bytes');
    assert.equal(upV1.record.version, 1);
    assert.equal(upV1.firestoreSynced, true, 'Check 3: Firestore metadata must sync cleanly');

    // Verify Firestore stored metadata & ZERO Base64
    const storedFsDoc = fakeFirestoreDb.get('quranAudioFiles')?.get(upV1.record.id);
    assert.ok(storedFsDoc, 'Check 3: quranAudioFiles document must exist in Firestore');
    assert.equal(storedFsDoc.sha256, expectedShaV1);
    assert.equal(storedFsDoc.storagePath, upV1.record.storagePath);
    assertNoBase64BinaryInObject(storedFsDoc, 'quranAudioFiles/v1');

    // Verify Storage read-back byte equality
    const downloadedV1 = await cloudStorage.downloadObjectBuffer(upV1.record.storagePath);
    assert.equal(Buffer.compare(downloadedV1, mp3V1), 0, 'Check 4: Storage bytes must match uploaded bytes identically');

    // Verify ZERO binary files were written to ephemeral local uploads/quran-audio
    const localQuranAudioDir = path.join(uploadsDir, 'quran-audio');
    assert.equal(
      fs.existsSync(localQuranAudioDir) ? fs.readdirSync(localQuranAudioDir).length : 0,
      0,
      'Check 4: Zero audio files may be written to local Cloud Run disk'
    );

    // -------------------------------------------------------------------------
    // CHECK 5: HTTP Audio Streaming + Range: bytes=0-511 (206 Partial Content)
    // -------------------------------------------------------------------------
    const fullStreamRes = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/audio-stream/${encodeURIComponent(upV1.record.id)}`
    );
    assert.equal(fullStreamRes.status, 200, 'Check 5: Full audio stream must return 200');
    assert.equal(fullStreamRes.headers['x-storage-backend'], 'firebase_storage');
    assert.equal(fullStreamRes.headers['x-audio-sha256'], expectedShaV1);
    assert.equal(Buffer.compare(fullStreamRes.body, mp3V1), 0);

    const rangeRes = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/audio-stream/${encodeURIComponent(upV1.record.id)}`,
      { headers: { Range: 'bytes=0-511' } }
    );
    assert.equal(rangeRes.status, 206, 'Check 5: Range request must return 206 Partial Content');
    assert.equal(rangeRes.body.length, 512);
    assert.equal(rangeRes.headers['content-range'], `bytes 0-511/${mp3V1.length}`);
    assert.equal(Buffer.compare(rangeRes.body, mp3V1.subarray(0, 512)), 0);

    // -------------------------------------------------------------------------
    // CHECK 6 & 7: Immutable Versioning (v2 upload preserves v1 in Storage & versionHistory)
    // -------------------------------------------------------------------------
    const mp3V2 = makeValidMp3Buffer('audit_surah_001_v2_fotiha_new', 5120);
    const expectedShaV2 = crypto.createHash('sha256').update(mp3V2).digest('hex');
    const v1StoragePath = upV1.record.storagePath;

    const upV2 = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 1,
      buffer: mp3V2,
      mimeType: 'audio/mpeg',
      originalFilename: '001_fotiha_v2.mp3',
      durationSec: 49,
      actor: 'asakaziyo0@gmail.com',
      autoPublish: true,
    });
    assert.equal(upV2.ok, true);
    assert.ok(upV2.record);
    assert.equal(upV2.record.version, 2, 'Check 7: Version must increment to 2');
    assert.notEqual(upV2.record.storagePath, v1StoragePath, 'Check 6: v2 must use a new immutable object path');
    assert.equal((upV2.record.versionHistory || []).length, 2, 'Check 6: versionHistory must preserve v1 and v2');

    // Old v1 object must STILL exist untouched in Cloud Storage!
    const v1StillInStorage = await cloudStorage.downloadObjectBuffer(v1StoragePath);
    assert.equal(Buffer.compare(v1StillInStorage, mp3V1), 0, 'Check 6: v1 binary object must remain intact in Storage');

    // Active stream must now serve v2 bytes
    const streamV2Res = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/audio-stream/${encodeURIComponent(upV2.record.id)}`
    );
    assert.equal(streamV2Res.status, 200);
    assert.equal(Buffer.compare(streamV2Res.body, mp3V2), 0, 'Check 7: Active stream must serve v2 bytes');

    // -------------------------------------------------------------------------
    // CHECK 8: Restore v1 via restoreAudioVersion (verifies SHA-256 & streams v1 bytes)
    // -------------------------------------------------------------------------
    const restoreRes = await svc.restoreAudioVersion(upV2.record.id, 1, 'asakaziyo0@gmail.com');
    assert.equal(restoreRes.ok, true, 'Check 8: Restoring v1 must succeed');
    assert.equal(restoreRes.restoredFromVersion, 1);
    assert.equal(restoreRes.record?.sha256, expectedShaV1);
    assert.equal(restoreRes.record?.storagePath, v1StoragePath);

    const streamRestoredRes = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/audio-stream/${encodeURIComponent(upV2.record.id)}`
    );
    assert.equal(streamRestoredRes.status, 200);
    assert.equal(Buffer.compare(streamRestoredRes.body, mp3V1), 0, 'Check 8: Restored stream must serve v1 bytes');

    // -------------------------------------------------------------------------
    // CHECK 9: Unauthorized upload & unauthorized preview rejected with 401/403
    // -------------------------------------------------------------------------
    const unauthUpload = await httpRequest(baseUrl, 'POST', '/api/admin/quran-ecosystem/audio/upload', {
      body: {
        qariId: ODILJON_QORI_ID,
        surahNumber: 2,
        audioBase64: mp3V1.toString('base64'),
        mimeType: 'audio/mpeg',
      },
    });
    assert.equal(unauthUpload.status, 401, 'Check 9: Unauthorized audio upload must return 401');

    // Upload unpublished Surah 2 and ensure non-admin cannot preview=1
    const mp3S2 = makeValidMp3Buffer('audit_surah_002_unpublished', 2048);
    const upS2 = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 2,
      buffer: mp3S2,
      mimeType: 'audio/mpeg',
      originalFilename: '002_baqara.mp3',
      actor: 'asakaziyo0@gmail.com',
      autoPublish: false,
    });
    assert.equal(upS2.ok, true);
    const unauthPreview = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/audio-stream/${encodeURIComponent(upS2.record!.id)}?preview=1`
    );
    assert.equal(unauthPreview.status, 403, 'Check 9: Non-admin preview of unpublished audio must return 403');

    // -------------------------------------------------------------------------
    // CHECK 10: Simulated Cloud Run Container Restart (brand-new EMPTY local disk!)
    // -------------------------------------------------------------------------
    const freshTmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-fresh-cloudrun-'));
    const freshDataDir = path.join(freshTmpRoot, 'data');
    const freshUploadsDir = path.join(freshTmpRoot, 'data', 'uploads');
    fs.mkdirSync(freshUploadsDir, { recursive: true });

    const restartedSvc = new QuranEcosystemService({
      dataDir: freshDataDir,
      uploadsDir: freshUploadsDir,
      audioStorage: cloudStorage, // Same cloud bucket!
      firestoreMirror: firestoreWriter,
      firestoreReadCollection: firestoreReader, // Same Firestore!
    });
    const hydrateReport = await restartedSvc.hydrateFromFirestore();
    assert.ok(hydrateReport.audioFilesHydrated >= 2, 'Check 10: Must hydrate audio metadata from Firestore after restart');

    const streamedAfterRestart = await restartedSvc.readAudioRangeForStream(upV1.record.id);
    assert.ok(streamedAfterRestart.ok && streamedAfterRestart.chunk, 'Check 10: Audio must stream from Cloud Storage after cold restart');
    assert.equal(Buffer.compare(streamedAfterRestart.chunk, mp3V1), 0, 'Check 10: Streamed bytes after restart must match v1');
    fs.rmSync(freshTmpRoot, { recursive: true, force: true });

    // -------------------------------------------------------------------------
    // CHECK 11: Zero Silent Local Disk Fallback when Storage fails (404 / 403)
    // -------------------------------------------------------------------------
    for (const failureCase of [
      { code: 'STORAGE_BUCKET_NOT_FOUND' as const, httpStatus: 404, statusCode: 'bucket_not_found' as const },
      { code: 'STORAGE_PERMISSION_DENIED' as const, httpStatus: 403, statusCode: 'permission_denied' as const },
    ]) {
      const brokenDriver: AudioObjectStorageDriver = {
        provider: 'firebase_storage',
        bucketName: 'basic-petal-001dl.firebasestorage.app',
        projectId: 'basic-petal-001dl',
        getHealthStatus: async () => ({
          provider: 'firebase_storage',
          bucketName: 'basic-petal-001dl.firebasestorage.app',
          projectId: 'basic-petal-001dl',
          authMode: 'firebase_rest_admin_token',
          healthy: false,
          writable: false,
          statusCode: failureCase.statusCode,
          messageUz: `Simulated ${failureCase.code}`,
          httpStatus: failureCase.httpStatus,
          checkedAt: new Date().toISOString(),
        }),
        uploadObject: async () => {
          throw new AudioStorageError(failureCase.code, `Simulated ${failureCase.code}`, {
            httpStatus: failureCase.httpStatus,
          });
        },
        getObjectMetadata: async () => null,
        downloadObjectBuffer: async () => {
          throw new AudioStorageError(failureCase.code, `Simulated ${failureCase.code}`, {
            httpStatus: failureCase.httpStatus,
          });
        },
        downloadObjectRange: async () => {
          throw new AudioStorageError(failureCase.code, `Simulated ${failureCase.code}`, {
            httpStatus: failureCase.httpStatus,
          });
        },
        objectExists: async () => false,
      };

      const failDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-nofallback-'));
      const failUploads = path.join(failDir, 'uploads');
      fs.mkdirSync(failUploads, { recursive: true });
      const failSvc = new QuranEcosystemService({
        dataDir: path.join(failDir, 'data'),
        uploadsDir: failUploads,
        audioStorage: brokenDriver,
      });

      const failUpload = await failSvc.uploadQariSurahAudio({
        qariId: ODILJON_QORI_ID,
        surahNumber: 3,
        buffer: makeValidMp3Buffer('audit_surah_003_should_fail', 2048),
        mimeType: 'audio/mpeg',
        originalFilename: '003.mp3',
        actor: 'asakaziyo0@gmail.com',
        autoPublish: true,
      });

      assert.equal(failUpload.ok, false, `Check 11: Upload must fail cleanly on ${failureCase.code}`);
      assert.equal(failUpload.httpStatus, 503, `Check 11: Must return HTTP 503 on ${failureCase.code}`);
      assert.equal(failUpload.errorCode, failureCase.code);
      const countRegularFiles = (dir: string): number => {
        if (!fs.existsSync(dir)) return 0;
        let count = 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) count += countRegularFiles(full);
          else if (entry.isFile()) count += 1;
        }
        return count;
      };
      assert.equal(
        countRegularFiles(failUploads),
        0,
        `Check 11: ZERO files may be written to local disk on ${failureCase.code}`
      );
      fs.rmSync(failDir, { recursive: true, force: true });
    }

    // -------------------------------------------------------------------------
    // CHECK 12: Firestore metadata write failure -> Storage object preserved + Reconciliation Retry Queue recovers
    // -------------------------------------------------------------------------
    simulateFirestoreFailure = true;
    const mp3S4 = makeValidMp3Buffer('audit_surah_004_reconcile', 3072);
    const upS4 = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 4,
      buffer: mp3S4,
      mimeType: 'audio/mpeg',
      originalFilename: '004_niso.mp3',
      actor: 'asakaziyo0@gmail.com',
      autoPublish: true,
    });
    assert.equal(upS4.ok, true, 'Check 12: Storage upload succeeded; object must NOT be deleted when Firestore fails');
    assert.equal(upS4.firestoreSynced, false);
    assert.equal(upS4.record?.reconciliationStatus, 'pending_firestore_retry');

    // Confirm binary object is still safe in Storage
    const s4StorageBytes = await cloudStorage.downloadObjectBuffer(upS4.record!.storagePath);
    assert.equal(Buffer.compare(s4StorageBytes, mp3S4), 0, 'Check 12: Storage object must be preserved');

    const diagBefore = await svc.getStorageAndSyncDiagnostics();
    assert.ok(diagBefore.reconciliationQueueCount >= 1, 'Check 12: Failed Firestore write must be queued');

    // Recover Firestore and reconcile
    simulateFirestoreFailure = false;
    const recReport = await svc.reconcilePendingFirestoreWrites('asakaziyo0@gmail.com');
    assert.ok(recReport.reconciledCount >= 1, 'Check 12: Reconciliation retry must succeed once Firestore recovers');
    assert.equal(recReport.stillPendingCount, 0, 'Check 12: Queue must be empty after reconciliation');
    assert.ok(
      fakeFirestoreDb.get('quranAudioFiles')?.get(upS4.record!.id),
      'Check 12: Firestore document must now exist after reconciliation'
    );

    // -------------------------------------------------------------------------
    // CHECK 13: Legacy Audio Inventory & Non-Destructive Migration
    // -------------------------------------------------------------------------
    const legacyDir = path.join(uploadsDir, 'quran-reciter-audio');
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyMp3 = makeValidMp3Buffer('legacy_surviving_surah_112', 2560);
    const legacyFileAbs = path.join(legacyDir, 'legacy_112.mp3');
    fs.writeFileSync(legacyFileAbs, legacyMp3);

    legacyOverrides['reciter-legacy_112'] = {
      reciterId: 'reciter-legacy',
      surahNumber: 112,
      surahName: 'Ixlos',
      audioUrl: '/uploads/quran-reciter-audio/legacy_112.mp3',
      storagePath: 'quran-reciter-audio/legacy_112.mp3',
    };
    legacyOverrides['reciter-legacy_114'] = {
      reciterId: 'reciter-legacy',
      surahNumber: 114,
      surahName: 'Nas',
      audioUrl: '/uploads/quran-reciter-audio/vanished_114.mp3',
      storagePath: 'quran-reciter-audio/vanished_114.mp3',
    };

    const inv = svc.inventoryLegacyAudio();
    assert.equal(inv.readyToMigrateCount, 1, 'Check 13: Surviving legacy file must be ready_to_migrate');
    assert.equal(inv.missingFileCount, 1, 'Check 13: Vanished Cloud Run file must be honestly missing_file');

    const migRes = await svc.migrateLegacyAudioToStorage('asakaziyo0@gmail.com');
    assert.equal(migRes.migratedCount, 1, 'Check 13: Surviving legacy file must migrate to Firebase Storage');
    assert.equal(migRes.missingMarkedCount, 1, 'Check 13: Vanished file must be marked missing_file');
    assert.equal(legacyOverrides['reciter-legacy_112'].storageBackend, 'firebase_storage');
    assert.equal(legacyOverrides['reciter-legacy_112'].migrationStatus, 'migrated');
    assert.equal(legacyOverrides['reciter-legacy_114'].migrationStatus, 'missing_file');
    assert.equal(legacyOverrides['reciter-legacy_114'].storageBackend, undefined, 'Check 13: Never fake cloud backend for missing file');

    // -------------------------------------------------------------------------
    // CHECK 14: Web/Android API Contract + Telegram Bot cloud_storage Track Resolution
    // -------------------------------------------------------------------------
    const publicQarisRes = await httpRequest(baseUrl, 'GET', '/api/quran-ecosystem/qaris');
    assert.equal(publicQarisRes.status, 200);
    const publicQarisJson = JSON.parse(publicQarisRes.body.toString('utf-8'));
    assert.equal(publicQarisJson.success, true);
    assert.ok(publicQarisJson.qaris.some((q: any) => q.id === ODILJON_QORI_ID));

    const publicSurahsRes = await httpRequest(
      baseUrl,
      'GET',
      `/api/quran-ecosystem/qaris/${ODILJON_QORI_ID}/surahs`
    );
    assert.equal(publicSurahsRes.status, 200);
    const publicSurahsJson = JSON.parse(publicSurahsRes.body.toString('utf-8'));
    assert.equal(publicSurahsJson.storageSummary.localDiskFallbackEnabled, false);
    assert.equal(publicSurahsJson.isCompleteReady, false, 'Check 14: Partial catalog must never claim 114/114 ready');

    // Telegram Bot cloud_storage recognition
    const mockRepo: any = {
      getSnapshot: () => ({ quranAudioFileIdCache: {}, customQuranReciters: [], customQuranTracks: {} }),
      getSettings: () => ({ quranAudioFileIdCache: {} }),
      cacheQuranAudioFileId: () => {},
    };
    const mockCentralDb = {
      quranReciters: [
        {
          id: ODILJON_QORI_ID,
          name: 'Odiljon qori',
          nameAr: 'عادل جان قاري',
          country: 'Oʻzbekiston',
          style: 'Murattal',
          isActive: true,
          isCustomUploaded: true,
          uploadedSurahsCount: 2,
        },
      ],
      quranAudioOverrides: {
        [`${ODILJON_QORI_ID}_1`]: {
          audioUrl: `/api/quran-ecosystem/audio-stream/${upV1.record.id}`,
          storageBackend: 'firebase_storage',
          storagePath: upV1.record.storagePath,
          status: 'verified_stored',
        },
      },
    };
    const tgQuran = new TelegramQuranMp3Service({
      repository: mockRepo,
      centralContent: { getSnapshot: () => mockCentralDb, getDatabase: () => mockCentralDb } as any,
      apiClient: {} as any,
      uploadsRootDir: path.join(tmpRoot, 'empty-bot-uploads'), // Intentionally empty disk!
    });
    const botTrack = tgQuran.resolveSurahTrack(ODILJON_QORI_ID, 1);
    assert.ok(botTrack);
    assert.equal(botTrack.status, 'ready', 'Check 14: Telegram Bot must treat cloud_storage track as ready even with empty local disk');
    assert.equal(botTrack.sourceKind, 'cloud_storage');
    assert.equal(botTrack.available, true);

    console.log('✅ ALL 14 Audio Storage Repair & Data Persistence Audit Checks PASSED!');
  } finally {
    server.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runAuditTests().catch((err) => {
  console.error('❌ Audio Storage Persistence Audit test FAILED:', err);
  process.exit(1);
});
