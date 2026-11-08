import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getActiveAdminToken } from './firebaseClient';

/**
 * ASAKA ZIYO — Optional Cloud Database & Supabase Adapter
 *
 * SECURITY & STANDALONE ARCHITECTURE GUARANTEES:
 * 1. Zero Mandatory Env Vars: Neither VITE_SUPABASE_URL nor VITE_SUPABASE_ANON_KEY are required to run the app.
 * 2. Standalone Mode: If credentials are not configured or isEnabled is false, the application safely operates
 *    using Firebase Firestore (Primary Database) without any runtime error or degradation.
 * 3. SUPABASE_SERVICE_ROLE_KEY is strictly FORBIDDEN in frontend code. Only the public anonKey is ever accepted.
 * 4. Authorized Administrator Email: asakaziyo0@gmail.com (username: menageradmin)
 */

export const AUTHORIZED_SUPABASE_ADMIN_EMAIL = 'asakaziyo0@gmail.com';

export interface SupabaseSettings {
  url: string;
  anonKey: string;
  adminEmail: string;
  isEnabled: boolean;
  lastSync?: string | null;
  lastError?: string | null;
  verifiedReadBack?: boolean;
}

const SUPABASE_STORAGE_KEY = 'asaka_ziyo_supabase_config';

export function getStoredSupabaseConfig(): SupabaseSettings {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          url: parsed.url || '',
          anonKey: parsed.anonKey || '',
          adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL,
          isEnabled: Boolean(parsed.isEnabled),
          lastSync: parsed.lastSync || null,
          lastError: parsed.lastError || null,
          verifiedReadBack: Boolean(parsed.verifiedReadBack),
        };
      }
    }
  } catch {
    // fallback
  }
  return {
    url: '',
    anonKey: '',
    adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL,
    isEnabled: false,
    lastSync: null,
    lastError: null,
    verifiedReadBack: false,
  };
}

export async function saveStoredSupabaseConfig(config: SupabaseSettings): Promise<{
  success: boolean;
  supabaseSynced?: boolean;
  verifiedReadBack?: boolean;
  syncedCount?: number;
  lastSync?: string | null;
  lastError?: string | null;
  error?: string;
}> {
  const normalized: SupabaseSettings = {
    ...config,
    adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL,
  };

  // Security guard: never allow service_role key in frontend config
  if (normalized.anonKey && normalized.anonKey.toLowerCase().includes('service_role')) {
    return {
      success: false,
      supabaseSynced: false,
      error: 'Xavfsizlik qoidasi: SUPABASE_SERVICE_ROLE_KEY brauzerda ishlatilishi qatʼiyan taqiqlanadi.',
    };
  }

  try {
    const token = getActiveAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch('/api/backup/supabase', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(normalized),
    });

    const data = await resp.json().catch(() => ({}));
    const updatedConfig: SupabaseSettings = {
      ...normalized,
      lastSync: data.supabaseSynced ? data.lastSync : normalized.lastSync || null,
      lastError: data.lastError || (!resp.ok ? data.error : null) || null,
      verifiedReadBack: Boolean(data.verifiedReadBack),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(updatedConfig));
      }
    } catch {
      // ignore
    }

    cachedClient = null;

    if (!resp.ok || !data.success) {
      return {
        success: false,
        supabaseSynced: Boolean(data.supabaseSynced),
        verifiedReadBack: Boolean(data.verifiedReadBack),
        syncedCount: data.syncedCount || 0,
        lastSync: updatedConfig.lastSync,
        lastError: data.error || data.lastError || 'Supabase zaxiralashda xatolik yuz berdi',
        error: data.error || data.lastError || 'Supabase zaxiralashda xatolik yuz berdi',
      };
    }

    return {
      success: true,
      supabaseSynced: Boolean(data.supabaseSynced),
      verifiedReadBack: Boolean(data.verifiedReadBack),
      syncedCount: data.syncedCount || 0,
      lastSync: updatedConfig.lastSync,
      lastError: data.lastError || null,
    };
  } catch (err: any) {
    return {
      success: false,
      supabaseSynced: false,
      error: err?.message || 'Server bilan bogʻlanishda xatolik',
    };
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.isEnabled || !config.url || !config.anonKey) {
    return null;
  }
  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, config.anonKey);
    } catch (e) {
      console.warn('Failed to initialize optional Supabase client:', e);
      return null;
    }
  }
  return cachedClient;
}

export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; message: string; verifiedReadBack?: boolean; syncedCount?: number }> {
  try {
    if (!url || !key) {
      return { success: false, message: 'Supabase URL va Anon Key toʻliq kiritilishi shart (Ixtiyoriy xizmat).' };
    }
    if (key.toLowerCase().includes('service_role')) {
      return {
        success: false,
        message: 'Xavfsizlik qoidasi: SUPABASE_SERVICE_ROLE_KEY brauzerda kiritilishi mumkin emas. Server .env faylida saqlang.',
      };
    }

    // Perform genuine server-side backup write & read-back verification
    const syncRes = await saveStoredSupabaseConfig({
      url: url.trim(),
      anonKey: key.trim(),
      adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL,
      isEnabled: true,
    });

    if (syncRes.success && syncRes.supabaseSynced && syncRes.verifiedReadBack) {
      return {
        success: true,
        verifiedReadBack: true,
        syncedCount: syncRes.syncedCount,
        message: `✅ Supabase zaxira bazasiga haqiqiy Firestore maʼlumotlari (${syncRes.syncedCount || 1} jadval) yozildi va qayta oʻqib tasdiqlandi!`,
      };
    }

    return {
      success: false,
      verifiedReadBack: false,
      message: `⚠️ Supabase ulanish yoki jadvalga yozish tasdiqlanmadi: ${syncRes.error || syncRes.lastError || 'Maʼlumot uzatilmadi'}`,
    };
  } catch (err: any) {
    return { success: false, message: `Tarmoq yoki konfiguratsiya xatosi: ${err.message || 'Nomaʼlum xato'}` };
  }
}

export interface BackupSummaryItem {
  id: string;
  label: string;
  createdAt: string;
  createdBy: string;
  destination: string;
  status: string;
  supabaseSynced?: boolean;
  supabaseError?: string | null;
  counts?: {
    prayerTimes: number;
    articles: number;
    mediaPosts: number;
    hadiths: number;
    dhikrs: number;
    announcements: number;
    news: number;
    inquiries: number;
    mosqueEvents?: number;
    quizQuestions?: number;
    dailyQuizzes?: number;
  };
}

export async function fetchBackupList(): Promise<{
  success: boolean;
  supabaseConfigured: boolean;
  lastSync: string | null;
  lastError?: string | null;
  verifiedReadBack?: boolean;
  backups: BackupSummaryItem[];
}> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/list', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        success: true,
        supabaseConfigured: Boolean(data.supabaseConfigured),
        lastSync: data.lastSync || null,
        lastError: data.lastError || null,
        verifiedReadBack: Boolean(data.verifiedReadBack),
        backups: Array.isArray(data.backups) ? data.backups : [],
      };
    }
  } catch {
    // ignore
  }
  return { success: false, supabaseConfigured: false, lastSync: null, lastError: null, verifiedReadBack: false, backups: [] };
}

export async function createBackupSnapshot(
  label: string,
  snapshot: Record<string, any>
): Promise<{
  success: boolean;
  backup?: BackupSummaryItem;
  supabaseSynced?: boolean;
  supabaseError?: string | null;
  error?: string;
}> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/create', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ label, snapshot }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      return {
        success: true,
        backup: data.backup,
        supabaseSynced: Boolean(data.supabaseSynced),
        supabaseError: data.supabaseError || null,
      };
    }
    return { success: false, error: data.error || 'Zaxira nusxa yaratishda xatolik' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatosi' };
  }
}

export async function restoreBackupSnapshot(
  backupId: string
): Promise<{
  success: boolean;
  restoredBackupId?: string;
  preRestoreBackupId?: string;
  firestoreRestoredCount?: number;
  data?: any;
  error?: string;
}> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/restore', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ backupId }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      return {
        success: true,
        restoredBackupId: data.restoredBackupId,
        preRestoreBackupId: data.preRestoreBackupId,
        firestoreRestoredCount: data.firestoreRestoredCount,
        data: data.data,
      };
    }
    return { success: false, error: data.error || 'Zaxiradan tiklashda xatolik' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatosi' };
  }
}

