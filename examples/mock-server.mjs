import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4311);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, content-type, airpay-version, airpay-client-secret, idempotency-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const intents = new Map();
let requestCounter = 0;
let intentCounter = 0;
let sessionCounter = 0;

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "x-request-id": `req_mock_${(requestCounter += 1)}`,
    ...CORS,
  });
  res.end(JSON.stringify(body));
}

function fail(res, status, type, code, message) {
  send(res, status, { error: { type, code, message } });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function makeIntent(overrides = {}) {
  const created = now();
  const id = `pi_mock_${(intentCounter += 1)}`;
  const intent = {
    id,
    object: "payment_intent",
    created,
    status: "requires_payment",
    amount: 1250,
    currency: "usd",
    chain: "base",
    token: "USDC",
    expected_units: "12.5",
    receiver: "0x0000000000000000000000000000000000000001",
    client_secret: `pi_mock_${intentCounter}_secret_mock`,
    metadata: {},
    payer: null,
    tx_hash: null,
    confirmations: 0,
    required_confirmations: 2,
    invoice_id: null,
    expires_at: created + 1800,
    confirmed_at: null,
    last_payment_error: null,
    environment: "sandbox",
    livemode: false,
    ...overrides,
  };
  intents.set(id, intent);
  return intent;
}

function accountFor(token) {
  const kind = token.startsWith("pk_") ? "publishable" : "secret";
  return {
    object: "account",
    id: "org_mock_1",
    workspace_name: "Example Workspace",
    environment: "sandbox",
    livemode: false,
    key: {
      id: "key_mock_1",
      kind,
      scope: kind === "publishable" ? "publishable" : "full",
    },
    capabilities: { sandbox: true, production: false },
  };
}

function config() {
  return {
    object: "config",
    environment: "sandbox",
    livemode: false,
    chains: [
      {
        key: "base",
        name: "Base",
        chain_id: 8453,
        native_symbol: "ETH",
        settlement_address: "0x0000000000000000000000000000000000000001",
        tokens: [
          { symbol: "USDC", decimals: 6 },
          { symbol: "ETH", decimals: 18 },
        ],
      },
    ],
  };
}

function routeIntent(req, res, auth, id, action) {
  const intent = intents.get(id);
  if (!intent) return fail(res, 404, "invalid_request_error", "resource_missing", "No such payment intent.");

  if (action === "confirm") {
    const provided = req.headers["airpay-client-secret"];
    if (provided !== intent.client_secret) {
      return fail(res, 403, "permission_error", "invalid_client_secret", "The client secret is invalid.");
    }
    return readJson(req).then((body) => {
      if (typeof body.tx_hash !== "string" || !body.tx_hash.startsWith("0x")) {
        return fail(res, 400, "invalid_request_error", "invalid_request", "tx_hash is required.");
      }
      intent.status = "succeeded";
      intent.tx_hash = body.tx_hash;
      intent.payer = typeof body.payer === "string" ? body.payer : null;
      intent.confirmations = intent.required_confirmations;
      intent.confirmed_at = now();
      return send(res, 200, intent);
    });
  }

  if (auth.kind === "publishable" && req.headers["airpay-client-secret"] !== intent.client_secret) {
    return fail(res, 403, "permission_error", "invalid_client_secret", "The client secret is invalid.");
  }

  return send(res, 200, intent);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const auth = { kind: token.startsWith("pk_") ? "publishable" : "secret" };

  if (url.pathname === "/demo/intent") {
    const intent = makeIntent();
    return send(res, 200, {
      id: intent.id,
      client_secret: intent.client_secret,
    });
  }

  if (!token.startsWith("ap_") && !token.startsWith("pk_")) {
    return fail(res, 401, "authentication_error", "invalid_api_key", "The provided API key is not valid.");
  }

  if (req.method === "GET" && url.pathname === "/v1/account") {
    return send(res, 200, accountFor(token));
  }

  if (req.method === "GET" && url.pathname === "/v1/config") {
    return send(res, 200, config());
  }

  if (req.method === "POST" && url.pathname === "/v1/payment_intents") {
    const body = await readJson(req);
    if (typeof body.amount !== "number" || typeof body.chain !== "string") {
      return fail(res, 400, "invalid_request_error", "invalid_request", "amount and chain are required.");
    }
    const intent = makeIntent({
      amount: body.amount,
      chain: body.chain,
      token: body.token ?? "USDC",
      metadata: body.metadata ?? {},
      payer: null,
    });
    return send(res, 200, intent);
  }

  const intentMatch = /^\/v1\/payment_intents\/([^/]+)(?:\/(confirm|cancel))?$/.exec(url.pathname);
  if (intentMatch) {
    const id = decodeURIComponent(intentMatch[1]);
    const action = intentMatch[2];
    if (req.method === "GET" && !action) return routeIntent(req, res, auth, id);
    if (req.method === "POST" && action === "confirm") return routeIntent(req, res, auth, id, "confirm");
    if (req.method === "POST" && action === "cancel") {
      const intent = intents.get(id);
      if (!intent) return fail(res, 404, "invalid_request_error", "resource_missing", "No such payment intent.");
      intent.status = "canceled";
      return send(res, 200, intent);
    }
  }

  if (req.method === "POST" && url.pathname === "/v1/checkout_sessions") {
    const body = await readJson(req);
    const id = `cs_mock_${(sessionCounter += 1)}`;
    const created = now();
    return send(res, 200, {
      id,
      object: "checkout.session",
      status: "open",
      url: `http://127.0.0.1:3000/checkout/${id}`,
      payment_intent: `pi_mock_pending_${sessionCounter}`,
      success_url: body.success_url ?? null,
      cancel_url: body.cancel_url ?? null,
      client_reference_id: body.client_reference_id ?? null,
      metadata: body.metadata ?? {},
      created,
      expires_at: created + 1800,
      completed_at: null,
      environment: "sandbox",
      livemode: false,
    });
  }

  return fail(res, 404, "invalid_request_error", "resource_missing", "No such resource.");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock AirPay API listening on http://127.0.0.1:${PORT}`);
});
