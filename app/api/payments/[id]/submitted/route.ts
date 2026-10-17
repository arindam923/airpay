import { NextResponse } from "next/server";
import { attachTx, IntentError, toPublic } from "@/lib/intents";
import { clientIp, rateLimit } from "@/lib/ratelimit";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    if (!(await rateLimit("submit-tx", clientIp(request), 60))) {
      return NextResponse.json({ error: "Too many submissions. Slow down." }, { status: 429 });
    }
    const body = await request.json();
    const intent = await attachTx({
      intentId: id,
      txHash: String(body.txHash ?? ""),
      payer: body.payer ? String(body.payer) : null,
    });
    return NextResponse.json({ intent: toPublic(intent) });
  } catch (err) {
    if (err instanceof IntentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/payments/submit] failed:", err);
    return NextResponse.json({ error: "Could not record transaction." }, { status: 500 });
  }
}
