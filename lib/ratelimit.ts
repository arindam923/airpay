import { hitCounter } from "./kv";

/**
 * Per-IP sliding-window limit backed by the shared `kv` table, so it holds
 * across serverless isolates. Returns true when the request is allowed.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowMs = 60_000,
): Promise<boolean> {
  const key = `rl:${bucket}:${identifier.toLowerCase()}`;
  const count = await hitCounter(key, windowMs);
  return count <= limit;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
