CREATE TABLE "email_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'platform' NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"from_email" text DEFAULT '' NOT NULL,
	"resend_api_key" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_secure" boolean,
	"smtp_user" text,
	"smtp_pass" text,
	"google_subject" text,
	"google_refresh_token" text,
	"last_test_status" text,
	"last_test_at" bigint,
	"last_test_error" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"to_email" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit_usd" real NOT NULL,
	"amount_usd" real NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text,
	"number" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"merchant" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"subtotal_usd" real NOT NULL,
	"tax_usd" real DEFAULT 0 NOT NULL,
	"total_usd" real NOT NULL,
	"due_at" bigint,
	"notes" text,
	"template" text DEFAULT 'minimal' NOT NULL,
	"accent" text DEFAULT '#6d5efc' NOT NULL,
	"receiver" text NOT NULL,
	"chain_key" text NOT NULL,
	"token" text NOT NULL,
	"allowed" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"sent_at" bigint,
	"viewed_at" bigint,
	"paid_at" bigint,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"merchant" text NOT NULL,
	"mode" text NOT NULL,
	"amount_usd" real NOT NULL,
	"min" real DEFAULT 0 NOT NULL,
	"max" real,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"chain_key" text NOT NULL,
	"token" text NOT NULL,
	"receiver" text NOT NULL,
	"allowed" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"webhook_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" bigint,
	"response_status" integer,
	"response_body" text,
	"error" text,
	"duration_ms" integer,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"delivered_at" bigint
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "environment" text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "environment" text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "environment" text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "updated_at" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "payout_mode" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "payout_addresses" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "account_type" text;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "enabled_chains" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "enabled_assets" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "invoice_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "invoice_reply_to" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "checkout_appearance" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "onboarded_at" bigint;--> statement-breakpoint
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_emails" ADD CONSTRAINT "invoice_emails_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_id_webhook_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."webhook_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_emails_invoice" ON "invoice_emails" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_items_invoice" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_org" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_org_env" ON "invoices" USING btree ("organization_id","environment");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_invoices_slug" ON "invoices" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_links_org" ON "payment_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_links_org_env" ON "payment_links" USING btree ("organization_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_links_slug" ON "payment_links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_due" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_webhook" ON "webhook_deliveries" USING btree ("webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_event" ON "webhook_deliveries" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_webhook_events_dedupe" ON "webhook_events" USING btree ("organization_id","environment","dedupe_key");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_org" ON "webhook_events" USING btree ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_org_env" ON "api_keys" USING btree ("organization_id","environment");--> statement-breakpoint
CREATE INDEX "idx_intents_org_env" ON "payment_intents" USING btree ("organization_id","environment");--> statement-breakpoint
CREATE INDEX "idx_intents_invoice" ON "payment_intents" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_org_env" ON "webhooks" USING btree ("organization_id","environment");