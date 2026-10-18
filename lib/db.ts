import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local");
}

const client = postgres(connectionString, { max: 10, prepare: false });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type PaymentIntent = import("./schema").PaymentIntentRow;
export async function getDb() {
  return db;
}
