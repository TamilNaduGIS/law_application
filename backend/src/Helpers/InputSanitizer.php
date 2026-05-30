<?php

namespace App\Helpers;


class InputSanitizer
{
    public static function sanitizeString($input): ?string
    {
        if (is_null($input)) return null;
        return trim(htmlspecialchars(strip_tags($input), ENT_QUOTES, 'UTF-8'));
    }

    public static function sanitizeInt($input): ?int
    {
        if (is_null($input)) return null;
        return filter_var($input, FILTER_VALIDATE_INT);
    }

    public static function sanitizeBoolean($input): ?bool
    {
        if (is_null($input)) return null;
        return filter_var($input, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

 public static function sanitizePhone($input): ?string
{
    if (is_null($input)) return null;

    $clean = preg_replace('/\D/', '', $input); // remove non-digits

    // Check length and starting digit
    if (strlen($clean) === 10 && preg_match('/^[6-9]\d{9}$/', $clean)) {
        return $clean;
    }

    return null;
}

}
