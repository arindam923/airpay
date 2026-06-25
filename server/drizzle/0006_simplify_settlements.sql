-- Migration: Simplify settlement_settings for non-custodial model
-- AirPay never holds merchant funds. Funds settle directly on-chain.
-- Removed: auto_settle, sweep_threshold_cents, sweep_schedule, sponsor_gas, gas_cap_cents

-- Recreate settlement_settings without custodial columns
CREATE TABLE IF NOT EXISTS "settlement_settings_new" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_profile_id" text NOT NULL,
	"enabled_chains" text NOT NULL DEFAULT '["Solana","Arbitrum","Polygon"]',
	"updated_at" integer NOT NULL,
	FOREIGN KEY ("merchant_profile_id") REFERENCES "merchant_profiles"("id") ON UPDATE no action ON DELETE cascade
);

-- Copy existing data (only id, merchant_profile_id, enabled_chains, updated_at)
INSERT INTO "settlement_settings_new" ("id", "merchant_profile_id", "enabled_chains", "updated_at")
SELECT "id", "merchant_profile_id", "enabled_chains", "updated_at"
FROM "settlement_settings";

-- Drop old table
DROP TABLE "settlement_settings";

-- Rename new table
ALTER TABLE "settlement_settings_new" RENAME TO "settlement_settings";

-- Recreate unique index on merchant_profile_id
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_settings_merchant_profile_id_unique" ON "settlement_settings" ("merchant_profile_id");
