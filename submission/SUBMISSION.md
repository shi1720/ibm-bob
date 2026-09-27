# UndoProof

## Project title
UndoProof - prove the way back

## Short description
Rehearse PostgreSQL migrations before release. Find broken rollback paths and lost post-deploy writes, inspect executable evidence, and give IBM Bob a focused repair task.

## Problem & solution statement

A deployment can pass every forward test and still have no safe way back. A renamed column can break the previous application version. A rollback script that restores yesterday's table can quietly erase orders placed after today's deployment. The script succeeds, but the business loses data.

UndoProof improves the developer workflow between a migration pull request and release approval. A developer supplies a small release contract: synthetic seed data, forward and rollback SQL, old and new query contracts, representative writes, and a canonical data invariant. UndoProof executes the rehearsal in isolated PostgreSQL databases powered by PGlite. It checks compatibility with the previous application contract, exercises rollback after new writes, compares the customer-visible data, and attempts the migration again.

The interface connects each result to the executed SQL, database errors, and before-and-after rows. A developer can inspect the failure, export an evidence packet, and hand IBM Bob a repair prompt grounded in the actual contract and result. The supplied scenarios include a destructive rename, a rollback that loses new orders, and an additive migration. A repair preview makes the change reviewable before another run. The same engine supports a command-line release gate.

The key distinction is the data that arrives between deployment and rollback. Reversing a schema does not automatically preserve that data. UndoProof makes the missing check visible and repeatable. A safe application rollback can retain a compatible expanded schema instead of destructively reversing it.

Shivam Gupta created UndoProof for the IBM Bob 2.0 Hackathon. The initial commercial audience is a platform or engineering lead at a SaaS company that ships relational database changes regularly. An MIT local runner provides a low-friction starting point. Retained evidence, shared release policies, and private runners are the proposed paid offering, subject to customer validation.

The prototype uses original synthetic data and needs no database credentials or paid inference API for rehearsals. Results establish what happened for the supplied SQL contracts and fixtures. They do not establish full application behavior, production lock safety, concurrent transaction behavior, or complete production parity.

## IBM Bob usage statement - eligibility evidence pending

**Do not submit this section as a completed usage statement. Meaningful IBM Bob IDE work and the required genuine task-summary screenshots remain unverified.**

UndoProof currently exports a manual Bob repair handoff. It includes the exact release contract and actual execution evidence, including failed SQL and data differences. A developer can give that context to Bob IDE, ask it to inspect a repair against the repository, review the resulting changes, and rehearse again. This capability is not a live Bob API integration and does not itself establish active Bob IDE use.

The supplied scenario repairs are authored examples, not live AI generations. Do not attribute the rehearsal engine, tests, or repairs to Bob without actual task history establishing the contribution.

After a meaningful Bob task completes, replace this section with the exact observed work, name the code or documentation files it assisted, identify the validation performed, and link the genuine task session summary screenshots in `bob_sessions/`. Keep the final statement below 500 words.

Shivam Gupta owns the product direction, project integration, and submission. The project uses AI-assisted development. Final attribution must accurately reflect the captured work.

## Technology and category tags

IBM Bob 2.0, PostgreSQL, PGlite, TypeScript, React, Vite, SQL, developer tools, testing, release engineering, database migrations, CI/CD

## Platform
Web application with an optional local account server and a command-line rehearsal engine.

## Public repository
https://github.com/shi1720/ibm-bob

## Application URL
https://shi1720.github.io/ibm-bob/

The public application is a guest browser demo. Every rehearsal runs locally in the browser. The included self-hosted server adds login and personal persisted history; the public Pages deployment does not host accounts.

## Submission assets

- Editable slide deck: `submission/pitch.pptx`
- Slide PDF: `submission/pitch.pdf`
- One-page overview: `submission/one-pager.pdf`
- Recording script and shot list: `submission/VIDEO-SCRIPT.md`
- Commercial assumptions and competitors: `submission/COMMERCIAL.md`
- Genuine IBM Bob task summaries: `bob_sessions/`
- Actual 126-second silent screen recording: `submission/media/screen-demo.mp4`
- Cover: `submission/cover.png`
- Verified screenshots: `submission/media/`
- Measured CLI evidence and workflow comparison: `submission/IMPACT.md`
- Final narrated MP4: pending voiceover and verified Bob segment

## Final checks

1. Replace the Bob statement with verified work and name the real screenshots.
2. Recheck the public application URL and public repository from an incognito session.
3. Confirm the final MP4 is at most 180 seconds and shows the product operating for at least 90 seconds.
4. Keep both written statements below 500 words after edits.
5. Confirm slide links, screenshots and factual claims match the final build.
6. Submit using Shivam Gupta's registered hackathon account before 20:30 IST on September 27, 2026, according to the supplied event schedule.
