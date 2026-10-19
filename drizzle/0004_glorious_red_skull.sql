CREATE TABLE "checkout_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"intent_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"success_url" text,
	"cancel_url" text,
	"client_reference_id" text,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"organization_id" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"response_status" integer,
	"response_body" text,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	CONSTRAINT "idempotency_keys_organization_id_environment_key_pk" PRIMARY KEY("organization_id","environment","key")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "kind" text DEFAULT 'secret' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "client_secret_hash" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "production_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "production_enabled_at" bigint;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_intent_id_payment_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_org" ON "checkout_sessions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_intent" ON "checkout_sessions" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_status" ON "checkout_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys" USING btree ("expires_at");