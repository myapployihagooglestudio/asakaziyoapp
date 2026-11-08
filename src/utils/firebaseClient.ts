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
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AdminUser, UserRole } from '../types';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling for resilient connection in all environments
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
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

// Startup connection verification against live Cloud Firestore server
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'schedules', 'asaka-main'));
    return true;
  } catch (error) {
    console.warn('[Firestore Connection Check] Live server read failed:', error instanceof Error ? error.message : error);
    return false;
  }
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
  'academyLessons',
  'charityCampaigns',
  'digitalBooks',
  'imamQuestions',
  'quranReciters',
  'quranAudioOverrides',
  'adhanLibrary',
  'ownAudioLibrary',
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
  if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:3000';
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

  // Route all privileged administrator writes through the authenticated backend gateway
  if (adminLoggedIn) {
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

  // Ordinary public user interactions (comments, ratings, userProgress, contentLikes, contentViews, pending inquiries)
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

  if (ADMIN_WRITE_COLLECTIONS.has(collectionName) && !isAdminAuthenticated()) {
    const permError = '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).';
    return { success: false, error: permError };
  }

  if (isAdminAuthenticated()) {
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

  if (ADMIN_WRITE_COLLECTIONS.has(collectionName)) {
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
 * Real-time collection listener using onSnapshot
 */
export function listenToFirestoreCollection<T = any>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as unknown as T);
        });
        onData(items);
      },
      (error) => {
        console.warn(`[Firestore Real-time Listener Error] /${collectionName}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
}

/**
 * Real-time single document listener using onSnapshot
 */
export function listenToFirestoreDoc<T = any>(
  collectionName: string,
  docId: string,
  onData: (item: T | null) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    return onSnapshot(
      doc(db, collectionName, docId),
      (snapshot) => {
        if (snapshot.exists()) {
          onData({ id: snapshot.id, ...snapshot.data() } as unknown as T);
        } else {
          onData(null);
        }
      },
      (error) => {
        console.warn(`[Firestore Real-time Doc Listener Error] /${collectionName}/${docId}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
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
  try {
    const snapshot = await getDoc(doc(db, collectionName, docId));
    if (snapshot.exists()) {
      return { success: true, data: snapshot.data() as T, exists: true };
    }
    return { success: true, data: null, exists: false };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, exists: false, error: msg };
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
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as unknown as T);
    });
    return { success: true, data: items };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: [], error: msg };
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

// Initial connection test in browser/WebView runtime
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}


