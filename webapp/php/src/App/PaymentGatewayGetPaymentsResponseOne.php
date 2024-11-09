<?php

declare(strict_types=1);

namespace IsuRide\App;

readonly class PaymentGatewayGetPaymentsResponseOne
{
    public function __construct(
        public int $amount,
        public string $status
    ) {
    }
}
