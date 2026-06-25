import type { ErrorType } from "./types.js"

/**
 * Base class for all AirPay SDK errors. Every error thrown by the SDK
 * extends this class, so `instanceof AirpayError` catches anything.
 */
export class AirpayError extends Error {
  readonly type: ErrorType
  readonly statusCode: number
  readonly requestId: string | null

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    requestId?: string | null,
  ) {
    super(message)
    this.name = "AirpayError"
    this.type = type
    this.statusCode = statusCode
    this.requestId = requestId ?? null
    Object.setPrototypeOf(this, AirpayError.prototype)
  }
}

/** 401 — bad or missing API key */
export class AirpayAuthenticationError extends AirpayError {
  constructor(message: string, requestId?: string | null) {
    super(message, "authentication_error", 401, requestId)
    this.name = "AirpayAuthenticationError"
    Object.setPrototypeOf(this, AirpayAuthenticationError.prototype)
  }
}

/** 403 — key type not permitted for this endpoint */
export class AirpayAuthorizationError extends AirpayError {
  constructor(message: string, requestId?: string | null) {
    super(message, "authorization_error", 403, requestId)
    this.name = "AirpayAuthorizationError"
    Object.setPrototypeOf(this, AirpayAuthorizationError.prototype)
  }
}

/** 400 — validation failure or bad request */
export class AirpayInvalidRequestError extends AirpayError {
  constructor(message: string, requestId?: string | null) {
    super(message, "invalid_request_error", 400, requestId)
    this.name = "AirpayInvalidRequestError"
    Object.setPrototypeOf(this, AirpayInvalidRequestError.prototype)
  }
}

/** 404 — resource not found */
export class AirpayNotFoundError extends AirpayError {
  constructor(message: string, requestId?: string | null) {
    super(message, "not_found_error", 404, requestId)
    this.name = "AirpayNotFoundError"
    Object.setPrototypeOf(this, AirpayNotFoundError.prototype)
  }
}

/** 410 — checkout session expired */
export class AirpayResourceExpiredError extends AirpayError {
  constructor(message: string, requestId?: string | null) {
    super(message, "resource_expired", 410, requestId)
    this.name = "AirpayResourceExpiredError"
    Object.setPrototypeOf(this, AirpayResourceExpiredError.prototype)
  }
}

/** 429 — rate limited */
export class AirpayRateLimitError extends AirpayError {
  readonly retryAfter: number | null

  constructor(message: string, requestId?: string | null, retryAfter?: number | null) {
    super(message, "rate_limit_error", 429, requestId)
    this.name = "AirpayRateLimitError"
    this.retryAfter = retryAfter ?? null
    Object.setPrototypeOf(this, AirpayRateLimitError.prototype)
  }
}

/** 500+ — server fault */
export class AirpayInternalError extends AirpayError {
  constructor(message: string, statusCode: number = 500, requestId?: string | null) {
    super(message, "internal_error", statusCode, requestId)
    this.name = "AirpayInternalError"
    Object.setPrototypeOf(this, AirpayInternalError.prototype)
  }
}

/** Network error — request never reached the server or connection failed */
export class AirpayNetworkError extends AirpayError {
  constructor(message: string, cause?: unknown) {
    super(message, "internal_error", 0, null)
    this.name = "AirpayNetworkError"
    if (cause !== undefined) {
      ;(this as any).cause = cause
    }
    Object.setPrototypeOf(this, AirpayNetworkError.prototype)
  }
}

/** Webhook signature verification failed */
export class AirpaySignatureVerificationError extends AirpayError {
  constructor(message: string) {
    super(message, "invalid_request_error", 400, null)
    this.name = "AirpaySignatureVerificationError"
    Object.setPrototypeOf(this, AirpaySignatureVerificationError.prototype)
  }
}

/**
 * Map an HTTP status + error body to the correct typed error class.
 * @internal
 */
export function errorFromResponse(
  status: number,
  body: { error?: { type?: string; message?: string } } | null,
  requestId?: string | null,
): AirpayError {
  const message = body?.error?.message ?? `HTTP ${status}`
  const type = body?.error?.type

  switch (type) {
    case "authentication_error":
      return new AirpayAuthenticationError(message, requestId)
    case "authorization_error":
      return new AirpayAuthorizationError(message, requestId)
    case "invalid_request_error":
      return new AirpayInvalidRequestError(message, requestId)
    case "not_found_error":
      return new AirpayNotFoundError(message, requestId)
    case "resource_expired":
      return new AirpayResourceExpiredError(message, requestId)
    case "rate_limit_error":
      return new AirpayRateLimitError(message, requestId)
    default:
      if (status >= 500) {
        return new AirpayInternalError(message, status, requestId)
      }
      return new AirpayError(message, (type as ErrorType) ?? "internal_error", status, requestId)
  }
}
