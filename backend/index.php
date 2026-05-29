<?php

require __DIR__ . '/vendor/autoload.php';

use Slim\Factory\AppFactory;

$app = AppFactory::create();

// Load routes
$routes = require __DIR__ . '/routes/api.php';
$routes($app);

$app->run();