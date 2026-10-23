import "./env";

import { runCleanup, runMaintenance } from "../lib/maintenance";

const TICK_MS = 5_000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function log(level: "info" | "warn" | "error", msg: string, extra?: unknown): void {
  const line = `[worker ${new Date().toISOString()}] ${level.toUpperCase()} ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.log(line);
}

let lastCleanup = 0;

async function tick(): Promise<void> {
  const stats = await runMaintenance({ maxDetect: 25, maxVerify: 50, maxDeliveries: 50 });
  if (stats.expired || stats.detected || stats.verified || stats.delivered) {
    log(
      "info",
      `expired=${stats.expired} detected=${stats.detected} verified=${stats.verified} delivered=${stats.delivered}`,
    );
  }
  if (Date.now() - lastCleanup >= CLEANUP_INTERVAL_MS) {
    const cleanup = await runCleanup();
    lastCleanup = Date.now();
    log(
      "info",
      `cleanup intents=${cleanup.prunedIntents} kv=${cleanup.prunedKv} webhookEvents=${cleanup.prunedWebhookEvents} idempotency=${cleanup.prunedIdempotency}`,
    );
  }
}

let running = false;

async function loop(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await tick();
  } catch (err) {
    log("error", "tick crashed", err);
  } finally {
    running = false;
  }
}

log("info", `AirPay verification worker started (poll every ${TICK_MS / 1000}s)`);
log(
  "info",
  `QR auto-detect: ${process.env.ETHERSCAN_API_KEY ? "enabled" : "disabled (no ETHERSCAN_API_KEY)"}`,
);

void loop();
const timer = setInterval(() => void loop(), TICK_MS);

function shutdown(): void {
  log("info", "shutting down");
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
