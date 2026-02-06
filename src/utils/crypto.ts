import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY is not defined in environment variables");
    }
    // Suport for hex string or raw string (must be 32 bytes)
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }
    if (key.length === 32) {
        return Buffer.from(key);
    }
    throw new Error("ENCRYPTION_KEY must be 32 bytes long (or 64 hex characters)");
}

/**
 * Encrypts a text using AES-256-GCM.
 * @param text The text to encrypt.
 * @returns The encrypted string in format "iv:authTag:encryptedContent" (hex encoded).
 */
export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a text encrypted with the encrypt function.
 * @param text The encrypted string in format "iv:authTag:encryptedContent".
 * @returns The original text.
 */
export function decrypt(text: string): string {
    const [ivHex, authTagHex, encryptedHex] = text.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error("Invalid encrypted text format");
    }

    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
