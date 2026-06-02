<?php
namespace App\Helpers;

class ResponseHandler
{
    private static $secretKey = "enkenk2@3()"; // move to ENV in production

    private static function encrypt($data)
    {
        $plaintext = json_encode($data);

        $key = hash('sha256', self::$secretKey, true);
        $iv = openssl_random_pseudo_bytes(16);

        $encrypted = openssl_encrypt(
            $plaintext,
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        // iv + encrypted → base64
        return base64_encode($iv . $encrypted);
    }

    
    public static function success(string $message, $data = null, int $code = 200)
    {
        http_response_code($code);

        $payload = [
            "status_code" => 1,
            "message"     => $message,
            "data"        => $data
        ];

        echo json_encode([
            "encrypted" => self::encrypt($payload),
            // "decrypted" => $payload
        ]);
       //echo json_encode($payload);

        exit;
    }

    public static function error(string $message, $data = null, int $code = 400)
    {
        http_response_code($code);

        $payload = [
            "status_code" => 0,
            "message"     => $message,
            "data"        => $data
        ];

        echo json_encode([
            "encrypted" => ($payload)
        ]);

        exit;
    }

    public static function exception(\Throwable $e)
    {
        http_response_code(422);

        $payload = [
            "status_code" => 0,
            "message"     => "An error occurred. Please try again later.",
            "data"        => null
        ];

        echo json_encode([
            "encrypted" => ($payload)
        ]);

        exit;
    }
}
