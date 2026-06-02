<?php

namespace App\Helpers;

use Exception;

class EncryptionHelper
{
    private const METHOD = 'AES-256-CBC';

    public static function encrypt(string $data, string $key): string
    {
        $iv = random_bytes(openssl_cipher_iv_length(self::METHOD));
        $encrypted = openssl_encrypt($data, self::METHOD, hex2bin($key), OPENSSL_RAW_DATA, $iv);
        return base64_encode($iv . $encrypted);
    }

    public static function decrypt(string $base64Data, string $key): ?string
    {
        try {
            $decoded = base64_decode($base64Data);
            $ivLength = openssl_cipher_iv_length(self::METHOD);
            $iv = substr($decoded, 0, $ivLength);
            $encrypted = substr($decoded, $ivLength);

            $decrypted = openssl_decrypt($encrypted, self::METHOD, hex2bin($key), OPENSSL_RAW_DATA, $iv);
            return $decrypted === false ? null : $decrypted;
        } catch (Exception $e) {
            error_log($e->getMessage());
            return null;
        }
    }

    public static function generateUserKey(): string
    {
        return bin2hex(random_bytes(32)); // 256-bit key
    }
}
