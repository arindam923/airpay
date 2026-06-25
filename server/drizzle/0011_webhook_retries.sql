-- Webhook retry queue for reliable delivery
CREATE TABLE IF NOT EXISTS webhook_retries (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature_header TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at INTEGER NOT NULL,
  last_status_code INTEGER,
  last_error TEXT,
  failed_permanently INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_retries_next_attempt ON webhook_retries (next_attempt_at, failed_permanently);
CREATE INDEX IF NOT EXISTS idx_webhook_retries_payment ON webhook_retries (payment_id);
