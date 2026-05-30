<?php

namespace App\Models;



use App\config\Database;
use PDO;
use PDOException;

class OtpModal
{
    
    /**
     * @return array{ok: bool, message?: string, error?: string}
     */
    public static function sendOtp(string $mobile, string $purpose = 'register'): array
    {
        if ($purpose === 'register' && self::isMobileRegistered($mobile)) {
            return ['ok' => false, 'error' => 'Mobile Number Already Exists'];
        }

        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', time() + 300);

        try {
            $stmt = Database::WriteConnection()->prepare(
                'INSERT INTO mobile_otp_verification
                    (mobile_no, otp_code, purpose, expires_at, verified, created_on)
                 VALUES
                    (:mobile, :otp, :purpose, :expires_at, false, NOW())
                 ON CONFLICT (mobile_no, purpose) DO UPDATE SET
                    otp_code = EXCLUDED.otp_code,
                    expires_at = EXCLUDED.expires_at,
                    verified = false,
                    created_on = NOW()'
            );
            $stmt->execute([
                ':mobile' => $mobile,
                ':otp' => $otp,
                ':purpose' => $purpose,
                ':expires_at' => $expiresAt,
            ]);
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => 'Unable to generate OTP. Please try again.'];
        }

        $smsSent = self::sendSms($mobile, $otp, $purpose);
        if (!$smsSent) {
            return ['ok' => false, 'error' => 'Failed to send OTP SMS. Please try again.'];
        }

        return ['ok' => true, 'message' => 'OTP sent successfully'];
    }

    /**
     * @return array{ok: bool, message?: string, error?: string}
     */
    public static function verifyOtp(string $mobile, string $otp, string $purpose = 'register'): array
    {
        try {
            $stmt = Database::ReadDatabaseConnection()->prepare(
                'SELECT otp_code, expires_at, verified
                 FROM mobile_otp_verification
                 WHERE mobile_no = :mobile AND purpose = :purpose
                 LIMIT 1'
            );
            $stmt->execute([':mobile' => $mobile, ':purpose' => $purpose]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => 'Unable to verify OTP. Please try again.'];
        }

        if (!$row) {
            return ['ok' => false, 'error' => 'OTP not found. Please request a new OTP.'];
        }

        if (!empty($row['verified']) || self::isVerifiedFlag($row['verified'] ?? false)) {
            return ['ok' => true, 'message' => 'Mobile number already verified.'];
        }

        if (strtotime($row['expires_at']) < time()) {
            return ['ok' => false, 'error' => 'OTP expired. Please request a new OTP.'];
        }

        if ($row['otp_code'] !== $otp) {
            return ['ok' => false, 'error' => 'Invalid OTP. Please try again.'];
        }

        try {
            $update = Database::WriteConnection()->prepare(
                'UPDATE mobile_otp_verification
                 SET verified = true
                 WHERE mobile_no = :mobile AND purpose = :purpose'
            );
            $update->execute([':mobile' => $mobile, ':purpose' => $purpose]);
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => 'Unable to verify OTP. Please try again.'];
        }

        return ['ok' => true, 'message' => 'Mobile number verified successfully'];
    }

    /**
     * @return array{ok: bool, error?: string}
     */
    public static function isOtpVerified(string $mobile, string $purpose = 'register'): array
    {
        try {
            $stmt = Database::ReadDatabaseConnection()->prepare(
                'SELECT verified, expires_at
                 FROM mobile_otp_verification
                 WHERE mobile_no = :mobile AND purpose = :purpose
                 LIMIT 1'
            );
            $stmt->execute([':mobile' => $mobile, ':purpose' => $purpose]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => 'Unable to validate OTP status.'];
        }

            if (!$row || !self::isVerifiedFlag($row['verified'])) {
            return ['ok' => false, 'error' => 'Please verify your mobile number with OTP.'];
        }

        return ['ok' => true];
    }

    private static function isVerifiedFlag(mixed $value): bool
    {
        return $value === true
            || $value === 1
            || $value === '1'
            || $value === 't'
            || $value === 'true';
    }

    private static function isMobileRegistered(string $mobile): bool
    {
        try {
            $stmt = Database::ReadDatabaseConnection()->prepare(
                'SELECT 1 FROM applicant_registration WHERE mobile_no = :mobile LIMIT 1'
            );
            $stmt->execute([':mobile' => $mobile]);
            return (bool) $stmt->fetchColumn();
        } catch (PDOException $e) {
            return false;
        }
    }

   

    private static function sendSms(string $mobile, string $otp, string $purpose = 'register'): bool
    {
        $template = $purpose === 'login' ? 'reset' : 'otp';
        $response = self::sms($template, $mobile, [$otp]);
        return $response !== false && $response !== '';
    }

    /**
     * @param array<int, string> $msgarr
     */
    private static function sms(string $template, string $to, array $msgarr): string|false
    {
        $entity = '1301157259712022912';
        $tpl = [
            'otp' => [
                'k' => '6saUwpI8',
                'id' => '1007673995640711136',
                'txt' => 'Dear User, your OTP to register on the Law Officers Appln.Portal is {#alphanumeric1#}, valid for 5 mins. Do not share with anyone – Public(LO)Dept TNGOVT',
            ],
            'reset' => [
                'k' => '6saUwpI8',
                'id' => '1007598357377959354',
                'txt' => 'Dear User, your OTP to reset password on the Law Officers Appln.Portal is {#alphanumeric1#}, valid for 5 mins. – Public(LO)Dept TNGOVT',
            ],
        ];

        if (!isset($tpl[$template])) {
            return false;
        }

        $message = str_replace(
            ['{#alphanumeric1#}', '{#alphanumeric2#}', '{#alphanumeric3#}', '{#alphanumeric4#}', '{#alphanumeric5#}', '{#alphanumeric6#}', '{#alphanumeric7#}', '{#alphanumeric8#}'],
            $msgarr,
            $tpl[$template]['txt']
        );

        $url = 'https://tmegov.onex-aura.com/api/sms?key=6saUwpI8&from=TNGOVT&to=91'
            . $to
            . '&body=' . urlencode($message)
            . '&entityid=' . $entity
            . '&templateid=' . $tpl[$template]['id'];

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'GET',
        ]);

        $response = curl_exec($curl);
        curl_close($curl);

        return $response;
    }
}
