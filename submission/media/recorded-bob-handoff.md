You are reviewing a PostgreSQL deployment in IBM Bob IDE. Inspect this release contract and the repository. Repair the migration so old and new applications remain compatible and rollback preserves ALL preexisting and post-deploy writes. Prefer expand-contract changes and non-destructive rollback. Do not weaken invariants or remove fixtures to make checks pass. Explain tradeoffs and run UndoProof again.

CONTRACT
{
  "seedSql": "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT NOT NULL, total_cents INTEGER NOT NULL CHECK(total_cents >= 0));\nINSERT INTO orders VALUES (101, 'Northstar Studio', 24900), (102, 'Juniper Labs', 8900), (103, 'Atlas Works', 15900);",
  "oldReadSql": "SELECT id, customer, total_cents FROM orders ORDER BY id;",
  "oldWriteSql": "INSERT INTO orders (id, customer, total_cents) VALUES (105, 'Legacy checkout', 4200);",
  "invariantSql": "SELECT id, customer, total_cents FROM orders ORDER BY id;",
  "tags": [
    "PostgreSQL",
    "Checkout",
    "Synthetic data"
  ],
  "id": "checkout-snapshot",
  "name": "The disappearing order",
  "migrationName": "20260927_004_add_order_status",
  "description": "A checkout release adds order status. Forward tests pass. The rollback restores a pre-release snapshot — silently erasing orders placed after deployment.",
  "upSql": "CREATE TABLE orders_backup AS TABLE orders;\nALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';",
  "downSql": "DROP TABLE orders;\nALTER TABLE orders_backup RENAME TO orders;",
  "newReadSql": "SELECT id, customer, total_cents, status FROM orders ORDER BY id;",
  "newWriteSql": "INSERT INTO orders (id, customer, total_cents, status) VALUES (104, 'New customer order', 32900, 'paid');",
  "repair": {
    "summary": "Keep the additive status column when reverting the application. Old code ignores it, and its DEFAULT supports old writers. Remove the snapshot restoration so post-deployment orders survive. Clean up schema later in a separately rehearsed release.",
    "upSql": "ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';",
    "downSql": "-- Application rollback: retain the compatible expanded schema.\nSELECT 1;"
  }
}

ACTUAL REHEARSAL REPORT
{
  "id": "a02145e1-9b79-4ddc-8642-06214e6febcd",
  "contractId": "checkout-snapshot",
  "contractName": "The disappearing order",
  "startedAt": "2026-09-27T03:23:23.970Z",
  "durationMs": 2553,
  "engine": "PostgreSQL / PGlite 0.3.16 (WASM)",
  "status": "blocked",
  "checks": [
    {
      "id": "baseline",
      "name": "Baseline application",
      "status": "passed",
      "durationMs": 647.2,
      "detail": "Old reads and writes execute against the original schema.",
      "sql": "SELECT id, customer, total_cents FROM orders ORDER BY id;\nINSERT INTO orders (id, customer, total_cents) VALUES (105, 'Legacy checkout', 4200);"
    },
    {
      "id": "forward",
      "name": "Forward deployment",
      "status": "passed",
      "durationMs": 392.6,
      "detail": "Migration and new application reads/writes execute successfully.",
      "sql": "CREATE TABLE orders_backup AS TABLE orders;\nALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';\nSELECT id, customer, total_cents, status FROM orders ORDER BY id;\nINSERT INTO orders (id, customer, total_cents, status) VALUES (104, 'New customer order', 32900, 'paid');"
    },
    {
      "id": "baseline-data",
      "name": "Original data survives deployment",
      "status": "passed",
      "durationMs": 383.2,
      "detail": "All 3 original business rows survived deployment unchanged.",
      "sql": "SELECT id, customer, total_cents FROM orders ORDER BY id;",
      "before": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        }
      ],
      "after": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        }
      ]
    },
    {
      "id": "old-reader",
      "name": "Old reader · new schema",
      "status": "passed",
      "durationMs": 374,
      "detail": "Old application reads work during a rolling deployment.",
      "sql": "SELECT id, customer, total_cents FROM orders ORDER BY id;"
    },
    {
      "id": "old-writer",
      "name": "Old writer · new schema",
      "status": "passed",
      "durationMs": 386.3,
      "detail": "Old application writes are accepted and the new reader still executes.",
      "sql": "INSERT INTO orders (id, customer, total_cents) VALUES (105, 'Legacy checkout', 4200);"
    },
    {
      "id": "post-deploy",
      "name": "Post-deploy data checkpoint",
      "status": "passed",
      "durationMs": 4.8,
      "detail": "Captured 4 business rows after a visible post-deploy write.",
      "sql": "INSERT INTO orders (id, customer, total_cents, status) VALUES (104, 'New customer order', 32900, 'paid');\nSELECT id, customer, total_cents FROM orders ORDER BY id;",
      "before": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        }
      ],
      "after": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        },
        {
          "id": 104,
          "customer": "New customer order",
          "total_cents": 32900
        }
      ]
    },
    {
      "id": "rollback",
      "name": "Rollback plan",
      "status": "passed",
      "durationMs": 2.5,
      "detail": "Rollback SQL completed. Data preservation is verified separately.",
      "sql": "DROP TABLE orders;\nALTER TABLE orders_backup RENAME TO orders;"
    },
    {
      "id": "preservation",
      "name": "Data preservation",
      "status": "failed",
      "durationMs": 0.9,
      "detail": "Business data changed: 4 rows before rollback, 3 after. Compare values as well as counts.",
      "sql": "SELECT id, customer, total_cents FROM orders ORDER BY id;",
      "before": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        },
        {
          "id": 104,
          "customer": "New customer order",
          "total_cents": 32900
        }
      ],
      "after": [
        {
          "id": 101,
          "customer": "Northstar Studio",
          "total_cents": 24900
        },
        {
          "id": 102,
          "customer": "Juniper Labs",
          "total_cents": 8900
        },
        {
          "id": 103,
          "customer": "Atlas Works",
          "total_cents": 15900
        }
      ]
    },
    {
      "id": "old-after",
      "name": "Old application after rollback",
      "status": "passed",
      "durationMs": 0.8,
      "detail": "Old reads and writes execute after rollback; probe writes were rolled back.",
      "sql": "SELECT id, customer, total_cents FROM orders ORDER BY id;\nINSERT INTO orders (id, customer, total_cents) VALUES (105, 'Legacy checkout', 4200);"
    },
    {
      "id": "redo",
      "name": "Redeploy after rollback",
      "status": "passed",
      "durationMs": 1.5,
      "detail": "Migration can be reapplied and the new reader executes.",
      "sql": "CREATE TABLE orders_backup AS TABLE orders;\nALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';\nSELECT id, customer, total_cents, status FROM orders ORDER BY id;"
    }
  ],
  "contractHash": "f2108e2f87f25d57b4a8e2b73a48a9d3423fbec005fa357d4b7fbdaab482fe11",
  "summary": "1 check failed. Do not release this plan without resolving or explicitly investigating the evidence."
}

Use parallel focused analysis where helpful: compatibility, data preservation, and independent verification. Record genuine task summary screenshots in bob_sessions after completing the work.