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
            $stmt = Database::ReadConnection()->prepare("SELECT * FROM applications WHERE id = :application_id");
            $stmt->bindParam(':application_id', $applicationId, PDO::PARAM_INT);
            $stmt->execute();

            $application = $stmt->fetch(PDO::FETCH_ASSOC);

            return $application ?: null;
        } catch (PDOException $e) {
            return null;
        }
    }
}