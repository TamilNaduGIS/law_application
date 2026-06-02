<?php

namespace App\Services;

class RateLimitService
{
    private const CACHE_DIR = __DIR__ . '/../../storage/cache/ratelimit';

    public static function check(string $key, int $limit, int $window): array
    {
        $default = [
            'allowed' => true,
            'limit' => $limit,
            'remaining' => $limit - 1,
            'reset' => time() + $window,
        ];

        try {
            if (!is_dir(self::CACHE_DIR)) {
                mkdir(self::CACHE_DIR, 0755, true);
            }

            $file = self::cachePath($key);
            $now = time();
            $data = ['count' => 0, 'reset' => $now + $window];

            if (is_file($file)) {
                $raw = file_get_contents($file);
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $data = $decoded;
                }
            }

            if ($now >= ($data['reset'] ?? 0)) {
                $data = ['count' => 0, 'reset' => $now + $window];
            }

            if ((int) $data['count'] >= $limit) {
                return [
                    'allowed' => false,
                    'limit' => $limit,
                    'remaining' => 0,
                    'reset' => (int) $data['reset'],
                ];
            }

            $data['count'] = (int) $data['count'] + 1;
            file_put_contents($file, json_encode($data), LOCK_EX);

            return [
                'allowed' => true,
                'limit' => $limit,
                'remaining' => max(0, $limit - (int) $data['count']),
                'reset' => (int) $data['reset'],
            ];
        } catch (\Throwable $e) {
            error_log('Rate limit skipped (file cache): ' . $e->getMessage());
            return $default;
        }
    }

    private static function cachePath(string $key): string
    {
        return self::CACHE_DIR . '/' . hash('sha256', $key) . '.json';
    }
}
