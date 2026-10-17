import "./env";

import { attachTx, expireIntent, listIntentsByStatus, markIntent } from "../lib/intents";
import { detectIncomingTx, verifyIntent } from "../lib/verify";

const TICK_MS = 5_000;

function log(level: "info" | "warn" | "error", msg: string, extra?: unknown): void {
  const line = `[worker ${new Date().toISOString()}] ${level.toUpperCase()} ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.log(line);
}

async function sweepExpired(): Promise<void> {
  const now = Date.now();
  const candidates = listIntentsByStatus(["created", "awaiting_payment"]);
  for (const intent of candidates) {
    if (intent.expires_at <= now) {
      expireIntent(intent.id);
      log("info", `intent ${intent.id} expired`);
    }
  }
}

async function detectQrPayments(): Promise<void> {
  if (!process.env.ETHERSCAN_API_KEY?.trim()) return;
  const pending = listIntentsByStatus(["awaiting_payment"]);
  for (const intent of pending) {
    try {
      const hash = await detectIncomingTx(intent);
      if (hash) {
        attachTx({ intentId: intent.id, txHash: hash });
        log("info", `intent ${intent.id} auto-detected tx ${hash}`);
      }
    } catch (err) {
      log("warn", `QR detect failed for intent ${intent.id}`, err);
    }
  }
}

async function verifyPending(): Promise<void> {
  const pending = listIntentsByStatus(["submitted", "confirming"]);
  for (const intent of pending) {
    try {
      const outcome = await verifyIntent(intent);
      if (outcome.kind === "pending") continue;
      if (outcome.kind === "confirming") {
        markIntent(intent.id, {
          status: "confirming",
          confirmations: outcome.confirmations,
          block_number: outcome.blockNumber,
        });
        log("info", `intent ${intent.id} confirming (${outcome.confirmations} conf)`);
      } else if (outcome.kind === "confirmed") {
        markIntent(intent.id, {
          status: "confirmed",
          confirmations: outcome.confirmations,
          block_number: outcome.blockNumber,
          confirmed: true,
        });
        log("info", `intent ${intent.id} CONFIRMED in block ${outcome.blockNumber}`);
      } else {
        markIntent(intent.id, {
          status: "failed",
          error: outcome.error,
          block_number: outcome.blockNumber,
        });
        log("warn", `intent ${intent.id} failed: ${outcome.error}`);
      }
    } catch (err) {
      log("warn", `verify failed for intent ${intent.id} (will retry)`, err);
    }
  }
}

async function tick(): Promise<void> {
  await sweepExpired();
  await detectQrPayments();
  await verifyPending();
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
log("info", `QR auto-detect: ${process.env.ETHERSCAN_API_KEY ? "enabled" : "disabled (no ETHERSCAN_API_KEY)"}`);

void loop();
const timer = setInterval(() => void loop(), TICK_MS);

function shutdown(): void {
  log("info", "shutting down");
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
