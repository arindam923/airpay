import { NextResponse } from "next/server";
import { getIntent, toPublic } from "@/lib/intents";
import { selfHeal } from "@/lib/selfheal";
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const intent = await getIntent(id);
  if (!intent) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }
  const healed = await selfHeal(intent);
  return NextResponse.json({ intent: toPublic(healed) });
}
