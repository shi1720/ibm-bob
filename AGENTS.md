# UndoProof contributor context

UndoProof rehearses database rollback plans using real embedded PostgreSQL (PGlite). Product owner: Shivam Gupta. Read README.md, docs/BUILD-BRIEF.md and docs/SECURITY.md before changing behavior.

## Commands
- `npm ci`
- `npm test` — real PostgreSQL engine and HTTP/CLI regression tests
- `npm run build` — strict TypeScript plus production browser build
- `npm run test:e2e` — production browser flow
- `npm run rehearse -- demo:snapshot --out=blocked-report.json` — expected exit1
- `npm run rehearse -- demo:snapshot --repair --out=repaired-report.json` — expected exit0

## Boundaries
- src/engine is shared by browser worker and CI process. It must never connect to a production database or execute a shell command.
- Preserve data and SQL fidelity. Do not replace PostgreSQL with mocked verdicts. Evidence comparisons must preserve duplicates, decimal/bigint precision and timestamp microseconds.
- Read contracts and invariants run read-only. A failure or skipped required check blocks the plan. Timeouts must never yield a passing report.
- Keep original failed evidence; do not weaken invariants to make a candidate repair pass.
- Account reports are client-supplied evidence, not server-attested results. Enforce ownership and avoid writing private history to shared guest storage.
- No secrets, real customer data, personal data, or copied proprietary source in fixtures.
- A passing contract does not prove production locks, concurrency, extensions or unrepresented application semantics.
- Format changes with Prettier. Add regression tests for behavior changes.

## Bob workflow and provenance
Use docs/BOB-WORKFLOW.md for source-to-contract and failure-driven repair tasks. Only attribute completed, inspectable work to Bob. Save genuine task-summary screenshots in bob_sessions. Do not reconstruct UI, invent Bobcoins, invent benchmark savings, or call a manual handoff an autonomous API integration.
