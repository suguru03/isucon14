<?php

declare(strict_types=1);

namespace IsuRide\App\Database\Model;

readonly class Ride
{
    public function __construct(
        public string $id,
        public string $userId,
        public ?string $chairId,
        public int $pickupLatitude,
        public int $pickupLongitude,
        public int $destinationLatitude,
        public int $destinationLongitude,
        public ?int $evaluation,
        public int $createdAt,
        public int $updatedAt
    ) {
    }
}
