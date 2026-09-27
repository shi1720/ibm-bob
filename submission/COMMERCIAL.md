# UndoProof commercial thesis

## Customer and purchase trigger

The first user is a developer preparing a schema migration pull request. The likely buyer is the platform or engineering lead at a B2B SaaS company with roughly 10-100 engineers, a relational database, and regular deployments. This is a targeting hypothesis, not a measured market segment.

The trigger is concrete: a migration changes stored data or the contract between application versions. A reviewer needs evidence that rolling the application back will still work and that writes made during the new release will survive. UndoProof fits into that review instead of requiring a new production service.

## Value hypothesis

A useful release gate should reduce the repeated manual work of building fixtures, applying migration steps, trying previous query contracts, comparing records, and attaching evidence to a review. The prototype demonstrates those operations on synthetic examples. `submission/IMPACT.md` records one unsafe and one repaired CLI execution, with measured engine duration and a reproducible workflow comparison. These measurements exclude contract authoring and human review. We have not claimed customer incident reduction, measured willingness to pay, or a percentage productivity gain.

Validation plan: interview five platform leads about their last migration rollback, give three teams a local runner for a real non-sensitive migration, and measure configuration time, false-positive rate, useful defects found, repeat weekly usage, and paid pilot intent. Compare the same review task manually and with UndoProof. Publish sample size and environment with any timing claims.

## Proposed packaging

| Offering | Proposed price | Purpose |
|---|---:|---|
| Local runner and GitHub Action | Free, MIT | Individual use, transparent execution, repeatable CI checks |
| Team workspace | $99/month per team | Shared policies, retained evidence and multi-repository reporting |
| Private deployment | Discuss after pilots | Customer-owned runners, access controls, retention and support |

Prices and paid features are hypotheses. No paid tier, customers, revenue, or enterprise readiness is implied by the hackathon implementation. Current account functionality stores personal run history on the self-hosted server. Shared team policy, approvals and organization collaboration are proposed features, not the current product.

The execution core uses embedded PostgreSQL and deterministic SQL, so each rehearsal requires no paid model inference. Local runs use the developer's compute. Hosted unit economics must include hosting, storage, authentication operations, support, and any future runner isolation. A browser-only demo does not establish SaaS hosting costs.

## Differentiation and honest competitors

| Product | Existing capability | UndoProof's proposed focus |
|---|---|---|
| Atlas | Computed down migrations and destructive-change prechecks | Execute supplied old/new query contracts and verify data written after the forward migration |
| Liquibase | Migration management and update-testing-rollback | Present application compatibility and customer-visible row preservation as a reviewable evidence packet |
| Flyway | Migration management, governance and rollback capabilities | A small local rehearsal layer that can eventually consume existing migration tooling |
| strong_migrations | Detect dangerous schema operations and describe safer deployment patterns | Show a reproducible failure using the project's specific fixture and query contracts |
| LaunchDarkly migration flags | Control staged migrations in running systems | Verify a planned release contract before production |

UndoProof complements mature migration systems. The credible claim is a focused workflow and interface, not invention of rollback testing. Integrations with these products are future work unless separately demonstrated.

Sources, checked September 27, 2026:

- [Atlas down migrations](https://www.atlasgo.io/versioned/down)
- [Liquibase update-testing-rollback](https://docs.liquibase.com/secure/reference-guide-5-1-1/init-update-and-rollback-commands/update-testing-rollback)
- [Flyway](https://www.red-gate.com/products/flyway/)
- [strong_migrations](https://github.com/ankane/strong_migrations)
- [LaunchDarkly migration flags](https://launchdarkly.com/docs/home/flags/migration)
- [PGlite](https://pglite.dev/docs/about)
- [PGlite single-connection behavior](https://pglite.dev/docs/pglite-socket)

## Defensibility and distribution

Distribution starts with an MIT repository, a working sample that exposes silent data loss, and a CI result a reviewer can understand in a minute. A developer should obtain a useful result before connecting a production system or buying anything.

Potential long-term differentiation comes from release-state adapters, organization-specific invariants, a growing library of failure scenarios, and a history of comparable evidence. These are future advantages to build, not an existing moat. Bob makes implementation and repair more accessible. It does not by itself create defensibility.

## Product boundaries

UndoProof executes supplied SQL contracts in embedded PostgreSQL through PGlite. It does not run an entire application, reproduce multi-process concurrency or production locking, or certify a release safe. SQL success is not sufficient to establish semantic correctness. Invariants and representative fixtures determine what can be learned. A successful report means only that the defined checks passed in the recorded environment.

The preferred recovery can be an application rollback that retains a compatible expanded schema. Destructive down migrations must never be treated as the default remedy. No production credentials or production data are needed for the demo. Real adoption requires users to design suitable fixtures and review the tested recovery plan.
