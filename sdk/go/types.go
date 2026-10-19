package airpay

// Environment identifies whether a key targets testnets or mainnets.
type Environment string

const (
	EnvironmentSandbox    Environment = "sandbox"
	EnvironmentProduction Environment = "production"
)

// TokenSymbol is a token an intent can be paid in.
type TokenSymbol string

const (
	TokenUSDC TokenSymbol = "USDC"
	TokenETH  TokenSymbol = "ETH"
)

// APIKeyKind distinguishes secret from publishable keys.
type APIKeyKind string

const (
	KeySecret      APIKeyKind = "secret"
	KeyPublishable APIKeyKind = "publishable"
)

// TokenInfo describes a token supported on a chain.
type TokenInfo struct {
	Symbol   TokenSymbol `json:"symbol"`
	Decimals int         `json:"decimals"`
}

// Chain is a blockchain enabled for the workspace.
type Chain struct {
	Key               string      `json:"key"`
	Name              string      `json:"name"`
	ChainID           int64       `json:"chain_id"`
	NativeSymbol      string      `json:"native_symbol"`
	SettlementAddress string      `json:"settlement_address"`
	Tokens            []TokenInfo `json:"tokens"`
}

// Config lists the chains and tokens enabled for the workspace.
type Config struct {
	Object      string      `json:"object"`
	Environment Environment `json:"environment"`
	Livemode    bool        `json:"livemode"`
	Chains      []Chain     `json:"chains"`
}

// AccountKey describes the API key used for a request.
type AccountKey struct {
	ID    string     `json:"id"`
	Kind  APIKeyKind `json:"kind"`
	Scope string     `json:"scope"`
}

// AccountCapabilities reports which environments the workspace may use.
type AccountCapabilities struct {
	Sandbox    bool `json:"sandbox"`
	Production bool `json:"production"`
}

// Account is the authenticated workspace.
type Account struct {
	Object        string              `json:"object"`
	ID            string              `json:"id"`
	WorkspaceName string              `json:"workspace_name"`
	Environment   Environment         `json:"environment"`
	Livemode      bool                `json:"livemode"`
	Key           AccountKey          `json:"key"`
	Capabilities  AccountCapabilities `json:"capabilities"`
}

// PaymentIntentStatus is the public status vocabulary.
type PaymentIntentStatus string

const (
	StatusRequiresPayment PaymentIntentStatus = "requires_payment"
	StatusProcessing      PaymentIntentStatus = "processing"
	StatusSucceeded       PaymentIntentStatus = "succeeded"
	StatusCanceled        PaymentIntentStatus = "canceled"
	StatusExpired         PaymentIntentStatus = "expired"
)

// PaymentError is the failure detail attached to a failed intent.
type PaymentError struct {
	Message string `json:"message"`
}

// PaymentIntent tracks a single payment from creation to settlement.
type PaymentIntent struct {
	ID                    string              `json:"id"`
	Object                string              `json:"object"`
	Created               int64               `json:"created"`
	Status                PaymentIntentStatus `json:"status"`
	Amount                int64               `json:"amount"`
	Currency              string              `json:"currency"`
	Chain                 string              `json:"chain"`
	Token                 TokenSymbol         `json:"token"`
	ExpectedUnits         string              `json:"expected_units"`
	Receiver              string              `json:"receiver"`
	ClientSecret          string              `json:"client_secret,omitempty"`
	Metadata              map[string]string   `json:"metadata"`
	Payer                 *string             `json:"payer"`
	TxHash                *string             `json:"tx_hash"`
	Confirmations         int                 `json:"confirmations"`
	RequiredConfirmations int                 `json:"required_confirmations"`
	InvoiceID             *string             `json:"invoice_id"`
	ExpiresAt             int64               `json:"expires_at"`
	ConfirmedAt           *int64              `json:"confirmed_at"`
	LastPaymentError      *PaymentError       `json:"last_payment_error"`
	Environment           Environment         `json:"environment"`
	Livemode              bool                `json:"livemode"`
}

// CheckoutSessionStatus is the lifecycle state of a hosted session.
type CheckoutSessionStatus string

const (
	SessionOpen     CheckoutSessionStatus = "open"
	SessionComplete CheckoutSessionStatus = "complete"
	SessionExpired  CheckoutSessionStatus = "expired"
)

// CheckoutSession is a hosted payment page wrapping a payment intent.
type CheckoutSession struct {
	ID                string                `json:"id"`
	Object            string                `json:"object"`
	Status            CheckoutSessionStatus `json:"status"`
	URL               string                `json:"url"`
	PaymentIntent     string                `json:"payment_intent"`
	SuccessURL        *string               `json:"success_url"`
	CancelURL         *string               `json:"cancel_url"`
	ClientReferenceID *string               `json:"client_reference_id"`
	Metadata          map[string]string     `json:"metadata"`
	Created           int64                 `json:"created"`
	ExpiresAt         int64                 `json:"expires_at"`
	CompletedAt       *int64                `json:"completed_at"`
	Environment       Environment           `json:"environment"`
	Livemode          bool                  `json:"livemode"`
}

// List is a cursor-paginated collection.
type List[T any] struct {
	Object  string `json:"object"`
	URL     string `json:"url"`
	HasMore bool   `json:"has_more"`
	Data    []T    `json:"data"`
}

// PaymentIntentList is a page of payment intents.
type PaymentIntentList = List[PaymentIntent]

// CheckoutSessionList is a page of checkout sessions.
type CheckoutSessionList = List[CheckoutSession]

// ListParams paginates a list endpoint.
type ListParams struct {
	// Limit is 1–100; zero lets the server default to 10.
	Limit int
	// StartingAfter is an object ID cursor.
	StartingAfter string
}

// PaymentIntentCreateParams creates a payment intent.
type PaymentIntentCreateParams struct {
	// Amount is in the smallest currency unit (cents).
	Amount      int64             `json:"amount"`
	Chain       string            `json:"chain"`
	Currency    string            `json:"currency,omitempty"`
	Token       TokenSymbol       `json:"token,omitempty"`
	Title       string            `json:"title,omitempty"`
	Merchant    string            `json:"merchant,omitempty"`
	Description string            `json:"description,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	Receiver    string            `json:"receiver,omitempty"`
}

// PaymentIntentRetrieveParams carries the client secret for publishable access.
type PaymentIntentRetrieveParams struct {
	ClientSecret string
}

// PaymentIntentConfirmParams attaches an on-chain transaction to an intent.
type PaymentIntentConfirmParams struct {
	TxHash       string
	Payer        string
	ClientSecret string
}

// CheckoutSessionCreateParams creates a hosted checkout session.
type CheckoutSessionCreateParams struct {
	// Amount is in the smallest currency unit (cents).
	Amount            int64             `json:"amount"`
	Chain             string            `json:"chain"`
	Currency          string            `json:"currency,omitempty"`
	Token             TokenSymbol       `json:"token,omitempty"`
	SuccessURL        string            `json:"success_url,omitempty"`
	CancelURL         string            `json:"cancel_url,omitempty"`
	ClientReferenceID string            `json:"client_reference_id,omitempty"`
	Metadata          map[string]string `json:"metadata,omitempty"`
	Title             string            `json:"title,omitempty"`
	Merchant          string            `json:"merchant,omitempty"`
}
