<?php

namespace App\Core;

use App\Helpers\EncryptionHelper;
use App\Services\SessionService;

abstract class Controller
{
    protected ?int $sessionUserId;
    protected ?array $requestData;

    public function __construct(?Request $request = null)
    {
        $this->requestData = [];

        if ($request === null) {
            return;
        }

        $user = $request->getUser();
        if (!empty($user['uid'])) {
            $this->sessionUserId = (int) $user['uid'];
        }

        $data = $request->getData();
        if (!empty($data['payload'])) {
            $this->requestData = $this->getDecryptedPayload($request);
            if ($this->requestData === null) {
                throw new \Exception('Invalid or missing encrypted payload for user: ' . ($this->sessionUserId ?? 'unknown'));
            }
        } else {
            $this->requestData = $data;
        }
    }
    protected function json(array $data, int $status = 200): Response
    {
        return Response::json($data, $status);
    }

    protected function error(string $message, int $status = 400): Response
    {
        return Response::error($message, $status);
    }

    /**
     * Helper to decrypt the standard 'payload' from a request.
     */
    protected function getDecryptedPayload(Request $request): ?array
    {
        $user = $request->getUser();
        if (empty($user) || empty($user['uid'])) {
            return null;
        }

        $userId = (int) $user['uid'];
        $requestData = $request->getData();

        if (empty($requestData['payload'])) {
            return null;
        }

        $encryptionKey = SessionService::getEncryptionKey($userId);
        if (!$encryptionKey) {
            return null;
        }

        $decryptedPayload = EncryptionHelper::decrypt($requestData['payload'], $encryptionKey);
        if (!$decryptedPayload) {
            return null;
        }

        try {
            return json_decode($decryptedPayload, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Helper to encrypt a response for a specific user.
     */
    protected function encryptResponse(array $data): Response
    {
        return $this->json([
            'payload' => EncryptionHelper::encrypt(json_encode($data), SessionService::getEncryptionKey($this->sessionUserId)),
            'data' => $data
        
        ]);
    }

    protected function processInput($input)
    {
        // Check if the input is a JSON array string and decode it
        if (is_string($input) && strlen($input) > 0 && $input[0] === '[') {
            $input = json_decode($input, true);
        }
        if (is_array($input)) {
            $input = implode(',', $input);
        }
        return $input;
    }



    protected function toPgArray(?array $arr): ?string
    {
        if (empty($arr))
            return null;
        $escaped = array_map(fn($s) => '"' . str_replace('"', '\"', trim($s)) . '"', $arr);
        return '{' . implode(',', $escaped) . '}';
    }

    protected function toJsonb($val): ?string
    {
        if (empty($val))
            return null;
        if (is_array($val) && array_values($val) === $val) {
            throw new \Exception('Expected associative array (object) for JSONB parameters, got indexed array');
        }
        if (is_array($val)) {
            $processed = [];
            foreach ($val as $k => $v) {
                if (is_array($v) && count($v) === 1) {
                    $processed[$k] = $v[0];
                } elseif (is_array($v)) {
                    $processed[$k] = implode(',', $v);
                } else {
                    $processed[$k] = $v;
                }
            }
            $val = $processed;
        }
        return json_encode($val, JSON_UNESCAPED_UNICODE);
    }

    //  set userId
    protected function setUserId(Request $request): int
    {
        $user = $request->getUser();
        if (empty($user) || empty($user['uid'])) {
            throw new \Exception('User not authenticated');
        }
        $this->sessionUserId = (int) $user['uid'];
        return $this->sessionUserId;
    }

    protected function validateRequestData(array $data, array $requiredFields)
    {
        try {
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new \Exception('Missing required field: ' . $field);
            }
        }
        return true;
        } catch (\Exception $e) {
            throw new \Exception('Error validating request data: ' . $e->getMessage());
        }   
    }

    protected function validateRequestDataRules(array $data, array $rules)
{
        // example rules
    // $rules = [
    //     'name'       => 'required|string|min_length:3|max_length:100',
    //     'email'      => 'required|email',
    //     'age'        => 'required|integer|min:18|max:120',
    //     'is_active'  => 'boolean',
    //     'role'       => 'required|in:admin,user,moderator',
    //     'website'    => 'url',
    //     'tags'       => 'array',
    //     'description'=> 'string|max_length:500'
    // ];
    
    // $this->validateRequestDataRules($requestData, $rules);
    $errors = [];

    foreach ($rules as $field => $ruleSet) {
        // Convert string rules to array
        if (is_string($ruleSet)) {
            $ruleSet = explode('|', $ruleSet);
        }

        $value = $data[$field] ?? null;

        foreach ($ruleSet as $rule) {
            // Required
            if ($rule === 'required') {
                if (!isset($data[$field]) || ($value === '' && !is_numeric($value))) {
                    $errors[] = "The field {$field} is required.";
                    continue 2; // Skip other rules for this field
                }
            }

            // Skip further validation if value is empty and not required
            if ($value === null || $value === '') {
                continue;
            }

            // Type & Format Validations
            switch ($rule) {
                case 'string':
                    if (!is_string($value)) {
                        $errors[] = "The field {$field} must be a string.";
                    }
                    break;

                case 'integer':
                case 'int':
                    if (!is_numeric($value) || floor($value) != $value) {
                        $errors[] = "The field {$field} must be an integer.";
                    }
                    break;

                case 'numeric':
                    if (!is_numeric($value)) {
                        $errors[] = "The field {$field} must be numeric.";
                    }
                    break;

                case 'boolean':
                case 'bool':
                    if (!in_array($value, [0, 1, '0', '1', true, false], true)) {
                        $errors[] = "The field {$field} must be boolean.";
                    }
                    break;

                case 'array':
                    if (!is_array($value)) {
                        $errors[] = "The field {$field} must be an array.";
                    }
                    break;

                case 'email':
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[] = "The field {$field} must be a valid email address.";
                    }
                    break;

                case 'url':
                    if (!filter_var($value, FILTER_VALIDATE_URL)) {
                        $errors[] = "The field {$field} must be a valid URL.";
                    }
                    break;

                case 'date':
                    if (!strtotime($value)) {
                        $errors[] = "The field {$field} must be a valid date.";
                    }
                    break;
            }

            // Min / Max (for numeric values)
            if (str_starts_with($rule, 'min:')) {
                $min = (int) substr($rule, 4);
                if (is_numeric($value) && $value < $min) {
                    $errors[] = "The field {$field} must be at least {$min}.";
                }
            }

            if (str_starts_with($rule, 'max:')) {
                $max = (int) substr($rule, 4);
                if (is_numeric($value) && $value > $max) {
                    $errors[] = "The field {$field} must not be greater than {$max}.";
                }
            }

            // Min / Max Length (for strings)
            if (str_starts_with($rule, 'min_length:')) {
                $min = (int) substr($rule, 11);
                if (strlen((string)$value) < $min) {
                    $errors[] = "The field {$field} must be at least {$min} characters.";
                }
            }

            if (str_starts_with($rule, 'max_length:')) {
                $max = (int) substr($rule, 11);
                if (strlen((string)$value) > $max) {
                    $errors[] = "The field {$field} must not exceed {$max} characters.";
                }
            }

            // In array
            if (str_starts_with($rule, 'in:')) {
                $allowed = explode(',', substr($rule, 3));
                if (!in_array($value, $allowed)) {
                    $errors[] = "The field {$field} must be one of: " . implode(', ', $allowed) . ".";
                }
            }
        }
    }

    if (!empty($errors)) {
        throw new \Exception(implode(" | ", $errors));
    }

    return true;
}
}
