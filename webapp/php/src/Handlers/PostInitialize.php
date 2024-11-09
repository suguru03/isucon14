<?php

declare(strict_types=1);

namespace IsuRide\Handlers;

use Fig\Http\Message\StatusCodeInterface;
use IsuRide\Model\PostInitialize200Response;
use IsuRide\Model\PostInitializeRequest;
use IsuRide\Response\ErrorResponse;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use Slim\Exception\HttpInternalServerErrorException;

readonly class PostInitialize
{
    public function __construct(
        private string $resourcePath,
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
        $req = new PostInitializeRequest((array)$request->getParsedBody());
        if (!$req->valid()) {
            return (new ErrorResponse())->write(
                $this->responseFactory->createResponse(),
                StatusCodeInterface::STATUS_BAD_REQUEST,
                new RuntimeException('invalid request')
            );
        }
        try {
            $this->execCommand([
                realpath(__DIR__ . '/../../../sql/init.sh')
            ]);
        } catch (RuntimeException $e) {
            return (new ErrorResponse())->write(
                $this->responseFactory->createResponse(),
                StatusCodeInterface::STATUS_INTERNAL_SERVER_ERROR,
                new HttpInternalServerErrorException(
                    request: $request,
                    message: sprintf('Failed to initialize: %s', $e->getMessage()),
                    previous: $e
                )
            );
        }
        $response = $this->responseFactory->createResponse();
        $response->withHeader(
            'Content-Type',
            'application/json;charset=utf-8'
        )
            ->withStatus(StatusCodeInterface::STATUS_OK);
        $response->getBody()->write(
            json_encode(
                new PostInitialize200Response([
                    'language' => 'php',
                ]),
            ),
        );
        file_put_contents($this->resourcePath, (string) $req);
        return $response;
    }

    private function execCommand(array $command): void
    {
        $fp = fopen('php://temp', 'w+');
        try {
            $process = proc_open($command, [
                1 => $fp,
                2 => $fp,
            ], $_);
            if ($process === false) {
                throw new RuntimeException('cannot open process');
            }
            if (proc_close($process) !== 0) {
                rewind($fp);
                throw new RuntimeException(stream_get_contents($fp) ?: '');
            }
        } catch (\Throwable $e) {
            throw new RuntimeException($e->getMessage());
        } finally {
            fclose($fp);
        }
    }
}
