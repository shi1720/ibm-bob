# Verification record

Executed September 27, 2026 on macOS arm64 / Node 22.16.0, unless noted otherwise. This is a record of observed checks, not a production safety certification.

## Verified locally

- Clean `npm ci --no-audit` completed successfully from the lockfile.
- Strict TypeScript and production Vite build passed.
- 34 automated tests passed after updating Vitest to 4.1.11: 9 core engine, 9 real HTTP server, 11 independent adversarial engine/CLI tests, and 5 runnable checkout HTTP/source-contract tests.
- Core examples execute real PostgreSQL: unsafe snapshot restore blocks despite successful forward/rollback SQL; repaired additive application rollback passes; renamed-column compatibility fails and the expanded alias repair passes.
- Independent tests cover original-data deletion during forward migration, side-effecting invariants including temporary sequences, duplicate-sensitive comparison, nonfinite floats, timestamp microsecond fidelity, large integer/decimal fidelity, failed baselines, invalid SQL and CLI process/output failures.
- HTTP integration covers account registration/login, session rotation/expiry, per-user history isolation, origin rejection, request-size limits, rate limiting, SQLite persistence, production secure cookies and cascading account deletion.
- Production browser tests cover real blocked→repair→passed behavior, highlighted missing row 104, contract import/edit/validation, evidence export/history, responsive layout, optional account explanation, a real 30-second SQL timeout, and 10,000-row evidence with a 100-row display preview.
- Account browser test covers signup, private reports not entering guest storage, mobile signout, login persistence, wrong-password deletion rejection, correct deletion and guest-history retention.
- Live public demo smoke test executes the actual deployed WASM/data assets, runs blocked→repaired→passed, inspects row 104 and exports evidence. No browser/network errors were observed in either live smoke. Final evidence is in submission/media/public-smoke-result.json and public-demo.png.
- `npm audit` reports 0 vulnerabilities across production and development dependencies after the Vitest advisory fix. This is a point-in-time package audit, not proof of absence of vulnerabilities.

## Measured example

See submission/IMPACT.md and its paired JSON reports. Each is one local CLI measurement, not a controlled benchmark or productivity study. We did not measure a human baseline or claim a percentage time saving. Contract-authoring, review and broader staging checks remain real work.

## Delivery checks

- GitHub repository is public.
- Initial GitHub test/rehearsal and Pages workflows completed successfully.
- Public browser demo responds over HTTPS at https://shi1720.github.io/ibm-bob/.
- Real screen-only MP4 is 126 seconds; no narration is claimed.
- Presentation and PDFs were rendered and visually inspected; editable slide objects retained.
- Genuine Bob task evidence and completed Bob contribution remain pending Mac unlock/service recovery; no screenshots or authorship have been fabricated.

## Remaining limits

Docker build and runtime smoke passed in GitHub Actions run 36292112366: the nonroot container served both health and application routes. This exercised development cookie mode; production HTTPS termination remains an operator responsibility. Managed public cloud accounts, email verification/recovery, billing, organizations and operational monitoring are not implemented. The full self-hosted app provides tested individual accounts. Public Pages provides the complete guest rehearsal engine.

PGlite is a single-connection embedded PostgreSQL environment. The result covers supplied SQL contracts and fixture projections, not production concurrency, lock timing, extension parity, privileges or all application behavior. See docs/SECURITY.md and docs/CONTRACT-AUTHORING.md.
