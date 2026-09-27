# Measured execution and workflow scope

## What was actually measured

Two CLI invocations of the original synthetic checkout snapshot scenario, one before and one after applying the supplied repair. Each invocation used the same rehearsal engine as the browser. These are individual observed runs, not a benchmark distribution or a customer productivity study.

| Observation | Unsafe contract | Supplied repair |
|---|---:|---:|
| Engine duration reported by CLI | 2,810.96 ms | 2,808.79 ms |
| Checks executed | 10 | 10 |
| Checks passed | 9 | 10 |
| Data-preservation check | Failed | Passed |
| Invariant rows before rollback | 4 | 4 |
| Invariant rows after rollback | 3 | 4 |
| CLI exit status | 1, blocked | 0, passed |

The unsafe rollback SQL itself succeeds. Order 104, inserted after deployment, disappears from the invariant result. The repair retains the compatible expanded schema and all four projected rows survive unchanged.

Evidence: `submission/cli-blocked-report.json` and `submission/cli-repaired-report.json`. Reports include timestamp, contract SHA-256, per-check SQL and engine duration. The hash identifies input, not independently attested execution.

Environment: macOS/Darwin arm64, Node.js v22.16.0, PostgreSQL through PGlite 0.3.16. Recorded September 27, 2026. One invocation per condition, synthetic data. Durations cover the engine's measured interval and exclude CLI startup, installation, contract authoring, developer review and repair preparation. They should not be compared with the browser recording's separate measured timings.

## Reproduce

```sh
npm ci
npm run rehearse -- demo:snapshot --out=blocked.json
# Expected exit 1, preservation fails: four rows become three.

npm run rehearse -- demo:snapshot --repair --out=repaired.json
# Expected exit 0, ten checks pass, all four projected rows survive.
```

Timing varies by machine and runtime. Check the result semantics rather than expecting these exact durations.

## Auditable workflow comparison

For the narrow data-preservation review, a manual recipe has eight recurring operations:

1. Prepare a fresh database with the baseline schema and synthetic rows.
2. Apply the forward migration.
3. Execute a representative post-deployment write.
4. Query and retain the invariant projection before rollback.
5. Execute the rollback plan.
6. Query the same projection afterward.
7. Compare every projected value, retaining duplicate rows.
8. Save the statements and comparison as review evidence.

Once a release contract is authored, one `npm run rehearse` invocation repeats these operations and the compatibility/redeployment checks, then writes a report. This is a description of the automated workflow: eight listed review operations versus one repeat-run invocation. It is **not** eight measured clicks, an eightfold speedup, or a measured reduction in developer effort. A manual workflow can itself be scripted, and authoring a strong contract takes work.

## What remains unmeasured

Contract setup time, manual review time, repeated-run distributions, defect discovery on customer systems, incident reduction, user retention, and willingness to pay. A pilot should track contract authoring separately from repeat reviews and record false positives as well as useful findings. Do not substitute engine runtime for a claim that development became a specific percentage faster.
