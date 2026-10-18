import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { member } from "@/lib/schema";
import { GOOGLE_SEND_SCOPE, GOOGLE_STATE_COOKIE, googleOAuthConfigured } from "@/lib/email/google";

function appOrigin(request: NextRequest): string {
  return (process.env.BETTER_AUTH_URL?.trim() || request.nextUrl.origin).replace(/\/$/, "");
}

function settingsRedirect(request: NextRequest, result: string): NextResponse {
  return NextResponse.redirect(new URL(`/dashboard/settings?email=${result}`, request.url));
}

/**
 * Starts the merchant's Google consent flow for sending invoice email.
 * The state cookie binds the callback to this browser session; the state
 * param carries the organization the token belongs to.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (!googleOAuthConfigured()) {
    return settingsRedirect(request, "google_unavailable");
  }

  const db = await getDb();
  const memberships = await db
    .select()
    .from(member)
    .where(eq(member.userId, session.user.id));
  const activeId = session.session?.activeOrganizationId ?? null;
  const chosen =
    (activeId && memberships.find((m) => m.organizationId === activeId)) || memberships[0];
  if (!chosen) {
    return settingsRedirect(request, "google_failed");
  }

  const origin = appOrigin(request);
  const nonce = randomBytes(16).toString("base64url");
  const state = `${chosen.organizationId}.${nonce}`;

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: `${origin}/api/email/google/callback`,
    response_type: "code",
    scope: `${GOOGLE_SEND_SCOPE} openid email profile`,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();

  const res = NextResponse.redirect(authorize);
  res.cookies.set(GOOGLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    maxAge: 600,
    path: "/",
  });
  return res;
}
