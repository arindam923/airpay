import type { AirPayErrorType } from "./types.js";

export type { AirPayErrorType };

export interface AirPayErrorPayload {
  type: AirPayErrorType;
  code: string;
  message: string;
  param?: string;
}

/**
 * Any error returned by the AirPay API. Inspect `type`, `code` and `param` to
 * branch programmatically; `statusCode` and `requestId` aid debugging.
 */
export class AirPayError extends Error {
  readonly type: AirPayErrorType;
  readonly code: string;
  readonly param?: string;
  readonly statusCode: number;
  readonly requestId?: string;

  constructor(payload: AirPayErrorPayload, statusCode: number, requestId?: string) {
    super(payload.message);
    this.name = "AirPayError";
    this.type = payload.type;
    this.code = payload.code;
    this.param = payload.param;
    this.statusCode = statusCode;
    this.requestId = requestId;
    Object.setPrototypeOf(this, AirPayError.prototype);
  }

  static fromResponse(statusCode: number, body: unknown, requestId?: string): AirPayError {
    const payload = extractErrorPayload(body);
    return new AirPayError(payload, statusCode, requestId);
  }
}

function extractErrorPayload(body: unknown): AirPayErrorPayload {
  const fallback: AirPayErrorPayload = {
    type: "api_error",
    code: "unknown_error",
    message: "An unexpected error occurred.",
  };

  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object") return fallback;

  const record = error as Record<string, unknown>;
  return {
    type: typeof record.type === "string" ? (record.type as AirPayErrorType) : fallback.type,
    code: typeof record.code === "string" ? record.code : fallback.code,
    message: typeof record.message === "string" ? record.message : fallback.message,
    ...(typeof record.param === "string" ? { param: record.param } : {}),
  };
}

/** Thrown when the request never reached the API (DNS, timeout, offline). */
export class AirPayConnectionError extends Error {
  readonly code: string;

  constructor(message: string, code = "connection_error") {
    super(message);
    this.name = "AirPayConnectionError";
    this.code = code;
    Object.setPrototypeOf(this, AirPayConnectionError.prototype);
  }
}

export function isAirPayError(err: unknown): err is AirPayError {
  return err instanceof AirPayError;
}
