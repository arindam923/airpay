<?php

declare(strict_types=1);

namespace AirPay;

/**
 * Every error returned by the AirPay API is raised as an AirPayError.
 */
final class AirPayError extends \Exception
{
    public function __construct(
        private string $type,
        private string $errorCode,
        string $message,
        private ?string $param = null,
        private int $statusCode = 0,
        private ?string $requestId = null,
    ) {
        parent::__construct($message);
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getParam(): ?string
    {
        return $this->param;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getRequestId(): ?string
    {
        return $this->requestId;
    }

    /**
     * @param array<string, mixed>|null $body
     */
    public static function fromResponse(int $statusCode, ?array $body, ?string $requestId): self
    {
        $type = 'api_error';
        $code = 'unknown_error';
        $message = 'An unexpected error occurred.';
        $param = null;

        if (is_array($body) && isset($body['error']) && is_array($body['error'])) {
            $error = $body['error'];
            if (isset($error['type']) && is_string($error['type'])) {
                $type = $error['type'];
            }
            if (isset($error['code']) && is_string($error['code'])) {
                $code = $error['code'];
            }
            if (isset($error['message']) && is_string($error['message'])) {
                $message = $error['message'];
            }
            if (isset($error['param']) && is_string($error['param'])) {
                $param = $error['param'];
            }
        }

        return new self($type, $code, $message, $param, $statusCode, $requestId);
    }
}
