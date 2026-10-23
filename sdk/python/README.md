# airpay

Official AirPay Python SDK (Python 3.9+). Uses only the standard library.

## Install

```bash
pip install airpay
```

## Quick start

```python
import os
from airpay import AirPay

client = AirPay(os.environ["AIRPAY_SECRET_KEY"])

session = client.checkout_sessions.create(
    amount=1250,  # cents
    chain="base",
    token="USDC",
    success_url="https://shop.example/ok",
)
print(session.url)  # redirect the customer here
```

Create a headless intent and attach the on-chain transaction:

```python
intent = client.payment_intents.create(
    amount=1250,
    chain="base",
    token="USDC",
    idempotency_key="order_123",
)

client.payment_intents.confirm(
    intent.id,
    tx_hash="0x…",
    client_secret=intent.client_secret,
)
```

## Webhooks

Verify the raw request body before parsing JSON:

```python
from airpay import Webhook

event = Webhook.construct_event(
    raw_body,
    request.headers["Airpay-Signature"],
    os.environ["AIRPAY_WEBHOOK_SECRET"],
)
```

Or use the module-level helpers: `compute_signature`, `verify`,
`construct_event`.

## Resources

- `account.retrieve()`
- `config.retrieve()`
- `payment_intents.create() / retrieve() / list() / confirm() / cancel()`
- `checkout_sessions.create() / retrieve() / list() / expire()`

All amounts are integers in the smallest currency unit (cents). API failures
raise `AirPayError`; network failures raise `AirPayConnectionError`.

- Documentation: https://airpay.dev/docs
- API version: `2026-10-19`

## License

MIT
