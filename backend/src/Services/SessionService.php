<?php

namespace App\Services;

/**
 * PHP native session store (replaces RedisSessionService).
 * Works with JWT: Bearer token identifies the user; $_SESSION holds server-side state.
 * Clients must send credentials (cookies) on every request.
 */
class SessionService
{
    private const AUTH_KEY = 'auth';
    private const FAILED_ATTEMPTS_DIR = __DIR__ . '/../../storage/cache/failed_attempts';

    public static function ensureStarted(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function createSession(
        int $userId,
        array $roles,
        string $encryptionKey,
        string $csrfToken,
        string $accessJti,
        string $refreshJti,
        string $phoneNo = '',
        ?array $moduleContent = null
    ): void {
        self::ensureStarted();
        session_regenerate_id(true);

        $payload = [
            'user_id' => $userId,
            'phoneno' => $phoneNo,
            'rol' => $roles,
            'access_jti' => $accessJti,
            'refresh_jti' => $refreshJti,
            'encryption_key' => $encryptionKey,
            'csrf_token' => $csrfToken,
            'invalidated_jtis' => [],
            'last_activity' => time(),
        ];

        if ($moduleContent !== null) {
            $payload['module'] = $moduleContent['module'] ?? null;
            $payload['content'] = $moduleContent;
        }

        $_SESSION[self::AUTH_KEY] = $payload;
    }

    public static function updateTokens(int $userId, string $newAccessJti, string $newRefreshJti): void
    {
        self::ensureStarted();
        $auth = self::getAuthForUser($userId);
        if ($auth === null) {
            return;
        }

        if (!empty($auth['access_jti']) && $auth['access_jti'] !== $newAccessJti) {
            self::addInvalidatedJti($auth['access_jti']);
        }
        if (!empty($auth['refresh_jti']) && $auth['refresh_jti'] !== $newRefreshJti) {
            self::addInvalidatedJti($auth['refresh_jti']);
        }

        $_SESSION[self::AUTH_KEY]['access_jti'] = $newAccessJti;
        $_SESSION[self::AUTH_KEY]['refresh_jti'] = $newRefreshJti;
        $_SESSION[self::AUTH_KEY]['last_activity'] = time();
    }

    public static function hasActiveSession(int $userId): bool
    {
        return self::getAuthForUser($userId) !== null;
    }

    public static function isUserBlocked(int $userId): bool
    {
        $file = self::failedAttemptsPath($userId);
        if (!is_file($file)) {
            return false;
        }

        $count = (int) file_get_contents($file);
        return $count >= 5;
    }

    public static function recordFailedAttempt(int $userId): void
    {
        if (!is_dir(self::FAILED_ATTEMPTS_DIR)) {
            mkdir(self::FAILED_ATTEMPTS_DIR, 0755, true);
        }

        $file = self::failedAttemptsPath($userId);
        $count = is_file($file) ? (int) file_get_contents($file) : 0;
        file_put_contents($file, (string) ($count + 1), LOCK_EX);
    }

    public static function clearFailedAttempts(int $userId): void
    {
        $file = self::failedAttemptsPath($userId);
        if (is_file($file)) {
            unlink($file);
        }
    }

    public static function getSession(int $userId): ?array
    {
        $auth = self::getAuthForUser($userId);
        if ($auth === null) {
            return null;
        }

        return [
            'rol' => $auth['rol'],
            'access_jti' => $auth['access_jti'],
            'refresh_jti' => $auth['refresh_jti'],
            'module' => $auth['module'] ?? null,
        ];
    }

    public static function getEncryptionKey(int $userId): ?string
    {
        $auth = self::getAuthForUser($userId);
        return $auth['encryption_key'] ?? null;
    }

    public static function getCSRFToken(int $userId): ?string
    {
        $auth = self::getAuthForUser($userId);
        return $auth['csrf_token'] ?? null;
    }

    public static function getPhoneNo(int $userId): ?string
    {
        $auth = self::getAuthForUser($userId);
        if ($auth === null) {
            return null;
        }

        $phone = trim((string) ($auth['phoneno'] ?? ''));
        return $phone !== '' ? $phone : null;
    }

    public static function getContent(int $userId): ?array
    {
        $auth = self::getAuthForUser($userId);
        if ($auth === null) {
            return null;
        }

        $content = $auth['content'] ?? null;
        return is_array($content) ? $content : null;
    }

    public static function isTokenValid(string $jti): bool
    {
        self::ensureStarted();
        $auth = $_SESSION[self::AUTH_KEY] ?? null;
        if (!$auth || $jti === '') {
            return false;
        }

        if (in_array($jti, $auth['invalidated_jtis'] ?? [], true)) {
            return false;
        }

        return $jti === ($auth['access_jti'] ?? '') || $jti === ($auth['refresh_jti'] ?? '');
    }

    public static function touchAccessToken(string $jti, int $userId): void
    {
        self::touchSessionActivity($userId, $jti);
    }

    public static function touchSessionActivity(int $userId, ?string $accessJti = null): void
    {
        self::ensureStarted();
        if (self::getAuthForUser($userId) === null) {
            return;
        }

        $_SESSION[self::AUTH_KEY]['last_activity'] = time();
    }

    public static function sessionHasAccessJti(array $session, string $jti): bool
    {
        return isset($session['access_jti']) && $session['access_jti'] === $jti;
    }

    public static function sessionHasRefreshJti(array $session, string $jti): bool
    {
        return $jti !== '' && isset($session['refresh_jti']) && $session['refresh_jti'] === $jti;
    }

    public static function touchRefreshToken(string $jti, int $userId): void
    {
        self::touchSessionActivity($userId, $jti);
    }

    public static function invalidateToken(string $jti): void
    {
        self::ensureStarted();
        if (!isset($_SESSION[self::AUTH_KEY]) || $jti === '') {
            return;
        }

        self::addInvalidatedJti($jti);

        if (($_SESSION[self::AUTH_KEY]['refresh_jti'] ?? '') === $jti) {
            $_SESSION[self::AUTH_KEY]['refresh_jti'] = '';
        }
        if (($_SESSION[self::AUTH_KEY]['access_jti'] ?? '') === $jti) {
            $_SESSION[self::AUTH_KEY]['access_jti'] = '';
        }
    }

    public static function destroySession(int $userId): void
    {
        self::ensureStarted();
        $auth = self::getAuthForUser($userId);
        if ($auth === null) {
            return;
        }

        unset($_SESSION[self::AUTH_KEY]);
        session_regenerate_id(true);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function getAuthForUser(int $userId): ?array
    {
        self::ensureStarted();
        $auth = $_SESSION[self::AUTH_KEY] ?? null;
        if (!is_array($auth) || (int) ($auth['user_id'] ?? 0) !== $userId) {
            return null;
        }

        return $auth;
    }

    private static function addInvalidatedJti(string $jti): void
    {
        $_SESSION[self::AUTH_KEY]['invalidated_jtis'] ??= [];
        if (!in_array($jti, $_SESSION[self::AUTH_KEY]['invalidated_jtis'], true)) {
            $_SESSION[self::AUTH_KEY]['invalidated_jtis'][] = $jti;
        }
    }

    private static function failedAttemptsPath(int $userId): string
    {
        return self::FAILED_ATTEMPTS_DIR . '/user_' . $userId . '.txt';
    }
}
