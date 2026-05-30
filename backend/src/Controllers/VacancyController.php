<?php
namespace App\Controllers;
use App\Core\Controller;
use PDO;
use PDOException;
use App\Config\Database;
use App\Core\Response;

class VacancyController extends Controller
{
    public function getVacancies():Response
    {
        $query = "SELECT * FROM public.fn_get_available_posts()";
        $result = Database::ReadDatabaseConnection()->query($query);
        $data = $result->fetchAll(PDO::FETCH_ASSOC);
        return $this->encryptResponse($data);
    }
}