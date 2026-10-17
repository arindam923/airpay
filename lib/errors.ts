/** Extract readable messages from a viem/wagmi error including its cause chain. */
function collectMessages(err: unknown): string[] {
  const msgs: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur != null && depth < 6) {
    if (cur instanceof Error) {
      msgs.push(cur.message);
      const details = (cur as { details?: unknown }).details;
      if (typeof details === "string") msgs.push(details);
      cur = (cur as { cause?: unknown }).cause;
    } else {
      msgs.push(String(cur));
      break;
    }
    depth++;
  }
  return msgs;
}

/**
 * Turn wallet/RPC errors into short, actionable checkout messages.
 * Always logs the full error for debugging.
 */
export function friendlyTxError(err: unknown, context = "tx"): string {
  console.error(`[checkout] ${context} failed:`, err);

  const msgs = collectMessages(err);
  const flat = msgs.join(" | ").replace(/\s+/g, " ");

  if (/user rejected|user denied|rejected the request|request of user/i.test(flat)) {
    return "Transaction rejected in your wallet.";
  }

  for (const pattern of [
    /execution reverted with reason:\s*([^|]+)/i,
    /execution reverted:\s*([^|]+)/i,
  ]) {
    const m = flat.match(pattern);
    if (!m) continue;
    const reason = m[1]
      .trim()
      .split(/\s+(?:Estimate Gas Arguments|Version:|Details:|URL:|Request body|from:)/)[0]
      .replace(/[.,\s]+$/, "");
    if (reason) return `Transaction would revert: ${reason.slice(0, 140)}`;
  }

  if (/insufficient funds/i.test(flat)) {
    return "Not enough ETH to cover the amount + gas. Top up your testnet wallet from a faucet.";
  }

  if (/cannot estimate gas|gas estimation failed/i.test(flat)) {
    return "The transaction can't be executed right now — check your balance and the selected network.";
  }

  const short =
    (err instanceof Error && "shortMessage" in err
      ? (err as { shortMessage?: string }).shortMessage
      : undefined) ?? msgs[0] ?? "";

  if (!short) return "Transaction failed — check your wallet and try again.";
  return short.length > 160 ? "Transaction failed — check the browser console for details." : short;
}
