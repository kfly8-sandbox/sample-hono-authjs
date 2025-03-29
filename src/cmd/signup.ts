import { err, ok } from "neverthrow";
import type { Cmd } from "./types";

import type { UserRepository } from "../domain/user";
import { signUp } from "../domain/userService";
import type { SignUpParams } from "../domain/userService";

export class SignUpCmd implements Cmd {
  constructor(private userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async execute(params: SignUpParams) {
    const result = signUp(params);
    if (result.isErr()) {
      return err(new Error("Failed to signUp", { cause: result.error }));
    }
    const user = result.value;

    const saved = await this.userRepository.save(user);
    if (saved.isErr()) {
      return err(new Error("Failed to save user", { cause: saved.error }));
    }

    return ok(user);
  }
}
