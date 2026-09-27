import { describe, expect, it } from 'vitest';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { validateContract } from '../src/engine/validate';
import { randomUUID } from 'node:crypto';
import { rehearse, sameRows } from '../src/engine/rehearse';
import { contracts } from '../examples/contracts';

const safe = contracts[2];
function cli(args: string[]) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/rehearse.ts', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '',
    stderr = '';
  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    },
  );
  return { child, done };
}

describe('adversarial proof boundaries', () => {
  it('rejects repairs that change the invariant while allowing identical evidence and reviewed application query changes', () => {
    const original = contracts[1];
    expect(validateContract(original).repair?.newWriteSql).toBe(original.repair?.newWriteSql);
    expect(
      validateContract({
        ...original,
        repair: { ...original.repair!, invariantSql: `  ${original.invariantSql}  ` },
      }).repair?.invariantSql,
    ).toBe(original.invariantSql);
    expect(() =>
      validateContract({
        ...original,
        repair: { ...original.repair!, invariantSql: 'SELECT COUNT(*) FROM orders;' },
      }),
    ).toThrow(/preserve the original invariant/);
  });
  it('distinguishes PostgreSQL nonfinite floating values from SQL NULL', () => {
    expect(sameRows([{ amount: Number.NaN }], [{ amount: null }])).toBe(false);
    expect(
      sameRows([{ amount: Number.POSITIVE_INFINITY }], [{ amount: Number.NEGATIVE_INFINITY }]),
    ).toBe(false);
  });
  it('blocks forward migrations that erase preexisting business data', async () => {
    const report = await rehearse({ ...safe, upSql: `${safe.upSql}\nDELETE FROM orders;` });
    expect(report.status).toBe('blocked');
    expect(report.checks.find((check) => check.id === 'baseline-data')?.status).toBe('failed');
  }, 30_000);
  it('does not accept a mutating invariant as proof of otherwise invisible writes', async () => {
    const report = await rehearse({
      ...safe,
      seedSql: `${safe.seedSql}\nCREATE SEQUENCE witness;`,
      newWriteSql: 'SELECT 1;',
      invariantSql:
        "SELECT CASE WHEN nextval('witness') = 1 THEN 0 ELSE 1 END AS fabricated_evidence;",
    });
    expect(report.status).toBe('blocked');
  }, 30_000);
  it('rejects temporary-sequence side effects even though PostgreSQL permits them in read-only transactions', async () => {
    const report = await rehearse({
      ...safe,
      seedSql: `${safe.seedSql}\nCREATE TEMP SEQUENCE witness;`,
      newWriteSql: 'SELECT 1;',
      invariantSql: `SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='fulfillment')
        THEN CASE WHEN nextval('witness') = 1 THEN 0 ELSE 1 END ELSE 0 END AS fabricated_evidence;`,
    });
    expect(report.status).toBe('blocked');
  }, 30_000);
  it('enforces read-only old application probes after rollback without contaminating redeployment', async () => {
    const report = await rehearse({
      ...safe,
      seedSql: `${safe.seedSql}
        CREATE FUNCTION old_probe() RETURNS integer LANGUAGE plpgsql AS $$
        BEGIN
          IF current_setting('application_name') = 'rolled-back' THEN
            UPDATE orders SET total_cents = 0;
          END IF;
          RETURN 1;
        END $$;`,
      oldReadSql: 'SELECT old_probe();',
      downSql: "SET application_name = 'rolled-back';",
    });
    expect(report.checks.find((check) => check.id === 'baseline')?.status).toBe('passed');
    expect(report.checks.find((check) => check.id === 'old-reader')?.status).toBe('passed');
    const after = report.checks.find((check) => check.id === 'old-after');
    expect(after?.status).toBe('failed');
    expect(after?.error).toMatch(/read-only transaction/);
    expect(report.checks.find((check) => check.id === 'redo')?.status).toBe('passed');
    expect(report.status).toBe('blocked');
  }, 30_000);
  it('keeps a failed baseline blocking even when later branch contracts work', async () => {
    const report = await rehearse({ ...safe, oldReadSql: 'SELECT fulfillment FROM orders;' });
    expect(report.checks.find((check) => check.id === 'baseline')?.status).toBe('failed');
    expect(report.status).toBe('blocked');
  }, 30_000);
  it('does not hide timestamp corruption below JavaScript Date precision', async () => {
    const report = await rehearse({
      ...safe,
      seedSql: `${safe.seedSql}\nALTER TABLE orders ADD COLUMN received_at TIMESTAMP DEFAULT '2026-09-27 12:00:00.123456';`,
      invariantSql: 'SELECT id, received_at FROM orders ORDER BY id;',
      downSql: "UPDATE orders SET received_at = '2026-09-27 12:00:00.123457';",
    });
    expect(report.status).toBe('blocked');
  }, 30_000);
  it('preserves exact large integers and high-precision decimals and catches a final-digit change', async () => {
    const fixture = {
      ...safe,
      seedSql: `${safe.seedSql}\nALTER TABLE orders ADD COLUMN external_id BIGINT DEFAULT 9007199254740993;\nALTER TABLE orders ADD COLUMN exact_amount NUMERIC DEFAULT 12345678901234567890.123456789;`,
      invariantSql: 'SELECT id, external_id, exact_amount FROM orders ORDER BY id;',
    };
    const safeReport = await rehearse(fixture);
    expect(safeReport.status).toBe('passed');
    const values = safeReport.checks.find((check) => check.id === 'preservation')?.before as Record<
      string,
      unknown
    >[];
    expect(values[0].external_id).toBe('9007199254740993');
    expect(values[0].exact_amount).toBe('12345678901234567890.123456789');
    const corrupted = await rehearse({
      ...fixture,
      downSql:
        'UPDATE orders SET external_id=9007199254740992, exact_amount=12345678901234567890.123456788;',
    });
    expect(corrupted.status).toBe('blocked');
    expect(corrupted.checks.find((check) => check.id === 'preservation')?.status).toBe('failed');
  }, 30_000);
});

describe('CLI exit semantics', () => {
  it('fails closed before running a candidate repair that replaces the original invariant', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'undoproof-repair-'));
    try {
      const filename = join(directory, 'contract.json');
      await writeFile(
        filename,
        JSON.stringify({
          ...contracts[0],
          repair: { ...contracts[0].repair!, invariantSql: 'SELECT COUNT(*) FROM orders;' },
        }),
      );
      const result = await cli([filename, '--repair']).done;
      expect(result.code).toBe(2);
      expect(result.stderr).toContain('preserve the original invariant');
      expect(result.stdout).not.toContain('PASSED');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 10_000);
  it('returns success for help and invalid-input failure for absent input', async () => {
    expect((await cli(['--help']).done).code).toBe(0);
    expect((await cli([]).done).code).toBe(2);
  }, 10_000);
  it('returns failure for blocked evidence and success for a verified safe contract', async () => {
    const blocked = await cli(['demo:snapshot']).done;
    expect(blocked.code).toBe(1);
    expect(blocked.stdout).toContain('BLOCKED');
    const passed = await cli(['demo:safe']).done;
    expect(passed.code).toBe(0);
    expect(passed.stdout).toContain('PASSED');
  }, 60_000);
  it('fails closed when its isolated worker terminates without returning evidence', async () => {
    const { child, done } = cli(['demo:safe']);
    let killed = false;
    try {
      const until = Date.now() + 10_000;
      while (Date.now() < until && child.exitCode === null) {
        // Match only the known parent process and explicit CLI worker command.
        const processes = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
        const row = processes
          .split('\n')
          .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/))
          .find(
            (match) =>
              match && Number(match[2]) === child.pid && match[3].includes('rehearse.ts --worker'),
          );
        if (row) {
          process.kill(Number(row[1]), 'SIGKILL');
          killed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(killed).toBe(true);
      expect((await done).code).toBe(2);
    } finally {
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }, 15_000);
  it('returns an infrastructure failure when requested evidence cannot be saved', async () => {
    const unavailable = join(tmpdir(), `undoproof-absent-${randomUUID()}`, 'report.json');
    const result = await cli(['demo:safe', `--out=${unavailable}`]).done;
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Could not save evidence');
  }, 35_000);
});
