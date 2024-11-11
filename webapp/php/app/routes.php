<?php

declare(strict_types=1);

use IsuRide\Handlers;
use IsuRide\Middlewares;
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
    /** @var PDO $database */
    $database = $config['database']();

    $app->options('/{routes:.*}', function (Request $request, Response $response) {
        // CORS Pre-Flight OPTIONS Request Handler
        return $response;
    });
    $app->post(
        '/api/initialize',
        new Handlers\PostInitialize(
            $config['resource_path'],
        )
    );
    $app->post('/api/app/users', new Handlers\App\PostUsers($database));
    // app handlers
    $app->group('/api/app', function ($app) use ($database) {
        $app->post('/payment-methods', new Handlers\App\PostPaymentMethods($database));
        $app->get('/rides', new Handlers\App\GetRides($database));
    })->addMiddleware(
        new Middlewares\AppAuthMiddleware($database, $app->getResponseFactory())
    );
    // owner handlers
    $app->post('/api/owner/owners', new Handlers\Owner\PostOwners($database));
    $app->group('/api/owner', function ($app) use ($database) {
        $app->get('/chairs', new Handlers\Owner\GetChairs($database));
    })->addMiddleware(
        new Middlewares\OwnerAuthMiddleware($database, $app->getResponseFactory())
    );
};
