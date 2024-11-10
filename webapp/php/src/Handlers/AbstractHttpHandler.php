<?php

declare(strict_types=1);

namespace IsuRide\Handlers;

use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Database\Model\Ride;
use Psr\Http\Message\ResponseInterface;

abstract class AbstractHttpHandler
{
    private const int INITIAL_FARE = 500;
    private const int FARE_PER_DISTANCE = 100;

    protected function writeJson(
        ResponseInterface $response,
        \JsonSerializable $json,
        int $statusCode = StatusCodeInterface::STATUS_OK
    ): ResponseInterface {
        $response->getBody()->write(json_encode($json));
        return $response->withHeader(
            'Content-Type',
            'application/json;charset=utf-8'
        )
            ->withStatus($statusCode);
    }

    protected function writeNoContent(ResponseInterface $response): ResponseInterface
    {
        return $response->withStatus(StatusCodeInterface::STATUS_NO_CONTENT);
    }

    protected function getLatestRideStatus(\PDO $db, string $rideId): string
    {
        $stmt = $db->prepare('SELECT status FROM ride_statuses WHERE ride_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->bindValue(1, $rideId, \PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$result) {
            return '';
        }
        return $result['status'];
    }

    protected function calculateSale(
        Ride $req
    ): int {
        return $this->calculateFare(
            $req->pickupLatitude,
            $req->pickupLongitude,
            $req->destinationLatitude,
            $req->destinationLongitude
        );
    }

    protected function calculateFare(
        int $pickupLatitude,
        int $pickupLongitude,
        int $destLatitude,
        int $destLongitude
    ): int {
        $latDiff = max($destLatitude - $pickupLatitude, $pickupLatitude - $destLatitude);
        $lonDiff = max($destLongitude - $pickupLongitude, $pickupLongitude - $destLongitude);
        $meteredFare = self::FARE_PER_DISTANCE * ($latDiff + $lonDiff);
        return self::INITIAL_FARE + $meteredFare;
    }
}
