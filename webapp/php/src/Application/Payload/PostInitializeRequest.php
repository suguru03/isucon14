<?php

declare(strict_types=1);

namespace IsuRide\Application\Payload;

use JsonSerializable;

readonly class PostInitializeRequest implements JsonSerializable
{
    public function __construct(
        public string $paymentServer
    ) {
    }

    /**
     * @return array<string, string>
     */
    public function jsonSerialize(): array
    {
        return [
            'payment_server' => $this->paymentServer,
        ];
    }
}
