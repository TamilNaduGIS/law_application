<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use Exception;

class LoginTransaction
{
    private const TABLE = 'public.login_transaction';

    public static function isTrackingEnabled(): bool
    {
        return true;
    }

    /**
     * Ensure an active login_transaction row exists for the current session.
     */
    public static function ensureActiveSession(string $phoneNo, string $encryptionKey): bool
    {
        if (!self::isTrackingEnabled() || $encryptionKey === '' || $phoneNo === '') {
            return true;
        }

        if (self::checkActiveEncryptionKey($phoneNo, $encryptionKey)) {
            return true;
        }

        $created = self::create(
            $phoneNo,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null,
            $encryptionKey
        );

        if ($created) {
            return true;
        }

        error_log('LoginTransaction::ensureActiveSession: could not persist login_transaction; allowing request.');
        return true;
    }

    /**
     * Records a login transaction in the database.
     */
    public static function create(string $phoneNo, ?string $ipAddress, ?string $userAgent, ?string $encryptionKey): bool
    {
        if (!self::isTrackingEnabled() || $phoneNo === '') {
            return false;
        }

        try {
            $db = Database::WriteConnection();
            $db->beginTransaction();

            $sqlDeactivate = 'UPDATE ' . self::TABLE . '
                             SET logout_ts = CURRENT_TIMESTAMP, is_active = false
                             WHERE phoneno = :phoneno AND is_active = true';
            $stmtDeactivate = $db->prepare($sqlDeactivate);
            $stmtDeactivate->execute(['phoneno' => $phoneNo]);

            $sqlInsert = 'INSERT INTO ' . self::TABLE . '
                    (phoneno, ip_address, user_agent, encryption_key, login_ts, is_active, created_ts)
                    VALUES
                    (:phoneno, :ip_address, :user_agent, :encryption_key, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP)';

            $stmtInsert = $db->prepare($sqlInsert);
            $result = $stmtInsert->execute([
                'phoneno' => $phoneNo,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'encryption_key' => $encryptionKey,
            ]);

            $db->commit();
            return (bool) $result;
        } catch (Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log('Failed to record login transaction: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getActiveSession(string $phoneNo): ?array
    {
        try {
            $db = Database::ReadDatabaseConnection();
            $sql = 'SELECT * FROM ' . self::TABLE . '
                    WHERE phoneno = :phoneno AND is_active = true
                    ORDER BY login_ts DESC LIMIT 1';

            $stmt = $db->prepare($sql);
            $stmt->execute(['phoneno' => $phoneNo]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            return $session ?: null;
        } catch (Exception $e) {
            error_log('Failed to fetch active session: ' . $e->getMessage());
            return null;
        }
    }

    public static function checkActiveEncryptionKey(string $phoneNo, string $encryptionKey): bool
    {
        if (!self::isTrackingEnabled() || $encryptionKey === '' || $phoneNo === '') {
            return true;
        }

        try {
            $db = Database::ReadDatabaseConnection();
            $sql = 'SELECT COUNT(*) FROM ' . self::TABLE . '
                    WHERE phoneno = :phoneno
                      AND encryption_key = :encryption_key
                      AND is_active = true';

            $stmt = $db->prepare($sql);
            $stmt->execute([
                'phoneno' => $phoneNo,
                'encryption_key' => $encryptionKey,
            ]);

            return (int) $stmt->fetchColumn() > 0;
        } catch (Exception $e) {
            error_log('Failed to check active encryption key: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Marks active transactions as logged out.
     */
    public static function logout(string $phoneNo): bool
    {
        if ($phoneNo === '') {
            return false;
        }

        try {
            $db = Database::WriteConnection();
            $sql = 'UPDATE ' . self::TABLE . '
                    SET logout_ts = CURRENT_TIMESTAMP, is_active = false
                    WHERE phoneno = :phoneno AND is_active = true';

            $stmt = $db->prepare($sql);
            return $stmt->execute(['phoneno' => $phoneNo]);
        } catch (Exception $e) {
            error_log('Failed to record logout transaction: ' . $e->getMessage());
            return false;
        }
    }
}
