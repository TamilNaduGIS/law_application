<?php

namespace App\Config;

use PDO;
use PDOException;

use App\Config\AWSSecretManager;

class Database
{
    private static ?PDO $instance = null;
    private static ?PDO $umisInstance = null;

    public static function ReadDatabaseConnection(): PDO
    {
      
        $host = '192.168.4.250';
        $port = 5432;
        $dbName = 'law_officers_application';
        $username = 'postgres';
        $password = 'postgres';


        // If AWS secret 'password' is not set, fallback to DB_PASS env or empty string
        if ($password === null) {
            $password = AWSSecretManager::getSecret('DB_PASS', '');
        }

        if (self::$instance === null) {

            try {
                $dsn = "pgsql:host=$host;port=$port;dbname=$dbName";
                self::$instance = self::createConnection($dsn, $username, $password);
            } catch (PDOException $e) {
                error_log("Main Database Connection Error: " . $e->getMessage());
                throw new \Exception("Could not connect to the main database. " . $e->getMessage());
            }
        }
        return self::$instance;
    }


    public static function WriteConnection(): PDO
    {

        $host = '192.168.4.250';
        $port = 5432;
        $dbName = 'law_officers_application';
        $username = 'postgres';
        $password = 'postgres';


        // If AWS secret 'password' is not set, fallback to DB_PASS env or empty string
        if ($password === null) {
            $password = AWSSecretManager::getSecret('DB_PASS', '');
        }

        if (self::$instance === null) {

            try {
                $dsn = "pgsql:host=$host;port=$port;dbname=$dbName";
                self::$instance = self::createConnection($dsn, $username, $password);
            } catch (PDOException $e) {
                error_log("Main Database Connection Error: " . $e->getMessage());
                throw new \Exception("Could not connect to the main database. " . $e->getMessage());
            }
        }
        return self::$instance;
    }



    private static function createConnection(string $dsn, string $username, string $password): PDO
    {
        return new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3,
        ]);
    }
}
