import { NextResponse } from "next/server";
import { createIntent, IntentError, toPublic } from "@/lib/intents";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getLinkBySlug } from "@/lib/links";
import { testnetByName, testnetByKey } from "@/lib/chains";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("create-intent", clientIp(request), 30))) {
      return NextResponse.json({ error: "Too many payment links. Slow down." }, { status: 429 });
    }
    const body = await request.json();

    const slug = String(body.slug ?? "checkout");
    let title = String(body.title ?? "").slice(0, 200);
    let merchant = String(body.merchant ?? "Merchant").slice(0, 200);
    let mode: "fixed" | "flex" = body.mode === "flex" ? "flex" : "fixed";
    let amount = Number(body.amount);
    let min = Number(body.min ?? 0);
    let max = body.max == null ? null : Number(body.max);
    let chain = String(body.chain ?? "");
    let coin = String(body.coin ?? "");
    let receiver: string | null = null;
    let organizationId: string | null = null;

    // When the slug maps to a stored link, the link is the source of truth for
    // the receiver, the merchant details, and which chain/asset pairs are allowed.
    const link = await getLinkBySlug(slug);
    if (link && link.active) {
      const allowed = link.allowed ?? {};
      const key = testnetByName(chain)?.key ?? null;
      if (!key || !allowed[key]?.includes(coin)) {
        chain = testnetByKey(link.chain_key)?.name ?? link.chain_key;
        coin = link.token;
      }
      title = link.title;
      merchant = link.merchant;
      mode = link.mode;
      if (link.mode === "fixed") {
        amount = link.amount_usd;
        min = 0;
        max = null;
      } else {
        min = link.min;
        max = link.max;
        const upper = max ?? Number.POSITIVE_INFINITY;
        amount = Math.min(Math.max(amount, min), upper);
      }
      receiver = link.receiver;
      organizationId = link.organizationId;
    }

    const intent = await createIntent({
      organizationId,
      slug,
      title,
      merchant,
      mode,
      amount,
      min,
      max,
      chain,
      coin,
      receiver,
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
