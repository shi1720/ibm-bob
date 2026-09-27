-- Candidate patch: the new column has a default, so the old writer still works.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'paid'));
