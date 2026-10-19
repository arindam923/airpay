"""Error types for the AirPay Python SDK."""

from __future__ import annotations

from typing import Any, Optional

ERROR_TYPES = (
    "invalid_request_error",
    "authentication_error",
    "permission_error",
    "rate_limit_error",
    "idempotency_error",
    "api_error",
)


class AirPayError(Exception):
    """Raised for any error returned by the AirPay API."""

    def __init__(
        self,
        message: str,
        *,
        type: str = "api_error",
        code: str = "unknown_error",
        param: Optional[str] = None,
        status_code: int = 0,
        request_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.type = type
        self.code = code
        self.param = param
        self.status_code = status_code
        self.request_id = request_id

    @classmethod
    def from_response(
        cls, status_code: int, body: Any, request_id: Optional[str] = None
    ) -> "AirPayError":
        payload = _extract_payload(body)
        return cls(
            payload["message"],
            type=payload["type"],
            code=payload["code"],
            param=payload.get("param"),
            status_code=status_code,
            request_id=request_id,
        )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"AirPayError(code={self.code!r}, type={self.type!r}, "
            f"status_code={self.status_code!r}, message={self.message!r})"
        )


class AirPayConnectionError(AirPayError):
    """Raised when a request never reached the API."""

    def __init__(self, message: str, *, code: str = "connection_error") -> None:
        super().__init__(message, type="api_error", code=code)


class WebhookSignatureError(Exception):
    """Raised when a webhook signature is missing or invalid."""


def _extract_payload(body: Any) -> dict:
    fallback = {
        "type": "api_error",
        "code": "unknown_error",
        "message": "An unexpected error occurred.",
    }
    if not isinstance(body, dict):
        return fallback
    error = body.get("error")
    if not isinstance(error, dict):
        return fallback
    return {
        "type": error.get("type", fallback["type"]),
        "code": error.get("code", fallback["code"]),
        "message": error.get("message", fallback["message"]),
        **({"param": error["param"]} if isinstance(error.get("param"), str) else {}),
    }
