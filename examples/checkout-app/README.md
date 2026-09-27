# A real checkout service behind the release contract

This sample is an executable Express application with old and new query contracts, not another hand-copied JSON scenario. `GET /orders` reads actual PGlite rows; `POST /orders` validates and inserts an order using driver parameters. The contract generator imports **the same query constants used by the HTTP handlers**, binds reviewed synthetic parameters using SQL `PREPARE`/`EXECUTE`, and reads the actual migration files.

It is a deliberately small synthetic service for learning and testing. It binds to loopback only, needs no account, and resets its in-memory database whenever restarted. Do not expose it publicly or insert real personal/customer data. UndoProof's main application and private workspace server are separate.

## Five-minute source → evidence → patch path

Run these commands from the repository root after `npm ci` (Node 22.12+).

### 1. Exercise the application

```sh
npx tsx examples/checkout-app/index.ts
```

In a second terminal:

```sh
curl http://127.0.0.1:3002/orders
curl -X POST http://127.0.0.1:3002/orders \
  -H 'Content-Type: application/json' \
  -d '{"id":204,"customer":"Synthetic post-deployment customer","total_cents":34900,"status":"paid"}'
curl http://127.0.0.1:3002/orders
```

You should see the new order alongside three original synthetic orders. The new application writes the additive `status` column. Stop the service with Ctrl-C when finished.

### 2. Generate the contract from that source

```sh
npx tsx examples/checkout-app/build-contract.ts
npm run rehearse -- examples/checkout-app/generated/unsafe.json --out=examples/checkout-app/generated/unsafe-report.json
```

The rehearsal **should exit 1**. Forward deployment works and the rollback SQL executes, but order 204 disappears after `sql/down.sql` restores the pre-deployment snapshot. The JSON report preserves actual before/after rows. You can also import `generated/unsafe.json` into the UndoProof browser UI and inspect the same sequence.

### 3. Review the actual migration patch

Read `sql/up.candidate.sql` and `sql/down.candidate.sql` alongside their unsafe counterparts. The candidate removes the snapshot dependency, keeps the compatible column and its default, and makes application rollback non-destructive. It changes the recovery plan, not the evidence invariant or either application's queries.

This is an explicit authored candidate, not a live AI-generated repair. For a custom change, edit the migration files and rerun the generator; the generator does not infer a correct invariant from arbitrary repositories.

### 4. Regenerate and require the corrected release to pass

```sh
npx tsx examples/checkout-app/build-contract.ts --candidate
npm run rehearse -- examples/checkout-app/generated/candidate.json --out=examples/checkout-app/generated/candidate-report.json
```

This should exit **0** with all checks passed. The invariant, read queries, synthetic write parameters and seed are identical to the failed run. Order 204 remains. `generated/unsafe-report.json` and `generated/candidate-report.json` are actual execution evidence, not preassigned outcomes.

### 5. Check old application compatibility against the patched schema

```sh
APP_VERSION=old SCHEMA_VERSION=candidate npx tsx examples/checkout-app/index.ts
```

In another terminal:

```sh
curl -X POST http://127.0.0.1:3002/orders \
  -H 'Content-Type: application/json' \
  -d '{"id":205,"customer":"Synthetic legacy checkout","total_cents":12900}'
curl http://127.0.0.1:3002/orders
```

The old application need not supply or understand the new status column. This starts a fresh sample database; the automated rehearsal is what exercises the complete chronological write→rollback sequence in one database.

## Source-to-contract map

| Source                       | Used by the HTTP service                         | Used by the generated contract                     |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `queries.ts: oldQueries`     | Old-version GET/POST parameterized queries       | `oldReadSql`, `oldWriteSql`                        |
| `queries.ts: newQueries`     | New-version GET/POST parameterized queries       | `newReadSql`, `newWriteSql`                        |
| `queries.ts: fixtureWrites`  | Same parameter positions as real request bodies  | Reviewed synthetic values bound by PREPARE/EXECUTE |
| `queries.ts: orderInvariant` | Explicit release business promise                | `invariantSql`                                     |
| `sql/seed.sql`               | Initial in-memory database contents              | `seedSql`                                          |
| `sql/up.sql`                 | `SCHEMA_VERSION=deployed` startup migration      | Unsafe `upSql`                                     |
| `sql/down.sql`               | Operational rollback proposal, not an HTTP route | Unsafe `downSql`                                   |
| `sql/up.candidate.sql`       | `SCHEMA_VERSION=candidate` startup migration     | Candidate `upSql`                                  |
| `sql/down.candidate.sql`     | Patched operational rollback proposal            | Candidate `downSql`                                |

`APP_VERSION` accepts `old` or `new` (default `new`). `SCHEMA_VERSION` accepts `baseline`, `deployed`, or `candidate` (default `deployed`). `SAMPLE_PORT` defaults to 3002. For example, a new application against `baseline` deliberately returns an incompatible-schema error.

The business invariant covers order IDs, customers and money. It deliberately does not assert the new status field as an old-application contract. A production rollout may need additional status invariants and application-level tests. Tests of HTTP validation are separate from SQL-contract compatibility.

## Verification

```sh
npx vitest run tests/sample-app.test.ts
```

Tests exercise old/new HTTP endpoints, old writers on the migrated schema, parameterized quoting, invalid bodies and duplicates, a deliberately incompatible schema, source-derived contracts, and actual unsafe/candidate rehearsals. No production service or paid API is involved.

Suggested root package scripts (equivalent to the commands above):

```json
{
  "sample:checkout": "tsx examples/checkout-app/index.ts",
  "sample:contract": "tsx examples/checkout-app/build-contract.ts"
}
```
