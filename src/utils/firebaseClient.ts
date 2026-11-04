import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
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

// Suppress Firestore offline connection timeout warnings and errors in preview environments
if (typeof window !== 'undefined') {
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    if (msg.includes('Could not reach Cloud Firestore backend') || msg.includes('Firestore')) {
      return;
    }
    origWarn(...args);
  };
  console.error = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    if (msg.includes('Could not reach Cloud Firestore backend') || msg.includes('Firestore')) {
      return;
    }
    origError(...args);
  };
}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

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
export const googleProvider = new GoogleAuthProvider();

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
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

// Google Auth Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.warn('Google sign-in popup closed or cancelled:', err);
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Firebase sign out error:', err);
  }
}

// Safe Firestore Cloud Sync Helpers
export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const path = `${collectionName}/${docId}`;
  try {
    await setDoc(
      doc(db, collectionName, docId),
      {
        ...data,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
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
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Firestore delete note for ${path}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Fetch single document from Firestore
export async function fetchDocFromFirestore<T = any>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const snapshot = await getDoc(doc(db, collectionName, docId));
    if (snapshot.exists()) {
      return snapshot.data() as T;
    }
    return null;
  } catch (err) {
    // If client is offline or server unreachable
    return null;
  }
}

// Fetch entire collection from Firestore
export async function fetchCollectionFromFirestore<T = any>(
  collectionName: string
): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as unknown as T);
    });
    return items;
  } catch (err) {
    return [];
  }
}

// Check admin role in /admins/{uid}
export async function checkAdminRole(
  uid: string
): Promise<{ isAdmin: boolean; role?: string }> {
  try {
    const adminDoc = await fetchDocFromFirestore<{ role: string; email: string }>(
      'admins',
      uid
    );
    if (adminDoc && (adminDoc.role === 'admin' || adminDoc.role === 'superadmin')) {
      return { isAdmin: true, role: adminDoc.role };
    }
    return { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

// Bootstrap superadmin document for verified system owner
export async function bootstrapAdmin(user: User): Promise<boolean> {
  if (user.email === 'mirzayevulugbek024@gmail.com' && user.emailVerified) {
    try {
      const res = await syncDocToFirestore('admins', user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Bosh Administrator',
        role: 'superadmin',
        verifiedAt: new Date().toISOString(),
      });
      return res.success;
    } catch {
      return false;
    }
  }
  return false;
}

// Initial connection test
testFirestoreConnection();

