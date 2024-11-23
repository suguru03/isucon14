<?php

declare(strict_types=1);

namespace IsuRide\Handlers\Chair;

use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Database\Model\Chair;
use IsuRide\Handlers\AbstractHttpHandler;
use IsuRide\Model\ChairPostActivityRequest;
use IsuRide\Response\ErrorResponse;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpBadRequestException;

class PostActivity extends AbstractHttpHandler
{
    public function __construct(
        private readonly PDO $db,
    ) {
    }

    public function __invoke(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $req = new ChairPostActivityRequest((array)$request->getParsedBody());
        if (!$req->valid()) {
            return (new ErrorResponse())->write(
                $response,
                StatusCodeInterface::STATUS_BAD_REQUEST,
                new HttpBadRequestException(
                    request: $request
                )
            );
        }
        $chair = $request->getAttribute('chair');
        assert($chair instanceof Chair);

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('UPDATE chairs SET is_active = ? WHERE id = ?');
            $stmt->execute([$req->getIsActive(), $chair->id]);
            $this->db->commit();
            return $this->writeNoContent($response);
        } catch (PDOException $e) {
            return (new ErrorResponse())->write(
                $response,
                StatusCodeInterface::STATUS_INTERNAL_SERVER_ERROR,
                $e
            );
        }
    }
}
