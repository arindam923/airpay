import type { PaymentIntent } from "./db";
import { attachTx, expireIntent, getIntent, TERMINAL_STATUSES } from "./intents";
import {
  claimNextRun,
  DETECT_INTERVAL_MS,
  detectFor,
  VERIFY_CONFIRMING_MS,
  verifyAndMark,
} from "./maintenance";

/**
 * Advance an intent as far as it can go without the background worker, so a
 * polled `GET /api/payments/[id]` works on serverless (where there is no
 * always-on process). Throttling is a conditional UPDATE on `next_verify_at` /
 * `next_detect_at`, which holds across isolates — concurrent polls and the
 * worker all coordinate through the same columns.
 *
 * Never throws: failures leave the intent at its last known state so the poll
 * keeps returning something useful.
 */
export async function selfHeal(intent: PaymentIntent): Promise<PaymentIntent> {
  if (TERMINAL_STATUSES.includes(intent.status)) return intent;

  if (intent.status === "awaiting_payment") {
    if (intent.expires_at <= Date.now()) {
      await expireIntent(intent.id);
      return (await getIntent(intent.id)) ?? intent;
    }
    if (!intent.tx_hash) {
      if (await claimNextRun(intent.id, "next_detect_at", DETECT_INTERVAL_MS)) {
        try {
          const hash = await detectFor(intent);
          if (hash) await attachTx({ intentId: intent.id, txHash: hash });
        } catch (err) {
          console.warn(
            `[self-heal] detect intent ${intent.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
      return (await getIntent(intent.id)) ?? intent;
    }
  }

  if (intent.status === "submitted" || intent.status === "confirming") {
    if (await claimNextRun(intent.id, "next_verify_at", VERIFY_CONFIRMING_MS)) {
      try {
        await verifyAndMark(intent);
      } catch (err) {
        console.warn(
          `[self-heal] verify intent ${intent.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    return (await getIntent(intent.id)) ?? intent;
  }

  return (await getIntent(intent.id)) ?? intent;
}
