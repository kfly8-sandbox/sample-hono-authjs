import { err, ok } from "neverthrow";

import { createId } from "./helper";
import { userSchema } from "./user";
import type { User, UserId } from "./user";

export type SignUpParams = {
  name: User["name"];
};

export const signUp = (params: SignUpParams) => {
  const user = {
    ...params,
    id: createId<UserId>(),
  };

  const parsed = userSchema.safeParse(user);
  if (parsed.error) {
    return err(parsed.error);
  }

  return ok(parsed.data);
};
