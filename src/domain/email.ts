import { z } from "zod";

// 基底となるメールアドレススキーマ
const baseEmailSchema = z.string().email().max(255);

// ドメインモデル：ユーザーが入力した検証前のメールアドレス
export const unvalidatedEmailSchema = baseEmailSchema.brand<"UnvalidatedEmail">();
export type UnvalidatedEmail = z.infer<typeof unvalidatedEmailSchema>;

// ドメインモデル：検証済みのメールアドレス
export const validatedEmailSchema = baseEmailSchema.brand<"ValidatedEmail">();
export type ValidatedEmail = z.infer<typeof validatedEmailSchema>;

// ドメインモデル：認証コードを送信したが、まだ検証されていないメールアドレス
export const unverifiedEmailSchema = z.object({
  email: validatedEmailSchema,
  authCode: z.string().length(6).regex(/^\d+$/).brand<"AuthCode">(),
  hashedAuthCode: z.string().brand<"HashedAuthCode">(),
  expiresAt: z.date(),
  attempts: z.number().int().min(0),
  id: z.string().uuid().brand<"UnverifiedEmailId">(),
  createdAt: z.date(),
});
export type UnverifiedEmail = z.infer<typeof unverifiedEmailSchema>;
export type AuthCode = z.infer<typeof unverifiedEmailSchema.shape.authCode>;
export type HashedAuthCode = z.infer<typeof unverifiedEmailSchema.shape.hashedAuthCode>;
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

export type AuthCodeSendError =
  | { type: "RATE_LIMIT_EXCEEDED"; message: string }
  | { type: "EMAIL_SENDING_FAILED"; message: string };

export type AuthCodeVerificationError =
  | { type: "INVALID_AUTH_CODE"; message: string; remainingAttempts: number }
  | { type: "AUTH_CODE_EXPIRED"; message: string }
  | { type: "ACCOUNT_LOCKED"; message: string; unlockAt: Date }
  | { type: "VERIFICATION_FAILED"; message: string };
