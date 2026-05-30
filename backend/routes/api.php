<?php

use Slim\App;
use App\Controllers\UserController;

return function (App $app) {

    $userController = new UserController();

    $app->post('/register', [$userController, 'createUser']);
    $app->post('/user', [$userController, 'createUser']);
};
