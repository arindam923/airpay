CREATE TABLE "settlement_merchants" (
	"organization_id" text NOT NULL,
	"chain_key" text NOT NULL,
	"merchant_id" text NOT NULL,
	"contract_address" text NOT NULL,
	"payout_address" text NOT NULL,
	"fee_bps" integer DEFAULT 90 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"register_tx_hash" text,
	"error" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "settlement_merchants_organization_id_chain_key_pk" PRIMARY KEY("organization_id","chain_key")
);
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "merchant_id" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "fee_bps" integer;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "fee_units" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "net_units" text;--> statement-breakpoint
ALTER TABLE "settlement_merchants" ADD CONSTRAINT "settlement_merchants_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_settlement_merchants_org" ON "settlement_merchants" USING btree ("organization_id");