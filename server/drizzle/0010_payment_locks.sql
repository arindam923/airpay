-- Add row-level locking columns for cron job concurrency control
ALTER TABLE payments ADD COLUMN locked_at INTEGER;
ALTER TABLE payments ADD COLUMN locked_by TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_locked ON payments (locked_at);
