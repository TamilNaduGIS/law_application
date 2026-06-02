<?php

namespace App\Core;

class Request
{
    private array $data;
    private array $headers;
    private string $method;
    private array $user = [];

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->headers = getallheaders();
        $this->data = json_decode(file_get_contents('php://input'), true) ?? $_REQUEST;
    }

    public function getHeader(string $name): ?string
    {
        $name = strtolower($name);
        foreach ($this->headers as $key => $value) {
            if (strtolower($key) === $name) {
                return $value;
            }
        }
        return null;
    }

    public function getIP() {
    $ip = '';

    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } 
    elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        // Can contain multiple IPs → take first one
        $ipList = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ipList[0]);
    } 
    elseif (!empty($_SERVER['HTTP_X_FORWARDED'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED'];
    } 
    elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    } 
    else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }

    return $ip;
}

    public function getPath(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $scriptName = $_SERVER['SCRIPT_NAME'];
        $basePath = str_replace('/public/index.php', '', $scriptName);
        $path = $uri;
        if (str_starts_with($uri, $basePath)) {
            $path = substr($uri, strlen($basePath));
        }
        $path = str_replace('/index.php', '', $path);
        $path = str_replace('/public', '', $path);
        return '/' . ltrim($path, '/');
    }


    public function getMethod(): string { return $this->method; }
    public function getData(): array { return $this->data; }
    public function setData(array $data): void { $this->data = $data; }

    public function setUser(array $user): void { $this->user = $user; }
    public function getUser(): array { return $this->user; }
}
