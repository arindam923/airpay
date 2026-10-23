import { connection } from "next/server";
import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runCleanup } from "@/lib/maintenance";

/**
 * Cold-path housekeeping: prunes terminal intents, stale kv rows, delivered
 * webhook events and expired idempotency keys. Scheduled once a day from
 * vercel.json (the per-minute reconciler lives in `/api/cron/verify`).
 */
export async function GET(request: Request) {
  await connection();

  const auth = authorizeCron(request);
  if (!auth.ok) {
    if (auth.status === 500) {
      console.error("[api/cron/cleanup] CRON_SECRET is not configured");
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const started = Date.now();
  try {
    const stats = await runCleanup();
    return NextResponse.json({ ok: true, tookMs: Date.now() - started, ...stats });
  } catch (err) {
    console.error("[api/cron/cleanup] failed:", err);
    return NextResponse.json({ ok: false, error: "Cleanup run failed." }, { status: 500 });
  }
}
