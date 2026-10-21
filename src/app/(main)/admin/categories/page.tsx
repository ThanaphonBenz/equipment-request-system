import { redirect } from "next/navigation";
import { CategoryManager } from "@/components/CategoryManager";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/session";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="หมวดหมู่อุปกรณ์"
        description="จัดกลุ่มอุปกรณ์เพื่อให้ค้นหาและกรองได้ง่าย หมวดที่ยังมีอุปกรณ์อยู่จะลบไม่ได้"
      />
      <CategoryManager />
    </div>
  );
}
