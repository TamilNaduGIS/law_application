<?php

namespace App\Controllers;

use App\Models\UserRegisterModal;
use App\Models\OtpModal;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    private UserRegisterModal $registerModel;
    private OtpModal $otpModel;

    private const MARITAL_MAP = [
        'S' => 'Single',
        'M' => 'Married',
        'D' => 'Divorced',
        'W' => 'Widowed',
    ];

    public function __construct()
    {
        $this->registerModel = new UserRegisterModal();
        $this->otpModel = new OtpModal();
    }

    public function createUser(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $body = [];
        }

        $errors = $this->validateRegistration($body);
        if ($errors !== []) {
            return $this->json($response, ['ok' => false, 'errors' => $errors], 422);
        }

        $payload = $this->normalizeRegistration($body);
        $result = $this->registerModel->createAccount($payload);

        if (!$result['ok']) {
            $error = $result['error'] ?? 'Registration failed.';
            $fieldErrors = $this->mapProcedureError($error);

            if ($fieldErrors !== []) {
                return $this->json($response, [
                    'ok' => false,
                    'error' => $error,
                    'errors' => $fieldErrors,
                ], 400);
            }

            return $this->json($response, [
                'ok' => false,
                'error' => $error,
            ], 400);
        }

        return $this->json($response, [
            'ok' => true,
            'message' => $result['message'] ?? 'Account Created Successfully',
            'applicant_id' => $result['applicant_id'] ?? null,
        ], 201);
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, string>
     */
    private function validateRegistration(array $body): array
    {
        $errors = [];

        $name = trim((string) ($body['advocateName'] ?? ''));
        if ($name === '') {
            $errors['advocateName'] = 'Advocate name is required.';
        } elseif (mb_strlen($name) < 2) {
            $errors['advocateName'] = 'Advocate name must be at least 2 characters.';
        }

        $fatherName = trim((string) ($body['fatherName'] ?? ''));
        if ($fatherName === '') {
            $errors['fatherName'] = "Father's name is required.";
        }

        $enrolment = strtoupper(trim((string) ($body['enrolmentNo'] ?? '')));
        if ($enrolment === '') {
            $errors['enrolmentNo'] = 'Bar Council enrolment number is required.';
        } elseif (!preg_match('/^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2}$/', $enrolment)) {
            $errors['enrolmentNo'] = 'Invalid format. Use AB/1234/YY';
        }

        $enrolmentSr = strtoupper(trim((string) ($body['enrolmentNoSr'] ?? '')));
        if ($enrolmentSr !== '' && !preg_match('/^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2}SR$/', $enrolmentSr)) {
            $errors['enrolmentnosr'] = 'Invalid format. Use AB/1234/YYSR';
        }

        $enrolmentDate = trim((string) ($body['enrolmentDate'] ?? ''));
        if ($enrolmentDate === '') {
            $errors['enrolmentDate'] = 'Enrolment date is required.';
        } elseif (!$this->isValidDate($enrolmentDate)) {
            $errors['enrolmentDate'] = 'Enter a valid enrolment date.';
        } elseif (strtotime($enrolmentDate) > strtotime('today')) {
            $errors['enrolmentDate'] = 'Enrolment date cannot be in the future.';
        }

        $pan = strtoupper(trim((string) ($body['pan'] ?? '')));
        if ($pan === '') {
            $errors['pan'] = 'PAN number is required.';
        } elseif (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/', $pan)) {
            $errors['pan'] = 'Enter a valid PAN (format: ABCDE1234F).';
        }

        $expYears = $body['expyears'] ?? '';
        if ($expYears === '' || $expYears === null) {
            $errors['expyears'] = 'Total years of practice is required.';
        } elseif (!is_numeric($expYears) || (float) $expYears < 0 || (float) $expYears > 50) {
            $errors['expyears'] = 'Years of practice must be between 0 and 50.';
        }

        $mobile = trim((string) ($body['mobile'] ?? ''));
        if ($mobile === '') {
            $errors['mobile'] = 'Mobile number is required.';
        } elseif (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            $errors['mobile'] = 'Enter a valid 10-digit Indian mobile number.';
        }

        if ($mobile !== '' && preg_match('/^[6-9]\d{9}$/', $mobile)) {
            $mobileVerified = filter_var(
                $body['mobileVerified'] ?? $body['is_mobile_verified'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            if (!$mobileVerified) {
                if (!isset($errors['mobile'])) {
                    $errors['mobile'] = 'Please verify your mobile number with OTP.';
                }
            } else {
                $otpStatus = $this->otpModel->isOtpVerified($mobile, 'register');
                if (!$otpStatus['ok'] && !isset($errors['mobile'])) {
                    $errors['mobile'] = $otpStatus['error'] ?? 'Please verify your mobile number with OTP.';
                }
            }
        }

        $phone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
        if ($phone !== '' && !preg_match('/^\d{10,15}$/', $phone)) {
            $errors['phone'] = 'Enter a valid phone number.';
        }

        $email = trim((string) ($body['email'] ?? ''));
        if ($email === '') {
            $errors['email'] = 'Email is required.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        $gender = (string) ($body['gender'] ?? '');
        if (!in_array($gender, ['M', 'F', 'O'], true)) {
            $errors['gender'] = 'Select a valid gender.';
        }

        $marital = (string) ($body['maritalStatus'] ?? '');
        if (!array_key_exists($marital, self::MARITAL_MAP)) {
            $errors['maritalStatus'] = 'Select a valid marital status.';
        }

        $dob = trim((string) ($body['dob'] ?? ''));
        if ($dob === '') {
            $errors['dob'] = 'Date of birth is required.';
        } elseif (!$this->isValidDate($dob)) {
            $errors['dob'] = 'Enter a valid date of birth.';
        } elseif (!$this->isAtLeastAge($dob, 18)) {
            $errors['dob'] = 'You must be at least 18 years old to register.';
        }

        $nationality = trim((string) ($body['nationality'] ?? ''));
        if ($nationality === '') {
            $errors['nationality'] = 'Nationality is required.';
        }

        $community = trim((string) ($body['community'] ?? ''));
        if ($community === '') {
            $errors['community'] = 'Community is required.';
        }

        $caste = trim((string) ($body['caste'] ?? ''));
        if ($community !== '' && $caste === '') {
            $errors['caste'] = 'Caste is required.';
        }

        if ($caste === 'Others') {
            $otherCaste = trim((string) ($body['otherCaste'] ?? ''));
            if ($otherCaste === '') {
                $errors['otherCaste'] = 'Please enter your caste name.';
            }
        }

        return $errors;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function normalizeRegistration(array $body): array
    {
        $maritalCode = (string) ($body['maritalStatus'] ?? 'S');
        $enrolment = strtoupper(trim((string) $body['enrolmentNo']));
        $enrolmentSr = strtoupper(trim((string) ($body['enrolmentNoSr'] ?? '')));
        $isSenior = filter_var($body['isSeniorAdvocate'] ?? false, FILTER_VALIDATE_BOOLEAN) || $enrolmentSr !== '';

        $password = trim((string) ($body['password'] ?? ''));
        if ($password === '') {
            $password = bin2hex(random_bytes(8));
        }

        $expYears = $body['expyears'] ?? 0;

        return [
            'applicant_name' => trim((string) $body['advocateName']),
            'father_name' => trim((string) ($body['fatherName'] ?? '')),
            'bar_council_number' => $enrolment,
            'enrollment_no' => $enrolment,
            'enrollment_date' => trim((string) $body['enrolmentDate']),
            'is_senior_advocate' => $isSenior,
            'senior_advocate_enrollment_no' => $enrolmentSr !== '' ? $enrolmentSr : null,
            'years_of_practice_hcm' => (float) $expYears,
            'mobile_no' => trim((string) $body['mobile']),
            'phone_no' => trim((string) ($body['phone'] ?? '')),
            'email_id' => trim((string) $body['email']),
           
            'gender' => (string) $body['gender'],
            'marital_status' => self::MARITAL_MAP[$maritalCode],
            'dob' => trim((string) $body['dob']),
            'nationality' => trim((string) ($body['nationality'] ?? 'Indian')) ?: 'Indian',
            'religion' => trim((string) ($body['religion'] ?? '')),
            'community' => trim((string) $body['community']),
            'pan_no' => strtoupper(trim((string) $body['pan'])),
            'aadhaar_no' => trim((string) ($body['aadhaarNo'] ?? '')) ?: null,
            'created_by' => (int) ($body['createdBy'] ?? 1),
        ];
    }

    private function isValidDate(string $date): bool
    {
        $dt = \DateTime::createFromFormat('Y-m-d', $date);
        return $dt && $dt->format('Y-m-d') === $date;
    }

    private function isAtLeastAge(string $dob, int $minAge): bool
    {
        $birth = new \DateTime($dob);
        $today = new \DateTime('today');
        return (int) $birth->diff($today)->y >= $minAge;
    }

    /**
     * Map stored-procedure duplicate messages to form field keys.
     *
     * @return array<string, string>
     */
    private function mapProcedureError(string $message): array
    {
        $normalized = strtolower(trim($message));

        if (str_contains($normalized, 'mobile')) {
            return ['mobile' => $message];
        }

        if (str_contains($normalized, 'email')) {
            return ['email' => $message];
        }

        if (str_contains($normalized, 'enrollment') || str_contains($normalized, 'enrolment')) {
            return ['enrolmentNo' => $message];
        }

        return [];
    }

    public function login(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $body = [];
        }

        $mobile = trim((string) ($body['mobile'] ?? $body['mobile_no'] ?? ''));
        $enrollment = strtoupper(trim((string) (
            $body['enrollment_no'] ?? $body['enrolmentNo'] ?? $body['enrollmentNo'] ?? ''
        )));

        $errors = [];

        if ($enrollment === '') {
            $errors['enrolmentNumber'] = 'Bar Council enrolment number is required.';
        } elseif (!preg_match('/^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2,4}$/', $enrollment)) {
            $errors['enrolmentNumber'] = 'Invalid format. Use AB/1234/YY';
        }

        if ($mobile === '') {
            $errors['mobileNumber'] = 'Mobile number is required.';
        } elseif (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            $errors['mobileNumber'] = 'Enter a valid 10-digit mobile number.';
        }

        if ($errors !== []) {
            return $this->json($response, ['ok' => false, 'errors' => $errors], 422);
        }

        $loginResult = $this->registerModel->loginApplicant($mobile, $enrollment);

        if (!$loginResult['ok']) {
            return $this->json($response, [
                'ok' => false,
                'error' => $loginResult['error'] ?? 'Invalid enrolment number or mobile number.',
            ], 400);
        }

        $otpResult = $this->otpModel->sendOtp($mobile, 'login');

        if (!$otpResult['ok']) {
            return $this->json($response, [
                'ok' => false,
                'error' => $otpResult['error'] ?? 'Failed to send OTP.',
            ], 400);
        }

        return $this->json($response, [
            'ok' => true,
            'message' => 'OTP sent successfully',
            'applicant_id' => $loginResult['applicant_id'] ?? null,
            'enrollment_no' => $enrollment,
            'mobile' => $mobile,
        ]);
    }

    public function verifyLogin(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $body = [];
        }

        $mobile = trim((string) ($body['mobile'] ?? $body['mobile_no'] ?? ''));
        $otp = trim((string) ($body['otp'] ?? ''));
        $enrollment = strtoupper(trim((string) (
            $body['enrollment_no'] ?? $body['enrolmentNo'] ?? $body['enrollmentNo'] ?? ''
        )));
        $applicantId = (int) ($body['applicant_id'] ?? $body['applicantId'] ?? 0);

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return $this->json($response, ['ok' => false, 'error' => 'Enter a valid mobile number.'], 422);
        }

        if (!preg_match('/^\d{6}$/', $otp)) {
            return $this->json($response, ['ok' => false, 'error' => 'Enter a valid 6-digit OTP.'], 422);
        }

        $otpResult = $this->otpModel->verifyOtp($mobile, $otp, 'login');

        if (!$otpResult['ok']) {
            return $this->json($response, [
                'ok' => false,
                'error' => $otpResult['error'] ?? 'OTP verification failed.',
            ], 400);
        }

        return $this->json($response, [
            'ok' => true,
            'message' => 'Login successful',
            'session' => [
                'applicant_id' => $applicantId ?: null,
                'enrollment_no' => $enrollment,
                'mobile' => $mobile,
            ],
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
