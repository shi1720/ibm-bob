-- Unsafe release proposal: a pre-deployment snapshot looks like an easy rollback.
CREATE TABLE orders_before_release AS TABLE orders;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'paid'));
