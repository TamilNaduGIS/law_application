<?php

namespace App\Controllers;

use App\Models\UserModel;

class UserController
{
    private $userModel;

    public function __construct()
    {
        // Model connection
        $this->userModel = new UserModel();
    }

    // GET API
    public function getUsers($request, $response)
    {
        $users = $this->userModel->getAllUsers();

        $response->getBody()->write(json_encode($users));

        return $response->withHeader('Content-Type', 'application/json');
    }

    // POST API
    public function createUser($request, $response)
    {
        $data = $request->getParsedBody();

        $result = $this->userModel->createUser($data);

        $response->getBody()->write(json_encode($result));

        return $response->withHeader('Content-Type', 'application/json');
    }
}