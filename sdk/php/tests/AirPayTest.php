<?php

declare(strict_types=1);

namespace AirPay\Tests;

use AirPay\AirPay;
use AirPay\AirPayError;
use PHPUnit\Framework\TestCase;

final class AirPayTest extends TestCase
{
    /**
     * @param list<array<string, mixed>|\Throwable> $responses
     * @param list<array<string, mixed>> $requests
     * @param array<string, mixed> $options
     */
    private function client(array &$requests, array $responses, array $options = []): AirPay
    {
        $transport = function (string $method, string $url, array $headers, ?string $body) use (&$requests, &$responses): array {
            $requests[] = compact('method', 'url', 'headers', 'body');

            $response = array_shift($responses);
            if ($response instanceof \Throwable) {
                throw $response;
            }

            return $response ?? ['status' => 200, 'body' => '{}'];
        };

        return new AirPay('ap_test_123', array_merge([
            'transport' => $transport,
            'maxNetworkRetries' => 0,
        ], $options));
    }

    public function testAccountRetrieveSendsHeaders(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 200, 'body' => '{"object":"account","id":"acct_1"}', 'requestId' => 'req_1'],
        ]);

        $account = $client->account->retrieve();

        self::assertSame('acct_1', $account['id']);
        self::assertCount(1, $requests);
        self::assertSame('GET', $requests[0]['method']);
        self::assertSame('https://api.airpay.dev/v1/account', $requests[0]['url']);
        self::assertContains('Authorization: Bearer ap_test_123', $requests[0]['headers']);
        self::assertContains('Airpay-Version: 2026-10-19', $requests[0]['headers']);
        self::assertContains('Accept: application/json', $requests[0]['headers']);
        self::assertNull($requests[0]['body']);
    }

    public function testCreateCheckoutPrunesNullsAndSendsIdempotencyKey(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 200, 'body' => '{"id":"cs_1","url":"https://pay.example/cs_1"}'],
        ]);

        $session = $client->checkoutSessions->create([
            'amount' => 1250,
            'chain' => 'base',
            'token' => null,
            'success_url' => 'https://shop.example/ok',
            'unknown' => 'ignored',
        ], 'order_123');

        self::assertSame('cs_1', $session['id']);
        self::assertSame('POST', $requests[0]['method']);
        self::assertSame('https://api.airpay.dev/v1/checkout_sessions', $requests[0]['url']);
        self::assertSame(
            '{"amount":1250,"chain":"base","success_url":"https:\/\/shop.example\/ok"}',
            $requests[0]['body'],
        );
        self::assertContains('Idempotency-Key: order_123', $requests[0]['headers']);
        self::assertContains('Content-Type: application/json', $requests[0]['headers']);
    }

    public function testCreatePaymentIntentSendsClientSecretOnRetrieve(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 200, 'body' => '{"id":"pi_1","status":"requires_payment"}'],
        ]);

        $intent = $client->paymentIntents->retrieve('pi_1', 'cs_secret');

        self::assertSame('pi_1', $intent['id']);
        self::assertSame('https://api.airpay.dev/v1/payment_intents/pi_1', $requests[0]['url']);
        self::assertContains('Airpay-Client-Secret: cs_secret', $requests[0]['headers']);
    }

    public function testListEncodesQueryParameters(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 200, 'body' => '{"object":"list","data":[]}'],
        ]);

        $client->paymentIntents->all(25, 'pi_1');

        self::assertSame(
            'https://api.airpay.dev/v1/payment_intents?limit=25&starting_after=pi_1',
            $requests[0]['url'],
        );
        self::assertNotContains('Content-Type: application/json', $requests[0]['headers']);
    }

    public function testConfirmSendsBodyAndClientSecret(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 200, 'body' => '{"id":"pi_1","status":"processing"}'],
        ]);

        $client->paymentIntents->confirm('pi_1', '0xabc', '0xpayer', 'cs_secret');

        self::assertSame(
            '{"tx_hash":"0xabc","payer":"0xpayer","client_secret":"cs_secret"}',
            $requests[0]['body'],
        );
        self::assertContains('Airpay-Client-Secret: cs_secret', $requests[0]['headers']);
    }

    public function testRetriesSafeRequests(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 500, 'body' => '{"error":{"message":"server error"}}'],
            ['status' => 200, 'body' => '{"id":"acct_1"}'],
        ], ['maxNetworkRetries' => 1]);

        $account = $client->account->retrieve();

        self::assertSame('acct_1', $account['id']);
        self::assertCount(2, $requests);
    }

    public function testDoesNotRetryUnsafeRequestsWithoutIdempotencyKey(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            ['status' => 500, 'body' => '{"error":{"message":"server error"}}'],
            ['status' => 200, 'body' => '{"id":"cs_1"}'],
        ], ['maxNetworkRetries' => 2]);

        try {
            $client->checkoutSessions->create(['amount' => 1250, 'chain' => 'base']);
            self::fail('Expected an AirPayError.');
        } catch (AirPayError $error) {
            self::assertSame(500, $error->getStatusCode());
        }

        self::assertCount(1, $requests);
    }

    public function testTransportExceptionsBecomeConnectionErrors(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            new \RuntimeException('connection refused'),
        ]);

        try {
            $client->account->retrieve();
            self::fail('Expected an AirPayError.');
        } catch (AirPayError $error) {
            self::assertSame('connection_error', $error->getErrorCode());
            self::assertSame(0, $error->getStatusCode());
            self::assertStringContainsString('connection refused', $error->getMessage());
        }
    }

    public function testApiErrorsIncludeRequestIdAndFields(): void
    {
        $requests = [];
        $client = $this->client($requests, [
            [
                'status' => 400,
                'requestId' => 'req_400',
                'body' => '{"error":{"type":"invalid_request_error","code":"amount_too_small","message":"Amount is too small.","param":"amount"}}',
            ],
        ]);

        try {
            $client->checkoutSessions->create(['amount' => 1, 'chain' => 'base']);
            self::fail('Expected an AirPayError.');
        } catch (AirPayError $error) {
            self::assertSame('invalid_request_error', $error->getType());
            self::assertSame('amount_too_small', $error->getErrorCode());
            self::assertSame('amount', $error->getParam());
            self::assertSame(400, $error->getStatusCode());
            self::assertSame('req_400', $error->getRequestId());
            self::assertSame('Amount is too small.', $error->getMessage());
        }
    }

    public function testRejectsEmptyApiKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new AirPay('');
    }

    public function testRejectsInvalidTransport(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new AirPay('ap_test_123', ['transport' => 'not callable']);
    }

    public function testPruneRemovesNestedNulls(): void
    {
        self::assertSame(
            ['a' => 1, 'b' => ['c' => 2], 'd' => []],
            AirPay::prune(['a' => 1, 'b' => ['c' => 2, 'x' => null], 'd' => [], 'e' => null]),
        );
    }
}
