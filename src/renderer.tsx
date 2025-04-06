import { reactRenderer } from "@hono/react-renderer";
import { isValidElement } from "react";
import type { ReactNode, ReactElement } from "react";
import { blocks, getBlockTypeFromObject } from "./blocks";

type Props = {
  children: ReactNode;
  blockType?: string;
};

export const renderer = reactRenderer(({ children, blockType }: Props) => {
  // 子要素からブロック名を自動検出
  let autoBlockType = blockType;

  if (!autoBlockType && isValidElement(children)) {
    const element = children as ReactElement;
    // コンポーネントが直接blocksオブジェクトの値と一致するか確認
    if (element.type && typeof element.type !== 'string') {
      autoBlockType = getBlockTypeFromObject(blocks, element.type as React.ComponentType) || 'unknown';
    }
  }

  return (
    <html lang="en">
      <head>
        {import.meta.env ? (
          <>
          <link href="/src/style.css" rel="stylesheet" />
          <script type="module" src="/src/client.tsx" />
          </>
        ) : (
          <>
          <link href="/static/style.css" rel="stylesheet" />
          <script type="module" src="/static/client.js" />
          </>
        )}
      </head>
      <body>
        <div id="app" data-block-type={autoBlockType}>{children}</div>
      </body>
    </html>
  );
});