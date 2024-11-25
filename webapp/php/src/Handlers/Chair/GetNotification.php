<?php

declare(strict_types=1);

namespace IsuRide\Handlers\Chair;

use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Database\Model\Chair;
use IsuRide\Handlers\AbstractHttpHandler;
use IsuRide\Model\ChairGetNotification200Response;
use IsuRide\Model\ChairNotificationData;
use IsuRide\Model\Coordinate;
use IsuRide\Model\User;
use IsuRide\Response\ErrorResponse;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class GetNotification extends AbstractHttpHandler
{
    public function __construct(
        private readonly PDO $db,
    ) {
    }

    public function __invoke(
        ServerRequestInterface $request,
        ResponseInterface $response,
    ): ResponseInterface {
        $chair = $request->getAttribute('chair');
        assert($chair instanceof Chair);

        $stmt = $this->db->prepare('SELECT * FROM chairs WHERE id = ? FOR UPDATE');
        $stmt->execute([$chair->id]);

        $found = true;
        $status = '';

        $stmt = $this->db->prepare('SELECT * FROM rides WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1');
        $stmt->execute([$chair->id]);
        $ride = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$ride) {
            $found = false;
        }

        $yetSentRideStatus = null;
        if ($found) {
            $stmt = $this->db->prepare(
                'SELECT * FROM ride_statuses WHERE ride_id = ? AND chair_sent_at IS NULL ORDER BY created_at ASC LIMIT 1'
            );
            $stmt->execute([$ride['id']]);
            $yetSentRideStatus = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$yetSentRideStatus) {
                $status = $this->getLatestRideStatus($this->db, $ride['id']);
            } else {
                $status = $yetSentRideStatus['status'];
            }
        }

        $this->db->beginTransaction();
        try {
            if (!$yetSentRideStatus && (!$found || $status === 'COMPLETED')) {
                // MEMO: 一旦最も待たせているリクエストにマッチさせる実装とする。おそらくもっといい方法があるはず…
                $stmt = $this->db->prepare(
                    'SELECT * FROM rides WHERE chair_id IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE'
                );
                $stmt->execute();
                $matched = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$matched) {
                    $this->db->rollBack();
                    return $this->writeJson($response, new ChairGetNotification200Response());
                }

                $stmt = $this->db->prepare(
                    'UPDATE rides SET chair_id = ? WHERE id = ?'
                );
                $stmt->execute([$chair->id, $matched['id']]);

                if (!$found) {
                    $ride = $matched;
                    $stmt = $this->db->prepare(
                        'SELECT * FROM ride_statuses WHERE ride_id = ? AND chair_sent_at IS NULL ORDER BY created_at ASC LIMIT 1'
                    );
                    $stmt->execute([$ride['id']]);
                    $yetSentRideStatus = $stmt->fetch(PDO::FETCH_ASSOC);
                    $status = $yetSentRideStatus['status'];
                }
            }

            $stmt = $this->db->prepare(
                'SELECT * FROM users WHERE id = ? FOR SHARE'
            );
            $stmt->execute([$ride['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($yetSentRideStatus) {
                $stmt = $this->db->prepare(
                    'UPDATE ride_statuses SET chair_sent_at = CURRENT_TIMESTAMP(6) WHERE id = ?'
                );
                $stmt->execute([$yetSentRideStatus['id']]);
            }


            $this->db->commit();

            return $this->writeJson(
                $response,
                new ChairGetNotification200Response([
                    'data' =>
                        new ChairNotificationData([
                            'ride_id' => $ride['id'],
                            'user' => new User(
                                ['id' => $user['id'], 'name' => sprintf('%s %s', $user['firstname'], $user['lastname'])]
                            ),
                            'pickup_coordinate' => new Coordinate(
                                ['latitude' => $ride['pickup_latitude'], 'longitude' => $ride['pickup_longitude']]
                            ),
                            'destination_coordinate' => new Coordinate(
                                [
                                    'latitude' => $ride['destination_latitude'],
                                    'longitude' => $ride['destination_longitude']
                                ]
                            ),
                            'status' => $status
                        ])
                ])
            );
        } catch (PDOException $e) {
            return (new ErrorResponse())->write(
                $response,
                StatusCodeInterface::STATUS_INTERNAL_SERVER_ERROR,
                $e
            );
        }
    }
}
