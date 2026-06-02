<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JWTHelper
{
    private static ?string $cachedSecret = null;

    private static function getSecret(): string
    {
        if (self::$cachedSecret !== null) {
            return self::$cachedSecret;
        }

        self::$cachedSecret = getenv('JWT_SECRET') ?: 'default-secret-key-replace-me';
        return self::$cachedSecret;
    }

    /**
     * @return array{token: string, jti: string}
     */
    public static function generate(int $userId, array $roles = [], int $expiryMinutes = 15, bool $isRefresh = false): array
    {
        $jti = bin2hex(random_bytes(16));
        $payload = [
            'iat' => time(),
            'exp' => time() + ($expiryMinutes * 60),
            'uid' => $userId,
            'rol' => $roles,
            'jti' => $jti,
            'type' => $isRefresh ? 'refresh' : 'access',
        ];

        return [
            'token' => JWT::encode($payload, self::getSecret(), 'HS256'),
            'jti' => $jti,
        ];
    }

    public static function decode(string $token, bool $isRefresh = false): ?array
    {
        try {
            $decoded = (array) JWT::decode($token, new Key(self::getSecret(), 'HS256'));

            if ($isRefresh && ($decoded['type'] ?? '') !== 'refresh') {
                return null;
            }
            if (!$isRefresh && ($decoded['type'] ?? '') !== 'access') {
                return null;
            }

            return $decoded;
        } catch (Exception $e) {
            return null;
        }
    }
}
