<?php

namespace App\Core;

use App\Services\LoggerService;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, array $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function dispatch(Request $request): void
    {
        $method = $request->getMethod();
        $path = $request->getPath();

        // Log Request via LoggerService
        LoggerService::log("Incoming Request: $method $path", 'INFO', [
            'ip' => $request->getIP(),
            'headers' => getallheaders(),
            'payload' => $request->getData()
        ]);

        try {
            foreach ($this->routes as $route) {
                if ($route['method'] === $method && $route['path'] === $path) {
                    $this->runRoute($route, $request);
                    return;
                }
            }

            LoggerService::log("Route Not Found: $path", 'WARNING');
            Response::error('Not Found: ' . $path, 404)->send();
        } catch (\Throwable $e) {
            LoggerService::logException($e);
            Response::error('Internal Server Error'.$e->getMessage() , 500)->send();
        }
    }

    private function runRoute(array $route, Request $request): void
    {
        $middlewares = $route['middlewares'];
        
        if (empty($middlewares)) {
            $this->callHandler($route['handler'], $request);
            return;
        }

        // Setup middleware chain
        $first = $middlewares[0];
        $current = $first;
        for ($i = 1; $i < count($middlewares); $i++) {
            $current = $current->setNext($middlewares[$i]);
        }

        // Final "handler middleware" to call the controller
        $current->setNext(new class($route['handler'], $this) extends Middleware {
            private array $handler;
            private Router $router;
            public function __construct(array $handler, Router $router) {
                $this->handler = $handler;
                $this->router = $router;
            }
            public function handle(Request $request): ?Response {
                $controllerName = $this->handler[0];
                $methodName = $this->handler[1];
                $controller = new $controllerName($request);
                return $controller->$methodName($request);
            }
        });

        $response = $first->handle($request);
        if ($response instanceof Response) {
            $response->send();
        }
    }

    private function callHandler(array $handler, Request $request): void
    {
        $controllerName = $handler[0];
        $methodName = $handler[1];
        $controller = new $controllerName($request);
        $response = $controller->$methodName($request);
        if ($response instanceof Response) {
            $response->send();
        }
    }
}
