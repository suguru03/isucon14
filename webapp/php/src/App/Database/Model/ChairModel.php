<?php

declare(strict_types=1);

namespace IsuRide\Application\Database\Model;

readonly class ChairModel
{
    public function __construct(
        public string $name,
        public int $speed,
    ) {
    }
}
