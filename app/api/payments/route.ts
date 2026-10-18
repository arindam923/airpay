import { after, NextResponse } from "next/server";
import { createIntent, IntentError, toPublic } from "@/lib/intents";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getLinkBySlug } from "@/lib/links";
import { getInvoiceById } from "@/lib/invoices";
import { testnetByName, testnetByKey } from "@/lib/chains";
import { DEFAULT_ENVIRONMENT, type Environment } from "@/lib/environment";
import { emitEvent, flushWebhooks } from "@/lib/webhooks";

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
    let invoiceId: string | null = typeof body.invoiceId === "string" ? body.invoiceId : null;
    // The stored link/invoice is the source of truth for the environment, so a
    // sandbox link can only ever settle on testnets.
    let environment: Environment = DEFAULT_ENVIRONMENT;

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
      environment = link.environment;
    } else if (invoiceId) {
      // Invoices are fixed-amount and own their receiver/asset allow-list.
      const invoice = await getInvoiceById(invoiceId);
      if (!invoice || invoice.status === "void") {
        invoiceId = null;
      } else {
        const allowed = invoice.allowed ?? {};
        const key = testnetByName(chain)?.key ?? null;
        if (!key || !allowed[key]?.includes(coin)) {
          chain = testnetByKey(invoice.chain_key)?.name ?? invoice.chain_key;
          coin = invoice.token;
        }
        title = `Invoice ${invoice.number}`;
        merchant = invoice.merchant;
        mode = "fixed";
        amount = invoice.total_usd;
        min = 0;
        max = null;
        receiver = invoice.receiver;
        organizationId = invoice.organizationId;
        environment = invoice.environment;
      }
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
      environment,
      receiver,
      invoiceId,
    });
    const publicIntent = toPublic(intent);
    await emitEvent({
      organizationId: intent.organizationId,
      environment: intent.environment,
      type: "payment.created",
      data: { intent: publicIntent },
      dedupeKey: `payment.created:${intent.id}`,
    });
    after(() => {
      void flushWebhooks();
    });
    return NextResponse.json({ intent: publicIntent }, { status: 201 });
  } catch (err) {
    if (err instanceof IntentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/payments] create failed:", err);
    return NextResponse.json({ error: "Could not create payment intent." }, { status: 500 });
  }
}
