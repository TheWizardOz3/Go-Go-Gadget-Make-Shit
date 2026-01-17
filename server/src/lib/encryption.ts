/**
 * Encryption Utilities
 *
 * Simple encryption for sensitive settings like API tokens.
 * Uses AES-256-GCM with a machine-specific key.
 *
 * Note: This provides obfuscation rather than true security.
 * The key is derived from machine identifiers, so the encrypted
 * values can only be decrypted on the same machine.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { hostname, userInfo } from 'os';
import { logger } from './logger.js';

// ============================================================
// Constants
// ============================================================

/** Encryption algorithm */
const ALGORITHM = 'aes-256-gcm';

/** IV length in bytes */
const IV_LENGTH = 12;

/** Auth tag length in bytes */
const AUTH_TAG_LENGTH = 16;

/** Salt for key derivation */
const SALT = 'gogogadgetclaude-settings-v1';

/** Prefix to identify encrypted values */
const ENCRYPTED_PREFIX = 'enc:';

// ============================================================
// Key Derivation
// ============================================================

/**
 * Derive an encryption key from machine-specific identifiers.
 *
 * Uses hostname and username to create a machine-specific key.
 * This means encrypted values can only be decrypted on the same machine.
 */
function deriveKey(): Buffer {
  // Combine machine identifiers
  const machineId = `${hostname()}-${userInfo().username}-${SALT}`;

  // Derive a 32-byte key using scrypt
  return scryptSync(machineId, SALT, 32);
}

// ============================================================
// Encryption Functions
// ============================================================

/**
 * Encrypt a string value.
 *
 * @param plaintext - The value to encrypt
 * @returns Encrypted value with prefix, or original if encryption fails
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  // Already encrypted
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) {
    return plaintext;
  }

  try {
    const key = deriveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return ENCRYPTED_PREFIX + combined.toString('base64');
  } catch (error) {
    logger.warn('Encryption failed, storing plaintext', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return plaintext;
  }
}

/**
 * Decrypt an encrypted string value.
 *
 * @param ciphertext - The encrypted value (with prefix)
 * @returns Decrypted value, or original if not encrypted or decryption fails
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return ciphertext;
  }

  // Not encrypted
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext;
  }

  try {
    const key = deriveKey();
    const combined = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), 'base64');

    // Extract IV, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.warn('Decryption failed, returning original value', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Return without prefix to indicate it's not properly encrypted
    return ciphertext.slice(ENCRYPTED_PREFIX.length);
  }
}

/**
 * Check if a value is encrypted.
 *
 * @param value - The value to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Mask a sensitive value for logging.
 *
 * @param value - The value to mask
 * @param visibleChars - Number of characters to show at start (default: 4)
 * @returns Masked value like "sk-a***"
 */
export function maskSensitive(value: string | undefined, visibleChars: number = 4): string {
  if (!value) {
    return '(not set)';
  }

  if (value.length <= visibleChars) {
    return '***';
  }

  return value.slice(0, visibleChars) + '***';
}
