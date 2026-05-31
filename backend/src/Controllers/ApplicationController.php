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
    public function getPreviewApplication(): Response
    {
        $data = is_array($this->requestData) ? $this->requestData : [];
        $applicationId = $data['applicant_id'] ?? null;

        if (!$applicationId) {
            return $this->json(['error' => 'applicationId is required'], 400);
        }
        
        $application = ApplicationModal::getApplicationById((int) $applicationId);

        if (!$application) {
            return $this->json(['error' => 'Application not found'], 404);
        }

        return $this->json($application);

       
    }
}