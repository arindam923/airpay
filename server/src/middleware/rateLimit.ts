import type { MiddlewareHandler } from "hono"
import type { Env } from "../index"

export interface RateLimitOptions {
  /** Number of requests allowed per window. */
  limit: number
  /** Window size in seconds. */
  windowSeconds: number
  /** Function that returns the rate-limit key for this request. */
  keyFn: (c: any) => string
}

/**
 * Fixed-window rate limiter backed by the Cloudflare Cache API.
 *
 * Note: the Cache API is per-data-center, not globally consistent. This is
 * acceptable as a Phase 1 abuse throttle; for stronger guarantees use D1 or
 * Cloudflare Rate Limiting.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<Env> {
  return async (c, next) => {
    const cache = (caches as any).default as Cache
    const identifier = options.keyFn(c)
    const windowStart = Math.floor(Date.now() / 1000 / options.windowSeconds) * options.windowSeconds
    const cacheKey = new Request(
      `https://rate-limit.airpay.internal/v1/${identifier}/${windowStart}`,
      { method: "GET" },
    )

    let count = 0
    const cached = await cache.match(cacheKey)
    if (cached) {
      const body = await cached.text()
      count = parseInt(body, 10) || 0
    }

    if (count >= options.limit) {
      const retryAfter = options.windowSeconds - (Math.floor(Date.now() / 1000) - windowStart)
      return c.json({
        error: {
          type: "rate_limit_error",
          message: "Too many requests. Please slow down.",
        },
      }, 429, { "Retry-After": String(Math.max(1, retryAfter)) })
    }

    // Increment counter
    const newCount = count + 1
    await cache.put(
      cacheKey,
      new Response(String(newCount), {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": `max-age=${options.windowSeconds}`,
        },
      }),
    )

    // Expose headers so SDK consumers can react
    c.header("X-RateLimit-Limit", String(options.limit))
    c.header("X-RateLimit-Remaining", String(Math.max(0, options.limit - newCount)))

    await next()
  }
}

/** Extract a stable client identifier from the request. Falls back to CF-Connecting-IP. */
export function clientIp(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "anonymous"
  )
}
