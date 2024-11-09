<?php

declare(strict_types=1);

namespace IsuRide\App;

use JsonSerializable;

readonly class PaymentGatewayPostPaymentRequest implements JsonSerializable
{
    public function __construct(
        public int $amount
    ) {
    }

    public function jsonSerialize(): array
    {
        return ['amount' => $this->amount];
    }
}
