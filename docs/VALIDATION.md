# Verification record

Updated September 27, 2026. Local execution used macOS arm64 and Node 22.16.0; GitHub Actions used its configured Linux/Node 22 environment. This records observed checks, not a production safety certification.

## Current automated verification

- `npm test`: 88 passing tests across six files. These include engine, HTTP server, adversarial engine/CLI, runnable checkout, Bob workflow and storage validation tests. Related test assertions must not be presented as independent customer migrations.
- `npm run check`: strict TypeScript passed. Production Vite builds passed locally and in CI.
- Guest production browser run: six passed. This covers real blocked-to-repaired-to-passed execution, missing row 104, import/edit validation, evidence exports, responsive layout, a real 30-second worker timeout, 10,000-row evidence with bounded previews, and corrupt guest-history recovery. Three account-specific tests were intentionally skipped in that guest-only run.
- Separate self-hosted browser run: two passed, covering mobile behavior, account registration/sign-in, private evidence isolation, password-confirmed deletion and guest-history retention.
- Deployed Firebase browser run: two passed, covering account lifecycle/private history and Firestore owner isolation, including rejected writes after account deletion begins. These validate the tested deployed rules and workflows, not every possible cloud configuration.
- Core rehearsals use real PostgreSQL via PGlite. Unsafe snapshot restoration blocks despite successful forward and rollback SQL; the additive candidate preserves the post-deployment order; incompatible rename contracts fail while their reviewed alias repair passes.
- Adversarial coverage includes original-data deletion, mutating invariants and read contracts, temporary-sequence side effects, precision preservation, duplicate-sensitive comparisons, invisible writes, invalid SQL, immutable repair invariants, and CLI worker/output failures. Required failures and timeouts never produce passing evidence.
- The API validates the same contract schema as the engine. HTTP tests cover account isolation, session rotation/expiry, origin enforcement, request-size limits, rate limiting, SQLite persistence, secure-cookie configuration and cascading deletion. Reports remain client-supplied and are not independently attested.

## Final code CI

Commit `5e168b5` passed all three jobs in [GitHub Actions run 36294246984](https://github.com/shi1720/ibm-bob/actions/runs/36294246984):

| Job       | Observed result                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------- |
| verify    | Tests, production build, safe CLI gate, repaired CLI gate and deliberately blocked unsafe gate passed |
| browser   | Guest browser workflows and self-hosted private-workspace browser check passed                        |
| container | Docker image built and served both health and application routes                                      |

The container includes the shared contract validator needed by the account server. The smoke test uses development cookie mode; production HTTPS termination remains an operator responsibility. [Pages deployment 36294246962](https://github.com/shi1720/ibm-bob/actions/runs/36294246962) also passed. Firebase is the primary hosted application and its deployment is tested separately from the Pages workflow.

## Hosted application

[UndoProof](https://undoproof.web.app) serves the actual PostgreSQL WASM engine over HTTPS. Guest rehearsals execute locally in the browser. Firebase Authentication and Firestore provide email/password accounts, password reset, private history and password-confirmed account deletion. Email ownership verification is not enabled. Public hosting does not require the alternative Express/SQLite server.

The deployed workflow has been exercised through blocked evidence, reviewed repair, passing result and export. Hosted authentication and Firestore isolation were tested as described above. Browser reports are client-supplied evidence in both hosted and self-hosted account modes.

## IBM Bob contribution

IBM Bob IDE authored `tests/bob-workflow.test.ts` and `docs/BOB-WORKFLOW-REVIEW.md`. Its 41 related test cases exercise real source-derived checkout contracts, post-deployment order loss, the additive candidate, query/invariant identity and invisible-write rejection. The contribution was inspected and the broader 88-test suite rerun. It is not evidence that Bob authored the whole application or that 41 independent production migrations were validated.

A genuine IDE work capture exists at `submission/media/bob-verification-work.png`. The required task consumption summary screenshot is still pending. A work capture must not be substituted for that specific event requirement.

## Presentation and delivery

- Public repository: [shi1720/ibm-bob](https://github.com/shi1720/ibm-bob).
- Presentation deck, slide PDF, one-pager and cover were rendered and visually inspected.
- The narrated MP4 is approximately 176 seconds, including 126 seconds of actual application recording. Voiceover is disclosed as synthetic Kokoro neural narration. Captions are burned in and supplied separately.
- Current duration, caption count, audio measurements and full-decoding status are recorded in [final-video-verification.json](../submission/media/final-video-verification.json). Consult this record for the current media export rather than assuming an earlier file size.
- Written claims distinguish the manual Bob handoff, reviewed sample repair and genuine Bob testing/review contribution. They do not invent adoption, customer data, commercial traction or percentage productivity savings.
- Public YouTube publication and final lablab.ai submission are not yet confirmed. Desktop/browser interaction is required to finish those steps. Local assets and passing tests are not a submission receipt.

## Measurements and limits

`submission/IMPACT.md` contains paired local CLI observations and an auditable operation comparison. Each is a synthetic demonstration, not a controlled productivity study. Contract authoring, review time and customer outcomes remain unmeasured.

PGlite is a single-connection embedded PostgreSQL environment. Results cover the supplied SQL contracts, fixture projections and recorded engine. They do not establish production concurrency, lock timing, extension parity, privileges or complete application behavior. The worker/CLI timeout is not a complete hostile-SQL memory sandbox.

Hosted individual accounts are implemented; organization policies, billing, operational monitoring, commercial backup/restore guarantees and customer validation are not claimed. See `docs/SECURITY.md`, `docs/CONTRACT-AUTHORING.md` and the dated final review in `docs/JUDGE-REVIEW.md`.
