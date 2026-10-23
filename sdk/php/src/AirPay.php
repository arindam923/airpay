<?php

declare(strict_types=1);

namespace AirPay;

use AirPay\Service\AccountService;
use AirPay\Service\CheckoutSessionService;
use AirPay\Service\ConfigService;
use AirPay\Service\PaymentIntentService;

/**
 * Official AirPay PHP client.
 *
 *   $client = new AirPay\AirPay('ap_test_…');
 *   $session = $client->checkoutSessions->create([
 *       'amount' => 1250,
 *       'chain' => 'base',
 *       'success_url' => 'https://shop.dev/ok',
 *   ]);
 *   header('Location: ' . $session['url']);
 *
 * Amounts are integers in the smallest currency unit (cents).
 */
final class AirPay
{
    public const DEFAULT_BASE_URL = 'https://api.airpay.dev';
    public const API_VERSION = '2026-10-19';

    private const RETRY_STATUSES = [409, 429, 500, 502, 503, 504];

    public readonly AccountService $account;
    public readonly ConfigService $config;
    public readonly PaymentIntentService $paymentIntents;
    public readonly CheckoutSessionService $checkoutSessions;

    private string $apiKey;
    private string $baseUrl;
    private string $version;
    private int $timeout;
    private int $maxRetries;

    /** @var callable|null */
    private $transport;

    /**
     * @param array{
     *     baseUrl?: string,
     *     version?: string,
     *     timeout?: int,
     *     maxNetworkRetries?: int,
     *     transport?: callable(string, string, list<string>, ?string): array{
     *         status?: int,
     *         body?: string,
     *         requestId?: ?string,
     *         errno?: int,
     *         error?: ?string
     *     }
     * } $options
     */
    public function __construct(string $apiKey, array $options = [])
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException('An API key is required.');
        }

        $transport = $options['transport'] ?? null;
        if ($transport !== null && !is_callable($transport)) {
            throw new \InvalidArgumentException('The `transport` option must be callable.');
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = $options['baseUrl'] ?? self::DEFAULT_BASE_URL;
        $this->version = $options['version'] ?? self::API_VERSION;
        $this->timeout = $options['timeout'] ?? 30;
        $this->maxRetries = max(0, $options['maxNetworkRetries'] ?? 2);
        $this->transport = $transport;

        $this->account = new AccountService($this);
        $this->config = new ConfigService($this);
        $this->paymentIntents = new PaymentIntentService($this);
        $this->checkoutSessions = new CheckoutSessionService($this);
    }

    /**
     * Perform a request and decode the JSON response.
     *
     * @param array{query?: array<string, mixed>, body?: array<string, mixed>|null, idempotencyKey?: string, clientSecret?: string} $options
     * @return array<string, mixed>
     */
    public function request(string $method, string $path, array $options = []): array
    {
        $url = $this->buildUrl($path, $options['query'] ?? []);
        $body = $options['body'] ?? null;
        $idempotencyKey = $options['idempotencyKey'] ?? null;
        $clientSecret = $options['clientSecret'] ?? null;
        $safeToRetry = $method === 'GET' || (is_string($idempotencyKey) && $idempotencyKey !== '');

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Airpay-Version: ' . $this->version,
            'Accept: application/json',
        ];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }
        if (is_string($idempotencyKey) && $idempotencyKey !== '') {
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }
        if (is_string($clientSecret) && $clientSecret !== '') {
            $headers[] = 'Airpay-Client-Secret: ' . $clientSecret;
        }

        $payload = $body === null ? null : json_encode(self::prune($body), JSON_THROW_ON_ERROR);

        $attempt = 0;
        while (true) {
            [$status, $raw, $requestId, $errno, $errorMessage] = $this->send(
                $method,
                $url,
                $headers,
                $payload,
            );

            if ($errno !== 0) {
                if ($safeToRetry && $attempt < $this->maxRetries) {
                    $attempt++;
                    usleep(self::backoffMicros($attempt));
                    continue;
                }
                throw new AirPayError(
                    'api_error',
                    'connection_error',
                    'The request to AirPay failed: ' . ($errorMessage !== '' ? $errorMessage : 'unknown error'),
                    null,
                    0,
                    $requestId,
                );
            }

            $decoded = [];
            if (is_string($raw) && $raw !== '') {
                $parsed = json_decode($raw, true);
                $decoded = is_array($parsed) ? $parsed : [];
            }

            if ($status >= 200 && $status < 300) {
                return $decoded;
            }

            if (in_array($status, self::RETRY_STATUSES, true) && $safeToRetry && $attempt < $this->maxRetries) {
                $attempt++;
                usleep(self::backoffMicros($attempt));
                continue;
            }

            throw AirPayError::fromResponse($status, $decoded, $requestId);
        }
    }

    /**
     * Send one HTTP request using the configured transport.
     *
     * @param list<string> $headers
     * @return array{0:int,1:string,2:?string,3:int,4:string} [status, body, requestId, errno, error]
     */
    private function send(string $method, string $url, array $headers, ?string $payload): array
    {
        if ($this->transport === null) {
            return $this->sendWithCurl($method, $url, $headers, $payload);
        }

        try {
            $response = ($this->transport)($method, $url, $headers, $payload);
        } catch (\Throwable $exception) {
            return [0, '', null, 1, $exception->getMessage()];
        }

        if (!is_array($response)) {
            return [0, '', null, 1, 'The transport must return an array.'];
        }

        return [
            (int) ($response['status'] ?? 0),
            (string) ($response['body'] ?? ''),
            isset($response['requestId']) ? (string) $response['requestId'] : null,
            (int) ($response['errno'] ?? 0),
            isset($response['error']) ? (string) $response['error'] : '',
        ];
    }

    /**
     * Default cURL transport.
     *
     * @param list<string> $headers
     * @return array{0:int,1:string,2:?string,3:int,4:string} [status, body, requestId, errno, error]
     */
    private function sendWithCurl(string $method, string $url, array $headers, ?string $payload): array
    {
        $requestId = null;
        $ch = curl_init($url);
        if ($ch === false) {
            return [0, '', null, CURLE_FAILED_INIT, 'Could not initialise cURL.'];
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HEADERFUNCTION => function ($handle, string $line) use (&$requestId): int {
                if (stripos($line, 'x-request-id:') === 0) {
                    $requestId = trim(substr($line, strlen('x-request-id:')));
                }
                return strlen($line);
            },
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = $errno === 0 ? '' : curl_strerror($errno);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);

        return [
            $status,
            is_string($raw) ? $raw : '',
            $requestId,
            $errno,
            $error,
        ];
    }

    /**
     * @param array<string, mixed> $query
     */
    private function buildUrl(string $path, array $query): string
    {
        $url = rtrim($this->baseUrl, '/') . $path;
        $query = self::prune($query);
        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }
        return $url;
    }

    /**
     * Recursively remove null values so optional fields are omitted.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public static function prune(array $input): array
    {
        $out = [];
        foreach ($input as $key => $value) {
            if ($value === null) {
                continue;
            }
            $out[$key] = is_array($value) ? self::prune($value) : $value;
        }
        return $out;
    }

    private static function backoffMicros(int $attempt): int
    {
        $base = min(2 ** $attempt * 500, 8000);
        return ($base + random_int(0, 250)) * 1000;
    }
}
