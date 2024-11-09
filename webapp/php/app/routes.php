<?php

declare(strict_types=1);

use IsuRide\Handlers\PostInitialize;
use IsuRide\PaymentGateway\PostPayment;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Slim\App;

return function (App $app, array $config) {
    /** @var LoggerInterface $logger */
    $logger = $config['logger'];
    /** @var PostPayment $paymentGateway */
    $paymentGateway = $config['payment_gateway']();

    $app->options('/{routes:.*}', function (Request $request, Response $response) {
        // CORS Pre-Flight OPTIONS Request Handler
        return $response;
    });
    $app->post(
        '/api/initialize',
        new PostInitialize(
            $config['resource_path'],
            $app->getResponseFactory()
        )
    );
};
