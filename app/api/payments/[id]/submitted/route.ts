import { NextResponse } from "next/server";
import { attachTx, IntentError, toPublic } from "@/lib/intents";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const intent = attachTx({
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
