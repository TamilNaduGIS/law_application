<?php

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Services\SessionService;

class CSRFMiddleware extends Middleware
{
    public function handle(Request $request): ?Response
    {
        $method = $request->getMethod();
        
        // Only validate for POST, PUT, DELETE, PATCH
        if (!in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            return $this->next($request);
        }

        $csrfToken = $request->getHeader('X-CSRF-Token');
        $user = $request->getUser();
        
        if (!$user || !isset($user['uid'])) {
            return Response::error('Internal Server Error: No user identified', 500);
        }

        $storedToken = SessionService::getCSRFToken((int) $user['uid']);

        if (!$csrfToken || $csrfToken !== $storedToken) {
            return Response::error('CSRF Validation Failed', 403);
        }

        return $this->next($request);
    }
}
