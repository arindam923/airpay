<?php

declare(strict_types=1);

namespace AirPay\Service;

use AirPay\AirPay;

final class ConfigService
{
    public function __construct(private AirPay $client)
    {
    }

    /**
     * Retrieve the chains and tokens enabled for the workspace.
     *
     * @return array<string, mixed>
     */
    public function retrieve(): array
    {
        return $this->client->request('GET', '/v1/config');
    }
}
