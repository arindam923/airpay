-- Idempotency key storage for POST endpoints
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_body_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys (key);
