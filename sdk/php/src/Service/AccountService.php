<?php

declare(strict_types=1);

namespace AirPay\Service;

use AirPay\AirPay;

final class AccountService
{
    public function __construct(private AirPay $client)
    {
    }

    /**
     * Retrieve the authenticated account.
     *
     * @return array<string, mixed>
     */
    public function retrieve(): array
    {
        return $this->client->request('GET', '/v1/account');
    }
}
