import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { IntentStatus } from "./api-types";

export type { IntentStatus };

export interface PaymentIntent {
  id: string;
  slug: string;
  title: string;
  merchant: string;
  mode: "fixed" | "flex";
  amount_usd: number;
  chain_key: string;
  token: string;
  expected_units: string;
  receiver: string;
  payer: string | null;
  tx_hash: string | null;
  status: IntentStatus;
  confirmations: number;
  block_number: number | null;
  error: string | null;
  created_at: number;
  expires_at: number;
  updated_at: number;
  confirmed_at: number | null;
}

const SCHEMA = `
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
  confirmed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_tx_hash ON payment_intents(tx_hash);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const file = process.env.DATABASE_PATH?.trim() || "./data/airpay.db";
  const dir = path.dirname(path.resolve(/* turbopackIgnore: true */ file));
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
