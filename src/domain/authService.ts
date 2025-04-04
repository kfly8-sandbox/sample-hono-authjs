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

// 認証識別子のバリデーションをする
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

// 6桁の認証コードを生成する
export function generateAuthCode(): string {
  // 100000から999999までの乱数を生成
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 認証コードをハッシュ化する関数型
export type HashFunction = (value: string) => Promise<string>;

// 認証コード情報を生成する
export async function generateAuthCodeInfo(
  options: {
    generateAuthCodeFn?: () => string;
    hashFn: HashFunction;
    expirationMinutes?: number;
  }
): Promise<Result<AuthCodeInfo, AuthCodeGenerationError>> {
  // 認証コードの生成
  const authCodeGenerator = options.generateAuthCodeFn || generateAuthCode;
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

  // 認証コードのハッシュ化
  let hashedAuthCodeValue: string;
  try {
    hashedAuthCodeValue = await options.hashFn(authCode);
  } catch {
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

  // 有効期限の設定
  const expirationMinutes = options.expirationMinutes || 30;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

  // 認証コード情報の作成
  const authCodeInfo: AuthCodeInfo = {
    authCode,
    hashedAuthCode,
    expiresAt,
    attempts: 0
  };

  return ok(authCodeInfo);
}

// 未検証認証オブジェクトを作成する
// 検証済みの認証識別子とオプションから未検証認証を作成
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

// 認証コードの有効期限をチェックする純粋関数
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

// 試行回数が上限に達しているかチェックする純粋関数
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

// 認証コードが一致するか確認する純粋関数（直接コード比較）
export function verifyAuthCodeMatch(
  inputAuthCode: string,
  correctAuthCode: string,
  currentAttempts: number,
  maxAttempts: number = 5
): Result<true, AuthCodeVerificationError> {
  // 認証コードの比較（平文同士の比較）
  if (inputAuthCode !== correctAuthCode) {
    const remainingAttempts = maxAttempts - (currentAttempts + 1);

    return err({
      type: "INVALID_AUTH_CODE",
      message: `認証コードが無効です。再度お試しください（残り試行回数: ${remainingAttempts}回）`,
      remainingAttempts
    });
  }

  return ok(true);
}

// 検証済み認証情報を生成する純粋関数
export function createVerifiedAuth(
  info: ValidatedAuth
): VerifiedAuth {
  return {
    info,
    verifiedAt: new Date()
  };
}
