import { z } from "zod";

// Validation for the public review submission. rating is required (1-5);
// comment is optional free text with a sane upper bound (there is no DB length
// check by decision, so the cap lives here). Error messages are not surfaced
// individually — the form shows a single generic message — so the keys are only
// for internal branching.
export const reviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  // Optional self-reported contact, used only for the merchant's own follow-up
  // (e.g. special offers). Empty strings normalize to null.
  reviewer_name: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : null)),
  reviewer_phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
