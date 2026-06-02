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

    /**
     * @return array<int, array<string, mixed>>
     */
    /**
     * @return array{education: array<int, array<string, mixed>>, additional_qualification: array<int, array<string, mixed>>}
     */
    public static function getTab2Qualifications(int $applicantId): array
    {
        $education = [];
        $additional = [];

        $raw = self::callApplicantReadFunction('fn_application_get_education_details', $applicantId);
        $decoded = self::decodeJsonValue($raw);

        if (is_array($decoded)) {
            if (isset($decoded['education']) && is_array($decoded['education'])) {
                $education = self::dedupeDetailRowsById($decoded['education'], 'education_id');
            }
            if (isset($decoded['additional_qualification']) && is_array($decoded['additional_qualification'])) {
                $additional = self::dedupeDetailRowsById(
                    $decoded['additional_qualification'],
                    'add_qualification_id'
                );
            }
        }

        if ($education === []) {
            $education = self::dedupeDetailRowsById(
                self::fetchEducationRowsFromTable($applicantId),
                'education_id'
            );
        }

        if ($additional === []) {
            $additional = self::dedupeDetailRowsById(
                self::fetchAdditionalRowsFromTable($applicantId),
                'add_qualification_id'
            );
        }

        return [
            'education' => $education,
            'additional_qualification' => $additional,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getEducationDetails(int $applicantId): array
    {
        return self::getTab2Qualifications($applicantId)['education'];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getAdditionalQualificationDetails(int $applicantId): array
    {
        return self::getTab2Qualifications($applicantId)['additional_qualification'];
    }

    /**
     * @param array<int, int> $educationIds
     * @return array{ok: bool, deleted?: int, error?: string, message?: string}
     */
    public static function deleteEducationRecords(int $applicantId, array $educationIds): array
    {
        return self::deleteRecordsByPrimaryKey(
            $applicantId,
            'application_education',
            'education_id',
            $educationIds
        );
    }

    /**
     * @param array<int, int> $additionalIds
     * @return array{ok: bool, deleted?: int, error?: string, message?: string}
     */
    public static function deleteAdditionalQualificationRecords(int $applicantId, array $additionalIds): array
    {
        $result = self::deleteRecordsByPrimaryKey(
            $applicantId,
            'application_additional_qualification',
            'add_qualification_id',
            $additionalIds
        );

        if ($result['ok'] && ($result['deleted'] ?? 0) > 0) {
            return $result;
        }

        return self::deleteRecordsByPrimaryKey(
            $applicantId,
            'application_additional_qualification',
            'additional_qualification_id',
            $additionalIds
        );
    }

    /**
     * Delete row(s) by primary key (e.g. education_id), scoped to the applicant.
     *
     * @param array<int, int> $recordIds
     * @return array{ok: bool, deleted?: int, education_id?: int, education_ids?: int[], error?: string, message?: string}
     */
    private static function deleteRecordsByPrimaryKey(
        int $applicantId,
        string $table,
        string $idColumn,
        array $recordIds
    ): array {
        if (!preg_match('/^application_[a-z0-9_]+$/', $table)) {
            return ['ok' => false, 'error' => 'Invalid table reference.'];
        }
        if (!preg_match('/^[a-z0-9_]+$/', $idColumn)) {
            return ['ok' => false, 'error' => 'Invalid column reference.'];
        }

        $ids = array_values(array_unique(array_filter(
            array_map('intval', $recordIds),
            static fn(int $id): bool => $id > 0
        )));

        if ($ids === []) {
            return ['ok' => true, 'deleted' => 0, 'message' => 'No records to delete.'];
        }

        if ($applicantId <= 0) {
            return ['ok' => false, 'error' => 'Applicant ID is required.'];
        }

        $placeholders = [];
        $params = [':applicant_id' => $applicantId];
        foreach ($ids as $index => $id) {
            $key = ':id' . $index;
            $placeholders[] = $key;
            $params[$key] = $id;
        }

        $deleted = self::runDeleteByPrimaryKey($table, $idColumn, $placeholders, $params);
        if ($deleted === null) {
            return ['ok' => false, 'error' => 'Unable to delete record(s).'];
        }

        if ($deleted === 0) {
            return [
                'ok' => false,
                'error' => 'No matching record found for ' . $idColumn . '.',
            ];
        }

        $result = [
            'ok' => true,
            'deleted' => $deleted,
            'message' => 'Deleted successfully.',
        ];

        if (count($ids) === 1) {
            $result[$idColumn] = $ids[0];
        } else {
            $result[$idColumn . 's'] = $ids;
        }

        return $result;
    }

    /**
     * @param array<int, string> $placeholders
     * @param array<string, int> $params
     */
    private static function runDeleteByPrimaryKey(
        string $table,
        string $idColumn,
        array $placeholders,
        array $params
    ): ?int {
        $inList = implode(', ', $placeholders);
        $attempts = [
            "DELETE FROM {$table}
             WHERE {$idColumn} IN ({$inList})
               AND application_id IN (
                 SELECT h.application_id
                 FROM application_header h
                 WHERE h.applicant_id = :applicant_id
               )",
            "DELETE FROM {$table}
             WHERE {$idColumn} IN ({$inList})
               AND applicant_id = :applicant_id",
            "DELETE FROM {$table}
             WHERE {$idColumn} IN ({$inList})",
        ];

        $lastError = null;

        foreach ($attempts as $sql) {
            try {
                $stmt = Database::WriteConnection()->prepare($sql);
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, PDO::PARAM_INT);
                }
                $stmt->execute();

                return $stmt->rowCount();
            } catch (PDOException $e) {
                $lastError = $e->getMessage();
                error_log("runDeleteByPrimaryKey {$table}.{$idColumn}: " . $lastError);
            }
        }

        if ($lastError !== null) {
            error_log("runDeleteByPrimaryKey {$table}.{$idColumn} failed: " . $lastError);
        }

        return null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchEducationRowsFromTable(int $applicantId): array
    {
        return self::fetchQualificationRowsFromTable(
            $applicantId,
            'application_education',
            'education_id'
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchAdditionalRowsFromTable(int $applicantId): array
    {
        return self::fetchQualificationRowsFromTable(
            $applicantId,
            'application_additional_qualification',
            'add_qualification_id'
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchQualificationRowsFromTable(
        int $applicantId,
        string $table,
        string $idColumn
    ): array {
        if (!preg_match('/^application_[a-z0-9_]+$/', $table)) {
            return [];
        }
        if (!preg_match('/^[a-z0-9_]+$/', $idColumn)) {
            return [];
        }

        $queries = [
            "SELECT q.*
             FROM {$table} q
             INNER JOIN application_header h ON h.application_id = q.application_id
             WHERE h.applicant_id = :applicant_id
               AND COALESCE(q.is_deleted, false) = false
             ORDER BY q.{$idColumn} ASC",
            "SELECT q.*
             FROM {$table} q
             INNER JOIN application_header h ON h.application_id = q.application_id
             WHERE h.applicant_id = :applicant_id
             ORDER BY q.{$idColumn} ASC",
        ];

        foreach ($queries as $sql) {
            try {
                $stmt = Database::ReadDatabaseConnection()->prepare($sql);
                $stmt->bindValue(':applicant_id', $applicantId, PDO::PARAM_INT);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                return is_array($rows) ? $rows : [];
            } catch (PDOException $e) {
                error_log("fetchQualificationRowsFromTable {$table}: " . $e->getMessage());
            }
        }

        return [];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private static function dedupeDetailRowsById(array $rows, string $idColumn): array
    {
        $deduped = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            if (filter_var($row['is_deleted'] ?? $row['isDeleted'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                continue;
            }

            $id = self::resolveRowId($row, $idColumn);
            if ($id > 0) {
                $deduped[$id] = $row;
                continue;
            }

            $hash = md5(json_encode([
                $row['qualification_name'] ?? '',
                $row['year_of_passing'] ?? '',
                $row['university_name'] ?? '',
                $row['institution'] ?? '',
                $row['specialization'] ?? '',
                $row['marks_percentage'] ?? '',
                $row['certificate_path'] ?? '',
            ], JSON_UNESCAPED_UNICODE));
            if (!isset($deduped['h' . $hash])) {
                $deduped['h' . $hash] = $row;
            }
        }

        $list = array_values($deduped);
        usort($list, static function (array $a, array $b) use ($idColumn): int {
            return self::resolveRowId($a, $idColumn) <=> self::resolveRowId($b, $idColumn);
        });

        return $list;
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function resolveRowId(array $row, string $idColumn): int
    {
        $id = (int) ($row[$idColumn] ?? 0);
        if ($id > 0) {
            return $id;
        }

        if ($idColumn === 'add_qualification_id') {
            return (int) ($row['additional_qualification_id'] ?? $row['additionalQualificationId'] ?? 0);
        }

        if ($idColumn === 'education_id') {
            return (int) ($row['educationId'] ?? 0);
        }

        return 0;
    }

    /**
     * @return mixed
     */
    private static function callApplicantReadFunction(string $functionName, int $applicantId)
    {
        if (!preg_match('/^fn_application_[a-z0-9_]+$/', $functionName)) {
            return null;
        }

        $pdo = Database::ReadDatabaseConnection();

        try {
            $stmt = $pdo->prepare("SELECT public.{$functionName}(:applicant_id) AS result");
            $stmt->bindValue(':applicant_id', $applicantId, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                return $row['result'] ?? $row[array_key_first($row)] ?? $row;
            }
        } catch (PDOException $e) {
            error_log("{$functionName} (scalar): " . $e->getMessage());
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM public.{$functionName}(:applicant_id)");
            $stmt->bindValue(':applicant_id', $applicantId, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($rows !== []) {
                return $rows;
            }
        } catch (PDOException $e) {
            error_log("{$functionName} (setof): " . $e->getMessage());
        }

        return null;
    }

    /**
     * @param mixed $raw
     * @return array<int, array<string, mixed>>
     */
    private static function extractDetailRows($raw, string $primaryKey): array
    {
        $decoded = self::decodeJsonValue($raw);
        if ($decoded === null) {
            return [];
        }

        if (self::isListArray($decoded)) {
            return self::normalizeDetailRowList($decoded);
        }

        if (!is_array($decoded)) {
            return [];
        }

        $status = $decoded['status'] ?? $decoded['ok'] ?? null;
        if ($status !== null && !filter_var($status, FILTER_VALIDATE_BOOLEAN)) {
            return [];
        }

        foreach ([$primaryKey, 'education', 'additional_qualification', 'records', 'items', 'data'] as $key) {
            if (!isset($decoded[$key]) || !is_array($decoded[$key])) {
                continue;
            }
            if (self::isListArray($decoded[$key])) {
                return self::normalizeDetailRowList($decoded[$key]);
            }
            $nested = self::extractDetailRows($decoded[$key], $primaryKey);
            if ($nested !== []) {
                return $nested;
            }
        }

        if (self::looksLikeDetailRow($decoded)) {
            return self::normalizeDetailRowList([$decoded]);
        }

        return [];
    }

    /**
     * @param mixed $value
     * @return array<string, mixed>|array<int, mixed>|null
     */
    private static function decodeJsonValue($value)
    {
        if ($value === null || $value === false) {
            return null;
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return is_array($decoded) ? $decoded : null;
            }

            return null;
        }

        return is_array($value) ? $value : null;
    }

    /**
     * @param array<int|string, mixed> $value
     */
    private static function isListArray(array $value): bool
    {
        if ($value === []) {
            return false;
        }

        return array_keys($value) === range(0, count($value) - 1);
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function looksLikeDetailRow(array $row): bool
    {
        return isset($row['qualification_name'])
            || isset($row['education_id'])
            || isset($row['additional_qualification_id'])
            || isset($row['add_qualification_id']);
    }

    /**
     * @param array<int, mixed> $rows
     * @return array<int, array<string, mixed>>
     */
    private static function normalizeDetailRowList(array $rows): array
    {
        $normalized = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if (count($row) === 1) {
                $only = reset($row);
                if (is_string($only)) {
                    $decoded = json_decode($only, true);
                    if (is_array($decoded)) {
                        $row = $decoded;
                    }
                }
            }
            if (self::looksLikeDetailRow($row)) {
                $normalized[] = $row;
            }
        }

        return $normalized;
    }
}
