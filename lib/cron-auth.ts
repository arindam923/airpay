import { timingSafeEqual } from "node:crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

/**
 * Scheduler-agnostic guard for `/api/cron/*` routes. Vercel Cron and external
 * pingers (cron-job.org, Cloudflare Workers) send the secret as
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * Local dev without `CRON_SECRET` is allowed so `curl` keeps working.
 */
export function authorizeCron(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET?.trim();
  const production = !!process.env.VERCEL || process.env.NODE_ENV === "production";

  if (!secret) {
    return production
      ? { ok: false, status: 500, error: "Cron is not configured." }
      : { ok: true };
  }

  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  const authorized =
    actual.length === expected.length && timingSafeEqual(actual, expected);

  return authorized ? { ok: true } : { ok: false, status: 401, error: "Unauthorized." };
}
