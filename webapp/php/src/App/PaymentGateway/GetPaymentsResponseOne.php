<?php

declare(strict_types=1);

namespace IsuRide\App\PaymentGateway;

readonly class GetPaymentsResponseOne
{
    public function __construct(
        public int $amount,
        public string $status
    ) {
    }
}
