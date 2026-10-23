"""Synchronous AirPay client built on the standard library only."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Mapping, Optional

from ._errors import AirPayConnectionError, AirPayError

DEFAULT_BASE_URL = "https://api.airpay.dev"
API_VERSION = "2026-10-19"

_RETRY_STATUS = frozenset({409, 429, 500, 502, 503, 504})


class AirPayObject(dict):
    """A dict that also supports attribute access (``obj.id``)."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as exc:  # pragma: no cover - attribute access path
            raise AttributeError(name) from exc


def _wrap(value: Any) -> Any:
    if isinstance(value, dict):
        return AirPayObject({key: _wrap(item) for key, item in value.items()})
    if isinstance(value, list):
        return [_wrap(item) for item in value]
    return value


def _prune(**kwargs: Any) -> Dict[str, Any]:
    return {key: value for key, value in kwargs.items() if value is not None}


def _safe_to_retry(method: str, idempotency_key: Optional[str]) -> bool:
    return method == "GET" or bool(idempotency_key)


def _backoff(attempt: int) -> float:
    return min(2 ** attempt * 0.5, 8.0)


class AirPay:
    """Client for the AirPay REST API.

    :param api_key: a secret key (``ap_…``) or publishable key (``pk_…``).
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        version: str = API_VERSION,
        timeout: float = 30.0,
        max_network_retries: int = 2,
    ) -> None:
        if not api_key:
            raise ValueError("An API key is required.")
        self._api_key = api_key
        self._base_url = base_url
        self._version = version
        self._timeout = timeout
        self._max_network_retries = max(0, int(max_network_retries))

        self.account = _Account(self)
        self.config = _Config(self)
        self.payment_intents = _PaymentIntents(self)
        self.checkout_sessions = _CheckoutSessions(self)

    # -- internals ---------------------------------------------------------

    def _build_url(self, path: str, query: Optional[Mapping[str, Any]]) -> str:
        base = self._base_url if self._base_url.endswith("/") else self._base_url + "/"
        url = urllib.parse.urljoin(base, path.lstrip("/"))
        if query:
            clean = {k: v for k, v in query.items() if v is not None}
            if clean:
                url = f"{url}?{urllib.parse.urlencode(clean)}"
        return url

    def _request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[Mapping[str, Any]] = None,
        body: Optional[Mapping[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        client_secret: Optional[str] = None,
    ) -> Any:
        url = self._build_url(path, query)
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Airpay-Version": self._version,
            "Accept": "application/json",
        }
        data: Optional[bytes] = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        if client_secret:
            headers["Airpay-Client-Secret"] = client_secret

        attempt = 0
        while True:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(request, timeout=self._timeout) as response:
                    raw = response.read()
                    return _wrap(_decode(raw))
            except urllib.error.HTTPError as exc:
                raw = exc.read()
                if (
                    exc.code in _RETRY_STATUS
                    and _safe_to_retry(method, idempotency_key)
                    and attempt < self._max_network_retries
                ):
                    attempt += 1
                    time.sleep(_backoff(attempt))
                    continue
                raise AirPayError.from_response(
                    exc.code, _decode(raw), exc.headers.get("x-request-id")
                ) from exc
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                if _safe_to_retry(method, idempotency_key) and attempt < self._max_network_retries:
                    attempt += 1
                    time.sleep(_backoff(attempt))
                    continue
                raise AirPayConnectionError(str(exc)) from exc


def _decode(raw: bytes) -> Any:
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return {}


class _Account:
    def __init__(self, client: AirPay) -> None:
        self._client = client

    def retrieve(self) -> AirPayObject:
        """Retrieve the authenticated account."""
        return self._client._request("GET", "/v1/account")


class _Config:
    def __init__(self, client: AirPay) -> None:
        self._client = client

    def retrieve(self) -> AirPayObject:
        """List the chains and tokens enabled for the workspace."""
        return self._client._request("GET", "/v1/config")


class _PaymentIntents:
    def __init__(self, client: AirPay) -> None:
        self._client = client

    def create(
        self,
        *,
        amount: int,
        chain: str,
        currency: Optional[str] = None,
        token: Optional[str] = None,
        title: Optional[str] = None,
        merchant: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Mapping[str, str]] = None,
        receiver: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> AirPayObject:
        """Create a payment intent.

        :param amount: amount in the smallest currency unit (cents).
        """
        body = _prune(
            amount=amount,
            chain=chain,
            currency=currency,
            token=token,
            title=title,
            merchant=merchant,
            description=description,
            metadata=metadata,
            receiver=receiver,
        )
        return self._client._request(
            "POST", "/v1/payment_intents", body=body, idempotency_key=idempotency_key
        )

    def retrieve(self, intent_id: str, *, client_secret: Optional[str] = None) -> AirPayObject:
        return self._client._request(
            "GET",
            f"/v1/payment_intents/{urllib.parse.quote(intent_id)}",
            client_secret=client_secret,
        )

    def list(
        self, *, limit: Optional[int] = None, starting_after: Optional[str] = None
    ) -> AirPayObject:
        return self._client._request(
            "GET",
            "/v1/payment_intents",
            query={"limit": limit, "starting_after": starting_after},
        )

    def confirm(
        self,
        intent_id: str,
        *,
        tx_hash: str,
        payer: Optional[str] = None,
        client_secret: Optional[str] = None,
    ) -> AirPayObject:
        body = _prune(
            tx_hash=tx_hash, payer=payer, client_secret=client_secret
        )
        return self._client._request(
            "POST",
            f"/v1/payment_intents/{urllib.parse.quote(intent_id)}/confirm",
            body=body,
            client_secret=client_secret,
        )

    def cancel(self, intent_id: str) -> AirPayObject:
        return self._client._request(
            "POST", f"/v1/payment_intents/{urllib.parse.quote(intent_id)}/cancel"
        )


class _CheckoutSessions:
    def __init__(self, client: AirPay) -> None:
        self._client = client

    def create(
        self,
        *,
        amount: int,
        chain: str,
        currency: Optional[str] = None,
        token: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        client_reference_id: Optional[str] = None,
        metadata: Optional[Mapping[str, str]] = None,
        title: Optional[str] = None,
        merchant: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> AirPayObject:
        """Create a hosted checkout session; redirect the customer to ``url``."""
        body = _prune(
            amount=amount,
            chain=chain,
            currency=currency,
            token=token,
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=client_reference_id,
            metadata=metadata,
            title=title,
            merchant=merchant,
        )
        return self._client._request(
            "POST", "/v1/checkout_sessions", body=body, idempotency_key=idempotency_key
        )

    def retrieve(self, session_id: str) -> AirPayObject:
        return self._client._request(
            "GET", f"/v1/checkout_sessions/{urllib.parse.quote(session_id)}"
        )

    def list(
        self, *, limit: Optional[int] = None, starting_after: Optional[str] = None
    ) -> AirPayObject:
        return self._client._request(
            "GET",
            "/v1/checkout_sessions",
            query={"limit": limit, "starting_after": starting_after},
        )

    def expire(self, session_id: str) -> AirPayObject:
        return self._client._request(
            "POST", f"/v1/checkout_sessions/{urllib.parse.quote(session_id)}/expire"
        )
