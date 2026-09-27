import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { createApp } from '../server/app';

const directory = mkdtempSync(path.join(tmpdir(), 'undoproof-server-'));
const origin = 'http://workspace.test';
let service: ReturnType<typeof createApp>;
let server: Server;
let url: string;
let aliceCookie: string;
let bobCookie: string;
const password = 'correct horse battery staple';
const contract = { id: 'c1', name: 'Sample', description: '', migrationName: '001', seedSql: 'SELECT 1', upSql: '', downSql: '', oldReadSql: 'SELECT 1', newReadSql: 'SELECT 1', newWriteSql: '', oldWriteSql: '', invariantSql: 'SELECT 1', tags: [] };
const report = { id: 'r1', contractId: 'c1', contractName: 'Sample', startedAt: new Date().toISOString(), durationMs: 1, engine: 'PGlite', status: 'passed', checks: [], contractHash: 'fixture-hash', summary: 'Fixture only' };
function call(route: string, method = 'GET', body?: unknown, cookie?: string, customOrigin = origin) {
  return fetch(`${url}${route}`, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), Origin: customOrigin }, body: body === undefined ? undefined : JSON.stringify(body) });
}
beforeAll(async () => {
  service = createApp({ dataDir: directory, appOrigin: origin, authLimit: 100 });
  server = service.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); service.close(); rmSync(directory, { recursive: true, force: true }); });
describe('private workspace HTTP integration', () => {
  it('starts anonymous and rejects protected operations', async () => {
    expect(await (await call('/api/auth/me')).json()).toEqual({ user: null });
    expect((await call('/api/runs')).status).toBe(401);
    expect((await call('/api/unknown')).status).toBe(404);
  });
  it('rejects weak credentials and cross-origin writes', async () => {
    expect((await call('/api/auth/register', 'POST', { email: 'a@test.com', name: 'A', password: 'short' })).status).toBe(400);
    expect((await call('/api/auth/register', 'POST', { email: 'a@test.com', name: 'A', password }, undefined, 'https://evil.test')).status).toBe(403);
  });
  it('registers, normalizes email, keeps password out of responses, and sets an HttpOnly cookie', async () => {
    const result = await call('/api/auth/register', 'POST', { email: ' ALICE@EXAMPLE.COM ', name: ' Alice ', password });
    expect(result.status).toBe(201);
    const body = await result.json();
    expect(body.user).toEqual({ id: expect.any(String), email: 'alice@example.com', name: 'Alice' });
    const cookie = result.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
    aliceCookie = cookie.split(';')[0];
    expect((await (await call('/api/auth/me', 'GET', undefined, aliceCookie)).json()).user.email).toBe('alice@example.com');
    const db = new Database(path.join(directory, 'undoproof.sqlite'));
    const user = db.prepare('SELECT password_hash, salt FROM users').get() as { password_hash: string; salt: string };
    expect(user.password_hash).not.toContain(password); expect(user.salt).toHaveLength(32);
    const session = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(session.token_hash).toBe(createHash('sha256').update(aliceCookie.split('=')[1]).digest('hex'));
    db.close();
  });
  it('uses generic login errors and rotates a previous session', async () => {
    const wrong = await call('/api/auth/login', 'POST', { email: 'alice@example.com', password: 'wrong password long enough' });
    const missing = await call('/api/auth/login', 'POST', { email: 'unknown@example.com', password });
    expect(wrong.status).toBe(401); expect(await wrong.json()).toEqual(await missing.json());
    const previous = aliceCookie;
    const result = await call('/api/auth/login', 'POST', { email: 'alice@example.com', password }, previous);
    expect(result.status).toBe(200); aliceCookie = result.headers.get('set-cookie')!.split(';')[0];
    expect(aliceCookie).not.toBe(previous);
    expect(await (await call('/api/auth/me', 'GET', undefined, previous)).json()).toEqual({ user: null });
  });
  it('validates run evidence and isolates every user’s records', async () => {
    const bad = await call('/api/runs', 'POST', { contract, report: { ...report, contractId: 'other' } }, aliceCookie);
    expect(bad.status).toBe(400);
    const result = await call('/api/runs', 'POST', { contract, report }, aliceCookie);
    expect(result.status).toBe(201); const { run } = await result.json();
    expect(run.evidenceSource).toContain('not server-attested');
    expect((await (await call('/api/runs', 'GET', undefined, aliceCookie)).json()).runs).toHaveLength(1);
    const bob = await call('/api/auth/register', 'POST', { email: 'bob@example.com', name: 'Bob', password });
    bobCookie = bob.headers.get('set-cookie')!.split(';')[0];
    expect((await (await call('/api/runs', 'GET', undefined, bobCookie)).json()).runs).toEqual([]);
    expect((await call(`/api/runs/${run.id}`, 'DELETE', undefined, bobCookie)).status).toBe(404);
    expect((await call(`/api/runs/${run.id}`, 'DELETE', undefined, aliceCookie, 'https://evil.test')).status).toBe(403);
    expect((await call(`/api/runs/${run.id}`, 'DELETE', undefined, aliceCookie)).status).toBe(204);
  });
  it('invalidates logout and expired sessions', async () => {
    expect((await call('/api/auth/logout', 'POST', {}, aliceCookie)).status).toBe(200);
    expect((await call('/api/runs', 'GET', undefined, aliceCookie)).status).toBe(401);
    const db = new Database(path.join(directory, 'undoproof.sqlite'));
    db.prepare('UPDATE sessions SET expires_at = 0').run(); db.close();
    expect((await call('/api/runs', 'GET', undefined, bobCookie)).status).toBe(401);
  });
  it('rejects malformed and oversized bodies without leaking internals', async () => {
    const malformed = await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{' });
    expect(malformed.status).toBe(400);
    expect((await call('/api/auth/login', 'POST', { text: 'x'.repeat(2_100_000) })).status).toBe(413);
  });
  it('requires password confirmation and erases account, sessions, and runs', async () => {
    const login = await call('/api/auth/login', 'POST', { email: 'bob@example.com', password });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    expect((await call('/api/runs', 'POST', { contract, report }, cookie)).status).toBe(201);
    expect((await call('/api/auth/me', 'DELETE', { password: 'incorrect password' }, cookie)).status).toBe(401);
    expect((await call('/api/auth/me', 'DELETE', { password }, cookie)).status).toBe(204);
    expect((await call('/api/runs', 'GET', undefined, cookie)).status).toBe(401);
    const db = new Database(path.join(directory, 'undoproof.sqlite'));
    expect(db.prepare("SELECT id FROM users WHERE email = 'bob@example.com'").get()).toBeUndefined();
    expect(db.prepare('SELECT * FROM runs').all()).toHaveLength(0);
    db.close();
  });
  it('retains accounts after reopening the database and marks production cookies secure', async () => {
    const reopened = createApp({ dataDir: directory, appOrigin: 'https://workspace.test', production: true, authLimit: 1 });
    const temporary = reopened.app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => temporary.once('listening', resolve));
    const base = `http://127.0.0.1:${(temporary.address() as { port: number }).port}`;
    try {
      const request = () => fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://workspace.test' }, body: JSON.stringify({ email: 'alice@example.com', password }) });
      const result = await request();
      expect(result.status).toBe(200); expect(result.headers.get('set-cookie')).toContain('Secure');
      expect((await request()).status).toBe(429);
    } finally { await new Promise<void>(resolve => temporary.close(() => resolve())); reopened.close(); }
  });
});
