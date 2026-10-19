<?php

declare(strict_types=1);

namespace AirPay\Service;

use AirPay\AirPay;

final class PaymentIntentService
{
    public function __construct(private AirPay $client)
    {
    }

    /**
     * Create a payment intent.
     *
     * @param array<string, mixed> $params amount (cents), chain, token, title, merchant, description, metadata, receiver
     * @return array<string, mixed>
     */
    public function create(array $params, ?string $idempotencyKey = null): array
    {
        $allowed = ['amount', 'chain', 'currency', 'token', 'title', 'merchant', 'description', 'metadata', 'receiver'];
        return $this->client->request('POST', '/v1/payment_intents', [
            'body' => array_intersect_key($params, array_flip($allowed)),
            'idempotencyKey' => $idempotencyKey,
        ]);
    }

    /**
     * Retrieve a payment intent.
     *
     * @return array<string, mixed>
     */
    public function retrieve(string $intentId, ?string $clientSecret = null): array
    {
        return $this->client->request('GET', '/v1/payment_intents/' . rawurlencode($intentId), [
            'clientSecret' => $clientSecret,
        ]);
    }

    /**
     * List payment intents.
     *
     * @return array<string, mixed>
     */
    public function all(?int $limit = null, ?string $startingAfter = null): array
    {
        return $this->client->request('GET', '/v1/payment_intents', [
            'query' => ['limit' => $limit, 'starting_after' => $startingAfter],
        ]);
    }

    /**
     * Attach the on-chain transaction that pays the intent.
     *
     * @return array<string, mixed>
     */
    public function confirm(string $intentId, string $txHash, ?string $payer = null, ?string $clientSecret = null): array
    {
        return $this->client->request('POST', '/v1/payment_intents/' . rawurlencode($intentId) . '/confirm', [
            'body' => ['tx_hash' => $txHash, 'payer' => $payer, 'client_secret' => $clientSecret],
            'clientSecret' => $clientSecret,
        ]);
    }

    /**
     * Cancel an intent that has not reached a terminal state.
     *
     * @return array<string, mixed>
     */
    public function cancel(string $intentId): array
    {
        return $this->client->request('POST', '/v1/payment_intents/' . rawurlencode($intentId) . '/cancel');
    }
}
