# UndoProof
### Your release passed. Will your rollback?

**Executable PostgreSQL rollback rehearsals, built by Shivam Gupta with IBM Bob.**

A migration adds an order-status column. The new checkout works. Then the release is rolled back by restoring a pre-release table snapshot. The rollback command succeeds. The latest customer order has disappeared.

UndoProof catches that failure **before deployment**. It runs your SQL contracts in disposable PostgreSQL databases, tests old and new application queries, writes data after deployment, executes the rollback plan, and compares exact business-data results. A green forward test is only the beginning.

## Try it

Requires Node.js 22.12+ and npm. No Docker, cloud database, AI API key, or production credentials needed for a rehearsal.

```sh
npm ci
npm run dev
```

Open the printed localhost address. Select **The disappearing order**, run the rehearsal, inspect the failed data-preservation evidence, review the candidate repair, apply it, and rerun. The repair keeps a backward-compatible additive schema when reverting the application.

For the complete account-enabled application:

```sh
npm run build
npm start
```

Open http://localhost:3001. Register an account, run rehearsals, and keep private run history in SQLite. For development with accounts, run `npm run server` and `npm run dev` in separate terminals. Guest rehearsals run locally in your browser; signing in enables server persistence. Reports uploaded by the browser are client-provided evidence, not independently attested CI results.

## The release contract

Import a JSON file or edit the built-in examples. Each contract contains:

| Field | Purpose |
| --- | --- |
| `seedSql` | Create the baseline schema and original synthetic data |
| `upSql` | Apply the proposed migration |
| `downSql` | Execute the actual rollback plan; this can retain additive schema |
| `oldReadSql`, `oldWriteSql` | SQL used by the previous application version |
| `newReadSql`, `newWriteSql` | SQL used by the new application version |
| `invariantSql` | Select the canonical business rows that must survive rollback |

Use explicit stable columns in `invariantSql`, including identifiers and all values you need preserved. An aggregate such as `COUNT(*)` alone cannot detect altered values. Query success proves only that the supplied SQL executes; add SQL assertions for domain semantics. An untested application path remains untested.

The examples are original, synthetic checkout fixtures. They include snapshot data loss, incompatible column rename, and a safe additive expansion. They contain no customer or personal data.

## A CI gate using the same engine

```sh
npm run rehearse -- demo:snapshot --out=blocked-report.json
# exit 1: rollback destroys a newly inserted order

npm run rehearse -- demo:snapshot --repair --out=repaired-report.json
# exit 0: old/new contracts pass and post-deploy data survives

npm run rehearse -- examples/your-release.json --out=evidence.json
```

Exit codes: **0** all checks passed; **1** release blocked; **2** invalid input, engine error, or timeout. JSON evidence records check results, SQL errors, before/after rows, runtime, and a contract SHA-256. The hash binds the report to its input; it is not a cryptographic attestation of execution. The included GitHub workflow exercises both passing and deliberately blocked release gates.

## IBM Bob workflow

1. Give Bob the migration, both application versions, and your rollout document.
2. Ask it to produce a release contract following `docs/BUILD-BRIEF.md` and the examples.
3. Execute the contract in UndoProof; export the failed evidence and repair prompt.
4. Give the evidence to Bob. Review its candidate migration or application changes.
5. Rehearse again. Keep the exact report with the PR.

Bob is the development and repair partner; deterministic PostgreSQL execution decides the gate. Built-in sample repairs are explicit authored examples, not live model calls. Custom repairs use the exported Bob prompt. See `bob_sessions/` for actual IDE evidence and `docs/BOB-WORKFLOW.md` for repeatable prompts.

## Architecture

```text
Release contract JSON
        |
        +-- React workspace --> disposable browser Worker --+
        |                                                   |
        +-- CI CLI ----------> timed child process ----------+--> PGlite PostgreSQL
                                                                    |
                          checks + before/after data <---------------+
                                      |
                          local history / evidence export
                                      |
                       optional authenticated Express API
                               SQLite private history
```

The engine creates independent databases for compatibility checks, preventing one expected failure from contaminating another. A chronological rollback branch runs `seed → up → new writes → invariant → down → invariant → old read → redo`. Browser workers and CLI children are terminated after 30 seconds. Browser SQL never reaches an external database.

## Scope and trust boundary

UndoProof is a working release-rehearsal product with tested account isolation and real PostgreSQL execution. It is **not a production-safety certification**. PGlite is embedded PostgreSQL compiled to WebAssembly, with a single connection. It does not reproduce production concurrency, lock contention, all extensions, privileges, replication, data volume, or application HTTP behavior. Run separate staging and load tests for those risks. Synthetic fixtures and SQL contracts must represent your important paths.

The browser engine has no network database connection. Inputs and output are size bounded, but a Web Worker is a responsiveness boundary, not an OS security sandbox. Use trusted synthetic SQL. Local history and downloaded evidence may contain supplied SQL and data. Account storage is optional. Never import production credentials or personal data.

## Quality checks

```sh
npm test
npm run build
npm run rehearse -- demo:safe
npm run test:e2e
```

See `docs/VALIDATION.md` for actual verification results and limitations. Dependency licenses remain their respective owners' licenses; our original code and fixtures use MIT.

## Submission

- `submission/` — pitch deck, PDF, written statements, video script and recording assets
- `bob_sessions/` — genuine Bob IDE task-summary screenshots
- `docs/MARKET-RESEARCH.md` — competitors and commercial assumptions
- `docs/BUILD-BRIEF.md` — product and technical design

Created for the IBM Bob 2.0 Hackathon, September 25–27, 2026. Project creator and product direction: **Shivam Gupta**. AI-assisted development contributions are documented rather than presented as independent human authorship.
