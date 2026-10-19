/**
 * Error + response primitives for the public `/v1` API.
 *
 * The wire format is intentionally Stripe-shaped so generated and hand-written
 * SDKs can share one error parser:
 *
 *   { "error": { "type", "code", "message", "param" } }
 */

export type ApiErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "permission_error"
  | "rate_limit_error"
  | "idempotency_error"
  | "api_error";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly param?: string,
    public readonly type: ApiErrorType = "invalid_request_error",
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.param ? { param: this.param } : {}),
      },
    };
  }
}

export const API_VERSION = "2026-10-19";

export function requestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function apiHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  headers.set("airpay-version", API_VERSION);
  return headers;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  init?: { headers?: Record<string, string>; id?: string },
): Response {
  const headers = apiHeaders(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-request-id", init?.id ?? requestId());
  return new Response(JSON.stringify(body), { status, headers });
}

/** Normalise anything thrown by a handler into the public error envelope. */
export function handleApiError(err: unknown, id: string): Response {
  if (err instanceof ApiError) {
    return jsonResponse(err.toJSON(), err.status, { id });
  }
  if (err instanceof Error && err.name === "IntentError") {
    const status = (err as Error & { status?: number }).status ?? 400;
    return jsonResponse(
      {
        error: {
          type: "invalid_request_error",
          code: "payment_intent_error",
          message: err.message,
        },
      },
      status,
      { id },
    );
  }
  console.error("[api/v1] unhandled error:", err);
  return jsonResponse(
    {
      error: {
        type: "api_error",
        code: "internal_error",
        message: "An unexpected error occurred.",
      },
    },
    500,
    { id },
  );
}

/** CORS is only attached to publishable-key (browser) responses. */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, idempotency-key, airpay-client-secret, airpay-version",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}
