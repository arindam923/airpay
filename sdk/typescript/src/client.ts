import { AirPayConnectionError, AirPayError } from "./errors.js";
import type {
  Account,
  AirPayConfig,
  CheckoutSession,
  CheckoutSessionCreateParams,
  CheckoutSessionList,
  ListParams,
  PaymentIntent,
  PaymentIntentConfirmParams,
  PaymentIntentCreateParams,
  PaymentIntentList,
  PaymentIntentRetrieveParams,
  RequestOptions,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://api.airpay.dev";
export const API_VERSION = "2026-10-19";

export interface AirPayOptions {
  /** A secret (`ap_…`) or publishable (`pk_…`) key. */
  apiKey: string;
  baseUrl?: string;
  version?: string;
  /** Per-request timeout in milliseconds. Defaults to 30s. */
  timeout?: number;
  /** Retries for transient failures on safe requests. Defaults to 2. */
  maxNetworkRetries?: number;
  /** Override the fetch implementation (tests, proxies). */
  fetch?: typeof fetch;
}

interface RequestArgs {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  clientSecret?: string;
  signal?: AbortSignal;
}

const RETRY_STATUS = new Set([409, 429, 500, 502, 503, 504]);

function isSafeToRetry(args: RequestArgs, status?: number): boolean {
  if (status === undefined) return args.method === "GET" || Boolean(args.idempotencyKey);
  return args.method === "GET" || Boolean(args.idempotencyKey);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(baseUrl: string, path: string, query?: RequestArgs["query"]): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export class AirPay {
  readonly account: AccountResource;
  readonly config: ConfigResource;
  readonly paymentIntents: PaymentIntentsResource;
  readonly checkoutSessions: CheckoutSessionsResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly timeout: number;
  private readonly maxNetworkRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AirPayOptions) {
    if (!options.apiKey) throw new Error("An API key is required.");
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.version = options.version ?? API_VERSION;
    this.timeout = options.timeout ?? 30_000;
    this.maxNetworkRetries = options.maxNetworkRetries ?? 2;
    this.fetchImpl = options.fetch ?? globalThis.fetch;

    if (typeof this.fetchImpl !== "function") {
      throw new Error("No fetch implementation found. Pass `fetch` in the options.");
    }

    this.account = new AccountResource(this);
    this.config = new ConfigResource(this);
    this.paymentIntents = new PaymentIntentsResource(this);
    this.checkoutSessions = new CheckoutSessionsResource(this);
  }

  async request<T>(args: RequestArgs): Promise<T> {
    const url = buildUrl(this.baseUrl, args.path, args.query);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      "airpay-version": this.version,
      accept: "application/json",
    };
    if (args.body !== undefined) headers["content-type"] = "application/json";
    if (args.idempotencyKey) headers["idempotency-key"] = args.idempotencyKey;
    if (args.clientSecret) headers["airpay-client-secret"] = args.clientSecret;

    const fetchImpl = this.fetchImpl;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxNetworkRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      const onAbort = () => controller.abort();
      if (args.signal) {
        if (args.signal.aborted) controller.abort();
        else args.signal.addEventListener("abort", onAbort);
      }
      const cleanup = () => args.signal?.removeEventListener("abort", onAbort);

      try {
        const response = await fetchImpl(url, {
          method: args.method,
          headers,
          body: args.body === undefined ? undefined : JSON.stringify(args.body),
          signal: controller.signal,
        });

        const requestId = response.headers.get("x-request-id") ?? undefined;
        const payload = await parseBody(response);

        if (response.ok) return payload as T;

        const retryable = isSafeToRetry(args) && RETRY_STATUS.has(response.status);
        if (retryable && attempt < this.maxNetworkRetries) {
          lastError = AirPayError.fromResponse(response.status, payload, requestId);
          clearTimeout(timer);
          cleanup();
          await sleep(backoff(attempt));
          continue;
        }

        throw AirPayError.fromResponse(response.status, payload, requestId);
      } catch (err) {
        clearTimeout(timer);
        cleanup();

        if (err instanceof AirPayError) throw err;

        const aborted = err instanceof Error && err.name === "AbortError";
        if (attempt < this.maxNetworkRetries && isSafeToRetry(args)) {
          lastError = err;
          await sleep(backoff(attempt));
          continue;
        }
        if (aborted) {
          throw new AirPayConnectionError("Request timed out.", "timeout");
        }
        throw new AirPayConnectionError(
          err instanceof Error ? err.message : "The request to AirPay failed.",
        );
      } finally {
        clearTimeout(timer);
        cleanup();
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AirPayConnectionError("The request to AirPay failed.");
  }
}

function backoff(attempt: number): number {
  const base = Math.min(2 ** attempt * 500, 8_000);
  return base + Math.floor(Math.random() * 250);
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { type: "api_error", code: "invalid_json", message: text.slice(0, 200) } };
  }
}

class AccountResource {
  constructor(private readonly client: AirPay) {}

  retrieve(options?: RequestOptions): Promise<Account> {
    return this.client.request<Account>({
      method: "GET",
      path: "/v1/account",
      signal: options?.signal,
    });
  }
}

class ConfigResource {
  constructor(private readonly client: AirPay) {}

  retrieve(options?: RequestOptions): Promise<AirPayConfig> {
    return this.client.request<AirPayConfig>({
      method: "GET",
      path: "/v1/config",
      signal: options?.signal,
    });
  }
}

class PaymentIntentsResource {
  constructor(private readonly client: AirPay) {}

  create(params: PaymentIntentCreateParams, options?: RequestOptions): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>({
      method: "POST",
      path: "/v1/payment_intents",
      body: toPaymentIntentBody(params),
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  retrieve(
    id: string,
    params: PaymentIntentRetrieveParams = {},
    options?: RequestOptions,
  ): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>({
      method: "GET",
      path: `/v1/payment_intents/${encodeURIComponent(id)}`,
      clientSecret: params.clientSecret ?? options?.clientSecret,
      signal: options?.signal,
    });
  }

  list(params: ListParams = {}, options?: RequestOptions): Promise<PaymentIntentList> {
    return this.client.request<PaymentIntentList>({
      method: "GET",
      path: "/v1/payment_intents",
      query: { limit: params.limit, starting_after: params.startingAfter },
      signal: options?.signal,
    });
  }

  confirm(
    id: string,
    params: PaymentIntentConfirmParams,
    options?: RequestOptions,
  ): Promise<PaymentIntent> {
    const clientSecret = params.clientSecret ?? options?.clientSecret;
    return this.client.request<PaymentIntent>({
      method: "POST",
      path: `/v1/payment_intents/${encodeURIComponent(id)}/confirm`,
      clientSecret,
      body: {
        tx_hash: params.txHash,
        ...(params.payer ? { payer: params.payer } : {}),
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      },
      signal: options?.signal,
    });
  }

  cancel(id: string, options?: RequestOptions): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>({
      method: "POST",
      path: `/v1/payment_intents/${encodeURIComponent(id)}/cancel`,
      signal: options?.signal,
    });
  }
}

class CheckoutSessionsResource {
  constructor(private readonly client: AirPay) {}

  create(params: CheckoutSessionCreateParams, options?: RequestOptions): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>({
      method: "POST",
      path: "/v1/checkout_sessions",
      body: toCheckoutSessionBody(params),
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  retrieve(id: string, options?: RequestOptions): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>({
      method: "GET",
      path: `/v1/checkout_sessions/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  list(params: ListParams = {}, options?: RequestOptions): Promise<CheckoutSessionList> {
    return this.client.request<CheckoutSessionList>({
      method: "GET",
      path: "/v1/checkout_sessions",
      query: { limit: params.limit, starting_after: params.startingAfter },
      signal: options?.signal,
    });
  }

  expire(id: string, options?: RequestOptions): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>({
      method: "POST",
      path: `/v1/checkout_sessions/${encodeURIComponent(id)}/expire`,
      signal: options?.signal,
    });
  }
}

function toPaymentIntentBody(params: PaymentIntentCreateParams): Record<string, unknown> {
  return prune({
    amount: params.amount,
    chain: params.chain,
    currency: params.currency,
    token: params.token,
    title: params.title,
    merchant: params.merchant,
    description: params.description,
    metadata: params.metadata,
    receiver: params.receiver,
  });
}

function toCheckoutSessionBody(params: CheckoutSessionCreateParams): Record<string, unknown> {
  return prune({
    amount: params.amount,
    chain: params.chain,
    currency: params.currency,
    token: params.token,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.clientReferenceId,
    metadata: params.metadata,
    title: params.title,
    merchant: params.merchant,
  });
}

function prune(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
