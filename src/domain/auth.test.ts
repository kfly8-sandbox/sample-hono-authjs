import { describe, it, expect } from "bun:test";
import {
  unvalidatedAuthSchema,
  validatedAuthSchema,
  unverifiedAuthSchema,
  verifiedAuthSchema,
} from "./auth";

describe("Authentication Domain Models", () => {
  describe("UnvalidatedAuth", () => {
    it("should validate a proper identifier", () => {
      const result = unvalidatedAuthSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("should reject an invalid identifier", () => {
      const result = unvalidatedAuthSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("ValidatedAuth", () => {
    it("should validate a proper identifier", () => {
      const result = validatedAuthSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("should reject an invalid identifier", () => {
      const result = validatedAuthSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("UnverifiedAuth", () => {
    it("should validate a proper unverified auth object", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30); // 30 minutes in the future

      const unverifiedAuth = {
        info: {
          email: "test@example.com",
        },
        authCode: "123456",
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000", // UUID format
        createdAt: now,
      };

      const result = unverifiedAuthSchema.safeParse(unverifiedAuth);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid auth code (non-numeric)", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedAuth = {
        info: {
          email: "test@example.com",
        },
        authCode: "12345a", // Contains a letter
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedAuthSchema.safeParse(unverifiedAuth);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid auth code length", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedAuth = {
        info: {
          email: "test@example.com",
        },
        authCode: "12345", // Only 5 digits
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedAuthSchema.safeParse(unverifiedAuth);
      expect(result.success).toBe(false);
    });

    it("should reject negative attempts", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedAuth = {
        info: {
          email: "test@example.com",
        },
        authCode: "123456",
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: -1, // Negative attempts
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedAuthSchema.safeParse(unverifiedAuth);
      expect(result.success).toBe(false);
    });
  });

  describe("VerifiedAuth", () => {
    it("should validate a proper verified auth object", () => {
      const verifiedAuth = {
        info: {
          email: "test@example.com",
        },
        verifiedAt: new Date(),
      };

      const result = verifiedAuthSchema.safeParse(verifiedAuth);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid identifier", () => {
      const verifiedAuth = {
        info: {
          email: "not-an-email",
        },
        verifiedAt: new Date(),
      };

      const result = verifiedAuthSchema.safeParse(verifiedAuth);
      expect(result.success).toBe(false);
    });
  });
});
