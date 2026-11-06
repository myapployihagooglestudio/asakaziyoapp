import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AdminUser, UserRole } from '../types';

// Suppress Firestore offline connection timeout warnings and errors in preview environments
if (typeof window !== 'undefined') {
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = (...args: any[]) => {
    const msg = args.map((a) => String(a)).join(' ');
    if (
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('Firestore')
    ) {
      return;
    }
    origWarn(...args);
  };
  console.error = (...args: any[]) => {
    const msg = args.map((a) => String(a)).join(' ');
    if (
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('Firestore')
    ) {
      return;
    }
    origError(...args);
  };
}

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
export const auth = getAuth(app);

// Standard Canonical Email Resolver for the Single Authorized Administrator
export const AUTHORIZED_ADMIN_USERNAME = 'menageradmin';
export const AUTHORIZED_ADMIN_EMAIL = 'asakaziyo0@gmail.com';
export const AUTHORIZED_ADMIN_UID = 'admin-asakaziyo0';
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
        if (parsed && parsed.admin && parsed.admin.email === AUTHORIZED_ADMIN_EMAIL && parsed.admin.isActive) {
          activeAdminSession = parsed.admin;
          activeAdminServerToken = parsed.token || null;
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

export function getActiveAdminSession(): AdminUser | null {
  if (activeAdminSession && activeAdminSession.email === AUTHORIZED_ADMIN_EMAIL && activeAdminSession.isActive) {
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
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
    return true;
  }
  const session = getActiveAdminSession();
  return Boolean(session && session.email === AUTHORIZED_ADMIN_EMAIL && session.isActive);
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

// Startup connection verification
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'schedules', 'asaka-main'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firebase client is in resilient offline mode.');
    }
    return false;
  }
}

// Firebase Auth: Sign Out
export async function signOutFirebase(): Promise<void> {
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
 * Authenticates the single authorized administrator via username ("menageradmin" -> "asakaziyo0@gmail.com")
 * and password. Attempts Firebase Authentication Email/Password first, and when AI Studio's hosted project
 * returns PASSWORD_LOGIN_DISABLED, verifies credentials via /api/admin/auth and Firestore /admins/admin-asakaziyo0.
 */
export async function signInAdmin(
  loginOrEmail: string,
  pass: string
): Promise<{ user: User | null; admin: AdminUser }> {
  if (!loginOrEmail.trim() || !pass.trim()) {
    throw new Error('Login va parol kiritilishi shart.');
  }

  const email = resolveLoginToEmail(loginOrEmail);
  if (email !== AUTHORIZED_ADMIN_EMAIL) {
    throw new Error('Login yoki parol notoʻgʻri kiritildi.');
  }

  let firebaseUser: User | null = null;
  let targetUid = AUTHORIZED_ADMIN_UID;
  let serverToken: string | null = null;

  // 1. Attempt Firebase Authentication Email/Password
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    firebaseUser = userCredential.user;
    targetUid = firebaseUser.uid;
    serverToken = await firebaseUser.getIdToken();
  } catch (authErr: any) {
    const code = authErr?.code || '';
    const msg = authErr?.message || '';
    const isPasswordProviderDisabled =
      code === 'auth/operation-not-allowed' ||
      code === 'auth/admin-restricted-operation' ||
      msg.includes('PASSWORD_LOGIN_DISABLED') ||
      code === 'auth/user-not-found';

    if (!isPasswordProviderDisabled) {
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Login yoki parol notoʻgʻri kiritildi.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Xavfsizlik yuzasidan vaqtincha bloklandi. Bir ozdan keyin qayta urinib ko‘ring.');
      }
      throw new Error(authErr?.message || 'Autentifikatsiya xatosi yuz berdi.');
    }

    // Hosted AI Studio Firebase project has PASSWORD_LOGIN_DISABLED; verify via secure backend endpoint
    let verifiedByServer = false;
    try {
      const resp = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: AUTHORIZED_ADMIN_USERNAME, email: AUTHORIZED_ADMIN_EMAIL, password: pass }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.token) {
          verifiedByServer = true;
          serverToken = json.token;
        }
      } else {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Login yoki parol notoʻgʻri kiritildi.');
      }
    } catch (serverErr: any) {
      throw new Error(serverErr?.message || 'Login yoki parol notoʻgʻri kiritildi.');
    }

    if (!verifiedByServer) {
      throw new Error('Login yoki parol notoʻgʻri kiritildi.');
    }
  }

  // 2. Verify and ensure /admins/{uid} exists in Firestore with email = asakaziyo0@gmail.com
  const nowIso = new Date().toISOString();
  let adminProfile = await fetchAdminProfile(targetUid);
  if (!adminProfile) {
    adminProfile = {
      uid: targetUid,
      email: AUTHORIZED_ADMIN_EMAIL,
      username: AUTHORIZED_ADMIN_USERNAME,
      displayName: 'Bosh Administrator (Asaka Ziyo)',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastLoginAt: nowIso,
    };
  } else {
    adminProfile = {
      ...adminProfile,
      email: AUTHORIZED_ADMIN_EMAIL,
      username: AUTHORIZED_ADMIN_USERNAME,
      role: 'SUPER_ADMIN',
      isActive: true,
      updatedAt: nowIso,
      lastLoginAt: nowIso,
    };
  }

  try {
    await setDoc(doc(db, 'admins', targetUid), adminProfile, { merge: true });
    if (targetUid !== AUTHORIZED_ADMIN_UID) {
      await setDoc(
        doc(db, 'admins', AUTHORIZED_ADMIN_UID),
        { ...adminProfile, uid: AUTHORIZED_ADMIN_UID },
        { merge: true }
      );
    }
  } catch (saveErr) {
    console.warn('Firestore /admins profile sync warning:', saveErr);
  }

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

  return { user: firebaseUser, admin: adminProfile };
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
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPass);
    }
    const token = getActiveAdminToken();
    if (token) {
      const resp = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPass }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Parolni yangilashda xatolik' };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Parolni yangilashda xatolik' };
  }
}

// ---------------------------------------------------------------------------
// FIRESTORE GENERAL HELPERS
// ---------------------------------------------------------------------------

const ADMIN_WRITE_COLLECTIONS = new Set([
  'schedules',
  'articles',
  'mediaPosts',
  'hadiths',
  'dhikrs',
  'drafts',
  'notifications',
  'announcements',
  'news',
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

export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const path = `${collectionName}/${docId}`;

  // Enforce strict admin authentication check for protected collections
  if (ADMIN_WRITE_COLLECTIONS.has(collectionName) && !isAdminAuthenticated()) {
    const permError = '7 PERMISSION_DENIED: Missing or insufficient permissions (Admin: asakaziyo0@gmail.com required).';
    console.warn(`Firestore sync note for ${path}: ${permError}`);
    return { success: false, error: permError };
  }

  try {
    const cleanPayload = sanitizeForFirestore({
      ...data,
      adminEmail: AUTHORIZED_ADMIN_EMAIL,
      syncedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, collectionName, docId), cleanPayload, { merge: true });
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Firestore sync note for ${path}:`, errorMsg);
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
    console.warn(`Firestore delete note for ${path}: ${permError}`);
    return { success: false, error: permError };
  }

  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Firestore delete note for ${path}:`, errorMsg);
    return { success: false, error: errorMsg };
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

// Initial connection test
testFirestoreConnection();
