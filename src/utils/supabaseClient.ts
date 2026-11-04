import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseSettings {
  url: string;
  anonKey: string;
  isEnabled: boolean;
  lastSync?: string | null;
}

const SUPABASE_STORAGE_KEY = 'asaka_ziyo_supabase_config';

export function getStoredSupabaseConfig(): SupabaseSettings {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return {
    url: '',
    anonKey: '',
    isEnabled: false,
    lastSync: null,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseSettings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
    }
  } catch {
    // ignore
  }

  // Also sync to server database
  fetch('/api/database/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
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
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return cachedClient;
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url || !key) {
      return { success: false, message: 'Supabase URL va Anon Key toʻliq kiritilishi shart.' };
    }
    const testClient = createClient(url, key);
    const { error } = await testClient.from('asaka_ziyo_test').select('*').limit(1);
    // Even if table doesn't exist yet, if auth/network succeeds, error code will be PGRST204 or 42P01 (relation does not exist)
    if (error && error.code !== 'PGRST204' && error.code !== '42P01' && error.message.includes('API key')) {
      return { success: false, message: `Ulanish xatosi: ${error.message}` };
    }
    return { success: true, message: '✅ Supabase loyihasiga muvaffaqiyatli ulandi!' };
  } catch (err: any) {
    return { success: false, message: `Tarmoq yoki konfiguratsiya xatosi: ${err.message || 'Nomaʼlum xato'}` };
  }
}
