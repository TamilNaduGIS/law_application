# SSP Backend API Documentation

This document provides a comprehensive guide to the SSP (Secure Scalable PHP) Backend API.

## 1. General Information

- **Base URL**: `/api` (e.g., `http://localhost/ssp/ssp_3/ssp_backend/api`)
- **Format**: `application/json`
- **Authentication**: Bearer JWT (JSON Web Token)
- **Security**: 
  - **CSRF Protection**: Required for state-changing requests (POST, PUT, DELETE).
  - **End-to-End Encryption**: Supported for sensitive payloads via session-specific keys.

---

## 2. Authentication & Session Management

### Login
Authenticates a user and starts a secure session.

- **URL**: `/login`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "your_password",
    "token": "CAPTCHA_TOKEN_FROM_GET_CAPTCHA",
    "captcha": "USER_CAPTCHA_INPUT"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access_token": "JWT_ACCESS_TOKEN",
    "refresh_token": "JWT_REFRESH_TOKEN",
    "encryption_key": "HEX_ENCRYPTION_KEY",
    "csrf_token": "HEX_CSRF_TOKEN",
    "details": {
      "user_id": 1,
      "roles": ["admin"]
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials.
  - `422 Unprocessable Entity`: Invalid CAPTCHA.
  - `429 Too Many Requests`: User blocked due to excessive failures.

---

### Refresh Token
Rotates the access token using a refresh token.

- **URL**: `/refresh`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "refresh_token": "CURRENT_REFRESH_TOKEN"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access_token": "NEW_ACCESS_TOKEN",
    "refresh_token": "NEW_REFRESH_TOKEN"
  }
  ```

---

### Logout
Invalidates the current session and revokes tokens.

- **URL**: `/logout`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

### Get Tokens
Retrieves the current session's encryption key and CSRF token.

- **URL**: `/getTOKENS`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (200 OK)**:
  ```json
  {
    "encryption_key": "...",
    "csrf_token": "..."
  }
  ```

---

## 3. Security Services

### Generate CAPTCHA
Generates a new CAPTCHA image and an encrypted validation token.

- **URL**: `/captcha`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "captcha": {
      "image": "data:image/jpeg;base64,...",
      "token": "ENCRYPTED_VALIDATION_TOKEN"
    }
  }
  ```

---

### Validate CAPTCHA
Validates a CAPTCHA input without initiating a login.

- **URL**: `/captcha/validate`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "captcha_token": "ENCRYPTED_TOKEN",
    "user_input": "USER_INPUT"
  }
  ```
- **Response (200 OK)**: `{"success": true}`

---

### Secure Data (Demo)
Demonstrates end-to-end encryption and RBAC.

- **URL**: `/secure-data`
- **Method**: `POST`
- **RBAC**: Requires `admin` role.
- **Headers**:
  - `Authorization: Bearer <access_token>`
  - `X-CSRF-Token: <csrf_token>`
- **Request Body** (Optional encrypted payload):
  ```json
  {
    "payload": "AES-256-CBC_ENCRYPTED_STRING"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "payload": "AES-256-CBC_ENCRYPTED_RESPONSE"
  }
  ```

---

## 4. Utilities

### Health Check
Verify API status.

- **URL**: `/health`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "status": "online",
    "message": "Secure PHP API is running!",
    "timestamp": "YYYY-MM-DD HH:MM:SS"
  }
  ```

---

## 5. Security Protocols

### Header Requirements
| Header | Value | Required For |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | All secure routes |
| `X-CSRF-Token` | `<csrf_token>` | POST/PUT/DELETE secure routes |
| `Content-Type` | `application/json` | All requests with body |

### Error Handling
Errors return a standard JSON structure with an appropriate HTTP status code.

```json
{
  "status": "error",
  "message": "Specific error message here"
}
```

**Common Status Codes**:
- `400`: Missing parameters.
- `401`: Unauthorized (Invalid/Expired Token).
- `403`: Forbidden (CSRF Failure/Insufficient Permissions).
- `422`: Validation Error (Wrong CAPTCHA).
- `500`: Server Error.
