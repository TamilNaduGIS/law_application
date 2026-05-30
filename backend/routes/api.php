<?php

use Slim\App;
use App\Controllers\UserController;
use App\Controllers\OtpController;

return function (App $app) {

    $userController = new UserController();
    $otpController = new OtpController();

    $app->post('/register', [$userController, 'createUser']);
    $app->post('/user', [$userController, 'createUser']);

    $app->post('/login', [$userController, 'login']);
    $app->post('/login/verify', [$userController, 'verifyLogin']);

    $app->post('/otp/send', [$otpController, 'sendOtp']);
    $app->post('/otp/verify', [$otpController, 'verifyOtp']);
};
