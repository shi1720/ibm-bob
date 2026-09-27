# Resume the required IBM Bob work

The current deliverable has a tested engine, runnable target application, public demo, and submission assets. Meaningful Bob IDE contribution and genuine task-summary screenshots are still required for hackathon eligibility. This document is a ready-to-run task, not evidence of completed use.

Open `/Users/shivamgupta/Downloads/ibm-bob` in the hackathon-provisioned Bob IDE account. Use Agent mode. Paste:

> We are building UndoProof for the IBM Bob2.0 hackathon. Read AGENTS.md, docs/CONTRACT-AUTHORING.md, the target application's README and source under examples/checkout-app, and docs/BOB-WORKFLOW.md. Focus on the actual source-to-contract-to-repair workflow. First run the unsafe checkout contract through the CLI and inspect the missing order. Independently review the existing candidate repair against the old/new application SQL and rollout promise. Improve the repair or add a meaningful missing regression based on actual repository behavior, without weakening any invariant. Put independent tests in tests/bob-engine.test.ts and your evidence-based review in docs/BOB-ENGINE-REVIEW.md. Use the real PostgreSQL engine, not mocks. Test the runnable target application and regenerated contract, and run your new tests. Avoid editing unrelated interface/server files. State precisely what you changed, which commands passed, and remaining production limitations. Do not claim earlier work as yours. If network errors occur, stop with the actual error instead of reporting success.

After completion:

1. Inspect the actual changed files and test output.
2. Run `npm test && npm run build` and the target application's unsafe/repaired contracts.
3. Capture every relevant Bob task's genuine task-session summary into bob_sessions.
4. Update the Bob usage statement and provenance from actual output. Remove the pending blocker only after evidence exists.
5. Replace the conditional Bob narration with the verified task's concrete role; capture a short real Bob clip for the final video.
6. Commit/push the contribution and screenshots. Verify the Pages deployment and CI.

The screen-only product video is already recorded. Shivam can add narration using submission/VIDEO-SCRIPT.md after the Bob clause is verified.
