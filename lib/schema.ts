import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { IntentStatus } from "./api-types";

export const paymentIntents = sqliteTable(
  "payment_intents",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    merchant: text("merchant").notNull(),
    mode: text("mode").$type<"fixed" | "flex">().notNull(),
    amount_usd: real("amount_usd").notNull(),
    chain_key: text("chain_key").notNull(),
    token: text("token").notNull(),
    expected_units: text("expected_units").notNull(),
    receiver: text("receiver").notNull(),
    payer: text("payer"),
    tx_hash: text("tx_hash"),
    status: text("status").$type<IntentStatus>().notNull(),
    confirmations: integer("confirmations").notNull().default(0),
    block_number: integer("block_number"),
    error: text("error"),
    created_at: integer("created_at").notNull(),
    expires_at: integer("expires_at").notNull(),
    updated_at: integer("updated_at").notNull(),
    confirmed_at: integer("confirmed_at"),
    /** Earliest time the next on-chain verify may run (cross-isolate throttle). */
    next_verify_at: integer("next_verify_at"),
    /** Earliest time the next QR detect scan may run for this intent. */
    next_detect_at: integer("next_detect_at"),
  },
  (t) => [
    index("idx_intents_status").on(t.status),
    index("idx_intents_tx_hash").on(t.tx_hash),
    index("idx_intents_status_created").on(t.status, t.created_at),
    index("idx_intents_expires_at").on(t.expires_at),
    index("idx_intents_next_verify_at").on(t.next_verify_at),
  ],
);

export const kv = sqliteTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export type PaymentIntentRow = typeof paymentIntents.$inferSelect;
