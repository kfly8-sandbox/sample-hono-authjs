
/**
 * 認証コードやパスワードなどの機密情報をハッシュ化するための関数
 * Ref: https://bun.sh/guides/util/hash-a-password
 *
 * @param {string} value - ハッシュ化する文字列（認証コードなど）
 * @returns {Promise<string>} ハッシュ化された文字列
 */
export async function secureHash(value: string): Promise<string> {
  return await Bun.password.hash(value);
}

export type HashFunction = (value: string) => Promise<string>;

/**
 * ハッシュが元の値と一致するか検証する関数
 *
 * @param {string} plainValue - 検証する平文の値
 * @param {string} hashedValue - ハッシュ化された値
 * @returns {Promise<boolean>} 一致する場合はtrue、それ以外はfalse
 */
export async function verifySecureHash(plainValue: string, hashedValue: string): Promise<boolean> {
  return await Bun.password.verify(plainValue, hashedValue);
}
