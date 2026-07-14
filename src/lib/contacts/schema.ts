import { z } from "zod";

// Shared validation for creating/updating a contact (a row in `customers`).
// Name is required; email/phone are optional (a contact may be phone-only or
// email-only). Error messages are translation keys under "Contacts.errors".
export const contactSchema = z.object({
  name: z.string().trim().min(2, "errors.nameRequired").max(100, "errors.nameLong"),
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("errors.email")])
    .optional(),
  phone: z
    .union([z.literal(""), z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "errors.phone")])
    .optional(),
  job_title: z.string().trim().max(100, "errors.tooLong").optional().or(z.literal("")),
  company: z.string().trim().max(100, "errors.tooLong").optional().or(z.literal("")),
  linkedin_url: z
    .union([z.literal(""), z.string().trim().url("errors.url")])
    .optional(),
  timezone: z.string().trim().max(60, "errors.tooLong").optional().or(z.literal("")),
  country: z.string().trim().max(60, "errors.tooLong").optional().or(z.literal("")),
  city: z.string().trim().max(60, "errors.tooLong").optional().or(z.literal("")),
  notes: z.string().trim().max(2000, "errors.tooLong").optional().or(z.literal("")),
  is_favorite: z.boolean().optional(),
  // Flat key→value custom fields (values stored as strings). Max 20 keys.
  custom_fields: z
    .record(z.string().max(500, "errors.tooLong"))
    .refine((o) => Object.keys(o).length <= 20, "errors.tooLong")
    .optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// Email compose validation.
export const emailSchema = z.object({
  subject: z.string().trim().min(1, "errors.subjectRequired").max(200, "errors.subjectLong"),
  body: z.string().trim().min(1, "errors.bodyRequired").max(5000, "errors.bodyLong"),
});
export type EmailInput = z.infer<typeof emailSchema>;
