<?php

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Services\SessionService;

class RoleMiddleware extends Middleware
{
    private array $requiredRoles;

    public function __construct(array $roles)
    {
        $this->requiredRoles = $roles;
    }

    public function handle(Request $request): ?Response
    {
        $user = $request->getUser();
        if (!$user || !isset($user['uid'])) {
            return Response::error('Internal Server Error: No user identified', 500);
        }

        // Fetch session to get the most up-to-date roles
        $session = SessionService::getSession((int) $user['uid']);
        if (!$session) {
            return Response::error('Unauthorized: No active session', 401);
        }

        $userRoles = $session['rol'] ?? [];

        foreach ($this->requiredRoles as $role) {
            if (in_array($role, $userRoles)) {
                return $this->next($request);
            }
        }

        return Response::error('Forbidden: Insufficient Permissions', 403);
    }
}
