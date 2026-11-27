import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  QuranEcosystemService,
  ODILJON_QORI_ID,
} from '../services/quranEcosystemServer';
import { TelegramQuranMp3Service } from '../../telegram/services/quranMp3Service';

function makeValidMp3Buffer(tagText: string, bodyLen = 2048): Buffer {
  // Valid ID3v2 header + deterministic audio frame payload
  const header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10]);
  const tagBuf = Buffer.from(tagText.padEnd(16, '_').slice(0, 16), 'utf-8');
  const frameSync = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const body = crypto.createHash('sha512').update(tagText).digest();
  const repeated = Buffer.alloc(bodyLen);
  for (let i = 0; i < bodyLen; i++) {
    repeated[i] = body[i % body.length] ^ (i & 0xff);
  }
  return Buffer.concat([header, tagBuf, frameSync, repeated]);
}

function makeMinimalZip(entries: Array<{ name: string; data: Buffer; deflate?: boolean }>): Buffer {
  // Pure Node.js ZIP builder supporting STORE (0) and DEFLATE (8)
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const method = entry.deflate ? 8 : 0;
    const compressed = entry.deflate ? zlib.deflateRawSync(entry.data) : entry.data;
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

async function runTests() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-odiljon-v7-'));
  const dataDir = path.join(tmpRoot, 'data');
  const uploadsDir = path.join(tmpRoot, 'data', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const catalogEvents: Array<{ kind: string; qariId: string; action: string }> = [];

  try {
    const svc = new QuranEcosystemService({
      dataDir,
      uploadsDir,
      onCatalogChange: (evt) => {
        catalogEvents.push(evt);
      },
    });

    // 1. Odiljon qori auto-seeded honestly (0/114, NOT marked complete ready!)
    const odiljon = svc.getQari(ODILJON_QORI_ID);
    assert.ok(odiljon, 'Odiljon qori must be auto-seeded in the unified Qari catalog');
    assert.equal(odiljon.nameUz, 'Odiljon qori');
    assert.equal(odiljon.isProtectedPermanent, true);
    assert.equal(odiljon.isCompleteReady, false);
    assert.equal(odiljon.uploadedSurahsCount, 0);
    assert.equal(odiljon.missingSurahsCount, 114);

    const initCatalog = svc.getQariSurahCatalog(ODILJON_QORI_ID, true);
    assert.ok(initCatalog);
    assert.equal(initCatalog.surahs.length, 114);
    assert.equal(initCatalog.isCompleteReady, false);
    assert.equal(initCatalog.missingCount, 114);

    // 2. Avatar upload validation (reject non-image, accept valid JPEG magic bytes)
    const badAvatar = await svc.uploadQariAvatar(
      ODILJON_QORI_ID,
      Buffer.from('not-an-image-payload-longer-than-32-bytes-here'),
      'admin_test'
    );
    assert.equal(badAvatar.ok, false, 'Spoofed non-image avatar must be rejected');

    const jpegBytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64, 0x22),
      Buffer.from([0xff, 0xd9]),
    ]);
    const okAvatar = await svc.uploadQariAvatar(ODILJON_QORI_ID, jpegBytes, 'admin_test');
    assert.equal(okAvatar.ok, true, 'Valid JPEG avatar must succeed');
    assert.ok(okAvatar.avatarUrl?.startsWith('/uploads/qari-avatars/'));

    // 3. Reject spoofed non-audio file
    const spoofedAudio = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 1,
      buffer: Buffer.from('<html><body>fake mp3 file payload exceeding 32 bytes</body></html>'),
      mimeType: 'audio/mpeg',
      originalFilename: '001.mp3',
      actor: 'admin_test',
      autoPublish: true,
    });
    assert.equal(spoofedAudio.ok, false, 'Spoofed HTML disguised as MP3 must be rejected');

    // 4. Upload real valid MP3 for Surah 1 -> verify primary + independent backup + SHA-256
    const mp3Surah1 = makeValidMp3Buffer('odiljon_surah_001_fatiha');
    const up1 = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 1,
      buffer: mp3Surah1,
      mimeType: 'audio/mpeg',
      originalFilename: '001_Fotiha.mp3',
      actor: 'admin_test',
      autoPublish: true,
    });
    assert.equal(up1.ok, true, 'Surah 1 upload should succeed');
    assert.ok(up1.record);
    assert.equal(up1.record.version, 1);
    assert.equal(up1.record.backupVerified, true);
    assert.equal(up1.record.status, 'PUBLISHED');
    const primaryPath1 = svc.resolveAudioFilePath(up1.record.id);
    assert.ok(primaryPath1 && fs.existsSync(primaryPath1), 'Primary audio file must exist on disk');

    // Cross-surah duplicate SHA-256 detection (accidentally uploading Surah 1 audio to Surah 3)
    const dupCrossSurah = await svc.uploadQariSurahAudio({
      qariId: ODILJON_QORI_ID,
      surahNumber: 3,
      buffer: mp3Surah1,
      mimeType: 'audio/mpeg',
      originalFilename: '003_OliImron_wrong.mp3',
      actor: 'admin_test',
      autoPublish: true,
    });
    assert.equal(dupCrossSurah.ok, false, 'Duplicate SHA-256 across different surahs must be detected and rejected');

    // 5. Resumable chunked upload for Surah 2
    const mp3Surah2 = makeValidMp3Buffer('odiljon_surah_002_baqara', 4096);
    const mid = Math.floor(mp3Surah2.length / 2);
    const uploadId = 'chunk_test_s2';
    const c0 = svc.appendAudioUploadChunk({
      uploadId,
      chunkIndex: 0,
      totalChunks: 2,
      chunkBuffer: mp3Surah2.subarray(0, mid),
    });
    assert.equal(c0.ok, true);
    const c1 = svc.appendAudioUploadChunk({
      uploadId,
      chunkIndex: 1,
      totalChunks: 2,
      chunkBuffer: mp3Surah2.subarray(mid),
    });
    assert.equal(c1.ok, true);
    const done2 = await svc.completeChunkedAudioUpload({
      uploadId,
      totalChunks: 2,
      qariId: ODILJON_QORI_ID,
      surahNumber: 2,
      mimeType: 'audio/mpeg',
      originalFilename: '002_Baqara.mp3',
      actor: 'admin_test',
      autoPublish: true,
    });
    assert.equal(done2.ok, true, 'Chunked resumable upload for Surah 2 must succeed');
    assert.equal(
      done2.record?.sha256,
      crypto.createHash('sha256').update(mp3Surah2).digest('hex'),
      'Reassembled chunked file SHA-256 must match original byte-for-byte'
    );

    // 6. ZIP batch import (STORE + DEFLATE entries for Surahs 36 & 112)
    const zipBuf = makeMinimalZip([
      { name: 'odiljon/036_Yosin.mp3', data: makeValidMp3Buffer('odiljon_surah_036_yosin'), deflate: false },
      { name: 'odiljon/112_Ixlos.mp3', data: makeValidMp3Buffer('odiljon_surah_112_ixlos'), deflate: true },
    ]);
    const zipRes = await svc.importQariZipArchive({
      qariId: ODILJON_QORI_ID,
      zipBuffer: zipBuf,
      actor: 'admin_test',
      autoPublish: true,
    });
    assert.equal(zipRes.ok, true, 'ZIP batch import must succeed');
    assert.equal(zipRes.importedCount, 2, 'Both Surahs 36 and 112 must be imported from ZIP');

    const midCatalog = svc.getQariSurahCatalog(ODILJON_QORI_ID, true)!;
    assert.equal(midCatalog.publishedCount, 4);
    assert.equal(midCatalog.missingCount, 110);
    assert.equal(midCatalog.isCompleteReady, false, '4/114 must STILL not be marked complete ready!');

    // 7. Simulate primary disk loss on Surah 1 -> verify integrity flags it, then Backup & Restore Test auto-heals it byte-for-byte!
    fs.unlinkSync(primaryPath1);
    assert.equal(fs.existsSync(primaryPath1), false);

    const integrityBefore = svc.verifyQariAudioIntegrity(ODILJON_QORI_ID, 'admin_test')!;
    assert.equal(integrityBefore.corruptedCount, 1, 'Integrity check must detect missing primary file');

    const backupRestore = svc.runQariBackupAndRestoreTest(ODILJON_QORI_ID, 'admin_test')!;
    assert.equal(backupRestore.passed, true, 'Non-destructive SHA-256 restore test must pass');
    assert.equal(backupRestore.autoHealedCount, 1, 'Primary file must be auto-healed from independent backup');
    assert.equal(fs.existsSync(primaryPath1), true, 'Primary Surah 1 file must exist again after auto-heal');
    assert.equal(
      crypto.createHash('sha256').update(fs.readFileSync(primaryPath1)).digest('hex'),
      up1.record.sha256,
      'Auto-healed primary file must match original SHA-256 byte-for-byte'
    );

    // 8. Safe archive (zero hard-delete) + restore
    const archRes = await svc.deleteAudio(up1.record.id, 'admin_test', true);
    assert.equal(archRes.ok, true);
    assert.equal(archRes.archivedOnly, true, 'Protected qari delete must archive safely, never hard-delete');
    assert.equal(fs.existsSync(primaryPath1), true, 'Primary file on disk MUST remain intact after safe archive');

    const restoredRes = await svc.restoreArchivedAudio(up1.record.id, 'admin_test', true);
    assert.equal(restoredRes.ok, true);
    assert.equal(restoredRes.record?.status, 'PUBLISHED');

    // 9. Telegram Bot TelegramQuranMp3Service integration
    const mockRepo: any = {
      getSnapshot: () => ({
        quranAudioFileIdCache: {},
        customQuranReciters: [],
        customQuranTracks: {},
      }),
      getSettings: () => ({
        quranAudioFileIdCache: {},
      }),
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
          uploadedSurahsCount: 4,
        },
      ],
      quranAudioOverrides: {
        [`${ODILJON_QORI_ID}_1`]: {
          audioUrl: `/api/quran-ecosystem/audio-stream/${up1.record.id}`,
          storagePath: up1.record.relativePath,
          status: 'verified_stored',
        },
      },
    };
    const mockCentralContent: any = {
      getSnapshot: () => mockCentralDb,
      getDatabase: () => mockCentralDb,
    };
    const tgQuran = new TelegramQuranMp3Service({
      repository: mockRepo,
      centralContent: mockCentralContent,
      apiClient: {} as any,
      uploadsRootDir: uploadsDir,
    });

    const botReciters = tgQuran.listReciters();
    assert.ok(
      botReciters.some((r) => r.id === ODILJON_QORI_ID),
      'Telegram Bot reciter list must include Odiljon qori'
    );

    const botSurah1 = tgQuran.resolveSurahTrack(ODILJON_QORI_ID, 1);
    assert.ok(botSurah1, 'Surah 1 track must resolve');
    assert.equal(botSurah1.status, 'ready', 'Odiljon qori uploaded Surah 1 must be ready in Telegram Bot');
    assert.equal(botSurah1.sourceKind, 'local_vault');
    assert.equal(botSurah1.localFileExists, true);
    assert.equal(botSurah1.available, true);

    const botSurah5 = tgQuran.resolveSurahTrack(ODILJON_QORI_ID, 5);
    assert.ok(botSurah5, 'Surah 5 track metadata must resolve');
    assert.equal(botSurah5.status, 'missing', 'Unuploaded Odiljon qori Surah 5 must be honestly missing, never substituted with another reciter');

    assert.ok(catalogEvents.length >= 5, 'onCatalogChange hook must fire for 4-platform sync');

    console.log('✅ All Odiljon Qori 114-Surah Permanent Audio Ecosystem v7 tests PASSED!');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('❌ Odiljon Qori Ecosystem test FAILED:', err);
  process.exit(1);
});
