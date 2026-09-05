import crypto from 'crypto';

// Standard RFC 4648 Base32 Alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a binary buffer into an RFC 4648 Base32 string (no padding).
 */
export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer.
 */
export function decodeBase32(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character encountered: '${char}'`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically random 20-byte Base32 secret for TOTP.
 * Produces a clean 32-character string (e.g. JBSWY3DPEHPK3PXP...).
 */
export function generateTotpSecret(): string {
  const randomBuffer = crypto.randomBytes(20);
  return encodeBase32(randomBuffer);
}

/**
 * Generates a standard otpauth:// URI for scanning with Microsoft / Google Authenticator.
 */
export function generateTotpUri(email: string, secret: string, issuer: string = 'AgenticWorkflow'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Calculates a 6-digit TOTP code for a given secret at a specific 30-second time counter (RFC 6238).
 */
export function generateTotpCode(secret: string, timeCounter?: number): string {
  const counter = timeCounter ?? Math.floor(Date.now() / 1000 / 30);
  const key = decodeBase32(secret);

  // 8-byte big-endian counter buffer
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a user-supplied 6-digit code with +/- window tolerance (to allow for minor clock drift).
 */
export function verifyTotpCode(secret: string, token: string, window: number = 1): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const expected = generateTotpCode(secret, currentCounter + i);
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const tokenBuf = Buffer.from(cleanToken, 'utf-8');

    if (expectedBuf.length === tokenBuf.length && crypto.timingSafeEqual(expectedBuf, tokenBuf)) {
      return true;
    }
  }

  return false;
}

/**
 * Hashes a backup recovery code with SHA-256 for secure database storage.
 */
export function hashBackupCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Generates emergency backup recovery codes (e.g. BK-9A2F-8C1B).
 * Returns plaintext codes for user download, and SHA-256 hashed codes for database storage.
 */
export function generateBackupCodes(count: number = 5): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex characters
    const formatted = `BK-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies if an entered code matches any remaining hashed backup code using constant-time comparison.
 * If valid, returns { isValid: true, remainingHashedCodes: [...] } with the matched code burned.
 */
export function verifyAndBurnBackupCode(
  enteredCode: string,
  storedHashedCodes: string[]
): { isValid: boolean; remainingHashedCodes: string[] } {
  if (!enteredCode || !Array.isArray(storedHashedCodes) || storedHashedCodes.length === 0) {
    return { isValid: false, remainingHashedCodes: storedHashedCodes || [] };
  }

  const hashedAttempt = hashBackupCode(enteredCode);
  const attemptBuf = Buffer.from(hashedAttempt, 'hex');

  let matchIndex = -1;
  for (let i = 0; i < storedHashedCodes.length; i++) {
    const storedBuf = Buffer.from(storedHashedCodes[i], 'hex');
    if (storedBuf.length === attemptBuf.length && crypto.timingSafeEqual(storedBuf, attemptBuf)) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex !== -1) {
    const remaining = [...storedHashedCodes];
    remaining.splice(matchIndex, 1); // Burn the used code
    return { isValid: true, remainingHashedCodes: remaining };
  }

  return { isValid: false, remainingHashedCodes: storedHashedCodes };
}
