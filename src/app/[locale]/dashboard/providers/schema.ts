import { z } from "zod";

// Shared by the client form and the server action.
export const providerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "errors.nameRequired")
    .max(100, "errors.nameLong"),
  title: z.string().trim().max(100, "errors.tooLong").optional().or(z.literal("")),
});

export type ProviderInput = z.infer<typeof providerSchema>;
