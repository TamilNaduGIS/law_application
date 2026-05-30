<?php

namespace App\Services;

class CapchaServices
{
    private const CAPTCHA_FONT = __DIR__ . '/monofonto.ttf';
    private const SECRET_KEY = 'OFDNISIBINLIDRGINSILVHNIGIOCHSIOHBCHOEVPJWHOINHTC';
    private const DEFAULT_WIDTH = 130;
    private const DEFAULT_HEIGHT = 40;
    private const DEFAULT_LENGTH = 6;
    private const DOTS = 50;
    private const LINES = 25;
    private const TEXT_COLOR = '0x142864';
    private const NOISE_COLOR = '0x142864';
    private const CHARSET = 'bcdfghjkmnpqrstvwxyz23456789';

    public static function generateCaptcha(int $width = self::DEFAULT_WIDTH, int $height = self::DEFAULT_HEIGHT, int $length = self::DEFAULT_LENGTH): array
    {
        if (!file_exists(self::CAPTCHA_FONT)) {
            throw new \RuntimeException('Font file not found: ' . self::CAPTCHA_FONT);
        }

        $captchaCode = self::createCode($length);
        $image = @imagecreate($width, $height);

        if (!$image) {
            throw new \RuntimeException('Failed to create CAPTCHA image.');
        }

        $backgroundColor = imagecolorallocate($image, 255, 255, 255);
        $textColorArray = self::hexToRgb(self::TEXT_COLOR);
        $textColor = imagecolorallocate($image, $textColorArray['red'], $textColorArray['green'], $textColorArray['blue']);
        $noiseColorArray = self::hexToRgb(self::NOISE_COLOR);
        $noiseColor = imagecolorallocate($image, $noiseColorArray['red'], $noiseColorArray['green'], $noiseColorArray['blue']);

        for ($i = 0; $i < self::DOTS; $i++) {
            imagefilledellipse($image, random_int(0, $width), random_int(0, $height), 2, 3, $noiseColor);
        }

        $fontSize = (int) ($height * 0.65);
        $textBox = imagettfbbox($fontSize, 0, self::CAPTCHA_FONT, $captchaCode);
        $textWidth = $textBox[4] - $textBox[0];
        $textHeight = $textBox[1] - $textBox[5];

        $x = (int) (($width - $textWidth) / 2);
        $y = (int) (($height - $textHeight) / 2 + $textHeight);

        imagettftext($image, $fontSize, 0, $x, $y, $textColor, self::CAPTCHA_FONT, $captchaCode);

        ob_start();
        imagejpeg($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        $dataUri = 'data:image/jpeg;base64,' . base64_encode($imageData);
        $encryptedCode = self::encrypt($captchaCode, self::SECRET_KEY);

        return [
            'datauri' => $dataUri,
            'code' => $encryptedCode,
        ];
    }

    public static function validateCaptcha(string $encryptedCode, string $userInput): bool
    {
        
        $plainCode = self::decrypt($encryptedCode, self::SECRET_KEY);
        return hash_equals(trim(strtolower($plainCode)), trim(strtolower($userInput)));
    }

    private static function createCode(int $length): string
    {
        $code = '';
        $max = strlen(self::CHARSET) - 1;

        for ($i = 0; $i < $length; $i++) {
            $code .= self::CHARSET[random_int(0, $max)];
        }

        return $code;
    }

    private static function hexToRgb(string $hex): array
    {
        $integer = hexdec($hex);

        return [
            'red' => 0xFF & ($integer >> 0x10),
            'green' => 0xFF & ($integer >> 0x8),
            'blue' => 0xFF & $integer,
        ];
    }

    public static function encrypt(string $plaintext, string $key): string
    {
        $cipherMethod = 'AES-256-CBC';
        $ivLength = openssl_cipher_iv_length($cipherMethod);
        $iv = openssl_random_pseudo_bytes($ivLength);

        $ciphertext = openssl_encrypt($plaintext, $cipherMethod, $key, 0, $iv);
        return base64_encode($iv . $ciphertext);
    }

    private static function decrypt(string $payload, string $key): string
    {
        $decoded = base64_decode($payload, true);
        if ($decoded === false) {
            return '';
        }

        $cipherMethod = 'AES-256-CBC';
        $ivLength = openssl_cipher_iv_length($cipherMethod);
        $iv = substr($decoded, 0, $ivLength);
        $ciphertext = substr($decoded, $ivLength);

        $plaintext = openssl_decrypt($ciphertext, $cipherMethod, $key, 0, $iv);
        return $plaintext !== false ? $plaintext : '';
    }
}



