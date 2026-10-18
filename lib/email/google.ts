import { decryptSecret, encryptSecret } from "@/lib/crypto";

export const GOOGLE_STATE_COOKIE = "airpay_google_oauth";
export const GOOGLE_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function googleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/email/google/callback`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  email: string;
}

/** Authorization-code exchange + best-effort account email resolution. */
export async function exchangeGoogleCode(code: string, origin: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google rejected the authorization code.");
  }

  let email = "";
  if (data.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(data.id_token.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as { email?: string };
      email = payload.email ?? "";
    } catch {
      email = "";
    }
  }
  if (!email) {
    const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const profile = (await info.json().catch(() => ({}))) as { email?: string };
    email = profile.email ?? "";
  }
  if (!email) {
    throw new Error("Google didn't return an email address for this account.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    email,
  };
}

export { decryptSecret, encryptSecret };
