import { describe, it, expect } from "bun:test";
import {
  unvalidatedEmailSchema,
  validatedEmailSchema,
  unverifiedEmailSchema,
  verifiedEmailSchema,
} from "./email";

describe("Email Domain Models", () => {
  describe("UnvalidatedEmail", () => {
    it("should validate a proper email", () => {
      const result = unvalidatedEmailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
    });

    it("should reject an invalid email", () => {
      const result = unvalidatedEmailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });
  });

  describe("ValidatedEmail", () => {
    it("should validate a proper email", () => {
      const result = validatedEmailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
    });

    it("should reject an invalid email", () => {
      const result = validatedEmailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });
  });

  describe("UnverifiedEmail", () => {
    it("should validate a proper unverified email object", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30); // 30 minutes in the future

      const unverifiedEmail = {
        email: "test@example.com",
        authCode: "123456",
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000", // UUID format
        createdAt: now,
      };

      const result = unverifiedEmailSchema.safeParse(unverifiedEmail);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid auth code (non-numeric)", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedEmail = {
        email: "test@example.com",
        authCode: "12345a", // Contains a letter
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedEmailSchema.safeParse(unverifiedEmail);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid auth code length", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedEmail = {
        email: "test@example.com",
        authCode: "12345", // Only 5 digits
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: 0,
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedEmailSchema.safeParse(unverifiedEmail);
      expect(result.success).toBe(false);
    });

    it("should reject negative attempts", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 30);

      const unverifiedEmail = {
        email: "test@example.com",
        authCode: "123456",
        hashedAuthCode: "hashed-auth-code",
        expiresAt: future,
        attempts: -1, // Negative attempts
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: now,
      };

      const result = unverifiedEmailSchema.safeParse(unverifiedEmail);
      expect(result.success).toBe(false);
    });
  });

  describe("VerifiedEmail", () => {
    it("should validate a proper verified email object", () => {
      const verifiedEmail = {
        email: "test@example.com",
        verifiedAt: new Date(),
      };

      const result = verifiedEmailSchema.safeParse(verifiedEmail);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid email", () => {
      const verifiedEmail = {
        email: "not-an-email",
        verifiedAt: new Date(),
      };

      const result = verifiedEmailSchema.safeParse(verifiedEmail);
      expect(result.success).toBe(false);
    });
  });
});
