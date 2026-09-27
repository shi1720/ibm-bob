-- This succeeds but discards orders created after the snapshot.
DROP TABLE orders;
ALTER TABLE orders_before_release RENAME TO orders;
