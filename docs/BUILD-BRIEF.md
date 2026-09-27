# UndoProof — prove the way back
Owner: Shivam Gupta. IBM Bob 2.0 Hackathon, September 2026.

Problem: a database migration can pass forward tests and still break old application versions or destroy writes made after deployment when rolled back. We build executable evidence, not AI confidence scores.

Product: local-first PostgreSQL rollback rehearsal. Real PostgreSQL via PGlite (WASM), synthetic fixtures, no credentials, no production connection. Import/edit a release contract, run independent tests, inspect SQL/errors/data differences, export a JSON/Markdown evidence packet and Bob repair prompt. CI CLI must return failure on blocked releases. Browser worker for SQL isolates hangs from UI, 30-second termination. Explicitly limited to supplied SQL contracts, not full app E2E, concurrent transactions, production locks, full extensions or production parity.

ReleaseContract schema (shared, stable):
{ id:string, name:string, description:string, migrationName:string, seedSql:string, upSql:string, downSql:string, oldReadSql:string, newReadSql:string, newWriteSql:string, oldWriteSql:string, invariantSql:string, repair?:{summary:string, upSql:string, downSql:string, newWriteSql?:string, oldWriteSql?:string, newReadSql?:string, oldReadSql?:string, invariantSql?:string}, tags:string[] }
Invariant SQL selects canonical customer-visible rows; compare baseline+new writes BEFORE down vs AFTER down. For differing schema use stable projection via common retained columns. Report both preexisting rows and postdeploy data. Each SQL read contract success is not sufficient to prove semantics; contract assertions should be considered.

RunReport schema:
{ id:string, contractId:string, contractName:string, startedAt:string, durationMs:number, engine:string, status:'passed'|'blocked'|'error', checks:CheckResult[], contractHash:string, summary:string }
CheckResult: {id:string,name:string,status:'passed'|'failed'|'skipped',durationMs:number,detail:string,sql?:string,error?:string,before?:unknown[],after?:unknown[]}
Minimum checks: baseline old read/write, forward migration+new read/write, old reader on migrated schema, old writer on migrated schema, rollback executes, old app after rollback, exact data preservation (new writes survive), redo migration after rollback. Independent fresh databases so expected failure doesn't contaminate unrelated checks. One chronological rollback branch: seed -> up -> newWrite -> invariant before -> down -> invariant after -> oldRead -> reapply up -> newRead. Baseline old write excluded from rollback branch.

Architecture: React+TS+Vite frontend; src/engine/types.ts shared; src/engine/rehearse.ts pure async core imports PGlite; src/engine/worker.ts browser wrapper; examples/contracts.ts sample fixtures. Node CLI uses same engine. Optional Express+SQLite account server for persisted private workspace, scrypt password auth, HttpOnly sessions, ownership isolation; no external paid service needed. Browser-only public demo runs real rehearsals, local storage clearly labeled; account features on full server deployment. Demo must work without account and no fabricated history/metrics.

Design: warm ivory canvas, ink typography, electric orange accent, precise editorial layout, left sidebar, top project context, a large release overview and interactive compatibility matrix, evidence drawer, SQL editor, run history, sample selector, repair preview, export buttons. Authentic measured runtime and check counts. No invented customer logos, numbers or unexecuted results.

Three original synthetic examples: destructive rename breaks old app; destructive restore loses post-deploy orders; additive expand migration is safe. Showcase snapshot rollback loss and repaired no-op down retaining additive column (explain rollback of app does not require destructive schema rollback).

IBM Bob must contribute meaningful implementation; preserve genuine task screenshots in bob_sessions. Do not fabricate evidence or Bob attribution.
