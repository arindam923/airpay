import { connection } from "next/server";
import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";

const TERMINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Reconciler for serverless deploys: sweeps expired intents, QR-detects
 * incoming payments and verifies submitted txs when nobody is polling.
 * The checkout's GET self-heal is the fast path; this is the safety net.
 *
 * Schedule via vercel.json (`crons`); protect with CRON_SECRET.
 */
export async function GET(request: Request) {
  // Request-time only: never run maintenance during build/prerender.
  await connection();

  const secret = process.env.CRON_SECRET?.trim();
  const production = !!process.env.VERCEL || process.env.NODE_ENV === "production";
  if (!secret) {
    if (production) {
      console.error("[api/cron/verify] CRON_SECRET is not configured");
      return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
    }
  } else if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const started = Date.now();
  try {
    const stats = await runMaintenance({
      maxDetect: 15,
      maxVerify: 25,
      pruneTerminalOlderThanMs: TERMINAL_RETENTION_MS,
    });
    return NextResponse.json({ ok: true, tookMs: Date.now() - started, ...stats });
  } catch (err) {
    console.error("[api/cron/verify] failed:", err);
    return NextResponse.json({ ok: false, error: "Maintenance run failed." }, { status: 500 });
  }
}
