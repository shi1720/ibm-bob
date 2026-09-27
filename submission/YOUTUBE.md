# YouTube demo metadata

## Title

UndoProof: The Rollback Passed. A Customer Order Disappeared.

## Description

Your release passed. Will your rollback?

UndoProof catches a database failure that ordinary forward tests can miss: a rollback that executes successfully but deletes an order placed after deployment.

Watch a real PostgreSQL rehearsal expose the missing order, inspect the before-and-after evidence, review a safer rollback plan, and rerun the same checks. The repaired plan keeps the compatible additive schema while returning to the previous application version.

Built by Shivam Gupta for the IBM Bob 2.0 Hackathon. Narration uses a synthetic voice. The application footage shows actual PostgreSQL rehearsals.

Try the application: https://undoproof.web.app
Source code: https://github.com/shi1720/ibm-bob

The demo uses original synthetic checkout data. Rehearsals run locally in the browser using PGlite, with no production database credentials or paid inference API. The same engine is available as a command-line release gate.

IBM Bob added and ran 41 real PostgreSQL regression tests for source-derived checkout contracts and reviewed the workflow. The Bob handoff also exports the actual contract and execution evidence for investigation in IBM Bob IDE. Supplied sample repairs are reviewed examples. A passing result covers the supplied SQL contracts and fixtures; it does not establish production concurrency or lock safety.

Chapters:
00:00 The rollback passed. An order disappeared.
00:16 The executable release contract
00:30 The unsafe rollback plan
00:47 Real PostgreSQL rehearsal
01:04 The missing order, shown in evidence
01:29 Review and apply the repair
01:52 Verify all four orders survive
02:22 IBM Bob workflow
02:42 Prove the way back

#DeveloperTools #PostgreSQL #DatabaseMigrations #IBMBob #Hackathon

## Publishing settings

- Visibility: Public.
- Audience: Not made for kids. This is a software engineering demonstration for developers.
- Category: Science & Technology.
- Language: English.
- Upload the final narrated MP4, not the silent source recording.
- Upload the matching English subtitle file and check the first and last captions after processing.
- Preserve the distinction between the genuine Bob work capture shown in the video and the required task consumption summary included separately in the submission.
- Chapters match the 176-second edit in scripts/render-demo.py; confirm them against the final export before publishing.
