// Shared state shape for the login form actions (Magic Link, password sign-in,
// and password-reset request). Kept out of the "use server" action module,
// which may only export async functions. Each messageKey maps to a key under
// the "Login.messages" translation namespace.
export type LoginState = {
  status: "idle" | "success" | "error";
  messageKey?:
    | "checkEmail"
    | "invalidEmail"
    | "sendFailed"
    | "passwordShort"
    | "invalidCredentials"
    | "resetEmailSent";
};

export const initialLoginState: LoginState = { status: "idle" };
