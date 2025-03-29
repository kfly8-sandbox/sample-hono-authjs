import type { Result } from "neverthrow";
import { z } from "zod";

export const userIdSchema = z.string().brand<"UserId">();
export type UserId = z.infer<typeof userIdSchema>;

export const userSchema = z.object({
  id: userIdSchema,
  name: z.string().min(1).max(100),
});

export type User = z.infer<typeof userSchema>;

export interface UserRepository {
  save(user: User): Promise<Result<unknown, Error>>;
}
