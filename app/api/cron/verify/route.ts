import { connection } from "next/server";
import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runMaintenance } from "@/lib/maintenance";

/**
 * Reconciler for serverless deploys: sweeps expired intents, QR-detects
 * incoming payments and verifies submitted txs when nobody is polling.
 * The checkout's GET self-heal is the fast path; this is the safety net.
 *
 * Vercel Hobby cannot run per-minute crons, so an external scheduler
 * (cron-job.org) pings this route every minute. Protect with CRON_SECRET.
 * Daily pruning lives in `/api/cron/cleanup`.
 */
export async function GET(request: Request) {
  // Request-time only: never run maintenance during build/prerender.
  await connection();

  const auth = authorizeCron(request);
  if (!auth.ok) {
    if (auth.status === 500) {
      console.error("[api/cron/verify] CRON_SECRET is not configured");
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const started = Date.now();
  try {
    // Kept small so a tick stays inside the pinger's request timeout.
    const stats = await runMaintenance({
      maxDetect: 15,
      maxVerify: 25,
      maxDeliveries: 10,
    });
    return NextResponse.json({ ok: true, tookMs: Date.now() - started, ...stats });
  } catch (err) {
    console.error("[api/cron/verify] failed:", err);
    return NextResponse.json({ ok: false, error: "Maintenance run failed." }, { status: 500 });
  }
}
