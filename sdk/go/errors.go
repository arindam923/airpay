package airpay

import (
	"encoding/json"
	"fmt"
)

// AirPayError is returned for any error response from the AirPay API.
type AirPayError struct {
	Type       string
	Code       string
	Message    string
	Param      string
	StatusCode int
	RequestID  string
}

func (e *AirPayError) Error() string {
	return fmt.Sprintf("airpay: %s (code=%s, status=%d)", e.Message, e.Code, e.StatusCode)
}

// ConnectionError is returned when a request never reached the API.
type ConnectionError struct {
	Message   string
	RequestID string
	Err       error
}

func (e *ConnectionError) Error() string {
	return fmt.Sprintf("airpay: connection error: %s", e.Message)
}

func (e *ConnectionError) Unwrap() error { return e.Err }

type errorEnvelope struct {
	Error struct {
		Type    string `json:"type"`
		Code    string `json:"code"`
		Message string `json:"message"`
		Param   string `json:"param"`
	} `json:"error"`
}

func newAPIError(statusCode int, body []byte, requestID string) *AirPayError {
	apiErr := &AirPayError{
		Type:       "api_error",
		Code:       "unknown_error",
		Message:    "An unexpected error occurred.",
		StatusCode: statusCode,
		RequestID:  requestID,
	}
	var envelope errorEnvelope
	if err := json.Unmarshal(body, &envelope); err == nil && envelope.Error.Message != "" {
		if envelope.Error.Type != "" {
			apiErr.Type = envelope.Error.Type
		}
		if envelope.Error.Code != "" {
			apiErr.Code = envelope.Error.Code
		}
		apiErr.Message = envelope.Error.Message
		apiErr.Param = envelope.Error.Param
	}
	return apiErr
}
