# The Bob → evidence → repair loop

UndoProof is designed to make AI-assisted release work auditable. Bob reasons about the repository and rollout document; actual PostgreSQL executes the proposed contract.

## 1. Understand a real migration

Paste into IBM Bob Agent mode with your repository open:

> Read the migration and rollback files, the old and new database callers, and the release/runbook document. Identify the rollback promise and its business invariants. Create a synthetic, minimal ReleaseContract JSON using UndoProof's examples/contracts.ts as the schema reference. Include representative old/new reads and writes, actual up/down SQL, seed fixtures and a canonical invariant projection including primary keys and relevant values. Do not include secrets, production data or personal data. Explain paths you could not cover. Do not claim success until the contract has run.

## 2. Rehearse

Import the generated contract into UndoProof, or run:

```sh
npm run rehearse -- release-contract.json --out=release-evidence.json
```

Attach the evidence to Bob. The UI also exports a repair prompt containing the contract and checks. This is a user-triggered handoff; UndoProof has no hidden model calls.

## 3. Repair against the evidence

> Read release-evidence.json and the migration/application files. Identify the precise failed compatibility state or changed business rows. Prefer a compatible expand/contract rollout and application rollback that preserves post-deployment writes. Produce a minimal reviewable patch, update the contract to represent the true changed application behavior, and run the rehearsal. Do not weaken or remove the invariant to make the gate pass. Explain remaining production risks including concurrency/locking. Keep the original failed evidence and the repaired report.

## 4. Independent review

> Review the patch and both rehearsal reports. Check whether the tests match actual application SQL and rollback documentation, whether the invariant covers all business-critical values, whether the repair preserves both old and new writers, and whether new data survives. Flag omitted states and overclaimed guarantees. Treat passing SQL contracts as limited evidence, not a guarantee of a safe production deployment.

## Evidence capture

In Bob IDE, Tasks → relevant task → task header → consumption summary. Save genuine PNG screenshots under bob_sessions with descriptive filenames. Record the code files contributed by the task and resulting test execution. Include all relevant tasks for each participant. Never reconstruct or fabricate a summary screenshot.
