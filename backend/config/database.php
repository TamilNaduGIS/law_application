<?php

namespace App\config;
use PDO;
use PDOException;
use Exception;
class Database
{
 
    private $writer_host = "192.168.4.250";
    private $writer_port = "5432";
    private $writer_dbname = "law_officers_application";
    private $writer_username = "postgres";
    private $writer_password = "postgres";
    private $reader_host = "192.168.4.250";
    private $reader_port = "5432";
    private $reader_dbname = "law_officers_application";
    private $reader_username = "postgres";
    private $reader_password = "postgres";
    protected $reader,$writer;

    private function readConfig()
    {
        try {
            $pdo = new PDO(
                "pgsql:host={$this->reader_host};port={$this->reader_port};dbname={$this->reader_dbname}",
                $this->reader_username,
                $this->reader_password
            );
            $this->reader=$pdo;
        } catch (Exception $e) {
            die("Failed to read config: " . $e->getMessage());
        }
        return $pdo;
    }

    private function writeConfig()
    {
        try {
            $pdo = new PDO(
                "pgsql:host={$this->writer_host};port={$this->writer_port};dbname={$this->writer_dbname}",
                $this->writer_username,
                $this->writer_password
            );
            $this->writer = $pdo;
        } catch (Exception $e) {
            die("Failed to write config: " . $e->getMessage());
        }
        return $pdo;
    }

    public function connect($db)
    {
        if($db == "read"){
            try{
                $pdo = $this->readConfig();
            }catch(Exception $e){
                die("Failed to read config: " . $e->getMessage());
            }
        }elseif($db == "write"){
            try{
                $pdo = $this->writeConfig();
            }catch(Exception $e){
                die("Failed to write config: " . $e->getMessage());
            }
        }else{
            die("Invalid database connection");
        }
        try{
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }catch(Exception $e){
            die("Failed to set attribute: " . $e->getMessage());
        }
        return $pdo;
    }
}
