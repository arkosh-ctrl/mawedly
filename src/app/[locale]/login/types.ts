// Shared state shape for the Magic Link form action. Kept out of the
// "use server" action module, which may only export async functions.
export type LoginState = {
  status: "idle" | "success" | "error";
  messageKey?: "checkEmail" | "invalidEmail" | "sendFailed";
};

export const initialLoginState: LoginState = { status: "idle" };
