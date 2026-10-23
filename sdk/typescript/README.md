# @airpay/sdk

Official AirPay SDK for TypeScript and JavaScript (Node.js 18+).

Create payment intents, hosted checkout sessions, and verify webhooks with
signed requests. Secret keys (`ap_…`) are server-side only.

## Install

```bash
npm install @airpay/sdk
```

## Quick start

```ts
import { AirPay } from "@airpay/sdk";

const airpay = new AirPay({ apiKey: process.env.AIRPAY_SECRET_KEY! });

const session = await airpay.checkoutSessions.create({
  amount: 1250, // cents
  chain: "base",
  token: "USDC",
  successUrl: "https://shop.example/ok",
});

console.log(session.url); // redirect the customer here
```

Create a headless intent and attach the on-chain transaction:

```ts
const intent = await airpay.paymentIntents.create(
  { amount: 1250, chain: "base", token: "USDC" },
  { idempotencyKey: "order_123" },
);

await airpay.paymentIntents.confirm(intent.id, {
  txHash: "0x…",
  clientSecret: intent.client_secret,
});
```

## Webhooks

Verify the raw request body before parsing JSON:

```ts
import { constructEvent } from "@airpay/sdk/webhooks";

const event = constructEvent(
  rawBody,
  req.headers["airpay-signature"] as string,
  process.env.AIRPAY_WEBHOOK_SECRET!,
);
```

## Resources

- `account.retrieve()`
- `config.retrieve()`
- `paymentIntents.create() / retrieve() / list() / confirm() / cancel()`
- `checkoutSessions.create() / retrieve() / list() / expire()`

All amounts are integers in the smallest currency unit (cents). Errors are
thrown as `AirPayError` with `type`, `code`, `param`, `statusCode`, and
`requestId`.

- Documentation: https://airpay.dev/docs
- API version: `2026-10-19`

## License

MIT
