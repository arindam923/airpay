CREATE TABLE IF NOT EXISTS `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`type` text NOT NULL,
	`environment` text NOT NULL,
	`prefix` text NOT NULL,
	`hashed_value` text NOT NULL,
	`last_four` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webhook_event_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`event` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settlement_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`auto_settle` integer DEFAULT true NOT NULL,
	`sweep_threshold_cents` integer DEFAULT 100000 NOT NULL,
	`sweep_schedule` text DEFAULT 'daily' NOT NULL,
	`sponsor_gas` integer DEFAULT true NOT NULL,
	`gas_cap_cents` integer DEFAULT 25000 NOT NULL,
	`enabled_chains` text DEFAULT '["Solana","Arbitrum","Polygon"]' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `settlement_settings_merchant_profile_id_unique` ON `settlement_settings` (`merchant_profile_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sweep_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`payment_ids` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`network` text NOT NULL,
	`destination_address` text NOT NULL,
	`tx_hash` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`swept_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `merchant_profiles` ADD `sandbox_mode` integer DEFAULT true NOT NULL;
