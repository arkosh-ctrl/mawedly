import { z } from "zod";

// Shared by the client form and the server action. The deposit <= price
// cross-check is part of the schema, so it is enforced on the server too.
export const sessionTypeEnum = z.enum(["in_person", "virtual", "phone"]);
export type SessionType = z.infer<typeof sessionTypeEnum>;

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "errors.nameRequired")
      .max(100, "errors.nameLong"),
    session_type: sessionTypeEnum,
    duration_minutes: z.coerce
      .number({ message: "errors.durationInt" })
      .int("errors.durationInt")
      .min(5, "errors.durationMin")
      .max(600, "errors.durationMax"),
    price: z.coerce
      .number({ message: "errors.priceMin" })
      .min(0, "errors.priceMin")
      .max(1000000, "errors.priceMax"),
    deposit_amount: z.coerce
      .number({ message: "errors.depositMin" })
      .min(0, "errors.depositMin"),
  })
  .refine((d) => d.deposit_amount <= d.price, {
    path: ["deposit_amount"],
    message: "errors.depositGtPrice",
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
