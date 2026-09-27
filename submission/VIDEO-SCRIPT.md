# UndoProof demo recording

Target length: 2:50-2:58. Narration: approximately 350 words. Show the live application continuously from 00:18 to 02:10, with a brief real Bob IDE segment, and return to the live app from 02:30 to 02:48. This leaves more than 100 seconds of solution operation. Do not fill the demo with slide transitions.

## Recording setup

- 1920 x 1080, 30 fps, MP4 H.264, microphone close to the speaker.
- Hide personal tabs, notifications and unrelated files. Use the synthetic examples only.
- Rehearse the click path twice. Start from a fresh workspace with no invented run history.
- Set browser zoom so SQL details and before/after rows remain readable.
- Use the actual unsafe snapshot scenario, then preview and run its repair. Keep the measured timings the app reports.
- Show authentic Bob task work and session summary. Never substitute generated screenshots.
- Finish by 02:58. If recording runs long, shorten pauses, not the evidence.

## Verbatim narration and screen direction

### 00:00-00:18 - title, then the product

“Your deployment is green. A customer places an order. Then you roll back, and that order disappears. The rollback script succeeded. Your business did not. I'm Shivam Gupta, and I built UndoProof to rehearse the way back before a database change ships.”

### 00:18-00:42 - select the destructive snapshot example, open contract

“Here is a small order service represented by a release contract. We have seed data, the migration, old and new queries, and a write that happens after deployment. This example restores a snapshot during rollback. It looks reassuring because every SQL statement can succeed.”

### 00:42-01:10 - run rehearsal, inspect results

“Let's run it. UndoProof executes real PostgreSQL through PGlite, in isolated databases. It checks the previous application's queries against the migrated schema, then exercises the recovery sequence. Crucially, it writes a new order before rolling back. That is the state a simple up-and-down migration test can miss.”

### 01:10-01:35 - open preservation evidence, point to missing row

“The forward path works. But look at the data-preservation check. Here is the customer-visible data before rollback, and here it is afterward. The new order is missing. This result comes from executed SQL and a row comparison. You can inspect the exact statements and export the evidence.”

### 01:35-02:10 - repair preview, rerun and show result

“The repair keeps the compatible expanded schema when the application rolls back. I can review the SQL before applying it, then rerun the same contract. The new order survives. The important lesson is that rolling back application code does not require destroying the new database state. The command-line runner uses the same engine to gate a release.”

### 02:10-02:30 - genuine Bob IDE task and summary

“IBM Bob worked from our release-contract specification on the rehearsal engine and its tests. Here is the actual task and session summary. UndoProof also exports the failed contract and execution evidence as a focused Bob repair prompt, so the next coding task starts with a reproducible problem.”

### 02:30-02:58 - live report, export, final title

“UndoProof starts with an MIT local runner. Our commercial hypothesis is a team workspace for shared release policies and retained evidence. Today's checks cover the supplied SQL and fixtures, not full production behavior. Developers already test how to move forward. UndoProof makes checking the way back part of the same workflow.”

## Evidence-dependent line

Before recording, confirm the Bob narration against actual completed task history. If Bob did not implement both engine and tests, replace that sentence with the exact observed contribution. Do not read this production note aloud.

## Editing notes

Use the live cursor and a slow, deliberate click path. A subtle zoom on the missing row is enough. Keep computer audio muted, narration clean, and captions high contrast. Music is optional and should never compete with the explanation. Avoid stock footage and fake terminal sequences. Cover image and final title can show “UndoProof / Prove the way back / Shivam Gupta”.
