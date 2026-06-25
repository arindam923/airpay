# AirPay API Contract — v1

This directory is the **single source of truth** for the AirPay public API.
All four official SDKs (Node, Python, Go, Rust) are implemented from the
OpenAPI spec here. If the spec changes, all SDKs must be regenerated or
updated to match.

## Files

| File | Purpose |
|------|---------|
| `openapi.yaml` | OpenAPI 3.1 spec — endpoints, schemas, error types |
| `examples/` | Golden request/response JSON fixtures for SDK tests |

## API surface

### Base URLs
| Environment | URL |
|-------------|-----|
| Production | `https://airpay-server.arindam92.workers.dev` |
| Local dev | `http://localhost:8787` |

All SDK endpoints live under `/api/v1/`.

### Authentication

`Authorization: Bearer <api_key>`

| Prefix | Type | Scope |
|--------|------|-------|
| `sk_test_`, `sk_live_` | Secret | All endpoints (server-side only) |
| `pk_test_`, `pk_live_` | Publishable | Session retrieval + payment status only |

Secret keys must never be exposed to the browser. Use publishable keys for
client-side checkout flows.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/checkout/sessions` | secret | Create a checkout session |
| `GET` | `/checkout/sessions/{id}` | pk/sk | Retrieve a session |
| `POST` | `/checkout/sessions/{id}/confirm` | none | Buyer submits payment tx |
| `GET` | `/payments/{id}/status` | pk/sk | Lightweight status poll |
| `GET` | `/payments/{id}` | secret | Full payment detail |
| `GET` | `/payments` | secret | List payments (paginated) |

### Common conventions

- **Object discriminator**: every resource has an `object` field
  (`checkout.session`, `payment`, `payment.status`, `event`, `list`).
- **Timestamps**: all times are Unix milliseconds (integers), not ISO strings.
- **Money**: all amounts are in **cents** (integer). `$49.99` → `4999`.
- **snake_case**: all JSON fields are snake_case.
- **Pagination**: `limit` (default 20, max 100), `offset` (default 0),
  `has_more` boolean in response.

### Error format

```json
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid or revoked API key"
  }
}
```

| `type` | HTTP | Meaning |
|--------|------|---------|
| `authentication_error` | 401 | Bad/missing API key |
| `authorization_error` | 403 | Wrong key type for endpoint |
| `invalid_request_error` | 400 | Validation failure |
| `not_found_error` | 404 | Resource not found |
| `resource_expired` | 410 | Checkout session expired |
| `rate_limit_error` | 429 | Too many requests |
| `internal_error` | 500 | Server fault |

## Webhooks

When a payment is confirmed or fails on-chain, AirPay sends a `POST` to the
merchant's configured webhook URL.

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `AirPay-Signature` | `t=<timestamp>,v1=<hmac>` |
| `AirPay-Event` | Event type (e.g. `payment.confirmed`) |

### Signature verification

The `AirPay-Signature` header is Stripe-style:

```
t=1719331200,v1=5b7c3d2e8f4a1e6b9c0d3a5f7e2b8c4d1a6f3e9b2c7d4a8f1e5b3c6d9a2f7e4b
```

To verify:
1. Split header on `,` → extract `t` (timestamp) and `v1` (signature).
2. Compute `HMAC-SHA256(key=whsec_..., message="<t>.<raw_body>")` as hex.
3. Compare with `v1` using constant-time comparison.
4. (Optional) Reject if `t` is older than 5 minutes to prevent replay.

The signing key is the merchant's `whsec_` key — the same one returned by the
`POST /api/merchant/api-keys/regenerate` console endpoint (type=`signing`).

### Event types

| Event | Triggered when |
|-------|----------------|
| `payment.confirmed` | On-chain tx verified with sufficient confirmations |
| `payment.failed` | On-chain tx failed or max retries exceeded |
| `payout.completed` | (Planned) Settlement completed |
| `payment.refunded` | (Planned) Refund processed |

### Event payload

See the `WebhookEvent` schema in `openapi.yaml`. Shape:

```json
{
  "id": "evt_abc123...",
  "object": "event",
  "event": "payment.confirmed",
  "payment_id": "uuid",
  "checkout_session_id": "uuid",
  "amount": 4999,
  "fee_amount": 100,
  "merchant_amount": 4899,
  "currency": "USDC",
  "network": "Solana",
  "tx_hash": "0x...",
  "status": "completed",
  "blockchain_status": "finalized",
  "confirmations": 12,
  "created": 1719331200000
}
```

## Versioning

- v1 endpoints are prefixed with `/api/v1/`.
- Breaking changes require a new version prefix (`/api/v2/`).
- Additive changes (new fields, new endpoints) may be added to v1 without
  a version bump — SDKs must ignore unknown fields.
- The old session-cookie routes (`/api/checkout`, `/api/merchant`) are for
  the web console only and are not part of the public API contract.
