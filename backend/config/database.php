<?php

class Database
{
    private $host = "localhost";
    private $port = "5432";
    private $dbname = "test_db";
    private $username = "postgres";
    private $password = "password";

    public function connect()
    {
        try {

            $pdo = new PDO(
                "pgsql:host={$this->host};port={$this->port};dbname={$this->dbname}",
                $this->username,
                $this->password
            );

            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            return $pdo;

        } catch (PDOException $e) {

            die("PostgreSQL Connection Failed: " . $e->getMessage());
        }
    }
}