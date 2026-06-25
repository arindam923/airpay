# Golden Fixtures

These JSON files are the canonical request/response examples for the AirPay
API. Each SDK's test suite loads these fixtures and asserts that its HTTP
client produces/consumes them correctly — guaranteeing parity across
Node, Python, Go, and Rust.

## Usage in tests

1. **Request fixtures** (`*_request.json`) — assert the SDK serializes the
   given typed input to this exact JSON body.
2. **Response fixtures** (`*_response.json`) — feed this JSON to the SDK's
   deserializer and assert the resulting typed object matches expected values.
3. **Error fixtures** (`error_*.json`) — assert the SDK maps the error type
   to the correct exception class.

## Webhook test vectors

For webhook signature verification tests, the signing key and expected
signature are computed deterministically from the event JSON. See each SDK's
webhook test file for the exact vectors (key, timestamp, expected signature).
