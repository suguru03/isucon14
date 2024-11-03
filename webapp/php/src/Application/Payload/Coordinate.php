<?php

declare(strict_types=1);

namespace IsuRide\Application\Payload;

use JsonSerializable;

readonly class Coordinate implements JsonSerializable
{
    public function __construct(
        public int $latitude,
        public int $longitude
    ) {
    }

    /**
     * @return array<string, int>
     */
    public function jsonSerialize(): array
    {
        return [
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }
}
