import type { AirPayErrorType } from "./types.js";

export interface AirPayErrorPayload {
  type: AirPayErrorType;
  code: string;
  message: string;
  param?: string;
}

/** Every error returned by the AirPay API surface as an `AirPayError`. */
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
    const fallback: AirPayErrorPayload = {
      type: "api_error",
      code: "unknown_error",
      message: "An unexpected error occurred.",
    };
    let payload = fallback;
    if (body && typeof body === "object") {
      const error = (body as { error?: unknown }).error;
      if (error && typeof error === "object") {
        const record = error as Record<string, unknown>;
        payload = {
          type: typeof record.type === "string" ? (record.type as AirPayErrorType) : fallback.type,
          code: typeof record.code === "string" ? record.code : fallback.code,
          message: typeof record.message === "string" ? record.message : fallback.message,
          ...(typeof record.param === "string" ? { param: record.param } : {}),
        };
      }
    }
    return new AirPayError(payload, statusCode, requestId);
  }
}

export function isAirPayError(err: unknown): err is AirPayError {
  return err instanceof AirPayError;
}
