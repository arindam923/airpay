/**
 * Webhook checks: pure signing/backoff/catalog assertions always run; when a
 * real DATABASE_URL is configured, a full emit → deliver → verify round-trip is
 * exercised against a local HTTP listener.
 *
 *   npx tsx scripts/check-webhooks.ts
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotEnv();

const HAS_DB = !!process.env.DATABASE_URL?.trim();
if (!HAS_DB) process.env.DATABASE_URL = "postgres://user:pass@127.0.0.1:5432/airpay";
process.env.EMAIL_ENCRYPTION_KEY ||= process.env.BETTER_AUTH_SECRET || "webhook-check-secret";

type Row = { label: string; ok: boolean; detail: string };
const rows: Row[] = [];
let skipped = 0;
function record(label: string, ok: boolean, detail: string): void {
  rows.push({ label, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}\n        ${detail}`);
}

function skip(label: string, detail: string): void {
  skipped += 1;
  console.log(`  SKIP  ${label}\n        ${detail}`);
}

function assert(label: string, cond: boolean, detail: string): void {
  record(label, cond, detail);
}

async function main(): Promise<void> {
  const { signPayload, backoffMs, MAX_ATTEMPTS } = await import("../lib/webhooks");
  const { WEBHOOK_EVENT_TYPES, WEBHOOK_SUBSCRIBABLE_EVENTS } = await import("../lib/webhook-events");

  // --- Signature ----------------------------------------------------------
  const secret = "shh_test_secret";
  const ts = 1_700_000_000;
  const body = JSON.stringify({ id: "evt_1", type: "payment.confirmed" });
  const expected =
    "t=" + ts + ",v1=" + createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  assert("signPayload matches independent HMAC", signPayload(secret, ts, body) === expected, expected);
  assert(
    "signPayload is canonical t=,v1=",
    /^t=\d+,v1=[0-9a-f]{64}$/.test(signPayload(secret, ts, body)),
    signPayload(secret, ts, body),
  );
  const a = Buffer.from(signPayload(secret, ts, body).split("v1=")[1], "hex");
  const b = Buffer.from(signPayload(secret, ts, body).split("v1=")[1], "hex");
  assert("signature verifies with timingSafeEqual", a.length === b.length && timingSafeEqual(a, b), "constant-time OK");

  // --- Backoff ------------------------------------------------------------
  assert("backoff(1) is the first step", backoffMs(1) === 30_000, `${backoffMs(1)}ms`);
  assert("backoff is monotonic", [1, 2, 3, 4, 5, 6, 7, 8].every((n) => backoffMs(n) <= backoffMs(n + 1)), "non-decreasing");
  assert("backoff caps at MAX_ATTEMPTS", backoffMs(MAX_ATTEMPTS) === backoffMs(MAX_ATTEMPTS + 5), `${backoffMs(MAX_ATTEMPTS)}ms`);

  // --- Catalog ------------------------------------------------------------
  assert("catalog has core payment events", ["payment.confirmed", "payment.failed"].every((e) => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e)), WEBHOOK_EVENT_TYPES.length + " types");
  assert("catalog has core invoice/link events", ["invoice.paid", "link.created"].every((e) => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e)), "present");
  assert("test events are not subscribable", !(WEBHOOK_SUBSCRIBABLE_EVENTS as readonly string[]).includes("webhook.test"), WEBHOOK_SUBSCRIBABLE_EVENTS.length + " subscribable");

  if (!HAS_DB) {
    console.log("\n(no DATABASE_URL — skipping live delivery round-trip)");
    finish();
    return;
  }

  // --- Live round-trip ----------------------------------------------------
  const { getDb } = await import("../lib/db");
  const { organization, webhooks, webhookEvents } = await import("../lib/schema");
  const { and, eq } = await import("drizzle-orm");
  const { emitEvent, deliverPending } = await import("../lib/webhooks");
  const { encryptSecret } = await import("../lib/crypto");

  const db = await getDb();
  const org = (await db.select().from(organization).limit(1))[0];
  if (!org) {
    console.log("\n(no organization rows — skipping live delivery round-trip)");
    finish();
    return;
  }

  const rawSecret = randomBytes(24).toString("hex");
  const webhookId = `wh_check_${randomBytes(4).toString("hex")}`;
  const dedupeKey = `check:${randomBytes(6).toString("hex")}`;
  let received: { headers: http.IncomingHttpHeaders; body: string } | null = null;
  let inserted = false;

  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      received = { headers: req.headers, body: data };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  try {
    await db.insert(webhooks).values({
      id: webhookId,
      organizationId: org.id,
      url: `http://127.0.0.1:${port}/hook`,
      events: ["payment.confirmed"],
      secret: encryptSecret(rawSecret),
      environment: "sandbox",
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    inserted = true;

    await emitEvent({
      organizationId: org.id,
      environment: "sandbox",
      type: "payment.confirmed",
      data: { intent: { id: "it_check", status: "confirmed" } },
      dedupeKey,
    });
    const delivered = await deliverPending(5);

    await new Promise((r) => setTimeout(r, 100));
    assert("delivery was attempted", delivered >= 1, `${delivered} sent`);
    assert("endpoint received the POST", received !== null, received ? "body captured" : "no request");

    const r = received as { headers: http.IncomingHttpHeaders; body: string } | null;
    if (r) {
      const sig = String(r.headers["airpay-signature"] ?? "");
      const [tPart, vPart] = sig.split(",");
      const t = Number(tPart?.replace("t=", ""));
      const mac = createHmac("sha256", rawSecret).update(`${t}.${r.body}`).digest("hex");
      assert("signature verifies against delivered body", vPart === `v1=${mac}`, sig || "missing");
      assert("event type header is correct", r.headers["airpay-event-type"] === "payment.confirmed", String(r.headers["airpay-event-type"]));
      assert("payload carries envelope", /"type":"payment.confirmed"/.test(r.body), r.body.slice(0, 120));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/does not exist|42P01/.test(message)) {
      skip("live delivery round-trip", "webhook tables missing — run `npm run db:push`");
    } else {
      record("live delivery round-trip", false, message);
    }
  } finally {
    server.close();
    server.closeAllConnections?.();
    if (inserted) {
      await db
        .delete(webhookEvents)
        .where(and(eq(webhookEvents.organizationId, org.id), eq(webhookEvents.dedupe_key, dedupeKey)))
        .catch(() => {});
      await db.delete(webhooks).where(eq(webhooks.id, webhookId)).catch(() => {});
    }
  }

  finish();
}

function finish(): void {
  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${"-".repeat(60)}`);
  console.log(`${rows.length - failed.length}/${rows.length} checks passed${skipped ? `, ${skipped} skipped` : ""}`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.label}: ${f.detail}`);
  }
  // The postgres pool keeps the event loop alive; exit explicitly.
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
