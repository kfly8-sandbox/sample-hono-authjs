import SignupBlock from './signup'

// 全てのブロックをまとめてエクスポート
export const blocks = {
  signup: SignupBlock,
  // 他のブロックがあれば追加
}

// オブジェクトからブロック名を取得する関数
export function getBlockTypeFromObject(obj: Record<string, any>, component: React.ComponentType): string | null {
  for (const [key, value] of Object.entries(obj)) {
    if (value === component) {
      return key;
    }
  }
  return null;
}
