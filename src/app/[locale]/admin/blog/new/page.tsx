import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { BlogEditor } from "@/components/admin/blog-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/blog" className="text-sm text-primary hover:underline">
          → المدونة
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
          مقال جديد
        </h1>
      </div>

      <BlogEditor />
    </div>
  );
}
