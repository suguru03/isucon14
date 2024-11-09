<?php

declare(strict_types=1);

namespace IsuRide\Handlers\App;

use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Model\AppPostUsersRequest;
use IsuRide\Response\ErrorResponse;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpBadRequestException;

readonly class PostUsers
{
    public function __construct(
        private ResponseFactoryInterface $responseFactory
    ) {
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array<string, string> $args
     * @return ResponseInterface
     */
    public function __invoke(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $req = new AppPostUsersRequest((array)$request->getParsedBody());
        if (!$req->valid()) {
            return (new ErrorResponse())->write(
                $this->responseFactory->createResponse(),
                StatusCodeInterface::STATUS_BAD_REQUEST,
                new HttpBadRequestException(
                    request: $request,
                    message: 'required fields(username, firstname, lastname, date_of_birth) are empty'
                )
            );
        }
        return $response;
    }
}
