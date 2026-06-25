# @airpay/node

Official Node.js SDK for the [AirPay](https://airpay-frontend.arindam92.workers.dev) crypto payment gateway.

Accept payments in USDC, USDT, and EURC across Solana, Ethereum, Arbitrum, and Polygon.

## Installation

```bash
npm install @airpay/node
```

Requires Node.js 20 or later.

## Quick start

```ts
import { AirpayClient } from "@airpay/node"

const airpay = new AirpayClient({
  secretKey: process.env.AIRPAY_SECRET_KEY, // sk_test_... or sk_live_...
})

const session = await airpay.checkoutSessions.create({
  product_name: "Pro Plan — Annual",
  amount: 4999, // cents, e.g. $49.99
  currency: "USDC",
  network: "Solana",
})

console.log(session.id)
```

## Authentication

AirPay uses two types of API keys:

| Key | Prefix | Use |
|---|---|---|
| Secret | `sk_test_...` / `sk_live_...` | Server-side only. Full access. |
| Publishable | `pk_test_...` / `pk_live_...` | Client-side safe. Retrieve checkout sessions and poll payment status. |

## Usage

### Checkout sessions

```ts
// Create a session (secret key required)
const session = await airpay.checkoutSessions.create({
  product_name: "Pro Plan",
  amount: 4999,
  currency: "USDC",
  network: "Solana",
  collect_email: true,
  expires_in: 1800, // seconds, default 30 min
  metadata: { order_id: "12345" },
})

// Retrieve a session (publishable or secret key)
const retrieved = await airpay.checkoutSessions.retrieve(session.id)

// Confirm a payment from the buyer's wallet (no auth required)
const confirmation = await airpay.checkoutSessions.confirm(session.id, {
  tx_hash: "...",
  buyer_address: "...",
  signature: "...",
})
```

### Payments

```ts
// Get lightweight status (publishable or secret key)
const status = await airpay.payments.status(paymentId)

// Retrieve full payment record (secret key required)
const payment = await airpay.payments.retrieve(paymentId)

// List payments with optional filters (secret key required)
const list = await airpay.payments.list({
  limit: 10,
  network: "Solana",
  status: "completed",
})
```

### Webhooks

Verify webhook signatures delivered to your endpoint:

```ts
import { constructEvent } from "@airpay/node"

const event = await constructEvent(
  rawRequestBody,       // string or Uint8Array
  request.headers["airpay-signature"],
  process.env.AIRPAY_WEBHOOK_SECRET, // whsec_...
)

console.log(event.event) // "payment.confirmed" | "payment.failed" | ...
```

Or via the client instance:

```ts
const event = await airpay.constructEvent(
  rawRequestBody,
  request.headers["airpay-signature"],
  process.env.AIRPAY_WEBHOOK_SECRET,
)
```

The SDK validates the Stripe-style `AirPay-Signature` header (`t=<timestamp>,v1=<hmac>`) and rejects old timestamps by default (5-minute tolerance).

## Error handling

All SDK errors extend `AirpayError`:

```ts
import { AirpayError, AirpayAuthenticationError, AirpayRateLimitError } from "@airpay/node"

try {
  await airpay.checkoutSessions.create({ ... })
} catch (err) {
  if (err instanceof AirpayAuthenticationError) {
    console.error("Bad API key")
  } else if (err instanceof AirpayRateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter}s`)
  } else if (err instanceof AirpayError) {
    console.error(`${err.type}: ${err.message}`)
  }
}
```

## Configuration

```ts
const airpay = new AirpayClient({
  secretKey: process.env.AIRPAY_SECRET_KEY,
  publishableKey: process.env.AIRPAY_PUBLISHABLE_KEY, // optional
  baseUrl: "http://localhost:8787",                    // optional, for local dev
  timeout: 30_000,                                     // ms
  maxRetries: 3,
  fetch: customFetch,                                  // optional custom fetch impl
})
```

## API reference

See the OpenAPI contract at `sdk/contract/openapi.yaml` for the complete API spec.

## License

MIT
