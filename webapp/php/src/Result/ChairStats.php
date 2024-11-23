<?php

declare(strict_types=1);

namespace IsuRide\Result;

use IsuRide\Model\AppGetNotification200ResponseChairStats;
use Throwable;

readonly class ChairStats
{
    /**
     * @param AppGetNotification200ResponseChairStats $stats
     * @param Throwable|null $error
     */
    public function __construct(
        public AppGetNotification200ResponseChairStats $stats,
        public ?Throwable $error = null
    ) {
    }

    public function isError(): bool
    {
        return $this->error !== null;
    }
}
