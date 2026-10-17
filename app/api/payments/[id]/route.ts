import { NextResponse } from "next/server";
import { getIntent, toPublic } from "@/lib/intents";
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const intent = getIntent(id);
  if (!intent) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }
  return NextResponse.json({ intent: toPublic(intent) });
}
