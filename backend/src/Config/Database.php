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
        // Fetch credentials from AWS Secret Manager or .env
        // $host = AWSSecretManager::getSecret('host', AWSSecretManager::getSecret('host'));
        // $port = AWSSecretManager::getSecret('port', AWSSecretManager::getSecret('DB_PORT', '5432'));
        // $dbName = AWSSecretManager::getSecret('dbname', AWSSecretManager::getSecret('dbname', 'ssp_api_db'));
        // $username = $secrets['username'];
        $host = '192.168.4.250';
        $port = 5432;
        $dbName = 'law_officers_application';
        // $username = $secrets['username'];
        // $password = $secrets['password'];
        $username = 'postgres';
        $password = 'postgres';


        // If AWS secret 'password' is not set, fallback to DB_PASS env or empty string
        if ($password === null) {
            $password = AWSSecretManager::getSecret('DB_PASS', '');
        }

        if (self::$instance === null) {
            // $host = getenv('DB_HOST') ?: 'localhost';
            // $port = getenv('DB_PORT') ?: '5432';
            // $dbName = getenv('DB_NAME') ?: 'inv';
            // $username = getenv('DB_USER') ?: 'postgres';
            // $password = getenv('DB_PASS') ?: 'postgres';

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
        // Fetch credentials from AWS Secret Manager or .env
        // $host = AWSSecretManager::getSecret('host', AWSSecretManager::getSecret('host'));
        // $port = AWSSecretManager::getSecret('port', AWSSecretManager::getSecret('DB_PORT', '5432'));
        // $dbName = AWSSecretManager::getSecret('dbname', AWSSecretManager::getSecret('dbname', 'ssp_api_db'));
        // $username = $secrets['username'];
        $host = '192.168.4.250';
        $port = 5432;
        $dbName = 'law_officers_application';
        // $username = $secrets['username'];
        // $password = $secrets['password'];
        $username = 'postgres';
        $password = 'postgres';


        // If AWS secret 'password' is not set, fallback to DB_PASS env or empty string
        if ($password === null) {
            $password = AWSSecretManager::getSecret('DB_PASS', '');
        }

        if (self::$instance === null) {
            // $host = getenv('DB_HOST') ?: 'localhost';
            // $port = getenv('DB_PORT') ?: '5432';
            // $dbName = getenv('DB_NAME') ?: 'inv';
            // $username = getenv('DB_USER') ?: 'postgres';
            // $password = getenv('DB_PASS') ?: 'postgres';

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

    public static function getUmisConnection(): PDO
    {
        if (self::$umisInstance === null) {
            $host = getenv('UMIS_DB_HOST');
            $port = getenv('UMIS_DB_PORT');
            $dbName = getenv('UMIS_DB_NAME');
            $username = getenv('UMIS_DB_USER');
            $password = getenv('UMIS_DB_PASS');

            try {
                $dsn = "pgsql:host=$host;port=$port;dbname=$dbName";
                self::$umisInstance = self::createConnection($dsn, $username, $password);
            } catch (PDOException $e) {
                error_log("UMIS Database Connection Error: " . $e->getMessage());
                throw new \Exception("Could not connect to the UMIS database. " . $e->getMessage());
            }
        }
        return self::$umisInstance;
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
