import { z } from "zod";

// 基底となる認証識別子スキーマ（メールアドレスなど）
const baseIdentifierSchema = z.object({
  email: z.string().email().max(255),
})

// ドメインモデル：未検証の認証識別子
export const unvalidatedAuthSchema = baseIdentifierSchema;
export type UnvalidatedAuth = z.infer<typeof unvalidatedAuthSchema>;

// ドメインモデル：検証済みの認証識別子
export const validatedAuthSchema = baseIdentifierSchema.brand<"ValidatedAuth">();
export type ValidatedAuth = z.infer<typeof validatedAuthSchema>;

// 認証コード関連の型
export const authCodeSchema = z.string().length(6).regex(/^\d+$/)
export type AuthCode = z.infer<typeof authCodeSchema>;

export const hashedAuthCodeSchema = z.string();
export type HashedAuthCode = z.infer<typeof hashedAuthCodeSchema>;

// 認証コード情報
export const authCodeInfoSchema = z.object({
  authCode: authCodeSchema,
  hashedAuthCode: hashedAuthCodeSchema,
  expiresAt: z.date(),
  attempts: z.number().int().min(0),
});
export type AuthCodeInfo = z.infer<typeof authCodeInfoSchema>;

// ドメインモデル：認証コードを送信したが、まだ検証されていない認証情報
export const unverifiedAuthSchema = z.object({
  info: validatedAuthSchema,
  authCode: authCodeSchema,
  hashedAuthCode: hashedAuthCodeSchema,
  expiresAt: z.date(),
  attempts: z.number().int().min(0),
  id: z.string().uuid().brand<"UnverifiedAuthId">(),
  createdAt: z.date(),
});
export type UnverifiedAuth = z.infer<typeof unverifiedAuthSchema>;
export type UnverifiedAuthId = z.infer<typeof unverifiedAuthSchema.shape.id>;

// ドメインモデル：認証コードが検証された認証情報
export const verifiedAuthSchema = z.object({
  info: validatedAuthSchema,
  verifiedAt: z.date(),
});
export type VerifiedAuth = z.infer<typeof verifiedAuthSchema>;

// エラータイプ
export type AuthValidationError = {
  type: "AUTH_VALIDATION_ERROR";
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
