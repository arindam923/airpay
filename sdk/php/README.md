# AirPay PHP SDK

Official AirPay SDK for PHP 8.1+.

## Install

```bash
composer require airpay/airpay
```

## Quick start

```php
<?php

require __DIR__ . '/vendor/autoload.php';

$client = new AirPay\AirPay(getenv('AIRPAY_SECRET_KEY'));

$session = $client->checkoutSessions->create([
    'amount' => 1250, // cents
    'chain' => 'base',
    'token' => 'USDC',
    'success_url' => 'https://shop.example/ok',
]);

header('Location: ' . $session['url']);
```

Create a headless intent and attach the on-chain transaction:

```php
$intent = $client->paymentIntents->create([
    'amount' => 1250,
    'chain' => 'base',
    'token' => 'USDC',
], 'order_123');

$client->paymentIntents->confirm(
    $intent['id'],
    '0x…',
    null,
    $intent['client_secret'],
);
```

## Webhooks

Verify the raw request body before decoding JSON:

```php
use AirPay\Webhook;

$event = Webhook::constructEvent(
    file_get_contents('php://input'),
    $_SERVER['HTTP_AIRPAY_SIGNATURE'] ?? '',
    getenv('AIRPAY_WEBHOOK_SECRET'),
);
```

Or call `Webhook::verify(...)` to receive a boolean.

## Resources

- `$client->account->retrieve()`
- `$client->config->retrieve()`
- `$client->paymentIntents->create() / retrieve() / all() / confirm() / cancel()`
- `$client->checkoutSessions->create() / retrieve() / all() / expire()`

All amounts are integers in the smallest currency unit (cents). API failures
throw `AirPay\AirPayError` with `getType()`, `getErrorCode()`, `getParam()`,
`getStatusCode()`, and `getRequestId()`.

## Configuration

```php
$client = new AirPay\AirPay('ap_test_…', [
    'baseUrl' => 'https://api.airpay.dev',
    'timeout' => 30,
    'maxNetworkRetries' => 2,
]);
```

For tests or custom HTTP stacks, pass a `transport` callable:

```php
$client = new AirPay\AirPay('ap_test_…', [
    'transport' => function (string $method, string $url, array $headers, ?string $body): array {
        return ['status' => 200, 'body' => '{"id":"cs_1"}'];
    },
]);
```

The callable receives `(method, url, headers, body)` and returns an array with
optional `status`, `body`, `requestId`, `errno`, and `error` keys.

## Development

```bash
composer update
composer test
```

- Documentation: https://airpay.dev/docs
- API version: `2026-10-19`

## License

MIT
