<?php

namespace App\Controllers;

use App\Models\OtpModal;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class OtpController
{
    private OtpModal $otpModel;

    public function __construct()
    {
        $this->otpModel = new OtpModal();
    }

    public function sendOtp(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $body = [];
        }

        $mobile = trim((string) ($body['mobile'] ?? ''));
        $purpose = trim((string) ($body['purpose'] ?? 'register')) ?: 'register';

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return $this->json($response, [
                'ok' => false,
                'error' => 'Enter a valid 10-digit mobile number.',
            ], 422);
        }

        $result = $this->otpModel->sendOtp($mobile, $purpose);

        if (!$result['ok']) {
            $fieldErrors = [];
            if (str_contains(strtolower($result['error'] ?? ''), 'mobile')) {
                $fieldErrors['mobile'] = $result['error'];
            }

            return $this->json($response, array_filter([
                'ok' => false,
                'error' => $result['error'] ?? 'Failed to send OTP.',
                'errors' => $fieldErrors ?: null,
            ], static fn ($value) => $value !== null), 400);
        }

        return $this->json($response, [
            'ok' => true,
            'message' => $result['message'] ?? 'OTP sent successfully',
        ]);
    }

    public function verifyOtp(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $body = [];
        }

        $mobile = trim((string) ($body['mobile'] ?? ''));
        $otp = trim((string) ($body['otp'] ?? ''));
        $purpose = trim((string) ($body['purpose'] ?? 'register')) ?: 'register';

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return $this->json($response, [
                'ok' => false,
                'error' => 'Enter a valid mobile number.',
            ], 422);
        }

        if (!preg_match('/^\d{6}$/', $otp)) {
            return $this->json($response, [
                'ok' => false,
                'error' => 'Enter a valid 6-digit OTP.',
            ], 422);
        }

        $result = $this->otpModel->verifyOtp($mobile, $otp, $purpose);

        if (!$result['ok']) {
            return $this->json($response, [
                'ok' => false,
                'error' => $result['error'] ?? 'OTP verification failed.',
            ], 400);
        }

        return $this->json($response, [
            'ok' => true,
            'message' => $result['message'] ?? 'OTP verified successfully',
        ]);
    }

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
