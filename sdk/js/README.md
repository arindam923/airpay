# @airpay/js

Official AirPay browser SDK. Use it with a **publishable** key
(`pk_test_…` / `pk_live_…`) to read configuration, follow a payment intent,
and attach the on-chain transaction from the customer's browser.

Never put a secret key (`ap_…`) in browser code.

## Install

```bash
npm install @airpay/js
```

## Quick start

```ts
import AirPayJS from "@airpay/js";

const airpay = new AirPayJS("pk_test_…");

const intent = await airpay.retrieveIntent(intentId, clientSecret);
console.log(intent.status, intent.expected_units);

await airpay.confirmIntent(intentId, {
  txHash: "0x…",
  clientSecret,
  payer: account,
});
```

Redirect to a hosted checkout page:

```ts
AirPayJS.redirectToCheckout(session.url);
```

## Methods

- `getAccount()`
- `getConfig()`
- `retrieveIntent(intentId, clientSecret)`
- `confirmIntent(intentId, { txHash, clientSecret, payer? })`
- `AirPayJS.redirectToCheckout(url)`

Errors are thrown as `AirPayError`. Use `isAirPayError(err)` to narrow.

- Documentation: https://airpay.dev/docs
- API version: `2026-10-19`

## License

MIT
