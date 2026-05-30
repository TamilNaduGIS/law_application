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
    public function __construct()
    {
        parent::__construct();
        $this->sessionService = new SessionService();
    }

    public function getPreviewApplication(Request $request, Response $response)
    {
        $applicationId = $request->get('applicationId');
        $application = ApplicationModal::getApplicationById((int) $applicationId);

        if (!$application) {
            return $response->json(['error' => 'Application not found'], 404);
        }

        return $response->json($application);
    }
}