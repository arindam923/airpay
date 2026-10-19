<?php

declare(strict_types=1);

namespace AirPay\Service;

use AirPay\AirPay;

final class CheckoutSessionService
{
    public function __construct(private AirPay $client)
    {
    }

    /**
     * Create a hosted checkout session; redirect the customer to `url`.
     *
     * @param array<string, mixed> $params amount (cents), chain, token, success_url, cancel_url, client_reference_id, metadata, title, merchant
     * @return array<string, mixed>
     */
    public function create(array $params, ?string $idempotencyKey = null): array
    {
        $allowed = [
            'amount',
            'chain',
            'currency',
            'token',
            'success_url',
            'cancel_url',
            'client_reference_id',
            'metadata',
            'title',
            'merchant',
        ];
        return $this->client->request('POST', '/v1/checkout/sessions', [
            'body' => array_intersect_key($params, array_flip($allowed)),
            'idempotencyKey' => $idempotencyKey,
        ]);
    }

    /**
     * Retrieve a checkout session.
     *
     * @return array<string, mixed>
     */
    public function retrieve(string $sessionId): array
    {
        return $this->client->request('GET', '/v1/checkout/sessions/' . rawurlencode($sessionId));
    }

    /**
     * List checkout sessions.
     *
     * @return array<string, mixed>
     */
    public function all(?int $limit = null, ?string $startingAfter = null): array
    {
        return $this->client->request('GET', '/v1/checkout/sessions', [
            'query' => ['limit' => $limit, 'starting_after' => $startingAfter],
        ]);
    }

    /**
     * Expire an open checkout session.
     *
     * @return array<string, mixed>
     */
    public function expire(string $sessionId): array
    {
        return $this->client->request('POST', '/v1/checkout/sessions/' . rawurlencode($sessionId) . '/expire');
    }
}
