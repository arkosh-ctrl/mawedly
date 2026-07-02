// Shared state shape for the public review action. Kept out of the "use server"
// module (which may only export async functions). Only two outcomes are ever
// exposed to the visitor — a generic success or a single generic failure — so
// no rejection reason (invalid id, not completed, already reviewed, RLS denial)
// is ever leaked.
export type ReviewState = {
  status: "idle" | "success" | "error";
  messageKey?: "thanks" | "failed";
};

export const initialReviewState: ReviewState = { status: "idle" };
