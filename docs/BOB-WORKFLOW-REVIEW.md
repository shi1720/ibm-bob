# Bob workflow: independent review

**Scope:** source-to-contract rollback verification for the checkout-app sample.
**Reviewer:** Bob (IBM Bob Agent mode), September 2026.
**Post-review edits:** repository review corrected the redo database lifecycle and clarified the status example; formatting was normalized.
**Evidence file:** `tests/bob-workflow.test.ts` (41 tests, all passing under real PGlite engine).
**Contracts inspected:** `examples/checkout-app/generated/unsafe.json` and `candidate.json` (generated from live source files, not pre-baked fixtures).

---

## What was reviewed

The checkout-app sample exercises the three-step Bob workflow described in `docs/BOB-WORKFLOW.md`:

1. **Source-to-contract generation** -- `build-contract.ts` reads `queries.ts` and the SQL files and produces a `ReleaseContract` that the engine can execute against real embedded PostgreSQL (PGlite WASM).
2. **Rehearsal** -- `src/engine/rehearse.ts` runs 10 independent checks across isolated databases: baseline, forward migration, baseline-data invariant, old-reader, old-writer, post-deploy checkpoint, rollback execution, data preservation, old-app after rollback, and redo.
3. **Repair** -- the `repair` field of the unsafe contract is machine-consumable: the CLI (`scripts/rehearse.ts`) applies it with `--repair`, which merges the patch fields over the base contract and sends the result to the isolated worker for an independent rehearsal. The browser UI (`src/App.tsx`) exposes an "Apply and rehearse" button that performs the identical merge and immediately triggers a new run. In both paths the patched contract is rehearsed independently; no verdict is assumed.

---

## Exact findings

### Finding 1 -- Silent data loss is real, not theoretical

The unsafe `down.sql` succeeds without error (SQL execution returns `passed`). The `rehearse` engine exposes the loss only through the `preservation` check, which compares invariant rows captured **before** `down.sql` to rows captured **after**. The before-snapshot contains order 204 (`total_cents = 34900`); the after-snapshot contains only the original three seed rows. The check reports:

```
Business data changed: 4 rows before rollback, 3 after.
```

Without an invariant that includes post-deployment writes, this failure would be invisible to any SQL syntax checker, migration runner, or forward-only test suite.

**Test coverage:** `unsafe snapshot rollback -- post-deployment order 204 is lost` (9 assertions). Each assertion is tied to a specific field in the `CheckResult` evidence so any regression is immediately attributable to a precise contract change.

### Finding 2 -- Additive candidate satisfies all 10 checks

`down.candidate.sql` is `SELECT 1;` -- a deliberate no-op that retains the expanded schema and all current data. After executing it, the invariant projection returns the same 4 rows as before. The `sameRows` comparison in the engine confirms multiset equality (including order 204 with exact `total_cents`). The candidate report status is `passed`.

**Test coverage:** `additive candidate rollback -- order 204 is preserved` (8 assertions including explicit `sameRows` comparison and per-order value checks).

### Finding 3 -- Both contracts use identical query contracts and invariant

The unsafe and candidate contracts share the same `oldReadSql`, `newReadSql`, `newWriteSql`, `oldWriteSql`, and `invariantSql`. This is the correct approach: switching to a weaker invariant or different query fixture to make a candidate pass would be invalid. Tests verify field equality between both contract objects before either is rehearsed.

**Test coverage:** `generated contract reflects source queries and SQL files` (10 assertions) and `invariant and query contract identity across unsafe and candidate` (11 assertions including cross-report baseline evidence comparison).

### Finding 4 -- Engine rejects invariant narrowing as an escape hatch for this fixture

Two tests attempt to hide order 204 from the invariant to manufacture a passing preservation check. In both cases the engine's `post-deploy` checkpoint fires first: it requires that a post-deploy write **changes** the invariant projection. A narrowed invariant that excludes order 204 (using `WHERE id < 204` or `WHERE id <= 203`) means the `newWriteSql` insert becomes invisible to the projection, so the post-deploy check fails with "Post-deploy writes do not change the invariant projection." The overall report remains `blocked`. This result is specific to the fixture used: the conclusion holds for any invariant that excludes the post-deploy write row.

**Test coverage:** `engine boundary: weakened invariant cannot rescue a blocked plan` (2 assertions).

### Finding 5 -- Old reader and writer compatibility

Both the unsafe and candidate schemas leave the old application's `SELECT id, customer, total_cents FROM orders` and three-column `INSERT` working without modification. The `old-reader` and `old-writer` checks pass on both contracts. The `old-after` check also passes on both: after rollback (of either kind), the old application can still read and write. This confirms the release is backward-compatible at the schema level for the declared queries.

**Test coverage:** checked in `invariant and query contract identity` suite.

### Finding 6 -- Redo (re-migration) works on both paths

The redo check reapplies the migration on the same `rollbackDb` after rollback, then runs the new reader. The candidate uses `ADD COLUMN IF NOT EXISTS`, so its retained column does not prevent reapplication. The unsafe rollback renames `orders_before_release` back to `orders`, freeing the snapshot table name. Its forward migration can therefore create the snapshot again. Both redo checks pass, but this does not undo the unsafe plan's previously detected loss of order 204.

---

## Limitations

The following are **not** covered by the generated contract or these tests, per the explicit scope in `docs/BUILD-BRIEF.md` and `examples/checkout-app/RELEASE-PLAN.md`:

1. **Concurrent writes during rollback.** The rehearsal uses a single-connection PGlite instance. Production rollbacks may interleave with application traffic. The engine "cannot establish production concurrency/locking safety" (`docs/SECURITY.md`). Row-level locking, serialisation anomalies, and any other concurrency behaviors are not exercised.
2. **Application-layer HTTP validation.** The `service.ts` HTTP layer validates request bodies before they reach SQL. Malformed `status` values, missing fields, and HTTP error codes are not represented in the contract.
3. **`status` column semantics beyond `pending`/`paid`.** The invariant projection is `SELECT id, customer, total_cents FROM orders` -- it does not include `status`. A change from `paid` to `pending` while preserving `id`, `customer`, and `total_cents` would be invisible to this invariant projection. The business rule "a paid order must remain paid after rollback" is **not** proven by this contract.
4. **PGlite vs. production PostgreSQL.** PGlite is a WASM build of PostgreSQL. The engine contacts no production database and cannot establish production concurrency or locking safety (`docs/SECURITY.md`). Behaviors specific to the production environment are not exercised.
5. **The `repair` field requires independent rehearsal to verify.** The CLI `--repair` flag and the UI "Apply and rehearse" button both merge the patch fields and trigger a new run; the patch is not trusted until that run completes. Running the candidate contract separately (as done in these tests) is an equivalent verification path.
6. **Test suite timeout budget.** Tests run with a 60-second `beforeAll` budget. The 30-second production worker timeout documented in `docs/SECURITY.md` is enforced by the CLI child process, not within Vitest.
7. **No coverage of the Express account server, session ownership, or SQLite storage.** These are isolated to `server/` which is explicitly out of scope for this review task.

---

## Verdict

The source-to-contract generation is faithful: contract SQL is derived directly from `queries.ts` and the SQL files with no manual editing. The rehearsal engine correctly identifies the silent data loss in the unsafe plan and confirms the candidate repair satisfies all 10 checks using the same invariant and query fixtures. The invariant-narrowing escape hatch is closed for the tested fixture: any invariant that excludes the post-deploy write is caught at the post-deploy checkpoint, not allowed to silently pass preservation. These tests constitute executable, inspectable evidence of the workflow's correctness for the declared checkout-app scenario.
