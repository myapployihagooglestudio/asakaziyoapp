/**
 * ASAKA ZIYO — Permanent Firebase Cloud Storage Audio Backend (2026)
 *
 * Guarantees:
 * 1. Real binary audio files (MP3/M4A/OGG/WAV) and Qari avatars are stored in Firebase Cloud Storage
 *    (`basic-petal-001dl.firebasestorage.app` from `firebase-applet-config.json`), NEVER on ephemeral
 *    Cloud Run local disk and NEVER as Base64 inside Firestore documents.
 * 2. Strict ZERO silent fallback to local disk: if the Storage bucket is unprovisioned (404),
 *    unauthorized (401/403), or unreachable, throws a structured `AudioStorageError` so the Admin
 *    Panel receives an explicit actionable error instead of falsely succeeding on ephemeral disk.
 * 3. Supports multiple verified auth paths:
 *    - Firebase Admin SDK (`FIREBASE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`)
 *    - Firebase Storage REST API authenticated with an Admin Firebase Auth ID Token (`X-Firebase-Id-Token`)
 * 4. Immutable versioned object paths (`quran-audio/{qariId}/surah-{001..114}/v{n}-{sha12}{ext}`) so
 *    older versions are never overwritten and can always be verified & restored.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as firebaseAdminApp from 'firebase-admin/app';
import * as firebaseAdminStorage from 'firebase-admin/storage';

export type AudioStorageErrorCode =
  | 'STORAGE_BUCKET_NOT_FOUND'
  | 'STORAGE_PERMISSION_DENIED'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_OBJECT_NOT_FOUND'
  | 'STORAGE_INTEGRITY_MISMATCH'
  | 'STORAGE_NOT_CONFIGURED';

export class AudioStorageError extends Error {
  public readonly code: AudioStorageErrorCode;
  public readonly httpStatus: number;
  public readonly bucketName: string;
  public readonly details?: string;

  constructor(
    code: AudioStorageErrorCode,
    message: string,
    options: { httpStatus?: number; bucketName?: string; details?: string } = {}
  ) {
    super(message);
    this.name = 'AudioStorageError';
    this.code = code;
    this.httpStatus = options.httpStatus ?? 503;
    this.bucketName = options.bucketName ?? '';
    this.details = options.details;
  }
}

export interface StoredObjectMetadata {
  bucket: string;
  objectPath: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
  generation?: string;
  md5Hash?: string;
  customMetadata?: Record<string, string>;
  updatedAt?: string;
  downloadToken?: string;
}

export interface AudioStorageHealthStatus {
  provider: 'firebase_storage' | 'memory_test';
  bucketName: string;
  projectId: string;
  authMode: 'firebase_admin_sdk' | 'firebase_rest_admin_token' | 'unauthenticated_probe' | 'memory_test';
  healthy: boolean;
  writable: boolean;
  statusCode: 'ready' | 'bucket_not_found' | 'permission_denied' | 'not_configured' | 'unreachable';
  messageUz: string;
  httpStatus?: number;
  checkedAt: string;
  details?: string;
}

export interface AudioObjectStorageDriver {
  readonly provider: 'firebase_storage' | 'memory_test';
  readonly bucketName: string;
  readonly projectId: string;
  getHealthStatus(options?: { forceProbe?: boolean; firebaseIdToken?: string }): Promise<AudioStorageHealthStatus>;
  uploadObject(params: {
    objectPath: string;
    buffer: Buffer;
    contentType: string;
    customMetadata?: Record<string, string>;
    firebaseIdToken?: string;
  }): Promise<StoredObjectMetadata>;
  getObjectMetadata(objectPath: string, firebaseIdToken?: string): Promise<StoredObjectMetadata | null>;
  downloadObjectBuffer(objectPath: string, firebaseIdToken?: string): Promise<Buffer>;
  downloadObjectRange(
    objectPath: string,
    start: number,
    end: number,
    firebaseIdToken?: string
  ): Promise<{ buffer: Buffer; totalSize: number; contentType: string; start: number; end: number }>;
  objectExists(objectPath: string, firebaseIdToken?: string): Promise<boolean>;
}

/**
 * Generates a canonical, immutable versioned Firebase Storage object path for Surah audio.
 */
export function buildImmutableAudioStoragePath(params: {
  qariId: string;
  surahNumber: number;
  version: number;
  sha256: string;
  ext: string;
}): string {
  const safeQari = params.qariId.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
  const padded = String(Math.floor(params.surahNumber)).padStart(3, '0');
  const cleanExt = params.ext.startsWith('.') ? params.ext.toLowerCase() : `.${params.ext.toLowerCase()}`;
  const hashShort = params.sha256.slice(0, 12).toLowerCase();
  return `quran-audio/${safeQari}/surah-${padded}/v${params.version}-${hashShort}${cleanExt}`;
}

/**
 * Generates a canonical versioned Firebase Storage object path for Qari profile avatars.
 */
export function buildImmutableAvatarStoragePath(params: {
  qariId: string;
  sha256: string;
  ext: string;
}): string {
  const safeQari = params.qariId.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
  const cleanExt = params.ext.startsWith('.') ? params.ext.toLowerCase() : `.${params.ext.toLowerCase()}`;
  return `qari-avatars/${safeQari}/v${Date.now()}-${params.sha256.slice(0, 8).toLowerCase()}${cleanExt}`;
}

export function loadFirebaseAppletConfigFromDisk(baseDir: string = process.cwd()): {
  projectId: string;
  storageBucket: string;
  firestoreDatabaseId: string;
} {
  try {
    const cfgPath = path.join(baseDir, 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      return {
        projectId: String(parsed.projectId || 'basic-petal-001dl'),
        storageBucket: String(
          process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
            parsed.storageBucket ||
            `${parsed.projectId || 'basic-petal-001dl'}.firebasestorage.app`
        ),
        firestoreDatabaseId: String(
          parsed.firestoreDatabaseId || 'ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94'
        ),
      };
    }
  } catch {
    // fall through to defaults
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim() || 'basic-petal-001dl',
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET?.trim() || 'basic-petal-001dl.firebasestorage.app',
    firestoreDatabaseId: 'ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94',
  };
}

/**
 * Production Firebase Cloud Storage driver targeting the existing `firebase-applet-config.json` bucket.
 * Supports:
 *   1. Firebase Admin SDK (`FIREBASE_SERVICE_ACCOUNT_KEY` JSON or `GOOGLE_APPLICATION_CREDENTIALS`)
 *   2. Firebase Storage REST API (`https://firebasestorage.googleapis.com/v0/b/{bucket}/o`) with
 *      Admin Firebase Auth ID Token (`X-Firebase-Id-Token`) for uploads & public/token reads.
 *
 * NEVER silently falls back to local disk!
 */
export class FirebaseAudioStorageDriver implements AudioObjectStorageDriver {
  public readonly provider = 'firebase_storage' as const;
  public readonly bucketName: string;
  public readonly projectId: string;

  private adminBucket: ReturnType<ReturnType<typeof firebaseAdminStorage.getStorage>['bucket']> | null = null;
  private cachedHealth: AudioStorageHealthStatus | null = null;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: {
    projectId?: string;
    bucketName?: string;
    fetchImpl?: typeof fetch;
    baseDir?: string;
  }) {
    const cfg = loadFirebaseAppletConfigFromDisk(options?.baseDir);
    this.projectId = options?.projectId || cfg.projectId;
    this.bucketName = (options?.bucketName || cfg.storageBucket || '').replace(/^gs:\/\//, '').trim();
    this.fetchImpl = options?.fetchImpl || fetch;

    this.initAdminBucketIfConfigured();
  }

  private initAdminBucketIfConfigured(): void {
    if (!this.bucketName) return;
    try {
      const rawSaKey =
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      if (rawSaKey && rawSaKey.startsWith('{')) {
        const parsedCert = JSON.parse(rawSaKey);
        const existing = firebaseAdminApp.getApps().find((a) => a.name === 'asaka-audio-storage-admin');
        const app =
          existing ||
          firebaseAdminApp.initializeApp(
            {
              credential: firebaseAdminApp.cert(parsedCert),
              projectId: parsedCert.project_id || this.projectId,
              storageBucket: this.bucketName,
            },
            'asaka-audio-storage-admin'
          );
        this.adminBucket = firebaseAdminStorage.getStorage(app).bucket(this.bucketName);
        return;
      }

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
        const existing = firebaseAdminApp.getApps().find((a) => a.name === 'asaka-audio-storage-adc');
        const app =
          existing ||
          firebaseAdminApp.initializeApp(
            {
              projectId: this.projectId,
              storageBucket: this.bucketName,
            },
            'asaka-audio-storage-adc'
          );
        this.adminBucket = firebaseAdminStorage.getStorage(app).bucket(this.bucketName);
      }
    } catch (err: any) {
      console.warn('[FirebaseAudioStorage] Admin SDK init warning:', err?.message || err);
      this.adminBucket = null;
    }
  }

  private buildRestBaseUrl(): string {
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(this.bucketName)}/o`;
  }

  private buildRestHeaders(firebaseIdToken?: string, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...(extra || {}) };
    if (firebaseIdToken && firebaseIdToken.trim()) {
      headers.Authorization = `Firebase ${firebaseIdToken.trim()}`;
    }
    return headers;
  }

  private classifyHttpFailure(status: number, bodyText: string, actionLabel: string): AudioStorageError {
    const snippet = bodyText.slice(0, 260);
    if (status === 404 && !actionLabel.includes('read_object')) {
      return new AudioStorageError(
        'STORAGE_BUCKET_NOT_FOUND',
        `Firebase Storage bucket (${this.bucketName}) topilmadi (HTTP 404). Firebase Console → Storage boʻlimida bucket'ni faollashtiring va storage.rules faylini deploy qiling. Lokal diskka jim oʻtish bloklangan.`,
        { httpStatus: 503, bucketName: this.bucketName, details: snippet }
      );
    }
    if (status === 404) {
      return new AudioStorageError(
        'STORAGE_OBJECT_NOT_FOUND',
        `Firebase Storage ichida soʻralgan audio obyekt topilmadi (HTTP 404).`,
        { httpStatus: 404, bucketName: this.bucketName, details: snippet }
      );
    }
    if (status === 401 || status === 403) {
      return new AudioStorageError(
        'STORAGE_PERMISSION_DENIED',
        `Firebase Storage (${this.bucketName}) ruxsatni rad etdi (HTTP ${status}). Serverga FIREBASE_SERVICE_ACCOUNT_KEY oʻrnating yoki storage.rules qoidalarini deploy qilib admin Firebase ID tokeni bilan yuklang.`,
        { httpStatus: 503, bucketName: this.bucketName, details: snippet }
      );
    }
    return new AudioStorageError(
      'STORAGE_UNAVAILABLE',
      `Firebase Storage (${this.bucketName}) ${actionLabel} xatosi (HTTP ${status}): ${snippet}`,
      { httpStatus: 503, bucketName: this.bucketName, details: snippet }
    );
  }

  public async getHealthStatus(options?: {
    forceProbe?: boolean;
    firebaseIdToken?: string;
  }): Promise<AudioStorageHealthStatus> {
    const now = new Date().toISOString();
    if (!this.bucketName) {
      const st: AudioStorageHealthStatus = {
        provider: 'firebase_storage',
        bucketName: '',
        projectId: this.projectId,
        authMode: 'unauthenticated_probe',
        healthy: false,
        writable: false,
        statusCode: 'not_configured',
        messageUz: 'firebase-applet-config.json ichida storageBucket koʻrsatilmagan.',
        checkedAt: now,
      };
      this.cachedHealth = st;
      return st;
    }

    if (
      !options?.forceProbe &&
      this.cachedHealth &&
      Date.now() - new Date(this.cachedHealth.checkedAt).getTime() < 20_000
    ) {
      return this.cachedHealth;
    }

    // Path 1: Firebase Admin SDK bucket probe
    if (this.adminBucket) {
      try {
        const [exists] = await this.adminBucket.exists();
        if (!exists) {
          const st: AudioStorageHealthStatus = {
            provider: 'firebase_storage',
            bucketName: this.bucketName,
            projectId: this.projectId,
            authMode: 'firebase_admin_sdk',
            healthy: false,
            writable: false,
            statusCode: 'bucket_not_found',
            messageUz: `Firebase Storage bucket (${this.bucketName}) hali yaratilmagan (404). Firebase Console → Storage → Get Started orqali faollashtiring.`,
            httpStatus: 404,
            checkedAt: now,
          };
          this.cachedHealth = st;
          return st;
        }
        const st: AudioStorageHealthStatus = {
          provider: 'firebase_storage',
          bucketName: this.bucketName,
          projectId: this.projectId,
          authMode: 'firebase_admin_sdk',
          healthy: true,
          writable: true,
          statusCode: 'ready',
          messageUz: `Firebase Storage (${this.bucketName}) Admin SDK orqali ulangan va yozishga tayyor.`,
          httpStatus: 200,
          checkedAt: now,
        };
        this.cachedHealth = st;
        return st;
      } catch (err: any) {
        const codeNum = Number(err?.code || 0);
        const msg = String(err?.message || err);
        const isPerm = codeNum === 401 || codeNum === 403 || msg.toLowerCase().includes('permission');
        const st: AudioStorageHealthStatus = {
          provider: 'firebase_storage',
          bucketName: this.bucketName,
          projectId: this.projectId,
          authMode: 'firebase_admin_sdk',
          healthy: false,
          writable: false,
          statusCode: isPerm ? 'permission_denied' : 'unreachable',
          messageUz: isPerm
            ? `Firebase Storage (${this.bucketName}) uchun Admin SDK ruxsati yetarli emas (${msg.slice(0, 140)}).`
            : `Firebase Storage (${this.bucketName}) ulanish xatosi: ${msg.slice(0, 140)}`,
          httpStatus: codeNum || 503,
          checkedAt: now,
          details: msg.slice(0, 260),
        };
        this.cachedHealth = st;
        return st;
      }
    }

    // Path 2: Firebase Storage REST endpoint probe
    try {
      const resp = await this.fetchImpl(`${this.buildRestBaseUrl()}?maxResults=1`, {
        method: 'GET',
        headers: this.buildRestHeaders(options?.firebaseIdToken),
      });
      const bodyText = await resp.text().catch(() => '');
      const hasAdminToken = Boolean(options?.firebaseIdToken?.trim());
      if (resp.status === 404) {
        const st: AudioStorageHealthStatus = {
          provider: 'firebase_storage',
          bucketName: this.bucketName,
          projectId: this.projectId,
          authMode: hasAdminToken ? 'firebase_rest_admin_token' : 'unauthenticated_probe',
          healthy: false,
          writable: false,
          statusCode: 'bucket_not_found',
          messageUz: `Firebase Storage bucket (${this.bucketName}) loyihada hali yoqilmagan (HTTP 404). Firebase Console → Storage boʻlimidan yoqing va storage.rules ni deploy qiling.`,
          httpStatus: 404,
          checkedAt: now,
          details: bodyText.slice(0, 220),
        };
        this.cachedHealth = st;
        return st;
      }
      if (resp.status === 200) {
        const st: AudioStorageHealthStatus = {
          provider: 'firebase_storage',
          bucketName: this.bucketName,
          projectId: this.projectId,
          authMode: hasAdminToken ? 'firebase_rest_admin_token' : 'unauthenticated_probe',
          healthy: true,
          writable: hasAdminToken,
          statusCode: 'ready',
          messageUz: hasAdminToken
            ? `Firebase Storage (${this.bucketName}) ulangan va Admin token bilan yozishga tayyor.`
            : `Firebase Storage (${this.bucketName}) mavjud. Serverdan yozish uchun FIREBASE_SERVICE_ACCOUNT_KEY yoki Admin Firebase ID tokeni talab qilinadi.`,
          httpStatus: 200,
          checkedAt: now,
        };
        this.cachedHealth = st;
        return st;
      }
      if (resp.status === 401 || resp.status === 403) {
        // Bucket EXISTS (403 means Storage rules blocked anonymous list, which is EXPECTED & SECURE!)
        const st: AudioStorageHealthStatus = {
          provider: 'firebase_storage',
          bucketName: this.bucketName,
          projectId: this.projectId,
          authMode: hasAdminToken ? 'firebase_rest_admin_token' : 'unauthenticated_probe',
          healthy: true,
          writable: hasAdminToken,
          statusCode: hasAdminToken ? 'permission_denied' : 'ready',
          messageUz: hasAdminToken
            ? `Firebase Storage (${this.bucketName}) mavjud, lekin joriy token uchun ruxsat rad etildi (HTTP ${resp.status}). storage.rules ni tekshiring.`
            : `Firebase Storage (${this.bucketName}) mavjud va himoyalangan (HTTP ${resp.status}). Admin paneldan yuklashda Firebase ID tokeni yoki FIREBASE_SERVICE_ACCOUNT_KEY ishlatiladi.`,
          httpStatus: resp.status,
          checkedAt: now,
          details: bodyText.slice(0, 220),
        };
        this.cachedHealth = st;
        return st;
      }
      const st: AudioStorageHealthStatus = {
        provider: 'firebase_storage',
        bucketName: this.bucketName,
        projectId: this.projectId,
        authMode: hasAdminToken ? 'firebase_rest_admin_token' : 'unauthenticated_probe',
        healthy: false,
        writable: false,
        statusCode: 'unreachable',
        messageUz: `Firebase Storage (${this.bucketName}) kutilmagan javob qaytardi (HTTP ${resp.status}).`,
        httpStatus: resp.status,
        checkedAt: now,
        details: bodyText.slice(0, 220),
      };
      this.cachedHealth = st;
      return st;
    } catch (err: any) {
      const st: AudioStorageHealthStatus = {
        provider: 'firebase_storage',
        bucketName: this.bucketName,
        projectId: this.projectId,
        authMode: 'unauthenticated_probe',
        healthy: false,
        writable: false,
        statusCode: 'unreachable',
        messageUz: `Firebase Storage (${this.bucketName}) bilan tarmoq aloqasi oʻrnatilmadi: ${err?.message || err}`,
        checkedAt: now,
      };
      this.cachedHealth = st;
      return st;
    }
  }

  public async uploadObject(params: {
    objectPath: string;
    buffer: Buffer;
    contentType: string;
    customMetadata?: Record<string, string>;
    firebaseIdToken?: string;
  }): Promise<StoredObjectMetadata> {
    if (!this.bucketName) {
      throw new AudioStorageError(
        'STORAGE_NOT_CONFIGURED',
        'Firebase Storage bucket sozlanmagan. Audio faylni lokal diskka yozish taqiqlangan.',
        { httpStatus: 503 }
      );
    }

    const cleanPath = params.objectPath.replace(/^\/+/, '');
    const downloadToken = crypto.randomUUID();

    // Path 1: Firebase Admin SDK (preferred for server-side uploads)
    if (this.adminBucket) {
      try {
        const file = this.adminBucket.file(cleanPath);
        await file.save(params.buffer, {
          resumable: false,
          validation: 'crc32c',
          metadata: {
            contentType: params.contentType,
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: {
              ...(params.customMetadata || {}),
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });
        const [meta] = await file.getMetadata();
        return {
          bucket: this.bucketName,
          objectPath: cleanPath,
          sizeBytes: Number(meta.size || params.buffer.length),
          contentType: String(meta.contentType || params.contentType),
          etag: meta.etag ? String(meta.etag) : undefined,
          generation: meta.generation ? String(meta.generation) : undefined,
          md5Hash: meta.md5Hash ? String(meta.md5Hash) : undefined,
          customMetadata: (meta.metadata as Record<string, string>) || params.customMetadata,
          updatedAt: meta.updated ? String(meta.updated) : new Date().toISOString(),
          downloadToken,
        };
      } catch (err: any) {
        const codeNum = Number(err?.code || 0);
        throw this.classifyHttpFailure(codeNum || 503, String(err?.message || err), 'admin_upload');
      }
    }

    // Path 2: Firebase Storage REST API with Admin Firebase Auth ID Token
    if (!params.firebaseIdToken?.trim()) {
      // Probe bucket first so error message tells admin the EXACT root cause (404 bucket missing vs missing credentials)
      const health = await this.getHealthStatus({ forceProbe: true });
      if (health.statusCode === 'bucket_not_found') {
        throw new AudioStorageError('STORAGE_BUCKET_NOT_FOUND', health.messageUz, {
          httpStatus: 503,
          bucketName: this.bucketName,
          details: health.details,
        });
      }
      throw new AudioStorageError(
        'STORAGE_PERMISSION_DENIED',
        `Firebase Storage (${this.bucketName}) ga yozish uchun serverda FIREBASE_SERVICE_ACCOUNT_KEY oʻrnatilmagan va soʻrovda Admin Firebase Auth ID tokeni (X-Firebase-Id-Token) yoʻq. Lokal diskka jim oʻtish bloklangan.`,
        { httpStatus: 503, bucketName: this.bucketName }
      );
    }

    const uploadUrl = `${this.buildRestBaseUrl()}?uploadType=media&name=${encodeURIComponent(cleanPath)}`;
    const resp = await this.fetchImpl(uploadUrl, {
      method: 'POST',
      headers: this.buildRestHeaders(params.firebaseIdToken, {
        'Content-Type': params.contentType,
        'Content-Length': String(params.buffer.length),
      }),
      body: new Uint8Array(params.buffer),
    });

    const text = await resp.text().catch(() => '');
    if (!resp.ok) {
      throw this.classifyHttpFailure(resp.status, text, 'rest_upload');
    }

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    // Patch custom metadata (SHA-256, version, qariId) if provided
    if (params.customMetadata && Object.keys(params.customMetadata).length > 0) {
      try {
        await this.fetchImpl(`${this.buildRestBaseUrl()}/${encodeURIComponent(cleanPath)}`, {
          method: 'PATCH',
          headers: this.buildRestHeaders(params.firebaseIdToken, {
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            contentType: params.contentType,
            metadata: params.customMetadata,
          }),
        });
      } catch {
        // Non-fatal: canonical metadata is stored authoritatively in Firestore
      }
    }

    return {
      bucket: String(json.bucket || this.bucketName),
      objectPath: String(json.name || cleanPath),
      sizeBytes: Number(json.size || params.buffer.length),
      contentType: String(json.contentType || params.contentType),
      etag: json.etag ? String(json.etag) : undefined,
      generation: json.generation ? String(json.generation) : undefined,
      md5Hash: json.md5Hash ? String(json.md5Hash) : undefined,
      customMetadata: json.metadata || params.customMetadata,
      updatedAt: json.updated || new Date().toISOString(),
      downloadToken: json.downloadTokens ? String(json.downloadTokens).split(',')[0] : undefined,
    };
  }

  public async getObjectMetadata(
    objectPath: string,
    firebaseIdToken?: string
  ): Promise<StoredObjectMetadata | null> {
    const cleanPath = objectPath.replace(/^\/+/, '');
    if (this.adminBucket) {
      try {
        const file = this.adminBucket.file(cleanPath);
        const [exists] = await file.exists();
        if (!exists) return null;
        const [meta] = await file.getMetadata();
        return {
          bucket: this.bucketName,
          objectPath: cleanPath,
          sizeBytes: Number(meta.size || 0),
          contentType: String(meta.contentType || 'audio/mpeg'),
          etag: meta.etag ? String(meta.etag) : undefined,
          generation: meta.generation ? String(meta.generation) : undefined,
          md5Hash: meta.md5Hash ? String(meta.md5Hash) : undefined,
          customMetadata: (meta.metadata as Record<string, string>) || undefined,
          updatedAt: meta.updated ? String(meta.updated) : undefined,
        };
      } catch (err: any) {
        if (Number(err?.code) === 404) return null;
        throw this.classifyHttpFailure(Number(err?.code) || 503, String(err?.message || err), 'read_object_meta');
      }
    }

    const resp = await this.fetchImpl(`${this.buildRestBaseUrl()}/${encodeURIComponent(cleanPath)}`, {
      method: 'GET',
      headers: this.buildRestHeaders(firebaseIdToken),
    });
    if (resp.status === 404) return null;
    const text = await resp.text().catch(() => '');
    if (!resp.ok) {
      throw this.classifyHttpFailure(resp.status, text, 'read_object_meta');
    }
    const json = JSON.parse(text);
    return {
      bucket: String(json.bucket || this.bucketName),
      objectPath: String(json.name || cleanPath),
      sizeBytes: Number(json.size || 0),
      contentType: String(json.contentType || 'audio/mpeg'),
      etag: json.etag ? String(json.etag) : undefined,
      generation: json.generation ? String(json.generation) : undefined,
      md5Hash: json.md5Hash ? String(json.md5Hash) : undefined,
      customMetadata: json.metadata || undefined,
      updatedAt: json.updated ? String(json.updated) : undefined,
      downloadToken: json.downloadTokens ? String(json.downloadTokens).split(',')[0] : undefined,
    };
  }

  public async objectExists(objectPath: string, firebaseIdToken?: string): Promise<boolean> {
    const meta = await this.getObjectMetadata(objectPath, firebaseIdToken);
    return Boolean(meta && meta.sizeBytes > 0);
  }

  public async downloadObjectBuffer(objectPath: string, firebaseIdToken?: string): Promise<Buffer> {
    const cleanPath = objectPath.replace(/^\/+/, '');
    if (this.adminBucket) {
      try {
        const [buf] = await this.adminBucket.file(cleanPath).download();
        return Buffer.from(buf);
      } catch (err: any) {
        throw this.classifyHttpFailure(Number(err?.code) || 503, String(err?.message || err), 'read_object');
      }
    }

    const url = `${this.buildRestBaseUrl()}/${encodeURIComponent(cleanPath)}?alt=media`;
    const resp = await this.fetchImpl(url, {
      method: 'GET',
      headers: this.buildRestHeaders(firebaseIdToken),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw this.classifyHttpFailure(resp.status, text, 'read_object');
    }
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  }

  public async downloadObjectRange(
    objectPath: string,
    start: number,
    end: number,
    firebaseIdToken?: string
  ): Promise<{ buffer: Buffer; totalSize: number; contentType: string; start: number; end: number }> {
    const cleanPath = objectPath.replace(/^\/+/, '');
    const meta = await this.getObjectMetadata(cleanPath, firebaseIdToken);
    if (!meta) {
      throw new AudioStorageError(
        'STORAGE_OBJECT_NOT_FOUND',
        `Audio fayl Firebase Storage (${this.bucketName}) ichida topilmadi.`,
        { httpStatus: 404, bucketName: this.bucketName }
      );
    }

    const totalSize = meta.sizeBytes;
    const clampedStart = Math.max(0, Math.min(start, Math.max(0, totalSize - 1)));
    const clampedEnd = Math.max(clampedStart, Math.min(end, Math.max(0, totalSize - 1)));

    if (this.adminBucket) {
      try {
        const [buf] = await this.adminBucket.file(cleanPath).download({
          start: clampedStart,
          end: clampedEnd,
        });
        return {
          buffer: Buffer.from(buf),
          totalSize,
          contentType: meta.contentType || 'audio/mpeg',
          start: clampedStart,
          end: clampedEnd,
        };
      } catch (err: any) {
        throw this.classifyHttpFailure(Number(err?.code) || 503, String(err?.message || err), 'read_object_range');
      }
    }

    const url = `${this.buildRestBaseUrl()}/${encodeURIComponent(cleanPath)}?alt=media`;
    const resp = await this.fetchImpl(url, {
      method: 'GET',
      headers: this.buildRestHeaders(firebaseIdToken, {
        Range: `bytes=${clampedStart}-${clampedEnd}`,
      }),
    });
    if (!resp.ok && resp.status !== 206) {
      const text = await resp.text().catch(() => '');
      throw this.classifyHttpFailure(resp.status, text, 'read_object_range');
    }
    const arr = await resp.arrayBuffer();
    return {
      buffer: Buffer.from(arr),
      totalSize,
      contentType: meta.contentType || resp.headers.get('content-type') || 'audio/mpeg',
      start: clampedStart,
      end: clampedEnd,
    };
  }
}

/**
 * Deterministic in-memory Object Storage Driver — STRICTLY FOR AUTOMATED UNIT / INTEGRATION TESTS.
 * Supports simulating Storage failures (`forceFailureCode`) and verifying version immutability & restart read-back.
 */
export class InMemoryAudioStorageDriver implements AudioObjectStorageDriver {
  public readonly provider = 'memory_test' as const;
  public readonly bucketName: string;
  public readonly projectId: string;
  public readonly objects = new Map<
    string,
    { buffer: Buffer; contentType: string; customMetadata?: Record<string, string>; updatedAt: string }
  >();
  public forceFailureCode: AudioStorageErrorCode | null = null;

  constructor(options?: { bucketName?: string; projectId?: string }) {
    this.bucketName = options?.bucketName || 'basic-petal-001dl.firebasestorage.app';
    this.projectId = options?.projectId || 'basic-petal-001dl';
  }

  private assertNotForcedFailure(): void {
    if (this.forceFailureCode) {
      throw new AudioStorageError(
        this.forceFailureCode,
        `Simulated Storage error (${this.forceFailureCode}) — lokal diskka jim oʻtish bloklandi.`,
        { httpStatus: 503, bucketName: this.bucketName }
      );
    }
  }

  public async getHealthStatus(): Promise<AudioStorageHealthStatus> {
    const now = new Date().toISOString();
    if (this.forceFailureCode) {
      return {
        provider: 'memory_test',
        bucketName: this.bucketName,
        projectId: this.projectId,
        authMode: 'memory_test',
        healthy: false,
        writable: false,
        statusCode:
          this.forceFailureCode === 'STORAGE_BUCKET_NOT_FOUND'
            ? 'bucket_not_found'
            : this.forceFailureCode === 'STORAGE_PERMISSION_DENIED'
              ? 'permission_denied'
              : 'unreachable',
        messageUz: `Test Storage xatosi: ${this.forceFailureCode}`,
        httpStatus: 503,
        checkedAt: now,
      };
    }
    return {
      provider: 'memory_test',
      bucketName: this.bucketName,
      projectId: this.projectId,
      authMode: 'memory_test',
      healthy: true,
      writable: true,
      statusCode: 'ready',
      messageUz: `Test Object Storage (${this.bucketName}) tayyor.`,
      httpStatus: 200,
      checkedAt: now,
    };
  }

  public async uploadObject(params: {
    objectPath: string;
    buffer: Buffer;
    contentType: string;
    customMetadata?: Record<string, string>;
  }): Promise<StoredObjectMetadata> {
    this.assertNotForcedFailure();
    const cleanPath = params.objectPath.replace(/^\/+/, '');
    const copy = Buffer.from(params.buffer);
    const updatedAt = new Date().toISOString();
    this.objects.set(cleanPath, {
      buffer: copy,
      contentType: params.contentType,
      customMetadata: params.customMetadata ? { ...params.customMetadata } : undefined,
      updatedAt,
    });
    return {
      bucket: this.bucketName,
      objectPath: cleanPath,
      sizeBytes: copy.length,
      contentType: params.contentType,
      etag: `"${crypto.createHash('md5').update(copy).digest('hex')}"`,
      generation: String(Date.now()),
      customMetadata: params.customMetadata,
      updatedAt,
    };
  }

  public async getObjectMetadata(objectPath: string): Promise<StoredObjectMetadata | null> {
    this.assertNotForcedFailure();
    const cleanPath = objectPath.replace(/^\/+/, '');
    const item = this.objects.get(cleanPath);
    if (!item) return null;
    return {
      bucket: this.bucketName,
      objectPath: cleanPath,
      sizeBytes: item.buffer.length,
      contentType: item.contentType,
      etag: `"${crypto.createHash('md5').update(item.buffer).digest('hex')}"`,
      customMetadata: item.customMetadata,
      updatedAt: item.updatedAt,
    };
  }

  public async objectExists(objectPath: string): Promise<boolean> {
    this.assertNotForcedFailure();
    return this.objects.has(objectPath.replace(/^\/+/, ''));
  }

  public async downloadObjectBuffer(objectPath: string): Promise<Buffer> {
    this.assertNotForcedFailure();
    const cleanPath = objectPath.replace(/^\/+/, '');
    const item = this.objects.get(cleanPath);
    if (!item) {
      throw new AudioStorageError('STORAGE_OBJECT_NOT_FOUND', `Object not found: ${cleanPath}`, {
        httpStatus: 404,
        bucketName: this.bucketName,
      });
    }
    return Buffer.from(item.buffer);
  }

  public async downloadObjectRange(
    objectPath: string,
    start: number,
    end: number
  ): Promise<{ buffer: Buffer; totalSize: number; contentType: string; start: number; end: number }> {
    this.assertNotForcedFailure();
    const cleanPath = objectPath.replace(/^\/+/, '');
    const item = this.objects.get(cleanPath);
    if (!item) {
      throw new AudioStorageError('STORAGE_OBJECT_NOT_FOUND', `Object not found: ${cleanPath}`, {
        httpStatus: 404,
        bucketName: this.bucketName,
      });
    }
    const totalSize = item.buffer.length;
    const clampedStart = Math.max(0, Math.min(start, Math.max(0, totalSize - 1)));
    const clampedEnd = Math.max(clampedStart, Math.min(end, Math.max(0, totalSize - 1)));
    return {
      buffer: Buffer.from(item.buffer.subarray(clampedStart, clampedEnd + 1)),
      totalSize,
      contentType: item.contentType,
      start: clampedStart,
      end: clampedEnd,
    };
  }
}
