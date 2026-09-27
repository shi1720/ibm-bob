import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import {
  randomBytes,
  randomUUID,
  scrypt,
  scryptSync,
  createHash,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const derive = promisify(scrypt);
const COOKIE = 'undoproof_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const text = z.string().max(200_000);
const sqlFields = {
  upSql: text,
  downSql: text,
  newWriteSql: text.optional(),
  oldWriteSql: text.optional(),
  newReadSql: text.optional(),
  oldReadSql: text.optional(),
  invariantSql: text.optional(),
};
const contractSchema = z
  .object({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    description: z.string().max(10_000),
    migrationName: z.string().max(200),
    seedSql: text,
    upSql: text,
    downSql: text,
    oldReadSql: text,
    newReadSql: text,
    newWriteSql: text,
    oldWriteSql: text,
    invariantSql: text,
    tags: z.array(z.string().max(100)).max(30),
    repair: z
      .object({ summary: z.string().max(10_000), ...sqlFields })
      .strict()
      .optional(),
  })
  .strict();
const reportSchema = z
  .object({
    id: z.string().min(1).max(200),
    contractId: z.string().max(200),
    contractName: z.string().max(200),
    startedAt: z.iso.datetime(),
    durationMs: z.number().finite().nonnegative(),
    engine: z.string().max(300),
    status: z.enum(['passed', 'blocked', 'error']),
    checks: z
      .array(
        z
          .object({
            id: z.string().max(200),
            name: z.string().max(300),
            status: z.enum(['passed', 'failed', 'skipped']),
            durationMs: z.number().finite().nonnegative(),
            detail: z.string().max(20_000),
            sql: text.optional(),
            error: z.string().max(20_000).optional(),
            before: z.array(z.unknown()).max(10_000).optional(),
            after: z.array(z.unknown()).max(10_000).optional(),
          })
          .strict(),
      )
      .max(100),
    contractHash: z.string().max(200),
    summary: z.string().max(20_000),
  })
  .strict();
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);
const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
type User = { id: string; email: string; name: string };

export interface AppOptions {
  dataDir?: string;
  appOrigin?: string;
  production?: boolean;
  distDir?: string;
  authLimit?: number;
  trustProxyHops?: number;
}

/** This server stores client evidence; it does not execute or attest to submitted SQL/results. */
export function createApp(options: AppOptions = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const appOrigin = options.appOrigin ?? process.env.APP_ORIGIN;
  if (production && !appOrigin)
    throw new Error('APP_ORIGIN is required in production (e.g. https://undoproof.example.com)');
  const allowedOrigin = appOrigin ? new URL(appOrigin).origin : undefined;
  if (appOrigin && !/^https?:\/\//.test(appOrigin))
    throw new Error('APP_ORIGIN must use HTTP or HTTPS');
  if (production && !appOrigin?.startsWith('https://'))
    throw new Error('Production APP_ORIGIN must use HTTPS for secure session cookies');
  const dataDir = options.dataDir ?? process.env.DATA_DIR ?? path.resolve('data');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new Database(path.join(dataDir, 'undoproof.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, contract TEXT NOT NULL, report TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS runs_user ON runs(user_id, created_at);`);
  const dummySalt = randomBytes(16).toString('hex');
  const dummyHash = scryptSync('constant-dummy-password', dummySalt, 64);
  const app = express();
  app.disable('x-powered-by');
  const proxyHops = options.trustProxyHops ?? Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10)
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10');
  if (proxyHops) app.set('trust proxy', proxyHops);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", "'wasm-unsafe-eval'"],
          'worker-src': ["'self'", 'blob:'],
          'upgrade-insecure-requests': production ? [] : null,
        },
      },
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again shortly.' },
    }),
  );
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const expected = allowedOrigin ?? `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== expected) || req.get('sec-fetch-site') === 'cross-site') {
      res.status(403).json({ error: 'Request origin is not allowed.' });
      return;
    }
    if (req.method !== 'DELETE' && !req.is('application/json')) {
      res.status(415).json({ error: 'Use application/json.' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '2mb', strict: true }));
  app.use(cookieParser());
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: production,
    path: '/',
    maxAge: SESSION_MS,
  };
  function userFor(req: Request): User | undefined {
    const token: unknown = req.cookies?.[COOKIE];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return undefined;
    return db
      .prepare(
        `SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
      .get(hashToken(token), Date.now()) as User | undefined;
  }
  function requireUser(req: Request, res: Response, next: NextFunction) {
    const user = userFor(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in to use your private workspace.' });
      return;
    }
    res.locals.user = user;
    next();
  }
  function issueSession(req: Request, res: Response, user: User) {
    const previous: unknown = req.cookies?.[COOKIE];
    if (typeof previous === 'string')
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(previous));
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
      hashToken(token),
      user.id,
      Date.now() + SESSION_MS,
    );
    res.cookie(COOKIE, token, cookieOptions);
  }
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: options.authLimit ?? 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', evidence: 'client-supplied local evidence; not server-attested' });
  });
  app.get('/api/auth/me', (req, res) => res.json({ user: userFor(req) ?? null }));
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Provide a name, valid email, and password of 12–128 characters.' });
      return;
    }
    const { email, name, password } = parsed.data;
    const salt = randomBytes(16).toString('hex');
    const passwordHash = ((await derive(password, salt, 64)) as Buffer).toString('hex');
    const user = { id: randomUUID(), email, name };
    try {
      db.prepare(
        'INSERT INTO users(id, email, name, salt, password_hash) VALUES (?, ?, ?, ?, ?)',
      ).run(user.id, email, name, salt, passwordHash);
    } catch (error) {
      if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res
          .status(409)
          .json({ error: 'Unable to create account with these details. Try signing in.' });
        return;
      }
      throw error;
    }
    issueSession(req, res, user);
    res.status(201).json({ user });
  });
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email) as
      (User & { salt: string; password_hash: string }) | undefined;
    const candidate = (await derive(parsed.data.password, row?.salt ?? dummySalt, 64)) as Buffer;
    const correct = timingSafeEqual(
      candidate,
      row ? Buffer.from(row.password_hash, 'hex') : dummyHash,
    );
    if (!row || !correct) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const user = { id: row.id, email: row.email, name: row.name };
    issueSession(req, res, user);
    res.json({ user });
  });
  app.post('/api/auth/logout', (req, res) => {
    const token: unknown = req.cookies?.[COOKIE];
    if (typeof token === 'string')
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: production, path: '/' });
    res.json({ ok: true });
  });
  app.delete('/api/auth/me', authLimiter, requireUser, async (req, res) => {
    const parsed = z.object({ password: passwordSchema }).strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Confirm your password to delete your account.' });
      return;
    }
    const row = db
      .prepare('SELECT salt, password_hash FROM users WHERE id = ?')
      .get(res.locals.user.id) as { salt: string; password_hash: string };
    const candidate = (await derive(parsed.data.password, row.salt, 64)) as Buffer;
    if (!timingSafeEqual(candidate, Buffer.from(row.password_hash, 'hex'))) {
      res.status(401).json({ error: 'Invalid password.' });
      return;
    }
    // Foreign-key cascades atomically remove all private runs and active sessions.
    db.prepare('DELETE FROM users WHERE id = ?').run(res.locals.user.id);
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: production, path: '/' });
    res.status(204).end();
  });
  app.get('/api/runs', requireUser, (_req, res) => {
    const rows = db
      .prepare(
        'SELECT id, contract, report, created_at FROM runs WHERE user_id = ? ORDER BY created_at DESC',
      )
      .all(res.locals.user.id) as {
      id: string;
      contract: string;
      report: string;
      created_at: string;
    }[];
    res.json({
      runs: rows.map((row) => ({
        id: row.id,
        contract: JSON.parse(row.contract),
        report: JSON.parse(row.report),
        createdAt: row.created_at,
        evidenceSource: 'client-supplied local evidence; not server-attested',
      })),
    });
  });
  app.post('/api/runs', requireUser, (req, res) => {
    const parsed = z
      .object({ contract: contractSchema, report: reportSchema })
      .strict()
      .safeParse(req.body);
    if (!parsed.success || parsed.data.contract.id !== parsed.data.report.contractId) {
      res.status(400).json({ error: 'Invalid release contract or rehearsal report.' });
      return;
    }
    const count = db
      .prepare('SELECT COUNT(*) AS n FROM runs WHERE user_id = ?')
      .get(res.locals.user.id) as { n: number };
    if (count.n >= 100) {
      res
        .status(409)
        .json({
          error: 'Workspace limit of 100 runs reached. Export and delete older runs first.',
        });
      return;
    }
    const run = {
      id: randomUUID(),
      ...parsed.data,
      createdAt: new Date().toISOString(),
      evidenceSource: 'client-supplied local evidence; not server-attested',
    };
    db.prepare(
      'INSERT INTO runs(id, user_id, contract, report, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(
      run.id,
      res.locals.user.id,
      JSON.stringify(run.contract),
      JSON.stringify(run.report),
      run.createdAt,
    );
    res.status(201).json({ run });
  });
  app.delete('/api/runs/:id', requireUser, (req, res) => {
    const result = db
      .prepare('DELETE FROM runs WHERE id = ? AND user_id = ?')
      .run(req.params.id, res.locals.user.id);
    if (!result.changes) {
      res.status(404).json({ error: 'Run not found.' });
      return;
    }
    res.status(204).end();
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  const distDir = options.distDir ?? path.resolve('dist');
  app.use(
    express.static(distDir, { dotfiles: 'deny', index: false, maxAge: production ? '1h' : 0 }),
  );
  app.get('/{*path}', (req, res) => {
    if (
      !req.accepts('html') ||
      path.extname(req.path) ||
      !existsSync(path.join(distDir, 'index.html'))
    ) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
  app.use(
    (
      error: { status?: number; type?: string },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      if (error.type === 'entity.too.large') {
        res.status(413).json({ error: 'Request exceeds the 2 MB limit.' });
        return;
      }
      if (error.status === 400) {
        res.status(400).json({ error: 'Malformed JSON request.' });
        return;
      }
      console.error('Request failed:', error);
      res.status(500).json({ error: 'Unable to complete request.' });
    },
  );
  return { app, close: () => db.close() };
}
