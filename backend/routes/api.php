<?php

use Slim\App;
use App\Controllers\UserController;

return function (App $app) {

    $userController = new UserController();

    // GET
    $app->get('/users', [$userController, 'getUsers']);

    // POST
    $app->post('/user', [$userController, 'createUser']);
    
};