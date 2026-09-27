# UndoProof narration matched to the recorded demo

## Ready-to-record assets

- Actual screen recording: `submission/media/screen-demo.mp4`, approximately 126 seconds, silent.
- Exact captured scene timings: `submission/media/screen-demo-timeline.json`.
- Cover: `submission/cover.png`.
- Editable captions for the current accurate narration: `submission/NARRATION.srt`. Replace the Bob captions if using the evidence-confirmed alternate.
- Public demo: https://shi1720.github.io/ibm-bob/

Record each narration paragraph below at a calm pace, leaving a short pause at the end of each time window. The quoted text is verbatim. Directions are not spoken. The main recording shows 126 seconds of actual product use, comfortably above the 90-second minimum.

**Full edit:** 16-second introduction + 126-second screen recording + 20-second Bob evidence segment + 14-second close = **176 seconds**. Keep the final MP4 below 180 seconds. The screen recording starts at full-video time 00:16. Its timestamps below are relative to the screen recording, with full-video times in parentheses.

**Bob eligibility remains open:** the present recording shows a real exported Bob handoff, not completed IBM Bob IDE work. Do not use the evidence-confirmed alternate paragraph until an actual task and required task-summary screenshot exist. A polished video does not remove this requirement.

## Introduction: full video 00:00-00:16

Show `cover.png`, then cut directly to the recording.

“Your deployment is green. Then you roll back, and a new customer order disappears. I'm Shivam Gupta. UndoProof rehearses the recovery plan before a database migration ships.”

## Screen recording: 00:00-00:08 (full video 00:16-00:24)

The disappearing-order workspace is visible.

“This is our checkout example. The release works, but its rollback quietly loses a new order.”

## 00:08-00:14 (00:24-00:30)

The release-contract editor opens.

“A release contract makes the migration, application queries, and important data explicit.”

## 00:14-00:23 (00:30-00:39)

The unsafe rollback SQL appears.

“Here is the problem. The rollback drops the current orders table and restores a snapshot taken before deployment.”

## 00:23-00:31 (00:39-00:47)

The post-deploy write creates order 104.

“This write creates order one hundred and four after deployment. Our recovery plan must preserve that order.”

## 00:31-00:39 (00:47-00:55)

The real engine runs and reports a blocked result.

“Let's rehearse. UndoProof runs real PostgreSQL through PGlite. The result blocks this release plan.”

## 00:39-00:48 (00:55-01:04)

The compatibility matrix is visible.

“The forward path works. The rollback SQL also succeeds. But data preservation fails. Those are deliberately separate checks.”

## 00:48-01:04 (01:04-01:20)

The data drawer highlights order 104 missing afterward.

“Here is the evidence. Four rows before rollback, three afterward. The highlighted new order has disappeared. We compare exact values in the supplied invariant projection, so a successful SQL command cannot hide this failure.”

## 01:04-01:13 (01:20-01:29)

The app exports the genuine Bob repair handoff.

“This export gives Bob the exact contract and failure evidence. It is a manual IDE handoff, ready for a focused repair task.”

## 01:13-01:26 (01:29-01:42)

The supplied repair opens for review.

“For this example, we include a repair to review. It keeps the compatible expanded schema when the application rolls back. Removing the destructive snapshot restore preserves the new data.”

## 01:26-01:36 (01:42-01:52)

Apply-and-rehearse runs the repaired contract and shows passing results.

“Apply the reviewed SQL and run the same engine again. This time every supplied check passes.”

## 01:36-01:48 (01:52-02:04)

The repaired preservation check shows four rows on both sides.

“All four orders survive, including the write after deployment. The earlier application queries still work. Rolling back application code does not require deleting the expanded schema.”

## 01:48-01:56 (02:04-02:12)

Export the actual report.

“The evidence packet includes executed SQL, data comparisons, measured runtime, and a hash identifying the tested contract.”

## 01:56-02:06 (02:12-02:22)

Run history shows the actual blocked and repaired runs.

“History keeps both outcomes. Developers can import their own contracts, and the command-line runner uses the same engine as a release gate.”

## Bob segment: full video 02:22-02:42

### Current accurate paragraph if no completed Bob task exists

Show the actual downloaded `submission/media/recorded-bob-handoff.md`. This explains the workflow but does **not** establish the required Bob usage.

“The Bob workflow starts with repository context and this concrete failure. A developer asks Bob to inspect a repair, reviews the proposed change, and rehearses again. The handoff never substitutes an AI confidence score for executed database evidence.”

### Alternate paragraph only after genuine contribution is verified

Replace this whole 20-second segment with the actual Bob IDE task and task-summary screenshot. Select one exact task description supported by the visible evidence. Do not read an unverified claim.

“Here is the actual IBM Bob IDE task. Bob reviewed the release contract and helped improve the implementation. We checked the resulting changes against the regression tests. The repository includes this genuine session summary and the relevant code.”

If the eventual task is narrower or different, rewrite those two middle sentences to name exactly what Bob did. In particular, do not claim Bob built the engine or tests unless the captured history establishes that.

## Close: full video 02:42-02:56

Show the live public demo address and cover title.

“UndoProof is open source. Our proposed team product adds shared policies and retained evidence. These results cover the tested SQL and fixtures. The way back belongs in the release review.”

## Recording and export

Record voiceover separately in a quiet room. Use the exact MP4 without speeding the cursor or faking terminal output. Keep captions legible over the captured app. Export H.264 MP4, 1920 by 1080 or the source aspect ratio, 30 fps, with clear audio. Recheck final duration after adding intro and closing frames. The raw WebM includes startup padding; use the trimmed MP4 above.
