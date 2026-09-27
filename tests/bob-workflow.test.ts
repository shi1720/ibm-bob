/**
 * Bob workflow regression tests: source-to-contract rollback verification.
 *
 * Uses the real PGlite engine (no mocked verdicts) and the generated contracts
 * from examples/checkout-app/build-contract.ts.
 *
 * Owned by the Bob review task. Do not merge without running:
 *   npx vitest run tests/bob-workflow.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { rehearse, sameRows } from '../src/engine/rehearse';
import { buildContract } from '../examples/checkout-app/build-contract';
import {
  oldQueries,
  newQueries,
  orderInvariant,
  fixtureWrites,
} from '../examples/checkout-app/queries';

// ---------------------------------------------------------------------------
// Shared: build both contracts once per suite.
// buildContract() reads the real SQL files and validates via zod - no mocks.
// ---------------------------------------------------------------------------

const unsafeContract = await buildContract(false); // uses sql/up.sql + sql/down.sql
const candidateContract = await buildContract(true); // uses sql/up.candidate.sql + sql/down.candidate.sql

// ---------------------------------------------------------------------------
// 1. Contract source fidelity
//    Verify the generated contracts faithfully reflect queries.ts and the SQL
//    files so that engine results are traceable to the declared application SQL.
// ---------------------------------------------------------------------------

describe('generated contract reflects source queries and SQL files', () => {
  it('unsafe contract embeds the exact old reader query from queries.ts', () => {
    expect(unsafeContract.oldReadSql).toBe(oldQueries.read);
  });

  it('unsafe contract embeds the exact new reader query from queries.ts', () => {
    expect(unsafeContract.newReadSql).toBe(newQueries.read);
  });

  it('unsafe contract embeds the canonical orderInvariant from queries.ts', () => {
    expect(unsafeContract.invariantSql).toBe(orderInvariant);
  });

  it('unsafe contract newWriteSql references the post-deployment order id 204', () => {
    expect(unsafeContract.newWriteSql).toContain('204');
  });

  it('unsafe up migration creates the snapshot table (unsafe pattern)', () => {
    expect(unsafeContract.upSql).toContain('orders_before_release');
  });

  it('unsafe down migration drops the live orders table (unsafe pattern)', () => {
    expect(unsafeContract.downSql).toContain('DROP TABLE orders');
  });

  it('candidate up migration is an additive column-only change, no snapshot table', () => {
    expect(candidateContract.upSql).not.toContain('orders_before_release');
    expect(candidateContract.upSql).toContain('ADD COLUMN');
  });

  it('candidate down migration is a no-op that retains the schema (SELECT 1)', () => {
    // The candidate rollback does not rename or drop; it is purely application-level.
    expect(candidateContract.downSql).toContain('SELECT 1');
    expect(candidateContract.downSql).not.toContain('DROP');
    expect(candidateContract.downSql).not.toContain('RENAME');
  });

  it('both contracts use identical invariant, old/new reads and write fixtures', () => {
    expect(candidateContract.invariantSql).toBe(unsafeContract.invariantSql);
    expect(candidateContract.oldReadSql).toBe(unsafeContract.oldReadSql);
    expect(candidateContract.newReadSql).toBe(unsafeContract.newReadSql);
    expect(candidateContract.newWriteSql).toBe(unsafeContract.newWriteSql);
    expect(candidateContract.oldWriteSql).toBe(unsafeContract.oldWriteSql);
  });

  it('fixture write parameters match the declared fixtureWrites from queries.ts', () => {
    // Post-deployment order (new) - id=204, amount=34900, status=paid
    expect(unsafeContract.newWriteSql).toContain(String(fixtureWrites.new[0])); // 204
    expect(unsafeContract.newWriteSql).toContain(String(fixtureWrites.new[2])); // 34900
    // Legacy order (old) - id=205
    expect(unsafeContract.oldWriteSql).toContain(String(fixtureWrites.old[0])); // 205
  });
});

// ---------------------------------------------------------------------------
// 2. Unsafe snapshot rollback - the core failure the tool must expose
//    The snapshot restores the pre-release table, silently discarding order 204.
// ---------------------------------------------------------------------------

describe('unsafe snapshot rollback - post-deployment order 204 is lost', () => {
  let unsafeReport: Awaited<ReturnType<typeof rehearse>>;

  // Run once; each sub-test inspects the shared report.
  beforeAll(async () => {
    unsafeReport = await rehearse(unsafeContract);
  }, 60_000);

  it('overall report status is blocked', () => {
    expect(unsafeReport.status).toBe('blocked');
  });

  it('forward migration succeeds (SQL execution alone would not catch the problem)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'forward');
    expect(check?.status).toBe('passed');
  });

  it('rollback SQL itself executes without error (the silent loss is the point)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'rollback');
    expect(check?.status).toBe('passed');
  });

  it('data preservation check fails because order 204 disappears after rollback', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'preservation');
    expect(check?.status).toBe('failed');
  });

  it('preservation before snapshot contains order 204 (post-deploy write captured)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'preservation');
    const before = check?.before as Array<{ id: number; customer: string; total_cents: number }>;
    expect(before).toBeDefined();
    const order204 = before.find((r) => r.id === 204);
    expect(order204).toBeDefined();
    expect(order204?.customer).toBe('Synthetic post-deployment customer');
    expect(order204?.total_cents).toBe(34900);
  });

  it('preservation after snapshot does NOT contain order 204 (silently lost)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'preservation');
    const after = check?.after as Array<{ id: number }>;
    expect(after).toBeDefined();
    expect(after.find((r) => r.id === 204)).toBeUndefined();
  });

  it('row count drops from 4 before rollback to 3 after (seed-only rows survive)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'preservation');
    expect(check?.before).toHaveLength(4);
    expect(check?.after).toHaveLength(3);
  });

  it('original seed orders 201–203 survive the rollback (only the post-deploy order is lost)', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'preservation');
    const after = check?.after as Array<{ id: number }>;
    expect(after.map((r) => r.id).sort()).toEqual([201, 202, 203]);
  });

  it('old application can still read and write after the unsafe rollback', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'old-after');
    expect(check?.status).toBe('passed');
  });

  it('post-deploy checkpoint captures 4 rows including order 204 before the rollback', () => {
    const check = unsafeReport.checks.find((c) => c.id === 'post-deploy');
    expect(check?.status).toBe('passed');
    const after = check?.after as Array<{ id: number }>;
    expect(after).toHaveLength(4);
    expect(after.find((r) => r.id === 204)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Additive candidate - order 204 must survive
//    The candidate down migration retains schema and data; rollback = app revert only.
// ---------------------------------------------------------------------------

describe('additive candidate rollback - order 204 is preserved', () => {
  let candidateReport: Awaited<ReturnType<typeof rehearse>>;

  beforeAll(async () => {
    candidateReport = await rehearse(candidateContract);
  }, 60_000);

  it('overall report status is passed', () => {
    expect(candidateReport.status).toBe('passed');
  });

  it('all 10 checks pass (none failed, none skipped)', () => {
    expect(candidateReport.checks).toHaveLength(10);
    const nonPassed = candidateReport.checks.filter((c) => c.status !== 'passed');
    expect(nonPassed).toHaveLength(0);
  });

  it('forward migration passes', () => {
    expect(candidateReport.checks.find((c) => c.id === 'forward')?.status).toBe('passed');
  });

  it('rollback executes without error', () => {
    expect(candidateReport.checks.find((c) => c.id === 'rollback')?.status).toBe('passed');
  });

  it('data preservation passes - order 204 remains after rollback', () => {
    expect(candidateReport.checks.find((c) => c.id === 'preservation')?.status).toBe('passed');
  });

  it('preservation before and after contain identical rows including order 204', () => {
    const check = candidateReport.checks.find((c) => c.id === 'preservation');
    const before = check?.before as Array<{ id: number }>;
    const after = check?.after as Array<{ id: number }>;
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(sameRows(before, after)).toBe(true);
  });

  it('order 204 is present both before and after rollback in preservation evidence', () => {
    const check = candidateReport.checks.find((c) => c.id === 'preservation');
    const before = check?.before as Array<{ id: number; total_cents: number }>;
    const after = check?.after as Array<{ id: number; total_cents: number }>;
    const order204Before = before.find((r) => r.id === 204);
    const order204After = after.find((r) => r.id === 204);
    expect(order204Before?.total_cents).toBe(34900);
    expect(order204After?.total_cents).toBe(34900);
  });

  it('row count is 4 both before and after rollback', () => {
    const check = candidateReport.checks.find((c) => c.id === 'preservation');
    expect(check?.before).toHaveLength(4);
    expect(check?.after).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 4. Invariant identity - both contracts use the same invariant
//    Strengthening or weakening the invariant between contracts is prohibited;
//    the comparison must be apples-to-apples across the unsafe and candidate runs.
// ---------------------------------------------------------------------------

describe('invariant and query contract identity across unsafe and candidate', () => {
  let unsafeReport: Awaited<ReturnType<typeof rehearse>>;
  let candidateReport: Awaited<ReturnType<typeof rehearse>>;

  beforeAll(async () => {
    [unsafeReport, candidateReport] = await Promise.all([
      rehearse(unsafeContract),
      rehearse(candidateContract),
    ]);
  }, 60_000);

  it('candidate baseline-data check passes (seed rows survive additive migration)', () => {
    expect(candidateReport.checks.find((c) => c.id === 'baseline-data')?.status).toBe('passed');
  });

  it('unsafe baseline-data check also passes (seed rows survive even the unsafe migration)', () => {
    expect(unsafeReport.checks.find((c) => c.id === 'baseline-data')?.status).toBe('passed');
  });

  it('old reader passes on the candidate schema (backward compatible)', () => {
    expect(candidateReport.checks.find((c) => c.id === 'old-reader')?.status).toBe('passed');
  });

  it('old writer passes on the candidate schema (additive column has a default)', () => {
    expect(candidateReport.checks.find((c) => c.id === 'old-writer')?.status).toBe('passed');
  });

  it('old reader passes on the unsafe schema as well (column presence differs, SELECT unchanged)', () => {
    expect(unsafeReport.checks.find((c) => c.id === 'old-reader')?.status).toBe('passed');
  });

  it('old writer passes on the unsafe schema (the migration preserves the original columns)', () => {
    expect(unsafeReport.checks.find((c) => c.id === 'old-writer')?.status).toBe('passed');
  });

  it('candidate baseline invariant evidence matches unsafe baseline invariant evidence', () => {
    const unsafeBefore = unsafeReport.checks.find((c) => c.id === 'baseline-data')?.before;
    const candidateBefore = candidateReport.checks.find((c) => c.id === 'baseline-data')?.before;
    expect(unsafeBefore).toBeDefined();
    expect(candidateBefore).toBeDefined();
    expect(sameRows(unsafeBefore as unknown[], candidateBefore as unknown[])).toBe(true);
  });

  it('new reader query is satisfied on the candidate migrated schema', () => {
    expect(candidateReport.checks.find((c) => c.id === 'forward')?.status).toBe('passed');
  });

  it('redeploy after rollback succeeds on the candidate (migration is idempotent via IF NOT EXISTS)', () => {
    expect(candidateReport.checks.find((c) => c.id === 'redo')?.status).toBe('passed');
  });

  it('redeploy after rollback succeeds on the unsafe path as well', () => {
    expect(unsafeReport.checks.find((c) => c.id === 'redo')?.status).toBe('passed');
  });

  it('only the preservation check differs between the two reports', () => {
    const unsafeFailed = unsafeReport.checks.filter((c) => c.status === 'failed').map((c) => c.id);
    const candidateFailed = candidateReport.checks
      .filter((c) => c.status === 'failed')
      .map((c) => c.id);
    // Unsafe has exactly one failure: preservation.
    expect(unsafeFailed).toEqual(['preservation']);
    // Candidate has no failures.
    expect(candidateFailed).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Engine boundary: invisible writes cannot be hidden by narrowing the invariant
//    Regression guard: a narrowed invariant that excludes the post-deploy write must
//    be caught by the post-deploy checkpoint, not silently pass preservation.
// ---------------------------------------------------------------------------

describe('engine boundary: weakened invariant cannot rescue a blocked plan', () => {
  it('removing order 204 from the invariant makes the post-deploy write invisible - engine rejects it via post-deploy checkpoint', async () => {
    // If an operator narrows the invariant to exclude order 204, the post-deploy write
    // no longer changes the invariant projection. The engine catches this at the
    // post-deploy checkpoint (not at preservation), blocking the report.
    const hiddenInvariant =
      'SELECT id, customer, total_cents FROM orders WHERE id < 204 ORDER BY id;';
    const weakened = { ...unsafeContract, invariantSql: hiddenInvariant };
    const report = await rehearse(weakened);
    // The post-deploy checkpoint requires that the write changes the invariant projection.
    expect(report.checks.find((c) => c.id === 'post-deploy')?.status).toBe('failed');
    expect(report.status).toBe('blocked');
  }, 30_000);

  it('fabricating a passing preservation by narrowing invariant to seed rows only stays blocked', async () => {
    // Projection covers only original three rows; order 204 is invisible to invariant.
    const seedOnlyInvariant =
      'SELECT id, customer, total_cents FROM orders WHERE id <= 203 ORDER BY id;';
    const narrowed = { ...unsafeContract, invariantSql: seedOnlyInvariant };
    const report = await rehearse(narrowed);
    // Post-deploy write (id=204) does not appear in the projection → post-deploy check fails.
    expect(report.checks.find((c) => c.id === 'post-deploy')?.status).toBe('failed');
    expect(report.status).toBe('blocked');
  }, 30_000);
});
