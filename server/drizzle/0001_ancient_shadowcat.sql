CREATE TABLE `check_out_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`network` text NOT NULL,
	`collect_email` integer NOT NULL,
	`buyer_email` text,
	`buyer_address` text,
	`signature` text,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`checkout_session_id` text NOT NULL,
	`tx_hash` text NOT NULL,
	`buyer_address` text,
	`signature` text,
	`status` text NOT NULL,
	`confirmations` integer NOT NULL,
	`settled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`checkout_session_id`) REFERENCES `check_out_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
