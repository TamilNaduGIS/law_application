<?php

namespace App\Controllers;

use App\Models\UserRegisterModal;
use App\Models\OtpModal;
use App\Core\Request;
use App\Core\Response;
use App\Core\Controller;
use App\Helpers\EncryptionHelper;
use App\Services\SessionService;
use App\Services\CapchaServices;
use App\Helpers\JWTHelper;

class UserController extends Controller
{

    private const MARITAL_MAP = [
        'S' => 'Single',
        'M' => 'Married',
        'D' => 'Divorced',
        'W' => 'Widowed',
    ];

 
    public  function createUser(Request $request): Response
    {
        $data = $request->getData();

        if (empty($data['captcha_token']) || empty($data['captcha_answer'])) {
            return $this->error('CAPTCHA token and answer are required', 400);
        }

        if (!CapchaServices::validateCaptcha($data['captcha_token'], $data['captcha_answer'])) {
            return $this->error('Invalid CAPTCHA', 422);
        }
         

        $errors = self::validateRegistration($data);
        if ($errors !== []) {
            return Response::json([
                'ok' => false,
                'error' => 'Validation errors',
                'errors' => $errors,
            ], 422);
        }

        $payload = self::normalizeRegistration($data);
        $result = UserRegisterModal::createAccount($payload);

        if (!$result['ok']) {
            $error = $result['error'] ?? 'Registration failed.';
            $fieldErrors = self::mapProcedureError($error);

            return Response::json(array_filter([
                'ok' => false,
                'error' => $error,
                'errors' => $fieldErrors ?: null,
            ], static fn ($value) => $value !== null), 400);
        }

        return Response::json([
            'ok' => true,
            'message' => $result['message'] ?? 'Account Created Successfully',
            'applicant_id' => $result['applicant_id'] ?? null,
        ], 201);
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, string>
     */
    private static function validateRegistration(array $body): array
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
        } elseif (!preg_match('/^[A-Z]{2}\/[0-9]{4}\/[0-9]{4}$/', $enrolment)) {
            $errors['enrolmentNo'] = 'Invalid format. Use MS/1234/0123';
        }

        $enrolmentSr = strtoupper(trim((string) ($body['enrolmentNoSr'] ?? '')));
        if ($enrolmentSr !== '' && !preg_match('/^[A-Z]{2}\/[0-9]{4}\/[0-9]{4}SR$/', $enrolmentSr)) {
            $errors['enrolmentnosr'] = 'Invalid format. Use MS/1234/0123SR';
        }

        $enrolmentDate = trim((string) ($body['enrolmentDate'] ?? ''));
        if ($enrolmentDate === '') {
            $errors['enrolmentDate'] = 'Enrolment date is required.';
        } elseif (!self::isValidDate($enrolmentDate)) {
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
                $otpStatus = OtpModal::isOtpVerified($mobile, 'register');
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
        } elseif (!self::isValidDate($dob)) {
            $errors['dob'] = 'Enter a valid date of birth.';
        } elseif (!self::isAtLeastAge($dob, 18)) {
            $errors['dob'] = 'You must be at least 18 years old to register.';
        }

        $nationality = trim((string) ($body['nationality'] ?? ''));
        if ($nationality === '') {
            $errors['nationality'] = 'Nationality is required.';
        }

        $religion = trim((string) ($body['religion'] ?? ''));
        $allowedReligions = [
            'Buddhist',
            'Christian',
            'Hindu',
            'Muslim',
            'Jain',
            'Others',
            'Sikh',
            'Parsi',
            'Not Stated',
            'Zoroastrian',
        ];
        if ($religion === '') {
            $errors['religion'] = 'Religion is required.';
        } elseif (!in_array($religion, $allowedReligions, true)) {
            $errors['religion'] = 'Select a valid religion.';
        }

        $community = trim((string) ($body['community'] ?? ''));
        if ($community === '') {
            $errors['community'] = 'Community is required.';
        }

        $caste = trim((string) ($body['caste'] ?? ''));
        if ($caste === '') {
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
    private static function normalizeRegistration(array $body): array
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
            'caste' => trim((string) $body['caste']),
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

    private static function isValidDate(string $date): bool
    {
        $dt = \DateTime::createFromFormat('Y-m-d', $date);
        return $dt && $dt->format('Y-m-d') === $date;
    }

    private static function isAtLeastAge(string $dob, int $minAge): bool
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
    private static function mapProcedureError(string $message): array
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

    public function login(Request $request): Response
    {
        $data = $request->getData();

        $mobile = trim((string) ($data['mobile'] ?? $data['mobile_no'] ?? ''));
        $enrollment = strtoupper(trim((string) (
            $data['enrollment_no'] ?? $data['enrolmentNo'] ?? $data['enrollmentNo'] ?? ''
        )));

        $errors = [];

        if ($enrollment === '') {
            $errors['enrolmentNumber'] = 'Bar Council enrolment number is required.';
        } elseif (!preg_match('/^[A-Z]{2}\/[0-9]{4}\/[0-9]{4}$/', $enrollment)) {
            $errors['enrolmentNumber'] = 'Invalid format. Use MS/1234/0123';
        }

        if ($mobile === '') {
            $errors['mobileNumber'] = 'Mobile number is required.';
        } elseif (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            $errors['mobileNumber'] = 'Enter a valid 10-digit mobile number.';
        }

        if ($errors !== []) {
            return Response::json([
                'ok' => false,
                'error' => 'Validation errors',
                'errors' => $errors,
            ], 422);
        }

        $loginResult = UserRegisterModal::loginApplicant($mobile, $enrollment);

        if (!$loginResult['ok']) {
            return Response::json([
                'ok' => false,
                'error' => $loginResult['error'] ?? 'Invalid enrolment number or mobile number.',
            ], 400);
        }

        $otpResult = OtpModal::sendOtp($mobile, 'login');

        if (!$otpResult['ok']) {
            return Response::json([
                'ok' => false,
                'error' => $otpResult['error'] ?? 'Failed to send OTP.',
            ], 400);
        }

        return Response::json([
            'ok' => true,
            'message' => 'OTP sent successfully',
            'applicant_id' => $loginResult['applicant_id'] ?? null,
            'enrollment_no' => $enrollment,
            'mobile' => $mobile,
        ], 200);
    }

    public function verifyLogin(Request $request): Response
    {
        $data = $request->getData();
        $mobile = trim((string) ($data['mobile'] ?? $data['mobile_no'] ?? ''));
        $otp = trim((string) ($data['otp'] ?? ''));
        $enrollment = strtoupper(trim((string) (
            $data['enrollment_no'] ?? $data['enrolmentNo'] ?? $data['enrollmentNo'] ?? ''
        )));
        $applicantId = (int) ($data['applicant_id'] ?? $data['applicantId'] ?? 0);

        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return Response::json(['ok' => false, 'error' => 'Enter a valid mobile number.'], 422);
        }

        if (!preg_match('/^\d{6}$/', $otp)) {
            return Response::json(['ok' => false, 'error' => 'Enter a valid 6-digit OTP.'], 422);
        }

        $otpResult = OtpModal::verifyOtp($mobile, $otp, 'login');

        if (!$otpResult['ok']) {
            return Response::json([
                'ok' => false,
                'error' => $otpResult['error'] ?? 'OTP verification failed.',
            ], 400);
        }

        if ($applicantId <= 0) {
            $loginCheck = UserRegisterModal::loginApplicant($mobile, $enrollment);
            if ($loginCheck['ok'] && !empty($loginCheck['applicant_id'])) {
                $applicantId = (int) $loginCheck['applicant_id'];
            }
        } else {
            $loginCheck = UserRegisterModal::loginApplicant($mobile, $enrollment);
        }

        $applicantName = '';
        if (!empty($loginCheck['ok']) && !empty($loginCheck['data']) && is_array($loginCheck['data'])) {
            $profile = $loginCheck['data'];
            $applicantName = trim((string) (
                $profile['applicant_name']
                ?? $profile['advocate_name']
                ?? $profile['name']
                ?? ''
            ));
        }

        $encryptionKey = EncryptionHelper::generateUserKey();
        $csrfToken = bin2hex(random_bytes(32));
        $access = JWTHelper::generate($applicantId, ['user'], 150000, false);
        $refresh = JWTHelper::generate($applicantId, ['user'], 144000, true);

        SessionService::createSession(
            $applicantId,
            ['user'],
            $encryptionKey,
            $csrfToken,
            $access['jti'],
            $refresh['jti'],
            $mobile
        );

        return Response::json([
            'ok' => true,
            'message' => 'Login successful',
            'session' => [
                'applicant_id' => $applicantId,
                'enrollment_no' => $enrollment,
                'mobile' => $mobile,
                'applicant_name' => $applicantName,
                'access_token' => $access['token'],
                'refresh_token' => $refresh['token'],
                'encryption_key' => $encryptionKey,
                'csrf_token' => $csrfToken,
            ],
        ], 200);
    }
}
