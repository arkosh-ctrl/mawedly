// Single source of truth for the Practitioner Verification System.
//
// Which profession types require a professional license — and which regulator
// issues it — lives HERE in code (not the DB), mirroring how businesses.type is
// free text mapped by application code. The signup schema, the settings screen,
// the public booking page, and (later) the admin review all import from this
// module so the rules can never drift.

/** Regulators that issue professional licenses in Saudi Arabia. */
export const LICENSE_ISSUERS = ["scfhs", "moj", "socpa", "sce", "other"] as const;
export type LicenseIssuer = (typeof LICENSE_ISSUERS)[number];

/** Review lifecycle stored in businesses.verification_status. */
export const VERIFICATION_STATUSES = [
  "not_required",
  "pending",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

type Profession = {
  /** Regulated profession that legally needs a license to practise. */
  requiresLicense: boolean;
  /** Default issuing regulator (only meaningful when requiresLicense). */
  issuer?: LicenseIssuer;
};

// Every profession a NEW merchant may pick at signup — a typed tuple so it can
// drive both z.enum (signup validation) and the picker order in one place.
// Legacy values ("consulting") written under the old positioning remain valid
// in existing rows and are treated as non-regulated by the fallbacks below.
export const PROFESSION_TYPES = [
  // Non-regulated — start immediately, no license needed.
  "business",
  "education",
  "fitness",
  "salon",
  "other",
  // Regulated — license review recommended before the verified badge shows.
  "mental_health",
  "nutrition",
  "medical",
  "health",
  "legal",
  "accounting",
  "engineering",
] as const;
export type ProfessionType = (typeof PROFESSION_TYPES)[number];

export const PROFESSIONS: Record<ProfessionType, Profession> = {
  business: { requiresLicense: false },
  education: { requiresLicense: false },
  fitness: { requiresLicense: false },
  salon: { requiresLicense: false },
  other: { requiresLicense: false },
  mental_health: { requiresLicense: true, issuer: "scfhs" },
  nutrition: { requiresLicense: true, issuer: "scfhs" },
  medical: { requiresLicense: true, issuer: "scfhs" },
  health: { requiresLicense: true, issuer: "scfhs" },
  legal: { requiresLicense: true, issuer: "moj" },
  accounting: { requiresLicense: true, issuer: "socpa" },
  engineering: { requiresLicense: true, issuer: "sce" },
};

// Indexed by arbitrary string (a row's stored type may be a legacy value).
const BY_TYPE = PROFESSIONS as Record<string, Profession | undefined>;

/** Does this profession type legally require a professional license? */
export function requiresLicense(type: string | null | undefined): boolean {
  return type ? (BY_TYPE[type]?.requiresLicense ?? false) : false;
}

/** Default regulator for a regulated profession (null otherwise). */
export function defaultIssuer(type: string | null | undefined): LicenseIssuer | null {
  return type ? (BY_TYPE[type]?.issuer ?? null) : null;
}

/**
 * The verification_status a freshly created business should start in, given its
 * profession type: regulated professions begin "pending" (awaiting review),
 * everything else is "not_required".
 */
export function initialVerificationStatus(
  type: string | null | undefined,
): VerificationStatus {
  return requiresLicense(type) ? "pending" : "not_required";
}

/** Narrow an arbitrary string to a known issuer (for zod / DB reads). */
export function isLicenseIssuer(v: string): v is LicenseIssuer {
  return (LICENSE_ISSUERS as readonly string[]).includes(v);
}
