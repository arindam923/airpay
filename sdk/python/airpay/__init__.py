"""Official AirPay Python SDK.

    from airpay import AirPay

    client = AirPay("ap_test_…")
    session = client.checkout_sessions.create(
        amount=1250, chain="base", success_url="https://shop.dev/ok"
    )
    print(session.url)

Webhook verification lives in :class:`airpay.Webhook`.
"""

from __future__ import annotations

from ._client import API_VERSION, DEFAULT_BASE_URL, AirPay, AirPayObject
from ._errors import AirPayConnectionError, AirPayError, WebhookSignatureError
from ._webhook import Webhook, compute_signature, construct_event, verify

__all__ = [
    "AirPay",
    "AirPayObject",
    "AirPayError",
    "AirPayConnectionError",
    "Webhook",
    "WebhookSignatureError",
    "compute_signature",
    "construct_event",
    "verify",
    "DEFAULT_BASE_URL",
    "API_VERSION",
    "__version__",
]

__version__ = "0.1.0"
