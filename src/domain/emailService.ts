import { ok, err } from "neverthrow";
import type { Result } from "neverthrow";
import type {
  ValidatedEmail,
  UnverifiedEmail,
  VerifiedEmail,
  EmailValidationError,
  AuthCodeSendError,
  AuthCodeVerificationError,
  AuthCode,
  HashedAuthCode,
  UnverifiedEmailId
} from "./email";
import { validatedEmailSchema } from "./email";
import { createId } from "./helper";

// メールアドレスのバリデーションをする
export function validateEmail(
  unvalidatedEmail: unknown
): Result<ValidatedEmail, EmailValidationError> {

  const result = validatedEmailSchema.safeParse(unvalidatedEmail);
  if (!result.success) {
    return err({
      type: "EMAIL_VALIDATION_ERROR",
      message: "メールアドレスの検証に失敗しました"
    });
  }

  const email = result.data

  // 禁止ドメインチェック（実際のルールはビジネス要件に応じて変更）
  const prohibitedDomains = ['example.org', 'temp-mail.com'];
  const domain = email.split('@')[1];

  if (domain && prohibitedDomains.includes(domain)) {
    return err({
      type: "EMAIL_VALIDATION_ERROR",
      message: "このドメインのメールアドレスは利用できません"
    });
  }

  return ok(email);
}

// 6桁の認証コードを生成する
export function generateAuthCode(): string {
  // 100000から999999までの乱数を生成
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 認証コードをハッシュ化する関数型
export type HashFunction = (value: string) => Promise<string>;

// 未検証メールオブジェクトを作成する
export function createUnverifiedEmail(
  email: ValidatedEmail,
  options: {
    generateAuthCodeFn?: () => string;
    hashFn: HashFunction;
    expirationMinutes?: number;
  }
): Promise<Result<UnverifiedEmail, AuthCodeSendError>> {
  return new Promise<Result<UnverifiedEmail, AuthCodeSendError>>(async (resolve) => {
    try {
      // 認証コードの生成
      const authCodeGenerator = options.generateAuthCodeFn || generateAuthCode;
      const authCode = authCodeGenerator();
      
      // 認証コードのハッシュ化
      const hashedAuthCode = await options.hashFn(authCode);
      
      // 有効期限の設定
      const expirationMinutes = options.expirationMinutes || 30;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      // 未検証メールアドレスオブジェクトの作成
      const unverifiedEmail = {
        email,
        authCode: authCode as AuthCode,
        hashedAuthCode: hashedAuthCode as HashedAuthCode,
        expiresAt,
        attempts: 0,
        id: createId<UnverifiedEmailId>(),
        createdAt: new Date()
      } satisfies UnverifiedEmail;

      resolve(ok(unverifiedEmail));
    } catch (error) {
      resolve(err({
        type: "EMAIL_SENDING_FAILED",
        message: "認証コードの生成中にエラーが発生しました"
      }));
    }
  });
}

// 認証コードの有効期限をチェックする純粋関数
export function checkAuthCodeExpiration(
  unverifiedEmail: UnverifiedEmail
): Result<UnverifiedEmail, AuthCodeVerificationError> {
  // 有効期限切れのチェック
  if (new Date() > unverifiedEmail.expiresAt) {
    return err({
      type: "AUTH_CODE_EXPIRED",
      message: "認証コードの有効期限が切れています。新しいコードを送信してください。"
    });
  }

  return ok(unverifiedEmail);
}

// 試行回数が上限に達しているかチェックする純粋関数
export function checkMaxAttemptsReached(
  unverifiedEmail: UnverifiedEmail,
  maxAttempts: number = 5
): Result<UnverifiedEmail, AuthCodeVerificationError> {
  if (unverifiedEmail.attempts >= maxAttempts) {
    // アカウントロック - ロック解除時間を計算
    const unlockAt = new Date();
    unlockAt.setMinutes(unlockAt.getMinutes() + 10); // 10分間ロック

    return err({
      type: "ACCOUNT_LOCKED",
      message: "セキュリティのため、このアカウントは一時的にロックされています。しばらく経ってから再度お試しください。",
      unlockAt
    });
  }

  return ok(unverifiedEmail);
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

// 検証済みメールアドレスを生成する純粋関数
export function createVerifiedEmail(
  email: ValidatedEmail
): VerifiedEmail {
  return {
    email,
    verifiedAt: new Date()
  };
}
