<?php

namespace App\Models;

require_once __DIR__ . '/../../config/database.php';

use App\config\Database;
use PDO;
use PDOException;

class UserRegisterModal
{
    private PDO $writer;

    public function __construct()
    {
        $database = new Database();
        $this->writer = $database->connect('write');
    }

    /**
     * @param array<string, mixed> $payload Keys expected by sp_applicant_create_account
     * @return array{ok: bool, message?: string, error?: string, applicant_id?: int|null}
     */
    public function createAccount(array $payload): array
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return ['ok' => false, 'error' => 'Invalid registration data.'];
        }

        try {
            $result = $this->callProcedure($json);

            if (!is_array($result)) {
                return ['ok' => false, 'error' => 'Unexpected response from registration service.'];
            }

            $status = filter_var($result['status'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($status) {
                return [
                    'ok' => true,
                    'message' => $result['message'] ?? 'Account Created Successfully',
                    'applicant_id' => isset($result['applicant_id']) ? (int) $result['applicant_id'] : null,
                ];
            }

            return [
                'ok' => false,
                'error' => $result['message'] ?? 'Registration failed.',
            ];
        } catch (PDOException $e) {
            return [
                'ok' => false,
                'error' => 'Registration failed. Please try again later.',
            ];
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function callProcedure(string $json): ?array
    {
        $escaped = str_replace("'", "''", $json);
        $stmt = $this->writer->query(
            "CALL public.sp_applicant_create_account('{$escaped}'::jsonb, NULL)"
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->parseProcedureOutput($rows);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, mixed>|null
     */
    private function parseProcedureOutput(array $rows): ?array
    {
        foreach ($rows as $row) {
            if (!isset($row['p_output'])) {
                continue;
            }

            $output = $row['p_output'];
            if (is_string($output)) {
                $decoded = json_decode($output, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }

            if (is_array($output)) {
                return $output;
            }
        }

        return null;
    }

    /**
     * @return array{ok: bool, message?: string, error?: string, applicant_id?: int|null, data?: array<string, mixed>}
     */
    public function loginApplicant(string $mobile, string $enrollmentNo): array
    {
        $payload = json_encode([
            'mobile_no' => $mobile,
            'enrollment_no' => strtoupper($enrollmentNo),
        ], JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            return ['ok' => false, 'error' => 'Invalid login data.'];
        }

        try {
            $result = $this->callLoginProcedure($payload);

            if (!is_array($result)) {
                return ['ok' => false, 'error' => 'Unexpected response from login service.'];
            }

            $status = filter_var($result['status'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($status) {
                return [
                    'ok' => true,
                    'message' => $result['message'] ?? 'Login validated successfully',
                    'applicant_id' => isset($result['applicant_id']) ? (int) $result['applicant_id'] : null,
                    'data' => $result,
                ];
            }

            return [
                'ok' => false,
                'error' => $result['message'] ?? 'Invalid enrolment number or mobile number.',
            ];
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => 'Login failed. Please try again later.'];
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function callLoginProcedure(string $json): ?array
    {
        $escaped = str_replace("'", "''", $json);
        $stmt = $this->writer->query(
            "CALL public.sp_applicant_login('{$escaped}'::jsonb, NULL)"
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->parseProcedureOutput($rows);
    }
}
