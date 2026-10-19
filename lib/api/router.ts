import { and, desc, eq, lt, or } from "drizzle-orm";
import type { z } from "zod";
import {
  authenticateApiKey,
  assertCapability,
  assertSecretKey,
  assertWriteAccess,
  isBrowserRequest,
  type ApiAuthContext,
} from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { paymentIntents, workspaceSettings, checkoutSessions, type PaymentIntentRow } from "@/lib/schema";
import { attachTx, getIntent, markIntent, TERMINAL_STATUSES } from "@/lib/intents";
import { enabledPairs } from "@/lib/onboarding";
import { TESTNETS, settlementAddress, type TestnetKey } from "@/lib/chains";
import { tokenMeta } from "@/lib/tokens";
import { emitEvent } from "@/lib/webhooks";
import { rateLimit } from "@/lib/ratelimit";
import { ApiError, corsHeaders, handleApiError, jsonResponse, requestId } from "./errors";
import { runIdempotent } from "./idempotency";
import {
  createApiIntent,
  createPaymentIntentApiSchema,
  toApiPaymentIntent,
  type PaymentIntentList,
} from "./payment-intents";
import { clientSecretMatches } from "./client-secret";
import { assertApiProductionEnabled } from "./env-gate";
import {
  createCheckoutSessionApiSchema,
  createCheckoutSessionRecord,
  expireCheckoutSession,
  getUserCheckoutSession,
  toApiCheckoutSession,
} from "./checkout";

const MAX_BODY_BYTES = 100_000;

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new ApiError(413, "request_too_large", "Request body is too large.");
  }
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "invalid_json", "Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(
      400,
      "invalid_request",
      issue?.message ?? "Invalid request.",
      issue?.path.join(".") || undefined,
    );
  }
  return result.data;
}

async function enforceRateLimit(auth: ApiAuthContext): Promise<void> {
  const limit = auth.kind === "publishable" ? 60 : 300;
  if (!(await rateLimit("api-v1", auth.keyId, limit))) {
    throw new ApiError(
      429,
      "rate_limit_exceeded",
      "Too many requests. Retry after a short delay.",
      undefined,
      "rate_limit_error",
    );
  }
}

async function loadSettings(organizationId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

function methodNotAllowed(allowed: string[]): never {
  throw new ApiError(
    405,
    "method_not_allowed",
    `Method not allowed. Allowed: ${allowed.join(", ")}.`,
  );
}

function requireNotFound(): never {
  throw new ApiError(404, "resource_missing", "No such resource.");
}

/** Secret keys see the whole org; publishable keys need the intent's secret. */
function authorizeIntent(
  auth: ApiAuthContext,
  providedSecret: string | null,
  intent: PaymentIntentRow | null,
  capability: "payment_intent:read" | "payment_intent:confirm",
): PaymentIntentRow {
  if (
    !intent ||
    intent.organizationId !== auth.organizationId ||
    intent.environment !== auth.environment
  ) {
    requireNotFound();
  }

  if (auth.kind === "secret") return intent;

  assertCapability(auth, capability);
  if (!clientSecretMatches(providedSecret, intent.client_secret_hash)) {
    throw new ApiError(
      403,
      "invalid_client_secret",
      "A valid client secret is required for this payment intent.",
      "client_secret",
      "permission_error",
    );
  }
  return intent;
}

function headerSecret(request: Request): string | null {
  return request.headers.get("airpay-client-secret");
}

async function handleAccount(auth: ApiAuthContext): Promise<Response> {
  const settings = await loadSettings(auth.organizationId);
  return jsonResponse({
    object: "account",
    id: auth.organizationId,
    workspace_name: settings?.workspaceName ?? "",
    environment: auth.environment,
    livemode: auth.environment === "production",
    key: {
      id: auth.keyId,
      kind: auth.kind,
      scope: auth.kind === "publishable" ? "publishable" : auth.scope,
    },
    capabilities: {
      sandbox: true,
      production: !!settings?.productionEnabled,
    },
  });
}

async function handleConfig(auth: ApiAuthContext): Promise<Response> {
  assertCapability(auth, "config:read");
  const settings = await loadSettings(auth.organizationId);
  const pairs = enabledPairs(settings);
  const chains = Object.entries(pairs).flatMap(([key, tokens]) => {
    const info = TESTNETS[key as TestnetKey];
    if (!info) return [];
    return [
      {
        key,
        name: info.name,
        chain_id: info.chainId,
        native_symbol: info.nativeSymbol,
        settlement_address: settlementAddress(info),
        tokens: tokens.map((symbol) => ({
          symbol,
          decimals: tokenMeta(symbol).decimals,
        })),
      },
    ];
  });

  return jsonResponse({
    object: "config",
    environment: auth.environment,
    livemode: auth.environment === "production",
    chains,
  });
}

async function createPaymentIntent(auth: ApiAuthContext, request: Request): Promise<Response> {
  assertWriteAccess(auth);
  const body = await readBody(request);
  const input = parse(createPaymentIntentApiSchema, body);

  const outcome = await runIdempotent(auth, request, body, async () => {
    await assertApiProductionEnabled(auth);
    const settings = await loadSettings(auth.organizationId);
    const created = await createApiIntent({
      organizationId: auth.organizationId,
      environment: auth.environment,
      amountMinor: input.amount,
      chain: input.chain,
      token: input.token,
      title: input.title,
      merchant: input.merchant,
      metadata: input.metadata ?? null,
      receiver: input.receiver ?? null,
      settings,
      withClientSecret: true,
    });
    return { status: 201, body: created.payload };
  });

  return jsonResponse(outcome.body, outcome.status);
}

async function getPaymentIntentEndpoint(
  auth: ApiAuthContext,
  request: Request,
  intentId: string,
): Promise<Response> {
  const intent = await getIntent(intentId);
  const authorized = authorizeIntent(auth, headerSecret(request), intent, "payment_intent:read");
  return jsonResponse(toApiPaymentIntent(authorized));
}

async function listPaymentIntents(auth: ApiAuthContext, request: Request): Promise<Response> {
  assertSecretKey(auth);
  const db = await getDb();
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 10;
  const startingAfter = url.searchParams.get("starting_after");

  const conditions = [
    eq(paymentIntents.organizationId, auth.organizationId),
    eq(paymentIntents.environment, auth.environment),
  ];

  if (startingAfter) {
    const cursorRows = await db
      .select({ createdAt: paymentIntents.created_at, id: paymentIntents.id })
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.id, startingAfter),
          eq(paymentIntents.organizationId, auth.organizationId),
          eq(paymentIntents.environment, auth.environment),
        ),
      )
      .limit(1);
    const cursor = cursorRows[0];
    if (!cursor) {
      throw new ApiError(400, "invalid_cursor", "Unknown `starting_after` value.", "starting_after");
    }
    const cursorClause = or(
      lt(paymentIntents.created_at, cursor.createdAt),
      and(
        eq(paymentIntents.created_at, cursor.createdAt),
        lt(paymentIntents.id, cursor.id),
      ),
    );
    if (cursorClause) conditions.push(cursorClause);
  }

  const rows = await db
    .select()
    .from(paymentIntents)
    .where(and(...conditions))
    .orderBy(desc(paymentIntents.created_at), desc(paymentIntents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const list: PaymentIntentList = {
    object: "list",
    url: "/v1/payment_intents",
    has_more: hasMore,
    data: rows.slice(0, limit).map((row) => toApiPaymentIntent(row)),
  };
  return jsonResponse(list);
}

async function confirmPaymentIntent(
  auth: ApiAuthContext,
  request: Request,
  intentId: string,
): Promise<Response> {
  const body = await readBody(request);
  const intent = await getIntent(intentId);
  const bodySecret = typeof body.client_secret === "string" ? body.client_secret : null;
  authorizeIntent(
    auth,
    headerSecret(request) ?? bodySecret,
    intent,
    "payment_intent:confirm",
  );

  const txHash = String(body.tx_hash ?? "");
  const payer = body.payer == null ? null : String(body.payer);
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new ApiError(400, "invalid_tx_hash", "`tx_hash` must be a 32-byte hex hash.", "tx_hash");
  }
  if (payer && !/^0x[0-9a-fA-F]{40}$/.test(payer)) {
    throw new ApiError(400, "invalid_payer", "`payer` must be a 20-byte hex address.", "payer");
  }

  const updated = await attachTx({ intentId, txHash, payer });
  return jsonResponse(toApiPaymentIntent(updated));
}

async function cancelPaymentIntent(
  auth: ApiAuthContext,
  request: Request,
  intentId: string,
): Promise<Response> {
  assertWriteAccess(auth);
  const intent = await getIntent(intentId);
  const authorized = authorizeIntent(auth, headerSecret(request), intent, "payment_intent:read");
  if (TERMINAL_STATUSES.includes(authorized.status)) {
    throw new ApiError(
      409,
      "payment_intent_not_cancelable",
      `This payment is already ${authorized.status}.`,
    );
  }
  await markIntent(intentId, { status: "failed", error: "Canceled by merchant." });
  const fresh = await getIntent(intentId);
  if (fresh) {
    await emitEvent({
      organizationId: fresh.organizationId,
      environment: fresh.environment,
      type: "payment.failed",
      data: { payment_intent: toApiPaymentIntent(fresh) },
      dedupeKey: `payment.failed:${fresh.id}`,
    });
  }
  return jsonResponse(fresh ? toApiPaymentIntent(fresh) : {});
}

function publicBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;
  return new URL(request.url).origin;
}

async function createCheckoutSession(auth: ApiAuthContext, request: Request): Promise<Response> {
  assertWriteAccess(auth);
  const body = await readBody(request);
  const input = parse(createCheckoutSessionApiSchema, body);

  const outcome = await runIdempotent(auth, request, body, async () => {
    await assertApiProductionEnabled(auth);
    const settings = await loadSettings(auth.organizationId);
    const created = await createApiIntent({
      organizationId: auth.organizationId,
      environment: auth.environment,
      amountMinor: input.amount,
      chain: input.chain,
      token: input.token,
      title: input.title,
      merchant: input.merchant,
      metadata: input.metadata ?? null,
      settings,
      withClientSecret: false,
    });

    const session = await createCheckoutSessionRecord({
      organizationId: auth.organizationId,
      environment: auth.environment,
      intentId: created.intent.id,
      successUrl: input.success_url ?? null,
      cancelUrl: input.cancel_url ?? null,
      clientReferenceId: input.client_reference_id ?? null,
      metadata: input.metadata ?? null,
    });

    return { status: 201, body: toApiCheckoutSession(session, publicBaseUrl(request)) };
  });

  return jsonResponse(outcome.body, outcome.status);
}

async function getCheckoutSessionEndpoint(
  auth: ApiAuthContext,
  request: Request,
  sessionId: string,
): Promise<Response> {
  assertSecretKey(auth);
  const session = await getUserCheckoutSession(sessionId, auth.organizationId, auth.environment);
  if (!session) requireNotFound();
  return jsonResponse(toApiCheckoutSession(session, publicBaseUrl(request)));
}

async function listCheckoutSessions(auth: ApiAuthContext, request: Request): Promise<Response> {
  assertSecretKey(auth);
  const db = await getDb();
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 10;
  const startingAfter = url.searchParams.get("starting_after");

  const conditions = [
    eq(checkoutSessions.organizationId, auth.organizationId),
    eq(checkoutSessions.environment, auth.environment),
  ];
  if (startingAfter) {
    const cursorRows = await db
      .select({ createdAt: checkoutSessions.created_at, id: checkoutSessions.id })
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, startingAfter),
          eq(checkoutSessions.organizationId, auth.organizationId),
          eq(checkoutSessions.environment, auth.environment),
        ),
      )
      .limit(1);
    const cursor = cursorRows[0];
    if (!cursor) {
      throw new ApiError(400, "invalid_cursor", "Unknown `starting_after` value.", "starting_after");
    }
    const clause = or(
      lt(checkoutSessions.created_at, cursor.createdAt),
      and(eq(checkoutSessions.created_at, cursor.createdAt), lt(checkoutSessions.id, cursor.id)),
    );
    if (clause) conditions.push(clause);
  }

  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(and(...conditions))
    .orderBy(desc(checkoutSessions.created_at), desc(checkoutSessions.id))
    .limit(limit + 1);

  const base = publicBaseUrl(request);
  return jsonResponse({
    object: "list",
    url: "/v1/checkout/sessions",
    has_more: rows.length > limit,
    data: rows.slice(0, limit).map((row) => toApiCheckoutSession(row, base)),
  });
}

async function expireCheckoutSessionEndpoint(
  auth: ApiAuthContext,
  request: Request,
  sessionId: string,
): Promise<Response> {
  assertWriteAccess(auth);
  const session = await getUserCheckoutSession(sessionId, auth.organizationId, auth.environment);
  if (!session) requireNotFound();
  await expireCheckoutSession(sessionId, auth.organizationId);
  const fresh = await getUserCheckoutSession(sessionId, auth.organizationId, auth.environment);
  return jsonResponse(toApiCheckoutSession(fresh ?? session, publicBaseUrl(request)));
}

async function handleCheckoutSessions(
  auth: ApiAuthContext,
  request: Request,
  sessionId: string | undefined,
  action: string | undefined,
): Promise<Response> {
  if (!sessionId) {
    if (request.method === "POST") return createCheckoutSession(auth, request);
    if (request.method === "GET") return listCheckoutSessions(auth, request);
    methodNotAllowed(["GET", "POST"]);
  }

  if (!action) {
    if (request.method === "GET") return getCheckoutSessionEndpoint(auth, request, sessionId);
    methodNotAllowed(["GET"]);
  }

  if (action === "expire") {
    if (request.method === "POST") return expireCheckoutSessionEndpoint(auth, request, sessionId);
    methodNotAllowed(["POST"]);
  }

  requireNotFound();
}

async function handlePaymentIntents(
  auth: ApiAuthContext,
  request: Request,
  intentId: string | undefined,
  action: string | undefined,
): Promise<Response> {
  if (!intentId) {
    if (request.method === "POST") return createPaymentIntent(auth, request);
    if (request.method === "GET") return listPaymentIntents(auth, request);
    methodNotAllowed(["GET", "POST"]);
  }

  if (!action) {
    if (request.method === "GET") return getPaymentIntentEndpoint(auth, request, intentId);
    methodNotAllowed(["GET"]);
  }

  if (action === "confirm") {
    if (request.method === "POST") return confirmPaymentIntent(auth, request, intentId);
    methodNotAllowed(["POST"]);
  }

  if (action === "cancel") {
    if (request.method === "POST") return cancelPaymentIntent(auth, request, intentId);
    methodNotAllowed(["POST"]);
  }

  requireNotFound();
}

async function dispatch(
  request: Request,
  path: string[],
  auth: ApiAuthContext,
): Promise<Response> {
  if (path.length === 0) {
    throw new ApiError(404, "unknown_endpoint", "Specify an API resource, e.g. `/v1/account`.");
  }

  const [resource, resourceId, action, extra] = path;
  if (extra) requireNotFound();

  switch (resource) {
    case "account":
      if (resourceId) requireNotFound();
      if (request.method !== "GET") methodNotAllowed(["GET"]);
      return handleAccount(auth);
    case "config":
      if (resourceId) requireNotFound();
      if (request.method !== "GET") methodNotAllowed(["GET"]);
      return handleConfig(auth);
    case "payment_intents":
      return handlePaymentIntents(auth, request, resourceId, action);
    case "checkout_sessions":
      return handleCheckoutSessions(auth, request, resourceId, action);
    default:
      requireNotFound();
  }
}

function attachCors(response: Response, browser: boolean, request: Request): void {
  if (!browser) return;
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get("origin")))) {
    response.headers.set(key, value);
  }
}

export async function handleApiRequest(request: Request, path: string[]): Promise<Response> {
  const id = requestId();
  const browser = isBrowserRequest(request.headers);
  try {
    const auth = await authenticateApiKey(request.headers);
    await enforceRateLimit(auth);
    const response = await dispatch(request, path, auth);
    attachCors(response, browser, request);
    return response;
  } catch (err) {
    const response = handleApiError(err, id);
    attachCors(response, browser, request);
    return response;
  }
}

export function apiOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}
