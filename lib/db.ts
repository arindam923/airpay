import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import type { IntentStatus } from "./api-types";
import * as schema from "./schema";

export type { IntentStatus };
export type PaymentIntent = schema.PaymentIntentRow;

const DDL = `
CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  merchant TEXT NOT NULL,
  mode TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  chain_key TEXT NOT NULL,
  token TEXT NOT NULL,
  expected_units TEXT NOT NULL,
  receiver TEXT NOT NULL,
  payer TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 0,
  block_number INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  next_verify_at INTEGER,
  next_detect_at INTEGER
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

// Applied after DDL on pre-existing databases that predate the throttle columns.
const MIGRATIONS = [
  "ALTER TABLE payment_intents ADD COLUMN next_verify_at INTEGER",
  "ALTER TABLE payment_intents ADD COLUMN next_detect_at INTEGER",
];

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_tx_hash ON payment_intents(tx_hash);
CREATE INDEX IF NOT EXISTS idx_intents_status_created ON payment_intents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_intents_expires_at ON payment_intents(expires_at);
CREATE INDEX IF NOT EXISTS idx_intents_next_verify_at ON payment_intents(next_verify_at);
`;

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;
let ready: Promise<void> | null = null;

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (url) return createClient({ url, authToken: authToken || undefined });

  const file = path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH?.trim() || "./data/airpay.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return createClient({ url: `file:${file}` });
}

async function ensureSchema(c: Client): Promise<void> {
  await c.executeMultiple(DDL);
  for (const migration of MIGRATIONS) {
    try {
      await c.execute(migration);
    } catch (err) {
      // "duplicate column" — already applied on an existing database.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate column/i.test(msg)) throw err;
    }
  }
  await c.executeMultiple(INDEXES);
}

/** Drizzle handle, with the schema idempotently ensured on first use. */
export async function getDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (!db || !client) {
    client = makeClient();
    db = drizzle(client, { schema });
  }
  const c = client;
  if (!ready) {
    ready = ensureSchema(c).catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return db;
}
