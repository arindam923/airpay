-- Optional second transaction hash for EVM payments where merchant and fee transfers are separate
ALTER TABLE payments ADD COLUMN fee_tx_hash TEXT;
