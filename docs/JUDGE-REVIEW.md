# Skeptical submission review

Reviewed September 27, 2026, 03:21 UTC. This is an internal assessment of the repository and deliverables available at review time. Scores are subjective readiness scores, not predictions of judging results. The official criteria do not supply numerical weights; no weighted total is implied.

## Decision now

**Promising, differentiated developer-tool demonstration; not submission-ready yet.** The real SQL engine and evidence loop are substantially stronger than a simulated dashboard. The commercial case is plausible but unvalidated, and adoption effort is not yet demonstrated. Most critically, meaningful IBM Bob IDE work and its required genuine task summaries have not been established. At review time `bob_sessions/` is empty and the usage statement is explicitly unfinished. Bob recovery/API troubleshooting does not substitute for the required contribution. Treat this as an eligibility blocker, independently of any score below.

## Criteria

| Criterion | Current score / 10 | What earns credit | What holds the score down |
|---|---:|---|---|
| Application of technology | 5 | PGlite executes real PostgreSQL, independent branches avoid failure contamination, the same core powers browser and CI, and targeted tests cover precision and fail-closed behavior. | The required core technology, Bob IDE, lacks completed verifiable contribution/evidence. Exporting a prompt is useful but is not evidence of active Bob usage. No credit is assumed for planned work. |
| Presentation | 7 | The disappearing-order story is immediately understandable. Captured UI has clear hierarchy, readable evidence and an explicit scope boundary. A detailed timed narration exists. | No completed MP4 was present; final deck/PDF filenames listed in the submission did not yet exist; application URL remains a placeholder. The narration currently names Bob work that still needs verification. |
| Business value | 6 | Schema-review and rollback mistakes are concrete developer problems. Local execution avoids provisioning and per-run inference charges. The buyer and purchase trigger are specific. | No customer interviews, willingness-to-pay evidence, setup-effort measurement, or demonstrated workflow on a separate sample application. Users must prepare eight SQL fields. Proposed paid policies, team collaboration and private runners are future products rather than current capabilities. |
| Originality | 7 | The visible contrast—successful rollback SQL but missing post-deployment business data—is distinctive and stronger than a generic code assistant. Combining old/new query contracts with preserved writes gives the demonstration a clear focus. | Rollback testing and safer migration patterns already exist in the competitors documented by the project. Current defensibility is a focused execution/evidence experience, not a novel database capability or established moat. |

The engineering portion alone would merit more credit than the technology criterion's current score; the score is reduced because this is specifically an IBM Bob hackathon, not a general PostgreSQL tools competition.

## Three highest-value improvements besides Bob evidence

### 1. Demonstrate the second user's path, not only the author's scenarios

**Problem:** JSON import and editable SQL make the engine general, but the convincing demo is still centered on three authored checkout fixtures and supplied repair patches. A prospective user cannot yet see how much work it takes to apply UndoProof to their next migration PR.

**Action:** Include one small, separately structured target application: previous/new query files, migration and rollback files, a brief rollout document, synthetic seed data, and its release contract. Show exactly which source files each contract field represents. Walk through importing this contract, finding the defect, changing the actual migration, and rerunning the CLI. Prefer a distinct failure or domain so this is clearly more than renaming a built-in example.

**Acceptance evidence:** A fresh reviewer follows documented commands from source application to a blocked report and then a passing corrected report. The evidence files and source diff are preserved. No live AI integration claim is necessary. This would directly reduce the “beautiful three-fixture demo” objection and expose real onboarding friction.

### 2. Measure workflow effort, not just engine runtime

**Problem:** A two-to-four-second rehearsal proves fast execution, not that a developer review became faster. Preparing representative fixtures and a strong invariant could consume more time than the tool saves. The challenge explicitly asks for demonstrated impact.

**Action:** Publish a small reproducible workflow comparison for one specified migration: enumerate the manual steps to create the baseline, deploy, write new data, execute rollback, compare rows, and retain review evidence; compare with the repeatable contract/CLI path. If timing is performed, include contract setup time separately from repeat-run time, the number of repetitions, machine/environment, and who or what performed the baseline. Do not generalize one controlled exercise into a customer productivity percentage.

**Acceptance evidence:** A short impact table with honest measured values or auditable command/step counts, clearly labeled as a synthetic demonstration. The pitch should state what is observed and what remains a hypothesis.

### 3. Finish and simplify the judge's verification path

**Problem:** The package currently asks the reviewer to assemble a working demo and infer the status of draft artifacts. Accounts exist in the self-hosted server, while the public browser demo is guest-only. This is a sensible architecture but must be unambiguous.

**Action:** Put a verified public demo link first; provide a two-minute click path; finish the final deck/PDF and MP4; verify the 180-second limit and at least 90 seconds of actual operation; replace every submission placeholder. Link the exact blocked and repaired reports. Make the public-demo account modal point to an existing README anchor (`#try-it` or a dedicated self-hosting heading; the current `#quick-start` target does not match the README). Publish the validation document the README references.

**Acceptance evidence:** An incognito reviewer can run the unsafe example, inspect the lost row, review the repair, rerun, and export a report without signing in. Separate instructions start the authenticated server successfully. Every listed submission asset opens, and every narration claim matches visible evidence.

## Claims and wording to fix before submission

| Current claim or wording | Assessment | Precise replacement or action |
|---|---|---|
| README: “built by Shivam Gupta with IBM Bob” | Premature until actual Bob-assisted implementation/review is completed and recorded. | Keep the attribution only after verifying the contribution; name the actual files and task summaries. Do not fill the evidence gap with generated screenshots. |
| Video: Bob worked “on the rehearsal engine and its tests” | An evidence-dependent claim, not yet established by the available files. | Replace with the exact observed work once finished. A meaningful corrective patch plus real verification is more credible than claiming the whole engine. |
| “Prove the way back” | A useful headline but easily mistaken for a production guarantee. | Keep the adjacent scope statement prominent: evidence for the supplied SQL, fixture, invariant and recorded engine. The existing UI does this reasonably well. |
| “Exact business-data results” | Accurate only for the selected invariant projection; omitted columns and paths remain untested. | Prefer “exact values in the supplied invariant projection.” Do not imply complete application semantics. |
| README: inputs and output are “size bounded” | Input and API body limits exist, but query results are materialized before comparisons and not every read has an enforced output-byte ceiling. | State the specific limits: validated input lengths, checkpoint row caps and 30-second external termination. Retain the existing warning that this is not a hostile-SQL memory sandbox. |
| “Team workspace” at $99/month | Clearly marked as a hypothesis in the commercial document; retain that qualification. | Distinguish the current personal authenticated history from proposed multi-user policies, approvals and repository reporting. No paid team product exists yet. |
| Market research recommends “ReturnSafe” and an initial SQLite route | Historical brainstorming, inconsistent with the current product name and PostgreSQL implementation if presented as current architecture. | Label that document as an archived decision record or add a clear implemented-outcome note: UndoProof, PGlite, real PostgreSQL. |
| README references `docs/VALIDATION.md` and `npm run test:e2e` | Validation file was absent at this review; an advertised script is not evidence that the suite was configured and passed. | Create the evidence document with actual results; remove or qualify any nonfunctional verification command. |

## Commercial viability assessment

There is a credible narrow entry point: a developer wants a migration PR reviewed, and a reviewer wants a reproducible demonstration that a particular rollback promise holds. The local runner can provide value without paid infrastructure. The structured output can travel with a PR, which is a useful distribution surface.

The largest adoption risk is **contract authoring**. The user already has SQL migrations, but may not have old/new query contracts, representative synthetic writes, or a canonical invariant. An onboarding path that derives and then reviews those contracts is more valuable than adding another dashboard feature. The second risk is **scope fit**: teams with extension-heavy PostgreSQL, production lock concerns, or substantial ORM behavior will need additional runners and integration work. The product is a supplement to staging and existing migration tools, not a replacement.

The proposed buyer and pricing are reasonable hypotheses to test, not proof of a business. Private report storage alone is unlikely to establish the $99/month value proposition when teams can retain CI artifacts. Paid differentiation would need observed demand for shared policies, approvals, organizational evidence retention, or trusted runner integrations. Those are currently absent. The stated pilot plan is the right next validation step; do not present it as completed traction.

A three-fixture demo can still qualify as a working hackathon prototype. It does not meet the user's larger ambition of a commercially validated, publicly operated production SaaS. The repository is appropriately candid about identity recovery, monitoring, backups, runner trust and missing team controls. Preserve that honesty rather than relabeling the current application “enterprise-ready.”

## Product readiness gaps visible today

- Account deletion is implemented and tested at the API, but there is no discoverable account-settings/deletion flow in the UI. This is a usability gap, not a missing storage capability.
- Public guests cannot use accounts without self-hosting. The modal explains this; the submission should explain it before reviewers expect a hosted login.
- Custom contracts have a manual Bob prompt handoff. The product should continue to call this a handoff, not autonomous repair or a live Bob service integration.
- The invariant and read/write SQL determine coverage. Counts, weak projections and unrepresented application paths can still hide real bugs despite all executed checks passing.
- Current server persistence is personal history, not organization collaboration or independently attested release approval.
- Docker execution and a production hosting operation were not verified in this review. A Dockerfile and local auth tests are useful engineering evidence but are not an operations track record.

## Evidence consulted

Reviewed `README.md`, `docs/BOB-WORKFLOW.md`, `docs/BUILD-BRIEF.md`, `docs/MARKET-RESEARCH.md`, `docs/SECURITY.md`, submission statements/commercial thesis/Q&A/video script, workflow YAML, engine/CLI/frontend source, and the captured blocked-rehearsal UI. Confirmed the empty Bob screenshot directory and current draft/missing submission paths. Earlier in this session, independent real-HTTP and real-PGlite/CLI verification passed 20 targeted tests (9 server, 11 adversarial); that supports the tested behaviors, not every product or deployment claim.

This review should be revisited after the missing evidence and deliverables exist. Do not erase these findings merely because the remaining work is planned.
