<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Models\OtpModal;

class OtpController extends Controller
{
    public function sendOtp(Request $request): Response
    {
        $data = $request->getData();

        $mobile = trim((string) ($data['mobile'] ?? ''));
        $purpose = trim((string) ($data['purpose'] ?? 'register')) ?: 'register';

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return Response::json([
                'ok' => false,
                'error' => 'Enter a valid 10-digit mobile number.',
            ], 422);
        }

        $result = OtpModal::sendOtp($mobile, $purpose);

        if (!$result['ok']) {
            $fieldErrors = [];
            if (str_contains(strtolower($result['error'] ?? ''), 'mobile')) {
                $fieldErrors['mobile'] = $result['error'];
            }

            return Response::json(array_filter([
                'ok' => false,
                'error' => $result['error'] ?? 'Failed to send OTP.',
                'errors' => $fieldErrors ?: null,
            ], static fn ($value) => $value !== null), 400);
        }

        return Response::json([
            'ok' => true,
            'message' => $result['message'] ?? 'OTP sent successfully',
        ]);
    }

    public function verifyOtp(Request $request): Response
    {
        $data = $request->getData();

        $mobile = trim((string) ($data['mobile'] ?? ''));
        $otp = trim((string) ($data['otp'] ?? ''));
        $purpose = trim((string) ($data['purpose'] ?? 'register')) ?: 'register';

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return Response::json([
                'ok' => false,
                'error' => 'Enter a valid mobile number.',
            ], 422);
        }

        if (!preg_match('/^\d{6}$/', $otp)) {
            return Response::json([
                'ok' => false,
                'error' => 'Enter a valid 6-digit OTP.',
            ], 422);
        }

        $result = OtpModal::verifyOtp($mobile, $otp, $purpose);

        if (!$result['ok']) {
            return Response::json([
                'ok' => false,
                'error' => $result['error'] ?? 'OTP verification failed.',
            ], 400);
        }

        return Response::json([
            'ok' => true,
            'message' => $result['message'] ?? 'OTP verified successfully',
        ]);
    }
}
