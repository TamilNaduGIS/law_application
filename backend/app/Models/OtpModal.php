<?php

namespace App\Models;

require_once __DIR__ . '/../../config/database.php';

use App\config\Database;
use PDO;
use PDOException;

class OtpModal
{
    private PDO $writer;
    private PDO $reader;

    public function __construct()
    {
        $database = new Database();
        $this->writer = $database->connect('write');
        $this->reader = $database->connect('read');
        $this->ensureOtpTable();
    }

    /**
     * @return array{ok: bool, message?: string, error?: string}
     */
    public function sendOtp(string $mobile, string $purpose = 'register'): array
    {
        if ($purpose === 'register' && $this->isMobileRegistered($mobile)) {
            return ['ok' => false, 'error' => 'Mobile Number Already Exists'];
        }

        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', time() + 300);

        try {
            $stmt = $this->writer->prepare(
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

        $smsSent = $this->sendSms($mobile, $otp);
        if (!$smsSent) {
            return ['ok' => false, 'error' => 'Failed to send OTP SMS. Please try again.'];
        }

        return ['ok' => true, 'message' => 'OTP sent successfully'];
    }

    /**
     * @return array{ok: bool, message?: string, error?: string}
     */
    public function verifyOtp(string $mobile, string $otp, string $purpose = 'register'): array
    {
        try {
            $stmt = $this->reader->prepare(
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

        if (!empty($row['verified']) || $this->isVerifiedFlag($row['verified'] ?? false)) {
            return ['ok' => true, 'message' => 'Mobile number already verified.'];
        }

        if (strtotime($row['expires_at']) < time()) {
            return ['ok' => false, 'error' => 'OTP expired. Please request a new OTP.'];
        }

        if ($row['otp_code'] !== $otp) {
            return ['ok' => false, 'error' => 'Invalid OTP. Please try again.'];
        }

        try {
            $update = $this->writer->prepare(
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
    public function isOtpVerified(string $mobile, string $purpose = 'register'): array
    {
        try {
            $stmt = $this->reader->prepare(
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

        if (!$row || !$this->isVerifiedFlag($row['verified'])) {
            return ['ok' => false, 'error' => 'Please verify your mobile number with OTP.'];
        }

        return ['ok' => true];
    }

    private function isVerifiedFlag(mixed $value): bool
    {
        return $value === true
            || $value === 1
            || $value === '1'
            || $value === 't'
            || $value === 'true';
    }

    private function isMobileRegistered(string $mobile): bool
    {
        try {
            $stmt = $this->reader->prepare(
                'SELECT 1 FROM applicant_registration WHERE mobile_no = :mobile LIMIT 1'
            );
            $stmt->execute([':mobile' => $mobile]);
            return (bool) $stmt->fetchColumn();
        } catch (PDOException $e) {
            return false;
        }
    }

    private function ensureOtpTable(): void
    {
        $this->writer->exec(
            'CREATE TABLE IF NOT EXISTS mobile_otp_verification (
                mobile_no VARCHAR(10) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                purpose VARCHAR(20) NOT NULL DEFAULT \'register\',
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_on TIMESTAMP NOT NULL DEFAULT NOW(),
                PRIMARY KEY (mobile_no, purpose)
            )'
        );
    }

    private function sendSms(string $mobile, string $otp): bool
    {
        $response = $this->sms('otp', $mobile, [$otp]);
        return $response !== false && $response !== '';
    }

    /**
     * @param array<int, string> $msgarr
     */
    private function sms(string $template, string $to, array $msgarr): string|false
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
