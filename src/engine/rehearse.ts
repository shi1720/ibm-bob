import { PGlite } from '@electric-sql/pglite';
import type { CheckResult, ReleaseContract, RunReport } from './types';
import { validateContract } from './validate';

/** Canonical multiset comparison retains duplicate rows and ignores physical row/key order. */
export function canonical(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value)) return 'number:' + String(value);
  if (typeof value === 'bigint') return 'bigint:' + String(value);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key]))
      .join(',') +
    '}'
  );
}
export function sameRows(a: unknown[], b: unknown[]): boolean {
  return canonical(a.map(canonical).sort()) === canonical(b.map(canonical).sort());
}
export async function hashContract(contract: ReleaseContract): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical(contract)),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
const elapsed = (start: number) => Math.round((performance.now() - start) * 100) / 100;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
function requireJsonSafe(value: unknown): void {
  if ((typeof value === 'number' && !Number.isFinite(value)) || typeof value === 'bigint')
    throw new Error(
      'Result contains a non-JSON numeric value. Cast non-finite floats or bigint values to TEXT in the invariant projection to preserve exact evidence.',
    );
  if (value && typeof value === 'object') for (const v of Object.values(value)) requireJsonSafe(v);
}
async function readOnly(db: PGlite, sql: string) {
  const temporary = await db.query(
    "SELECT 1 FROM pg_class WHERE relpersistence = 't' AND relnamespace = pg_my_temp_schema() LIMIT 1",
  );
  if (temporary.rows.length)
    throw new Error(
      'Temporary relations and sequences are not supported in rehearsal fixtures: they can mutate inside READ ONLY transactions. Use permanent fixture tables in the disposable database.',
    );
  await db.exec('BEGIN READ ONLY');
  try {
    const result = await db.query(sql);
    requireJsonSafe(result.rows);
    return result;
  } finally {
    await db.exec('ROLLBACK');
  }
}

/** Runs only inside a disposable worker/child with an external hard timeout. */
export async function rehearse(input: ReleaseContract): Promise<RunReport> {
  const contract = validateContract(input);
  const started = performance.now();
  const checks: CheckResult[] = [];
  const report: RunReport = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    contractName: contract.name,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    engine: 'PostgreSQL / PGlite 0.3.16 (WASM)',
    status: 'error',
    checks,
    contractHash: await hashContract(contract),
    summary: '',
  };
  // Preserve wire text for types whose default JS representation can lose precision.
  const losslessParsers = Object.fromEntries(
    [20, 1016, 1700, 1231, 1082, 1182, 1114, 1115, 1184, 1185, 114, 199, 3802, 3807].map((oid) => [
      oid,
      (value: string) => value,
    ]),
  );
  const create = async () => {
    const db = new PGlite({ parsers: losslessParsers });
    try {
      await db.waitReady;
      await db.exec("SET statement_timeout = '5000';");
      return db;
    } catch (e) {
      await db.close().catch(() => {});
      throw e;
    }
  };
  const check = async (
    id: string,
    name: string,
    sql: string,
    action: () => Promise<Partial<CheckResult> | void>,
  ) => {
    const start = performance.now();
    try {
      const result = await action();
      const c: CheckResult = {
        id,
        name,
        status: 'passed',
        durationMs: elapsed(start),
        detail: 'SQL contract executed successfully.',
        sql,
        ...result,
      };
      checks.push(c);
      return c.status === 'passed';
    } catch (e) {
      checks.push({
        id,
        name,
        status: 'failed',
        durationMs: elapsed(start),
        detail: 'The supplied contract could not be satisfied.',
        sql,
        error: errorText(e),
      });
      return false;
    }
  };
  const skip = (id: string, name: string, detail: string) =>
    checks.push({ id, name, status: 'skipped', durationMs: 0, detail });
  const branch = async (
    id: string,
    name: string,
    sql: string,
    action: (db: PGlite) => Promise<Partial<CheckResult> | void>,
  ) => {
    let db: PGlite | undefined;
    try {
      return await check(id, name, sql, async () => {
        db = await create();
        return action(db);
      });
    } finally {
      if (db) await db.close().catch(() => {});
    }
  };
  try {
    await branch(
      'baseline',
      'Baseline application',
      contract.oldReadSql + '\n' + contract.oldWriteSql,
      async (db) => {
        await db.exec(contract.seedSql);
        await readOnly(db, contract.oldReadSql);
        await db.exec(contract.oldWriteSql);
        await readOnly(db, contract.oldReadSql);
        return { detail: 'Old reads and writes execute against the original schema.' };
      },
    );
    await branch(
      'forward',
      'Forward deployment',
      contract.upSql + '\n' + contract.newReadSql + '\n' + contract.newWriteSql,
      async (db) => {
        await db.exec(contract.seedSql);
        await db.exec(contract.upSql);
        await readOnly(db, contract.newReadSql);
        await db.exec(contract.newWriteSql);
        await readOnly(db, contract.newReadSql);
        return { detail: 'Migration and new application reads/writes execute successfully.' };
      },
    );
    await branch(
      'baseline-data',
      'Original data survives deployment',
      contract.invariantSql,
      async (db) => {
        await db.exec(contract.seedSql);
        const before = (await readOnly(db, contract.invariantSql)).rows;
        if (!before.length)
          throw new Error('Baseline invariant is empty; seed representative business data.');
        if (before.length > 10000)
          throw new Error('Invariant result exceeds the 10,000-row fixture limit.');
        await db.exec(contract.upSql);
        const after = (await readOnly(db, contract.invariantSql)).rows;
        const same = sameRows(before, after);
        return {
          status: same ? 'passed' : 'failed',
          detail: same
            ? `All ${before.length} original business rows survived deployment unchanged.`
            : 'The forward migration changed existing business data. Review the canonical invariant and migration.',
          before,
          after,
        };
      },
    );
    await branch('old-reader', 'Old reader · new schema', contract.oldReadSql, async (db) => {
      await db.exec(contract.seedSql);
      await db.exec(contract.upSql);
      await readOnly(db, contract.oldReadSql);
      return { detail: 'Old application reads work during a rolling deployment.' };
    });
    await branch('old-writer', 'Old writer · new schema', contract.oldWriteSql, async (db) => {
      await db.exec(contract.seedSql);
      await db.exec(contract.upSql);
      await db.exec(contract.oldWriteSql);
      await readOnly(db, contract.newReadSql);
      return { detail: 'Old application writes are accepted and the new reader still executes.' };
    });
    let db: PGlite | undefined;
    try {
      db = await create();
      const rollbackDb = db;
      let before: unknown[] = [];
      const prepared = await check(
        'post-deploy',
        'Post-deploy data checkpoint',
        contract.newWriteSql + '\n' + contract.invariantSql,
        async () => {
          await rollbackDb.exec(contract.seedSql);
          await rollbackDb.exec(contract.upSql);
          const original = (await readOnly(rollbackDb, contract.invariantSql)).rows;
          await rollbackDb.exec(contract.newWriteSql);
          before = (await readOnly(rollbackDb, contract.invariantSql)).rows;
          if (before.length > 10000)
            throw new Error('Invariant result exceeds the 10,000-row fixture limit.');
          if (!before.length)
            throw new Error('Invariant projection is empty; no business data can be verified.');
          if (sameRows(original, before))
            throw new Error(
              'Post-deploy writes do not change the invariant projection. Include the new business data in your invariant.',
            );
          return {
            detail: `Captured ${before.length} business rows after a visible post-deploy write.`,
            before: original,
            after: before,
          };
        },
      );
      if (!prepared) {
        for (const [id, name] of [
          ['rollback', 'Rollback plan'],
          ['preservation', 'Data preservation'],
          ['old-after', 'Old application after rollback'],
          ['redo', 'Redeploy after rollback'],
        ])
          skip(id, name, 'Post-deploy setup failed; no rollback evidence available.');
      } else {
        const rolled = await check('rollback', 'Rollback plan', contract.downSql, async () => {
          await rollbackDb.exec(contract.downSql);
          return { detail: 'Rollback SQL completed. Data preservation is verified separately.' };
        });
        if (!rolled) {
          for (const [id, name] of [
            ['preservation', 'Data preservation'],
            ['old-after', 'Old application after rollback'],
            ['redo', 'Redeploy after rollback'],
          ])
            skip(id, name, 'Rollback failed; dependent checks were not executed.');
        } else {
          await check('preservation', 'Data preservation', contract.invariantSql, async () => {
            const after = (await readOnly(rollbackDb, contract.invariantSql)).rows;
            const same = sameRows(before, after);
            return {
              status: same ? 'passed' : 'failed',
              detail: same
                ? `All ${before.length} rows in the supplied invariant projection survived unchanged.`
                : `Business data changed: ${before.length} rows before rollback, ${after.length} after. Compare values as well as counts.`,
              before,
              after,
            };
          });
          await check(
            'old-after',
            'Old application after rollback',
            contract.oldReadSql + '\n' + contract.oldWriteSql,
            async () => {
              // Transaction avoids contaminating the exact rollback checkpoint or redeploy branch.
              await rollbackDb.exec('BEGIN');
              try {
                await rollbackDb.query(contract.oldReadSql);
                await rollbackDb.exec(contract.oldWriteSql);
                await rollbackDb.query(contract.oldReadSql);
              } finally {
                await rollbackDb.exec('ROLLBACK');
              }
              return {
                detail:
                  'Old reads and writes execute after rollback; probe writes were rolled back.',
              };
            },
          );
          await check(
            'redo',
            'Redeploy after rollback',
            contract.upSql + '\n' + contract.newReadSql,
            async () => {
              await rollbackDb.exec(contract.upSql);
              await readOnly(rollbackDb, contract.newReadSql);
              return { detail: 'Migration can be reapplied and the new reader executes.' };
            },
          );
        }
      }
    } finally {
      if (db) await db.close().catch(() => {});
    }
    report.status = checks.every((c) => c.status === 'passed') ? 'passed' : 'blocked';
    const failures = checks.filter((c) => c.status === 'failed').length;
    report.summary =
      report.status === 'passed'
        ? 'All supplied SQL contracts passed. The supplied invariant projection was unchanged after rollback.'
        : `${failures} check${failures === 1 ? '' : 's'} failed. Do not release this plan without resolving or explicitly investigating the evidence.`;
  } catch (e) {
    report.status = 'error';
    report.summary = 'Rehearsal infrastructure failed: ' + errorText(e);
  }
  report.durationMs = elapsed(started);
  return report;
}
