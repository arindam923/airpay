import { eq, lt } from "drizzle-orm";
import { getDb } from "./db";
import { kv } from "./schema";

/** Read a TTL'd key; expired entries are treated as missing (and pruned). */
export async function getKv(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.select().from(kv).where(eq(kv.key, key)).limit(1);
  const entry = row[0];
  if (!entry) return null;

  const sep = entry.value.lastIndexOf("|");
  if (sep === -1) return entry.value;
  const ttl = Number(entry.value.slice(sep + 1));
  if (!Number.isFinite(ttl) || ttl <= 0) return entry.value.slice(0, sep);
  if (entry.updated_at + ttl < Date.now()) {
    await db.delete(kv).where(eq(kv.key, key));
    return null;
  }
  return entry.value.slice(0, sep);
}

/** Write a TTL'd key. `ttlMs` of 0 means no expiry. */
export async function setKv(key: string, value: string, ttlMs = 0): Promise<void> {
  const db = await getDb();
  const stored = ttlMs > 0 ? `${value}|${ttlMs}` : value;
  await db
    .insert(kv)
    .values({ key, value: stored, updated_at: Date.now() })
    .onConflictDoUpdate({ target: kv.key, set: { value: stored, updated_at: Date.now() } });
}

export async function deleteKv(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(kv).where(eq(kv.key, key));
}

/**
 * Best-effort sliding-window counter (per isolate races only overcount, which
 * is the safe direction for rate limiting).
 */
export async function hitCounter(key: string, windowMs: number): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const row = await db.select().from(kv).where(eq(kv.key, key)).limit(1);
  const entry = row[0];
  const parsed = entry ? parseCounter(entry.value, entry.updated_at, now, windowMs) : null;
  const count = parsed ? parsed.count + 1 : 1;
  const resetAt = parsed ? parsed.resetAt : now + windowMs;
  await db
    .insert(kv)
    .values({ key, value: `${count}|${resetAt - now}`, updated_at: now })
    .onConflictDoUpdate({
      target: kv.key,
      set: { value: `${count}|${Math.max(0, resetAt - now)}`, updated_at: now },
    });
  return count;
}

function parseCounter(
  value: string,
  updatedAt: number,
  now: number,
  windowMs: number,
): { count: number; resetAt: number } | null {
  const [countStr, ttlStr] = value.split("|");
  const count = Number(countStr);
  const resetAt = updatedAt + (Number(ttlStr) || windowMs);
  if (!Number.isFinite(count) || resetAt <= now) return null;
  return { count, resetAt };
}

/** Housekeeping: drop stale kv rows (rate-limit windows, old caches). */
export async function pruneKv(olderThanMs: number): Promise<number> {
  const db = await getDb();
  const res = await db.delete(kv).where(lt(kv.updated_at, Date.now() - olderThanMs));
  return res.rowsAffected;
}
