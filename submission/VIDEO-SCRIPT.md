# Final demo narration

Duration: 176 seconds. Actual application recording: 126 seconds. Narration is a disclosed synthetic English voice generated locally with macOS Samantha. Captions are burned into a separate band and provided in NARRATION.srt.

## 00:00:00 to 00:00:16: Your release passed. Will your rollback?

Your deployment is green. Then you roll back, and a new customer order disappears.

Built by Shivam Gupta, UndoProof rehearses the recovery plan before a database migration ships.

## 00:00:16 to 00:00:24: 01 Meet the disappearing order

This is our checkout example. The release works, but its rollback quietly loses a new order.

## 00:00:24 to 00:00:30: 02 Make the release contract explicit

A release contract makes the migration, application queries, and important data explicit.

## 00:00:30 to 00:00:39: 03 Inspect the unsafe rollback

Here is the problem. The rollback drops the current orders table and restores a snapshot taken before deployment.

## 00:00:39 to 00:00:47: 04 Write after deployment

This write creates order one hundred and four after deployment. Our recovery plan must preserve that order.

## 00:00:47 to 00:00:55: 05 Execute real PostgreSQL

Let us rehearse. UndoProof runs real PostgreSQL through PGlite. The result blocks this release plan.

## 00:00:55 to 00:01:04: 06 Successful SQL can still lose data

The forward path works. The rollback SQL also succeeds. But data preservation fails. Those are deliberately separate checks.

## 00:01:04 to 00:01:20: 07 Inspect the missing order

Here is the evidence. Four rows before rollback, three afterward. The highlighted new order has disappeared.

We compare exact values in the supplied invariant projection. A successful SQL command cannot hide this failure.

## 00:01:20 to 00:01:29: 08 Give Bob the actual evidence

This export gives Bob the exact contract and failure evidence. It is a manual IDE handoff for a focused repair task.

## 00:01:29 to 00:01:42: 09 Review the candidate repair

For this example, we include a repair to review. It keeps the compatible expanded schema when the application rolls back.

Removing the destructive snapshot restore preserves the new data.

## 00:01:42 to 00:01:52: 10 Apply and rehearse again

Apply the reviewed SQL and run the same engine again. This time every supplied check passes.

## 00:01:52 to 00:02:04: 11 Verify what survived

All four orders survive, including the write after deployment. The earlier application queries still work.

Rolling back application code does not require deleting the expanded schema.

## 00:02:04 to 00:02:12: 12 Export reproducible evidence

Export the tested contract, executed SQL, row comparisons and measured runtime as evidence.

## 00:02:12 to 00:02:22: 13 Keep both outcomes

History keeps both outcomes. Developers can import their own contracts, and the command-line runner uses the same engine as a release gate.

## 00:02:22 to 00:02:42: 14 IBM Bob IDE contribution

Here is Bob working directly in this repository. It added forty-one regression tests for source-derived checkout contracts, including the lost order and unchanged repair invariant.

We reran the tests. The code and reviewed findings are in the repository.

## 00:02:42 to 00:02:56: Prove the way back. Before you ship.

UndoProof is open source. Our proposed team product adds shared policies and retained evidence.

These results cover the tested SQL and fixtures. The way back belongs in the release review.

## Provenance

The main workflow is the unsped original screen recording. The Bob segment displays a full-window inset and an enlarged region of the same genuine IBM Bob work capture. The original evidence PNG is unmodified. It is not a task consumption summary. The video does not claim an automatic Bob API integration. The built-in repair is a reviewed sample. No production data or invented speedup is used.

## Reproduce the final edit

Requires macOS `say`, ffmpeg, ffprobe and Python with Pillow.

```sh
python3 scripts/render-demo.py --bob-evidence submission/media/bob-verification-work.png --bob-confirmed --bob-narration submission/BOB-NARRATION.txt
```

The supplied work capture and reviewed narration establish the segment's content. They do not replace the required task consumption summary.
