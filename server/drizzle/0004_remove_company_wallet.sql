-- Migration: Remove company_wallet_address from merchant_wallets
-- SQLite does not support ALTER TABLE DROP COLUMN, so we recreate the table.

CREATE TABLE IF NOT EXISTS `__new_merchant_wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_profile_id` text NOT NULL,
	`network` text NOT NULL,
	`wallet_address` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_profile_id`) REFERENCES `merchant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_merchant_wallets`(
	"id",
	"merchant_profile_id",
	"network",
	"wallet_address",
	"created_at",
	"updated_at"
) SELECT
	"id",
	"merchant_profile_id",
	"network",
	"wallet_address",
	"created_at",
	"updated_at"
FROM `merchant_wallets`;

DROP TABLE `merchant_wallets`;

ALTER TABLE `__new_merchant_wallets` RENAME TO `merchant_wallets`;
