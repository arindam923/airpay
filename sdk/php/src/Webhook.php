<?php

declare(strict_types=1);

namespace AirPay;

/**
 * Thrown when a webhook signature cannot be verified.
 */
final class WebhookSignatureException extends \Exception
{
}

/**
 * Verify `Airpay-Signature` headers and parse webhook payloads.
 *
 * AirPay signs each delivery with `t=<unix seconds>,v1=<hex HMAC-SHA256>` over
 * the string `"<t>.<raw request body>"`. Verify the raw body before decoding.
 */
final class Webhook
{
    public const DEFAULT_TOLERANCE = 300;

    public static function computeSignature(string $secret, int $timestamp, string $payload): string
    {
        return hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    }

    /**
     * @return array{0:int,1:list<string>} [timestamp, signatures]
     */
    public static function parseSignatureHeader(string $header): array
    {
        $timestamp = null;
        $signatures = [];

        foreach (explode(',', $header) as $part) {
            $pieces = explode('=', $part, 2);
            if (count($pieces) !== 2) {
                continue;
            }
            $key = trim($pieces[0]);
            $value = trim($pieces[1]);
            if ($key === '' || $value === '') {
                continue;
            }
            if ($key === 't') {
                if (!ctype_digit($value)) {
                    throw new WebhookSignatureException('Invalid `t` value in signature header.');
                }
                $timestamp = (int) $value;
            } elseif ($key === 'v1') {
                $signatures[] = $value;
            }
        }

        if ($timestamp === null) {
            throw new WebhookSignatureException('Missing `t` in signature header.');
        }
        if ($signatures === []) {
            throw new WebhookSignatureException('Missing `v1` in signature header.');
        }

        return [$timestamp, $signatures];
    }

    public static function verify(
        string $payload,
        string $signatureHeader,
        string $secret,
        int $tolerance = self::DEFAULT_TOLERANCE,
        ?int $now = null,
    ): bool {
        if ($signatureHeader === '') {
            return false;
        }

        try {
            [$timestamp, $signatures] = self::parseSignatureHeader($signatureHeader);
        } catch (WebhookSignatureException) {
            return false;
        }

        $current = $now ?? time();
        if ($tolerance > 0 && abs($current - $timestamp) > $tolerance) {
            return false;
        }

        $expected = self::computeSignature($secret, $timestamp, $payload);
        foreach ($signatures as $signature) {
            if (hash_equals($expected, $signature)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verify the signature and return the decoded event.
     *
     * @return array<string, mixed>
     */
    public static function constructEvent(
        string $payload,
        string $signatureHeader,
        string $secret,
        int $tolerance = self::DEFAULT_TOLERANCE,
        ?int $now = null,
    ): array {
        if (!self::verify($payload, $signatureHeader, $secret, $tolerance, $now)) {
            throw new WebhookSignatureException('Webhook signature verification failed.');
        }

        $event = json_decode($payload, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookSignatureException('Webhook payload is not valid JSON.');
        }
        if (!is_array($event) || !isset($event['type']) || !is_string($event['type'])) {
            throw new WebhookSignatureException('Webhook payload is missing a `type`.');
        }
        return $event;
    }
}
