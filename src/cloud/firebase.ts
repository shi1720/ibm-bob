import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { z } from 'zod';
import { contractSchema } from '../engine/validate';
import type { ReleaseContract, RunReport } from '../engine/types';

const savedRunSchema = z.object({
  id: z.string(),
  contract: contractSchema,
  report: z.object({
    id: z.string(),
    contractId: z.string(),
    contractName: z.string(),
    startedAt: z.iso.datetime(),
    durationMs: z.number().nonnegative(),
    engine: z.string(),
    status: z.enum(['passed', 'blocked', 'error']),
    contractHash: z.string(),
    summary: z.string(),
    checks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(['passed', 'failed', 'skipped']),
        durationMs: z.number().nonnegative(),
        detail: z.string(),
        sql: z.string().optional(),
        error: z.string().optional(),
        before: z.array(z.unknown()).optional(),
        after: z.array(z.unknown()).optional(),
      }),
    ),
  }),
});
export function parseSavedRun(payload: unknown): SavedRun | null {
  try {
    return savedRunSchema.parse(typeof payload === 'string' ? JSON.parse(payload) : payload);
  } catch {
    return null;
  }
}
export type WorkspaceUser = { id: string; name: string; email: string };
export type SavedRun = { id: string; contract: ReleaseContract; report: RunReport };
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const firebaseEnabled = Object.values(config).every(Boolean);
const app = firebaseEnabled ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/wrong-password': 'The password is incorrect.',
    'auth/user-not-found': 'The email or password is incorrect.',
    'auth/email-already-in-use':
      'An account already uses this email. Sign in or reset your password.',
    'auth/weak-password': 'Choose a stronger password with at least 12 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed':
      'Connection failed. Check your internet connection and try again.',
    'auth/operation-not-allowed':
      'Account sign-in is temporarily unavailable. Guest rehearsals still work.',
    'permission-denied': 'Workspace access was denied. Sign in again and retry.',
    unavailable: 'Cloud storage is temporarily unavailable. Export your evidence and retry later.',
  };
  return (
    messages[code || ''] ||
    (error instanceof Error ? error.message : 'The request could not be completed.')
  );
}
export function observeCloudUser(callback: (user: WorkspaceUser | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) =>
    callback(
      user
        ? {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Your workspace',
            email: user.email || '',
          }
        : null,
    ),
  );
}
function requireUser(expectedUid?: string) {
  const user = auth?.currentUser;
  if (!user || (expectedUid && user.uid !== expectedUid))
    throw new Error('Your session changed. Sign in again before saving this report.');
  return user;
}
export async function cloudRequest(
  path: string,
  options?: RequestInit,
  expectedUid?: string,
): Promise<any> {
  if (!auth || !db) throw new Error('Cloud accounts are not configured.');
  try {
    const data = options?.body ? JSON.parse(String(options.body)) : {};
    if (path === '/auth/login' || path === '/auth/register') {
      const result = path.endsWith('register')
        ? await createUserWithEmailAndPassword(auth, data.email.trim(), data.password)
        : await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      if (path.endsWith('register'))
        await updateProfile(result.user, {
          displayName: String(data.name || '')
            .trim()
            .slice(0, 100),
        });
      return {
        user: {
          id: result.user.uid,
          name: result.user.displayName || result.user.email?.split('@')[0] || 'Your workspace',
          email: result.user.email || '',
        },
      };
    }
    if (path === '/auth/reset') {
      await sendPasswordResetEmail(auth, data.email.trim());
      return {};
    }
    if (path === '/auth/logout') {
      await signOut(auth);
      return {};
    }
    const user = requireUser(expectedUid);
    const runs = collection(db, 'users', user.uid, 'runs');
    if (path === '/auth/me' && options?.method === 'DELETE') {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email!, data.password),
      );
      await setDoc(doc(db, 'users', user.uid), { deleting: true });
      // A persistent deletion marker prevents another tab or an old token from recreating runs.
      // Firestore cannot recursively delete a subcollection from the client. Drain bounded batches
      // before deleting the Auth identity so cleanup failures remain recoverable by this user.
      for (;;) {
        const page = await getDocs(query(runs, limit(100)));
        if (page.empty) break;
        requireUser(user.uid);
        const batch = writeBatch(db);
        page.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
      }
      await deleteUser(user);
      return {};
    }
    if (path === '/runs' && options?.method === 'POST') {
      const entry = { id: data.report.id, contract: data.contract, report: data.report };
      const payload = JSON.stringify(entry);
      if (new TextEncoder().encode(payload).length > 800000)
        throw new Error(
          'This evidence packet exceeds the 800 KB cloud limit. Export it to keep the complete result.',
        );
      requireUser(expectedUid);
      await setDoc(doc(runs, entry.id), { payload, startedAt: entry.report.startedAt });
      return entry;
    }
    if (path === '/runs') {
      const result = await getDocs(query(runs, orderBy('startedAt', 'desc'), limit(100)));
      requireUser(expectedUid);
      return result.docs.flatMap((item) => {
        try {
          const entry = parseSavedRun(item.data().payload);
          return entry ? [entry] : [];
        } catch {
          return [];
        }
      });
    }
    if (path.startsWith('/runs/') && options?.method === 'DELETE') {
      await deleteDoc(doc(runs, decodeURIComponent(path.slice(6))));
      return {};
    }
    throw new Error('Unknown workspace request.');
  } catch (error) {
    throw new Error(authErrorMessage(error));
  }
}
