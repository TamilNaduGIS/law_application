<?php

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Services\RateLimitService;

class RateLimitMiddleware extends Middleware
{
    private int $limit;
    private int $window;

    public function __construct(int $limit = 60, int $window = 60)
    {
        $this->limit = $limit;
        $this->window = $window;
    }

    public function handle(Request $request): ?Response
    {
        $ip = $request->getIP();
        $key = md5($ip . $request->getPath()); // Rate limit per IP and endpoint

        $result = RateLimitService::check($key, $this->limit, $this->window);

        if (!$result['allowed']) {
            $response = Response::error('Too Many Requests', 429);
            $response->addHeader('Retry-After', (string)($result['reset'] - time()));
            $this->addRateLimitHeaders($response, $result);
            return $response;
        }

        $response = $this->next($request);

        if ($response instanceof Response) {
            $this->addRateLimitHeaders($response, $result);
        }

        return $response;
    }

    private function addRateLimitHeaders(Response $response, array $result): void
    {
        $response->addHeader('X-RateLimit-Limit', (string)$result['limit']);
        $response->addHeader('X-RateLimit-Remaining', (string)$result['remaining']);
        $response->addHeader('X-RateLimit-Reset', (string)$result['reset']);
    }
}
