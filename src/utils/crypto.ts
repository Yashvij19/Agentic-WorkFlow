import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Validates and retrieves the 32-byte master encryption key.
 * Enforces strict 64-character hexadecimal format (32 bytes) at startup.
 * Fails fast with clear actionable instructions if invalid.
 */
function getValidatedEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw new Error(
      "❌ [Security Boot Error]: ENCRYPTION_KEY environment variable is required.\n" +
      "👉 Generate a secure 64-character hex key (32 bytes for AES-256-GCM) with this command:\n" +
      "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      `❌ [Security Boot Error]: ENCRYPTION_KEY must be exactly a 64-character hexadecimal string (32 bytes for AES-256-GCM), but received ${rawKey.length} characters.\n` +
      "👉 Generate a valid key with this command:\n" +
      "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    );
  }

  return Buffer.from(rawKey, 'hex');
}

/**
 * Encrypts sensitive secrets (e.g. API keys) using AES-256-GCM with a random 12-byte IV.
 * Produces a tamper-evident payload formatted as: ivHex:authTagHex:ciphertextHex
 */
export function encryptCredential(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('[Crypto Error]: Cannot encrypt empty or invalid text.');
  }

  const key = getValidatedEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive secrets using AES-256-GCM.
 * Verifies the tamper-evident authentication tag to guarantee data integrity.
 */
export function decryptCredential(encryptedDataString: string): string {
  if (!encryptedDataString || typeof encryptedDataString !== 'string') {
    throw new Error('[Crypto Error]: Encrypted credential payload is empty or invalid.');
  }

  const parts = encryptedDataString.split(':');
  if (parts.length !== 3) {
    throw new Error('[Crypto Error]: Malformed encrypted credential format (expected iv:authTag:ciphertext).');
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error('[Crypto Error]: Corrupted credential components.');
  }

  try {
    const key = getValidatedEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch (err: any) {
    throw new Error(
      `[Crypto Error]: Decryption failed. Authentication tag mismatch or corrupted ciphertext. Data integrity could not be verified.`
    );
  }
}