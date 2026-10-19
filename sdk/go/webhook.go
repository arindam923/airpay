package airpay

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// DefaultTolerance is the maximum accepted age of a webhook signature (5 min).
const DefaultTolerance = 5 * time.Minute

// ErrInvalidSignature is returned when a webhook signature cannot be verified.
var ErrInvalidSignature = errors.New("airpay: webhook signature verification failed")

// WebhookEvent is a verified webhook payload.
type WebhookEvent struct {
	ID          string          `json:"id"`
	Type        string          `json:"type"`
	CreatedAt   int64           `json:"createdAt"`
	Environment Environment     `json:"environment"`
	Data        json.RawMessage `json:"data"`
}

// DecodeData unmarshals the event's `data` into v.
func (e *WebhookEvent) DecodeData(v any) error {
	return json.Unmarshal(e.Data, v)
}

// ComputeSignature returns `v1` value: hex HMAC-SHA256 over "<t>.<payload>".
func ComputeSignature(secret string, timestamp int64, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strconv.FormatInt(timestamp, 10)))
	mac.Write([]byte("."))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyWebhookSignature reports whether the header authenticates the payload.
// Pass tolerance <= 0 to disable the freshness check.
func VerifyWebhookSignature(payload []byte, signatureHeader, secret string, tolerance time.Duration) bool {
	if signatureHeader == "" {
		return false
	}
	timestamp, signatures, err := parseSignatureHeader(signatureHeader)
	if err != nil {
		return false
	}
	if tolerance > 0 {
		age := time.Since(time.Unix(timestamp, 0))
		if age < 0 {
			age = -age
		}
		if age > tolerance {
			return false
		}
	}
	expected := ComputeSignature(secret, timestamp, payload)
	for _, signature := range signatures {
		if hmac.Equal([]byte(signature), []byte(expected)) {
			return true
		}
	}
	return false
}

// ConstructWebhookEvent verifies the signature and parses the event.
func ConstructWebhookEvent(payload []byte, signatureHeader, secret string, tolerance time.Duration) (*WebhookEvent, error) {
	if !VerifyWebhookSignature(payload, signatureHeader, secret, tolerance) {
		return nil, ErrInvalidSignature
	}
	var event WebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("airpay: parse webhook payload: %w", err)
	}
	if event.Type == "" {
		return nil, errors.New("airpay: webhook payload is missing a `type`")
	}
	return &event, nil
}

func parseSignatureHeader(header string) (int64, []string, error) {
	var timestamp int64
	var foundTimestamp bool
	var signatures []string
	for _, part := range strings.Split(header, ",") {
		key, value, ok := strings.Cut(part, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		switch key {
		case "t":
			parsed, err := strconv.ParseInt(value, 10, 64)
			if err != nil {
				return 0, nil, fmt.Errorf("airpay: invalid `t` in signature header")
			}
			timestamp = parsed
			foundTimestamp = true
		case "v1":
			signatures = append(signatures, value)
		}
	}
	if !foundTimestamp {
		return 0, nil, errors.New("airpay: missing `t` in signature header")
	}
	if len(signatures) == 0 {
		return 0, nil, errors.New("airpay: missing `v1` in signature header")
	}
	return timestamp, signatures, nil
}
