import { AirPayError } from "./errors.js";
import type {
  Account,
  AirPayConfig,
  ConfirmIntentParams,
  PaymentIntent,
  RequestOptions,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://api.airpay.dev";
export const API_VERSION = "2026-10-19";

export interface AirPayJSOptions {
  baseUrl?: string;
  version?: string;
  /** Per-request timeout in milliseconds. Defaults to 30s. */
  timeout?: number;
  /** Override fetch (tests, custom transports). */
  fetch?: typeof fetch;
}

interface RequestArgs {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  clientSecret?: string;
  signal?: AbortSignal;
}

/**
 * Browser SDK. Construct with a **publishable** key (`pk_test_…` / `pk_live_…`).
 * Publishable keys can read account/config data and read or confirm a payment
 * intent when its `client_secret` is supplied.
 *
 * Never put a secret key (`ap_…`) in browser code.
 */
export class AirPayJS {
  private readonly key: string;
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly timeout: number;
  private readonly fetchImpl: typeof fetch;

  constructor(publishableKey: string, options: AirPayJSOptions = {}) {
    if (!publishableKey) throw new Error("A publishable key is required.");
    if (publishableKey.startsWith("ap_")) {
      throw new Error(
        "This looks like a secret key. Use a publishable key (pk_…) in the browser.",
      );
    }
    this.key = publishableKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.version = options.version ?? API_VERSION;
    this.timeout = options.timeout ?? 30_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("No fetch implementation found. Pass `fetch` in the options.");
    }
  }

  /** Retrieve the authenticated account (workspace + key metadata). */
  getAccount(options?: RequestOptions): Promise<Account> {
    return this.request<Account>({ method: "GET", path: "/v1/account", signal: options?.signal });
  }

  /** Retrieve the chains and tokens enabled for this workspace. */
  getConfig(options?: RequestOptions): Promise<AirPayConfig> {
    return this.request<AirPayConfig>({ method: "GET", path: "/v1/config", signal: options?.signal });
  }

  /** Read a payment intent using its client secret. */
  retrieveIntent(
    intentId: string,
    clientSecret: string,
    options?: RequestOptions,
  ): Promise<PaymentIntent> {
    return this.request<PaymentIntent>({
      method: "GET",
      path: `/v1/payment_intents/${encodeURIComponent(intentId)}`,
      clientSecret,
      signal: options?.signal,
    });
  }

  /** Attach the on-chain transaction hash that pays the intent. */
  confirmIntent(
    intentId: string,
    params: ConfirmIntentParams,
    options?: RequestOptions,
  ): Promise<PaymentIntent> {
    return this.request<PaymentIntent>({
      method: "POST",
      path: `/v1/payment_intents/${encodeURIComponent(intentId)}/confirm`,
      clientSecret: params.clientSecret,
      body: {
        tx_hash: params.txHash,
        ...(params.payer ? { payer: params.payer } : {}),
        client_secret: params.clientSecret,
      },
      signal: options?.signal,
    });
  }

  /** Convenience: send the browser to a hosted checkout session URL. */
  static redirectToCheckout(url: string): void {
    if (typeof window !== "undefined" && window.location) {
      window.location.assign(url);
      return;
    }
    throw new Error("redirectToCheckout is only available in a browser environment.");
  }

  private async request<T>(args: RequestArgs): Promise<T> {
    const url = new URL(args.path, this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.key}`,
      "airpay-version": this.version,
      accept: "application/json",
    };
    if (args.body !== undefined) headers["content-type"] = "application/json";
    if (args.clientSecret) headers["airpay-client-secret"] = args.clientSecret;

    const fetchImpl = this.fetchImpl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const onAbort = () => controller.abort();
    if (args.signal) {
      if (args.signal.aborted) controller.abort();
      else args.signal.addEventListener("abort", onAbort);
    }

    try {
      const response = await fetchImpl(url.toString(), {
        method: args.method,
        headers,
        body: args.body === undefined ? undefined : JSON.stringify(args.body),
        signal: controller.signal,
      });
      const requestId = response.headers.get("x-request-id") ?? undefined;
      const text = await response.text();
      const payload = text ? safeJson(text) : {};
      if (response.ok) return payload as T;
      throw AirPayError.fromResponse(response.status, payload, requestId);
    } catch (err) {
      if (err instanceof AirPayError) throw err;
      const timedOut = err instanceof Error && err.name === "AbortError";
      throw new AirPayError(
        {
          type: "api_error",
          code: timedOut ? "timeout" : "connection_error",
          message: timedOut
            ? "Request timed out."
            : err instanceof Error
              ? err.message
              : "The request to AirPay failed.",
        },
        0,
      );
    } finally {
      clearTimeout(timer);
      args.signal?.removeEventListener("abort", onAbort);
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
