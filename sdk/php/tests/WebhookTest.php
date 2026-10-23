<?php

declare(strict_types=1);

namespace AirPay\Tests;

use AirPay\Webhook;
use AirPay\WebhookSignatureException;
use PHPUnit\Framework\TestCase;

final class WebhookTest extends TestCase
{
    private const SECRET = 'whsec_test_123';
    private const PAYLOAD = '{"id":"evt_1","type":"payment.confirmed","data":{"id":"pi_1"}}';
    private const TIMESTAMP = 1_700_000_000;

    private function signedHeader(int $timestamp = self::TIMESTAMP, ?string $secret = null, ?string $payload = null): string
    {
        $signature = Webhook::computeSignature(
            $secret ?? self::SECRET,
            $timestamp,
            $payload ?? self::PAYLOAD,
        );

        return "t={$timestamp},v1={$signature}";
    }

    public function testComputeSignatureUsesTimestampAndPayload(): void
    {
        $expected = hash_hmac('sha256', self::TIMESTAMP . '.' . self::PAYLOAD, self::SECRET);

        self::assertSame($expected, Webhook::computeSignature(self::SECRET, self::TIMESTAMP, self::PAYLOAD));
    }

    public function testVerifyAcceptsValidSignature(): void
    {
        self::assertTrue(Webhook::verify(
            self::PAYLOAD,
            $this->signedHeader(),
            self::SECRET,
            300,
            self::TIMESTAMP,
        ));
    }

    public function testVerifyAcceptsAnyMatchingSignature(): void
    {
        $header = 't=' . self::TIMESTAMP . ',v1=deadbeef,' . $this->signedHeader();

        self::assertTrue(Webhook::verify(self::PAYLOAD, $header, self::SECRET, 300, self::TIMESTAMP));
    }

    public function testVerifyRejectsWrongSecret(): void
    {
        self::assertFalse(Webhook::verify(
            self::PAYLOAD,
            $this->signedHeader(),
            'wrong_secret',
            300,
            self::TIMESTAMP,
        ));
    }

    public function testVerifyRejectsTamperedPayload(): void
    {
        self::assertFalse(Webhook::verify(
            '{"id":"evt_1","type":"payment.failed"}',
            $this->signedHeader(),
            self::SECRET,
            300,
            self::TIMESTAMP,
        ));
    }

    public function testVerifyRejectsStaleTimestamp(): void
    {
        self::assertFalse(Webhook::verify(
            self::PAYLOAD,
            $this->signedHeader(),
            self::SECRET,
            300,
            self::TIMESTAMP + 301,
        ));
    }

    public function testToleranceZeroDisablesFreshnessCheck(): void
    {
        self::assertTrue(Webhook::verify(
            self::PAYLOAD,
            $this->signedHeader(),
            self::SECRET,
            0,
            self::TIMESTAMP + 10_000,
        ));
    }

    public function testVerifyRejectsEmptyHeader(): void
    {
        self::assertFalse(Webhook::verify(self::PAYLOAD, '', self::SECRET));
    }

    public function testParseSignatureHeaderRejectsMissingTimestamp(): void
    {
        $this->expectException(WebhookSignatureException::class);
        $this->expectExceptionMessage('Missing `t`');

        Webhook::parseSignatureHeader('v1=abc');
    }

    public function testParseSignatureHeaderRejectsMissingSignature(): void
    {
        $this->expectException(WebhookSignatureException::class);
        $this->expectExceptionMessage('Missing `v1`');

        Webhook::parseSignatureHeader('t=1700000000');
    }

    public function testParseSignatureHeaderRejectsInvalidTimestamp(): void
    {
        $this->expectException(WebhookSignatureException::class);

        Webhook::parseSignatureHeader('t=not-a-number,v1=abc');
    }

    public function testConstructEventReturnsDecodedPayload(): void
    {
        $event = Webhook::constructEvent(
            self::PAYLOAD,
            $this->signedHeader(),
            self::SECRET,
            300,
            self::TIMESTAMP,
        );

        self::assertSame('evt_1', $event['id']);
        self::assertSame('payment.confirmed', $event['type']);
    }

    public function testConstructEventRejectsInvalidSignature(): void
    {
        $this->expectException(WebhookSignatureException::class);

        Webhook::constructEvent(
            self::PAYLOAD,
            $this->signedHeader(secret: 'wrong_secret'),
            self::SECRET,
            300,
            self::TIMESTAMP,
        );
    }

    public function testConstructEventRejectsInvalidJson(): void
    {
        $payload = 'not-json';
        $header = $this->signedHeader(payload: $payload);

        $this->expectException(WebhookSignatureException::class);
        $this->expectExceptionMessage('not valid JSON');

        Webhook::constructEvent($payload, $header, self::SECRET, 300, self::TIMESTAMP);
    }

    public function testConstructEventRejectsPayloadWithoutType(): void
    {
        $payload = '{"id":"evt_1"}';
        $header = $this->signedHeader(payload: $payload);

        $this->expectException(WebhookSignatureException::class);
        $this->expectExceptionMessage('`type`');

        Webhook::constructEvent($payload, $header, self::SECRET, 300, self::TIMESTAMP);
    }
}
