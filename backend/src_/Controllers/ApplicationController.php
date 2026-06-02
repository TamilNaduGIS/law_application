<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Controller;
use App\Helpers\EncryptionHelper;
use App\Services\SessionService;
use App\Models\ApplicationModal;


class ApplicationController extends Controller
{
    public function getPreviewApplication(Request $request): Response
    {
        $data = is_array($this->requestData) ? $this->requestData : [];

        // FIX 3: accept either applicant_id (from JS payload) or fall back
        // to the JWT-authenticated user id so the endpoint works even if the
        // client sends no explicit id (the authenticated user IS the applicant).
        $applicantId = (int) ($data['applicant_id'] ?? $data['applicationId'] ?? $this->sessionUserId ?? 0);

        if (!$applicantId) {
            return $this->json(['error' => 'applicant_id is required'], 400);
        }

        // FIX 2: use getPreviewApplicationById which calls fn_application_preview
        $application = ApplicationModal::getPreviewApplicationById($applicantId);

        if (!$application) {
            return $this->json(['error' => 'Application not found'], 404);
        }

        return $this->encryptResponse($application);
    }

    public function submitApplication(Request $request): Response
    {
        $data = is_array($this->requestData) ? $this->requestData : [];

        $applicationId = (int) ($data['application_id'] ?? $data['applicationId'] ?? 0);
        $applicantId = (int) ($data['applicant_id'] ?? $data['applicantId'] ?? $this->sessionUserId ?? 0);

        if ($applicationId <= 0 && $applicantId > 0) {
            $applicationId = ApplicationModal::resolveApplicationId($applicantId, $data);
        }

        if ($applicationId <= 0) {
            return $this->json(['error' => 'application_id is required'], 400);
        }

        $selections = $data['selections'] ?? [];
        if (!is_array($selections)) {
            $selections = [];
        }

        if (empty($selections)) {
            return $this->json([
                'error' => 'At least one selection (post_id, court, court_id) is required.',
            ], 400);
        }

        $result = ApplicationModal::submitApplicationSelections($applicationId, $selections);

        if (!is_array($result)) {
            return $this->json([
                'error' => 'submitApplicationSelections returned null',
            ], 500);
        }

        if (empty($result['ok'])) {
            return $this->json([
                'error' => $result['error'] ?? 'Failed to submit application',
            ], 500);
        }

        return $this->json([
            'ok' => true,
            'message' => $result['message'] ?? 'Application submitted successfully',
            'application_id' => $result['application_id'] ?? $applicationId,
        ]);
    }
}
