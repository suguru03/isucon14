<?php

declare(strict_types=1);

namespace IsuRide\Handlers\Owner;

use DateTimeImmutable;
use DateTimeZone;
use Exception;
use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Database\Model\Chair;
use IsuRide\Database\Model\Ride;
use IsuRide\Handlers\AbstractHttpHandler;
use IsuRide\Model\OwnerGetSales200Response;
use IsuRide\Model\OwnerGetSales200ResponseChairsInner;
use IsuRide\Model\OwnerGetSales200ResponseModelsInner;
use IsuRide\Response\ErrorResponse;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class GetSales extends AbstractHttpHandler
{
    public function __construct(
        private readonly PDO $db,
    ) {
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array<string, string> $args
     * @return ResponseInterface
     * @throws \DateMalformedStringException
     */
    public function __invoke(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $queryParams = $request->getQueryParams();
        $since = new DateTimeImmutable('@0');
        $until = new DateTimeImmutable('9999-12-31 23:59:59', new DateTimeZone('UTC'));

        if (!empty($queryParams['since'])) {
            $sinceParam = $queryParams['since'];
            if (!ctype_digit($sinceParam)) {
                return (new ErrorResponse())->write(
                    $response,
                    StatusCodeInterface::STATUS_BAD_REQUEST,
                    new Exception('Invalid since parameter')
                );
            }
            $parsed = (int)$sinceParam;
            $sinceSeconds = $parsed / 1000;
            $since = DateTimeImmutable::createFromFormat('U.u', sprintf('%.3f', $sinceSeconds));
            if ($since === false) {
                return (new ErrorResponse())->write(
                    $response,
                    StatusCodeInterface::STATUS_BAD_REQUEST,
                    new Exception('Invalid since parameter')
                );
            }
        }
        if (!empty($queryParams['until'])) {
            $untilParam = $queryParams['until'];
            if (!ctype_digit($untilParam)) {
                return (new ErrorResponse())->write(
                    $response,
                    StatusCodeInterface::STATUS_BAD_REQUEST,
                    new Exception('Invalid until parameter')
                );
            }
            $parsed = (int)$untilParam;
            $untilSeconds = $parsed / 1000;
            $until = DateTimeImmutable::createFromFormat('U.u', sprintf('%.3f', $untilSeconds));
            if ($until === false) {
                return (new ErrorResponse())->write(
                    $response,
                    StatusCodeInterface::STATUS_BAD_REQUEST,
                    new Exception('Invalid until parameter')
                );
            }
        }

        $owner = $request->getAttribute('owner');
        $chairs = [];
        $chairSales = [];
        try {
            $this->db->beginTransaction();
            $stmt = $this->db->prepare('SELECT * FROM chairs WHERE owner_id = ?');
            $stmt->bindValue(1, $owner->id, PDO::PARAM_STR);
            $stmt->execute();
            $chairResult = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($chairResult as $chair) {
                $chairs[] = new Chair(
                    id: $chair['id'],
                    ownerId: $chair['owner_id'],
                    name: $chair['name'],
                    accessToken: $chair['access_token'],
                    model: $chair['model'],
                    isActive: (bool)$chair['is_active'],
                    createdAt: $chair['created_at'],
                    updatedAt: $chair['updated_at']
                );
            }
            $res = new OwnerGetSales200Response();
            $res->setTotalSales(0);
            $modelSalesByModel = [];

            foreach ($chairs as $chair) {
                $stmt = $this->db->prepare(
                    '
                SELECT rides.* 
                    FROM rides 
                    JOIN ride_statuses ON rides.id = ride_statuses.ride_id 
                WHERE chair_id = ? AND status = \'COMPLETED\' AND updated_at BETWEEN ? AND ?'
                );
                $stmt->bindValue(1, $chair->id, PDO::PARAM_STR);
                $stmt->bindValue(2, $since->format('Y-m-d H:i:s'), PDO::PARAM_STR);
                $stmt->bindValue(3, $until->format('Y-m-d H:i:s'), PDO::PARAM_STR);
                $stmt->execute();
                $rides = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $sumChairSales = $this->sumSales($rides);
                $res->setTotalSales($res->getTotalSales() + $sumChairSales);
                $chairSales[] = (new OwnerGetSales200ResponseChairsInner())
                    ->setId($chair->id)
                    ->setName($chair->name)
                    ->setSales($sumChairSales);
                if (!isset($modelSalesByModel[$chair->model])) {
                    $modelSalesByModel[$chair->model] = 0;
                }
                $modelSalesByModel[$chair->model] += $sumChairSales;
            }
            $modelSales = [];
            foreach ($modelSalesByModel as $model => $sales) {
                $modelSales[] = (new OwnerGetSales200ResponseModelsInner())
                    ->setModel($model)
                    ->setSales($sales);
            }
            $res->setChairs($chairSales);
            $res->setModels($modelSales);
            $this->db->commit();
            return $this->writeJson($response, $res);
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return (new ErrorResponse())->write(
                $response,
                StatusCodeInterface::STATUS_INTERNAL_SERVER_ERROR,
                $e
            );
        }
    }

    /**
     * @param Ride[] $rides
     * @return int
     */
    private function sumSales(array $rides): int
    {
        $sale = 0;
        foreach ($rides as $ride) {
            $sale += $this->calculateSale($ride);
        }
        return $sale;
    }
}
