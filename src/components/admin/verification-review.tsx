"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setVerificationStatus } from "@/app/[locale]/admin/actions";

const ERR: Record<string, string> = {
  forbidden: "لا تملك صلاحية هذا الإجراء.",
  notFound: "النشاط غير موجود.",
  saveFailed: "تعذّر الحفظ، حاول مجدداً.",
};

// Approve / reject buttons for one verification request. Full admins only —
// viewers never see this component (the page hides it).
export function VerificationReview({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function review(approve: boolean) {
    startTransition(async () => {
      const res = await setVerificationStatus(id, approve);
      if (res.status === "success") {
        toast.success(approve ? "تم توثيق الترخيص" : "تم رفض الطلب");
        router.refresh();
      } else {
        toast.error(ERR[res.messageKey] ?? "خطأ");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => review(true)}
        disabled={isPending}
        className="rounded-full border border-pine/40 px-3 py-1 text-xs font-medium text-pine transition-colors hover:bg-pine/5 disabled:opacity-50"
      >
        توثيق
      </button>
      <button
        type="button"
        onClick={() => review(false)}
        disabled={isPending}
        className="rounded-full border border-brick/40 px-3 py-1 text-xs font-medium text-brick transition-colors hover:bg-brick/5 disabled:opacity-50"
      >
        رفض
      </button>
    </div>
  );
}
