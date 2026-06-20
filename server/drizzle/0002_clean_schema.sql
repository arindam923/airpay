CREATE TABLE IF NOT EXISTS `merchant_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_name` text NOT NULL,
	`fee_type` text DEFAULT 'part_of' NOT NULL,
	`fee_percentage` integer DEFAULT 200 NOT NULL,
	`webhook_url` text,
	`webhook_secret` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `merchant_wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`network` text NOT NULL,
	`wallet_address` text NOT NULL,
	`company_wallet_address` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`event` text NOT NULL,
	`url` text NOT NULL,
	`status_code` integer,
	`response_body` text,
	`attempt` integer NOT NULL,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `check_out_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`product_name` text NOT NULL,
	`amount` integer NOT NULL,
	`fee_amount` integer NOT NULL,
	`merchant_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`network` text NOT NULL,
	`company_wallet_address` text NOT NULL,
	`merchant_wallet_address` text NOT NULL,
	`collect_email` integer DEFAULT false NOT NULL,
	`buyer_email` text,
	`buyer_address` text,
	`signature` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`checkout_session_id` text NOT NULL,
	`tx_hash` text NOT NULL,
	`buyer_address` text,
	`signature` text,
	`amount` integer NOT NULL,
	`fee_amount` integer NOT NULL,
	`merchant_amount` integer NOT NULL,
	`status` text DEFAULT 'pending_confirmation' NOT NULL,
	`blockchain_status` text DEFAULT 'pending' NOT NULL,
	`confirmations` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`failure_reason` text,
	`webhook_delivered` integer DEFAULT false NOT NULL,
	`webhook_delivery_count` integer DEFAULT 0 NOT NULL,
	`settled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`checkout_session_id`) REFERENCES `check_out_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
