CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"source" text DEFAULT 'landing' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_waitlist_email" ON "waitlist_entries" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "idx_waitlist_created" ON "waitlist_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status" ON "waitlist_entries" USING btree ("status");