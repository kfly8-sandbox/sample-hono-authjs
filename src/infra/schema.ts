import { sql } from "drizzle-orm";
import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

// NOTE: Basiacally, we should not use `default` value in the schema because default value should be set in the domain layer.

import type { UserId } from "../domain/user";

// utils
const createdAt = t.text("created_at").default(sql`(CURRENT_TIMESTAMP)`);
const updatedAt = t
  .text("updated_at")
  .default(sql`(CURRENT_TIMESTAMP)`)
  .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`);

export const users = table("users", {
  id: t.text().notNull().primaryKey().$type<UserId>(),
  name: t.text().notNull(),
  createdAt,
  updatedAt,
});
