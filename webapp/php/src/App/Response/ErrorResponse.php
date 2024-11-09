<?php

declare(strict_types=1);

namespace IsuRide\App\Response;

use Psr\Http\Message\ResponseInterface;

class ErrorResponse
{
    public function write(
        ResponseInterface $response,
        int $statusCode,
        \Throwable $error
    ): ResponseInterface {
        $response = $response->withHeader(
            'Content-Type',
            'application/json;charset=utf-8'
        )
            ->withStatus($statusCode);
        $data = ['message' => $error->getMessage()];
        $json = json_encode($data);
        if ($json === false) {
            $response = $response->withStatus(500);
            $json = json_encode(['error' => 'marshaling error failed']);
        }
        $response->getBody()->write($json);
        error_log($error->getMessage());
        return $response;
    }
}
