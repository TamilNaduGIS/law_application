<?php

namespace App\Core;

use App\Services\LoggerService;

class Response
{
    private int $statusCode;
    private array $data;
    private array $headers = [];

    public function __construct(array $data = [], int $statusCode = 200)
    {
        $this->statusCode = $statusCode;
        $this->data = $data;
    }

    public function addHeader(string $name, string $value): void
    {
        $this->headers[$name] = $value;
    }

    public function send(): void
    {
        http_response_code($this->statusCode);
        header('Content-Type: application/json');
        
        foreach ($this->headers as $name => $value) {
            header("$name: $value");
        }

        echo json_encode($this->data);
        exit;
    }

    public static function json(array $data, int $status = 200): self
    {
        return new self($data, $status);
    }

    public static function error(string $message, int $status = 400): self
    {
        // Log API error responses via LoggerService
        LoggerService::log("API Error Response: $message", 'ERROR', [
            'status_code' => $status
        ]);
        
        return new self(['error' => $message], $status);
    }
}
