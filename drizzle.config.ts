import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infra/schema.ts",
  out: "src/infra/migrations",
  driver: "d1-http",
  dialect: "sqlite",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: ignore
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    // biome-ignore lint/style/noNonNullAssertion: ignore
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    // biome-ignore lint/style/noNonNullAssertion: ignore
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;
