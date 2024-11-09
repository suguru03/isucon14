<?php

declare(strict_types=1);

namespace IsuRide\App\Middlewares;

use Exception;
use IsuRide\App\Response\ErrorResponse;
use IsuRide\App\Database\Model\User;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

readonly class AppAuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private PDO $db,
        private ResponseFactoryInterface $responseFactory
    ) {
    }

    /**
     * @inheritdoc
     */
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $cookies = $request->getCookieParams();
        $accessToken = $cookies['app_session'] ?? '';
        if ($accessToken === '') {
            return (new ErrorResponse())->write(
                $this->responseFactory->createResponse(),
                401,
                new Exception('app_session cookie is required')
            );
        }
        try {
            $stmt = $this->db->prepare('SELECT * FROM users WHERE access_token = ?');
            $stmt->execute([$accessToken]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$userData) {
                return (new ErrorResponse())->write(
                    $this->responseFactory->createResponse(),
                    401,
                    new Exception('invalid access token')
                );
            }
            $user = new User(
                $userData['id'],
                $userData['username'],
                $userData['firstname'],
                $userData['lastname'],
                $userData['date_of_birth'],
                $userData['access_token'],
                $userData['created_at'],
                $userData['updated_at']
            );
            $request = $request->withAttribute('user', $user);
            return $handler->handle($request);
        } catch (PDOException $e) {
            return (new ErrorResponse())->write(
                $this->responseFactory->createResponse(),
                500,
                $e
            );
        }
    }
}
