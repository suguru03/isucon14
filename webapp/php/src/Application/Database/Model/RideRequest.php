<?php

declare(strict_types=1);

namespace IsuRide\Application\Database\Model;

readonly class RideRequest
{
    public function __construct(
        public string $id,
        public string $userId,
        public string $driverId,
        public ?string $chairId,
        public string $status,
        public int $pickupLatitude,
        public int $pickupLongitude,
        public int $destinationLatitude,
        public int $destinationLongitude,
        public ?int $evaluation,
        public int $requestedAt,
        public ?int $matchedAt,
        public ?int $dispatchedAt,
        public ?int $rodeAt,
        public ?int $arrivedAt,
        public int $updatedAt
    ) {
    }
}
