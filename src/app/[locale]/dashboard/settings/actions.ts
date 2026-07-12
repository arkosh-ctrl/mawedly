"use server";

import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "./schema";

export type SettingsResult = {
  status: "success" | "error";
  messageKey: string;
};

const QR_BUCKET = "bank-qrs";
const LICENSE_BUCKET = "licenses";
const MAX_QR_BYTES = 5 * 1024 * 1024; // 5 MB
// License scans may be PDFs in addition to images.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_LICENSE_TYPES = [...ALLOWED_TYPES, "application/pdf"];

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

// Create-or-update the merchant's business row and (optionally) replace the
// bank QR image. All access uses the user's session, so Storage + table RLS are
// the only authority — the service_role key is never used here.
export async function saveSettings(
  formData: FormData,
): Promise<SettingsResult> {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) {
      return { status: "error", messageKey: "unauthorized" };
    }

    // 1) Validate text fields.
    const parsed = settingsSchema.safeParse({
      name: formData.get("name"),
      tagline: formData.get("tagline") ?? "",
      slug: formData.get("slug"),
      phone: formData.get("phone"),
      notification_email: formData.get("notification_email") ?? "",
      default_language: formData.get("default_language"),
      work_start: formData.get("work_start"),
      work_end: formData.get("work_end"),
      bank_name: formData.get("bank_name") ?? "",
      bank_iban: formData.get("bank_iban") ?? "",
      bank_account_name: formData.get("bank_account_name") ?? "",
      license_number: formData.get("license_number") ?? "",
      license_issuer: formData.get("license_issuer") ?? "",
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "validationFailed" };
    }
    const v = parsed.data;

    // Normalize.
    const phone = v.phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      return { status: "error", messageKey: "validationFailed" };
    }
    const iban = v.bank_iban
      ? v.bank_iban.replace(/\s/g, "").toUpperCase()
      : null;

    // Validate optional QR file up front.
    const qr = formData.get("qr");
    const hasFile = qr instanceof File && qr.size > 0;
    if (hasFile) {
      if (!ALLOWED_TYPES.includes(qr.type)) {
        return { status: "error", messageKey: "fileType" };
      }
      if (qr.size > MAX_QR_BYTES) {
        return { status: "error", messageKey: "fileTooLarge" };
      }
    }

    // Validate optional license document (image or PDF) up front.
    const licenseDoc = formData.get("license_doc");
    const hasLicenseDoc = licenseDoc instanceof File && licenseDoc.size > 0;
    if (hasLicenseDoc) {
      if (!ALLOWED_LICENSE_TYPES.includes(licenseDoc.type)) {
        return { status: "error", messageKey: "fileType" };
      }
      if (licenseDoc.size > MAX_QR_BYTES) {
        return { status: "error", messageKey: "fileTooLarge" };
      }
    }

    // 2) Upsert by user_id (one business per merchant). Return id + current path.
    const { data: business, error: upsertError } = await supabase
      .from("businesses")
      .upsert(
        {
          user_id: userId,
          name: v.name,
          tagline: v.tagline || null,
          slug: v.slug,
          phone,
          notification_email: v.notification_email || null,
          default_language: v.default_language,
          work_start: v.work_start,
          work_end: v.work_end,
          bank_name: v.bank_name || null,
          bank_iban: iban,
          bank_account_name: v.bank_account_name || null,
          license_number: v.license_number || null,
          license_issuer: v.license_issuer || null,
        },
        { onConflict: "user_id" },
      )
      .select("id, bank_qr_path, requires_license, license_document_path")
      .single();

    if (upsertError) {
      // user_id conflict is handled by upsert, so a unique violation here means
      // the slug is taken by another business.
      if (upsertError.code === "23505") {
        return { status: "error", messageKey: "slugTaken" };
      }
      return { status: "error", messageKey: "saveFailed" };
    }

    const businessId = business.id;
    const oldPath = business.bank_qr_path;

    // 3) Replace QR in the safe order: upload new -> point DB at it -> delete old.
    if (hasFile) {
      const newPath = `${businessId}/qr-${Date.now()}.${extFor(qr.type)}`;
      const bytes = await qr.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(QR_BUCKET)
        .upload(newPath, bytes, { contentType: qr.type, upsert: false });
      if (uploadError) {
        return { status: "error", messageKey: "uploadFailed" };
      }

      const { error: pathError } = await supabase
        .from("businesses")
        .update({ bank_qr_path: newPath })
        .eq("id", businessId)
        .eq("user_id", userId);
      if (pathError) {
        // DB still points at the old (valid) file — undo the orphaned upload.
        await supabase.storage.from(QR_BUCKET).remove([newPath]);
        return { status: "error", messageKey: "saveFailed" };
      }

      // Only now that the DB references the new file is it safe to delete the old.
      if (oldPath && oldPath !== newPath) {
        await supabase.storage.from(QR_BUCKET).remove([oldPath]);
      }
    }

    // 4) License document: same safe order (upload -> point DB at it -> delete
    //    old). Uploading a (new) document also moves verification back to
    //    "pending" so the review re-runs against the fresh scan. Only meaningful
    //    for regulated professions.
    if (hasLicenseDoc && business.requires_license) {
      const ext =
        licenseDoc.type === "application/pdf" ? "pdf" : extFor(licenseDoc.type);
      const newPath = `${businessId}/license-${Date.now()}.${ext}`;
      const bytes = await licenseDoc.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(LICENSE_BUCKET)
        .upload(newPath, bytes, { contentType: licenseDoc.type, upsert: false });
      if (uploadError) {
        return { status: "error", messageKey: "uploadFailed" };
      }

      const { error: pathError } = await supabase
        .from("businesses")
        .update({
          license_document_path: newPath,
          verification_status: "pending",
        })
        .eq("id", businessId)
        .eq("user_id", userId);
      if (pathError) {
        await supabase.storage.from(LICENSE_BUCKET).remove([newPath]);
        return { status: "error", messageKey: "saveFailed" };
      }

      const oldLicensePath = business.license_document_path;
      if (oldLicensePath && oldLicensePath !== newPath) {
        await supabase.storage.from(LICENSE_BUCKET).remove([oldLicensePath]);
      }
    }

    return { status: "success", messageKey: "saved" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
