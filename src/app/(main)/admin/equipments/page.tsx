import { redirect } from "next/navigation";
import { EquipmentManager } from "@/components/EquipmentManager";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/session";

export default async function AdminEquipmentsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการอุปกรณ์"
        description="เพิ่ม แก้ไข หรือลบอุปกรณ์ เมื่อแก้จำนวนทั้งหมด ระบบจะปรับจำนวนคงเหลือตามส่วนต่างให้อัตโนมัติ"
      />
      <EquipmentManager />
    </div>
  );
}
