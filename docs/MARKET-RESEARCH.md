# IBM Bob hackathon product decision

Researched 2026-09-27. Recommendation: **ReturnSafe — rehearse the release, prove the way back.** Working names, not trademark checks. All pricing below is a hypothesis, not validated willingness to pay.

## Ranked shortlist

| Product | Pain / buyer | Concrete demonstration | Distinctive wedge | Risk |
|---|---|---|---|---|
| ReturnSafe | Platform leads cannot tell whether rolling back application code after a schema migration preserves availability and new writes | Forward tests pass; old application against new schema fails; rollback loses newly written values; expand-contract repair passes same executed checks | Executable *application + data + release-order* rollback evidence attached to a PR | Atlas and Liquibase already support migration rollback; must avoid pretending rollback testing itself is new |
| Redelivery Lab | SaaS developers ship webhook handlers that pass one-event tests but double provision, apply stale updates, or lose work on retry | Feed signed synthetic events; inject duplicate, reorder, and crash-after-write; show ledger invariant fail; Bob fixes transactional idempotency and replays | Deterministic adversarial schedules + business side effects, not HTTP status or delivery-only monitoring | Hookdeck, Stripe CLI, replay platforms and numerous new developer tools make this crowded |
| TenantFence | SaaS teams change authorization and accidentally expose another tenant's records | Run two tenant identities over same resource matrix; discover missing query filter; Bob repairs code; export regression and access matrix | Exercise actual endpoints plus tenant fixtures, not only isolated policy decisions | Security claims need care; auth integrations expand scope, existing policy tools have excellent matrix UIs |

## Why ReturnSafe wins this brief

It is a narrow developer workflow with a visible contradiction: **“The deployment passed. The rollback did not.”** A judge understands a lost order immediately. It invites Bob to do real repository reasoning, document understanding, test generation and a code repair; there is no need to invent an inference API or wrap a chat model in another chat UI. It has a complete loop: import release bundle → understand contract → execute baseline → expose failure → inspect trace → repair with Bob → rerun → export evidence / CI gate. Deterministic local execution makes the result reliable and near-zero marginal API cost.

A feasible core is a sample order service with two application versions, SQL migrations, synthetic order fixtures and a small release manifest. Execute real SQL in ephemeral SQLite databases initially, explicitly label SQLite scope; add PostgreSQL only if time and deployment permit. Use subprocess timeouts and isolated temp dirs. Do not call arbitrary uploaded code safe. Hosted demo can execute only bundled reviewed fixtures; local CLI can support trusted repos with a clear boundary. Auth protects a persisted workspace/run history.

### The killer case

Release renames `orders.total_cents` to `amount_cents`. New service and ordinary forward tests pass. During a rolling rollout, old workers still query `total_cents`: execution fails. A naive down migration can also discard fields introduced after deploy or coerce values incorrectly. ReturnSafe tests a compatibility matrix, performs representative new writes, then runs the reversal and compares business invariants. Bob reads the failed trace + rollout contract, implements expand/backfill/dual-write/contract steps, and produces regression tests. Demonstrate the same original input passing after repair.

Choose one mathematically honest bug for the three-minute video; do not pile hypothetical failures into a fabricated run. Record actual timings. A metric like “6 release states executed, 2 unsafe states identified” is stronger than an unmeasured “90% faster.” If claiming time saved, time a reproducible manual baseline and disclose sample size.

### Competitive truth

* [Atlas down migrations](https://www.atlasgo.io/versioned/down) dynamically compute downgrade plans and provide destructive-change prechecks. This is serious overlap. Differentiate on exercising application versions and data created *after* upgrade, not SQL reversal generation.
* [Liquibase rollback testing](https://docs.liquibase.com/secure/reference-guide-5-1-1/init-update-and-rollback-commands/update-testing-rollback) already tests update/rollback behavior. Do not say “nobody tests rollbacks.” Position as a release-level compatibility evidence layer that can ultimately orchestrate Liquibase/Atlas.
* [strong_migrations](https://github.com/ankane/strong_migrations) detects dangerous changes, including removal and renaming, and documents safe deployment sequences. ReturnSafe complements static guidance with an executed counterexample and repository-specific evidence.
* [LaunchDarkly migration flags](https://launchdarkly.com/docs/home/flags/migration) manage incremental system migration. ReturnSafe verifies a planned release before production; it does not replace traffic control.

### Commercial hypothesis

Initial buyer: engineering/platform lead at a 10–100 engineer B2B SaaS company using relational databases and frequent releases. Initial user: the developer whose schema PR is waiting for a senior reviewer. Trigger: every migration PR. Acquisition: MIT CLI plus GitHub Action; sample “rollback trap” repositories, useful PR reports. Paid workspace hypothesis: $79–149/month/team for retained evidence, multi-repo release policies, approvals, audit exports and customer-owned runners; enterprise later for SSO and private control plane. No payments implementation needed for hackathon, and no invented customers or revenue.

Moat is not the LLM. Potential accumulated advantage is a reusable library of release-state adapters, real failure recipes, organization-specific data invariants, and a history of verified release evidence. These are future defensibility hypotheses, not existing assets. Do not overclaim a formal proof: “passed these checks against this fixture and engine” is the correct result.

## Other concepts: evidence and differentiation

Redelivery Lab is technically feasible without a Stripe account using synthetic signatures and documented delivery semantics. [Stripe webhooks](https://docs.stripe.com/webhooks) document delivery behavior and verification. [Hookdeck](https://hookdeck.com/docs/deduplication) provides deduplication; [Speedscale](https://speedscale.com/) captures and replays production-shaped traffic; [Keploy](https://keploy.io/docs/) supports regression and DB validation tests. Wedge must be stateful business invariants under adversarial delivery schedules. Monetization $49–99/team CI suite hypothesis, weaker differentiation than ReturnSafe.

TenantFence could address actual endpoint enforcement across tenants, but [Cerbos playgrounds](https://docs.cerbos.dev/cerbos-hub/playground.html) already offer policy tests, traces, request simulations, and permission matrices. [Pact](https://docs.pact.io/getting_started/testing-scope) focuses on service communication contracts; [Schemathesis](https://github.com/schemathesis/schemathesis/blob/master/docs/guides/stateful-testing.md) supports linked stateful API tests. Better as a later release contract adapter than this hackathon's primary product.

Avoid a generic “incident to fix” agent: [Sentry Seer](https://docs.sentry.io/api/seer/start-seer-issue-fix/) already identifies root cause, proposes solutions, generates code changes and opens PRs. We need an executable specialized oracle, not another general repair assistant.

## Suggested video beats (under 180 seconds)

0–15: “Your release is green. At 2 AM you roll it back. Every new order breaks. We test the way back before you ship.”
15–35: Open release bundle and show actual migration, compatibility contract and synthetic orders.
35–85: Execute rehearsal. Forward state passes. Old-app/new-schema or reversal state fails. Show precise query, data diff and failed invariant.
85–120: Show authentic IBM Bob IDE task reading contract and failure report, implementing fix and tests; show session summary evidence.
120–155: Rerun same bundle using repaired revision. Show execution evidence and downloadable CI report.
155–175: “Built by Shivam Gupta. Start with the free local runner; teams pay for release policies and evidence history. Shipping faster matters. Being able to come back matters too.”

At least 90 seconds must show actual solution in action. Keep all attribution and Bob claims tied to real observed work and screenshots.
