import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { waitlistEntries } from "@/lib/schema";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createHash } from "node:crypto";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // Honeypot field: real users never fill this.
  website: z.string().max(0).optional().default(""),
});

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Silently accept honeypot submissions so bots get no signal.
  if (parsed.website) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const ip = clientIp(request);

  // Per-IP and per-email limits to prevent abuse.
  if (!(await rateLimit("waitlist-ip", ip, 5, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }
  if (!(await rateLimit("waitlist-email", parsed.email, 3, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many attempts for this email. Please try again later." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  try {
    const db = await getDb();
    await db.insert(waitlistEntries).values({
      id: crypto.randomUUID(),
      email: parsed.email,
      emailNormalized: parsed.email,
      ipHash: hashIp(ip),
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 500) || null,
      source: "landing",
      status: "pending",
      createdAt: Date.now(),
    });
  } catch (err) {
    // Unique constraint violation => already on the waitlist; treat as success.
    const message = err instanceof Error ? err.message : String(err);
    if (!/unique|duplicate/i.test(message)) {
      console.error("[api/waitlist] insert failed:", err);
      return NextResponse.json({ error: "Could not join the waitlist. Try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
