<?php

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Helpers\JWTHelper;
use App\Services\SessionService;
use App\Models\LoginTransaction;

class AuthMiddleware extends Middleware
{
    public function handle(Request $request): ?Response
    {
        $authHeader = $request->getHeader('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return Response::error('Unauthorized: Missing Token', 401);
        }

        $token = substr($authHeader, 7);
        $decoded = JWTHelper::decode($token);

        if (!$decoded) {
            return Response::error('Unauthorized: Invalid Token', 401);
        }

        $userId = (int) $decoded['uid'];
        $session = SessionService::getSession($userId);

        if (!$session) {
            return Response::error('Unauthorized: Session Expired or Revoked', 401);
        }

        $jti = (string) ($decoded['jti'] ?? '');
        if ($jti === '' || !SessionService::isTokenValid($jti)) {
            if ($jti === '' || !SessionService::sessionHasAccessJti($session, $jti)) {
                return Response::error('Unauthorized: Session Expired or Revoked', 401);
            }
            SessionService::touchAccessToken($jti, $userId);
        }

        $encryptionKey = SessionService::getEncryptionKey($userId) ?? '';
        $phoneNo = SessionService::getPhoneNo($userId) ?? '';
        if ($phoneNo !== '' && !LoginTransaction::ensureActiveSession($phoneNo, $encryptionKey)) {
            return Response::error('Unauthorized: Session Expired or Revoked', 401);
        }

        SessionService::touchSessionActivity($userId, $jti);

        $request->setUser($decoded);
        return $this->next($request);
    }
}
