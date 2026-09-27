# UndoProof: prove the way back

## Inspiration

A customer places an order. Minutes later, a developer rolls back a release. The rollback command succeeds, but the order disappears.

That gap inspired UndoProof. Teams test migrations moving forward. Can they return to the previous application without losing the data that arrived in between? We wanted that question answered before an incident, with evidence a developer can inspect.

## What it does

UndoProof rehearses PostgreSQL migration and rollback plans in disposable databases. It checks old and new application queries, inserts a representative post-deployment order, executes the rollback, and compares the exact business rows before and after.

Our checkout example makes the problem visible: the migration works, the rollback SQL succeeds, and order 104 vanishes. UndoProof blocks the release and shows the missing row. A reviewed repair retains the compatible additive schema when reverting the application. Running the same checks again confirms that all four projected orders survive.

Developers can edit or import contracts, inspect SQL and errors, export evidence, and run the same engine as a command-line release gate. A Bob handoff packages the contract and failure evidence for investigation in IBM Bob IDE.

## How we built it

Shivam Gupta created UndoProof using TypeScript, React and PGlite, which runs real PostgreSQL through WebAssembly. Browser rehearsals run in a disposable worker. The CLI shares the engine and terminates stalled runs. Firebase Hosting serves the application. Firebase Authentication and Firestore provide accounts and private history.

A runnable checkout service shares its queries and migrations with the contract generator. IBM Bob added and ran 41 regression tests for source-derived contracts, data loss and unchanged repair invariants. Sample repairs are reviewed examples.

## Challenges we ran into

A comparison can miss data loss if it ignores duplicate rows or rounds large numbers. We preserved numeric precision and timestamp microseconds, tested duplicate-sensitive comparisons, and made required failures block the plan. Independent database branches keep one compatibility failure from contaminating another check.

We also made the limits visible: supplied SQL contracts cannot establish production concurrency, lock safety or behavior they never represent.

## Accomplishments that we're proud of

The product demonstrates a complete failure, evidence, repair and rerun workflow using executed PostgreSQL results. The browser and CI gate agree on the same contract. Regression tests exercise the engine, HTTP accounts, checkout application and browser workflow.

## What we learned

Successful rollback SQL is not the same as successful recovery. Reverting the application may require keeping a compatible schema. Good evidence also depends on a precise business invariant, not just a green query or row count.

## What's next

We plan to validate demand with SaaS engineering teams that ship frequent database changes. The MIT runner is the starting point. Shared release policies, retained evidence and private CI runners are potential paid capabilities. Pilots will measure contract setup effort, useful defects found and repeat-review time before we claim savings.
