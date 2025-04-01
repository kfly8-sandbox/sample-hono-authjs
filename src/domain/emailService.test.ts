import { describe, it, expect } from "bun:test";
import {
  validateEmail,
  generateAuthCode,
  createUnverifiedEmail,
  checkAuthCodeExpiration,
  checkMaxAttemptsReached,
  verifyAuthCodeMatch,
  createVerifiedEmail,
  type HashFunction
} from "./emailService";
import {
  ValidatedEmail,
  AuthCode,
  HashedAuthCode,
  UnverifiedEmailId
} from "./email";

describe("Email Service - Pure Functions", () => {
  describe("validateEmail", () => {
    it("should validate a correct email", async () => {
      const email = "test@example.com";
      const result = validateEmail(email);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe("string");
      }
    });

    it("should reject prohibited domains", async () => {
      const email = "test@example.org";
      const result = validateEmail(email);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("EMAIL_VALIDATION_ERROR");
      }
    });

    it("should reject invalid email format", async () => {
      const email = "not-an-email";
      const result = validateEmail(email);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("EMAIL_VALIDATION_ERROR");
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

  describe("createUnverifiedEmail", () => {
    const mockHashFn: HashFunction = async (value) => `hashed-${value}`;

    it("should create an UnverifiedEmail object with generated auth code", async () => {
      const email = "test@example.com" as ValidatedEmail;
      
      const result = await createUnverifiedEmail(email, {
        hashFn: mockHashFn
      });
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const unverifiedEmail = result.value;
        expect(unverifiedEmail.email).toBe(email);
        expect(typeof unverifiedEmail.authCode).toBe("string");
        expect(unverifiedEmail.authCode.length).toBe(6);
        expect(unverifiedEmail.hashedAuthCode).toBe(`hashed-${unverifiedEmail.authCode}`);
        expect(unverifiedEmail.attempts).toBe(0);
        expect(unverifiedEmail.expiresAt).toBeInstanceOf(Date);
        expect(unverifiedEmail.id).toBeDefined();
        expect(unverifiedEmail.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should use custom auth code generator when provided", async () => {
      const email = "test@example.com" as ValidatedEmail;
      const customCode = "123456";
      
      const result = await createUnverifiedEmail(email, {
        generateAuthCodeFn: () => customCode,
        hashFn: mockHashFn
      });
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const unverifiedEmail = result.value;
        expect(unverifiedEmail.authCode).toBe(customCode);
        expect(unverifiedEmail.hashedAuthCode).toBe(`hashed-${customCode}`);
      }
    });

    it("should set the correct expiration time", async () => {
      const email = "test@example.com" as ValidatedEmail;
      const expirationMinutes = 60; // 1時間
      
      const now = new Date();
      const result = await createUnverifiedEmail(email, {
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
      const email = "test@example.com" as ValidatedEmail;
      const future = new Date();
      future.setMinutes(future.getMinutes() + 30); // 30分後
      
      const unverifiedEmail = {
        email,
        authCode: "123456" as AuthCode,
        hashedAuthCode: "hashed-code" as HashedAuthCode,
        expiresAt: future,
        attempts: 0,
        id: "test-id" as UnverifiedEmailId,
        createdAt: new Date()
      };
      
      const result = checkAuthCodeExpiration(unverifiedEmail);
      expect(result.isOk()).toBe(true);
    });
    
    it("should fail for an expired code", () => {
      const email = "test@example.com" as ValidatedEmail;
      const past = new Date();
      past.setMinutes(past.getMinutes() - 5); // 5分前
      
      const unverifiedEmail = {
        email,
        authCode: "123456" as AuthCode,
        hashedAuthCode: "hashed-code" as HashedAuthCode,
        expiresAt: past,
        attempts: 0,
        id: "test-id" as UnverifiedEmailId,
        createdAt: new Date()
      };
      
      const result = checkAuthCodeExpiration(unverifiedEmail);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("AUTH_CODE_EXPIRED");
      }
    });
  });

  describe("checkMaxAttemptsReached", () => {
    it("should pass when attempts are below the maximum", () => {
      const email = "test@example.com" as ValidatedEmail;
      const unverifiedEmail = {
        email,
        authCode: "123456" as AuthCode,
        hashedAuthCode: "hashed-code" as HashedAuthCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 3, // 最大値(デフォルト5)未満
        id: "test-id" as UnverifiedEmailId,
        createdAt: new Date()
      };
      
      const result = checkMaxAttemptsReached(unverifiedEmail);
      expect(result.isOk()).toBe(true);
    });
    
    it("should fail when attempts have reached the maximum", () => {
      const email = "test@example.com" as ValidatedEmail;
      const unverifiedEmail = {
        email,
        authCode: "123456" as AuthCode,
        hashedAuthCode: "hashed-code" as HashedAuthCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 5, // 最大値(デフォルト5)と同じ
        id: "test-id" as UnverifiedEmailId,
        createdAt: new Date()
      };
      
      const result = checkMaxAttemptsReached(unverifiedEmail);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ACCOUNT_LOCKED");
        if (result.error.type === "ACCOUNT_LOCKED") {
          expect(result.error.unlockAt).toBeInstanceOf(Date);
        }
      }
    });
    
    it("should respect a custom max attempts value", () => {
      const email = "test@example.com" as ValidatedEmail;
      const unverifiedEmail = {
        email,
        authCode: "123456" as AuthCode,
        hashedAuthCode: "hashed-code" as HashedAuthCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 2,
        id: "test-id" as UnverifiedEmailId,
        createdAt: new Date()
      };
      
      // カスタム最大試行回数3で、2回の試行は有効
      const result1 = checkMaxAttemptsReached(unverifiedEmail, 3);
      expect(result1.isOk()).toBe(true);
      
      // 3回に達すると失敗
      const unverifiedEmail2 = { ...unverifiedEmail, attempts: 3 };
      const result2 = checkMaxAttemptsReached(unverifiedEmail2, 3);
      expect(result2.isErr()).toBe(true);
    });
  });

  describe("verifyAuthCodeMatch", () => {
    it("should pass when codes match", () => {
      const correctCode = "123456";
      const inputCode = "123456";
      const attempts = 0;
      
      const result = verifyAuthCodeMatch(inputCode, correctCode, attempts);
      expect(result.isOk()).toBe(true);
    });
    
    it("should fail when codes do not match", () => {
      const correctCode = "123456";
      const inputCode = "654321";
      const attempts = 0;
      
      const result = verifyAuthCodeMatch(inputCode, correctCode, attempts);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("INVALID_AUTH_CODE");
        expect(result.error.remainingAttempts).toBe(4); // 最初の試行なので残り4回
      }
    });
    
    it("should calculate remaining attempts correctly", () => {
      const correctCode = "123456";
      const inputCode = "654321";
      const attempts = 3; // すでに3回試行済み
      
      const result = verifyAuthCodeMatch(inputCode, correctCode, attempts);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("INVALID_AUTH_CODE");
        expect(result.error.remainingAttempts).toBe(1); // 残り1回
      }
    });
  });

  describe("createVerifiedEmail", () => {
    it("should create a VerifiedEmail object with the current date", () => {
      const email = "test@example.com" as ValidatedEmail;
      const now = new Date();
      
      const verifiedEmail = createVerifiedEmail(email);
      expect(verifiedEmail.email).toBe(email);
      expect(verifiedEmail.verifiedAt).toBeInstanceOf(Date);
      
      // 現在時刻に近い時刻が設定されていることを確認
      const timeDiff = Math.abs(verifiedEmail.verifiedAt.getTime() - now.getTime());
      expect(timeDiff).toBeLessThan(100); // 100ミリ秒以内
    });
  });
});
