// State shape for the update-password form action. Kept out of the
// "use server" action module, which may only export async functions. Each
// messageKey maps to a key under the "UpdatePassword.messages" namespace.
export type UpdatePasswordState = {
  status: "idle" | "error";
  messageKey?:
    | "passwordShort"
    | "passwordMismatch"
    | "updateFailed"
    | "sessionExpired";
};

export const initialUpdatePasswordState: UpdatePasswordState = {
  status: "idle",
};
