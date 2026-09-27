# Checkout release 001: payment status

This is an original synthetic release plan for the runnable sample service. It is deliberately paired with a flawed rollback proposal so the mismatch can be reproduced.

## Application change

The previous application lists and creates orders with `id`, `customer` and `total_cents`. The new application also reads and writes a `status` of `pending` or `paid`. Both versions use the SQL in `queries.ts`. The HTTP layer validates request shape and supplies parameter values; it does not construct SQL from user input.

During a rolling release, previous instances may still create orders. Therefore the added status column needs a default. Application rollback must be possible while preserving all original orders and orders created after the migration.

## Desired business promise

For this release, recovery must retain each order's identifier, customer and monetary total. These columns define `orderInvariant`. A post-deployment order must remain after recovery. This minimal contract does not prove every payment-status rule, HTTP interaction, concurrent write, or production lock behavior.

## Original proposed procedure

1. Seed the synthetic baseline.
2. Execute `sql/up.sql`, taking a pre-release table snapshot and adding status.
3. Start the new application; accept a new paid order.
4. If rollback is needed, execute `sql/down.sql` and revert application code.

The SQL procedure conflicts with the desired promise: the restored snapshot cannot contain the new paid order. Successful SQL execution is insufficient. The generated unsafe contract demonstrates this directly.

## Candidate corrected procedure

Deploy `sql/up.candidate.sql`, adding the backward-compatible status column with a default. To revert application code, use `sql/down.candidate.sql`, which retains the expanded schema and current data. Both old and new writers remain compatible with the schema. Any later column removal requires a separate migration and rehearsal after older application versions are retired.

This candidate is a reviewable sample patch, not an automatic production recommendation. The same seed, old/new queries, fixture write parameters and invariant must be retained when verifying it. Inspect generated blocked and passing reports and run the service tests before accepting the candidate for this sample.
