"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setComplimentaryPlan } from "@/app/[locale]/admin/actions";

const ERR: Record<string, string> = {
  forbidden: "لا تملك صلاحية هذا الإجراء.",
  notFound: "النشاط غير موجود.",
  saveFailed: "تعذّر الحفظ، حاول مجدداً.",
};

// Grant / revoke a complimentary Enterprise plan for beta testers. When the
// business already has the comp plan we offer to revoke it; otherwise grant.
export function CompPlanToggle({
  id,
  isComp,
}: {
  id: string;
  isComp: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const res = await setComplimentaryPlan(id, !isComp);
      if (res.status === "success") {
        toast.success(isComp ? "أُلغيت الباقة المجانية" : "مُنحت باقة Enterprise مجاناً");
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
        isComp
          ? "border-brick/40 text-brick hover:bg-brick/5"
          : "border-primary/40 text-primary hover:bg-primary-light"
      }`}
    >
      {isComp ? "إلغاء المجانية" : "منح مجانية"}
    </button>
  );
}
