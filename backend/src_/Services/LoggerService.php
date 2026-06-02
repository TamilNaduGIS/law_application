<?php

namespace App\Services;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class LoggerService
{
    private static ?S3Client $s3Client = null;
    private static ?string $bucketName = null;
    private static string $logPrefix = 'logs/';
    private static ?string $localLogPath = null;

    private static function init(): void
    {
        self::$localLogPath = dirname(__DIR__, 2) . '/logs';
        if (!is_dir(self::$localLogPath)) {
            mkdir(self::$localLogPath, 0777, true);
        }

        $env = getenv('APP_ENV') ?: 'dev';
        if (in_array($env, ['staging', 'prod', 'production'])) {
            self::initS3();
        }
    }

    private static function initS3(): void
    {
        if (self::$s3Client !== null) {
            return;
        }

        $config = [
            'version' => 'latest',
            'region'  => getenv('AWS_REGION') ?: 'ap-south-1',
            'http'    => [
                'verify' => false,
            ],
        ];

        $accessKey = getenv('AWS_ACCESS_KEY_ID') ?: getenv('AWS_ACCESS_KEY');
        $secretKey = getenv('AWS_SECRET_ACCESS_KEY') ?: getenv('AWS_SECRET_KEY');

        if ($accessKey && $secretKey) {
            $config['credentials'] = [
                'key'    => $accessKey,
                'secret' => $secretKey,
            ];
        }

        self::$s3Client = new S3Client($config);
        self::$bucketName = getenv('AWS_S3_LOG_BUCKET');
    }

    public static function log(string $message, string $level = 'INFO', array $context = []): bool
    {
        self::init();
        $env = getenv('APP_ENV') ?: 'dev';

        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'client_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
        ];

        if (in_array($env, ['staging', 'prod', 'production']) && self::$bucketName) {
            return self::logToS3($logData);
        } else {
            return self::logToLocal($logData);
        }
    }

    private static function logToS3(array $logData): bool
    {
        try {
            $uniqueKey = self::$logPrefix . date('Y/m/d/H/') . uniqid('log_', true) . '.json';
            self::$s3Client->putObject([
                'Bucket' => self::$bucketName,
                'Key'    => $uniqueKey,
                'Body'   => json_encode($logData),
                'ContentType' => 'application/json'
            ]);
            return true;
        } catch (AwsException $e) {
            error_log('S3 Logging failed: ' . $e->getMessage());
            return self::logToLocal($logData); // Fallback to local if S3 fails
        }
    }

    private static function logToLocal(array $logData): bool
    {
        $fileName = self::$localLogPath . '/app_' . date('Y-m-d') . '.log';
        $logEntry = json_encode($logData) . PHP_EOL;
        return file_put_contents($fileName, $logEntry, FILE_APPEND) !== false;
    }

    public static function logException(\Throwable $e): void
    {
        self::log($e->getMessage(), 'ERROR', [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}
