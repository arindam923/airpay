package airpay

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func TestCheckoutSessionCreateAndErrorMapping(t *testing.T) {
	var gotPath, gotAuth, gotIdem, gotVersion string
	var gotBody map[string]any

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotIdem = r.Header.Get("Idempotency-Key")
		gotVersion = r.Header.Get("Airpay-Version")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		if r.Header.Get("Airpay-Client-Secret") == "wrong" {
			w.Header().Set("x-request-id", "req_403")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error":{"type":"permission_error","code":"invalid_client_secret","message":"nope"}}`))
			return
		}
		w.Header().Set("x-request-id", "req_ok")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":"cs_1","object":"checkout.session","status":"open","url":"https://app.test/checkout/cs_1","payment_intent":"pi_1"}`))
	}))
	defer server.Close()

	client := NewClient("ap_test_x", WithBaseURL(server.URL))

	session, err := client.CheckoutSessions.Create(context.Background(), &CheckoutSessionCreateParams{
		Amount:     1250,
		Chain:      "base",
		SuccessURL: "https://shop.dev/ok",
	}, "idem-1")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if session.ID != "cs_1" || session.Status != SessionOpen {
		t.Fatalf("unexpected session: %+v", session)
	}
	if gotPath != "/v1/checkout_sessions" {
		t.Errorf("path = %q", gotPath)
	}
	if gotAuth != "Bearer ap_test_x" {
		t.Errorf("auth = %q", gotAuth)
	}
	if gotIdem != "idem-1" {
		t.Errorf("idempotency = %q", gotIdem)
	}
	if gotVersion != APIVersion {
		t.Errorf("version = %q", gotVersion)
	}
	if gotBody["amount"].(float64) != 1250 || gotBody["chain"] != "base" || gotBody["success_url"] != "https://shop.dev/ok" {
		t.Errorf("body = %v", gotBody)
	}

	_, err = client.PaymentIntents.Retrieve(context.Background(), "pi_1", &PaymentIntentRetrieveParams{ClientSecret: "wrong"})
	var apiErr *AirPayError
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected *AirPayError, got %v", err)
	}
	if apiErr.StatusCode != 403 || apiErr.Code != "invalid_client_secret" || apiErr.RequestID != "req_403" {
		t.Errorf("unexpected api error: %+v", apiErr)
	}
}

func TestWebhookVerification(t *testing.T) {
	secret := "whsec_test"
	payload := []byte(`{"id":"evt_1","type":"payment.confirmed","createdAt":1700000000000,"environment":"sandbox","data":{"payment_intent":{"id":"pi_1"}}}`)
	now := time.Now().Unix()

	good := "t=" + strconv.FormatInt(now, 10) + ",v1=" + ComputeSignature(secret, now, payload)
	if !VerifyWebhookSignature(payload, good, secret, DefaultTolerance) {
		t.Fatal("expected valid signature")
	}
	if VerifyWebhookSignature(payload, good, "wrong", DefaultTolerance) {
		t.Fatal("wrong secret must fail")
	}

	stale := "t=" + strconv.FormatInt(now-10000, 10) + ",v1=" + ComputeSignature(secret, now-10000, payload)
	if VerifyWebhookSignature(payload, stale, secret, DefaultTolerance) {
		t.Fatal("stale signature must fail")
	}
	if !VerifyWebhookSignature(payload, stale, secret, 0) {
		t.Fatal("tolerance 0 must skip freshness")
	}

	event, err := ConstructWebhookEvent(payload, good, secret, DefaultTolerance)
	if err != nil {
		t.Fatalf("construct: %v", err)
	}
	if event.Type != "payment.confirmed" || event.Environment != EnvironmentSandbox {
		t.Fatalf("unexpected event: %+v", event)
	}
	var data struct {
		PaymentIntent struct {
			ID string `json:"id"`
		} `json:"payment_intent"`
	}
	if err := event.DecodeData(&data); err != nil || data.PaymentIntent.ID != "pi_1" {
		t.Fatalf("decode data: %v %+v", err, data)
	}

	if _, err := ConstructWebhookEvent(payload, good, "wrong", DefaultTolerance); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature, got %v", err)
	}
}
