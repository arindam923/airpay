# AirPay Go SDK

Official AirPay SDK for Go 1.21+.

## Install

```bash
go get github.com/arindam923/airpay/sdk/go
```

## Quick start

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	airpay "github.com/arindam923/airpay/sdk/go"
)

func main() {
	client := airpay.NewClient(os.Getenv("AIRPAY_SECRET_KEY"))

	session, err := client.CheckoutSessions.Create(context.Background(), &airpay.CheckoutSessionCreateParams{
		Amount:     1250, // cents
		Chain:      "base",
		Token:      airpay.TokenUSDC,
		SuccessURL: "https://shop.example/ok",
	}, "order_123")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(session.URL) // redirect the customer here
}
```

Create a headless intent and attach the on-chain transaction:

```go
intent, err := client.PaymentIntents.Create(ctx, &airpay.PaymentIntentCreateParams{
	Amount: 1250,
	Chain:  "base",
	Token:  airpay.TokenUSDC,
}, "order_123")

confirmed, err := client.PaymentIntents.Confirm(ctx, intent.ID, &airpay.PaymentIntentConfirmParams{
	TxHash:       "0x…",
	ClientSecret: intent.ClientSecret,
})
```

## Webhooks

Verify the raw request body before decoding JSON:

```go
event, err := airpay.ConstructWebhookEvent(
	rawBody,
	r.Header.Get("Airpay-Signature"),
	os.Getenv("AIRPAY_WEBHOOK_SECRET"),
	airpay.DefaultTolerance,
)
if err != nil {
	// invalid signature
}
```

## Resources

- `Account.Retrieve(ctx)`
- `Config.Retrieve(ctx)`
- `PaymentIntents.Create / Retrieve / List / Confirm / Cancel`
- `CheckoutSessions.Create / Retrieve / List / Expire`

All amounts are integers in the smallest currency unit (cents). API failures
are returned as `*airpay.AirPayError`; transport failures as
`*airpay.ConnectionError`.

- Documentation: https://airpay.dev/docs
- API version: `2026-10-19`

## License

MIT
