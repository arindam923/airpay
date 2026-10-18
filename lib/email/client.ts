import type { ResolvedEmailConfig } from "./config";

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "AirPay <invoices@airpay.dev>";
}

export interface OutboundEmail {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
}

/**
 * Dispatches a transactional email through the transport resolved for the
 * organization: platform Resend (env key), the merchant's own Resend key,
 * their SMTP relay, or their connected Google account (Gmail API).
 * No SDKs — fetch + raw MIME keep the dependency surface small.
 */
export async function sendEmail(
  msg: OutboundEmail,
  config: ResolvedEmailConfig,
): Promise<{ id: string }> {
  if (config.provider === "smtp") {
    if (!config.smtp) throw new Error("SMTP isn't configured for this workspace.");
    return sendViaSmtp(msg, config.smtp);
  }
  if (config.provider === "google") {
    if (!config.google) throw new Error("Google isn't connected for this workspace.");
    return sendViaGoogle(msg, config.google);
  }
  return sendViaResend(msg, config.resendApiKey);
}

async function sendViaResend(
  msg: OutboundEmail,
  fallbackKey: string | undefined,
): Promise<{ id: string }> {
  const key = fallbackKey || process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Email delivery isn't configured yet. Add RESEND_API_KEY to your environment or connect your own sender in Settings.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: msg.from,
      to: [msg.to],
      reply_to: msg.replyTo || undefined,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Email provider returned ${res.status}.`);
  }
  return { id: data.id ?? "" };
}

async function sendViaSmtp(
  msg: OutboundEmail,
  smtp: NonNullable<ResolvedEmailConfig["smtp"]>,
): Promise<{ id: string }> {
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  try {
    const info = await transport.sendMail({
      from: msg.from,
      to: msg.to,
      replyTo: msg.replyTo || undefined,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { id: info.messageId ?? "" };
  } finally {
    transport.close();
  }
}

async function sendViaGoogle(
  msg: OutboundEmail,
  google: NonNullable<ResolvedEmailConfig["google"]>,
): Promise<{ id: string }> {
  const accessToken = await googleAccessToken(google.refreshToken);
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: buildMime(msg) }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const reason = data.error?.message || `Gmail API returned ${res.status}.`;
    if (res.status === 401 || data.error?.status === "UNAUTHENTICATED") {
      throw new Error("Google connection expired — reconnect Google in Settings.");
    }
    throw new Error(reason);
  }
  return { id: data.id ?? "" };
}

async function googleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google sending isn't available on this deployment (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
    );
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      throw new Error("Google connection expired — reconnect Google in Settings.");
    }
    throw new Error(data.error_description || data.error || "Could not refresh Google access.");
  }
  return data.access_token;
}

/** RFC 5322 / MIME (`multipart/alternative`) for the Gmail `raw` field. */
function buildMime(msg: OutboundEmail): string {
  const boundary = `airpay-${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${encodeHeader(msg.from)}`,
    `To: ${encodeHeader(msg.to)}`,
    ...(msg.replyTo ? [`Reply-To: ${encodeHeader(msg.replyTo)}`] : []),
    `Subject: ${encodeHeader(msg.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const parts = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    msg.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    msg.html,
    `--${boundary}--`,
    "",
  ];
  return Buffer.from([...headers, "", ...parts].join("\r\n"), "utf8").toString("base64url");
}

/** Non-ASCII header values must be RFC 2047 encoded. */
function encodeHeader(value: string): string {
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
