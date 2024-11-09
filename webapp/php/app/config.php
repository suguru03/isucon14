<?php

declare(strict_types=1);

use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;

return [
    'database' => [
        'host' => getenv('ISUCON_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('ISUCON_DB_PORT') ?: '3306',
        'username' => getenv('ISUCON_DB_USER') ?: 'isucon',
        'password' => getenv('ISUCON_DB_PASSWORD') ?: 'isucon',
        'database' => getenv('ISUCON_DB_NAME') ?: 'isuride',
    ],
    'logger' => function (): Logger {
        $logger = new Logger('isuride');
        $logger->useLoggingLoopDetection(false);
        $logger->pushHandler(
            new StreamHandler('php://stdout', Level::Info)
        );
        return $logger;
    },
];
