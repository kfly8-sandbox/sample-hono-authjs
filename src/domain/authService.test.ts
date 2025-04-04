import { describe, it, expect } from "bun:test";
import {
  validateAuth,
  generateAuthCode,
  createUnverifiedAuth,
  checkAuthCodeExpiration,
  checkMaxAttemptsReached,
  verifyAuthCode,
  createVerifiedAuth,
} from "./authService";
import {
  ValidatedAuth,
  AuthCode,
  HashedAuthCode,
  UnverifiedAuthId
} from "./auth";
import type { HashFunction } from "../lib/crypto";
import { verify } from "hono/jwt";

describe("Authentication Service", () => {
  describe("validateAuth", () => {
    it("should validate a correct identifier", async () => {
      const email = "test@example.com";
      const result = validateAuth({ email });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value.email).toBe("string");
      }
    });

    it("should reject prohibited domains", async () => {
      const email = "test@example.org";
      const result = validateAuth({ email });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("AUTH_VALIDATION_ERROR");
      }
    });

    it("should reject invalid identifier format", async () => {
      const email = "not-an-email";
      const result = validateAuth({ email });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("AUTH_VALIDATION_ERROR");
      }
    });
  });

  describe("generateAuthCode", () => {
    it("should generate a 6-digit code", () => {
      const code = generateAuthCode();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe("createUnverifiedAuth", () => {
    const mockHashFn: HashFunction = async (value) => `hashed-${value}`

    it("should create an UnverifiedAuth object with generated auth code", async () => {
      const validatedAuth = { email: "test@example.com" } as ValidatedAuth;
      const result = await createUnverifiedAuth(validatedAuth, {
        hashFn: mockHashFn
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const unverifiedAuth = result.value;
        expect(unverifiedAuth.info.email).toBe("test@example.com");
        expect(typeof unverifiedAuth.authCode).toBe("string");
        expect(unverifiedAuth.authCode.length).toBe(6);
        expect(unverifiedAuth.hashedAuthCode).toBe(`hashed-${unverifiedAuth.authCode}`);
        expect(unverifiedAuth.attempts).toBe(0);
        expect(unverifiedAuth.expiresAt).toBeInstanceOf(Date);
        expect(unverifiedAuth.id).toBeDefined();
        expect(unverifiedAuth.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should use custom auth code generator when provided", async () => {
      const validatedAuth = { email: "test@example.com" } as ValidatedAuth;
      const customCode = "123456";

      const result = await createUnverifiedAuth(validatedAuth, {
        generateAuthCodeFn: () => customCode,
        hashFn: mockHashFn
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const unverifiedAuth = result.value;
        expect(unverifiedAuth.authCode).toBe(customCode);
        expect(unverifiedAuth.hashedAuthCode).toBe(`hashed-${customCode}`);
      }
    });

    it("should set the correct expiration time", async () => {
      const validatedAuth = { email: "test@example.com" } as ValidatedAuth;
      const expirationMinutes = 60; // 1時間

      const now = new Date();
      const result = await createUnverifiedAuth(validatedAuth, {
        hashFn: mockHashFn,
        expirationMinutes
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const expiresAt = result.value.expiresAt;
        // 有効期限が約60分後に設定されていることを確認（誤差を許容）
        const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
        expect(diffMinutes).toBeGreaterThan(59);
        expect(diffMinutes).toBeLessThan(61);
      }
    });
  });

  describe("checkAuthCodeExpiration", () => {
    it("should pass for a non-expired code", () => {
      const validatedAuth = { email: "test@example.com" } as ValidatedAuth;
      const future = new Date();
      future.setMinutes(future.getMinutes() + 30); // 30分後

      const unverifiedAuth = {
        info: validatedAuth,
        authCode: "123456",
        hashedAuthCode: "hashed-code",
        expiresAt: future,
        attempts: 0,
        id: "test-id" as UnverifiedAuthId,
        createdAt: new Date()
      };

      const result = checkAuthCodeExpiration(unverifiedAuth);
      expect(result.isOk()).toBe(true);
    });

    it("should fail for an expired code", () => {
      const validatedAuth = { email: "test@example.com" } as ValidatedAuth;
      const past = new Date();
      past.setMinutes(past.getMinutes() - 5); // 5分前

      const unverifiedAuth = {
        info: validatedAuth,
        authCode: "123456",
        hashedAuthCode: "hashed-code",
        expiresAt: past,
        attempts: 0,
        id: "test-id" as UnverifiedAuthId,
        createdAt: new Date()
      };

      const result = checkAuthCodeExpiration(unverifiedAuth);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("AUTH_CODE_EXPIRED");
      }
    });
  });

  describe("checkMaxAttemptsReached", () => {
    it("should pass when attempts are below the maximum", () => {
      const validatedAuth = { email: "test@examle.com" } as ValidatedAuth;
      const unverifiedAuth = {
        info: validatedAuth,
        authCode: "123456",
        hashedAuthCode: "hashed-code",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 3, // 最大値(デフォルト5)未満
        id: "test-id" as UnverifiedAuthId,
        createdAt: new Date()
      };

      const result = checkMaxAttemptsReached(unverifiedAuth);
      expect(result.isOk()).toBe(true);
    });

    it("should fail when attempts have reached the maximum", () => {
      const validatedAuth = { email: "test@examle.com" } as ValidatedAuth;
      const unverifiedAuth = {
        info: validatedAuth,
        authCode: "123456",
        hashedAuthCode: "hashed-code",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 5, // 最大値(デフォルト5)と同じ
        id: "test-id" as UnverifiedAuthId,
        createdAt: new Date()
      };

      const result = checkMaxAttemptsReached(unverifiedAuth);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ACCOUNT_LOCKED");
        if (result.error.type === "ACCOUNT_LOCKED") {
          expect(result.error.unlockAt).toBeInstanceOf(Date);
        }
      }
    });

    it("should respect a custom max attempts value", () => {
      const validatedAuth = { email: "test@examle.com" } as ValidatedAuth;
      const unverifiedAuth = {
        info: validatedAuth,
        authCode: "123456",
        hashedAuthCode: "hashed-code",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 2,
        id: "test-id" as UnverifiedAuthId,
        createdAt: new Date()
      };

      // カスタム最大試行回数3で、2回の試行は有効
      const result1 = checkMaxAttemptsReached(unverifiedAuth, 3);
      expect(result1.isOk()).toBe(true);

      // 3回に達すると失敗
      const unverifiedAuth2 = { ...unverifiedAuth, attempts: 3 };
      const result2 = checkMaxAttemptsReached(unverifiedAuth2, 3);
      expect(result2.isErr()).toBe(true);
    });
  });

  describe("verifyAuthCode", () => {
    // mock
    const options = {
      verifyAuthCodeFn: async (input: string, hash: string) => {
        return input === hash;
      }
    }

    it("should pass when codes match", async () => {
      const correctCode = "123456";
      const inputCode = "123456";
      const attempts = 0;

      const result = await verifyAuthCode(inputCode, correctCode, attempts, options);
      expect(result.isOk()).toBe(true);
    });

    it("should fail when codes do not match", async () => {
      const correctCode = "123456";
      const inputCode = "654321";
      const attempts = 0;

      const result = await verifyAuthCode(inputCode, correctCode, attempts, options);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("INVALID_AUTH_CODE");
        if (result.error.type === "INVALID_AUTH_CODE") {
          expect(result.error.remainingAttempts).toBe(4); // 最初の試行なので残り4回
        }
      }
    });

    it("should calculate remaining attempts correctly", async () => {
      const correctCode = "123456";
      const inputCode = "654321";
      const attempts = 3; // すでに3回試行済み

      const result = await verifyAuthCode(inputCode, correctCode, attempts, options);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("INVALID_AUTH_CODE");
        if (result.error.type === "INVALID_AUTH_CODE") {
          expect(result.error.remainingAttempts).toBe(1); // 残り1回
        }
      }
    });
  });

  describe("createVerifiedAuth", () => {
    it("should create a VerifiedAuth object with the current date", () => {
      const validatedAuth = { email: "test@example.com "} as ValidatedAuth;
      const now = new Date();

      const verifiedAuth = createVerifiedAuth(validatedAuth);
      expect(verifiedAuth.info.email).toBe(validatedAuth.email);
      expect(verifiedAuth.verifiedAt).toBeInstanceOf(Date);

      // 現在時刻に近い時刻が設定されていることを確認
      const timeDiff = Math.abs(verifiedAuth.verifiedAt.getTime() - now.getTime());
      expect(timeDiff).toBeLessThan(100); // 100ミリ秒以内
    });
  });
});
