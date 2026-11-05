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
  };
}

export function saveStoredSupabaseConfig(config: SupabaseSettings): void {
  const normalized: SupabaseSettings = {
    ...config,
    adminEmail: AUTHORIZED_SUPABASE_ADMIN_EMAIL,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // ignore
  }

  const token = getActiveAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Also sync to server backup configuration
  fetch('/api/backup/supabase', {
    method: 'POST',
    headers,
    body: JSON.stringify(normalized),
  }).catch(() => {});
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

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url || !key) {
      return { success: false, message: 'Supabase URL va Anon Key toʻliq kiritilishi shart (Ixtiyoriy xizmat).' };
    }
    const testClient = createClient(url, key);
    const { error } = await testClient.from('asaka_ziyo_test').select('*').limit(1);
    if (error && error.code !== 'PGRST204' && error.code !== '42P01' && error.message.includes('API key')) {
      return { success: false, message: `Ulanish xatosi: ${error.message}` };
    }
    return { success: true, message: '✅ Supabase loyihasiga muvaffaqiyatli ulandi!' };
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
  counts?: {
    prayerTimes: number;
    articles: number;
    mediaPosts: number;
    hadiths: number;
    dhikrs: number;
    announcements: number;
    news: number;
    inquiries: number;
  };
}

export async function fetchBackupList(): Promise<{
  success: boolean;
  supabaseConfigured: boolean;
  lastSync: string | null;
  backups: BackupSummaryItem[];
}> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/list', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        success: true,
        supabaseConfigured: Boolean(data.supabaseConfigured),
        lastSync: data.lastSync || null,
        backups: Array.isArray(data.backups) ? data.backups : [],
      };
    }
  } catch {
    // ignore
  }
  return { success: false, supabaseConfigured: false, lastSync: null, backups: [] };
}

export async function createBackupSnapshot(
  label: string,
  snapshot: Record<string, any>
): Promise<{ success: boolean; backup?: BackupSummaryItem; error?: string }> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ label, snapshot }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      return { success: true, backup: data.backup };
    }
    return { success: false, error: data.error || 'Zaxira nusxa yaratishda xatolik' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatosi' };
  }
}

export async function restoreBackupSnapshot(
  backupId: string
): Promise<{ success: boolean; restoredBackupId?: string; preRestoreBackupId?: string; data?: any; error?: string }> {
  try {
    const token = getActiveAdminToken();
    const resp = await fetch('/api/backup/restore', {
      method: 'POST',
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
        data: data.data,
      };
    }
    return { success: false, error: data.error || 'Zaxiradan tiklashda xatolik' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatosi' };
  }
}

