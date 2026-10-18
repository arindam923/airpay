import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { emailSettings, member } from "@/lib/schema";
import {
  GOOGLE_STATE_COOKIE,
  encryptSecret,
  exchangeGoogleCode,
  googleOAuthConfigured,
} from "@/lib/email/google";

function settingsRedirect(request: NextRequest, result: string): NextResponse {
  return NextResponse.redirect(new URL(`/dashboard/settings?email=${result}`, request.url));
}

/**
 * OAuth callback: validates the state cookie, exchanges the code, and stores
 * the refresh token (encrypted) on the organization's `email_settings` row.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const nonce = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const origin = (process.env.BETTER_AUTH_URL?.trim() || request.nextUrl.origin).replace(/\/$/, "");

  if (request.nextUrl.searchParams.get("error")) {
    return settingsRedirect(request, "google_denied");
  }
  if (!code || !state || !nonce || !googleOAuthConfigured()) {
    return settingsRedirect(request, "google_failed");
  }

  const [orgId, stateNonce] = state.split(".");
  if (!orgId || !stateNonce || stateNonce !== nonce) {
    return settingsRedirect(request, "google_failed");
  }

  // The token may only be attached to an org the signed-in user belongs to.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return settingsRedirect(request, "google_failed");
  }
  const db = await getDb();
  const memberships = await db
    .select()
    .from(member)
    .where(eq(member.userId, session.user.id));
  if (!memberships.some((m) => m.organizationId === orgId)) {
    return settingsRedirect(request, "google_failed");
  }

  let email: string;
  let refreshToken: string | null;
  try {
    const tokens = await exchangeGoogleCode(code, origin);
    email = tokens.email;
    refreshToken = tokens.refreshToken;
  } catch (err) {
    console.error("[email/google] code exchange failed:", err);
    return settingsRedirect(request, "google_failed");
  }
  if (!refreshToken) {
    // No offline grant — retrying the flow with prompt=consent normally fixes this.
    return settingsRedirect(request, "google_no_token");
  }

  const now = Date.now();
  const existingRows = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.organizationId, orgId))
    .limit(1);
  const existing = existingRows[0] ?? null;

  const values = {
    provider: "google" as const,
    googleSubject: email,
    googleRefreshToken: encryptSecret(refreshToken),
    fromEmail: existing?.fromEmail || email,
    updatedAt: now,
  };
  if (existing) {
    await db
      .update(emailSettings)
      .set(values)
      .where(eq(emailSettings.organizationId, orgId));
  } else {
    await db
      .insert(emailSettings)
      .values({ organizationId: orgId, createdAt: now, ...values })
      .onConflictDoUpdate({ target: emailSettings.organizationId, set: values });
  }

  const res = settingsRedirect(request, "google_connected");
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}
