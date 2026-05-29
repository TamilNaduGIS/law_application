<?php

namespace App\Models;

require_once __DIR__ . '/../../config/database.php';

class UserModel
{
    private $db;

    public function __construct()
    {
        $database = new \Database();

        $this->db = $database->connect();
    }

    // GET USERS
    public function getAllUsers()
    {
        $query = "SELECT * FROM users ORDER BY id DESC";

        $stmt = $this->db->prepare($query);

        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // INSERT USER
    public function createUser($data)
    {
        $query = "INSERT INTO users(name, email)
                  VALUES(:name, :email)";

        $stmt = $this->db->prepare($query);

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);

        $stmt->execute();

        return [
            "success" => true,
            "message" => "User Created"
        ];
    }
}