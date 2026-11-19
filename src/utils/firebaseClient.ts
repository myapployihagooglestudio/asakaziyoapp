import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInWithCustomToken,
  signOut,
  User,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  setLogLevel,
  enableNetwork,
  disableNetwork,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AdminUser, UserRole } from '../types';

const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';

// Suppress verbose WebChannel idle-stream disconnect diagnostics in client logs
try {
  setLogLevel('error');
} catch {
  // Ignore if unsupported in current runtime
}

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with forced XHR long-polling in browser runtimes to avoid
// WebChannel/Fetch streaming stalls behind proxies, iframes, and cellular networks.
let firestoreInstance: Firestore;
try {
  firestoreInstance = isBrowserRuntime
    ? initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          experimentalLongPollingOptions: { timeoutSeconds: 8 },
        },
        firebaseConfig.firestoreDatabaseId
      )
    : getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch {
  // If already initialized
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = firestoreInstance;

let authInstance: Auth;
try {
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    authInstance = initializeAuth(app, { persistence: inMemoryPersistence });
  } else {
    authInstance = getAuth(app);
  }
} catch {
  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = { currentUser: null } as unknown as Auth;
  }
}
export const auth: Auth = authInstance;

// Standard Canonical Email Resolver for the Single Authorized Administrator
export const AUTHORIZED_ADMIN_USERNAME = 'menageradmin';
export const AUTHORIZED_ADMIN_EMAIL = 'asakaziyo0@gmail.com';
export const AUTHORIZED_ADMIN_UID = 'admin-asakaziyo0';
export const NAMED_FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
const ADMIN_SESSION_STORAGE_KEY = 'asaka_ziyo_admin_session_v1';

let activeAdminSession: AdminUser | null = null;
let activeAdminServerToken: string | null = null;

function loadAdminSessionFromStorage(): AdminUser | null {
  try {
    if (typeof window !== 'undefined') {
      const raw =
        (window.sessionStorage && window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)) ||
        (window.localStorage && window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.admin &&
          parsed.admin.username === AUTHORIZED_ADMIN_USERNAME &&
          parsed.admin.isActive &&
          typeof parsed.token === 'string' &&
          parsed.token.startsWith('asaka_admin_')
        ) {
          activeAdminSession = parsed.admin;
          activeAdminServerToken = parsed.token;
          return parsed.admin;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

loadAdminSessionFromStorage();

export function saveAdminSessionToStorage(adminProfile: AdminUser, serverToken: string): void {
  activeAdminSession = adminProfile;
  activeAdminServerToken = serverToken;
  try {
    if (typeof window !== 'undefined') {
      const serialized = JSON.stringify({ admin: adminProfile, token: serverToken });
      if (window.sessionStorage) window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, serialized);
      if (window.localStorage) window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, serialized);
    }
  } catch {
    // ignore
  }
}

function clearLocalAdminSessionStorage(): void {
  activeAdminSession = null;
  activeAdminServerToken = null;
  try {
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      if (window.localStorage) window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getActiveAdminSession(): AdminUser | null {
  if (
    activeAdminSession &&
    activeAdminSession.username === AUTHORIZED_ADMIN_USERNAME &&
    activeAdminSession.isActive &&
    activeAdminServerToken
  ) {
    return activeAdminSession;
  }
  return loadAdminSessionFromStorage();
}

export function getActiveAdminToken(): string | null {
  if (!activeAdminServerToken) {
    loadAdminSessionFromStorage();
  }
  return activeAdminServerToken;
}

export function isAdminAuthenticated(): boolean {
  const session = getActiveAdminSession();
  const token = getActiveAdminToken();
  return Boolean(
    session &&
      session.username === AUTHORIZED_ADMIN_USERNAME &&
      session.isActive &&
      token &&
      token.startsWith('asaka_admin_')
  );
}

/**
 * Verifies the active administrator session with the backend server (/api/admin/session)
 * using HttpOnly session cookies and/or Bearer token.
 */
export async function verifyAdminSessionWithServer(): Promise<AdminUser | null> {
  try {
    const token = getActiveAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const resp = await fetch('/api/admin/session', {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!resp.ok) {
      clearLocalAdminSessionStorage();
      return null;
    }
    const data = await resp.json();
    if (!data?.authenticated || !data?.admin || data.admin.username !== AUTHORIZED_ADMIN_USERNAME) {
      clearLocalAdminSessionStorage();
      return null;
    }
    const verifiedAdmin: AdminUser = {
      uid: data.admin.uid || AUTHORIZED_ADMIN_UID,
      email: data.admin.email || AUTHORIZED_ADMIN_EMAIL,
      username: AUTHORIZED_ADMIN_USERNAME,
      displayName: data.admin.displayName || 'Asaka Ziyo Bosh Maʼmuri',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: activeAdminSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    activeAdminSession = verifiedAdmin;
    return verifiedAdmin;
  } catch {
    return getActiveAdminSession();
  }
}

export function resolveLoginToEmail(loginOrEmail: string): string {
  const trimmed = loginOrEmail.trim().toLowerCase();
  if (trimmed === AUTHORIZED_ADMIN_USERNAME || trimmed === AUTHORIZED_ADMIN_EMAIL) {
    return AUTHORIZED_ADMIN_EMAIL;
  }
  return '';
}

// Error Handling Standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || activeAdminSession?.uid || null,
      email: auth.currentUser?.email || activeAdminSession?.email || null,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// FIRESTORE REACHABILITY GUARD (PREVENTS 10s OFFLINE STREAM STALLS)
// ---------------------------------------------------------------------------
let firestoreNetworkReady = !isBrowserRuntime;
let firestoreProbeCompleted = !isBrowserRuntime;
let firestoreReachabilityPromise: Promise<boolean> | null = null;
let networkDisabledExplicitly = false;
const networkReadyCallbacks = new Set<() => void>();

export function isFirestoreNetworkReady(): boolean {
  return firestoreNetworkReady;
}

export function onFirestoreNetworkReady(cb: () => void): () => void {
  if (firestoreNetworkReady) {
    cb();
    return () => {};
  }
  networkReadyCallbacks.add(cb);
  return () => {
    networkReadyCallbacks.delete(cb);
  };
}

function flushNetworkReadyCallbacks(): void {
  const callbacks = Array.from(networkReadyCallbacks);
  networkReadyCallbacks.clear();
  callbacks.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore listener callback error
    }
  });
}

async function safelyDisableFirestoreNetwork(): Promise<void> {
  firestoreNetworkReady = false;
  firestoreProbeCompleted = true;
  if (isBrowserRuntime && !networkDisabledExplicitly) {
    networkDisabledExplicitly = true;
    try {
      await disableNetwork(db);
    } catch {
      // ignore if already disabled
    }
  }
}

async function safelyEnableFirestoreNetwork(): Promise<void> {
  if (isBrowserRuntime && networkDisabledExplicitly) {
    networkDisabledExplicitly = false;
    try {
      await enableNetwork(db);
    } catch {
      // ignore
    }
  }
}

async function probeFirestoreRestEndpoint(timeoutMs = 3200): Promise<boolean> {
  if (!isBrowserRuntime) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (typeof fetch !== 'function') return true;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(
      firebaseConfig.firestoreDatabaseId
    )}/documents/schedules/asaka-main?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const resp = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });
    return resp.status > 0;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Verifies live Cloud Firestore connectivity within <5s before opening Watch streams,
 * cleanly calling disableNetwork(db) on unreachable/offline networks before Firestore's
 * 10-second OnlineStateTracker timeout logs backend unreachable errors.
 */
export async function ensureFirestoreConnectivityChecked(options?: {
  forceProbe?: boolean;
}): Promise<boolean> {
  if (!isBrowserRuntime) return true;
  const forceProbe = Boolean(options?.forceProbe);
  if (!forceProbe && firestoreProbeCompleted) {
    return firestoreNetworkReady;
  }
  if (!forceProbe && firestoreReachabilityPromise) {
    return firestoreReachabilityPromise;
  }

  const runProbe = async (): Promise<boolean> => {
    const restReachable = await probeFirestoreRestEndpoint(3200);
    if (!restReachable) {
      await safelyDisableFirestoreNetwork();
      return false;
    }

    await safelyEnableFirestoreNetwork();

    let sdkTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        sdkTimer = setTimeout(() => reject(new Error('Firestore SDK timeout (4.5s)')), 4500);
      });
      await Promise.race([
        getDocFromServer(doc(db, '_diagnostics', 'connection')),
        timeoutPromise,
      ]);
      firestoreNetworkReady = true;
      firestoreProbeCompleted = true;
      flushNetworkReadyCallbacks();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes('permission-denied') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('not-found')
      ) {
        firestoreNetworkReady = true;
        firestoreProbeCompleted = true;
        flushNetworkReadyCallbacks();
        return true;
      }
      await safelyDisableFirestoreNetwork();
      return false;
    } finally {
      if (sdkTimer) clearTimeout(sdkTimer);
    }
  };

  const promise = runProbe().finally(() => {
    if (firestoreReachabilityPromise === promise) {
      firestoreReachabilityPromise = null;
    }
  });
  firestoreReachabilityPromise = promise;
  return promise;
}

// Startup connection verification against live Cloud Firestore server
export async function testFirestoreConnection(): Promise<boolean> {
  if (!isBrowserRuntime) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore connection timeout (4s)')), 4000)
      );
      await Promise.race([getDocFromServer(doc(db, '_diagnostics', 'connection')), timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }
  return ensureFirestoreConnectivityChecked({ forceProbe: true });
}

// Administrator & Firebase Sign Out
export async function signOutFirebase(): Promise<void> {
  const token = activeAdminServerToken;
  clearLocalAdminSessionStorage();
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // ignore network failure during logout
  }
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Firebase sign out error:', err);
  }
}

// ---------------------------------------------------------------------------
// ENTERPRISE SINGLE ADMINISTRATOR AUTHENTICATION & UID VERIFICATION ENGINE
// ---------------------------------------------------------------------------

export async function fetchAdminProfile(uid: string): Promise<AdminUser | null> {
  try {
    const snapshot = await getDoc(doc(db, 'admins', uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        uid,
        email: AUTHORIZED_ADMIN_EMAIL,
        username: AUTHORIZED_ADMIN_USERNAME,
        displayName: data.displayName || 'Bosh Administrator (Asaka Ziyo)',
        role: normalizeRole(data.role),
        isActive: data.isActive !== false,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        lastLoginAt: data.lastLoginAt,
      };
    }
    return null;
  } catch (err) {
    console.warn('fetchAdminProfile error:', err);
    return null;
  }
}

function normalizeRole(role: string): UserRole {
  if (role === 'superadmin' || role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (role === 'CONTENT_ADMIN') return 'CONTENT_ADMIN';
  if (role === 'PRAYER_ADMIN') return 'PRAYER_ADMIN';
  if (role === 'EDITOR') return 'EDITOR';
  if (role === 'NOTIFICATION_ADMIN') return 'NOTIFICATION_ADMIN';
  if (role === 'VIEWER') return 'VIEWER';
  if (role === 'admin') return 'SUPER_ADMIN';
  return 'SUPER_ADMIN';
}

/**
 * Authenticates the single authorized administrator exclusively via username ("menageradmin")
 * and password against the secure backend endpoint POST /api/admin/auth.
 * Ordinary users, email-based logins, and Google Sign-In are strictly rejected.
 */
export async function signInAdmin(
  usernameInput: string,
  pass: string
): Promise<{ user: User | null; admin: AdminUser }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  if (!cleanUsername || !pass) {
    throw new Error('Administrator logini va paroli kiritilishi shart.');
  }

  if (cleanUsername !== AUTHORIZED_ADMIN_USERNAME) {
    throw new Error('Kirish rad etildi: Administrator foydalanuvchi nomi (login) notoʻgʻri.');
  }

  const resp = await fetch('/api/admin/auth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: cleanUsername,
      password: pass,
    }),
  });

  if (!resp.ok) {
    const errJson = await resp.json().catch(() => ({}));
    throw new Error(errJson.error || 'Administrator foydalanuvchi nomi (login) yoki parol notoʻgʻri kiritildi.');
  }

  const json = await resp.json();
  if (!json.success || !json.token) {
    throw new Error('Administrator sessiya tokenini olishda xatolik yuz berdi.');
  }

  const serverToken: string = json.token;
  const serverAdminData: any = json.admin || {};

  let signedInFirebaseUser: User | null = null;
  if (json.firebaseCustomToken && typeof json.firebaseCustomToken === 'string') {
    try {
      const cred = await signInWithCustomToken(auth, json.firebaseCustomToken);
      signedInFirebaseUser = cred.user;
    } catch {
      signedInFirebaseUser = null;
    }
  }

  const nowIso = new Date().toISOString();
  const adminProfile: AdminUser = {
    uid: serverAdminData.uid || AUTHORIZED_ADMIN_UID,
    email: AUTHORIZED_ADMIN_EMAIL,
    username: AUTHORIZED_ADMIN_USERNAME,
    displayName: serverAdminData.displayName || 'Asaka Ziyo Bosh Maʼmuri',
    role: 'SUPER_ADMIN',
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoginAt: serverAdminData.lastLoginAt || nowIso,
  };

  activeAdminSession = adminProfile;
  activeAdminServerToken = serverToken;

  try {
    if (typeof window !== 'undefined') {
      const serialized = JSON.stringify({ admin: adminProfile, token: serverToken });
      if (window.sessionStorage) window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, serialized);
      if (window.localStorage) window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, serialized);
    }
  } catch {
    // ignore storage errors
  }

  return { user: signedInFirebaseUser, admin: adminProfile };
}

/**
 * Allows the currently logged-in administrator to change their password securely.
 */
export async function changeCurrentAdminPassword(newPass: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdminAuthenticated()) {
    return { success: false, error: 'Tizimga kirilmagan' };
  }
  if (!newPass || newPass.length < 8) {
    return { success: false, error: 'Parol kamida 8 ta belgidan iborat bo‘lishi lozim' };
  }
  try {
    const token = getActiveAdminToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const resp = await fetch('/api/admin/change-password', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ newPassword: newPass }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Parolni yangilashda xatolik' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Parolni yangilashda xatolik' };
  }
}

// ---------------------------------------------------------------------------
// FIRESTORE GENERAL HELPERS (SERVER-AUTHENTICATED ADMIN WRITES + PUBLIC READS)
// ---------------------------------------------------------------------------

export const ADMIN_WRITE_COLLECTIONS = new Set([
  'schedules',
  'articles',
  'mediaPosts',
  'hadiths',
  'dhikrs',
  'drafts',
  'notifications',
  'announcements',
  'news',
  'dailyContent',
  'inquiries',
  'auditLogs',
  'quizQuestions',
  'dailyQuizzes',
  'messages',
  'mosqueEvents',
  'digitalBooks',
  'imamQuestions',
  'quranReciters',
  'quranAudioOverrides',
  'adhanLibrary',
  'ownAudioLibrary',
  'displayMonitors',
  'displayConnections',
  'displaySchedules',
  'displayAnnouncements',
  'admins',
  '_diagnostics',
  '_metadata',
]);

function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    cleaned[k] = v === undefined ? null : sanitizeForFirestore(v);
  }
  return cleaned;
}

function getApiBaseUrl(): string {
  const configured = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  if (
    typeof window !== 'undefined' &&
    window.location?.origin?.startsWith('http') &&
    window.location.hostname !== 'appassets.androidplatform.net'
  ) {
    return window.location.origin;
  }
  if (typeof process !== 'undefined' && Boolean((process as any)?.versions?.node)) {
    return (process.env?.API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  }
  return '';
}

export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const path = `${collectionName}/${docId}`;
  const isAdminCol = ADMIN_WRITE_COLLECTIONS.has(collectionName);
  const adminLoggedIn = isAdminAuthenticated();

  // Public inquiry / Imam question creation exception: allowed for unauthenticated users only when status is pending/new/submitted
  const isPublicSubmission =
    !adminLoggedIn &&
    (collectionName === 'inquiries' || collectionName === 'imamQuestions') &&
    data &&
    (data.status === 'pending' || data.status === 'new' || data.status === 'submitted') &&
    !data.adminReply &&
    !data.answerText &&
    !data.answerUz;

  // Enforce strict admin authentication check for protected collections
  if (isAdminCol && !adminLoggedIn && !isPublicSubmission) {
    const permError = '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).';
    console.warn(`Firestore sync rejected for ${path}: ${permError}`);
    return { success: false, error: permError };
  }

  const nowIso = new Date().toISOString();
  const cleanPayload = sanitizeForFirestore({
    ...data,
    id: data?.id || docId,
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    schemaVersion: 1,
    createdAt: data?.createdAt || nowIso,
    updatedAt: nowIso,
    createdBy: data?.createdBy || (adminLoggedIn ? AUTHORIZED_ADMIN_USERNAME : 'public_user'),
    updatedBy: adminLoggedIn ? AUTHORIZED_ADMIN_USERNAME : 'public_user',
    syncedAt: nowIso,
  });

  // Route privileged administrator writes through the authenticated backend gateway
  if (adminLoggedIn && isAdminCol) {
    try {
      const token = getActiveAdminToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const resp = await fetch(`${getApiBaseUrl()}/api/admin/firestore/write`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          collectionName,
          docId,
          payload: cleanPayload,
        }),
      });
      const resJson = await resp.json().catch(() => ({}));
      if (!resp.ok || !resJson.success) {
        const errMsg = resJson.error || `HTTP ${resp.status}: Firestore server write failed for ${path}`;
        console.error(`[Firestore Admin Write Error] ${path}:`, errMsg);
        return { success: false, error: errMsg };
      }
      return { success: true };
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Firestore Admin Write Network Error] ${path}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // If it's an admin collection and we aren't a permitted public submission, never attempt direct client write
  if (isAdminCol && !isPublicSubmission) {
    const permError = '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).';
    return { success: false, error: permError };
  }

  // Ordinary public & personal user interactions (tasbihSessions, prayerJournal, khatmPlans, comments, ratings, userProgress, contentLikes, contentViews, pending inquiries)
  try {
    await setDoc(doc(db, collectionName, docId), cleanPayload, { merge: true });
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Firestore sync error for ${path}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<{ success: boolean; error?: string }> {
  const path = `${collectionName}/${docId}`;
  const isAdminCol = ADMIN_WRITE_COLLECTIONS.has(collectionName);

  if (isAdminCol && !isAdminAuthenticated()) {
    const permError = '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).';
    return { success: false, error: permError };
  }

  if (isAdminAuthenticated() && isAdminCol) {
    try {
      const token = getActiveAdminToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const resp = await fetch(`${getApiBaseUrl()}/api/admin/firestore/delete`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          collectionName,
          docId,
        }),
      });
      const resJson = await resp.json().catch(() => ({}));
      if (!resp.ok || !resJson.success) {
        const errMsg = resJson.error || `HTTP ${resp.status}: Firestore server delete failed for ${path}`;
        console.error(`[Firestore Admin Delete Error] ${path}:`, errMsg);
        return { success: false, error: errMsg };
      }
      return { success: true };
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Firestore Admin Delete Network Error] ${path}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  if (isAdminCol) {
    return {
      success: false,
      error: '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).',
    };
  }

  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Firestore delete error for ${path}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Execute a safe atomic Firestore transaction
 */
export async function runFirestoreTransaction<T>(
  updateFunction: (transaction: any) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await runTransaction(db, updateFunction);
    return { success: true, data: result };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Real-time collection listener using onSnapshot (deferred until connectivity probe passes in browser)
 */
export function listenToFirestoreCollection<T = any>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  let disposed = false;
  let activeUnsub: (() => void) | null = null;
  let cancelReadyWait: (() => void) | null = null;

  const attach = () => {
    if (disposed) return;
    try {
      activeUnsub = onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((d) => {
            items.push({ id: d.id, ...d.data() } as unknown as T);
          });
          onData(items);
        },
        (error) => {
          const msg = error.message || '';
          if (
            msg.includes('CANCELLED') ||
            msg.includes('idle stream') ||
            msg.includes('Timed out') ||
            msg.includes('Code: 1') ||
            msg.includes('Could not reach Cloud Firestore backend') ||
            msg.includes('offline mode') ||
            msg.includes('client is offline')
          ) {
            return;
          }
          console.warn(`[Firestore Real-time Listener Error] /${collectionName}:`, error);
          if (onError) onError(error);
        }
      );
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }
  };

  if (!isBrowserRuntime || firestoreNetworkReady) {
    attach();
  } else {
    cancelReadyWait = onFirestoreNetworkReady(attach);
    ensureFirestoreConnectivityChecked().catch(() => {});
  }

  return () => {
    disposed = true;
    if (cancelReadyWait) cancelReadyWait();
    if (activeUnsub) activeUnsub();
  };
}

/**
 * Real-time single document listener using onSnapshot (deferred until connectivity probe passes in browser)
 */
export function listenToFirestoreDoc<T = any>(
  collectionName: string,
  docId: string,
  onData: (item: T | null) => void,
  onError?: (err: Error) => void
): () => void {
  let disposed = false;
  let activeUnsub: (() => void) | null = null;
  let cancelReadyWait: (() => void) | null = null;

  const attach = () => {
    if (disposed) return;
    try {
      activeUnsub = onSnapshot(
        doc(db, collectionName, docId),
        (snapshot) => {
          if (snapshot.exists()) {
            onData({ id: snapshot.id, ...snapshot.data() } as unknown as T);
          } else {
            onData(null);
          }
        },
        (error) => {
          const msg = error.message || '';
          if (
            msg.includes('CANCELLED') ||
            msg.includes('idle stream') ||
            msg.includes('Timed out') ||
            msg.includes('Code: 1') ||
            msg.includes('Could not reach Cloud Firestore backend') ||
            msg.includes('offline mode') ||
            msg.includes('client is offline')
          ) {
            return;
          }
          console.warn(`[Firestore Real-time Doc Listener Error] /${collectionName}/${docId}:`, error);
          if (onError) onError(error);
        }
      );
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }
  };

  if (!isBrowserRuntime || firestoreNetworkReady) {
    attach();
  } else {
    cancelReadyWait = onFirestoreNetworkReady(attach);
    ensureFirestoreConnectivityChecked().catch(() => {});
  }

  return () => {
    disposed = true;
    if (cancelReadyWait) cancelReadyWait();
    if (activeUnsub) activeUnsub();
  };
}

export interface FetchDocResult<T> {
  success: boolean;
  data: T | null;
  exists: boolean;
  error?: string;
}

export async function fetchDocFromFirestore<T = any>(
  collectionName: string,
  docId: string
): Promise<FetchDocResult<T>> {
  if (isBrowserRuntime) {
    const online = await ensureFirestoreConnectivityChecked();
    if (!online) {
      return { success: false, data: null, exists: false, error: 'Firestore network unavailable' };
    }
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Firestore doc timeout (4s)')), 4000);
    });
    const snapshot = await Promise.race([getDoc(doc(db, collectionName, docId)), timeoutPromise]);
    if (snapshot.exists()) {
      return { success: true, data: snapshot.data() as T, exists: true };
    }
    return { success: true, data: null, exists: false };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout')) {
      safelyDisableFirestoreNetwork().catch(() => {});
    }
    return { success: false, data: null, exists: false, error: msg };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface FetchCollectionResult<T> {
  success: boolean;
  data: T[];
  error?: string;
}

export async function fetchCollectionFromFirestore<T = any>(
  collectionName: string
): Promise<FetchCollectionResult<T>> {
  if (isBrowserRuntime) {
    const online = await ensureFirestoreConnectivityChecked();
    if (!online) {
      return { success: false, data: [], error: 'Firestore network unavailable' };
    }
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Firestore connection timeout (3.5s)')), 3500);
    });
    const docsPromise = getDocs(collection(db, collectionName));
    const snapshot = await Promise.race([docsPromise, timeoutPromise]);
    const items: T[] = [];
    (snapshot as any).forEach((d: any) => {
      items.push({ id: d.id, ...d.data() } as unknown as T);
    });
    return { success: true, data: items };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout')) {
      safelyDisableFirestoreNetwork().catch(() => {});
    }
    return { success: false, data: [], error: msg };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkAdminRole(
  uid: string
): Promise<{ isAdmin: boolean; role?: UserRole; admin?: AdminUser }> {
  try {
    const profile = await fetchAdminProfile(uid);
    if (profile && profile.isActive) {
      return { isAdmin: true, role: profile.role, admin: profile };
    }
    return { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

// Initial connection check and online/offline recovery in real browser runtime
if (isBrowserRuntime) {
  window.addEventListener('offline', () => {
    safelyDisableFirestoreNetwork().catch(() => {});
  });
  window.addEventListener('online', () => {
    ensureFirestoreConnectivityChecked({ forceProbe: true }).catch(() => {});
  });
  ensureFirestoreConnectivityChecked().catch(() => {});
}


