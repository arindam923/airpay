import { NextResponse } from "next/server";
import { createIntent, IntentError, toPublic } from "@/lib/intents";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("create-intent", clientIp(request), 30))) {
      return NextResponse.json({ error: "Too many payment links. Slow down." }, { status: 429 });
    }
    const body = await request.json();
    const intent = await createIntent({
      slug: String(body.slug ?? "checkout"),
      title: String(body.title ?? "").slice(0, 200),
      merchant: String(body.merchant ?? "Merchant").slice(0, 200),
      mode: body.mode === "flex" ? "flex" : "fixed",
      amount: Number(body.amount),
      min: Number(body.min ?? 0),
      max: body.max == null ? null : Number(body.max),
      chain: String(body.chain ?? ""),
      coin: String(body.coin ?? ""),
    });
    return NextResponse.json({ intent: toPublic(intent) }, { status: 201 });
  } catch (err) {
    if (err instanceof IntentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/payments] create failed:", err);
    return NextResponse.json({ error: "Could not create payment intent." }, { status: 500 });
  }
}
