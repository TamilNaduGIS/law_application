<?php

namespace App\Config;

use Aws\SecretsManager\SecretsManagerClient;
use Aws\Exception\AwsException;

class AWSSecretManager
{
    private static ?array $secrets = null;

    private static function hasEnvValue(string $key): bool
    {
        $value = getenv($key);
        return $value !== false && $value !== '';
    }

    private static function getAwsConfig(): array
    {
        $config = [
            'version' => 'latest',
            'region'  => getenv('AWS_REGION') ?: 'ap-south-1',
            'http'    => [
                'verify' => false, // TEMPORARY for local testing due to SSL cert issue
            ],
        ];

        $accessKey = getenv('AWS_ACCESS_KEY_ID') ?: getenv('AWS_ACCESS_KEY');
        $secretKey = getenv('AWS_SECRET_ACCESS_KEY') ?: getenv('AWS_SECRET_KEY');
        $sessionToken = getenv('AWS_SESSION_TOKEN');

        if ($accessKey && $secretKey) {
            $config['credentials'] = [
                'key'    => $accessKey,
                'secret' => $secretKey,
                'token'  => $sessionToken ?: null,
            ];
        }

        return $config;
    }

    private static function canUseAws(): bool
    {
        return isset(self::getAwsConfig()['credentials'])
            || self::hasEnvValue('AWS_PROFILE')
            || self::hasEnvValue('AWS_SHARED_CREDENTIALS_FILE');
    }

    public static function getSecrets(string $secretName): array
    {
        if (self::$secrets !== null) {
            return self::$secrets;
        }

        if (!self::canUseAws()) {
            return [];
        }

        $client = new SecretsManagerClient(self::getAwsConfig());

        try {
            $result = $client->getSecretValue([
                'SecretId' => $secretName,
            ]);

            if (isset($result['SecretString'])) {
                self::$secrets = json_decode($result['SecretString'], true);
            } else {
                self::$secrets = json_decode(base64_decode($result['SecretBinary']), true);
            }

            return self::$secrets;
        } catch (AwsException $e) {
            error_log('AWS Secrets Manager error: ' . $e->getMessage());
            throw new \Exception('AWS Secrets Manager error: ' . $e->getMessage());
        }
    }

    public static function getSecret(string $key, $default = null)
    {
        // 1. Check direct environment variable
        $envValue = getenv($key);
        if ($envValue !== false) {
            return $envValue;
        }

        // 2. Fallback to AWS Secrets Manager
        // Note: Using a consistent secret name 'my-db-secret'
        $secrets = self::getSecrets('my-db-secret');
        
        if (isset($secrets[$key])) {
            return $secrets[$key];
        }

        return $default;
    }
}
