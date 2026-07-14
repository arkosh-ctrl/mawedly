// Shared state shape for the signup form action. Kept out of the "use server"
// action module, which may only export async functions. Each messageKey maps to
// a key under the "Signup.messages" translation namespace.
export type SignupState = {
  status: "idle" | "error";
  messageKey?:
    | "invalidEmail"
    | "passwordShort"
    | "nameRequired"
    | "nameLong"
    | "slugShort"
    | "slugLong"
    | "slugFormat"
    | "slugReserved"
    | "slugTaken"
    | "phone"
    | "licenseLong"
    | "consentRequired"
    | "emailTaken"
    | "signupFailed";
};

export const initialSignupState: SignupState = { status: "idle" };
