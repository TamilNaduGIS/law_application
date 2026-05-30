<?php
namespace App\Helpers;
class DataTransferHandler {
    private $transferMode;

    public function __construct($mode = 'json') {
        $this->setTransferMode($mode);
    }
    
    public function setTransferMode($mode) {
        $allowedModes = ['json', 'binary', 'compressed-binary', 'compressed-json'];
        $this->transferMode = in_array($mode, $allowedModes) ? $mode : 'json';
    }

    public function sendResponse($data) {
        switch ($this->transferMode) {
            case 'binary':
                $this->sendBinaryResponse($data);
                break;
            case 'compressed-binary':
                $this->sendCompressedBinaryResponse($data);
                break;
            case 'compressed-json': 
                $this->sendCompressedJsonResponse($data);
                break;
            default:
                $this->sendJsonResponse($data);
        }
    }

    private function sendJsonResponse($data) {
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function sendBinaryResponse($data) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="data.bin"');
        echo serialize($data);
    }

    private function sendCompressedBinaryResponse($data) {
        header('Content-Type: application/octet-stream');
        header('Content-Encoding: gzip');
        echo gzencode(serialize($data));
    }

    private function sendCompressedJsonResponse($data) {
        header('Content-Type: application/json');
        header('Content-Encoding: gzip');
        $jsonData = json_encode($data);
        echo gzencode($jsonData);
    }
}