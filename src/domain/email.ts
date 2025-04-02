import { z } from "zod";

// 基底となるメールアドレススキーマ
const baseEmailSchema = z.string().email().max(255);

// ドメインモデル：未検証のメールアドレス
export const unvalidatedEmailSchema = baseEmailSchema;
export type UnvalidatedEmail = z.infer<typeof unvalidatedEmailSchema>;

// ドメインモデル：検証済みのメールアドレス
export const validatedEmailSchema = baseEmailSchema.brand<"ValidatedEmail">();
export type ValidatedEmail = z.infer<typeof validatedEmailSchema>;

// 認証コード関連の型
export const authCodeSchema = z.string().length(6).regex(/^\d+$/).brand<"AuthCode">();
export type AuthCode = z.infer<typeof authCodeSchema>;

export const hashedAuthCodeSchema = z.string().brand<"HashedAuthCode">();
export type HashedAuthCode = z.infer<typeof hashedAuthCodeSchema>;

// 認証コード情報
export const authCodeInfoSchema = z.object({
  authCode: authCodeSchema,
  hashedAuthCode: hashedAuthCodeSchema,
  expiresAt: z.date(),
  attempts: z.number().int().min(0),
});
export type AuthCodeInfo = z.infer<typeof authCodeInfoSchema>;

// ドメインモデル：認証コードを送信したが、まだ検証されていないメールアドレス
export const unverifiedEmailSchema = z.object({
  email: validatedEmailSchema,
  authCode: authCodeSchema,
  hashedAuthCode: hashedAuthCodeSchema,
  expiresAt: z.date(),
  attempts: z.number().int().min(0),
  id: z.string().uuid().brand<"UnverifiedEmailId">(),
  createdAt: z.date(),
});
export type UnverifiedEmail = z.infer<typeof unverifiedEmailSchema>;
export type UnverifiedEmailId = z.infer<typeof unverifiedEmailSchema.shape.id>;

// ドメインモデル：認証コードが検証されたメールアドレス
export const verifiedEmailSchema = z.object({
  email: validatedEmailSchema,
  verifiedAt: z.date(),
});
export type VerifiedEmail = z.infer<typeof verifiedEmailSchema>;

// エラータイプ
export type EmailValidationError = {
  type: "EMAIL_VALIDATION_ERROR";
  message: string;
};

export type AuthCodeGenerationError = {
  type: "AUTH_CODE_GENERATION_ERROR";
  message: string;
};

export type AuthCodeSendError = 
  | { type: "RATE_LIMIT_EXCEEDED"; message: string }
  | { type: "EMAIL_SENDING_FAILED"; message: string };

export type AuthCodeVerificationError = 
  | { type: "INVALID_AUTH_CODE"; message: string; remainingAttempts: number }
  | { type: "AUTH_CODE_EXPIRED"; message: string }
  | { type: "ACCOUNT_LOCKED"; message: string; unlockAt: Date }
  | { type: "VERIFICATION_FAILED"; message: string };
