// Package airpay is the official Go SDK for the AirPay API.
//
//	client := airpay.NewClient("ap_test_…")
//	session, err := client.CheckoutSessions.Create(ctx, &airpay.CheckoutSessionCreateParams{
//		Amount:     1250,
//		Chain:      "base",
//		SuccessURL: "https://shop.dev/ok",
//	})
//	if err != nil {
//		log.Fatal(err)
//	}
//	fmt.Println(session.URL)
//
// All amounts are integers in the smallest currency unit (cents). Webhook
// verification lives in VerifyWebhookSignature / ConstructWebhookEvent.
package airpay

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	// DefaultBaseURL is the production API endpoint.
	DefaultBaseURL = "https://api.airpay.dev"
	// APIVersion is the pinned API version sent with every request.
	APIVersion = "2026-10-19"
)

var retryStatuses = map[int]bool{409: true, 429: true, 500: true, 502: true, 503: true, 504: true}

// Client talks to the AirPay API. Create one per API key and reuse it.
type Client struct {
	apiKey     string
	baseURL    string
	version    string
	httpClient *http.Client
	maxRetries int

	Account          *AccountService
	Config           *ConfigService
	PaymentIntents   *PaymentIntentService
	CheckoutSessions *CheckoutSessionService
}

// Option configures a Client.
type Option func(*Client)

// WithBaseURL overrides the API base URL.
func WithBaseURL(baseURL string) Option {
	return func(c *Client) { c.baseURL = baseURL }
}

// WithHTTPClient supplies a custom HTTP client.
func WithHTTPClient(client *http.Client) Option {
	return func(c *Client) { c.httpClient = client }
}

// WithTimeout sets the per-request timeout on the default HTTP client.
func WithTimeout(timeout time.Duration) Option {
	return func(c *Client) { c.httpClient.Timeout = timeout }
}

// WithVersion pins a different API version.
func WithVersion(version string) Option {
	return func(c *Client) { c.version = version }
}

// WithMaxNetworkRetries sets retries for transient failures on safe requests.
func WithMaxNetworkRetries(retries int) Option {
	return func(c *Client) { c.maxRetries = max(0, retries) }
}

// NewClient creates a client. The key selects the environment.
func NewClient(apiKey string, opts ...Option) *Client {
	c := &Client{
		apiKey:     apiKey,
		baseURL:    DefaultBaseURL,
		version:    APIVersion,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		maxRetries: 2,
	}
	for _, opt := range opts {
		opt(c)
	}
	c.Account = &AccountService{client: c}
	c.Config = &ConfigService{client: c}
	c.PaymentIntents = &PaymentIntentService{client: c}
	c.CheckoutSessions = &CheckoutSessionService{client: c}
	return c
}

type requestOptions struct {
	query          url.Values
	body           any
	idempotencyKey string
	clientSecret   string
}

func (c *Client) do(ctx context.Context, method, path string, opts requestOptions) ([]byte, error) {
	endpoint := strings.TrimRight(c.baseURL, "/") + path
	if len(opts.query) > 0 {
		endpoint += "?" + opts.query.Encode()
	}

	var payload []byte
	if opts.body != nil {
		encoded, err := json.Marshal(opts.body)
		if err != nil {
			return nil, fmt.Errorf("airpay: encode request body: %w", err)
		}
		payload = encoded
	}

	safeToRetry := method == http.MethodGet || opts.idempotencyKey != ""

	var lastErr error
	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(payload))
		if err != nil {
			return nil, fmt.Errorf("airpay: build request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("Airpay-Version", c.version)
		req.Header.Set("Accept", "application/json")
		if opts.body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		if opts.idempotencyKey != "" {
			req.Header.Set("Idempotency-Key", opts.idempotencyKey)
		}
		if opts.clientSecret != "" {
			req.Header.Set("Airpay-Client-Secret", opts.clientSecret)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = &ConnectionError{Message: err.Error(), Err: err}
			if safeToRetry && attempt < c.maxRetries {
				backoff(ctx, attempt)
				continue
			}
			return nil, lastErr
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		requestID := resp.Header.Get("x-request-id")
		if readErr != nil {
			return nil, &ConnectionError{Message: readErr.Error(), RequestID: requestID, Err: readErr}
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return body, nil
		}

		if retryStatuses[resp.StatusCode] && safeToRetry && attempt < c.maxRetries {
			backoff(ctx, attempt)
			continue
		}
		return nil, newAPIError(resp.StatusCode, body, requestID)
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("airpay: request failed")
}

func backoff(ctx context.Context, attempt int) {
	delay := time.Duration(min(1<<attempt, 8)) * 500 * time.Millisecond
	delay += time.Duration(rand.Intn(250)) * time.Millisecond
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}

func listQuery(params ListParams) url.Values {
	query := url.Values{}
	if params.Limit > 0 {
		query.Set("limit", strconv.Itoa(params.Limit))
	}
	if params.StartingAfter != "" {
		query.Set("starting_after", params.StartingAfter)
	}
	return query
}

// AccountService reads the authenticated account.
type AccountService struct{ client *Client }

// Retrieve returns the authenticated account.
func (s *AccountService) Retrieve(ctx context.Context) (*Account, error) {
	body, err := s.client.do(ctx, http.MethodGet, "/v1/account", requestOptions{})
	if err != nil {
		return nil, err
	}
	var account Account
	if err := json.Unmarshal(body, &account); err != nil {
		return nil, err
	}
	return &account, nil
}

// ConfigService reads enabled chains and tokens.
type ConfigService struct{ client *Client }

// Retrieve returns the workspace config.
func (s *ConfigService) Retrieve(ctx context.Context) (*Config, error) {
	body, err := s.client.do(ctx, http.MethodGet, "/v1/config", requestOptions{})
	if err != nil {
		return nil, err
	}
	var config Config
	if err := json.Unmarshal(body, &config); err != nil {
		return nil, err
	}
	return &config, nil
}

// PaymentIntentService manages payment intents.
type PaymentIntentService struct{ client *Client }

// Create creates a payment intent.
func (s *PaymentIntentService) Create(ctx context.Context, params *PaymentIntentCreateParams, idempotencyKey string) (*PaymentIntent, error) {
	body, err := s.client.do(ctx, http.MethodPost, "/v1/payment_intents", requestOptions{
		body:           params,
		idempotencyKey: idempotencyKey,
	})
	if err != nil {
		return nil, err
	}
	return decodePaymentIntent(body)
}

// Retrieve fetches an intent. Supply ClientSecret when using a publishable key.
func (s *PaymentIntentService) Retrieve(ctx context.Context, id string, params *PaymentIntentRetrieveParams) (*PaymentIntent, error) {
	opts := requestOptions{}
	if params != nil {
		opts.clientSecret = params.ClientSecret
	}
	body, err := s.client.do(ctx, http.MethodGet, "/v1/payment_intents/"+url.PathEscape(id), opts)
	if err != nil {
		return nil, err
	}
	return decodePaymentIntent(body)
}

// List returns a page of intents.
func (s *PaymentIntentService) List(ctx context.Context, params ListParams) (*PaymentIntentList, error) {
	body, err := s.client.do(ctx, http.MethodGet, "/v1/payment_intents", requestOptions{query: listQuery(params)})
	if err != nil {
		return nil, err
	}
	var list PaymentIntentList
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, err
	}
	return &list, nil
}

// Confirm attaches an on-chain transaction to an intent.
func (s *PaymentIntentService) Confirm(ctx context.Context, id string, params *PaymentIntentConfirmParams) (*PaymentIntent, error) {
	body := struct {
		TxHash       string `json:"tx_hash"`
		Payer        string `json:"payer,omitempty"`
		ClientSecret string `json:"client_secret,omitempty"`
	}{TxHash: params.TxHash, Payer: params.Payer, ClientSecret: params.ClientSecret}
	resp, err := s.client.do(ctx, http.MethodPost, "/v1/payment_intents/"+url.PathEscape(id)+"/confirm", requestOptions{
		body:         body,
		clientSecret: params.ClientSecret,
	})
	if err != nil {
		return nil, err
	}
	return decodePaymentIntent(resp)
}

// Cancel cancels an intent that has not reached a terminal state.
func (s *PaymentIntentService) Cancel(ctx context.Context, id string) (*PaymentIntent, error) {
	body, err := s.client.do(ctx, http.MethodPost, "/v1/payment_intents/"+url.PathEscape(id)+"/cancel", requestOptions{})
	if err != nil {
		return nil, err
	}
	return decodePaymentIntent(body)
}

// CheckoutSessionService manages hosted checkout sessions.
type CheckoutSessionService struct{ client *Client }

// Create creates a hosted checkout session.
func (s *CheckoutSessionService) Create(ctx context.Context, params *CheckoutSessionCreateParams, idempotencyKey string) (*CheckoutSession, error) {
	body, err := s.client.do(ctx, http.MethodPost, "/v1/checkout_sessions", requestOptions{
		body:           params,
		idempotencyKey: idempotencyKey,
	})
	if err != nil {
		return nil, err
	}
	return decodeCheckoutSession(body)
}

// Retrieve fetches a checkout session.
func (s *CheckoutSessionService) Retrieve(ctx context.Context, id string) (*CheckoutSession, error) {
	body, err := s.client.do(ctx, http.MethodGet, "/v1/checkout_sessions/"+url.PathEscape(id), requestOptions{})
	if err != nil {
		return nil, err
	}
	return decodeCheckoutSession(body)
}

// List returns a page of checkout sessions.
func (s *CheckoutSessionService) List(ctx context.Context, params ListParams) (*CheckoutSessionList, error) {
	body, err := s.client.do(ctx, http.MethodGet, "/v1/checkout_sessions", requestOptions{query: listQuery(params)})
	if err != nil {
		return nil, err
	}
	var list CheckoutSessionList
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, err
	}
	return &list, nil
}

// Expire expires an open checkout session.
func (s *CheckoutSessionService) Expire(ctx context.Context, id string) (*CheckoutSession, error) {
	body, err := s.client.do(ctx, http.MethodPost, "/v1/checkout_sessions/"+url.PathEscape(id)+"/expire", requestOptions{})
	if err != nil {
		return nil, err
	}
	return decodeCheckoutSession(body)
}

func decodePaymentIntent(body []byte) (*PaymentIntent, error) {
	var intent PaymentIntent
	if err := json.Unmarshal(body, &intent); err != nil {
		return nil, err
	}
	return &intent, nil
}

func decodeCheckoutSession(body []byte) (*CheckoutSession, error) {
	var session CheckoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
