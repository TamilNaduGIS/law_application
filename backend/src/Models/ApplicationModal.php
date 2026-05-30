<?php

namespace App\Models;
use App\config\Database;
use PDO;
use PDOException;


class ApplicationModal
{
    /**
     * @param int $applicantId
     * @return array{ok: bool, message?: string, error?: string, application_id?: int|null}
     */
    public static function createApplication(int $applicantId): array
    {
        try {
            $stmt = Database::WriteConnection()->prepare("CALL public.sp_application_create(:applicant_id, NULL)");
            $stmt->bindParam(':applicant_id', $applicantId, PDO::PARAM_INT);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($result)) {
                return ['ok' => false, 'error' => 'Unexpected response from application service.'];
            }

            $status = filter_var($result['status'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($status) {
                return [
                    'ok' => true,
                    'message' => $result['message'] ?? 'Application Created Successfully',
                    'application_id' => isset($result['application_id']) ? (int) $result['application_id'] : null,
                ];
            }

            return [
                'ok' => false,
                'error' => $result['message'] ?? 'Application creation failed.',
            ];
        } catch (PDOException $e) {
            return [
                'ok' => false,
                'error' => 'Application creation failed. Please try again later.',
            ];
        }
    }

    public static function getApplicationById(int $applicationId): ?array
    {
        try {
            
            $data = json_encode(['application_id' => (int)$applicationId]);
            $stmt = Database::ReadDatabaseConnection()->prepare("CALL public.sp_application_preview(:data::jsonb)");
            $stmt->bindParam(':data', $data, PDO::PARAM_STR);
            $stmt->execute();

            $application = $stmt->fetch(PDO::FETCH_ASSOC);

            return $application ?: null;
        } catch (PDOException $e) {
            return null;
        }
    }
}