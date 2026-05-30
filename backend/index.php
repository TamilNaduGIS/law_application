<?php

require __DIR__ . '/vendor/autoload.php';

use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

$app = AppFactory::create();

$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
$basePath = rtrim($scriptDir, '/');
if ($basePath === '' || $basePath === '.') {
    $basePath = '';
}
$app->setBasePath($basePath);

$app->addBodyParsingMiddleware();

$app->add(function (Request $request, $handler) {
    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
        return $response
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            ->withStatus(204);
    }

    $response = $handler->handle($request);

    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
});

$routes = require __DIR__ . '/routes/api.php';
$routes($app);

$app->options('/{routes:.+}', function (Request $request, Response $response): Response {
    return $response->withStatus(204);
});

$app->get('/', function (Request $request, Response $response): Response {
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'service' => 'Law Officers Application API',
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->run();
