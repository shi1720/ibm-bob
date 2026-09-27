# Judge questions and concise answers

## What is the actual workflow you improve?

The review of a database migration before release. A developer supplies a release contract, executes the compatibility and recovery checks, inspects the failing SQL or data difference, reviews a fix, and reruns the same checks. The CLI can make a failed rehearsal block CI.

## Isn't this already in Liquibase, Atlas or Flyway?

Those products already manage migrations and recovery. UndoProof focuses the review on the previous application's SQL contracts and data written after deployment. Its output makes an otherwise easy-to-miss rollback defect concrete. We see it as a complementary rehearsal layer, not a replacement for mature migration systems.

## Why does the snapshot example matter?

It separates successful SQL execution from correct business behavior. Restoring a pre-release table can execute without errors while discarding an order inserted after the snapshot. A reviewer needs a data invariant, not only a successful down script.

## Does UndoProof prove a production release is safe?

No. It provides evidence for the supplied SQL contracts and fixtures in embedded PostgreSQL. Full application behavior, production concurrency, lock contention, extensions and data volumes require additional testing. The name describes the workflow ambition. The report explicitly states its boundaries.

## What if someone supplies a weak invariant?

The result is only as useful as the contract. An invariant should select stable identifiers and all business values that matter. Count-only checks can miss changes. The engine rejects an empty checkpoint and a new-write step that does not change the invariant projection, but it cannot infer every omitted business requirement.

## Why use PGlite?

It executes PostgreSQL locally through WebAssembly without provisioning a server or asking for production credentials. That makes the browser demo and local runner accessible. It also imposes important limits, including single-connection behavior and lack of production infrastructure parity.

## Where is IBM Bob?

Bob IDE participates in development against the release-contract specification. The exact contribution and task summary screenshots appear in the final usage statement and `bob_sessions/`. UndoProof additionally exports a repair prompt containing the contract and actual failure evidence. This is a deliberate IDE handoff, not a hidden live API call. Confirm the final contribution wording before presenting.

## Are the example repairs generated live?

No. They are clearly supplied candidate repairs for the synthetic examples. A custom contract can export evidence to Bob for a new repair task. A reviewer should inspect the resulting change and rerun the contract.

## Who would pay?

Our initial hypothesis is a platform lead at a SaaS company that ships database changes regularly. The free local runner helps individual developers. Proposed paid value is shared release policy and retained review evidence across repositories. We have not validated pricing or claimed customers.

## What keeps costs low?

The rehearsal uses deterministic SQL execution on the user's compute and requires no paid inference API. A future hosted offering still incurs storage, support, runner and security costs. We need pilot usage before making unit-economics claims.

## Why not just restore a backup?

A backup is essential recovery infrastructure, but restoring an older snapshot can discard valid writes that arrived afterward. UndoProof exercises the specific recovery plan before release. It does not replace backups, point-in-time recovery, or operational runbooks.

## What's next?

Pilot on real, permissioned migration reviews. Measure setup effort, useful failures and repeat usage. Then add adapters to existing migration tools and independently executed CI evidence. Expansion should follow observed customer needs rather than a broad feature checklist.
