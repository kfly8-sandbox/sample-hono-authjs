/**
 * 認証サービス - Authentication Service
 *
 * このモジュールは認証に関連する操作を処理するためのサービスです。
 * 主な機能：
 * - 認証識別子（メールアドレスなど）のバリデーション
 * - 認証コードの生成と検証
 * - 未検証認証オブジェクトの作成
 * - 検証済み認証情報の生成
 * 
 * 本サービスは Pure Domain Service であり、永続化などの外部依存を持ちません。
 */

import { ok, err } from "neverthrow";
import type { Result } from "neverthrow";
import type {
  ValidatedAuth,
  UnverifiedAuth,
  VerifiedAuth,
  AuthValidationError,
  AuthCodeSendError,
  AuthCodeVerificationError,
  AuthCode,
  HashedAuthCode,
  UnverifiedAuthId,
  AuthCodeInfo,
  AuthCodeGenerationError
} from "./auth";
import { validatedAuthSchema, authCodeSchema, hashedAuthCodeSchema, authCodeInfoSchema } from "./auth";
import { createId } from "./helper";
import { secureHash, verifySecureHash, type HashFunction } from "../lib/crypto";

/**
 * 認証識別子のバリデーションを行う
 * 
 * 与えられた未検証の認証識別子（主にメールアドレス）を検証し、
 * 禁止ドメインのチェックも行います。
 * 
 * @param {unknown} unvalidatedAuth - 検証する認証識別子
 * @returns {Result<ValidatedAuth, AuthValidationError>} 検証結果
 */
export function validateAuth(
  unvalidatedAuth: unknown
): Result<ValidatedAuth, AuthValidationError> {

  const result = validatedAuthSchema.safeParse(unvalidatedAuth);
  if (!result.success) {
    return err({
      type: "AUTH_VALIDATION_ERROR",
      message: "認証識別子の検証に失敗しました"
    });
  }

  const email = result.data.email

  // 禁止ドメインチェック（実際のルールはビジネス要件に応じて変更）
  const prohibitedDomains = ['example.org', 'temp-mail.com'];
  const domain = email.split('@')[1];

  if (domain && prohibitedDomains.includes(domain)) {
    return err({
      type: "AUTH_VALIDATION_ERROR",
      message: "このドメインの認証識別子は利用できません"
    });
  }

  return ok(result.data);
}

/**
 * 6桁の認証コードを生成する
 * 
 * 100000から999999までのランダムな6桁の数字を生成します。
 * 
 * @returns {string} 生成された6桁の認証コード
 */
export function generateAuthCode(): string {
  // 100000から999999までの乱数を生成
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 認証コード情報を生成する
 * 
 * 認証コードを生成し、ハッシュ化して、有効期限と共に認証コード情報を作成します。
 * 
 * @param {Object} options - オプション
 * @param {() => string} [options.generateAuthCodeFn] - 認証コード生成関数
 * @param {HashFunction} [options.hashFn] - ハッシュ関数
 * @param {number} [options.expirationMinutes] - 有効期限（分）
 * @returns {Promise<Result<AuthCodeInfo, AuthCodeGenerationError>>} 生成された認証コード情報
 */
export async function generateAuthCodeInfo(
  options: {
    generateAuthCodeFn?: () => string;
    hashFn?: HashFunction;
    expirationMinutes?: number;
  }
): Promise<Result<AuthCodeInfo, AuthCodeGenerationError>> {
  const authCodeGenerator = options.generateAuthCodeFn || generateAuthCode;
  const hashGenerator = options.hashFn || secureHash;
  const expirationMinutes = options.expirationMinutes || 30;

  // 認証コードの生成
  const authCodeValue = authCodeGenerator();

  // 認証コードの検証
  const authCodeResult = authCodeSchema.safeParse(authCodeValue);
  if (!authCodeResult.success) {
    return err({
      type: "AUTH_CODE_GENERATION_ERROR",
      message: "認証コードの生成に失敗しました: 形式が不正です"
    });
  }
  const authCode = authCodeResult.data;

  let hashedAuthCodeValue: string;
  try {
    // 認証コードのハッシュ化
    hashedAuthCodeValue = await hashGenerator(authCode);
  } catch (error) {
    return err({
      type: "AUTH_CODE_GENERATION_ERROR",
      message: "認証コードのハッシュ化に失敗しました"
    });
  }

  const hashedAuthCodeResult = hashedAuthCodeSchema.safeParse(hashedAuthCodeValue);
  if (!hashedAuthCodeResult.success) {
    return err({
      type: "AUTH_CODE_GENERATION_ERROR",
      message: "認証コードのハッシュ化に失敗しました"
    });
  }
  const hashedAuthCode = hashedAuthCodeResult.data;

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

  // 認証コード情報の作成
  const authCodeInfo = {
    authCode,
    hashedAuthCode,
    expiresAt,
    attempts: 0
  } satisfies AuthCodeInfo;

  return ok(authCodeInfo)
}

/**
 * 未検証認証オブジェクトを作成する
 * 
 * 検証済みの認証識別子を元に、認証コードを含む未検証認証オブジェクトを作成します。
 * 
 * @param {ValidatedAuth} validatedAuth - 検証済みの認証識別子
 * @param {Object} options - オプション
 * @param {() => string} [options.generateAuthCodeFn] - 認証コード生成関数
 * @param {HashFunction} options.hashFn - ハッシュ関数
 * @param {number} [options.expirationMinutes] - 有効期限（分）
 * @returns {Promise<Result<UnverifiedAuth, AuthCodeGenerationError>>} 作成された未検証認証オブジェクト
 */
export async function createUnverifiedAuth(
  validatedAuth: ValidatedAuth,
  options: {
    generateAuthCodeFn?: () => string;
    hashFn: HashFunction;
    expirationMinutes?: number;
  }
): Promise<Result<UnverifiedAuth, AuthCodeGenerationError>> {
  // 認証コード情報を生成
  const authCodeInfoResult = await generateAuthCodeInfo(options);

  if (authCodeInfoResult.isErr()) {
    return err(authCodeInfoResult.error); // エラーをそのまま転送
  }

  const authCodeInfo = authCodeInfoResult.value;

  const unverifiedAuth: UnverifiedAuth = {
    info: validatedAuth,
    authCode: authCodeInfo.authCode,
    hashedAuthCode: authCodeInfo.hashedAuthCode,
    expiresAt: authCodeInfo.expiresAt,
    attempts: authCodeInfo.attempts,
    id: createId<UnverifiedAuthId>(),
    createdAt: new Date()
  };

  return ok(unverifiedAuth);
}

/**
 * 認証コードの有効期限をチェックする純粋関数
 * 
 * 未検証認証オブジェクトの有効期限を確認し、期限切れかどうかを判定します。
 * 
 * @param {UnverifiedAuth} unverifiedAuth - 未検証認証オブジェクト
 * @returns {Result<UnverifiedAuth, AuthCodeVerificationError>} チェック結果
 */
export function checkAuthCodeExpiration(
  unverifiedAuth: UnverifiedAuth
): Result<UnverifiedAuth, AuthCodeVerificationError> {
  // 有効期限切れのチェック
  if (new Date() > unverifiedAuth.expiresAt) {
    return err({
      type: "AUTH_CODE_EXPIRED",
      message: "認証コードの有効期限が切れています。新しいコードを送信してください。"
    });
  }

  return ok(unverifiedAuth);
}

/**
 * 試行回数が上限に達しているかチェックする純粋関数
 * 
 * 未検証認証オブジェクトの試行回数を確認し、上限に達しているかを判定します。
 * 上限に達している場合は一時的なアカウントロックを行います。
 * 
 * @param {UnverifiedAuth} unverifiedAuth - 未検証認証オブジェクト
 * @param {number} [maxAttempts=5] - 最大試行回数
 * @returns {Result<UnverifiedAuth, AuthCodeVerificationError>} チェック結果
 */
export function checkMaxAttemptsReached(
  unverifiedAuth: UnverifiedAuth,
  maxAttempts: number = 5
): Result<UnverifiedAuth, AuthCodeVerificationError> {
  if (unverifiedAuth.attempts >= maxAttempts) {
    // アカウントロック - ロック解除時間を計算
    const unlockAt = new Date();
    unlockAt.setMinutes(unlockAt.getMinutes() + 10); // 10分間ロック

    return err({
      type: "ACCOUNT_LOCKED",
      message: "セキュリティのため、このアカウントは一時的にロックされています。しばらく経ってから再度お試しください。",
      unlockAt
    });
  }

  return ok(unverifiedAuth);
}

/**
 * ハッシュ化された認証コードを比較する関数
 *
 * この関数は、ハッシュ化済みの正しい認証コードと、
 * ユーザーが入力した平文の認証コードを安全に比較します。
 * 入力値を同じハッシュアルゴリズムでハッシュ化し、
 * タイミング攻撃に強い方法で比較します。
 *
 * @param {string} inputAuthCode - ユーザーが入力した認証コード（平文）
 * @param {string} hashedCorrectAuthCode - 正しい認証コードのハッシュ値
 * @param {number} currentAttempts - 現在の試行回数
 * @param {Object} [options] - オプション
 * @param {number} [options.maxAttempts] - 最大試行回数
 * @param {(input: string, hashed: string) => Promise<boolean>} [options.verifyAuthCodeFn] - 検証関数
 * @returns {Promise<Result<true, AuthCodeVerificationError>>} 検証結果
 */
export async function verifyAuthCode(
  inputAuthCode: string,
  hashedCorrectAuthCode: string,
  currentAttempts: number,
  options: {
    maxAttempts?: number;
    verifyAuthCodeFn?: (input: string, hashed: string) => Promise<boolean>;
  } = {}
): Promise<Result<true, AuthCodeVerificationError>> {
  const maxAttempts = options.maxAttempts || 5;
  const verifyAuthCodeFn = options.verifyAuthCodeFn || verifySecureHash;

  const isEqual = await verifyAuthCodeFn(inputAuthCode, hashedCorrectAuthCode);

  // 一致しない場合はエラーを返す
  if (!isEqual) {
    const remainingAttempts = maxAttempts - (currentAttempts + 1);

    return err({
      type: "INVALID_AUTH_CODE",
      message: `認証コードが無効です。再度お試しください（残り試行回数: ${remainingAttempts}回）`,
      remainingAttempts
    });
  }

  return ok(true);
}

/**
 * 検証済み認証情報を生成する純粋関数
 * 
 * 認証識別子を元に、検証済みの認証情報を作成します。
 * 
 * @param {ValidatedAuth} info - 検証済みの認証識別子
 * @returns {VerifiedAuth} 検証済み認証情報
 */
export function createVerifiedAuth(
  info: ValidatedAuth
): VerifiedAuth {
  return {
    info,
    verifiedAt: new Date()
  };
}
