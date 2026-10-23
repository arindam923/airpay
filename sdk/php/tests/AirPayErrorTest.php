<?php

declare(strict_types=1);

namespace AirPay\Tests;

use AirPay\AirPayError;
use PHPUnit\Framework\TestCase;

final class AirPayErrorTest extends TestCase
{
    public function testFromResponseExtractsErrorFields(): void
    {
        $error = AirPayError::fromResponse(402, [
            'error' => [
                'type' => 'invalid_request_error',
                'code' => 'amount_too_small',
                'message' => 'Amount is too small.',
                'param' => 'amount',
            ],
        ], 'req_123');

        self::assertSame('invalid_request_error', $error->getType());
        self::assertSame('amount_too_small', $error->getErrorCode());
        self::assertSame('Amount is too small.', $error->getMessage());
        self::assertSame('amount', $error->getParam());
        self::assertSame(402, $error->getStatusCode());
        self::assertSame('req_123', $error->getRequestId());
    }

    public function testFromResponseFallsBackForUnknownBody(): void
    {
        $error = AirPayError::fromResponse(500, null, null);

        self::assertSame('api_error', $error->getType());
        self::assertSame('unknown_error', $error->getErrorCode());
        self::assertSame('An unexpected error occurred.', $error->getMessage());
        self::assertNull($error->getParam());
        self::assertSame(500, $error->getStatusCode());
        self::assertNull($error->getRequestId());
    }

    public function testFromResponseIgnoresNonStringFields(): void
    {
        $error = AirPayError::fromResponse(400, [
            'error' => [
                'type' => 123,
                'code' => [],
                'message' => 'Still valid.',
                'param' => false,
            ],
        ], 'req_1');

        self::assertSame('api_error', $error->getType());
        self::assertSame('unknown_error', $error->getErrorCode());
        self::assertSame('Still valid.', $error->getMessage());
        self::assertNull($error->getParam());
        self::assertSame('req_1', $error->getRequestId());
    }
}
