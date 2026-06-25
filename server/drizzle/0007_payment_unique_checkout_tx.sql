-- Prevent duplicate payments for the same checkout session + transaction hash
CREATE UNIQUE INDEX IF NOT EXISTS uniq_checkout_tx ON payments (checkout_session_id, tx_hash);
