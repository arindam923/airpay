import {
  AirpayError,
  AirpayNetworkError,
  errorFromResponse,
} from "./errors.js";
import type { AirpayConfig, ApiErrorBody, ErrorType } from "./types.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE_URL = "https://airpay-server.arindam92.workers.dev";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;

/** Retriable status codes (server errors + rate limit). */
const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Methods that are safe to retry (idempotent enough for our API). */
const RETRIABLE_METHODS = new Set(["GET", "POST"]);

/**
 * Internal HTTP client. Handles auth headers, timeouts, retries with
 * exponential backoff, and error mapping. Resource classes delegate
 * to this — they never touch fetch directly.
 */
export class HttpClient {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly publishableKey: string | undefined;
  readonly timeout: number;
  readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: AirpayConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = config.secretKey;
    this.publishableKey = config.publishableKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchFn = config.fetch ?? globalThis.fetch;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `airpay-node/${VERSION}`,
      ...(config.defaultHeaders ?? {}),
    };
  }

  /**
   * Pick the appropriate API key for a request. Secret-key endpoints get
   * the secret key; publishable-key-only calls get the publishable key.
   */
  private resolveKey(keyType: "secret" | "publishable" | "auto"): string {
    if (keyType === "secret") {
      if (!this.apiKey) {
        throw new AirpayError(
          "This endpoint requires a secret key (sk_test_ or sk_live_)",
          "authorization_error",
          403,
        );
      }
      return this.apiKey;
    }
    if (keyType === "publishable") {
      if (!this.publishableKey) {
        throw new AirpayError(
          "This endpoint requires a publishable key (pk_test_ or pk_live_)",
          "authorization_error",
          403,
        );
      }
      return this.publishableKey;
    }
    // auto: prefer secret, fall back to publishable
    if (!this.apiKey && !this.publishableKey) {
      throw new AirpayError(
        "AirPay client requires a secretKey or publishableKey",
        "authentication_error",
        0,
      );
    }
    return this.apiKey ?? this.publishableKey ?? "";
  }

  /**
   * Perform an authenticated request and return the parsed JSON body.
   * Throws a typed AirpayError subclass on any non-2xx response.
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: {
      keyType?: "secret" | "publishable" | "auto" | "none";
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const keyType = options.keyType ?? "auto";
    const authKey = keyType === "none" ? undefined : this.resolveKey(keyType);

    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    };
    if (authKey) {
      headers["Authorization"] = `Bearer ${authKey}`;
    }

    const body =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Exponential backoff: 0.5s, 1s, 2s, 4s ...
      if (attempt > 0) {
        const delayMs = Math.min(500 * 2 ** (attempt - 1), 8000);
        await sleep(delayMs);
      }

      try {
        const response = await this.doFetch(url, method, headers, body);
        const requestId =
          response.headers.get("cf-ray") ??
          response.headers.get("x-request-id") ??
          null;

        // Success — parse and return
        if (response.status >= 200 && response.status < 300) {
          if (response.status === 204) return undefined as T;
          const text = await response.text();
          if (!text) return undefined as T;
          return JSON.parse(text) as T;
        }

        // Error — parse the error body
        const errorBody = await this.parseErrorBody(response);

        // Rate limit: honor Retry-After
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter && attempt < this.maxRetries) {
            await sleep(parseInt(retryAfter, 10) * 1000);
            continue;
          }
        }

        // Retriable server error: retry if attempts remain
        if (
          RETRIABLE_STATUS.has(response.status) &&
          attempt < this.maxRetries &&
          RETRIABLE_METHODS.has(method)
        ) {
          lastError = errorFromResponse(response.status, errorBody, requestId);
          continue;
        }

        // Non-retriable error: throw immediately
        throw errorFromResponse(response.status, errorBody, requestId);
      } catch (err) {
        if (err instanceof AirpayError) {
          // Already a typed error from the block above — rethrow unless it was
          // captured for retry
          if (lastError === err) continue;
          throw err;
        }
        // Network error — retry if attempts remain
        lastError = new AirpayNetworkError(
          `Network request failed: ${(err as Error).message}`,
          err,
        );
        if (attempt >= this.maxRetries) {
          throw lastError;
        }
      }
    }

    // Exhausted retries
    throw (
      lastError ?? new AirpayNetworkError("Request failed after all retries")
    );
  }

  private async doFetch(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await this.fetchFn(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!query) return `${this.baseUrl}${path}`;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${this.baseUrl}${path}?${qs}` : `${this.baseUrl}${path}`;
  }

  private async parseErrorBody(
    response: Response,
  ): Promise<ApiErrorBody | null> {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text) as ApiErrorBody;
    } catch {
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
