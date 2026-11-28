import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActiveAdminToken, getActiveFirebaseIdToken } from '../../../utils/firebaseClient';
import {
  Archive,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  FileArchive,
  HardDrive,
  Headphones,
  History,
  Image as ImageIcon,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Upload,
  AlertTriangle,
  Globe,
  Send,
  Layers,
  XCircle,
  Volume2,
  ArrowRightLeft,
} from 'lucide-react';

const ODILJON_QORI_ID = 'odiljon_qori';
const CHUNK_SIZE_BYTES = 512 * 1024; // 512 KB chunks for resumable uploads with retry
const MAX_CHUNK_RETRIES = 3;

interface AudioVersionHistoryEntry {
  version: number;
  storageBackend?: 'firebase_storage' | 'legacy_local_disk';
  storageBucket?: string;
  storagePath?: string;
  relativePath?: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
  durationSec?: number;
  uploadedAt: string;
  uploadedBy: string;
  note?: string;
}

interface SurahCatalogRow {
  surahNumber: number;
  nameUz: string;
  nameAr: string;
  numberOfAyahs: number;
  audioUrl: string | null;
  audioSource: 'uploaded_persistent' | 'external_cdn' | 'unavailable';
  uploadedRecord: {
    id: string;
    surahNumber: number;
    fileName: string;
    originalFilename: string;
    relativePath: string;
    storageBackend?: 'firebase_storage' | 'legacy_local_disk';
    storageBucket?: string;
    storagePath?: string;
    backupRelativePath?: string;
    backupVerified?: boolean;
    mimeType: string;
    sizeBytes: number;
    durationSec?: number;
    durationSeconds?: number;
    sha256: string;
    version: number;
    versionHistory?: AudioVersionHistoryEntry[];
    reconciliationStatus?: 'synced' | 'pending_firestore_retry' | 'firestore_failed';
    status: 'UPLOADED' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
    integrityStatus?: 'ok' | 'missing_file' | 'corrupted' | 'unchecked';
    uploadedAt: string;
    updatedAt: string;
    publishedAt?: string;
    archivedAt?: string;
    isDeleted?: boolean;
  } | null;
}

interface DiagnosticsPayload {
  storageHealth: {
    provider: string;
    bucketName: string;
    projectId: string;
    authMode: string;
    healthy: boolean;
    writable: boolean;
    statusCode: 'ready' | 'bucket_not_found' | 'permission_denied' | 'not_configured' | 'unreachable';
    messageUz: string;
    httpStatus?: number;
    checkedAt: string;
    details?: string;
  };
  firestoreHydratedAt: string | null;
  reconciliationQueueCount: number;
  reconciliationQueue: Array<{
    id: string;
    collection: string;
    docId: string;
    reason: string;
    attempts: number;
    lastError: string;
    updatedAt: string;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    stage: string;
    code: string;
    message: string;
    qariId?: string;
    surahNumber?: number;
  }>;
  legacyInventorySummary: {
    totalItems: number;
    readyToMigrateCount: number;
    alreadyMigratedCount: number;
    missingFileCount: number;
    corruptedFileCount: number;
  };
}

interface LegacyInventoryPayload {
  scannedAt: string;
  totalItems: number;
  readyToMigrateCount: number;
  alreadyMigratedCount: number;
  missingFileCount: number;
  corruptedFileCount: number;
  items: Array<{
    source: string;
    recordId: string;
    qariId: string;
    surahNumber: number;
    surahNameUz: string;
    legacyPath: string;
    existsOnDisk: boolean;
    fileSizeBytes: number;
    migrationStatus: 'ready_to_migrate' | 'already_migrated' | 'missing_file' | 'corrupted_file';
    reasonUz: string;
  }>;
}

interface CatalogResponse {
  success: boolean;
  qari: any;
  surahs: SurahCatalogRow[];
  uploadedCount: number;
  verifiedCount: number;
  publishedCount: number;
  syncedCount: number;
  archivedCount: number;
  backedUpCount: number;
  missingCount: number;
  errorCount: number;
  missingSurahs: number[];
  errorSurahs: number[];
  isCompleteReady: boolean;
  readinessLabelUz: string;
  storageSummary?: {
    storageBackend?: string;
    storageBucket?: string;
    localDiskFallbackEnabled?: boolean;
    primaryVaultPath: string;
    permanentBackupPath: string;
    isProtectedPermanent: boolean;
    hardDeleteBlocked: boolean;
    totalBytes: number;
  };
  platformSync?: {
    webApp: boolean;
    androidV7: boolean;
    telegramMiniApp: boolean;
    telegramBot: boolean;
    lastSyncedAt: string;
  };
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Faylni oʻqishda xatolik yuz berdi'));
    reader.readAsDataURL(file);
  });
}

function detectSurahFromFilename(filename: string, fallback: number): number {
  const base = filename.replace(/\.[^/.]+$/, '');
  const lead = base.match(/(?:^|[^0-9])(0?\d{1,3})(?:[^0-9]|$)/);
  if (lead) {
    const n = parseInt(lead[1], 10);
    if (n >= 1 && n <= 114) return n;
  }
  const anyNum = base.match(/(\d{1,3})/);
  if (anyNum) {
    const n = parseInt(anyNum[1], 10);
    if (n >= 1 && n <= 114) return n;
  }
  return Math.max(1, Math.min(114, fallback));
}

export const OdiljonQoriAdminPanel: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Profile editor state
  const [profileForm, setProfileForm] = useState({
    nameUz: 'Odiljon qori',
    nameAr: 'عادل جان قاري',
    countryUz: 'Oʻzbekiston',
    styleUz: 'Murattal · Hafs an Osim',
    rewayaUz: 'Hafs an Osim',
    biographyUz: '',
    isActive: true,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Upload workbench state
  const [selectedSurahNum, setSelectedSurahNum] = useState<number>(1);
  const [autoPublish, setAutoPublish] = useState<boolean>(true);
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    label: string;
    currentFile: number;
    totalFiles: number;
    percent: number;
    errors: string[];
  } | null>(null);
  const [importingZip, setImportingZip] = useState(false);
  const [runningIntegrity, setRunningIntegrity] = useState(false);
  const [runningBackupTest, setRunningBackupTest] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [backupReport, setBackupReport] = useState<any | null>(null);

  // Firebase Storage & Firestore Sync Diagnostics + Legacy Audio Migration
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
  const [legacyInventory, setLegacyInventory] = useState<LegacyInventoryPayload | null>(null);
  const [reconcilingFirestore, setReconcilingFirestore] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [expandedVersionAudioId, setExpandedVersionAudioId] = useState<string | null>(null);
  const [restoringVersionKey, setRestoringVersionKey] = useState<string | null>(null);

  // Checklist filtering & audio preview
  const [filterMode, setFilterMode] = useState<'all' | 'uploaded' | 'missing' | 'archived' | 'errors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAudio, setPreviewAudio] = useState<{
    surahNumber: number;
    surahNameUz: string;
    audioId: string;
    version: number;
  } | null>(null);

  const rowUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [rowUploadTargetSurah, setRowUploadTargetSurah] = useState<number | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = getActiveAdminToken();
    const fbToken = await getActiveFirebaseIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fbToken ? { 'X-Firebase-Id-Token': fbToken } : {}),
    };
  }, []);

  const loadDiagnosticsAndInventory = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [diagRes, invRes] = await Promise.all([
        fetch('/api/admin/quran-ecosystem/diagnostics', { headers, credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/quran-ecosystem/migration/inventory', { headers, credentials: 'include' }).then((r) => r.json()),
      ]);
      if (diagRes?.success) setDiagnostics(diagRes);
      if (invRes?.success) setLegacyInventory(invRes);
    } catch {
      // Non-blocking diagnostics refresh
    }
  }, [getAuthHeaders]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/surahs`,
        { headers, credentials: 'include' }
      ).then((r) => r.json());
      if (res?.success) {
        setCatalog(res);
        if (res.qari) {
          setProfileForm({
            nameUz: res.qari.nameUz || 'Odiljon qori',
            nameAr: res.qari.nameAr || 'عادل جان قاري',
            countryUz: res.qari.countryUz || 'Oʻzbekiston',
            styleUz: res.qari.styleUz || 'Murattal',
            rewayaUz: res.qari.rewayaUz || 'Hafs an Osim',
            biographyUz: res.qari.biographyUz || '',
            isActive: Boolean(res.qari.isActive),
          });
        }
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Odiljon qori katalogini yuklab boʻlmadi.' });
      }
      await loadDiagnosticsAndInventory();
    } catch (err: any) {
      setNotice({ type: 'err', msg: err?.message || 'Server bilan ulanishda xatolik.' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, loadDiagnosticsAndInventory]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/quran-ecosystem/qaris', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: ODILJON_QORI_ID,
          ...profileForm,
          isVerified: true,
          isProtectedPermanent: true,
        }),
      }).then((r) => r.json());
      if (res?.success) {
        setNotice({
          type: 'ok',
          msg: 'Odiljon qori profili saqlandi va barcha 4 platformaga (Web, Android v7, Mini App, Telegram Bot) sinxronlandi.',
        });
        await loadCatalog();
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Profilni saqlashda xatolik.' });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setNotice(null);
    try {
      const imageBase64 = await fileToDataUrl(file);
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/avatar`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            imageBase64,
            mimeType: file.type || 'image/jpeg',
            originalFilename: file.name,
          }),
        }
      ).then((r) => r.json());
      if (res?.success) {
        setNotice({ type: 'ok', msg: 'Odiljon qori profil rasmi Firebase Storageʼga saqlandi va 4 platformada yangilandi.' });
        await loadCatalog();
      } else {
        const codeTag = res?.code ? `[${res.code}] ` : '';
        setNotice({ type: 'err', msg: `${codeTag}${res?.error || 'Rasmni yuklashda xatolik.'}` });
      }
    } catch (err: any) {
      setNotice({ type: 'err', msg: err?.message || 'Rasmni yuklashda xatolik.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Resumable chunked upload with automatic retry per chunk
  const uploadSingleFileResumable = async (
    file: File,
    surahNumber: number,
    onChunkProgress?: (pct: number) => void
  ): Promise<{ ok: boolean; error?: string; version?: number }> => {
    const uploadId = `odiljon_s${surahNumber}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

    for (let idx = 0; idx < totalChunks; idx++) {
      const start = idx * CHUNK_SIZE_BYTES;
      const end = Math.min(file.size, start + CHUNK_SIZE_BYTES);
      const sliceBuf = await file.slice(start, end).arrayBuffer();
      const chunkBase64 = arrayBufferToBase64(sliceBuf);

      let sent = false;
      let lastErr = '';
      for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/admin/quran-ecosystem/audio/upload-chunk', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              uploadId,
              qariId: ODILJON_QORI_ID,
              surahNumber,
              chunkIndex: idx,
              totalChunks,
              chunkBase64,
            }),
          }).then((r) => r.json());
          if (res?.success) {
            sent = true;
            break;
          }
          lastErr = res?.error || `Boʻlak #${idx + 1} yuklanmadi`;
        } catch (err: any) {
          lastErr = err?.message || `Tarmoq xatoligi (urinish ${attempt})`;
        }
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }

      if (!sent) {
        return { ok: false, error: `Sura #${surahNumber}: ${lastErr}` };
      }
      onChunkProgress?.(Math.round(((idx + 1) / totalChunks) * 90));
    }

    const completeHeaders = await getAuthHeaders();
    const completeResp = await fetch('/api/admin/quran-ecosystem/audio/upload-complete', {
      method: 'POST',
      headers: completeHeaders,
      credentials: 'include',
      body: JSON.stringify({
        uploadId,
        totalChunks,
        qariId: ODILJON_QORI_ID,
        surahNumber,
        mimeType: file.type || 'audio/mpeg',
        originalFilename: file.name,
        autoPublish,
      }),
    });
    const completeRes = await completeResp.json();

    onChunkProgress?.(100);
    if (!completeRes?.success) {
      const codeTag = completeRes?.code ? `[${completeRes.code}] ` : '';
      return {
        ok: false,
        error: `Sura #${surahNumber}: ${codeTag}${completeRes?.error || `HTTP ${completeResp.status} yakunlashda xatolik`}`,
      };
    }
    return { ok: true, version: completeRes.record?.version };
  };

  const handleFilesBatchUpload = async (files: FileList | null, forcedSurahNumber?: number) => {
    if (!files || files.length === 0) return;
    setNotice(null);
    const list = Array.from(files);
    const errors: string[] = [];
    let okCount = 0;

    setUploadProgress({
      active: true,
      label: `Yuklanmoqda (${list.length} ta fayl)...`,
      currentFile: 0,
      totalFiles: list.length,
      percent: 0,
      errors: [],
    });

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const targetSurah =
        typeof forcedSurahNumber === 'number'
          ? forcedSurahNumber
          : list.length === 1
          ? selectedSurahNum
          : detectSurahFromFilename(file.name, selectedSurahNum + i);

      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              currentFile: i + 1,
              label: `Sura #${targetSurah} (${file.name}) yuklanmoqda...`,
              percent: Math.round((i / list.length) * 100),
            }
          : null
      );

      const res = await uploadSingleFileResumable(file, targetSurah, (chunkPct) => {
        const overall = Math.round(((i + chunkPct / 100) / list.length) * 100);
        setUploadProgress((prev) => (prev ? { ...prev, percent: overall } : null));
      });

      if (res.ok) {
        okCount += 1;
      } else if (res.error) {
        errors.push(res.error);
      }
    }

    setUploadProgress(null);
    await loadCatalog();

    if (okCount > 0 && errors.length === 0) {
      setNotice({
        type: 'ok',
        msg: `${okCount} ta sura audio fayli Firebase Storage doimiy bulut omboriga saqlandi (SHA-256 qayta oʻqib tasdiqlandi) va 4 platformaga sinxronlandi.`,
      });
    } else if (okCount > 0) {
      setNotice({
        type: 'err',
        msg: `${okCount} ta sura yuklandi, ${errors.length} ta faylda xatolik: ${errors.slice(0, 3).join(' | ')}`,
      });
    } else {
      setNotice({
        type: 'err',
        msg: errors[0] || 'Audio fayllarni Firebase Storageʼga yuklab boʻlmadi.',
      });
    }
  };

  const handleZipBatchImport = async (file: File | null) => {
    if (!file) return;
    setImportingZip(true);
    setNotice(null);
    try {
      const zipBase64 = await fileToDataUrl(file);
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/import-zip`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ zipBase64, autoPublish }),
        }
      ).then((r) => r.json());
      if (res?.success) {
        setNotice({
          type: 'ok',
          msg: `ZIP import yakunlandi: ${res.importedCount} ta sura Firebase Storageʼga yuklandi, ${res.failedCount || 0} ta xatolik.`,
        });
        await loadCatalog();
      } else {
        const codeTag = res?.code ? `[${res.code}] ` : '';
        setNotice({ type: 'err', msg: `${codeTag}${res?.error || 'ZIP arxivni import qilib boʻlmadi.'}` });
      }
    } catch (err: any) {
      setNotice({ type: 'err', msg: err?.message || 'ZIP yuklashda xatolik.' });
    } finally {
      setImportingZip(false);
    }
  };

  const handlePublishAll = async () => {
    setNotice(null);
    const headers = await getAuthHeaders();
    const res = await fetch(
      `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/publish-all`,
      { method: 'POST', headers, credentials: 'include' }
    ).then((r) => r.json());
    if (res?.success) {
      setNotice({
        type: 'ok',
        msg: `${res.publishedCount} ta sura eʼlon qilindi va barcha 4 platformaga sinxronlandi.`,
      });
      await loadCatalog();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Ommaviy eʼlon qilishda xatolik.' });
    }
  };

  const handleStatusChange = async (audioId: string, status: 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED') => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/quran-ecosystem/audio/${encodeURIComponent(audioId)}/status`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({ type: 'ok', msg: `Audio holati ${status} ga oʻzgartirildi.` });
      await loadCatalog();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Holatni oʻzgartirib boʻlmadi.' });
    }
  };

  const handleArchiveAudio = async (audioId: string, surahNumber: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/quran-ecosystem/audio/${encodeURIComponent(audioId)}/archive`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reason: `Admin tomonidan #${surahNumber} sura vaqtincha yashirildi` }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({
        type: 'ok',
        msg: `Sura #${surahNumber} xavfsiz arxivlandi (Firebase Storageʼdagi immutable audio obyekt saqlab qolindi).`,
      });
      await loadCatalog();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Arxivlashda xatolik.' });
    }
  };

  const handleRestoreAudio = async (audioId: string, surahNumber: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/quran-ecosystem/audio/${encodeURIComponent(audioId)}/restore`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ publishImmediately: true }),
    }).then((r) => r.json());
    if (res?.success) {
      setNotice({
        type: 'ok',
        msg: `Sura #${surahNumber} qayta tiklandi va 4 platformaga sinxronlandi.`,
      });
      await loadCatalog();
    } else {
      setNotice({ type: 'err', msg: res?.error || 'Tiklashda xatolik.' });
    }
  };

  const handleRestoreVersion = async (audioId: string, surahNumber: number, targetVersion: number) => {
    const key = `${audioId}:v${targetVersion}`;
    setRestoringVersionKey(key);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/audio/${encodeURIComponent(audioId)}/restore-version`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ version: targetVersion }),
        }
      ).then((r) => r.json());
      if (res?.success) {
        setNotice({
          type: 'ok',
          msg: `Sura #${surahNumber} eski v${targetVersion} versiyasi Firebase Storage SHA-256 nazoratidan oʻtib, faol versiya (v${res.record?.version}) sifatida tiklandi.`,
        });
        await loadCatalog();
      } else {
        setNotice({ type: 'err', msg: res?.error || `v${targetVersion} versiyani tiklab boʻlmadi.` });
      }
    } finally {
      setRestoringVersionKey(null);
    }
  };

  const handleReconcileFirestore = async () => {
    setReconcilingFirestore(true);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/quran-ecosystem/reconcile', {
        method: 'POST',
        headers,
        credentials: 'include',
      }).then((r) => r.json());
      if (res?.success && res.report) {
        const rep = res.report;
        setNotice({
          type: (rep.stillPendingCount ?? 0) === 0 ? 'ok' : 'err',
          msg: `Firestore qayta sinxronlash: ${rep.reconciledCount ?? 0} ta muvaffaqiyatli, navbatda ${rep.stillPendingCount ?? 0} ta qoldi.`,
        });
        await loadDiagnosticsAndInventory();
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Firestore qayta sinxronlashda xatolik.' });
      }
    } finally {
      setReconcilingFirestore(false);
    }
  };

  const handleRunLegacyMigration = async () => {
    setRunningMigration(true);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/quran-ecosystem/migration/run', {
        method: 'POST',
        headers,
        credentials: 'include',
      }).then((r) => r.json());
      if (res?.success && res.report) {
        const rep = res.report;
        setNotice({
          type: rep.failedCount === 0 ? 'ok' : 'err',
          msg: `Eski audio migratsiya: ${rep.migratedCount} ta Firebase Storageʼga koʻchirildi, ${rep.missingMarkedCount} ta yoʻqolgan deb belgilandi, ${rep.failedCount} ta xato.`,
        });
        await loadCatalog();
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Migratsiya jarayonida xatolik.' });
      }
    } finally {
      setRunningMigration(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setRunningIntegrity(true);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/verify-integrity`,
        { method: 'POST', headers, credentials: 'include' }
      ).then((r) => r.json());
      if (res?.success && res?.report) {
        const rep = res.report;
        setIntegrityReport(rep);
        setNotice({
          type: rep.corruptedCount === 0 ? 'ok' : 'err',
          msg: `Firebase Storage SHA-256 tekshiruvi: ${rep.verifiedOkCount}/${rep.totalChecked} fayl sogʻlom, ${rep.corruptedCount} xato.`,
        });
        await loadCatalog();
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Tekshiruvda xatolik.' });
      }
    } finally {
      setRunningIntegrity(false);
    }
  };

  const handleBackupRestoreTest = async () => {
    setRunningBackupTest(true);
    setNotice(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/admin/quran-ecosystem/qaris/${encodeURIComponent(ODILJON_QORI_ID)}/backup-restore-test`,
        { method: 'POST', headers, credentials: 'include' }
      ).then((r) => r.json());
      if (res?.success && res?.report) {
        const rep = res.report;
        setBackupReport(rep);
        setNotice({
          type: rep.passed ? 'ok' : 'err',
          msg: `Storage Read-Back & Restore sinovi: ${rep.restoreVerifiedCount}/${rep.totalActiveSurahs} fayl SHA-256 boʻyicha ${rep.passed ? 'MUVAFFAQIYATLI' : 'XATOLIK BILAN'} oʻtdi.`,
        });
        await loadCatalog();
      } else {
        setNotice({ type: 'err', msg: res?.error || 'Storage read-back sinovida xatolik.' });
      }
    } finally {
      setRunningBackupTest(false);
    }
  };

  const filteredSurahs = useMemo(() => {
    const rows = catalog?.surahs || [];
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const rec = row.uploadedRecord;
      if (filterMode === 'uploaded' && (!rec || rec.isDeleted || rec.status === 'ARCHIVED')) return false;
      if (filterMode === 'missing' && rec && !rec.isDeleted && rec.status !== 'ARCHIVED') return false;
      if (filterMode === 'archived' && (!rec || (!rec.isDeleted && rec.status !== 'ARCHIVED'))) return false;
      if (
        filterMode === 'errors' &&
        (!rec || (rec.status !== 'REJECTED' && rec.integrityStatus !== 'corrupted' && rec.integrityStatus !== 'missing_file'))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        String(row.surahNumber) === q ||
        String(row.surahNumber).padStart(3, '0').includes(q) ||
        row.nameUz.toLowerCase().includes(q) ||
        row.nameAr.includes(q)
      );
    });
  }, [catalog, filterMode, searchQuery]);

  const progressPct = catalog ? Math.round((catalog.publishedCount / 114) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hidden input for per-row single surah upload / re-upload */}
      <input
        ref={rowUploadInputRef}
        type="file"
        accept=".mp3,.m4a,.ogg,.wav,audio/*"
        className="hidden"
        onChange={(e) => {
          const target = rowUploadTargetSurah;
          if (target && e.target.files?.length) {
            void handleFilesBatchUpload(e.target.files, target);
          }
          e.target.value = '';
        }}
      />

      {/* Top Banner — Honest 114-Surah Readiness & 4-Platform Sync */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#06281E] via-[#071A14] to-[#040D0A] text-[#F7F4EC] border border-[#C8A85E]/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#C8A85E]/40 bg-white/10 shrink-0 flex items-center justify-center">
              {catalog?.qari?.avatarUrl ? (
                <img
                  src={catalog.qari.avatarUrl}
                  alt="Odiljon qori"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Headphones className="w-7 h-7 text-[#C8A85E]" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#C8A85E] font-bold">
                  ASAKA ZIYO v7.0.0 · DOIMIY AUDIO XOTIRA
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold ${
                    catalog?.isCompleteReady
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/35'
                  }`}
                >
                  {catalog?.readinessLabelUz || 'Yuklanmoqda...'}
                </span>
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-display font-extrabold">
                Odiljon qori — 114 Sura Qurʼon Audio Ekotizimi
              </h2>
              <p className="mt-1 text-xs text-[#A3B8B0] max-w-2xl">
                Audio fayllarning haqiqiy binary maʼlumotlari doimiy Firebase Cloud Storage omborida immutable versiyalar sifatida saqlanadi; Firestoreʼda faqat metadata va SHA-256 checksum yoziladi. Cloud Run vaqtinchalik diskiga jim fallback qatʼiyan bloklangan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePublishAll()}
              disabled={!catalog || catalog.uploadedCount === 0}
              className="px-3.5 py-2 rounded-xl bg-[#C8A85E] text-[#050C09] text-xs font-extrabold disabled:opacity-40 cursor-pointer"
            >
              Yuklanganlarni eʼlon qilish
            </button>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>
          </div>
        </div>

        {/* 114-Surah Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono-numbers">
            <span className="text-[#C5D4CE]">114 Sura Tayyorlik Darajasi</span>
            <span className="font-bold text-[#E6CE8A]">
              {catalog?.publishedCount ?? 0} / 114 ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-[#C8A85E] to-emerald-300 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 4-Platform Sync Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { label: 'Web App', icon: <Globe className="w-3.5 h-3.5" />, ok: catalog?.platformSync?.webApp ?? true },
            { label: 'Android v7', icon: <Smartphone className="w-3.5 h-3.5" />, ok: catalog?.platformSync?.androidV7 ?? true },
            { label: 'Telegram Mini App', icon: <Layers className="w-3.5 h-3.5" />, ok: catalog?.platformSync?.telegramMiniApp ?? true },
            { label: 'Telegram Bot', icon: <Send className="w-3.5 h-3.5" />, ok: catalog?.platformSync?.telegramBot ?? true },
          ].map((plat) => (
            <div
              key={plat.label}
              className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-between text-[11px]"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {plat.icon}
                {plat.label}
              </span>
              <span className="text-emerald-300 font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {plat.ok ? 'Sinxron' : 'Kutilmoqda'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'ok'
              ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/12 border-rose-500/30 text-rose-800 dark:text-rose-200'
          }`}
        >
          {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Firebase Storage Health & Firestore Sync Diagnostics + Legacy Audio Migration */}
      {diagnostics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Firebase Storage & Firestore Sync Health Card */}
          <div
            className={`rounded-3xl p-4 sm:p-5 border space-y-3 ${
              diagnostics.storageHealth.healthy
                ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                : 'bg-rose-500/[0.07] border-rose-500/35'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {diagnostics.storageHealth.healthy ? (
                  <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <CloudOff className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#091813] dark:text-[#F7F4EC]">
                    Firebase Cloud Storage & Firestore Sinxron Holati
                  </h3>
                  <div className="text-[11px] font-mono-numbers opacity-75">
                    Bucket: {diagnostics.storageHealth.bucketName} · Auth: {diagnostics.storageHealth.authMode}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 ${
                  diagnostics.storageHealth.healthy
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {diagnostics.storageHealth.healthy
                  ? 'BUCKET FAOL'
                  : diagnostics.storageHealth.statusCode === 'bucket_not_found'
                  ? '404 BUCKET YOQILMAGAN'
                  : diagnostics.storageHealth.statusCode === 'permission_denied'
                  ? `${diagnostics.storageHealth.httpStatus || 403} RUXSAT YOʻQ`
                  : diagnostics.storageHealth.statusCode.toUpperCase()}
              </span>
            </div>

            {!diagnostics.storageHealth.healthy && diagnostics.storageHealth.messageUz && (
              <div className="p-2.5 rounded-xl bg-rose-500/12 border border-rose-500/25 text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                <strong>Diqqat (Local Disk Fallback Oʻchirilgan):</strong> {diagnostics.storageHealth.messageUz}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 font-mono-numbers">
                <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                  Local Disk Fallback: <strong>OFF</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                  Firestore Navbat: <strong>{diagnostics.reconciliationQueueCount}</strong>
                </span>
                {diagnostics.recentErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorLogs((v) => !v)}
                    className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold cursor-pointer"
                  >
                    Xatolar ({diagnostics.recentErrors.length}) {showErrorLogs ? '▲' : '▼'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleReconcileFirestore()}
                disabled={reconcilingFirestore}
                className="px-3 py-1.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${reconcilingFirestore ? 'animate-spin' : ''}`} />
                <span>{reconcilingFirestore ? 'Sinxronlanmoqda...' : 'Qayta sinxronlash'}</span>
              </button>
            </div>

            {showErrorLogs && diagnostics.recentErrors.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-xl bg-black/5 dark:bg-black/30 p-2.5 space-y-1 text-[10px] font-mono-numbers">
                {diagnostics.recentErrors.slice(0, 10).map((err) => (
                  <div key={err.id} className="text-rose-700 dark:text-rose-300">
                    [{err.stage} · {err.code}] {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legacy Audio Inventory & Non-Destructive Storage Migration Card */}
          <div className="rounded-3xl az-liquid-glass p-4 sm:p-5 border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#C8A85E] shrink-0" />
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#091813] dark:text-[#F7F4EC]">
                    Eski Audio Inventarizatsiya va Storageʼga Koʻchirish
                  </h3>
                  <div className="text-[11px] opacity-75">
                    Lokal diskdagi mavjud fayllarni SHA-256 tekshiruvi bilan Firebase Storageʼga xavfsiz koʻchiradi.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center font-mono-numbers">
              <div className="p-2 rounded-xl bg-sky-500/10">
                <div className="text-[10px] opacity-70">Koʻchirishga tayyor</div>
                <div className="text-sm font-extrabold text-sky-700 dark:text-sky-300">
                  {legacyInventory?.readyToMigrateCount ?? diagnostics.legacyInventorySummary.readyToMigrateCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <div className="text-[10px] opacity-70">Storageʼda</div>
                <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                  {legacyInventory?.alreadyMigratedCount ?? diagnostics.legacyInventorySummary.alreadyMigratedCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/12">
                <div className="text-[10px] opacity-70">Yoʻqolgan</div>
                <div className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                  {legacyInventory?.missingFileCount ?? diagnostics.legacyInventorySummary.missingFileCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10">
                <div className="text-[10px] opacity-70">Buzilgan</div>
                <div className="text-sm font-extrabold text-rose-700 dark:text-rose-300">
                  {legacyInventory?.corruptedFileCount ?? diagnostics.legacyInventorySummary.corruptedFileCount}
                </div>
              </div>
            </div>

            {legacyInventory && legacyInventory.missingFileCount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold">
                  Avvalgi Cloud Run diskidan yoʻqolgan audio yozuvlar ({legacyInventory.missingFileCount} ta — metadata saqlanib qoldi):
                </div>
                <div className="max-h-20 overflow-y-auto space-y-0.5 font-mono-numbers text-[10px]">
                  {legacyInventory.items
                    .filter((it) => it.migrationStatus === 'missing_file')
                    .slice(0, 6)
                    .map((it) => (
                      <div key={it.recordId}>
                        • #{it.surahNumber} {it.surahNameUz} ({it.recordId}) — {it.reasonUz}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void loadDiagnosticsAndInventory()}
                className="px-3 py-1.5 rounded-xl bg-[#064E3B]/10 dark:bg-white/10 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>Inventarizatsiya</span>
              </button>
              <button
                type="button"
                onClick={() => void handleRunLegacyMigration()}
                disabled={runningMigration}
                className="px-3 py-1.5 rounded-xl bg-[#C8A85E] text-[#050C09] text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>{runningMigration ? 'Koʻchirilmoqda...' : 'Storageʼga koʻchirish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5 KPI Checklist Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Yuklangan</div>
          <div className="mt-1 text-xl font-mono-numbers font-extrabold text-[#064E3B] dark:text-emerald-400">
            {catalog?.uploadedCount ?? 0} / 114
          </div>
        </div>
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Tekshirilgan (SHA-256)</div>
          <div className="mt-1 text-xl font-mono-numbers font-extrabold text-sky-600 dark:text-sky-400">
            {catalog?.verifiedCount ?? 0}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Sinxronlangan</div>
          <div className="mt-1 text-xl font-mono-numbers font-extrabold text-[#8A6B2D] dark:text-[#E6CE8A]">
            {catalog?.syncedCount ?? 0}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Yetishmayotgan</div>
          <div className="mt-1 text-xl font-mono-numbers font-extrabold text-amber-600 dark:text-amber-300">
            {catalog?.missingCount ?? 114}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#064E3B]/15 dark:border-white/10">
          <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Xatoliklar / Arxiv</div>
          <div className="mt-1 text-xl font-mono-numbers font-extrabold text-rose-600 dark:text-rose-400">
            {catalog?.errorCount ?? 0} <span className="text-xs opacity-70">/ {catalog?.archivedCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Workbench: Left = Profile & Avatar, Right = Upload & Permanent Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile Editor + Avatar Upload */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/15 dark:border-white/10 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
              <span>Odiljon qori Profili va Rasmi</span>
            </h3>
            <label className="px-3 py-1.5 rounded-xl bg-[#064E3B]/12 dark:bg-white/10 hover:bg-[#064E3B]/20 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{uploadingAvatar ? 'Yuklanmoqda...' : 'Rasm yuklash'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  void handleAvatarUpload(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold mb-1 opacity-75">Qori nomi (UZ)</label>
              <input
                type="text"
                value={profileForm.nameUz}
                onChange={(e) => setProfileForm((p) => ({ ...p, nameUz: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1 opacity-75">Qori nomi (AR)</label>
              <input
                type="text"
                value={profileForm.nameAr}
                onChange={(e) => setProfileForm((p) => ({ ...p, nameAr: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-arabic"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1 opacity-75">Mamlakat</label>
              <input
                type="text"
                value={profileForm.countryUz}
                onChange={(e) => setProfileForm((p) => ({ ...p, countryUz: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1 opacity-75">Qiroat uslubi / Rivoyat</label>
              <input
                type="text"
                value={profileForm.styleUz}
                onChange={(e) => setProfileForm((p) => ({ ...p, styleUz: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1 opacity-75">Qori haqida maʼlumot</label>
            <textarea
              rows={3}
              value={profileForm.biographyUz}
              onChange={(e) => setProfileForm((p) => ({ ...p, biographyUz: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={profileForm.isActive}
                onChange={(e) => setProfileForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              <span>Katalogda faol (barcha platformalarda koʻrinadi)</span>
            </label>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saqlanmoqda...' : 'Profilni saqlash'}</span>
            </button>
          </div>
        </form>

        {/* Audio Upload Workbench (Single, Multi, ZIP) + Permanent Backup Controls */}
        <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/15 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
              <span>114 Sura Audio Yuklash (Boʻlaklab / Batch / ZIP)</span>
            </h3>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
              />
              <span>Darhol eʼlon qilish</span>
            </label>
          </div>

          {/* Single / Multi File Resumable Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1 opacity-75">
                Bitta sura tanlash (1–114)
              </label>
              <select
                value={selectedSurahNum}
                onChange={(e) => setSelectedSurahNum(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              >
                {(catalog?.surahs || []).map((s) => (
                  <option key={s.surahNumber} value={s.surahNumber}>
                    {String(s.surahNumber).padStart(3, '0')}. {s.nameUz} ({s.uploadedRecord ? s.uploadedRecord.status : 'Yuklanmagan'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="w-full px-3.5 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>1 ta yoki koʻp MP3/M4A yuklash</span>
                <input
                  type="file"
                  accept=".mp3,.m4a,.ogg,.wav,audio/*"
                  multiple
                  className="hidden"
                  disabled={Boolean(uploadProgress?.active)}
                  onChange={(e) => {
                    void handleFilesBatchUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <p className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
            Koʻp fayl tanlaganda raqamlar avtomatik aniqlanadi (<code className="font-mono-numbers">001.mp3</code>, <code className="font-mono-numbers">036_yasin.mp3</code>). Yuklash uzilib qolsa har bir 512 KB boʻlak 3 martagacha avtomatik qayta uriniladi.
          </p>

          {/* ZIP Batch Import */}
          <div className="p-3.5 rounded-2xl bg-[#064E3B]/8 dark:bg-white/[0.04] border border-[#064E3B]/15 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <FileArchive className="w-4 h-4 text-[#C8A85E]" />
                <span>ZIP Arxiv orqali ommaviy yuklash (114 suragacha)</span>
              </div>
              <div className="text-[11px] opacity-75">
                Ichida <code>001.mp3 … 114.mp3</code> fayllari boʻlgan ZIP arxivni bir bosishda import qiling.
              </div>
            </div>
            <label className="px-3.5 py-2 rounded-xl bg-[#C8A85E] text-[#050C09] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
              <FileArchive className="w-3.5 h-3.5" />
              <span>{importingZip ? 'ZIP import qilinmoqda...' : 'ZIP tanlash'}</span>
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                disabled={importingZip}
                onChange={(e) => {
                  void handleZipBatchImport(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {/* Live Upload Progress Bar */}
          {uploadProgress?.active && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="truncate">{uploadProgress.label}</span>
                <span className="font-mono-numbers font-bold">
                  {uploadProgress.currentFile}/{uploadProgress.totalFiles} · {uploadProgress.percent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Permanent Storage, Integrity & Backup Restore Test */}
          <div className="pt-2 border-t border-[#064E3B]/10 dark:border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#064E3B] dark:text-emerald-300">
                <HardDrive className="w-3.5 h-3.5" />
                Doimiy Xotira ({formatFileSize(catalog?.storageSummary?.totalBytes || 0)} · {catalog?.backedUpCount ?? 0} zaxirada)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                Umrbod himoya: Hard-Delete bloklangan
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleVerifyIntegrity()}
                disabled={runningIntegrity}
                className="px-3 py-2 rounded-xl bg-[#064E3B]/12 dark:bg-white/10 hover:bg-[#064E3B]/20 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{runningIntegrity ? 'Tekshirilmoqda...' : 'SHA-256 Butunlik Tekshiruvi'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleBackupRestoreTest()}
                disabled={runningBackupTest}
                className="px-3 py-2 rounded-xl bg-[#C8A85E]/20 hover:bg-[#C8A85E]/30 text-[#8A6B2D] dark:text-[#E6CE8A] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{runningBackupTest ? 'Sinov oʻtkazilmoqda...' : 'Zaxira + Tiklash Sinovi'}</span>
              </button>
            </div>

            {(integrityReport || backupReport) && (
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] text-[11px] font-mono-numbers space-y-1">
                {integrityReport && (
                  <div>
                    SHA-256 Audit: {integrityReport.verifiedOkCount}/{integrityReport.totalChecked} OK · Zaxira: {integrityReport.backupVerifiedCount} · Xato: {integrityReport.corruptedCount}
                  </div>
                )}
                {backupReport && (
                  <div>
                    Backup & Restore Test: {backupReport.backedUpCount} zaxiralandi · {backupReport.restoreVerifiedCount}/{backupReport.totalActiveSurahs} tiklash sinovi ({backupReport.passed ? 'PASS' : 'FAIL'}) · Auto-healed: {backupReport.autoHealedCount}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Audio Preview Player */}
      {previewAudio && (
        <div className="p-4 rounded-2xl bg-[#06281E] text-[#F7F4EC] border border-[#C8A85E]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-[#C8A85E] shrink-0" />
            <div>
              <div className="text-xs font-bold">
                Admin Tinglab Tekshirish: #{previewAudio.surahNumber} {previewAudio.surahNameUz} (v{previewAudio.version})
              </div>
              <div className="text-[11px] text-[#A3B8B0]">
                Manba: /api/quran-ecosystem/audio-stream/{previewAudio.audioId}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <audio
              key={previewAudio.audioId}
              controls
              autoPlay
              src={`/api/quran-ecosystem/audio-stream/${encodeURIComponent(previewAudio.audioId)}?preview=1`}
              className="h-9 max-w-[280px]"
            />
            <button
              type="button"
              onClick={() => setPreviewAudio(null)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-bold cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Full 114-Surah Checklist Table */}
      <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/15 dark:border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC]">
              114 Sura Nazorat Roʻyxati (Checklist)
            </h3>
            <p className="text-xs text-[#5F776F] dark:text-[#8FA69D]">
              Har bir suraning yuklanganlik holati, versiyasi, SHA-256 nazorati, zaxira nusxasi va boshqaruv amallari.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F776F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sura raqami yoki nomi..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs w-48"
              />
            </div>

            {([
              { id: 'all', label: `Barchasi (114)` },
              { id: 'uploaded', label: `Yuklangan (${catalog?.uploadedCount ?? 0})` },
              { id: 'missing', label: `Yetishmayotgan (${catalog?.missingCount ?? 114})` },
              { id: 'archived', label: `Arxiv (${catalog?.archivedCount ?? 0})` },
              { id: 'errors', label: `Xato (${catalog?.errorCount ?? 0})` },
            ] as const).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                  filterMode === f.id
                    ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D]'
                    : 'bg-[#064E3B]/10 dark:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto rounded-2xl border border-[#064E3B]/10 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#F3EFE6] dark:bg-[#0A1813] border-b border-[#064E3B]/15 dark:border-white/10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Sura</th>
                <th className="py-2.5 px-3">Holat</th>
                <th className="py-2.5 px-3">Fayl / Versiya / SHA-256</th>
                <th className="py-2.5 px-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#064E3B]/10 dark:divide-white/[0.06]">
              {filteredSurahs.map((row) => {
                const rec = row.uploadedRecord;
                const isArchived = Boolean(rec && (rec.isDeleted || rec.status === 'ARCHIVED'));
                const hasError = Boolean(
                  rec && (rec.status === 'REJECTED' || rec.integrityStatus === 'corrupted' || rec.integrityStatus === 'missing_file')
                );
                return (
                  <tr
                    key={row.surahNumber}
                    className="hover:bg-[#064E3B]/[0.04] dark:hover:bg-white/[0.03]"
                  >
                    <td className="py-2.5 px-3 font-mono-numbers font-bold">
                      {String(row.surahNumber).padStart(3, '0')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#091813] dark:text-[#F7F4EC]">{row.nameUz}</div>
                      <div className="text-[11px] opacity-70">
                        <span className="font-arabic text-sm mr-1.5">{row.nameAr}</span>
                        <span>({row.numberOfAyahs} oyat)</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {!rec ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          YUKLANMAGAN
                        </span>
                      ) : isArchived ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                          ARXIVLANGAN
                        </span>
                      ) : hasError ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> XATO
                        </span>
                      ) : rec.status === 'PUBLISHED' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          SINXRONLANGAN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                          {rec.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers text-[11px]">
                      {rec ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>
                              v{rec.version} · {formatFileSize(rec.sizeBytes)}
                              {(rec.durationSec || rec.durationSeconds) ? ` · ${rec.durationSec || rec.durationSeconds}s` : ''} · {rec.mimeType}
                            </span>
                            {rec.storageBackend === 'firebase_storage' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                Firebase Storage
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                Legacy Disk
                              </span>
                            )}
                          </div>
                          <div className="opacity-75 flex flex-wrap items-center gap-2">
                            <span>SHA: {rec.sha256.slice(0, 12)}…</span>
                            {rec.reconciliationStatus === 'pending_firestore_retry' && (
                              <span className="text-amber-600 dark:text-amber-300 font-bold">
                                ⏳ Firestore navbatda
                              </span>
                            )}
                            {rec.versionHistory && rec.versionHistory.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedVersionAudioId((cur) => (cur === rec.id ? null : rec.id))
                                }
                                className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300 font-bold hover:underline cursor-pointer"
                              >
                                <History className="w-3 h-3" />
                                <span>Versiyalar ({rec.versionHistory.length})</span>
                              </button>
                            )}
                          </div>
                          {expandedVersionAudioId === rec.id && rec.versionHistory && rec.versionHistory.length > 1 && (
                            <div className="mt-1.5 p-2 rounded-xl bg-black/5 dark:bg-white/[0.05] space-y-1">
                              {rec.versionHistory.map((vh) => {
                                const isActive = vh.version === rec.version;
                                const restoreKey = `${rec.id}:v${vh.version}`;
                                return (
                                  <div
                                    key={`${rec.id}_vh_${vh.version}_${vh.uploadedAt}`}
                                    className="flex items-center justify-between gap-2 text-[10px]"
                                  >
                                    <span className="truncate">
                                      <strong>v{vh.version}</strong> · {formatFileSize(vh.sizeBytes)} · SHA:{vh.sha256.slice(0, 8)}
                                    </span>
                                    {isActive ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                        Faol
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={restoringVersionKey === restoreKey}
                                        onClick={() => void handleRestoreVersion(rec.id, row.surahNumber, vh.version)}
                                        className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold shrink-0 cursor-pointer disabled:opacity-50"
                                      >
                                        {restoringVersionKey === restoreKey ? 'Tiklanmoqda...' : `Tiklash (v${vh.version})`}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-50">Audio fayl hali yuklanmagan</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {rec && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewAudio({
                                surahNumber: row.surahNumber,
                                surahNameUz: row.nameUz,
                                audioId: rec.id,
                                version: rec.version,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#064E3B]/12 dark:bg-white/10 hover:bg-[#064E3B]/20 font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Tinglab tekshirish"
                          >
                            <Play className="w-3 h-3" />
                            <span>Tinglash</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setRowUploadTargetSurah(row.surahNumber);
                            rowUploadInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{rec ? 'Yangilash' : 'Yuklash'}</span>
                        </button>

                        {rec && !isArchived && rec.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(rec.id, 'PUBLISHED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            Eʼlon qilish
                          </button>
                        )}

                        {rec && !isArchived && (
                          <button
                            type="button"
                            onClick={() => void handleArchiveAudio(rec.id, row.surahNumber)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Xavfsiz arxivlash (fayl oʻchirilmaydi)"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Arxiv</span>
                          </button>
                        )}

                        {rec && isArchived && (
                          <button
                            type="button"
                            onClick={() => void handleRestoreAudio(rec.id, row.surahNumber)}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Tiklash</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
