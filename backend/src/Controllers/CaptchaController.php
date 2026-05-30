<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Services\CapchaServices;
use App\Core\Response;

class CaptchaController extends Controller
{
    public function __construct(?Request $request = null)
    {
        if ($request !== null && !empty($request->getUser()['uid'])) {
            parent::__construct($request);
        }
    }

    public static function generateCaptcha(): Response
    {
        try {
            $captcha = CapchaServices::generateCaptcha();
            return Response::json([
                'captcha' => [
                    'image' => $captcha['datauri'],
                    'token' => $captcha['code']
                ]
            ]);
        } catch (\Throwable $e) {
            error_log('Captcha generate error: ' . $e->getMessage());
            return Response::error( $e->getMessage(), 500);
        }
    }

    public static function validateCaptcha(Request $request)
    {
        $data = $request->getData();
        $captchaToken = $data['captcha_token'] ?? '';
        $userInput = $data['user_input'] ?? '';

        if (trim($captchaToken) === '' || trim($userInput) === '') {
            return Response::error('Missing captcha token or user input', 400);
        }

        if (CapchaServices::validateCaptcha($captchaToken, $userInput)) {
            return Response::json(['success' => true]);
        }

        return Response::error('Invalid captcha', 422);
    }
}
