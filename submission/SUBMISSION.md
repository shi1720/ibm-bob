# UndoProof

## Project title
UndoProof: prove the way back

## Short description
A rollback can succeed and still erase new orders. UndoProof rehearses PostgreSQL migration plans, exposes lost writes, and verifies a reviewed repair with executable evidence before release.

## Problem & solution statement

A deployment can pass every forward test and still have no safe way back. A renamed column can break the previous application version. A rollback script that restores yesterday's table can quietly erase orders placed after today's deployment. The script succeeds, but the business loses data.

UndoProof improves the developer workflow between a migration pull request and release approval. A developer supplies a small release contract: synthetic seed data, forward and rollback SQL, old and new query contracts, representative writes, and a canonical data invariant. UndoProof executes the rehearsal in isolated PostgreSQL databases powered by PGlite. It checks compatibility with the previous application contract, exercises rollback after new writes, compares the customer-visible data, and attempts the migration again.

The interface connects each result to the executed SQL, database errors, and before-and-after rows. A developer can inspect the failure, export an evidence packet, and hand IBM Bob a repair prompt grounded in the actual contract and result. The supplied scenarios include a destructive rename, a rollback that loses new orders, and an additive migration. A repair preview makes the change reviewable before another run. The same engine supports a command-line release gate. IBM Bob added and ran 41 real PostgreSQL regression tests for source-derived contracts, data loss and unchanged repair invariants.

The key distinction is the data that arrives between deployment and rollback. Reversing a schema does not automatically preserve that data. UndoProof makes the missing check visible and repeatable. A safe application rollback can retain a compatible expanded schema instead of destructively reversing it.

Shivam Gupta created UndoProof for the IBM Bob 2.0 Hackathon. The initial commercial audience is a platform or engineering lead at a SaaS company that ships relational database changes regularly. An MIT local runner provides a low-friction starting point. Retained evidence, shared release policies, and private runners are the proposed paid offering, subject to customer validation.

The prototype uses original synthetic data and needs no database credentials or paid inference API for rehearsals. Results establish what happened for the supplied SQL contracts and fixtures. They do not establish full application behavior, production lock safety, concurrent transaction behavior, or complete production parity.

## IBM Bob usage statement

I used IBM Bob IDE in the UndoProof repository to validate the source-to-contract rollback workflow against a runnable checkout application and real PostgreSQL execution.

Bob inspected the checkout query definitions, migration files, generated contracts and shared rehearsal engine. It created `tests/bob-workflow.test.ts` with 41 regression tests. These verify that the contracts reflect the application source, the unsafe snapshot rollback loses post-deployment order 204 despite successful SQL execution, and the additive candidate preserves all four projected orders while keeping the same queries and invariant. The suite also checks old-application compatibility, migration reapplication and rejection of two invariant projections that hide the new order.

Bob corrected an initial missing test-hook import and reran all 41 tests successfully using PGlite. It wrote `docs/BOB-WORKFLOW-REVIEW.md` to explain the findings and the boundaries of the supplied fixtures. We reviewed its claims against the code and reran the broader suite. This was a concrete testing and review contribution to the release-validation workflow.

UndoProof also exports the exact contract and failed execution evidence as a manual Bob IDE repair handoff. The developer reviews a candidate change and reruns the deterministic PostgreSQL checks. This is a manual IDE workflow, not a live Bob API integration. Supplied sample repairs are authored examples.

Shivam Gupta owns the product direction, integration and submission. The project uses AI-assisted development; Bob's contribution is the inspected testing and review work described above, not authorship of the entire application.

## Technology and category tags

IBM Bob 2.0, PostgreSQL, PGlite, TypeScript, React, Vite, Firebase, SQL, developer tools, testing, release engineering, database migrations, CI/CD

## Platform
Firebase-hosted web application with Firebase Authentication, private Firestore history and a command-line rehearsal engine. An Express account server remains available for self-hosting.

## Solo team
https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon/undoproof

## Public repository
https://github.com/shi1720/ibm-bob

## Application URL
https://undoproof.web.app

Guest rehearsals run locally in the browser. The hosted app supports account creation, sign-in, password recovery, private evidence history and password-confirmed account deletion through Firebase. No database credentials or inference API key are required.

## Submission assets

- Editable slide deck: `submission/pitch.pptx`
- Slide PDF: `submission/pitch.pdf`
- One-page overview: `submission/one-pager.pdf`
- Recording script and shot list: `submission/VIDEO-SCRIPT.md`
- Commercial assumptions and competitors: `submission/COMMERCIAL.md`
- Required Bob task-summary folder (capture pending): `bob_sessions/`
- Actual 126-second silent screen recording: `submission/media/screen-demo.mp4`
- Cover: `submission/cover.png`
- Verified screenshots: `submission/media/`
- Measured CLI evidence and workflow comparison: `submission/IMPACT.md`
- Final narrated MP4: `submission/final-demo.mp4` (176.007 seconds, synthetic voice disclosed, captions burned in)
- Bob work capture: `submission/media/bob-verification-work.png`
- Required task consumption summary: still to capture in `bob_sessions/`

## Final checks

1. Capture the required genuine Bob task consumption summary. The work capture is not a substitute.
2. Recheck the public application URL and public repository from an incognito session.
3. Confirm the final MP4 is at most 180 seconds and shows the product operating for at least 90 seconds.
4. Keep both written statements below 500 words after edits.
5. Confirm slide links, screenshots and factual claims match the final build.
6. Submit using Shivam Gupta's registered hackathon account before 20:30 IST on September 27, 2026, according to the supplied event schedule.
