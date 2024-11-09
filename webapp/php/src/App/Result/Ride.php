<?php

declare(strict_types=1);

namespace IsuRide\App\Result;

use Throwable;

class Ride
{
    /**
     * @param \IsuRide\App\Database\Model\Ride[] $rides
     * @param Throwable|null $error
     */
    public function __construct(
        public array $rides,
        public ?Throwable $error = null
    ) {
    }
}
