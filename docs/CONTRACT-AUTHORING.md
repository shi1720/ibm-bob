# Author a useful release contract

A passing rehearsal means your supplied checks passed. Its usefulness depends on what you put in the contract.

## Start with real application SQL

Use the runnable sample in `examples/checkout-app` to see an application-to-contract workflow. Its contract generator reads the same query constants used by the old and new application services and the migration files. For an existing repository, ask Bob to find the database callers and explain what it could not cover. Generated contracts still need review.

Do not write happy-path SQL solely to satisfy the gate. Include a representative old writer, a new writer that changes business data, and reads/assertions for both versions. The `oldWriteSql` probe runs against independent baseline/new-schema branches and in a transaction after rollback. Choose a synthetic record ID that does not collide with the new writer's record.

## Define a stable invariant

The same `invariantSql` runs against the original schema, migrated schema, after new writes, and after rollback. It should project the same logical fields with stable names and types in all those states. Include primary keys and every business value you need preserved.

Good example:

```sql
SELECT id, customer, total_cents FROM orders ORDER BY id;
```

Weak example:

```sql
SELECT COUNT(*) FROM orders;
```

The second query can miss a changed customer or amount. An empty result, a write with no observable change, or a temporary-object fixture is rejected. Row order does not matter, but duplicates do. A mutation during forward migration also blocks the gate if it changes the stable projection. If your migration intentionally changes representation, normalize both representations in SQL to the same logical value rather than deleting the preservation check.

For high-precision values, UndoProof preserves PostgreSQL wire text for timestamps, numeric/decimal, bigint and JSON types. Nonfinite floating-point values require an explicit `::text` projection. Use normalized time zones and consistent casts where needed. An invariant that depends on randomness, time, session mutation, or changing external state is not trustworthy evidence; write a deterministic projection.

## Assert business meaning

A successful SELECT establishes that SQL can execute. It does not establish that the returned rows are correct unless you assert that meaning. PostgreSQL can fail a query when a condition is false, for example:

```sql
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM orders WHERE id = 101)
  THEN 1 ELSE 0 END AS baseline_order_exists;
```

For complex conditions, prefer a SQL function with an explicit `RAISE EXCEPTION` in a fixture for complex assertions, and independently test that it fails on the negative case. Do not infer full HTTP/application behavior from database query contracts.

## Represent the actual rollback

Application rollback often means deploying the old application while retaining a compatible expanded database schema. A no-op `downSql` is appropriate only when that is the real documented rollback plan and old reads/writes are checked. Schema cleanup can happen in a later, separately rehearsed release.

Keep the unsafe report, reviewed patch, regenerated contract and passing report together in version control or CI artifacts. Do not alter the invariant merely to turn a red check green.
