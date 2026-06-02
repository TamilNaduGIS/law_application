<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Helpers\JWTHelper;
use App\Helpers\EncryptionHelper;
use App\Services\SessionService;
use App\Services\CapchaServices;
use App\Models\User;
use App\Models\LoginTransaction;

class AuthController extends Controller
{
    public function __construct(?Request $request = null)
    {
        if ($request !== null && !empty($request->getUser()['uid'])) {
            parent::__construct($request);
        }
    }

   

    public function refresh(Request $request): Response
    {
        $data = $request->getData();
        $refreshToken = $data['refresh_token'] ?? '';

        $decoded = JWTHelper::decode($refreshToken, true);
        if (!$decoded || !SessionService::isTokenValid($decoded['jti'])) {
            return $this->error('Invalid or expired refresh token', 401);
        }

        SessionService::invalidateToken($decoded['jti']);

        $userId = (int) $decoded['uid'];
        $roles = $decoded['rol'];

        if (!SessionService::getSession($userId)) {
            return $this->error('Session expired', 401);
        }

        $newAccess = JWTHelper::generate($userId, $roles, 15, false);
        $newRefresh = JWTHelper::generate($userId, $roles, 10, true);

        SessionService::updateTokens($userId, $newAccess['jti'], $newRefresh['jti']);

        return $this->json([
            'access_token' => $newAccess['token'],
            'refresh_token' => $newRefresh['token'],
        ]);
    }

    public function health(Request $request): Response
    {
        return $this->json([
            'status' => 'online',
            'message' => 'Secure PHP API is running!',
            'timestamp' => date('Y-m-d H:i:s'),
        ]);
    }

    public function logout(Request $request): Response
    {
        $user = $request->getUser();
        if ($user && isset($user['uid'])) {
            $userId = (int) $user['uid'];
            $phoneNo = SessionService::getPhoneNo($userId);
            SessionService::destroySession($userId);
            if ($phoneNo !== null) {
                LoginTransaction::logout($phoneNo);
            }
        }

        return $this->json(['message' => 'Logged out successfully']);
    }

    public function getTokens(Request $request): Response
    {
        $user = $request->getUser();
        if ($user && isset($user['uid'])) {
            $session = SessionService::getSession((int) $user['uid']);
            if ($session) {
                return $this->json([
                    'encryption_key' => SessionService::getEncryptionKey((int) $user['uid']),
                    'csrf_token' => SessionService::getCSRFToken((int) $user['uid']),
                ]);
            }
        }

        return $this->error('Unauthorized', 401);
    }

    /**
     * @param array<string, mixed> $user
     */
    private static function resolvePhoneNo(array $user): string
    {
        foreach (['phoneno', 'phone_no', 'mobile_no', 'mobile', 'phone'] as $key) {
            $value = trim((string) ($user[$key] ?? ''));
            if ($value !== '') {
                return preg_replace('/\D/', '', $value);
            }
        }

        return '';
    }
}
