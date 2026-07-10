"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setBusinessActive } from "@/app/[locale]/admin/actions";

const ERR: Record<string, string> = {
  forbidden: "لا تملك صلاحية هذا الإجراء.",
  notFound: "النشاط غير موجود.",
  saveFailed: "تعذّر الحفظ، حاول مجدداً.",
};

export function BusinessToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const res = await setBusinessActive(id, !isActive);
      if (res.status === "success") {
        toast.success(isActive ? "تم تعليق النشاط" : "تم تفعيل النشاط");
        router.refresh();
      } else {
        toast.error(ERR[res.messageKey] ?? "خطأ");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? "border-brick/40 text-brick hover:bg-brick/5"
          : "border-pine/40 text-pine hover:bg-primary-hover/5"
      }`}
    >
      {isActive ? "تعليق" : "تفعيل"}
    </button>
  );
}
