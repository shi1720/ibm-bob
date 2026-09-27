import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contracts } from '../examples/contracts';

const sdk = vi.hoisted(() => ({
  auth: {
    currentUser: { uid: 'alice', email: 'alice@example.test' } as {
      uid: string;
      email: string;
    } | null,
  },
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  reauthenticate: vi.fn(),
  deleteUser: vi.fn(),
  batchDelete: vi.fn(),
  batchCommit: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => sdk.auth,
  onAuthStateChanged: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
  reauthenticateWithCredential: sdk.reauthenticate,
  deleteUser: sdk.deleteUser,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  doc: (db: unknown, ...parts: string[]) =>
    [typeof db === 'string' ? db : '', ...parts].filter(Boolean).join('/'),
  getDocs: sdk.getDocs,
  query: (path: unknown) => path,
  orderBy: vi.fn(),
  limit: vi.fn(),
  setDoc: sdk.setDoc,
  deleteDoc: sdk.deleteDoc,
  writeBatch: () => ({ delete: sdk.batchDelete, commit: sdk.batchCommit }),
}));
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.example');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test');
vi.stubEnv('VITE_FIREBASE_APP_ID', 'test');
const { cloudRequest, parseSavedRun, authErrorMessage } = await import('../src/cloud/firebase');
const report = {
  id: 'run-1',
  contractId: contracts[0].id,
  contractName: contracts[0].name,
  startedAt: new Date().toISOString(),
  durationMs: 1,
  engine: 'test boundary only',
  status: 'blocked',
  contractHash: 'hash',
  summary: 'test',
  checks: [],
};
describe('cloud account boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.auth.currentUser = { uid: 'alice', email: 'alice@example.test' };
  });
  it('rejects a save when the authenticated identity changed', async () => {
    await expect(
      cloudRequest(
        '/runs',
        { method: 'POST', body: JSON.stringify({ contract: contracts[0], report }) },
        'bob',
      ),
    ).rejects.toThrow('session changed');
    expect(sdk.setDoc).not.toHaveBeenCalled();
  });
  it('stores exact evidence under the authenticated owner as a string', async () => {
    await cloudRequest(
      '/runs',
      { method: 'POST', body: JSON.stringify({ contract: contracts[0], report }) },
      'alice',
    );
    expect(sdk.setDoc).toHaveBeenCalledWith('users/alice/runs/run-1', {
      payload: JSON.stringify({ id: report.id, contract: contracts[0], report }),
      startedAt: report.startedAt,
    });
  });
  it('rejects oversized cloud packets without silently truncating evidence', async () => {
    await expect(
      cloudRequest(
        '/runs',
        {
          method: 'POST',
          body: JSON.stringify({
            contract: contracts[0],
            report: { ...report, summary: 'x'.repeat(800001) },
          }),
        },
        'alice',
      ),
    ).rejects.toThrow('800 KB');
    expect(sdk.setDoc).not.toHaveBeenCalled();
  });
  it('checks password before marking deletion or removing any reports', async () => {
    sdk.reauthenticate.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    await expect(
      cloudRequest('/auth/me', { method: 'DELETE', body: JSON.stringify({ password: 'bad' }) }),
    ).rejects.toThrow('incorrect');
    expect(sdk.setDoc).not.toHaveBeenCalled();
    expect(sdk.getDocs).not.toHaveBeenCalled();
    expect(sdk.deleteUser).not.toHaveBeenCalled();
  });
  it('marks deletion, drains reports, then removes identity', async () => {
    sdk.getDocs
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: 'report' }] })
      .mockResolvedValueOnce({ empty: true, docs: [] });
    await cloudRequest('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'valid' }),
    });
    expect(sdk.setDoc).toHaveBeenCalledWith('users/alice', { deleting: true });
    expect(sdk.batchDelete).toHaveBeenCalledWith('report');
    expect(sdk.batchCommit.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.deleteUser.mock.invocationCallOrder[0],
    );
  });
  it('keeps identity recoverable when report cleanup fails', async () => {
    sdk.getDocs.mockRejectedValueOnce({ code: 'unavailable' });
    await expect(
      cloudRequest('/auth/me', { method: 'DELETE', body: JSON.stringify({ password: 'valid' }) }),
    ).rejects.toThrow('temporarily unavailable');
    expect(sdk.deleteUser).not.toHaveBeenCalled();
  });
  it('rejects malformed or corrupt stored evidence before rendering', () => {
    expect(parseSavedRun('{bad')).toBeNull();
    expect(parseSavedRun({ id: 'x', contract: contracts[0], report: { checks: null } })).toBeNull();
    expect(parseSavedRun({ id: report.id, contract: contracts[0], report })).not.toBeNull();
  });
  it('rejects historical repairs that weaken the original invariant', () => {
    const contract = structuredClone(contracts[0]);
    contract.repair = { ...contract.repair!, invariantSql: 'SELECT 1 AS unchanged;' };
    expect(parseSavedRun({ id: report.id, contract, report })).toBeNull();
  });
  it('gives an actionable rate-limit message', () => {
    expect(authErrorMessage({ code: 'auth/too-many-requests' })).toContain('wait');
  });
});
