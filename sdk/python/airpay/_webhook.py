"""Webhook signature verification.

AirPay signs each delivery with an ``Airpay-Signature`` header of the form
``t=<unix seconds>,v1=<hex HMAC-SHA256>`` computed over ``"<t>.<raw body>"``.
Always verify against the raw request body, before JSON parsing.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from ._errors import WebhookSignatureError

DEFAULT_TOLERANCE = 300

Payload = Union[str, bytes, bytearray]


def _to_str(payload: Payload) -> str:
    if isinstance(payload, str):
        return payload
    return bytes(payload).decode("utf-8")


def compute_signature(secret: str, timestamp: int, payload: Payload) -> str:
    message = f"{timestamp}.{_to_str(payload)}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def parse_signature_header(header: str) -> Tuple[int, List[str]]:
    timestamp: Optional[int] = None
    signatures: List[str] = []
    for part in header.split(","):
        key, _, value = part.partition("=")
        key = key.strip()
        value = value.strip()
        if not key or not value:
            continue
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError as exc:
                raise WebhookSignatureError("Invalid `t` value in signature header.") from exc
        elif key == "v1":
            signatures.append(value)
    if timestamp is None:
        raise WebhookSignatureError("Missing `t` in signature header.")
    if not signatures:
        raise WebhookSignatureError("Missing `v1` in signature header.")
    return timestamp, signatures


def verify(
    payload: Payload,
    signature_header: str,
    secret: str,
    *,
    tolerance: int = DEFAULT_TOLERANCE,
    now: Optional[int] = None,
) -> bool:
    if not signature_header:
        return False
    try:
        timestamp, signatures = parse_signature_header(signature_header)
    except WebhookSignatureError:
        return False

    current = int(time.time()) if now is None else now
    if tolerance > 0 and abs(current - timestamp) > tolerance:
        return False

    expected = compute_signature(secret, timestamp, payload)
    return any(hmac.compare_digest(signature, expected) for signature in signatures)


def construct_event(
    payload: Payload,
    signature_header: str,
    secret: str,
    *,
    tolerance: int = DEFAULT_TOLERANCE,
    now: Optional[int] = None,
) -> Dict[str, Any]:
    """Verify the signature and return the parsed event, or raise."""
    body = _to_str(payload)
    if not verify(body, signature_header, secret, tolerance=tolerance, now=now):
        raise WebhookSignatureError("Webhook signature verification failed.")
    try:
        event = json.loads(body)
    except ValueError as exc:
        raise WebhookSignatureError("Webhook payload is not valid JSON.") from exc
    if not isinstance(event, dict) or not isinstance(event.get("type"), str):
        raise WebhookSignatureError("Webhook payload is missing a `type`.")
    return event


class Webhook:
    """Namespace mirroring the other SDKs' ``Webhook`` helper."""

    DEFAULT_TOLERANCE = DEFAULT_TOLERANCE

    compute_signature = staticmethod(compute_signature)
    verify = staticmethod(verify)
    construct_event = staticmethod(construct_event)
