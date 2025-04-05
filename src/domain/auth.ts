/**
 * 認証ドメインモデル - Authentication Domain Model
 *
 * このモジュールは認証に関連するドメインモデルと型定義を提供します。
 * 認証フローに必要な以下の要素が含まれています：
 * - 認証識別子（メールアドレス）の型と検証ルール
 * - 認証コードとそのハッシュ値の型定義
 * - 認証状態を表す様々なモデル（未検証、検証済みなど）
 * - 認証プロセスで発生する可能性のあるエラー型
 */

import { z } from "zod";

/**
 * 基底となる認証識別子スキーマ（メールアドレスなど）
 * 現在はメールアドレスのみをサポートしています。
 */
const baseIdentifierSchema = z.object({
  email: z.string().email().max(255),
})

/**
 * ドメインモデル：未検証の認証識別子
 * バリデーション前の生の入力値を表します。
 */
export const unvalidatedAuthSchema = baseIdentifierSchema;
export type UnvalidatedAuth = z.infer<typeof unvalidatedAuthSchema>;

/**
 * ドメインモデル：検証済みの認証識別子
 * システムによってバリデーションされた正規の認証識別子を表します。
 * ビジネスルールに基づく検証（禁止ドメインチェックなど）も済んでいます。
 */
export const validatedAuthSchema = baseIdentifierSchema.brand<"ValidatedAuth">();
export type ValidatedAuth = z.infer<typeof validatedAuthSchema>;

/**
 * 認証コード関連の型定義
 * 6桁の数字からなる認証コードの型を定義します。
 */
export const authCodeSchema = z.string().length(6).regex(/^\d+$/)
export type AuthCode = z.infer<typeof authCodeSchema>;

/**
 * ハッシュ化された認証コードの型定義
 * セキュリティのため、認証コードはシステム内ではハッシュ化して保存されます。
 */
export const hashedAuthCodeSchema = z.string();
export type HashedAuthCode = z.infer<typeof hashedAuthCodeSchema>;

/**
 * 認証コード情報
 * 認証コードとその関連情報（ハッシュ値、有効期限、試行回数）を含むモデルです。
 */
export const authCodeInfoSchema = z.object({
  authCode: authCodeSchema,              // 平文の認証コード
  hashedAuthCode: hashedAuthCodeSchema,  // ハッシュ化された認証コード
  expiresAt: z.date(),                   // 有効期限
  attempts: z.number().int().min(0),     // 検証試行回数
});
export type AuthCodeInfo = z.infer<typeof authCodeInfoSchema>;

/**
 * ドメインモデル：認証コードを送信したが、まだ検証されていない認証情報
 * 認証プロセスの中間状態を表します。認証コードは発行されていますが、
 * ユーザーによる検証はまだ完了していません。
 */
export const unverifiedAuthSchema = z.object({
  info: validatedAuthSchema,             // 検証済みの認証識別子
  authCode: authCodeSchema,              // 発行された認証コード
  hashedAuthCode: hashedAuthCodeSchema,  // ハッシュ化された認証コード
  expiresAt: z.date(),                   // 認証コードの有効期限
  attempts: z.number().int().min(0),     // 検証試行回数
  id: z.string().uuid().brand<"UnverifiedAuthId">(), // 未検証認証のID
  createdAt: z.date(),                   // 作成日時
});
export type UnverifiedAuth = z.infer<typeof unverifiedAuthSchema>;
export type UnverifiedAuthId = z.infer<typeof unverifiedAuthSchema.shape.id>;

/**
 * ドメインモデル：認証コードが検証された認証情報
 * 認証プロセスが正常に完了した状態を表します。
 * ユーザーが正しい認証コードを入力し、認証が完了しています。
 */
export const verifiedAuthSchema = z.object({
  info: validatedAuthSchema,    // 検証済みの認証識別子
  verifiedAt: z.date(),         // 検証完了日時
});
export type VerifiedAuth = z.infer<typeof verifiedAuthSchema>;

/**
 * エラータイプの定義
 * 認証プロセスの各段階で発生する可能性のあるエラーを型として定義しています。
 */

/**
 * 認証識別子のバリデーションエラー
 * 入力された認証識別子（メールアドレスなど）が無効な場合に発生します。
 */
export type AuthValidationError = {
  type: "AUTH_VALIDATION_ERROR";
  message: string;
};

/**
 * 認証コード生成エラー
 * 認証コードの生成またはハッシュ化処理に失敗した場合に発生します。
 */
export type AuthCodeGenerationError = {
  type: "AUTH_CODE_GENERATION_ERROR";
  message: string;
};

/**
 * 認証コード送信エラー
 * 認証コードの送信（メールなど）に失敗した場合に発生するエラー型です。
 * レート制限超過やメール送信失敗などのケースを含みます。
 */
export type AuthCodeSendError =
  | { type: "RATE_LIMIT_EXCEEDED"; message: string }
  | { type: "EMAIL_SENDING_FAILED"; message: string };

/**
 * 認証コード検証エラー
 * 認証コードの検証プロセスで発生する可能性のあるエラー型です。
 * - 無効な認証コード入力
 * - 認証コードの有効期限切れ
 * - 試行回数超過によるアカウントロック
 * - その他の検証失敗
 */
export type AuthCodeVerificationError =
  | { type: "INVALID_AUTH_CODE"; message: string; remainingAttempts: number }
  | { type: "AUTH_CODE_EXPIRED"; message: string }
  | { type: "ACCOUNT_LOCKED"; message: string; unlockAt: Date }
  | { type: "VERIFICATION_FAILED"; message: string };
