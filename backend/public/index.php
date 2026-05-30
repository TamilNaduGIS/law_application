<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Load .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        putenv(trim($line));
    }
}

use App\Core\Router;
use App\Core\Request;
use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Controllers\CaptchaController;
use App\Controllers\UserController;
use App\Controllers\OtpController;
use App\Controllers\VacancyController;
use App\Middleware\CSRFMiddleware;
use App\Controllers\ApplicationController;

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

$router = new Router();

// Routes
// 0. Health Check (GET)
$router->add('GET', '/api/health', [AuthController::class, 'health'], [
    new RateLimitMiddleware(100, 60) // Higher limit for health check
]);

$router->add('POST', '/api/refresh', [AuthController::class, 'refresh'], [
    new RateLimitMiddleware(10, 60)
]);

// CAPTCHA endpoints
$router->add('GET', '/api/captcha', [CaptchaController::class, 'generateCaptcha'], [
    new RateLimitMiddleware(10, 60)
]);
$router->add('POST', '/api/captcha/validate', [CaptchaController::class, 'validateCaptcha'], [
    new RateLimitMiddleware(20, 60)
]);

$router->add('GET', '/api/getTOKENS', [AuthController::class, 'getTokens'], [
    new RateLimitMiddleware(100, 60),
    new AuthMiddleware(),
]);

$router->add('POST', '/api/login', [UserController::class, 'login'], [
    new RateLimitMiddleware(10, 60)
]);

$router->add('POST', '/api/login/verify', [UserController::class, 'verifyLogin'], [
    new RateLimitMiddleware(10, 60)
]);

$router->add('POST', '/api/register', [UserController::class, 'createUser'], [
    new RateLimitMiddleware(10, 60)
]);

$router->add('POST', '/api/otp/send', [OtpController::class, 'sendOtp'], [
    new RateLimitMiddleware(10, 60)
]);

$router->add('POST', '/api/otp/verify', [OtpController::class, 'verifyOtp'], [
    new RateLimitMiddleware(10, 60)
]);

$router->add('POST', '/api/vacancies', [VacancyController::class, 'getVacancies'], [
    new RateLimitMiddleware(10, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/details', [VacancyController::class, 'getVacancyDetails'], [
    new RateLimitMiddleware(10, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/personal/save', [VacancyController::class, 'savePersonalInfo'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/document/upload', [VacancyController::class, 'uploadDocument'], [
    new RateLimitMiddleware(30, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/education/get', [VacancyController::class, 'getEducationDetails'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/education/save', [VacancyController::class, 'saveEducation'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/education/delete', [VacancyController::class, 'deleteEducation'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/additional/save', [VacancyController::class, 'saveAdditionalQualification'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/experience/saveExperience', [VacancyController::class, 'saveExperience'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);

$router->add('POST', '/api/vacancy/experience/fetchExperience', [VacancyController::class, 'fetchExperience'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);
$router->add('POST', '/api/application/preview', [ApplicationController::class, 'getPreviewApplication'], [
    new RateLimitMiddleware(20, 60),
    new AuthMiddleware(),
    new CSRFMiddleware(),
]);
// Dispatch the request

$request = new Request();
$router->dispatch($request);
