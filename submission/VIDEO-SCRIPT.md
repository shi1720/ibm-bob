# Final demo narration

Duration: 176 seconds. Actual application recording: 126 seconds. Narration is a disclosed synthetic English voice generated locally with Kokoro af_heart. Captions are burned into a separate band and provided in NARRATION.srt.

## 00:00:00 to 00:00:16: Your release passed. Will your rollback?

Your release looks good. But then you roll it back, and a customer's new order disappears.

Built by Shivam Gupta, UndoProof catches that failure before a database migration ships.

## 00:00:16 to 00:00:24: 01 Meet the disappearing order

Here's our checkout example. The new release works. The trouble starts when we try to undo it.

## 00:00:24 to 00:00:30: 02 Make the release contract explicit

This contract lists the migration, the application queries, and the data we need to protect.

## 00:00:30 to 00:00:39: 03 Inspect the unsafe rollback

Look at this rollback. It drops today's orders table and restores a snapshot from before the release.

## 00:00:39 to 00:00:47: 04 Write after deployment

Now, a customer places order one hundred and four. It's new data. The rollback needs to keep it.

## 00:00:47 to 00:00:55: 05 Execute real PostgreSQL

Let's run the rehearsal. This is real Postgres, running through PGlite. And the release plan is blocked.

## 00:00:55 to 00:01:04: 06 Successful SQL can still lose data

The forward tests passed. The rollback SQL worked, too. But look at data preservation. That's where the failure shows up.

## 00:01:04 to 00:01:20: 07 Inspect the missing order

Before rollback, four orders. After rollback, three. Order one hundred and four has disappeared.

We compare the actual values in the data invariant. A successful SQL command doesn't hide the missing order.

## 00:01:20 to 00:01:29: 08 Give Bob the actual evidence

This handoff gives Bob the exact contract and the failure evidence. The developer opens it in Bob IDE to investigate.

## 00:01:29 to 00:01:42: 09 Review the candidate repair

Here's a candidate repair we can review. It keeps the compatible new column when the application rolls back.

We remove the destructive snapshot restore. The customer's order stays in the database.

## 00:01:42 to 00:01:52: 10 Apply and rehearse again

Apply the reviewed change, then run the same checks again. This time, every check passes.

## 00:01:52 to 00:02:04: 11 Verify what survived

All four orders survive. The old application queries still work, too.

We can roll back the application without destroying the compatible database changes.

## 00:02:04 to 00:02:12: 12 Export reproducible evidence

Export the evidence for the release review: the tested contract, executed SQL, row comparisons, and runtime.

## 00:02:12 to 00:02:22: 13 Keep both outcomes

History keeps the failed run and the repaired run. Bring your own contracts, or use the same engine as a command-line release gate.

## 00:02:22 to 00:02:42: 14 IBM Bob IDE contribution

Here is Bob working directly in this repository. It added forty-one regression tests for source-derived checkout contracts, including the lost order and unchanged repair invariant.

We reran the tests. The code and reviewed findings are in the repository.

## 00:02:42 to 00:02:56: Prove the way back. Before you ship.

UndoProof is open source. Next, we'll test shared release policies and retained evidence with engineering teams.

Results cover the tested SQL and fixtures. The way back belongs in the release review.

## Provenance

The main workflow is the unsped original screen recording. The Bob segment displays a full-window inset and an enlarged region of the same genuine IBM Bob work capture. The original evidence PNG is unmodified. It is not a task consumption summary. The video does not claim an automatic Bob API integration. The built-in repair is a reviewed sample. No production data or invented speedup is used.

## Reproduce the final edit

Requires local Kokoro model and voices, ffmpeg, ffprobe and Python with kokoro-onnx, soundfile and Pillow.

```sh
python3 scripts/render-demo.py --bob-evidence submission/media/bob-verification-work.png --bob-confirmed --bob-narration submission/BOB-NARRATION.txt
```

The supplied work capture and reviewed narration establish the segment's content. They do not replace the required task consumption summary.
