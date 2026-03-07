import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { encrypt, decrypt } from "@src/utils/crypto";

describe("crypto utils", () => {
    const VALID_HEX_KEY = "a".repeat(64); // 64 hex chars = 32 bytes
    const VALID_RAW_KEY = "a".repeat(32); // 32 bytes raw

    let originalKey: string | undefined;

    beforeEach(() => {
        originalKey = process.env.ENCRYPTION_KEY;
    });

    afterEach(() => {
        if (originalKey !== undefined) {
            process.env.ENCRYPTION_KEY = originalKey;
        } else {
            delete process.env.ENCRYPTION_KEY;
        }
    });

    describe("encrypt + decrypt roundtrip", () => {
        test("with hex key", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            const plaintext = "Hello, World!";
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test("with raw 32-byte key", () => {
            process.env.ENCRYPTION_KEY = VALID_RAW_KEY;

            const plaintext = "Test message with special chars: àéîöü!@#";
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test("encrypted output format is iv:authTag:encrypted", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            const encrypted = encrypt("test");
            const parts = encrypted.split(":");

            expect(parts).toHaveLength(3);
            // IV should be 32 hex chars (16 bytes)
            expect(parts[0]).toHaveLength(32);
            // Auth tag should be 32 hex chars (16 bytes)
            expect(parts[1]).toHaveLength(32);
            // Encrypted content should exist
            expect(parts[2]!.length).toBeGreaterThan(0);
        });

        test("different encryptions of same plaintext produce different ciphertexts", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            const plaintext = "same text";
            const encrypted1 = encrypt(plaintext);
            const encrypted2 = encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
            expect(decrypt(encrypted1)).toBe(plaintext);
            expect(decrypt(encrypted2)).toBe(plaintext);
        });

        test("handles empty string encryption", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            // Empty string should still produce valid encrypted output
            const encrypted = encrypt("");
            const parts = encrypted.split(":");
            expect(parts).toHaveLength(3);
        });

        test("handles long text", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            const plaintext = "x".repeat(10000);
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });

    describe("key validation", () => {
        test("throws when ENCRYPTION_KEY is not defined", () => {
            delete process.env.ENCRYPTION_KEY;

            expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY is not defined");
        });

        test("throws when key has invalid length", () => {
            process.env.ENCRYPTION_KEY = "too-short";

            expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be 32 bytes long");
        });

        test("throws for key length 31", () => {
            process.env.ENCRYPTION_KEY = "a".repeat(31);

            expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be 32 bytes long");
        });
    });

    describe("decrypt validation", () => {
        test("throws on invalid format (missing parts)", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            expect(() => decrypt("invalid-format")).toThrow("Invalid encrypted text format");
        });

        test("throws on invalid format (only two parts)", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            expect(() => decrypt("part1:part2")).toThrow("Invalid encrypted text format");
        });

        test("throws on tampered ciphertext", () => {
            process.env.ENCRYPTION_KEY = VALID_HEX_KEY;

            const encrypted = encrypt("test");
            const parts = encrypted.split(":");
            // Tamper with the encrypted content
            parts[2] = "ff".repeat(parts[2]!.length / 2);
            const tampered = parts.join(":");

            expect(() => decrypt(tampered)).toThrow();
        });
    });
});
