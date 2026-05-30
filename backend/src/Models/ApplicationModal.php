<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

class ApplicationModal
{
    /**
     * Resolve application_id for stored procedures (read-only; no header creation).
     */
    public static function resolveApplicationId(int $applicantId, array $data = []): int
    {
        $fromRequest = (int) ($data['application_id'] ?? $data['applicationId'] ?? 0);
        if ($fromRequest > 0) {
            return $fromRequest;
        }

        try {
            $stmt = Database::ReadDatabaseConnection()->prepare(
                'SELECT application_id
                 FROM application_header
                 WHERE applicant_id = :applicant_id
                 ORDER BY application_id DESC
                 LIMIT 1'
            );
            $stmt->bindValue(':applicant_id', $applicantId, PDO::PARAM_INT);
            $stmt->execute();
            $existing = $stmt->fetchColumn();
            if ($existing !== false) {
                return (int) $existing;
            }
        } catch (PDOException $e) {
            error_log('resolveApplicationId: ' . $e->getMessage());
        }

        return 0;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message?: string, error?: string, application_id?: int|null}
     */
    public static function savePersonalInfo(array $payload): array
    {
        return self::callJsonProcedure('sp_application_save_personal_info', $payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message?: string, error?: string}
     */
    public static function uploadDocument(array $payload): array
    {
        return self::callJsonProcedure('sp_application_upload_document', $payload);
    }

    public static function getApplicationById(int $applicationId): ?array
    {
        try {
            $stmt = Database::ReadDatabaseConnection()->prepare(
                'SELECT * FROM application_personal_info WHERE application_id = :application_id'
            );
            $stmt->bindParam(':application_id', $applicationId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            return null;
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message?: string, error?: string, application_id?: int|null}
     */
    private static function callJsonProcedure(string $procedure, array $payload): array
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return ['ok' => false, 'error' => 'Invalid request data.'];
        }

        try {
            $escaped = str_replace("'", "''", $json);
            $stmt = Database::WriteConnection()->query(
                "CALL public.{$procedure}('{$escaped}'::jsonb, NULL)"
            );

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $parsed = self::parseProcedureOutput($rows);

            if (is_array($parsed)) {
                $status = filter_var($parsed['status'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($status) {
                    return array_merge(
                        ['ok' => true, 'message' => $parsed['message'] ?? 'Saved successfully.'],
                        $parsed
                    );
                }

                return [
                    'ok' => false,
                    'error' => $parsed['message'] ?? $parsed['error'] ?? 'Operation failed.',
                ];
            }

            if (!empty($rows[0]) && isset($rows[0]['status'])) {
                $row = $rows[0];
                $status = filter_var($row['status'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($status) {
                    return array_merge(['ok' => true, 'message' => $row['message'] ?? 'Saved successfully.'], $row);
                }

                return ['ok' => false, 'error' => $row['message'] ?? 'Operation failed.'];
            }

            return ['ok' => false, 'error' => 'Unexpected response from application service.'];
        } catch (PDOException $e) {
            error_log("{$procedure}: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, mixed>|null
     */
    private static function parseProcedureOutput(array $rows): ?array
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
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message?: string, error?: string}
     */
    public static function saveEducation(array $payload): array
    {
        return self::callJsonProcedure('sp_application_save_education', $payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message?: string, error?: string}
     */
    public static function saveAdditionalQualification(array $payload): array
    {
        return self::callJsonProcedure('sp_application_save_additional_qualification', $payload);
    }
}
